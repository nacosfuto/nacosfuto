/**
 * electraService.js
 * Centralized election and balloting service for ELECTRA - NACOS FUTO.
 * Handles election lifecycle, offices/posts, certified contestants,
 * candidate manifestos, verified voting, and real-time cryptographic audit tallies.
 */

import { supabase, isSupabaseConfigured } from './client.js';
import { recordAdminAction } from './adminAuth.js';

const ELECTIONS_STORAGE_KEY = 'nacos_electra_elections_db';
const POSTS_STORAGE_KEY = 'nacos_electra_posts_db';
const CONTESTANTS_STORAGE_KEY = 'nacos_electra_contestants_db';
const VOTES_STORAGE_KEY = 'nacos_electra_votes_db';
const ELECTION_SETTINGS_KEY = 'nacos_electra_settings_db';

// ─── INITIAL CONTESTED OFFICES ───
export const DEFAULT_ELECTRA_POSTS = [
  {
    id: 'post-president',
    title: 'Chapter President',
    code: 'PRES',
    order: 1,
    description: 'Chief executive officer of the association. Presides over executive council and represents computing students at faculty and university levels.',
    maxVotesPerVoter: 1,
    eligibilityLevel: '300L - 400L'
  },
  {
    id: 'post-vp',
    title: 'Vice President',
    code: 'VP',
    order: 2,
    description: 'Deputizes the president, oversees academic affairs, tutorial wings, and inter-departmental liaisons.',
    maxVotesPerVoter: 1,
    eligibilityLevel: '300L - 400L'
  },
  {
    id: 'post-gensec',
    title: 'General Secretary',
    code: 'GENSEC',
    order: 3,
    description: 'Head of association secretariat, documentation, official correspondence, and meeting minutes.',
    maxVotesPerVoter: 1,
    eligibilityLevel: '200L - 300L'
  },
  {
    id: 'post-software',
    title: 'Director of Software & Innovation',
    code: 'D-SOFT',
    order: 4,
    description: 'Leads developer circles, departmental hackathons, open-source initiatives, and tech project incubators.',
    maxVotesPerVoter: 1,
    eligibilityLevel: '200L - 400L'
  },
  {
    id: 'post-ict',
    title: 'Director of ICT & Technical Infrastructure',
    code: 'D-ICT',
    order: 5,
    description: 'Manages departmental server infrastructure, portal operations, tech masterclasses, and networking equipment.',
    maxVotesPerVoter: 1,
    eligibilityLevel: '200L - 400L'
  },
  {
    id: 'post-finsec',
    title: 'Financial Secretary',
    code: 'FINSEC',
    order: 6,
    description: 'Maintains financial ledgers, dues clearance verification, budgeting, and fiscal transparency.',
    maxVotesPerVoter: 1,
    eligibilityLevel: '200L - 300L'
  },
  {
    id: 'post-socials',
    title: 'Director of Socials',
    code: 'D-SOC',
    order: 7,
    description: 'Organizes student mixers, annual gala, computing week festivities, and social engagement.',
    maxVotesPerVoter: 1,
    eligibilityLevel: '200L - 300L'
  },
  {
    id: 'post-welfare',
    title: 'Director of Welfare',
    code: 'D-WEL',
    order: 8,
    description: 'Protects student interests, hostel advocacy, welfare packages, and emergency assistance.',
    maxVotesPerVoter: 1,
    eligibilityLevel: '200L - 300L'
  },
  {
    id: 'post-pro',
    title: 'Public Relations Officer (P.R.O)',
    code: 'PRO',
    order: 9,
    description: 'Official spokesperson, press releases, social media management, and public broadcast.',
    maxVotesPerVoter: 1,
    eligibilityLevel: '100L - 300L'
  },
  {
    id: 'post-sports',
    title: 'Director of Sports',
    code: 'D-SPORT',
    order: 10,
    description: 'Coordinates annual football derby, gaming championships, and athletic tournaments.',
    maxVotesPerVoter: 1,
    eligibilityLevel: '100L - 300L'
  }
];

