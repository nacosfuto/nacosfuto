import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertCircle, 
  RefreshCw,
  Lock
} from 'lucide-react';
import { verifyIdCardPublic } from '@nacos/supabase/idCard';
import { calculateAcademicProgression, getActiveAcademicSession } from '@nacos/config/academic';
import logoDark from '../assets/full-logo-dark.png';
import logoLight from '../assets/full-logo-light.png';
import { useTheme } from '../context/ThemeContext';

const IdVerification = () => {
  const { id } = useParams();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);

  useEffect(() => {
    checkVerification();
  }, [id]);

  const checkVerification = async () => {
    setLoading(true);
    const res = await verifyIdCardPublic(id);
    setResult(res);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#041801] text-gray-900 dark:text-white flex flex-col font-sans selection:bg-[#138601] selection:text-white">
      
      {/* Top Header Banner */}
      <header className="border-b border-gray-200 dark:border-[#138601]/30 bg-white dark:bg-[#083002] py-4 shadow-sm">
        <div className="max-w-4xl mx-auto padding-global flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <img src={isDark ? logoDark : logoLight} alt="NACOS Logo" className="h-8 md:h-9 w-auto object-contain" />
            <div className="hidden sm:block border-l border-gray-200 dark:border-[#138601]/30 pl-3">
              <span className="text-xs font-bold text-[#138601] dark:text-[#4bd043] uppercase tracking-wider block">
                Official Credential Verification
              </span>
              <span className="text-[11px] text-gray-500 dark:text-green-200/70 block">
                Department of Computer Science • FUTO
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-green-200/70 font-mono">
            <Lock className="w-3.5 h-3.5 text-[#138601] dark:text-[#4bd043]" />
            <span>Secure Registry</span>
          </div>
        </div>
      </header>

      {/* Main Verification Card Area */}
      <main className="flex-1 flex items-center justify-center padding-global py-10">
        <div className="w-full max-w-lg space-y-6">
          
          {loading ? (
            <div className="p-12 rounded bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 text-center space-y-3 shadow-lg">
              <RefreshCw className="w-8 h-8 text-[#138601] animate-spin mx-auto" />
              <p className="text-xs text-gray-500 font-medium">Validating cryptographic QR hash and identity records...</p>
            </div>
          ) : result?.status === 'valid' ? (
            /* VALID ACTIVE ID CARD */
            <div className="rounded bg-white dark:bg-[#083002] border-2 border-[#138601] overflow-hidden shadow-2xl space-y-6">
              
              {/* Header Status Bar */}
              <div className="bg-[#138601] text-white p-6 text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-sm text-white flex items-center justify-center mx-auto border border-white/30">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-widest text-green-200">
                    Official Verification Result
                  </div>
                  <h1 className="text-2xl font-black tracking-tight">STATUS: VALID & ACTIVE</h1>
                </div>
              </div>

              {/* Student Details Card */}
              <div className="px-6 pb-6 space-y-5">
                
                {/* Photo & Name */}
                <div className="flex items-center gap-4 p-4 rounded bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/20">
                  {result.card?.passport_url ? (
                    <img
                      src={result.card.passport_url}
                      alt="Student"
                      className="w-16 h-20 object-cover rounded border border-[#138601]"
                    />
                  ) : (
                    <div className="w-16 h-20 rounded bg-gray-200 dark:bg-[#083002] flex items-center justify-center text-xs font-bold text-gray-500">
                      PHOTO
                    </div>
                  )}

                  <div className="space-y-1 text-xs">
                    <div className="font-bold text-base text-gray-900 dark:text-white uppercase">
                      {result.student?.name}
                    </div>
                    <div className="font-mono font-bold text-[#138601] dark:text-[#4bd043]">
                      REG NO: {result.student?.matric}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-green-200/70">
                      NACOS ID: <span className="font-mono font-bold text-yellow-600 dark:text-yellow-400">{result.card?.id_card_number}</span>
                    </div>
                  </div>
                </div>

                {/* Academic Metadata Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded bg-gray-50 dark:bg-[#041801] border border-gray-100 dark:border-[#138601]/20">
                    <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-green-200/50 block">Department</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{result.student?.department || 'Computer Science'}</span>
                  </div>

                  <div className="p-3.5 rounded bg-gray-50 dark:bg-[#041801] border border-gray-100 dark:border-[#138601]/20">
                    <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-green-200/50 block">Academic Level</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {result.student?.level || (result.student ? calculateAcademicProgression(result.student).levelString : '100 Level')}
                    </span>
                  </div>

                  <div className="p-3.5 rounded bg-gray-50 dark:bg-[#041801] border border-gray-100 dark:border-[#138601]/20">
                    <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-green-200/50 block">Session</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{result.student?.session || getActiveAcademicSession()}</span>
                  </div>

                  <div className="p-3.5 rounded bg-gray-50 dark:bg-[#041801] border border-gray-100 dark:border-[#138601]/20">
                    <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-green-200/50 block">Faculty</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{result.student?.faculty || 'SICT'}</span>
                  </div>
                </div>

                {/* Institutional Endorsement */}
                <div className="p-4 rounded bg-green-50 dark:bg-[#041801] border border-green-200 dark:border-[#138601]/30 text-center space-y-1">
                  <span className="text-xs font-bold text-[#138601] dark:text-[#4bd043] block">
                    ✓ Authenticated Departmental Member
                  </span>
                  <p className="text-[11px] text-gray-600 dark:text-green-100/70">
                    This document verifies that the student holds valid active membership in NACOS FUTO Chapter.
                  </p>
                </div>

              </div>

            </div>
          ) : result?.status === 'revoked' ? (
            /* REVOKED ID CARD */
            <div className="rounded bg-white dark:bg-[#083002] border-2 border-red-500 overflow-hidden shadow-2xl space-y-6">
              
              <div className="bg-red-600 text-white p-6 text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-sm text-white flex items-center justify-center mx-auto border border-white/30">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-widest text-red-200">
                    Security Warning
                  </div>
                  <h1 className="text-2xl font-black tracking-tight">STATUS: REVOKED</h1>
                </div>
              </div>

              <div className="px-6 pb-6 space-y-4 text-center">
                <div className="p-4 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-800 dark:text-red-300">
                  <strong>Notice:</strong> This identity card has been officially cancelled or revoked by the NACOS Directorate. It must not be accepted for examination clearance or laboratory access.
                </div>

                <div className="text-xs text-left p-4 rounded bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/20 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Holder Name:</span>
                    <span className="font-bold text-gray-900 dark:text-white">{result.student?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Reg Number:</span>
                    <span className="font-mono text-gray-800 dark:text-gray-200">{result.student?.matric}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">ID Number:</span>
                    <span className="font-mono text-red-600 font-bold">{result.card?.id_card_number}</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200 dark:border-[#138601]/20">
                    <span className="text-gray-500 font-bold block mb-0.5">Revocation Reason:</span>
                    <span className="text-red-700 dark:text-red-300 italic">{result.revocation_reason}</span>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            /* NOT FOUND / UNREGISTERED */
            <div className="rounded bg-white dark:bg-[#083002] border-2 border-amber-400 overflow-hidden shadow-2xl p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Record Not Found</h2>
                <p className="text-xs text-gray-500 dark:text-green-200/70 mt-1 max-w-sm mx-auto">
                  The identifier "{id}" does not correspond to an active or registered NACOS FUTO student ID card in our database.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01]"
                >
                  Return to NACOS Home
                </Link>
              </div>
            </div>
          )}

          {/* Footer Backlink */}
          <div className="text-center text-xs text-gray-400 dark:text-green-200/40">
            Federal University of Technology, Owerri • Nigeria Association of Computing Students
          </div>

        </div>
      </main>

    </div>
  );
};

export default IdVerification;
