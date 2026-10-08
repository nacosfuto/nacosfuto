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
  Sparkles,
  Calendar,
  ChevronDown,
  CheckCheck,
  Eye,
  Info
} from 'lucide-react';
import { 
  getAllElections,
  getActiveElection, 
  adminCreateElection,
  adminSetActiveElection,
  adminUpdateElection,
  adminDeleteElection,
  getElectraPosts, 
  getContestants, 
  getLiveElectionResults, 
  adminSaveContestant, 
  adminDeleteContestant, 
  fetchLiveElectraData 
} from '@nacos/supabase/electraService';
import { getAppUrls } from '@nacos/config/urls';
import nacosLogo from './assets/full-logo-light.png';

export default function App() {
  const urls = getAppUrls();
  const [activeTab, setActiveTab] = useState('elections');
  
  // Elections State
  const [allElections, setAllElections] = useState(() => getAllElections());
  const [activeElection, setActiveElection] = useState(() => getActiveElection());
  // The election currently being viewed/managed in the admin console (defaults to active election)
  const [selectedElectionId, setSelectedElectionId] = useState(() => getActiveElection()?.id || 'election-2026-general');
  
  // Scoped Data State for the currently selected election
  const currentElection = allElections.find(e => e.id === selectedElectionId) || activeElection;
  const isViewingActive = currentElection?.id === activeElection?.id;

  const [posts, setPosts] = useState(() => getElectraPosts());
  const [contestants, setContestants] = useState(() => getContestants(null, selectedElectionId));
  const [results, setResults] = useState(() => getLiveElectionResults(selectedElectionId));
  
  // Modal states
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);
  
  const [isElectionModalOpen, setIsElectionModalOpen] = useState(false);
  const [editingElection, setEditingElection] = useState(null);
  
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });

  // Candidate Form state
  const [candidateForm, setCandidateForm] = useState({
    name: '',
    postId: 'post-president',
    matricNumber: '',
    level: '400 Level',
    slogan: '',
    photoUrl: '',
    statementPdfUrl: '',
    candidateStatement: '',
    manifestoHeadline: '',
    manifestoSummary: '',
    pillar1Title: '',
    pillar1Detail: '',
    pillar2Title: '',
    pillar2Detail: '',
  });

  // Election Form state
  const [electionForm, setElectionForm] = useState({
    title: '',
    session: '2027/2028',
    year: 2027,
    status: 'upcoming',
    startDate: '',
    endDate: '',
    description: '',
    makeActiveNow: false
  });

  const reloadData = () => {
    const freshAll = getAllElections();
    const freshActive = getActiveElection();
    setAllElections(freshAll);
    setActiveElection(freshActive);
    setPosts(getElectraPosts());
    setContestants(getContestants(null, selectedElectionId));
    setResults(getLiveElectionResults(selectedElectionId));
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
  }, [selectedElectionId]);

  // When selected election changes, reload contestants and results
  useEffect(() => {
    setContestants(getContestants(null, selectedElectionId));
    setResults(getLiveElectionResults(selectedElectionId));
  }, [selectedElectionId]);

  const showToast = (text, type = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage({ text: '', type: '' }), 4000);
  };

  // Status handler for current election
  const handleStatusChange = async (newStatus) => {
    try {
      await adminUpdateElection(currentElection.id, { status: newStatus });
      reloadData();
      showToast(`Election status set to "${newStatus.toUpperCase()}"`);
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  // Promote election to active (front-end users strictly interact with active)
  const handlePromoteToActive = async (elId) => {
    try {
      const activated = await adminSetActiveElection(elId);
      setSelectedElectionId(activated.id);
      reloadData();
      showToast(`"${activated.title}" is now the ACTIVE election for all front-end voters!`);
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  // Delete election
  const handleDeleteElection = async (elId, title) => {
    if (elId === activeElection.id) {
      showToast('Cannot delete the currently active election. Set another election as active first.', 'error');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete the election archive "${title}"?`)) return;
    try {
      await adminDeleteElection(elId);
      if (selectedElectionId === elId) {
        setSelectedElectionId(activeElection.id);
      }
      reloadData();
      showToast(`Deleted election archive "${title}"`);
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  // Open Election Modal for Creation or Edit
  const handleOpenCreateElection = () => {
    setEditingElection(null);
    setElectionForm({
      title: 'NACOS FUTO 2027/2028 General Elections',
      session: '2027/2028',
      year: 2027,
      status: 'upcoming',
      startDate: '2027-10-15T08:00',
      endDate: '2027-10-15T18:00',
      description: 'Annual election for the executive officers of the Nigeria Association of Computing Students (NACOS), FUTO Chapter.',
      makeActiveNow: false
    });
    setIsElectionModalOpen(true);
  };

  const handleOpenEditElection = (el) => {
    setEditingElection(el);
    setElectionForm({
      title: el.title || '',
      session: el.session || '',
      year: el.year || 2026,
      status: el.status || 'upcoming',
      startDate: el.startDate ? el.startDate.slice(0, 16) : '',
      endDate: el.endDate ? el.endDate.slice(0, 16) : '',
      description: el.description || '',
      makeActiveNow: el.status === 'active'
    });
    setIsElectionModalOpen(true);
  };

  const handleSaveElection = async (e) => {
    e.preventDefault();
    if (!electionForm.title.trim()) {
      showToast('Election title is required', 'error');
      return;
    }

    try {
      if (editingElection) {
        await adminUpdateElection(editingElection.id, {
          title: electionForm.title.trim(),
          session: electionForm.session.trim(),
          year: parseInt(electionForm.year, 10) || 2026,
          status: electionForm.makeActiveNow ? 'active' : electionForm.status,
          startDate: electionForm.startDate ? new Date(electionForm.startDate).toISOString() : null,
          endDate: electionForm.endDate ? new Date(electionForm.endDate).toISOString() : null,
          description: electionForm.description.trim()
        });
        showToast('Election updated successfully');
      } else {
        const created = await adminCreateElection({
          title: electionForm.title.trim(),
          session: electionForm.session.trim(),
          year: parseInt(electionForm.year, 10) || 2027,
          status: electionForm.makeActiveNow ? 'active' : electionForm.status,
          startDate: electionForm.startDate ? new Date(electionForm.startDate).toISOString() : null,
          endDate: electionForm.endDate ? new Date(electionForm.endDate).toISOString() : null,
          description: electionForm.description.trim()
        });
        setSelectedElectionId(created.id);
        showToast(`Created year-by-year election: ${created.session}`);
      }
      setIsElectionModalOpen(false);
      reloadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Open Candidate Modal for Creation
  const handleOpenAddModal = () => {
    setEditingCandidate(null);
    setCandidateForm({
      name: '',
      postId: posts[0]?.id || 'post-president',
      matricNumber: '',
      level: '300 Level',
      slogan: '',
      photoUrl: 'https://res.cloudinary.com/a2mmcttn/image/upload/v1788569274/nacos/executives/president_irechukwu.jpg',
      statementPdfUrl: '',
      candidateStatement: '',
      manifestoHeadline: '',
      manifestoSummary: '',
      pillar1Title: 'Academic Excellence & Practical Skills',
      pillar1Detail: 'Bridge classroom learning to industry developer opportunities.',
      pillar2Title: 'Student Welfare & Modern Infrastructure',
      pillar2Detail: 'Improve lab equipment and study facilities for computing scholars.',
    });
    setIsCandidateModalOpen(true);
  };

  // Open Candidate Modal for Edit
  const handleOpenEditModal = (cnd) => {
    setEditingCandidate(cnd);
    const manifesto = cnd.manifesto || {};
    const p1 = manifesto.pillars?.[0] || {};
    const p2 = manifesto.pillars?.[1] || {};

    setCandidateForm({
      name: cnd.name || '',
      postId: cnd.postId || 'post-president',
      matricNumber: cnd.matricNumber || '',
      level: cnd.level || '300 Level',
      slogan: cnd.slogan || '',
      photoUrl: cnd.photoUrl || '',
      statementPdfUrl: cnd.statementPdfUrl || '',
      candidateStatement: cnd.candidateStatement || '',
      manifestoHeadline: manifesto.headline || '',
      manifestoSummary: manifesto.summary || '',
      pillar1Title: p1.title || '',
      pillar1Detail: p1.detail || '',
      pillar2Title: p2.title || '',
      pillar2Detail: p2.detail || '',
    });
    setIsCandidateModalOpen(true);
  };

  const handleSaveCandidate = async (e) => {
    e.preventDefault();
    if (!candidateForm.name.trim()) {
      showToast('Candidate name is required', 'error');
      return;
    }

    const currentPost = posts.find(p => p.id === candidateForm.postId);

    const contestantPayload = {
      id: editingCandidate?.id,
      electionId: currentElection?.id,
      postId: candidateForm.postId,
      runningPost: currentPost?.title || 'Executive Officer',
      name: candidateForm.name.trim(),
      matricNumber: candidateForm.matricNumber.trim().toUpperCase(),
      level: candidateForm.level,
      slogan: candidateForm.slogan.trim(),
      photoUrl: candidateForm.photoUrl.trim() || 'https://res.cloudinary.com/a2mmcttn/image/upload/v1788569274/nacos/executives/president_irechukwu.jpg',
      statementPdfUrl: candidateForm.statementPdfUrl.trim() || null,
      candidateStatement: candidateForm.candidateStatement.trim() || null,
      manifestoPdfUrl: candidateForm.statementPdfUrl.trim() || null,
      manifesto: {
        headline: candidateForm.manifestoHeadline.trim() || `${candidateForm.name}'s Campaign Manifesto`,
        summary: candidateForm.manifestoSummary.trim() || 'Committed to forward-thinking departmental advancement.',
        pillars: [
          { title: candidateForm.pillar1Title, detail: candidateForm.pillar1Detail },
          { title: candidateForm.pillar2Title, detail: candidateForm.pillar2Detail },
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      
      {/* ─── HEADER (Light Mode Standard & Official Logo) ─── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="site-container">
          <div className="flex items-center justify-between h-20">
            
            {/* Logo and Brand Title */}
            <div className="flex items-center gap-3.5">
              <img 
                src={nacosLogo} 
                alt="NACOS Logo" 
                className="h-10 w-auto object-contain"
              />
              <div className="h-6 w-px bg-slate-200 hidden sm:block" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xl text-slate-900 font-display tracking-tight">ELECTRA</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-50 text-[#138601] border border-green-200">
                    Admin Commission
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">Departmental Electoral Commission Console</p>
              </div>
            </div>

            {/* Quick External Links */}
            <div className="flex items-center gap-3">
              <a
                href={urls.electra}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold bg-[#138601]/10 hover:bg-[#138601]/15 text-[#138601] border border-[#138601]/20 transition-all"
              >
                <span>Live Voter Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <a
                href={urls.websiteAdmin}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 bg-white hover:bg-slate-50 transition-all shadow-sm"
              >
                Portal Admin
              </a>
            </div>

          </div>
        </div>
      </header>

      {/* ─── ACTIVE ELECTION NOTIFICATION & CONTEXT SELECTOR ─── */}
      <div className="bg-white border-b border-slate-200 py-3 shadow-xs">
        <div className="site-container flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Managing Election Session:
            </span>
            <div className="relative inline-block">
              <select
                value={selectedElectionId}
                onChange={(e) => setSelectedElectionId(e.target.value)}
                className="appearance-none pl-3 pr-8 py-1.5 rounded-lg text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#138601] cursor-pointer"
              >
                {allElections.map(el => (
                  <option key={el.id} value={el.id}>
                    {el.session} • {el.title} {el.status === 'active' ? '(ACTIVE - PUBLIC)' : `(${el.status.toUpperCase()})`}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>

            {isViewingActive ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active • Public Voter Facing
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="w-3 h-3" />
                Historical Archive • Admin View
              </span>
            )}
          </div>

          {!isViewingActive && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePromoteToActive(currentElection.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#138601] hover:bg-[#0f6c01] text-white shadow-xs cursor-pointer transition-all"
              >
                Set This Session as Active
              </button>
              <button
                type="button"
                onClick={() => setSelectedElectionId(activeElection.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
              >
                Back to Active ({activeElection.session})
              </button>
            </div>
          )}

        </div>
      </div>

      {/* ─── TOAST NOTIFICATION ─── */}
      {statusMessage.text && (
        <div className="fixed top-24 right-6 z-50 animate-fade-in">
          <div className={`px-4 py-3 rounded-xl text-xs font-bold shadow-xl flex items-center gap-2 ${
            statusMessage.type === 'error'
              ? 'bg-rose-50 border border-rose-300 text-rose-700'
              : 'bg-emerald-50 border border-emerald-300 text-emerald-800'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMessage.text}</span>
          </div>
        </div>
      )}

      {/* ─── MAIN CONTENT CONTAINER ─── */}
      <div className="site-container py-8 flex-1 w-full">
        
        {/* Navigation Tabs (Light Mode website style buttons) */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-4 mb-8 overflow-x-auto">
          {[
            { id: 'elections', label: `Yearly Elections (${allElections.length})`, icon: Calendar },
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
                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shadow-xs ${
                  isSel
                    ? 'bg-[#138601] text-white shadow-[#138601]/20'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ========================================================
            TAB 1: ELECTIONS (YEAR-BY-YEAR MANAGEMENT)
           ======================================================== */}
        {activeTab === 'elections' && (
          <div className="space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900 font-display">Year-by-Year Elections Management</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Create academic year elections, manage archives, and toggle the single active election that front-end voters engage with.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenCreateElection}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] transition-all cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Create New Year Election</span>
              </button>
            </div>

            {/* Elections Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allElections.map(el => {
                const isActive = el.status === 'active';
                const isSelected = el.id === selectedElectionId;

                return (
                  <div
                    key={el.id}
                    className={`rounded-2xl border bg-white p-6 shadow-sm transition-all flex flex-col justify-between ${
                      isActive 
                        ? 'border-[#138601] ring-2 ring-[#138601]/20' 
                        : isSelected
                        ? 'border-slate-400'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-3">
                      
                      {/* Session and Status Badge */}
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {el.session} Session
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isActive 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : el.status === 'concluded'
                            ? 'bg-slate-100 text-slate-600 border border-slate-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {isActive ? '● ACTIVE LIVE' : el.status.toUpperCase()}
                        </span>
                      </div>

                      {/* Election Title */}
                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {el.title}
                      </h3>

                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {el.description || 'Official NACOS FUTO executive leadership election.'}
                      </p>

                      {/* Election Summary Box */}
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs text-slate-600">
                        <div className="flex justify-between">
                          <span>Total Ballots:</span>
                          <span className="font-bold text-slate-900 font-mono">{el.totalBallots || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Turnout:</span>
                          <span className="font-bold text-[#138601]">{el.certifiedTurnout || 'In Progress'}</span>
                        </div>
                        {el.winnerSummary && (
                          <div className="pt-1 border-t border-slate-200 text-[11px] text-slate-500 italic">
                            {el.winnerSummary}
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Actions */}
                    <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedElectionId(el.id);
                            setActiveTab('overview');
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-[#138601] text-white'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{isSelected ? 'Viewing' : 'Inspect'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditElection(el)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                          title="Edit election parameters"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!isActive ? (
                          <button
                            type="button"
                            onClick={() => handlePromoteToActive(el.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-50 hover:bg-green-100 text-[#138601] border border-green-200 cursor-pointer transition-all"
                          >
                            Set Active
                          </button>
                        ) : (
                          <span className="text-[11px] font-bold text-emerald-600 px-2 py-1 bg-emerald-50 rounded-md">
                            Current Front-End
                          </span>
                        )}

                        {!isActive && (
                          <button
                            type="button"
                            onClick={() => handleDeleteElection(el.id, el.title)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-all"
                            title="Delete archive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* ========================================================
            TAB 2: OVERVIEW
           ======================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            
            {/* Status Control Card */}
            <div className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Election State & Session
                </span>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-2xl font-black text-slate-900 font-display">
                    {currentElection?.title || 'NACOS FUTO Executive Elections'}
                  </h2>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    currentElection?.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : currentElection?.status === 'paused'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {currentElection?.status || 'Active'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1.5">
                  Academic Session: <strong className="text-slate-800">{currentElection?.session || '2026/2027'}</strong> • Mode: Decentralized Cryptographically Sealed Ballot
                </p>
              </div>

              {/* Status Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStatusChange('active')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    currentElection?.status === 'active'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange('paused')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    currentElection?.status === 'paused'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Pause
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange('concluded')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    currentElection?.status === 'concluded'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Conclude
                </button>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold text-slate-500">Total Ballots Cast</span>
                <div className="text-3xl font-black text-slate-900 font-display mt-1">
                  {results.totalBallots}
                </div>
                <span className="text-[10px] font-bold text-emerald-600 mt-2 block">100% Cryptographically Sealed</span>
              </div>
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold text-slate-500">Certified Contestants</span>
                <div className="text-3xl font-black text-slate-900 font-display mt-1">
                  {contestants.length}
                </div>
                <span className="text-[10px] font-bold text-[#138601] mt-2 block">Across {posts.length} Executive Posts</span>
              </div>
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold text-slate-500">Electoral Platform</span>
                <div className="text-3xl font-black text-slate-900 font-display mt-1">
                  ELECTRA V2
                </div>
                <span className="text-[10px] font-semibold text-slate-400 mt-2 block">Certified Commission Engine</span>
              </div>
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold text-slate-500">Integrity Audit Status</span>
                <div className="text-3xl font-black text-emerald-600 font-display mt-1">
                  Verified
                </div>
                <span className="text-[10px] font-semibold text-slate-400 mt-2 block">Zero Discrepancies Recorded</span>
              </div>
            </div>

            {/* Leading Candidates Summary */}
            <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Leading Candidates By Office ({currentElection?.session})</h3>
                <span className="text-xs text-slate-500 font-semibold">{posts.length} Offices Tracked</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.resultsByPost.map(({ post, leadingCandidate, totalVotes }) => (
                  <div key={post.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-[10px] font-bold uppercase text-[#138601] tracking-wider block">
                      {post.title}
                    </span>
                    {leadingCandidate ? (
                      <div className="flex items-center gap-3">
                        <img 
                          src={leadingCandidate.photoUrl} 
                          alt={leadingCandidate.name} 
                          className="w-10 h-10 rounded-full object-cover border border-green-200" 
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{leadingCandidate.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            {leadingCandidate.votesCount} votes ({leadingCandidate.percentage}%)
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No candidates certified</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ========================================================
            TAB 3: CONTESTANTS MANAGEMENT
           ======================================================== */}
        {activeTab === 'contestants' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900 font-display">
                  Certified Candidates ({currentElection?.session})
                </h2>
                <p className="text-xs text-slate-500">
                  Manage aspirant profiles, official statements, and manifesto policy documents for this election.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] transition-all cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Certify Candidate</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {contestants.map((cnd) => (
                <div
                  key={cnd.id}
                  className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all"
                >
                  <div className="space-y-3 mb-4">
                    <div className="flex items-start gap-3.5">
                      {/* Circle avatar matching user instruction */}
                      <img
                        src={cnd.photoUrl}
                        alt={cnd.name}
                        className="w-14 h-14 rounded-full object-cover bg-slate-100 border-2 border-green-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase text-[#138601] block truncate">
                          {cnd.runningPost}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 truncate">{cnd.name}</h3>
                        <p className="text-xs text-slate-500 font-mono">{cnd.level} • {cnd.matricNumber}</p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 italic line-clamp-2">
                      "{cnd.slogan || 'Official manifesto on file'}"
                    </p>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                      <div className="flex justify-between text-slate-500">
                        <span>Total Votes Cast:</span>
                        <span className="font-bold text-[#138601] font-mono">{cnd.votesCount || 0}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Statement Filed:</span>
                        <span className="font-bold text-slate-800">
                          {cnd.candidateStatement ? 'Yes (Text Available)' : 'Pending'}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>PDF Document:</span>
                        <span className="text-slate-800 font-semibold">
                          {cnd.statementPdfUrl || cnd.manifestoPdfUrl ? 'Attached' : 'None'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(cnd)}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCandidate(cnd.id, cnd.name)}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1.5 cursor-pointer transition-all"
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
            TAB 4: OFFICES
           ======================================================== */}
        {activeTab === 'offices' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-900 font-display">Contested Leadership Offices</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {posts.map(post => (
                <div key={post.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-green-50 text-[#138601] border border-green-200">
                      {post.code}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">Order #{post.order}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{post.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{post.description}</p>
                  <div className="pt-2 text-[11px] text-slate-500 font-medium">
                    Eligible Cohort: {post.eligibilityLevel}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 5: AUDIT & TALLIES
           ======================================================== */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900 font-display">
                  Cryptographic Tally Ledger ({currentElection?.session})
                </h2>
                <p className="text-xs text-slate-500">Immutable vote tallies verified directly from authenticated voter signatures.</p>
              </div>
              <button
                type="button"
                onClick={reloadData}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#138601]" />
                <span>Refresh Tallies</span>
              </button>
            </div>

            <div className="space-y-6">
              {results.resultsByPost.map(({ post, totalVotes, candidates }) => (
                <div key={post.id} className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                    <h3 className="text-base font-bold text-slate-900">{post.title}</h3>
                    <span className="text-xs font-mono text-[#138601] font-bold bg-green-50 px-2.5 py-1 rounded-md border border-green-200">
                      {totalVotes} Ballots
                    </span>
                  </div>

                  <div className="space-y-3">
                    {candidates.length > 0 ? (
                      candidates.map(cnd => (
                        <div key={cnd.id} className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-slate-800">{cnd.name}</span>
                            <span className="font-mono text-[#138601] font-bold">{cnd.votesCount || 0} ({cnd.percentage}%)</span>
                          </div>
                          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#138601] rounded-full transition-all duration-500"
                              style={{ width: `${cnd.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">No candidates registered</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ========================================================
          CREATE / EDIT YEAR-BY-YEAR ELECTION MODAL
         ======================================================== */}
      {isElectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-2xl my-auto max-h-[92vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <h3 className="text-lg font-black text-slate-900 font-display">
                {editingElection ? 'Edit Election Session' : 'Create Academic Year Election'}
              </h3>
              <button
                type="button"
                onClick={() => setIsElectionModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveElection} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Election Title *
                </label>
                <input
                  type="text"
                  required
                  value={electionForm.title}
                  onChange={(e) => setElectionForm({ ...electionForm, title: e.target.value })}
                  placeholder="e.g. NACOS FUTO 2027/2028 General Elections"
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#138601]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Academic Session *
                  </label>
                  <input
                    type="text"
                    required
                    value={electionForm.session}
                    onChange={(e) => setElectionForm({ ...electionForm, session: e.target.value })}
                    placeholder="e.g. 2027/2028"
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#138601]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Year *
                  </label>
                  <input
                    type="number"
                    required
                    value={electionForm.year}
                    onChange={(e) => setElectionForm({ ...electionForm, year: e.target.value })}
                    placeholder="2027"
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#138601]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Voting Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={electionForm.startDate}
                    onChange={(e) => setElectionForm({ ...electionForm, startDate: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#138601]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Voting End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={electionForm.endDate}
                    onChange={(e) => setElectionForm({ ...electionForm, endDate: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#138601]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Commission Notice / Description
                </label>
                <textarea
                  rows={3}
                  value={electionForm.description}
                  onChange={(e) => setElectionForm({ ...electionForm, description: e.target.value })}
                  placeholder="Official commission notes for this academic session election..."
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#138601]"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-green-50 border border-green-200">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={electionForm.makeActiveNow}
                    onChange={(e) => setElectionForm({ ...electionForm, makeActiveNow: e.target.checked })}
                    className="w-4 h-4 text-[#138601] rounded border-slate-300 focus:ring-[#138601]"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Set as Active Election Immediately
                    </span>
                    <span className="text-[11px] text-slate-600 block">
                      Front-end voter portal will instantly switch to this election. Other elections will be moved to archived/concluded.
                    </span>
                  </div>
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsElectionModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] shadow-sm cursor-pointer"
                >
                  {editingElection ? 'Save Changes' : 'Create Election'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          ADD/EDIT CANDIDATE MODAL
         ======================================================== */}
      {isCandidateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-2xl my-auto max-h-[92vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-900 font-display">
                  {editingCandidate ? 'Edit Candidate Details' : 'Certify New Aspirant'}
                </h3>
                <p className="text-xs text-slate-500">
                  Assigning to election: <strong className="text-slate-800">{currentElection?.session}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCandidateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCandidate} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Candidate Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={candidateForm.name}
                    onChange={(e) => setCandidateForm({ ...candidateForm, name: e.target.value })}
                    placeholder="e.g. Chukwuebuka Anyanwu"
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#138601]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Contested Executive Office *
                  </label>
                  <select
                    value={candidateForm.postId}
                    onChange={(e) => setCandidateForm({ ...candidateForm, postId: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#138601]"
                  >
                    {posts.map(post => (
                      <option key={post.id} value={post.id}>{post.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    FUTO Matriculation Number
                  </label>
                  <input
                    type="text"
                    value={candidateForm.matricNumber}
                    onChange={(e) => setCandidateForm({ ...candidateForm, matricNumber: e.target.value })}
                    placeholder="e.g. 20231429810"
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#138601]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Academic Cohort
                  </label>
                  <select
                    value={candidateForm.level}
                    onChange={(e) => setCandidateForm({ ...candidateForm, level: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#138601]"
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
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Campaign Slogan
                </label>
                <input
                  type="text"
                  value={candidateForm.slogan}
                  onChange={(e) => setCandidateForm({ ...candidateForm, slogan: e.target.value })}
                  placeholder="e.g. Technology That Empowers, Leadership That Listens"
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#138601]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Profile Photo URL (Rendered in Circle)
                </label>
                <input
                  type="url"
                  value={candidateForm.photoUrl}
                  onChange={(e) => setCandidateForm({ ...candidateForm, photoUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#138601]"
                />
              </div>

              {/* Candidate Statement Section */}
              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase text-[#138601] tracking-wider mb-3">
                  Candidate's Statement (Image 1 Feature)
                </h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Official Candidate's Statement (Full Text)
                    </label>
                    <textarea
                      rows={4}
                      value={candidateForm.candidateStatement}
                      onChange={(e) => setCandidateForm({ ...candidateForm, candidateStatement: e.target.value })}
                      placeholder="I, [Name], hereby declare my candidacy for... [Full statement to be displayed in reader modal]"
                      className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#138601]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Statement / Manifesto PDF URL (Optional Download)
                    </label>
                    <input
                      type="url"
                      value={candidateForm.statementPdfUrl}
                      onChange={(e) => setCandidateForm({ ...candidateForm, statementPdfUrl: e.target.value })}
                      placeholder="https://.../statement.pdf"
                      className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#138601]"
                    />
                  </div>
                </div>
              </div>

              {/* Manifesto Summary and Pillars */}
              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider mb-3">
                  Manifesto Pillars
                </h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Manifesto Title
                    </label>
                    <input
                      type="text"
                      value={candidateForm.manifestoHeadline}
                      onChange={(e) => setCandidateForm({ ...candidateForm, manifestoHeadline: e.target.value })}
                      placeholder="e.g. The Catalyst Agenda: 4 Pillars for Modern Computing"
                      className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#138601]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Manifesto Summary
                    </label>
                    <textarea
                      rows={2}
                      value={candidateForm.manifestoSummary}
                      onChange={(e) => setCandidateForm({ ...candidateForm, manifestoSummary: e.target.value })}
                      placeholder="Brief overview of key policies..."
                      className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#138601]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCandidateModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] shadow-sm cursor-pointer"
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
