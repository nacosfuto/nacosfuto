/**
 * @file courses.js
 * Official Course Curriculum Management Service for NACOS FUTO Portal.
 * Handles course listings, creation, updates, and level-restricted access.
 */

import { supabase } from './client.js';

const STORAGE_KEY_COURSES = 'nacos_courses_db';

export const SEED_COURSES = [
  // 100 Level - 1st Semester
  { 
    id: 'course-csc101',
    code: 'CSC 101', 
    title: 'Introduction to Computing Systems & Informatics', 
    units: 3, 
    level: 100, 
    semester: 'First Semester', 
    type: 'Core / Compulsory',
    lecturer: 'Dr. C. C. Nwokorie',
    office: 'Computer Science Dept Block B, Rm 104',
    prerequisites: 'None',
    description: 'Foundations of digital computing, number systems, computer architecture, algorithms, flowcharting, and introductory programming in C.',
    syllabus: [
      'History & Evolution of Electronic Computing Machines',
      'Binary Arithmetic, Logic Gates, and Boolean Algebra',
      'System Software vs Application Software Architectures',
      'Problem Formulation, Pseudocode, and Flowchart Modeling',
      'Basic C Syntax, Data Types, Control Structures, and Standard I/O'
    ]
  },
  { 
    id: 'course-mth101',
    code: 'MTH 101', 
    title: 'Elementary Mathematics I (Algebra & Trigonometry)', 
    units: 3, 
    level: 100, 
    semester: 'First Semester', 
    type: 'General / Faculty',
    lecturer: 'Dr. E. O. Opara',
    office: 'Mathematics Dept Block A, Rm 202',
    prerequisites: 'O-Level Mathematics',
    description: 'Set theory, quadratic equations, polynomial functions, mathematical induction, binomial theorem, trigonometric functions and complex numbers.',
    syllabus: [
      'Sets, Relations, Functions, and Binary Operations',
      'Surds, Indices, and Logarithms in Scientific Computation',
      'Quadratic Equations and Theory of Polynomial Roots',
      'De Moivre\'s Theorem and Complex Number Operations',
      'Circular Trigonometric Identities and Coordinate Geometry'
    ]
  },
  { 
    id: 'course-phy101',
    code: 'PHY 101', 
    title: 'General Physics I (Mechanics & Properties of Matter)', 
    units: 3, 
    level: 100, 
    semester: 'First Semester', 
    type: 'General / Faculty',
    lecturer: 'Prof. B. C. Eze',
    office: 'Physics Dept Lab Complex',
    prerequisites: 'O-Level Physics',
    description: 'Vectors, kinematics, Newton\'s laws of motion, rotational mechanics, gravitation, elasticity, fluid statics, and thermodynamics.',
    syllabus: [
      'Scalars, Vectors, and Dimensional Analysis',
      'Translational & Circular Motion Kinematics',
      'Work, Energy, Impulse, and Linear Momentum Conservation',
      'Elastic Properties of Solids and Fluid Dynamics',
      'Temperature Scales and Thermal Expansion Principles'
    ]
  },

  // 100 Level - 2nd Semester
  { 
    id: 'course-csc102',
    code: 'CSC 102', 
    title: 'Introduction to Problem Solving & Structured Programming', 
    units: 3, 
    level: 100, 
    semester: 'Second Semester', 
    type: 'Core / Compulsory',
    lecturer: 'Prof. G. A. Chukwudebe',
    office: 'Computer Science Dept Block B, Rm 108',
    prerequisites: 'CSC 101',
    description: 'Structured programming principles, functions, recursion, one-dimensional and multi-dimensional arrays, strings, and file handling in C.',
    syllabus: [
      'Modular Programming Paradigms and Function Signatures',
      'Recursion Principles and Call Stack Execution',
      'Single & Multi-dimensional Array Manipulation',
      'Pointers, Memory Allocation, and Dynamic Referencing',
      'File Input/Output Streams and Persistent Storage'
    ]
  },
  { 
    id: 'course-mth102',
    code: 'MTH 102', 
    title: 'Elementary Mathematics II (Calculus & Coordinate Geometry)', 
    units: 3, 
    level: 100, 
    semester: 'Second Semester', 
    type: 'General / Faculty',
    lecturer: 'Dr. E. O. Opara',
    office: 'Mathematics Dept Block A, Rm 202',
    prerequisites: 'MTH 101',
    description: 'Differential calculus, limits, continuity, derivative applications, definite and indefinite integrals, and conic sections.',
    syllabus: [
      'Limits, Continuity, and Derivative First Principles',
      'Product, Quotient, and Chain Rule Differentiation',
      'Curve Sketching, Optimization, Maxima and Minima',
      'Integration by Parts and Partial Fraction Substitutions',
      'Conic Sections: Parabola, Ellipse, and Hyperbola Equations'
    ]
  },

  // 200 Level - 1st Semester
  { 
    id: 'course-csc201',
    code: 'CSC 201', 
    title: 'Computer Programming I (Object-Oriented C++)', 
    units: 3, 
    level: 200, 
    semester: 'First Semester', 
    type: 'Core / Compulsory',
    lecturer: 'Dr. G. A. Chukwudebe',
    office: 'Computer Science Dept Block B, Rm 108',
    prerequisites: 'CSC 102',
    description: 'Object-oriented programming using C++, classes, object instantiation, constructor/destructor lifecycle, operator overloading, and memory management.',
    syllabus: [
      'C++ Classes, Encapsulation, and Access Specifiers',
      'Constructors, Destructors, and Deep Copy Semantics',
      'Operator Overloading and Friend Functions',
      'Single and Multiple Inheritance Hierarchies',
      'Virtual Functions, Runtime Polymorphism, and Dynamic Binding'
    ]
  },
  { 
    id: 'course-csc203',
    code: 'CSC 203', 
    title: 'Discrete Structures & Computational Logic', 
    units: 3, 
    level: 200, 
    semester: 'First Semester', 
    type: 'Core / Compulsory',
    lecturer: 'Prof. F. E. Onuodu',
    office: 'Computer Science Dept Block A, Rm 302',
    prerequisites: 'MTH 101',
    description: 'Propositional and predicate logic, set theory, mathematical induction, combinatorics, recurrence relations, and graph theory fundamentals.',
    syllabus: [
      'Propositional Logic, Truth Tables, and Equivalence',
      'Predicate Calculus and Quantifier Formulations',
      'Mathematical Induction and Well-Ordering Principle',
      'Permutations, Combinations, and Pigeonhole Principle',
      'Graph Theory: Trees, Eulerian Circuits, and Planarity'
    ]
  },

  // 200 Level - 2nd Semester
  { 
    id: 'course-csc202',
    code: 'CSC 202', 
    title: 'Computer Programming II (Enterprise Java & JVM)', 
    units: 3, 
    level: 200, 
    semester: 'Second Semester', 
    type: 'Core / Compulsory',
    lecturer: 'Dr. O. C. Aguboshim',
    office: 'Computer Science Dept Block B, Rm 112',
    prerequisites: 'CSC 201',
    description: 'Java programming language, JVM architecture, abstract classes, interfaces, generic collections, exception handling, and multithreading basics.',
    syllabus: [
      'Java Virtual Machine (JVM) and Memory Management Model',
      'Abstract Classes, Interfaces, and Multiple Inheritance Models',
      'Java Collections Framework (List, Map, Set, Queue)',
      'Checked vs Unchecked Exception Handling',
      'Java Concurrency, Thread Lifecycle, and Synchronization'
    ]
  },
  { 
    id: 'course-csc204',
    code: 'CSC 204', 
    title: 'Computer Organization & Assembly Language Programming', 
    units: 3, 
    level: 200, 
    semester: 'Second Semester', 
    type: 'Core / Compulsory',
    lecturer: 'Dr. M. I. Ezeh',
    office: 'Computer Science Dept Block B, Rm 105',
    prerequisites: 'CSC 101',
    description: 'Von Neumann computer architecture, CPU registers, ALU operations, instruction fetch-execute cycle, and assembly language programming.',
    syllabus: [
      'Von Neumann Architecture and Bus Interconnects',
      'Instruction Set Architecture (ISA) & Addressing Modes',
      'Assembly Language Programming on x86/ARM',
      'Interrupt Handling and Direct Memory Access (DMA)',
      'Memory Hierarchy, Cache Mapping, and Virtual Memory'
    ]
  },

  // 300 Level - 1st Semester
  { 
    id: 'course-csc301',
    code: 'CSC 301', 
    title: 'Structured System Programming & Linux Internals', 
    units: 3, 
    level: 300, 
    semester: 'First Semester', 
    type: 'Core / Compulsory',
    lecturer: 'Dr. C. C. Nwokorie',
    office: 'Computer Science Dept Block B, Rm 104',
    prerequisites: 'CSC 201',
    description: 'System calls, POSIX API, process spawning with fork/exec, inter-process communication, and file system internals.',
    syllabus: [
      'POSIX Standards and Kernel Space vs User Space Transitions',
      'Process Control, Spawning, and Daemon Processes',
      'Signals, Pipes, FIFO, and Shared Memory Inter-Process Comms',
      'Socket Programming and TCP/UDP Client-Server Daemons',
      'Memory Paging, Page Faults, and Linux VFS Drivers'
    ]
  },
  { 
    id: 'course-csc303',
    code: 'CSC 303', 
    title: 'Data Structures, Algorithms & Computational Complexity', 
    units: 3, 
    level: 300, 
    semester: 'First Semester', 
    type: 'Core / Compulsory',
    lecturer: 'Prof. F. E. Onuodu',
    office: 'Computer Science Dept Block A, Rm 302',
    prerequisites: 'CSC 201, CSC 203',
    description: 'Advanced data structures (AVL trees, Red-Black trees, Heaps, Hash Tables, Graphs), sorting algorithms, dynamic programming, and Big-O asymptotic analysis.',
    syllabus: [
      'Asymptotic Notation (Big-O, Omega, Theta) & Complexity Classes',
      'Self-Balancing Binary Search Trees (AVL & Red-Black Trees)',
      'Heap Data Structures and Priority Queue Applications',
      'Graph Search Algorithms (BFS, DFS, Dijkstra, Bellman-Ford)',
      'Dynamic Programming, Memoization, and Greedy Heuristics'
    ]
  },

  // 300 Level - 2nd Semester
  { 
    id: 'course-csc302',
    code: 'CSC 302', 
    title: 'Database Management Systems & Relational Theory', 
    units: 3, 
    level: 300, 
    semester: 'Second Semester', 
    type: 'Core / Compulsory',
    lecturer: 'Dr. (Mrs) C. U. Osuagwu',
    office: 'Computer Science Dept Block B, Rm 110',
    prerequisites: 'CSC 201',
    description: 'Relational model algebra, entity-relationship modeling, database normalization (1NF through BCNF), SQL queries, indexing, and transaction management.',
    syllabus: [
      'Relational Data Model, Tuple Relational Calculus, and Algebra',
      'Enhanced Entity-Relationship (EER) Schema Modeling',
      'Functional Dependencies and Normal Forms (1NF, 2NF, 3NF, BCNF)',
      'Complex SQL Joins, Aggregations, Views, and Triggers',
      'ACID Properties, Concurrency Schedules, and 2-Phase Locking'
    ]
  },
  { 
    id: 'course-csc308',
    code: 'CSC 308', 
    title: 'Web Technologies & Internet Programming', 
    units: 3, 
    level: 300, 
    semester: 'Second Semester', 
    type: 'Departmental Elective',
    lecturer: 'Tech Director (NACOS)',
    office: 'NACOS Innovation Secretariat',
    prerequisites: 'CSC 202',
    description: 'Full-stack web application development, HTTP/HTTPS protocols, RESTful API architecture, modern React components, authentication, and state management.',
    syllabus: [
      'HTTP/2 Protocol Lifecycles, Headers, and CORS Policies',
      'Modern Component-Driven UI Engineering with React',
      'REST API Design, JSON Payloads, and Middleware Handlers',
      'JWT Authentication, Session Storage, and Security Best Practices',
      'Cloud Deployment, CI/CD, and Serverless Edge Functions'
    ]
  },

  // 400 Level - 1st Semester
  { 
    id: 'course-csc401',
    code: 'CSC 401', 
    title: 'Software Engineering Methodologies & Architecture', 
    units: 3, 
    level: 400, 
    semester: 'First Semester', 
    type: 'Core / Compulsory',
    lecturer: 'Dr. G. A. Chukwudebe',
    office: 'Computer Science Dept Block B, Rm 108',
    prerequisites: 'CSC 307',
    description: 'Software lifecycle models, Agile/Scrum sprints, UML architectural design, design patterns (Gang of Four), automated CI testing, and technical documentation.',
    syllabus: [
      'Agile Manifesto, Scrum Framework, and User Story Mapping',
      'UML Class, Sequence, State Machine, and Activity Diagrams',
      'Creational, Structural, and Behavioral Design Patterns',
      'Automated Unit Testing, Test-Driven Development (TDD), and CI/CD',
      'Software Quality Metrics, Code Refactoring, and Architecture Debt'
    ]
  },

  // 400 Level - 2nd Semester (SIWES)
  { 
    id: 'course-csc400',
    code: 'CSC 400', 
    title: 'Students Industrial Work Experience Scheme (SIWES II)', 
    units: 6, 
    level: 400, 
    semester: 'Second Semester', 
    type: 'Industrial Training',
    lecturer: 'SIWES Coordinator',
    office: 'Departmental Industrial Liaison Office',
    prerequisites: 'Completion of 300L Coursework',
    description: 'Mandatory 6-month continuous industrial attachment in accredited tech enterprise or computing firm. Assessment via logbook appraisal, industrial visitation, and departmental technical defense presentation.',
    syllabus: [
      'Industry Attachment Logbook Maintenance and Daily Entries',
      'Mid-Attachment Supervisory Field Inspection by FUTO Faculty',
      'Industrial Technical Defense Seminar and Oral Presentation',
      'Comprehensive Bound Industrial Technical Report Submission'
    ]
  },

  // 500 Level - 1st Semester
  { 
    id: 'course-csc501',
    code: 'CSC 501', 
    title: 'Computer Graphics & Interactive Visual Systems', 
    units: 3, 
    level: 500, 
    semester: 'First Semester', 
    type: 'Core / Compulsory',
    lecturer: 'Prof. F. E. Onuodu',
    office: 'Computer Science Dept Block A, Rm 302',
    prerequisites: 'CSC 201, MTH 201',
    description: 'Rasterization algorithms, 2D/3D affine transformations, viewing pipelines, projection matrices, hidden surface removal, shading models, and modern GPU rendering with OpenGL/WebGL.',
    syllabus: [
      'Bresenham\'s Line and Midpoint Circle Scan Conversion',
      '2D/3D Homogeneous Coordinate Transformation Matrices',
      'Perspective and Orthographic Viewing Frustums',
      'Z-Buffering, BSP Trees, and Back-Face Culling Techniques',
      'Phong Illumination Model, Shaders, and WebGL Pipeline'
    ]
  },
  { 
    id: 'course-csc503',
    code: 'CSC 503', 
    title: 'Distributed Systems & Cloud Computing Architectures', 
    units: 3, 
    level: 500, 
    semester: 'First Semester', 
    type: 'Core / Compulsory',
    lecturer: 'Dr. C. C. Nwokorie',
    office: 'Computer Science Dept Block B, Rm 104',
    prerequisites: 'CSC 305, CSC 306',
    description: 'Distributed system architectures, RPC/gRPC protocols, Lamport logical clocks, Raft/Paxos consensus, CAP theorem, microservices decomposition, and cloud serverless computing.',
    syllabus: [
      'Characterization of Distributed Systems & Fallacies',
      'gRPC, Protocol Buffers, and Remote Procedure Calls',
      'Logical Time, Vector Clocks, and Mutual Exclusion Algorithms',
      'Consensus Protocols: Paxos, Raft, and Byzantine Fault Tolerance',
      'CAP Theorem, BASE Model, and Cloud Native Microservices'
    ]
  },
  { 
    id: 'course-csc505',
    code: 'CSC 505', 
    title: 'Artificial Intelligence & Intelligent Agents', 
    units: 3, 
    level: 500, 
    semester: 'First Semester', 
    type: 'Departmental Elective',
    lecturer: 'Dr. O. C. Aguboshim',
    office: 'Computer Science Dept Block B, Rm 112',
    prerequisites: 'CSC 203, MTH 311',
    description: 'Intelligent agent architectures, uninformed and informed heuristic search (A*, IDA*), adversarial minimax search with alpha-beta pruning, constraint satisfaction problems, and machine learning foundations.',
    syllabus: [
      'PEAS Agent Formulations and Rational Agent Typologies',
      'Heuristic Search Strategies: Greedy Best-First and A* Search',
      'Game Playing: Minimax Algorithm and Alpha-Beta Pruning',
      'Constraint Satisfaction Problems (CSP) and Backtracking',
      'Knowledge Representation, First-Order Logic, and Inference'
    ]
  },

  // 500 Level - 2nd Semester
  { 
    id: 'course-csc502',
    code: 'CSC 502', 
    title: 'Human-Computer Interaction (HCI) & User Experience', 
    units: 3, 
    level: 500, 
    semester: 'Second Semester', 
    type: 'Core / Compulsory',
    lecturer: 'Prof. G. A. Chukwudebe',
    office: 'Computer Science Dept Block B, Rm 108',
    prerequisites: 'CSC 401',
    description: 'Cognitive models of human-computer interaction, mental models, Norman\'s action cycles, Nielsen\'s 10 usability heuristics, accessibility guidelines (WCAG), wireframing, and usability testing.',
    syllabus: [
      'Cognitive Psychology Foundations and Human Information Processing',
      'Norman\'s Interaction Design Principles and Affordances',
      'Nielsen\'s Usability Heuristics and Expert Heuristic Evaluation',
      'Low-Fidelity Prototyping vs High-Fidelity UI Wireframes',
      'Quantitative Usability Testing, Eye-Tracking, and SUS Scoring'
    ]
  },
  { 
    id: 'course-csc599',
    code: 'CSC 599', 
    title: 'Final Year Capstone Research Project & Defense', 
    units: 6, 
    level: 500, 
    semester: 'Second Semester', 
    type: 'Capstone Project',
    lecturer: 'Assigned Project Supervisor & External Examiner Panel',
    office: 'Computer Science Departmental Research Committee',
    prerequisites: 'Completion of all 100L-400L Core Requirements',
    description: 'Individual research and full software engineering implementation solving a significant computing problem. Final examination includes software demonstration, oral defense before an external professor panel, and submission of hardbound thesis.',
    syllabus: [
      'Problem Formulation, Research Hypotheses, and Literature Review',
      'System Architecture Design, Data Modeling, and Implementation',
      'Empirical Verification, Performance Benchmarking, and Analysis',
      'Oral Capstone Defense before Departmental & External Examiners',
      'Hardbound Project Dissertation Final Archival Submission'
    ]
  }
];

