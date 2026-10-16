import React, { useState, useEffect } from 'react';
import WebsiteAdminLayout from '../components/WebsiteAdminLayout';
import { History, Search, Filter, RefreshCw, ShieldCheck, Clock, Loader } from 'lucide-react';
import { getAdminAuditLogs } from '@nacos/supabase/adminAuth';

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    const data = await getAdminAuditLogs('all', 100);
    setLogs(data || []);
    setLoading(false);
  };

  const filteredLogs = logs.filter(log => {
    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch = !q || 
      (log.admin_email && log.admin_email.toLowerCase().includes(q)) ||
      (log.action && log.action.toLowerCase().includes(q)) ||
      (log.resource_type && log.resource_type.toLowerCase().includes(q)) ||
      (log.resource_id && log.resource_id.toLowerCase().includes(q));
    return matchesAction && matchesSearch;
  });

  return (
    <WebsiteAdminLayout
      title="System Audit Trail"
      subtitle="Complete chronological record of all administrative actions, content updates, and media events."
    >
      <div className="space-y-6">
        
        {/* Controls Bar */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={loadLogs}
              className="p-2 rounded-lg bg-gray-100 dark:bg-[#041801] hover:bg-gray-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>

            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-[#041801] border-0 text-gray-800 dark:text-green-200 cursor-pointer"
            >
              <option value="ALL">All Actions</option>
              <option value="image_upload">Image Uploads</option>
              <option value="image_deleted">Image Deletions</option>
              <option value="article_created">Article Created</option>
              <option value="article_published">Article Published</option>
              <option value="event_created">Event Created</option>
              <option value="gallery_created">Gallery Created</option>
              <option value="homepage_content_updated">Homepage Updated</option>
              <option value="admin_invited">Admin Invited</option>
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search by email or resource..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-xs text-gray-500">
              <Loader className="w-6 h-6 animate-spin text-[#138601] mx-auto mb-2" />
              Loading audit entries...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-500 dark:text-green-200/70">
              No audit logs recorded for this criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-[#041801] border-b border-gray-200 dark:border-[#138601]/30 text-gray-600 dark:text-green-200/80 uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Administrator</th>
                    <th className="py-3 px-4">Scope</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Resource</th>
                    <th className="py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#138601]/20">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-[#041801]/40">
                      <td className="py-3 px-4 text-gray-500 dark:text-green-200/70 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">
                        {log.admin_email}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#138601]/20 text-[#138601] dark:text-[#4bd043]">
                          {log.scope}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-gray-800 dark:text-gray-200 text-[11px]">
                        {log.action}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-green-200/80">
                        {log.resource_type}: {log.resource_id || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-gray-400 font-mono text-[10px] truncate max-w-xs">
                        {JSON.stringify(log.details || {})}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </WebsiteAdminLayout>
  );
};

export default AdminAuditLogs;
