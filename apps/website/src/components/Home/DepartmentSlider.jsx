import React, { useState, useEffect } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import slide1 from "../../assets/header.jpg";

const DepartmentSlider = () => {
  const slides = [
    {
      image: slide1,
      title: "Our Facilities",
      description: "State-of-the-art computer labs with modern equipment",
    },
    {
      image: slide1,
      title: "Expert Faculty",
      description: "Learn from industry-experienced professors and researchers",
    },
    {
      image: slide1,
      title: "Student Projects",
      description: "Innovative projects showcasing real-world problem solving",
    },
  ];

  const [currentSlide, setCurrentSlide] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll every 5 seconds
  useEffect(() => {
    let interval;
    if (autoScroll) {
      interval = setInterval(() => {
        setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [autoScroll, slides.length]);

  const nextSlide = () => {
    setAutoScroll(false);
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    setTimeout(() => setAutoScroll(true), 10000); // Resume auto-scroll after 10s
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
    <section className="py-16 bg-[#f8f9fa] dark:bg-[#041801] section-content">
      <div className="site-container">
        <h2 className="text-3xl font-bold text-center mb-8 dark:text-white">
          Department Highlights
        </h2>

        <div className="relative h-96 rounded overflow-hidden shadow-sm group mx-2 md:mx-0 border border-[#138601]/20">
          {/* Slides */}
          <div className="relative h-full w-full transition-transform duration-500 ease-in-out">
            {slides.map((slide, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-opacity duration-500 ${
                  index === currentSlide
                    ? "opacity-100"
                    : "opacity-0 pointer-events-none"
                }`}
              >
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute left-0 right-0 bottom-0 text-left text-white px-8 pb-12 pt-8">
                  <div className="max-w-2xl w-full">
                    <h3 className="text-2xl md:text-3xl font-bold mb-4">
                      {slide.title}
                    </h3>
                    <p className="text-lg md:text-xl mb-6">
                      {slide.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all opacity-0 group-hover:opacity-100"
          >
            <FiChevronLeft size={24} />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all opacity-0 group-hover:opacity-100"
          >
            <FiChevronRight size={24} />
          </button>

          {/* Slide Indicators */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentSlide
                    ? "bg-white w-6"
                    : "bg-white bg-opacity-50 hover:bg-opacity-80"
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

export default DepartmentSlider;
