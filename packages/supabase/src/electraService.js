/**
 * electraService.js
 * Centralized election and balloting service for ELECTRA - NACOS FUTO.
 * Handles election lifecycle across academic years (year-by-year management),
 * certified contestants, candidate statements & manifestos, verified voting,
 * and real-time cryptographic audit tallies.
 * Front-end users strictly interact with the currently ACTIVE election,
 * while election administrators can review all past and active elections.
 */

import { supabase, isSupabaseConfigured } from './client.js';

const ELECTIONS_LIST_STORAGE_KEY = 'nacos_electra_all_elections_db';
const ELECTIONS_STORAGE_KEY = 'nacos_electra_elections_db';
const POSTS_STORAGE_KEY = 'nacos_electra_posts_db';
const CONTESTANTS_STORAGE_KEY = 'nacos_electra_contestants_db';
const VOTES_STORAGE_KEY = 'nacos_electra_votes_db';
const NEWS_STORAGE_KEY = 'nacos_electra_news_db';

export const DEFAULT_ELECTRA_NEWS = [
  {
    id: 'news-1',
    title: 'Official Notice: Accreditation and Balloting Procedures for 2026 General Elections',
    category: 'Electoral Notice',
    tag: 'Official',
    date: '2026-10-08',
    summary: 'NACOS ISEC has officially opened voter accreditation. All enrolled computer science students are eligible to participate using their matriculation number.',
    content: 'NACOS ISEC wishes to notify all enrolled undergraduate and postgraduate students in the Department of Computer Science, Federal University of Technology, Owerri (FUTO), that official accreditation for the 2026 General Elections is now live.\n\nVoting takes place securely online via the ELECTRA portal, as well as in-person at the Computer Science Departmental Complex. Electors can participate once across all contested positions.',
    author: 'NACOS ISEC Secretariat',
    pinned: true
  },
  {
    id: 'news-2',
    title: 'Designated In-Person Polling Station: Department of Computer Science, FUTO',
    category: 'Polling Station',
    tag: 'Important',
    date: '2026-10-07',
    summary: 'Physical voting terminals and in-person accreditation desks have been designated at the Computer Science Building for students who wish to vote on campus.',
    content: 'Students wishing to vote in person are advised to report to the Department of Computer Science at the Federal University of Technology, Owerri. Certified NACOS ISEC election officers and biometric verification stations will be available on election day between 08:00 AM and 04:00 PM WAT.',
    author: 'Electoral Committee Chairman',
    pinned: false
  },
  {
    id: 'news-3',
    title: 'Publication of Certified Candidate Manifestos and Policy Frameworks',
    category: 'Press Release',
    tag: 'General',
    date: '2026-10-06',
    summary: 'Official campaign manifestos for all cleared candidates contesting executive positions are now publicly accessible for student review on the portal.',
    content: 'In line with the electoral guidelines promoting transparency and issue-based voting, the Electoral Commission has published the verified policy documents and manifestos of all candidates standing for election. Electors are encouraged to review these manifestos prior to casting their votes.',
    author: 'Public Relations Officer',
    pinned: false
  }
];

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

