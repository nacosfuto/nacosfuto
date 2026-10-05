import React, { useState, useEffect, useRef } from "react";
import Navbar from "../components/Nav/Navbar";
import Footer from "../components/Footer";
import {
  FiCode,
  FiCpu,
  FiDatabase,
  FiGlobe,
  FiShield,
  FiLayers,
} from "react-icons/fi";
import { FaGraduationCap, FaAward, FaBook, FaUsers } from "react-icons/fa";
import ScrollToTopLink from "../components/ScrollToTopLink";
import { getCloudinaryAssetUrl } from "@nacos/media";
import researchImageFallback from "../assets/research.jpg";

const Research = () => {
  const researchImage = getCloudinaryAssetUrl('research') || researchImageFallback;
  const researchAreas = [
    {
      title: "Artificial Intelligence & Machine Learning",
      description: "Neural architectures, computer vision, natural language processing for low-resource languages, and predictive analytics.",
      icon: <FiCpu className="w-8 h-8 text-[#138601] dark:text-[#4bd043]" />,
    },
    {
      title: "Cybersecurity & Cryptographic Systems",
      description: "Network defense mechanisms, intrusion detection systems, blockchain consensus, and threat intelligence telemetry.",
      icon: <FiShield className="w-8 h-8 text-[#138601] dark:text-[#4bd043]" />,
    },
    {
      title: "Distributed Systems & Cloud Computing",
      description: "High-throughput microservices, edge computing, distributed consensus algorithms, and fault-tolerant cloud infrastructures.",
      icon: <FiLayers className="w-8 h-8 text-[#138601] dark:text-[#4bd043]" />,
    },
    {
      title: "Data Engineering & Knowledge Graphs",
      description: "Big data pipelines, graph databases, semantic web architectures, and distributed querying engines.",
      icon: <FiDatabase className="w-8 h-8 text-[#138601] dark:text-[#4bd043]" />,
    },
  ];

  const researchStats = [
    {
      value: "50+",
      label: "Journal Publications / Year",
      icon: <FaBook className="text-[#138601] dark:text-[#4bd043] text-2xl mx-auto" />
    },
    {
      value: "15+",
      label: "Active Research Grants",
      icon: <FaAward className="text-[#138601] dark:text-[#4bd043] text-2xl mx-auto" />
    },
    {
      value: "30+",
      label: "PhD & MSc Researchers",
      icon: <FaGraduationCap className="text-[#138601] dark:text-[#4bd043] text-2xl mx-auto" />
    },
    {
      value: "10+",
      label: "Industry Collaborations",
      icon: <FaUsers className="text-[#138601] dark:text-[#4bd043] text-2xl mx-auto" />
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#041801] text-[#083002] dark:text-white transition-colors duration-300">
      <Navbar />

      {/* Hero Section */}
      <section className="relative py-20 bg-white dark:bg-[#041801] border-b border-[#138601]/20 dark:border-[#138601]/30">
        <div className="site-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold mb-6 text-[#083002] dark:text-white tracking-tight leading-tight">
                Research & <span className="text-[#138601] dark:text-[#4bd043]">Innovation Hub</span>
              </h1>
              <p className="text-base sm:text-lg text-[#083002]/75 dark:text-green-100/75 mb-8 leading-relaxed">
                Advancing the frontiers of computing sciences through cutting-edge research, peer-reviewed publications, and scalable software solutions addressing local and continental challenges.
              </p>
              <ScrollToTopLink
                to="/contact"
                className="inline-flex items-center justify-center px-7 py-2.5 bg-[#138601] hover:bg-[#0f6c01] text-white font-semibold text-sm rounded shadow-sm transition-colors cursor-pointer min-h-[42px]"
              >
                Collaborate With Us
              </ScrollToTopLink>
            </div>
            <div className="rounded overflow-hidden shadow-lg border border-[#138601]/20 dark:border-[#138601]/30">
              <img
                src={researchImage}
                alt="FUTO Computer Science Research"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Research Areas */}
      <section className="py-20 bg-[#f8f9fa] dark:bg-[#041801] border-b border-[#138601]/20 dark:border-[#138601]/30">
        <div className="site-container">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#083002] dark:text-white tracking-tight mb-3">
              Research <span className="text-[#138601] dark:text-[#4bd043]">Clusters</span>
            </h2>
            <p className="text-base text-[#083002]/70 dark:text-green-100/70 max-w-xl mx-auto leading-relaxed">
              Our multidisciplinary research groups push boundaries across theoretical and applied computer science.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {researchAreas.map((area, index) => (
              <div
                key={index}
                className="bg-white dark:bg-[#083002] p-8 rounded shadow-sm hover:shadow-xl hover:border-[#138601] dark:hover:border-[#4bd043] border border-[#138601]/20 dark:border-[#138601]/30 transform hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="mb-4">{area.icon}</div>
                  <h3 className="text-lg font-bold text-[#083002] dark:text-white mb-2 leading-snug">
                    {area.title}
                  </h3>
                  <p className="text-xs text-[#083002]/75 dark:text-green-100/75 leading-relaxed">
                    {area.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Research Impact Stats */}
      <section className="py-20 bg-white dark:bg-[#041801] border-b border-[#138601]/20 dark:border-[#138601]/30">
        <div className="site-container">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#083002] dark:text-white tracking-tight mb-3">
              Research <span className="text-[#138601] dark:text-[#4bd043]">Impact & Metrics</span>
            </h2>
            <p className="text-base text-[#083002]/70 dark:text-green-100/70 max-w-xl mx-auto leading-relaxed">
              Tangible output from our academic faculty, research fellows, and graduate students.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {researchStats.map((stat, index) => (
              <div
                key={index}
                className="bg-white dark:bg-[#083002] p-6 rounded text-center shadow-sm hover:shadow-xl hover:border-[#138601] dark:hover:border-[#4bd043] border border-[#138601]/20 dark:border-[#138601]/30 border-b-4 border-b-[#138601] transform hover:-translate-y-1.5 transition-all duration-300"
              >
                {stat.icon}
                <h4 className="text-3xl font-extrabold text-[#138601] dark:text-[#4bd043] mt-3 mb-1">
                  {stat.value}
                </h4>
                <p className="text-xs font-semibold text-[#083002]/80 dark:text-green-200/80 uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Facilities and Opportunities */}
      <section className="py-20 bg-[#f8f9fa] dark:bg-[#041801]">
        <div className="site-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#083002] dark:text-white mb-4 tracking-tight">
                Specialized <span className="text-[#138601] dark:text-[#4bd043]">Research Facilities</span>
              </h2>
              <p className="text-sm text-[#083002]/75 dark:text-green-100/75 mb-6 leading-relaxed">
                Our faculty labs provide enterprise-grade compute and testing infrastructure for high-level computing experiments:
              </p>
              <ul className="space-y-3 text-sm text-[#083002]/85 dark:text-green-100/85">
                <li className="flex items-start gap-2">
                  <span className="text-[#138601] dark:text-[#4bd043] font-bold">✓</span>
                  <span>High-performance compute clusters with GPU acceleration for ML model training.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#138601] dark:text-[#4bd043] font-bold">✓</span>
                  <span>Cybersecurity research testbed with isolated virtual routing topologies.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#138601] dark:text-[#4bd043] font-bold">✓</span>
                  <span>IoT & embedded systems hardware prototyping benches.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#138601] dark:text-[#4bd043] font-bold">✓</span>
                  <span>Direct repository access to international scientific journals (IEEE, ACM, Springer).</span>
                </li>
              </ul>
            </div>

            <div className="bg-white dark:bg-[#083002] p-8 rounded shadow-sm border border-[#138601]/20 dark:border-[#138601]/30">
              <h3 className="text-xl font-bold text-[#083002] dark:text-white mb-4">
                Research Pathways & Opportunities
              </h3>
              <p className="text-xs text-[#083002]/75 dark:text-green-100/75 mb-6">
                Opportunities available for students, alumni, and external academic or industrial partners:
              </p>
              <div className="space-y-4">
                <div className="border-l-4 border-[#138601] pl-4">
                  <h4 className="font-bold text-sm text-[#083002] dark:text-white">Undergraduate Research & Final Year Projects</h4>
                  <p className="text-xs text-[#083002]/70 dark:text-green-100/70 mt-0.5">Direct mentorship by faculty on novel software engineering projects.</p>
                </div>
                <div className="border-l-4 border-[#138601] pl-4">
                  <h4 className="font-bold text-sm text-[#083002] dark:text-white">Postgraduate Degrees (PGD, M.Sc, Ph.D)</h4>
                  <p className="text-xs text-[#083002]/70 dark:text-green-100/70 mt-0.5">Rigorous research programs with global academic publication standards.</p>
                </div>
                <div className="border-l-4 border-[#138601] pl-4">
                  <h4 className="font-bold text-sm text-[#083002] dark:text-white">Industry Partnerships & Tech Transfer</h4>
                  <p className="text-xs text-[#083002]/70 dark:text-green-100/70 mt-0.5">Collaborate with department researchers on commercial R&D solutions.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Research;