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
    <div className="py-10 site-container">
      
      {/* Page Header */}
      <div className="mb-10 space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-[#1e2025] text-gray-900 dark:text-[#c6ff00]">
          <Vote className="w-3.5 h-3.5 text-[#c6ff00]" />
          <span>Electoral Commission Certified</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-gray-950 dark:text-white font-display">
          Certified Aspirants & Candidates
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
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
                ? 'bg-[#c6ff00] text-black font-black shadow-sm'
                : 'bg-white dark:bg-[#141518] text-gray-700 dark:text-gray-400 hover:text-black dark:hover:text-white border border-gray-200 dark:border-[#22252a]'
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
                    ? 'bg-[#c6ff00] text-black font-black shadow-sm'
                    : 'bg-white dark:bg-[#141518] text-gray-700 dark:text-gray-400 hover:text-black dark:hover:text-white border border-gray-200 dark:border-[#22252a]'
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
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search candidate name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#141518] border border-gray-200 dark:border-[#22252a] text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#c6ff00] transition-colors"
          />
        </div>

      </div>

      {/* Contestants Grid */}
      {filteredContestants.length === 0 ? (
        <div className="py-20 text-center rounded-3xl bg-white dark:bg-[#121316] border border-gray-200 dark:border-[#22252a]">
          <Vote className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No candidates match your criteria</h3>
          <p className="text-xs text-gray-500">Try adjusting your filters or search keywords.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContestants.map((cnd) => (
            <div
              key={cnd.id}
              className="p-6 rounded-3xl bg-white dark:bg-[#141518] border border-gray-200 dark:border-[#22252a] hover:border-[#c6ff00] dark:hover:border-[#c6ff00]/40 transition-all flex flex-col justify-between group shadow-lg shadow-gray-200/40 dark:shadow-xl"
            >
              <div>
                {/* Photo & Post Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 dark:bg-[#22252a] border border-gray-200 dark:border-[#2a2d36] shrink-0 group-hover:scale-105 transition-transform">
                    <img
                      src={cnd.photoUrl}
                      alt={cnd.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#c6ff00]/25 dark:bg-[#c6ff00]/15 text-gray-900 dark:text-[#c6ff00] mb-1">
                      {cnd.runningPost}
                    </span>
                    <h3 className="text-lg font-black text-gray-950 dark:text-white font-display truncate">
                      {cnd.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                      {cnd.level} • {cnd.matricNumber}
                    </p>
                  </div>
                </div>

                {/* Slogan */}
                <p className="text-xs text-gray-700 dark:text-gray-300 font-medium italic mb-4 line-clamp-2 pl-2 border-l-2 border-[#c6ff00]">
                  "{cnd.slogan || 'Committed to forward-thinking leadership'}"
                </p>

                {/* Manifesto Summary Preview */}
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3 mb-6">
                  {cnd.manifesto?.summary || cnd.bio || 'Official policy plans for the upcoming administration.'}
                </p>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-gray-200 dark:border-[#22252a] flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onOpenManifesto(cnd)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-[#c6ff00]" />
                  <span>Read Manifesto</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenBallot(cnd)}
                  className="px-4 py-2 rounded-full text-xs font-black text-black bg-[#c6ff00] hover:bg-[#b2e600] transition-transform transform active:scale-95 cursor-pointer shadow-md shadow-[#c6ff00]/20"
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
