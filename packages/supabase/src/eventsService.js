/**
 * eventsService.js
 * Centralized service for NACOS FUTO Events & Flyers.
 * Synchronizes authentic events between Supabase `website_events`, local storage, and Cloudinary media CDN.
 */

import { supabase } from './client.js';
import { syncMediaAsset, deleteMediaAsset } from './media.js';
import { recordAdminAction } from './adminAuth.js';
import { CLOUDINARY_FOLDERS, getCloudinaryAssetUrl } from '@nacos/media';

export const EVENTS_STORAGE_KEY = 'nacos_website_events_store';

export const INITIAL_EVENTS = [
  // ─── Upcoming Events ───
  {
    id: 'evt-1',
    slug: 'masked-affairs',
    title: 'Masked Affairs: Cum and Mingle',
    date: 'Aug 15, 2026',
    time: '8:00 PM',
    location: 'SOPS Theatre, FUTO',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569305/nacos/events/event_masked_affairs.jpg',
    cloudinary_public_id: 'nacos/events/event_masked_affairs',
    category: 'upcoming',
    description: 'Premium masked party, networking night, and social mixer hosted by the Office of the Directors of Socials. Dress code: Mask. Red carpet starts at 8:00 PM.',
    registration_link: 'https://forms.gle/nacosfuto-masked-affairs',
    is_published: true,
    is_featured: true,
    created_at: '2026-08-01T12:00:00Z'
  },
  {
    id: 'evt-2',
    slug: 'founders-table-1',
    title: 'The Founders Table 1.0',
    date: 'August 2026 (Anticipated)',
    time: '12:00 PM',
    location: 'CSC Seminar Hall, FUTO',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569304/nacos/events/event_founders_table.jpg',
    cloudinary_public_id: 'nacos/events/event_founders_table',
    category: 'upcoming',
    description: 'Convened by Kelechukwu Okere and Nestor Anyanwu. Delving into tech startups, entrepreneurship, venture capital, and building The Next Big Thing.',
    registration_link: 'https://forms.gle/nacosfuto-founders-table',
    is_published: true,
    is_featured: true,
    created_at: '2026-08-02T12:00:00Z'
  },
  {
    id: 'evt-3',
    slug: 'zonal-convention-2026',
    title: '16th Annual Zonal Convention (NACOS SE)',
    date: 'Sept 22-26, 2026',
    time: '9:00 AM',
    location: 'Ogbonnaya Onu Polytechnic, Aba',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569306/nacos/events/event_zonal_convention.jpg',
    cloudinary_public_id: 'nacos/events/event_zonal_convention',
    category: 'upcoming',
    description: 'Theme: d.i.g.i.t (Develop, Innovate, Grow, Inspire, Transform). Featuring panel sessions, keynote talks, hackathons, and regional networking.',
    registration_link: 'https://forms.gle/nacos-se-zonal-convention-2026',
    is_published: true,
    is_featured: false,
    created_at: '2026-08-03T12:00:00Z'
  },

  // ─── Recent Events ───
  {
    id: 'evt-4',
    slug: 'allstars-media-1',
    title: 'All-Stars Media Conference 1.0',
    date: 'July 16, 2026',
    time: '11:00 AM',
    location: 'SOPS Theater, FUTO',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569307/nacos/events/event_allstars_media.jpg',
    cloudinary_public_id: 'nacos/events/event_allstars_media',
    category: 'recent',
    description: 'Theme: The New Media Order: Risk, Innovation, Influence & Impact. Organized by the PRO/DOI of CSC in collaboration with FSSJ.',
    registration_link: 'https://forms.gle/nacosfuto-allstars-media',
    is_published: true,
    is_featured: true,
    created_at: '2026-07-16T11:00:00Z'
  },
  {
    id: 'evt-5',
    slug: 'atf-ai-challenge',
    title: 'The ATF AI Challenge',
    date: 'May 27, 2026',
    time: '7:00 PM',
    location: 'Google Meet',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569308/nacos/events/event_atf_ai_challenge.jpg',
    cloudinary_public_id: 'nacos/events/event_atf_ai_challenge',
    category: 'recent',
    description: "African Technology Forum presents the ATF AI Challenge: Don't just watch the AI Revolution, lead it.",
    registration_link: 'https://forms.gle/nacosfuto-atf-ai-challenge',
    is_published: true,
    is_featured: false,
    created_at: '2026-05-27T19:00:00Z'
  },
  {
    id: 'evt-6',
    slug: 'ieee-opportunities',
    title: 'From Campus to Global Opportunities with IEEE',
    date: 'May 26, 2026',
    time: '7:00 PM',
    location: 'Google Meet',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569309/nacos/events/event_ieee_opportunities.jpg',
    cloudinary_public_id: 'nacos/events/event_ieee_opportunities',
    category: 'recent',
    description: 'Office of the Director of ICT in collaboration with IEEE present global opportunities and community leverage.',
    registration_link: 'https://forms.gle/nacosfuto-ieee-opportunities',
    is_published: true,
    is_featured: false,
    created_at: '2026-05-26T19:00:00Z'
  },

  // ─── Past / Concluded Events ───
  {
    id: 'evt-7',
    slug: 'bridging-the-gap',
    title: 'Bridging the Gap: Collaboration for Inclusion',
    date: 'May 01, 2026',
    time: '7:00 PM',
    location: 'Google Meet',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569310/nacos/events/event_bridging_gap.jpg',
    cloudinary_public_id: 'nacos/events/event_bridging_gap',
    category: 'past',
    description: "International Women's Day Edition focusing on collaboration for inclusion in tech. Supported by GDG FUTO, J-Tech Academy, and IEEE.",
    is_published: true,
    is_featured: false,
    created_at: '2026-05-01T19:00:00Z'
  },
  {
    id: 'evt-8',
    slug: 'linkedin-winning',
    title: 'Stand Out or Stay Stuck: Winning with LinkedIn',
    date: 'April 28, 2026',
    time: '7:00 PM',
    location: 'Google Meet',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569311/nacos/events/event_linkedin_branding.jpg',
    cloudinary_public_id: 'nacos/events/event_linkedin_branding',
    category: 'past',
    description: 'Learn to build your personal brand and stand out on LinkedIn. Organized by FUTO Ambassadors.',
    is_published: true,
    is_featured: false,
    created_at: '2026-04-28T19:00:00Z'
  },
  {
    id: 'evt-9',
    slug: 'cv-cover-letter',
    title: 'Global CV & Cover Letter Masterclass',
    date: 'April 25, 2026',
    time: '7:00 PM',
    location: 'Google Meet',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569312/nacos/events/event_cv_masterclass.jpg',
    cloudinary_public_id: 'nacos/events/event_cv_masterclass',
    category: 'past',
    description: 'Build, Optimize & Get Reviewed Live. Learn how to draft winning CVs and cover letters for global job roles.',
    is_published: true,
    is_featured: false,
    created_at: '2026-04-25T19:00:00Z'
  },
  {
    id: 'evt-10',
    slug: 'unfair-advantage',
    title: 'Your Unfair Advantage: Winning in Tech in 2026',
    date: 'March 21, 2026',
    time: '8:00 PM',
    location: 'Google Meet',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569313/nacos/events/event_unfair_advantage.jpg',
    cloudinary_public_id: 'nacos/events/event_unfair_advantage',
    category: 'past',
    description: 'Organized by Beyonder Network. A comprehensive session detailing career positioning and strategies to build competitive advantages in modern tech fields.',
    is_published: true,
    is_featured: false,
    created_at: '2026-03-21T20:00:00Z'
  },
  {
    id: 'evt-11',
    slug: 'thanksgiving-mass',
    title: 'NACOS Thanksgiving Mass',
    date: 'March 07, 2026',
    time: '7:15 AM',
    location: 'Campus Chapel, FUTO',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569314/nacos/events/event_nacos_thanksgiving_mass.jpg',
    cloudinary_public_id: 'nacos/events/event_nacos_thanksgiving_mass',
    category: 'past',
    description: 'Official NACOS Week Thanksgiving Mass hosted by the Office of the Vice President, Nigeria Association of Computing Students (NACOS), FUTO. Celebrating faith, gratitude, and unity to round off NACOS Week.',
    is_published: true,
    is_featured: false,
    created_at: '2026-03-07T07:15:00Z'
  },
  {
    id: 'evt-12',
    slug: 'asicts-tech-talk',
    title: 'ASICTS Tech Talk: Google Tools for Student Techies',
    date: 'March 07, 2026',
    time: '7:30 PM',
    location: 'Google Meet',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569315/nacos/events/event_asicts_techtalk.jpg',
    cloudinary_public_id: 'nacos/events/event_asicts_techtalk',
    category: 'past',
    description: 'In collaboration with Google Developer Group On Campus FUTO. Equipping students with Google workspace and developer toolchains.',
    is_published: true,
    is_featured: false,
    created_at: '2026-03-07T19:30:00Z'
  },
  {
    id: 'evt-13',
    slug: 'oldschool-picnic',
    title: 'Old School & Picnic Day',
    date: 'March 06, 2026',
    time: 'All Day',
    location: 'Picnic Ground, FUTO',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569316/nacos/events/event_oldschool_picnic.jpg',
    cloudinary_public_id: 'nacos/events/event_oldschool_picnic',
    category: 'past',
    description: 'Featuring games, networking, treasure hunt, karaoke, drinks, and music. Organized by the Office of the Vice President as part of NACOS Week.',
    is_published: true,
    is_featured: false,
    created_at: '2026-03-06T10:00:00Z'
  },
  {
    id: 'evt-14',
    slug: 'sports-day',
    title: 'NACOS Sports Day',
    date: 'March 04, 2026',
    time: '10:00 AM',
    location: 'CSC Building, FUTO',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569317/nacos/events/event_nacos_sportsday.jpg',
    cloudinary_public_id: 'nacos/events/event_nacos_sportsday',
    category: 'past',
    description: 'NACOS Week Sports Day featuring football, indoor and outdoor games, and athletic competitions organized by the Office of the Vice President.',
    is_published: true,
    is_featured: false,
    created_at: '2026-03-04T10:00:00Z'
  },
  {
    id: 'evt-15',
    slug: 'nacos-week-schedule',
    title: 'NACOS Week Program Schedule',
    date: 'March 02 - 08, 2026',
    time: 'Various Times',
    location: 'FUTO Campus',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569318/nacos/events/event_nacos_schedule.jpg',
    cloudinary_public_id: 'nacos/events/event_nacos_schedule',
    category: 'past',
    description: 'Official program schedule for NACOS Week featuring Tech/Corporate Day, Sports Day, Cultural & Award Presentation, Picnic/Old School Day, and Thanksgiving Mass.',
    is_published: true,
    is_featured: false,
    created_at: '2026-03-02T08:00:00Z'
  },
  {
    id: 'evt-16',
    slug: 'tech-day-path-to-tech',
    title: 'Tech Day: Path to Tech',
    date: 'March 02, 2026',
    time: '10:00 AM',
    location: 'CYB Research Center, FUTO',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569319/nacos/events/event_tech_day.jpg',
    cloudinary_public_id: 'nacos/events/event_tech_day',
    category: 'past',
    description: 'Explore the path to tech covering Innovation, AI, Software, and Future Tech during NACOS Week.',
    is_published: true,
    is_featured: false,
    created_at: '2026-03-02T10:00:00Z'
  },
  {
    id: 'evt-17',
    slug: 'tech-rewind-expo',
    title: 'Tech Rewind & Expo',
    date: 'Feb 20, 2026',
    time: '7:00 PM',
    location: 'Google Meet',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569320/nacos/events/event_tech_rewind.jpg',
    cloudinary_public_id: 'nacos/events/event_tech_rewind',
    category: 'past',
    description: 'Fireside chat and open-mic webinar organized by the Office of the Director of ICT. A review of tech trends and student project showcase.',
    is_published: true,
    is_featured: false,
    created_at: '2026-02-20T19:00:00Z'
  },
  {
    id: 'evt-18',
    slug: 'safer-internet-day',
    title: 'Safer Internet Day: Smart Tech Safe Choices',
    date: 'Feb 13, 2026',
    time: '1:00 PM',
    location: 'CSC Department Building',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569321/nacos/events/event_safer_internet.jpg',
    cloudinary_public_id: 'nacos/events/event_safer_internet',
    category: 'past',
    description: 'Presented by the Department of Computer Science in partnership with Internet Society Nigeria Chapter. Focus on safe, responsible use of AI.',
    is_published: true,
    is_featured: false,
    created_at: '2026-02-13T13:00:00Z'
  },
  {
    id: 'evt-19',
    slug: 'global-internship-series',
    title: 'Global Internship Series (Technology Track)',
    date: 'Jan 17, 2026',
    time: '5:00 PM',
    location: 'Google Meet',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569322/nacos/events/event_global_internship.jpg',
    cloudinary_public_id: 'nacos/events/event_global_internship',
    category: 'past',
    description: 'Featuring global internship application strategies, CV & LinkedIn optimization, interview preparation tips, and resources that actually work.',
    is_published: true,
    is_featured: false,
    created_at: '2026-01-17T17:00:00Z'
  }
];

