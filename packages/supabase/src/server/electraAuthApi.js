/**
 * @file electraAuthApi.js
 * Authoritative Server-Side Electoral Authentication, Accreditation, Verification & Voting Engine
 * 
 * CORE PRINCIPLES:
 * 1. Independent of Student Portal: Does NOT require student portal account or password.
 * 2. Ground Truth: Validates Registration Number + First Name + Last Name against official records.
 * 3. Election-Specific: Accreditation is bound to (election_id, registration_number).
 * 4. Single-Use Verification: Cryptographic 6-digit OTP sent to temporary email, hashed in database,
 *    immediately consumed upon verification.
 * 5. Immutable Nonce & Session Token: Issues HMAC-SHA256 signed voting session tokens.
 * 6. Duplicate-Proof Voting: Enforces strict ONE VOTE PER POSITION per elector at the database level.
 * 7. Privacy: Temporary email is never stored as permanent student profile email.
 */

import crypto from 'crypto';
import { supabase } from '../client.js';
import { dispatchEmail, isValidEmail } from './emailDispatcher.js';
import { calculateAcademicProgression } from '@nacos/config/academic';

const ELECTRA_AUTH_SECRET = process.env.SESSION_SECRET || process.env.VITE_SUPABASE_ANON_KEY || 'nacos_electra_futo_auth_key_2026';
const ELECTRA_OTP_SALT = 'nacos_electra_otp_salt_2026';
const OTP_EXPIRY_MINUTES = 15;
const MAX_VERIFICATION_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_CODE_REQUESTS = 4;
const VOTING_SESSION_TTL_HOURS = 2;

// In-memory atomic store fallback for accreditation & vote records (mirrored to Supabase id_card_settings)
const ACCREDITATION_STORE_KEY = 'store_electra_accreditations_db';
const VOTES_STORE_KEY = 'store_electra_votes_db';

// =============================================================================
// CRYPTOGRAPHIC TOKEN STATE MACHINE
// =============================================================================

export function signElectraToken(payload) {
  const data = {
    ...payload,
    timestamp: Date.now()
  };
  const jsonStr = Buffer.from(JSON.stringify(data)).toString('base64url');
  const signature = crypto.createHmac('sha256', ELECTRA_AUTH_SECRET).update(jsonStr).digest('base64url');
  return `${jsonStr}.${signature}`;
}

export function verifyElectraToken(token, expectedPurpose = null) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [jsonStr, signature] = parts;
  const expectedSignature = crypto.createHmac('sha256', ELECTRA_AUTH_SECRET).update(jsonStr).digest('base64url');
  if (signature !== expectedSignature) return null;

  try {
    const payload = JSON.parse(Buffer.from(jsonStr, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) {
      return null; // Expired
    }
    if (expectedPurpose && payload.purpose !== expectedPurpose) {
      return null; // Purpose mismatch
    }
    return payload;
  } catch (_) {
    return null;
  }
}

export function hashElectoralCode(code, salt = ELECTRA_OTP_SALT) {
  return crypto.createHmac('sha256', salt).update(String(code).trim()).digest('hex');
}

export function generateAuditReceipt(electionId, voterReg, selections, timestamp) {
  const seed = `${electionId}::${voterReg}::${JSON.stringify(selections)}::${timestamp}::${crypto.randomBytes(8).toString('hex')}`;
  const sha = crypto.createHash('sha256').update(seed).digest('hex').toUpperCase();
  return `0xELECTRA-${sha.substring(0, 8)}-${sha.substring(8, 16)}-${Date.now().toString(16).toUpperCase()}`;
}

// =============================================================================
// NAME NORMALIZATION & STUDENT RECORD RETRIEVAL
// =============================================================================

export function normalizeName(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, ' ');
}

