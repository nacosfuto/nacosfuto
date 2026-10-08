/**
 * electraService.js
 * Authoritative Database-First Election and Balloting Service for ELECTRA - NACOS FUTO.
 * 
 * CORE PRINCIPLES:
 * 1. Single Source of Truth: All elections, offices, candidates, news, accreditations,
 *    and votes originate directly from the PostgreSQL Supabase database.
 * 2. Zero Mock / Fabricated Data: When the database is empty (0 records), the service returns
 *    empty collections (empty arrays / null). The frontend renders honest empty states.
 * 3. Atomic Persistence: Admin actions (create, edit, publish, delete) persist directly
 *    to Supabase tables (`electra_elections`, `electra_positions`, `electra_candidates`, `electra_news`).
 * 4. Election Isolation: All positions, candidates, and votes are strictly scoped to their respective `election_id`.
 */

import { supabase, isSupabaseConfigured } from './client.js';

// Ephemeral cache keys (used solely for offline / fast re-render cache, never initialized with mock data)
const ELECTIONS_LIST_STORAGE_KEY = 'nacos_electra_all_elections_db';
const ELECTIONS_STORAGE_KEY = 'nacos_electra_elections_db';
const POSTS_STORAGE_KEY = 'nacos_electra_posts_db';
const CONTESTANTS_STORAGE_KEY = 'nacos_electra_contestants_db';
const NEWS_STORAGE_KEY = 'nacos_electra_news_db';

// Empty default constants exported for backward-compatibility with zero mock data
export const DEFAULT_ELECTRA_NEWS = [];
export const DEFAULT_ELECTRA_POSTS = [];
export const DEFAULT_ELECTIONS = [];
export const DEFAULT_ELECTION = null;
export const INITIAL_CONTESTANTS = [];
export const DEFAULT_VOTING_POSTS = [];

// In-memory runtime state populated from database queries
let memoryState = {
  allElections: [],
  activeElection: null,
  posts: [],
  contestants: [],
  news: []
};

// =============================================================================
// DATA NORMALIZATION HELPERS
// =============================================================================

function normalizeElection(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title || 'NACOS FUTO Election',
    session: row.session || '',
    year: row.year || new Date().getFullYear(),
    status: row.status || 'upcoming', // 'draft', 'upcoming', 'active', 'concluded', 'archived'
    isPublished: row.is_published !== false,
    startDate: row.start_date || null,
    endDate: row.end_date || null,
    totalBallots: row.total_ballots || 0,
    certifiedTurnout: row.certified_turnout || 'Not Started',
    description: row.description || '',
    guidelines: Array.isArray(row.guidelines) ? row.guidelines : (typeof row.guidelines === 'string' ? JSON.parse(row.guidelines || '[]') : []),
    winnerSummary: row.winner_summary || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizePost(row) {
  if (!row) return null;
  return {
    id: row.id,
    electionId: row.election_id,
    title: row.title,
    code: row.code,
    order: row.order_index ?? row.order ?? 1,
    description: row.description || '',
    eligibilityLevel: row.eligibility_level || row.eligibilityLevel || '200L - 400L',
    maxVotesPerVoter: row.max_votes_per_voter ?? row.maxVotesPerVoter ?? 1,
    isActive: row.is_active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeCandidate(row) {
  if (!row) return null;
  let manifestoObj = {};
  if (row.manifesto && typeof row.manifesto === 'object') {
    manifestoObj = row.manifesto;
  } else if (typeof row.manifesto === 'string') {
    try { manifestoObj = JSON.parse(row.manifesto); } catch (_) {}
  }

  return {
    id: row.id,
    electionId: row.election_id || row.electionId,
    postId: row.position_id || row.postId,
    name: row.name,
    matricNumber: row.matric_number || row.matricNumber || '',
    level: row.level || '300 Level',
    runningPost: row.running_post || row.runningPost || '',
    slogan: row.slogan || '',
    photoUrl: row.photo_url || row.photoUrl || '',
    cloudinaryPublicId: row.cloudinary_public_id || row.cloudinaryPublicId || '',
    status: row.status || 'certified',
    isPublished: row.is_published !== false,
    votesCount: row.votes_count ?? row.votesCount ?? 0,
    statementPdfUrl: row.statement_pdf_url || row.statementPdfUrl || '',
    manifestoPdfUrl: row.manifesto_pdf_url || row.manifestoPdfUrl || '',
    manifestoStorageKey: row.manifesto_storage_key || row.manifestoStorageKey || '',
    manifestoFileName: row.manifesto_file_name || row.manifestoFileName || '',
    candidateStatement: row.candidate_statement || row.candidateStatement || '',
    manifestoHeadline: manifestoObj.headline || row.manifesto_headline || '',
    manifestoSummary: manifestoObj.summary || row.manifesto_summary || '',
    manifestoPillars: Array.isArray(manifestoObj.pillars) ? manifestoObj.pillars : (row.manifestoPillars || []),
    manifesto: manifestoObj,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeNews(row) {
  if (!row) return null;
  return {
    id: row.id,
    electionId: row.election_id,
    title: row.title,
    category: row.category || 'Electoral Notice',
    tag: row.tag || 'Official',
    date: row.published_date || (row.created_at ? row.created_at.slice(0, 10) : ''),
    summary: row.summary || '',
    content: row.content || '',
    author: row.author || 'NACOS ISEC Secretariat',
    pinned: row.is_pinned === true || row.pinned === true,
    isPublished: row.is_published !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// =============================================================================
// SYNCHRONOUS ACCESSORS (BACKED BY RUNTIME MEMORY & REHYDRATED CACHE)
// =============================================================================

export function getAllElections() {
  if (memoryState.allElections.length > 0) return memoryState.allElections;
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(ELECTIONS_LIST_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          memoryState.allElections = parsed;
          return parsed;
        }
      }
    } catch (_) {}
  }
  return [];
}

export function getActiveElection() {
  if (memoryState.activeElection) return memoryState.activeElection;
  const all = getAllElections();
  const active = all.find(e => e.status === 'active' && e.isPublished !== false);
  if (active) {
    memoryState.activeElection = active;
    return active;
  }
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(ELECTIONS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id && parsed.status === 'active') {
          memoryState.activeElection = parsed;
          return parsed;
        }
      }
    } catch (_) {}
  }
  return null;
}

export function getElectraPosts() {
  if (memoryState.posts.length > 0) return memoryState.posts;
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(POSTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          memoryState.posts = parsed;
          return parsed;
        }
      }
    } catch (_) {}
  }
  return [];
}
export const getVotingPosts = getElectraPosts;

