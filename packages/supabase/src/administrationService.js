/**
 * administrationService.js
 * Centralized Department Administration & Academic Staff Service for NACOS FUTO
 * Synchronizes with Supabase `public.department_administration` with Cloudinary portraits
 */

import { supabase } from './client.js';

const ADMIN_STAFF_STORAGE_KEY = 'nacos_department_staff_db';

const deriveEmail = (name) => {
  const clean = name.replace(/^(Dr\.?|Mr\.?|Mrs\.?|DR\.?|MR\.?)\s*/i, '').trim();
  const parts = clean.toLowerCase().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]}.${parts[parts.length - 1]}@futo.edu.ng`;
  }
  return `${parts[0] || 'staff'}@futo.edu.ng`;
};

export const INITIAL_STAFF = [
  {
    id: 'staff-hod',
    name: 'Dr. Stanley Adiele Okolie',
    role: 'Head of Department (CSC)',
    rank: 'Senior Lecturer / HOD',
    email: 'hod.csc@futo.edu.ng',
    image: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569270/nacos/executives/hod_stanley.jpg',
    cloudinary_public_id: 'nacos/executives/hod_stanley',
    order_index: 1,
    is_active: true
  },
  {
    id: 'staff-adviser',
    name: 'Dr. (Mrs) E.C. Nwokorie',
    role: 'Staff Adviser / Course Adviser',
    rank: 'Senior Lecturer / Staff Adviser',
    email: 'staff.adviser@futo.edu.ng',
    image: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569274/nacos/executives/staff_adviser_nwokorie.jpg',
    cloudinary_public_id: 'nacos/executives/staff_adviser_nwokorie',
    order_index: 2,
    is_active: true
  },
  { id: 'staff-1', name: 'Dr. Juliet Nnenna Odii', role: 'Faculty Member', rank: 'Reader', email: deriveEmail('Dr. Juliet Nnenna Odii'), order_index: 3, is_active: true },
  { id: 'staff-2', name: 'Dr. Jacinta Chioma Odirichukwu', role: 'Faculty Member', rank: 'Senior Lecturer', email: deriveEmail('Dr. Jacinta Chioma Odirichukwu'), order_index: 4, is_active: true },
  { id: 'staff-3', name: 'Dr. Uchenna Chinyere Onyemauche', role: 'Faculty Member', rank: 'Senior Lecturer', email: deriveEmail('Dr. Uchenna Chinyere Onyemauche'), order_index: 5, is_active: true },
  { id: 'staff-4', name: 'Dr Chidimma Lilan Okpalla', role: 'Faculty Member', rank: 'Senior Lecturer', email: deriveEmail('Dr Chidimma Lilan Okpalla'), order_index: 6, is_active: true },
  { id: 'staff-5', name: 'DR. CHINWE GILEAN ONUKWUGHA', role: 'Faculty Member', rank: 'Senior Lecturer', email: deriveEmail('DR. CHINWE GILEAN ONUKWUGHA'), order_index: 7, is_active: true },
  { id: 'staff-6', name: 'Dr Euphemia Chioma Nwokorie', role: 'Faculty Member', rank: 'Senior Lecturer', email: deriveEmail('Dr Euphemia Chioma Nwokorie'), order_index: 8, is_active: true },
  { id: 'staff-8', name: 'Mr Douglas Allswell Kelechi', role: 'Faculty Member', rank: 'Lecturer II', email: deriveEmail('Mr Douglas Allswell Kelechi'), order_index: 9, is_active: true },
  { id: 'staff-9', name: 'Dr Chidi Ukamaka Betrand', role: 'Faculty Member', rank: 'Lecturer II', email: deriveEmail('Dr Chidi Ukamaka Betrand'), order_index: 10, is_active: true },
  { id: 'staff-10', name: 'Mr. Peter Kelechukwu Joseph', role: 'Faculty Member', rank: 'Assistant Lecturer', email: deriveEmail('Mr. Peter Kelechukwu Joseph'), order_index: 11, is_active: true },
  { id: 'staff-11', name: 'Mr. Vitalis Chibuike Iwuchukwu', role: 'Faculty Member', rank: 'Assistant Lecturer', email: deriveEmail('Mr. Vitalis Chibuike Iwuchukwu'), order_index: 12, is_active: true },
  { id: 'staff-12', name: 'Mr Christopher Ifeanyi Ofoegbu', role: 'Faculty Member', rank: 'Graduate Assistant', email: deriveEmail('Mr Christopher Ifeanyi Ofoegbu'), order_index: 13, is_active: true },
  { id: 'staff-13', name: 'Mrs Juliet Nwanneka Amoke', role: 'Technical Staff', rank: 'Technologist II', email: deriveEmail('Mrs Juliet Nwanneka Amoke'), order_index: 14, is_active: true },
  { id: 'staff-14', name: 'Dr Chukwuma Dandy Anyiam', role: 'Faculty Member', rank: 'Lecturer I', email: deriveEmail('Dr Chukwuma Dandy Anyiam'), order_index: 15, is_active: true },
  { id: 'staff-15', name: 'DR. MERCY EBERECHI BENSON-EMENIKE', role: 'Faculty Member', rank: 'Senior Lecturer', email: deriveEmail('DR. MERCY EBERECHI BENSON-EMENIKE'), order_index: 16, is_active: true },
  { id: 'staff-16', name: 'Mr Chigozie C Dimoji', role: 'Faculty Member', rank: 'Assistant Lecturer', email: deriveEmail('Mr Chigozie C Dimoji'), order_index: 17, is_active: true },
  { id: 'staff-17', name: 'Mr Ikechukwu Kingsley Onyeanu', role: 'Technical Staff', rank: 'Senior Computer Technologist', email: deriveEmail('Mr Ikechukwu Kingsley Onyeanu'), order_index: 18, is_active: true },
  { id: 'staff-18', name: 'Mrs Ngozi Amarachi Duru', role: 'Faculty Member', rank: 'Assistant Lecturer', email: deriveEmail('Mrs Ngozi Amarachi Duru'), order_index: 19, is_active: true },
  { id: 'staff-19', name: 'Mr Idris Ahmed Idris', role: 'Faculty Member', rank: 'Graduate Assistant (GA)', email: deriveEmail('Mr Idris Ahmed Idris'), order_index: 20, is_active: true },
  { id: 'staff-20', name: 'MR ANTHONY CHUKWUNONSO UGHAELUMBA', role: 'Technical Staff', rank: 'System Programmer/Analyst II', email: deriveEmail('MR ANTHONY CHUKWUNONSO UGHAELUMBA'), order_index: 21, is_active: true },
  { id: 'staff-21', name: 'Mr. Harry Chidozie Ogbonna', role: 'Technical Staff', rank: 'Technologist II', email: deriveEmail('Mr. Harry Chidozie Ogbonna'), order_index: 22, is_active: true },
  { id: 'staff-22', name: 'Mrs. Edith Chidimma Otuonye', role: 'Administrative Staff', rank: 'Secretary I', email: deriveEmail('Mrs. Edith Chidimma Otuonye'), order_index: 23, is_active: true },
  { id: 'staff-23', name: 'Dr. Francisca Onyinyechi Nwokoma', role: 'Faculty Member', rank: 'Lecturer I', email: deriveEmail('Dr. Francisca Onyinyechi Nwokoma'), order_index: 24, is_active: true },
  { id: 'staff-24', name: 'Dr. Donatus Onyedikachi Njoku', role: 'Faculty Member', rank: 'Lecturer II', email: deriveEmail('Dr. Donatus Onyedikachi Njoku'), order_index: 25, is_active: true }
];

export function getLocalDepartmentStaff() {
  if (typeof window === 'undefined') return INITIAL_STAFF;
  try {
    const raw = localStorage.getItem(ADMIN_STAFF_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(ADMIN_STAFF_STORAGE_KEY, JSON.stringify(INITIAL_STAFF));
  } catch (e) {
    console.warn('Error reading local staff directory:', e);
  }
  return INITIAL_STAFF;
}

export function saveLocalDepartmentStaff(staff) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ADMIN_STAFF_STORAGE_KEY, JSON.stringify(staff));
  window.dispatchEvent(new Event('nacos_department_staff_updated'));
}

export async function fetchDepartmentStaff({ activeOnly = true } = {}) {
  try {
    if (supabase) {
      // 1. Live query from media_assets where category = 'general' and entity_type = 'staff'
      const { data: mediaStaff, error: mediaErr } = await supabase
        .from('media_assets')
        .select('*')
        .eq('category', 'general')
        .eq('entity_type', 'staff')
        .order('created_at', { ascending: false });

      if (!mediaErr && mediaStaff && mediaStaff.length > 0) {
        const parsedStaff = [];
        for (const m of mediaStaff) {
          try {
            if (m.image_alt && m.image_alt.startsWith('{')) {
              const obj = JSON.parse(m.image_alt);
              parsedStaff.push({
                ...obj,
                id: obj.id || m.entity_id || m.id,
                image: m.image_url || obj.image,
                cloudinary_public_id: m.cloudinary_public_id || obj.cloudinary_public_id
              });
            }
          } catch (e) {}
        }

        if (parsedStaff.length > 0) {
          const remoteIds = new Set(parsedStaff.map(s => s.id));
          const localInitials = INITIAL_STAFF.filter(s => !remoteIds.has(s.id));
          const merged = [...parsedStaff, ...localInitials];
          merged.sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999));

          saveLocalDepartmentStaff(merged);
          return activeOnly ? merged.filter(s => s.is_active) : merged;
        }
      }

      // 2. Fallback to department_administration table
      let query = supabase.from('department_administration').select('*').order('order_index', { ascending: true });
      if (activeOnly) {
        query = query.eq('is_active', true);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        saveLocalDepartmentStaff(data);
        return data;
      }
    }
  } catch (err) {
    console.warn('Supabase fetchDepartmentStaff error, using local fallback:', err);
  }
  const local = getLocalDepartmentStaff();
  return activeOnly ? local.filter(s => s.is_active) : local;
}

export async function saveDepartmentStaffMember(memberData) {
  const current = getLocalDepartmentStaff();
  const id = memberData.id || `staff-${Date.now()}`;
  const now = new Date().toISOString();

  const record = {
    ...memberData,
    id,
    order_index: memberData.order_index ?? (current.length + 1),
    is_active: memberData.is_active ?? true,
    updated_at: now,
    created_at: memberData.created_at || now
  };

  const existingIdx = current.findIndex(s => s.id === id);
  let updated;
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = { ...updated[existingIdx], ...record };
  } else {
    updated = [...current, record];
  }

  saveLocalDepartmentStaff(updated);

  // 1. Sync to media_assets for universal multi-device live sync
  try {
    if (supabase) {
      await supabase.from('media_assets').upsert({
        cloudinary_public_id: record.cloudinary_public_id || ('nacos/general/' + record.id),
        image_url: record.image || 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569270/nacos/executives/hod_stanley.jpg',
        image_alt: JSON.stringify(record),
        media_type: 'image',
        folder: 'nacos/general',
        category: 'general',
        entity_type: 'staff',
        entity_id: record.id,
        updated_at: now
      }, { onConflict: 'cloudinary_public_id' });
    }
  } catch (e) {
    console.warn('Live sync staff to media_assets notice:', e);
  }

  // 2. Also attempt department_administration table
  try {
    if (supabase) {
      await supabase.from('department_administration').upsert(record, { onConflict: 'id' });
    }
  } catch (err) {
    console.warn('Could not sync staff member to Supabase table:', err);
  }

  return { success: true, member: record };
}

export async function deleteDepartmentStaffMember(id) {
  const current = getLocalDepartmentStaff();
  const updated = current.filter(s => s.id !== id);
  saveLocalDepartmentStaff(updated);

  try {
    if (supabase) {
      await supabase.from('media_assets').delete().eq('entity_id', id);
      await supabase.from('department_administration').delete().eq('id', id);
    }
  } catch (err) {
    console.warn('Could not delete staff member from Supabase:', err);
  }

  return { success: true };
}
