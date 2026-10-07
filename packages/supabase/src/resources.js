/**
 * @file resources.js
 * Student Resource Hub Data Access & Business Logic for NACOS FUTO.
 * Storage Provider: Backblaze B2 (S3 API abstraction via storageService).
 * Provides client methods for public/student discovery, atomic download/view tracking,
 * and comprehensive administrative resource management.
 */

import { supabase } from './client.js';
import { storageService } from './storageService.js';

/**
 * Fetch all active resource categories (sorted by display order / name)
 */
export const DEFAULT_RESOURCE_CATEGORIES = [
  {
    id: '7156a37d-6134-4bb0-8848-93d57c25ce93',
    name: 'Handouts & Lecture Notes',
    slug: 'handouts',
    description: 'Official lecture slides and departmental handouts',
    icon: 'FileText',
    display_order: 1,
    is_active: true
  },
  {
    id: 'ddd57263-dbaf-400b-8a2a-d5d6dd906a45',
    name: 'Past Questions & Solutions',
    slug: 'past-questions',
    description: 'Past examination questions and solutions',
    icon: 'HelpCircle',
    display_order: 2,
    is_active: true
  },
  {
    id: 'c79cdfc4-d4c6-4075-b72d-8c1b12f08273',
    name: 'Textbooks & Compendiums',
    slug: 'books',
    description: 'Recommended textbooks and academic compendiums',
    icon: 'BookOpen',
    display_order: 3,
    is_active: true
  },
  {
    id: 'b5fa175a-d23a-421d-90d3-df19df92136b',
    name: 'Video Tutorials & Lectures',
    slug: 'videos',
    description: 'Recorded workshops, webinars and tutorial archives',
    icon: 'Video',
    display_order: 4,
    is_active: true
  },
  {
    id: '74d92f9b-f81d-44e5-8d80-65b2eb08457d',
    name: 'Lab Guides & Code Repositories',
    slug: 'tutorials',
    description: 'Lab manuals, code repositories and practical tutorials',
    icon: 'Sparkles',
    display_order: 5,
    is_active: true
  }
];

export async function fetchResourceCategories(options = { includeInactive: false }) {
  if (!supabase) return { data: DEFAULT_RESOURCE_CATEGORIES, error: null };

  try {
    let query = supabase
      .from('resource_categories')
      .select('*')
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (!options.includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Database category query notice, using default categories:', error.message);
      return { data: DEFAULT_RESOURCE_CATEGORIES, error: null };
    }
    
    if (Array.isArray(data) && data.length > 0) {
      // Enhance short names with descriptive labels if needed
      const enhanced = data.map(cat => {
        const found = DEFAULT_RESOURCE_CATEGORIES.find(d => d.id === cat.id || d.slug === cat.slug);
        return {
          ...cat,
          name: found ? found.name : cat.name
        };
      });
      return { data: enhanced, error: null };
    }

    return { data: DEFAULT_RESOURCE_CATEGORIES, error: null };
  } catch (err) {
    console.warn('Error fetching resource categories, falling back to defaults:', err);
    return { data: DEFAULT_RESOURCE_CATEGORIES, error: null };
  }
}

/**
 * Fetch resources with multi-factor filtering, debounced search, sorting, and pagination.
 * Directly queried from Supabase PostgreSQL database.
 */
