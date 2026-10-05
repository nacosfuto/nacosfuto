import React, { useState, useEffect } from 'react';
import Navbar from '../components/Nav/Navbar';
import Footer from '../components/Footer';
import { useTheme } from '../context/ThemeContext';
import { FiUser, FiMail } from 'react-icons/fi';
import { fetchDepartmentStaff, INITIAL_STAFF } from '@nacos/supabase';
import { getCloudinaryAssetUrl } from '@nacos/media';
import hodStanleyImg from '../assets/executives/hod_stanley.jpg';
import staffAdviserImg from '../assets/executives/staff_adviser_nwokorie.jpg';

const Administration = () => {
    const { theme } = useTheme();
    const [staff, setStaff] = useState(INITIAL_STAFF);

    useEffect(() => {
        let isMounted = true;
        const loadStaff = async () => {
            const data = await fetchDepartmentStaff({ activeOnly: true });
            if (isMounted && data && data.length > 0) {
                // Ensure HOD & Staff adviser images are resolved with Cloudinary / local fallback
                const enhanced = data.map(p => {
                    let img = p.image;
                    if (!img) {
                        if (p.id === 'staff-hod' || p.role?.includes('Head of Department')) {
                            img = getCloudinaryAssetUrl('hod_stanley') || hodStanleyImg;
                        } else if (p.id === 'staff-adviser' || p.role?.includes('Staff Adviser')) {
                            img = getCloudinaryAssetUrl('staff_adviser_nwokorie') || staffAdviserImg;
                        }
                    }
                    return { ...p, image: img };
                });
                setStaff(enhanced);
            }
        };

        loadStaff();
        window.addEventListener('nacos_department_staff_updated', loadStaff);
        return () => {
            isMounted = false;
            window.removeEventListener('nacos_department_staff_updated', loadStaff);
        };
    }, []);

    return (
        <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-[#041801] text-white' : 'bg-white text-black'} transition-colors duration-300`}>
            <Navbar />
            <div className="flex-grow site-container py-16 w-full">
                <header className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
                        Departmental <span className="text-[#138601] dark:text-[#4bd043]">Administration</span>
                    </h1>
                    <p className="text-base sm:text-lg opacity-80 max-w-2xl mx-auto leading-relaxed">
                        Meet the dedicated academic and administrative leaders shaping computer science education at FUTO.
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {staff.map((person, index) => (
                        <div 
                            key={index} 
                            className={`w-full flex flex-col border p-4 sm:p-5 shadow-sm transition-all duration-300 rounded-xl hover:shadow-lg ${
                                theme === 'dark' 
                                    ? 'bg-[#083002] border-[#138601]/40 text-white' 
                                    : 'bg-white border-gray-200 text-gray-900'
                            }`}
                        >
                            {/* Bounding box for image (like NACOS executive, no position overlay) */}
                            <div className={`border overflow-hidden rounded-lg aspect-[4/4.5] flex items-center justify-center ${
                                theme === 'dark' ? 'border-[#138601]/20 bg-gray-900/60' : 'border-gray-200 bg-gray-100'
                            }`}>
                                {person.image ? (
                                    <img 
                                        src={person.image} 
                                        alt={person.name} 
                                        className="w-full h-full object-cover object-top transition-transform duration-500 hover:scale-105" 
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-gray-400 p-4">
                                        <FiUser className="w-14 h-14 opacity-40 mb-2" />
                                        <span className="text-[10px] font-semibold opacity-60 uppercase tracking-wider">Faculty Member</span>
                                    </div>
                                )}
                            </div>

                            {/* Divider line */}
                            <div className={`border-t my-3.5 ${theme === 'dark' ? 'border-[#138601]/20' : 'border-gray-200'}`}></div>

                            {/* Details section: Only Name, Position, and Contact */}
                            <div className="flex flex-col items-center text-center flex-grow">
                                <h3 className={`font-bold text-base md:text-lg leading-tight tracking-wide uppercase mb-2 ${
                                    theme === 'dark' ? 'text-white' : 'text-gray-950'
                                }`}>
                                    {person.name}
                                </h3>
                                
                                {/* Position */}
                                <h4 className="font-extrabold text-xs uppercase tracking-wider text-[#138601] dark:text-[#4bd043] mb-4">
                                    {person.role || person.rank}
                                </h4>

                                {/* Contact */}
                                <div className={`pt-3 border-t w-full mt-auto ${
                                    theme === 'dark' ? 'border-[#138601]/20' : 'border-gray-100'
                                }`}>
                                    <a 
                                        href={`mailto:${person.email}`} 
                                        className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-[#138601] dark:hover:text-[#4bd043] transition-colors break-all group/mail"
                                    >
                                        <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-[#138601] dark:text-[#4bd043] group-hover/mail:bg-[#138601] group-hover/mail:text-white transition-colors flex-shrink-0">
                                            <FiMail className="w-3 h-3" />
                                        </div>
                                        <span>{person.email}</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default Administration;
