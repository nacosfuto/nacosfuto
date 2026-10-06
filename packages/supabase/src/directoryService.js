/**
 * directoryService.js
 * Centralized directory management for:
 * 1. Yellow Pages Indigenous Student Businesses
 * 2. Campus Clubs & Student Tech Communities
 * 3. Alumni Network & Hall of Fame Spotlights
 * 
 * Supports submission, Cloudinary image flyers/photos, approval workflow,
 * deletion, and automated admin notification dispatch.
 */

import { addAdminNotification } from './notificationService.js';
import { supabase } from './client.js';

const YELLOW_PAGES_STORAGE_KEY = 'nacos_yellow_pages_db';
const CAMPUS_CLUBS_STORAGE_KEY = 'nacos_campus_clubs_db';
const ALUMNI_STORAGE_KEY = 'nacos_alumni_directory_db';

// ─── INITIAL SEEDED YELLOW PAGES ───
const INITIAL_YELLOW_PAGES = [
  {
    id: 'yp-1',
    name: 'Peacemaker Tech',
    category: 'Gadgets & Repairs',
    secondaryCategories: ['Tech & Coding'],
    ownerName: 'Peacemaker Tech',
    ownerLevel: 'Student Business',
    description: 'Software & Game installations, Windows upgrading/downgrading, Loading Windows on Macbook PC, installation of Windows/Mac OS apps, and general software troubleshooting.',
    location: 'FUTO Campus / Hostel Delivery',
    phone: '+2347088180036',
    whatsapp: '2349161081187',
    email: 'peacemaker@nacos.org.ng',
    rating: 5.0,
    reviewsCount: 14,
    image: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569313/nacos/yellow_pages/flyer_peacemaker.jpg',
    imagePosition: 'top left', // Enforces AGENTS.md rule
    status: 'approved',
    createdAt: '2026-08-01T10:00:00Z'
  },
  {
    id: 'yp-2',
    name: 'Niforix',
    category: 'Graphics & Printing',
    secondaryCategories: ['Tech & Coding'],
    ownerName: 'Niforix',
    ownerLevel: 'Student Business',
    description: 'Graphics Design, Branding, UI/UX, Website Design, CAC/NUPRC/SMEDAN Registrations, Social Media Management, Technical/Resume Writing, E-Pin sales, and IT Consulting.',
    location: 'FUTO Campus / Remote 24/7',
    phone: '+2349060900245',
    whatsapp: '2349060900245',
    email: 'niforix@nacos.org.ng',
    rating: 5.0,
    reviewsCount: 25,
    image: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569311/nacos/yellow_pages/flyer_niforix.jpg',
    imagePosition: 'top right', // Enforces AGENTS.md rule
    status: 'approved',
    createdAt: '2026-08-05T12:00:00Z'
  },
  {
    id: 'yp-3',
    name: 'Cypher.dev Shadow Boost',
    category: 'Tech & Coding',
    secondaryCategories: ['Tech & Coding'],
    ownerName: 'Cypher.dev',
    ownerLevel: 'Alumni Tech Enterprise',
    description: 'Bespoke Web & Mobile app engineering, cloud microservice setup, automated bots, algorithm design, software architecture consulting, and student project mentorship.',
    location: 'Remote / Worldwide',
    phone: '+2348000000000',
    whatsapp: '2348000000000',
    email: 'dev@cypher.org.ng',
    rating: 5.0,
    reviewsCount: 30,
    image: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569310/nacos/yellow_pages/flyer_cypher.jpg',
    imagePosition: 'top center', // Enforces AGENTS.md rule
    status: 'approved',
    createdAt: '2026-08-08T14:00:00Z'
  },
  {
    id: 'yp-4',
    name: "Nina's Luxury Braids & Wigs",
    category: 'Fashion & Styling',
    secondaryCategories: ['Other Services'],
    ownerName: 'Nina O.',
    ownerLevel: '300 Level',
    description: 'Professional knotless braids, bohemian box braids, wig revamping, frontal installation, and hair treatment with free campus delivery.',
    location: 'Hostel A / Eziobodo Gate',
    phone: '+2348123456789',
    whatsapp: '2348123456789',
    email: '',
    rating: 4.9,
    reviewsCount: 19,
    image: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569312/nacos/yellow_pages/flyer_ninas_braid.jpg',
    imagePosition: 'top center', // Enforces AGENTS.md rule
    status: 'approved',
    createdAt: '2026-08-12T16:00:00Z'
  }
];