export async function fetchResources({
  categorySlug = null,
  categoryId = null,
  level = null,
  courseCode = null,
  semester = null,
  resourceType = null,
  search = '',
  sort = 'newest',
  page = 1,
  limit = 20,
  includeInactive = false
} = {}) {
  if (!supabase) {
    return {
      data: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
      error: 'Supabase client not initialized'
    };
  }

  try {
    let query = supabase
      .from('resources')
      .select(`
        *,
        category:resource_categories(id, name, slug, icon, description)
      `, { count: 'exact' });

    // Active & published filter
    if (!includeInactive) {
      query = query.eq('is_active', true).eq('is_published', true);
    }

    // Category filter
    if (categoryId && categoryId !== 'all') {
      query = query.eq('category_id', categoryId);
    } else if (categorySlug && categorySlug !== 'all') {
      const { data: catData } = await supabase
        .from('resource_categories')
        .select('id')
        .eq('slug', categorySlug)
        .maybeSingle();

      if (catData?.id) {
        query = query.eq('category_id', catData.id);
      }
    }

    // Level filter (100, 200, 300, 400, 500)
    if (level && level !== 'all') {
      const cleanLevel = String(level).replace(/ Level/i, '').trim();
      query = query.or(`level.eq.${cleanLevel},level.eq."${cleanLevel}",level.eq."${cleanLevel} Level"`);
    }

    // Course Code filter
    if (courseCode && courseCode !== 'all') {
      query = query.ilike('course_code', `%${courseCode.trim()}%`);
    }

    // Semester filter
    if (semester && semester !== 'all') {
      query = query.ilike('semester', `%${semester.trim()}%`);
    }

    // Resource Type filter (document, past_question, video, archive, image, etc.)
    if (resourceType && resourceType !== 'all') {
      query = query.eq('resource_type', resourceType);
    }

    // Search filter across title, description, course_code, and course_title
    if (search && search.trim().length > 0) {
      const term = search.trim();
      query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%,course_code.ilike.%${term}%,course_title.ilike.%${term}%`);
    }

    // Sorting
    switch (sort) {
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'popular':
      case 'downloads':
        query = query.order('download_count', { ascending: false });
        break;
      case 'title_asc':
      case 'a_z':
        query = query.order('title', { ascending: true });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) {
      console.error('Supabase query error in fetchResources:', error.message);
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
        error: error.message
      };
    }

    const total = count ?? (data?.length || 0);

    return {
      data: data || [],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      error: null
    };
  } catch (err) {
    console.error('Error fetching resources from database:', err);
    return { 
      data: [], 
      total: 0, 
      page, 
      limit, 
      totalPages: 0, 
      error: err.message || 'Failed to fetch resources from database' 
    };
  }
}

/**
 * Fetch single resource by ID or Slug
 */
export async function fetchResourceById(id) {
  if (!supabase) return { data: null, error: 'Supabase client not initialized' };

  try {
    const { data, error } = await supabase
      .from('resources')
      .select(`
        *,
        category:resource_categories(id, name, slug, icon, description)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error fetching resource by id:', err);
    return { data: null, error: err.message };
  }
}

/**
 * Atomically record resource download and increment counter via PostgreSQL RPC.
 */
export async function recordResourceDownload(resourceId, { userId = null, ipHash = null, userAgent = null } = {}) {
  if (!supabase || !resourceId) return { count: 0, error: 'Missing resource or Supabase client' };

  try {
    const { data, error } = await supabase.rpc('increment_resource_download', {
      p_resource_id: resourceId,
      p_user_id: userId,
      p_ip_hash: ipHash,
      p_user_agent: userAgent ? userAgent.substring(0, 255) : null
    });

    if (error) throw error;
    return { count: data, error: null };
  } catch (err) {
    console.warn('Non-critical download count increment warning:', err);
    return { count: null, error: err.message };
  }
}

/**
 * Atomically record resource view and increment view count via PostgreSQL RPC.
 */
export async function recordResourceView(resourceId, { userId = null } = {}) {
  if (!supabase || !resourceId) return { count: 0, error: 'Missing resource or Supabase client' };

  try {
    const { data, error } = await supabase.rpc('increment_resource_view', {
      p_resource_id: resourceId,
      p_user_id: userId
    });

    if (error) throw error;
    return { count: data, error: null };
  } catch (err) {
    console.warn('Non-critical view increment warning:', err);
    return { count: null, error: err.message };
  }
}

/**
 * Admin: Create a new resource metadata record.
 */
export async function adminCreateResource(resourceData) {
  if (!supabase) return { data: null, error: 'Supabase client not initialized' };

  try {
    const payload = {
      title: resourceData.title.trim(),
      slug: resourceData.slug || resourceData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      description: resourceData.description || '',
      category_id: resourceData.categoryId || resourceData.category_id,
      course_code: resourceData.courseCode ? resourceData.courseCode.toUpperCase().trim() : null,
      course_title: resourceData.courseTitle || null,
      level: resourceData.level ? resourceData.level.toString() : '300',
      semester: resourceData.semester || 'First Semester',
      resource_type: resourceData.resourceType || 'document',
      file_name: resourceData.fileName,
      file_type: resourceData.fileType || resourceData.fileExtension || 'pdf',
      file_extension: resourceData.fileExtension,
      mime_type: resourceData.mimeType,
      file_size: resourceData.fileSize || 0,
      storage_provider: resourceData.storageProvider || 'backblaze_b2',
      storage_bucket: resourceData.storageBucket || 'nacos-resources',
      storage_key: resourceData.storageKey,
      thumbnail_storage_key: resourceData.thumbnailStorageKey || resourceData.thumbnailKey || null,
      duration_seconds: resourceData.durationSeconds || 0,
      is_public: resourceData.isPublic !== undefined ? resourceData.isPublic : true,
      is_published: resourceData.isPublished !== undefined ? resourceData.isPublished : (resourceData.isActive !== undefined ? resourceData.isActive : true),
      is_active: resourceData.isActive !== undefined ? resourceData.isActive : true,
      uploaded_by: resourceData.uploadedBy || null
    };

    const { data, error } = await supabase
      .from('resources')
      .insert([payload])
      .select(`*, category:resource_categories(*)`)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Admin create resource error:', err);
    return { data: null, error: err.message || 'Failed to create resource' };
  }
}

/**
 * Admin: Update resource metadata record.
 */
export async function adminUpdateResource(id, updateData) {
  if (!supabase || !id) return { data: null, error: 'Missing ID or Supabase client' };

  try {
    const payload = { ...updateData, updated_at: new Date().toISOString() };
    if (payload.categoryId) {
      payload.category_id = payload.categoryId;
      delete payload.categoryId;
    }
    if (payload.courseCode) {
      payload.course_code = payload.courseCode.toUpperCase().trim();
      delete payload.courseCode;
    }
    if (payload.courseTitle) {
      payload.course_title = payload.courseTitle;
      delete payload.courseTitle;
    }
    if (payload.resourceType) {
      payload.resource_type = payload.resourceType;
      delete payload.resourceType;
    }
    if (payload.isPublic !== undefined) {
      payload.is_public = payload.isPublic;
      delete payload.isPublic;
    }
    if (payload.isPublished !== undefined) {
      payload.is_published = payload.isPublished;
      delete payload.isPublished;
    }
    if (payload.isActive !== undefined) {
      payload.is_active = payload.isActive;
      payload.is_published = payload.isActive;
      delete payload.isActive;
    }

    const { data, error } = await supabase
      .from('resources')
      .update(payload)
      .eq('id', id)
      .select(`*, category:resource_categories(*)`)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Admin update resource error:', err);
    return { data: null, error: err.message || 'Failed to update resource' };
  }
}

/**
 * Admin: Delete resource record and clean up associated Backblaze B2 storage files.
 */
export async function adminDeleteResource(id, storageKey = null, thumbnailKey = null) {
  if (!supabase || !id) return { success: false, error: 'Missing ID' };

  try {
    let keyToDelete = storageKey;
    let thumbToDelete = thumbnailKey;

    // If storage keys weren't passed directly, fetch them from the database first
    if (!keyToDelete) {
      const { data: current } = await supabase
        .from('resources')
        .select('storage_key, thumbnail_storage_key')
        .eq('id', id)
        .single();

      if (current) {
        keyToDelete = current.storage_key;
        thumbToDelete = thumbToDelete || current.thumbnail_storage_key;
      }
    }

    // 1. Delete associated Backblaze B2 files
    if (keyToDelete) {
      try {
        await storageService.delete(keyToDelete);
      } catch (delErr) {
        console.warn('Storage delete warning:', delErr);
      }
    }
    if (thumbToDelete) {
      try {
        await storageService.delete(thumbToDelete);
      } catch (delErr) {
        console.warn('Thumbnail storage delete warning:', delErr);
      }
    }

    // 2. Delete database record (cascades to download/view tracking)
    const { error } = await supabase
      .from('resources')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err) {
    console.error('Admin delete resource error:', err);
    return { success: false, error: err.message || 'Failed to delete resource' };
  }
}

/**
 * Admin: Get resource metrics and overview analytics.
 */
export async function adminGetResourceAnalytics() {
  if (!supabase) return { data: null, error: 'Supabase client not initialized' };

  try {
    // Total count
    const { count: totalResources, error: cErr } = await supabase
      .from('resources')
      .select('*', { count: 'exact', head: true });

    if (cErr) throw cErr;

    // Total active / published
    const { count: activeResources } = await supabase
      .from('resources')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Top 5 most downloaded
    const { data: topDownloaded } = await supabase
      .from('resources')
      .select('id, title, course_code, level, download_count, resource_type, category:resource_categories(name)')
      .order('download_count', { ascending: false })
      .limit(5);

    // Compute aggregate downloads and storage bytes
    const { data: allResources } = await supabase
      .from('resources')
      .select('download_count, category_id, resource_type, file_size');

    const totalDownloads = (allResources || []).reduce((acc, curr) => acc + (curr.download_count || 0), 0);
    const totalBytes = (allResources || []).reduce((acc, curr) => acc + (curr.file_size || 0), 0);

    // Recent uploads
    const { data: recentUploads } = await supabase
      .from('resources')
      .select('*, category:resource_categories(name)')
      .order('created_at', { ascending: false })
      .limit(6);

    return {
      data: {
        totalResources: totalResources || 0,
        activeResources: activeResources || 0,
        totalDownloads,
        totalStorageBytes: totalBytes,
        topDownloaded: topDownloaded || [],
        recentUploads: recentUploads || []
      },
      error: null
    };
  } catch (err) {
    console.error('Admin resource analytics error:', err);
    return { data: null, error: err.message };
  }
}

/**
 * Admin: Category management CRUD
 */
export async function adminCreateCategory(category) {
  if (!supabase) return { data: null, error: 'Supabase client not initialized' };
  try {
    const slug = category.slug || category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const { data, error } = await supabase
      .from('resource_categories')
      .insert([{
        name: category.name.trim(),
        slug,
        description: category.description || '',
        icon: category.icon || 'Folder',
        is_active: category.isActive !== undefined ? category.isActive : true
      }])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

export async function adminUpdateCategory(id, updateData) {
  if (!supabase || !id) return { data: null, error: 'Missing ID' };
  try {
    const { data, error } = await supabase
      .from('resource_categories')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

export async function adminDeleteCategory(id) {
  if (!supabase || !id) return { success: false, error: 'Missing ID' };
  try {
    const { error } = await supabase
      .from('resource_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
