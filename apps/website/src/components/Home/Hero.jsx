import React from 'react';
import headerImage from '../../assets/header.jpg';
import { getCloudinaryAssetUrl } from "@nacos/media";
import { ReactTyped } from "react-typed";

const Hero = () => {
  const heroImg = getCloudinaryAssetUrl('header') || "";

  return (
    <section className="relative h-fit flex items-center justify-center bg-gray-900 text-white overflow-hidden">
      {/* Background Image */}
      <img 
        src={heroImg} 
        alt="Computer Science Department" 
        className="absolute inset-0 w-full h-120 object-cover opacity-85"
      />
      
      {/* Content */}
      <div className="relative z-10 site-container text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          <span className='text-green-500 dark:text-white'>Department of </span><span className="text-white dark:text-green-500">Computer Science</span>
        </h1>
        
        <div className="mb-8">
          <p className="text-xl md:text-2xl mb-2">Federal University of Technology</p>
          <p className="text-2xl md:text-3xl font-semibold text-green-400">Owerri</p>
        </div>
        
        <div className="flex justify-center items-center mb-8">
          <p className="md:text-3xl text-xl font-bold mr-2">
            Empowering
          </p>
          <ReactTyped
            className="md:text-3xl text-xl font-bold text-green-400"
            strings={['Innovation', 'Creativity', 'Excellence', 'Future Leaders']}
            typeSpeed={80}
            backSpeed={50}
            loop
          />
        </div>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button className="btn-primary-lg">
            Check Your Results
          </button>
          <button className="btn-secondary-lg">
            Calculate GPA
          </button>
        </div>
      </div>
     
    </section>
  );
};

export default Hero;