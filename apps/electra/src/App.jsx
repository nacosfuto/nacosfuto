import React, { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import ElectraNavbar from './components/ElectraNavbar';
import ConnectNacosModal from './components/ConnectNacosModal';
import ManifestoModal from './components/ManifestoModal';
import BallotVotingModal from './components/BallotVotingModal';
import ElectraHome from './pages/ElectraHome';
import ContestantsPage from './pages/ContestantsPage';
import ManifestosPage from './pages/ManifestosPage';
import LiveResultsPage from './pages/LiveResultsPage';
import GuidelinesPage from './pages/GuidelinesPage';
import { 
  getActiveElection, 
  fetchLiveElectraData, 
  getVoterBallot 
} from '@nacos/supabase/electraService';
import { getAppUrls } from '@nacos/config/urls';
import { Vote, ShieldCheck, Lock, CheckCircle2, ChevronRight } from 'lucide-react';

const VOTER_SESSION_KEY = 'nacos_electra_voter_session';

export class ElectraErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ELECTRA ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-white border border-[#DDD6FE] rounded-3xl p-8 text-center space-y-5 shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-[#684BFD]/10 text-[#684BFD] border border-[#DDD6FE] flex items-center justify-center mx-auto text-2xl font-black">
              !
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-black text-slate-900 font-display">ELECTRA Ballot Engine</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                {this.state.error?.message || 'A render issue occurred while loading election data.'}
              </p>
            </div>
            <div className="pt-2 flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#684BFD] hover:bg-[#5537F8] text-white transition-colors cursor-pointer shadow-md shadow-[#684BFD]/25"
              >
                Reload Polls
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem('nacos_electra_elections_db');
                    localStorage.removeItem('nacos_electra_posts_db');
                    localStorage.removeItem('nacos_electra_contestants_db');
                  } catch (_) {}
                  window.location.href = '/electra';
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                Reset Cache & Return
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const urls = getAppUrls();
  const [election, setElection] = useState(() => getActiveElection());
  const [voter, setVoter] = useState(() => {
    try {
      const saved = localStorage.getItem(VOTER_SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [isManifestoOpen, setIsManifestoOpen] = useState(false);
  const [activeManifestoCandidate, setActiveManifestoCandidate] = useState(null);
  const [isBallotOpen, setIsBallotOpen] = useState(false);
  const [targetCandidate, setTargetCandidate] = useState(null);

  // Sync Supabase live election data on mount
  useEffect(() => {
    fetchLiveElectraData().then(({ election: liveEl }) => {
      if (liveEl) setElection(liveEl);
    }).catch(console.error);

    const handleElectionUpdate = () => {
      setElection(getActiveElection());
    };
    window.addEventListener('nacos_electra_election_updated', handleElectionUpdate);
    return () => {
      window.removeEventListener('nacos_electra_election_updated', handleElectionUpdate);
    };
  }, []);

  const handleConnectVoter = (voterData) => {
    setVoter(voterData);
    try {
      localStorage.setItem(VOTER_SESSION_KEY, JSON.stringify(voterData));
    } catch (_) {}
  };

  const handleDisconnectVoter = () => {
    setVoter(null);
    try {
      localStorage.removeItem(VOTER_SESSION_KEY);
    } catch (_) {}
  };

  const handleOpenManifesto = (contestant) => {
    setActiveManifestoCandidate(contestant);
    setIsManifestoOpen(true);
  };

  const handleOpenBallot = (candidate = null) => {
    setTargetCandidate(candidate);
    setIsBallotOpen(true);
  };

  const renderHome = () => (
    <ElectraHome
      election={election}
      onOpenBallot={handleOpenBallot}
      onOpenManifesto={handleOpenManifesto}
      onRequireConnect={() => setIsConnectOpen(true)}
    />
  );

  const renderContestants = () => (
    <ContestantsPage
      onOpenBallot={handleOpenBallot}
      onOpenManifesto={handleOpenManifesto}
    />
  );

  const renderManifestos = () => (
    <ManifestosPage
      onOpenManifesto={handleOpenManifesto}
      onOpenBallot={handleOpenBallot}
    />
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-[#684BFD] selection:text-white">
      
      {/* Top Navbar */}
      <ElectraNavbar
        voter={voter}
        onOpenConnect={() => setIsConnectOpen(true)}
        onDisconnect={handleDisconnectVoter}
      />

      {/* Main Page Content */}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={renderHome()} />
          <Route path="/electra" element={renderHome()} />
          <Route path="/contestants" element={renderContestants()} />
          <Route path="/electra/contestants" element={renderContestants()} />
          <Route path="/manifestos" element={renderManifestos()} />
          <Route path="/electra/manifestos" element={renderManifestos()} />
          <Route path="/results" element={<LiveResultsPage />} />
          <Route path="/electra/results" element={<LiveResultsPage />} />
          <Route path="/guidelines" element={<GuidelinesPage />} />
          <Route path="/electra/guidelines" element={<GuidelinesPage />} />
          <Route path="*" element={renderHome()} />
        </Routes>
      </main>

      {/* Global Modals */}
      <ConnectNacosModal
        isOpen={isConnectOpen}
        onClose={() => setIsConnectOpen(false)}
        onConnect={handleConnectVoter}
      />

      <ManifestoModal
        contestant={activeManifestoCandidate}
        isOpen={isManifestoOpen}
        onClose={() => {
          setIsManifestoOpen(false);
          setActiveManifestoCandidate(null);
        }}
        onSelectVote={(candidate) => {
          setIsManifestoOpen(false);
          handleOpenBallot(candidate);
        }}
      />

      <BallotVotingModal
        isOpen={isBallotOpen}
        onClose={() => {
          setIsBallotOpen(false);
          setTargetCandidate(null);
        }}
        voter={voter}
        targetCandidate={targetCandidate}
        onRequireConnect={() => {
          setIsBallotOpen(false);
          setIsConnectOpen(true);
        }}
        onVoteCastSuccess={(receipt) => {
          console.log('Ballot cast receipt:', receipt);
        }}
      />

      {/* Light Mode Footer with Purple Accents */}
      <footer className="mt-20 border-t border-slate-200 bg-white py-12 text-xs text-slate-500">
        <div className="site-container flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#684BFD] text-white flex items-center justify-center font-black shadow-md shadow-[#684BFD]/25">
              <Vote className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-sm font-display tracking-wide">
                ELECTRA
              </span>
              <p className="text-[10px] text-slate-500">
                Official Electoral Engine • NACOS FUTO
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-slate-600">
            <Link to="/" className="hover:text-[#684BFD] font-medium transition-colors">Live Polls</Link>
            <Link to="/contestants" className="hover:text-[#684BFD] font-medium transition-colors">Contestants</Link>
            <Link to="/manifestos" className="hover:text-[#684BFD] font-medium transition-colors">Manifestos</Link>
            <Link to="/results" className="hover:text-[#684BFD] font-medium transition-colors">Audit Results</Link>
            <Link to="/guidelines" className="hover:text-[#684BFD] font-medium transition-colors">Guidelines</Link>
            <a href={urls.electraAdmin} className="text-[#684BFD] font-bold hover:underline">Commission Admin</a>
          </div>

          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Cryptographically Verified Ballots</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
