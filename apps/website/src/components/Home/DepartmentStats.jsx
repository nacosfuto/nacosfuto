import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { FaGraduationCap, FaUsers, FaChalkboardTeacher, FaAward } from 'react-icons/fa';

const stats = [
    {
        icon: <FaAward />,
        value: 41,
        suffix: '+',
        label: 'Years of Excellence',
        description: 'Pioneering tech education since 1980'
    },
    {
        icon: <FaUsers />,
        value: 5000,
        suffix: '+',
        label: 'Students Enrolled',
        description: 'Across undergraduate and postgraduate study'
    },
    {
        icon: <FaChalkboardTeacher />,
        value: 50,
        suffix: '+',
        label: 'Academic Staff',
        description: 'Experienced professors, lecturers & researchers'
    }
];

function useCountUp(target, duration = 2000, shouldStart = false) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!shouldStart) return;

        let startTime = null;
        let animationFrame;

        const step = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);

            // Ease-out cubic for smooth deceleration
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(step);
            }
        };

        animationFrame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(animationFrame);
    }, [target, duration, shouldStart]);

    return count;
}

const StatCard = ({ icon, value, suffix, label, description, delay, isVisible }) => {
    const count = useCountUp(value, 2200, isVisible);

    return (
        <div
            className="group relative flex flex-col items-center text-center p-8 rounded-2xl bg-white dark:bg-[#083002] border border-gray-150 dark:border-[#138601]/30 shadow-sm hover:shadow-xl hover:border-[#138601]/40 transform hover:-translate-y-1.5 transition-all duration-300"
            style={{ transitionDelay: `${delay}ms` }}
        >
            {/* Glowing icon */}
            <div className="w-14 h-14 rounded-xl bg-[#138601]/10 dark:bg-[#138601]/25 border border-[#138601]/20 flex items-center justify-center text-[#138601] dark:text-[#4bd043] text-2xl mb-5 group-hover:scale-110 transition-transform duration-300">
                {icon}
            </div>

            {/* Counter */}
            <div className="text-4xl md:text-5xl font-black tracking-tight mb-2">
                <span className="text-[#138601] dark:text-[#4bd043]">
                    {count.toLocaleString()}{suffix}
                </span>
            </div>

            {/* Label */}
            <h3 className="text-base font-bold uppercase tracking-wider mb-2 text-gray-900 dark:text-white">
                {label}
            </h3>

            {/* Description */}
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-[240px]">
                {description}
            </p>
        </div>
    );
};

const DepartmentStats = () => {
    const { theme } = useTheme();
    const sectionRef = useRef(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(entry.target);
                }
            },
            { threshold: 0.1 }
        );

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }

        return () => observer.disconnect();
    }, []);

    return (
        <section
            ref={sectionRef}
            className="py-20 transition-colors duration-300 bg-white dark:bg-[#041801] text-black dark:text-white border-b border-gray-150 dark:border-[#138601]/20"
        >
            <div className="site-container">
                {/* Section Header */}
                <div className="text-center mb-12">
                    <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3 text-black dark:text-white">
                        Department at a <span className="text-[#138601] dark:text-[#4bd043]">Glance</span>
                    </h2>
                    <p className="text-base text-gray-700 dark:text-gray-300 max-w-xl mx-auto leading-relaxed">
                        Key metrics defining four decades of computing excellence at FUTO.
                    </p>
                </div>

                {/* Stats Grid - Balanced 3 Columns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    {stats.map((stat, index) => (
                        <StatCard
                            key={stat.label}
                            {...stat}
                            delay={index * 150}
                            isVisible={isVisible}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default DepartmentStats;
