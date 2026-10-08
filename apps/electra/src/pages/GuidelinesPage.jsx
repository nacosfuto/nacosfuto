import React from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Scale, 
  FileText,
  UserCheck
} from 'lucide-react';

export default function GuidelinesPage() {
  const rules = [
    {
      title: 'Institutional Eligibility Criteria',
      detail: 'Only duly matriculated students of the Department of Computer Science (NACOS FUTO) across 100L through 500L with valid credentials are authenticated to cast ballots.'
    },
    {
      title: 'One Voter, One Cryptographic Ballot',
      detail: 'Every voter receives exactly one immutable digital voting token tied to their matriculation record. Once a ballot is sealed, no re-voting, proxy voting, or alteration is possible.'
    },
    {
      title: 'Real-Time SHA-256 Cryptographic Audit',
      detail: 'Every vote cast computes an audit hash recorded in the decentralized state engine, ensuring zero ballot stuffing and complete post-election auditability.'
    },
    {
      title: 'Strict Voting Window',
      detail: 'Voting officially begins at 08:00 AM West Africa Time and ceases strictly at 06:00 PM West Africa Time on Election Day. Any ballot submitted after the cutoff is discarded.'
    },
    {
      title: 'Electoral Conduct & Sanctions',
      detail: 'Vote-buying, intimidation, identity spoofing, or attempts to tamper with the ELECTRA voting infrastructure will lead to immediate disqualification of associated aspirants and disciplinary referral.'
    }
  ];

  return (
    <div className="py-10 site-container max-w-5xl bg-[#F8FAFC]">
      
      {/* Header */}
      <div className="mb-8 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[4px] text-xs font-bold bg-green-50 text-[#138601] border border-green-200">
          <Scale className="w-3.5 h-3.5 text-[#138601]" />
          <span>Electoral Commission Regulatory Code</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 font-display">
          ELECTRA Voting Guidelines & Ethics
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
          The constitution and certified rules established by NACOS ISEC.
        </p>
      </div>

      {/* Rules List */}
      <div className="space-y-4 mb-10">
        {rules.map((rule, idx) => (
          <div
            key={idx}
            className="p-5 rounded-[5px] bg-white border border-slate-200 space-y-2 hover:border-[#138601] transition-colors shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-[4px] bg-[#138601] text-white font-bold text-xs flex items-center justify-center shrink-0">
                0{idx + 1}
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                {rule.title}
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-9">
              {rule.detail}
            </p>
          </div>
        ))}
      </div>

      {/* Commission Disclaimer Box */}
      <div className="p-5 rounded-[5px] bg-amber-50 border border-amber-200 flex items-start gap-4">
        <div className="w-9 h-9 rounded-[4px] bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-slate-900">
            Official Commission Certification
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            The results tallied on ELECTRA are legally binding under Article VII of the NACOS FUTO constitution. Any electoral petitions must be lodged with the Electoral Commission within 24 hours of result declaration.
          </p>
        </div>
      </div>

    </div>
  );
}
