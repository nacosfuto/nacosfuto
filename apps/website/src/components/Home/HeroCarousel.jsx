import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getOptimizedImageUrl } from '@nacos/media';
import { fetchPublishedHeroSlides, getLocalPublishedHeroSlides, HERO_SLIDES_EVENT, supabase } from '@nacos/supabase';
import ScrollToTopLink from '../ScrollToTopLink';

const AUTOPLAY_INTERVAL_MS = 5500;

export const HeroCarousel = ({
  cmsContent = {
    hero_headline: 'Empowering the Next Generation of Computer Scientists',
    hero_subtext: "Join FUTO's vibrant CS community. Innovate, learn, and lead the future of global computing technology."
  }
}) => {
  const [slides, setSlides] = useState(() => getLocalPublishedHeroSlides());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const timerRef = useRef(null);

  // Check reduced-motion preference
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
      const listener = (e) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener?.('change', listener);
      return () => mediaQuery.removeEventListener?.('change', listener);
    }
  }, []);

  // Load published slides from Supabase & synchronize
  const loadSlides = useCallback(async () => {
    try {
      const published = await fetchPublishedHeroSlides();
      if (Array.isArray(published)) {
        setSlides(published);
        // Ensure currentIndex does not exceed new slide count
        setCurrentIndex((prev) => (published.length > 0 ? prev % published.length : 0));
      }
    } catch (err) {
      console.warn('Hero carousel slide fetch error:', err);
    }
  }, []);

  useEffect(() => {
    loadSlides();

    // Event listener for cross-tab or in-page admin sync
    const handleSync = () => loadSlides();
    window.addEventListener(HERO_SLIDES_EVENT, handleSync);

    // Supabase Realtime channel subscription if configured
    let channel = null;
    if (supabase && typeof supabase.channel === 'function') {
      try {
        channel = supabase
          .channel('public:website_hero_slides')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'website_hero_slides' }, () => {
            loadSlides();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'id_card_settings', filter: 'id=eq.store_hero_slides' }, () => {
            loadSlides();
          })
          .subscribe();
      } catch (err) {
        console.debug('Realtime subscribe notice:', err);
      }
    }

    return () => {
      window.removeEventListener(HERO_SLIDES_EVENT, handleSync);
      if (channel && typeof supabase.removeChannel === 'function') {
        supabase.removeChannel(channel);
      }
    };
  }, [loadSlides]);

  const slideCount = slides.length;

  const goToNext = useCallback(() => {
    if (slideCount <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % slideCount);
  }, [slideCount]);

  const goToPrev = useCallback(() => {
    if (slideCount <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + slideCount) % slideCount);
  }, [slideCount]);

  const goToSlide = useCallback((index) => {
    if (index >= 0 && index < slideCount) {
      setCurrentIndex(index);
    }
  }, [slideCount]);

  // Autoplay timer
  useEffect(() => {
    if (slideCount <= 1 || isHovered || prefersReducedMotion) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      goToNext();
    }, AUTOPLAY_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [slideCount, isHovered, prefersReducedMotion, goToNext]);

  // Keyboard accessibility
  const handleKeyDown = (e) => {
    if (slideCount <= 1) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goToPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goToNext();
    }
  };

  const currentSlide = slides[currentIndex] || null;

  // Active text content: slide override or global CMS fallback
  const headline = (currentSlide && currentSlide.heading && currentSlide.heading.trim()) || cmsContent.hero_headline;
  const subtext = (currentSlide && currentSlide.subtext && currentSlide.subtext.trim()) || cmsContent.hero_subtext;

  return (
    <section
      className="relative flex min-h-[calc(100dvh-64px)] md:h-[calc(100vh-64px)] items-center justify-center overflow-hidden bg-gray-950 px-4 sm:px-6 focus:outline-hidden"
      role="region"
      aria-roledescription="carousel"
      aria-label="Department of Computer Science FUTO Hero Carousel"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* ─── Hero Slide Background Images ─── */}
      {slides.map((slide, idx) => {
        const isActive = idx === currentIndex;
        const optimizedUrl = getOptimizedImageUrl(slide.image_url, {
          width: 1920,
          quality: 'auto',
          format: 'auto'
        });

        return (
          <img
            key={slide.id || idx}
            src={optimizedUrl}
            alt={slide.title || `FUTO Computer Science Hero Slide ${idx + 1}`}
            style={{
              objectPosition: slide.image_position || 'center 35%'
            }}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out pointer-events-none select-none ${
              isActive ? 'opacity-100 z-0' : 'opacity-0 -z-10'
            }`}
            fetchPriority={idx === 0 ? 'high' : 'auto'}
            loading={idx === 0 ? 'eager' : 'lazy'}
            decoding="async"
          />
        );
      })}

      {/* ─── Preserved Visual Identity Overlays ─── */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#041801]/95 via-[#041801]/60 to-black/35 z-1 pointer-events-none" />
      <div className="absolute inset-0 bg-black/25 z-1 pointer-events-none" />

      {/* ─── Overlayed Hero Content (Headline, Subtext, Optional CTA) ─── */}
      <div className="relative z-10 text-center px-4 sm:px-6 max-w-4xl mx-auto flex flex-col items-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-4 sm:mb-6 drop-shadow-lg tracking-tight leading-[1.2] transition-all duration-500">
          {headline}
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-gray-100 max-w-2xl drop-shadow font-normal leading-relaxed text-center transition-all duration-500">
          {subtext}
        </p>

        {/* Optional Slide-Specific Call to Action */}
        {currentSlide?.cta_text && currentSlide?.cta_link && (
          <div className="mt-6 sm:mt-8 flex items-center justify-center gap-3">
            <ScrollToTopLink
              to={currentSlide.cta_link}
              className="inline-flex items-center justify-center px-7 py-3 rounded-xl bg-[#138601] hover:bg-[#0f6c01] text-white font-bold text-sm sm:text-base shadow-xl hover:shadow-green-900/40 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              {currentSlide.cta_text}
            </ScrollToTopLink>
          </div>
        )}
      </div>

      {/* ─── Previous & Next Navigation Controls (Rendered when > 1 slide) ─── */}
      {slideCount > 1 && (
        <>
          <button
            type="button"
            onClick={goToPrev}
            aria-label="Previous hero slide"
            className="hidden sm:flex absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 w-11 h-11 items-center justify-center rounded-full bg-black/30 hover:bg-black/60 text-white/90 hover:text-white border border-white/15 backdrop-blur-xs transition-all duration-200 cursor-pointer shadow-lg active:scale-95 focus:outline-hidden focus:ring-2 focus:ring-[#138601]"
          >
            <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
          </button>

          <button
            type="button"
            onClick={goToNext}
            aria-label="Next hero slide"
            className="hidden sm:flex absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 w-11 h-11 items-center justify-center rounded-full bg-black/30 hover:bg-black/60 text-white/90 hover:text-white border border-white/15 backdrop-blur-xs transition-all duration-200 cursor-pointer shadow-lg active:scale-95 focus:outline-hidden focus:ring-2 focus:ring-[#138601]"
          >
            <ChevronRight className="w-6 h-6" strokeWidth={2.5} />
          </button>
        </>
      )}

      {/* ─── Slide Indicator Dots / Bar (Rendered when > 1 slide) ─── */}
      {slideCount > 1 && (
        <div
          className="absolute bottom-6 md:bottom-8 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-xs border border-white/10"
          role="tablist"
          aria-label="Hero slide indicators"
        >
          {slides.map((slide, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={slide.id || idx}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Go to slide ${idx + 1} of ${slideCount}`}
                onClick={() => goToSlide(idx)}
                className={`h-2 transition-all duration-300 rounded-full cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-white ${
                  isActive
                    ? 'w-7 sm:w-8 bg-[#138601] shadow-xs'
                    : 'w-2 bg-white/40 hover:bg-white/80'
                }`}
              />
            );
          })}
        </div>
      )}

      {/* Screen reader live region for slide announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {slideCount > 0
          ? `Slide ${currentIndex + 1} of ${slideCount}: ${headline}`
          : headline}
      </div>
    </section>
  );
};

export default HeroCarousel;