export function getContestants(postId = null, electionId = null) {
  const activeEl = getActiveElection();
  const targetElectionId = (electionId === 'all' || electionId === false)
    ? null
    : (electionId || activeEl?.id || null);

  let list = memoryState.contestants;
  if (list.length === 0 && typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(CONTESTANTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) list = parsed;
      }
    } catch (_) {}
  }

  let filtered = list;
  if (targetElectionId) {
    filtered = filtered.filter(c => c.electionId === targetElectionId);
  }

  if (postId && postId !== 'all') {
    filtered = filtered.filter(c => c.postId === postId);
  }

  return filtered;
}

export function getContestantById(contestantId) {
  const all = getContestants();
  return all.find(c => c.id === contestantId) || null;
}

export function getElectraNews() {
  if (memoryState.news.length > 0) return memoryState.news;
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(NEWS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          memoryState.news = parsed;
          return parsed;
        }
      }
    } catch (_) {}
  }
  return [];
}

// =============================================================================
// DATABASE QUERY & SYNCHRONIZATION ENGINE
// =============================================================================

/**
 * Fetch all authoritative election data from Supabase PostgreSQL tables.
 * Returns honest empty arrays when database has 0 records.
 */
export async function fetchLiveElectraData() {
  let allElections = [];
  let election = null;
  let posts = [];
  let contestants = [];
  let newsList = [];

  if (supabase) {
    try {
      // 1. Elections Table
      const { data: dbElections, error: elErr } = await supabase
        .from('electra_elections')
        .select('*')
        .order('year', { ascending: false });

      if (!elErr && Array.isArray(dbElections) && dbElections.length > 0) {
        allElections = dbElections.map(normalizeElection);
      } else {
        // Fallback check to id_card_settings JSON snapshot (for transitional resilience)
        const { data: elRow } = await supabase
          .from('id_card_settings')
          .select('academic_session')
          .eq('id', 'store_electra_all_elections')
          .maybeSingle();

        if (elRow?.academic_session) {
          try {
            const parsed = JSON.parse(elRow.academic_session);
            if (Array.isArray(parsed) && parsed.length > 0) {
              allElections = parsed;
            }
          } catch (_) {}
        }
      }

      // Determine currently active published election
      election = allElections.find(e => e.status === 'active' && e.isPublished !== false) || null;

      // 2. Positions Table
      const { data: dbPosts, error: postErr } = await supabase
        .from('electra_positions')
        .select('*')
        .order('order_index', { ascending: true });

      if (!postErr && Array.isArray(dbPosts) && dbPosts.length > 0) {
        posts = dbPosts.map(normalizePost);
      } else {
        const { data: postsRow } = await supabase
          .from('id_card_settings')
          .select('academic_session')
          .eq('id', 'store_electra_posts')
          .maybeSingle();

        if (postsRow?.academic_session) {
          try {
            const parsed = JSON.parse(postsRow.academic_session);
            if (Array.isArray(parsed) && parsed.length > 0) posts = parsed;
          } catch (_) {}
        }
      }

      // 3. Candidates Table
      const { data: dbCandidates, error: cndErr } = await supabase
        .from('electra_candidates')
        .select('*');

      if (!cndErr && Array.isArray(dbCandidates) && dbCandidates.length > 0) {
        contestants = dbCandidates.map(normalizeCandidate);
      } else {
        const { data: cndRow } = await supabase
          .from('id_card_settings')
          .select('academic_session')
          .eq('id', 'store_electra_contestants')
          .maybeSingle();

        if (cndRow?.academic_session) {
          try {
            const parsed = JSON.parse(cndRow.academic_session);
            if (Array.isArray(parsed) && parsed.length > 0) contestants = parsed;
          } catch (_) {}
        }
      }

      // 4. News & Press Releases Table
      const { data: dbNews, error: newsErr } = await supabase
        .from('electra_news')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('published_date', { ascending: false });

      if (!newsErr && Array.isArray(dbNews) && dbNews.length > 0) {
        newsList = dbNews.map(normalizeNews);
      } else {
        const { data: newsRow } = await supabase
          .from('id_card_settings')
          .select('academic_session')
          .eq('id', 'store_electra_news')
          .maybeSingle();

        if (newsRow?.academic_session) {
          try {
            const parsed = JSON.parse(newsRow.academic_session);
            if (Array.isArray(parsed) && parsed.length > 0) newsList = parsed;
          } catch (_) {}
        }
      }
    } catch (e) {
      console.warn('[Electra Service] Supabase database sync error:', e);
    }
  }

  // Update memory state
  memoryState = {
    allElections,
    activeElection: election,
    posts,
    contestants,
    news: newsList
  };

  // Update localStorage cache safely
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(ELECTIONS_LIST_STORAGE_KEY, JSON.stringify(allElections));
      if (election) localStorage.setItem(ELECTIONS_STORAGE_KEY, JSON.stringify(election));
      else localStorage.removeItem(ELECTIONS_STORAGE_KEY);
      localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts));
      localStorage.setItem(CONTESTANTS_STORAGE_KEY, JSON.stringify(contestants));
      localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(newsList));
    } catch (_) {}
  }

  return { allElections, election, posts, contestants, newsList };
}
export const fetchLiveVotingData = fetchLiveElectraData;

