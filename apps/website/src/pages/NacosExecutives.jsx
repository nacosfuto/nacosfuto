import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '../components/Nav/Navbar';
import Footer from '../components/Footer';
import { useTheme } from '../context/ThemeContext';
import execGroupImg from '../assets/nacos_exec_group.jpg';
import TechTeamSection from '../components/TechTeamSection';
import { FiClock, FiChevronDown, FiChevronUp, FiCalendar } from 'react-icons/fi';
import { 
  getExecutives, 
  getExecutivesSettings, 
  DEFAULT_EXECUTIVES_PAGE_SETTINGS,
  fetchExecutivesFromSupabase
} from '@nacos/supabase';

const NacosExecutives = () => {
  const { theme } = useTheme();

  const [pageSettings, setPageSettings] = useState(DEFAULT_EXECUTIVES_PAGE_SETTINGS);
  const [currentExecutives, setCurrentExecutives] = useState([]);
  const [pastExecutives, setPastExecutives] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Past Executives Archive State (View Only When Clicked / Selected By Tenure)
  const [showPastExecutives, setShowPastExecutives] = useState(false);
  const [selectedTenure, setSelectedTenure] = useState('');

  const tenureList = useMemo(() => {
    const set = new Set();
    pastExecutives.forEach(e => {
      if (e.session) set.add(e.session);
    });
    return Array.from(set).sort().reverse().map(session => {
      const pres = pastExecutives.find(e => (e.session === session) && (e.role?.toLowerCase().includes('president') && !e.role?.toLowerCase().includes('vice')));
      const leader = pres?.name ? pres.name.replace(/^(rtr\.?\s*)?(high\s+)?comr(ade)?\.?\s+/i, '') : 'Past Executives';
      return { session, leader };
    });
  }, [pastExecutives]);

  const availableTenures = useMemo(() => tenureList.map(t => t.session), [tenureList]);
  const displayedPastExecutives = useMemo(() => {
    if (!selectedTenure) return [];
    return pastExecutives.filter(e => (e.session || '2024/2025') === selectedTenure);
  }, [pastExecutives, selectedTenure]);

  const loadData = () => {
    try {
      setPageSettings(getExecutivesSettings());
      setCurrentExecutives(getExecutives('current'));
      setPastExecutives(getExecutives('past'));
    } catch (e) {
      console.warn('Error loading executives data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    fetchExecutivesFromSupabase().then(() => loadData()).catch(() => {});

    const handleExecutivesUpdate = () => {
      setCurrentExecutives(getExecutives('current'));
      setPastExecutives(getExecutives('past'));
    };

    const handleSettingsUpdate = () => {
      setPageSettings(getExecutivesSettings());
    };

    window.addEventListener('nacos_executives_updated', handleExecutivesUpdate);
    window.addEventListener('nacos_executives_settings_updated', handleSettingsUpdate);

    return () => {
      window.removeEventListener('nacos_executives_updated', handleExecutivesUpdate);
      window.removeEventListener('nacos_executives_settings_updated', handleSettingsUpdate);
    };
  }, []);

  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <Navbar />
      
      <main className="flex-grow">
        {/* Hero section with group photo - edge-to-edge & fully editable via dashboard */}
        <div className="relative w-full h-[55vh] min-h-[450px] md:min-h-[550px] bg-gray-950 overflow-hidden shadow-2xl mb-16">
          <img 
            src={pageSettings.heroImage || execGroupImg} 
            alt="NACOS Executives Group" 
            className="w-full h-full object-cover object-[center_30%] md:object-[center_25%] animate-fade-in" 
          />
          {/* Dark gradient overlay that blends at the bottom and top for navbar readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/30 to-black/45"></div>
          
          {/* Text content overlaid on the bottom */}
          <div className="absolute bottom-0 left-0 right-0 w-full p-8 md:p-12 text-white">
            <div className="site-container w-full text-left flex flex-col items-start">
              <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4 drop-shadow-md">
                {pageSettings.heroTitle || 'NACOS EXECUTIVES'}{' '}
                {pageSettings.heroYear && <span className="text-green-400">{pageSettings.heroYear}</span>}
              </h1>
              <p className="text-base md:text-lg opacity-90 max-w-2xl drop-shadow-sm leading-relaxed">
                {pageSettings.heroSubtitle || 'Meet the team elected to serve and represent the students of the Department of Computer Science.'}
              </p>
            </div>
          </div>
        </div>

        {/* Grid Content Container */}
        <div className="site-container pb-20 w-full">
          
          {/* About NACOS Overview Section */}
          <div className="mb-14">
            <div className={`p-6 sm:p-8 md:p-10 rounded-[5px] border transition-all text-center ${
              theme === 'dark'
                ? 'bg-[#083002] border-[#138601]/40 text-white'
                : 'bg-white border-gray-200 text-gray-900 shadow-sm'
            }`}>
              <div className="max-w-3xl mx-auto flex flex-col items-center">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-3 text-black dark:text-white">
                  About <span className="text-[#138601] dark:text-[#4bd043]">NACOS FUTO</span>
                </h2>
                <p className="text-sm md:text-base leading-relaxed opacity-90 text-gray-700 dark:text-gray-300">
                  The Nigeria Association of Computing Students (NACOS), Federal University of Technology, Owerri (FUTO) Chapter, is the premier umbrella body uniting all undergraduate and postgraduate computing scholars in the Department of Computer Science. As the foremost student technology organization in the region, NACOS serves as the vital bridge between academic coursework, practical software craftsmanship, and the global technology ecosystem.
                </p>
              </div>
            </div>
          </div>

          {/* Section 1: Current Executives (Three per row on desktop) */}
          <div className="mb-20">
            <div className="flex items-center gap-4 mb-10">
              <h2 className="text-2xl md:text-3xl font-black tracking-tight">
                {pageSettings.currentSessionTitle || 'Current Executives (2025/2026)'}
              </h2>
              <div className="h-1 flex-grow bg-gradient-to-r from-green-500 to-transparent rounded-full opacity-35"></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
              {currentExecutives.map((exec, index) => (
                <div 
                  key={exec.id || index} 
                  className={`w-full max-w-[340px] md:max-w-[360px] mx-auto flex flex-col border p-4 shadow-sm transition-all duration-300 rounded-xl hover:shadow-lg ${
                    theme === 'dark' 
                      ? 'bg-[#083002] border-[#138601]/40 text-white' 
                      : 'bg-white border-gray-200 text-gray-900'
                  }`}
                >
                  {/* Bounding box for image */}
                  <div className={`border overflow-hidden rounded-lg aspect-[4/4.5] flex items-center justify-center ${theme === 'dark' ? 'border-[#138601]/20 bg-gray-900/60' : 'border-gray-200 bg-gray-100'}`}>
                    {exec.image ? (
                      <img 
                        src={exec.image} 
                        alt={exec.name} 
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" 
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-400 p-3">
                        <svg className="w-12 h-12 opacity-40 mb-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                        <span className="text-[10px] font-semibold opacity-60 uppercase tracking-wider">No Photo</span>
                      </div>
                    )}
                  </div>

                  {/* Divider line */}
                  <div className={`border-t my-3.5 ${theme === 'dark' ? 'border-[#138601]/20' : 'border-gray-200'}`}></div>

                  {/* Details section without level */}
                  <div className="flex flex-col items-center text-center flex-grow">
                    <h3 className={`font-bold text-base leading-tight tracking-wide uppercase mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-950'}`}>
                      {exec.name}
                    </h3>
                    
                    {/* Position */}
                    <h4 className={`font-extrabold text-xs uppercase tracking-wider pt-2.5 border-t w-full mt-auto ${
                      theme === 'dark' 
                        ? 'text-[#4bd043] border-[#138601]/20' 
                        : 'text-[#138601] border-gray-100'
                    }`}>
                      {exec.role}
                    </h4>
                  </div>
                </div>
              ))}
            </div>

            {currentExecutives.length === 0 && !isLoading && (
              <p className="text-center text-gray-500 py-8 text-sm">No current executives listed.</p>
            )}
          </div>

          {/* Section 2: Past Executive Teams */}
          <div className="mt-16 pt-12 border-t border-gray-200 dark:border-gray-800">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[#138601] dark:text-[#4bd043] mb-3">
                Past Executive Teams
              </h2>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                We honor the contributions of our previous executive teams who have shaped NACOS into what it is today.
              </p>
            </div>

            {availableTenures.length === 0 ? (
              <div className="text-center py-8 px-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No past executive tenures archived yet. Past councils will appear here once published or archived from the dashboard.
                </p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-xl mx-auto mb-10 px-4">
                <label htmlFor="tenure-dropdown-select" className="text-sm font-bold text-gray-700 dark:text-gray-200 whitespace-nowrap">
                  Select Past Tenure:
                </label>
                <div className="relative w-full max-w-sm">
                  <select
                    id="tenure-dropdown-select"
                    value={selectedTenure}
                    onChange={(e) => setSelectedTenure(e.target.value)}
                    className="w-full appearance-none px-4 py-3 pr-10 rounded-xl border font-semibold text-sm bg-white dark:bg-[#083002] border-gray-300 dark:border-[#138601]/50 text-gray-900 dark:text-white shadow-sm hover:border-[#138601] focus:outline-none focus:ring-2 focus:ring-[#138601] cursor-pointer transition-all"
                  >
                    <option value="">-- Choose Past Tenure --</option>
                    {availableTenures.map((session) => (
                      <option key={session} value={session} className="text-gray-900 dark:text-white dark:bg-gray-900">
                        {session} Academic Session
                      </option>
                    ))}
                  </select>
                  <FiChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-green-600 dark:text-green-400 text-lg" />
                </div>
              </div>
            )}

            {/* Display Executives for Selected Tenure - Hidden except when a tenure is chosen */}
            {selectedTenure && (
              <div className="animate-in fade-in duration-300 mt-6">
                <div className="flex items-center justify-between gap-4 mb-8 pb-3 border-b border-gray-200 dark:border-[#138601]/20">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Executives for Tenure <span className="text-[#138601] dark:text-[#4bd043]">{selectedTenure}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedTenure('')}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-bold hover:bg-gray-100 dark:hover:bg-[#083002] transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <FiChevronUp className="text-sm" />
                    <span>Hide</span>
                  </button>
                </div>

                {/* Grid of Executives for Selected Tenure */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
                  {displayedPastExecutives.map((exec, index) => (
                    <div 
                      key={exec.id || index} 
                      className={`w-full max-w-[340px] md:max-w-[360px] mx-auto flex flex-col border p-4 shadow-sm transition-all duration-300 rounded-xl hover:shadow-lg ${
                        theme === 'dark' 
                          ? 'bg-[#083002] border-[#138601]/40 text-white' 
                          : 'bg-white border-gray-200 text-gray-900'
                      }`}
                    >
                      {/* Bounding box for image */}
                      <div className={`border overflow-hidden rounded-lg aspect-[4/4.5] flex items-center justify-center relative ${theme === 'dark' ? 'border-[#138601]/20 bg-gray-900/60' : 'border-gray-200 bg-gray-100'}`}>
                        {exec.image ? (
                          <img 
                            src={exec.image} 
                            alt={exec.name} 
                            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" 
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-gray-400 p-3">
                            <svg className="w-12 h-12 opacity-40 mb-1" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                            <span className="text-[10px] font-semibold opacity-60 uppercase tracking-wider">No Photo</span>
                          </div>
                        )}
                        <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-[5px] bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono font-bold">
                          {exec.session || activeTenure}
                        </div>
                      </div>

                      {/* Divider line */}
                      <div className={`border-t my-3.5 ${theme === 'dark' ? 'border-[#138601]/20' : 'border-gray-200'}`}></div>

                      {/* Details section */}
                      <div className="flex flex-col items-center text-center flex-grow">
                        <h3 className={`font-bold text-base leading-tight tracking-wide uppercase mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-950'}`}>
                          {exec.name}
                        </h3>
                        
                        {/* Position */}
                        <h4 className={`font-extrabold text-xs uppercase tracking-wider pt-2.5 border-t w-full mt-auto ${
                          theme === 'dark' 
                            ? 'text-[#4bd043] border-[#138601]/20' 
                            : 'text-[#138601] border-gray-150'
                        }`}>
                          {exec.role}
                        </h4>
                      </div>
                    </div>
                  ))}
                </div>

                {displayedPastExecutives.length === 0 && (
                  <p className="text-center text-gray-500 py-12 text-sm">
                    No executives found for tenure {activeTenure}.
                  </p>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Tech Team Section */}
        <TechTeamSection />
      </main>
      <Footer />
    </div>
  );
};

export default NacosExecutives;
