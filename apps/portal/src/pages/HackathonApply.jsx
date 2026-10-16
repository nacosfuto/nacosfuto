import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Sparkles, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Users, 
  Lightbulb, 
  Send, 
  Loader,
  GraduationCap
} from 'lucide-react';
import confetti from 'canvas-confetti';
import HackathonNavbar from '../components/HackathonNavbar';
import Footer from '../components/Footer';

const HackathonApply = () => {
  const [searchParams] = useSearchParams();
  const preselectedTrack = searchParams.get('track') || 'fintech';

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    teamName: '',
    chapter: 'Federal University of Technology, Owerri (FUTO)',
    track: preselectedTrack,
    leadName: '',
    leadEmail: '',
    leadMatric: '',
    leadPhone: '',
    projectTitle: '',
    problemStatement: '',
    proposedSolution: '',
    techStack: 'React, Node.js, Python, TailwindCSS',
    githubRepo: '',
    members: [
      { name: '', email: '', matric: '', role: 'Frontend Developer' },
      { name: '', email: '', matric: '', role: 'Backend Developer' }
    ]
  });

  const handleAddMember = () => {
    if (formData.members.length < 5) {
      setFormData({
        ...formData,
        members: [...formData.members, { name: '', email: '', matric: '', role: 'Designer / AI Dev' }]
      });
    }
  };

  const handleRemoveMember = (idx) => {
    if (formData.members.length > 1) {
      const updated = formData.members.filter((_, i) => i !== idx);
      setFormData({ ...formData, members: updated });
    }
  };

  const handleMemberChange = (idx, field, value) => {
    const updated = [...formData.members];
    updated[idx][field] = field === 'matric' ? value.replace(/[\/\s\-]/g, '').toUpperCase() : value;
    setFormData({ ...formData, members: updated });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#041801] text-white font-sans selection:bg-[#138601] selection:text-white">
      <HackathonNavbar />

      <div className="max-w-4xl mx-auto padding-global py-12 md:py-16">
        
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            to="/hackathons/BuildXNACOS"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#4bd043] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to BuildX NACOS Details
          </Link>
        </div>

        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Apply for BUILDX NACOS 2026
          </h1>
          <p className="text-sm text-green-200/80 mt-1">
            Register your team (3 to 6 members). Ensure all team members are verified students.
          </p>
        </div>

        {/* Multi-Step Indicator */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8">
          <div className={`p-3 rounded border text-center text-xs font-bold ${step >= 1 ? 'bg-[#083002] border-[#138601] text-[#4bd043]' : 'bg-[#041801] border-[#138601]/20 text-gray-500'}`}>
            1. Team & Lead
          </div>
          <div className={`p-3 rounded border text-center text-xs font-bold ${step >= 2 ? 'bg-[#083002] border-[#138601] text-[#4bd043]' : 'bg-[#041801] border-[#138601]/20 text-gray-500'}`}>
            2. Member Roster
          </div>
          <div className={`p-3 rounded border text-center text-xs font-bold ${step >= 3 ? 'bg-[#083002] border-[#138601] text-[#4bd043]' : 'bg-[#041801] border-[#138601]/20 text-gray-500'}`}>
            3. Project Pitch
          </div>
        </div>

        {/* Card Box */}
        <div className="p-6 sm:p-10 rounded bg-[#083002] border border-[#138601]/40 shadow-2xl">
          {isSuccess ? (
            <div className="text-center py-10 space-y-5">
              <div className="w-20 h-20 rounded-full bg-[#138601]/30 text-[#4bd043] flex items-center justify-center mx-auto border border-[#138601]/50">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                Application Received!
              </h2>
              <p className="text-sm text-green-100 max-w-md mx-auto leading-relaxed">
                Team <span className="font-bold text-[#4bd043]">{formData.teamName || 'Innovators'}</span> has been submitted for BUILDX NACOS 2026. A confirmation email with sprint onboarding links has been sent to <span className="font-bold text-white">{formData.leadEmail || 'your email'}</span>.
              </p>
              <div className="pt-6 flex flex-wrap items-center justify-center gap-4">
                <Link
                  to="/dashboard"
                  className="px-6 py-3 text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] rounded transition-all shadow-md"
                >
                  View in Student Dashboard
                </Link>
                <Link
                  to="/hackathons/BuildXNACOS"
                  className="px-6 py-3 text-xs font-semibold text-green-100 bg-[#041801] hover:bg-black rounded border border-[#138601]/30 transition-colors"
                >
                  Return to Hackathon Page
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); setStep(step + 1); }}>
              
              {/* STEP 1: TEAM & LEAD */}
              {step === 1 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-white border-b border-[#138601]/20 pb-3 flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#4bd043]" />
                    Team & Leader Information
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-green-200 mb-1">
                        Team Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Neural Pioneers"
                        value={formData.teamName}
                        onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                        className="w-full px-4 py-2.5 text-sm rounded border border-[#138601]/30 bg-[#041801] text-white focus:outline-none focus:ring-2 focus:ring-[#138601]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase text-green-200 mb-1">
                        Institution / Chapter
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.chapter}
                        onChange={(e) => setFormData({ ...formData, chapter: e.target.value })}
                        className="w-full px-4 py-2.5 text-sm rounded border border-[#138601]/30 bg-[#041801] text-white focus:outline-none focus:ring-2 focus:ring-[#138601]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-green-200 mb-1">
                      Challenge Track
                    </label>
                    <select
                      value={formData.track}
                      onChange={(e) => setFormData({ ...formData, track: e.target.value })}
                      className="w-full px-4 py-2.5 text-sm rounded border border-[#138601]/30 bg-[#041801] text-white focus:outline-none focus:ring-2 focus:ring-[#138601] cursor-pointer"
                    >
                      <option value="fintech">Open Payments & FinTech</option>
                      <option value="ai">Artificial Intelligence & Automation</option>
                      <option value="digital">Digital Innovation & Civic Tech</option>
                    </select>
                  </div>

                  <div className="pt-4 border-t border-[#138601]/20 space-y-4">
                    <h4 className="text-sm font-bold text-[#4bd043] uppercase tracking-wider">Team Lead (Primary Contact)</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-green-200/80 mb-1">Lead Full Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. David Okonkwo"
                          value={formData.leadName}
                          onChange={(e) => setFormData({ ...formData, leadName: e.target.value })}
                          className="w-full px-4 py-2.5 text-sm rounded border border-[#138601]/30 bg-[#041801] text-white focus:outline-none focus:ring-2 focus:ring-[#138601]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-green-200/80 mb-1">Lead Student Email</label>
                        <input
                          type="email"
                          required
                          placeholder="david@futo.edu.ng"
                          value={formData.leadEmail}
                          onChange={(e) => setFormData({ ...formData, leadEmail: e.target.value })}
                          className="w-full px-4 py-2.5 text-sm rounded border border-[#138601]/30 bg-[#041801] text-white focus:outline-none focus:ring-2 focus:ring-[#138601]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-green-200/80 mb-1">Lead Matric / Reg No</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 20241400000"
                          value={formData.leadMatric}
                          onChange={(e) => setFormData({ ...formData, leadMatric: e.target.value.replace(/[\/\s\-]/g, '').toUpperCase() })}
                          className="w-full px-4 py-2.5 text-sm rounded border border-[#138601]/30 bg-[#041801] text-white focus:outline-none focus:ring-2 focus:ring-[#138601]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-green-200/80 mb-1">WhatsApp / Phone Number</label>
                        <input
                          type="tel"
                          required
                          placeholder="+234 801 234 5678"
                          value={formData.leadPhone}
                          onChange={(e) => setFormData({ ...formData, leadPhone: e.target.value })}
                          className="w-full px-4 py-2.5 text-sm rounded border border-[#138601]/30 bg-[#041801] text-white focus:outline-none focus:ring-2 focus:ring-[#138601]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 flex justify-end">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-6 py-3 text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] rounded transition-all shadow-md cursor-pointer"
                    >
                      <span>Proceed to Roster</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: MEMBER ROSTER */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-[#138601]/20 pb-3">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-[#4bd043]" />
                      Team Members (2 to 5 additional members)
                    </h3>
                    {formData.members.length < 5 && (
                      <button
                        type="button"
                        onClick={handleAddMember}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#4bd043] bg-[#041801] border border-[#138601]/40 rounded hover:bg-[#138601]/20 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Member
                      </button>
                    )}
                  </div>

                  {formData.members.map((member, idx) => (
                    <div key={idx} className="p-4 rounded bg-[#041801] border border-[#138601]/20 space-y-3 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#4bd043]">Member #{idx + 2}</span>
                        {formData.members.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(idx)}
                            className="text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[10px] text-green-200/80 uppercase mb-1">Full Name</label>
                          <input
                            type="text"
                            required
                            placeholder="Name"
                            value={member.name}
                            onChange={(e) => handleMemberChange(idx, 'name', e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded border border-[#138601]/30 bg-[#083002] text-white focus:outline-none focus:ring-1 focus:ring-[#138601]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-green-200/80 uppercase mb-1">Student Email</label>
                          <input
                            type="email"
                            required
                            placeholder="Email"
                            value={member.email}
                            onChange={(e) => handleMemberChange(idx, 'email', e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded border border-[#138601]/30 bg-[#083002] text-white focus:outline-none focus:ring-1 focus:ring-[#138601]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-green-200/80 uppercase mb-1">Matric No</label>
                          <input
                            type="text"
                            required
                            placeholder="Matric"
                            value={member.matric}
                            onChange={(e) => handleMemberChange(idx, 'matric', e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded border border-[#138601]/30 bg-[#083002] text-white focus:outline-none focus:ring-1 focus:ring-[#138601]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-green-200/80 uppercase mb-1">Role in Team</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. UI/UX"
                            value={member.role}
                            onChange={(e) => handleMemberChange(idx, 'role', e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded border border-[#138601]/30 bg-[#083002] text-white focus:outline-none focus:ring-1 focus:ring-[#138601]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="pt-6 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-5 py-2.5 text-xs font-semibold text-gray-300 hover:text-white bg-[#041801] rounded transition-colors cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-6 py-3 text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] rounded transition-all shadow-md cursor-pointer"
                    >
                      <span>Proceed to Project Pitch</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: PROJECT PITCH */}
              {step === 3 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-white border-b border-[#138601]/20 pb-3 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-[#4bd043]" />
                    Project Pitch & Technical Concept
                  </h3>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-green-200 mb-1">
                      Working Project Title
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. PayCampus: Decentralized Dues & Micro-Grant Protocol"
                      value={formData.projectTitle}
                      onChange={(e) => setFormData({ ...formData, projectTitle: e.target.value })}
                      className="w-full px-4 py-2.5 text-sm rounded border border-[#138601]/30 bg-[#041801] text-white focus:outline-none focus:ring-2 focus:ring-[#138601]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-green-200 mb-1">
                      Problem Statement (What specific Nigerian problem are you solving?)
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Explain the pain point, who is affected, and why current solutions are inadequate..."
                      value={formData.problemStatement}
                      onChange={(e) => setFormData({ ...formData, problemStatement: e.target.value })}
                      className="w-full px-4 py-2.5 text-sm rounded border border-[#138601]/30 bg-[#041801] text-white focus:outline-none focus:ring-2 focus:ring-[#138601]"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-green-200 mb-1">
                      Proposed Solution & Architecture
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Describe your technical approach, core features, and intended user journey..."
                      value={formData.proposedSolution}
                      onChange={(e) => setFormData({ ...formData, proposedSolution: e.target.value })}
                      className="w-full px-4 py-2.5 text-sm rounded border border-[#138601]/30 bg-[#041801] text-white focus:outline-none focus:ring-2 focus:ring-[#138601]"
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-green-200 mb-1">
                        Anticipated Tech Stack
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. React, FastApi, PostgreSQL, TensorFlow"
                        value={formData.techStack}
                        onChange={(e) => setFormData({ ...formData, techStack: e.target.value })}
                        className="w-full px-4 py-2.5 text-sm rounded border border-[#138601]/30 bg-[#041801] text-white focus:outline-none focus:ring-2 focus:ring-[#138601]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase text-green-200 mb-1">
                        GitHub Repository URL (Optional for now)
                      </label>
                      <input
                        type="url"
                        placeholder="https://github.com/username/project"
                        value={formData.githubRepo}
                        onChange={(e) => setFormData({ ...formData, githubRepo: e.target.value })}
                        className="w-full px-4 py-2.5 text-sm rounded border border-[#138601]/30 bg-[#041801] text-white focus:outline-none focus:ring-2 focus:ring-[#138601]"
                      />
                    </div>
                  </div>

                  <div className="pt-6 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-5 py-2.5 text-xs font-semibold text-gray-300 hover:text-white bg-[#041801] rounded transition-colors cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-bold text-white bg-[#138601] hover:bg-[#0f6c01] rounded transition-all shadow-nacos-glow disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <Loader className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Submit Team Application</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

            </form>
          )}
        </div>

      </div>

      <Footer />
    </div>
  );
};

export default HackathonApply;