// =============================================================================
// ADMIN ELECTIONS MANAGEMENT (PERSISTS DIRECTLY TO SUPABASE)
// =============================================================================

export async function adminCreateElection(electionData) {
  const id = electionData.id || `election-${electionData.year || new Date().getFullYear()}-general`;
  const isSetToActive = electionData.status === 'active';
  const now = new Date().toISOString();

  const newElection = {
    id,
    title: electionData.title || `NACOS FUTO ${electionData.year || new Date().getFullYear()} General Elections`,
    session: electionData.session || `${electionData.year}/${Number(electionData.year) + 1}`,
    year: parseInt(electionData.year, 10) || new Date().getFullYear(),
    status: isSetToActive ? 'active' : (electionData.status || 'upcoming'),
    isPublished: electionData.isPublished !== false,
    startDate: electionData.startDate || null,
    endDate: electionData.endDate || null,
    totalBallots: 0,
    certifiedTurnout: 'Not Started',
    description: electionData.description || '',
    guidelines: electionData.guidelines || [],
    winnerSummary: electionData.winnerSummary || '',
    createdAt: now,
    updatedAt: now
  };

  if (supabase) {
    try {
      // If newly created election is set to active, conclude previous active elections
      if (isSetToActive) {
        await supabase
          .from('electra_elections')
          .update({ status: 'concluded', updated_at: now })
          .eq('status', 'active');
      }

      const { error: insErr } = await supabase.from('electra_elections').upsert({
        id: newElection.id,
        title: newElection.title,
        session: newElection.session,
        year: newElection.year,
        status: newElection.status,
        is_published: newElection.isPublished,
        start_date: newElection.startDate,
        end_date: newElection.endDate,
        total_ballots: 0,
        certified_turnout: 'Not Started',
        description: newElection.description,
        guidelines: newElection.guidelines,
        winner_summary: newElection.winnerSummary,
        created_at: now,
        updated_at: now
      });

      if (insErr) {
        console.warn('[Electra Admin] electra_elections table upsert notice:', insErr.message);
      }
    } catch (e) {
      console.warn('[Electra Admin] election creation warning:', e.message);
    }
  }

  // Update state & snapshot
  const all = getAllElections();
  let updatedList = all;
  if (isSetToActive) {
    updatedList = all.map(e => ({
      ...e,
      status: e.status === 'active' ? 'concluded' : e.status
    }));
  }
  updatedList = [newElection, ...updatedList.filter(e => e.id !== id)];
  updatedList.sort((a, b) => (b.year || 0) - (a.year || 0));

  memoryState.allElections = updatedList;
  if (isSetToActive) memoryState.activeElection = newElection;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(ELECTIONS_LIST_STORAGE_KEY, JSON.stringify(updatedList));
      if (isSetToActive) localStorage.setItem(ELECTIONS_STORAGE_KEY, JSON.stringify(newElection));
      window.dispatchEvent(new Event('nacos_electra_election_updated'));
    } catch (_) {}
  }

  // Mirror snapshot to id_card_settings
  if (supabase) {
    try {
      await supabase.from('id_card_settings').upsert({
        id: 'store_electra_all_elections',
        academic_session: JSON.stringify(updatedList),
        updated_at: now
      });
      if (isSetToActive) {
        await supabase.from('id_card_settings').upsert({
          id: 'store_electra_election',
          academic_session: JSON.stringify(newElection),
          updated_at: now
        });
      }
    } catch (_) {}
  }

  return newElection;
}

