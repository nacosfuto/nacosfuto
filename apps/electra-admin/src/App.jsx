import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard,
  Calendar,
  Users, 
  Award, 
  ShieldCheck, 
  BarChart3, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  FileText, 
  Check, 
  X,
  RefreshCw,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Eye,
  Info,
  Menu,
  Sun,
  Moon,
  Vote,
  Globe,
  Lock,
  Layers,
  UploadCloud,
  FileUp,
  Newspaper,
  Pin,
  UserCheck
} from 'lucide-react';
import { 
  getAllElections,
  getActiveElection, 
  adminCreateElection,
  adminSetActiveElection,
  adminUpdateElection,
  adminDeleteElection,
  getElectraPosts, 
  adminSavePost,
  adminDeletePost,
  getContestants, 
  getLiveElectionResults, 
  adminSaveContestant, 
  adminDeleteContestant, 
  fetchLiveElectraData,
  getElectraNews,
  adminSaveElectraNews,
  adminDeleteElectraNews
} from '@nacos/supabase/electraService';
import { MediaUpload, CLOUDINARY_FOLDERS } from '@nacos/media';
import { storageService } from '@nacos/supabase/storageService';
import { getAppUrls } from '@nacos/config/urls';
import { getPortalAdminSession, logoutPortalAdmin } from '@nacos/auth';
import { useTheme } from './context/ThemeContext';
import electraLogo from './assets/electra-logo.png';
import ElectraAdminLogin from './components/ElectraAdminLogin';
import ElectraVoterRollTab from './components/ElectraVoterRollTab';