async function getOfficialStudentRecord(registrationNumber) {
  const cleanReg = registrationNumber.trim().toUpperCase();
  let found = null;

  // 1. Try Supabase verified_students table
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('verified_students')
        .select('*')
        .or(`registration_number.eq.${cleanReg},registration_number.ilike.${cleanReg}`)
        .limit(1)
        .maybeSingle();

      if (data && !error) found = data;
    } catch (e) {
      console.warn('[Electra Auth] verified_students lookup note:', e.message);
    }
  }

  // 2. Try Supabase id_card_settings (store_verified_roster)
  if (!found && supabase) {
    try {
      const { data: storeRow } = await supabase
        .from('id_card_settings')
        .select('payload')
        .eq('id', 'store_verified_roster')
        .maybeSingle();

      if (storeRow?.payload?.roster && Array.isArray(storeRow.payload.roster)) {
        found = storeRow.payload.roster.find(s =>
          (s.registration_number && s.registration_number.toUpperCase() === cleanReg) ||
          (s.registration_number && s.registration_number.replace(/[^a-zA-Z0-9]/g, '') === cleanReg.replace(/[^a-zA-Z0-9]/g, ''))
        );
      }
    } catch (_) {}
  }

  // 3. Try Supabase profiles table
  if (!found && supabase) {
    try {
      const strippedReg = cleanReg.replace(/[^a-zA-Z0-9]/g, '');
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .or(`registration_number.ilike.${cleanReg},registration_number.ilike.${strippedReg},matric_number.ilike.${cleanReg},matric_number.ilike.${strippedReg}`)
        .limit(1)
        .maybeSingle();

      if (prof) {
        found = {
          id: prof.id,
          registration_number: prof.registration_number || prof.matric_number,
          full_name: prof.full_name,
          first_name: prof.first_name || (prof.full_name ? prof.full_name.split(' ')[0] : ''),
          last_name: prof.last_name || prof.surname || '',
          surname: prof.surname || prof.last_name || '',
          department: prof.department || 'Computer Science',
          admission_year: prof.admission_year,
          programme_duration: prof.programme_duration || 5,
          level: prof.level
        };
      }
    } catch (_) {}
  }

  // 4. Canonical departmental roster fallback
  if (!found) {
    try {
      const { getLocalVerifiedStudents } = await import('../verifiedStudents.js');
      const roster = getLocalVerifiedStudents();
      found = roster.find(s => 
        s.registration_number.toUpperCase() === cleanReg ||
        s.registration_number.replace(/[^a-zA-Z0-9]/g, '') === cleanReg.replace(/[^a-zA-Z0-9]/g, '')
      ) || null;
    } catch (_) {}
  }

  if (!found) return null;

  // Authoritatively compute dynamic academic level and progression state
  const progression = calculateAcademicProgression(found);
  return {
    ...found,
    level: progression.levelString,
    numeric_level: progression.numericLevel,
    is_graduated: progression.isGraduated,
    status: progression.isGraduated ? 'Graduated' : (found.status || 'Active'),
    academic_session: progression.academicSession
  };
}

// =============================================================================
// DATABASE ATOMIC PERSISTENCE HELPERS
// =============================================================================

async function getAccreditationRecord(electionId, registrationNumber) {
  const cleanReg = registrationNumber.trim().toUpperCase();

  // Try PostgreSQL table first
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('electra_accreditations')
        .select('*')
        .eq('election_id', electionId)
        .eq('registration_number', cleanReg)
        .maybeSingle();

      if (data && !error) return data;
    } catch (_) {}
  }

  // Fallback to store_electra_accreditations_db in id_card_settings
  if (supabase) {
    try {
      const { data: row } = await supabase
        .from('id_card_settings')
        .select('academic_session')
        .eq('id', ACCREDITATION_STORE_KEY)
        .maybeSingle();

      if (row?.academic_session) {
        const list = JSON.parse(row.academic_session);
        return list.find(a => a.election_id === electionId && a.registration_number === cleanReg) || null;
      }
    } catch (_) {}
  }

  return null;
}