// ─── YEAR-BY-YEAR ELECTIONS REPOSITORY ───
export const DEFAULT_ELECTIONS = [
  {
    id: 'election-2026-general',
    title: 'NACOS FUTO 2026/2027 General Elections',
    session: '2026/2027',
    year: 2026,
    status: 'active', // 'active' | 'upcoming' | 'concluded' | 'archived'
    startDate: '2026-10-15T08:00:00Z',
    endDate: '2026-10-15T18:00:00Z',
    totalBallots: 1420,
    certifiedTurnout: 'Pending Live Polls',
    description: 'Annual election for the executive officers of the Nigeria Association of Computing Students (NACOS), FUTO Chapter.',
    guidelines: [
      'Only verified CS undergraduate students with cleared matriculation records are eligible to cast ballots.',
      'Each student is entitled to exactly one vote per contested office.',
      'All ballot submissions are cryptographically hashed and cannot be altered once finalized.',
      'Voting closes strictly at 6:00 PM West Africa Time.'
    ]
  },
  {
    id: 'election-2025-general',
    title: 'NACOS FUTO 2025/2026 General Elections',
    session: '2025/2026',
    year: 2025,
    status: 'concluded',
    startDate: '2025-10-18T08:00:00Z',
    endDate: '2025-10-18T18:00:00Z',
    totalBallots: 1184,
    certifiedTurnout: '88.2%',
    description: 'Concluded democratic election establishing the 2025/2026 NACOS executive administration.',
    winnerSummary: 'Irechukwu Emmanuel elected Chapter President with 54.2% of accredited votes.'
  },
  {
    id: 'election-2024-general',
    title: 'NACOS FUTO 2024/2025 General Elections',
    session: '2024/2025',
    year: 2024,
    status: 'concluded',
    startDate: '2024-10-12T08:00:00Z',
    endDate: '2024-10-12T18:00:00Z',
    totalBallots: 968,
    certifiedTurnout: '84.6%',
    description: 'Historical election session establishing the 2024/2025 NACOS executive administration.',
    winnerSummary: 'Osuagwu Nestor elected Chapter President with 61.8% of accredited votes.'
  }
];

export const DEFAULT_ELECTION = DEFAULT_ELECTIONS[0];

