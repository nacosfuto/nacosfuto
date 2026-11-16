/**
 * newsService.js
 * Centralized News & Journal service for NACOS FUTO
 * Synchronizes with Supabase `public.news_articles` with local fallback & Cloudinary media integration
 */

import { supabase, isSupabaseConfigured } from './client.js';
import { syncMediaAsset, deleteMediaAsset } from './media.js';
import { CLOUDINARY_FOLDERS, getOptimizedImageUrl, getCloudinaryAssetUrl } from '@nacos/media';

export const NEWS_STORAGE_KEY = 'nacos_website_articles_store';

export const INITIAL_NEWS_ARTICLES = [];

let memoryNewsArticles = null;

/**
 * Sanitizes articles before caching to prevent browser localStorage quota overflow.
 * Replaces large data URIs with canonical CDN or fallback URLs and strips embedded base64 media strings.
 */
function sanitizeArticlesForStorage(articles) {
  if (!Array.isArray(articles)) return [];
  return articles.map(art => {
    let cover = art.cover_image_url || art.image || '';
    if (typeof cover === 'string' && cover.startsWith('data:')) {
      cover = art.cloudinary_public_id
        ? getOptimizedImageUrl(art.cloudinary_public_id)
        : (getCloudinaryAssetUrl('research') || 'https://res.cloudinary.com/a2mmcttn/image/upload/v1788569339/nacos/gallery/research.jpg');
    }

    let cleanContent = art.content || art.summary || art.excerpt || '';
    if (typeof cleanContent === 'string' && cleanContent.includes('data:image/')) {
      cleanContent = cleanContent.replace(/data:image\/[^;]+;base64,[^"'\s)]+/g, '[image]');
    }

    return {
      ...art,
      cover_image_url: cover,
      image: cover,
      content: cleanContent
    };
  });
}

/**
 * Safely evicts stale or expendable cache keys from localStorage when quota is near or exceeded.
 */
function evictStaleLocalStorage() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const keysToPrune = [
      'nacos_local_media_assets_cache',
      'nacos_active_gateway_redirect',
      'nacos_pending_id_card_tx',
      'nacos_last_payment_success',
      'nacos_active_gateway_tx'
    ];
    keysToPrune.forEach(k => {
      try { localStorage.removeItem(k); } catch (_) {}
    });
  } catch (_) {}
}

