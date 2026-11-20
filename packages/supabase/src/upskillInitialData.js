/**
 * upskillInitialData.js
 * Authoritative initial seeds for Upskill Hub courses, lessons, and creator roles.
 */

export const INITIAL_VERIFIED_CREATORS = [
  "john-smilga",
  "grow-with-google",
  "creator-admin"
];

export const INITIAL_APPROVED_CREATORS = [
  {
    id: "creator-admin",
    name: "Engr. David Okon",
    email: "david.okon@futo.edu.ng",
    role: "Lead Instructor",
    specialization: "Fullstack Engineering & Cloud",
    status: "approved",
    approved_at: "2026-01-01T00:00:00Z"
  },
  {
    id: "creator-1",
    name: "Ifeanyi John",
    email: "ifeanyi.john@nacos.futo.edu.ng",
    role: "Technical Lead",
    specialization: "React & Node.js",
    status: "approved",
    approved_at: "2026-01-15T00:00:00Z"
  }
];

export const INITIAL_CREATOR_APPLICATIONS = [
  {
    id: "app-1",
    user_id: "student-101",
    fullName: "Emmanuel Chidubem",
    email: "emmanuel.chidubem@student.futo.edu.ng",
    regNo: "20211182901",
    specialization: "Cybersecurity & Network Security",
    topic_idea: "Practical Linux Terminal & Wireshark Packet Analysis for 200L Students",
    experience: "3 years active CTF player, completed CompTIA Security+ syllabus",
    portfolio_url: "https://github.com/emmanuel-sec",
    status: "pending",
    created_at: "2026-09-18T10:30:00Z"
  },
  {
    id: "app-2",
    user_id: "student-102",
    fullName: "Blessing Amaka",
    email: "blessing.amaka@student.futo.edu.ng",
    regNo: "20201099234",
    specialization: "UI/UX & Product Design",
    topic_idea: "Figma to Code: Building Accessible Design Systems for Web Applications",
    experience: "Lead UI designer for 2 departmental hackathon winning products",
    portfolio_url: "https://behance.net/blessingdesigns",
    status: "pending",
    created_at: "2026-09-20T14:15:00Z"
  }
];