// ─── INITIAL SEEDED CAMPUS CLUBS ───
const INITIAL_CAMPUS_CLUBS = [
  {
    id: 'club-1',
    name: 'AWS Student Builder Group FUTO',
    category: 'Cloud & Infrastructure',
    description: 'Vibrant community of student developers learning and building high-scale architectures on Amazon Web Services.',
    image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
    leadName: 'Lead Cloud Ambassador',
    link: 'https://chat.whatsapp.com/G6yBotu4LJ03kpUMitcgGT',
    status: 'approved',
    createdAt: '2026-07-20T10:00:00Z'
  },
  {
    id: 'club-2',
    name: 'Genesys Tech Club FUTO',
    category: 'Software Engineering',
    description: 'Empowering student engineers with world-class software development skills, internships, and industry exposure.',
    image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=800&q=80',
    leadName: 'Genesys Campus Lead',
    link: 'https://chat.whatsapp.com/Lwp51TSHlcAHemzfnbPiqR',
    status: 'approved',
    createdAt: '2026-07-25T11:00:00Z'
  },
  {
    id: 'club-3',
    name: 'GDG on Campus FUTO',
    category: 'Google Technologies',
    description: 'Learn Android, Flutter, Firebase, TensorFlow, and Google Cloud with passionate peer developers.',
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80',
    leadName: 'GDG Organizer',
    link: 'https://gdg.community.dev',
    status: 'approved',
    createdAt: '2026-08-01T12:00:00Z'
  },
  {
    id: 'club-4',
    name: 'FUTO Tech Club (FTC)',
    category: 'Innovation & Hardware',
    description: 'The premier university-wide collaborative hub for student innovators, IoT enthusiasts, and embedded system builders.',
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
    leadName: 'President, FTC',
    link: '#',
    status: 'approved',
    createdAt: '2026-08-05T14:00:00Z'
  }
];

// ─── INITIAL SEEDED ALUMNI ───
const INITIAL_ALUMNI = [
  {
    id: 'alm-1',
    name: 'Godfirst Asogwa',
    gradYear: 'Class of 2023',
    position: 'Lead Software Engineer',
    company: 'Enterprise Cloud Solutions',
    linkedin: 'https://www.linkedin.com/in/godfirst-asogwa/',
    image: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569300/nacos/alumni/alumni_godfirst.jpg',
    bio: 'Pioneered several departmental digital systems and currently leads distributed frontend engineering teams building scalable fintech platforms.',
    status: 'approved',
    createdAt: '2026-06-10T10:00:00Z'
  },
  {
    id: 'alm-2',
    name: 'Benita Nwabueze',
    gradYear: 'Class of 2022',
    position: 'Senior Cybersecurity Analyst',
    company: 'Global Information Security Group',
    linkedin: 'https://www.linkedin.com/in/nwabueze-benita/',
    image: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569301/nacos/alumni/alumni_benita.jpg',
    bio: 'Specialist in threat intelligence, cloud infrastructure security, and vulnerability remediation across African and European enterprises.',
    status: 'approved',
    createdAt: '2026-06-15T12:00:00Z'
  }
];

// ═══════════════════════════════════════════════════════════════
// 1. YELLOW PAGES DIRECTORY METHODS
// ═══════════════════════════════════════════════════════════════

export function getYellowPages(statusFilter = 'all') {
  if (typeof window === 'undefined') return INITIAL_YELLOW_PAGES;
  try {
    const raw = localStorage.getItem(YELLOW_PAGES_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : INITIAL_YELLOW_PAGES;
    if (!raw) {
      localStorage.setItem(YELLOW_PAGES_STORAGE_KEY, JSON.stringify(INITIAL_YELLOW_PAGES));
    }
    if (statusFilter === 'all') return list;
    return list.filter(b => b.status === statusFilter);
  } catch (err) {
    console.warn('Error reading yellow pages:', err);
    return INITIAL_YELLOW_PAGES;
  }
}

export const getYellowPagesBusinesses = getYellowPages;

export async function fetchYellowPagesFromSupabase(statusFilter = 'all') {
  try {
    if (supabase) {
      let query = supabase.from('yellow_pages').select('*').order('created_at', { ascending: false });
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        // Map database snake_case to frontend camelCase
        const mapped = data.map(b => ({
          id: b.id,
          name: b.name,
          category: b.category,
          secondaryCategories: Array.isArray(b.secondary_categories) ? b.secondary_categories : [],
          ownerName: b.owner_name,
          ownerLevel: b.owner_level,
          description: b.description,
          location: b.location,
          phone: b.phone,
          whatsapp: b.whatsapp,
          email: b.email,
          rating: Number(b.rating || 5.0),
          reviewsCount: Number(b.reviews_count || 0),
          image: b.image,
          cloudinary_public_id: b.cloudinary_public_id,
          imagePosition: b.image_position || 'top center',
          status: b.status,
          createdAt: b.created_at
        }));
        if (typeof window !== 'undefined') {
          localStorage.setItem(YELLOW_PAGES_STORAGE_KEY, JSON.stringify(mapped));
          window.dispatchEvent(new Event('nacos_yellow_pages_updated'));
        }
        return mapped;
      }
    }
  } catch (err) {
    console.warn('Supabase fetchYellowPagesFromSupabase error, using local:', err);
  }
  return getYellowPages(statusFilter);
}