function normalizeEvent(e) {
  return {
    ...e,
    image: e.image_url || e.image,
    image_url: e.image_url || e.image,
    date: e.date || e.event_date,
    event_date: e.date || e.event_date,
    time: e.time || e.event_time,
    event_time: e.time || e.event_time,
    category: e.category || 'upcoming',
    is_published: e.is_published !== false,
    is_featured: Boolean(e.is_featured)
  };
}

/**
 * Get events from local storage with fallback to INITIAL_EVENTS
 */
export function getEvents({ category = 'all', publishedOnly = false } = {}) {
  if (typeof window === 'undefined') {
    let list = INITIAL_EVENTS.map(normalizeEvent);
    if (publishedOnly) list = list.filter(e => e.is_published);
    if (category !== 'all') list = list.filter(e => e.category === category);
    return list;
  }

  try {
    const raw = localStorage.getItem(EVENTS_STORAGE_KEY);
    let list = raw ? JSON.parse(raw) : null;

    if (!list || !Array.isArray(list) || list.length === 0) {
      list = INITIAL_EVENTS;
      localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(list));
    }

    let normalized = list.map(normalizeEvent);
    if (publishedOnly) normalized = normalized.filter(e => e.is_published);
    if (category !== 'all') normalized = normalized.filter(e => e.category === category);
    return normalized;
  } catch (err) {
    console.warn('Error reading events storage:', err);
    let fallback = INITIAL_EVENTS.map(normalizeEvent);
    if (publishedOnly) fallback = fallback.filter(e => e.is_published);
    if (category !== 'all') fallback = fallback.filter(e => e.category === category);
    return fallback;
  }
}