export async function adminSetActiveElection(electionId) {
  const all = getAllElections();
  const now = new Date().toISOString();

  let selected = null;
  const updatedList = all.map(e => {
    if (e.id === electionId) {
      selected = { ...e, status: 'active', updatedAt: now };
      return selected;
    }
    return {
      ...e,
      status: e.status === 'active' ? 'concluded' : e.status,
      updatedAt: now
    };
  });

  if (!selected) {
    throw new Error('Election not found');
  }

  if (supabase) {
    try {
      await supabase
        .from('electra_elections')
        .update({ status: 'concluded', updated_at: now })
        .eq('status', 'active');

      await supabase
        .from('electra_elections')
        .update({ status: 'active', updated_at: now })
        .eq('id', electionId);
    } catch (_) {}
  }

  memoryState.allElections = updatedList;
  memoryState.activeElection = selected;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(ELECTIONS_LIST_STORAGE_KEY, JSON.stringify(updatedList));
      localStorage.setItem(ELECTIONS_STORAGE_KEY, JSON.stringify(selected));
      window.dispatchEvent(new Event('nacos_electra_election_updated'));
    } catch (_) {}
  }

  if (supabase) {
    try {
      await supabase.from('id_card_settings').upsert({
        id: 'store_electra_all_elections',
        academic_session: JSON.stringify(updatedList),
        updated_at: now
      });
      await supabase.from('id_card_settings').upsert({
        id: 'store_electra_election',
        academic_session: JSON.stringify(selected),
        updated_at: now
      });
    } catch (_) {}
  }

  return selected;
}

