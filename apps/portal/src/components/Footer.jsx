import React from 'react';
import { Link } from 'react-router-dom';
import {
  FaFacebook,
  FaTwitter,
  FaLinkedin,
  FaYoutube,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaInstagram
} from 'react-icons/fa';
import logoDark from '../assets/full-logo-dark.png';
import { getAppUrls } from '@nacos/config/urls';

const Footer = () => {
  const { website, upskillHub } = getAppUrls();
  const toWeb = (path) => {
    const cleanBase = (website || '/').replace(/\/+$/, '');
    return cleanBase ? `${cleanBase}${path.startsWith('/') ? path : `/${path}`}` : path;
  };

  return (
    <footer className="bg-[#083002] text-white pt-14 pb-8 border-t border-[#138601]/20">
      <div className="site-container">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Department Info */}
          <div>
            <div className="flex items-center mb-6">
              <img src={logoDark} alt="FUTO Computer Science Logo" className="h-10 md:h-12 w-auto object-contain" />
            </div>
            <p className="mb-6 text-white/90 text-sm leading-relaxed">
              Empowering the next generation of computer scientists through excellence in teaching, innovative research, and tech leadership.
            </p>
            <div className="flex space-x-3">
              <a 
                href="#" 
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-[#138601] hover:text-white transition-all"
                aria-label="Facebook"
              >
                <FaFacebook size={16} />
              </a>
              <a 
                href="#" 
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-[#138601] hover:text-white transition-all"
                aria-label="Twitter"
              >
                <FaTwitter size={16} />
              </a>
              <a 
                href="https://www.instagram.com/nacosfuto?igsh=MTJpcnk3Zzdqcmh6dA==" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-[#138601] hover:text-white transition-all"
                aria-label="Instagram"
              >
                <FaInstagram size={16} />
              </a>
              <a 
                href="https://www.linkedin.com/company/nigeria-association-of-computing-students-futo-chapter/" 
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="NACOS FUTO LinkedIn" 
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-[#138601] hover:text-white transition-all"
              >
                <FaLinkedin size={16} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-base font-bold mb-4 text-white uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-2.5 text-sm text-white/90">
              <li><a href={toWeb('/about')} className="text-white hover:text-[#4bd043] transition-colors">About Department</a></li>
              <li><a href={toWeb('/about/administration')} className="text-white hover:text-[#4bd043] transition-colors">Administration</a></li>
              <li><a href={toWeb('/about/nacos-executives')} className="text-white hover:text-[#4bd043] transition-colors">NACOS Executives</a></li>
              <li><a href={toWeb('/news')} className="text-white hover:text-[#4bd043] transition-colors">News & Journal</a></li>
              <li><a href={toWeb('/events')} className="text-white hover:text-[#4bd043] transition-colors">Department Events</a></li>
              <li><Link to="/hackathons/the-agentic-build" className="text-amber-300 font-semibold hover:text-white transition-colors">The Agentic Build (Hackathon)</Link></li>
              <li><a href={toWeb('/about/alumni')} className="text-white hover:text-[#4bd043] transition-colors">Alumni Network</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-base font-bold mb-4 text-white uppercase tracking-wider">Resources</h4>
            <ul className="space-y-2.5 text-sm text-white/90">
              <li><a href="https://www.futo.edu.ng" target="_blank" rel="noopener noreferrer" className="text-white hover:text-[#4bd043] transition-colors">FUTO Main Portal</a></li>
              <li><a href={upskillHub} target="_blank" rel="noopener noreferrer" className="text-white hover:text-[#4bd043] transition-colors font-medium">Upskill Hub</a></li>
              <li><a href={toWeb('/resources')} className="text-white hover:text-[#4bd043] transition-colors">Academic Resources</a></li>
              <li><a href={toWeb('/about/calendar')} className="text-white hover:text-[#4bd043] transition-colors">Academic Calendar</a></li>
              <li><a href={toWeb('/faqs')} className="text-white hover:text-[#4bd043] transition-colors">Help & FAQs</a></li>
              <li><a href={toWeb('/report-emergency')} className="text-white hover:text-[#4bd043] transition-colors">Report an Issue</a></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-base font-bold mb-4 text-white uppercase tracking-wider">Contact</h4>
            <div className="space-y-3.5 text-sm text-white/90">
              <div className="flex items-start gap-3">
                <FaMapMarkerAlt className="mt-1 text-green-400 flex-shrink-0" />
                <span className="text-white">Department of Computer Science, FUTO, Owerri, Imo State, Nigeria</span>
              </div>
              <div className="flex items-center gap-3">
                <FaEnvelope className="text-green-400 flex-shrink-0" />
                <a href="mailto:hello@nacosfuto.com.ng" className="text-white hover:text-[#4bd043] transition-colors">hello@nacosfuto.com.ng</a>
              </div>
              <div className="flex items-center gap-3">
                <FaPhone className="text-green-400 flex-shrink-0" />
                <a href="tel:+2348069514271" className="text-white hover:text-[#4bd043] transition-colors">+234 806 951 4271</a>
              </div>
            </div>
          </div>

        </div>

        {/* Copyright */}
        <div className="border-t border-white/10 mt-12 pt-6 text-center text-xs text-white/80">
          <p>&copy; {new Date().getFullYear()} NACOS FUTO Chapter & Department of Computer Science. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
