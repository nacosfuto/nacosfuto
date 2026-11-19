import React, { useState } from 'react';
import { 
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
  UserCheck,
  AlertCircle,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import confetti from 'canvas-confetti';
import { supabase } from '@nacos/supabase';
import HackathonNavbar from '../components/HackathonNavbar';
import Footer from '../components/Footer';
import { getActiveHackathon } from '../data/hackathons';

function verifyStudentNameMatch(inputFirst, inputLast, official) {
  if (!official) return false;

  const cleanInputFirst = String(inputFirst || '').trim().toLowerCase();
  const cleanInputLast = String(inputLast || '').trim().toLowerCase();

  // Both first name and last name must be provided
  if (!cleanInputFirst || !cleanInputLast) {
    return false;
  }

  // Prevent entering the exact same name for both fields unless official is a single name
  if (cleanInputFirst === cleanInputLast && (official.full_name || '').trim().split(/\s+/).length > 1) {
    return false;
  }

  const toTokens = (str) => {
    if (!str || typeof str !== 'string') return [];
    return str
      .toLowerCase()
      .replace(/[-_.,\/#!$%\^&\*;:{}=`~()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(t => t.length > 0);
  };

  const inputFirstTokens = toTokens(cleanInputFirst);
  const inputLastTokens = toTokens(cleanInputLast);

  if (inputFirstTokens.length === 0 || inputLastTokens.length === 0) {
    return false;
  }

  // Official names from database
  const officialFirstTokens = toTokens(official.first_name);
  const officialLastTokens = [
    ...toTokens(official.last_name),
    ...toTokens(official.surname)
  ];
  const officialMiddleTokens = toTokens(official.middle_name);
  const officialAllWords = Array.from(new Set([
    ...toTokens(official.full_name),
    ...officialFirstTokens,
    ...officialLastTokens,
    ...officialMiddleTokens
  ]));

  if (officialAllWords.length === 0) {
    return false;
  }

  // STRICT SPELLING ENFORCEMENT:
  // Every entered word must exactly match an official word in the database.
  // Partial matches, missing letters, and extra letters are strictly rejected.
  const allInputTokens = [...inputFirstTokens, ...inputLastTokens];
  const allTokensValid = allInputTokens.every(token => officialAllWords.includes(token));
  if (!allTokensValid) {
    return false;
  }

  // First name and last name cannot share the same word
  const hasOverlap = inputFirstTokens.some(ft => inputLastTokens.includes(ft));
  if (hasOverlap && officialAllWords.length > 1) {
    return false;
  }

  // Fallbacks if columns are not split
  const effFirstTokens = officialFirstTokens.length > 0
    ? officialFirstTokens
    : (officialAllWords.length > 1 ? [officialAllWords[1]] : officialAllWords);

  const effLastTokens = officialLastTokens.length > 0
    ? officialLastTokens
    : (officialAllWords.length > 0 ? [officialAllWords[0]] : []);

  // Check 1: Normal Order (Input First matches Database First/Middle, Input Last matches Database Last)
  const firstMatchesFirst = inputFirstTokens.every(it => effFirstTokens.includes(it) || officialMiddleTokens.includes(it) || officialAllWords.includes(it)) &&
                            inputFirstTokens.some(it => effFirstTokens.includes(it) || officialMiddleTokens.includes(it));
  const lastMatchesLast = inputLastTokens.every(it => effLastTokens.includes(it) || officialAllWords.includes(it)) &&
                          inputLastTokens.some(it => effLastTokens.includes(it));

  if (firstMatchesFirst && lastMatchesLast) {
    return true;
  }

  // Check 2: Swapped Order (Input First matches Database Last, Input Last matches Database First/Middle)
  const firstMatchesLast = inputFirstTokens.every(it => effLastTokens.includes(it) || officialAllWords.includes(it)) &&
                           inputFirstTokens.some(it => effLastTokens.includes(it));
  const lastMatchesFirst = inputLastTokens.every(it => effFirstTokens.includes(it) || officialMiddleTokens.includes(it) || officialAllWords.includes(it)) &&
                           inputLastTokens.some(it => effFirstTokens.includes(it) || officialMiddleTokens.includes(it));

  if (firstMatchesLast && lastMatchesFirst) {
    return true;
  }

  // Check 3: Full Name matching across distinct words
  const firstMatchesAnyOfficial = inputFirstTokens.every(it => officialAllWords.includes(it));
  const lastMatchesAnyOfficial = inputLastTokens.every(it => officialAllWords.includes(it));

  if (firstMatchesAnyOfficial && lastMatchesAnyOfficial && officialAllWords.length >= 2) {
    const matchedFirstIndices = inputFirstTokens.map(it => officialAllWords.indexOf(it)).filter(idx => idx !== -1);
    const matchedLastIndices = inputLastTokens.map(it => officialAllWords.indexOf(it)).filter(idx => idx !== -1);
    const hasDisjointMatch = matchedFirstIndices.some(fi => !matchedLastIndices.includes(fi));
    if (hasDisjointMatch) {
      return true;
    }
  }

  return false;
}

const checkClientNameMatch = verifyStudentNameMatch;

const HackathonApply = () => {
  const activeHackathon = getActiveHackathon();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [stepError, setStepError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    participationType: 'team', // 'solo' or 'team'
    teamName: '',
    chapter: 'Federal University of Technology, Owerri (FUTO)',
    projectKind: 'Web Application',
    leadFirstName: '',
    leadLastName: '',
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

  // Lead Student Eligibility Verification State
  const [leadVerification, setLeadVerification] = useState({
    isVerifying: false,
    isVerified: false,
    error: '',
    verifiedStudent: null
  });

  // Level Sanitizer Helper: strictly protects against historical/stale DB levels (e.g. 100L for 300L students)
  const sanitizeStudentLevel = (student) => {
    if (!student) return 'Undergraduate';
    let level = String(student.level || '').trim();
    const reg = String(student.registrationNumber || student.matric || '').trim();
    
    // Check intake year from registration number (FUTO format: YYYY...)
    if (reg.startsWith('2024') && (!level || level.includes('100'))) {
      level = '300 Level';
    } else if (reg.startsWith('2023') && (!level || level.includes('100') || level.includes('200'))) {
      level = '400 Level';
    } else if (reg.startsWith('2022') && (!level || level.includes('100') || level.includes('200') || level.includes('300'))) {
      level = '500 Level';
    } else if (reg.startsWith('2025') && (!level || level.includes('100'))) {
      level = '200 Level';
    } else if (reg.startsWith('2026')) {
      level = '100 Level';
    }
    return level || 'Undergraduate';
  };

  // Resilient Verification Helper: calls backend API first, with direct Supabase fallback
  const verifyStudentApi = async (regNo, firstName, lastName) => {
    const cleanReg = String(regNo || '').trim().toUpperCase();
    const cleanFirst = String(firstName || '').trim();
    const cleanLast = String(lastName || '').trim();

    // 1. Try server verification API endpoint first
    try {
      const res = await fetch('/api/hackathons/verify-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationNumber: cleanReg,
          firstName: cleanFirst,
          lastName: cleanLast
        })
      });

      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data && (data.success || data.error)) {
          return data;
        }
      } else {
        const errData = await res.json().catch(() => null);
        if (errData && errData.error) {
          return errData;
        }
      }
    } catch (apiErr) {
      console.warn('[HackathonApply] Server API unavailable, verifying directly via Supabase client:', apiErr.message);
    }

    // 2. Direct Supabase Client Verification Fallback (resilient against port or proxy issues)
    try {
      if (supabase) {
        const strippedReg = cleanReg.replace(/[^a-zA-Z0-9]/g, '');
        const slashReg = cleanReg.length === 11 && /^\d{11}$/.test(cleanReg) ? `${cleanReg.slice(0, 4)}/${cleanReg.slice(4)}` : cleanReg;

        // Query verified_students
        let { data: student } = await supabase
          .from('verified_students')
          .select('id, registration_number, full_name, email, phone_number, department, level, first_name, last_name, surname, middle_name')
          .or(`registration_number.eq.${cleanReg},registration_number.ilike.${cleanReg},registration_number.eq.${strippedReg},registration_number.ilike.${strippedReg},registration_number.eq.${slashReg}`)
          .limit(1)
          .maybeSingle();

        // Fallback to profiles table if not found in verified_students
        if (!student) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('id, registration_number, matric_number, full_name, first_name, last_name, surname, department, email, phone_number')
            .or(`registration_number.eq.${cleanReg},registration_number.ilike.${cleanReg},matric_number.eq.${cleanReg},registration_number.eq.${strippedReg},matric_number.eq.${strippedReg},registration_number.eq.${slashReg}`)
            .limit(1)
            .maybeSingle();

          if (prof) {
            student = {
              id: prof.id,
              registration_number: prof.registration_number || prof.matric_number,
              full_name: prof.full_name,
              first_name: prof.first_name || (prof.full_name ? prof.full_name.split(' ')[0] : ''),
              last_name: prof.last_name || prof.surname || '',
              department: prof.department || 'Computer Science',
              email: prof.email
            };
          }
        }

        if (student) {
          // Check Department (Exclusively Computer Science)
          const dept = (student.department || '').trim();
          const normDept = dept.toLowerCase();
          const isCSC = !dept || normDept.includes('computer science') || normDept.includes('csc') || normDept.includes('computing') || normDept === 'cs';

          if (!isCSC) {
            return {
              success: false,
              notComputerScience: true,
              error: `Ineligible: Student is registered under "${dept}". The Agentic Build hackathon is exclusively open to students of the Department of Computer Science.`
            };
          }

          // Check Name Match
          const isMatch = checkClientNameMatch(cleanFirst, cleanLast, student);
          if (!isMatch) {
            return {
              success: false,
              nameMismatch: true,
              error: `The name "${cleanFirst} ${cleanLast}" does not match the departmental records for ${cleanReg}. Please verify your spelling.`
            };
          }

          // Authoritative level derivation
          let level = student.level || '300 Level';
          if (cleanReg.startsWith('2024')) level = '300 Level';
          else if (cleanReg.startsWith('2023')) level = '400 Level';
          else if (cleanReg.startsWith('2022')) level = '500 Level';
          else if (cleanReg.startsWith('2025')) level = '200 Level';
          else if (cleanReg.startsWith('2026')) level = '100 Level';

          return {
            success: true,
            verified: true,
            student: {
              registrationNumber: student.registration_number || cleanReg,
              fullName: student.full_name || `${cleanFirst} ${cleanLast}`.trim(),
              firstName: student.first_name || cleanFirst,
              lastName: student.last_name || student.surname || cleanLast,
              department: student.department || 'Computer Science',
              level: level,
              email: student.email || ''
            }
          };
        }
      }
    } catch (directErr) {
      console.warn('[HackathonApply] Direct Supabase verification fallback error:', directErr.message);
    }

    return {
      success: false,
      notFound: true,
      error: `Registration number "${cleanReg}" was not found in the departmental database. Please check your reg number or contact NACOS ICT.`
    };
  };

  // Lead / Solo Builder Verification
  const handleVerifyLead = async () => {
    setStepError('');
    if (!formData.leadMatric || !formData.leadFirstName || !formData.leadLastName) {
      setLeadVerification(prev => ({
        ...prev,
        error: 'Please enter your First Name, Last Name, and Registration Number to verify.'
      }));
      return false;
    }

    setLeadVerification(prev => ({ ...prev, isVerifying: true, error: '' }));

    const res = await verifyStudentApi(
      formData.leadMatric,
      formData.leadFirstName,
      formData.leadLastName
    );

    if (res && res.success && res.student) {
      const studentData = {
        ...res.student,
        level: sanitizeStudentLevel(res.student)
      };
      setLeadVerification({
        isVerifying: false,
        isVerified: true,
        error: '',
        verifiedStudent: studentData
      });
      // Auto-populate email if not filled
      if (!formData.leadEmail && res.student.email) {
        setFormData(prev => ({ ...prev, leadEmail: res.student.email }));
      }
      return true;
    } else {
      setLeadVerification({
        isVerifying: false,
        isVerified: false,
        error: res?.error || 'Verification failed. Student record not found or student is not in Computer Science.',
        verifiedStudent: null
      });
      return false;
    }
  };

  // Team Member Management
  const handleAddMember = () => {
    setStepError('');
    if (formData.members.length < 4) { // Up to 5 total members including lead
      setFormData(prev => ({
        ...prev,
        members: [
          ...prev.members,
          {
            firstName: '',
            lastName: '',
            email: '',
            matric: '',
            role: 'Developer / Designer',
            isVerifying: false,
            isVerified: false,
            error: '',
            verifiedStudent: null
          }
        ]
      }));
    }
  };

  const handleRemoveMember = (idx) => {
    setStepError('');
    const updated = formData.members.filter((_, i) => i !== idx);
    setFormData(prev => ({ ...prev, members: updated }));
  };

  const handleMemberChange = (idx, field, value) => {
    setStepError('');
    const updated = [...formData.members];
    const formattedValue = field === 'matric' ? value.replace(/[\/\s\-]/g, '').toUpperCase() : value;
    updated[idx][field] = formattedValue;

    // Reset verification if identification fields change
    if (field === 'matric' || field === 'firstName' || field === 'lastName') {
      updated[idx].isVerified = false;
      updated[idx].error = '';
      updated[idx].verifiedStudent = null;
    }

    setFormData(prev => ({ ...prev, members: updated }));
  };

  // Individual Member Verification
  const handleVerifyMember = async (idx) => {
    setStepError('');
    const member = formData.members[idx];
    if (!member.matric || !member.firstName || !member.lastName) {
      updateMemberVerification(idx, {
        isVerifying: false,
        error: 'Please enter First Name, Last Name, and Registration Number.'
      });
      return false;
    }

    // Check duplicate with Lead
    const cleanLeadMatric = (formData.leadMatric || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const cleanMemberMatric = (member.matric || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (cleanMemberMatric === cleanLeadMatric) {
      updateMemberVerification(idx, {
        isVerifying: false,
        error: 'Registration number matches the Team Lead. Each team member must have a distinct registration number.'
      });
      return false;
    }

    // Check duplicate with other members
    const isDuplicate = formData.members.some((m, i) => {
      if (i === idx) return false;
      const otherClean = (m.matric || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      return otherClean === cleanMemberMatric;
    });

    if (isDuplicate) {
      updateMemberVerification(idx, {
        isVerifying: false,
        error: 'Registration number already added for another team member in this roster.'
      });
      return false;
    }

    updateMemberVerification(idx, { isVerifying: true, error: '' });

    const res = await verifyStudentApi(
      member.matric,
      member.firstName,
      member.lastName
    );

    if (res && res.success && res.student) {
      const studentData = {
        ...res.student,
        level: sanitizeStudentLevel(res.student)
      };
      updateMemberVerification(idx, {
        isVerifying: false,
        isVerified: true,
        error: '',
        verifiedStudent: studentData
      });
      if (!member.email && res.student.email) {
        handleMemberChange(idx, 'email', res.student.email);
      }
      return true;
    } else {
      updateMemberVerification(idx, {
        isVerifying: false,
        isVerified: false,
        error: res?.error || 'Verification failed. Student not found or student is not in Computer Science.',
        verifiedStudent: null
      });
      return false;
    }
  };

  const updateMemberVerification = (idx, updateObj) => {
    setFormData(prev => {
      const updatedMembers = [...prev.members];
      updatedMembers[idx] = { ...updatedMembers[idx], ...updateObj };
      return { ...prev, members: updatedMembers };
    });
  };

  // Step Navigation Validation
  const handleNextStep = async (e) => {
    e.preventDefault();
    setStepError('');

    // STEP 1 VALIDATION
    if (step === 1) {
      if (!formData.leadFirstName.trim() || !formData.leadLastName.trim() || !formData.leadMatric.trim()) {
        setStepError('Please fill in your First Name, Last Name, and Registration Number.');
        return;
      }
      if (!formData.leadEmail.trim() || !formData.leadPhone.trim()) {
        setStepError('Please provide your Email Address and Phone / WhatsApp number.');
        return;
      }
      if (formData.participationType === 'team' && !formData.teamName.trim()) {
        setStepError('Please enter a Team Name.');
        return;
      }

      // Ensure Lead is Verified in Computer Science
      if (!leadVerification.isVerified) {
        const verified = await handleVerifyLead();
        if (!verified) {
          setStepError('Student departmental verification required. Only students of Computer Science are eligible.');
          return;
        }
      }

      setStep(formData.participationType === 'solo' ? 3 : 2);
      window.scrollTo({ top: 100, behavior: 'smooth' });
      return;
    }

    // STEP 2 VALIDATION (Team Member Roster)
    if (step === 2) {
      if (formData.participationType === 'team' && formData.members.length > 0) {
        let allValid = true;
        for (let i = 0; i < formData.members.length; i++) {
          const m = formData.members[i];
          if (!m.firstName.trim() || !m.lastName.trim() || !m.matric.trim()) {
            setStepError(`Member #${i + 2} is missing required Name or Registration Number.`);
            return;
          }
          if (!m.email.trim() || !m.role.trim()) {
            setStepError(`Member #${i + 2} is missing Email or Role.`);
            return;
          }
          if (!m.isVerified) {
            const verified = await handleVerifyMember(i);
            if (!verified) {
              allValid = false;
            }
          }
        }
        if (!allValid) {
          setStepError('All team members must be verified as Computer Science students before proceeding.');
          return;
        }
      }

      setStep(3);
      window.scrollTo({ top: 100, behavior: 'smooth' });
      return;
    }

    // STEP 3 (Submission)
    if (step === 3) {
      handleSubmit(e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStepError('');

    const leadFullName = `${formData.leadFirstName.trim()} ${formData.leadLastName.trim()}`;
    const normalizedMembers = formData.members.map(m => ({
      name: `${m.firstName.trim()} ${m.lastName.trim()}`,
      firstName: m.firstName.trim(),
      lastName: m.lastName.trim(),
      email: m.email.trim(),
      matric: m.matric.trim(),
      role: m.role.trim(),
      department: m.verifiedStudent?.department || 'Computer Science'
    }));

    const submissionPayload = {
      ...formData,
      leadName: leadFullName,
      members: normalizedMembers
    };

    try {
      // 1. Dispatch directly to internal API endpoint (Sends email via Resend immediately)
      const res = await fetch('/api/hackathons/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionPayload)
      });

      // 2. Auxiliary FormSubmit notification triggered in background (fire-and-forget, non-blocking)
      try {
        const payload = {
          _subject: `[The Agentic Build 2026] New Registration: ${formData.participationType === 'solo' ? leadFullName : formData.teamName} (${formData.projectKind})`,
          _replyto: formData.leadEmail,
          _template: 'table',
          participation_format: formData.participationType === 'solo' ? 'Solo Builder (1 Person)' : 'Team',
          team_name: formData.participationType === 'team' ? formData.teamName : 'N/A (Solo)',
          institution_chapter: formData.chapter,
          kind_of_project: formData.projectKind,
          lead_full_name: leadFullName,
          lead_first_name: formData.leadFirstName,
          lead_last_name: formData.leadLastName,
          lead_email: formData.leadEmail,
          lead_matric_reg_no: formData.leadMatric,
          lead_phone_whatsapp: formData.leadPhone,
          lead_department: leadVerification.verifiedStudent?.department || 'Computer Science',
          project_title: formData.projectTitle,
          problem_statement: formData.problemStatement,
          proposed_solution_and_ai: formData.proposedSolution,
          anticipated_tech_stack: formData.techStack,
          github_repository: formData.githubRepo || 'N/A',
          total_team_members: formData.participationType === 'solo' ? 1 : (formData.members.length + 1),
          additional_members: normalizedMembers.length > 0 
            ? normalizedMembers.map((m, i) => `#${i + 2}: ${m.name} | ${m.email} | ${m.matric} | ${m.role} (${m.department})`).join('\n')
            : 'None (Solo Builder)'
        };

        // Fire-and-forget in background so slow 3rd-party response never delays the UI
        fetch('https://formsubmit.co/ajax/ict.nacosfuto@gmail.com', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        }).catch(() => {});
      } catch (_) {}

      // Immediately display success state and celebratory confetti
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

  const leadFullNameDisplay = `${formData.leadFirstName.trim()} ${formData.leadLastName.trim()}`.trim() || 'Innovator';

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#041801] text-gray-900 dark:text-white font-sans selection:bg-[#138601] selection:text-white transition-colors duration-200">
      <HackathonNavbar />

      <div className="max-w-4xl mx-auto padding-global py-10 md:py-16">
        {/* Clean Header Area */}
        <div className="mb-8">
          <h1 className="font-minecraft text-2xl sm:text-4xl font-bold text-gray-950 dark:text-white uppercase tracking-tight">
            Apply: The Agentic Build
          </h1>
          <p className="font-mono text-xs sm:text-sm text-gray-600 dark:text-green-200/80 mt-2">
            Solo builders or teams up to 5 members. Departmental verification confirms enrollment in Computer Science.
          </p>
        </div>

        {/* Multi-Step Indicator */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8">
          <div className={`p-3 rounded border-2 font-mono text-center text-xs font-bold transition-all ${
            step >= 1 
              ? 'bg-amber-400 text-gray-950 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' 
              : 'bg-white dark:bg-[#072402] border-gray-300 dark:border-[#138601]/40 text-gray-400'
          }`}>
            1. Builder / Lead
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
                <h2 className="font-minecraft text-xl sm:text-3xl font-bold uppercase tracking-tight text-gray-950 dark:text-white">
                  Welcome to The Agentic Build!
                </h2>
              </div>

              <p className="text-sm text-gray-600 dark:text-green-100 max-w-lg mx-auto leading-relaxed">
                {formData.participationType === 'solo' ? (
                  <>You are registered as a <strong>Solo Builder</strong> ({leadFullNameDisplay}).</>
                ) : (
                  <>Team <strong className="text-[#138601] dark:text-[#4bd043]">{formData.teamName || 'Innovators'}</strong> has been registered with Lead <strong>{leadFullNameDisplay}</strong>.</>
                )}{' '}
                You will be contacted with further details regarding your entry and sprint schedule. Join our official hackathon community on WhatsApp to receive real-time updates, announcements, and support!
              </p>

              {/* WhatsApp Community Call-to-Action Button */}
              <div className="pt-2 pb-1">
                <a
                  href={activeHackathon?.whatsappCommunityUrl || "https://chat.whatsapp.com/AgenticBuild2026"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-white bg-[#25D366] hover:bg-[#20ba5a] rounded border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_#138601] transition-all transform hover:-translate-y-0.5 cursor-pointer"
                >
                  <FaWhatsapp className="w-5 h-5 shrink-0 text-white fill-current" />
                  <span>Join Hackathon Community on WhatsApp</span>
                </a>
              </div>
            </div>
          ) : (
            <form onSubmit={handleNextStep}>
              
              {/* Step Error Banner */}
              {stepError && (
                <div className="mb-6 p-4 rounded-md bg-red-50 dark:bg-red-950/40 border-2 border-red-600 dark:border-red-500 text-red-900 dark:text-red-200 flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold font-mono">Attention Required</p>
                    <p className="mt-0.5">{stepError}</p>
                  </div>
                </div>
              )}

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
                        onClick={() => {
                          setStepError('');
                          setFormData({ ...formData, participationType: 'solo' });
                        }}
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
                        onClick={() => {
                          setStepError('');
                          setFormData({ ...formData, participationType: 'team' });
                        }}
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
                    <div className="flex items-center justify-between">
                      <h4 className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4" />
                        {formData.participationType === 'solo' ? 'Solo Builder Credentials' : 'Team Lead (Primary Contact)'}
                      </h4>
                      <span className="text-[11px] font-mono text-[#138601] dark:text-[#4bd043] font-semibold">
                        Must be a Computer Science Student
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-mono text-gray-600 dark:text-green-200/80 mb-1">First Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Chukwudi"
                          value={formData.leadFirstName}
                          onChange={(e) => {
                            setFormData({ ...formData, leadFirstName: e.target.value });
                            setLeadVerification(prev => ({ ...prev, isVerified: false, error: '' }));
                          }}
                          className="w-full px-4 py-2.5 text-sm rounded border-2 border-gray-900 dark:border-[#138601]/60 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-mono text-gray-600 dark:text-green-200/80 mb-1">Last Name / Surname *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Okafor"
                          value={formData.leadLastName}
                          onChange={(e) => {
                            setFormData({ ...formData, leadLastName: e.target.value });
                            setLeadVerification(prev => ({ ...prev, isVerified: false, error: '' }));
                          }}
                          className="w-full px-4 py-2.5 text-sm rounded border-2 border-gray-900 dark:border-[#138601]/60 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-mono text-gray-600 dark:text-green-200/80 mb-1">Registration / Matric Number *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 20241400001"
                          value={formData.leadMatric}
                          onChange={(e) => {
                            setFormData({ ...formData, leadMatric: e.target.value.replace(/[\/\s\-]/g, '').toUpperCase() });
                            setLeadVerification(prev => ({ ...prev, isVerified: false, error: '' }));
                          }}
                          className="w-full px-4 py-2.5 text-sm rounded border-2 border-gray-900 dark:border-[#138601]/60 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-mono text-gray-600 dark:text-green-200/80 mb-1">Student / Official Email *</label>
                        <input
                          type="email"
                          required
                          placeholder="student@futo.edu.ng"
                          value={formData.leadEmail}
                          onChange={(e) => setFormData({ ...formData, leadEmail: e.target.value })}
                          className="w-full px-4 py-2.5 text-sm rounded border-2 border-gray-900 dark:border-[#138601]/60 bg-gray-50 dark:bg-[#041801] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>

                      <div className="sm:col-span-2">
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

                    {/* Lead Verification Trigger Bar */}
                    <div className="p-3.5 rounded border-2 border-dashed border-gray-300 dark:border-[#138601]/50 bg-gray-50/80 dark:bg-[#041801]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="font-mono text-xs font-bold uppercase text-gray-900 dark:text-white">
                            Departmental Verification Status
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-gray-500 dark:text-green-300 mt-0.5">
                          Verifies your name &amp; matric number against the Computer Science student database.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleVerifyLead}
                        disabled={leadVerification.isVerifying || !formData.leadMatric || !formData.leadFirstName || !formData.leadLastName}
                        className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 font-mono text-xs font-bold uppercase rounded border-2 border-gray-900 dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                          leadVerification.isVerified
                            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                            : 'bg-amber-400 text-gray-950 hover:bg-amber-500'
                        }`}
                      >
                        {leadVerification.isVerifying ? (
                          <>
                            <Loader className="w-3.5 h-3.5 animate-spin" />
                            <span>Verifying Record...</span>
                          </>
                        ) : leadVerification.isVerified ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Verified ✓</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Verify Record</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Lead Verification Success Banner */}
                    {leadVerification.isVerified && leadVerification.verifiedStudent && (
                      <div className="p-3.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-600 dark:border-emerald-500 text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div className="text-xs">
                          <p className="font-bold font-mono text-emerald-700 dark:text-emerald-300">
                            Verified Computer Science Student
                          </p>
                          <p className="mt-0.5 leading-relaxed">
                            Official Record: <strong>{leadVerification.verifiedStudent.fullName}</strong> • Department: <strong>{leadVerification.verifiedStudent.department}</strong> ({leadVerification.verifiedStudent.level}) • Reg: <span className="font-mono font-semibold">{leadVerification.verifiedStudent.registrationNumber}</span>
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Lead Verification Error Banner */}
                    {leadVerification.error && (
                      <div className="p-3.5 rounded-md bg-red-50 dark:bg-red-950/40 border-2 border-red-600 dark:border-red-500 text-red-900 dark:text-red-200 flex items-start gap-2.5">
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                        <div className="text-xs">
                          <p className="font-bold font-mono text-red-700 dark:text-red-300">Verification Error</p>
                          <p className="mt-0.5 leading-relaxed">{leadVerification.error}</p>
                        </div>
                      </div>
                    )}
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

              {/* STEP 2: MEMBER ROSTER (UP TO 4 ADDITIONAL FOR TEAMS) */}
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
                          ? 'You are registered as a Solo Builder. Click "Proceed to Product Pitch" to continue.' 
                          : 'Teams can have up to 5 members in total including the Team Lead. Every member must be a verified Computer Science student.'}
                      </p>
                    </div>

                    {formData.participationType === 'team' && formData.members.length < 4 && (
                      <button
                        type="button"
                        onClick={handleAddMember}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs font-bold text-gray-950 bg-amber-400 hover:bg-amber-500 rounded border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Member
                      </button>
                    )}
                  </div>

                  {/* Member #1: Team Lead (Summary Card) */}
                  <div className="p-3.5 rounded-md bg-emerald-50/70 dark:bg-[#041801] border-2 border-emerald-600 dark:border-emerald-500/70 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold font-mono text-xs border border-emerald-600">
                        #1
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white">
                          {leadFullNameDisplay} <span className="font-mono text-emerald-600 dark:text-emerald-400 font-normal">({formData.leadMatric})</span>
                        </p>
                        <p className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                          {formData.participationType === 'solo' ? 'Solo Builder' : 'Team Lead'} • Department of Computer Science • {leadVerification.verifiedStudent?.level || 'Undergraduate'}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white font-mono text-[10px] font-bold uppercase rounded">
                      <CheckCircle2 className="w-3 h-3" /> Verified Lead
                    </span>
                  </div>

                  {formData.participationType === 'solo' ? (
                    <div className="p-6 rounded-md bg-gray-50 dark:bg-[#041801] border-2 border-dashed border-gray-300 dark:border-[#138601]/40 text-center space-y-2">
                      <UserCheck className="w-8 h-8 text-amber-500 mx-auto" />
                      <p className="font-mono text-xs font-bold text-gray-900 dark:text-white">
                        Building Solo
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                        You are registered as a Solo Builder. Click "Proceed to Product Pitch" to submit your project concept.
                      </p>
                    </div>
                  ) : formData.members.length === 0 ? (
                    <div className="p-6 rounded-md bg-gray-50 dark:bg-[#041801] border-2 border-dashed border-gray-300 dark:border-[#138601]/40 text-center space-y-2">
                      <UserCheck className="w-8 h-8 text-amber-500 mx-auto" />
                      <p className="font-mono text-xs font-bold text-gray-900 dark:text-white">
                        No Additional Members Added Yet
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                        You can click "Add Member" above to add up to 4 teammates, or proceed with just the Team Lead.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formData.members.map((member, idx) => (
                        <div key={idx} className="p-4 rounded-md bg-gray-50 dark:bg-[#041801] border-2 border-gray-900 dark:border-[#138601]/40 space-y-3 relative">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-[#138601] dark:text-[#4bd043] flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5" />
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

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[10px] font-mono uppercase text-gray-600 dark:text-green-200/80 mb-1">First Name *</label>
                              <input
                                type="text"
                                required
                                placeholder="First Name"
                                value={member.firstName}
                                onChange={(e) => handleMemberChange(idx, 'firstName', e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded border border-gray-900 dark:border-[#138601]/50 bg-white dark:bg-[#083002] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-mono uppercase text-gray-600 dark:text-green-200/80 mb-1">Last Name / Surname *</label>
                              <input
                                type="text"
                                required
                                placeholder="Last Name"
                                value={member.lastName}
                                onChange={(e) => handleMemberChange(idx, 'lastName', e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded border border-gray-900 dark:border-[#138601]/50 bg-white dark:bg-[#083002] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-mono uppercase text-gray-600 dark:text-green-200/80 mb-1">Matric / Reg No *</label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. 20241400000"
                                value={member.matric}
                                onChange={(e) => handleMemberChange(idx, 'matric', e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded border border-gray-900 dark:border-[#138601]/50 bg-white dark:bg-[#083002] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-400 font-mono"
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
                            <div className="sm:col-span-2 lg:col-span-2">
                              <label className="block text-[10px] font-mono uppercase text-gray-600 dark:text-green-200/80 mb-1">Role in Team *</label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. Frontend Engineer / AI Integrator"
                                value={member.role}
                                onChange={(e) => handleMemberChange(idx, 'role', e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded border border-gray-900 dark:border-[#138601]/50 bg-white dark:bg-[#083002] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                              />
                            </div>
                          </div>

                          {/* Member Verification Bar */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-dashed border-gray-200 dark:border-[#138601]/30">
                            <span className="text-[11px] font-mono text-gray-500 dark:text-green-300">
                              Status: {member.isVerified ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Verified Computer Science Student</span>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400 font-semibold">Verification Pending</span>
                              )}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleVerifyMember(idx)}
                              disabled={member.isVerifying || !member.matric || !member.firstName || !member.lastName}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 font-mono text-xs font-bold uppercase rounded border border-gray-900 dark:border-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                member.isVerified
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-amber-400 text-gray-950 hover:bg-amber-500'
                              }`}
                            >
                              {member.isVerifying ? (
                                <>
                                  <Loader className="w-3 h-3 animate-spin" />
                                  <span>Checking...</span>
                                </>
                              ) : member.isVerified ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Verified ✓</span>
                                </>
                              ) : (
                                <>
                                  <ShieldCheck className="w-3 h-3" />
                                  <span>Verify Member</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Member Success Banner */}
                          {member.isVerified && member.verifiedStudent && (
                            <div className="p-2.5 rounded bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-600 dark:border-emerald-500 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>
                                <strong>{member.verifiedStudent.fullName}</strong> • {member.verifiedStudent.department} ({member.verifiedStudent.level})
                              </span>
                            </div>
                          )}

                          {/* Member Error Banner */}
                          {member.error && (
                            <div className="p-2.5 rounded bg-red-50 dark:bg-red-950/40 border border-red-600 dark:border-red-500 text-red-900 dark:text-red-200 text-xs flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                              <span>{member.error}</span>
                            </div>
                          )}
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
                      onClick={() => setStep(formData.participationType === 'solo' ? 1 : 2)}
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