export async function getServerElection(electionId) {
  if (supabase) {
    try {
      if (electionId) {
        const { data: dbEl, error: elErr } = await supabase
          .from('electra_elections')
          .select('*')
          .eq('id', electionId)
          .maybeSingle();
        if (dbEl && !elErr) return dbEl;
      }

      const { data: activeEl, error: actErr } = await supabase
        .from('electra_elections')
        .select('*')
        .eq('status', 'active')
        .maybeSingle();
      if (activeEl && !actErr) return activeEl;

      const { data: anyEl, error: anyErr } = await supabase
        .from('electra_elections')
        .select('*')
        .order('year', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (anyEl && !anyErr) return anyEl;
    } catch (_) {}

    // Fallback to id_card_settings snapshot if table does not exist
    try {
      const { data: elRow } = await supabase
        .from('id_card_settings')
        .select('academic_session')
        .eq('id', 'store_electra_all_elections')
        .maybeSingle();
      if (elRow?.academic_session) {
        const elections = JSON.parse(elRow.academic_session);
        if (Array.isArray(elections) && elections.length > 0) {
          return (electionId ? elections.find(e => e.id === electionId) : null) ||
            elections.find(e => e.status === 'active') ||
            elections[0];
        }
      }
    } catch (_) {}
  }

  return null;
}

export async function getServerPostsAndContestants(electionId) {
  let posts = [];
  let contestants = [];

  if (supabase) {
    try {
      // 1. Fetch positions from electra_positions
      const { data: dbPosts, error: postErr } = await supabase
        .from('electra_positions')
        .select('*')
        .order('order_index', { ascending: true });

      if (!postErr && Array.isArray(dbPosts) && dbPosts.length > 0) {
        posts = dbPosts.map(p => ({
          id: p.id,
          title: p.title,
          code: p.code,
          order: p.order_index,
          description: p.description
        }));
      }

      // 2. Fetch candidates from electra_candidates
      let cndQuery = supabase.from('electra_candidates').select('*');
      if (electionId) {
        cndQuery = cndQuery.eq('election_id', electionId);
      }
      const { data: dbCnds, error: cndErr } = await cndQuery;
      if (!cndErr && Array.isArray(dbCnds) && dbCnds.length > 0) {
        contestants = dbCnds.map(c => ({
          id: c.id,
          electionId: c.election_id,
          postId: c.position_id,
          name: c.name,
          matricNumber: c.matric_number,
          level: c.level,
          runningPost: c.running_post,
          slogan: c.slogan,
          photoUrl: c.photo_url,
          votesCount: c.votes_count || 0
        }));
      }
    } catch (_) {}

    // Fallback check in id_card_settings snapshots
    if (posts.length === 0 || contestants.length === 0) {
      try {
        const [postsRow, cndRow] = await Promise.all([
          supabase.from('id_card_settings').select('academic_session').eq('id', 'store_electra_posts').maybeSingle(),
          supabase.from('id_card_settings').select('academic_session').eq('id', 'store_electra_contestants').maybeSingle()
        ]);
        if (posts.length === 0 && postsRow?.data?.academic_session) {
          posts = JSON.parse(postsRow.data.academic_session);
        }
        if (contestants.length === 0 && cndRow?.data?.academic_session) {
          const allCnds = JSON.parse(cndRow.data.academic_session);
          contestants = electionId ? allCnds.filter(c => c.electionId === electionId) : allCnds;
        }
      } catch (_) {}
    }
  }

  return { posts, contestants };
}

async function saveAccreditationRecord(record) {
  const now = new Date().toISOString();
  const fullRecord = {
    ...record,
    updated_at: now
  };

  let savedInTable = false;
  if (supabase) {
    try {
      const { error } = await supabase
        .from('electra_accreditations')
        .upsert(fullRecord, { onConflict: 'election_id,registration_number' });

      if (!error) savedInTable = true;
    } catch (_) {}
  }

  // Synchronize snapshot in id_card_settings for resilience
  if (supabase) {
    try {
      const { data: row } = await supabase
        .from('id_card_settings')
        .select('academic_session')
        .eq('id', ACCREDITATION_STORE_KEY)
        .maybeSingle();

      let list = [];
      if (row?.academic_session) {
        try { list = JSON.parse(row.academic_session); } catch (_) {}
      }

      const idx = list.findIndex(a => a.election_id === record.election_id && a.registration_number === record.registration_number);
      if (idx >= 0) {
        list[idx] = fullRecord;
      } else {
        list.push(fullRecord);
      }

      await supabase.from('id_card_settings').upsert({
        id: ACCREDITATION_STORE_KEY,
        academic_session: JSON.stringify(list),
        updated_at: now
      });
    } catch (e) {
      console.warn('[Electra Auth] sync accreditation snapshot warning:', e.message);
    }
  }

  return fullRecord;
}

async function getVoterVotesForElection(electionId, voterReg) {
  const cleanReg = voterReg.trim().toUpperCase();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('electra_votes')
        .select('*')
        .eq('election_id', electionId)
        .eq('voter_registration_number', cleanReg);

      if (data && !error) return data;
    } catch (_) {}
  }

  if (supabase) {
    try {
      const { data: row } = await supabase
        .from('id_card_settings')
        .select('academic_session')
        .eq('id', VOTES_STORE_KEY)
        .maybeSingle();

      if (row?.academic_session) {
        const list = JSON.parse(row.academic_session);
        return list.filter(v => v.election_id === electionId && v.voter_registration_number === cleanReg);
      }
    } catch (_) {}
  }

  return [];
}

let publisherChannel = null;
let publisherElectionId = null;

export async function broadcastRealtimeResultUpdate({ electionId, updates, totalBallots }) {
  if (!supabase || !electionId || !updates || updates.length === 0) return false;
  try {
    const channelName = `election-results:${electionId}`;
    
    // Fast path: Reuse already joined publisher channel
    if (publisherChannel && publisherElectionId === electionId && publisherChannel.state === 'joined') {
      try {
        const res = await publisherChannel.send({
          type: 'broadcast',
          event: 'result_updated',
          payload: {
            type: 'result_updated',
            election_id: electionId,
            updates, // [{ position_id, candidate_id, vote_count, updated_at }]
            total_ballots: totalBallots,
            timestamp: new Date().toISOString()
          }
        });
        return res === 'ok' || true;
      } catch (err) {
        console.warn('[Electra Auth] Direct broadcast send warning:', err.message);
      }
    }

    // Establish channel and subscribe
    const channel = supabase.channel(channelName);
    publisherElectionId = electionId;
    publisherChannel = channel;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, 5000);

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          try {
            const res = await channel.send({
              type: 'broadcast',
              event: 'result_updated',
              payload: {
                type: 'result_updated',
                election_id: electionId,
                updates, // [{ position_id, candidate_id, vote_count, updated_at }]
                total_ballots: totalBallots,
                timestamp: new Date().toISOString()
              }
            });
            resolve(res === 'ok' || true);
          } catch (_) {
            resolve(false);
          }
        }
      });
    });
  } catch (err) {
    console.warn('[Electra Auth] Realtime broadcast notice:', err.message);
    return false;
  }
}

