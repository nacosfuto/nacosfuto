import React from "react";
import { useTheme } from "../../context/ThemeContext";
import { useState, useEffect } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import headerImage from "../../assets/header.jpg";
import { getCloudinaryAssetUrl } from "@nacos/media";
import SearchBar from "../SearchBar";
import ScrollToTopLink from "../ScrollToTopLink";

const heroImg = getCloudinaryAssetUrl('drilldown') || getCloudinaryAssetUrl('header') || "https://res.cloudinary.com/a2mmcttn/image/upload/v1791346769/drilldown.jpg";
const deptImg = getCloudinaryAssetUrl('department') || "https://res.cloudinary.com/a2mmcttn/image/upload/v1788569287/nacos/gallery/department.webp";

const slides = [
  {
    image: heroImg,
    title: "Department of Computer Science",
    description: "Federal University of Technology Owerri",
    button: { text: "Check Your Results", link: "/results" },
  },
  {
    image: deptImg,
    title: "Welcome to FUTO",
    description: "Empowering students for a brighter future.",
    button: { text: "Get Started", link: "/signup" },
  },
];

const HeroCarousel = () => {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const [currentSlide, setCurrentSlide] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    let interval;
    if (autoScroll) {
      interval = setInterval(() => {
        setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [autoScroll]);

  const nextSlide = () => {
    setAutoScroll(false);
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    setTimeout(() => setAutoScroll(true), 10000);
  };

  const prevSlide = () => {
    setAutoScroll(false);
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
    setTimeout(() => setAutoScroll(true), 10000);
  };

  const goToSlide = (index) => {
    setAutoScroll(false);
    setCurrentSlide(index);
    setTimeout(() => setAutoScroll(true), 10000);
  };

  return (
    <section className="w-full relative pb-1 site-container">
      {/* Mobile: full-width carousel, Desktop: grid */}
      <div className="block md:hidden w-full">
        <div
          className="relative w-full h-[400px] overflow-hidden group"
          onMouseEnter={() => setAutoScroll(false)}
          onMouseLeave={() => setAutoScroll(true)}
        >
          {/* Slides */}
          <div className="relative h-full w-full transition-transform duration-500 ease-in-out">
            {slides.map((slide, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-opacity duration-700 ${
                  index === currentSlide
                    ? "opacity-100"
                    : "opacity-0 pointer-events-none"
                }`}
              >
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ minHeight: 220, maxHeight: 340 }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/60 to-transparent" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(22,163,74,0.2),transparent_60%)]" />
                <div className="absolute left-0 right-0 bottom-0 text-left text-white px-6 pb-14 pt-6">
                  <div className="max-w-2xl w-full">
                    <h3 className="text-xl md:text-3xl font-bold mb-2 drop-shadow-lg text-white">
                      {slide.title}
                    </h3>
                    <p className="text-base md:text-lg mb-4 drop-shadow-lg text-white">
                      {slide.description}
                    </p>
                    {slide.button && (
                      <ScrollToTopLink
                        to={slide.button.link}
                        className="inline-flex items-center justify-center px-7 py-2.5 bg-[#138601] hover:bg-[#0f6c01] text-white font-semibold text-sm rounded shadow-sm transition-colors cursor-pointer min-h-[42px]"
                      >
                        {slide.button.text}
                      </ScrollToTopLink>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all opacity-0 group-hover:opacity-100"
            aria-label="Previous slide"
          >
            <FiChevronLeft size={24} />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all opacity-0 group-hover:opacity-100"
            aria-label="Next slide"
          >
            <FiChevronRight size={24} />
          </button>
          {/* Slide Indicators */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2 z-20">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
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
      {/* Desktop: grid layout */}
      <div className="hidden md:grid grid-cols-2 gap-8 items-center h-[500px]">
        <div
          className="relative w-full h-full rounded overflow-hidden shadow-sm group"
          onMouseEnter={() => setAutoScroll(false)}
          onMouseLeave={() => setAutoScroll(true)}
        >
          {/* Slides */}
          <div className="relative h-full w-full transition-transform duration-500 ease-in-out">
            {slides.map((slide, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-opacity duration-700 ${
                  index === currentSlide
                    ? "opacity-100"
                    : "opacity-0 pointer-events-none"
                }`}
              >
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ minHeight: 320, maxHeight: 500 }}
                />
                <div className="absolute left-0 right-0 bottom-0 text-left text-white px-8 pb-12 pt-8">
                  <div className="max-w-2xl w-full">
                    <h3 className="text-3xl md:text-4xl font-bold mb-4 drop-shadow-lg text-white">
                      {slide.title}
                    </h3>
                    <p className="text-lg md:text-xl mb-6 drop-shadow-lg text-white">
                      {slide.description}
                    </p>
                    {slide.button && (
                      <ScrollToTopLink
                        to={slide.button.link}
                        className="inline-flex items-center justify-center px-7 py-2.5 bg-[#138601] hover:bg-[#0f6c01] text-white font-semibold text-sm rounded shadow-sm transition-colors cursor-pointer min-h-[42px]"
                      >
                        {slide.button.text}
                      </ScrollToTopLink>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all opacity-0 group-hover:opacity-100"
            aria-label="Previous slide"
          >
            <FiChevronLeft size={28} />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all opacity-0 group-hover:opacity-100"
            aria-label="Next slide"
          >
            <FiChevronRight size={28} />
          </button>
          {/* Slide Indicators */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2 z-20">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
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
        {/* Desktop: large text section */}
        <div className="flex flex-col justify-center pl-8">
          <h1
            className={`text-4xl font-extrabold mb-4 ${
              isLight ? "text-[#083002]" : "text-green-500"
            }`}
          >
            FUTO: Your Gateway to Success
          </h1>
          <p
            className={`text-lg mb-6 ${
              isLight ? "text-[#138601]" : "text-gray-200"
            }`}
          >
            Join a vibrant community, access world-class resources, and shape
            your future with us.
          </p>
          <ScrollToTopLink
            to="/signup"
            className="inline-flex items-center justify-center px-7 py-2.5 bg-[#138601] hover:bg-[#0f6c01] text-white font-semibold text-sm rounded shadow-sm transition-colors cursor-pointer min-h-[42px] self-start"
          >
            Get Started
          </ScrollToTopLink>
          <div className="hidden md:flex items-center w-[320px] max-w-xs mt-6">
            <SearchBar />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroCarousel;
