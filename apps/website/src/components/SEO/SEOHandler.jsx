import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ROUTE_SEO_MAP = {
  '/': {
    title: 'NACOS FUTO | Department of Computer Science - Federal University of Technology Owerri',
    description: 'Official portal and website of the Department of Computer Science and NACOS, Federal University of Technology Owerri (FUTO). Discover degree curricula, student innovations, and departmental resources.'
  },
  '/about': {
    title: 'About Department of Computer Science | NACOS FUTO',
    description: 'Learn about the history, vision, mission, and academic leadership of the Department of Computer Science at Federal University of Technology Owerri.'
  },
  '/about/nacos-executives': {
    title: 'NACOS Executive Council | Department of Computer Science FUTO',
    description: 'Meet the executive leaders and department officers driving innovation, student welfare, and technological advancement in NACOS FUTO.'
  },
  '/about/administration': {
    title: 'Administration & Faculty Staff | Department of Computer Science FUTO',
    description: 'Discover the distinguished faculty professors, lecturers, and academic heads guiding computing research and education at FUTO.'
  },
  '/about/calendar': {
    title: 'Academic Calendar & Schedule | FUTO Computer Science',
    description: 'View the official university and departmental academic calendar, semester timetables, lecture periods, and examination dates.'
  },
  '/about/gallery': {
    title: 'Department Gallery & Campus Memories | NACOS FUTO',
    description: 'Photo archive and media showcase celebrating student projects, tech conferences, hackathons, and departmental traditions at FUTO.'
  },
  '/about/alumni': {
    title: 'Alumni Network & Global Tech Fellowship | NACOS FUTO',
    description: 'Connect with over 5,000+ FUTO Computer Science alumni leading software engineering, cloud architectures, and ventures worldwide.'
  },
  '/academics': {
    title: 'Academic Programs & Curriculum | Department of Computer Science FUTO',
    description: 'Comprehensive degree information for undergraduate B.Tech, Postgraduate PGD, M.Sc, and Ph.D in Computer Science at FUTO.'
  },
  '/programs': {
    title: 'Computing Degree Programs & Syllabi | FUTO Computer Science',
    description: 'Explore undergraduate and postgraduate specialization tracks in Software Engineering, Artificial Intelligence, Cybersecurity, and Data Science.'
  },
  '/admissions': {
    title: 'Admissions & Study Computer Science | FUTO Admissions Gateway',
    description: 'Official entry requirements, UTME cut-off marks, Direct Entry processes, and admissions guidelines for FUTO Computer Science.'
  },
  '/how-to-apply': {
    title: 'How to Apply for Computer Science | FUTO Admissions Guide',
    description: 'Step-by-step instructions on applying for undergraduate and postgraduate admission into FUTO Department of Computer Science.'
  },
  '/admission-requirements': {
    title: 'Undergraduate Admission Requirements | FUTO Computer Science',
    description: 'O-Level subject combinations, JAMB requirements, and screening criteria for Computer Science at FUTO.'
  },
  '/tuition-fees': {
    title: 'School Fees & Departmental Dues Schedule | FUTO Computer Science',
    description: 'Transparent guide to university school fees, departmental dues, and payment procedures for FUTO Computer Science scholars.'
  },
  '/news': {
    title: 'Department News, Announcements & Tech Blog | NACOS FUTO',
    description: 'Stay updated with the latest research milestones, accreditation news, departmental updates, and student achievements at FUTO.'
  },
  '/events': {
    title: 'Upcoming Events, Hackathons & Tech Conferences | NACOS FUTO',
    description: 'Register for upcoming computing conferences, coding bootcamps, annual tech week, and industry masterclasses at FUTO.'
  },
  '/resources': {
    title: 'Academic Course Materials, Syllabi & Past Questions | NACOS FUTO',
    description: 'Download verified Computer Science lecture notes, course outlines, past examination questions, and software development resources.'
  },
  '/research': {
    title: 'Computing Research, Labs & Publications | FUTO Computer Science',
    description: 'Discover faculty and student research papers in Artificial Intelligence, Distributed Systems, Cryptography, and Cloud Computing.'
  },
  '/clubs': {
    title: 'Campus Tech Clubs & Developer Communities | NACOS FUTO',
    description: 'Join active student tech clubs including Google Developer Groups, AWS Student Builders, Genesys Tech Club, and FTC at FUTO.'
  },
  '/campus-clubs': {
    title: 'Student Communities & Tech Ecosystem | NACOS FUTO',
    description: 'Explore peer communities, open-source cohorts, and innovation societies across FUTO.'
  },
  '/yellow-pages': {
    title: 'NACOS Yellow Pages | Student Tech, Freelance & Business Directory',
    description: 'Directory of verified student-led tech enterprises, software developers, UI/UX designers, gadget technicians, and campus vendors.'
  },
  '/students': {
    title: 'Student Life, Societies & Campus Experience | NACOS FUTO',
    description: 'Experience campus life, peer mentorship, tech culture, and student welfare initiatives at FUTO Computer Science.'
  },
  '/health-services': {
    title: 'Health, Safety & Campus Medical Support | FUTO Computer Science',
    description: 'Important health guidelines, emergency contacts, university medical centre information, and student wellness resources.'
  },
  '/contact': {
    title: 'Contact Secretariat & Department Office | NACOS FUTO',
    description: 'Get in touch with the Head of Department, NACOS Secretariat, academic advisors, and student support representatives.'
  },
  '/faqs': {
    title: 'Frequently Asked Questions (FAQs) | NACOS FUTO',
    description: 'Answers to common questions regarding course registration, clearance, student portal access, departmental dues, and student life.'
  }
};

const BASE_DOMAIN = 'https://nacosfuto.com';

export default function SEOHandler() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname.replace(/\/+$/, '') || '/';
    const config = ROUTE_SEO_MAP[path] || {
      title: `${path.split('/').filter(Boolean).map(s => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ')).join(' - ') || 'Page'} | NACOS FUTO`,
      description: 'Official portal and website of the Department of Computer Science and NACOS, Federal University of Technology Owerri (FUTO).'
    };

    // 1. Update Document Title
    document.title = config.title;

    // 2. Update Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = config.description;

    // 3. Update Canonical Link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = `${BASE_DOMAIN}${path}`;

    // 4. Update Open Graph Meta Tags
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.content = config.title;

    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.content = config.description;

    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.content = `${BASE_DOMAIN}${path}`;

    // 5. Update Twitter Meta Tags
    let twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) twitterTitle.content = config.title;

    let twitterDesc = document.querySelector('meta[name="twitter:description"]');
    if (twitterDesc) twitterDesc.content = config.description;
  }, [location.pathname]);

  return null;
}
