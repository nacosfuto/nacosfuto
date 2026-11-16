import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  Scale, 
  FileText,
  Lock,
  ArrowRight,
  Vote,
  Smartphone,
  Mail,
  KeyRound,
  UserCheck
} from 'lucide-react';
import VerifiedCheckmark from '../components/VerifiedCheckmark';

export default function GuidelinesPage() {
  const votingSteps = [
    {
      step: 1,
      title: 'Visit the Electra Voting Portal',
      detail: 'Open the official Electra voting portal on your smartphone, tablet, or computer browser at https://www.nacosfuto.com.ng/electra',
      icon: <Smartphone className="w-5 h-5 text-[#138601]" />
    },
    {
      step: 2,
      title: 'Click on Accreditation or Vote Now',
      detail: 'If you have not accredited yet, click Accreditation. If you are already accredited, proceed directly to Vote Now.',
      icon: <Vote className="w-5 h-5 text-[#138601]" />
    },
    {
      step: 3,
      title: 'Enter your FUTO Registration Number',
      detail: 'Type in your official FUTO Matriculation or Registration Number (e.g. 20201012948) to look up your student record.',
      icon: <FileText className="w-5 h-5 text-[#138601]" />
    },
    {
      step: 4,
      title: 'Confirm your First & Last Name',
      detail: 'Enter your First Name and Last Name as registered in the Department of Computer Science to verify your identity.',
      icon: <UserCheck className="w-5 h-5 text-[#138601]" />
    },
    {
      step: 5,
      title: 'Provide your Email Address',
      detail: 'Enter your active email address and click Send Code to request your private 6-digit voting verification code.',
      icon: <Mail className="w-5 h-5 text-[#138601]" />
    },
    {
      step: 6,
      title: 'Enter your 6-Digit Verification Code',
      detail: 'Check your email inbox (or spam/promotions folder) for the 6-digit code, enter it into the form, and complete your accreditation.',
      icon: <KeyRound className="w-5 h-5 text-[#138601]" />
    },
    {
      step: 7,
      title: 'Select your Preferred Candidates',
      detail: 'Once accredited, proceed to the official ballot, choose your preferred candidates for each position, and review your choices.',
      icon: <Vote className="w-5 h-5 text-[#138601]" />
    },
    {
      step: 8,
      title: 'Submit your Official Ballot',
      detail: 'Click Submit Official Ballot and wait a moment for your official voting confirmation receipt to appear on screen.',
      icon: <ShieldCheck className="w-5 h-5 text-[#138601]" />
    }
  ];

  const importantNotes = [
    {
      label: 'You can only vote once',
      text: 'Every eligible student gets one official ballot. Duplicate submissions are strictly prevented.'
    },
    {
      label: 'Do not share your verification code',
      text: 'Your 6-digit code is private to you. Never share or forward it to any candidate or third party.'
    },
    {
      label: 'Wait for voting confirmation',
      text: 'Ensure you see your successful voting confirmation receipt before closing or exiting the portal.'
    },
    {
      label: 'Votes cannot be changed',
      text: 'Once your official ballot is submitted, your choices are final and cannot be edited, changed, or recast.'
    },
    {
      label: 'Strict Voting Window',
      text: 'Voting officially begins at 08:00 AM and closes strictly at 06:00 PM on Election Day. Ballots after cutoff are not accepted.'
    }
  ];

  const generalGuidelines = [
    {
      title: 'Voter Eligibility',
      detail: 'All registered Computer Science students of NACOS FUTO across 100L through 500L are eligible to vote.'
    },
    {
      title: 'Secret Ballot & Complete Privacy',
      detail: 'Your vote is completely secret and confidential. Nobody, including election administrators, can see who you voted for.'
    },
    {
      title: 'Live & Transparent Results',
      detail: 'All ballots are certified and tallied in real time on the Live Results page. Certified by the NACOS Electoral Commission (ISEC).'
    },
    {
      title: 'Electoral Conduct & Fair Play',
      detail: 'Vote-buying, intimidation, impersonation, or attempts to disrupt voting will result in immediate disqualification and disciplinary referral.'
    }
  ];

  return (
    <div className="py-10 site-container max-w-4xl bg-[#F8FAFC]">
      
      {/* ── Top Header ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 mb-8 shadow-xs space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <VerifiedCheckmark className="w-3.5 h-3.5 shrink-0" />
          <span>Official NACOS ISEC Guide</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 font-display tracking-tight">
            How to Vote on ELECTRA
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
            Follow these simple steps to accredit yourself and cast your ballot online. Simple, secure, and transparent.
          </p>
        </div>

        {/* Quick Action Links */}
        <div className="pt-2 flex flex-wrap items-center gap-3">
          <Link
            to="/accreditation"
            className="px-5 py-2.5 rounded-[5px] text-xs font-bold bg-[#138601] hover:bg-[#0f6c01] text-white transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer"
          >
            <span>Start Accreditation</span>
            <ArrowRight className="w-4 h-4 stroke-[2.2]" />
          </Link>
          <Link
            to="/vote"
            className="px-5 py-2.5 rounded-[5px] text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors inline-flex items-center gap-2 cursor-pointer"
          >
            <span>Go to Ballot</span>
          </Link>
          <Link
            to="/results"
            className="px-5 py-2.5 rounded-[5px] text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors inline-flex items-center gap-2 cursor-pointer"
          >
            <span>Live Results</span>
          </Link>
        </div>
      </div>

      {/* ── Section 1: Step-by-Step Voting Process ── */}
      <div className="space-y-4 mb-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-display">
            Step-by-Step Voting Instructions
          </h2>
          <span className="text-xs font-semibold text-slate-500">
            8 Simple Steps
          </span>
        </div>

        <div className="space-y-3">
          {votingSteps.map((item) => (
            <div
              key={item.step}
              className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-[#138601]/50 transition-colors flex items-start gap-4"
            >
              <div className="w-8 h-8 rounded-lg bg-green-50 text-[#138601] border border-green-200 font-extrabold text-xs flex items-center justify-center shrink-0">
                0{item.step}
              </div>

              <div className="space-y-1 flex-1">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>{item.title}</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {item.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 2: Important Reminders ── */}
      <div className="mb-10 p-6 sm:p-8 rounded-2xl bg-amber-50/70 border border-amber-200/90 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 text-amber-800">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <h3 className="text-base font-bold font-display">
            Important Points to Remember
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {importantNotes.map((note, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-white/90 border border-amber-200/70 space-y-1">
              <span className="text-xs font-bold text-amber-900 block">
                {note.label}
              </span>
              <p className="text-xs text-slate-600 leading-relaxed">
                {note.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 3: General Electoral Guidelines ── */}
      <div className="space-y-4 mb-10">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-display">
          Electoral Rules & Guidelines
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {generalGuidelines.map((rule, idx) => (
            <div
              key={idx}
              className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2"
            >
              <h3 className="text-sm font-bold text-slate-900">
                {rule.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {rule.detail}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 4: Commission Certification & Motto Banner ── */}
      <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 text-white text-center space-y-3 shadow-sm">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-emerald-400 border border-white/10">
          <VerifiedCheckmark className="w-3.5 h-3.5 shrink-0" />
          <span>Official NACOS ISEC Accreditation</span>
        </div>

        <div className="space-y-1">
          <p className="text-base sm:text-lg font-bold text-white font-display">
            ELECTRA &bull; Secure. Transparent. Accountable.
          </p>
          <p className="text-xs sm:text-sm text-slate-300">
            Your vote matters. Make it count!
          </p>
        </div>

        <div className="pt-3 flex justify-center gap-3">
          <Link
            to="/accreditation"
            className="px-6 py-2.5 rounded-[5px] text-xs font-bold bg-[#138601] hover:bg-[#0f6c01] text-white transition-colors cursor-pointer"
          >
            Accredit Now
          </Link>
          <Link
            to="/vote"
            className="px-6 py-2.5 rounded-[5px] text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors cursor-pointer"
          >
            Proceed to Vote
          </Link>
        </div>
      </div>

    </div>
  );
}