// ─── INITIAL SEEDED CONTESTANTS WITH COMPREHENSIVE STATEMENTS & MANIFESTOS ───
export const INITIAL_CONTESTANTS = [
  {
    id: 'cnd-pres-1',
    electionId: 'election-2026-general',
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
    statementPdfUrl: 'https://nacosfuto.org/docs/statements/chukwuebuka_anyanwu_pres_2026.pdf',
    candidateStatement: `I, Chukwuebuka Anyanwu, hereby declare my candidacy for the office of Chapter President of NACOS FUTO for the 2026/2027 academic session.

Our department stands at a historic juncture where computing education must match global industry demands. If elected, my administration will execute a four-pillar transformation focusing on 24/7 developer infrastructure in the SICT complex, guaranteed internship pipelines with Nigerian tech scale-ups, total financial audit transparency, and academic peer mentorship for struggling undergraduates.

I pledge to represent all computing students with unyielding integrity, energy, and dedication.`,
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
    electionId: 'election-2026-general',
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
    statementPdfUrl: 'https://nacosfuto.org/docs/statements/somtochukwu_maduka_pres_2026.pdf',
    candidateStatement: `Fellow computing scholars, my name is Somtochukwu Maduka. I am stepping forward to run for Chapter President because I believe in the extraordinary latent potential within our halls.

My focus is pragmatic: equipping every student with industry certifications, providing seed grants for final year tech projects, upgrading our departmental course repositories, and deploying an automated welfare emergency desk.`,
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
    electionId: 'election-2026-general',
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
    statementPdfUrl: 'https://nacosfuto.org/docs/statements/khadijah_oladipo_vp_2026.pdf',
    candidateStatement: `I am Khadijah Oladipo, offering my service as Vice President.

My primary mission is academic advocacy: establishing structured peer-tutorial guilds across 100L through 300L, championing female participation in engineering through Women in Tech FUTO, and creating a responsive Academic Grievance Desk to liaise directly with the Board of Examiners.`,
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
    electionId: 'election-2026-general',
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
    statementPdfUrl: 'https://nacosfuto.org/docs/statements/david_obinna_dsoft_2026.pdf',
    candidateStatement: `My name is David Obinna. As Director of Software, I will turn our department into a continuous product incubator. We will build, ship, and deploy solutions that solve genuine campus challenges and elevate student portfolios to international standards.`,
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
    electionId: 'election-2026-general',
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
    statementPdfUrl: 'https://nacosfuto.org/docs/statements/emmanuel_nwachukwu_dict_2026.pdf',
    candidateStatement: `I, Emmanuel Nwachukwu, stand for reliable hardware, fast intranet mirrors, and zero student downtime in our computer laboratories. Reliable computing infrastructure is the baseline for modern academic growth.`,
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
// ELECTIONS MANAGEMENT (YEAR-BY-YEAR)
// ═══════════════════════════════════════════════════════════════

/**
 * Get all elections across years (for Admin review and historical tracking)
 */
export function getAllElections() {
  if (typeof window === 'undefined') return DEFAULT_ELECTIONS;
  try {
    const raw = localStorage.getItem(ELECTIONS_LIST_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    localStorage.setItem(ELECTIONS_LIST_STORAGE_KEY, JSON.stringify(DEFAULT_ELECTIONS));
    return DEFAULT_ELECTIONS;
  } catch (e) {
    return DEFAULT_ELECTIONS;
  }
}

/**
 * Get the currently active election.
 * Front-end voters communicate STRICTLY with this active election!
 */
export function getActiveElection() {
  const all = getAllElections();
  const active = all.find(e => e.status === 'active');
  if (active) return active;
  return all[0] || DEFAULT_ELECTION;
}

/**
 * Admin: Create a new election year-by-year
 */
export async function adminCreateElection(electionData) {
  const all = getAllElections();
  const id = electionData.id || `election-${electionData.year || new Date().getFullYear()}-general`;
  const isSetToActive = electionData.status === 'active';

  const newElection = {
    ...electionData,
    id,
    year: parseInt(electionData.year, 10) || new Date().getFullYear(),
    status: isSetToActive ? 'active' : (electionData.status || 'upcoming'),
    totalBallots: 0,
    certifiedTurnout: 'Not Started',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // If newly created election is set to active, conclude previous active elections
  let updatedList = all;
  if (isSetToActive) {
    updatedList = all.map(e => ({
      ...e,
      status: e.status === 'active' ? 'concluded' : e.status
    }));
  }

  updatedList = [newElection, ...updatedList.filter(e => e.id !== id)];
  // Sort by year descending
  updatedList.sort((a, b) => (b.year || 0) - (a.year || 0));

  localStorage.setItem(ELECTIONS_LIST_STORAGE_KEY, JSON.stringify(updatedList));
  if (isSetToActive) {
    localStorage.setItem(ELECTIONS_STORAGE_KEY, JSON.stringify(newElection));
  }

  // Live Supabase Sync
  if (supabase) {
    try {
      await supabase.from('id_card_settings').upsert({
        id: 'store_electra_all_elections',
        academic_session: JSON.stringify(updatedList),
        updated_at: new Date().toISOString()
      });
      if (isSetToActive) {
        await supabase.from('id_card_settings').upsert({
          id: 'store_electra_election',
          academic_session: JSON.stringify(newElection),
          updated_at: new Date().toISOString()
        });
      }
    } catch (_) {}
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('nacos_electra_election_updated'));
  }

  return newElection;
}

/**
 * Admin: Set an election as the active election for front-end voting
 */
export async function adminSetActiveElection(electionId) {
  const all = getAllElections();
  let selected = null;

  const updatedList = all.map(e => {
    if (e.id === electionId) {
      selected = { ...e, status: 'active', updatedAt: new Date().toISOString() };
      return selected;
    }
    return {
      ...e,
      status: e.status === 'active' ? 'concluded' : e.status,
      updatedAt: new Date().toISOString()
    };
  });

  if (!selected) {
    throw new Error('Election not found');
  }

  localStorage.setItem(ELECTIONS_LIST_STORAGE_KEY, JSON.stringify(updatedList));
  localStorage.setItem(ELECTIONS_STORAGE_KEY, JSON.stringify(selected));

  if (supabase) {
    try {
      await supabase.from('id_card_settings').upsert({
        id: 'store_electra_all_elections',
        academic_session: JSON.stringify(updatedList),
        updated_at: new Date().toISOString()
      });
      await supabase.from('id_card_settings').upsert({
        id: 'store_electra_election',
        academic_session: JSON.stringify(selected),
        updated_at: new Date().toISOString()
      });
    } catch (_) {}
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('nacos_electra_election_updated'));
  }

  return selected;
}

/**
 * Admin: Update an existing election
 */
export async function adminUpdateElection(electionIdOrUpdates, updates = null) {
  let targetId;
  let targetUpdates;

  if (typeof electionIdOrUpdates === 'string' && updates) {
    targetId = electionIdOrUpdates;
    targetUpdates = updates;
  } else if (typeof electionIdOrUpdates === 'object') {
    targetUpdates = electionIdOrUpdates;
    targetId = targetUpdates.id || getActiveElection().id;
  }

  const all = getAllElections();
  const index = all.findIndex(e => e.id === targetId);
  if (index === -1) return getActiveElection();

  const now = new Date().toISOString();
  let updatedRecord = {
    ...all[index],
    ...targetUpdates,
    updatedAt: now
  };

  let updatedList = [...all];
  if (targetUpdates.status === 'active') {
    updatedList = updatedList.map(e => (e.id === targetId ? updatedRecord : {
      ...e,
      status: e.status === 'active' ? 'concluded' : e.status
    }));
  } else {
    updatedList[index] = updatedRecord;
  }

  localStorage.setItem(ELECTIONS_LIST_STORAGE_KEY, JSON.stringify(updatedList));
  if (updatedRecord.status === 'active') {
    localStorage.setItem(ELECTIONS_STORAGE_KEY, JSON.stringify(updatedRecord));
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

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('nacos_electra_election_updated'));
  }

  return updatedRecord;
}

/**
 * Admin: Delete an election
 */
export async function adminDeleteElection(electionId) {
  const all = getAllElections();
  const filtered = all.filter(e => e.id !== electionId);
  localStorage.setItem(ELECTIONS_LIST_STORAGE_KEY, JSON.stringify(filtered));

  if (supabase) {
    try {
      await supabase.from('id_card_settings').upsert({
        id: 'store_electra_all_elections',
        academic_session: JSON.stringify(filtered),
        updated_at: new Date().toISOString()
      });
    } catch (_) {}
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('nacos_electra_election_updated'));
  }

  return filtered;
}

