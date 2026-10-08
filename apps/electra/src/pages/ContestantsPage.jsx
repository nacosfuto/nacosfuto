import React, { useState } from 'react';
import { 
  Vote, 
  Award, 
  FileText, 
  Search, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight,
  Filter
} from 'lucide-react';
import { getElectraPosts, getContestants } from '@nacos/supabase/electraService';

export default function ContestantsPage({ onOpenBallot, onOpenManifesto }) {
  const posts = getElectraPosts();
  const allContestants = getContestants();

  const [selectedPostFilter, setSelectedPostFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredContestants = allContestants.filter(c => {
    const matchesPost = selectedPostFilter === 'all' || c.postId === selectedPostFilter;
    const matchesSearch = !searchQuery || 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.runningPost.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.slogan && c.slogan.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesPost && matchesSearch;
  });

  return (
    <div className="py-10 site-container bg-[#F8FAFC]">
      
      {/* Page Header */}
      <div className="mb-8 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[4px] text-xs font-bold bg-green-50 text-[#138601] border border-green-200">
          <Vote className="w-3.5 h-3.5 text-[#138601]" />
          <span>Electoral Commission Certified</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 font-display">
          Certified Aspirants & Candidates
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
          Review candidates for each executive office, inspect verified academic credentials, and explore their policy manifestos.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center mb-8">
        
        {/* Office Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedPostFilter('all')}
            className={`px-3 py-1.5 rounded-[5px] text-xs font-bold transition-all cursor-pointer ${
              selectedPostFilter === 'all'
                ? 'bg-[#138601] text-white shadow-xs'
                : 'bg-white text-slate-700 hover:text-[#138601] border border-slate-200'
            }`}
          >
            All Positions ({allContestants.length})
          </button>
          {posts.map((post) => {
            const count = allContestants.filter(c => c.postId === post.id).length;
            return (
              <button
                key={post.id}
                type="button"
                onClick={() => setSelectedPostFilter(post.id)}
                className={`px-3 py-1.5 rounded-[5px] text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedPostFilter === post.id
                    ? 'bg-[#138601] text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:text-[#138601] border border-slate-200'
                }`}
              >
                <span>{post.title}</span>
                <span className="ml-1 opacity-60">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64 shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search candidate name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-[5px] bg-white border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#138601] transition-colors"
          />
        </div>

      </div>

      {/* Contestants Grid */}
      {filteredContestants.length === 0 ? (
        <div className="py-16 text-center rounded-[5px] bg-white border border-slate-200">
          <Vote className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-900 mb-1">No candidates match your criteria</h3>
          <p className="text-xs text-slate-500">Try adjusting your filters or search keywords.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContestants.map((cnd) => (
            <div
              key={cnd.id}
              className="p-5 sm:p-6 rounded-[5px] bg-white border border-slate-200 hover:border-[#138601] transition-all flex flex-col justify-between group shadow-xs hover:shadow-md"
            >
              <div>
                {/* Photo & Post Header */}
                <div className="flex items-start gap-4 mb-4">
                  {/* Square with subtle curved corners (5px) */}
                  <div className="w-16 h-16 rounded-[5px] overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                    <img
                      src={cnd.photoUrl}
                      alt={cnd.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="inline-block px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider bg-green-50 text-[#138601] border border-green-200 mb-1">
                      {cnd.runningPost}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 font-display truncate">
                      {cnd.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      {cnd.level} • {cnd.matricNumber}
                    </p>
                  </div>
                </div>

                {/* Slogan */}
                {cnd.slogan && (
                  <p className="text-xs text-slate-700 font-medium italic mb-3 line-clamp-2 pl-2 border-l-2 border-[#138601]">
                    "{cnd.slogan}"
                  </p>
                )}

                {/* Manifesto Summary Preview */}
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 mb-5">
                  {cnd.bio || 'Official policy plans for the upcoming administration.'}
                </p>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onOpenManifesto(cnd)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#138601] transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-[#138601]" />
                  <span>Statement PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenBallot(cnd)}
                  className="px-3.5 py-1.5 rounded-[5px] text-xs font-bold text-white bg-[#138601] hover:bg-[#0f6c01] cursor-pointer shadow-xs transition-colors"
                >
                  Vote
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
