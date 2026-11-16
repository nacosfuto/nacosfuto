import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  Mail, 
  KeyRound, 
  ChevronLeft,
  Lock,
  Vote,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { 
  getActiveElection, 
  fetchLiveElectraData,
  apiAccreditVoter, 
  apiSendElectoralCode, 
  apiVerifyElectoralCode 
} from '@nacos/supabase/electraService';

const STORAGE_KEY = 'nacos_electra_accreditation_wizard';

export default function AccreditationPage({ voter, onConnectVoter, election: propElection }) {
  const navigate = useNavigate();
  const { stepId } = useParams();
  const [activeElection, setActiveElection] = useState(() => propElection || getActiveElection());

  useEffect(() => {
    if (propElection) {
      setActiveElection(propElection);
    }
  }, [propElection]);

  useEffect(() => {
    fetchLiveElectraData().then(data => {
      if (data?.election) setActiveElection(data.election);
    }).catch(console.warn);

    const handleUpdate = () => {
      setActiveElection(getActiveElection());
    };
    window.addEventListener('nacos_electra_election_updated', handleUpdate);
    return () => window.removeEventListener('nacos_electra_election_updated', handleUpdate);
  }, []);

  // Normalize step from URL (/accreditation, /accreditation/step-1, step-2, etc.)
  const resolveStepNumber = (param) => {
    if (!param || param === 'step-1' || param === 'reg-no') return 1;
    if (param === 'step-2' || param === 'names') return 2;
    if (param === 'step-3' || param === 'email') return 3;
    if (param === 'step-4' || param === 'code') return 4;
    return 1;
  };

  const currentStep = resolveStepNumber(stepId);

  // Restore wizard state from sessionStorage so page reloads don't lose progress
  const [wizardData, setWizardData] = useState(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {
        registrationNumber: '',
        firstName: '',
        lastName: '',
        email: '',
        code: '',
        accreditationToken: null,
        accreditedVoter: null,
        maskedEmail: ''
      };
    } catch {
      return {
        registrationNumber: '',
        firstName: '',
        lastName: '',
        email: '',
        code: '',
        accreditationToken: null,
        accreditedVoter: null,
        maskedEmail: ''
      };
    }
  });

  // Local Form inputs
  const [registrationNumber, setRegistrationNumber] = useState(wizardData.registrationNumber || '');
  const [firstName, setFirstName] = useState(wizardData.firstName || '');
  const [lastName, setLastName] = useState(wizardData.lastName || '');
  const [email, setEmail] = useState(wizardData.email || '');
  const [code, setCode] = useState(wizardData.code || '');

  // Session state from server
  const [accreditationToken, setAccreditationToken] = useState(wizardData.accreditationToken || null);
  const [accreditedVoter, setAccreditedVoter] = useState(wizardData.accreditedVoter || null);
  const [maskedEmail, setMaskedEmail] = useState(wizardData.maskedEmail || '');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Persist wizard data in sessionStorage
  const saveWizardData = (updates) => {
    setWizardData(prev => {
      const merged = { ...prev, ...updates };
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch (_) {}
      return merged;
    });
  };

  // Guard: Ensure user cannot jump ahead to Step 2, 3, or 4 without necessary prerequisite state
  useEffect(() => {
    setError('');
    setSuccessNotice('');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    let hasReg = !!wizardData.registrationNumber;
    let hasToken = !!wizardData.accreditationToken;
    if (!hasReg || !hasToken) {
      try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.registrationNumber) hasReg = true;
          if (parsed.accreditationToken) hasToken = true;
        }
      } catch (_) {}
    }

    if (currentStep === 2 && !hasReg) {
      navigate('/accreditation/step-1', { replace: true });
    } else if ((currentStep === 3 || currentStep === 4) && !hasToken) {
      navigate('/accreditation/step-1', { replace: true });
    }
  }, [currentStep, wizardData.registrationNumber, wizardData.accreditationToken, navigate]);

  // Resend cooldown timer ticker
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  // If already accredited, show clear option to proceed to voting
  if (voter) {
    return (
      <div className="min-h-[80vh] bg-[#F8FAFC] py-12 sm:py-16 site-container max-w-2xl mx-auto px-4 sm:px-6">
        <div className="bg-white border border-green-200 rounded-[5px] p-8 sm:p-10 shadow-xs text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 text-[#138601] flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#138601] bg-green-50 px-3 py-1 rounded-[3px] border border-green-200">
              Voter Accreditation Confirmed
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
              You are officially accredited!
            </h1>
            <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              Welcome, <strong className="text-slate-900">{voter.name || 'Electra Voter'}</strong> ({voter.registrationNumber || voter.matricNumber}). Your digital accreditation has been confirmed for the active election.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/vote"
              className="px-6 py-3 rounded-[5px] text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Proceed to Official Ballot</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </Link>
            <Link
              to="/manifestos"
              className="px-6 py-3 rounded-[5px] text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center cursor-pointer"
            >
              <span>Read Contestant Manifestos</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP 1: PROCEED TO STEP 2 WITH REGISTRATION NUMBER ──
  const handleProceedToNames = (e) => {
    e.preventDefault();
    setError('');
    const cleanReg = registrationNumber.trim().toUpperCase();
    if (!cleanReg) {
      setError('Please enter your official Registration / Matric Number.');
      return;
    }
    saveWizardData({ registrationNumber: cleanReg });
    navigate('/accreditation/step-2');
  };

  // ── STEP 2: VERIFY IDENTITY & ADVANCE TO STEP 3 ──
  const handleVerifyIdentity = async (e) => {
    e.preventDefault();
    setError('');
    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();

    if (!cleanFirst || !cleanLast) {
      setError('Please provide both your First Name and Last Name as registered.');
      return;
    }

    setIsLoading(true);

    try {
      const targetReg = wizardData.registrationNumber || registrationNumber.trim().toUpperCase();
      const currentElectionId = activeElection?.id || getActiveElection()?.id || null;
      const res = await apiAccreditVoter({
        electionId: currentElectionId,
        registrationNumber: targetReg,
        firstName: cleanFirst,
        lastName: cleanLast
      });

      setIsLoading(false);

      if (!res.success) {
        if (res.alreadyVoted) {
          setError(res.error || 'You have already voted in this election.');
        } else {
          setError(res.error || 'We could not verify the details provided. Please check your information and try again.');
        }
        return;
      }

      // If voter was already verified and token is returned directly
      if (res.alreadyVerified && res.votingSessionToken) {
        if (onConnectVoter) {
          onConnectVoter(res.voter, res.votingSessionToken);
        }
        sessionStorage.removeItem(STORAGE_KEY);
        navigate('/vote');
        return;
      }

      // Save token & accredited voter and navigate to Step 3
      setAccreditationToken(res.accreditationToken);
      setAccreditedVoter(res.voter);
      saveWizardData({
        firstName: cleanFirst,
        lastName: cleanLast,
        accreditationToken: res.accreditationToken,
        accreditedVoter: res.voter
      });

      navigate('/accreditation/step-3');
    } catch (err) {
      setIsLoading(false);
      setError('A communication error occurred while verifying your record. Please try again.');
    }
  };

  // ── STEP 3: SEND VERIFICATION CODE & ADVANCE TO STEP 4 ──
  const handleSendCode = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessNotice('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    const token = accreditationToken || wizardData.accreditationToken;
    if (!token) {
      setError('Accreditation session expired. Please start again from Step 1.');
      navigate('/accreditation/step-1');
      return;
    }

    setIsLoading(true);

    try {
      const res = await apiSendElectoralCode({
        accreditationToken: token,
        email: cleanEmail
      });

      setIsLoading(false);

      if (!res.success) {
        if (res.cooldown) {
          setCooldownSeconds(res.retryAfterSeconds || 60);
        }
        setError(res.error || 'Failed to dispatch verification code. Please try again.');
        return;
      }

      const masked = res.destinationMasked || cleanEmail;
      setMaskedEmail(masked);
      setCooldownSeconds(res.cooldownSeconds || 60);

      saveWizardData({
        email: cleanEmail,
        maskedEmail: masked
      });

      navigate('/accreditation/step-4');
    } catch (err) {
      setIsLoading(false);
      setError('Failed to dispatch verification code due to a network error.');
    }
  };

  // ── STEP 4: VERIFY 6-DIGIT CODE & UNLOCK BALLOT ──
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');

    const cleanCode = code.trim();
    if (!cleanCode || cleanCode.length < 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    const token = accreditationToken || wizardData.accreditationToken;
    if (!token) {
      setError('Accreditation session expired. Please restart from Step 1.');
      navigate('/accreditation/step-1');
      return;
    }

    setIsLoading(true);

    try {
      const res = await apiVerifyElectoralCode({
        accreditationToken: token,
        code: cleanCode
      });

      setIsLoading(false);

      if (!res.success) {
        setError(res.error || 'Invalid or expired verification code.');
        return;
      }

      // Accreditation fully successful! Establish voter session
      if (onConnectVoter) {
        onConnectVoter(res.voter, res.votingSessionToken);
      }
      sessionStorage.removeItem(STORAGE_KEY);

      // Navigate to the official ballot page
      navigate('/vote');
    } catch (err) {
      setIsLoading(false);
      setError('Verification failed due to a network communication error.');
    }
  };

  const stepsList = [
    { num: 1, title: 'Matric Number', path: '/accreditation/step-1' },
    { num: 2, title: 'Student Identity', path: '/accreditation/step-2' },
    { num: 3, title: 'Email Delivery', path: '/accreditation/step-3' },
    { num: 4, title: 'Ballot Passcode', path: '/accreditation/step-4' }
  ];

  return (
    <div className="min-h-[85vh] bg-[#F8FAFC] py-8 sm:py-12 site-container max-w-2xl mx-auto px-4 sm:px-6">
      
      {/* ── Outer Card ── */}
      <div className="bg-white border border-slate-200 rounded-[5px] p-6 sm:p-10 shadow-xs space-y-6">

        {/* ── Top Header Banner ── */}
        <div className="space-y-3 border-b border-slate-100 pb-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-[4px] bg-green-50 text-[#138601] flex items-center justify-center border border-green-200">
                <KeyRound className="w-4 h-4 stroke-[2.2]" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#138601] bg-green-50 px-2.5 py-0.5 rounded-[3px] border border-green-200">
                Official Electoral Accreditation
              </span>
            </div>

            <span className="text-xs font-semibold text-slate-400">
              Step {currentStep} of 4
            </span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display tracking-tight">
              {currentStep === 1 && 'Voter Identification'}
              {currentStep === 2 && 'Confirm Your Name'}
              {currentStep === 3 && 'Verification Code Delivery'}
              {currentStep === 4 && 'Enter Verification Code'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-1">
              {currentStep === 1 && 'Enter your registration or matriculation number to begin.'}
              {currentStep === 2 && 'Enter your first and last name as registered in the department.'}
              {currentStep === 3 && 'Enter your email address to receive your voting code.'}
              {currentStep === 4 && `Enter the 6-digit verification code sent to ${maskedEmail || wizardData.maskedEmail || 'your email'}.`}
            </p>
          </div>

          {/* Stepper Progress Bar */}
          <div className="pt-2">
            <div className="grid grid-cols-4 gap-2">
              {stepsList.map((s) => {
                const isCompleted = s.num < currentStep;
                const isCurrent = s.num === currentStep;
                return (
                  <div key={s.num} className="space-y-1.5">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isCompleted 
                          ? 'bg-[#138601]' 
                          : isCurrent 
                          ? 'bg-[#138601] ring-2 ring-green-200' 
                          : 'bg-slate-200'
                      }`}
                    />
                    <span className={`block text-[10px] sm:text-[11px] font-bold truncate ${
                      isCurrent ? 'text-[#138601]' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                    }`}>
                      {s.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Global Alerts ── */}
        {error && (
          <div className="p-3.5 rounded-[5px] bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-snug font-medium">{error}</span>
          </div>
        )}

        {successNotice && !error && (
          <div className="p-3.5 rounded-[5px] bg-green-50 border border-green-200 text-[#138601] text-xs flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-snug font-medium">{successNotice}</span>
          </div>
        )}

        {/* ── STEP 1 PAGE: REGISTRATION NUMBER ── */}
        {currentStep === 1 && (
          <form onSubmit={handleProceedToNames} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Registration / Matric Number *
              </label>
              <input
                type="text"
                placeholder="e.g. 20201012948"
                value={registrationNumber}
                onChange={(e) => {
                  setRegistrationNumber(e.target.value);
                  saveWizardData({ registrationNumber: e.target.value.trim().toUpperCase() });
                }}
                className="w-full px-4 py-3 rounded-[5px] bg-slate-50 border border-slate-300 text-slate-900 text-base font-mono placeholder:text-slate-400 focus:outline-none focus:border-[#138601] focus:bg-white transition-colors"
                required
                autoFocus
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 rounded-[5px] text-xs sm:text-sm font-bold text-white bg-[#138601] hover:bg-[#0f6c01] transition-all active:scale-[0.99] shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </form>
        )}

        {/* ── STEP 2 PAGE: FIRST NAME & LAST NAME ── */}
        {currentStep === 2 && (
          <form onSubmit={handleVerifyIdentity} className="space-y-5">
            <div className="p-3.5 rounded-[5px] bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Matric Number (Confirmed)</span>
                <span className="font-mono font-bold text-slate-800 text-sm">
                  {wizardData.registrationNumber || registrationNumber.trim().toUpperCase()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/accreditation/step-1')}
                className="text-xs text-[#138601] hover:underline font-bold cursor-pointer"
              >
                Change
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Emmanuel"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-3 rounded-[5px] bg-slate-50 border border-slate-300 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-[#138601] focus:bg-white transition-colors"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Last Name / Surname *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Irechukwu"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-3 rounded-[5px] bg-slate-50 border border-slate-300 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-[#138601] focus:bg-white transition-colors"
                  required
                />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/accreditation/step-1')}
                className="px-4 py-3 rounded-[5px] text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-3 rounded-[5px] text-xs sm:text-sm font-bold text-white bg-[#138601] hover:bg-[#0f6c01] transition-all active:scale-[0.99] shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Verifying...</span>
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ── STEP 3 PAGE: EMAIL INPUT FOR CODE ── */}
        {currentStep === 3 && (
          <form onSubmit={handleSendCode} className="space-y-5">
            {(accreditedVoter || wizardData.accreditedVoter) && (
              <div className="p-4 rounded-[5px] bg-green-50 border border-green-200 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-[#138601] text-sm">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{(accreditedVoter || wizardData.accreditedVoter)?.name}</span>
                </div>
                <div className="text-xs text-slate-600 font-mono">
                  {(accreditedVoter || wizardData.accreditedVoter)?.registrationNumber} • {(accreditedVoter || wizardData.accreditedVoter)?.level}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Email Address *
              </label>
              <input
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-[5px] bg-slate-50 border border-slate-300 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-[#138601] focus:bg-white transition-colors"
                required
                autoFocus
              />
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/accreditation/step-2')}
                className="px-4 py-3 rounded-[5px] text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                disabled={isLoading || cooldownSeconds > 0}
                className="flex-1 py-3 rounded-[5px] text-xs sm:text-sm font-bold text-white bg-[#138601] hover:bg-[#0f6c01] transition-all active:scale-[0.99] shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Sending Code...</span>
                ) : (
                  <>
                    <span>Send Code</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ── STEP 4 PAGE: ENTER 6-DIGIT VERIFICATION CODE ── */}
        {currentStep === 4 && (
          <form onSubmit={handleVerifyCode} className="space-y-5">
            <div className="p-3.5 rounded-[5px] bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Delivery Destination</span>
                <span className="font-mono font-bold text-slate-800 text-sm">
                  {maskedEmail || wizardData.maskedEmail || wizardData.email || 'Your Email'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/accreditation/step-3')}
                className="text-xs text-[#138601] hover:underline font-bold cursor-pointer"
              >
                Change Email
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Verification Code *
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-3.5 rounded-[5px] bg-slate-50 border border-slate-300 text-slate-900 text-2xl sm:text-3xl font-mono text-center tracking-[10px] font-bold placeholder:text-slate-300 focus:outline-none focus:border-[#138601] focus:bg-white transition-colors"
                required
                autoFocus
              />
              <div className="text-xs text-slate-500 mt-2">
                <span>Code expires in 15 minutes</span>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/accreditation/step-3')}
                className="px-4 py-3 rounded-[5px] text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                disabled={isLoading || code.length < 6}
                className="flex-1 py-3 rounded-[5px] text-xs sm:text-sm font-bold text-white bg-[#138601] hover:bg-[#0f6c01] transition-all active:scale-[0.99] shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Verifying Code...</span>
                ) : (
                  <>
                    <span>Verify & Proceed to Ballot</span>
                    <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
                  </>
                )}
              </button>
            </div>

            {/* Resend Action */}
            <div className="pt-4 text-center border-t border-slate-100">
              {cooldownSeconds > 0 ? (
                <span className="text-xs text-slate-400">
                  Resend code available in <strong className="text-slate-600 font-mono">{cooldownSeconds}s</strong>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={isLoading}
                  className="text-xs font-semibold text-[#138601] hover:underline cursor-pointer"
                >
                  Didn't receive the email? Request another code
                </button>
              )}
            </div>
          </form>
        )}

      </div>

    </div>
  );
}
