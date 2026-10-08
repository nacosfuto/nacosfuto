import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Globe, MapPin } from 'lucide-react';
import { FaTwitter, FaLinkedinIn, FaGithub } from 'react-icons/fa';
import { getAppUrls } from '@nacos/config/urls';

const Footer = () => {
  return (
    <footer className="w-full bg-[#041801] border-t border-[#138601]/25 text-green-100/80 text-sm">
      <div className="site-container py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          {/* Col 1: Brand */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded bg-[#138601]/25 border border-[#138601]/40 flex items-center justify-center p-1.5 shadow-sm">
                <img src="/nacos-logo.svg" alt="NACOS Logo" className="w-full h-full object-contain" />
              </div>
              <span className="font-extrabold text-white text-lg tracking-tight">NACOS Portal</span>
            </div>
            <p className="text-xs text-green-200/80 leading-relaxed">
              Nigeria Association of Computing Students (NACOS). Federal University of Technology, Owerri Chapter.
            </p>
            <div className="flex items-center space-x-3 text-gray-400">
              <a href="https://twitter.com/nacosnational" target="_blank" rel="noreferrer" className="w-8 h-8 rounded bg-[#083002] border border-[#138601]/30 hover:bg-[#138601] hover:text-white flex items-center justify-center transition-colors">
                <FaTwitter className="w-3.5 h-3.5" />
              </a>
              <a href="https://www.linkedin.com/company/nigeria-association-of-computing-students-futo-chapter/" target="_blank" rel="noreferrer" aria-label="NACOS FUTO LinkedIn" className="w-8 h-8 rounded bg-[#083002] border border-[#138601]/30 hover:bg-[#138601] hover:text-white flex items-center justify-center transition-colors">
                <FaLinkedinIn className="w-3.5 h-3.5" />
              </a>
              <a href="https://github.com/nacosnational" target="_blank" rel="noreferrer" className="w-8 h-8 rounded bg-[#083002] border border-[#138601]/30 hover:bg-[#138601] hover:text-white flex items-center justify-center transition-colors">
                <FaGithub className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Col 2: Portal Navigation */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4">Student Services</h4>
            <ul className="space-y-2.5 text-xs">
              <li><Link to="/dashboard" className="hover:text-[#4bd043] transition-colors">Dashboard Overview</Link></li>
              <li><Link to="/results" className="hover:text-[#4bd043] transition-colors">Academic Results Checker</Link></li>
              <li><Link to="/dues" className="hover:text-[#4bd043] transition-colors">Dues & Digital Receipt</Link></li>
              <li><Link to="/courses" className="hover:text-[#4bd043] transition-colors">Registered Courses</Link></li>
              <li><Link to="/profile" className="hover:text-[#4bd043] transition-colors">Digital Student ID E-Card</Link></li>
            </ul>
          </div>

          {/* Col 3: Resources */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4">Ecosystem</h4>
            <ul className="space-y-2.5 text-xs">
              <li><a href={getAppUrls().website} className="hover:text-[#4bd043] transition-colors">Main Public Website</a></li>
              <li><a href={getAppUrls().upskillHub} target="_blank" rel="noreferrer" className="hover:text-[#4bd043] transition-colors font-medium text-emerald-300">Upskill Hub (Open Source Courses)</a></li>
              <li><a href={getAppUrls().adminHub} className="hover:text-[#4bd043] transition-colors">Admin Command Center</a></li>
              <li><Link to="/hackathons/BuildXNACOS" className="hover:text-[#4bd043] transition-colors">BUILDX Hackathon Hub</Link></li>
              <li><Link to="/hackathons/BuildXNACOS/apply" className="hover:text-[#4bd043] transition-colors">Team Application</Link></li>
              <li><a href="mailto:support@nacosfuto.com.ng" className="hover:text-[#4bd043] transition-colors">Secretariat Support</a></li>
            </ul>
          </div>

          {/* Col 4: Contact & Secretariat */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4">Secretariat</h4>
            <ul className="space-y-2.5 text-xs">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#4bd043] shrink-0 mt-0.5" />
                <span>Department of Computer Science, FUTO, Owerri</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#4bd043] shrink-0" />
                <span>support@nacosfuto.com.ng</span>
              </li>
              <li className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#4bd043] shrink-0" />
                <span>nacosfuto.com.ng</span>
              </li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-[#138601]/20 flex flex-col sm:flex-row items-center justify-between text-xs text-green-200/70 gap-4">
          <p>© {new Date().getFullYear()} NACOS FUTO (Nigeria Association of Computing Students). All rights reserved.</p>
          <div className="flex items-center gap-1">
            <span>Unified Digital Platform for</span>
            <span className="text-[#4bd043] font-bold">NACOS FUTO</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
