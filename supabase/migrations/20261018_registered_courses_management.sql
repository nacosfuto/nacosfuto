-- =============================================================================
-- NACOS FUTO: Registered Courses Management System Migration
-- Database-driven registered courses, academic session & semester integration,
-- and dynamic cohort progression course visibility.
-- =============================================================================

-- 1. Ensure Table Structure for public.courses
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(20) NOT NULL,
  title TEXT NOT NULL,
  credit_units INTEGER NOT NULL DEFAULT 3,
  level TEXT NOT NULL,
  semester TEXT NOT NULL,
  academic_session VARCHAR(50) NOT NULL DEFAULT '2026/2027',
  course_type VARCHAR(50) DEFAULT 'Core / Compulsory',
  lecturer_name TEXT,
  office TEXT,
  prerequisites TEXT DEFAULT 'None',
  description TEXT,
  syllabus TEXT,
  is_elective BOOLEAN DEFAULT false,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Add any missing columns to public.courses safely
DO $$
BEGIN
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS code VARCHAR(20);
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS title TEXT;
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS credit_units INTEGER DEFAULT 3;
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS level TEXT;
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS semester TEXT;
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS academic_session VARCHAR(50) DEFAULT '2026/2027';
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS course_type VARCHAR(50) DEFAULT 'Core / Compulsory';
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS lecturer_name TEXT;
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS office TEXT;
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS prerequisites TEXT DEFAULT 'None';
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS description TEXT;
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS syllabus TEXT;
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_elective BOOLEAN DEFAULT false;
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS created_by TEXT;
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

  -- Ensure existing courses have academic_session populated
  UPDATE public.courses SET academic_session = '2026/2027' WHERE academic_session IS NULL OR trim(academic_session) = '';

  -- Safely drop old single-column unique constraint on code if present
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'courses_code_key'
  ) THEN
    ALTER TABLE public.courses DROP CONSTRAINT courses_code_key;
  END IF;

  -- Add composite unique constraint allowing course code to appear across different sessions/semesters/levels
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_courses_code_session_semester_level'
  ) THEN
    ALTER TABLE public.courses 
      ADD CONSTRAINT uq_courses_code_session_semester_level 
      UNIQUE (code, academic_session, semester, level);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. High Performance Indices for Courses
CREATE INDEX IF NOT EXISTS idx_courses_session_level_sem 
  ON public.courses (academic_session, level, semester);

CREATE INDEX IF NOT EXISTS idx_courses_code 
  ON public.courses (code);

-- 4. Extend public.academic_settings with current_semester
ALTER TABLE public.academic_settings 
  ADD COLUMN IF NOT EXISTS current_semester TEXT NOT NULL DEFAULT 'First Semester';

-- 5. Row Level Security Policies for Courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read courses" ON public.courses;
CREATE POLICY "Public read courses" ON public.courses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage courses" ON public.courses;
CREATE POLICY "Admins manage courses" ON public.courses FOR ALL USING (true);