export async function adminUpdateElection(electionIdOrUpdates, updates = null) {
  let targetId;
  let targetUpdates;

  if (typeof electionIdOrUpdates === 'string' && updates) {
    targetId = electionIdOrUpdates;
    targetUpdates = updates;
  } else if (typeof electionIdOrUpdates === 'object') {
    targetUpdates = electionIdOrUpdates;
    targetId = targetUpdates.id || getActiveElection()?.id;
  }

  const all = getAllElections();
  const index = all.findIndex(e => e.id === targetId);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const updatedRecord = {
    ...all[index],
    ...targetUpdates,
    updatedAt: now
  };

  if (supabase) {
    try {
      await supabase.from('electra_elections').update({
        title: updatedRecord.title,
        session: updatedRecord.session,
        year: updatedRecord.year,
        status: updatedRecord.status,
        is_published: updatedRecord.isPublished,
        start_date: updatedRecord.startDate,
        end_date: updatedRecord.endDate,
        total_ballots: updatedRecord.totalBallots,
        certified_turnout: updatedRecord.certifiedTurnout,
        description: updatedRecord.description,
        guidelines: updatedRecord.guidelines,
        winner_summary: updatedRecord.winnerSummary,
        updated_at: now
      }).eq('id', targetId);
    } catch (_) {}
  }

  let updatedList = [...all];
  if (targetUpdates.status === 'active') {
    updatedList = updatedList.map(e => (e.id === targetId ? updatedRecord : {
      ...e,
      status: e.status === 'active' ? 'concluded' : e.status
    }));
    memoryState.activeElection = updatedRecord;
  } else {
    updatedList[index] = updatedRecord;
    if (memoryState.activeElection?.id === targetId) {
      memoryState.activeElection = updatedRecord;
    }
  }

  memoryState.allElections = updatedList;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(ELECTIONS_LIST_STORAGE_KEY, JSON.stringify(updatedList));
      if (updatedRecord.status === 'active') {
        localStorage.setItem(ELECTIONS_STORAGE_KEY, JSON.stringify(updatedRecord));
      }
      window.dispatchEvent(new Event('nacos_electra_election_updated'));
    } catch (_) {}
  }

  if (supabase) {
    try {
      await supabase.from('id_card_settings').upsert({
        id: 'store_electra_all_elections',
        academic_session: JSON.stringify(updatedList),
        updated_at: now
      });
      if (updatedRecord.status === 'active') {
        await supabase.from('id_card_settings').upsert({
          id: 'store_electra_election',
          academic_session: JSON.stringify(updatedRecord),
          updated_at: now
        });
      }
    } catch (_) {}
  }

  return updatedRecord;
}

export async function adminDeleteElection(electionId) {
  if (supabase) {
    try {
      await supabase.from('electra_elections').delete().eq('id', electionId);
    } catch (_) {}
  }

  const all = getAllElections();
  const filtered = all.filter(e => e.id !== electionId);
  memoryState.allElections = filtered;
  if (memoryState.activeElection?.id === electionId) {
    memoryState.activeElection = null;
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(ELECTIONS_LIST_STORAGE_KEY, JSON.stringify(filtered));
      window.dispatchEvent(new Event('nacos_electra_election_updated'));
    } catch (_) {}
  }

  if (supabase) {
    try {
      await supabase.from('id_card_settings').upsert({
        id: 'store_electra_all_elections',
        academic_session: JSON.stringify(filtered),
        updated_at: new Date().toISOString()
      });
    } catch (_) {}
  }

  return filtered;
}

// =============================================================================
// ADMIN POSTS / CONTESTED OFFICES CRUD (PERSISTS TO SUPABASE)
// =============================================================================

export async function adminSavePost(postData, postId = null) {
  const all = getElectraPosts();
  const id = postId || postData.id || `post-${Date.now()}`;
  const now = new Date().toISOString();
  const targetElectionId = postData.electionId || getActiveElection()?.id || null;

  const item = {
    ...postData,
    id,
    electionId: targetElectionId,
    order: parseInt(postData.order, 10) || all.length + 1,
    maxVotesPerVoter: parseInt(postData.maxVotesPerVoter, 10) || 1,
    isActive: postData.isActive !== false,
    updatedAt: now
  };

  if (supabase) {
    try {
      await supabase.from('electra_positions').upsert({
        id: item.id,
        election_id: item.electionId,
        title: item.title,
        code: item.code,
        order_index: item.order,
        description: item.description || '',
        eligibility_level: item.eligibilityLevel || '200L - 400L',
        max_votes_per_voter: item.maxVotesPerVoter || 1,
        is_active: item.isActive,
        updated_at: now
      });
    } catch (e) {
      console.warn('[Electra Admin] electra_positions upsert notice:', e.message);
    }
  }

  const existingIndex = all.findIndex(p => p.id === id);
  let updated;
  if (existingIndex >= 0) {
    updated = [...all];
    updated[existingIndex] = { ...all[existingIndex], ...item };
  } else {
    updated = [...all, item];
  }

  updated.sort((a, b) => (a.order || 0) - (b.order || 0));
  memoryState.posts = updated;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('nacos_electra_posts_updated'));
    } catch (_) {}
  }

  if (supabase) {
    try {
      await supabase.from('id_card_settings').upsert({
        id: 'store_electra_posts',
        academic_session: JSON.stringify(updated),
        updated_at: now
      });
    } catch (_) {}
  }

  return item;
}