// ═══════════════════════════════════════════════════════════════
// POSTS & CONTESTANTS QUERY METHODS
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

/**
 * Retrieve contestants.
 * If electionId is passed, filters by that election; otherwise defaults to active election contestants.
 */
export function getContestants(postId = null, electionId = null) {
  const activeElection = getActiveElection();
  const targetElectionId = electionId || activeElection.id;

  let list = INITIAL_CONTESTANTS;
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(CONTESTANTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed;
        }
      } else {
        localStorage.setItem(CONTESTANTS_STORAGE_KEY, JSON.stringify(INITIAL_CONTESTANTS));
      }
    } catch (e) {}
  }

  // Filter by election (or return all if electionId has matching records)
  let filtered = list;
  if (targetElectionId) {
    const hasElectionMatches = list.some(c => c.electionId === targetElectionId);
    if (hasElectionMatches) {
      filtered = list.filter(c => c.electionId === targetElectionId || !c.electionId);
    }
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

// ═══════════════════════════════════════════════════════════════
// SUPABASE LIVE SYNC
// ═══════════════════════════════════════════════════════════════

export async function fetchLiveElectraData() {
  let allElections = getAllElections();
  let election = getActiveElection();
  let posts = getElectraPosts();
  let contestants = getContestants();

  if (supabase) {
    try {
      // 1. Fetch all elections
      const { data: allElRow } = await supabase
        .from('id_card_settings')
        .select('academic_session')
        .eq('id', 'store_electra_all_elections')
        .maybeSingle();

      if (allElRow?.academic_session) {
        try {
          const parsed = JSON.parse(allElRow.academic_session);
          if (Array.isArray(parsed) && parsed.length > 0) {
            allElections = parsed;
            if (typeof window !== 'undefined') {
              localStorage.setItem(ELECTIONS_LIST_STORAGE_KEY, JSON.stringify(allElections));
            }
          }
        } catch (_) {}
      }

      // 2. Fetch active election
      const activeFromList = allElections.find(e => e.status === 'active');
      if (activeFromList) {
        election = activeFromList;
      } else {
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
            }
          } catch (_) {}
        }
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(ELECTIONS_STORAGE_KEY, JSON.stringify(election));
      }

      // 3. Fetch posts
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

      // 4. Fetch contestants
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

      // 5. Fetch News & Press Releases
      const { data: newsRow } = await supabase
        .from('id_card_settings')
        .select('academic_session')
        .eq('id', 'store_electra_news')
        .maybeSingle();

      if (newsRow?.academic_session) {
        try {
          const parsed = JSON.parse(newsRow.academic_session);
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (typeof window !== 'undefined') {
              localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(parsed));
            }
          }
        } catch (_) {}
      }
    } catch (e) {
      console.warn('Error syncing electra data from Supabase:', e);
    }
  }

  return { allElections, election, posts, contestants };
}

