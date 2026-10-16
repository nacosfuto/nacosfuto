import React, { useState } from 'react';
import { 
  HeartPulse, 
  PhoneCall, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  Activity, 
  Stethoscope, 
  Pill, 
  Microscope, 
  Eye, 
  Smile, 
  Ambulance, 
  Calendar, 
  Send, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  UserCheck
} from 'lucide-react';
import Navbar from '../components/Nav/Navbar';
import Footer from '../components/Footer';
import ScrollToTopLink from '../components/ScrollToTopLink';

const HealthServices = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    matricNumber: '',
    department: 'Computer Science',
    phone: '',
    email: '',
    serviceRequired: 'General Outpatient Consultation',
    preferredDate: '',
    preferredTime: 'Morning (8:00 AM - 12:00 PM)',
    symptoms: ''
  });

  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const emergencyContacts = [
    {
      label: '24/7 FUTO Ambulance Dispatch',
      number: '+234 803 123 4567',
      desc: 'Immediate on-campus trauma, accident & acute medical pickup',
      type: 'emergency'
    },
    {
      label: 'Medical Director / Desk Officer',
      number: '+234 802 987 6543',
      desc: 'Administrative inquiries, referrals and official admissions',
      type: 'desk'
    },
    {
      label: 'Student NHIS / TSHIP Desk',
      number: '+234 814 555 0192',
      desc: 'National health insurance enrollment & drug validation',
      type: 'insurance'
    }
  ];

  const clinicalUnits = [
    {
      title: 'General Outpatient Clinic (GOPD)',
      icon: Stethoscope,
      desc: 'Primary clinical consultations, routine diagnosis, triage, prescriptions, and health maintenance for all students and staff.',
      hours: 'Mon - Sun: 24 Hours'
    },
    {
      title: 'Accident & Emergency (A&E)',
      icon: Ambulance,
      desc: 'Rapid stabilization of acute injuries, campus accidents, cardiac complications, and surgical emergencies with direct ICU transfer.',
      hours: 'Mon - Sun: 24 Hours'
    },
    {
      title: 'Pharmaceutical Services',
      icon: Pill,
      desc: 'Fully stocked dispensary offering essential antibiotics, pain relief, antimalarials, and chronic disease medication backed by NHIS.',
      hours: '8:00 AM - 9:00 PM (Emergency 24/7)'
    },
    {
      title: 'Diagnostic Laboratory & Imaging',
      icon: Microscope,
      desc: 'Automated haematology, chemical pathology, microbiology, blood group screening, typhoid cultures, urinalysis, and X-ray services.',
      hours: 'Mon - Sat: 8:00 AM - 6:00 PM'
    },
    {
      title: 'Mental Health & Guidance Counseling',
      icon: HeartPulse,
      desc: 'Confidential psychological therapy, academic anxiety counseling, stress relief workshops, and wellness support.',
      hours: 'Mon - Fri: 9:00 AM - 4:00 PM'
    },
    {
      title: 'Ophthalmology & Dental Care',
      icon: Eye,
      desc: 'Comprehensive vision examinations, prescription lenses, preventive dental cleanings, extractions, and oral surgery.',
      hours: 'Tues & Thurs: 9:00 AM - 3:00 PM'
    }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone) {
      alert('Please fill in your name and phone number to request consultation.');
      return;
    }
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-gray-100 flex flex-col font-sans transition-colors duration-300">
      <Navbar />

      {/* ─── Hero Section with Medical Imagery & Badge ─── */}
      <section className="relative bg-gradient-to-br from-[#083002] via-[#0b3d03] to-[#041801] text-white pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#13860115_1px,transparent_1px),linear-gradient(to_bottom,#13860115_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />

        <div className="site-container relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#138601]/30 border border-[#138601]/50 text-green-300 text-xs font-bold uppercase tracking-wider mb-4">
              <HeartPulse className="w-4 h-4 text-[#4bd043]" />
              <span>Federal University of Technology, Owerri</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-4 leading-tight">
              FUTO Medical Centre & <br />
              <span className="text-[#4bd043]">Student Health Services</span>
            </h1>

            <p className="text-base sm:text-lg text-green-100/80 leading-relaxed mb-8">
              Providing round-the-clock compassionate healthcare, emergency ambulance evacuation, pharmacy distribution, and NHIS (TSHIP) clinical coverage to over 25,000 university scholars and staff.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <a 
                href="#emergency-contacts"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-lg hover:shadow-red-600/30 transition-all cursor-pointer"
              >
                <PhoneCall className="w-4 h-4 animate-bounce" />
                <span>Emergency Hotlines</span>
              </a>

              <a 
                href="#book-consultation"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-[#138601] hover:bg-[#0f6c01] text-white font-bold text-sm shadow-md transition-all cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                <span>Schedule Consultation</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Emergency Fast-Response Strip ─── */}
      <section id="emergency-contacts" className="bg-red-50 dark:bg-red-950/30 border-y border-red-200 dark:border-red-900/50 py-6">
        <div className="site-container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {emergencyContacts.map((contact, idx) => (
              <div 
                key={idx}
                className="p-4 rounded-xl bg-white dark:bg-[#083002] border border-red-200 dark:border-red-900/60 shadow-xs flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{contact.label}</span>
                  </div>
                  <a 
                    href={`tel:${contact.number.replace(/\s+/g, '')}`}
                    className="text-lg font-black text-gray-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 transition-colors block font-mono"
                  >
                    {contact.number}
                  </a>
                  <p className="text-[11px] text-gray-500 dark:text-green-200/60 mt-0.5">
                    {contact.desc}
                  </p>
                </div>
                <a 
                  href={`tel:${contact.number.replace(/\s+/g, '')}`}
                  className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0 hover:bg-red-700 transition-colors shadow-xs"
                  title="Call Hotline"
                >
                  <PhoneCall className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Quick Stats & Accreditation ─── */}
      <section className="py-10 bg-white dark:bg-[#062402] border-b border-gray-200 dark:border-[#138601]/25">
        <div className="site-container grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="p-4">
            <p className="text-3xl font-black text-[#138601] dark:text-[#4bd043]">24 / 7</p>
            <p className="text-xs font-semibold text-gray-600 dark:text-green-200/70 mt-1 uppercase tracking-wider">A&E & Pharmacy Coverage</p>
          </div>
          <div className="p-4">
            <p className="text-3xl font-black text-[#138601] dark:text-[#4bd043]">100%</p>
            <p className="text-xs font-semibold text-gray-600 dark:text-green-200/70 mt-1 uppercase tracking-wider">NHIS / TSHIP Eligible</p>
          </div>
          <div className="p-4">
            <p className="text-3xl font-black text-[#138601] dark:text-[#4bd043]">3 Units</p>
            <p className="text-xs font-semibold text-gray-600 dark:text-green-200/70 mt-1 uppercase tracking-wider">Campus Ambulances</p>
          </div>
          <div className="p-4">
            <p className="text-3xl font-black text-[#138601] dark:text-[#4bd043]">15+</p>
            <p className="text-xs font-semibold text-gray-600 dark:text-green-200/70 mt-1 uppercase tracking-wider">Consultants & Physicians</p>
          </div>
        </div>
      </section>

      {/* ─── Clinical Services Grid ─── */}
      <section className="py-16 site-container">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-[#138601] dark:text-[#4bd043] bg-green-50 dark:bg-[#0d4603] px-3 py-1 rounded-md border border-green-200 dark:border-[#138601]/40">
            Medical Departments
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-3 mb-2">
            Comprehensive Clinical Facilities
          </h2>
          <p className="text-sm text-gray-600 dark:text-green-100/70">
            Equipped with modern diagnostic equipment, certified resident doctors, and university pharmacy staff dedicated to student wellbeing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clinicalUnits.map((unit, idx) => {
            const Icon = unit.icon;
            return (
              <div 
                key={idx}
                className="p-6 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-[#0d4603] text-[#138601] dark:text-[#4bd043] flex items-center justify-center">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {unit.title}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-green-100/75 leading-relaxed">
                    {unit.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-[#138601]/20 flex items-center justify-between text-xs text-gray-500 dark:text-green-200/60">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5 text-[#138601] dark:text-[#4bd043]" />
                    <span>{unit.hours}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Student Registration & TSHIP Information ─── */}
      <section className="py-12 bg-emerald-50/60 dark:bg-[#062402] border-y border-emerald-100 dark:border-[#138601]/25">
        <div className="site-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#138601] dark:text-[#4bd043]">
                TSHIP / NHIS Clearance
              </span>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                Tertiary Institution Social Health Insurance Programme
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-green-100/75 leading-relaxed">
                All registered undergraduate and postgraduate students of FUTO are automatically covered under the Federal Government’s TSHIP scheme. Your clinic registration file ensures free consultation, lab tests, and designated prescription drugs during your study tenure.
              </p>

              <div className="space-y-2.5 text-xs text-gray-700 dark:text-green-100/80 pt-2">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#138601] dark:text-[#4bd043] shrink-0 mt-0.5" />
                  <span>Bring your Admission Letter, School Fees Receipt, and 2 Passport Photos to Medical Records.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#138601] dark:text-[#4bd043] shrink-0 mt-0.5" />
                  <span>Complete Chest X-ray, blood grouping, and genotypic screening at FUTO Diagnostics.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#138601] dark:text-[#4bd043] shrink-0 mt-0.5" />
                  <span>Obtain your stamped University Medical Clearance Certificate for department portal registration.</span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40 shadow-sm space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
                <span>Centre Location & Transit</span>
              </h4>
              <p className="text-xs text-gray-600 dark:text-green-100/75 leading-relaxed">
                Located adjacent to the FUTO Senate Building and opposite the Main University Library. Dedicated internal shuttle drop-off point available at "Medical Junction".
              </p>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/25 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-green-200/60">Outpatient Clinic:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">Ground Floor, Wing A</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-green-200/60">Pharmacy Dispensary:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">Ground Floor, Main Foyer</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-green-200/60">Laboratory & X-Ray:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">Wing B (East Gate)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-green-200/60">Emergency Ambulance Bay:</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">Front Driveway Ramp</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Contact & Consultation Request Form ─── */}
      <section id="book-consultation" className="py-16 site-container">
        <div className="max-w-3xl mx-auto bg-white dark:bg-[#083002] rounded-3xl border border-gray-200 dark:border-[#138601]/30 p-8 sm:p-10 shadow-sm">
          <div className="text-center mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-[#138601] dark:text-[#4bd043] bg-green-50 dark:bg-[#0d4603] px-3 py-1 rounded-md border border-green-200 dark:border-[#138601]/40">
              Direct Contact Desk
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-2 mb-2">
              Request Doctor Consultation or Health Inquiry
            </h2>
            <p className="text-xs text-gray-600 dark:text-green-100/70">
              Submit your details to schedule a non-emergency clinic visit or inquire about TSHIP medical clearance.
            </p>
          </div>

          {submitted ? (
            <div className="p-8 rounded-2xl bg-green-50 dark:bg-[#0d4603]/60 border border-green-200 dark:border-[#138601] text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-[#138601] dark:text-[#4bd043] mx-auto" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Inquiry Successfully Submitted
              </h3>
              <p className="text-xs text-gray-600 dark:text-green-100/80 max-w-md mx-auto">
                Thank you, <strong>{formData.fullName}</strong>. The FUTO Medical Centre desk has received your request. An SMS/Email confirmation will be sent to <strong>{formData.phone}</strong> shortly.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="mt-4 px-6 py-2 rounded-lg bg-[#138601] text-white text-xs font-bold hover:bg-[#0f6c01] cursor-pointer"
              >
                Submit Another Request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-green-100 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ebubechukwu Okoye"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-xs focus:ring-1 focus:ring-[#138601] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-green-100 mb-1">
                    Matriculation Number / Reg No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 20241400000"
                    value={formData.matricNumber}
                    onChange={(e) => setFormData({ ...formData, matricNumber: e.target.value.replace(/[\/\s\-]/g, '').toUpperCase() })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-xs focus:ring-1 focus:ring-[#138601] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-green-100 mb-1">
                    Active Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +234 812 345 6789"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-xs focus:ring-1 focus:ring-[#138601] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-green-100 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. scholar@futo.edu.ng"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-xs focus:ring-1 focus:ring-[#138601] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-green-100 mb-1">
                    Service Required
                  </label>
                  <select
                    value={formData.serviceRequired}
                    onChange={(e) => setFormData({ ...formData, serviceRequired: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-xs focus:ring-1 focus:ring-[#138601] outline-none cursor-pointer"
                  >
                    <option>General Outpatient Consultation</option>
                    <option>TSHIP / Medical Clearance Registration</option>
                    <option>Prescription Refill / Pharmacy Inquiry</option>
                    <option>Laboratory / Diagnostic Test Booking</option>
                    <option>Dental / Eye Clinic Appointment</option>
                    <option>Mental Health & Counseling Session</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-green-100 mb-1">
                    Preferred Visit Date
                  </label>
                  <input
                    type="date"
                    value={formData.preferredDate}
                    onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-xs focus:ring-1 focus:ring-[#138601] outline-none cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-green-100 mb-1">
                  Brief Medical Note or Symptoms (Confidential)
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe your health symptoms, medical condition or reason for inquiry..."
                  value={formData.symptoms}
                  onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-[#138601]/40 bg-white dark:bg-[#041801] text-xs focus:ring-1 focus:ring-[#138601] outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-[#138601] hover:bg-[#0f6c01] text-white text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Submit Health Consultation Request</span>
              </button>
            </form>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HealthServices;