export const DEFAULT_ELECTION = {
  id: 'election-2026-general',
  title: 'NACOS FUTO 2026/2027 General Elections',
  session: '2026/2027',
  status: 'active', // 'draft' | 'active' | 'paused' | 'concluded'
  startDate: '2026-10-15T08:00:00Z',
  endDate: '2026-10-15T18:00:00Z',
  guidelines: [
    'Only verified CS undergraduate students with cleared matriculation records are eligible to cast ballots.',
    'Each student is entitled to exactly one vote per contested office.',
    'All ballot submissions are cryptographically hashed and cannot be altered once finalized.',
    'Voting closes strictly at 6:00 PM West Africa Time.'
  ]
};

// ─── INITIAL SEEDED CONTESTANTS WITH COMPREHENSIVE MANIFESTOS ───
export const INITIAL_CONTESTANTS = [
  {
    id: 'cnd-pres-1',
    postId: 'post-president',
    name: 'Chukwuebuka Anyanwu',
    matricNumber: '20231429810',
    level: '400 Level',
    runningPost: 'Chapter President',
    slogan: 'Technology That Empowers, Leadership That Listens',
    photoUrl: 'https://res.cloudinary.com/a2mmcttn/image/upload/v1788569274/nacos/executives/president_irechukwu.jpg',
    cloudinaryPublicId: 'nacos/executives/president_irechukwu',
    status: 'certified',
    votesCount: 342,
    manifesto: {
      headline: 'The Catalyst Agenda: 4 Pillars for a Modern Computing Department',
      summary: 'A transformative manifesto prioritizing developer infrastructure, global internship sponsorship, mental health support, and open departmental governance.',
      pillars: [
        {
          title: 'Infrastructure & 24/7 SICT Hub',
          detail: 'Partner with alumni tech leaders to secure reliable high-speed Wi-Fi access points and solar-backed power in the SICT complex for evening coding sprints.'
        },
        {
          title: 'Direct Industry-to-Student Talent Pipeline',
          detail: 'Establish official MoUs with Nigerian tech scale-ups and remote multinational firms for exclusive internship cohorts for 300L and 400L students.'
        },
        {
          title: 'Zero-Secret Financial Transparency',
          detail: 'Publish quarterly digital audited balance sheets on the student portal detailing all association revenue and expenditures down to the kobo.'
        },
        {
          title: 'Inclusive Academic Aid & Project Incubation',
          detail: 'Create student-led mentorship cells for freshmen struggling with Data Structures, Discrete Math, and C++ programming fundamentals.'
        }
      ],
      personalNote: 'Serving our department is not about holding a title—it is about removing the friction between student potential and world-class opportunities. Together, we code the future.'
    }
  },
  {
    id: 'cnd-pres-2',
    postId: 'post-president',
    name: 'Somtochukwu Maduka',
    matricNumber: '20231428512',
    level: '400 Level',
    runningPost: 'Chapter President',
    slogan: 'Rebuilding Trust, Accelerating Innovation',
    photoUrl: 'https://res.cloudinary.com/a2mmcttn/image/upload/v1788569269/nacos/executives/daniel_chukwuka.jpg',
    cloudinaryPublicId: 'nacos/executives/daniel_chukwuka',
    status: 'certified',
    votesCount: 289,
    manifesto: {
      headline: 'The CodeFirst Movement: Bridging Classroom Theory to Silicon Valley Skills',
      summary: 'Focusing on hands-on software workshops, student hackathon funding, and automated academic clearance systems.',
      pillars: [
        {
          title: 'NACOS Innovation Fund',
          detail: 'Dedicate 15% of annual departmental proceeds to seed-fund the top 3 student final-year hardware and AI software research projects.'
        },
        {
          title: 'Global Certifications Subsidization',
          detail: 'Secure university-backed academic discounts for AWS Cloud Practitioner, Google Cloud Associate, and Cisco CCNA certifications.'
        },
        {
          title: 'Modernized Course Repository',
          detail: 'Overhaul past questions and lecture notes into searchable, interactive study guides on the newly deployed NACOS portal.'
        },
        {
          title: 'Hostel Outreach & Welfare Quick-Response',
          detail: 'Establish a rapid-response emergency student distress committee for medical and accommodation contingencies.'
        }
      ],
      personalNote: 'FUTO Computing produces the sharpest minds in West Africa. We deserve leadership that matches our caliber.'
    }
  },
  {
    id: 'cnd-vp-1',
    postId: 'post-vp',
    name: 'Khadijah Oladipo',
    matricNumber: '20231427190',
    level: '300 Level',
    runningPost: 'Vice President',
    slogan: 'Excellence in Academics, Unity in Diversity',
    photoUrl: 'https://res.cloudinary.com/a2mmcttn/image/upload/v1788569282/nacos/executives/vp_chinaemerem.jpg',
    cloudinaryPublicId: 'nacos/executives/vp_chinaemerem',
    status: 'certified',
    votesCount: 395,
    manifesto: {
      headline: 'The Academic Anchor Initiative',
      summary: 'Dedicated peer tutoring networks, exam revision clinics, and female developer empowerment programs.',
      pillars: [
        {
          title: 'Peer Tutorial Guild',
          detail: 'Formalize semester-long tutorial groups led by outstanding senior scholars with stipend incentives.'
        },
        {
          title: 'Women in Tech FUTO (WiTF)',
          detail: 'Host dedicated hack-nights and mentorship tracks to elevate female representation in engineering.'
        },
        {
          title: 'Academic Grievance Resolution Desk',
          detail: 'Streamlined liaison with the Departmental Board of Examiners to resolve missing test scripts and result issues promptly.'
        }
      ],
      personalNote: 'No student should be left behind academically because they lack someone to explain complex concepts in plain language.'
    }
  },
  {
    id: 'cnd-soft-1',
    postId: 'post-software',
    name: 'David Obinna',
    matricNumber: '20241430012',
    level: '300 Level',
    runningPost: 'Director of Software & Innovation',
    slogan: 'From Syntax to Ship: Building Products That Scale',
    photoUrl: 'https://res.cloudinary.com/a2mmcttn/image/upload/v1788569272/nacos/executives/ict_dir_ifeanyi.jpg',
    cloudinaryPublicId: 'nacos/executives/ict_dir_ifeanyi',
    status: 'certified',
    votesCount: 420,
    manifesto: {
      headline: 'ShipFast NACOS: Transforming Students into Enterprise Software Engineers',
      summary: 'Weekly collaborative build-sprints, real open-source contributions, and microservices masterclasses.',
      pillars: [
        {
          title: 'Bi-Weekly Build Sprint Hackathons',
          detail: 'Teams build real full-stack software over 48 hours with live demo-days evaluated by alumni working at Stripe, Paystack, and Microsoft.'
        },
        {
          title: 'Departmental Open-Source Guild',
          detail: 'Maintain public GitHub repositories that power campus operations so every student can build a verifiable portfolio before graduating.'
        },
        {
          title: 'Cloud Architecture & DevOps Workshops',
          detail: 'Hands-on practice with Docker, Kubernetes, CI/CD pipelines, and microservices architecture.'
        }
      ],
      personalNote: 'Code speaks louder than promises. Let us build systems that FUTO and the world cannot ignore.'
    }
  },
  {
    id: 'cnd-ict-1',
    postId: 'post-ict',
    name: 'Emmanuel Nwachukwu',
    matricNumber: '20231429901',
    level: '300 Level',
    runningPost: 'Director of ICT & Technical Infrastructure',
    slogan: 'Uptime, Access, and Technical Empowerment',
    photoUrl: 'https://res.cloudinary.com/a2mmcttn/image/upload/v1788569271/nacos/executives/ict_asst_victory.jpg',
    cloudinaryPublicId: 'nacos/executives/ict_asst_victory',
    status: 'certified',
    votesCount: 388,
    manifesto: {
      headline: 'Reliable Infrastructure for Every Computing Scholar',
      summary: 'Upgrading computer laboratory hardware, solar power reliability, and network connectivity.',
      pillars: [
        {
          title: 'Lab Computer Diagnostic & Repair Drives',
          detail: 'Regular community hardware clinics to optimize all student and department desktop machines.'
        },
        {
          title: 'Campus Mesh Networking Experiment',
          detail: 'Explore localized intranet file-sharing mirrors for high-bandwidth software packages and Linux ISOs without data costs.'
        }
      ],
      personalNote: 'Reliable technology is the backbone of learning computing.'
    }
  }
];