export const fetchLiveVotingData = fetchLiveElectraData;

// ═══════════════════════════════════════════════════════════════
// BALLOT VOTING & AUDIT ENGINE
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

export function getVoterBallot(voterMatric, electionId = null) {
  if (typeof window === 'undefined' || !voterMatric) return null;
  const targetElection = electionId || getActiveElection().id;
  try {
    const raw = localStorage.getItem(VOTES_STORAGE_KEY);
    const votes = raw ? JSON.parse(raw) : [];
    return votes.find(v => 
      v.voterMatric?.toLowerCase() === voterMatric.toLowerCase() &&
      (!v.electionId || v.electionId === targetElection)
    ) || null;
  } catch (e) {
    return null;
  }
}

export async function submitBallot({ voterMatric, voterName, voterLevel, selections, votes, electionId }) {
  if (!voterMatric) throw new Error('Voter Matric Number is required');

  const activeElection = getActiveElection();
  const targetElectionId = electionId || activeElection.id;

  if (activeElection.status !== 'active') {
    throw new Error('Electoral ballot box is currently closed or concluded.');
  }

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

  // Check if voter already cast ballot for this election
  const existing = getVoterBallot(voterMatric, targetElectionId);
  if (existing) {
    throw new Error(`Ballot already registered for matric number ${voterMatric} on ${new Date(existing.timestamp).toLocaleDateString()}`);
  }

  const timestamp = new Date().toISOString();
  const receiptHash = generateBallotHash(voterMatric, activeSelections, timestamp);

  const ballotRecord = {
    id: `vote-${Date.now()}`,
    electionId: targetElectionId,
    voterMatric: voterMatric.trim().toUpperCase(),
    voterName: voterName || 'Student Member',
    voterLevel: voterLevel || '300 Level',
    selections: activeSelections,
    receiptHash,
    timestamp
  };

  // 1. Record Vote in votes database
  let allVotes = [];
  try {
    const rawVotes = localStorage.getItem(VOTES_STORAGE_KEY);
    allVotes = rawVotes ? JSON.parse(rawVotes) : [];
  } catch (_) {}
  allVotes.push(ballotRecord);
  localStorage.setItem(VOTES_STORAGE_KEY, JSON.stringify(allVotes));

  // 2. Increment votes tally for candidates
  const allContestants = getContestants(null, targetElectionId);
  const updatedContestants = allContestants.map(c => {
    const chosenContestantId = activeSelections[c.postId];
    if (chosenContestantId === c.id) {
      return { ...c, votesCount: (c.votesCount || 0) + 1 };
    }
    return c;
  });

  localStorage.setItem(CONTESTANTS_STORAGE_KEY, JSON.stringify(updatedContestants));

  // 3. Sync to Supabase
  if (supabase) {
    try {
      await supabase.from('id_card_settings').upsert({
        id: 'store_electra_contestants',
        academic_session: JSON.stringify(updatedContestants),
        updated_at: timestamp
      });
      await supabase.from('id_card_settings').upsert({
        id: 'store_electra_votes_archive',
        academic_session: JSON.stringify(allVotes.slice(-100)),
        updated_at: timestamp
      });
    } catch (_) {}
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('nacos_electra_ballot_cast'));
    window.dispatchEvent(new Event('nacos_electra_contestants_updated'));
  }

  return {
    success: true,
    receipt: {
      ballotId: ballotRecord.id,
      receiptHash,
      voterMatric: ballotRecord.voterMatric,
      timestamp,
      electionTitle: activeElection.title
    }
  };
}
export const castBallot = submitBallot;