/**
 * Retrieve courses from local store or seed
 */
export function getLocalCourses() {
  if (typeof window === 'undefined') return [...SEED_COURSES];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COURSES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_COURSES, JSON.stringify(SEED_COURSES));
      return [...SEED_COURSES];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...SEED_COURSES];
  } catch (e) {
    return [...SEED_COURSES];
  }
}

/**
 * Save courses to local store and dispatch update event
 */
export function saveLocalCourses(courses) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_COURSES, JSON.stringify(courses));
    window.dispatchEvent(new Event('nacos_courses_updated'));
  } catch (e) {
    console.warn('Failed to save courses locally:', e);
  }
}

/**
 * Fetch courses with optional level, semester, and search filters
 */
export async function fetchCourses(options = {}) {
  const { level = null, semester = null, search = '' } = options;

  // 1. Try Supabase if available
  try {
    if (supabase) {
      let query = supabase.from('courses').select('id, code, title, units, level, semester, type, lecturer, office, prerequisites, description, syllabus').order('code', { ascending: true });
      if (level) {
        const cleanLevel = parseInt(String(level).replace(/[^0-9]/g, ''), 10);
        if (!isNaN(cleanLevel)) query = query.eq('level', cleanLevel);
      }
      if (semester) {
        query = query.ilike('semester', `%${semester}%`);
      }
      const { data, error } = await query;
      if (!error && Array.isArray(data) && data.length > 0) {
        let results = data;
        if (search && search.trim()) {
          const q = search.toLowerCase();
          results = results.filter(c => 
            (c.code || '').toLowerCase().includes(q) ||
            (c.title || '').toLowerCase().includes(q) ||
            (c.lecturer || '').toLowerCase().includes(q)
          );
        }
        return { data: results, error: null };
      }
    }
  } catch (e) {
    // Fall back to local store
  }

  // 2. Local fallback
  let list = getLocalCourses();

  if (level) {
    const cleanLevel = parseInt(String(level).replace(/[^0-9]/g, ''), 10);
    if (!isNaN(cleanLevel)) {
      list = list.filter(c => Number(c.level) === cleanLevel);
    }
  }

  if (semester) {
    const s = semester.toLowerCase();
    list = list.filter(c => (c.semester || '').toLowerCase().includes(s));
  }

  if (search && search.trim()) {
    const q = search.toLowerCase();
    list = list.filter(c => 
      (c.code || '').toLowerCase().includes(q) ||
      (c.title || '').toLowerCase().includes(q) ||
      (c.lecturer || '').toLowerCase().includes(q)
    );
  }

  return { data: list, error: null };
}