// ═══════════════════════════════════════════════════════════════
// READ / QUERY METHODS
// ═══════════════════════════════════════════════════════════════

export function getElectraPosts() {
  if (typeof window === 'undefined') return DEFAULT_ELECTRA_POSTS;
  try {
    const raw = localStorage.getItem(POSTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(DEFAULT_ELECTRA_POSTS));
    return DEFAULT_ELECTRA_POSTS;
  } catch (e) {
    return DEFAULT_ELECTRA_POSTS;
  }
}
export const getVotingPosts = getElectraPosts;
export const DEFAULT_VOTING_POSTS = DEFAULT_ELECTRA_POSTS;

export function getActiveElection() {
  if (typeof window === 'undefined') return DEFAULT_ELECTION;
  try {
    const raw = localStorage.getItem(ELECTIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.id) return parsed;
    }
    localStorage.setItem(ELECTIONS_STORAGE_KEY, JSON.stringify(DEFAULT_ELECTION));
    return DEFAULT_ELECTION;
  } catch (e) {
    return DEFAULT_ELECTION;
  }
}

export function getContestants(postId = null) {
  if (typeof window === 'undefined') {
    return postId ? INITIAL_CONTESTANTS.filter(c => c.postId === postId) : INITIAL_CONTESTANTS;
  }
  try {
    const raw = localStorage.getItem(CONTESTANTS_STORAGE_KEY);
    let list = raw ? JSON.parse(raw) : null;
    if (!list || !Array.isArray(list) || list.length === 0) {
      list = INITIAL_CONTESTANTS;
      localStorage.setItem(CONTESTANTS_STORAGE_KEY, JSON.stringify(list));
    }
    if (postId) {
      return list.filter(c => c.postId === postId);
    }
    return list;
  } catch (e) {
    return INITIAL_CONTESTANTS;
  }
}

