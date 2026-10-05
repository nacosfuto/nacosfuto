import React from "react";
import NavLink from "./NavLink";
import { FiChevronDown } from "react-icons/fi";
import { BsSun, BsMoon } from "react-icons/bs";
import ScrollToTopLink from "../ScrollToTopLink";
import { useTheme } from "../../context/ThemeContext";
import SearchBar from "../SearchBar";
import { getAppUrls } from "@nacos/config/urls";

// Custom Dropdown Component
const NavDropdown = ({ label, items, theme, headerLink }) => {
  const HeaderComponent = headerLink ? 'a' : 'button';
  const headerProps = headerLink
    ? { href: headerLink, target: '_blank', rel: 'noopener noreferrer' }
    : {};

  return (
    <div className="relative group py-2">
      <HeaderComponent
        {...headerProps}
        className={`flex items-center space-x-1 font-semibold transition-colors cursor-pointer ${
          theme === "light"
            ? "text-black hover:text-[#138601]"
            : "text-gray-200 hover:text-[#4bd043]"
        }`}
      >
        <span className="whitespace-nowrap tracking-wide">{label}</span>
        <FiChevronDown className="text-xs transition-transform duration-200 group-hover:rotate-180" />
      </HeaderComponent>

      {/* Dropdown Menu */}
      <div
        className={`absolute top-full left-0 mt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 py-2 w-56 z-50 rounded-xl shadow-xl border ${
          theme === "light"
            ? "bg-white border-gray-200 text-black"
            : "bg-[#083002] border-[#138601]/30 text-white shadow-black/60"
        }`}
      >
        {items.map((item, idx) => {
          const isExternal = item.isExternal || item.link.startsWith("http") || item.link.startsWith("/upskill-hub");
          if (isExternal) {
            return (
              <a
                key={idx}
                href={item.link}
                target={item.target || (isExternal ? "_blank" : "_self")}
                rel={isExternal ? "noopener noreferrer" : undefined}
                className={`block px-4 py-2.5 text-sm font-medium transition-colors ${
                  theme === "light"
                    ? "hover:bg-gray-50 hover:text-[#138601] text-black"
                    : "hover:bg-[#138601]/25 hover:text-[#4bd043] text-green-100"
                }`}
              >
                {item.name}
              </a>
            );
          }
          return (
            <ScrollToTopLink
              key={idx}
              to={item.link}
              className={`block px-4 py-2.5 text-sm font-medium transition-colors ${
                theme === "light"
                  ? "hover:bg-gray-50 hover:text-[#138601] text-black"
                  : "hover:bg-[#138601]/25 hover:text-[#4bd043] text-green-100"
              }`}
            >
              {item.name}
            </ScrollToTopLink>
          );
        })}
      </div>
    </div>
  );
};