/**
 * Save updated events array locally and dispatch event
 */
export function saveLocalEvents(events) {
  if (typeof window === 'undefined') return;
  const normalized = events.map(normalizeEvent);
  localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new Event('nacos_website_events_updated'));
}

/**
 * Fetch events from Supabase `website_events` table with local storage fallback
 */
export async function fetchEventsFromSupabase() {
  try {
    if (supabase) {
      // 1. Authoritative check on live Supabase store_events row
      const { data: storeRow } = await supabase
        .from('id_card_settings')
        .select('academic_session')
        .eq('id', 'store_events')
        .maybeSingle();

      if (storeRow?.academic_session) {
        try {
          const parsed = JSON.parse(storeRow.academic_session);
          if (Array.isArray(parsed) && parsed.length > 0) {
            saveLocalEvents(parsed);
            return parsed;
          }
        } catch (e) {}
      }

      // 2. Fetch live events from media_assets where category = 'events'
      const { data: mediaEvents, error: mediaError } = await supabase
        .from('media_assets')
        .select('*')
        .eq('category', 'events')
        .order('created_at', { ascending: false });

      if (!mediaError && mediaEvents && mediaEvents.length > 0) {
        const parsedEvents = [];
        for (const item of mediaEvents) {
          try {
            if (item.image_alt && item.image_alt.startsWith('{')) {
              const obj = JSON.parse(item.image_alt);
              parsedEvents.push(normalizeEvent({
                ...obj,
                id: obj.id || item.entity_id || item.id,
                image_url: item.image_url || obj.image_url,
                cloudinary_public_id: item.cloudinary_public_id || obj.cloudinary_public_id
              }));
            }
          } catch (e) {}
        }

        if (parsedEvents.length > 0) {
          const remoteSlugs = new Set(parsedEvents.map(e => e.slug || e.id));
          const localInitials = INITIAL_EVENTS.map(normalizeEvent).filter(e => !remoteSlugs.has(e.slug || e.id));
          const merged = [...parsedEvents, ...localInitials];

          saveLocalEvents(merged);
          return merged;
        }
      }

      // 3. Fallback to website_events table
      const { data, error } = await supabase
        .from('website_events')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const mapped = data.map(d => normalizeEvent({
          id: d.id,
          title: d.title,
          slug: d.slug,
          date: d.event_date,
          time: d.event_time,
          location: d.location,
          description: d.description,
          image_url: d.image_url,
          cloudinary_public_id: d.cloudinary_public_id,
          category: d.category || 'upcoming',
          registration_link: d.registration_link || d.link || null,
          is_published: d.is_published !== false,
          is_featured: Boolean(d.is_featured),
          created_at: d.created_at
        }));

        const local = getEvents({ category: 'all' });
        const remoteSlugs = new Set(mapped.map(m => m.slug || m.id));
        const merged = [...mapped, ...local.filter(l => !remoteSlugs.has(l.slug || l.id))];

        saveLocalEvents(merged);
        return merged;
      }
    }
  } catch (err) {
    console.warn('Supabase events fetch error, falling back to local storage:', err);
  }

  return getEvents({ category: 'all' });
}

