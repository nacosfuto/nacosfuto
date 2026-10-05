/**
 * newsService.js
 * Centralized News & Journal service for NACOS FUTO
 * Synchronizes with Supabase `public.news_articles` with local fallback & Cloudinary media integration
 */

import { supabase } from './client.js';

const NEWS_STORAGE_KEY = 'nacos_website_articles_store';

export const INITIAL_NEWS_ARTICLES = [
  {
    id: 'art-1',
    title: 'NACOS FUTO Announces BuildX 2026 National Computing Hackathon',
    slug: 'buildx-2026-hackathon-announcement',
    summary: 'Registration opens for undergraduate developers across Nigerian tertiary institutions with over ₦5M in startup grants.',
    content: 'The Nigerian Association of Computer Science Students (NACOS), FUTO Chapter, is proud to announce the official launch of BuildX NACOS 2026. This premier hackathon brings together young software engineers, product designers, and AI researchers across Nigeria to build solutions for real-world national problems.',
    cover_image_url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=1200',
    cloudinary_public_id: 'nacos/news/buildx_cover',
    author: 'NACOS Press Bureau',
    category: 'Hackathon',
    is_published: true,
    created_at: '2026-09-01T10:00:00Z',
    published_at: '2026-09-01T10:00:00Z'
  },
  {
    id: 'art-2',
    title: 'Department Welcomes 2026/2027 Freshmen at Orientation Week',
    slug: 'freshmen-orientation-2026',
    summary: 'Staff advisers and departmental executive leaders address incoming 100 level students on curriculum excellence.',
    content: 'Over 400 new students were formally inducted into the Department of Computer Science at the SOPS Theatre. The Head of Department, Dr. Stanley Okolie, charged students with high academic discipline and active participation in software clubs and research hubs.',
    cover_image_url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=1200',
    cloudinary_public_id: 'nacos/news/orientation_cover',
    author: 'PRO Desk',
    category: 'Campus Life',
    is_published: true,
    created_at: '2026-08-28T09:30:00Z',
    published_at: '2026-08-28T09:30:00Z'
  }
];

export function getLocalNewsArticles() {
  if (typeof window === 'undefined') return INITIAL_NEWS_ARTICLES;
  try {
    const raw = localStorage.getItem(NEWS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(INITIAL_NEWS_ARTICLES));
  } catch (e) {
    console.warn('Error reading local news articles:', e);
  }
  return INITIAL_NEWS_ARTICLES;
}

export function saveLocalNewsArticles(articles) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(articles));
  window.dispatchEvent(new Event('nacos_website_articles_updated'));
}

export async function fetchNewsArticles({ publishedOnly = true } = {}) {
  try {
    if (supabase) {
      let query = supabase.from('news_articles').select('*').order('published_at', { ascending: false });
      if (publishedOnly) {
        query = query.eq('is_published', true);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        saveLocalNewsArticles(data);
        return data;
      }
    }
  } catch (err) {
    console.warn('Supabase fetchNewsArticles error, falling back to local storage:', err);
  }
  const local = getLocalNewsArticles();
  return publishedOnly ? local.filter(a => a.is_published) : local;
}

export async function saveNewsArticle(articleData) {
  const current = getLocalNewsArticles();
  const id = articleData.id || `art-${Date.now()}`;
  const now = new Date().toISOString();
  
  const record = {
    ...articleData,
    id,
    slug: articleData.slug || articleData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    updated_at: now,
    created_at: articleData.created_at || now,
    published_at: articleData.published_at || (articleData.is_published ? now : null)
  };

  const existingIdx = current.findIndex(a => a.id === id || a.slug === record.slug);
  let updated;
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = { ...updated[existingIdx], ...record };
  } else {
    updated = [record, ...current];
  }

  saveLocalNewsArticles(updated);

  try {
    if (supabase) {
      await supabase.from('news_articles').upsert(record, { onConflict: 'slug' });
    }
  } catch (err) {
    console.warn('Could not sync news article to Supabase:', err);
  }

  return { success: true, article: record };
}

export async function deleteNewsArticle(id, slug) {
  const current = getLocalNewsArticles();
  const updated = current.filter(a => a.id !== id && a.slug !== slug);
  saveLocalNewsArticles(updated);

  try {
    if (supabase) {
      if (id) await supabase.from('news_articles').delete().eq('id', id);
      else if (slug) await supabase.from('news_articles').delete().eq('slug', slug);
    }
  } catch (err) {
    console.warn('Could not delete news article from Supabase:', err);
  }

  return { success: true };
}
