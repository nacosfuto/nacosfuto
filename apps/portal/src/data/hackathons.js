export const HACKATHONS = [
  {
    id: "the-agentic-build",
    slug: "the-agentic-build",
    title: "THE AGENTIC BUILD",
    theme: "The Agentic Build",
    subtitle: "Build any product idea using AI tools. Follow standard SDLC.",
    badge: "NACOS FUTO Hackathon",
    tagline: "Build any product with AI tools. Follow standard SDLC and showcase your workflow.",
    mode: "Department of Computer Science, FUTO & Virtual",
    status: "Active", // "Active", "Upcoming", "Completed"
    organizer: "NACOS FUTO",
    coOrganizers: [
      "Department of Computer Science FUTO",
      "NACOS FUTO Executive Council"
    ],
    hostDirectorate: "Department of Computer Science, NACOS FUTO",
    venue: "Department of Computer Science, FUTO",
    teamFormat: "Solo builders or teams of up to 5 members",
    startDate: "2026-12-11T09:00:00Z",
    endDate: "2026-12-11T23:59:59Z",
    applicationDeadline: "2026-12-10T23:59:59Z",
    stats: {
      eventDate: "December 11, 2026",
      location: "Department of Computer Science, FUTO",
      prizePool: "Cash Prizes",
      applyBefore: "December 10, 2026",
      registeredStudents: 380,
      activeTeams: 42,
      submissionsCount: 18
    },
    prizePoolDetails: {
      title: "Prize",
      description: "Unified prize pool awarded to the winning products, alongside mentorship, peer learning, trophy, and certificates.",
      perks: [
        "Cash rewards",
        "Mentorship & technical guidance",
        "Peer learning & collaborative building",
        "Grand innovation trophy & technical excellence certificates"
      ]
    },
    timeline: [
      {
        date: "November 25, 2026",
        title: "Launch & Applications Open",
        description: "Registration opens for solo developers and teams. Developer resources and SDLC guidelines go live."
      },
      {
        date: "December 5, 2026",
        title: "SDLC & Building with AI Tools Workshop",
        description: "Technical orientation covering standard SDLC phases, leveraging AI coding assistants effectively, and structuring documentation."
      },
      {
        date: "December 10, 2026",
        title: "Application Deadline & Verification",
        description: "Registration closes. Verification of solo builders, team rosters, and product proposals."
      },
      {
        date: "December 11, 2026",
        title: "Hackathon Event Day & Live Pitches",
        description: "Product demonstration, live pitches explaining AI workflow and SDLC implementation, and awards ceremony at the Department of Computer Science, FUTO."
      }
    ],
    projectTypes: [
      "Web Application",
      "Mobile Application (iOS / Android)",
      "Campus & Student Life Tech",
      "Developer Tools & SaaS",
      "FinTech & Digital Commerce",
      "Civic Tech, Health & Social Impact",
      "Other Innovative Product"
    ],
    rules: [
      "No rigid tracks: any product idea is accepted across web, mobile, desktop, or cloud software.",
      "It is NOT a must that your product itself has AI. Products can incorporate AI directly OR be built using modern AI tools (e.g. Cursor, Copilot, ChatGPT, Claude, LLM code workflows).",
      "Teams must follow standard SDLC (Software Development Life Cycle) practices: requirement definition, system architecture/design, implementation, testing, and deployment.",
      "During the final presentation, teams must be able to clearly explain their workflow and how they utilized AI tools throughout their development cycle.",
      "Open to solo builders or teams of up to 5 members.",
      "All code submitted must be newly authored during the hackathon sprint window. Pre-existing projects are disqualified.",
      "Each team or solo builder must submit a public GitHub repository, a deployed live demo link or clear local run instructions, and a 3-minute video presentation."
    ],
    faqs: [
      {
        question: "Are there specific tracks to choose from?",
        answer: "No, there are no fixed tracks! You have full creative freedom to build any kind of software product. During registration, you simply indicate what kind of project you and your team are building."
      },
      {
        question: "Does my product have to feature AI directly?",
        answer: "No! It is NOT a must that your product contains AI features. Any product idea is accepted (web app, mobile app, API, utility). Your product can either feature AI directly or simply be built using modern AI tools to accelerate your engineering workflow."
      },
      {
        question: "What is required during the demo presentation?",
        answer: "You must be able to explain your development flow in using AI tools, demonstrate a working product, and show adherence to standard SDLC (requirements, architecture, implementation, and testing)."
      },
      {
        question: "What does following standard SDLC mean for this hackathon?",
        answer: "It means following sound software engineering fundamentals: having a clearly defined problem and requirements, clean modular architecture, version-controlled code, basic testing/validation, and a runnable deployment."
      },
      {
        question: "Where is the venue?",
        answer: "The hackathon takes place at the Department of Computer Science, FUTO on December 11th, 2026."
      },
      {
        question: "Can I participate alone as a solo builder?",
        answer: "Yes! You can register either as an individual solo builder or in a team of up to 5 members."
      },
      {
        question: "What is the prize pool?",
        answer: "The hackathon features cash rewards, alongside mentorship, peer learning, trophies, and certificates for the top winning projects."
      },
      {
        question: "Is there any registration fee?",
        answer: "No. Participation is 100% free, organized by NACOS FUTO."
      }
    ],
    partners: [
      {
        id: "dict-futo",
        name: "Office of the Director of ICT",
        shortName: "DICT FUTO",
        role: "Lead Directorate & Host",
        logoUrl: "https://res.cloudinary.com/a2mmcttn/image/upload/v1795114143/nacos/general/office-of-the-director-of-ict.png",
        description: "Directorate of Information & Communication Technology, FUTO"
      },
      {
        id: "nacos-futo",
        name: "NACOS FUTO",
        shortName: "NACOS FUTO",
        role: "Organizing Chapter",
        logoUrl: "https://res.cloudinary.com/a2mmcttn/image/upload/v1788569315/nacos/general/full-logo-light.png",
        description: "Nigeria Association of Computing Students, FUTO Chapter"
      },
      {
        id: "niforix",
        name: "Niforix",
        shortName: "Niforix",
        role: "Official Sponsor",
        logoUrl: "https://res.cloudinary.com/a2mmcttn/image/upload/v1795117704/nacos/sponsors/niforix_logo.png",
        description: "Official Sponsor of The Agentic Build Hackathon"
      }
    ]
  }
];

export const getActiveHackathon = () => HACKATHONS[0];