/**
 * Admin: Create a new course
 */
export async function adminCreateCourse(courseData) {
  const id = 'course-' + (courseData.code || Date.now()).toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanLevel = parseInt(String(courseData.level || 100).replace(/[^0-9]/g, ''), 10) || 100;
  const cleanUnits = parseInt(courseData.units, 10) || 3;

  const newCourse = {
    id,
    code: String(courseData.code || '').trim().toUpperCase(),
    title: String(courseData.title || '').trim(),
    units: cleanUnits,
    level: cleanLevel,
    semester: courseData.semester || 'First Semester',
    type: courseData.type || 'Core / Compulsory',
    lecturer: courseData.lecturer || 'Faculty Lecturer',
    office: courseData.office || 'Computer Science Department',
    prerequisites: courseData.prerequisites || 'None',
    description: courseData.description || '',
    syllabus: Array.isArray(courseData.syllabus) 
      ? courseData.syllabus 
      : typeof courseData.syllabus === 'string'
        ? courseData.syllabus.split('\n').map(s => s.trim()).filter(Boolean)
        : [],
    created_at: new Date().toISOString()
  };

  const current = getLocalCourses();
  // Prevent duplicate course codes
  const exists = current.findIndex(c => c.code === newCourse.code);
  if (exists !== -1) {
    current[exists] = { ...current[exists], ...newCourse };
  } else {
    current.push(newCourse);
  }

  saveLocalCourses(current);

  try {
    if (supabase) {
      await supabase.from('courses').upsert([newCourse]);
    }
  } catch (e) {}

  return { success: true, data: newCourse };
}

