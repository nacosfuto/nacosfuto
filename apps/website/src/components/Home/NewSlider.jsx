import React, { useState, useEffect } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
const slide1 = '';

const NewsSlider = () => {
  const slides = [
    {
      image: slide1,
      title: "2025 Departmental Seminar Series",
      description:
        "Join us for our weekly seminar featuring industry experts and academic leaders.",
      link: "/events/seminar",
    },
    {
      image: slide1,
      title: "New Research Grant Awarded",
      description:
        "Our faculty secured $500,000 grant for AI research in healthcare applications.",
      link: "/research/grants",
    },
    {
      image: slide1,
      title: "Student Project Showcase",
      description:
        "View outstanding projects from our final year students. Exhibition opens May 15.",
      link: "/students/showcase",
    },
  ];

  const [currentSlide, setCurrentSlide] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  useEffect(() => {
    let interval;
    if (autoPlay) {
      interval = setInterval(nextSlide, 5000);
    }
    return () => clearInterval(interval);
  }, [autoPlay, currentSlide]);

  return (
    <section className="relative dark:bg-[#041801] py-12 overflow-hidden">
      <div className="site-container">
        <h2 className="text-3xl font-bold text-center mb-8 text-gray-800 dark:text-white">
          Department <span className="text-[#138601] dark:text-[#4bd043]">News & Events</span>
        </h2>

        <div
          className="relative h-96 rounded overflow-hidden shadow-sm mx-2 md:mx-0 border border-[#138601]/20"
          onMouseEnter={() => setAutoPlay(false)}
          onMouseLeave={() => setAutoPlay(true)}
        >
          {/* Slides */}
          {slides.map((slide, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 flex items-center ${
                index === currentSlide
                  ? "opacity-100"
                  : "opacity-0 pointer-events-none"
              }`}
            >
              <img
                src={slide.image}
                alt={slide.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute left-0 right-0 bottom-0 text-left text-white px-8 pb-12 pt-8 z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                <div className="max-w-2xl w-full">
                  <h3 className="text-2xl md:text-4xl font-bold mb-4">
                    {slide.title}
                  </h3>
                  <p className="text-base md:text-lg mb-6 text-gray-200">{slide.description}</p>
                  <a
                    href={slide.link}
                    className="inline-flex items-center justify-center px-7 py-2.5 bg-[#138601] hover:bg-[#0f6c01] text-white font-semibold text-sm rounded shadow-sm transition-colors cursor-pointer min-h-[42px]"
                  >
                    Learn More
                  </a>
                </div>
              </div>
            </div>
          ))}

          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all z-20"
            aria-label="Previous slide"
          >
            <FiChevronLeft size={24} />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all z-20"
            aria-label="Next slide"
          >
            <FiChevronRight size={24} />
          </button>

          {/* Indicators */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2 z-20">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full ${
                  index === currentSlide
                    ? "bg-[#138601]"
                    : "bg-white bg-opacity-50"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default NewsSlider;