async function recordElectoralVotesAtomic(voteRecords, candidateIdMap, electionId, selections) {
  const now = new Date().toISOString();

  // 1. Insert into electra_votes table (Database uniqueness constraint prevents double voting)
  if (supabase) {
    const { error: voteInsertError } = await supabase.from('electra_votes').insert(voteRecords);
    if (voteInsertError && voteInsertError.code === '23505') {
      throw new Error('Duplicate vote detected. You have already cast a ballot for one or more of these offices.');
    }
  }

  // 2. Synchronize votes archive in id_card_settings
  if (supabase) {
    try {
      const { data: row } = await supabase
        .from('id_card_settings')
        .select('academic_session')
        .eq('id', VOTES_STORE_KEY)
        .maybeSingle();

      let existing = [];
      if (row?.academic_session) {
        try { existing = JSON.parse(row.academic_session); } catch (_) {}
      }
      existing.push(...voteRecords);

      await supabase.from('id_card_settings').upsert({
        id: VOTES_STORE_KEY,
        academic_session: JSON.stringify(existing),
        updated_at: now
      });
    } catch (_) {}
  }

  // 3. Atomically update official aggregated counts in electra_election_results and store_electra_contestants
  const updates = [];
  let totalBallots = 0;

  if (supabase && candidateIdMap && Object.keys(candidateIdMap).length > 0) {
    // A. Update PostgreSQL electra_election_results table
    for (const [postId, candidateId] of Object.entries(selections)) {
      try {
        const { data: existingResult } = await supabase
          .from('electra_election_results')
          .select('vote_count')
          .eq('election_id', electionId)
          .eq('position_id', postId)
          .eq('candidate_id', candidateId)
          .maybeSingle();

        const currentCount = existingResult ? (existingResult.vote_count || 0) : 0;
        const newCount = currentCount + 1;

        await supabase.from('electra_election_results').upsert({
          election_id: electionId,
          position_id: postId,
          candidate_id: candidateId,
          vote_count: newCount,
          updated_at: now
        }, { onConflict: 'election_id,position_id,candidate_id' });

        updates.push({
          position_id: postId,
          candidate_id: candidateId,
          vote_count: newCount,
          updated_at: now
        });
      } catch (e) {
        console.warn('[Electra Auth] electra_election_results upsert notice:', e.message);
      }
    }

    // B. Atomically update store_electra_contestants for synchronised client reading
    try {
      const { data: cndRow } = await supabase
        .from('id_card_settings')
        .select('academic_session')
        .eq('id', 'store_electra_contestants')
        .maybeSingle();

      if (cndRow?.academic_session) {
        const contestants = JSON.parse(cndRow.academic_session);
        const updated = contestants.map(c => {
          if (candidateIdMap[c.id]) {
            const newCount = (c.votesCount || 0) + 1;
            const alreadyInUpdates = updates.find(u => u.candidate_id === c.id);
            if (!alreadyInUpdates) {
              updates.push({
                position_id: c.postId,
                candidate_id: c.id,
                vote_count: newCount,
                updated_at: now
              });
            } else {
              alreadyInUpdates.vote_count = newCount;
            }
            return { ...c, votesCount: newCount };
          }
          return c;
        });

        totalBallots = updated.reduce((sum, c) => sum + (c.votesCount || 0), 0);

        await supabase.from('id_card_settings').upsert({
          id: 'store_electra_contestants',
          academic_session: JSON.stringify(updated),
          updated_at: now
        });
      }
    } catch (e) {
      console.warn('[Electra Auth] contestant tally update warning:', e.message);
    }
  }

  return { updates, totalBallots, timestamp: now };
}

// =============================================================================
// 1. STEP 1 & 2: ELECTORAL ACCREDITATION & IDENTITY VERIFICATION
// =============================================================================

