import React, { useState, useEffect } from 'react';
import Navbar from '../components/Nav/Navbar';
import Footer from '../components/Footer';
import { useTheme } from '../context/ThemeContext';
import { FiCamera, FiMaximize2, FiX, FiFilter } from 'react-icons/fi';
import { CloudinaryImage, getCloudinaryAssetUrl } from '@nacos/media';
import { supabase } from '@nacos/supabase';

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
    const [images, setImages] = useState(CANONICAL_GALLERY);
    const [activeFilter, setActiveFilter] = useState('All');

    // Fetch dynamic gallery items from Supabase if added via admin dashboard
    useEffect(() => {
        async function fetchLiveGallery() {
            try {
                const { data, error } = await supabase
                    .from('website_gallery')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (!error && data && data.length > 0) {
                    const dynamicItems = data.map(d => ({
                        publicId: d.cloudinary_public_id,
                        src: d.image_url,
                        caption: d.caption || d.title,
                        category: d.category || 'Campus Life'
                    }));

                    // Deduplicate with canonical
                    const dynamicIds = new Set(dynamicItems.map(d => d.publicId));
                    setImages([...dynamicItems, ...CANONICAL_GALLERY.filter(c => !dynamicIds.has(c.publicId))]);
                }
            } catch (err) {
                console.warn('Could not query Supabase gallery:', err);
            }
        }
        fetchLiveGallery();
    }, []);

    const categories = ['All', 'Academics', 'Tech', 'Culture', 'Socials', 'Campus Life', 'Sports'];

    const filteredImages = activeFilter === 'All'
        ? images
        : images.filter(img => img.category === activeFilter);

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
                                onClick={() => setActiveFilter(cat)}
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

                    {/* 4:3 Landscape Ratio Grid with Hover Description (Non-Clickable) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredImages.map((img, index) => (
                            <div 
                                key={index} 
                                className="relative group rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-[#138601]/30 aspect-[4/3] bg-gray-900 select-none"
                            >
                                <img
                                    src={img.src}
                                    alt={img.caption}
                                    loading="lazy"
                                    className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-700 ease-out"
                                />
                                
                                {/* Description Overlay on Hover Only */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5 text-white text-left pointer-events-none">
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#4bd043] mb-1.5 inline-block">
                                        {img.category}
                                    </span>
                                    <p className="font-semibold text-xs sm:text-sm leading-snug drop-shadow-md text-white/95">
                                        {img.caption}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Gallery;
