/**
 * spiritualLifeService.js
 * Centralized service for NACOS FUTO Spiritual Life & Campus Fellowships.
 * Synchronizes fellowship directories between local storage, Supabase, and real-time UI events.
 */

import { supabase } from './client.js';
import { addAdminNotification } from './notificationService.js';

export const SPIRITUAL_LIFE_STORAGE_KEY = 'nacos_spiritual_life_store';

export const INITIAL_FELLOWSHIPS = [
  {
    id: 'fel-1',
    name: 'National Federation of Catholic Students (NFCS FUTO)',
    category: 'Catholic',
    venue: 'St. Thomas Aquinas Catholic Chaplaincy (STACC), FUTO',
    meetingTimes: 'Sundays 6:30 AM & 8:30 AM (Holy Mass) • Wednesdays 5:00 PM (Fellowship)',
    leadName: 'Bro. Paschal Nwankwo (Chaplaincy President)',
    description: 'The Catholic student family in FUTO, promoting spiritual growth, sacramental life, academic excellence, and mutual charity across the university community.',
    image: 'https://images.unsplash.com/photo-1548625361-12503a277713?auto=format&fit=crop&w=800&q=80',
    link: 'https://wa.me/2348000000001',
    status: 'approved',
    createdAt: '2026-08-01T10:00:00Z'
  },
  {
    id: 'fel-2',
    name: 'Anglican Campus Fellowship (ACF FUTO)',
    category: 'Protestant',
    venue: 'Chapel of the Light, FUTO Campus',
    meetingTimes: 'Sundays 7:30 AM (Divine Service) • Tuesdays 5:30 PM (Bible Dialogue)',
    leadName: 'Bro. Emmanuel Chukwuma (Fellowship President)',
    description: 'Dedicated to deep scriptural discipleship, vibrant praise, fervent prayer, and building steadfast Christian character among computing and engineering undergraduates.',
    image: 'https://images.unsplash.com/photo-1438032005730-c779502df39b?auto=format&fit=crop&w=800&q=80',
    link: 'https://wa.me/2348000000002',
    status: 'approved',
    createdAt: '2026-08-02T11:00:00Z'
  },
  {
    id: 'fel-3',
    name: 'Christ Ambassadors Students Outreach (CASOR FUTO)',
    category: 'Interdenominational',
    venue: 'Old SEET Complex Hall, FUTO',
    meetingTimes: 'Sundays 8:00 AM (Worship Service) • Thursdays 5:00 PM (Power Hour)',
    leadName: 'Sis. Blessing Okoro (President)',
    description: 'A dynamic interdenominational student missionary body raising godly ambassadors of Christ, leadership catalysts, and solution builders across universities.',
    image: 'https://images.unsplash.com/photo-1519791883288-dc8bd696e667?auto=format&fit=crop&w=800&q=80',
    link: 'https://wa.me/2348000000003',
    status: 'approved',
    createdAt: '2026-08-03T09:00:00Z'
  },
  {
    id: 'fel-4',
    name: 'Redeemed Christian Fellowship (RCF FUTO)',
    category: 'Pentecostal',
    venue: 'RCF Mega Auditorium, Campus Extension, FUTO',
    meetingTimes: 'Sundays 8:00 AM (Celebration Service) • Wednesdays 5:30 PM (Digging Deep)',
    leadName: 'Pastor David Adeleke (Student Pastor)',
    description: 'The student fellowship arm of the Redeemed Christian Church of God in FUTO. Experiencing the word of life, vibrant praise, and Holy Ghost empowerment.',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
    link: 'https://wa.me/2348000000004',
    status: 'approved',
    createdAt: '2026-08-04T12:00:00Z'
  },
  {
    id: 'fel-5',
    name: 'Deeper Life Campus Fellowship (DLCF FUTO)',
    category: 'Pentecostal',
    venue: 'DLCF Fellowship Auditorium, Behind Hall 4, FUTO',
    meetingTimes: 'Sundays 8:00 AM (Worship) • Mondays 5:30 PM (Campus Bible Dialogue)',
    leadName: 'Bro. Victor Onyema (Campus Coordinator)',
    description: 'Anchored on biblical holiness, righteous living, prayer, academic distinction, and aggressive evangelism on the campus of FUTO.',
    image: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=800&q=80',
    link: 'https://wa.me/2348000000005',
    status: 'approved',
    createdAt: '2026-08-05T14:00:00Z'
  },
  {
    id: 'fel-6',
    name: 'Nigeria Fellowship of Evangelical Students (NIFES FUTO)',
    category: 'Interdenominational',
    venue: 'FUTO Convocation Arena Pavilion',
    meetingTimes: 'Sundays 8:30 AM • Fridays 5:00 PM (Discipleship Hour)',
    leadName: 'Bro. Gideon Kalu (General Secretary)',
    description: 'Pioneering student evangelical mobilization since 1968, nurturing students into mature disciples who transform society and impact the marketplace.',
    image: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=800&q=80',
    link: 'https://wa.me/2348000000006',
    status: 'approved',
    createdAt: '2026-08-06T15:00:00Z'
  },
  {
    id: 'fel-7',
    name: 'Winners Campus Fellowship (WCF FUTO)',
    category: 'Pentecostal',
    venue: 'Hall 2 Quadrangle / Faith Pavilion, FUTO',
    meetingTimes: 'Sundays 7:30 AM • Wednesdays 5:00 PM (Mid-week Service)',
    leadName: 'Bro. Joshua Olamide (President)',
    description: 'The student chapter of Living Faith Church Worldwide, raising champions through the Word of Faith, spiritual encounters, and academic triumphs.',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80',
    link: 'https://wa.me/2348000000007',
    status: 'approved',
    createdAt: '2026-08-07T16:00:00Z'
  },
  {
    id: 'fel-8',
    name: "Muslim Students' Society of Nigeria (MSSN FUTO)",
    category: 'Muslim / MSSN',
    venue: 'FUTO Central Mosque, Owerri',
    meetingTimes: "Fridays 1:30 PM (Juma'at Prayer) • Daily Prayers & Usrah",
    leadName: 'Amir Ibrahim Abubakar',
    description: 'Uniting all Muslim students on FUTO campus, establishing Islamic values, academic excellence, mutual welfare, and peaceful campus coexistence.',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
    link: 'https://wa.me/2348000000008',
    status: 'approved',
    createdAt: '2026-08-08T17:00:00Z'
  },
  {
    id: 'fel-9',
    name: 'Fellowship of Christian Students (FCS FUTO)',
    category: 'Interdenominational',
    venue: 'SOPS Lecture Hall 1, FUTO',
    meetingTimes: 'Sundays 8:00 AM • Thursdays 5:00 PM (Bible & Prayer)',
    leadName: 'Bro. Timothy Musa (President)',
    description: 'A close-knit campus community of passionate Christian students devoted to mutual fellowship, campus prayers, and holistic student growth.',
    image: 'https://images.unsplash.com/photo-1445445290350-18a3b86e0b5b?auto=format&fit=crop&w=800&q=80',
    link: 'https://wa.me/2348000000009',
    status: 'approved',
    createdAt: '2026-08-09T18:00:00Z'
  }
];

