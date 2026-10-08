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
      <div className="mb-10 space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-[#F5F3FF] text-[#684BFD] border border-[#DDD6FE]">
          <Scale className="w-3.5 h-3.5 text-[#684BFD]" />
          <span>Electoral Commission Regulatory Code</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 font-display">
          ELECTRA Voting Guidelines & Ethics
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
          The constitution and certified rules established by the NACOS FUTO Electoral Commission (DEC 2026).
        </p>
      </div>

      {/* Rules List */}
      <div className="space-y-4 mb-12">
        {rules.map((rule, idx) => (
          <div
            key={idx}
            className="p-6 rounded-3xl bg-white border border-[#DDD6FE] space-y-2 hover:border-[#684BFD] transition-colors shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-xl bg-[#684BFD] text-white font-black text-xs flex items-center justify-center shrink-0">
                0{idx + 1}
              </span>
              <h3 className="text-base font-bold text-slate-900">
                {rule.title}
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-10">
              {rule.detail}
            </p>
          </div>
        ))}
      </div>

      {/* Commission Disclaimer Box */}
      <div className="p-7 rounded-3xl bg-amber-50 border border-amber-200 flex items-start gap-4">
        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
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