/**
 * Admin: Update an existing course
 */
export async function adminUpdateCourse(id, updates = {}) {
  const current = getLocalCourses();
  const index = current.findIndex(c => c.id === id || c.code === id);
  if (index === -1) return { success: false, error: 'Course not found' };

  if (updates.units) updates.units = parseInt(updates.units, 10) || current[index].units;
  if (updates.level) updates.level = parseInt(String(updates.level).replace(/[^0-9]/g, ''), 10) || current[index].level;
  if (typeof updates.syllabus === 'string') {
    updates.syllabus = updates.syllabus.split('\n').map(s => s.trim()).filter(Boolean);
  }

  current[index] = {
    ...current[index],
    ...updates,
    updated_at: new Date().toISOString()
  };

  saveLocalCourses(current);

  try {
    if (supabase) {
      await supabase.from('courses').update(updates).eq('id', id);
    }
  } catch (e) {}

  return { success: true, data: current[index] };
}

/**
 * Admin: Delete a course
 */
export async function adminDeleteCourse(id) {
  const current = getLocalCourses();
  const filtered = current.filter(c => c.id !== id && c.code !== id);
  saveLocalCourses(filtered);

  try {
    if (supabase) {
      const isUuid = /^[0-9a-fA-F-]{36}$/.test(String(id || '').trim());
      if (isUuid) {
        await supabase.from('courses').delete().or(`id.eq.${id},code.eq.${id}`);
      } else {
        await supabase.from('courses').delete().eq('code', id);
      }
    }
  } catch (e) {}

  return { success: true };
}
