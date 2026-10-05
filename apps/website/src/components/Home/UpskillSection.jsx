import React from "react";
import { getAppUrls } from "@nacos/config/urls";
import upskillLogo from "../../assets/upskill-full-logo.png";
import upskillLogoMark from "../../assets/upskill-logo-mark.png";

const UpskillSection = () => {
  const { upskillHub } = getAppUrls();

  const upskillCourses = [
    {
      id: "course-ai-fluency",
      name: "AI Fluency: Framework & Foundations",
      badge: "AI & ML",
      link: `${upskillHub}/courses/course-ai-fluency`,
      image: "https://i.ytimg.com/vi/-UN9sNqQ0t4/hqdefault.jpg",
      description: "Master the 4D AI Framework, prompt engineering architectures, discernment, diligence, and ethical deployment.",
    },
    {
      id: "course-web-dev",
      name: "Complete Web Development & Fullstack Mastery",
      badge: "Fullstack",
      link: `${upskillHub}/courses/course-web-dev`,
      image: "https://i.ytimg.com/vi/-8ORfgUa8ow/hqdefault.jpg",
      description: "Comprehensive developer roadmap covering HTML & CSS, Vanilla JavaScript, React 19, Node.js APIs, and Serverless.",
    },
    {
      id: "course-photoshop",
      name: "Photoshop for Beginners: Masterclass",
      badge: "Creative Tech",
      link: `${upskillHub}/courses/course-photoshop`,
      image: "https://i.ytimg.com/vi/IyR_uYsRdPs/hqdefault.jpg",
      description: "Complete foundations of digital design, photo manipulation, interface assets, layers, masking, and visual branding.",
    },
  ];

  return (
    <section className="py-20 bg-[#f8f9fa] dark:bg-[#041801] transition-colors duration-300">
      <div className="site-container">
        <div className="text-center mb-12 max-w-3xl mx-auto space-y-3">
          <div className="flex justify-center mb-1">
            <img 
              src={upskillLogo} 
              alt="Upskill Hub Logo" 
              className="h-10 sm:h-12 w-auto object-contain"
            />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#138601] dark:text-[#4bd043] font-mono">
            Open Source Learning Platform · Free for Everyone · Anyone Can Contribute
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#083002] dark:text-white tracking-tight">
            Open Community Masterclasses & Tech Tracks
          </h2>
          <p className="text-base text-[#083002]/70 dark:text-green-100/70 leading-relaxed max-w-2xl mx-auto">
            An open learning platform available to everyone. Anyone can access free practical curriculums or request to contribute a course to empower scholars.
          </p>
        </div>

        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {upskillCourses.map((course) => (
            <a
              key={course.id}
              href={course.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded bg-white dark:bg-[#083002] overflow-hidden border border-[#138601]/20 dark:border-[#138601]/30 shadow-sm hover:shadow-xl hover:border-[#138601] dark:hover:border-[#4bd043] transform hover:-translate-y-1.5 transition-all duration-300 flex flex-col h-full cursor-pointer"
            >
              {/* Image Container */}
              <div className="relative h-48 overflow-hidden bg-[#083002]">
                <img
                  src={course.image}
                  alt={course.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute top-3 right-3 bg-[#138601] text-white px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm">
                  {course.badge}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 flex-grow flex flex-col justify-between">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-[#083002] dark:text-white mb-2 group-hover:text-[#138601] dark:group-hover:text-[#4bd043] transition-colors tracking-tight leading-snug">
                    {course.name}
                  </h3>
                  <p className="text-sm text-[#083002]/75 dark:text-green-100/75 leading-relaxed mb-5 line-clamp-2">
                    {course.description}
                  </p>
                </div>

                <div className="mt-auto w-full py-2.5 px-7 bg-[#138601] group-hover:bg-[#0f6c01] text-white text-center font-semibold text-sm rounded shadow-sm transition-colors min-h-[42px] inline-flex items-center justify-center">
                  Start Course &rarr;
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Action Button to View Complete Catalog */}
        <div className="mt-12 text-center">
          <a
            href={`${upskillHub}/courses`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[#138601] hover:bg-[#0f6c01] text-white font-bold text-sm rounded shadow-md hover:shadow-lg transition-all"
          >
            <span>Explore All Upskill Hub Courses</span>
            <span className="text-base">&rarr;</span>
          </a>
        </div>
      </div>
    </section>
  );
};

export default UpskillSection;
