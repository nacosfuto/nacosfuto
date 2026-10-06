import React, { useState, useEffect } from 'react';
import Navbar from '../components/Nav/Navbar';
import Footer from '../components/Footer';
import { useTheme } from '../context/ThemeContext';
import { FiCamera, FiMaximize2, FiX, FiFilter, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { CloudinaryImage, getCloudinaryAssetUrl } from '@nacos/media';
import { supabase, getGalleryItems, fetchGalleryFromSupabase } from '@nacos/supabase';

// Local fallbacks
import galleryDeptFront from '../assets/gallery_dept_front.jpg';
import galleryStudentGroup from '../assets/gallery_student_group.jpg';
import galleryTraditionalDay from '../assets/gallery_traditional_day.jpg';
import galleryNatureHangout from '../assets/gallery_nature_hangout.jpg';
import nacos1 from '../assets/nacos1.jpg';
import nacos2 from '../assets/nacos2.jpg';
import nacos3 from '../assets/nacos3.jpg';
import nacos4 from '../assets/nacos4.jpg';
import nacos5 from '../assets/nacos5.jpg';
import nacos6 from '../assets/nacos6.jpg';
import nacos7 from '../assets/nacos7.jpg';
import nacos8 from '../assets/nacos8.jpg';
import nacos9 from '../assets/nacos9.jpg';
import nacos10 from '../assets/nacos10.jpg';
import nacos11 from '../assets/nacos11.jpg';
import nacos12 from '../assets/nacos12.jpg';

const CANONICAL_GALLERY = [
  {
    publicId: 'nacos/gallery/gallery_dept_front',
    src: getCloudinaryAssetUrl('gallery_dept_front') || galleryDeptFront,
    caption: 'NACOS Student Leaders at the Department of Computer Science (TETFUND Complex)',
    category: 'Academics'
  },
  {
    publicId: 'nacos/gallery/gallery_student_group',
    src: getCloudinaryAssetUrl('gallery_student_group') || galleryStudentGroup,
    caption: 'FUTO Computing Students Outdoor Hangout & Mixer',
    category: 'Socials'
  },
  {
    publicId: 'nacos/gallery/gallery_traditional_day',
    src: getCloudinaryAssetUrl('gallery_traditional_day') || galleryTraditionalDay,
    caption: 'Traditional Attire Cultural Day Celebrations',
    category: 'Culture'
  },
  {
    publicId: 'nacos/gallery/gallery_nature_hangout',
    src: getCloudinaryAssetUrl('gallery_nature_hangout') || galleryNatureHangout,
    caption: 'Student Community Outing & Nature Meetup',
    category: 'Socials'
  },
  {
    publicId: 'nacos/gallery/nacos1',
    src: getCloudinaryAssetUrl('nacos1') || nacos1,
    caption: 'Tech Symposium Panel Discussion with Industry Guest Speakers',
    category: 'Tech'
  },
  {
    publicId: 'nacos/gallery/nacos2',
    src: getCloudinaryAssetUrl('nacos2') || nacos2,
    caption: 'Hackathon Sprint & Collaborative Coding Arena',
    category: 'Tech'
  },
  {
    publicId: 'nacos/gallery/nacos3',
    src: getCloudinaryAssetUrl('nacos3') || nacos3,
    caption: 'Departmental Software Project Demonstration Day',
    category: 'Academics'
  },
  {
    publicId: 'nacos/gallery/nacos4',
    src: getCloudinaryAssetUrl('nacos4') || nacos4,
    caption: 'Freshmen Orientation & Computing Induction Ceremony',
    category: 'Campus Life'
  },
  {
    publicId: 'nacos/gallery/nacos5',
    src: getCloudinaryAssetUrl('nacos5') || nacos5,
    caption: 'Annual NACOS Dinner & Outstanding Scholar Awards Gala',
    category: 'Culture'
  },
  {
    publicId: 'nacos/gallery/nacos6',
    src: getCloudinaryAssetUrl('nacos6') || nacos6,
    caption: 'Hands-on Cloud & Cyber Security Workshop Session',
    category: 'Tech'
  },
  {
    publicId: 'nacos/gallery/nacos7',
    src: getCloudinaryAssetUrl('nacos7') || nacos7,
    caption: 'Departmental Sports Championship & Track Relay',
    category: 'Sports'
  },
  {
    publicId: 'nacos/gallery/nacos8',
    src: getCloudinaryAssetUrl('nacos8') || nacos8,
    caption: 'Alumni Tech Talk & Career Advisory Fireside Chat',
    category: 'Academics'
  },
  {
    publicId: 'nacos/gallery/nacos9',
    src: getCloudinaryAssetUrl('nacos9') || nacos9,
    caption: 'Women in Computing Roundtable & Mentorship Circle',
    category: 'Socials'
  },
  {
    publicId: 'nacos/gallery/nacos10',
    src: getCloudinaryAssetUrl('nacos10') || nacos10,
    caption: 'Open Source Community Code Contribution Sprint',
    category: 'Tech'
  },
  {
    publicId: 'nacos/gallery/nacos11',
    src: getCloudinaryAssetUrl('nacos11') || nacos11,
    caption: 'TETFUND Laboratory Hardware & Systems Programming Class',
    category: 'Academics'
  },
  {
    publicId: 'nacos/gallery/nacos12',
    src: getCloudinaryAssetUrl('nacos12') || nacos12,
    caption: 'Final Year Project Exhibition & Valedictory Showcase',
    category: 'Campus Life'
  }
];

const Gallery = () => {
    const { theme } = useTheme();
    const [images, setImages] = useState(() => getGalleryItems());
    const [activeFilter, setActiveFilter] = useState('All');
    const [selectedImageIndex, setSelectedImageIndex] = useState(null);

    const loadGallery = (liveItems) => {
        if (Array.isArray(liveItems) && liveItems.length > 0) {
            setImages(liveItems);
        } else {
            setImages(getGalleryItems());
        }
    };

    // Live sync with galleryService, Supabase, and admin changes
    useEffect(() => {
        loadGallery();
        fetchGalleryFromSupabase().then((data) => loadGallery(data)).catch(() => {});

        const handleUpdate = () => {
            fetchGalleryFromSupabase().then((data) => loadGallery(data)).catch(() => loadGallery());
        };
        window.addEventListener('nacos_website_gallery_updated', handleUpdate);
        window.addEventListener('storage', handleUpdate);

        return () => {
            window.removeEventListener('nacos_website_gallery_updated', handleUpdate);
            window.removeEventListener('storage', handleUpdate);
        };
    }, []);

    const categories = ['All', ...Array.from(new Set([
        'Academics', 'Tech', 'Culture', 'Socials', 'Campus Life', 'Sports',
        ...images.map(img => img.category).filter(Boolean)
    ]))];

    const filteredImages = activeFilter === 'All'
        ? images
        : images.filter(img => img.category === activeFilter);

    // Reset lightbox when filter changes
    const handleFilterChange = (cat) => {
        setActiveFilter(cat);
        setSelectedImageIndex(null);
    };

    // Lock background scroll when lightbox is open
    useEffect(() => {
        if (selectedImageIndex !== null) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [selectedImageIndex]);

    // Keyboard navigation for full image lightbox
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (selectedImageIndex === null) return;
            if (e.key === 'Escape') {
                setSelectedImageIndex(null);
            } else if (e.key === 'ArrowLeft') {
                setSelectedImageIndex(prev => (prev > 0 ? prev - 1 : filteredImages.length - 1));
            } else if (e.key === 'ArrowRight') {
                setSelectedImageIndex(prev => (prev < filteredImages.length - 1 ? prev + 1 : 0));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedImageIndex, filteredImages.length]);

    return (
        <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-[#041801] text-white' : 'bg-white text-gray-900'} transition-colors duration-300`}>
            <Navbar />

            <main className="flex-grow">
                {/* Full-width Home-Style Hero Section */}
                <section className="relative flex min-h-[460px] sm:min-h-[500px] md:h-[65vh] items-center justify-center overflow-hidden bg-gray-950">
                    <img
                        src={getCloudinaryAssetUrl('gallery_dept_front') || galleryDeptFront}
                        alt="Campus Life Gallery Banner"
                        className="absolute inset-0 w-full h-full object-cover object-center"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-[#041801]/95 via-[#041801]/60 to-black/35" />
                    <div className="absolute inset-0 bg-black/25" />

                    <div className="relative z-10 text-center px-4 sm:px-6 max-w-4xl mx-auto flex flex-col items-center py-16 sm:py-20 md:py-0">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#138601]/80 text-white font-bold text-xs uppercase tracking-wider mb-4 border border-green-400/30 shadow">
                            <FiCamera className="text-xs" />
                            <span>Visual Archive</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-4 drop-shadow-lg tracking-tight leading-[1.2]">
                            Campus Life <span className="text-[#4bd043]">Gallery</span>
                        </h1>
                        <p className="text-base sm:text-lg md:text-xl text-gray-100 max-w-2xl drop-shadow font-normal leading-relaxed text-center">
                            Capturing the moments, hackathons, academic forums, and community culture that define the Department of Computer Science at FUTO.
                        </p>
                    </div>
                </section>

                <div className="site-container py-12 w-full">
                    {/* Filter Pills */}
                    <div className="flex items-center justify-center flex-wrap gap-2 mb-10">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => handleFilterChange(cat)}
                                className={`px-4 py-2 rounded text-xs font-bold transition-all cursor-pointer ${
                                    activeFilter === cat
                                        ? 'bg-[#138601] text-white shadow-sm'
                                        : theme === 'dark'
                                            ? 'bg-[#083002] text-gray-200 hover:bg-[#138601]/30 border border-[#138601]/30'
                                            : 'bg-[#f8f9fa] text-gray-800 hover:bg-gray-100 border border-gray-200'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* 4:3 Landscape Ratio Grid with Interactive Fullscreen Click */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredImages.map((img, index) => (
                            <div 
                                key={index} 
                                onClick={() => setSelectedImageIndex(index)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setSelectedImageIndex(index);
                                    }
                                }}
                                role="button"
                                tabIndex={0}
                                aria-label={`View full image: ${img.caption}`}
                                className="relative group rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 border border-gray-200 dark:border-[#138601]/30 aspect-[4/3] bg-gray-900 cursor-pointer select-none ring-0 hover:ring-2 hover:ring-[#138601]/60 focus:outline-none focus:ring-2 focus:ring-[#138601]"
                            >
                                <img
                                    src={img.src}
                                    alt={img.caption}
                                    loading="lazy"
                                    className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-700 ease-out"
                                />

                                {/* Expand badge on top right */}
                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60 backdrop-blur-md p-2 rounded-full text-white/90 shadow-md">
                                    <FiMaximize2 className="text-sm" />
                                </div>
                                
                                {/* Description Overlay on Hover */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5 text-white text-left">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#4bd043] inline-block">
                                            {img.category}
                                        </span>
                                        <span className="text-[11px] text-gray-300 font-medium flex items-center gap-1">
                                            <FiMaximize2 className="text-[10px]" /> Click to view
                                        </span>
                                    </div>
                                    <p className="font-semibold text-xs sm:text-sm leading-snug drop-shadow-md text-white/95">
                                        {img.caption}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Interactive Full-Screen Lightbox Modal */}
                {selectedImageIndex !== null && filteredImages[selectedImageIndex] && (
                    <div 
                        className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 md:p-8 animate-fadeIn select-none"
                        onClick={() => setSelectedImageIndex(null)}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Image lightbox"
                    >
                        {/* Top Bar: Category, Counter & Close */}
                        <div 
                            className="flex items-center justify-between w-full max-w-6xl mx-auto z-10 py-1"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3">
                                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#138601]/90 text-white border border-green-400/30 shadow">
                                    {filteredImages[selectedImageIndex].category}
                                </span>
                                <span className="text-white/70 text-xs sm:text-sm font-medium">
                                    {selectedImageIndex + 1} of {filteredImages.length}
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedImageIndex(null)}
                                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border border-white/10 hover:scale-105"
                                aria-label="Close fullscreen view"
                            >
                                <FiX className="text-xl" />
                            </button>
                        </div>

                        {/* Center Display: Nav Arrows + Full Size Image */}
                        <div 
                            className="relative flex-grow flex items-center justify-center max-w-6xl w-full mx-auto my-2"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Previous Button */}
                            {filteredImages.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedImageIndex(prev => (prev > 0 ? prev - 1 : filteredImages.length - 1))}
                                    className="absolute left-1 sm:left-4 z-20 p-3 sm:p-3.5 rounded-full bg-black/65 hover:bg-[#138601] text-white transition-all cursor-pointer border border-white/20 backdrop-blur-sm shadow-2xl hover:scale-110 active:scale-95"
                                    aria-label="Previous image"
                                >
                                    <FiChevronLeft className="text-2xl" />
                                </button>
                            )}

                            {/* Full Image */}
                            <div className="relative max-h-[72vh] sm:max-h-[78vh] flex items-center justify-center px-4">
                                <img
                                    src={filteredImages[selectedImageIndex].src}
                                    alt={filteredImages[selectedImageIndex].caption}
                                    className="max-h-[72vh] sm:max-h-[78vh] max-w-full object-contain rounded-xl shadow-2xl border border-white/10"
                                />
                            </div>

                            {/* Next Button */}
                            {filteredImages.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedImageIndex(prev => (prev < filteredImages.length - 1 ? prev + 1 : 0))}
                                    className="absolute right-1 sm:right-4 z-20 p-3 sm:p-3.5 rounded-full bg-black/65 hover:bg-[#138601] text-white transition-all cursor-pointer border border-white/20 backdrop-blur-sm shadow-2xl hover:scale-110 active:scale-95"
                                    aria-label="Next image"
                                >
                                    <FiChevronRight className="text-2xl" />
                                </button>
                            )}
                        </div>

                        {/* Bottom Bar: Full Caption and Navigation Hints */}
                        <div 
                            className="w-full max-w-3xl mx-auto text-center z-10 py-2"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <p className="text-white text-sm sm:text-base md:text-lg font-semibold drop-shadow-md leading-relaxed">
                                {filteredImages[selectedImageIndex].caption}
                            </p>
                            <p className="text-white/40 text-xs mt-1.5 hidden sm:block">
                                Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15 font-mono text-[10px]">←</kbd> and <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15 font-mono text-[10px]">→</kbd> to navigate • Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15 font-mono text-[10px]">Esc</kbd> to close
                            </p>
                        </div>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
};

export default Gallery;