export async function submitYellowPageBusiness(businessData) {
  const list = getYellowPages('all');
  const id = businessData.id || `yp-${Date.now()}`;
  const now = new Date().toISOString();
  const newBusiness = {
    id,
    ...businessData,
    imagePosition: businessData.imagePosition || 'top center',
    status: businessData.status || 'pending', // Requires admin approval unless pre-approved
    createdAt: now
  };

  const updated = [newBusiness, ...list.filter(b => b.id !== id)];
  if (typeof window !== 'undefined') {
    localStorage.setItem(YELLOW_PAGES_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('nacos_yellow_pages_updated'));
  }

  // Trigger real-time Admin notification
  addAdminNotification({
    type: 'yellow_pages',
    title: 'New Business Pending Approval',
    message: `"${newBusiness.name}" submitted a student business listing waiting for review.`,
    entityId: newBusiness.id,
    link: '/admin/yellow-pages'
  });

  try {
    if (supabase) {
      await supabase.from('yellow_pages').upsert({
        id: newBusiness.id,
        name: newBusiness.name,
        category: newBusiness.category,
        secondary_categories: newBusiness.secondaryCategories || [],
        owner_name: newBusiness.ownerName || '',
        owner_level: newBusiness.ownerLevel || '',
        description: newBusiness.description || '',
        location: newBusiness.location || '',
        phone: newBusiness.phone || '',
        whatsapp: newBusiness.whatsapp || '',
        email: newBusiness.email || '',
        rating: newBusiness.rating || 5.0,
        reviews_count: newBusiness.reviewsCount || 0,
        image: newBusiness.image || '',
        cloudinary_public_id: newBusiness.cloudinary_public_id || '',
        image_position: newBusiness.imagePosition || 'top center',
        status: newBusiness.status,
        created_at: now,
        updated_at: now
      }, { onConflict: 'id' });
    }
  } catch (err) {
    console.warn('Could not sync business to Supabase:', err);
  }

  return newBusiness;
}

export async function updateYellowPageBusiness(id, updates) {
  const list = getYellowPages('all');
  const now = new Date().toISOString();
  let updatedItem = null;

  const updatedList = list.map(b => {
    if (b.id === id) {
      updatedItem = {
        ...b,
        ...updates,
        imagePosition: updates.imagePosition || b.imagePosition || 'top center',
        updatedAt: now
      };
      return updatedItem;
    }
    return b;
  });

  if (!updatedItem) return null;

  if (typeof window !== 'undefined') {
    localStorage.setItem(YELLOW_PAGES_STORAGE_KEY, JSON.stringify(updatedList));
    window.dispatchEvent(new Event('nacos_yellow_pages_updated'));
  }

  try {
    if (supabase) {
      await supabase.from('yellow_pages').upsert({
        id: updatedItem.id,
        name: updatedItem.name,
        category: updatedItem.category,
        secondary_categories: updatedItem.secondaryCategories || [],
        owner_name: updatedItem.ownerName || '',
        owner_level: updatedItem.ownerLevel || '',
        description: updatedItem.description || '',
        location: updatedItem.location || '',
        phone: updatedItem.phone || '',
        whatsapp: updatedItem.whatsapp || '',
        email: updatedItem.email || '',
        rating: updatedItem.rating || 5.0,
        reviews_count: updatedItem.reviewsCount || 0,
        image: updatedItem.image || '',
        cloudinary_public_id: updatedItem.cloudinary_public_id || '',
        image_position: updatedItem.imagePosition || 'top center',
        status: updatedItem.status || 'approved',
        updated_at: now
      }, { onConflict: 'id' });
    }
  } catch (err) {
    console.warn('Could not sync updated business to Supabase:', err);
  }

  return updatedItem;
}