export const INITIAL_COURSES = [
  {
      "id": "course-photoshop",
      "creator_id": "creator-admin",
      "creator_name": "Learnit Anytime",
      "title": "Photoshop for Beginners: Complete Masterclass",
      "level": "Beginner",
      "is_live_workshop": false,
      "workshop_details": null,
      "thumbnail": "https://i.ytimg.com/vi/IyR_uYsRdPs/hqdefault.jpg",
      "description": "Master the foundations of Adobe Photoshop. From interface customization, layers, selections, and masking to advanced photo manipulation, typography, and professional asset export.",
      "tags": [
          "photoshop",
          "design",
          "ui-ux",
          "creative-tech"
      ],
      "created_at": "2026-03-01T10:00:00Z"
  },
  {
      "id": "course-web-dev",
      "creator_id": "creator-admin",
      "creator_name": "John Smilga",
      "title": "Complete Web Development & Fullstack Mastery",
      "level": "Beginner to Advanced",
      "is_live_workshop": false,
      "workshop_details": null,
      "thumbnail": "https://i.ytimg.com/vi/-8ORfgUa8ow/hqdefault.jpg",
      "description": "Comprehensive fullstack developer journey. Master HTML & CSS, Vanilla JavaScript, 15 projects, React fundamentals & hooks, Gatsby V3, Node.js & Express APIs, and Serverless cloud functions.",
      "tags": [
          "web-dev",
          "javascript",
          "react",
          "nodejs",
          "frontend",
          "backend"
      ],
      "created_at": "2026-03-05T12:00:00Z"
  },
  {
      "id": "course-ai-fluency",
      "creator_id": "creator-admin",
      "creator_name": "AI Research Group",
      "title": "AI Fluency: Framework & Foundations Course",
      "level": "Intermediate",
      "is_live_workshop": false,
      "workshop_details": null,
      "thumbnail": "https://i.ytimg.com/vi/-UN9sNqQ0t4/hqdefault.jpg",
      "description": "Comprehensive breakdown of the 4D AI Framework. Understand modern generative AI architectures, capabilities & limitations, delegation, prompt engineering deep-dives, discernment, diligence, and ethical deployment.",
      "tags": [
          "ai",
          "generative-ai",
          "prompting",
          "machine-learning",
          "python"
      ],
      "created_at": "2026-03-10T14:00:00Z"
  },
  {
      "id": "course-google-ai",
      "creator_id": "creator-admin",
      "creator_name": "Grow with Google",
      "title": "Google AI Professional Certificate: Learn How to Become AI Fluent",
      "level": "All Levels",
      "is_live_workshop": false,
      "workshop_details": null,
      "thumbnail": "https://i.ytimg.com/vi/l4L5q-OwiMg/hqdefault.jpg",
      "description": "Master practical AI fluency with Grow with Google. Move beyond basic prompting to use modern generative AI tools—Gemini, NotebookLM, and Google AI Studio—as collaborative work partners for ideation, strategic research, content communications, multimedia creation, data analysis, and building custom productivity workflows.",
      "tags": [
          "ai",
          "google",
          "gemini",
          "productivity",
          "machine-learning",
          "certification"
      ],
      "created_at": "2026-03-12T10:00:00Z"
  },
  {
    id: "course-1",
    creator_id: "creator-admin",
    creator_name: "Engr. David Okon",
    title: "Modern JavaScript: Zero to Hero",
    level: "Beginner",
    is_live_workshop: false,
    workshop_details: null,
    thumbnail: "https://res.cloudinary.com/a2mmcttn/image/upload/v1788569327/nacos/gallery/nacos1.jpg",
    description: "Master the foundations of JavaScript from modern ES6+ syntax to functional programming, async/await, DOM APIs, and state patterns.",
    tags: ["javascript", "frontend", "web-dev"],
    created_at: "2026-01-10T10:00:00Z"
  },
  {
    id: "course-2",
    creator_id: "creator-admin",
    creator_name: "Dr. Stanley C.",
    title: "Python for Data Science & AI",
    level: "Intermediate",
    is_live_workshop: false,
    workshop_details: null,
    thumbnail: "https://res.cloudinary.com/a2mmcttn/image/upload/v1788569330/nacos/gallery/nacos2.jpg",
    description: "Hands-on data analysis, Pandas manipulation, NumPy vectorization, Matplotlib charts, and machine learning pipelines in Python.",
    tags: ["python", "data-science", "ai"],
    created_at: "2026-01-15T12:00:00Z"
  },
  {
    id: "course-3",
    creator_id: "creator-1",
    creator_name: "Ifeanyi John (NACOS Tech Lead)",
    title: "Fullstack React 19 & Next.js Masterclass",
    level: "Intermediate",
    is_live_workshop: true,
    workshop_details: {
      location: "FUTO ICT Innovation Center, Hall A",
      date: "2026-10-15",
      time: "14:00 GMT+1",
      duration: "3 hours",
      instructor: "Ifeanyi John",
      capacity: 120,
    },
    thumbnail: "https://res.cloudinary.com/a2mmcttn/image/upload/v1788569331/nacos/gallery/nacos3.jpg",
    description: "Live interactive engineering bootcamp covering React 19 server actions, hooks architecture, Tailwind design systems, and fullstack deployment.",
    tags: ["react", "frontend", "fullstack"],
    created_at: "2026-02-01T08:30:00Z"
  },
  {
    id: "course-4",
    creator_id: "creator-admin",
    creator_name: "Prof. O. Nwokorie",
    title: "Data Structures & Algorithms in Java & C++",
    level: "200 Level",
    is_live_workshop: false,
    workshop_details: null,
    thumbnail: "https://res.cloudinary.com/a2mmcttn/image/upload/v1788569332/nacos/gallery/nacos4.jpg",
    description: "Comprehensive curriculum for FUTO CSC 201. Dynamic arrays, linked lists, trees, graphs, sorting algorithms, and asymptotic complexity analysis.",
    tags: ["algorithms", "cs-core", "java"],
    created_at: "2026-02-10T14:00:00Z"
  },
  {
    id: "course-5",
    creator_id: "creator-1",
    creator_name: "Victor Munachimso",
    title: "High-Performance Node.js & Microservices",
    level: "Professional",
    is_live_workshop: true,
    workshop_details: {
      location: "Virtual Stage (Google Meet / Discord)",
      date: "2026-11-05",
      time: "16:00 GMT+1",
      duration: "4 hours",
      instructor: "Victor Munachimso",
      capacity: 200,
    },
    thumbnail: "https://res.cloudinary.com/a2mmcttn/image/upload/v1788569332/nacos/gallery/nacos5.jpg",
    description: "Production-ready backend architecture, cluster mode, Redis pub/sub caching, message queues, Dockerization, and API security best practices.",
    tags: ["nodejs", "backend", "api"],
    created_at: "2026-02-20T10:00:00Z"
  },
  {
    id: "course-6",
    creator_id: "creator-admin",
    creator_name: "Chukwuka Daniel",
    title: "Cloud Infrastructure with Docker, Kubernetes & AWS",
    level: "Professional",
    is_live_workshop: false,
    workshop_details: null,
    thumbnail: "https://res.cloudinary.com/a2mmcttn/image/upload/v1788569333/nacos/gallery/nacos6.jpg",
    description: "Build robust cloud architectures. Containerize applications with Docker, manage container orchestration with Kubernetes, and automate CI/CD pipelines.",
    tags: ["cloud", "devops", "docker"],
    created_at: "2026-03-01T11:00:00Z"
  },
  {
    id: "course-7",
    creator_id: "creator-1",
    creator_name: "Godfirst Benita",
    title: "Cybersecurity & Ethical Hacking: Hands-On Defense",
    level: "Intermediate",
    is_live_workshop: true,
    workshop_details: {
      location: "FUTO Computer Lab 2 / Virtual Stream",
      date: "2026-11-20",
      time: "15:00 GMT+1",
      duration: "3.5 hours",
      instructor: "Godfirst Benita",
      capacity: 80,
    },
    thumbnail: "https://res.cloudinary.com/a2mmcttn/image/upload/v1788569334/nacos/gallery/nacos7.jpg",
    description: "Understand penetration testing methodology, OWASP Top 10 web vulnerabilities, SQL injection defense, network packet sniffing, and secure auth.",
    tags: ["security", "networking", "cybersecurity"],
    created_at: "2026-03-10T09:00:00Z"
  },
  {
    id: "course-8",
    creator_id: "creator-admin",
    creator_name: "Chikamso Ruby",
    title: "Mobile App Development with Flutter & Dart",
    level: "Beginner",
    is_live_workshop: false,
    workshop_details: null,
    thumbnail: "https://res.cloudinary.com/a2mmcttn/image/upload/v1788569335/nacos/gallery/nacos8.jpg",
    description: "Cross-platform mobile engineering. Build fast, reactive iOS and Android applications with single Dart codebase and beautiful Flutter widgets.",
    tags: ["mobile", "flutter", "dart"],
    created_at: "2026-03-15T15:00:00Z"
  }
];