export function normalizeArticle(a) {
  const publishedAt = a.published_at || a.created_at || new Date().toISOString();
  let formattedDate = 'Recent';
  try {
    formattedDate = new Date(publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch (e) {}

  let cover = a.cover_image_url || a.image || '';
  if (!cover && a.cloudinary_public_id) {
    cover = getOptimizedImageUrl(a.cloudinary_public_id);
  }
  if (!cover) {
    cover = getCloudinaryAssetUrl('research') || 'https://res.cloudinary.com/a2mmcttn/image/upload/v1788569339/nacos/gallery/research.jpg';
  }

  return {
    ...a,
    id: a.id || `art-${Date.now()}`,
    title: a.title || 'Untitled Article',
    slug: a.slug || a.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `art-${Date.now()}`,
    summary: a.summary || a.excerpt || '',
    excerpt: a.summary || a.excerpt || '',
    content: a.content || a.summary || a.excerpt || '',
    cover_image_url: cover,
    image: cover,
    cloudinary_public_id: a.cloudinary_public_id || null,
    author: a.author || 'NACOS Press Desk',
    category: a.category || 'Tech & Academics',
    read_time_minutes: a.read_time_minutes || 3,
    readTime: `${a.read_time_minutes || 3} min read`,
    is_published: a.is_published !== false,
    is_featured: Boolean(a.is_featured),
    published_at: publishedAt,
    date: formattedDate
  };
}

export function getLocalNewsArticles({ publishedOnly = false, category = 'all' } = {}) {
  let list = [];

  // Tier 1: In-memory cache (instant, freshest, immune to storage quota)
  if (memoryNewsArticles && Array.isArray(memoryNewsArticles) && memoryNewsArticles.length > 0) {
    list = memoryNewsArticles;
  } else if (typeof window !== 'undefined') {
    // Tier 2: localStorage
    try {
      const raw = localStorage.getItem(NEWS_STORAGE_KEY);
      if (raw) {
        list = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Error reading localStorage for news articles:', e);
    }

    // Tier 3: sessionStorage fallback
    if ((!list || !Array.isArray(list) || list.length === 0) && window.sessionStorage) {
      try {
        const sessionRaw = sessionStorage.getItem(NEWS_STORAGE_KEY);
        if (sessionRaw) {
          list = JSON.parse(sessionRaw);
        }
      } catch (_) {}
    }
  }

  if (!Array.isArray(list)) list = [];
  let normalized = list.map(normalizeArticle);
  if (publishedOnly) normalized = normalized.filter(a => a.is_published);
  if (category !== 'all') normalized = normalized.filter(a => a.category === category);
  return normalized;
}

export function saveLocalNewsArticles(articles, { notify = true } = {}) {
  if (!articles || !Array.isArray(articles)) return;
  const normalized = articles.map(normalizeArticle);
  memoryNewsArticles = normalized;

  if (typeof window === 'undefined') return;

  // Multi-tier storage persistence with QuotaExceededError recovery
  try {
    // Attempt 1: Standard sanitized save
    const sanitized = sanitizeArticlesForStorage(normalized);
    localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(sanitized));
  } catch (quotaErr) {
    console.warn('[newsService] localStorage quota reached on saveLocalNewsArticles. Attempting quota recovery...', quotaErr);

    // Attempt 2: Clean up obsolete/large temporary keys & remove old key first before re-writing
    try {
      evictStaleLocalStorage();
      localStorage.removeItem(NEWS_STORAGE_KEY);
      const sanitized = sanitizeArticlesForStorage(normalized);
      localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(sanitized));
    } catch (retryErr) {
      // Attempt 3: Save lightweight article index (metadata + summary only, full content trimmed)
      try {
        const lightweight = normalized.slice(0, 40).map(a => ({
          id: a.id,
          slug: a.slug,
          title: a.title,
          summary: a.summary || a.excerpt || '',
          category: a.category,
          author: a.author,
          cover_image_url: a.cover_image_url?.startsWith('data:') ? '' : a.cover_image_url,
          cloudinary_public_id: a.cloudinary_public_id,
          read_time_minutes: a.read_time_minutes,
          is_published: a.is_published,
          published_at: a.published_at,
          date: a.date
        }));
        localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(lightweight));
      } catch (lightweightErr) {
        // Attempt 4: Fall back to sessionStorage
        try {
          if (window.sessionStorage) {
            sessionStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(normalized.slice(0, 20)));
          }
        } catch (sessionErr) {
          // Attempt 5: Keep in memory cache only. NEVER throw or crash the caller!
          console.warn('[newsService] Storage quota fully exhausted; keeping articles in memoryNewsArticles cache.');
        }
      }
    }
  }

  if (notify) {
    try {
      window.dispatchEvent(new Event('nacos_website_articles_updated'));
    } catch (_) {}
  }
}

export async function fetchNewsArticles({ publishedOnly = true, category = 'all' } = {}) {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    if (supabase) {
      // 1. Authoritative check on live Supabase store_news row
      const { data: storeRow } = await supabase
        .from('id_card_settings')
        .select('academic_session')
        .eq('id', 'store_news')
        .maybeSingle();

      if (storeRow?.academic_session) {
        try {
          const parsed = JSON.parse(storeRow.academic_session);
          if (Array.isArray(parsed) && parsed.length > 0) {
            saveLocalNewsArticles(parsed, { notify: false });
            let result = parsed;
            if (publishedOnly) result = result.filter(a => a.is_published);
            if (category !== 'all') result = result.filter(a => a.category === category);
            return result;
          }
        } catch (e) {}
      }

      // 2. Fetch from media_assets where category = 'news' (Universal multi-device real-time sync)
      const { data: mediaNews, error: mediaError } = await supabase
        .from('media_assets')
        .select('id, entity_id, category, image_url, image_alt, cloudinary_public_id, created_at')
        .eq('category', 'news')
        .not('image_url', 'like', 'data:%')
        .order('created_at', { ascending: false });

      if (!mediaError && mediaNews && mediaNews.length > 0) {
        const parsedArticles = [];
        for (const item of mediaNews) {
          try {
            if (item.image_alt && item.image_alt.startsWith('{')) {
              const obj = JSON.parse(item.image_alt);
              parsedArticles.push(normalizeArticle({
                ...obj,
                id: obj.id || item.entity_id || item.id,
                cover_image_url: item.image_url || obj.cover_image_url,
                cloudinary_public_id: item.cloudinary_public_id || obj.cloudinary_public_id
              }));
            }
          } catch (e) {}
        }

        if (parsedArticles.length > 0) {
          const remoteKeys = new Set(parsedArticles.map(a => a.slug || a.id));
          const localInitials = INITIAL_NEWS_ARTICLES.map(normalizeArticle).filter(a => !remoteKeys.has(a.slug || a.id));
          const merged = [...parsedArticles, ...localInitials];

          saveLocalNewsArticles(merged, { notify: false });

          let result = merged;
          if (publishedOnly) result = result.filter(a => a.is_published);
          if (category !== 'all') result = result.filter(a => a.category === category);
          return result;
        }
      }

      // 2. Fallback to news_articles table if available
      let query = supabase
        .from('news_articles')
        .select('id, title, slug, summary, content, cover_image_url, cloudinary_public_id, author, category, read_time_minutes, is_published, is_featured, published_at, created_at')
        .order('published_at', { ascending: false });
      if (publishedOnly) {
        query = query.eq('is_published', true);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        const mapped = data.map(normalizeArticle);
        const local = getLocalNewsArticles({ publishedOnly: false });
        const remoteSlugs = new Set(mapped.map(m => m.slug || m.id));
        const merged = [...mapped, ...local.filter(l => !remoteSlugs.has(l.slug || l.id))];

        saveLocalNewsArticles(merged, { notify: false });
        
        let result = merged;
        if (publishedOnly) result = result.filter(a => a.is_published);
        if (category !== 'all') result = result.filter(a => a.category === category);
        return result;
      }
    }
  } catch (err) {
    console.warn('Supabase fetchNewsArticles error, falling back to local storage:', err);
  }
  return getLocalNewsArticles({ publishedOnly, category });
}

