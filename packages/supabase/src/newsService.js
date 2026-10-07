/**
 * newsService.js
 * Centralized News & Journal service for NACOS FUTO
 * Synchronizes with Supabase `public.news_articles` with local fallback & Cloudinary media integration
 */

import { supabase, isSupabaseConfigured } from './client.js';
import { syncMediaAsset, deleteMediaAsset } from './media.js';
import { CLOUDINARY_FOLDERS } from '@nacos/media';

export const NEWS_STORAGE_KEY = 'nacos_website_articles_store';

export const INITIAL_NEWS_ARTICLES = [];

export function normalizeArticle(a) {
  const publishedAt = a.published_at || a.created_at || new Date().toISOString();
  let formattedDate = 'Recent';
  try {
    formattedDate = new Date(publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch (e) {}

  return {
    ...a,
    id: a.id || `art-${Date.now()}`,
    title: a.title || 'Untitled Article',
    slug: a.slug || a.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `art-${Date.now()}`,
    summary: a.summary || a.excerpt || '',
    excerpt: a.summary || a.excerpt || '',
    content: a.content || a.summary || a.excerpt || '',
    cover_image_url: a.cover_image_url || a.image || '',
    image: a.cover_image_url || a.image || '',
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
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = localStorage.getItem(NEWS_STORAGE_KEY);
    let list = raw ? JSON.parse(raw) : [];
    if (!list || !Array.isArray(list)) {
      list = [];
    }
    let normalized = list.map(normalizeArticle);
    if (publishedOnly) normalized = normalized.filter(a => a.is_published);
    if (category !== 'all') normalized = normalized.filter(a => a.category === category);
    return normalized;
  } catch (e) {
    console.warn('Error reading local news articles:', e);
    return [];
  }
}

export function saveLocalNewsArticles(articles) {
  if (typeof window === 'undefined') return;
  const normalized = articles.map(normalizeArticle);
  localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new Event('nacos_website_articles_updated'));
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
            saveLocalNewsArticles(parsed);
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
        .select('*')
        .eq('category', 'news')
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

          saveLocalNewsArticles(merged);

          let result = merged;
          if (publishedOnly) result = result.filter(a => a.is_published);
          if (category !== 'all') result = result.filter(a => a.category === category);
          return result;
        }
      }

      // 2. Fallback to news_articles table if available
      let query = supabase.from('news_articles').select('*').order('published_at', { ascending: false });
      if (publishedOnly) {
        query = query.eq('is_published', true);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        const mapped = data.map(normalizeArticle);
        const local = getLocalNewsArticles({ publishedOnly: false });
        const remoteSlugs = new Set(mapped.map(m => m.slug || m.id));
        const merged = [...mapped, ...local.filter(l => !remoteSlugs.has(l.slug || l.id))];

        saveLocalNewsArticles(merged);
        
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
  
  const record = normalizeArticle({
    ...articleData,
    id,
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

  saveLocalNewsArticles(updated);

  // Authoritative live sync to Supabase store_news
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



  // 2. Also attempt Supabase news_articles table
  try {
    if (supabase) {
      await supabase.from('news_articles').upsert({
        id: record.id.startsWith('art-') ? undefined : record.id,
        title: record.title,
        slug: record.slug,
        summary: record.summary,
        content: record.content,
        cover_image_url: record.cover_image_url,
        cloudinary_public_id: record.cloudinary_public_id,
        author: record.author,
        category: record.category,
        is_published: record.is_published,
        published_at: record.published_at,
        updated_at: now
      }, { onConflict: 'slug' });
    }
  } catch (err) {
    console.warn('Could not sync news article to news_articles table:', err);
  }

  return { success: true, article: record };
}

export async function deleteNewsArticle(id, slug, cloudinaryPublicId) {
  const current = await getRemoteStoreNews();
  const updated = current.filter(a => a.id !== id && a.slug !== slug);
  saveLocalNewsArticles(updated);

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

  saveLocalNewsArticles(updated);

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

  if (targetSlug && supabase) {
    try {
      await supabase.from('news_articles').update({ is_published: nextPublished }).eq('slug', targetSlug);
    } catch (err) {
      console.warn('Supabase toggle news publish notice:', err);
    }
  }

  return updated;
}