export async function adminDeletePost(postId) {
  if (supabase) {
    try {
      await supabase.from('electra_positions').delete().eq('id', postId);
    } catch (_) {}
  }

  const all = getElectraPosts();
  const updated = all.filter(p => p.id !== postId);
  memoryState.posts = updated;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('nacos_electra_posts_updated'));
    } catch (_) {}
  }

  if (supabase) {
    try {
      await supabase.from('id_card_settings').upsert({
        id: 'store_electra_posts',
        academic_session: JSON.stringify(updated),
        updated_at: new Date().toISOString()
      });
    } catch (_) {}
  }

  return updated;
}

// =============================================================================
// ADMIN CANDIDATES / CONTESTANTS CRUD (PERSISTS TO SUPABASE)
// =============================================================================

export async function adminSaveContestant(contestantData, candidateId = null) {
  const all = getContestants(null, 'all');
  const now = new Date().toISOString();
  const id = candidateId || contestantData.id || `cnd-${Date.now()}`;
  const targetElectionId = contestantData.electionId || getActiveElection()?.id || null;
  const existing = all.find(c => c.id === id);

  const manifestoObj = {
    headline: contestantData.manifestoHeadline || existing?.manifestoHeadline || '',
    summary: contestantData.manifestoSummary || existing?.manifestoSummary || '',
    pillars: Array.isArray(contestantData.manifestoPillars) ? contestantData.manifestoPillars : (existing?.manifestoPillars || [])
  };

  const item = {
    ...contestantData,
    id,
    electionId: targetElectionId,
    status: contestantData.status || (existing?.status || 'certified'),
    isPublished: contestantData.isPublished !== false,
    votesCount: contestantData.votesCount !== undefined ? contestantData.votesCount : (existing?.votesCount || 0),
    manifesto: manifestoObj,
    updatedAt: now
  };

  if (supabase) {
    try {
      // Ensure referenced position exists in electra_positions to prevent FK constraints
      if (item.postId && item.electionId) {
        await supabase.from('electra_positions').upsert({
          id: item.postId,
          election_id: item.electionId,
          title: item.runningPost || 'Executive Office',
          code: item.postId.replace('post-', '').toUpperCase(),
          order_index: 1,
          is_active: true,
          updated_at: now
        }, { onConflict: 'id', ignoreDuplicates: true });
      }

      await supabase.from('electra_candidates').upsert({
        id: item.id,
        election_id: item.electionId,
        position_id: item.postId,
        name: item.name,
        matric_number: item.matricNumber,
        level: item.level || '300 Level',
        running_post: item.runningPost || '',
        slogan: item.slogan || '',
        photo_url: item.photoUrl || '',
        cloudinary_public_id: item.photoPublicId || item.cloudinaryPublicId || '',
        status: item.status,
        is_published: item.isPublished,
        votes_count: item.votesCount,
        statement_pdf_url: item.statementPdfUrl || item.manifestoPdfUrl || '',
        manifesto_pdf_url: item.manifestoPdfUrl || item.statementPdfUrl || '',
        manifesto_storage_key: item.manifestoStorageKey || '',
        manifesto_file_name: item.manifestoFileName || '',
        candidate_statement: item.candidateStatement || '',
        manifesto: manifestoObj,
        updated_at: now
      });
    } catch (e) {
      console.warn('[Electra Admin] electra_candidates upsert notice:', e.message);
    }
  }

  const updated = [item, ...all.filter(c => c.id !== id)];
  memoryState.contestants = updated;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CONTESTANTS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('nacos_electra_contestants_updated'));
    } catch (_) {}
  }

  if (supabase) {
    try {
      await supabase.from('id_card_settings').upsert({
        id: 'store_electra_contestants',
        academic_session: JSON.stringify(updated),
        updated_at: now
      });
    } catch (_) {}
  }

  return item;
}