async function getRemoteStoreEvents() {
  const fallback = getEvents({ category: 'all' });
  try {
    if (supabase) {
      const { data: storeRow } = await supabase
        .from('id_card_settings')
        .select('academic_session')
        .eq('id', 'store_events')
        .maybeSingle();
      if (storeRow?.academic_session) {
        const parsed = JSON.parse(storeRow.academic_session);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map();
          parsed.forEach(item => { if (item?.id || item?.slug) map.set(item.id || item.slug, item); });
          fallback.forEach(item => { if ((item?.id || item?.slug) && !map.has(item.id || item.slug)) map.set(item.id || item.slug, item); });
          return Array.from(map.values()).map(normalizeEvent);
        }
      }
    }
  } catch (_) {}
  return fallback;
}

export async function saveEvent(eventData) {
  const current = await getRemoteStoreEvents();
  const id = eventData.id || `evt-${Date.now()}`;
  const now = new Date().toISOString();
  const slug = eventData.slug || eventData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const normalized = normalizeEvent({
    ...eventData,
    id,
    slug,
    created_at: eventData.created_at || now,
    updated_at: now
  });

  const existingIdx = current.findIndex(e => e.id === id || e.slug === slug);
  let updated;
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = { ...updated[existingIdx], ...normalized };
  } else {
    updated = [normalized, ...current];
  }

  saveLocalEvents(updated);

  // Authoritative live sync to Supabase store_events
  try {
    if (supabase) {
      await supabase.from('id_card_settings').upsert({
        id: 'store_events',
        academic_session: JSON.stringify(updated),
        updated_at: now
      });
    }
  } catch (err) {
    console.warn('Supabase store_events save error:', err);
  }

  // 1. Sync with media_assets for universal multi-device live sync
  try {
    if (supabase) {
      const pubId = normalized.cloudinary_public_id || `nacos/events/${normalized.slug}`;
      await supabase.from('media_assets').upsert({
        cloudinary_public_id: pubId,
        image_url: normalized.image_url || 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569305/nacos/events/event_masked_affairs.jpg',
        image_alt: JSON.stringify(normalized),
        media_type: 'image',
        folder: CLOUDINARY_FOLDERS.EVENTS || 'nacos/events',
        category: 'events',
        entity_type: 'event',
        entity_id: normalized.slug,
        updated_at: now
      }, { onConflict: 'cloudinary_public_id' });
    }
  } catch (err) {
    console.warn('Universal media_assets event sync notice:', err);
  }

  // 2. Also attempt website_events table
  try {
    if (supabase) {
      await supabase
        .from('website_events')
        .upsert({
          id: normalized.id.startsWith('evt-') ? undefined : normalized.id,
          title: normalized.title,
          slug: normalized.slug,
          event_date: normalized.date,
          event_time: normalized.time,
          location: normalized.location,
          description: normalized.description,
          image_url: normalized.image_url,
          cloudinary_public_id: normalized.cloudinary_public_id,
          category: normalized.category,
          registration_link: normalized.registration_link,
          is_published: normalized.is_published,
          is_featured: normalized.is_featured,
          updated_at: now
        }, { onConflict: 'slug' });
    }
  } catch (err) {
    console.warn('Remote sync notice for event table:', err);
  }

  return normalized;
}