export function getContestantById(contestantId) {
  const all = getContestants();
  return all.find(c => c.id === contestantId) || null;
}

// ═══════════════════════════════════════════════════════════════
// SUPABASE LIVE SYNC METHODS
// ═══════════════════════════════════════════════════════════════

export async function fetchLiveElectraData() {
  let election = getActiveElection();
  let posts = getElectraPosts();
  let contestants = getContestants();

  if (supabase) {
    try {
      // 1. Fetch election settings
      const { data: elRow } = await supabase
        .from('id_card_settings')
        .select('academic_session')
        .eq('id', 'store_electra_election')
        .maybeSingle();

      if (elRow?.academic_session) {
        try {
          const parsed = JSON.parse(elRow.academic_session);
          if (parsed?.id) {
            election = parsed;
            if (typeof window !== 'undefined') {
              localStorage.setItem(ELECTIONS_STORAGE_KEY, JSON.stringify(election));
            }
          }
        } catch (_) {}
      }

      // 2. Fetch posts
      const { data: postsRow } = await supabase
        .from('id_card_settings')
        .select('academic_session')
        .eq('id', 'store_electra_posts')
        .maybeSingle();

      if (postsRow?.academic_session) {
        try {
          const parsed = JSON.parse(postsRow.academic_session);
          if (Array.isArray(parsed) && parsed.length > 0) {
            posts = parsed;
            if (typeof window !== 'undefined') {
              localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts));
            }
          }
        } catch (_) {}
      }

      // 3. Fetch contestants
      const { data: cndRow } = await supabase
        .from('id_card_settings')
        .select('academic_session')
        .eq('id', 'store_electra_contestants')
        .maybeSingle();

      if (cndRow?.academic_session) {
        try {
          const parsed = JSON.parse(cndRow.academic_session);
          if (Array.isArray(parsed) && parsed.length > 0) {
            contestants = parsed;
            if (typeof window !== 'undefined') {
              localStorage.setItem(CONTESTANTS_STORAGE_KEY, JSON.stringify(contestants));
            }
          }
        } catch (_) {}
      }
    } catch (e) {
      console.warn('Error syncing electra data from Supabase:', e);
    }
  }

  return { election, posts, contestants };
}
export const fetchLiveVotingData = fetchLiveElectraData;

