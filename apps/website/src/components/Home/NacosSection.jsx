import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FaUserTie } from 'react-icons/fa';
import { FiChevronLeft, FiChevronRight, FiArrowRight } from 'react-icons/fi';
import ScrollToTopLink from '../ScrollToTopLink';
import { getExecutives, fetchExecutivesFromSupabase } from '@nacos/supabase';
const NacosSection = () => {
  const [executivesList, setExecutivesList] = useState(() => {
    try {
      const cur = getExecutives('current');
      if (Array.isArray(cur) && cur.length > 0) return cur;
    } catch (_) {
      // Fallback gracefully to empty array
    }
    return [];
  });

  useEffect(() => {
    const loadCurrentExecutives = (liveData) => {
      try {
        if (Array.isArray(liveData) && liveData.length > 0) {
          const cur = liveData.filter(e => e.category === 'current');
          if (cur.length > 0) {
            setExecutivesList(cur);
            return;
          }
        }
        const cur = getExecutives('current');
        if (Array.isArray(cur) && cur.length > 0) {
          setExecutivesList(cur);
        }
      } catch (e) {
        console.warn('Error loading executives in NacosSection:', e);
      }
    };

    loadCurrentExecutives();
    fetchExecutivesFromSupabase().then((live) => loadCurrentExecutives(live)).catch(() => {});

    const handleUpdate = () => {
      fetchExecutivesFromSupabase().then((live) => loadCurrentExecutives(live)).catch(() => loadCurrentExecutives());
    };
    window.addEventListener('nacos_executives_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('nacos_executives_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const rawList = executivesList && executivesList.length > 0 ? executivesList : [];

  // Carousel Items structure mapping
  const items = useMemo(() => {
    return rawList.map((exec, idx) => {
      const roleStr = exec.role || exec.position || 'Executive';
      const isPresident = roleStr.toLowerCase().includes('president') && !roleStr.toLowerCase().includes('vice');
      const displayImg = exec.image || exec.image_url || '';

      return {
        id: exec.id || `exec-${idx}`,
        title: exec.name,
        subtitle: roleStr,
        image: displayImg,
        fallbackImage: '',
        link: "/about/nacos-executives",
        accentColor: "#10b981", // Green theme accent
        badge: isPresident ? "President" : undefined
      };
    });
  }, [rawList]);

  const autoplaySpeed = 0.0068; // Increased continuous carousel speed

  // Carousel state
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const containerRef = useRef(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startScroll = useRef(0);
  const targetPosition = useRef(null);
  const animationFrameRef = useRef(null);
  const dragDistance = useRef(0);

  // Client viewport detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
      setIsTablet(window.innerWidth >= 640 && window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Calculate active index based on center proximity
  const activeIndex = Math.round(scrollPosition + (items.length || 1) * 4) % (items.length || 1);
  const activeItem = items[activeIndex] || items[0];

  // Next and Prev handlers
  const handleNext = useCallback(() => {
    const currentTarget = targetPosition.current !== null ? targetPosition.current : scrollPosition;
    targetPosition.current = Math.round(currentTarget + 1);
  }, [scrollPosition]);

  const handlePrev = useCallback(() => {
    const currentTarget = targetPosition.current !== null ? targetPosition.current : scrollPosition;
    targetPosition.current = Math.round(currentTarget - 1);
  }, [scrollPosition]);

  // Click card to center it
  const handleCardClick = (index, dist, e) => {
    if (isDragging.current || dragDistance.current > 5) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (Math.abs(dist) < 0.2) return; // Click link inside card if centered

    e.preventDefault();
    e.stopPropagation();
    targetPosition.current = scrollPosition + dist;
  };

  // Continuous animation frame loop
  useEffect(() => {
    if (!items.length) return;

    const updatePhysics = () => {
      if (isDragging.current) {
        animationFrameRef.current = requestAnimationFrame(updatePhysics);
        return;
      }

      if (targetPosition.current !== null) {
        // Glide to target card
        const diff = targetPosition.current - scrollPosition;
        if (Math.abs(diff) < 0.005) {
          setScrollPosition((targetPosition.current + items.length * 4) % items.length);
          targetPosition.current = null;
        } else {
          setScrollPosition((prev) => (prev + diff * 0.08 + items.length * 4) % items.length);
        }
      } else if (!isHovered) {
        // Auto-glide
        setScrollPosition((prev) => (prev + autoplaySpeed + items.length * 4) % items.length);
      }

      animationFrameRef.current = requestAnimationFrame(updatePhysics);
    };

    animationFrameRef.current = requestAnimationFrame(updatePhysics);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [scrollPosition, isHovered, items.length, autoplaySpeed]);

  // Drag handlers
  const handleDragStart = (e) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    isDragging.current = true;
    startX.current = e.clientX;
    startScroll.current = scrollPosition;
    dragDistance.current = 0;
    targetPosition.current = null;

    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handleDragMove = (e) => {
    if (!isDragging.current) return;
    const dx = e.clientX - startX.current;
    dragDistance.current = Math.abs(dx);

    const dragSpacing = isMobile ? 200 : isTablet ? 260 : 340;
    const dragOffset = -dx / dragSpacing;

    let newScroll = (startScroll.current + dragOffset + items.length * 4) % items.length;
    setScrollPosition(newScroll);
  };

  const handleDragEnd = (e) => {
    if (!isDragging.current) return;
    isDragging.current = false;

    if (containerRef.current) {
      containerRef.current.releasePointerCapture(e.pointerId);
    }

    const nearestIndex = Math.round(scrollPosition);
    let target = nearestIndex;
    let diff = target - scrollPosition;
    if (diff > items.length / 2) target -= items.length;
    if (diff < -items.length / 2) target += items.length;

    targetPosition.current = target;
    setTimeout(() => {
      dragDistance.current = 0;
    }, 50);
  };

  // Layout sizing parameters - compact & fitted for one glance on desktop
  const minWidth = isMobile ? 140 : isTablet ? 170 : 210;
  const maxWidth = isMobile ? 200 : isTablet ? 230 : 280;
  const gap = isMobile ? 10 : isTablet ? 14 : 18;

  // Visible items projection
  const visibleItems = items
    .map((item, index) => {
      let dist = index - scrollPosition;
      const half = items.length / 2;
      if (dist > half) dist -= items.length;
      if (dist < -half) dist += items.length;
      return { item, index, dist, absDist: Math.abs(dist) };
    })
    .filter((d) => d.absDist < 2.0)
    .sort((a, b) => a.dist - b.dist);

  let activeSortedIndex = 0;
  let minAbsDist = Infinity;
  visibleItems.forEach((d, idx) => {
    if (d.absDist < minAbsDist) {
      minAbsDist = d.absDist;
      activeSortedIndex = idx;
    }
  });

  const widths = visibleItems.map((d) => {
    return maxWidth - Math.min(d.absDist, 1.0) * (maxWidth - minWidth);
  });

  const offsets = new Array(visibleItems.length).fill(0);
  if (visibleItems.length > 0) {
    const activeItemData = visibleItems[activeSortedIndex];
    const activeWidth = widths[activeSortedIndex];
    offsets[activeSortedIndex] = activeItemData.dist * (activeWidth + gap);

    for (let j = activeSortedIndex + 1; j < visibleItems.length; j++) {
      offsets[j] = offsets[j - 1] + widths[j - 1] / 2 + gap + widths[j] / 2;
    }

    for (let j = activeSortedIndex - 1; j >= 0; j--) {
      offsets[j] = offsets[j + 1] - widths[j] / 2 - gap - widths[j + 1] / 2;
    }
  }

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <section className="relative flex flex-col justify-center items-center min-h-[calc(100dvh-64px)] md:h-[calc(100vh-64px)] py-6 sm:py-8 bg-white dark:bg-[#041801] border-t border-b border-gray-200 dark:border-[#138601]/20 text-black dark:text-white overflow-hidden transition-colors duration-300">
      <div className="site-container w-full flex flex-col justify-between items-center h-full max-h-[calc(100vh-80px)]">
        {/* Centered Introduction Header */}
        <div className="text-center max-w-xl mx-auto mb-2 sm:mb-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-black dark:text-white mb-1.5">
            <span className="text-[#138601] dark:text-[#4bd043]">NACOS</span> Executives
          </h2>
          <p className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm leading-snug">
            Elected student leadership driving computing innovation, mentorship, and tech excellence across FUTO.
          </p>
        </div>

        {/* Full-width Carousel Area */}
        <div className="flex flex-col items-center justify-center w-full flex-grow my-auto">

          {/* Carousel Stage Track */}
          <div
            ref={containerRef}
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerCancel={handleDragEnd}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="relative w-full h-[290px] sm:h-[330px] md:h-[370px] lg:h-[390px] overflow-visible cursor-grab active:cursor-grabbing select-none flex justify-center items-center"
          >
            {visibleItems.map((data, idx) => {
              const { item, dist, absDist } = data;
              const cardWidth = widths[idx];
              const offsetX = offsets[idx];

              const opacity = 1.0 - Math.min(absDist, 1.2) * 0.55;
              const blurVal = Math.min(absDist, 1.2) * 0.8;
              const isActive = absDist < 0.5;

              return (
                <div
                  key={item.id}
                  onClick={(e) => handleCardClick(data.index, dist, e)}
                  style={{
                    width: `${cardWidth}px`,
                    transform: `translate3d(calc(-50% + ${offsetX}px), -50%, 0)`,
                    opacity: opacity,
                    filter: `blur(${blurVal}px)`,
                    zIndex: isActive ? 30 : 20,
                  }}
                  className="absolute left-1/2 top-1/2 h-[250px] sm:h-[290px] md:h-[330px] lg:h-[350px] rounded-[5px] overflow-hidden border border-[#138601]/40 bg-[#083002] dark:bg-[#083002] shadow-lg transition-shadow duration-[600ms] group pointer-events-auto"
                >
                  {/* Background image */}
                  <div className="absolute inset-0 w-full h-full pointer-events-none">
                    <img
                      src={item.image}
                      alt={item.title}
                      onError={(e) => {
                        if (item.fallbackImage && e.currentTarget.src !== item.fallbackImage) {
                          e.currentTarget.src = item.fallbackImage;
                        }
                      }}
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                  </div>

                  {/* Accented Badge for President */}
                  {item.badge && isActive && (
                    <div className="absolute top-4 left-4 z-10">
                      <span
                        className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded text-white backdrop-blur-md shadow-sm border border-white/10"
                        style={{ backgroundColor: `${item.accentColor}cc` }}
                      >
                        {item.badge}
                      </span>
                    </div>
                  )}

                  {/* Active Card Bottom Details Overlay */}
                  <div
                    className={`absolute bottom-0 left-0 right-0 p-4 md:p-5 z-10 flex flex-col justify-end transition-all duration-[600ms] ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                      }`}
                  >
                    <div className="space-y-1 max-w-sm text-left">
                      <h4 className="text-sm md:text-base font-black text-white tracking-tight leading-tight uppercase">
                        {item.title}
                      </h4>
                      <p className="text-white/80 text-[11px] md:text-xs font-semibold">
                        {item.subtitle}
                      </p>
                      {item.link && isActive && (
                        <div className="pt-2">
                          <ScrollToTopLink
                            to={item.link}
                            className="inline-flex items-center gap-1 px-4 py-1 bg-[#138601] hover:bg-[#0f6c01] text-white font-semibold text-[11px] rounded shadow-2xs transition-colors cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Explore Bio
                            <FiArrowRight className="text-[10px]" />
                          </ScrollToTopLink>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Slide Navigation Dots and Action Button */}
          <div className="flex flex-col items-center gap-3 sm:gap-4 mt-5 sm:mt-6">
            <div className="flex gap-2">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    let target = i;
                    let diff = target - scrollPosition;
                    if (diff > items.length / 2) target -= items.length;
                    if (diff < -items.length / 2) target += items.length;
                    targetPosition.current = target;
                  }}
                  className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${i === activeIndex ? 'w-8 bg-green-500' : 'w-2.5 bg-gray-300 dark:bg-gray-700 hover:bg-green-300'
                    }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>

            <ScrollToTopLink
              to="/about/nacos-executives"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#138601] hover:bg-[#0f6c01] text-white font-semibold text-sm rounded shadow-sm transition-colors cursor-pointer group min-h-[42px]"
            >
              <span>Meet All NACOS Executives</span>
              <FiArrowRight className="text-xs transition-transform duration-200 group-hover:translate-x-1" />
            </ScrollToTopLink>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NacosSection;
