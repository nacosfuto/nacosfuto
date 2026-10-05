import React from 'react';
import Navbar from '../components/Nav/Navbar';
import Footer from '../components/Footer';
import { useTheme } from '../context/ThemeContext';
import { FiUser, FiMail } from 'react-icons/fi';
import hodStanleyImg from '../assets/executives/hod_stanley.jpg';
import staffAdviserImg from '../assets/executives/staff_adviser_nwokorie.jpg';

const deriveEmail = (name) => {
    const clean = name.replace(/^(Dr\.?|Mr\.?|Mrs\.?|DR\.?|MR\.?)\s*/i, '').trim();
    const parts = clean.toLowerCase().split(/\s+/);
    if (parts.length >= 2) {
        return `${parts[0]}.${parts[parts.length - 1]}@futo.edu.ng`;
    }
    return `${parts[0] || 'staff'}@futo.edu.ng`;
};

const Administration = () => {
    const { theme } = useTheme();

    const staff = [
        {
            role: "Head of Department (CSC)",
            name: "Dr. Stanley Adiele Okolie",
            email: "hod.csc@futo.edu.ng",
            image: hodStanleyImg
        },
        {
            role: "Staff Adviser / Course Adviser",
            name: "Dr. (Mrs) E.C. Nwokorie",
            email: "staff.adviser@futo.edu.ng",
            image: staffAdviserImg
        },
        { sn: 1, name: "Dr. Juliet Nnenna Odii", rank: "Reader", email: deriveEmail("Dr. Juliet Nnenna Odii") },
        { sn: 2, name: "Dr. Jacinta Chioma Odirichukwu", rank: "Senior Lecturer", email: deriveEmail("Dr. Jacinta Chioma Odirichukwu") },
        { sn: 3, name: "Dr. Uchenna Chinyere Onyemauche", rank: "Senior Lecturer", email: deriveEmail("Dr. Uchenna Chinyere Onyemauche") },
        { sn: 4, name: "Dr Chidimma Lilan Okpalla", rank: "Senior Lecturer", email: deriveEmail("Dr Chidimma Lilan Okpalla") },
        { sn: 5, name: "DR. CHINWE GILEAN ONUKWUGHA", rank: "Senior Lecturer", email: deriveEmail("DR. CHINWE GILEAN ONUKWUGHA") },
        { sn: 6, name: "Dr Euphemia Chioma Nwokorie", rank: "Senior Lecturer", email: deriveEmail("Dr Euphemia Chioma Nwokorie") },
        { sn: 8, name: "Mr Douglas Allswell Kelechi", rank: "Lecturer II", email: deriveEmail("Mr Douglas Allswell Kelechi") },
        { sn: 9, name: "Dr Chidi Ukamaka Betrand", rank: "Lecturer II", email: deriveEmail("Dr Chidi Ukamaka Betrand") },
        { sn: 10, name: "Mr. Peter Kelechukwu Joseph", rank: "Assistant Lecturer", email: deriveEmail("Mr. Peter Kelechukwu Joseph") },
        { sn: 11, name: "Mr. Vitalis Chibuike Iwuchukwu", rank: "Assistant Lecturer", email: deriveEmail("Mr. Vitalis Chibuike Iwuchukwu") },
        { sn: 12, name: "Mr Christopher Ifeanyi Ofoegbu", rank: "Graduate Assistant", email: deriveEmail("Mr Christopher Ifeanyi Ofoegbu") },
        { sn: 13, name: "Mrs Juliet Nwanneka Amoke", rank: "Technologist II", email: deriveEmail("Mrs Juliet Nwanneka Amoke") },
        { sn: 14, name: "Dr Chukwuma Dandy Anyiam", rank: "Lecturer I", email: deriveEmail("Dr Chukwuma Dandy Anyiam") },
        { sn: 15, name: "DR. MERCY EBERECHI BENSON-EMENIKE", rank: "Senior Lecturer", email: deriveEmail("DR. MERCY EBERECHI BENSON-EMENIKE") },
        { sn: 16, name: "Mr Chigozie C Dimoji", rank: "Assistant Lecturer", email: deriveEmail("Mr Chigozie C Dimoji") },
        { sn: 17, name: "Mr Ikechukwu Kingsley Onyeanu", rank: "Senior Computer Technologist", email: deriveEmail("Mr Ikechukwu Kingsley Onyeanu") },
        { sn: 18, name: "Mrs Ngozi Amarachi Duru", rank: "Assistant Lecturer", email: deriveEmail("Mrs Ngozi Amarachi Duru") },
        { sn: 19, name: "Mr Idris Ahmed Idris", rank: "Graduate Assistant (GA)", email: deriveEmail("Mr Idris Ahmed Idris") },
        { sn: 20, name: "MR ANTHONY CHUKWUNONSO UGHAELUMBA", rank: "System Programmer/Analyst II", email: deriveEmail("MR ANTHONY CHUKWUNONSO UGHAELUMBA") },
        { sn: 21, name: "Mr. Harry Chidozie Ogbonna", rank: "Technologist II", email: deriveEmail("Mr. Harry Chidozie Ogbonna") },
        { sn: 22, name: "Mrs. Edith Chidimma Otuonye", rank: "Secretary I", email: deriveEmail("Mrs. Edith Chidimma Otuonye") },
        { sn: 23, name: "Dr. Francisca Onyinyechi Nwokoma", rank: "Lecturer I", email: deriveEmail("Dr. Francisca Onyinyechi Nwokoma") },
        { sn: 24, name: "Dr. Donatus Onyedikachi Njoku", rank: "Lecturer II", email: deriveEmail("Dr. Donatus Onyedikachi Njoku") },
    ];

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
