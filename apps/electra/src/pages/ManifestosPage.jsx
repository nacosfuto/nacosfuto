import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Download, 
  ExternalLink,
  ChevronDown,
  Eye,
  Vote,
  Award,
  Sparkles,
  Filter
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
      c.runningPost?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.slogan && c.slogan.toLowerCase().includes(searchQuery.toLowerCase()));
    return postMatch && searchMatch;
  });

  return (
    <div className="py-8 sm:py-12 site-container bg-[#F8FAFC] min-h-screen">
      
      {/* Page Header */}
      <div className="mb-6 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#F5F3FF] text-[#684BFD] border border-[#DDD6FE]">
          <FileText className="w-3.5 h-3.5 text-[#684BFD]" />
          <span>Official Candidate Statements • {activeElection.session || '2026/2027'}</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 font-display">
          Certified Candidate Statements & Manifestos
        </h1>
      </div>

      {/* Instructional Top Bar & Dropdown Filter (Matching reference layout) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-gray-200/90 shadow-xs mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed max-w-2xl">
          Click to read each candidate's statement or use the menu to see the ones running to stand as the candidate for a particular office.
        </p>

        <div className="flex items-center gap-3 shrink-0">
          <label htmlFor="office-filter" className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">
            Filter Office:
          </label>
          <div className="relative min-w-[220px]">
            <select
              id="office-filter"
              value={selectedPost}
              onChange={(e) => setSelectedPost(e.target.value)}
              className="w-full appearance-none pl-3.5 pr-10 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#684BFD] transition-colors cursor-pointer"
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

      {/* Search Input Bar */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate by name, office, or vision..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#684BFD] shadow-2xs"
          />
        </div>
        <div className="text-xs font-semibold text-slate-500 shrink-0">
          Displaying {filtered.length} Candidate{filtered.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Authoritative Candidate Statement Table (Directly matching Image 1) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            {/* Table Header with Deep Blue/Purple styling */}
            <thead>
              <tr className="bg-[#1e3a8a] text-white text-xs uppercase font-bold tracking-wider">
                <th scope="col" className="py-3.5 px-4 w-16 text-center">
                  Photo
                </th>
                <th scope="col" className="py-3.5 px-6">
                  Candidate's Name
                </th>
                <th scope="col" className="py-3.5 px-6">
                  Contested Office
                </th>
                <th scope="col" className="py-3.5 px-6 text-right w-48">
                  Candidate's Statement
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-gray-200/80 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500">
                    <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-800">No candidates found for this office</p>
                    <p className="text-xs text-slate-400">Try choosing a different office or clearing your search.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((candidate, idx) => {
                  return (
                    <tr 
                      key={candidate.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                      }`}
                    >
                      {/* Column 1: Candidate Photo in Circle */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-slate-200 shadow-2xs mx-auto bg-slate-100 shrink-0">
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
                      <td className="py-3.5 px-6 font-semibold text-slate-900 text-sm">
                        <div className="font-bold text-slate-900 leading-snug">
                          {candidate.name}
                        </div>
                        {candidate.slogan && (
                          <div className="text-[11px] text-slate-500 italic font-normal line-clamp-1 mt-0.5">
                            "{candidate.slogan}"
                          </div>
                        )}
                      </td>

                      {/* Column 3: Contested Office */}
                      <td className="py-3.5 px-6 font-medium text-slate-800">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                          <Award className="w-3 h-3 text-[#684BFD]" />
                          <span>{candidate.runningPost || 'Executive Office'}</span>
                        </span>
                      </td>

                      {/* Column 4: Show / View Statement Button */}
                      <td className="py-3.5 px-6 text-right">
                        <button
                          type="button"
                          onClick={() => onOpenManifesto(candidate)}
                          className="px-5 py-2 text-xs font-bold rounded-lg bg-gradient-to-b from-slate-100 to-slate-200 hover:from-[#684BFD] hover:to-[#5537F8] hover:text-white text-slate-800 border border-slate-300 hover:border-[#684BFD] transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
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

      {/* Information Banner */}
      <div className="mt-8 p-4 rounded-xl bg-purple-50/60 border border-purple-200/80 text-xs text-purple-900 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#684BFD] shrink-0" />
          <span>All published candidate statements are certified and cryptographically audited by the Electoral Commission (UNECO).</span>
        </div>
        {onOpenBallot && (
          <button
            type="button"
            onClick={() => onOpenBallot()}
            className="px-3.5 py-1.5 rounded-lg bg-[#684BFD] hover:bg-[#5537F8] text-white font-bold transition-colors cursor-pointer shrink-0"
          >
            Vote Now
          </button>
        )}
      </div>

    </div>
  );
}
