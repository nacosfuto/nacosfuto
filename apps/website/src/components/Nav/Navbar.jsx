import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import DesktopNav from './DesktopNav';
import MobileNav from './MobileNav';
import ResourcesOverlay from './ResourcesOverlay';
import logoLight from '../../assets/full-logo-light.png';
import logoDark from '../../assets/full-logo-dark.png';
import ScrollToTopLink from '../ScrollToTopLink';
import { FiMenu, FiX } from 'react-icons/fi';

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [desktopResourcesOpen, setDesktopResourcesOpen] = useState(false);
  const [mobileResourcesOpen, setMobileResourcesOpen] = useState(false);

  const toggleDesktopResources = () => {
    setDesktopResourcesOpen(!desktopResourcesOpen);
    document.body.style.overflow = desktopResourcesOpen ? 'auto' : 'hidden';
  };

  const toggleMobileResources = () => {
    setMobileResourcesOpen(!mobileResourcesOpen);
    document.body.style.overflow = mobileResourcesOpen ? 'auto' : 'hidden';
  };

  const closeAllMenus = () => {
    setMobileNavOpen(false);
    document.body.style.overflow = 'auto';
  };

  const location = useLocation();
  const isNacosExec = location.pathname === '/about/nacos-executives';

  return (
    <>
      <header
        className={`top-0 z-50 w-full transition-all duration-300 sticky shadow-md border-b ${
          theme === 'light'
            ? 'bg-white border-gray-200 text-black'
            : 'bg-[#083002] border-[#138601]/25 text-white'
        }`}
      >
        <div className="flex items-center justify-between md:justify-start h-16 site-container w-full">
          <div className="flex items-center flex-shrink-0 mr-8">
            <ScrollToTopLink to="/" className="flex items-center">
              <img
                src={theme === 'dark' ? logoDark : logoLight}
                alt="NACOS FUTO Logo"
                className="h-7 md:h-9 w-auto object-contain transition-all duration-300"
              />
            </ScrollToTopLink>
          </div>
          <div className="flex-1 hidden md:flex justify-center items-center gap-8">
            <DesktopNav
              toggleResources={toggleDesktopResources}
              toggleDarkMode={toggleTheme}
              darkMode={theme === 'dark'}
              theme={theme}
            />
          </div>
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className={`md:hidden p-2 rounded cursor-pointer transition-colors ${
              theme === 'light'
                ? 'text-black hover:bg-gray-100 hover:text-[#138601]'
                : 'text-white hover:bg-white/10'
            }`}
            aria-label="Toggle mobile menu"
          >
            {mobileNavOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>

        <MobileNav
          isOpen={mobileNavOpen}
          closeMenu={closeAllMenus}
          toggleResourcesOverlay={toggleMobileResources}
          isResourcesOpen={mobileResourcesOpen}
          toggleDarkMode={toggleTheme}
          darkMode={theme === 'dark'}
        />
      </header>

      <ResourcesOverlay
        isOpen={desktopResourcesOpen}
        closeOverlay={toggleDesktopResources}
      />
    </>
  );
};

export default Navbar;