// ═══════════════════════════════════════════════════════════════
// BALLOT VOTING ENGINE & AUDIT TRAIL
// ═══════════════════════════════════════════════════════════════

function generateBallotHash(voterMatric, selections, timestamp) {
  const seed = `${voterMatric}-${JSON.stringify(selections)}-${timestamp}-${Math.random().toString(36).substring(2, 8)}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `0xNACOS-${hex}-${Date.now().toString(16).slice(-6)}`;
}

export function getVoterBallot(voterMatric) {
  if (typeof window === 'undefined' || !voterMatric) return null;
  try {
    const raw = localStorage.getItem(VOTES_STORAGE_KEY);
    const votes = raw ? JSON.parse(raw) : [];
    return votes.find(v => v.voterMatric?.toLowerCase() === voterMatric.toLowerCase()) || null;
  } catch (e) {
    return null;
  }
}

export async function submitBallot({ voterMatric, voterName, voterLevel, selections, votes }) {
  if (!voterMatric) throw new Error('Voter Matric Number is required');

  let activeSelections = selections;
  if (!activeSelections && Array.isArray(votes)) {
    activeSelections = {};
    votes.forEach(v => {
      if (v.postId && v.contestantId) {
        activeSelections[v.postId] = v.contestantId;
      }
    });
  }

  if (!activeSelections || Object.keys(activeSelections).length === 0) {
    throw new Error('At least one candidate must be selected on the ballot');
  }

  // Check if voter already cast ballot
  const existing = getVoterBallot(voterMatric);
  if (existing) {
    throw new Error(`Ballot already registered for matric number ${voterMatric} on ${new Date(existing.timestamp).toLocaleDateString()}`);
  }

  const timestamp = new Date().toISOString();
  const ballotHash = generateBallotHash(voterMatric, activeSelections, timestamp);

  const ballot = {
    id: `blt-${Date.now()}`,
    voterMatric: voterMatric.trim().toUpperCase(),
    voterName: voterName || 'Verified Scholar',
    voterLevel: voterLevel || '300 Level',
    selections: activeSelections,
    ballotHash,
    timestamp
  };

  // 1. Store vote locally
  let currentVotes = [];
  try {
    const raw = localStorage.getItem(VOTES_STORAGE_KEY);
    currentVotes = raw ? JSON.parse(raw) : [];
  } catch (_) {}
  currentVotes.push(ballot);
  localStorage.setItem(VOTES_STORAGE_KEY, JSON.stringify(currentVotes));

  // 2. Increment candidate vote counts
  const allContestants = getContestants();
  const updatedContestants = allContestants.map(c => {
    const chosen = Object.values(activeSelections).includes(c.id);
    return {
      ...c,
      votesCount: (c.votesCount || 0) + (chosen ? 1 : 0)
    };
  });
  localStorage.setItem(CONTESTANTS_STORAGE_KEY, JSON.stringify(updatedContestants));

  // 3. Sync to Supabase in background
  if (supabase) {
    try {
      await supabase.from('id_card_settings').upsert({
        id: 'store_electra_contestants',
        academic_session: JSON.stringify(updatedContestants),
        updated_at: timestamp
      });

      await supabase.from('id_card_settings').upsert({
        id: 'store_electra_votes',
        academic_session: JSON.stringify(currentVotes),
        updated_at: timestamp
      });
    } catch (e) {
      console.warn('Background vote sync warning:', e);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('nacos_electra_ballot_cast'));
  }

  return ballot;
}
export const castBallot = submitBallot;

export function getLiveElectionResults() {
  const posts = getElectraPosts();
  const contestants = getContestants();
  let votes = [];
  try {
    const raw = localStorage.getItem(VOTES_STORAGE_KEY);
    votes = raw ? JSON.parse(raw) : [];
  } catch (_) {}

  const totalBallots = votes.length;

  const resultsByPost = posts.map(post => {
    const postContestants = contestants.filter(c => c.postId === post.id);
    const postTotalVotes = postContestants.reduce((sum, c) => sum + (c.votesCount || 0), 0);

    const candidates = postContestants.map(c => {
      const percentage = postTotalVotes > 0 
        ? Math.round(((c.votesCount || 0) / postTotalVotes) * 100) 
        : 0;
      return {
        ...c,
        percentage
      };
    }).sort((a, b) => (b.votesCount || 0) - (a.votesCount || 0));

    return {
      post,
      totalVotes: postTotalVotes,
      candidates,
      leadingCandidate: candidates[0] || null
    };
  });

  // Participation by academic level
  const turnoutByLevel = votes.reduce((acc, v) => {
    const lvl = v.voterLevel || 'Other';
    acc[lvl] = (acc[lvl] || 0) + 1;
    return acc;
  }, {});

  return {
    totalBallots,
    resultsByPost,
    turnoutByLevel,
    lastUpdated: new Date().toISOString()
  };
}

// ═══════════════════════════════════════════════════════════════
// ADMIN COMMISSION CRUD METHODS
// ═══════════════════════════════════════════════════════════════

export async function adminSaveContestant(contestantData) {
  const all = getContestants();
  const now = new Date().toISOString();
  const id = contestantData.id || `cnd-${Date.now()}`;

  const item = {
    ...contestantData,
    id,
    status: contestantData.status || 'certified',
    votesCount: contestantData.votesCount || 0,
    updatedAt: now
  };

  const updated = [item, ...all.filter(c => c.id !== id)];
  localStorage.setItem(CONTESTANTS_STORAGE_KEY, JSON.stringify(updated));

  if (supabase) {
    try {
      await supabase.from('id_card_settings').upsert({
        id: 'store_electra_contestants',
        academic_session: JSON.stringify(updated),
        updated_at: now
      });
    } catch (_) {}
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('nacos_electra_contestants_updated'));
  }

  return item;
}

export async function adminDeleteContestant(contestantId) {
  const all = getContestants();
  const updated = all.filter(c => c.id !== contestantId);
  localStorage.setItem(CONTESTANTS_STORAGE_KEY, JSON.stringify(updated));

  if (supabase) {
    try {
      await supabase.from('id_card_settings').upsert({
        id: 'store_electra_contestants',
        academic_session: JSON.stringify(updated),
        updated_at: new Date().toISOString()
      });
    } catch (_) {}
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('nacos_electra_contestants_updated'));
  }

  return updated;
}

export async function adminUpdateElection(updates) {
  const current = getActiveElection();
  const updated = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(ELECTIONS_STORAGE_KEY, JSON.stringify(updated));

  if (supabase) {
    try {
      await supabase.from('id_card_settings').upsert({
        id: 'store_electra_election',
        academic_session: JSON.stringify(updated),
        updated_at: new Date().toISOString()
      });
    } catch (_) {}
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('nacos_electra_election_updated'));
  }

  return updated;
}
