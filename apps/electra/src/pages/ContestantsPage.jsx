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
      <div className="mb-10 space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-[#F5F3FF] text-[#684BFD] border border-[#DDD6FE]">
          <Vote className="w-3.5 h-3.5 text-[#684BFD]" />
          <span>Electoral Commission Certified</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 font-display">
          Certified Aspirants & Candidates
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
          Review candidates for each executive office, inspect verified academic credentials, and explore their policy manifestos.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center mb-8">
        
        {/* Office Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedPostFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedPostFilter === 'all'
                ? 'bg-[#684BFD] text-white font-black shadow-sm shadow-[#684BFD]/25'
                : 'bg-white text-slate-700 hover:text-[#684BFD] border border-slate-200'
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
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedPostFilter === post.id
                    ? 'bg-[#684BFD] text-white font-black shadow-sm shadow-[#684BFD]/25'
                    : 'bg-white text-slate-700 hover:text-[#684BFD] border border-slate-200'
                }`}
              >
                <span>{post.title}</span>
                <span className="ml-1.5 opacity-60">({count})</span>
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
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#684BFD] transition-colors"
          />
        </div>

      </div>

      {/* Contestants Grid */}
      {filteredContestants.length === 0 ? (
        <div className="py-20 text-center rounded-3xl bg-white border border-slate-200">
          <Vote className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900 mb-1">No candidates match your criteria</h3>
          <p className="text-xs text-slate-500">Try adjusting your filters or search keywords.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContestants.map((cnd) => (
            <div
              key={cnd.id}
              className="p-6 rounded-3xl bg-white border border-[#DDD6FE] hover:border-[#684BFD] transition-all flex flex-col justify-between group shadow-sm hover:shadow-lg hover:shadow-[#684BFD]/10"
            >
              <div>
                {/* Photo & Post Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 group-hover:scale-105 transition-transform">
                    <img
                      src={cnd.photoUrl}
                      alt={cnd.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#F5F3FF] text-[#684BFD] border border-[#DDD6FE] mb-1">
                      {cnd.runningPost}
                    </span>
                    <h3 className="text-lg font-black text-slate-900 font-display truncate">
                      {cnd.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      {cnd.level} • {cnd.matricNumber}
                    </p>
                  </div>
                </div>

                {/* Slogan */}
                <p className="text-xs text-slate-700 font-medium italic mb-4 line-clamp-2 pl-2 border-l-2 border-[#684BFD]">
                  "{cnd.slogan || 'Committed to forward-thinking leadership'}"
                </p>

                {/* Manifesto Summary Preview */}
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 mb-6">
                  {cnd.manifesto?.summary || cnd.bio || 'Official policy plans for the upcoming administration.'}
                </p>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onOpenManifesto(cnd)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#684BFD] transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-[#684BFD]" />
                  <span>Read Manifesto</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenBallot(cnd)}
                  className="px-4 py-2 rounded-full text-xs font-black text-white bg-[#684BFD] hover:bg-[#5537F8] transition-transform transform active:scale-95 cursor-pointer shadow-md shadow-[#684BFD]/20"
                >
                  Select & Vote
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
