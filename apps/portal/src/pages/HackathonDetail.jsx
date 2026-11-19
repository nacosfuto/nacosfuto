import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  MapPin, 
  ArrowRight, 
  CheckCircle, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  Laptop,
  Users,
  Code
} from 'lucide-react';
import confetti from 'canvas-confetti';
import HackathonNavbar from '../components/HackathonNavbar';
import Footer from '../components/Footer';
import { HACKATHONS } from '../data/hackathons';

const HackathonDetail = () => {
  const hackathon = HACKATHONS[0]; // The Agentic Build
  const [copied, setCopied] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    confetti({
      particleCount: 35,
      spread: 60,
      origin: { y: 0.8 }
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#041801] text-gray-900 dark:text-white font-sans selection:bg-[#138601] selection:text-white transition-colors duration-200">
      
      {/* Top Navbar: Only Logo and Register Button */}
      <HackathonNavbar />

      {/* ─── HERO SECTION: DIRECT RETRO-DIGITAL INSPIRATION FROM FLYER ─── */}
      <section id="theme" className="relative pt-8 pb-16 md:pt-12 md:pb-20 overflow-hidden border-b border-gray-200 dark:border-[#138601]/25">
        
        {/* Subtle Pixel Dot Pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.05] dark:opacity-[0.12]" 
             style={{
               backgroundImage: `radial-gradient(#138601 1.5px, transparent 1.5px)`,
               backgroundSize: '24px 24px'
             }}>
        </div>

        <div className="site-container relative z-10">
          
          {/* Top Header Text in Glitch Font (Just text, no icons) */}
          <div className="text-center mb-8">
            <h2 className="font-['Rubik_Glitch',_'Silkscreen',_cursive] text-2xl sm:text-3xl md:text-4xl tracking-widest text-gray-950 dark:text-amber-400 uppercase select-none">
              NACOS FUTO
            </h2>
          </div>

          {/* ─── RETRO OS WINDOW HERO CARD ─── */}
          <div className="relative mx-auto max-w-4xl">
            
            {/* The Window Container */}
            <div className="relative rounded-lg overflow-visible bg-white dark:bg-[#072402] border-[3px] border-gray-900 dark:border-[#138601] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_#138601]">
              
              {/* Window Header Bar (Vibrant Cyber Amber / Gold) */}
              <div className="bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 border-b-[3px] border-gray-900 dark:border-[#138601] px-5 py-3 flex items-center justify-between select-none">
                <span className="font-mono text-base sm:text-lg font-black text-gray-950 tracking-tight lowercase">
                  theme.
                </span>
                <span className="font-mono text-lg font-black text-gray-950 cursor-pointer hover:opacity-75 transition-opacity">
                  ✕
                </span>
              </div>

              {/* Window Content Body */}
              <div className="p-6 sm:p-12 md:p-14 relative bg-white dark:bg-[#072402]">
                
                {/* Main Pixelated Theme Title */}
                <div className="mb-10 mt-2">
                  <h1 className="font-['Silkscreen',_'Press_Start_2P',_monospace] text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-gray-950 dark:text-white leading-[1.1] uppercase">
                    The Agentic Build
                  </h1>
                </div>

                {/* Split Bottom Content (Matching Flyer Structure) */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
                  
                  {/* Left Yellow Highlight Card */}
                  <div className="md:col-span-7">
                    <div className="p-5 rounded-md bg-amber-400 text-gray-950 border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <p className="text-xs sm:text-sm font-bold leading-relaxed">
                        A premier innovation hackathon empowering students to build next-generation products with AI. Any product idea is accepted — from campus tech and fintech to healthcare and open innovation.
                      </p>
                      <div className="mt-3 font-mono text-[11px] font-black uppercase tracking-wider text-gray-900">
                        Solo or Teams up to 5 • TheAgenticBuild '26
                      </div>
                    </div>
                  </div>

                  {/* Right Subtitle Text */}
                  <div className="md:col-span-5 md:text-right">
                    <p className="font-mono text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                      5-Day Bootcamp &amp; Regional Hackathon
                    </p>
                    <p className="font-mono text-xs text-gray-500 dark:text-green-300 mt-1">
                      NACOS FUTO Grand Hackathon
                    </p>
                  </div>

                </div>

              </div>
            </div>

            {/* ─── GIANT 8-BIT PIXEL CURSOR (Direct Recreation of Flyer) ─── */}
            <div className="absolute -bottom-10 -right-4 sm:-bottom-12 sm:right-4 md:-bottom-14 md:right-8 z-20 pointer-events-none select-none drop-shadow-[0_20px_25px_rgba(0,0,0,0.5)] transform rotate-[-8deg]">
              <svg 
                className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40" 
                viewBox="0 0 140 140" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* 8-bit Stepped Pixel Cursor Silhouette */}
                <path 
                  d="M10 10 H22 V22 H34 V34 H46 V46 H58 V58 H70 V70 H82 V82 H94 V94 H82 V106 H70 V94 H58 V118 H46 V130 H34 V118 H34 V94 H22 V58 H10 V10 Z" 
                  fill="#111827" 
                />
                <path 
                  d="M12 12 H24 V24 H36 V36 H48 V48 H60 V60 H72 V72 H84 V84 H96 V96 H84 V108 H72 V96 H60 V120 H48 V132 H36 V120 H36 V96 H24 V60 H12 V12 Z" 
                  fill="#000000" 
                />
                <path 
                  d="M18 18 H28 V28 H40 V40 H52 V52 H64 V64 H76 V76 H88 V88 H80 V98 H68 V86 H56 V112 H44 V122 H38 V90 H28 V54 H18 V18 Z" 
                  fill="#FBBF24" 
                />
                <path 
                  d="M22 22 H26 V32 H38 V44 H50 V56 H62 V68 H74 V80 H70 V84 H60 V74 H48 V100 H44 V110 H40 V88 H30 V50 H22 V22 Z" 
                  fill="#FDE68A" 
                />
              </svg>
            </div>

            {/* Retro Pixel Sun / Starburst (Bottom Left) */}
            <div className="absolute -bottom-6 -left-4 sm:-bottom-8 sm:-left-6 z-10 pointer-events-none select-none">
              <svg className="w-14 h-14 sm:w-16 sm:h-16 text-amber-400" viewBox="0 0 64 64" fill="currentColor">
                <rect x="24" y="0" width="16" height="64" />
                <rect x="0" y="24" width="64" height="16" />
                <rect x="8" y="8" width="16" height="16" />
                <rect x="40" y="8" width="16" height="16" />
                <rect x="8" y="40" width="16" height="16" />
                <rect x="40" y="40" width="16" height="16" />
                <rect x="16" y="16" width="32" height="32" fill="#d97706" />
              </svg>
            </div>

          </div>

          {/* ─── CLEAN METADATA & APPLY ROW ─── */}
          <div className="mt-12 max-w-4xl mx-auto pt-6 border-t border-gray-200 dark:border-[#138601]/30">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-6 items-center">
              
              {/* Deadline & Location */}
              <div className="md:col-span-7 space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[11px] font-mono uppercase tracking-wider text-gray-500 dark:text-green-300">
                      Event Date:
                    </span>
                    <span className="block font-mono text-base sm:text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">
                      DECEMBER 11TH, 2026
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="block font-mono text-xs sm:text-sm font-bold text-gray-800 dark:text-green-100">
                      Department of Computer Science, FUTO
                    </span>
                    <span className="block text-[11px] font-mono text-gray-500 dark:text-gray-400">
                      Solo builders or teams up to 5 members • Hybrid format
                    </span>
                  </div>
                </div>
              </div>

              {/* Apply Action Buttons */}
              <div className="md:col-span-5 flex flex-col sm:items-end justify-center gap-2.5">
                <span className="text-[11px] font-mono uppercase text-gray-500 dark:text-green-300 font-bold">
                  Apply Now:
                </span>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Link
                    to="/hackathons/the-agentic-build/apply"
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 rounded bg-[#138601] hover:bg-[#0f6c01] text-white font-mono text-xs sm:text-sm font-bold uppercase tracking-wider border-2 border-gray-900 dark:border-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_#fff] transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-center"
                  >
                    <span>Register Solo / Team</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <button
                    onClick={handleCopyLink}
                    type="button"
                    className="p-3 rounded bg-white dark:bg-[#083002] text-gray-800 dark:text-green-200 hover:text-black dark:hover:text-white font-mono text-xs font-semibold border-2 border-gray-900 dark:border-[#138601] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
                    title="Copy share link"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                  100 dollar pool • 100% Free Entry
                </span>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ─── ABOUT: BUILD ANY PRODUCT IDEA WITH AI ─── */}
      <section className="py-16 md:py-20 border-b border-gray-200 dark:border-[#138601]/25 bg-white dark:bg-[#051c01]">
        <div className="site-container">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center max-w-5xl mx-auto">
            
            <div className="lg:col-span-6 space-y-4">
              <p className="text-xs font-mono font-bold tracking-widest text-[#138601] dark:text-[#4bd043] uppercase">
                ANY PRODUCT IDEA IS ACCEPTED
              </p>

              <h2 className="text-2xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight">
                Build Any Product Idea <span className="text-[#138601] dark:text-[#4bd043]">Powered by AI</span>.
              </h2>

              <p className="text-sm sm:text-base text-gray-700 dark:text-green-100/90 leading-relaxed font-normal">
                Organized by the <strong>Office of the Director of ICT, NACOS FUTO</strong>, <span className="font-semibold text-gray-900 dark:text-white">The Agentic Build</span> empowers students to build real, usable digital products with the power of modern AI. 
                <strong> You are not required to build autonomous agents</strong> — whether you want to build a web application, mobile app, student portal tool, fintech service, or developer utility, every creative product idea built with AI is welcomed.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3 p-3.5 rounded bg-gray-50 dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40">
                  <Code className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Build with AI</h4>
                    <p className="text-xs text-gray-600 dark:text-green-200/80 mt-0.5">
                      Accelerate and power your software using AI APIs, LLMs, smart recommendations, generative tooling, or automated intelligence.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded bg-gray-50 dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40">
                  <Laptop className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Any Product Category Welcome</h4>
                    <p className="text-xs text-gray-600 dark:text-green-200/80 mt-0.5">
                      Total creative flexibility: web apps, mobile apps, student clearance utilities, fintech tools, civic software, or developer SaaS.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded bg-gray-50 dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40">
                  <Users className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Solo Builders or Teams up to 5</h4>
                    <p className="text-xs text-gray-600 dark:text-green-200/80 mt-0.5">
                      Participate individually as a solo creator, or team up with up to 4 fellow students to turn your product idea into reality.
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Visual Card */}
            <div className="lg:col-span-6">
              <div className="p-6 sm:p-8 rounded-lg bg-gray-900 text-white border-2 border-gray-950 dark:border-[#138601] shadow-[6px_6px_0px_0px_rgba(19,134,1,1)] relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-6">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    <span className="ml-2 font-mono text-xs text-gray-400">ai_product_builder.js</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-amber-400">THE_AGENTIC_BUILD</span>
                </div>

                <pre className="font-mono text-xs sm:text-sm text-green-300 leading-relaxed overflow-x-auto p-2">
{`// Build Any Product Idea With AI
import { AIIntegration } from '@nacos/ai';

export const ProductLaunch = {
  theme: "The Agentic Build 2026",
  organizer: "Office of the Director of ICT",
  scope: "Any creative product built with AI",
  format: "Solo builders or teams up to 5",
  
  categories: [
    "Campus & Student Life Tech",
    "FinTech & Digital Commerce",
    "Civic Tech & Healthcare",
    "Open Innovation & DevTools"
  ],

  readyToDeploy: true
};`}
                </pre>

                <div className="mt-6 pt-4 border-t border-gray-800 flex items-center justify-between text-xs font-mono text-gray-400">
                  <span className="flex items-center gap-1.5 text-amber-300 font-bold">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    Open to All Creative Products
                  </span>
                  <span>Venue: Department of Computer Science</span>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── COMPLETE CREATIVE FREEDOM: NO RESTRICTIVE TRACKS ─── */}
      <section id="categories" className="py-16 md:py-20 border-b border-gray-200 dark:border-[#138601]/25 bg-[#f8fafc] dark:bg-[#041801]">
        <div className="site-container">
          
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <p className="text-xs font-mono font-bold tracking-widest text-amber-600 dark:text-amber-400 uppercase">
              COMPLETE CREATIVE FREEDOM
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              No Restrictive Tracks
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-green-100/80 font-normal">
              Build whatever software problem excites you. Solo builders and teams indicate their kind of project during registration.
            </p>
          </div>

          <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              {
                title: "Web Applications",
                desc: "Full-stack web apps, portals, student dashboards, SaaS platforms, and responsive client tools."
              },
              {
                title: "Mobile Applications",
                desc: "iOS, Android, React Native, Flutter, and cross-platform native mobile experiences."
              },
              {
                title: "Campus & Student Tech",
                desc: "Course advisors, clearance helpers, hostel finders, dues trackers, and student productivity tools."
              },
              {
                title: "Developer Tools & SaaS",
                desc: "CLI utilities, code analysis tools, APIs, test generators, and developer productivity software."
              },
              {
                title: "FinTech & Digital Commerce",
                desc: "Campus payment tools, micro-savings, budgeting utilities, and merchant solutions."
              },
              {
                title: "Civic Tech & Healthcare",
                desc: "Community issue trackers, telehealth solutions, agriculture tools, and public service utilities."
              }
            ].map((cat, idx) => (
              <div 
                key={idx}
                className="p-5 rounded-lg bg-white dark:bg-[#072402] border-2 border-gray-900 dark:border-[#138601]/60 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_#138601]"
              >
                <div className="flex items-center gap-2 mb-2 font-mono text-xs font-bold text-amber-600 dark:text-amber-400 uppercase">
                  <span>0{idx + 1}.</span>
                  <span>{cat.title}</span>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-green-100/90 leading-relaxed">
                  {cat.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/hackathons/the-agentic-build/apply"
              className="inline-flex items-center gap-2 px-6 py-3 rounded bg-[#138601] hover:bg-[#0f6c01] text-white font-mono text-xs font-bold uppercase tracking-wider border-2 border-gray-900 dark:border-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
            >
              <span>Register Your Project</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </section>

      {/* ─── PRIZE POOL ─── */}
      <section id="prizes" className="py-16 md:py-20 border-b border-gray-200 dark:border-[#138601]/25 bg-white dark:bg-[#051c01]">
        <div className="site-container max-w-4xl mx-auto">
          
          <div className="text-center mb-10 space-y-2">
            <p className="text-xs font-mono font-bold tracking-widest text-amber-600 dark:text-amber-400 uppercase">
              REWARDS &amp; RECOGNITION
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              100 dollar pool
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-green-100/80 font-normal">
              Awarded to the top winning AI products, alongside developer credits, incubation mentorship, trophy, and technical certificates.
            </p>
          </div>

          <div className="p-8 sm:p-12 rounded-lg bg-gradient-to-br from-amber-400 via-amber-500 to-amber-400 text-gray-950 border-[3px] border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center relative overflow-hidden">
            <div className="max-w-xl mx-auto space-y-4">
              <span className="font-mono text-xs font-black uppercase tracking-wider bg-gray-950 text-amber-300 px-3.5 py-1 rounded inline-block">
                OFFICIAL HACKATHON PRIZE
              </span>
              <div className="font-['Silkscreen',_'Press_Start_2P',_monospace] text-4xl sm:text-6xl font-black text-gray-950 tracking-tight">
                100 dollar pool
              </div>
              <p className="font-sans text-sm sm:text-base font-bold text-gray-900 leading-relaxed">
                Cash rewards + Cloud development credits, ecosystem incubation mentorship, grand trophy, and technical certificates for the top winning projects.
              </p>
              
              <div className="pt-4 flex flex-wrap items-center justify-center gap-3 font-mono text-xs font-bold text-gray-950">
                <span className="bg-amber-300 px-3 py-1.5 rounded border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  ✓ 100 Dollar Pool Prize
                </span>
                <span className="bg-amber-300 px-3 py-1.5 rounded border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  ✓ Cloud &amp; AI Tools Perks
                </span>
                <span className="bg-amber-300 px-3 py-1.5 rounded border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  ✓ Incubation &amp; Mentorship
                </span>
                <span className="bg-amber-300 px-3 py-1.5 rounded border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  ✓ Grand Innovation Trophy
                </span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ─── SPRINT TIMELINE & SCHEDULE ─── */}
      <section id="timeline" className="py-16 md:py-20 border-b border-gray-200 dark:border-[#138601]/25 bg-[#f8fafc] dark:bg-[#041801]">
        <div className="site-container">
          
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <p className="text-xs font-mono font-bold tracking-widest text-[#138601] dark:text-[#4bd043] uppercase">
              SCHEDULE &amp; PHASES
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              The Agentic Sprint Roadmap
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-green-100/80 font-normal">
              Structured sprint phases from technical orientation to live demo day at the Department of Computer Science, FUTO.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {hackathon.timeline.map((item, idx) => (
              <div 
                key={idx}
                className="p-5 sm:p-6 rounded-lg bg-white dark:bg-[#072402] border-2 border-gray-900 dark:border-[#138601]/60 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_#138601] flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between"
              >
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded bg-amber-400 text-gray-950 font-mono font-bold text-sm flex items-center justify-center border-2 border-gray-900 shrink-0">
                    0{idx + 1}
                  </div>
                  <div>
                    <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 uppercase block">
                      {item.date}
                    </span>
                    <h4 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                      {item.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-green-200/80 mt-1">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ─── RULES & GUIDELINES ─── */}
      <section id="rules" className="py-16 md:py-20 border-b border-gray-200 dark:border-[#138601]/25 bg-white dark:bg-[#051c01]">
        <div className="site-container max-w-4xl">
          
          <div className="text-center mb-10 space-y-2">
            <p className="text-xs font-mono font-bold tracking-widest text-amber-600 dark:text-amber-400 uppercase">
              FAIR PLAY &amp; TECHNICAL INTEGRITY
            </p>
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
              Hackathon Rules &amp; Guidelines
            </h2>
          </div>

          <div className="p-6 sm:p-8 rounded-lg bg-gray-50 dark:bg-[#072402] border-2 border-gray-900 dark:border-[#138601] shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
            <ul className="space-y-4">
              {hackathon.rules.map((rule, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-gray-800 dark:text-green-100">
                  <span className="w-5 h-5 rounded-full bg-amber-400 text-gray-950 font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 border border-black">
                    ✓
                  </span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-300 dark:border-[#138601]/40 flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs font-mono text-gray-600 dark:text-green-300">
                Judged by: Office of the Director of ICT, FUTO Computer Science Faculty &amp; Industry Tech Leads.
              </div>
              <a
                href="https://hack.nacos.org.ng/BuildXNACOS"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#138601] dark:text-[#4bd043] hover:underline"
              >
                <span>Reference: NACOS National Guidelines</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

        </div>
      </section>

      {/* ─── FREQUENTLY ASKED QUESTIONS ─── */}
      <section id="faqs" className="py-16 md:py-20 border-b border-gray-200 dark:border-[#138601]/25 bg-[#f8fafc] dark:bg-[#041801]">
        <div className="site-container max-w-4xl">
          
          <div className="text-center mb-10 space-y-2">
            <p className="text-xs font-mono font-bold tracking-widest text-[#138601] dark:text-[#4bd043] uppercase">
              GOT QUESTIONS?
            </p>
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {hackathon.faqs.map((faq, idx) => (
              <div 
                key={idx}
                className="rounded-lg bg-white dark:bg-[#072402] border-2 border-gray-900 dark:border-[#138601]/60 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-5 text-left font-bold text-sm sm:text-base text-gray-900 dark:text-white flex items-center justify-between gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#083002]/60"
                >
                  <span>{faq.question}</span>
                  {openFaq === idx ? (
                    <ChevronUp className="w-5 h-5 text-amber-500 shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
                  )}
                </button>
                {openFaq === idx && (
                  <div className="p-5 pt-0 text-xs sm:text-sm text-gray-600 dark:text-green-200/90 leading-relaxed border-t border-gray-100 dark:border-[#138601]/20">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ─── BOTTOM FULL-WIDTH CALL TO ACTION ─── */}
      <section className="py-16 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 border-t-[3px] border-gray-900 text-gray-950">
        <div className="site-container text-center space-y-5 max-w-3xl">
          <p className="font-mono text-xs font-black uppercase tracking-widest text-gray-950">
            OFFICE OF THE DIRECTOR OF ICT • NACOS FUTO
          </p>
          <h2 className="font-['Silkscreen',_'Press_Start_2P',_monospace] text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-black">
            Ready to Build The Future?
          </h2>
          <p className="font-sans text-sm sm:text-base font-semibold max-w-xl mx-auto text-gray-950/90">
            Register as a solo builder or form a team of up to 5 members. Any product idea built with AI is accepted. Compete for the 100 dollar pool, developer perks, and recognition.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/hackathons/the-agentic-build/apply"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded bg-gray-950 hover:bg-black text-amber-300 font-mono text-sm font-bold uppercase tracking-wider border-2 border-black shadow-[4px_4px_0px_0px_#fff] transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <span>Register Solo or Team</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="mailto:ict@nacosfuto.com.ng"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded bg-white hover:bg-gray-100 text-gray-900 font-mono text-sm font-bold uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
            >
              <span>Contact DICT Secretariat</span>
            </a>
          </div>
        </div>
      </section>

      {/* Standard Footer */}
      <Footer />

    </div>
  );
};

export default HackathonDetail;