async function getRemoteStoreNews() {
  const fallback = getLocalNewsArticles({ publishedOnly: false });
  try {
    if (supabase) {
      const { data: storeRow } = await supabase
        .from('id_card_settings')
        .select('academic_session')
        .eq('id', 'store_news')
        .maybeSingle();
      if (storeRow?.academic_session) {
        const parsed = JSON.parse(storeRow.academic_session);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map();
          parsed.forEach(item => { if (item?.id || item?.slug) map.set(item.id || item.slug, item); });
          fallback.forEach(item => { if ((item?.id || item?.slug) && !map.has(item.id || item.slug)) map.set(item.id || item.slug, item); });
          return Array.from(map.values()).map(normalizeArticle);
        }
      }
    }
  } catch (_) {}
  return fallback;
}

export async function saveNewsArticle(articleData) {
  const current = await getRemoteStoreNews();
  const id = articleData.id || `art-${Date.now()}`;
  const now = new Date().toISOString();
  
  let cover = articleData.cover_image_url || articleData.image || '';
  if (!cover && articleData.cloudinary_public_id) {
    cover = getOptimizedImageUrl(articleData.cloudinary_public_id);
  }
  if (!cover) {
    cover = getCloudinaryAssetUrl('research') || 'https://res.cloudinary.com/a2mmcttn/image/upload/v1788569339/nacos/gallery/research.jpg';
  }

  const record = normalizeArticle({
    ...articleData,
    id,
    cover_image_url: cover,
    image: cover,
    cloudinary_public_id: articleData.cloudinary_public_id || null,
    slug: articleData.slug || articleData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    updated_at: now,
    created_at: articleData.created_at || now,
    published_at: articleData.published_at || (articleData.is_published ? now : null)
  });

  const existingIdx = current.findIndex(a => a.id === id || a.slug === record.slug);
  let updated;
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = { ...updated[existingIdx], ...record };
  } else {
    updated = [record, ...current];
  }

  // 1. Authoritative live sync to Supabase store_news FIRST
  try {
    if (supabase) {
      await supabase.from('id_card_settings').upsert({
        id: 'store_news',
        academic_session: JSON.stringify(updated),
        updated_at: now
      });
    }
  } catch (err) {
    console.warn('Supabase store_news save error:', err);
  }

  // 2. Safe local storage update (protected by multi-tier fallback, never throws)
  try {
    saveLocalNewsArticles(updated);
  } catch (storageErr) {
    console.warn('Non-fatal local cache warning on saveNewsArticle:', storageErr);
  }

  // 3. Also sync to media_assets
  if (record.cover_image_url) {
    try {
      await syncMediaAsset({
        category: 'news',
        entityId: record.slug || record.id,
        imageUrl: record.cover_image_url,
        cloudinaryPublicId: record.cloudinary_public_id,
        imageAlt: JSON.stringify(record)
      });
    } catch (e) {
      console.warn('Could not sync news to media_assets:', e);
    }
  }

  // 4. Also attempt Supabase news_articles table with explicit column selection
  try {
    if (supabase) {
      const payload = {
        title: record.title,
        slug: record.slug,
        summary: record.summary,
        content: record.content,
        cover_image_url: record.cover_image_url,
        cloudinary_public_id: record.cloudinary_public_id,
        author: record.author,
        category: record.category,
        is_published: record.is_published,
        published_at: record.published_at || now,
        updated_at: now
      };
      if (record.id && !record.id.startsWith('art-')) {
        payload.id = record.id;
      }
      const { data: upserted } = await supabase
        .from('news_articles')
        .upsert(payload, { onConflict: 'slug' })
        .select('id, slug, title');
      if (upserted?.[0]?.id) {
        record.id = upserted[0].id;
      }
    }
  } catch (err) {
    console.warn('Could not sync news article to news_articles table:', err);
  }

  return { success: true, article: record };
}