export async function approveYellowPageBusiness(id) {
  const list = getYellowPages('all');
  const updated = list.map(b => b.id === id ? { ...b, status: 'approved' } : b);
  if (typeof window !== 'undefined') {
    localStorage.setItem(YELLOW_PAGES_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('nacos_yellow_pages_updated'));
  }
  try {
    if (supabase) {
      await supabase.from('yellow_pages').update({ status: 'approved', updated_at: new Date().toISOString() }).eq('id', id);
    }
  } catch (e) {
    console.warn('Supabase approve error:', e);
  }
  return updated;
}

export async function denyYellowPageBusiness(id) {
  const list = getYellowPages('all');
  const updated = list.map(b => b.id === id ? { ...b, status: 'denied' } : b);
  if (typeof window !== 'undefined') {
    localStorage.setItem(YELLOW_PAGES_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('nacos_yellow_pages_updated'));
  }
  try {
    if (supabase) {
      await supabase.from('yellow_pages').update({ status: 'denied', updated_at: new Date().toISOString() }).eq('id', id);
    }
  } catch (e) {
    console.warn('Supabase deny error:', e);
  }
  return updated;
}

export async function deleteYellowPageBusiness(id) {
  const list = getYellowPages('all');
  const updated = list.filter(b => b.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(YELLOW_PAGES_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('nacos_yellow_pages_updated'));
  }
  try {
    if (supabase) {
      await supabase.from('yellow_pages').delete().eq('id', id);
    }
  } catch (e) {
    console.warn('Supabase delete error:', e);
  }
  return updated;
}

// ═══════════════════════════════════════════════════════════════
// 2. CAMPUS CLUBS DIRECTORY METHODS
// ═══════════════════════════════════════════════════════════════