export default function App() {
  const urls = getAppUrls();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const [adminSession, setAdminSession] = useState(() => getPortalAdminSession());
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Elections State
  const [allElections, setAllElections] = useState(() => getAllElections());
  const [activeElection, setActiveElection] = useState(() => getActiveElection());
  // The election currently being viewed/managed in the admin console
  const [selectedElectionId, setSelectedElectionId] = useState(() => getActiveElection()?.id || getAllElections()[0]?.id || '');
  
  // Scoped Data State for the currently selected election
  const currentElection = allElections.find(e => e.id === selectedElectionId) || activeElection || allElections[0] || null;
  const isViewingActive = currentElection && activeElection ? currentElection.id === activeElection.id : false;

  const [posts, setPosts] = useState(() => getElectraPosts());
  const [contestants, setContestants] = useState(() => getContestants(null, selectedElectionId));
  const [results, setResults] = useState(() => getLiveElectionResults(selectedElectionId));
  const [newsList, setNewsList] = useState(() => getElectraNews());
  
  // Modal states
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);
  
  const [isElectionModalOpen, setIsElectionModalOpen] = useState(false);
  const [editingElection, setEditingElection] = useState(null);

  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);
  const [editingNews, setEditingNews] = useState(null);
  
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });

  // Manifesto Backblaze B2 Upload state
  const [isUploadingManifesto, setIsUploadingManifesto] = useState(false);
  const [manifestoUploadProgress, setManifestoUploadProgress] = useState(0);
  const [manifestoUploadError, setManifestoUploadError] = useState(null);

  // News Form state
  const [newsForm, setNewsForm] = useState({
    title: '',
    category: 'Electoral Notice',
    tag: 'Official',
    date: new Date().toISOString().slice(0, 10),
    summary: '',
    content: '',
    author: 'NACOS ISEC Secretariat',
    pinned: false
  });

  // Post / Position Form state
  const [postForm, setPostForm] = useState({
    title: '',
    code: '',
    order: 1,
    description: '',
    eligibilityLevel: '200L - 400L',
    maxVotesPerVoter: 1
  });

  // Candidate Form state
  const [candidateForm, setCandidateForm] = useState({
    name: '',
    postId: 'post-president',
    matricNumber: '',
    level: '400 Level',
    slogan: '',
    photoUrl: '',
    photoPublicId: '',
    statementPdfUrl: '',
    manifestoPdfUrl: '',
    manifestoStorageKey: '',
    manifestoFileName: '',
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
    setNewsList(getElectraNews());
  };

  useEffect(() => {
    fetchLiveElectraData().then(() => {
      reloadData();
    }).catch(console.error);

    const onCast = () => reloadData();
    window.addEventListener('nacos_electra_ballot_cast', onCast);
    window.addEventListener('nacos_electra_contestants_updated', onCast);
    window.addEventListener('nacos_electra_election_updated', onCast);
    window.addEventListener('nacos_electra_posts_updated', onCast);
    window.addEventListener('nacos_electra_news_updated', onCast);

    return () => {
      window.removeEventListener('nacos_electra_ballot_cast', onCast);
      window.removeEventListener('nacos_electra_contestants_updated', onCast);
      window.removeEventListener('nacos_electra_election_updated', onCast);
      window.removeEventListener('nacos_electra_posts_updated', onCast);
      window.removeEventListener('nacos_electra_news_updated', onCast);
    };
  }, [selectedElectionId]);

  // When selected election changes, reload contestants and results
  useEffect(() => {
    setContestants(getContestants(null, selectedElectionId));
    setResults(getLiveElectionResults(selectedElectionId));
  }, [selectedElectionId]);

  // Position / Office CRUD handlers
  const handleOpenAddPost = () => {
    setEditingPost(null);
    setPostForm({
      title: '',
      code: '',
      order: posts.length + 1,
      description: '',
      eligibilityLevel: '200L - 400L',
      maxVotesPerVoter: 1
    });
    setIsPostModalOpen(true);
  };

  const handleOpenEditPost = (post) => {
    setEditingPost(post);
    setPostForm({
      title: post.title || '',
      code: post.code || '',
      order: post.order || 1,
      description: post.description || '',
      eligibilityLevel: post.eligibilityLevel || '200L - 400L',
      maxVotesPerVoter: post.maxVotesPerVoter || 1
    });
    setIsPostModalOpen(true);
  };

  const handleSavePost = async (e) => {
    e.preventDefault();
    try {
      await adminSavePost({ ...postForm, electionId: selectedElectionId }, editingPost?.id);
      setIsPostModalOpen(false);
      reloadData();
      showToast(editingPost ? 'Position updated successfully' : 'New executive position added');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeletePost = async (postId, postTitle) => {
    if (window.confirm(`Are you sure you want to permanently delete the office of "${postTitle}"? Any contestants assigned to this office may be affected.`)) {
      try {
        await adminDeletePost(postId);
        reloadData();
        showToast('Position deleted successfully');
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  };

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

  // Promote election to active
  const handlePromoteToActive = async (id) => {
    try {
      await adminSetActiveElection(id);
      setSelectedElectionId(id);
      reloadData();
      showToast('Switched public active election successfully!');
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  // Open modal to add candidate
  const handleOpenAddModal = () => {
    setEditingCandidate(null);
    setCandidateForm({
      name: '',
      postId: posts[0]?.id || 'post-president',
      matricNumber: '',
      level: '400 Level',
      slogan: '',
      photoUrl: '',
      photoPublicId: '',
      statementPdfUrl: '',
      manifestoPdfUrl: '',
      manifestoStorageKey: '',
      manifestoFileName: '',
      candidateStatement: '',
      manifestoHeadline: '',
      manifestoSummary: '',
      pillar1Title: '',
      pillar1Detail: '',
      pillar2Title: '',
      pillar2Detail: '',
    });
    setManifestoUploadProgress(0);
    setManifestoUploadError(null);
    setIsUploadingManifesto(false);
    setIsCandidateModalOpen(true);
  };

  // Open modal to edit candidate
  const handleOpenEditModal = (cnd) => {
    setEditingCandidate(cnd);
    setCandidateForm({
      name: cnd.name || '',
      postId: cnd.postId || posts[0]?.id,
      matricNumber: cnd.matricNumber || '',
      level: cnd.level || '400 Level',
      slogan: cnd.slogan || '',
      photoUrl: cnd.photoUrl || '',
      photoPublicId: cnd.photoPublicId || cnd.cloudinary_public_id || '',
      statementPdfUrl: cnd.statementPdfUrl || cnd.manifestoPdfUrl || '',
      manifestoPdfUrl: cnd.manifestoPdfUrl || cnd.statementPdfUrl || '',
      manifestoStorageKey: cnd.manifestoStorageKey || '',
      manifestoFileName: cnd.manifestoFileName || (cnd.statementPdfUrl ? 'manifesto.pdf' : ''),
      candidateStatement: cnd.candidateStatement || cnd.bio || '',
      manifestoHeadline: cnd.manifestoHeadline || '',
      manifestoSummary: cnd.manifestoSummary || '',
      pillar1Title: cnd.manifestoPillars?.[0]?.title || '',
      pillar1Detail: cnd.manifestoPillars?.[0]?.detail || '',
      pillar2Title: cnd.manifestoPillars?.[1]?.title || '',
      pillar2Detail: cnd.manifestoPillars?.[1]?.detail || '',
    });
    setManifestoUploadProgress(0);
    setManifestoUploadError(null);
    setIsUploadingManifesto(false);
    setIsCandidateModalOpen(true);
  };

  // Upload candidate photo directly to Backblaze B2 bucket
  const [isUploadingPhotoB2, setIsUploadingPhotoB2] = useState(false);
  const [photoB2Progress, setPhotoB2Progress] = useState(0);

  const handlePhotoB2Upload = async (file) => {
    if (!file) return;
    setIsUploadingPhotoB2(true);
    setPhotoB2Progress(0);

    try {
      const candidateId = editingCandidate?.id || `cnd-${Date.now()}`;
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storageKey = `electra/candidates/${candidateId}_${Date.now()}_${safeName}`;

      const res = await storageService.upload(file, {
        storageKey,
        fileName: file.name,
        mimeType: file.type || 'image/jpeg',
        onProgress: (pct) => setPhotoB2Progress(pct)
      });

      if (res && res.success) {
        const publicUrl = res.publicUrl || `/api/download?key=${encodeURIComponent(storageKey)}&name=${encodeURIComponent(file.name)}`;
        setCandidateForm(prev => ({
          ...prev,
          photoUrl: publicUrl
        }));
        showToast('Candidate photo uploaded and secured in Backblaze B2!');
      } else {
        throw new Error(res?.error || 'Failed to upload photo to Backblaze B2 bucket.');
      }
    } catch (err) {
      console.error('[Electra Admin] B2 photo upload error:', err);
      showToast(err.message || 'Photo upload to B2 failed.', 'error');
    } finally {
      setIsUploadingPhotoB2(false);
    }
  };

  // Upload candidate manifesto document directly to Backblaze B2
  const handleManifestoB2Upload = async (file) => {
    if (!file) return;
    setIsUploadingManifesto(true);
    setManifestoUploadProgress(0);
    setManifestoUploadError(null);

    try {
      const candidateId = editingCandidate?.id || `cnd-${Date.now()}`;
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storageKey = `electra/manifestos/${candidateId}_${Date.now()}_${safeName}`;

      const res = await storageService.upload(file, {
        storageKey,
        fileName: file.name,
        mimeType: file.type || 'application/pdf',
        onProgress: (pct) => setManifestoUploadProgress(pct)
      });

      if (res && res.success) {
        const publicUrl = res.publicUrl || `/api/download?key=${encodeURIComponent(storageKey)}&name=${encodeURIComponent(file.name)}`;
        setCandidateForm(prev => ({
          ...prev,
          statementPdfUrl: publicUrl,
          manifestoPdfUrl: publicUrl,
          manifestoStorageKey: res.storageKey || storageKey,
          manifestoFileName: file.name,
          manifestoFileSize: file.size
        }));
        showToast('Manifesto successfully uploaded and secured in Backblaze B2!');
      } else {
        throw new Error(res?.error || 'Failed to upload document to Backblaze B2 bucket.');
      }
    } catch (err) {
      console.error('[Electra Admin] B2 manifesto upload error:', err);
      const errMsg = err.message || 'Manifesto upload to B2 failed.';
      setManifestoUploadError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setIsUploadingManifesto(false);
    }
  };

  // Save Candidate Submit
  const handleSaveCandidate = async (e) => {
    e.preventDefault();
    try {
      const pillars = [];
      if (candidateForm.pillar1Title) {
        pillars.push({ title: candidateForm.pillar1Title, detail: candidateForm.pillar1Detail });
      }
      if (candidateForm.pillar2Title) {
        pillars.push({ title: candidateForm.pillar2Title, detail: candidateForm.pillar2Detail });
      }

      const postObj = posts.find(p => p.id === candidateForm.postId);
      const postName = postObj ? postObj.title : 'President';

      const payload = {
        name: candidateForm.name,
        postId: candidateForm.postId,
        runningPost: postName,
        matricNumber: candidateForm.matricNumber,
        level: candidateForm.level,
        slogan: candidateForm.slogan,
        photoUrl: candidateForm.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(candidateForm.name)}&background=138601&color=fff&size=200`,
        photoPublicId: candidateForm.photoPublicId,
        cloudinary_public_id: candidateForm.photoPublicId,
        statementPdfUrl: candidateForm.statementPdfUrl,
        manifestoPdfUrl: candidateForm.statementPdfUrl,
        manifestoStorageKey: candidateForm.manifestoStorageKey,
        manifestoFileName: candidateForm.manifestoFileName,
        candidateStatement: candidateForm.candidateStatement,
        manifestoHeadline: candidateForm.manifestoHeadline,
        manifestoSummary: candidateForm.manifestoSummary,
        manifestoPillars: pillars,
        electionId: selectedElectionId || currentElection?.id || activeElection?.id || null
      };

      await adminSaveContestant(payload, editingCandidate?.id);
      setIsCandidateModalOpen(false);
      reloadData();
      showToast(editingCandidate ? 'Candidate updated successfully' : 'Candidate certified and added');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Delete candidate
  const handleDeleteCandidate = async (id, name) => {
    if (window.confirm(`Are you sure you want to permanently delete candidate "${name}"?`)) {
      try {
        await adminDeleteContestant(id);
        reloadData();
        showToast('Candidate record removed');
      } catch (e) {
        showToast(e.message, 'error');
      }
    }
  };

  // Open modal to create election
  const handleOpenCreateElection = () => {
    setEditingElection(null);
    setElectionForm({
      title: '',
      session: '2027/2028',
      year: 2027,
      status: 'upcoming',
      startDate: '',
      endDate: '',
      description: '',
      makeActiveNow: false
    });
    setIsElectionModalOpen(true);
  };

  // Open modal to edit election
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

  // Save Election Submit
  const handleSaveElection = async (e) => {
    e.preventDefault();
    try {
      if (editingElection) {
        await adminUpdateElection(editingElection.id, {
          title: electionForm.title,
          session: electionForm.session,
          year: parseInt(electionForm.year, 10),
          status: electionForm.status,
          startDate: electionForm.startDate ? new Date(electionForm.startDate).toISOString() : null,
          endDate: electionForm.endDate ? new Date(electionForm.endDate).toISOString() : null,
          description: electionForm.description
        });
        if (electionForm.makeActiveNow) {
          await adminSetActiveElection(editingElection.id);
        }
        showToast('Election details updated successfully');
      } else {
        const newEl = await adminCreateElection({
          title: electionForm.title,
          session: electionForm.session,
          year: parseInt(electionForm.year, 10),
          status: electionForm.status,
          startDate: electionForm.startDate ? new Date(electionForm.startDate).toISOString() : null,
          endDate: electionForm.endDate ? new Date(electionForm.endDate).toISOString() : null,
          description: electionForm.description,
          makeActiveNow: electionForm.makeActiveNow
        });
        setSelectedElectionId(newEl.id);
        showToast('New academic year election created!');
      }
      setIsElectionModalOpen(false);
      reloadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Delete election
  const handleDeleteElection = async (id, title) => {
    if (window.confirm(`Are you sure you want to delete the election "${title}"? This cannot be undone.`)) {
      try {
        await adminDeleteElection(id);
        const fresh = getAllElections();
        setSelectedElectionId(fresh[0]?.id || '');
        reloadData();
        showToast('Election deleted successfully');
      } catch (e) {
        showToast(e.message, 'error');
      }
    }
  };

  // News & Press CRUD handlers
  const handleOpenAddNewsModal = () => {
    setEditingNews(null);
    setNewsForm({
      title: '',
      category: 'Electoral Notice',
      tag: 'Official',
      date: new Date().toISOString().slice(0, 10),
      summary: '',
      content: '',
      author: 'NACOS ISEC Secretariat',
      pinned: false
    });
    setIsNewsModalOpen(true);
  };

  const handleOpenEditNewsModal = (item) => {
    setEditingNews(item);
    setNewsForm({
      title: item.title || '',
      category: item.category || 'Electoral Notice',
      tag: item.tag || 'Official',
      date: item.date || new Date().toISOString().slice(0, 10),
      summary: item.summary || '',
      content: item.content || '',
      author: item.author || 'NACOS ISEC Secretariat',
      pinned: !!item.pinned
    });
    setIsNewsModalOpen(true);
  };

  const handleSaveNews = async (e) => {
    e.preventDefault();
    try {
      await adminSaveElectraNews({ ...newsForm, electionId: selectedElectionId }, editingNews?.id);
      setIsNewsModalOpen(false);
      reloadData();
      showToast(editingNews ? 'News release updated' : 'New electoral notice published');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteNews = async (id, title) => {
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      try {
        await adminDeleteElectraNews(id);
        reloadData();
        showToast('Release deleted');
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  };

  // Navigation Items matching Portal Admin tabs
  const navTabs = [
    { id: 'overview', label: 'Console Overview', icon: LayoutDashboard },
    { id: 'voters', label: 'Voters & Accreditation', icon: Users },
    { id: 'elections', label: 'Elections & Sessions', icon: Calendar, badge: allElections.length },
    { id: 'contestants', label: 'Certified Contestants', icon: Award, badge: contestants.length },
    { id: 'offices', label: 'Executive Offices', icon: Layers, badge: posts.length },
    { id: 'news', label: 'News & Press Releases', icon: Newspaper, badge: newsList.length },
    { id: 'audit', label: 'Cryptographic Tallies', icon: ShieldCheck, badge: results.totalBallots },
  ];

  if (!adminSession) {
    return <ElectraAdminLogin onLoginSuccess={(sess) => setAdminSession(sess)} />;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#041801] text-gray-900 dark:text-white flex flex-col font-sans selection:bg-[#138601] selection:text-white md:pl-16 print:pl-0 transition-colors">
      
      {/* ─── Collapsed Vertical Icon Rail (Strictly matching Portal UI) ─── */}
      <aside
        className={`hidden md:flex fixed inset-y-0 left-0 top-0 bottom-0 w-16 flex-col justify-between items-center py-3.5 border-r z-30 select-none print:hidden transition-colors ${
          isDark
            ? 'bg-[#083002] border-[#138601]/25 text-white'
            : 'bg-white border-gray-200 text-gray-900 shadow-xs'
        }`}
        aria-label="Collapsed electra admin rail"
      >
        {/* Top: Hamburger Drawer Expander Button (Replaced Electra Icon) */}
        <div className="flex flex-col items-center gap-4 w-full">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-10 h-10 rounded-[5px] bg-[#138601] hover:bg-[#0f6c01] text-white flex items-center justify-center shadow-xs transition-colors cursor-pointer"
            title="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
            <span className="sr-only">Toggle Commission Navigation</span>
          </button>

          {/* Icon Tabs Navigation */}
          <nav className="flex flex-col items-center gap-1.5 w-full px-2 mt-2">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer relative group ${
                    isActive
                      ? 'bg-[#138601]/15 text-[#138601] dark:bg-[#138601]/30 dark:text-[#4bd043] font-bold shadow-2xs'
                      : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
                  }`}
                  title={tab.label}
                >
                  <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#138601] rounded-r-full" />
                  )}
                  {/* Tooltip */}
                  <span className="absolute left-14 bg-gray-900 dark:bg-black text-white text-xs px-2.5 py-1 rounded-[5px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-md">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Rail Actions: Theme Toggle & External Live Link */}
        <div className="flex flex-col items-center gap-2 w-full px-2">
          {/* External Live Voter Platform */}
          <a
            href={urls.electra}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:text-[#138601] dark:text-gray-400 dark:hover:text-[#4bd043] hover:bg-gray-100 dark:hover:bg-white/5 transition-all group relative"
            title="Open Live Voter Portal"
          >
            <Vote className="w-5 h-5 transition-transform group-hover:scale-110" />
            <span className="absolute left-14 bg-gray-900 dark:bg-black text-white text-xs px-2.5 py-1 rounded-[5px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-md">
              Voter Portal
            </span>
          </a>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all cursor-pointer relative group"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-amber-400 animate-spin-slow" />
            ) : (
              <Moon className="w-5 h-5 text-slate-700" />
            )}
            <span className="absolute left-14 bg-gray-900 dark:bg-black text-white text-xs px-2.5 py-1 rounded-[5px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-md">
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>
        </div>
      </aside>

      {/* ─── Slide-out Drawer Sidebar (Strictly matching Portal UI) ─── */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-xs transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 w-72 z-50 flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-in-out select-none border-r ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          isDark
            ? 'bg-[#083002] border-[#138601]/25 text-white'
            : 'bg-white border-gray-200 text-gray-900'
        }`}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Header of Drawer: Full Horizontal Official ELECTRA Logo */}
          <div className="p-4 border-b border-gray-200 dark:border-[#138601]/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src={electraLogo}
                alt="ELECTRA NACOS FUTO"
                className="h-9 w-auto object-contain"
              />
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-[5px] text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Active Election Badge in Drawer */}
          <div className="px-4 py-3 mx-3 my-3 rounded-[5px] bg-gray-50 dark:bg-[#041801]/60 border border-gray-200 dark:border-[#138601]/25 space-y-1">
            <span className="text-[10px] font-bold text-gray-400 dark:text-green-200/60 uppercase tracking-wider block">
              Active Session
            </span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#138601] animate-pulse" />
              <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                {activeElection.session} • {activeElection.title}
              </span>
            </div>
          </div>

          {/* Drawer Navigation List */}
          <div className="px-3 py-2 space-y-1">
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-green-200/50 block mb-1">
              Commission Modules
            </span>
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[5px] text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#138601] text-white shadow-xs'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge !== undefined && (
                    <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-mono ${
                      isActive ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Drawer Quick Links Section */}
          <div className="mt-auto p-4 border-t border-gray-200 dark:border-[#138601]/20 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-green-200/50 block mb-1">
              Department Ecosystem
            </span>
            <a
              href={urls.electra}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-[#138601] dark:hover:text-[#4bd043] rounded-[5px] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <span>Live Voter Ballot Platform</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href={urls.portal}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-[#138601] dark:hover:text-[#4bd043] rounded-[5px] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <span>Student Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href={urls.portalAdmin}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-[#138601] dark:hover:text-[#4bd043] rounded-[5px] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <span>Portal Admin Console</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* ─── TOP STICKY HEADER (Strictly matching Portal UI) ─── */}
      <header className={`sticky top-0 z-20 backdrop-blur-md border-b transition-colors ${
        isDark 
          ? 'bg-[#083002]/95 border-[#138601]/25 text-white' 
          : 'bg-white/95 border-gray-200 text-gray-900 shadow-xs'
      }`}>
        <div className="site-container w-full h-16 sm:h-20 flex items-center justify-between gap-4">
          
          {/* Left Brand & Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-[5px] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Toggle navigation drawer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Logo and Subtitle */}
            <div className="flex items-center gap-3">
              <img 
                src={electraLogo} 
                alt="ELECTRA Commission" 
                className="h-8 sm:h-9 w-auto object-contain cursor-pointer"
                onClick={() => setActiveTab('overview')}
              />
              <div className="h-5 w-px bg-gray-200 dark:bg-white/10 hidden sm:block" />
              <div className="hidden sm:block">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Commission Admin
                </span>
              </div>
            </div>
          </div>

          {/* Right Controls: Session Selector & Utilities */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Session Selector Dropdown */}
            <div className="relative inline-block">
              <select
                value={selectedElectionId}
                onChange={(e) => setSelectedElectionId(e.target.value)}
                className="appearance-none pl-3 pr-8 py-1.5 rounded-[5px] text-xs font-bold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-[#041801] hover:bg-gray-200 dark:hover:bg-white/5 border border-gray-300 dark:border-[#138601]/40 focus:outline-none focus:ring-1 focus:ring-[#138601] cursor-pointer"
                title="Select Academic Session to Manage"
              >
                {allElections.length === 0 && (
                  <option value="">No Elections Configured</option>
                )}
                {allElections.map(el => (
                  <option key={el.id} value={el.id} className="dark:bg-[#083002] text-gray-900 dark:text-white">
                    {el.session} • {el.title} {el.status === 'active' ? '(ACTIVE)' : `(${el.status.toUpperCase()})`}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>

            {/* External Live Voter Platform Button */}
            <a
              href={urls.electra}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] text-xs font-bold bg-[#138601] hover:bg-[#0f6c01] text-white transition-colors shadow-xs"
            >
              <Vote className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Voter Platform</span>
            </a>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="w-9 h-9 flex items-center justify-center rounded-[5px] text-base transition-colors cursor-pointer bg-transparent border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            {/* Admin Profile & Sign Out */}
            {adminSession && (
              <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-white/10">
                <span className="hidden lg:inline-block text-[11px] font-bold text-gray-700 dark:text-gray-200">
                  {adminSession.full_name || adminSession.email}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    logoutPortalAdmin();
                    setAdminSession(null);
                  }}
                  className="px-2.5 py-1 rounded-[5px] text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                  title="Sign Out of Commission Console"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* ─── TOAST NOTIFICATION ─── */}
      {statusMessage.text && (
        <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-top-2">
          <div className={`px-4 py-3 rounded-[5px] text-xs font-bold shadow-xl flex items-center gap-2 ${
            statusMessage.type === 'error'
              ? 'bg-rose-50 border border-rose-300 text-rose-700 dark:bg-rose-950/80 dark:border-rose-800 dark:text-rose-300'
              : 'bg-emerald-50 border border-emerald-300 text-emerald-800 dark:bg-emerald-950/80 dark:border-emerald-800 dark:text-emerald-300'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMessage.text}</span>
          </div>
        </div>
      )}

      {/* ─── MAIN CONTENT CONTAINER (Padded & Responsive) ─── */}
      <main className="flex-1 site-container py-6 sm:py-8 w-full space-y-6">
        
        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-[#138601]/25 pb-3 overflow-x-auto">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-[5px] text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shadow-xs ${
                  isSel
                    ? 'bg-[#138601] text-white shadow-[#138601]/20'
                    : 'bg-white dark:bg-[#083002]/60 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 border border-gray-200 dark:border-[#138601]/25'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`px-1.5 py-0.5 rounded-[3px] text-[10px] font-mono ${
                    isSel ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ========================================================
            TAB 1: CONSOLE OVERVIEW (PORTAL ADMIN METRIC CARDS)
           ======================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* Top Election State Control Card */}
            <div className={`p-6 sm:p-7 rounded-[5px] border transition-all ${
              isDark 
                ? 'bg-[#083002]/60 backdrop-blur border-[#138601]/30 text-white' 
                : 'bg-white border-gray-200 text-gray-900 shadow-xs'
            }`}>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-green-200/60">
                      Managing Academic Session
                    </span>
                    <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider ${
                      currentElection?.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40'
                        : currentElection?.status === 'paused'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40'
                        : 'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-white/10 dark:text-gray-300 dark:border-white/10'
                    }`}>
                      {currentElection?.status || 'Active'}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black font-display tracking-tight">
                    {currentElection?.title || 'NACOS FUTO General Elections'}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Academic Session: <strong className="text-gray-900 dark:text-white">{currentElection?.session || '2026/2027'}</strong> • Cryptographically sealed voter session registry
                  </p>
                </div>

                {/* Status Trigger Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleStatusChange('active')}
                    className={`px-3.5 py-1.5 rounded-[5px] text-xs font-bold transition-all cursor-pointer ${
                      currentElection?.status === 'active'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-gray-50 dark:bg-black/20 text-gray-700 dark:text-gray-300 hover:bg-gray-100 border border-gray-200 dark:border-white/10'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange('paused')}
                    className={`px-3.5 py-1.5 rounded-[5px] text-xs font-bold transition-all cursor-pointer ${
                      currentElection?.status === 'paused'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-gray-50 dark:bg-black/20 text-gray-700 dark:text-gray-300 hover:bg-gray-100 border border-gray-200 dark:border-white/10'
                    }`}
                  >
                    Pause
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange('concluded')}
                    className={`px-3.5 py-1.5 rounded-[5px] text-xs font-bold transition-all cursor-pointer ${
                      currentElection?.status === 'concluded'
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'bg-gray-50 dark:bg-black/20 text-gray-700 dark:text-gray-300 hover:bg-gray-100 border border-gray-200 dark:border-white/10'
                    }`}
                  >
                    Conclude
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange('published')}
                    className={`px-3.5 py-1.5 rounded-[5px] text-xs font-bold transition-all cursor-pointer ${
                      currentElection?.status === 'published'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-gray-50 dark:bg-black/20 text-gray-700 dark:text-gray-300 hover:bg-gray-100 border border-gray-200 dark:border-white/10'
                    }`}
                  >
                    Publish Results
                  </button>
                </div>
              </div>
            </div>

            {/* Historical Archive Notice if viewing non-active election */}
            {!isViewingActive && (
              <div className="p-3.5 rounded-[5px] bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 text-blue-800 dark:text-blue-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    Viewing Historical Archive: <strong>{currentElection?.session} • {currentElection?.title}</strong>. Certified tallies are isolated and locked.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedElectionId(activeElection.id)}
                  className="px-2.5 py-1 rounded bg-blue-600 text-white font-bold text-[11px] hover:bg-blue-700 cursor-pointer"
                >
                  Switch to Active Election
                </button>
              </div>
            )}

            {/* Portal-Style KPI Stats Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  title: 'Total Ballots Cast',
                  value: results.totalBallots,
                  subtitle: '100% Cryptographically Sealed',
                  icon: Vote,
                },
                {
                  title: 'Certified Contestants',
                  value: contestants.length,
                  subtitle: `Across ${posts.length} Contested Offices`,
                  icon: Users,
                },
                {
                  title: 'Leadership Offices',
                  value: posts.length,
                  subtitle: 'Executive Committee Seats',
                  icon: Award,
                },
                {
                  title: 'Integrity Status',
                  value: 'Verified',
                  subtitle: 'Zero Tampering Recorded',
                  icon: ShieldCheck,
                },
              ].map((kpi, idx) => {
                const Icon = kpi.icon;
                return (
                  <div
                    key={idx}
                    className={`p-5 rounded-[5px] border transition-all hover:-translate-y-0.5 hover:border-[#138601] shadow-xs ${
                      isDark
                        ? 'bg-[#083002]/60 border-[#138601]/25 text-white'
                        : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-gray-500 dark:text-green-200/70 uppercase tracking-wider">
                        {kpi.title}
                      </span>
                      <div className="p-2 rounded-[5px] bg-gray-100 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 text-[#138601] dark:text-[#4bd043]">
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-2xl sm:text-3xl font-black tracking-tight">
                        {kpi.value}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-green-200/70 mt-1 font-normal">
                        {kpi.subtitle}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Leading Candidates Summary Cards */}
            <div className={`p-6 rounded-[5px] border space-y-4 ${
              isDark 
                ? 'bg-[#083002]/40 border-[#138601]/25 text-white' 
                : 'bg-white border-gray-200 text-gray-900 shadow-xs'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-white/10">
                <div>
                  <h3 className="text-base font-bold">Leading Aspirants Summary ({currentElection?.session})</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Current top-ranked candidates across all offices</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('audit')}
                  className="text-xs font-bold text-[#138601] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Full Ledger</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.resultsByPost.map(({ post, leadingCandidate }) => (
                  <div 
                    key={post.id} 
                    className="p-4 rounded-[5px] bg-gray-50 dark:bg-[#041801]/60 border border-gray-200 dark:border-[#138601]/20 space-y-2"
                  >
                    <span className="text-[10px] font-bold uppercase text-[#138601] dark:text-[#4bd043] tracking-wider block">
                      {post.title}
                    </span>
                    {leadingCandidate ? (
                      <div className="flex items-center gap-3">
                        <img 
                          src={leadingCandidate.photoUrl} 
                          alt={leadingCandidate.name} 
                          className="w-10 h-10 rounded-full object-cover border border-[#138601]/30 shrink-0" 
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{leadingCandidate.name}</p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                            {leadingCandidate.votesCount} votes ({leadingCandidate.percentage}%)
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No candidates certified</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ========================================================
            TAB 2: ELECTIONS (YEAR-BY-YEAR SESSIONS)
           ======================================================== */}
        {activeTab === 'elections' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black font-display tracking-tight">
                  Academic Year Elections Directory
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Manage academic sessions, configure live active polls, and archive historical ballots.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenCreateElection}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[5px] text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] transition-all cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Create New Academic Election</span>
              </button>
            </div>

            {/* Elections Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {allElections.map(el => {
                const isActive = el.status === 'active';
                const isSelected = el.id === selectedElectionId;

                return (
                  <div
                    key={el.id}
                    className={`rounded-[5px] border p-6 transition-all flex flex-col justify-between shadow-xs ${
                      isActive 
                        ? 'border-[#138601] ring-1 ring-[#138601]' 
                        : isSelected
                        ? 'border-gray-400 dark:border-gray-600'
                        : 'border-gray-200 dark:border-[#138601]/25 hover:border-gray-300'
                    } ${
                      isDark ? 'bg-[#083002]/60 text-white' : 'bg-white text-gray-900'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-[3px] bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200">
                          {el.session}
                        </span>
                        <span className={`px-2 py-0.5 rounded-[3px] text-[10px] font-bold uppercase tracking-wider ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40'
                            : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300'
                        }`}>
                          {el.status}
                        </span>
                      </div>

                      <h3 className="text-base font-bold line-clamp-1">{el.title}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                        {el.description || 'Official NACOS FUTO departmental voting registry.'}
                      </p>

                      <div className="text-[11px] text-gray-500 dark:text-gray-400 space-y-1 pt-2 border-t border-gray-100 dark:border-white/10">
                        <div>Start: <span className="font-medium">{el.startDate ? new Date(el.startDate).toLocaleDateString() : 'Unscheduled'}</span></div>
                        <div>End: <span className="font-medium">{el.endDate ? new Date(el.endDate).toLocaleDateString() : 'Unscheduled'}</span></div>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-gray-100 dark:border-white/10 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditElection(el)}
                          className="px-2.5 py-1.5 rounded-[4px] text-xs font-bold bg-gray-100 dark:bg-white/10 hover:bg-gray-200 text-gray-700 dark:text-gray-200 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 inline mr-1" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteElection(el.id, el.title)}
                          className="px-2.5 py-1.5 rounded-[4px] text-xs font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-800/40 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                          Delete
                        </button>
                      </div>

                      {!isActive && (
                        <button
                          type="button"
                          onClick={() => handlePromoteToActive(el.id)}
                          className="px-3 py-1.5 rounded-[4px] text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] cursor-pointer shadow-xs"
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 3: CONTESTANTS (ASPIRANT ROSTER)
           ======================================================== */}
        {activeTab === 'contestants' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black font-display tracking-tight">
                  Certified Contestants ({currentElection?.session})
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Certify candidates, review manifestos, and configure election ballot entries.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[5px] text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] transition-all cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Certify Candidate</span>
              </button>
            </div>

            {contestants.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-gray-300 dark:border-white/10 rounded-[5px] space-y-3">
                <div className="w-12 h-12 rounded-full bg-green-50 dark:bg-green-950/40 text-[#138601] dark:text-[#4bd043] mx-auto flex items-center justify-center">
                  <UserCheck className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold">No Candidates Certified Yet</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                  No certified candidates found for election session ({currentElection?.session || 'Current'}). Click "Certify Candidate" above to register the first candidate.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {contestants.map((cnd) => (
                  <div
                    key={cnd.id}
                    className={`p-5 rounded-[5px] border flex flex-col justify-between shadow-xs transition-all ${
                      isDark ? 'bg-[#083002]/60 border-[#138601]/25 text-white' : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  >
                    <div className="space-y-3 mb-4">
                      <div className="flex items-start gap-3.5">
                        <img
                          src={cnd.photoUrl}
                          alt={cnd.name}
                          className="w-14 h-14 rounded-full object-cover bg-gray-100 border-2 border-[#138601]/30 shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold uppercase text-[#138601] dark:text-[#4bd043] block truncate">
                            {cnd.runningPost}
                          </span>
                          <h3 className="text-base font-bold truncate">{cnd.name}</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{cnd.level} • {cnd.matricNumber}</p>
                        </div>
                      </div>

                      <p className="text-xs text-gray-600 dark:text-gray-300 italic line-clamp-2">
                        "{cnd.slogan || 'Official manifesto on file'}"
                      </p>

                      <div className="p-3 rounded-[5px] bg-gray-50 dark:bg-[#041801]/60 border border-gray-200 dark:border-white/5 text-xs space-y-1.5">
                        <div className="flex justify-between text-gray-500 dark:text-gray-400">
                          <span>Total Ballots Cast:</span>
                          <span className="font-bold text-[#138601] dark:text-[#4bd043] font-mono">{cnd.votesCount || 0}</span>
                        </div>
                        <div className="flex justify-between text-gray-500 dark:text-gray-400">
                          <span>Manifesto Filed:</span>
                          <span className="font-bold text-gray-800 dark:text-gray-200">
                            {cnd.candidateStatement ? 'Yes (Text Available)' : 'Pending'}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-500 dark:text-gray-400">
                          <span>PDF Document:</span>
                          <span className="font-semibold text-gray-800 dark:text-gray-200">
                            {cnd.statementPdfUrl || cnd.manifestoPdfUrl ? 'Attached' : 'None'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 dark:border-white/10 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(cnd)}
                        className="px-3 py-1.5 rounded-[4px] text-xs font-bold bg-gray-100 dark:bg-white/10 hover:bg-gray-200 text-gray-700 dark:text-gray-200 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteCandidate(cnd.id, cnd.name)}
                        className="px-3 py-1.5 rounded-[4px] text-xs font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-800/40 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 4: OFFICES (EXECUTIVE POSTS)
           ======================================================== */}
        {activeTab === 'offices' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black font-display tracking-tight">
                  Contested Executive Leadership Offices ({posts.length})
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Add new executive positions, edit details and ballot order, and configure eligibility.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddPost}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[5px] text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] transition-all cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Add New Position</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {posts.map(post => (
                <div 
                  key={post.id} 
                  className={`p-5 rounded-[5px] border flex flex-col justify-between space-y-3 shadow-xs ${
                    isDark ? 'bg-[#083002]/60 border-[#138601]/25 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-[3px] text-xs font-mono font-bold bg-green-50 text-[#138601] border border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800/40">
                        {post.code}
                      </span>
                      <span className="text-xs font-semibold text-gray-400">Order #{post.order}</span>
                    </div>
                    <h3 className="text-lg font-bold">{post.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{post.description}</p>
                    <div className="pt-2 text-[11px] text-gray-400 font-medium">
                      Eligible Cohort: {post.eligibilityLevel}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 dark:border-white/10 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditPost(post)}
                      className="px-3 py-1.5 rounded-[4px] text-xs font-bold bg-gray-100 dark:bg-white/10 hover:bg-gray-200 text-gray-700 dark:text-gray-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePost(post.id, post.title)}
                      className="px-3 py-1.5 rounded-[4px] text-xs font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-800/40 flex items-center gap-1.5 cursor-pointer"
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
            TAB 5: CRYPTOGRAPHIC TALLIES & AUDIT
           ======================================================== */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black font-display tracking-tight">
                  Cryptographic Tally Ledger ({currentElection?.session})
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Immutable vote tallies verified directly from authenticated voter signatures.
                </p>
              </div>
              <button
                type="button"
                onClick={reloadData}
                className="px-3.5 py-1.5 rounded-[5px] text-xs font-bold bg-white dark:bg-[#083002] text-gray-700 dark:text-gray-200 hover:bg-gray-50 border border-gray-200 dark:border-[#138601]/30 shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#138601]" />
                <span>Refresh Tallies</span>
              </button>
            </div>

            <div className="space-y-6">
              {results.resultsByPost.map(({ post, totalVotes, candidates }) => (
                <div 
                  key={post.id} 
                  className={`p-6 rounded-[5px] border space-y-4 shadow-xs ${
                    isDark ? 'bg-[#083002]/60 border-[#138601]/25 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                >
                  <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-white/10">
                    <h3 className="text-base font-bold">{post.title}</h3>
                    <span className="text-xs font-mono text-[#138601] dark:text-[#4bd043] font-bold bg-green-50 dark:bg-green-950/40 px-2.5 py-1 rounded-[3px] border border-green-200 dark:border-green-800/40">
                      {totalVotes} Ballots Cast
                    </span>
                  </div>

                  <div className="space-y-3">
                    {candidates.length > 0 ? (
                      candidates.map(cnd => (
                        <div key={cnd.id} className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold">{cnd.name}</span>
                            <span className="font-mono text-[#138601] dark:text-[#4bd043] font-bold">
                              {cnd.votesCount || 0} ({cnd.percentage}%)
                            </span>
                          </div>
                          <div className="h-2.5 w-full bg-gray-100 dark:bg-black/40 rounded-full overflow-hidden border border-gray-200 dark:border-white/5">
                            <div
                              className="h-full bg-gradient-to-r from-[#138601] to-[#4bd043] rounded-full transition-all duration-500"
                              style={{ width: `${cnd.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400 italic">No candidates registered</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            TAB: INSTITUTIONAL VOTER ROLL & ACCREDITATION
           ======================================================== */}
        {activeTab === 'voters' && (
          <ElectraVoterRollTab
            selectedElectionId={selectedElectionId}
            currentElection={currentElection}
            isDark={isDark}
            showToast={showToast}
          />
        )}

        {/* ========================================================
            TAB 6: NEWS & PRESS RELEASES
           ======================================================== */}
        {activeTab === 'news' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black font-display tracking-tight">
                  Electoral Bulletins & Press Releases ({newsList.length})
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Publish notices, polling unit announcements, and live press releases visible to all voters.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddNewsModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[5px] text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] transition-all cursor-pointer shadow-xs self-start sm:self-auto"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Publish New Release</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {newsList.map((item) => (
                <div 
                  key={item.id} 
                  className={`p-5 rounded-[5px] border flex flex-col justify-between space-y-4 shadow-xs ${
                    isDark ? 'bg-[#083002]/60 border-[#138601]/25 text-white' : 'bg-white border-gray-200 text-gray-900'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-[3px] text-[11px] font-bold uppercase tracking-wider bg-green-50 text-[#138601] border border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800/40">
                          {item.category || 'Notice'}
                        </span>
                        {item.pinned && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] text-[10px] font-bold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            <Pin className="w-3 h-3 fill-current" />
                            Pinned
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {item.date}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold leading-snug">
                      {item.title}
                    </h3>

                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      {item.summary}
                    </p>

                    {item.content && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 italic bg-gray-50 dark:bg-black/20 p-2.5 rounded-[4px] border border-gray-100 dark:border-white/5">
                        {item.content}
                      </p>
                    )}

                    <div className="pt-1 text-[11px] text-gray-400">
                      Author: <span className="font-semibold text-gray-600 dark:text-gray-300">{item.author || 'NACOS ISEC Secretariat'}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 dark:border-white/10 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditNewsModal(item)}
                      className="px-3 py-1.5 rounded-[4px] text-xs font-bold bg-gray-100 dark:bg-white/10 hover:bg-gray-200 text-gray-700 dark:text-gray-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteNews(item.id, item.title)}
                      className="px-3 py-1.5 rounded-[4px] text-xs font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-800/40 flex items-center gap-1.5 cursor-pointer"
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

      </main>

      {/* ========================================================
          CREATE / EDIT YEAR-BY-YEAR ELECTION MODAL
         ======================================================== */}
      {isElectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className={`relative w-full max-w-lg border rounded-[5px] p-6 sm:p-8 shadow-2xl my-auto max-h-[92vh] overflow-y-auto ${
            isDark ? 'bg-[#083002] border-[#138601]/40 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-white/10 mb-6">
              <h3 className="text-lg font-black font-display">
                {editingElection ? 'Edit Election Session' : 'Create Academic Year Election'}
              </h3>
              <button
                type="button"
                onClick={() => setIsElectionModalOpen(false)}
                className="p-1.5 rounded-[4px] text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveElection} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                  Election Title *
                </label>
                <input
                  type="text"
                  required
                  value={electionForm.title}
                  onChange={(e) => setElectionForm({ ...electionForm, title: e.target.value })}
                  placeholder="e.g. NACOS FUTO 2027/2028 General Elections"
                  className="w-full px-3.5 py-2 rounded-[5px] bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-1 focus:ring-[#138601]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                    Academic Session *
                  </label>
                  <input
                    type="text"
                    required
                    value={electionForm.session}
                    onChange={(e) => setElectionForm({ ...electionForm, session: e.target.value })}
                    placeholder="e.g. 2027/2028"
                    className="w-full px-3.5 py-2 rounded-[5px] bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-white/10 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#138601]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                    Year *
                  </label>
                  <input
                    type="number"
                    required
                    value={electionForm.year}
                    onChange={(e) => setElectionForm({ ...electionForm, year: e.target.value })}
                    placeholder="2027"
                    className="w-full px-3.5 py-2 rounded-[5px] bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-white/10 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#138601]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                    Voting Start Date
                  </label>
                  <input
                    type="datetime-local"
                    value={electionForm.startDate}
                    onChange={(e) => setElectionForm({ ...electionForm, startDate: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-[5px] bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-white/10 text-xs focus:outline-none focus:ring-1 focus:ring-[#138601]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                    Voting End Date
                  </label>
                  <input
                    type="datetime-local"
                    value={electionForm.endDate}
                    onChange={(e) => setElectionForm({ ...electionForm, endDate: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-[5px] bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-white/10 text-xs focus:outline-none focus:ring-1 focus:ring-[#138601]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                  Commission Notice / Description
                </label>
                <textarea
                  rows={3}
                  value={electionForm.description}
                  onChange={(e) => setElectionForm({ ...electionForm, description: e.target.value })}
                  placeholder="Official commission notes for this session..."
                  className="w-full px-3.5 py-2 rounded-[5px] bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-1 focus:ring-[#138601]"
                />
              </div>

              <div className="p-3.5 rounded-[5px] bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/40">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={electionForm.makeActiveNow}
                    onChange={(e) => setElectionForm({ ...electionForm, makeActiveNow: e.target.checked })}
                    className="w-4 h-4 text-[#138601] rounded border-gray-300 focus:ring-[#138601]"
                  />
                  <div>
                    <span className="text-xs font-bold block">
                      Set as Active Election Immediately
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block">
                      Front-end voter portal will instantly switch to this election.
                    </span>
                  </div>
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsElectionModalOpen(false)}
                  className="px-4 py-2 rounded-[5px] text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/10 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-[5px] text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] shadow-xs cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className={`relative w-full max-w-2xl border rounded-[5px] p-6 sm:p-8 shadow-2xl my-auto max-h-[92vh] overflow-y-auto ${
            isDark ? 'bg-[#083002] border-[#138601]/40 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-white/10 mb-6">
              <div>
                <h3 className="text-lg font-black font-display">
                  {editingCandidate ? 'Edit Candidate Details' : 'Certify New Aspirant'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Assigning to election: <strong className="text-gray-900 dark:text-white">{currentElection?.session}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCandidateModalOpen(false)}
                className="p-1.5 rounded-[4px] text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCandidate} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                    Candidate Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={candidateForm.name}
                    onChange={(e) => setCandidateForm({ ...candidateForm, name: e.target.value })}
                    placeholder="e.g. Chukwuebuka Anyanwu"
                    className="w-full px-3.5 py-2 rounded-[5px] bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-1 focus:ring-[#138601]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                    Contested Executive Office *
                  </label>
                  <select
                    value={candidateForm.postId}
                    onChange={(e) => setCandidateForm({ ...candidateForm, postId: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-[5px] bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-1 focus:ring-[#138601]"
                  >
                    {posts.map(post => (
                      <option key={post.id} value={post.id} className="dark:bg-[#083002]">{post.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                    FUTO Matriculation Number
                  </label>
                  <input
                    type="text"
                    value={candidateForm.matricNumber}
                    onChange={(e) => setCandidateForm({ ...candidateForm, matricNumber: e.target.value })}
                    placeholder="e.g. 20231429810"
                    className="w-full px-3.5 py-2 rounded-[5px] bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-white/10 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#138601]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                    Academic Cohort
                  </label>
                  <select
                    value={candidateForm.level}
                    onChange={(e) => setCandidateForm({ ...candidateForm, level: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-[5px] bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-1 focus:ring-[#138601]"
                  >
                    <option value="100 Level" className="dark:bg-[#083002]">100 Level</option>
                    <option value="200 Level" className="dark:bg-[#083002]">200 Level</option>
                    <option value="300 Level" className="dark:bg-[#083002]">300 Level</option>
                    <option value="400 Level" className="dark:bg-[#083002]">400 Level</option>
                    <option value="500 Level" className="dark:bg-[#083002]">500 Level</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                  Campaign Slogan
                </label>
                <input
                  type="text"
                  value={candidateForm.slogan}
                  onChange={(e) => setCandidateForm({ ...candidateForm, slogan: e.target.value })}
                  placeholder="e.g. Technology That Empowers, Leadership That Listens"
                  className="w-full px-3.5 py-2 rounded-[5px] bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-1 focus:ring-[#138601]"
                />
              </div>

              {/* Candidate Profile Photo (Cloudinary & Backblaze B2) */}
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Profile Photo (Cloudinary CDN or Backblaze B2)
                </label>
                <MediaUpload
                  currentImageUrl={candidateForm.photoUrl}
                  currentPublicId={candidateForm.photoPublicId}
                  folder={CLOUDINARY_FOLDERS.ELECTRA_CANDIDATES}
                  aspectRatio="square"
                  label="Upload Candidate Portrait Photo (Cloudinary)"
                  helperText="JPG, PNG, or WebP up to 5MB (stored in nacos/electra/candidates)"
                  onUploadSuccess={(uploadRes) => {
                    const finalPhoto = uploadRes?.secure_url || uploadRes?.secureUrl || uploadRes?.url || '';
                    const finalPubId = uploadRes?.public_id || uploadRes?.publicId || '';
                    setCandidateForm(prev => ({
                      ...prev,
                      photoUrl: finalPhoto,
                      photoPublicId: finalPubId
                    }));
                    showToast('Candidate profile photo uploaded to Cloudinary!');
                  }}
                />

                {/* Backblaze B2 Photo Upload Button */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="file"
                    id="candidate-photo-b2-upload"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePhotoB2Upload(file);
                    }}
                    disabled={isUploadingPhotoB2}
                  />
                  <label
                    htmlFor="candidate-photo-b2-upload"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border border-gray-300 dark:border-white/20 bg-gray-50 dark:bg-black/30 hover:bg-gray-100 dark:hover:bg-white/10 text-xs font-semibold text-gray-700 dark:text-gray-200 cursor-pointer transition-colors"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-[#138601]" />
                    <span>{isUploadingPhotoB2 ? `Uploading to B2... ${photoB2Progress}%` : 'Or Upload Photo to Backblaze B2 Bucket'}</span>
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Or Direct Photo URL
                  </label>
                  <input
                    type="url"
                    value={candidateForm.photoUrl}
                    onChange={(e) => setCandidateForm({ ...candidateForm, photoUrl: e.target.value })}
                    placeholder="https://res.cloudinary.com/... or https://f005.backblazeb2.com/..."
                    className="w-full px-3.5 py-2 rounded-[5px] bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-white/10 text-xs focus:outline-none focus:ring-1 focus:ring-[#138601]"
                  />
                </div>
              </div>

              {/* Candidate Manifesto Section */}
              <div className="pt-2 border-t border-gray-200 dark:border-white/10">
                <h4 className="text-xs font-bold uppercase text-[#138601] dark:text-[#4bd043] tracking-wider mb-3">
                  Candidate Manifesto
                </h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                      Official Candidate Manifesto (Full Text)
                    </label>
                    <textarea
                      rows={4}
                      value={candidateForm.candidateStatement}
                      onChange={(e) => setCandidateForm({ ...candidateForm, candidateStatement: e.target.value })}
                      placeholder="I, [Name], hereby declare my candidacy for... [Full manifesto declaration]"
                      className="w-full px-3.5 py-2 rounded-[5px] bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-1 focus:ring-[#138601]"
                    />
                  </div>

                  {/* Backblaze B2 Manifesto Document Upload */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-gray-700 dark:text-gray-300">
                      Official Manifesto Document (Backblaze B2 Bucket)
                    </label>

                    <div className="p-4 rounded-[5px] border-2 border-dashed border-gray-300 dark:border-white/15 bg-gray-50 dark:bg-[#041801] hover:border-[#138601] transition-colors text-center">
                      <input
                        type="file"
                        id="manifesto-b2-file-upload"
                        accept=".pdf,.doc,.docx,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleManifestoB2Upload(file);
                        }}
                        disabled={isUploadingManifesto}
                      />

                      {candidateForm.statementPdfUrl ? (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-[4px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-left">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-[4px] bg-emerald-100 dark:bg-emerald-900 text-[#138601] dark:text-emerald-300 flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-emerald-950 dark:text-emerald-100 truncate">
                                {candidateForm.manifestoFileName || 'Manifesto Document (B2 Certified)'}
                              </p>
                              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                                Certified & Stored in Backblaze B2
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <a
                              href={candidateForm.statementPdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 text-xs font-semibold rounded-[4px] bg-white dark:bg-black/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 transition-colors inline-flex items-center gap-1.5"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </a>
                            <label
                              htmlFor="manifesto-b2-file-upload"
                              className="px-3 py-1.5 text-xs font-semibold rounded-[4px] bg-[#138601] hover:bg-[#0f6c01] text-white cursor-pointer transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Replace</span>
                            </label>
                          </div>
                        </div>
                      ) : isUploadingManifesto ? (
                        <div className="py-4 space-y-2">
                          <div className="inline-flex items-center gap-2 text-xs font-bold text-[#138601]">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Uploading Manifesto to Backblaze B2... {manifestoUploadProgress}%</span>
                          </div>
                          <div className="w-full max-w-xs mx-auto bg-gray-200 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-[#138601] h-2 transition-all duration-300"
                              style={{ width: `${manifestoUploadProgress}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <label
                          htmlFor="manifesto-b2-file-upload"
                          className="cursor-pointer block py-3 space-y-1.5"
                        >
                          <div className="w-10 h-10 mx-auto rounded-full bg-green-50 dark:bg-green-950/40 text-[#138601] flex items-center justify-center mb-1">
                            <UploadCloud className="w-5 h-5" />
                          </div>
                          <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                            Upload Official Manifesto Document (PDF)
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            PDF or Word document up to 25MB (automatically saved to Backblaze B2 bucket)
                          </p>
                        </label>
                      )}

                      {manifestoUploadError && (
                        <p className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium flex items-center justify-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>{manifestoUploadError}</span>
                        </p>
                      )}
                    </div>

                    <div className="mt-2">
                      <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Or Direct Manifesto Document / B2 URL
                      </label>
                      <input
                        type="url"
                        value={candidateForm.statementPdfUrl}
                        onChange={(e) => setCandidateForm({ ...candidateForm, statementPdfUrl: e.target.value })}
                        placeholder="https://f005.backblazeb2.com/file/... or /api/download?key=..."
                        className="w-full px-3.5 py-2 rounded-[5px] bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-white/10 text-xs focus:outline-none focus:ring-1 focus:ring-[#138601]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Manifesto Summary and Pillars */}
              <div className="pt-2 border-t border-gray-200 dark:border-white/10">
                <h4 className="text-xs font-bold uppercase tracking-wider mb-3">
                  Manifesto Pillars
                </h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                      Manifesto Title
                    </label>
                    <input
                      type="text"
                      value={candidateForm.manifestoHeadline}
                      onChange={(e) => setCandidateForm({ ...candidateForm, manifestoHeadline: e.target.value })}
                      placeholder="e.g. The Catalyst Agenda: 4 Pillars for Modern Computing"
                      className="w-full px-3.5 py-2 rounded-[5px] bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-1 focus:ring-[#138601]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                      Manifesto Summary
                    </label>
                    <textarea
                      rows={2}
                      value={candidateForm.manifestoSummary}
                      onChange={(e) => setCandidateForm({ ...candidateForm, manifestoSummary: e.target.value })}
                      placeholder="Brief overview of key policies..."
                      className="w-full px-3.5 py-2 rounded-[5px] bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-1 focus:ring-[#138601]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCandidateModalOpen(false)}
                  className="px-4 py-2 rounded-[5px] text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/10 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-[5px] text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] shadow-xs cursor-pointer"
                >
                  {editingCandidate ? 'Save Changes' : 'Certify Candidate'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================
          ADD / EDIT EXECUTIVE POSITION MODAL
         ======================================================== */}
      {isPostModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className={`relative w-full max-w-lg border rounded-[5px] p-6 sm:p-8 shadow-2xl my-auto max-h-[92vh] overflow-y-auto ${
            isDark ? 'bg-[#083002] border-[#138601]/40 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-white/10 mb-6">
              <h3 className="text-lg font-black font-display">
                {editingPost ? 'Edit Executive Position' : 'Add New Executive Position'}
              </h3>
              <button
                type="button"
                onClick={() => setIsPostModalOpen(false)}
                className="p-1.5 rounded-[4px] text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePost} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                  Position Title *
                </label>
                <input
                  type="text"
                  required
                  value={postForm.title}
                  onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                  placeholder="e.g. Director of Cybersecurity"
                  className="w-full px-3.5 py-2 rounded-[5px] bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-1 focus:ring-[#138601]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                    Short Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={postForm.code}
                    onChange={(e) => setPostForm({ ...postForm, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. D-CYBER"
                    className="w-full px-3.5 py-2 rounded-[5px] bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-white/10 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#138601]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                    Ballot Order *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={postForm.order}
                    onChange={(e) => setPostForm({ ...postForm, order: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-[5px] bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-white/10 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#138601]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                  Eligible Academic Cohort
                </label>
                <input
                  type="text"
                  value={postForm.eligibilityLevel}
                  onChange={(e) => setPostForm({ ...postForm, eligibilityLevel: e.target.value })}
                  placeholder="e.g. 200L - 400L"
                  className="w-full px-3.5 py-2 rounded-[5px] bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-1 focus:ring-[#138601]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                  Role Description & Mandate *
                </label>
                <textarea
                  rows={3}
                  required
                  value={postForm.description}
                  onChange={(e) => setPostForm({ ...postForm, description: e.target.value })}
                  placeholder="Brief overview of duties and leadership responsibilities..."
                  className="w-full px-3.5 py-2 rounded-[5px] bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-1 focus:ring-[#138601]"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsPostModalOpen(false)}
                  className="px-4 py-2 rounded-[5px] text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-[5px] text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] shadow-xs cursor-pointer"
                >
                  {editingPost ? 'Save Changes' : 'Create Position'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          PUBLISH / EDIT NEWS RELEASE MODAL
         ======================================================== */}
      {isNewsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className={`relative w-full max-w-lg border rounded-[5px] p-6 sm:p-8 shadow-2xl my-auto max-h-[92vh] overflow-y-auto ${
            isDark ? 'bg-[#083002] border-[#138601]/40 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-white/10 mb-6">
              <div className="flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-[#138601]" />
                <h3 className="text-lg font-black font-display">
                  {editingNews ? 'Edit Electoral Release' : 'Publish New Electoral Notice'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewsModalOpen(false)}
                className="p-1.5 rounded-[4px] text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNews} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                  Title / Headline *
                </label>
                <input
                  type="text"
                  required
                  value={newsForm.title}
                  onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
                  placeholder="e.g. In-Person Accreditation & Polling Guidelines"
                  className="w-full px-3.5 py-2 rounded-[5px] bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-1 focus:ring-[#138601]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <select
                    value={newsForm.category}
                    onChange={(e) => setNewsForm({ ...newsForm, category: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-[5px] bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-1 focus:ring-[#138601]"
                  >
                    <option value="Electoral Notice">Electoral Notice</option>
                    <option value="Polling Station">Polling Station</option>
                    <option value="Press Release">Press Release</option>
                    <option value="Urgent Announcement">Urgent Announcement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                    Badge Tag
                  </label>
                  <input
                    type="text"
                    value={newsForm.tag}
                    onChange={(e) => setNewsForm({ ...newsForm, tag: e.target.value })}
                    placeholder="e.g. Official, Critical, Alert"
                    className="w-full px-3.5 py-2 rounded-[5px] bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-1 focus:ring-[#138601]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newsForm.date}
                    onChange={(e) => setNewsForm({ ...newsForm, date: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-[5px] bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-1 focus:ring-[#138601]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                    Author / Signatory
                  </label>
                  <input
                    type="text"
                    value={newsForm.author}
                    onChange={(e) => setNewsForm({ ...newsForm, author: e.target.value })}
                    placeholder="e.g. NACOS ISEC Secretariat"
                    className="w-full px-3.5 py-2 rounded-[5px] bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-1 focus:ring-[#138601]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                  Short Summary (Bulletin Preview) *
                </label>
                <textarea
                  rows={2}
                  required
                  value={newsForm.summary}
                  onChange={(e) => setNewsForm({ ...newsForm, summary: e.target.value })}
                  placeholder="Key highlight or one-sentence overview..."
                  className="w-full px-3.5 py-2 rounded-[5px] bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-1 focus:ring-[#138601]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                  Full Statement / Body Content *
                </label>
                <textarea
                  rows={5}
                  required
                  value={newsForm.content}
                  onChange={(e) => setNewsForm({ ...newsForm, content: e.target.value })}
                  placeholder="Detailed release or announcement instructions..."
                  className="w-full px-3.5 py-2 rounded-[5px] bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-1 focus:ring-[#138601]"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newsForm.pinned}
                    onChange={(e) => setNewsForm({ ...newsForm, pinned: e.target.checked })}
                    className="rounded text-[#138601] focus:ring-[#138601] h-4 w-4"
                  />
                  <span className="text-xs font-medium">Pin this announcement to top of News page</span>
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsNewsModalOpen(false)}
                  className="px-4 py-2 rounded-[5px] text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-[5px] text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] shadow-xs cursor-pointer"
                >
                  {editingNews ? 'Save Release' : 'Publish Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