export async function deleteNewsArticle(id, slug, cloudinaryPublicId) {
  const current = await getRemoteStoreNews();
  const updated = current.filter(a => a.id !== id && a.slug !== slug);

  // Authoritative live sync to Supabase store_news
  try {
    if (supabase) {
      await supabase.from('id_card_settings').upsert({
        id: 'store_news',
        academic_session: JSON.stringify(updated),
        updated_at: new Date().toISOString()
      });
    }
  } catch (err) {
    console.warn('Supabase store_news delete sync error:', err);
  }

  // Safe local cache update
  try {
    saveLocalNewsArticles(updated);
  } catch (storageErr) {
    console.warn('Non-fatal local cache warning on deleteNewsArticle:', storageErr);
  }

  // Delete from news_articles table
  try {
    if (supabase) {
      if (slug) {
        await supabase.from('news_articles').delete().eq('slug', slug);
      }
      if (id && !id.startsWith('art-')) {
        await supabase.from('news_articles').delete().eq('id', id);
      }
    }
  } catch (err) {
    console.warn('Supabase news_articles table delete error:', err);
  }

  // Delete from media_assets
  try {
    if (supabase) {
      if (slug) {
        await supabase.from('media_assets').delete().eq('entity_id', slug);
      }
      if (id) {
        await supabase.from('media_assets').delete().eq('entity_id', id);
      }
      if (cloudinaryPublicId) {
        await supabase.from('media_assets').delete().eq('cloudinary_public_id', cloudinaryPublicId);
      }
    }
  } catch (e) {
    console.warn('Universal media_assets delete notice for news:', e);
  }

  if (cloudinaryPublicId) {
    try {
      await deleteMediaAsset(cloudinaryPublicId);
    } catch (e) {
      console.warn('Cloudinary media delete notice for news:', e);
    }
  }

  try {
    if (supabase) {
      if (slug) await supabase.from('news_articles').delete().eq('slug', slug);
      else if (id && !id.startsWith('art-')) await supabase.from('news_articles').delete().eq('id', id);
    }
  } catch (err) {
    console.warn('Could not delete news article from Supabase:', err);
  }

  return { success: true };
}

export async function toggleNewsPublish(id) {
  const current = getLocalNewsArticles({ publishedOnly: false });
  let nextPublished = false;
  let targetSlug = null;
  let targetArticle = null;

  const updated = current.map(a => {
    if (a.id === id) {
      nextPublished = !a.is_published;
      targetSlug = a.slug;
      targetArticle = { ...a, is_published: nextPublished };
      return targetArticle;
    }
    return a;
  });

  // Authoritative live sync to Supabase store_news
  try {
    if (supabase) {
      await supabase.from('id_card_settings').upsert({
        id: 'store_news',
        academic_session: JSON.stringify(updated),
        updated_at: new Date().toISOString()
      });
    }
  } catch (err) {
    console.warn('Supabase store_news toggle sync error:', err);
  }

  // Safe local cache update
  try {
    saveLocalNewsArticles(updated);
  } catch (storageErr) {
    console.warn('Non-fatal local cache warning on toggleNewsPublish:', storageErr);
  }

  if (targetSlug && supabase) {
    try {
      await supabase.from('news_articles').update({ is_published: nextPublished }).eq('slug', targetSlug);
    } catch (err) {
      console.warn('Supabase toggle news publish notice:', err);
    }
  }

  return updated;
}
