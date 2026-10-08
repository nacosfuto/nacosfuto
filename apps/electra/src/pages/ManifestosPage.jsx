import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  FileText, 
  Search, 
  ChevronDown,
  Vote
} from 'lucide-react';
import { getContestants, getElectraPosts, getActiveElection } from '@nacos/supabase/electraService';

export default function ManifestosPage({ onOpenManifesto, onOpenBallot }) {
  const navigate = useNavigate();
  const activeElection = getActiveElection();
  const allContestants = getContestants();
  const posts = getElectraPosts();

  const [selectedPost, setSelectedPost] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = allContestants.filter(c => {
    const postMatch = selectedPost === 'all' || c.postId === selectedPost;
    const searchMatch = !searchQuery.trim() || 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.runningPost?.toLowerCase().includes(searchQuery.toLowerCase());
    return postMatch && searchMatch;
  });

  return (
    <div className="py-8 sm:py-12 site-container bg-[#F8FAFC] min-h-screen">
      
      {/* Page Title Header */}
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
          Candidate Manifestos
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Official Electoral Registry • {activeElection.title || 'NACOS FUTO General Elections'}
        </p>
      </div>

      {/* Top Instruction & Office Dropdown Bar */}
      <div className="p-4 sm:p-5 rounded-[4px] bg-white border border-slate-200 shadow-2xs mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed max-w-2xl">
          Click to read each candidate's manifesto or use the menu to see the ones running to stand as the candidate for a particular office.
        </p>

        <div className="flex items-center gap-3 shrink-0">
          <label htmlFor="office-dropdown" className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">
            Office:
          </label>
          <div className="relative min-w-[220px]">
            <select
              id="office-dropdown"
              value={selectedPost}
              onChange={(e) => setSelectedPost(e.target.value)}
              className="w-full appearance-none pl-3.5 pr-10 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-[4px] text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#138601] transition-colors cursor-pointer"
            >
              <option value="all">All Contested Offices ({allContestants.length})</option>
              {posts.map((post) => {
                const count = allContestants.filter(c => c.postId === post.id).length;
                return (
                  <option key={post.id} value={post.id}>
                    {post.title} ({count})
                  </option>
                );
              })}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate by name..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-[4px] border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#138601]"
          />
        </div>
        <div className="text-xs font-semibold text-slate-500 shrink-0">
          Showing {filtered.length} Candidate{filtered.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Authoritative Candidate Manifesto Table */}
      <div className="bg-white rounded-[4px] border border-slate-300 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0a1b2a] text-white text-xs uppercase font-bold tracking-wider">
                <th scope="col" className="py-3.5 px-4 text-center border-r border-slate-800 w-20">
                  Image
                </th>
                <th scope="col" className="py-3.5 px-6 border-r border-slate-800">
                  Name
                </th>
                <th scope="col" className="py-3.5 px-6 border-r border-slate-800">
                  Position
                </th>
                <th scope="col" className="py-3.5 px-6 text-center w-48">
                  Candidate Manifesto
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500">
                    <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-800">No candidate records found</p>
                    <p className="text-xs text-slate-400">Choose a different office from the dropdown or clear the search.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((candidate, idx) => {
                  const isEven = idx % 2 === 1;
                  return (
                    <tr 
                      key={candidate.id}
                      className={`transition-colors border-b border-slate-200 ${
                        isEven ? 'bg-[#f8fafc]' : 'bg-white'
                      } hover:bg-slate-50`}
                    >
                      {/* Image (First Column) */}
                      <td className="py-2.5 px-4 text-center border-r border-slate-200/80 w-20">
                        <div className="w-12 h-12 rounded-[4px] overflow-hidden bg-slate-100 border border-slate-200 mx-auto shadow-2xs">
                          <img
                            src={candidate.photoUrl || candidate.imageUrl || '/default-avatar.png'}
                            alt={candidate.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = 'https://res.cloudinary.com/a2mmcttn/image/upload/v1788569274/nacos/executives/president_irechukwu.jpg';
                            }}
                          />
                        </div>
                      </td>

                      {/* Name */}
                      <td className="py-3.5 px-6 font-semibold text-slate-900 border-r border-slate-200/80">
                        {candidate.name}
                      </td>

                      {/* Position */}
                      <td className="py-3.5 px-6 font-medium text-slate-800 border-r border-slate-200/80">
                        {candidate.runningPost || 'Executive Office'}
                      </td>

                      {/* Candidate Manifesto */}
                      <td className="py-3.5 px-6 text-center">
                        <button
                          type="button"
                          onClick={() => onOpenManifesto(candidate)}
                          className="px-4 py-1.5 text-xs font-bold rounded-[4px] bg-[#138601] hover:bg-[#0f6c01] text-white transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                          title={`Click to read ${candidate.name}'s official manifesto`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Manifesto</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simple Bottom Banner */}
      <div className="mt-8 p-4 rounded-[4px] bg-white border border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span>All candidate manifestos are official records filed with the NACOS Electoral Commission.</span>
        <Link
          to="/vote"
          className="px-4 py-2 rounded-[4px] bg-[#138601] hover:bg-[#0f6c01] text-white font-bold transition-colors cursor-pointer shrink-0 inline-flex items-center gap-1.5"
        >
          <Vote className="w-3.5 h-3.5" />
          <span>Go to Ballot</span>
        </Link>
      </div>

    </div>
  );
}
