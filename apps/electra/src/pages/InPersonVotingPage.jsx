import React from 'react';
import { 
  MapPin, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Users, 
  HelpCircle,
  Vote,
  ExternalLink,
  ChevronRight,
  PhoneCall
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getActiveElection } from '@nacos/supabase/electraService';

export default function InPersonVotingPage() {
  const activeElection = getActiveElection();

  const requirements = [
    {
      title: 'Valid FUTO Student ID Card',
      desc: 'Official physical or digital university identity card with clear student portrait.'
    },
    {
      title: 'Departmental Admission Clearance / Course Form',
      desc: 'In the absence of a plastic ID card, an official verified admission letter or stamped course registration slip is accepted.'
    },
    {
      title: 'Active Matriculation / Registration Number',
      desc: 'Your official FUTO registration / matriculation number for cryptographic terminal accreditation.'
    }
  ];

  const procedures = [
    {
      step: '01',
      title: 'Arrival & Physical Queue Verification',
      detail: 'Arrive at the Computer Science Department ground floor. Present your identification credentials to the NACOS ISEC registration desk.'
    },
    {
      step: '02',
      title: 'Biometric & Matriculation Terminal Sign-In',
      detail: 'A certified electoral officer validates your matriculation number against the departmental ground-truth voter roll.'
    },
    {
      step: '03',
      title: 'Secret Digital Ballot Casting',
      detail: 'Enter a private polling booth and make your candidate choices on the secure, touch-screen terminal.'
    },
    {
      step: '04',
      title: 'Cryptographic Audit Receipt Issuance',
      detail: 'Upon ballot submission, your SHA-256 seal is cryptographically recorded into the live blockchain-style ledger.'
    }
  ];

  return (
    <div className="py-10 site-container bg-[#F8FAFC]">
      
      {/* Page Header */}
      <div className="mb-10 text-center max-w-3xl mx-auto space-y-3">
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 font-display">
          Where to Vote in Person
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          For electors who prefer physical participation or require technical support, NACOS ISEC has designated official on-campus voting terminals.
        </p>
      </div>

      {/* Primary Campus Location Banner */}
      <div className="mb-10 p-6 sm:p-8 rounded-[5px] bg-white border border-slate-200 shadow-2xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#138601]">
              Primary University Polling Headquarters
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
              Department of Computer Science
            </h2>
            <p className="text-sm text-slate-600 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#138601] shrink-0" />
              <span>
                School of Information and Communication Technology (SICT) Complex, Federal University of Technology, Owerri (FUTO), Imo State, Nigeria.
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              to="/vote"
              className="px-5 py-2.5 rounded-[5px] text-xs font-bold bg-[#138601] hover:bg-[#0f6c01] text-white shadow-xs inline-flex items-center gap-2 transition-colors"
            >
              <Vote className="w-4 h-4" />
              <span>Vote Online Instead</span>
            </Link>
          </div>
        </div>

        {/* Quick Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-[4px] bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Clock className="w-4 h-4 text-[#138601]" />
              <span>Voting Hours</span>
            </div>
            <p className="text-sm font-extrabold text-slate-900 font-display">
              08:00 AM – 04:00 PM WAT
            </p>
            <p className="text-[11px] text-slate-500">
              Accreditation closes strictly at 03:30 PM
            </p>
          </div>

          <div className="p-4 rounded-[4px] bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Calendar className="w-4 h-4 text-[#138601]" />
              <span>Election Session</span>
            </div>
            <p className="text-sm font-extrabold text-slate-900 font-display">
              {activeElection?.title || 'NACOS General Elections'}
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              Session: {activeElection?.session || '2026/2027'}
            </p>
          </div>

          <div className="p-4 rounded-[4px] bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <ShieldCheck className="w-4 h-4 text-[#138601]" />
              <span>Security & Oversight</span>
            </div>
            <p className="text-sm font-extrabold text-slate-900 font-display">
              NACOS ISEC Certified Officers
            </p>
            <p className="text-[11px] text-slate-500">
              Independent student observers present
            </p>
          </div>
        </div>
      </div>

      {/* What to Bring & Step-by-Step Procedure */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        
        {/* Requirements */}
        <div className="p-6 rounded-[5px] bg-white border border-slate-200 shadow-2xs space-y-5">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#138601]" />
            <h3 className="text-lg font-bold text-slate-900 font-display">
              Mandatory Voter Credentials
            </h3>
          </div>
          <p className="text-xs text-slate-600">
            Please present at least one of the following official documents at the accreditation desk:
          </p>

          <div className="space-y-3.5">
            {requirements.map((req, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-[4px] bg-slate-50 border border-slate-100">
                <CheckCircle2 className="w-4 h-4 text-[#138601] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {req.title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    {req.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step-by-Step In-Person Flow */}
        <div className="p-6 rounded-[5px] bg-white border border-slate-200 shadow-2xs space-y-5">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#138601]" />
            <h3 className="text-lg font-bold text-slate-900 font-display">
              In-Person Voting Procedure
            </h3>
          </div>
          <p className="text-xs text-slate-600">
            Follow these simple steps when voting at the Computer Science building:
          </p>

          <div className="space-y-3.5">
            {procedures.map((proc) => (
              <div key={proc.step} className="flex items-start gap-3.5">
                <span className="w-7 h-7 rounded-[4px] bg-green-50 text-[#138601] border border-green-200 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                  {proc.step}
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {proc.title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    {proc.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Assistance & Inquiries Footer Box */}
      <div className="p-6 rounded-[5px] bg-green-50/70 border border-green-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-[#138601]" />
            <span>Need Help Finding the Polling Unit?</span>
          </h4>
          <p className="text-xs text-slate-600 max-w-xl">
            NACOS ISEC student guides in branded electoral vests are stationed at the entrance of the Computer Science Complex to assist electors with accreditation and directions.
          </p>
        </div>

        <Link
          to="/guidelines"
          className="px-4 py-2 rounded-[5px] text-xs font-bold text-[#138601] bg-white hover:bg-green-50 border border-green-200 shrink-0 shadow-2xs transition-colors inline-flex items-center gap-1.5"
        >
          <span>Electoral Guidelines</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

    </div>
  );
}