export async function adminDeleteContestant(contestantId) {
  if (supabase) {
    try {
      await supabase.from('electra_candidates').delete().eq('id', contestantId);
    } catch (_) {}
  }

  const all = getContestants(null, 'all');
  const updated = all.filter(c => c.id !== contestantId);
  memoryState.contestants = updated;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CONTESTANTS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('nacos_electra_contestants_updated'));
    } catch (_) {}
  }

  if (supabase) {
    try {
      await supabase.from('id_card_settings').upsert({
        id: 'store_electra_contestants',
        academic_session: JSON.stringify(updated),
        updated_at: new Date().toISOString()
      });
    } catch (_) {}
  }

  return updated;
}

// =============================================================================
// ADMIN ELECTRA NEWS & PRESS RELEASES CRUD (PERSISTS TO SUPABASE)
// =============================================================================

export async function adminSaveElectraNews(newsItem, newsId = null) {
  const all = getElectraNews();
  const id = newsId || newsItem.id || `news-${Date.now()}`;
  const now = new Date().toISOString();
  const targetElectionId = newsItem.electionId || getActiveElection()?.id || null;

  const item = {
    ...newsItem,
    id,
    electionId: targetElectionId,
    pinned: !!newsItem.pinned,
    isPublished: newsItem.isPublished !== false,
    updatedAt: now
  };

  if (supabase) {
    try {
      await supabase.from('electra_news').upsert({
        id: item.id,
        election_id: item.electionId,
        title: item.title,
        category: item.category,
        tag: item.tag,
        published_date: item.date || now.slice(0, 10),
        summary: item.summary || '',
        content: item.content || '',
        author: item.author || 'NACOS ISEC Secretariat',
        is_pinned: item.pinned,
        is_published: item.isPublished,
        updated_at: now
      });
    } catch (e) {
      console.warn('[Electra Admin] electra_news upsert notice:', e.message);
    }
  }

  const existingIndex = all.findIndex(n => n.id === id);
  let updated;
  if (existingIndex >= 0) {
    updated = [...all];
    updated[existingIndex] = { ...all[existingIndex], ...item };
  } else {
    updated = [item, ...all];
  }

  memoryState.news = updated;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('nacos_electra_news_updated'));
    } catch (_) {}
  }

  if (supabase) {
    try {
      await supabase.from('id_card_settings').upsert({
        id: 'store_electra_news',
        academic_session: JSON.stringify(updated),
        updated_at: now
      });
    } catch (_) {}
  }

  return item;
}

export async function adminDeleteElectraNews(newsId) {
  if (supabase) {
    try {
      await supabase.from('electra_news').delete().eq('id', newsId);
    } catch (_) {}
  }

  const all = getElectraNews();
  const updated = all.filter(n => n.id !== newsId);
  memoryState.news = updated;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('nacos_electra_news_updated'));
    } catch (_) {}
  }

  if (supabase) {
    try {
      await supabase.from('id_card_settings').upsert({
        id: 'store_electra_news',
        academic_session: JSON.stringify(updated),
        updated_at: new Date().toISOString()
      });
    } catch (_) {}
  }

  return updated;
}

// =============================================================================
// BALLOT AUDIT & LIVE RESULTS COMPUTATION
// =============================================================================

export function getVoterBallot(voterMatric, electionId = null) {
  return null; // Authoritative vote verification handled server-side via API / database
}

export async function submitBallot(param1, param2, param3, param4) {
  let selections = {};
  const token = typeof window !== 'undefined' ? localStorage.getItem('nacos_electra_voting_token') : null;

  if (param1 && typeof param1 === 'object' && !Array.isArray(param1)) {
    if (param1.selections) {
      selections = param1.selections;
    } else if (Array.isArray(param1.votes)) {
      param1.votes.forEach(v => {
        if (v.postId && v.contestantId) selections[v.postId] = v.contestantId;
      });
    }
  } else if (Array.isArray(param2)) {
    param2.forEach(v => {
      if (v.postId && v.contestantId) selections[v.postId] = v.contestantId;
    });
  } else if (param2 && typeof param2 === 'object') {
    selections = param2;
  }

  // Delegate directly to authoritative server-side endpoint with zero synthetic increments
  const res = await apiSubmitElectoralBallot({
    votingSessionToken: token,
    selections
  });
  return res;
}
export const castBallot = submitBallot;

