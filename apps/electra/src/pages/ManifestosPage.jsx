import React, { useState } from 'react';
import { 
  FileText, 
  Target, 
  Sparkles, 
  Vote, 
  ArrowRight, 
  Search,
  Download,
  Award
} from 'lucide-react';
import { getContestants, getElectraPosts } from '@nacos/supabase/electraService';

export default function ManifestosPage({ onOpenManifesto, onOpenBallot }) {
  const allContestants = getContestants();
  const posts = getElectraPosts();

  const [selectedPost, setSelectedPost] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = allContestants.filter(c => {
    const postMatch = selectedPost === 'all' || c.postId === selectedPost;
    const searchMatch = !search || 
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.manifesto?.headline?.toLowerCase().includes(search.toLowerCase());
    return postMatch && searchMatch;
  });

  return (
    <div className="py-10 site-container">
      
      {/* Header */}
      <div className="mb-10 space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-[#1e2025] text-gray-900 dark:text-[#c6ff00]">
          <FileText className="w-3.5 h-3.5 text-[#c6ff00]" />
          <span>Electoral Document Archive</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-gray-950 dark:text-white font-display">
          Certified Candidate Manifestos
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
          Examine the strategic agendas, pillars, and policy commitments of every candidate running for departmental leadership.
        </p>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-8">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none w-full md:w-auto">
          <button
            type="button"
            onClick={() => setSelectedPost('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedPost === 'all'
                ? 'bg-[#c6ff00] text-black font-black shadow-sm'
                : 'bg-white dark:bg-[#141518] text-gray-700 dark:text-gray-400 hover:text-black dark:hover:text-white border border-gray-200 dark:border-[#22252a]'
            }`}
          >
            All Positions
          </button>
          {posts.map(post => (
            <button
              key={post.id}
              type="button"
              onClick={() => setSelectedPost(post.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedPost === post.id
                  ? 'bg-[#c6ff00] text-black font-black shadow-sm'
                  : 'bg-white dark:bg-[#141518] text-gray-700 dark:text-gray-400 hover:text-black dark:hover:text-white border border-gray-200 dark:border-[#22252a]'
              }`}
            >
              {post.title}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search manifesto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#141518] border border-gray-200 dark:border-[#22252a] text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#c6ff00] transition-colors"
          />
        </div>
      </div>

      {/* Manifestos List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((cnd) => {
          const manifesto = cnd.manifesto || {
            headline: `${cnd.name}'s Campaign Manifesto`,
            summary: cnd.bio || 'Leading with competence, student welfare, and technological empowerment.',
            pillars: []
          };

          return (
            <div
              key={cnd.id}
              className="p-7 rounded-3xl bg-white dark:bg-[#141518] border border-gray-200 dark:border-[#22252a] hover:border-[#c6ff00] dark:hover:border-[#c6ff00]/40 transition-all flex flex-col justify-between group shadow-lg shadow-gray-200/40 dark:shadow-xl"
            >
              <div className="space-y-4 mb-6">
                
                {/* Author Badge */}
                <div className="flex items-center gap-3.5">
                  <img
                    src={cnd.photoUrl}
                    alt={cnd.name}
                    className="w-12 h-12 rounded-xl object-cover border border-gray-200 dark:border-[#2b2e38]"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                      {cnd.name}
                    </h3>
                    <p className="text-[11px] text-emerald-600 dark:text-[#c6ff00] font-mono">
                      Candidate for {cnd.runningPost}
                    </p>
                  </div>
                </div>

                {/* Headline */}
                <div className="space-y-1.5 pt-1">
                  <h2 className="text-xl font-black text-gray-950 dark:text-white font-display leading-snug group-hover:text-[#c6ff00] transition-colors">
                    "{manifesto.headline}"
                  </h2>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">
                    {manifesto.summary}
                  </p>
                </div>

                {/* Pillars Preview */}
                {manifesto.pillars && manifesto.pillars.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block">
                      Core Strategic Pillars:
                    </span>
                    <div className="space-y-1.5">
                      {manifesto.pillars.slice(0, 2).map((p, pIdx) => (
                        <div key={pIdx} className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#1b1c21] border border-gray-200 dark:border-[#262830] flex items-center gap-2.5 text-xs text-gray-700 dark:text-gray-300">
                          <span className="w-5 h-5 rounded-md bg-[#c6ff00]/25 dark:bg-[#c6ff00]/15 text-gray-900 dark:text-[#c6ff00] font-bold text-[10px] flex items-center justify-center shrink-0">
                            0{pIdx + 1}
                          </span>
                          <span className="font-semibold truncate">{p.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Bottom Actions */}
              <div className="pt-4 border-t border-gray-200 dark:border-[#22252a] flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onOpenManifesto(cnd)}
                  className="px-5 py-2.5 rounded-full text-xs font-black text-black bg-[#c6ff00] hover:bg-[#b2e600] transition-transform transform active:scale-95 cursor-pointer shadow-md shadow-[#c6ff00]/20"
                >
                  Read Full Manifesto
                </button>

                <button
                  type="button"
                  onClick={() => onOpenBallot(cnd)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
                >
                  <Vote className="w-3.5 h-3.5 text-emerald-600 dark:text-[#c6ff00]" />
                  <span>Vote Candidate</span>
                </button>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
