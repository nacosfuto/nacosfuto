import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Download, 
  ChevronDown,
  Eye,
  Award,
  Vote
} from 'lucide-react';
import { getContestants, getElectraPosts, getActiveElection } from '@nacos/supabase/electraService';

export default function ManifestosPage({ onOpenManifesto, onOpenBallot }) {
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
          Candidate Statements & Manifestos
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Official Electoral Registry • {activeElection.title || 'NACOS FUTO General Elections'}
        </p>
      </div>

      {/* Top Instruction & Office Dropdown Bar (Strictly matching reference Image 1) */}
      <div className="p-4 sm:p-5 rounded-[5px] bg-white border border-slate-200 shadow-2xs mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed max-w-2xl">
          Click to read each candidate's statement or use the menu to see the ones running to stand as the candidate for a particular office.
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
              className="w-full appearance-none pl-3.5 pr-10 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-[5px] text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#138601] transition-colors cursor-pointer"
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

      {/* Optional Search Bar */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate by name..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-[5px] border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#138601]"
          />
        </div>
        <div className="text-xs font-semibold text-slate-500 shrink-0">
          Showing {filtered.length} Candidate{filtered.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Authoritative Candidate Statement Table (Strictly matching Image 1 layout) */}
      <div className="bg-white rounded-[5px] border border-slate-300 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            {/* Table Header: Dark Navy/Blue background matching Image 1 */}
            <thead>
              <tr className="bg-[#1e3a8a] text-white text-xs uppercase font-bold tracking-wider">
                <th scope="col" className="py-3 px-4 w-20 text-center border-r border-blue-900/50">
                  Photo
                </th>
                <th scope="col" className="py-3 px-6 border-r border-blue-900/50">
                  Candidate's Name
                </th>
                <th scope="col" className="py-3 px-6 border-r border-blue-900/50">
                  Electoral District / Office
                </th>
                <th scope="col" className="py-3 px-6 text-right w-44">
                  Candidate's Statement
                </th>
              </tr>
            </thead>

            {/* Table Body: Alternating whites and subtle greys with clean borders */}
            <tbody className="divide-y divide-slate-200 text-xs">
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
                      } hover:bg-green-50/30`}
                    >
                      {/* Column 1: Candidate Photo (SQUARE with subtle rounded corners 5px, NOT circle) */}
                      <td className="py-3 px-4 text-center border-r border-slate-200/80">
                        <div className="w-12 h-12 rounded-[5px] overflow-hidden border border-slate-300 shadow-2xs mx-auto bg-slate-100 shrink-0">
                          <img
                            src={candidate.photoUrl || 'https://res.cloudinary.com/a2mmcttn/image/upload/v1788569274/nacos/executives/president_irechukwu.jpg'}
                            alt={candidate.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = 'https://res.cloudinary.com/a2mmcttn/image/upload/v1788569274/nacos/executives/president_irechukwu.jpg';
                            }}
                          />
                        </div>
                      </td>

                      {/* Column 2: Candidate's Name */}
                      <td className="py-3.5 px-6 font-semibold text-slate-900 text-sm border-r border-slate-200/80">
                        <div className="font-bold text-slate-900 leading-snug">
                          {candidate.name}
                        </div>
                        {candidate.slogan && (
                          <div className="text-[11px] text-slate-500 italic font-normal line-clamp-1 mt-0.5">
                            "{candidate.slogan}"
                          </div>
                        )}
                      </td>

                      {/* Column 3: Contested Office / Electoral District */}
                      <td className="py-3.5 px-6 font-medium text-slate-800 border-r border-slate-200/80">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                          <Award className="w-3 h-3 text-[#138601]" />
                          <span>{candidate.runningPost || 'Executive Office'}</span>
                        </span>
                      </td>

                      {/* Column 4: Candidate's Statement (Show Button) */}
                      <td className="py-3.5 px-6 text-right">
                        <button
                          type="button"
                          onClick={() => onOpenManifesto(candidate)}
                          className="px-4 py-1.5 text-xs font-bold rounded-[5px] bg-slate-100 hover:bg-[#138601] hover:text-white text-slate-800 border border-slate-300 hover:border-[#138601] transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
                          title={`Click to read ${candidate.name}'s official statement`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Show</span>
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
      <div className="mt-8 p-4 rounded-[5px] bg-white border border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span>All candidate statements and manifestos are official records filed with the NACOS Electoral Commission.</span>
        {onOpenBallot && (
          <button
            type="button"
            onClick={() => onOpenBallot()}
            className="px-4 py-2 rounded-[5px] bg-[#138601] hover:bg-[#0f6c01] text-white font-bold transition-colors cursor-pointer shrink-0"
          >
            Go to Ballot
          </button>
        )}
      </div>

    </div>
  );
}