export function getSpiritualFellowships(statusFilter = 'all') {
  if (typeof window === 'undefined') {
    return statusFilter === 'all' ? INITIAL_FELLOWSHIPS : INITIAL_FELLOWSHIPS.filter(f => f.status === statusFilter);
  }

  try {
    const raw = localStorage.getItem(SPIRITUAL_LIFE_STORAGE_KEY);
    let list = raw ? JSON.parse(raw) : null;

    if (!list || !Array.isArray(list) || list.length === 0) {
      list = INITIAL_FELLOWSHIPS;
      localStorage.setItem(SPIRITUAL_LIFE_STORAGE_KEY, JSON.stringify(list));
    }

    if (statusFilter === 'all') return list;
    return list.filter(f => f.status === statusFilter);
  } catch (err) {
    console.warn('Error reading spiritual fellowships storage:', err);
    return INITIAL_FELLOWSHIPS.filter(f => statusFilter === 'all' || f.status === statusFilter);
  }
}

export function saveLocalSpiritualFellowships(list) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SPIRITUAL_LIFE_STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event('nacos_spiritual_life_updated'));
}

export function submitSpiritualFellowship(fellowshipData) {
  const list = getSpiritualFellowships('all');
  const newFellowship = {
    id: `fel-${Date.now()}`,
    ...fellowshipData,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  const updated = [newFellowship, ...list];
  saveLocalSpiritualFellowships(updated);

  addAdminNotification({
    type: 'spiritual_life',
    title: 'New Campus Fellowship Registration Submitted',
    message: `"${newFellowship.name}" submitted a new spiritual fellowship profile awaiting approval.`,
    entityId: newFellowship.id,
    link: '/admin/spiritual-life'
  });

  return newFellowship;
}

export function approveSpiritualFellowship(id) {
  const list = getSpiritualFellowships('all');
  const updated = list.map(f => f.id === id ? { ...f, status: 'approved' } : f);
  saveLocalSpiritualFellowships(updated);
  return updated;
}

export function denySpiritualFellowship(id) {
  const list = getSpiritualFellowships('all');
  const updated = list.map(f => f.id === id ? { ...f, status: 'denied' } : f);
  saveLocalSpiritualFellowships(updated);
  return updated;
}

export async function updateSpiritualFellowship(id, updates) {
  const list = getSpiritualFellowships('all');
  const now = new Date().toISOString();
  let updatedItem = null;

  const updatedList = list.map(f => {
    if (f.id === id) {
      updatedItem = {
        ...f,
        ...updates,
        updatedAt: now
      };
      return updatedItem;
    }
    return f;
  });

  if (!updatedItem) return null;

  saveLocalSpiritualFellowships(updatedList);

  try {
    if (supabase) {
      await supabase.from('spiritual_fellowships').upsert({
        id: updatedItem.id,
        name: updatedItem.name,
        category: updatedItem.category,
        venue: updatedItem.venue,
        meeting_times: updatedItem.meetingTimes,
        lead_name: updatedItem.leadName,
        description: updatedItem.description,
        image: updatedItem.image,
        link: updatedItem.link,
        status: updatedItem.status || 'approved',
        updated_at: now
      }, { onConflict: 'id' });
    }
  } catch (err) {
    console.warn('Could not sync spiritual fellowship to Supabase:', err);
  }

  return updatedItem;
}

export function deleteSpiritualFellowship(id) {
  const list = getSpiritualFellowships('all');
  const updated = list.filter(f => f.id !== id);
  saveLocalSpiritualFellowships(updated);

  try {
    if (supabase) {
      supabase.from('spiritual_fellowships').delete().eq('id', id).then(() => {});
    }
  } catch (err) {
    console.warn('Could not delete spiritual fellowship from Supabase:', err);
  }

  return updated;
}