/**
 * Returns live election results.
 * If electionId is specified, computes results for that election; otherwise defaults to active election.
 */
export function getLiveElectionResults(electionId = null) {
  const posts = getElectraPosts();
  const contestants = getContestants(null, electionId);

  let votes = [];
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(VOTES_STORAGE_KEY);
      votes = raw ? JSON.parse(raw) : [];
    } catch (_) {}
  }

  if (electionId) {
    votes = votes.filter(v => v.electionId === electionId);
  }

  const totalBallots = contestants.reduce((sum, c) => sum + (c.votesCount || 0), 0);

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
// ADMIN CANDIDATE CRUD
// ═══════════════════════════════════════════════════════════════

export async function adminSaveContestant(contestantData, candidateId = null) {
  const all = getContestants();
  const now = new Date().toISOString();
  const id = candidateId || contestantData.id || `cnd-${Date.now()}`;
  const activeElection = getActiveElection();
  const existing = all.find(c => c.id === id);

  const item = {
    ...contestantData,
    id,
    electionId: contestantData.electionId || activeElection.id,
    status: contestantData.status || (existing?.status || 'certified'),
    votesCount: contestantData.votesCount !== undefined ? contestantData.votesCount : (existing?.votesCount || 0),
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

// ═══════════════════════════════════════════════════════════════
// ADMIN POSTS / POSITIONS CRUD
// ═══════════════════════════════════════════════════════════════

export async function adminSavePost(postData, postId = null) {
  const all = getElectraPosts();
  const id = postId || postData.id || `post-${Date.now()}`;
  const now = new Date().toISOString();

  const item = {
    ...postData,
    id,
    order: parseInt(postData.order, 10) || all.length + 1,
    maxVotesPerVoter: parseInt(postData.maxVotesPerVoter, 10) || 1,
    updatedAt: now
  };

  const existingIndex = all.findIndex(p => p.id === id);
  let updated;
  if (existingIndex >= 0) {
    updated = [...all];
    updated[existingIndex] = { ...all[existingIndex], ...item };
  } else {
    updated = [...all, item];
  }

  // Sort by ballot display order
  updated.sort((a, b) => (a.order || 0) - (b.order || 0));

  localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(updated));

  if (supabase) {
    try {
      await supabase.from('id_card_settings').upsert({
        id: 'store_electra_posts',
        academic_session: JSON.stringify(updated),
        updated_at: now
      });
    } catch (_) {}
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('nacos_electra_posts_updated'));
  }

  return item;
}

export async function adminDeletePost(postId) {
  const all = getElectraPosts();
  const updated = all.filter(p => p.id !== postId);
  localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(updated));

  if (supabase) {
    try {
      await supabase.from('id_card_settings').upsert({
        id: 'store_electra_posts',
        academic_session: JSON.stringify(updated),
        updated_at: new Date().toISOString()
      });
    } catch (_) {}
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('nacos_electra_posts_updated'));
  }

  return updated;
}

// ═══════════════════════════════════════════════════════════════
// ELECTRA NEWS & PRESS RELEASES MANAGEMENT
// ═══════════════════════════════════════════════════════════════

export function getElectraNews() {
  if (typeof window === 'undefined') return DEFAULT_ELECTRA_NEWS;
  try {
    const raw = localStorage.getItem(NEWS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(DEFAULT_ELECTRA_NEWS));
    return DEFAULT_ELECTRA_NEWS;
  } catch (e) {
    return DEFAULT_ELECTRA_NEWS;
  }
}

