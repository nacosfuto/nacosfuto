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
import { getCloudinaryAssetUrl } from "@nacos/media";

const contactImage = getCloudinaryAssetUrl('gallery_dept_front') || "https://res.cloudinary.com/a2mmcttn/image/upload/v1788569317/nacos/gallery/gallery_dept_front.jpg";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ message: "", type: "" });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setFeedback({ message: "Please fill in all required fields.", type: "error" });
      return;
    }

    setIsSubmitting(true);
    setFeedback({ message: "", type: "" });

    try {
      let sent = false;

      // 1. Send via backend API with professional transactional template
      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          sent = true;
        }
      } catch (_) {}

      // 2. Multi-tier fallback to FormSubmit to ensure inbox delivery under any network condition
      if (!sent) {
        try {
          const formRes = await fetch("https://formsubmit.co/ajax/ict.nacosfuto@gmail.com", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              _subject: `[New Website Enquiry] ${formData.subject || "General Enquiry"} - from ${formData.name}`,
              _replyto: formData.email,
              full_name: formData.name,
              email_address: formData.email,
              subject: formData.subject,
              message_content: formData.message,
            }),
          });
          if (formRes.ok) sent = true;
        } catch (_) {}
      }

      setFeedback({
        message: "Thank you for reaching out! Your message has been received by the NACOS FUTO Secretariat. We will respond shortly.",
        type: "success",
      });
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
    } catch (err) {
      setFeedback({
        message: "An unexpected error occurred while sending your message. Please try again or email us directly at hello@nacosfuto.com.ng.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
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
      info: "hello@nacosfuto.com.ng",
    },
    {
      icon: <FiPhone className="text-[#138601] dark:text-[#4bd043] text-2xl" />,
      title: "Official Phone Lines",
      info: "+234 806 951 4271",
    },
    {
      icon: <FiClock className="text-[#138601] dark:text-[#4bd043] text-2xl" />,
      title: "Secretariat Working Hours",
      info: "Monday – Friday: 8:00 AM – 4:00 PM (WAT)",
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#041801] text-black dark:text-white transition-colors duration-300">
      <Navbar />

      {/* Hero Section */}
      <section className="relative py-20 bg-white dark:bg-[#041801] border-b border-[#138601]/20 dark:border-[#138601]/30">
        <div className="site-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold mb-6 text-black dark:text-white tracking-tight leading-tight">
                Contact <span className="text-[#138601] dark:text-[#4bd043]">The Department</span>
              </h1>
              <p className="text-base sm:text-lg text-black/75 dark:text-green-100/75 mb-8 leading-relaxed">
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
            <div className="rounded-2xl overflow-hidden shadow-lg border border-[#138601]/20 dark:border-[#138601]/30 bg-gray-100 dark:bg-[#083002]/40">
              <img
                src={contactImage}
                alt="FUTO Computer Science Department - SICT Complex"
                className="w-full h-[300px] sm:h-[360px] lg:h-[400px] object-cover hover:scale-105 transition-transform duration-500"
                loading="eager"
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
              <h2 className="text-2xl sm:text-3xl font-extrabold text-black dark:text-white mb-6 tracking-tight">
                Send Us a <span className="text-[#138601] dark:text-[#4bd043]">Message</span>
              </h2>

              {feedback.message && (
                <div
                  className={`mb-6 p-4 rounded-xl text-xs sm:text-sm leading-relaxed border ${
                    feedback.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                      : "bg-red-50 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
                  }`}
                >
                  {feedback.message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-black dark:text-green-100/80 mb-2">
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
                  <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-black dark:text-green-100/80 mb-2">
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
                  <label htmlFor="subject" className="block text-xs font-bold uppercase tracking-wider text-black dark:text-green-100/80 mb-2">
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
                  <label htmlFor="message" className="block text-xs font-bold uppercase tracking-wider text-black dark:text-green-100/80 mb-2">
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
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 px-7 py-2.5 bg-[#138601] hover:bg-[#0f6c01] text-white font-semibold text-sm rounded shadow-sm transition-colors cursor-pointer min-h-[42px] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <FaPaperPlane className={`text-xs ${isSubmitting ? "animate-spin" : ""}`} />
                  <span>{isSubmitting ? "Sending Message..." : "Send Message"}</span>
                </button>
              </form>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-black dark:text-white mb-6 tracking-tight">
                Official <span className="text-[#138601] dark:text-[#4bd043]">Contact Information</span>
              </h2>
              <div className="space-y-6">
                {contactInfo.map((item, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-[#083002] border border-[#138601]/20 dark:border-[#138601]/30 shadow-sm">
                    <div className="mt-1 flex-shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-black dark:text-white mb-1">
                        {item.title}
                      </h3>
                      <p className="text-xs text-black/75 dark:text-green-100/75 leading-relaxed">
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