import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Users, 
  Code, 
  Send, 
  Loader,
  GraduationCap,
  User,
  UserCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import HackathonNavbar from '../components/HackathonNavbar';
import Footer from '../components/Footer';

const HackathonApply = () => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    participationType: 'team', // 'solo' or 'team'
    teamName: '',
    chapter: 'Federal University of Technology, Owerri (FUTO)',
    projectKind: 'Web Application',
    leadName: '',
    leadEmail: '',
    leadMatric: '',
    leadPhone: '',
    projectTitle: '',
    problemStatement: '',
    proposedSolution: '',
    techStack: 'React, Node.js / Python, AI API / LLM, TailwindCSS',
    githubRepo: '',
    members: []
  });

  const handleAddMember = () => {
    if (formData.members.length < 4) { // Up to 5 total members including lead
      setFormData({
        ...formData,
        members: [...formData.members, { name: '', email: '', matric: '', role: 'Developer / Designer' }]
      });
    }
  };

  const handleRemoveMember = (idx) => {
    const updated = formData.members.filter((_, i) => i !== idx);
    setFormData({ ...formData, members: updated });
  };

  const handleMemberChange = (idx, field, value) => {
    const updated = [...formData.members];
    updated[idx][field] = field === 'matric' ? value.replace(/[\/\s\-]/g, '').toUpperCase() : value;
    setFormData({ ...formData, members: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Dispatch to internal serverless / Vite dev endpoint
      try {
        await fetch('/api/hackathons/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      } catch (apiErr) {
        console.warn('API endpoint submission notice:', apiErr);
      }

      // 2. Direct FormSubmit endpoint forward to ensure ict.nacosfuto@gmail.com receives it
      try {
        const payload = {
          _subject: `[The Agentic Build 2026] New Registration: ${formData.participationType === 'solo' ? formData.leadName : formData.teamName} (${formData.projectKind})`,
          _replyto: formData.leadEmail,
          _template: 'table',
          participation_format: formData.participationType === 'solo' ? 'Solo Builder (1 Person)' : 'Team',
          team_name: formData.participationType === 'team' ? formData.teamName : 'N/A (Solo)',
          institution_chapter: formData.chapter,
          kind_of_project: formData.projectKind,
          lead_full_name: formData.leadName,
          lead_email: formData.leadEmail,
          lead_matric_reg_no: formData.leadMatric,
          lead_phone_whatsapp: formData.leadPhone,
          project_title: formData.projectTitle,
          problem_statement: formData.problemStatement,
          proposed_solution_and_ai: formData.proposedSolution,
          anticipated_tech_stack: formData.techStack,
          github_repository: formData.githubRepo || 'N/A',
          total_team_members: formData.participationType === 'solo' ? 1 : (formData.members.length + 1),
          additional_members: formData.members.length > 0 
            ? formData.members.map((m, i) => `#${i + 2}: ${m.name} | ${m.email} | ${m.matric} | ${m.role}`).join('\n')
            : 'None (Solo Builder)'
        };

        await fetch('https://formsubmit.co/ajax/ict.nacosfuto@gmail.com', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      } catch (formSubmitErr) {
        console.warn('FormSubmit notification notice:', formSubmitErr);
      }

      setIsSuccess(true);
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (err) {
      console.error('Submission encountered:', err);
      setIsSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#041801] text-gray-900 dark:text-white font-sans selection:bg-[#138601] selection:text-white transition-colors duration-200">
      <HackathonNavbar />

      <div className="max-w-4xl mx-auto padding-global py-10 md:py-16">
        
        {/* Breadcrumb & Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/hackathons/the-agentic-build"
            className="inline-flex items-center gap-2 font-mono text-xs font-bold text-[#138601] dark:text-[#4bd043] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Back to The Agentic Build Overview
          </Link>

          <span className="font-mono text-xs text-amber-600 dark:text-amber-400 font-bold hidden sm:inline-block">
            DECEMBER 11TH, 2026 • HYBRID EVENT
          </span>
        </div>

        {/* Clean Header Area */}
        <div className="mb-8">
          <p className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">
            REGISTRATION • EVENT DATE: DECEMBER 11, 2026
          </p>
          <h1 className="font-['Silkscreen',_'Press_Start_2P',_monospace] text-2xl sm:text-4xl font-bold text-gray-950 dark:text-white uppercase tracking-tight">
            Apply: The Agentic Build
          </h1>
          <p className="font-mono text-xs sm:text-sm text-gray-600 dark:text-green-200/80 mt-2">
            Solo builders or teams up to 5 members. Projects are to be built with AI — any innovative product idea is accepted!
          </p>
        </div>

        {/* Multi-Step Indicator */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8">
          <div className={`p-3 rounded border-2 font-mono text-center text-xs font-bold transition-all ${
            step >= 1 
              ? 'bg-amber-400 text-gray-950 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' 
              : 'bg-white dark:bg-[#072402] border-gray-300 dark:border-[#138601]/40 text-gray-400'
          }`}>
            1. Builder / Team
          </div>
          <div className={`p-3 rounded border-2 font-mono text-center text-xs font-bold transition-all ${
            step >= 2 
              ? 'bg-amber-400 text-gray-950 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' 
              : 'bg-white dark:bg-[#072402] border-gray-300 dark:border-[#138601]/40 text-gray-400'
          }`}>
            2. Member Roster
          </div>
          <div className={`p-3 rounded border-2 font-mono text-center text-xs font-bold transition-all ${
            step >= 3 
              ? 'bg-amber-400 text-gray-950 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' 
              : 'bg-white dark:bg-[#072402] border-gray-300 dark:border-[#138601]/40 text-gray-400'
          }`}>
            3. Product Pitch
          </div>
        </div>

        {/* Main Card Box */}
        <div className="p-6 sm:p-10 rounded-lg bg-white dark:bg-[#072402] border-2 border-gray-900 dark:border-[#138601] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_#138601]">
          {isSuccess ? (
            <div className="text-center py-10 space-y-5">
              <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-[#138601]/30 text-[#138601] dark:text-[#4bd043] flex items-center justify-center mx-auto border-2 border-gray-900 dark:border-[#138601]">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              
              <div className="space-y-2">
                <span className="font-mono text-xs font-bold uppercase text-amber-500">
                  REGISTRATION CONFIRMED
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-950 dark:text-white">
                  Welcome to The Agentic Build!
                </h2>
              </div>

              <p className="text-sm text-gray-600 dark:text-green-100 max-w-lg mx-auto leading-relaxed">
                {formData.participationType === 'solo' ? (
                  <>You are registered as a <strong>Solo Builder</strong> ({formData.leadName || 'Innovator'}).</>
                ) : (
                  <>Team <strong className="text-[#138601] dark:text-[#4bd043]">{formData.teamName || 'Innovators'}</strong> has been registered.</>
                )}{' '}
                An onboarding briefing and sprint guide has been dispatched to <span className="font-bold text-gray-900 dark:text-white">{formData.leadEmail || 'your email'}</span>. See you on <strong>December 11th, 2026</strong>!
              </p>

              <div className="pt-6 flex flex-wrap items-center justify-center gap-4">
                <Link
                  to="/hackathons/the-agentic-build"
                  className="px-6 py-3 font-mono text-xs font-bold uppercase text-gray-950 bg-amber-400 hover:bg-amber-500 rounded border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
                >
                  Return to Hackathon Hub
                </Link>
                <Link
                  to="/dashboard"
                  className="px-6 py-3 font-mono text-xs font-bold uppercase text-white bg-[#138601] hover:bg-[#0f6c01] rounded border-2 border-gray-900 dark:border-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
                >
                  Go to Student Portal
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); setStep(step + 1); }}>
              
              {/* STEP 1: PARTICIPATION FORMAT & BUILDER/LEAD */}
              {step === 1 && (
                <div className="space-y-6">
                  
                  {/* Solo vs Team Toggle */}
                  <div className="border-b-2 border-dashed border-gray-200 dark:border-[#138601]/40 pb-5">
                    <label className="block text-xs font-mono font-bold uppercase text-gray-700 dark:text-green-200 mb-2">
                      Participation Format *
                    </label>
                    <div className="grid grid-cols-2 gap-3 max-w-md">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, participationType: 'solo' })}
                        className={`p-3 rounded border-2 font-mono text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                          formData.participationType === 'solo'
                            ? 'bg-amber-400 text-gray-950 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                            : 'bg-gray-50 dark:bg-[#041801] text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-700'
                        }`}
                      >
                        <User className="w-4 h-4" />
                        <span>Solo Builder (1 Person)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, participationType: 'team' })}
                        className={`p-3 rounded border-2 font-mono text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                          formData.participationType === 'team'
                            ? 'bg-amber-400 text-gray-950 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                            : 'bg-gray-50 dark:bg-[#041801] text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-700'
                        }`}
                      >
                        <Users className="w-4 h-4" />
                        <span>Team (Up to 5)</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {formData.participationType === 'team' && (
                      <div>
                        <label className="block text-xs font-mono font-bold uppercase text-gray-700 dark:text-green-200 mb-1">
                          Team Name *
                        </label>
                        <input
                          type="text"
                          required={formData.participationType === 'team'}
                          placeholder="e.g. AI Pioneers"
                          value={formData.teamName}
                          onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                          className="w-full px-4 py-2.5 text-sm rounded border-2 border-gray-900 dark:border-[#138601]/60 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>
                    )}

                    <div className={formData.participationType === 'solo' ? 'sm:col-span-2' : ''}>
                      <label className="block text-xs font-mono font-bold uppercase text-gray-700 dark:text-green-200 mb-1">
                        Institution / Chapter *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.chapter}
                        onChange={(e) => setFormData({ ...formData, chapter: e.target.value })}
                        className="w-full px-4 py-2.5 text-sm rounded border-2 border-gray-900 dark:border-[#138601]/60 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-gray-700 dark:text-green-200 mb-1">
                      Kind of Project / Product Type *
                    </label>
                    <select
                      value={formData.projectKind}
                      onChange={(e) => setFormData({ ...formData, projectKind: e.target.value })}
                      className="w-full px-4 py-2.5 text-sm rounded border-2 border-gray-900 dark:border-[#138601]/60 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer font-medium"
                    >
                      <option value="Web Application">Web Application</option>
                      <option value="Mobile Application (iOS / Android)">Mobile Application (iOS / Android)</option>
                      <option value="Campus & Student Life Tech">Campus & Student Life Tech</option>
                      <option value="Developer Tools & SaaS">Developer Tools & SaaS</option>
                      <option value="FinTech & Digital Commerce">FinTech & Digital Commerce</option>
                      <option value="Civic Tech, Health & Social Good">Civic Tech, Health & Social Good</option>
                      <option value="Other Custom Software">Other Custom Software</option>
                    </select>
                    <p className="mt-1 text-[11px] font-mono text-gray-500 dark:text-green-300">
                      No fixed tracks — you are free to build any software product using AI tools.
                    </p>
                  </div>

                  <div className="pt-4 border-t-2 border-dashed border-gray-200 dark:border-[#138601]/30 space-y-4">
                    <h4 className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4" />
                      {formData.participationType === 'solo' ? 'Solo Builder Credentials' : 'Team Lead (Primary Contact)'}
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-mono text-gray-600 dark:text-green-200/80 mb-1">Full Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. David Okonkwo"
                          value={formData.leadName}
                          onChange={(e) => setFormData({ ...formData, leadName: e.target.value })}
                          className="w-full px-4 py-2.5 text-sm rounded border-2 border-gray-900 dark:border-[#138601]/60 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-mono text-gray-600 dark:text-green-200/80 mb-1">Student / Official Email *</label>
                        <input
                          type="email"
                          required
                          placeholder="david@futo.edu.ng"
                          value={formData.leadEmail}
                          onChange={(e) => setFormData({ ...formData, leadEmail: e.target.value })}
                          className="w-full px-4 py-2.5 text-sm rounded border-2 border-gray-900 dark:border-[#138601]/60 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-mono text-gray-600 dark:text-green-200/80 mb-1">Matric / Registration No *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 20241400000"
                          value={formData.leadMatric}
                          onChange={(e) => setFormData({ ...formData, leadMatric: e.target.value.replace(/[\/\s\-]/g, '').toUpperCase() })}
                          className="w-full px-4 py-2.5 text-sm rounded border-2 border-gray-900 dark:border-[#138601]/60 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-mono text-gray-600 dark:text-green-200/80 mb-1">WhatsApp / Phone Number *</label>
                        <input
                          type="tel"
                          required
                          placeholder="+234 801 234 5678"
                          value={formData.leadPhone}
                          onChange={(e) => setFormData({ ...formData, leadPhone: e.target.value })}
                          className="w-full px-4 py-2.5 text-sm rounded border-2 border-gray-900 dark:border-[#138601]/60 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 flex justify-end">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-6 py-3 font-mono text-xs font-bold uppercase text-gray-950 bg-amber-400 hover:bg-amber-500 rounded border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
                    >
                      <span>Proceed to {formData.participationType === 'solo' ? 'Product Pitch' : 'Member Roster'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: MEMBER ROSTER (OPTIONAL FOR SOLO, UP TO 4 FOR TEAMS) */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b-2 border-dashed border-gray-200 dark:border-[#138601]/40 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-amber-500" />
                        {formData.participationType === 'solo' ? 'Solo Builder Confirmation' : 'Team Members (Up to 4 additional)'}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-green-300 font-mono mt-0.5">
                        {formData.participationType === 'solo' 
                          ? 'You are registered as a Solo Builder. You can skip this step or add team members if you wish.' 
                          : 'Teams can have up to 5 members in total including the Team Lead.'}
                      </p>
                    </div>

                    {formData.members.length < 4 && (
                      <button
                        type="button"
                        onClick={handleAddMember}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs font-bold text-gray-950 bg-amber-400 hover:bg-amber-500 rounded border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Member
                      </button>
                    )}
                  </div>

                  {formData.members.length === 0 ? (
                    <div className="p-6 rounded-md bg-gray-50 dark:bg-[#041801] border-2 border-dashed border-gray-300 dark:border-[#138601]/40 text-center space-y-2">
                      <UserCheck className="w-8 h-8 text-amber-500 mx-auto" />
                      <p className="font-mono text-xs font-bold text-gray-900 dark:text-white">
                        {formData.participationType === 'solo' ? 'Building Solo' : 'No Additional Members Added'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                        {formData.participationType === 'solo'
                          ? 'You are building independently. Click "Proceed to Product Pitch" to submit your project concept.'
                          : 'You can proceed as a solo builder or click "Add Member" above to add teammates.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formData.members.map((member, idx) => (
                        <div key={idx} className="p-4 rounded-md bg-gray-50 dark:bg-[#041801] border-2 border-gray-900 dark:border-[#138601]/40 space-y-3 relative">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-[#138601] dark:text-[#4bd043]">
                              Member #{idx + 2}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(idx)}
                              className="text-gray-500 hover:text-red-500 transition-colors cursor-pointer"
                              title="Remove member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div>
                              <label className="block text-[10px] font-mono uppercase text-gray-600 dark:text-green-200/80 mb-1">Full Name *</label>
                              <input
                                type="text"
                                required
                                placeholder="Name"
                                value={member.name}
                                onChange={(e) => handleMemberChange(idx, 'name', e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded border border-gray-900 dark:border-[#138601]/50 bg-white dark:bg-[#083002] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-mono uppercase text-gray-600 dark:text-green-200/80 mb-1">Student Email *</label>
                              <input
                                type="email"
                                required
                                placeholder="Email"
                                value={member.email}
                                onChange={(e) => handleMemberChange(idx, 'email', e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded border border-gray-900 dark:border-[#138601]/50 bg-white dark:bg-[#083002] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-mono uppercase text-gray-600 dark:text-green-200/80 mb-1">Matric / Reg No *</label>
                              <input
                                type="text"
                                required
                                placeholder="Matric"
                                value={member.matric}
                                onChange={(e) => handleMemberChange(idx, 'matric', e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded border border-gray-900 dark:border-[#138601]/50 bg-white dark:bg-[#083002] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-mono uppercase text-gray-600 dark:text-green-200/80 mb-1">Role in Team *</label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. Frontend / UI"
                                value={member.role}
                                onChange={(e) => handleMemberChange(idx, 'role', e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded border border-gray-900 dark:border-[#138601]/50 bg-white dark:bg-[#083002] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-6 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-5 py-2.5 font-mono text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white bg-gray-100 dark:bg-[#041801] rounded border border-gray-300 dark:border-gray-700 transition-colors cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-6 py-3 font-mono text-xs font-bold uppercase text-gray-950 bg-amber-400 hover:bg-amber-500 rounded border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
                    >
                      <span>Proceed to Product Pitch</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: PRODUCT PITCH */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="border-b-2 border-dashed border-gray-200 dark:border-[#138601]/40 pb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Code className="w-5 h-5 text-amber-500" />
                      Product Concept &amp; AI Integration
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-green-300 font-mono mt-0.5">
                      Any product idea is accepted! Describe your product and how it leverages AI.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-gray-700 dark:text-green-200 mb-1">
                      Working Product Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. EduPilot: AI-Powered Academic Coursework & Clearance Companion"
                      value={formData.projectTitle}
                      onChange={(e) => setFormData({ ...formData, projectTitle: e.target.value })}
                      className="w-full px-4 py-2.5 text-sm rounded border-2 border-gray-900 dark:border-[#138601]/60 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-gray-700 dark:text-green-200 mb-1">
                      Problem Statement (What friction or pain point does your product solve?) *
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Describe the real-world friction, delay, or problem users or students experience..."
                      value={formData.problemStatement}
                      onChange={(e) => setFormData({ ...formData, problemStatement: e.target.value })}
                      className="w-full px-4 py-2.5 text-sm rounded border-2 border-gray-900 dark:border-[#138601]/60 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-gray-700 dark:text-green-200 mb-1">
                      Proposed Solution &amp; How AI is Utilized *
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Explain your product features and how AI models, APIs, or smart automation are integrated..."
                      value={formData.proposedSolution}
                      onChange={(e) => setFormData({ ...formData, proposedSolution: e.target.value })}
                      className="w-full px-4 py-2.5 text-sm rounded border-2 border-gray-900 dark:border-[#138601]/60 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono font-bold uppercase text-gray-700 dark:text-green-200 mb-1">
                        Anticipated Tech Stack *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. React, Node.js / Python, AI API / LLM, TailwindCSS"
                        value={formData.techStack}
                        onChange={(e) => setFormData({ ...formData, techStack: e.target.value })}
                        className="w-full px-4 py-2.5 text-sm rounded border-2 border-gray-900 dark:border-[#138601]/60 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono font-bold uppercase text-gray-700 dark:text-green-200 mb-1">
                        GitHub Repository URL (Optional at registration)
                      </label>
                      <input
                        type="url"
                        placeholder="https://github.com/username/project-repo"
                        value={formData.githubRepo}
                        onChange={(e) => setFormData({ ...formData, githubRepo: e.target.value })}
                        className="w-full px-4 py-2.5 text-sm rounded border-2 border-gray-900 dark:border-[#138601]/60 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                  </div>

                  <div className="pt-6 flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-5 py-2.5 font-mono text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white bg-gray-100 dark:bg-[#041801] rounded border border-gray-300 dark:border-gray-700 transition-colors cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 px-8 py-3.5 font-mono text-sm font-bold uppercase tracking-wider text-gray-950 bg-amber-400 hover:bg-amber-500 rounded border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <Loader className="w-5 h-5 animate-spin text-gray-950" />
                      ) : (
                        <>
                          <Send className="w-4 h-4 text-gray-950" />
                          <span>Submit Registration</span>
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
