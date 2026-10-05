import React, { useState, useEffect, useRef } from "react";
import Navbar from "../components/Nav/Navbar";
import Footer from "../components/Footer";
import {
  FiMail,
  FiPhone,
  FiMapPin,
  FiClock,
  FiSend,
} from "react-icons/fi";
import { FaPaperPlane } from "react-icons/fa";
import ScrollToTopLink from "../components/ScrollToTopLink";
import contactImage from "../assets/contact.jpg";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Thank you for your message! Our departmental team will get back to you shortly.");
    setFormData({
      name: "",
      email: "",
      subject: "",
      message: "",
    });
  };

  const contactInfo = [
    {
      icon: <FiMapPin className="text-[#138601] dark:text-[#4bd043] text-2xl" />,
      title: "Department Location",
      info: "School of Information & Communication Technology (SICT) Building, FUTO Permanent Site, Owerri, Imo State, Nigeria",
    },
    {
      icon: <FiMail className="text-[#138601] dark:text-[#4bd043] text-2xl" />,
      title: "Email Inquiries",
      info: "computerscience@futo.edu.ng / nacos@futocsc.edu.ng",
    },
    {
      icon: <FiPhone className="text-[#138601] dark:text-[#4bd043] text-2xl" />,
      title: "Official Phone Lines",
      info: "+234 (0) 803 123 4567 / +234 (0) 812 987 6543",
    },
    {
      icon: <FiClock className="text-[#138601] dark:text-[#4bd043] text-2xl" />,
      title: "Secretariat Working Hours",
      info: "Monday – Friday: 8:00 AM – 4:00 PM (WAT)",
    },
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
                Contact <span className="text-[#138601] dark:text-[#4bd043]">The Department</span>
              </h1>
              <p className="text-base sm:text-lg text-[#083002]/75 dark:text-green-100/75 mb-8 leading-relaxed">
                Have inquiries regarding admissions, student verification, research partnerships, or NACOS activities? Connect directly with our team.
              </p>
              <div className="flex space-x-4">
                <ScrollToTopLink
                  to="/faqs"
                  className="inline-flex items-center justify-center px-7 py-2.5 font-medium text-sm text-gray-900 dark:text-white bg-[#f1f3f5] dark:bg-[#083002] hover:bg-[#e9ecef] dark:hover:bg-[#138601] rounded border border-gray-200 dark:border-[#138601]/30 transition-colors cursor-pointer min-h-[42px]"
                >
                  Visit FAQs
                </ScrollToTopLink>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-lg border border-[#138601]/20 dark:border-[#138601]/30">
              <img
                src={contactImage}
                alt="FUTO Computer Science Department"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form and Information */}
      <section className="py-20 bg-[#f8f9fa] dark:bg-[#041801]">
        <div className="site-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="bg-white dark:bg-[#083002] p-8 rounded-2xl shadow-sm border border-[#138601]/20 dark:border-[#138601]/30">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#083002] dark:text-white mb-6 tracking-tight">
                Send Us a <span className="text-[#138601] dark:text-[#4bd043]">Message</span>
              </h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-[#083002] dark:text-green-100/80 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded border border-gray-300 dark:border-[#138601]/30 bg-transparent text-sm focus:outline-none focus:border-[#138601] focus:ring-1 focus:ring-[#138601] text-gray-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-[#083002] dark:text-green-100/80 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded border border-gray-300 dark:border-[#138601]/30 bg-transparent text-sm focus:outline-none focus:border-[#138601] focus:ring-1 focus:ring-[#138601] text-gray-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="subject" className="block text-xs font-bold uppercase tracking-wider text-[#083002] dark:text-green-100/80 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded border border-gray-300 dark:border-[#138601]/30 bg-transparent text-sm focus:outline-none focus:border-[#138601] focus:ring-1 focus:ring-[#138601] text-gray-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-xs font-bold uppercase tracking-wider text-[#083002] dark:text-green-100/80 mb-2">
                    Message Content *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows="4"
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded border border-gray-300 dark:border-[#138601]/30 bg-transparent text-sm focus:outline-none focus:border-[#138601] focus:ring-1 focus:ring-[#138601] text-gray-900 dark:text-white"
                    required
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 px-7 py-2.5 bg-[#138601] hover:bg-[#0f6c01] text-white font-semibold text-sm rounded shadow-sm transition-colors cursor-pointer min-h-[42px]"
                >
                  <FaPaperPlane className="text-xs" />
                  <span>Send Message</span>
                </button>
              </form>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#083002] dark:text-white mb-6 tracking-tight">
                Official <span className="text-[#138601] dark:text-[#4bd043]">Contact Information</span>
              </h2>
              <div className="space-y-6">
                {contactInfo.map((item, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-[#083002] border border-[#138601]/20 dark:border-[#138601]/30 shadow-sm">
                    <div className="mt-1 flex-shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#083002] dark:text-white mb-1">
                        {item.title}
                      </h3>
                      <p className="text-xs text-[#083002]/75 dark:text-green-100/75 leading-relaxed">
                        {item.info}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Contact;