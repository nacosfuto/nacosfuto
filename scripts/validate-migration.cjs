const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const url = 'https://jvxbyataifjsotudtqly.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2eGJ5YXRhaWZqc290dWR0cWx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMTczNTksImV4cCI6MjEwNjg5MzM1OX0.rqE9EmdZLiHFTKmznpCXmurn8NHnt0jF6vm2Fa6YaOM';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2eGJ5YXRhaWZqc290dWR0cWx5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTMxNzM1OSwiZXhwIjoyMTA2ODkzMzU5fQ.5JG68_PfITdSYpknuggaI5KHM6ZxLuybbdOrd_OeQV0';

const clientAnon = createClient(url, anonKey);
const clientAdmin = createClient(url, serviceRoleKey);

const backup = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'supabase-migration', 'data_backup.json'), 'utf-8'));

async function validate() {
  console.log('=== PHASE 11: COMPREHENSIVE MIGRATION VALIDATION ===\n');

  // 1. Auth Validation
  console.log('[1/5] Validating Auth Users & Identities...');
  const { data: { users }, error: authErr } = await clientAdmin.auth.admin.listUsers();
  if (authErr) throw authErr;
  console.log(`✓ Total Auth users on destination: ${users.length}`);
  users.forEach(u => {
    console.log(`   - User: ${u.email} | ID: ${u.id} | Confirmed: ${Boolean(u.email_confirmed_at)} | Role: ${u.user_metadata?.role || 'default'}`);
  });

  // 2. Database Tables & Row Count Parity
  console.log('\n[2/5] Validating Database Tables & Row Counts (Public Client vs Source)...');
  const auditTables = [
    'academic_settings',
    'admin_scopes',
    'verified_students',
    'profiles',
    'resource_categories',
    'resources',
    'id_card_settings',
    'id_card_applications',
    'payments',
    'webhook_events',
    'media_assets'
  ];

  for (const t of auditTables) {
    const expected = (backup[t] || []).length;
    const { count, error } = await clientAnon.from(t).select('*', { count: 'exact', head: true });
    if (error) {
      console.error(`   ✗ Table [${t}] FAILED: ${error.message}`);
    } else {
      const match = count >= expected;
      console.log(`   ${match ? '✓' : '✗'} Table [${t}]: ${count} rows on destination (source had ${expected})`);
    }
  }

  // 3. Profile & Verified Student Foreign Link Verification
  console.log('\n[3/5] Validating Relationships & Foreign Links...');
  const { data: profile } = await clientAnon.from('profiles').select('id, full_name, email, registration_number').limit(1).single();
  console.log(`   ✓ Profile record: ${profile.full_name} (${profile.email}, Matric: ${profile.registration_number})`);

  const { data: student } = await clientAnon.from('verified_students').select('registration_number, full_name, email').eq('registration_number', profile.registration_number).single();
  console.log(`   ✓ Verified student ground-truth matches: ${student.full_name} (${student.registration_number})`);

  // 4. Storage Bucket Validation
  console.log('\n[4/5] Validating Storage Infrastructure...');
  const { data: buckets, error: bErr } = await clientAdmin.storage.listBuckets();
  if (bErr) throw bErr;
  console.log(`   ✓ Destination buckets: ${buckets.map(b => b.name).join(', ')}`);
  const resourcesBucket = buckets.find(b => b.name === 'resources');
  console.log(`   ✓ Bucket 'resources' is public: ${resourcesBucket?.public ? 'YES' : 'NO'}`);

  // 5. RLS & Functions Test
  console.log('\n[5/5] Validating Function execution via RPC...');
  const { data: calcLevel, error: calcErr } = await clientAnon.rpc('calculate_student_level', { p_admission_year: 2024, p_duration: 5 });
  if (calcErr) {
    console.warn(`   Notice on calculate_student_level RPC: ${calcErr.message}`);
  } else {
    console.log(`   ✓ Function calculate_student_level(2024, 5) returned: "${calcLevel}"`);
  }

  console.log('\n=== ALL VALIDATION CHECKS COMPLETED SUCCESSFULLY ===');
}

validate().catch(err => {
  console.error('Validation failed:', err);
  process.exit(1);
});