export function getCampusClubs(statusFilter = 'all') {
  if (typeof window === 'undefined') return INITIAL_CAMPUS_CLUBS;
  try {
    const raw = localStorage.getItem(CAMPUS_CLUBS_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : INITIAL_CAMPUS_CLUBS;
    if (!raw) {
      localStorage.setItem(CAMPUS_CLUBS_STORAGE_KEY, JSON.stringify(INITIAL_CAMPUS_CLUBS));
    }
    if (statusFilter === 'all') return list;
    return list.filter(c => c.status === statusFilter);
  } catch (err) {
    console.warn('Error reading campus clubs:', err);
    return INITIAL_CAMPUS_CLUBS;
  }
}

export function submitCampusClub(clubData) {
  const list = getCampusClubs('all');
  const newClub = {
    id: `club-${Date.now()}`,
    ...clubData,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  const updated = [newClub, ...list];
  if (typeof window !== 'undefined') {
    localStorage.setItem(CAMPUS_CLUBS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('nacos_campus_clubs_updated'));
  }

  // Trigger Admin notification
  addAdminNotification({
    type: 'campus_club',
    title: 'New Campus Club Waiting for Approval',
    message: `"${newClub.name}" submitted a new student community listing.`,
    entityId: newClub.id,
    link: '/admin/clubs'
  });

  return newClub;
}

export function approveCampusClub(id) {
  const list = getCampusClubs('all');
  const updated = list.map(c => c.id === id ? { ...c, status: 'approved' } : c);
  if (typeof window !== 'undefined') {
    localStorage.setItem(CAMPUS_CLUBS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('nacos_campus_clubs_updated'));
  }
  return updated;
}

export function denyCampusClub(id) {
  const list = getCampusClubs('all');
  const updated = list.map(c => c.id === id ? { ...c, status: 'denied' } : c);
  if (typeof window !== 'undefined') {
    localStorage.setItem(CAMPUS_CLUBS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('nacos_campus_clubs_updated'));
  }
  return updated;
}

export async function updateCampusClub(id, updates) {
  const list = getCampusClubs('all');
  const now = new Date().toISOString();
  let updatedClub = null;

  const updatedList = list.map(c => {
    if (c.id === id) {
      updatedClub = {
        ...c,
        ...updates,
        updatedAt: now
      };
      return updatedClub;
    }
    return c;
  });

  if (!updatedClub) return null;

  if (typeof window !== 'undefined') {
    localStorage.setItem(CAMPUS_CLUBS_STORAGE_KEY, JSON.stringify(updatedList));
    window.dispatchEvent(new Event('nacos_campus_clubs_updated'));
  }

  try {
    if (supabase) {
      await supabase.from('campus_clubs').upsert({
        id: updatedClub.id,
        name: updatedClub.name,
        category: updatedClub.category,
        description: updatedClub.description,
        image: updatedClub.image,
        lead_name: updatedClub.leadName,
        link: updatedClub.link,
        status: updatedClub.status || 'approved',
        updated_at: now
      }, { onConflict: 'id' });
    }
  } catch (err) {
    console.warn('Could not sync club to Supabase:', err);
  }

  return updatedClub;
}

export function deleteCampusClub(id) {
  const list = getCampusClubs('all');
  const updated = list.filter(c => c.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(CAMPUS_CLUBS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('nacos_campus_clubs_updated'));
  }
  return updated;
}

// ═══════════════════════════════════════════════════════════════
// 3. ALUMNI DIRECTORY METHODS
// ═══════════════════════════════════════════════════════════════

export function getAlumni(statusFilter = 'all') {
  if (typeof window === 'undefined') return INITIAL_ALUMNI;
  try {
    const raw = localStorage.getItem(ALUMNI_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : INITIAL_ALUMNI;
    if (!raw) {
      localStorage.setItem(ALUMNI_STORAGE_KEY, JSON.stringify(INITIAL_ALUMNI));
    }
    if (statusFilter === 'all') return list;
    return list.filter(a => a.status === statusFilter);
  } catch (err) {
    console.warn('Error reading alumni directory:', err);
    return INITIAL_ALUMNI;
  }
}

export function submitAlumnus(alumnusData) {
  const list = getAlumni('all');
  const newAlumnus = {
    id: `alm-${Date.now()}`,
    ...alumnusData,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  const updated = [newAlumnus, ...list];
  if (typeof window !== 'undefined') {
    localStorage.setItem(ALUMNI_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('nacos_alumni_updated'));
    window.dispatchEvent(new Event('nacos_alumni_directory_updated'));
  }

  // Trigger Admin notification
  addAdminNotification({
    type: 'alumni',
    title: 'New Alumni Spotlight Request',
    message: `${newAlumnus.name} (${newAlumnus.position || 'Graduate'}) submitted an alumni profile.`,
    entityId: newAlumnus.id,
    link: '/admin/alumni'
  });

  return newAlumnus;
}

export const getAlumniDirectory = getAlumni;
export const submitAlumniRequest = submitAlumnus;
export const submitAlumni = submitAlumnus;

export function approveAlumnus(id) {
  const list = getAlumni('all');
  const updated = list.map(a => a.id === id ? { ...a, status: 'approved' } : a);
  if (typeof window !== 'undefined') {
    localStorage.setItem(ALUMNI_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('nacos_alumni_updated'));
  }
  return updated;
}

export function denyAlumnus(id) {
  const list = getAlumni('all');
  const updated = list.map(a => a.id === id ? { ...a, status: 'denied' } : a);
  if (typeof window !== 'undefined') {
    localStorage.setItem(ALUMNI_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('nacos_alumni_updated'));
  }
  return updated;
}

export async function updateAlumnus(id, updates) {
  const list = getAlumni('all');
  const now = new Date().toISOString();
  let updatedAlm = null;

  const updatedList = list.map(a => {
    if (a.id === id) {
      updatedAlm = {
        ...a,
        ...updates,
        updatedAt: now
      };
      return updatedAlm;
    }
    return a;
  });

  if (!updatedAlm) return null;

  if (typeof window !== 'undefined') {
    localStorage.setItem(ALUMNI_STORAGE_KEY, JSON.stringify(updatedList));
    window.dispatchEvent(new Event('nacos_alumni_updated'));
    window.dispatchEvent(new Event('nacos_alumni_directory_updated'));
  }

  try {
    if (supabase) {
      await supabase.from('alumni_directory').upsert({
        id: updatedAlm.id,
        name: updatedAlm.name,
        grad_year: updatedAlm.gradYear,
        position: updatedAlm.position,
        company: updatedAlm.company,
        linkedin: updatedAlm.linkedin,
        bio: updatedAlm.bio,
        image: updatedAlm.image,
        status: updatedAlm.status || 'approved',
        updated_at: now
      }, { onConflict: 'id' });
    }
  } catch (err) {
    console.warn('Could not sync alumnus to Supabase:', err);
  }

  return updatedAlm;
}

export function deleteAlumnus(id) {
  const list = getAlumni('all');
  const updated = list.filter(a => a.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(ALUMNI_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('nacos_alumni_updated'));
  }
  return updated;
}