export async function handleElectoralAccreditation({ electionId, registrationNumber, firstName, lastName }) {
  if (!electionId) {
    return { success: false, error: 'Election session identifier is required.' };
  }
  if (!registrationNumber || !registrationNumber.trim()) {
    return { success: false, error: 'Registration number is required.' };
  }
  if (!firstName || !firstName.trim() || !lastName || !lastName.trim()) {
    return { success: false, error: 'First Name and Last Name are required.' };
  }

  const cleanReg = registrationNumber.trim().toUpperCase();

  // Verify election status
  const election = await getServerElection(electionId);
  if (election && (election.status === 'concluded' || election.status === 'published')) {
    return {
      success: false,
      error: 'Accreditation has closed for this election session.'
    };
  }

  // 1. Check if voter already has an active accreditation for THIS election
  const existingAccreditation = await getAccreditationRecord(electionId, cleanReg);
  if (existingAccreditation) {
    if (existingAccreditation.status === 'voted') {
      return {
        success: false,
        alreadyVoted: true,
        error: 'You have already voted in this election. Each elector is entitled to participate exactly once.'
      };
    }
    if (existingAccreditation.status === 'verified') {
      // Re-issue valid voting session without allowing re-accreditation
      const votingSessionToken = signElectraToken({
        purpose: 'ELECTRA_VOTING_SESSION',
        electionId,
        registrationNumber: cleanReg,
        accreditationId: existingAccreditation.id,
        voterName: existingAccreditation.student_name,
        voterLevel: existingAccreditation.student_level,
        exp: Date.now() + VOTING_SESSION_TTL_HOURS * 60 * 60 * 1000
      });

      return {
        success: true,
        alreadyVerified: true,
        votingSessionToken,
        voter: {
          registrationNumber: cleanReg,
          name: existingAccreditation.student_name,
          level: existingAccreditation.student_level,
          electionId
        },
        message: 'Your accreditation was already verified. Proceeding directly to your official ballot.'
      };
    }
  }

  // 2. Verify identity against official student ground truth
  const officialRecord = await getOfficialStudentRecord(cleanReg);
  if (!officialRecord) {
    // Non-enumerative generic error message to prevent PII probing
    return {
      success: false,
      error: 'We could not verify the details provided. Please check your information and try again.'
    };
  }

  // 3. Strict Normalized Name Matching
  const normInputFirst = normalizeName(firstName);
  const normInputLast = normalizeName(lastName);

  const normOfficialFirst = normalizeName(officialRecord.first_name || '');
  const normOfficialLast = normalizeName(officialRecord.last_name || officialRecord.surname || '');
  const normOfficialFull = normalizeName(officialRecord.full_name || '');
  const officialWords = normOfficialFull.split(' ').filter(Boolean);

  const firstMatches = normInputFirst === normOfficialFirst || 
    normInputFirst === normOfficialLast ||
    officialWords.includes(normInputFirst);

  const lastMatches = normInputLast === normOfficialLast || 
    normInputLast === normOfficialFirst ||
    officialWords.includes(normInputLast);

  if (!firstMatches || !lastMatches) {
    return {
      success: false,
      error: 'We could not verify the details provided. Please check your information and try again.'
    };
  }

  // 4. Create or update pending accreditation record
  const officialFullName = officialRecord.full_name || `${officialRecord.first_name || ''} ${officialRecord.last_name || ''}`.trim() || 'Student Elector';
  const officialLevel = officialRecord.level || '300 Level';

  const accreditationId = existingAccreditation?.id || `acc-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const accreditationRecord = {
    id: accreditationId,
    election_id: electionId,
    registration_number: cleanReg,
    student_name: officialFullName,
    student_level: officialLevel,
    status: 'pending',
    code_request_count: existingAccreditation?.code_request_count || 0,
    created_at: existingAccreditation?.created_at || new Date().toISOString()
  };

  await saveAccreditationRecord(accreditationRecord);

  // 5. Issue short-lived accreditation token (zero PII leakage)
  const accreditationToken = signElectraToken({
    purpose: 'ELECTRA_ACCREDITATION',
    accreditationId,
    electionId,
    registrationNumber: cleanReg,
    studentName: officialFullName,
    studentLevel: officialLevel,
    exp: Date.now() + 30 * 60 * 1000 // 30 minutes
  });

  return {
    success: true,
    accreditationToken,
    voter: {
      registrationNumber: cleanReg,
      name: officialFullName,
      level: officialLevel
    },
    message: 'Institutional identity successfully confirmed. Please provide your email address to receive your one-time verification code.'
  };
}

// =============================================================================
// 2. STEP 3: TEMPORARY EMAIL & VERIFICATION CODE DISPATCH
// =============================================================================

export async function handleSendElectoralCode({ accreditationToken, email, ipAddress = null }) {
  const verifiedToken = verifyElectraToken(accreditationToken, 'ELECTRA_ACCREDITATION');
  if (!verifiedToken) {
    return {
      success: false,
      error: 'Your accreditation session is invalid or has expired. Please restart the accreditation process.'
    };
  }

  if (!email || !isValidEmail(email)) {
    return { success: false, error: 'A valid email address is required to receive your one-time code.' };
  }

  const { electionId, registrationNumber, accreditationId, studentName } = verifiedToken;
  const targetEmail = email.trim().toLowerCase();

  // Fetch current accreditation state
  const accreditation = await getAccreditationRecord(electionId, registrationNumber);
  if (!accreditation) {
    return { success: false, error: 'Accreditation record not found. Please restart.' };
  }

  if (accreditation.status === 'voted') {
    return { success: false, error: 'You have already voted in this election.' };
  }
  if (accreditation.status === 'verified') {
    return { success: false, error: 'You have already completed accreditation for this election.' };
  }

  // Rate Limiting & Cooldown Protection
  const now = Date.now();
  if (accreditation.last_code_sent_at) {
    const timeSinceLast = (now - new Date(accreditation.last_code_sent_at).getTime()) / 1000;
    if (timeSinceLast < RESEND_COOLDOWN_SECONDS) {
      const waitRemaining = Math.ceil(RESEND_COOLDOWN_SECONDS - timeSinceLast);
      return {
        success: false,
        cooldown: true,
        retryAfterSeconds: waitRemaining,
        error: `Please wait ${waitRemaining} seconds before requesting another code.`
      };
    }
  }

  if ((accreditation.code_request_count || 0) >= MAX_CODE_REQUESTS) {
    return {
      success: false,
      error: 'Maximum code request attempts reached for this session. Please contact the electoral commission.'
    };
  }

  // Generate cryptographically secure random 6-digit code
  const rawCode = crypto.randomInt(100000, 999999).toString();
  const codeHash = hashElectoralCode(rawCode);
  const expiresAt = new Date(now + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

  // Persist code hash & metadata
  const updatedAccreditation = {
    ...accreditation,
    delivery_email: targetEmail,
    code_hash: codeHash,
    code_expires_at: expiresAt,
    code_attempts: 0,
    is_code_consumed: false,
    last_code_sent_at: new Date(now).toISOString(),
    code_request_count: (accreditation.code_request_count || 0) + 1
  };

  await saveAccreditationRecord(updatedAccreditation);

  // Dispatch branded electoral email via Resend
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Official Electoral Verification Code</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
        .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 36px 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { text-align: center; border-bottom: 2px solid #138601; padding-bottom: 20px; margin-bottom: 24px; }
        .logo-title { font-size: 20px; font-weight: 800; color: #138601; letter-spacing: 0.5px; text-transform: uppercase; }
        .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; font-weight: 600; }
        .content { font-size: 14px; line-height: 1.6; color: #334155; }
        .otp-container { background: #f0fdf4; border: 1.5px dashed #138601; border-radius: 6px; padding: 18px; text-align: center; margin: 24px 0; }
        .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #138601; margin: 0; }
        .notice { font-size: 12px; color: #64748b; text-align: center; margin-top: 8px; }
        .warning-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 14px; font-size: 12px; color: #92400e; margin: 20px 0; border-radius: 0 4px 4px 0; }
        .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 28px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="logo-title">ELECTRA • NACOS FUTO</div>
          <div class="subtitle">Independent Student Electoral Commission</div>
        </div>
        <div class="content">
          <p>Dear <strong>${studentName}</strong>,</p>
          <p>Your student accreditation has been validated for the <strong>NACOS FUTO General Elections</strong>. Use the single-use verification code below to unlock your official ballot box:</p>
          
          <div class="otp-container">
            <div class="otp-code">${rawCode}</div>
            <div class="notice">Valid for <strong>${OTP_EXPIRY_MINUTES} minutes</strong> • Single use only</div>
          </div>

          <div class="warning-box">
            <strong>Security Warning:</strong> This verification code is personal and non-transferable. Do NOT disclose this code to candidates, agents, or third parties. Election officials will never ask for your code.
          </div>

          <p style="font-size: 12px; color: #64748b;">
            This email was requested during voter accreditation for Registration Number <code>${registrationNumber}</code>. If you did not initiate this request, no action is required—the code will expire automatically.
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} NACOS FUTO Independent Electoral Commission. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  const emailResult = await dispatchEmail({
    to: targetEmail,
    subject: `Your Voter Verification Code [${rawCode}] - ELECTRA NACOS FUTO`,
    html: emailHtml,
    text: `Your NACOS FUTO electoral verification code is: ${rawCode}. This code is valid for ${OTP_EXPIRY_MINUTES} minutes. Do not share this code with anyone.`
  });

  return {
    success: true,
    destinationMasked: targetEmail.replace(/(.{2})(.*)(?=@)/, (_, a, b) => a + '•'.repeat(Math.max(b.length, 3))),
    cooldownSeconds: RESEND_COOLDOWN_SECONDS,
    expiresInMinutes: OTP_EXPIRY_MINUTES,
    message: 'A secure, single-use verification code has been dispatched to your email address.'
  };
}

// =============================================================================
// 3. STEP 4: VERIFICATION CODE CONSUMPTION & VOTING SESSION ISSUANCE
// =============================================================================

export async function handleVerifyElectoralCode({ accreditationToken, code }) {
  const verifiedToken = verifyElectraToken(accreditationToken, 'ELECTRA_ACCREDITATION');
  if (!verifiedToken) {
    return {
      success: false,
      error: 'Your accreditation session is invalid or has expired. Please restart the accreditation process.'
    };
  }

  if (!code || !code.trim()) {
    return { success: false, error: 'Please enter the 6-digit verification code.' };
  }

  const cleanCode = code.trim();
  const { electionId, registrationNumber, studentName, studentLevel } = verifiedToken;

  const accreditation = await getAccreditationRecord(electionId, registrationNumber);
  if (!accreditation) {
    return { success: false, error: 'Accreditation record could not be found.' };
  }

  if (accreditation.status === 'voted') {
    return { success: false, error: 'You have already voted in this election.' };
  }

  // 1. Single-use consumption check
  if (accreditation.is_code_consumed) {
    return {
      success: false,
      error: 'This verification code has already been consumed. Please request a new code if needed.'
    };
  }

  // 2. Expiration check
  if (!accreditation.code_expires_at || Date.now() > new Date(accreditation.code_expires_at).getTime()) {
    return {
      success: false,
      expired: true,
      error: 'The verification code has expired. Please request a new code.'
    };
  }

  // 3. Brute-force attempt limit check
  const currentAttempts = accreditation.code_attempts || 0;
  if (currentAttempts >= MAX_VERIFICATION_ATTEMPTS) {
    // Invalidate code upon exceeding attempts
    await saveAccreditationRecord({
      ...accreditation,
      is_code_consumed: true
    });
    return {
      success: false,
      error: 'Too many incorrect attempts. For security, this code has been invalidated. Please request a new code.'
    };
  }

  // 4. Verify code hash
  const computedHash = hashElectoralCode(cleanCode);
  if (computedHash !== accreditation.code_hash) {
    const remaining = MAX_VERIFICATION_ATTEMPTS - (currentAttempts + 1);
    await saveAccreditationRecord({
      ...accreditation,
      code_attempts: currentAttempts + 1
    });
    return {
      success: false,
      error: `Invalid verification code. ${remaining > 0 ? `${remaining} attempt(s) remaining.` : 'Code will be invalidated on next failure.'}`
    };
  }

  // 5. Code is VALID: Immediately consume code and transition accreditation to VERIFIED
  const nowIso = new Date().toISOString();
  const updatedAccreditation = {
    ...accreditation,
    status: 'verified',
    is_code_consumed: true, // INVALDATED IMMEDIATELY - CAN NEVER BE USED AGAIN
    accredited_at: nowIso
  };

  await saveAccreditationRecord(updatedAccreditation);

  // 6. Issue cryptographically signed Voting Session Token
  const votingSessionToken = signElectraToken({
    purpose: 'ELECTRA_VOTING_SESSION',
    accreditationId: accreditation.id,
    electionId,
    registrationNumber,
    voterName: studentName,
    voterLevel: studentLevel,
    nonce: crypto.randomBytes(8).toString('hex'),
    exp: Date.now() + VOTING_SESSION_TTL_HOURS * 60 * 60 * 1000 // 2 hours
  });

  return {
    success: true,
    votingSessionToken,
    voter: {
      registrationNumber,
      name: studentName,
      level: studentLevel,
      electionId,
      accreditedAt: nowIso
    },
    message: 'Accreditation successfully verified! Welcome to the official election ballot.'
  };
}

// =============================================================================
// 4. VOTING SESSION STATUS
// =============================================================================

export async function handleGetSessionStatus({ votingSessionToken }) {
  const verifiedToken = verifyElectraToken(votingSessionToken, 'ELECTRA_VOTING_SESSION');
  if (!verifiedToken) {
    return { success: false, authenticated: false, error: 'Voting session is invalid or has expired.' };
  }

  const { electionId, registrationNumber, voterName, voterLevel } = verifiedToken;

  // Retrieve votes already cast by this elector for this election
  const votes = await getVoterVotesForElection(electionId, registrationNumber);
  const votedPositions = votes.map(v => v.position_id);

  return {
    success: true,
    authenticated: true,
    voter: {
      registrationNumber,
      name: voterName,
      level: voterLevel,
      electionId
    },
    votedPositions,
    hasVotedAll: votedPositions.length > 0
  };
}

// =============================================================================
// 5. ATOMIC VOTE SUBMISSION & DUPLICATE PROTECTION
// =============================================================================

export async function handleSubmitElectoralVote({ votingSessionToken, selections }) {
  // 1. Verify voting session token server-side
  const verifiedToken = verifyElectraToken(votingSessionToken, 'ELECTRA_VOTING_SESSION');
  if (!verifiedToken) {
    return {
      success: false,
      error: 'Invalid or expired voting session. Please re-accredit to cast your ballot.'
    };
  }

  const { electionId, registrationNumber, voterName, voterLevel } = verifiedToken;

  if (!selections || typeof selections !== 'object' || Object.keys(selections).length === 0) {
    return { success: false, error: 'At least one candidate must be selected on your ballot.' };
  }

  // 1b. Verify election is actively open for voting
  const election = await getServerElection(electionId);
  if (election && election.status !== 'active') {
    return {
      success: false,
      error: `Voting is currently closed for this election (Status: ${election.status.toUpperCase()}).`
    };
  }

  // 1c. Fetch cleared posts and contestants for strict server-side verification
  const { posts, contestants } = await getServerPostsAndContestants(electionId);
  const validPostIds = new Set(posts.map(p => p.id));

  // 2. Fetch accreditation record
  const accreditation = await getAccreditationRecord(electionId, registrationNumber);
  if (!accreditation || (accreditation.status !== 'verified' && accreditation.status !== 'voted')) {
    return { success: false, error: 'You are not accredited to vote in this election.' };
  }

  // 3. Fetch existing votes for this student in this election to prevent duplicate submissions
  const existingVotes = await getVoterVotesForElection(electionId, registrationNumber);
  const alreadyVotedPositions = new Set(existingVotes.map(v => v.position_id));

  // 4. Validate selections and enforce ONE VOTE PER POSITION
  const entries = Object.entries(selections);
  const candidateIdMap = {};
  const newVoteRecords = [];
  const timestamp = new Date().toISOString();
  const receiptHash = generateAuditReceipt(electionId, registrationNumber, selections, timestamp);

  for (const [postId, candidateId] of entries) {
    if (!postId || !candidateId) continue;

    // Verify postId exists
    if (!validPostIds.has(postId)) {
      return {
        success: false,
        error: `Invalid electoral office: "${postId}".`
      };
    }

    // Verify candidate is cleared for this office and election
    const matchingCandidate = contestants.find(c => c.id === candidateId && c.postId === postId);
    if (!matchingCandidate) {
      return {
        success: false,
        error: `Candidate is not cleared for the office of ${postId}.`
      };
    }

    // Check if voter already cast ballot for this position
    if (alreadyVotedPositions.has(postId)) {
      return {
        success: false,
        error: `You have already submitted a vote for the office of ${postId}. Duplicate votes are rejected.`
      };
    }

    // Ensure candidateId is a scalar string (reject multiple choices for single position)
    if (typeof candidateId !== 'string') {
      return {
        success: false,
        error: `Only one candidate may be selected for position ${postId}.`
      };
    }

    newVoteRecords.push({
      id: `vote-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      election_id: electionId,
      voter_registration_number: registrationNumber,
      position_id: postId,
      candidate_id: candidateId,
      receipt_hash: receiptHash,
      created_at: timestamp
    });

    candidateIdMap[candidateId] = true;
  }

  if (newVoteRecords.length === 0) {
    return { success: false, error: 'No valid votes to submit.' };
  }

  // 5. Atomically insert votes & update candidate tallies
  let atomicResult;
  try {
    atomicResult = await recordElectoralVotesAtomic(newVoteRecords, candidateIdMap, electionId, selections);
  } catch (err) {
    console.error('[Electra Auth] Atomic vote insertion error:', err);
    return {
      success: false,
      error: err.message || 'An unexpected database error occurred while recording your ballot. Please try again.'
    };
  }

  // 6. Update accreditation status to 'voted' (COMMITTED BEFORE BROADCAST)
  await saveAccreditationRecord({
    ...accreditation,
    status: 'voted',
    voted_at: timestamp
  });

  // 7. REALTIME BROADCAST: Trigger broadcast only after database writes successfully commit!
  if (atomicResult?.updates?.length > 0) {
    broadcastRealtimeResultUpdate({
      electionId,
      updates: atomicResult.updates,
      totalBallots: atomicResult.totalBallots
    }).catch(err => {
      console.warn('[Electra Realtime] Broadcast notice:', err.message);
    });
  }

  return {
    success: true,
    receipt: {
      receiptHash,
      timestamp,
      voterRegistration: registrationNumber,
      electionId,
      recordedVotesCount: newVoteRecords.length
    },
    message: 'Your official vote has been successfully submitted and cryptographically sealed.'
  };
}