export const INITIAL_TOPICS = [
  {
      "id": "topic-gai-1",
      "course_id": "course-google-ai",
      "title": "Google AI Professional Certificate: Learn how to become AI fluent",
      "video_url": "https://www.youtube.com/watch?v=l4L5q-OwiMg",
      "start_playing_at": 0,
      "summary_text": "Introduction to the Google AI Professional Certificate. Discover how generative AI transforms real-world productivity, how to collaborate with AI tools, and key principles to become AI-fluent in any industry.",
      "order_index": 1,
      "duration": "03:15"
  },
  {
      "id": "topic-gai-2",
      "course_id": "course-google-ai",
      "title": "The fundamentals of AI | AI Professional Certificate",
      "video_url": "https://www.youtube.com/watch?v=OH43A-tRm4M",
      "start_playing_at": 0,
      "summary_text": "Understand core machine learning foundations, large language models (LLMs), neural networks, tokenization, context windows, and effective prompting techniques to get high-accuracy responses.",
      "order_index": 2,
      "duration": "11:42"
  },
  {
      "id": "topic-gai-3",
      "course_id": "course-google-ai",
      "title": "Learn AI for brainstorming and planning | AI Professional Certificate",
      "video_url": "https://www.youtube.com/watch?v=XRere_JdIPo",
      "start_playing_at": 0,
      "summary_text": "Use generative AI as a thought partner for ideation, project roadmapping, risk assessment, strategic decision making, and agile sprint planning.",
      "order_index": 3,
      "duration": "09:30"
  },
  {
      "id": "topic-gai-4",
      "course_id": "course-google-ai",
      "title": "Use AI as your strategic research partner | AI Professional Certificate",
      "video_url": "https://www.youtube.com/watch?v=ZCBc5NDaO04",
      "start_playing_at": 0,
      "summary_text": "Leverage NotebookLM and grounded search to synthesize dense research documents, extract critical insights, benchmark data, and fact-check findings with citations.",
      "order_index": 4,
      "duration": "12:10"
  },
  {
      "id": "topic-gai-5",
      "course_id": "course-google-ai",
      "title": "Get communications just right with AI | AI Professional Certificate",
      "video_url": "https://www.youtube.com/watch?v=1JIVY-b5j68",
      "start_playing_at": 0,
      "summary_text": "Draft executive memos, client pitches, technical documentation, and persuasive stakeholder updates with customized tone, clarity, and precision.",
      "order_index": 5,
      "duration": "10:15"
  },
  {
      "id": "topic-gai-6",
      "course_id": "course-google-ai",
      "title": "Create images, videos, and presentations | AI Professional Certificate",
      "video_url": "https://www.youtube.com/watch?v=W2VgkdHU-yc",
      "start_playing_at": 0,
      "summary_text": "Build multimedia assets, visual slide decks, mockups, and video outlines using Google Imagen and modern generative visual tools.",
      "order_index": 6,
      "duration": "14:20"
  },
  {
      "id": "topic-gai-7",
      "course_id": "course-google-ai",
      "title": "How Gemini helps you analyze data | AI Professional Certificate",
      "video_url": "https://www.youtube.com/watch?v=ablim7LnA0o",
      "start_playing_at": 0,
      "summary_text": "Analyze complex datasets, spot market trends, generate formulas, and produce visual summaries effortlessly using Gemini Advanced data analysis.",
      "order_index": 7,
      "duration": "13:45"
  },
  {
      "id": "topic-gai-8",
      "course_id": "course-google-ai",
      "title": "Build your own tools to ease your workday | AI Professional Certificate",
      "video_url": "https://www.youtube.com/watch?v=Q9vddMFZncM",
      "start_playing_at": 0,
      "summary_text": "Prototype custom AI assistants, automated workflows, and Google AI Studio system prompts to streamline repetitive daily operations.",
      "order_index": 8,
      "duration": "16:20"
  },
  {
      "id": "topic-ps-1",
      "course_id": "course-photoshop",
      "title": "Photoshop for Beginners | FREE COURSE",
      "video_url": "https://www.youtube.com/watch?v=IyR_uYsRdPs",
      "start_playing_at": 0,
      "summary_text": "Comprehensive hands-on lesson: Photoshop for Beginners | FREE COURSE. Focuses on professional workflow, industry-standard Photoshop techniques, and practical creative exercises.",
      "order_index": 1,
      "duration": "3:07:02"
  },
  {
      "id": "topic-ps-2",
      "course_id": "course-photoshop",
      "title": "Advanced Photoshop Techniques | FREE COURSE",
      "video_url": "https://www.youtube.com/watch?v=ObKsCs5mYGQ",
      "start_playing_at": 0,
      "summary_text": "Comprehensive hands-on lesson: Advanced Photoshop Techniques | FREE COURSE. Focuses on professional workflow, industry-standard Photoshop techniques, and practical creative exercises.",
      "order_index": 2,
      "duration": "47:30"
  },
  {
      "id": "topic-ps-3",
      "course_id": "course-photoshop",
      "title": "Photo Manipulation Basics | FREE COURSE",
      "video_url": "https://www.youtube.com/watch?v=crfH_JuC2lI",
      "start_playing_at": 0,
      "summary_text": "Comprehensive hands-on lesson: Photo Manipulation Basics | FREE COURSE. Focuses on professional workflow, industry-standard Photoshop techniques, and practical creative exercises.",
      "order_index": 3,
      "duration": "52:15"
  },
  {
      "id": "topic-web-1",
      "course_id": "course-web-dev",
      "title": "HTML & CSS Tutorial",
      "video_url": "https://www.youtube.com/watch?v=-8ORfgUa8ow",
      "start_playing_at": 0,
      "summary_text": "Step-by-step module: HTML & CSS Tutorial. Covers core software engineering patterns, coding conventions, architectural breakdown, and project implementation.",
      "order_index": 1,
      "duration": "10:59:46"
  },
  {
      "id": "topic-web-2",
      "course_id": "course-web-dev",
      "title": "Javascript Fundamentals",
      "video_url": "https://www.youtube.com/watch?v=2Ji-clqUYnA",
      "start_playing_at": 0,
      "summary_text": "Step-by-step module: Javascript Fundamentals. Covers core software engineering patterns, coding conventions, architectural breakdown, and project implementation.",
      "order_index": 2,
      "duration": "10:22:54"
  },
  {
      "id": "topic-web-3",
      "course_id": "course-web-dev",
      "title": "15 Vanilla Javascript Projects",
      "video_url": "https://www.youtube.com/watch?v=c5SIG7Ie0dM",
      "start_playing_at": 0,
      "summary_text": "Step-by-step module: 15 Vanilla Javascript Projects. Covers core software engineering patterns, coding conventions, architectural breakdown, and project implementation.",
      "order_index": 3,
      "duration": "8:23:57"
  },
  {
      "id": "topic-web-4",
      "course_id": "course-web-dev",
      "title": "React Tutorial - Fundamentals, Hooks, Context API, React Router, Custom Hooks",
      "video_url": "https://www.youtube.com/watch?v=iZhV0bILFb0",
      "start_playing_at": 0,
      "summary_text": "Step-by-step module: React Tutorial - Fundamentals, Hooks, Context API, React Router, Custom Hooks. Covers core software engineering patterns, coding conventions, architectural breakdown, and project implementation.",
      "order_index": 4,
      "duration": "10:07:52"
  },
  {
      "id": "topic-web-5",
      "course_id": "course-web-dev",
      "title": "React Projects",
      "video_url": "https://www.youtube.com/watch?v=ly3m6mv5qvg",
      "start_playing_at": 0,
      "summary_text": "Step-by-step module: React Projects. Covers core software engineering patterns, coding conventions, architectural breakdown, and project implementation.",
      "order_index": 5,
      "duration": "9:07:48"
  },
  {
      "id": "topic-web-6",
      "course_id": "course-web-dev",
      "title": "Gatsby V3 Tutorial and Recipes Site Project",
      "video_url": "https://www.youtube.com/watch?v=JlxXHlygVLM",
      "start_playing_at": 0,
      "summary_text": "Step-by-step module: Gatsby V3 Tutorial and Recipes Site Project. Covers core software engineering patterns, coding conventions, architectural breakdown, and project implementation.",
      "order_index": 6,
      "duration": "9:19:13"
  },
  {
      "id": "topic-web-7",
      "course_id": "course-web-dev",
      "title": "Node and Express Tutorial",
      "video_url": "https://www.youtube.com/watch?v=TNV0_7QRDwY",
      "start_playing_at": 0,
      "summary_text": "Step-by-step module: Node and Express Tutorial. Covers core software engineering patterns, coding conventions, architectural breakdown, and project implementation.",
      "order_index": 7,
      "duration": "8:16:50"
  },
  {
      "id": "topic-web-8",
      "course_id": "course-web-dev",
      "title": "Serverless Functions",
      "video_url": "https://www.youtube.com/watch?v=AfAZ33XjIBU",
      "start_playing_at": 0,
      "summary_text": "Step-by-step module: Serverless Functions. Covers core software engineering patterns, coding conventions, architectural breakdown, and project implementation.",
      "order_index": 8,
      "duration": "4:27:05"
  },
  {
      "id": "topic-web-9",
      "course_id": "course-web-dev",
      "title": "Gatsby Tutorial V2",
      "video_url": "https://www.youtube.com/watch?v=5Mam9NuxwQc",
      "start_playing_at": 0,
      "summary_text": "Step-by-step module: Gatsby Tutorial V2. Covers core software engineering patterns, coding conventions, architectural breakdown, and project implementation.",
      "order_index": 9,
      "duration": "5:30:12"
  },
  {
      "id": "topic-web-10",
      "course_id": "course-web-dev",
      "title": "Gatsby - Strapi Portfolio Project",
      "video_url": "https://www.youtube.com/watch?v=asB-dUwpH4Y",
      "start_playing_at": 0,
      "summary_text": "Step-by-step module: Gatsby - Strapi Portfolio Project. Covers core software engineering patterns, coding conventions, architectural breakdown, and project implementation.",
      "order_index": 10,
      "duration": "5:17:22"
  },
  {
      "id": "topic-ai-1",
      "course_id": "course-ai-fluency",
      "title": "AI Fluency: Framework & Foundations Course Trailer",
      "video_url": "https://www.youtube.com/watch?v=-UN9sNqQ0t4",
      "start_playing_at": 0,
      "summary_text": "Structured AI curriculum: AI Fluency: Framework & Foundations Course Trailer. Explore theoretical concepts, ethical evaluation, practical prompting frameworks, and actionable AI implementation.",
      "order_index": 1,
      "duration": "1:08"
  },
  {
      "id": "topic-ai-2",
      "course_id": "course-ai-fluency",
      "title": "Lesson 1: Introduction to AI Fluency | AI Fluency: Framework & Foundations Course |",
      "video_url": "https://www.youtube.com/watch?v=JpGtOfSgR-c",
      "start_playing_at": 0,
      "summary_text": "Structured AI curriculum: Lesson 1: Introduction to AI Fluency | AI Fluency: Framework & Foundations Course |. Explore theoretical concepts, ethical evaluation, practical prompting frameworks, and actionable AI implementation.",
      "order_index": 2,
      "duration": "4:22"
  },
  {
      "id": "topic-ai-3",
      "course_id": "course-ai-fluency",
      "title": "Lesson 2A: Why do we need AI Fluency? | AI Fluency: Framework & Foundations Course",
      "video_url": "https://www.youtube.com/watch?v=4szRHy_CT7s",
      "start_playing_at": 0,
      "summary_text": "Structured AI curriculum: Lesson 2A: Why do we need AI Fluency? | AI Fluency: Framework & Foundations Course. Explore theoretical concepts, ethical evaluation, practical prompting frameworks, and actionable AI implementation.",
      "order_index": 3,
      "duration": "6:22"
  },
  {
      "id": "topic-ai-4",
      "course_id": "course-ai-fluency",
      "title": "Lesson 2B: The 4D Framework | AI Fluency: Framework & Foundations Course",
      "video_url": "https://www.youtube.com/watch?v=W4Ua6XFfX9w",
      "start_playing_at": 0,
      "summary_text": "Structured AI curriculum: Lesson 2B: The 4D Framework | AI Fluency: Framework & Foundations Course. Explore theoretical concepts, ethical evaluation, practical prompting frameworks, and actionable AI implementation.",
      "order_index": 4,
      "duration": "5:20"
  },
  {
      "id": "topic-ai-5",
      "course_id": "course-ai-fluency",
      "title": "Lesson 3A: What is generative AI? (Deep Dive) | AI Fluency: Framework & Foundations Course",
      "video_url": "https://www.youtube.com/watch?v=RyvXxApfHkk",
      "start_playing_at": 0,
      "summary_text": "Structured AI curriculum: Lesson 3A: What is generative AI? (Deep Dive) | AI Fluency: Framework & Foundations Course. Explore theoretical concepts, ethical evaluation, practical prompting frameworks, and actionable AI implementation.",
      "order_index": 5,
      "duration": "6:21"
  },
  {
      "id": "topic-ai-6",
      "course_id": "course-ai-fluency",
      "title": "Lesson 3B: Capabilities & limitations | AI Fluency: Framework & Foundations Course",
      "video_url": "https://www.youtube.com/watch?v=W5cga7xipRI",
      "start_playing_at": 0,
      "summary_text": "Structured AI curriculum: Lesson 3B: Capabilities & limitations | AI Fluency: Framework & Foundations Course. Explore theoretical concepts, ethical evaluation, practical prompting frameworks, and actionable AI implementation.",
      "order_index": 6,
      "duration": "7:20"
  },
  {
      "id": "topic-ai-7",
      "course_id": "course-ai-fluency",
      "title": "Lesson 4: A closer look at Delegation | AI Fluency: Framework & Foundations Course",
      "video_url": "https://www.youtube.com/watch?v=EljzyfdYkrc",
      "start_playing_at": 0,
      "summary_text": "Structured AI curriculum: Lesson 4: A closer look at Delegation | AI Fluency: Framework & Foundations Course. Explore theoretical concepts, ethical evaluation, practical prompting frameworks, and actionable AI implementation.",
      "order_index": 7,
      "duration": "5:49"
  },
  {
      "id": "topic-ai-8",
      "course_id": "course-ai-fluency",
      "title": "Lesson 6: A closer look at Description | AI Fluency: Framework & Foundations Course",
      "video_url": "https://www.youtube.com/watch?v=DmgujoZ1mmk",
      "start_playing_at": 0,
      "summary_text": "Structured AI curriculum: Lesson 6: A closer look at Description | AI Fluency: Framework & Foundations Course. Explore theoretical concepts, ethical evaluation, practical prompting frameworks, and actionable AI implementation.",
      "order_index": 8,
      "duration": "4:22"
  },
  {
      "id": "topic-ai-9",
      "course_id": "course-ai-fluency",
      "title": "Lesson 7: Effective prompting techniques (Deep Dive) | AI Fluency: Framework & Foundations Course",
      "video_url": "https://www.youtube.com/watch?v=2YCaBqP8muw",
      "start_playing_at": 0,
      "summary_text": "Structured AI curriculum: Lesson 7: Effective prompting techniques (Deep Dive) | AI Fluency: Framework & Foundations Course. Explore theoretical concepts, ethical evaluation, practical prompting frameworks, and actionable AI implementation.",
      "order_index": 9,
      "duration": "11:55"
  },
  {
      "id": "topic-ai-10",
      "course_id": "course-ai-fluency",
      "title": "Lesson 8: A closer look at Discernment | AI Fluency: Framework & Foundations Course",
      "video_url": "https://www.youtube.com/watch?v=Y0KidGr9Z2Y",
      "start_playing_at": 0,
      "summary_text": "Structured AI curriculum: Lesson 8: A closer look at Discernment | AI Fluency: Framework & Foundations Course. Explore theoretical concepts, ethical evaluation, practical prompting frameworks, and actionable AI implementation.",
      "order_index": 10,
      "duration": "5:23"
  },
  {
      "id": "topic-ai-11",
      "course_id": "course-ai-fluency",
      "title": "Lesson 10: A closer look at Diligence | AI Fluency: Framework & Foundations Course",
      "video_url": "https://www.youtube.com/watch?v=QbLf2zb3oPc",
      "start_playing_at": 0,
      "summary_text": "Structured AI curriculum: Lesson 10: A closer look at Diligence | AI Fluency: Framework & Foundations Course. Explore theoretical concepts, ethical evaluation, practical prompting frameworks, and actionable AI implementation.",
      "order_index": 11,
      "duration": "6:52"
  },
  {
      "id": "topic-ai-12",
      "course_id": "course-ai-fluency",
      "title": "Lesson 11: Conclusion | AI Fluency: Framework & Foundations Course",
      "video_url": "https://www.youtube.com/watch?v=ytEN_iAk09c",
      "start_playing_at": 0,
      "summary_text": "Structured AI curriculum: Lesson 11: Conclusion | AI Fluency: Framework & Foundations Course. Explore theoretical concepts, ethical evaluation, practical prompting frameworks, and actionable AI implementation.",
      "order_index": 12,
      "duration": "5:51"
  },
  {
    id: "topic-1",
    course_id: "course-1",
    title: "Modern JavaScript Variables & Scoping (let vs const)",
    video_url: "https://www.youtube.com/watch?v=W6NZfCO5SIk",
    start_playing_at: 0,
    summary_text: "Deep dive into `const`, `let`, and lexical scoping. Understand the difference between primitive value copying and reference pointers in JavaScript memory management.",
    order_index: 1,
    duration: "14:20",
  },
  {
    id: "topic-2",
    course_id: "course-1",
    title: "Arrow Functions, Closures, and Higher Order Functions",
    video_url: "https://www.youtube.com/watch?v=h33Srr5J9nY",
    start_playing_at: 0,
    summary_text: "Master arrow functions, lexical this binding, closures, map, filter, reduce, and currying patterns for functional programming.",
    order_index: 2,
    duration: "18:45",
  },
  {
    id: "topic-3",
    course_id: "course-1",
    title: "Asynchronous JavaScript: Promises & Async/Await",
    video_url: "https://www.youtube.com/watch?v=PoRJizFvM7s",
    start_playing_at: 0,
    summary_text: "Understand the JavaScript event loop, microtask queue, Promise lifecycle states, error handling with try/catch, and sequential vs parallel fetching.",
    order_index: 3,
    duration: "22:15",
  },
  {
    id: "topic-4",
    course_id: "course-2",
    title: "Python Data Analysis Setup with NumPy and Pandas",
    video_url: "https://www.youtube.com/watch?v=vmEHCJofslg",
    start_playing_at: 0,
    summary_text: "Setting up virtual environments, importing datasets, exploring DataFrame structures, handling missing values, and vector calculations.",
    order_index: 1,
    duration: "25:30",
  },
  {
    id: "topic-5",
    course_id: "course-3",
    title: "React 19 Server Components Architecture",
    video_url: "https://www.youtube.com/watch?v=T8TZQ6k4SLE",
    start_playing_at: 0,
    summary_text: "Comprehensive breakdown of React Server Components (RSC), hydration boundaries, and building responsive data-driven web applications.",
    order_index: 1,
    duration: "30:00",
  },
  {
    id: "topic-6",
    course_id: "course-4",
    title: "Arrays, Pointers, and Memory Allocation",
    video_url: "https://www.youtube.com/watch?v=RBSGKlAvoiM",
    start_playing_at: 0,
    summary_text: "Linear memory layout, pointer arithmetic, contiguous arrays vs linked representations, and Big-O runtime analysis.",
    order_index: 1,
    duration: "19:10",
  }
];