export async function deleteEvent(eventItem) {
  const current = await getRemoteStoreEvents();
  const targetId = typeof eventItem === 'string' ? eventItem : eventItem?.id;
  const targetSlug = typeof eventItem === 'object' ? eventItem?.slug : null;
  const pubId = typeof eventItem === 'object' ? eventItem?.cloudinary_public_id : null;

  const updated = current.filter(e => {
    if (targetId && e.id === targetId) return false;
    if (targetSlug && e.slug === targetSlug) return false;
    return true;
  });

  saveLocalEvents(updated);

  // Authoritative live sync to Supabase store_events
  try {
    if (supabase) {
      await supabase.from('id_card_settings').upsert({
        id: 'store_events',
        academic_session: JSON.stringify(updated),
        updated_at: new Date().toISOString()
      });
    }
  } catch (err) {
    console.warn('Supabase store_events delete sync error:', err);
  }

  // Delete from media_assets
  try {
    if (supabase) {
      if (targetSlug) {
        await supabase.from('media_assets').delete().eq('entity_id', targetSlug);
      }
      if (targetId) {
        await supabase.from('media_assets').delete().eq('entity_id', targetId);
      }
      if (pubId) {
        await supabase.from('media_assets').delete().eq('cloudinary_public_id', pubId);
      }
    }
  } catch (e) {
    console.warn('Universal media_assets delete notice for event:', e);
  }

  if (pubId) {
    try {
      await deleteMediaAsset(pubId);
    } catch (e) {
      console.warn('Cloudinary delete notice:', e);
    }
  }

  try {
    if (supabase) {
      if (targetSlug) {
        await supabase.from('website_events').delete().eq('slug', targetSlug);
      } else if (targetId && !targetId.startsWith('evt-')) {
        await supabase.from('website_events').delete().eq('id', targetId);
      }
    }
  } catch (err) {
    console.warn('Supabase delete event notice:', err);
  }

  return updated;
}

