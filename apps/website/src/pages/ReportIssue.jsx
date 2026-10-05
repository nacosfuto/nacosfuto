import React, { useState } from "react";
import Navbar from "../components/Nav/Navbar";
import Footer from "../components/Footer";
import { useTheme } from "../context/ThemeContext";

const ReportIssue = () => {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    category: "Academic Complaint",
    subject: "",
    message: "",
  });

  const categories = [
    "Academic Complaint",
    "Facility / Lab Issue",
    "Harassment / Victimization",
    "Security Concern",
    "Health / Medical Emergency",
    "Lost and Found",
    "Other",
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const phoneNumber = "2349069675276";
    const text = `*New Issue Reported*\n\n*Category:* ${formData.category}\n*Subject:* ${formData.subject}\n*Message:* ${formData.message}`;
    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/${phoneNumber}?text=${encodedText}`, "_blank");
  };

  const handleEmergency = () => {
    const phoneNumber = "2349069675276";
    const text = `*🚨 EMERGENCY ALERT 🚨*\n\nAn emergency has been reported through the NACOS Website portal. Immediate attention required!`;
    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/${phoneNumber}?text=${encodedText}`, "_blank");
  };

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-300 ${
        theme === "dark" ? "bg-[#041801] text-white" : "bg-white text-black"
      }`}
    >
      <Navbar />
      <main className="flex-grow flex items-center justify-center p-6 py-16">
        <div
          className={`max-w-2xl w-full p-8 rounded-2xl shadow-sm border ${
            theme === "dark" ? "bg-[#083002] border-[#138601]/30" : "bg-white border-gray-200"
          }`}
        >
          <h1 className="text-3xl font-extrabold mb-4 text-center">Report an Issue</h1>
          <p className="mb-8 text-center text-sm opacity-80 max-w-lg mx-auto">
            We value your safety and student feedback. Please select a category and submit your concern directly to the secretariat.
            <br />
            <span className="text-xs opacity-75">
              (This will open an encrypted WhatsApp direct line)
            </span>
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-90">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className={`w-full p-3 rounded border text-sm focus:border-[#138601] focus:ring-1 focus:ring-[#138601] outline-none transition-all ${
                  theme === "dark"
                    ? "bg-[#041801] border-[#138601]/30 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-90">Subject</label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                placeholder="Brief summary of the issue..."
                className={`w-full p-3 rounded border text-sm focus:border-[#138601] focus:ring-1 focus:ring-[#138601] outline-none transition-all ${
                  theme === "dark"
                    ? "bg-[#041801] border-[#138601]/30 text-white placeholder-green-100/40"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                }`}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-90">Message Content</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                rows="4"
                placeholder="Describe the issue in detail..."
                className={`w-full p-3 rounded border text-sm focus:border-[#138601] focus:ring-1 focus:ring-[#138601] outline-none transition-all ${
                  theme === "dark"
                    ? "bg-[#041801] border-[#138601]/30 text-white placeholder-green-100/40"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                }`}
                required
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[42px] px-7 py-2.5 bg-[#138601] hover:bg-[#0f6c01] text-white font-semibold text-sm rounded shadow-sm transition-colors cursor-pointer"
            >
              Submit Report via WhatsApp
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#138601]/20 text-center">
            <p className="mb-3 text-red-500 font-semibold text-xs uppercase tracking-wider">
              Is this a life-threatening emergency?
            </p>
            <button
              onClick={handleEmergency}
              className="min-h-[42px] bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-8 rounded transition-colors shadow-sm text-xs tracking-wider"
            >
              REPORT AN EMERGENCY
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ReportIssue;