// Custom Dropdown Component for "MORE" mega menu
const MoreDropdown = ({ theme }) => {
  const moreCategories = {
    RESEARCH: [
      { name: "Research Overview", link: "/research" },
      { name: "Student Research", link: "/student-research" },
      { name: "Collaboration", link: "/collaboration" },
      { name: "Research Facilities", link: "/research-facilities" },
      { name: "Research Grants", link: "/research-grants" },
    ],
    "HEALTH & SAFETY": [
      { name: "Guidance & Counselling", link: "/guidance-counselling" },
      { name: "Safety Alerts", link: "/safety-alerts" },
      { name: "Report an Issue", link: "/report-emergency" },
      { name: "Health Services", link: "/health-services" },
    ],
    "CAREERS & RECRUITMENT": [
      { name: "Careers & Recruitment", link: "/careers-recruitment" },
    ],
  };

  return (
    <div className="relative group py-2">
      <button
        className={`flex items-center space-x-1 font-semibold transition-colors cursor-pointer ${
          theme === "light"
            ? "text-black hover:text-[#138601]"
            : "text-gray-200 hover:text-[#4bd043]"
        }`}
      >
        <span className="whitespace-nowrap tracking-wide">MORE</span>
        <FiChevronDown className="text-xs transition-transform duration-200 group-hover:rotate-180" />
      </button>
      {/* Mega Menu Dropdown */}
      <div
        className={`absolute top-full right-0 mt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 p-6 w-[560px] z-50 rounded-2xl shadow-2xl border grid grid-cols-1 md:grid-cols-3 gap-6 ${
          theme === "light"
            ? "bg-white border-gray-200 text-black"
            : "bg-[#083002] border-[#138601]/30 text-white shadow-black/60"
        }`}
      >
        {Object.entries(moreCategories).map(([category, items]) => (
          <div key={category} className="space-y-2 text-left">
            <h4 className="text-xs font-extrabold tracking-wider text-[#138601] dark:text-[#4bd043] uppercase">
              {category}
            </h4>
            <ul className="space-y-1">
              {items.map((item, idx) => (
                <li key={idx}>
                  <ScrollToTopLink
                    to={item.link}
                    className={`block py-1 text-sm font-medium transition-colors ${
                      theme === "light"
                        ? "hover:text-[#138601] text-gray-900"
                        : "hover:text-[#4bd043] text-green-100/80"
                    }`}
                  >
                    {item.name}
                  </ScrollToTopLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

const DesktopNav = () => {
  const { theme, toggleTheme } = useTheme();
  const { upskillHub } = getAppUrls();

  const aboutItems = [
    { name: "About Us", link: "/about" },
    { name: "Administration", link: "/about/administration" },
    { name: "NACOS Executives", link: "/about/nacos-executives" },
    { name: "News & Journal", link: "/news" },
    { name: "Alumni", link: "/about/alumni" },
    { name: "Anthems", link: "/about/anthems" },
    { name: "Gallery", link: "/about/gallery" },
  ];

  const academicsItems = [
    { name: "Programs", link: "/programs" },
    { name: "How To Apply", link: "/how-to-apply" },
    { name: "Learning Resources", link: "/resources" },
    { name: "Academic Year Calendar", link: "/about/calendar" },
    { name: "Admission Portal", link: "/admission-portal" },
    { name: "Admission Requirements", link: "/admission-requirements" },
    { name: "Tuition & Fees", link: "/tuition-fees" },
    { name: "Futo Website", link: "https://futo.edu.ng" },
  ];

  const campusLifeItems = [
    { name: "Campus Tour", link: "/campus-tour" },
    { name: "Campus Clubs", link: "/campus-clubs" },
    { name: "Events", link: "/events" },
    { name: "Yellow Pages", link: "/yellow-pages" },
    { name: "Spiritual Life", link: "/spiritual-life" },
  ];

  return (
    <nav
      className={`hidden md:flex w-full items-center justify-between gap-4 px-1 lg:gap-6 lg:px-2 ${
        theme === "light" ? "text-black" : "text-white"
      }`}
    >
      {/* Navigation Links Group */}
      <div className="flex items-center gap-4 lg:gap-6">
        <NavLink
          to="/"
          className={`tracking-wide font-semibold ${
            theme === "light" ? "text-black hover:text-[#138601]" : "text-gray-200 hover:text-[#4bd043]"
          }`}
        >
          HOME
        </NavLink>

        <a
          href={upskillHub}
          target="_blank"
          rel="noopener noreferrer"
          className={`tracking-wide font-semibold transition-colors cursor-pointer ${
            theme === "light" ? "text-black hover:text-[#138601]" : "text-gray-200 hover:text-[#4bd043]"
          }`}
        >
          UPSKILL
        </a>
        <NavDropdown label="ABOUT" items={aboutItems} theme={theme} />
        <NavDropdown label="ACADEMICS" items={academicsItems} theme={theme} />
        <NavDropdown label="CAMPUS LIFE" items={campusLifeItems} theme={theme} />
        <MoreDropdown theme={theme} />
      </div>

      {/* Utilities & Actions Group */}
      <div className="flex items-center gap-2 lg:gap-3">
        <button
          onClick={toggleTheme}
          className={`w-9 h-9 flex items-center justify-center rounded-[5px] text-lg transition-colors cursor-pointer bg-transparent ${
            theme === "light"
              ? "text-black hover:text-[#138601] hover:bg-black/5"
              : "text-yellow-400 hover:text-yellow-300 hover:bg-white/10"
          }`}
          aria-label="Toggle dark mode"
        >
          {theme === "dark" ? <BsSun className="text-yellow-400" /> : <BsMoon className="text-black" />}
        </button>

        <div className="w-[180px] lg:w-[220px] flex items-center">
          <SearchBar />
        </div>

        <div className="flex items-center">
          <a 
            href={import.meta.env.VITE_PORTAL_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? "http://localhost:5174/login" : "/portal")}
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 inline-flex items-center justify-center border border-[#138601] text-[#138601] dark:text-[#4bd043] dark:border-[#4bd043] hover:bg-[#138601] hover:text-white dark:hover:bg-[#138601] dark:hover:text-white px-4 rounded-[5px] font-bold text-xs tracking-wider transition-all whitespace-nowrap uppercase shadow-2xs"
          >
            Portal
          </a>
        </div>
      </div>
    </nav>
  );
};

export default DesktopNav;