export async function toggleEventPublish(id) {
  const current = getEvents({ category: 'all' });
  let nextPublished = false;
  let targetSlug = null;

  const updated = current.map(e => {
    if (e.id === id) {
      nextPublished = !e.is_published;
      targetSlug = e.slug;
      return { ...e, is_published: nextPublished };
    }
    return e;
  });

  saveLocalEvents(updated);

  // Authoritative live sync to Supabase store_events
  try {
    if (supabase) {
      await supabase.from('id_card_settings').upsert({
        id: 'store_events',
        academic_session: JSON.stringify(updated),
        updated_at: new Date().toISOString()
      });
    }
  } catch (err) {
    console.warn('Supabase store_events toggle sync error:', err);
  }

  if (targetSlug && supabase) {
    try {
      await supabase.from('website_events').update({ is_published: nextPublished }).eq('slug', targetSlug);
    } catch (err) {
      console.warn('Supabase toggle event publish notice:', err);
    }
  }

  return updated;
}

/**
 * Toggle featured status of an event
 */
export async function toggleEventFeatured(id) {
  const current = getEvents({ category: 'all' });
  let nextFeatured = false;
  let targetSlug = null;

  const updated = current.map(e => {
    if (e.id === id) {
      nextFeatured = !e.is_featured;
      targetSlug = e.slug;
      return { ...e, is_featured: nextFeatured };
    }
    return e;
  });

  saveLocalEvents(updated);

  // Authoritative live sync to Supabase store_events
  try {
    if (supabase) {
      await supabase.from('id_card_settings').upsert({
        id: 'store_events',
        academic_session: JSON.stringify(updated),
        updated_at: new Date().toISOString()
      });
    }
  } catch (err) {
    console.warn('Supabase store_events toggle featured error:', err);
  }

  if (targetSlug && supabase) {
    try {
      await supabase.from('website_events').update({ is_featured: nextFeatured }).eq('slug', targetSlug);
    } catch (err) {
      console.warn('Supabase toggle event featured notice:', err);
    }
  }

  return updated;
}
