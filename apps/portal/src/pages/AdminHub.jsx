import React from 'react';
import { 
  ShieldCheck, 
  Shield, 
  GraduationCap, 
  LayoutDashboard, 
  ArrowRight, 
  ChevronRight, 
  Vote,
  Lock,
  KeyRound,
  FileCheck,
  CheckCircle2
} from 'lucide-react';
import logoLight from '../assets/full-logo-light.png';
import { getCloudinaryAssetUrl } from '@nacos/media';
import { getAppUrls } from '@nacos/config/urls';

const AdminHub = () => {
  const urls = getAppUrls();

  // Purely administrative dashboard control panels
  const adminDashboards = [
    {
      id: 'portal-admin',
      title: 'Portal Admin Dashboard',
      category: 'Student Operations & Clearance',
      description: 'Comprehensive administrative console for vetting student registrations, approving official digital ID cards, certifying departmental dues clearance, and inspecting enrollment records.',
      icon: GraduationCap,
      badge: 'Portal Officers & HoD',
      badgeColor: 'bg-emerald-50 text-[#138601] border-emerald-200',
      iconBg: 'bg-emerald-50 text-[#138601] border-emerald-200',
      primaryUrl: `${urls.portalAdmin}/login`,
      primaryLabel: 'Open Portal Admin',
      links: [
        { label: 'Admin Login', href: `${urls.portalAdmin}/login` },
        { label: 'Manage ID Cards', href: `${urls.portalAdmin}/id-cards` },
        { label: 'Student Directory', href: `${urls.portalAdmin}/students` },
        { label: 'Dues Clearance', href: `${urls.portalAdmin}/dues` }
      ]
    },
    {
      id: 'website-admin',
      title: 'Website CMS Dashboard',
      category: 'Media & Publications Directorate',
      description: 'Content management system for departmental announcements, academic news articles, executive leadership rosters, upcoming event calendars, and Cloudinary media assets.',
      icon: LayoutDashboard,
      badge: 'Editorial & Media Team',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      iconBg: 'bg-purple-50 text-purple-600 border-purple-200',
      primaryUrl: `${urls.websiteAdmin}/login`,
      primaryLabel: 'Open Website CMS',
      links: [
        { label: 'CMS Login', href: `${urls.websiteAdmin}/login` },
        { label: 'News & Updates', href: `${urls.websiteAdmin}/news` },
        { label: 'Media Library', href: `${urls.websiteAdmin}/media` },
        { label: 'Events Calendar', href: `${urls.websiteAdmin}/events` }
      ]
    },
    {
      id: 'electra-admin',
      title: 'ELECTRA Commission Admin',
      category: 'Electoral Operations & Governance',
      description: 'Official electoral administration dashboard for accrediting student voters, configuring ballot categories and candidate slates, and overseeing live election tallies.',
      icon: Vote,
      badge: 'Electoral Commission',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      iconBg: 'bg-blue-50 text-blue-600 border-blue-200',
      primaryUrl: `${urls.electraAdmin}/login`,
      primaryLabel: 'Open ELECTRA Admin',
      links: [
        { label: 'Commission Login', href: `${urls.electraAdmin}/login` },
        { label: 'Voter Accreditation', href: `${urls.electraAdmin}/voters` },
        { label: 'Live Ballots', href: `${urls.electraAdmin}/ballots` }
      ]
    }
  ];

  const securityGuidelines = [
    {
      icon: KeyRound,
      title: 'Role-Based Access Control',
      text: 'Administrative privileges are strictly partitioned by department and role. Credentials for Portal operations, Website CMS, and Electoral governance operate independently.'
    },
    {
      icon: Lock,
      title: 'Cryptographic Security',
      text: 'Administrative accounts utilize salted SHA-256 password hashing alongside one-time passcodes (OTP) for authorized password recovery workflows.'
    },
    {
      icon: FileCheck,
      title: 'Strict Audit Logging',
      text: 'All administrative actions, student approvals, content publishes, and credential modifications are immutably logged for institutional accountability.'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-[#138601] selection:text-white pb-20">
      
      {/* ─── Top Header Bar (Light Mode) ─── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 px-4 sm:px-8 py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center">
              <img 
                src={getCloudinaryAssetUrl('full-logo-light') || logoLight} 
                alt="NACOS FUTO Logo" 
                className="h-8 sm:h-9 w-auto object-contain" 
              />
            </div>
            <div className="border-l border-gray-200 pl-3">
              <span className="text-xs font-bold text-gray-900 uppercase tracking-wider block">
                Administrative Command Hub
              </span>
              <span className="text-[11px] text-gray-500 block">
                Department of Computer Science • Federal University of Technology, Owerri
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-[#138601] border border-green-200">
              <span className="w-2 h-2 rounded-full bg-[#138601] animate-pulse"></span>
              <span>Systems Online</span>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Hero Section (Light Mode) ─── */}
      <section className="bg-white border-b border-gray-200 py-10 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 border border-green-200 text-[#138601] text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-[#138601]" />
            <span>Executive Command Center</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
            NACOS FUTO Admin Dashboards
          </h1>
          <p className="text-sm text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Authorized access gateway for departmental officers, student clearance examiners, editorial managers, and electoral commissioners.
          </p>
        </div>
      </section>

      {/* ─── Main Content Container (Light Mode) ─── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 space-y-10">
        
        {/* ─── 1. Administrative Dashboards Grid ─── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#138601]" />
                <span>Administrative Dashboards</span>
              </h2>
              <p className="text-xs text-gray-500">Launch each independent administrative control dashboard below.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {adminDashboards.map((card) => {
              const Icon = card.icon;
              return (
                <div 
                  key={card.id}
                  className="rounded-xl bg-white border border-gray-200 hover:border-[#138601]/60 p-6 shadow-xs hover:shadow-md flex flex-col justify-between transition-all group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 rounded-lg border ${card.iconBg} flex items-center justify-center shadow-xs`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${card.badgeColor}`}>
                        {card.badge}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 block mb-1">
                        {card.category}
                      </span>
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#138601] transition-colors">
                        {card.title}
                      </h3>
                      <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                        {card.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-5 mt-5 border-t border-gray-100 space-y-3">
                    <a
                      href={card.primaryUrl}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#138601] hover:bg-[#0f6c01] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <span>{card.primaryLabel}</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {card.links.map((lnk, idx) => (
                        <a
                          key={idx}
                          href={lnk.href}
                          className="text-[11px] font-medium text-gray-600 hover:text-[#138601] hover:underline inline-flex items-center gap-1 py-1 px-2 rounded-md hover:bg-gray-100 transition-colors"
                        >
                          <span>{lnk.label}</span>
                          <ChevronRight className="w-3 h-3 text-gray-400" />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── 2. Security & Access Protocols ─── */}
        <section className="rounded-xl bg-white border border-gray-200 p-6 sm:p-8 shadow-xs">
          <div className="border-b border-gray-150 pb-4 mb-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#138601]" />
              <span>Administrative Access & Security Protocols</span>
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              All management surfaces are protected by centralized access control policies and encrypted verification workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {securityGuidelines.map((item, idx) => {
              const ItemIcon = item.icon;
              return (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-green-50 text-[#138601] border border-green-200 flex items-center justify-center shrink-0">
                      <ItemIcon className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-gray-900">{item.title}</h4>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed pl-10.5">
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#138601] shrink-0" />
              <span>To provision new administrators or update permissions, contact the Staff Adviser or Superadmin.</span>
            </div>
            <span className="font-mono text-[11px] text-gray-400">NACOS FUTO Systems Security</span>
          </div>
        </section>

      </main>

    </div>
  );
};

export default AdminHub;