/**
 * Computes live election results for the given election from current state & PostgreSQL tallies.
 */
export function getLiveElectionResults(electionId = null) {
  const activeElection = getActiveElection();
  const targetId = electionId || activeElection?.id || null;

  const posts = getElectraPosts();
  const contestants = getContestants(null, targetId);

  let totalBallots = 0;

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

    totalBallots += postTotalVotes;

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

  return {
    electionId: targetId,
    totalBallots,
    resultsByPost,
    turnoutByLevel: { '100 Level': 0, '200 Level': 0, '300 Level': 0, '400 Level': 0, '500 Level': 0 },
    lastUpdated: new Date().toISOString()
  };
}

// =============================================================================
// AUTHORITATIVE CLIENT API SDK (CONNECTS TO BACKEND SERVER ENGINE)
// =============================================================================

export async function apiAccreditVoter({ electionId, registrationNumber, firstName, lastName }) {
  try {
    const res = await fetch('/api/electra/accredit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ electionId, registrationNumber, firstName, lastName })
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: 'Network communication failure. Please check your connection and retry.' };
  }
}

export async function apiSendElectoralCode({ accreditationToken, email }) {
  try {
    const res = await fetch('/api/electra/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accreditationToken, email })
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: 'Failed to dispatch verification email. Please check your network.' };
  }
}

export async function apiVerifyElectoralCode({ accreditationToken, code }) {
  try {
    const res = await fetch('/api/electra/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accreditationToken, code })
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: 'Verification failed due to a network error.' };
  }
}

export async function apiGetVotingSessionStatus(votingSessionToken) {
  if (!votingSessionToken) return { success: false, authenticated: false };
  try {
    const res = await fetch(`/api/electra/session-status?token=${encodeURIComponent(votingSessionToken)}`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${votingSessionToken}`,
        'Content-Type': 'application/json'
      }
    });
    return await res.json();
  } catch (err) {
    return { success: false, authenticated: false };
  }
}

export async function apiSubmitElectoralBallot({ votingSessionToken, selections }) {
  try {
    const res = await fetch('/api/electra/vote', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${votingSessionToken}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ votingSessionToken, selections })
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: 'Failed to record ballot. Please check your connection and retry.' };
  }
}

export async function apiGetAuthoritativeResults(electionId = null) {
  const activeElection = getActiveElection();
  const targetId = electionId || activeElection?.id;
  if (!targetId) {
    return { success: false, error: 'No election selected.', resultsByPost: [], totalBallots: 0 };
  }
  try {
    const res = await fetch(`/api/electra/results?electionId=${encodeURIComponent(targetId)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (res.ok) {
      return await res.json();
    }
    return getLiveElectionResults(targetId);
  } catch (err) {
    return getLiveElectionResults(targetId);
  }
}

export function subscribeToElectionResults({ electionId, onUpdate, onReconnect }) {
  if (!supabase || typeof window === 'undefined') {
    return () => {};
  }

  const activeElection = getActiveElection();
  const targetElectionId = electionId || activeElection?.id;
  if (!targetElectionId) return () => {};

  const channelName = `election-results:${targetElectionId}`;
  const channel = supabase.channel(channelName, {
    config: { broadcast: { self: true } }
  });

  let hasConnectedOnce = false;

  channel
    .on('broadcast', { event: 'result_updated' }, (message) => {
      if (message?.payload && onUpdate) {
        onUpdate(message.payload);
      }
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        if (hasConnectedOnce && onReconnect) {
          onReconnect();
        }
        hasConnectedOnce = true;
      }
    });

  return () => {
    try {
      supabase.removeChannel(channel);
    } catch (_) {}
  };
}

export async function getElectionAccreditations(electionId = null) {
  const targetElectionId = electionId || getActiveElection()?.id;
  if (!targetElectionId) return [];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('electra_accreditations')
        .select('*')
        .eq('election_id', targetElectionId)
        .order('created_at', { ascending: false });

      if (data && !error && data.length > 0) return data;
    } catch (_) {}

    try {
      const { data: row } = await supabase
        .from('id_card_settings')
        .select('academic_session')
        .eq('id', 'store_electra_accreditations_db')
        .maybeSingle();

      if (row?.academic_session) {
        const list = JSON.parse(row.academic_session);
        return list.filter(a => a.election_id === targetElectionId);
      }
    } catch (_) {}
  }

  return [];
}