-- 6. Seed accredited FUTO Computer Science curriculum for active & recent sessions
-- Using ON CONFLICT (code, academic_session, semester, level) DO NOTHING to preserve custom additions.
INSERT INTO public.courses (code, title, credit_units, level, semester, academic_session, course_type, lecturer_name, office, prerequisites, description, syllabus)
VALUES
  -- 100 Level - 2026/2027
  ('CSC 101', 'Introduction to Computing Systems & Informatics', 3, '100 Level', 'First Semester', '2026/2027', 'Core / Compulsory', 'Dr. C. C. Nwokorie', 'Computer Science Dept Block B, Rm 104', 'None', 'Foundations of digital computing, number systems, computer architecture, algorithms, and introductory C.', 'History of Computing\nBinary Arithmetic & Boolean Logic\nSystem vs Application Software\nAlgorithms & Flowcharts\nIntroduction to C Programming'),
  ('MTH 101', 'Elementary Mathematics I (Algebra & Trigonometry)', 3, '100 Level', 'First Semester', '2026/2027', 'General / Faculty', 'Dr. E. O. Opara', 'Mathematics Dept Block A, Rm 202', 'O-Level Mathematics', 'Set theory, quadratic equations, polynomial functions, mathematical induction, binomial theorem, and trigonometry.', 'Sets, Relations & Functions\nSurds, Indices & Logarithms\nQuadratic Equations\nDe Moivre Theorem\nTrigonometric Identities'),
  ('PHY 101', 'General Physics I (Mechanics & Matter)', 3, '100 Level', 'First Semester', '2026/2027', 'General / Faculty', 'Prof. B. C. Eze', 'Physics Dept Lab Complex', 'O-Level Physics', 'Vectors, kinematics, Newton laws of motion, rotational mechanics, gravitation, elasticity, and fluids.', 'Dimensional Analysis\nKinematics & Dynamics\nWork, Energy & Momentum\nElasticity & Fluid Statics\nThermal Expansion'),
  ('CSC 102', 'Introduction to Problem Solving & Structured Programming', 3, '100 Level', 'Second Semester', '2026/2027', 'Core / Compulsory', 'Prof. G. A. Chukwudebe', 'Computer Science Dept Block B, Rm 108', 'CSC 101', 'Structured programming principles, functions, recursion, one-dimensional and multi-dimensional arrays, and strings in C.', 'Modular Programming\nRecursion Principles\nArrays & Pointers\nDynamic Memory Allocation\nFile Input/Output Streams'),
  ('MTH 102', 'Elementary Mathematics II (Calculus)', 3, '100 Level', 'Second Semester', '2026/2027', 'General / Faculty', 'Dr. E. O. Opara', 'Mathematics Dept Block A, Rm 202', 'MTH 101', 'Differential calculus, limits, continuity, derivative applications, definite and indefinite integrals.', 'Limits & Continuity\nDifferentiation Rules\nCurve Sketching & Optimization\nIntegration Techniques\nConic Sections'),

  -- 200 Level - 2026/2027
  ('CSC 201', 'Computer Programming I (Object-Oriented C++)', 3, '200 Level', 'First Semester', '2026/2027', 'Core / Compulsory', 'Dr. G. A. Chukwudebe', 'Computer Science Dept Block B, Rm 108', 'CSC 102', 'Object-oriented programming using C++, classes, object instantiation, lifecycle, and memory management.', 'C++ Classes & Encapsulation\nConstructors & Destructors\nOperator Overloading\nInheritance & Polymorphism\nTemplates & STL Basics'),
  ('CSC 203', 'Discrete Structures & Computational Logic', 3, '200 Level', 'First Semester', '2026/2027', 'Core / Compulsory', 'Prof. F. E. Onuodu', 'Computer Science Dept Block A, Rm 302', 'MTH 101', 'Propositional and predicate logic, set theory, induction, combinatorics, recurrence relations, and graph theory.', 'Propositional Logic & Truth Tables\nPredicate Calculus\nMathematical Induction\nCombinatorics\nGraph Theory Fundamentals'),
  ('CSC 202', 'Computer Programming II (Enterprise Java & JVM)', 3, '200 Level', 'Second Semester', '2026/2027', 'Core / Compulsory', 'Dr. O. C. Aguboshim', 'Computer Science Dept Block B, Rm 112', 'CSC 201', 'Java programming language, JVM architecture, abstract classes, interfaces, generic collections, and multithreading.', 'JVM Architecture & Memory\nInterfaces & Abstract Classes\nJava Collections Framework\nException Handling\nMultithreading & Concurrency'),
  ('CSC 204', 'Computer Organization & Assembly Language', 3, '200 Level', 'Second Semester', '2026/2027', 'Core / Compulsory', 'Dr. M. I. Ezeh', 'Computer Science Dept Block B, Rm 105', 'CSC 101', 'Von Neumann computer architecture, CPU registers, ALU operations, instruction cycles, and assembly programming.', 'Von Neumann Architecture\nInstruction Set Architecture\nAssembly Language Programming\nInterrupt Handling\nMemory Hierarchy & Caching'),

  -- 300 Level - 2026/2027
  ('CSC 301', 'Structured System Programming & Linux Internals', 3, '300 Level', 'First Semester', '2026/2027', 'Core / Compulsory', 'Dr. C. C. Nwokorie', 'Computer Science Dept Block B, Rm 104', 'CSC 201', 'System calls, POSIX API, process spawning, IPC, and file system internals.', 'POSIX Standards\nProcess Control (fork/exec)\nSignals, Pipes & IPC\nSocket Programming\nVirtual Memory Management'),
  ('CSC 303', 'Data Structures, Algorithms & Computational Complexity', 3, '300 Level', 'First Semester', '2026/2027', 'Core / Compulsory', 'Prof. F. E. Onuodu', 'Computer Science Dept Block A, Rm 302', 'CSC 201', 'Advanced data structures (AVL trees, Red-Black trees, Heaps, Hash Tables, Graphs), sorting, and asymptotic analysis.', 'Big-O Asymptotic Complexity\nSelf-Balancing Binary Trees\nHeaps & Priority Queues\nGraph Traversal (BFS/DFS/Dijkstra)\nDynamic Programming'),
  ('CSC 302', 'Database Management Systems & Relational Theory', 3, '300 Level', 'Second Semester', '2026/2027', 'Core / Compulsory', 'Dr. (Mrs) C. U. Osuagwu', 'Computer Science Dept Block B, Rm 110', 'CSC 201', 'Relational algebra, EER modeling, normalization (1NF-BCNF), SQL queries, indexing, and transactions.', 'Relational Model & Algebra\nEER Modeling\nDatabase Normalization (1NF to BCNF)\nAdvanced SQL Queries & Views\nACID Transactions & Concurrency'),
  ('CSC 308', 'Web Technologies & Internet Programming', 3, '300 Level', 'Second Semester', '2026/2027', 'Departmental Elective', 'NACOS Tech Directorate', 'NACOS Innovation Secretariat', 'CSC 202', 'Full-stack web application development, HTTP/HTTPS, RESTful API architecture, React components, and state management.', 'HTTP/2 Protocol Lifecycles\nModern React UI Architecture\nREST API Design & Security\nAuthentication & Authorization\nCloud Deployment & CI/CD'),

  -- 400 Level - 2026/2027
  ('CSC 401', 'Software Engineering Methodologies & Architecture', 3, '400 Level', 'First Semester', '2026/2027', 'Core / Compulsory', 'Dr. G. A. Chukwudebe', 'Computer Science Dept Block B, Rm 108', 'CSC 307', 'Software lifecycle models, Agile/Scrum, UML architectural design, design patterns, and automated CI testing.', 'Agile & Scrum Frameworks\nUML Modeling & Architecture\nSoftware Design Patterns\nAutomated Unit & Integration Testing\nCode Quality & Refactoring'),
  ('CSC 400', 'Students Industrial Work Experience Scheme (SIWES II)', 6, '400 Level', 'Second Semester', '2026/2027', 'Industrial Training', 'SIWES Coordinator', 'Industrial Liaison Office', 'Completion of 300L', 'Mandatory 6-month continuous industrial attachment in accredited computing enterprise or software firm.', 'Logbook Maintenance & Daily Reports\nMid-Term Industrial Supervisory Inspection\nTechnical Defense & Oral Seminar\nComprehensive Bound Report Submission'),

  -- 500 Level - 2026/2027
  ('CSC 501', 'Computer Graphics & Interactive Visual Systems', 3, '500 Level', 'First Semester', '2026/2027', 'Core / Compulsory', 'Prof. F. E. Onuodu', 'Computer Science Dept Block A, Rm 302', 'CSC 201', 'Rasterization algorithms, 2D/3D affine transformations, projection matrices, shading models, and modern WebGL.', 'Rasterization & Scan Conversion\n2D/3D Affine Transformations\nViewing Frustums & Projections\nZ-Buffering & Shading Models\nModern GPU Pipeline & WebGL'),
  ('CSC 503', 'Distributed Systems & Cloud Architectures', 3, '500 Level', 'First Semester', '2026/2027', 'Core / Compulsory', 'Dr. C. C. Nwokorie', 'Computer Science Dept Block B, Rm 104', 'CSC 301', 'Distributed systems, RPC/gRPC, logical clocks, consensus protocols (Raft/Paxos), and cloud computing.', 'Distributed Systems Architecture\nRPC & gRPC Protocols\nLogical Clocks & Mutual Exclusion\nConsensus Algorithms (Raft/Paxos)\nMicroservices & Cloud Native'),
  ('CSC 505', 'Artificial Intelligence & Intelligent Agents', 3, '500 Level', 'First Semester', '2026/2027', 'Departmental Elective', 'Dr. O. C. Aguboshim', 'Computer Science Dept Block B, Rm 112', 'CSC 203', 'Intelligent agent architectures, heuristic search (A*), minimax adversarial search, and machine learning foundations.', 'Agent Typologies & Environments\nInformed & Heuristic Search (A*)\nMinimax & Alpha-Beta Pruning\nKnowledge Representation\nIntroduction to Machine Learning'),
  ('CSC 502', 'Human-Computer Interaction (HCI) & UX Design', 3, '500 Level', 'Second Semester', '2026/2027', 'Core / Compulsory', 'Prof. G. A. Chukwudebe', 'Computer Science Dept Block B, Rm 108', 'CSC 401', 'Cognitive models of human-computer interaction, usability heuristics, accessibility guidelines, and user testing.', 'Cognitive Psychology & Interaction Models\nNielsen Usability Heuristics\nWireframing & UI Prototyping\nQuantitative Usability Testing\nAccessibility Standards (WCAG)'),
  ('CSC 599', 'Final Year Capstone Research Project & Defense', 6, '500 Level', 'Second Semester', '2026/2027', 'Capstone Project', 'Departmental Project Committee', 'Computer Science Secretariat', 'Completion of 100L-400L', 'Individual capstone research solving a computing problem with software demo and thesis defense.', 'Problem Formulation & Literature Review\nSystem Architecture & Implementation\nEmpirical Verification & Testing\nOral Capstone Defense Presentation\nHardbound Project Dissertation Archival')
ON CONFLICT (code, academic_session, semester, level) DO NOTHING;