export async function adminSaveElectraNews(newsItem, newsId = null) {
  const all = getElectraNews();
  const id = newsId || newsItem.id || `news-${Date.now()}`;
  const now = new Date().toISOString();

  const item = {
    ...newsItem,
    id,
    date: newsItem.date || new Date().toISOString().slice(0, 10),
    updatedAt: now
  };

  const existingIndex = all.findIndex(n => n.id === id);
  let updated;
  if (existingIndex >= 0) {
    updated = [...all];
    updated[existingIndex] = { ...all[existingIndex], ...item };
  } else {
    updated = [item, ...all];
  }

  localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(updated));

  if (supabase) {
    try {
      await supabase.from('id_card_settings').upsert({
        id: 'store_electra_news',
        academic_session: JSON.stringify(updated),
        updated_at: now
      });
    } catch (_) {}
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('nacos_electra_news_updated'));
  }

  return item;
}

export async function adminDeleteElectraNews(newsId) {
  const all = getElectraNews();
  const updated = all.filter(n => n.id !== newsId);
  localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(updated));

  if (supabase) {
    try {
      await supabase.from('id_card_settings').upsert({
        id: 'store_electra_news',
        academic_session: JSON.stringify(updated),
        updated_at: new Date().toISOString()
      });
    } catch (_) {}
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('nacos_electra_news_updated'));
  }

  return updated;
}

// ═══════════════════════════════════════════════════════════════
// AUTHORITATIVE CLIENT-SIDE API SDK FOR ELECTRA ACCREDITATION & VOTING
// ═══════════════════════════════════════════════════════════════

/**
 * Step 1: Submit Registration Number + First Name + Last Name to verify against student records.
 */
export async function apiAccreditVoter({ electionId, registrationNumber, firstName, lastName }) {
  try {
    const res = await fetch('/api/electra/accredit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ electionId, registrationNumber, firstName, lastName })
    });
    const data = await res.json();
    return data;
  } catch (err) {
    return { success: false, error: 'Network communication failure. Please verify connection and retry.' };
  }
}

/**
 * Step 2: Submit destination email to receive secure single-use verification code.
 */
export async function apiSendElectoralCode({ accreditationToken, email }) {
  try {
    const res = await fetch('/api/electra/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accreditationToken, email })
    });
    const data = await res.json();
    return data;
  } catch (err) {
    return { success: false, error: 'Failed to dispatch verification email. Please check your network.' };
  }
}

/**
 * Step 3: Submit 6-digit code to consume code and establish authenticated voting session.
 */
export async function apiVerifyElectoralCode({ accreditationToken, code }) {
  try {
    const res = await fetch('/api/electra/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accreditationToken, code })
    });
    const data = await res.json();
    return data;
  } catch (err) {
    return { success: false, error: 'Verification failed due to a network error.' };
  }
}

/**
 * Step 4: Verify current voting session status and query cast votes.
 */
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
    const data = await res.json();
    return data;
  } catch (err) {
    return { success: false, authenticated: false };
  }
}

/**
 * Step 5: Submit ballot selections atomically with database-level duplicate protection.
 */
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
    const data = await res.json();
    return data;
  } catch (err) {
    return { success: false, error: 'Failed to record ballot. Please check your connection and retry.' };
  }
}

/**
 * Step 6: Fetch Authoritative Official Aggregated Results from the server.
 */
export async function apiGetAuthoritativeResults(electionId = null) {
  const activeElection = getActiveElection();
  const targetId = electionId || activeElection.id;
  try {
    const res = await fetch(`/api/electra/results?electionId=${encodeURIComponent(targetId)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
    return getLiveElectionResults(targetId);
  } catch (err) {
    return getLiveElectionResults(targetId);
  }
}

/**
 * Step 7: Subscribe to Realtime WebSocket Broadcast Channel for instant election results.
 * Connects to 'election-results:${electionId}' channel and invokes onUpdate(payload)
 * on 'result_updated' events. Handles reconnects automatically and returns an unsubscribe() function.
 */
export function subscribeToElectionResults({ electionId, onUpdate, onReconnect }) {
  if (!supabase || typeof window === 'undefined') {
    return () => {};
  }

  const activeElection = getActiveElection();
  const targetElectionId = electionId || activeElection.id;
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

/**
 * Admin: Retrieve all accreditations recorded for an election
 */
export async function getElectionAccreditations(electionId = null) {
  const targetElectionId = electionId || getActiveElection().id;

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



