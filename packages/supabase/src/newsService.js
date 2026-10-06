/**
 * newsService.js
 * Centralized News & Journal service for NACOS FUTO
 * Synchronizes with Supabase `public.news_articles` with local fallback & Cloudinary media integration
 */

import { supabase } from './client.js';
import { syncMediaAsset, deleteMediaAsset } from './media.js';
import { CLOUDINARY_FOLDERS } from '@nacos/media';

export const NEWS_STORAGE_KEY = 'nacos_website_articles_store';

export const INITIAL_NEWS_ARTICLES = [
  {
    id: 'art-1',
    title: 'Department of Computer Science Achieves Full 5-Year NUC Accreditation Status',
    slug: 'futo-csc-nuc-accreditation-2026',
    category: 'Academics',
    author: 'Office of the HOD',
    summary: 'Following comprehensive infrastructure audits and academic curriculum assessments, the National Universities Commission (NUC) has certified FUTO Computer Science with highest tier accreditation.',
    content: 'The National Universities Commission (NUC) has officially granted full accreditation status to the Department of Computer Science, Federal University of Technology, Owerri (FUTO). The accreditation panel commended the department for its modernized software engineering syllabus, state-of-the-art computational laboratories in the TETFUND complex, and highly distinguished faculty.',
    cover_image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569302/nacos/news/academics.jpg',
    cloudinary_public_id: 'nacos/news/academics',
    read_time_minutes: 3,
    is_published: true,
    is_featured: true,
    published_at: '2026-08-28T10:00:00Z',
    created_at: '2026-08-28T10:00:00Z'
  },
  {
    id: 'art-2',
    title: 'SICT Research Cluster Secures Multi-Million Compute Grant for Applied AI',
    slug: 'ai-research-cluster-grant-expansion',
    category: 'Research & Journal',
    author: 'Directorate of Research',
    summary: 'Department faculty and student researchers expand high-performance compute clusters focused on African healthcare and natural language processing solutions.',
    content: 'In collaboration with international research partners, the Department of Computer Science has secured compute hardware funding to deploy GPU-accelerated clusters. The infrastructure will accelerate doctoral, postgraduate, and final-year student investigations into low-resource language models, medical image classification, and precision agriculture.',
    cover_image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569301/nacos/news/research.jpg',
    cloudinary_public_id: 'nacos/news/research',
    read_time_minutes: 4,
    is_published: true,
    is_featured: true,
    published_at: '2026-08-14T10:00:00Z',
    created_at: '2026-08-14T10:00:00Z'
  },
  {
    id: 'art-3',
    title: 'NACOS FUTO Announces BuildX 2026 National Computing Hackathon',
    slug: 'buildx-2026-hackathon-announcement',
    category: 'Hackathon',
    author: 'NACOS Press Bureau',
    summary: 'Registration opens for undergraduate developers across Nigerian tertiary institutions with over ₦5M in startup grants.',
    content: 'The Nigerian Association of Computer Science Students (NACOS), FUTO Chapter, is proud to announce the official launch of BuildX NACOS 2026. This premier hackathon brings together young software engineers, product designers, and AI researchers across Nigeria to build solutions for real-world national problems.',
    cover_image_url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=1200',
    cloudinary_public_id: 'nacos/news/buildx_cover',
    read_time_minutes: 3,
    is_published: true,
    is_featured: true,
    published_at: '2026-09-01T10:00:00Z',
    created_at: '2026-09-01T10:00:00Z'
  },
  {
    id: 'art-4',
    title: 'FUTO Computing Students Clinch Top Honours at National Hackathon Challenge',
    slug: 'nacos-tech-summit-hackathon-champions',
    category: 'Innovation',
    author: 'NACOS Press & PRO Office',
    summary: 'Undergraduate student innovators develop distributed fintech and agricultural supply chain models, winning accolades across regional and national computing leagues.',
    content: 'A delegation of undergraduate computing students representing NACOS FUTO emerged champions at the 2026 National Inter-University Software Innovation Hackathon. Their winning prototype featured an offline-first distributed ledger system enabling rural farmers to verify decentralized payments and track logistics.',
    cover_image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569317/nacos/gallery/gallery_dept_front.jpg',
    cloudinary_public_id: 'nacos/news/gallery_dept_front',
    read_time_minutes: 3,
    is_published: true,
    is_featured: false,
    published_at: '2026-07-29T10:00:00Z',
    created_at: '2026-07-29T10:00:00Z'
  },
  {
    id: 'art-5',
    title: 'Senate Approves New Curricula in Cloud Architecture, AI Systems, and Cyber Security',
    slug: 'departmental-curriculum-modernization-2026',
    category: 'Academics',
    author: 'Departmental Academic Board',
    summary: 'The university senate has approved revised undergraduate course modules emphasizing industry readiness, microservices architecture, and modern cryptographic defenses.',
    content: 'Starting in the current academic session, CSC undergraduate students will benefit from hands-on practical labs spanning DevOps pipelines, modern full-stack web architectures, container orchestration, and practical machine learning engineering.',
    cover_image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569300/nacos/news/header.jpg',
    cloudinary_public_id: 'nacos/news/header',
    read_time_minutes: 5,
    is_published: true,
    is_featured: false,
    published_at: '2026-07-10T10:00:00Z',
    created_at: '2026-07-10T10:00:00Z'
  },
  {
    id: 'art-6',
    title: 'Department Welcomes 2026/2027 Freshmen at Orientation Week',
    slug: 'freshmen-orientation-2026',
    category: 'Campus Life',
    author: 'PRO Desk',
    summary: 'Staff advisers and departmental executive leaders address incoming 100 level students on curriculum excellence.',
    content: 'Over 400 new students were formally inducted into the Department of Computer Science at the SOPS Theatre. The Head of Department, Dr. Stanley Okolie, charged students with high academic discipline and active participation in software clubs and research hubs.',
    cover_image_url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=1200',
    cloudinary_public_id: 'nacos/news/orientation_cover',
    read_time_minutes: 3,
    is_published: true,
    is_featured: false,
    published_at: '2026-08-28T09:30:00Z',
    created_at: '2026-08-28T09:30:00Z'
  },
  {
    id: 'art-7',
    title: 'Global Alumni Chapter Launches Annual Computing Mentorship Fellowship',
    slug: 'alumni-mentorship-fellowship-announcement',
    category: 'Alumni',
    author: 'NACOS Alumni Relations',
    summary: 'FUTO CSC alumni working across global tech leaders launch direct mentorship pairing, career advisory webinars, and resume clinics for 300L and 400L students.',
    content: 'The NACOS FUTO Alumni Network has formally initiated its 2026 Industry Fellowship. Selected students receive 1-on-1 mentorship from software engineers, tech founders, and data scientists stationed across Silicon Valley, Europe, and Nigeria.',
    cover_image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569301/nacos/news/research.jpg',
    cloudinary_public_id: 'nacos/news/alumni_mentorship',
    read_time_minutes: 4,
    is_published: true,
    is_featured: false,
    published_at: '2026-06-22T10:00:00Z',
    created_at: '2026-06-22T10:00:00Z'
  },
  {
    id: 'art-8',
    title: 'Cybersecurity Week: Department Partners with Industry Experts on Digital Safety',
    slug: 'annual-cybersecurity-awareness-week-highlights',
    category: 'Research & Journal',
    author: 'Office of the Director of ICT',
    summary: 'Students and staff participate in ethical hacking demonstrations, identity defense workshops, and credential protection seminars.',
    content: 'Organized by the Office of the Director of ICT in partnership with cybersecurity analysts, the event empowered hundreds of undergraduates with skills in penetration testing, multi-factor authentication setup, and digital footprint management.',
    cover_image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569302/nacos/news/academics.jpg',
    cloudinary_public_id: 'nacos/news/cybersecurity_week',
    read_time_minutes: 3,
    is_published: true,
    is_featured: false,
    published_at: '2026-05-18T10:00:00Z',
    created_at: '2026-05-18T10:00:00Z'
  }
];

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
    cover_image_url: a.cover_image_url || a.image || 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569301/nacos/news/research.jpg',
    image: a.cover_image_url || a.image || 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569301/nacos/news/research.jpg',
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
    let list = INITIAL_NEWS_ARTICLES.map(normalizeArticle);
    if (publishedOnly) list = list.filter(a => a.is_published);
    if (category !== 'all') list = list.filter(a => a.category === category);
    return list;
  }
  try {
    const raw = localStorage.getItem(NEWS_STORAGE_KEY);
    let list = raw ? JSON.parse(raw) : null;
    if (!list || !Array.isArray(list) || list.length === 0) {
      list = INITIAL_NEWS_ARTICLES;
      localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(list));
    }
    let normalized = list.map(normalizeArticle);
    if (publishedOnly) normalized = normalized.filter(a => a.is_published);
    if (category !== 'all') normalized = normalized.filter(a => a.category === category);
    return normalized;
  } catch (e) {
    console.warn('Error reading local news articles:', e);
    let fallback = INITIAL_NEWS_ARTICLES.map(normalizeArticle);
    if (publishedOnly) fallback = fallback.filter(a => a.is_published);
    if (category !== 'all') fallback = fallback.filter(a => a.category === category);
    return fallback;
  }
}

export function saveLocalNewsArticles(articles) {
  if (typeof window === 'undefined') return;
  const normalized = articles.map(normalizeArticle);
  localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new Event('nacos_website_articles_updated'));
}

export async function fetchNewsArticles({ publishedOnly = true, category = 'all' } = {}) {
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
