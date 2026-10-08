import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  X, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  ArrowRight, 
  Mail, 
  KeyRound, 
  RotateCcw,
  Sparkles,
  ChevronLeft
} from 'lucide-react';
import { 
  getActiveElection, 
  apiAccreditVoter, 
  apiSendElectoralCode, 
  apiVerifyElectoralCode 
} from '@nacos/supabase/electraService';

export default function ConnectNacosModal({ isOpen, onClose, onConnect }) {
  const activeElection = getActiveElection();

  // Wizard Step: 1 (Reg Number) -> 2 (First & Last Name) -> 3 (Email) -> 4 (Verification Code)
  const [step, setStep] = useState(1);
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

  // Session state from server
  const [accreditationToken, setAccreditationToken] = useState(null);
  const [accreditedVoter, setAccreditedVoter] = useState(null);
  const [maskedEmail, setMaskedEmail] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setError('');
      setSuccessNotice('');
    }
  }, [isOpen]);

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

  if (!isOpen) return null;

  // ── STEP 1 & 2: ACCREDIT IDENTITY ──
  const handleProceedToNames = (e) => {
    e.preventDefault();
    setError('');
    const cleanReg = registrationNumber.trim().toUpperCase();
    if (!cleanReg) {
      setError('Please enter your official Registration / Matric Number.');
      return;
    }
    setStep(2);
  };

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
      const res = await apiAccreditVoter({
        electionId: activeElection.id,
        registrationNumber: registrationNumber.trim().toUpperCase(),
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

      // If voter was already verified, directly establish session
      if (res.alreadyVerified && res.votingSessionToken) {
        onConnect(res.voter, res.votingSessionToken);
        onClose();
        return;
      }

      setAccreditationToken(res.accreditationToken);
      setAccreditedVoter(res.voter);
      setSuccessNotice('Identity confirmed! Please supply your email address to receive your verification code.');
      setStep(3);
    } catch (err) {
      setIsLoading(false);
      setError('A communication error occurred while verifying your record. Please try again.');
    }
  };

  // ── STEP 3: DISPATCH SINGLE-USE VERIFICATION CODE ──
  const handleSendCode = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessNotice('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await apiSendElectoralCode({
        accreditationToken,
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

      setMaskedEmail(res.destinationMasked || cleanEmail);
      setCooldownSeconds(res.cooldownSeconds || 60);
      setSuccessNotice('Single-use code dispatched! Check your email inbox or spam folder.');
      setStep(4);
    } catch (err) {
      setIsLoading(false);
      setError('Failed to dispatch verification code due to a network error.');
    }
  };

  // ── STEP 4: VERIFY CODE & UNLOCK BALLOT ──
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');

    const cleanCode = code.trim();
    if (!cleanCode || cleanCode.length < 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await apiVerifyElectoralCode({
        accreditationToken,
        code: cleanCode
      });

      setIsLoading(false);

      if (!res.success) {
        setError(res.error || 'Invalid or expired verification code.');
        return;
      }

      // Authentication complete! Issue authenticated voter session
      onConnect(res.voter, res.votingSessionToken);
      onClose();
    } catch (err) {
      setIsLoading(false);
      setError('Verification failed due to a network communication error.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-[5px] p-6 sm:p-8 shadow-2xl overflow-hidden">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-[5px] bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Strip with Step Progress */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-[5px] bg-green-50 text-[#138601] flex items-center justify-center border border-green-200">
              <KeyRound className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#138601] bg-green-50 px-2 py-0.5 rounded-[3px] border border-green-200">
                Official Electoral Accreditation
              </span>
            </div>
          </div>

          <h2 className="text-xl font-bold text-slate-900 font-display tracking-tight">
            {step === 1 && 'Voter Identification'}
            {step === 2 && 'Student Identity Verification'}
            {step === 3 && 'Verification Code Delivery'}
            {step === 4 && 'Enter Verification Code'}
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed mt-1">
            {step === 1 && 'Enter your institutional matriculation number to start your ballot session.'}
            {step === 2 && 'Confirm your official legal names to verify against the departmental student database.'}
            {step === 3 && 'Provide your email address to receive your secure, single-use voting credential.'}
            {step === 4 && `Enter the 6-digit verification code delivered to ${maskedEmail || 'your email'}.`}
          </p>

          {/* Stepper Dots */}
          <div className="flex items-center gap-1.5 mt-4">
            {[1, 2, 3, 4].map(num => (
              <div 
                key={num} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  num === step ? 'w-8 bg-[#138601]' : num < step ? 'w-4 bg-green-400' : 'w-4 bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Global Alerts */}
        {error && (
          <div className="mb-4 p-3 rounded-[5px] bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {successNotice && !error && (
          <div className="mb-4 p-3 rounded-[5px] bg-green-50 border border-green-200 text-[#138601] text-xs flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-snug">{successNotice}</span>
          </div>
        )}

        {/* ── STEP 1: REGISTRATION NUMBER ── */}
        {step === 1 && (
          <form onSubmit={handleProceedToNames} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Registration / Matric Number *
              </label>
              <input
                type="text"
                placeholder="e.g. 20201012948"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-[5px] bg-slate-50 border border-slate-300 text-slate-900 text-sm font-mono placeholder:text-slate-400 focus:outline-none focus:border-[#138601] transition-colors"
                required
                autoFocus
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                No portal password required. All verified CS undergraduates are eligible electors.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 rounded-[5px] text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] transition-all active:scale-[0.99] shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue to Identity Verification</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </form>
        )}

        {/* ── STEP 2: FIRST NAME & LAST NAME ── */}
        {step === 2 && (
          <form onSubmit={handleVerifyIdentity} className="space-y-4">
            <div className="p-2.5 rounded-[5px] bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Matric Number</span>
                <span className="font-mono font-bold text-slate-800">{registrationNumber.trim().toUpperCase()}</span>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-[11px] text-[#138601] hover:underline font-semibold"
              >
                Change
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  First Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Emmanuel"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[5px] bg-slate-50 border border-slate-300 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#138601] transition-colors"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Last Name / Surname *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Irechukwu"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[5px] bg-slate-50 border border-slate-300 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#138601] transition-colors"
                  required
                />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-3 py-2.5 rounded-[5px] text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-2.5 rounded-[5px] text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] transition-all active:scale-[0.99] shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Verifying Institutional Record...</span>
                ) : (
                  <>
                    <span>Verify Institutional Record</span>
                    <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ── STEP 3: EMAIL INPUT FOR ONE-TIME CODE ── */}
        {step === 3 && (
          <form onSubmit={handleSendCode} className="space-y-4">
            {accreditedVoter && (
              <div className="p-3 rounded-[5px] bg-green-50 border border-green-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[#138601]">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{accreditedVoter.name}</span>
                </div>
                <div className="text-[11px] text-slate-600 font-mono">
                  {accreditedVoter.registrationNumber} • {accreditedVoter.level}
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Destination Email for Verification Code *
              </label>
              <input
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-[5px] bg-slate-50 border border-slate-300 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#138601] transition-colors"
                required
                autoFocus
              />
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                Used solely to transmit your single-use voting passcode. Does not overwrite your permanent student profile.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || cooldownSeconds > 0}
                className="w-full py-2.5 rounded-[5px] text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] transition-all active:scale-[0.99] shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Dispatching Single-Use Code...</span>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <Mail className="w-4 h-4 stroke-[2.2]" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ── STEP 4: ENTER 6-DIGIT VERIFICATION CODE ── */}
        {step === 4 && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                6-Digit Electoral Code *
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3.5 py-3 rounded-[5px] bg-slate-50 border border-slate-300 text-slate-900 text-2xl font-mono text-center tracking-[8px] font-bold placeholder:text-slate-300 focus:outline-none focus:border-[#138601] transition-colors"
                required
                autoFocus
              />
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                <span>Code expires in 15 minutes</span>
                <span>Single-use credential</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || code.length < 6}
                className="w-full py-2.5 rounded-[5px] text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] transition-all active:scale-[0.99] shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Verifying Code & Unlocking Ballot...</span>
                ) : (
                  <>
                    <span>Verify Code & Unlock Ballot</span>
                    <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
                  </>
                )}
              </button>
            </div>

            {/* Resend Action */}
            <div className="pt-2 text-center border-t border-slate-100">
              {cooldownSeconds > 0 ? (
                <span className="text-[11px] text-slate-400">
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
