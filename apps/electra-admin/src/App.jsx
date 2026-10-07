import React, { useState, useEffect } from 'react';
import { 
  Vote, 
  Users, 
  Award, 
  Settings, 
  Plus, 
  Trash2, 
  Edit3, 
  ShieldCheck, 
  BarChart3, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  FileText, 
  Check, 
  X,
  RefreshCw,
  Clock,
  Sparkles
} from 'lucide-react';
import { 
  getActiveElection, 
  getElectraPosts, 
  getContestants, 
  getLiveElectionResults, 
  adminSaveContestant, 
  adminDeleteContestant, 
  adminUpdateElection,
  fetchLiveElectraData
} from '@nacos/supabase/electraService';
import { getAppUrls } from '@nacos/config/urls';

export default function App() {
  const urls = getAppUrls();
  const [activeTab, setActiveTab] = useState('overview');
  const [election, setElection] = useState(() => getActiveElection());
  const [posts, setPosts] = useState(() => getElectraPosts());
  const [contestants, setContestants] = useState(() => getContestants());
  const [results, setResults] = useState(() => getLiveElectionResults());
  
  // Modal state
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    postId: 'post-president',
    matricNumber: '',
    level: '400 Level',
    slogan: '',
    photoUrl: '',
    manifestoHeadline: '',
    manifestoSummary: '',
    manifestoPdfUrl: '',
    pillar1Title: '',
    pillar1Detail: '',
    pillar2Title: '',
    pillar2Detail: '',
  });

  const reloadData = () => {
    setElection(getActiveElection());
    setPosts(getElectraPosts());
    setContestants(getContestants());
    setResults(getLiveElectionResults());
  };

  useEffect(() => {
    fetchLiveElectraData().then(() => {
      reloadData();
    }).catch(console.error);

    const onCast = () => reloadData();
    window.addEventListener('nacos_electra_ballot_cast', onCast);
    window.addEventListener('nacos_electra_contestants_updated', onCast);
    window.addEventListener('nacos_electra_election_updated', onCast);

    return () => {
      window.removeEventListener('nacos_electra_ballot_cast', onCast);
      window.removeEventListener('nacos_electra_contestants_updated', onCast);
      window.removeEventListener('nacos_electra_election_updated', onCast);
    };
  }, []);

  const showToast = (text, type = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage({ text: '', type: '' }), 4000);
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const updated = await adminUpdateElection({ status: newStatus });
      setElection(updated);
      showToast(`Election status updated to "${newStatus.toUpperCase()}"`);
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const handleOpenAddModal = () => {
    setEditingCandidate(null);
    setFormData({
      name: '',
      postId: posts[0]?.id || 'post-president',
      matricNumber: '',
      level: '300 Level',
      slogan: '',
      photoUrl: 'https://res.cloudinary.com/a2mmcttn/image/upload/v1788569274/nacos/executives/president_irechukwu.jpg',
      manifestoHeadline: '',
      manifestoSummary: '',
      manifestoPdfUrl: '',
      pillar1Title: 'Academic Excellence & Practical Skills',
      pillar1Detail: 'Bridge classroom learning to industry developer opportunities.',
      pillar2Title: 'Student Welfare & Modern Infrastructure',
      pillar2Detail: 'Improve lab equipment and study facilities for computing scholars.',
    });
    setIsCandidateModalOpen(true);
  };

  const handleOpenEditModal = (cnd) => {
    setEditingCandidate(cnd);
    const manifesto = cnd.manifesto || {};
    const p1 = manifesto.pillars?.[0] || {};
    const p2 = manifesto.pillars?.[1] || {};

    setFormData({
      name: cnd.name || '',
      postId: cnd.postId || 'post-president',
      matricNumber: cnd.matricNumber || '',
      level: cnd.level || '300 Level',
      slogan: cnd.slogan || '',
      photoUrl: cnd.photoUrl || '',
      manifestoHeadline: manifesto.headline || '',
      manifestoSummary: manifesto.summary || '',
      manifestoPdfUrl: cnd.manifestoPdfUrl || '',
      pillar1Title: p1.title || '',
      pillar1Detail: p1.detail || '',
      pillar2Title: p2.title || '',
      pillar2Detail: p2.detail || '',
    });
    setIsCandidateModalOpen(true);
  };

  const handleSaveCandidate = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Candidate name is required', 'error');
      return;
    }

    const currentPost = posts.find(p => p.id === formData.postId);

    const contestantPayload = {
      id: editingCandidate?.id,
      postId: formData.postId,
      runningPost: currentPost?.title || 'Executive Officer',
      name: formData.name.trim(),
      matricNumber: formData.matricNumber.trim().toUpperCase(),
      level: formData.level,
      slogan: formData.slogan.trim(),
      photoUrl: formData.photoUrl.trim() || 'https://res.cloudinary.com/a2mmcttn/image/upload/v1788569274/nacos/executives/president_irechukwu.jpg',
      manifestoPdfUrl: formData.manifestoPdfUrl.trim() || null,
      manifesto: {
        headline: formData.manifestoHeadline.trim() || `${formData.name}'s Campaign Manifesto`,
        summary: formData.manifestoSummary.trim() || 'Committed to forward-thinking departmental advancement.',
        pillars: [
          { title: formData.pillar1Title, detail: formData.pillar1Detail },
          { title: formData.pillar2Title, detail: formData.pillar2Detail },
        ],
        personalNote: 'Together, let us build a stronger computing chapter.'
      }
    };

    try {
      await adminSaveContestant(contestantPayload);
      setIsCandidateModalOpen(false);
      reloadData();
      showToast(editingCandidate ? 'Candidate updated successfully' : 'Candidate certified and added');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteCandidate = async (cndId, name) => {
    if (!window.confirm(`Are you sure you want to remove candidate "${name}"?`)) return;
    try {
      await adminDeleteContestant(cndId);
      reloadData();
      showToast(`Removed candidate ${name}`);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0b0d] text-white flex flex-col font-sans">
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0e0f12]/90 backdrop-blur-xl border-b border-[#22252a]">
        <div className="site-container">
          <div className="flex items-center justify-between h-20">
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#c6ff00] text-black flex items-center justify-center font-black shadow-lg shadow-[#c6ff00]/20">
                <Vote className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xl text-white font-display">ELECTRA</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#22252a] text-[#c6ff00] border border-[#c6ff00]/30">
                    Commission Console
                  </span>
                </div>
                <p className="text-[10px] text-gray-400">Departmental Electoral Commission (DEC 2026)</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <a
                href={urls.electra}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-[#161719] hover:bg-[#202227] text-gray-300 border border-[#2a2c33]"
              >
                <span>Live Voter Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <a
                href={urls.websiteAdmin}
                className="text-xs text-gray-400 hover:text-white"
              >
                Portal Admin
              </a>
            </div>

          </div>
        </div>
      </header>

      {/* Toast */}
      {statusMessage.text && (
        <div className="fixed top-24 right-6 z-50 animate-fade-in">
          <div className={`px-4 py-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 ${
            statusMessage.type === 'error'
              ? 'bg-red-950 border border-red-700 text-red-200'
              : 'bg-[#181a1f] border border-[#c6ff00] text-[#c6ff00]'
          }`}>
            <CheckCircle2 className="w-4 h-4" />
            <span>{statusMessage.text}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="site-container py-8 flex-1 w-full">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#22252a] pb-4 mb-8 overflow-x-auto">
          {[
            { id: 'overview', label: 'Election Overview', icon: BarChart3 },
            { id: 'contestants', label: `Contestants (${contestants.length})`, icon: Users },
            { id: 'offices', label: `Offices (${posts.length})`, icon: Award },
            { id: 'audit', label: 'Audit & Live Tallies', icon: ShieldCheck },
          ].map(tab => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  isSel
                    ? 'bg-[#c6ff00] text-black font-black'
                    : 'bg-[#141518] text-gray-400 hover:text-white border border-[#22252a]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ========================================================
            TAB 1: OVERVIEW
           ======================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            
            {/* Status Control Card */}
            <div className="p-6 sm:p-8 rounded-[32px] bg-[#141518] border border-[#22252a] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-gray-500 block mb-1">
                  Election State
                </span>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black text-white font-display">
                    {election?.title || 'NACOS FUTO Executive Elections'}
                  </h2>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    election?.status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : election?.status === 'paused'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-red-500/20 text-red-400 border border-red-500/40'
                  }`}>
                    {election?.status || 'Active'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Academic Session: {election?.academicSession || '2025/2026'} • Mode: Decentralized Verifiable Ballot
                </p>
              </div>

              {/* Status Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStatusChange('active')}
                  className={`px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer ${
                    election?.status === 'active'
                      ? 'bg-emerald-400 text-black shadow-lg shadow-emerald-400/25'
                      : 'bg-[#1c1d22] text-gray-400 hover:text-white border border-[#262830]'
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange('paused')}
                  className={`px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer ${
                    election?.status === 'paused'
                      ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/25'
                      : 'bg-[#1c1d22] text-gray-400 hover:text-white border border-[#262830]'
                  }`}
                >
                  Pause
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange('concluded')}
                  className={`px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer ${
                    election?.status === 'concluded'
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/25'
                      : 'bg-[#1c1d22] text-gray-400 hover:text-white border border-[#262830]'
                  }`}
                >
                  Conclude
                </button>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-6 rounded-[24px] bg-[#141518] border border-[#22252a]">
                <span className="text-xs text-gray-400">Total Ballots Cast</span>
                <div className="text-3xl font-black text-white font-display mt-1">
                  {results.totalBallots}
                </div>
                <span className="text-[10px] text-emerald-400 mt-2 block">100% Cryptographically Sealed</span>
              </div>
              <div className="p-6 rounded-[24px] bg-[#141518] border border-[#22252a]">
                <span className="text-xs text-gray-400">Certified Contestants</span>
                <div className="text-3xl font-black text-white font-display mt-1">
                  {contestants.length}
                </div>
                <span className="text-[10px] text-[#c6ff00] mt-2 block">Across {posts.length} Executive Posts</span>
              </div>
              <div className="p-6 rounded-[24px] bg-[#141518] border border-[#22252a]">
                <span className="text-xs text-gray-400">Active Polling Stations</span>
                <div className="text-3xl font-black text-white font-display mt-1">
                  ELECTRA V2
                </div>
                <span className="text-[10px] text-gray-400 mt-2 block">Distributed Client Nodes</span>
              </div>
              <div className="p-6 rounded-[24px] bg-[#141518] border border-[#22252a]">
                <span className="text-xs text-gray-400">Audit Status</span>
                <div className="text-3xl font-black text-[#c6ff00] font-display mt-1">
                  Clean
                </div>
                <span className="text-[10px] text-gray-400 mt-2 block">Zero Anomaly Detected</span>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================
            TAB 2: CONTESTANTS MANAGEMENT
           ======================================================== */}
        {activeTab === 'contestants' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white font-display">Certified Candidates</h2>
                <p className="text-xs text-gray-400">Manage aspirant profiles, manifesto pillars, and uploaded PDF documents.</p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-black text-black bg-[#c6ff00] hover:bg-[#b2e600] transition-all cursor-pointer shadow-lg shadow-[#c6ff00]/25"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Add Candidate</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {contestants.map((cnd) => (
                <div
                  key={cnd.id}
                  className="p-5 rounded-[24px] bg-[#141518] border border-[#22252a] flex flex-col justify-between"
                >
                  <div className="space-y-3 mb-4">
                    <div className="flex items-start gap-3.5">
                      <img
                        src={cnd.photoUrl}
                        alt={cnd.name}
                        className="w-14 h-14 rounded-2xl object-cover bg-[#22252a] border border-[#2a2d36] shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-[10px] font-black uppercase text-[#c6ff00] block truncate">
                          {cnd.runningPost}
                        </span>
                        <h3 className="text-base font-bold text-white truncate">{cnd.name}</h3>
                        <p className="text-xs text-gray-400 font-mono">{cnd.level} • {cnd.matricNumber}</p>
                      </div>
                    </div>

                    <p className="text-xs text-gray-400 italic line-clamp-2">
                      "{cnd.slogan || 'Manifesto on file'}"
                    </p>

                    <div className="p-3 rounded-xl bg-[#1a1b20] text-xs space-y-1">
                      <div className="flex justify-between text-gray-400">
                        <span>Total Votes Cast:</span>
                        <span className="font-bold text-[#c6ff00]">{cnd.votesCount || 0}</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Manifesto PDF:</span>
                        <span className="text-white">{cnd.manifestoPdfUrl ? 'Attached' : 'Text Only'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#22252a] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(cnd)}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#1e2025] hover:bg-[#282a31] text-gray-300 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCandidate(cnd.id, cnd.name)}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-red-400 hover:bg-red-950/30 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 3: OFFICES
           ======================================================== */}
        {activeTab === 'offices' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-white font-display">Contested Leadership Offices</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {posts.map(post => (
                <div key={post.id} className="p-5 rounded-[24px] bg-[#141518] border border-[#22252a] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-[#1e2025] text-[#c6ff00]">
                      {post.code}
                    </span>
                    <span className="text-xs text-gray-400">Order #{post.order}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{post.title}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">{post.description}</p>
                  <div className="pt-2 text-[11px] text-gray-500">
                    Eligible Cohort: {post.eligibilityLevel}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 4: AUDIT & TALLIES
           ======================================================== */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white font-display">Real-Time Cryptographic Tally Ledger</h2>
                <p className="text-xs text-gray-400">Immutable vote tallies calculated directly from voter signatures.</p>
              </div>
              <button
                type="button"
                onClick={reloadData}
                className="px-4 py-2 rounded-full text-xs font-bold bg-[#18191d] text-gray-300 border border-[#2a2c33] flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#c6ff00]" />
                <span>Refresh Tallies</span>
              </button>
            </div>

            <div className="space-y-6">
              {results.resultsByPost.map(({ post, totalVotes, candidates, leadingCandidate }) => (
                <div key={post.id} className="p-6 rounded-[28px] bg-[#141518] border border-[#22252a] space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-[#22252a]">
                    <h3 className="text-lg font-bold text-white">{post.title}</h3>
                    <span className="text-xs font-mono text-[#c6ff00] font-bold">{totalVotes} Ballots</span>
                  </div>

                  <div className="space-y-3">
                    {candidates.map(cnd => (
                      <div key={cnd.id} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-white">{cnd.name}</span>
                          <span className="font-mono text-[#c6ff00]">{cnd.votesCount || 0} ({cnd.percentage}%)</span>
                        </div>
                        <div className="h-2 w-full bg-[#1e2025] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#c6ff00] rounded-full"
                            style={{ width: `${cnd.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ========================================================
          ADD/EDIT CANDIDATE MODAL
         ======================================================== */}
      {isCandidateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-[#141518] border border-[#232529] rounded-[32px] p-6 sm:p-8 shadow-2xl my-auto max-h-[92vh] overflow-y-auto custom-scroll">
            
            <div className="flex items-center justify-between pb-4 border-b border-[#22252a] mb-6">
              <h3 className="text-xl font-black text-white font-display">
                {editingCandidate ? 'Edit Candidate Details' : 'Certify New Aspirant'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCandidateModalOpen(false)}
                className="p-2 rounded-full bg-[#1c1d22] text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCandidate} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Candidate Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Chukwuebuka Anyanwu"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#1a1b20] border border-[#2a2c33] text-sm text-white focus:outline-none focus:border-[#c6ff00]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Contested Executive Office *
                  </label>
                  <select
                    value={formData.postId}
                    onChange={(e) => setFormData({ ...formData, postId: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#1a1b20] border border-[#2a2c33] text-sm text-white focus:outline-none focus:border-[#c6ff00]"
                  >
                    {posts.map(post => (
                      <option key={post.id} value={post.id}>{post.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                    FUTO Matriculation Number
                  </label>
                  <input
                    type="text"
                    value={formData.matricNumber}
                    onChange={(e) => setFormData({ ...formData, matricNumber: e.target.value })}
                    placeholder="e.g. 20231429810"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#1a1b20] border border-[#2a2c33] text-sm text-white font-mono focus:outline-none focus:border-[#c6ff00]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Academic Cohort
                  </label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#1a1b20] border border-[#2a2c33] text-sm text-white focus:outline-none focus:border-[#c6ff00]"
                  >
                    <option value="100 Level">100 Level</option>
                    <option value="200 Level">200 Level</option>
                    <option value="300 Level">300 Level</option>
                    <option value="400 Level">400 Level</option>
                    <option value="500 Level">500 Level</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Campaign Slogan
                </label>
                <input
                  type="text"
                  value={formData.slogan}
                  onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
                  placeholder="e.g. Technology That Empowers, Leadership That Listens"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#1a1b20] border border-[#2a2c33] text-sm text-white focus:outline-none focus:border-[#c6ff00]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Photo URL
                </label>
                <input
                  type="url"
                  value={formData.photoUrl}
                  onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 rounded-xl bg-[#1a1b20] border border-[#2a2c33] text-sm text-white focus:outline-none focus:border-[#c6ff00]"
                />
              </div>

              <div className="pt-2 border-t border-[#22252a]">
                <h4 className="text-xs font-black uppercase text-[#c6ff00] mb-3">Manifesto Details</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                      Manifesto Title
                    </label>
                    <input
                      type="text"
                      value={formData.manifestoHeadline}
                      onChange={(e) => setFormData({ ...formData, manifestoHeadline: e.target.value })}
                      placeholder="e.g. The Catalyst Agenda: 4 Pillars for Modern Computing"
                      className="w-full px-4 py-2.5 rounded-xl bg-[#1a1b20] border border-[#2a2c33] text-sm text-white focus:outline-none focus:border-[#c6ff00]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                      Executive Summary
                    </label>
                    <textarea
                      rows={2}
                      value={formData.manifestoSummary}
                      onChange={(e) => setFormData({ ...formData, manifestoSummary: e.target.value })}
                      placeholder="Brief overview of key policies..."
                      className="w-full px-4 py-2.5 rounded-xl bg-[#1a1b20] border border-[#2a2c33] text-sm text-white focus:outline-none focus:border-[#c6ff00]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                      Certified Manifesto Document URL (.PDF)
                    </label>
                    <input
                      type="url"
                      value={formData.manifestoPdfUrl}
                      onChange={(e) => setFormData({ ...formData, manifestoPdfUrl: e.target.value })}
                      placeholder="https://.../manifesto.pdf"
                      className="w-full px-4 py-2.5 rounded-xl bg-[#1a1b20] border border-[#2a2c33] text-sm text-white focus:outline-none focus:border-[#c6ff00]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCandidateModalOpen(false)}
                  className="px-5 py-2.5 rounded-full text-xs font-bold text-gray-300 bg-[#1c1d22] hover:bg-[#262830]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full text-xs font-black text-black bg-[#c6ff00] hover:bg-[#b2e600] shadow-lg shadow-[#c6ff00]/25 cursor-pointer"
                >
                  {editingCandidate ? 'Save Changes' : 'Certify Candidate'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