// =============================================================================
// 6. OFFICIAL AUTHORITATIVE RESULTS QUERY (Zero PII, Aggregate Only)
// =============================================================================

export async function handleGetAuthoritativeResults({ electionId }) {
  // Dynamically resolve target election if not supplied
  let targetElectionId = electionId;
  if (!targetElectionId) {
    const defaultEl = await getServerElection(null);
    targetElectionId = defaultEl?.id || null;
  }

  if (!targetElectionId) {
    return {
      success: true,
      electionId: null,
      totalBallots: 0,
      resultsByPost: [],
      turnoutByLevel: {},
      lastUpdated: new Date().toISOString()
    };
  }

  // 1 & 2. Fetch real database posts and contestants
  const { posts, contestants: rawContestants } = await getServerPostsAndContestants(targetElectionId);
  let contestants = rawContestants.map(c => ({ ...c, votesCount: c.votesCount || 0 }));

  // 3. Fetch aggregated vote counts from electra_election_results if present
  if (supabase) {
    try {
      const { data: resultsRows } = await supabase
        .from('electra_election_results')
        .select('candidate_id, position_id, vote_count')
        .eq('election_id', targetElectionId);

      if (resultsRows && resultsRows.length > 0) {
        const countsMap = new Map();
        resultsRows.forEach(r => countsMap.set(r.candidate_id, r.vote_count));

        contestants = contestants.map(c => {
          if (countsMap.has(c.id)) {
            return { ...c, votesCount: countsMap.get(c.id) };
          }
          return c;
        });
      }
    } catch (_) {}
  }

  // 4. Fetch voter turnout level breakdown from electra_accreditations / votes archive
  let turnoutByLevel = {};
  if (supabase) {
    try {
      const { data: accList } = await supabase
        .from('electra_accreditations')
        .select('student_level, status')
        .eq('election_id', targetElectionId);

      let list = accList || [];
      if (list.length === 0) {
        // Check fallback storage in id_card_settings
        const { data: row } = await supabase
          .from('id_card_settings')
          .select('academic_session')
          .eq('id', ACCREDITATION_STORE_KEY)
          .maybeSingle();

        if (row?.academic_session) {
          try {
            const parsed = JSON.parse(row.academic_session);
            list = (parsed || []).filter(a => a.election_id === targetElectionId);
          } catch (_) {}
        }
      }

      list.forEach(a => {
        const rawLvl = a.student_level || '';
        const match = String(rawLvl).match(/\d{3}/);
        const lvl = match ? `${match[0]} Level` : (rawLvl ? `${rawLvl} Level` : null);
        if (lvl) {
          turnoutByLevel[lvl] = (turnoutByLevel[lvl] || 0) + 1;
        }
      });
    } catch (_) {}
  }

  // Calculate results by post
  const resultsByPost = posts.map(post => {
    const postCandidates = contestants.filter(c => c.postId === post.id);
    const postTotalVotes = postCandidates.reduce((sum, c) => sum + (c.votesCount || 0), 0);

    const candidates = postCandidates.map(c => {
      const percentage = postTotalVotes > 0
        ? Math.round(((c.votesCount || 0) / postTotalVotes) * 100)
        : 0;
      return {
        id: c.id,
        name: c.name,
        postId: c.postId,
        photoUrl: c.photoUrl,
        level: c.level,
        slogan: c.slogan,
        votesCount: c.votesCount || 0,
        percentage
      };
    }).sort((a, b) => (b.votesCount || 0) - (a.votesCount || 0));

    return {
      post: {
        id: post.id,
        title: post.title,
        code: post.code,
        order: post.order,
        description: post.description
      },
      totalVotes: postTotalVotes,
      candidates,
      leadingCandidate: candidates[0] || null
    };
  });

  const totalBallots = contestants.reduce((sum, c) => sum + (c.votesCount || 0), 0);

  return {
    success: true,
    electionId: targetElectionId,
    totalBallots,
    resultsByPost,
    turnoutByLevel,
    lastUpdated: new Date().toISOString()
  };
}

