import React, { useState, useEffect, useMemo } from 'react';
import {
  Mail,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCw,
  RefreshCw,
  Send,
  Eye,
  ExternalLink,
  Info,
  ShieldAlert,
  ChevronRight,
  X,
  CreditCard
} from 'lucide-react';
import { fetchPaymentNotificationLogs, retryPaymentNotificationApi } from '@nacos/supabase';
import { useTheme } from '../context/ThemeContext';

export default function PaymentNotificationsMonitor() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({ total: 0, sent: 0, failed: 0, queued: 0 });
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | sent | failed | queued
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [retryingId, setRetryingId] = useState(null);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [feedback, setFeedback] = useState({ message: '', type: '' });

  const loadLogs = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetchPaymentNotificationLogs({
        status: statusFilter,
        paymentType: typeFilter,
        search: searchQuery
      });

      if (res && res.notifications) {
        setNotifications(res.notifications);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.warn('Failed to load payment notification logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [statusFilter, typeFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadLogs();
  };

  const handleRetry = async (notificationId) => {
    if (!notificationId || retryingId) return;
    setRetryingId(notificationId);
    setFeedback({ message: '', type: '' });

    try {
      const res = await retryPaymentNotificationApi({ notificationId });
      if (res && res.success) {
        setFeedback({
          message: `Email notification resent successfully! (Provider ID: ${res.id || 'ok'})`,
          type: 'success'
        });
        await loadLogs(true);
      } else {
        setFeedback({
          message: res?.error || 'Failed to retry email delivery. Please check server logs.',
          type: 'error'
        });
      }
    } catch (err) {
      setFeedback({
        message: err.message || 'Error occurred while contacting email service.',
        type: 'error'
      });
    } finally {
      setRetryingId(null);
    }
  };

  const filteredLogs = useMemo(() => {
    return notifications.filter(n => {
      if (statusFilter !== 'ALL' && n.status !== statusFilter.toLowerCase()) return false;
      if (typeFilter !== 'ALL' && n.payment_type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchRef = (n.payment_reference || '').toLowerCase().includes(q);
        const matchName = (n.student_name || '').toLowerCase().includes(q);
        const matchReg = (n.registration_number || '').toLowerCase().includes(q);
        const matchEmail = (n.recipient_email || '').toLowerCase().includes(q);
        if (!matchRef && !matchName && !matchReg && !matchEmail) return false;
      }
      return true;
    });
  }, [notifications, statusFilter, typeFilter, searchQuery]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">

      {/* Feedback Alert */}
      {feedback.message && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold ${
          feedback.type === 'error'
            ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'error' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback({ message: '', type: '' })}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Processed */}
        <div className={`p-4 rounded-2xl border transition-all ${
          isDark ? 'bg-[#083002]/40 border-[#138601]/25' : 'bg-white border-gray-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">
            <span>Total Triggered</span>
            <Mail className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black mt-2 text-gray-900 dark:text-white">
            {stats.total.toLocaleString()}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            Authoritative transactional emails
          </p>
        </div>

        {/* Successfully Sent */}
        <div className={`p-4 rounded-2xl border transition-all ${
          isDark ? 'bg-[#083002]/40 border-emerald-500/30' : 'bg-white border-emerald-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <span>Delivered (Sent)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black mt-2 text-emerald-700 dark:text-emerald-300">
            {stats.sent.toLocaleString()}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            {stats.total > 0 ? `${Math.round((stats.sent / stats.total) * 100)}% delivery rate` : '100% verified'}
          </p>
        </div>

        {/* Delivery Failures */}
        <div className={`p-4 rounded-2xl border transition-all ${
          stats.failed > 0
            ? 'bg-red-500/10 border-red-500/40 text-red-700 dark:text-red-300'
            : isDark ? 'bg-[#083002]/40 border-[#138601]/25' : 'bg-white border-gray-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
            <span className={stats.failed > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500'}>Failed Delivery</span>
            <AlertTriangle className={`w-4 h-4 ${stats.failed > 0 ? 'text-red-500 animate-pulse' : 'text-gray-400'}`} />
          </div>
          <div className="text-2xl font-black mt-2">
            {stats.failed.toLocaleString()}
          </div>
          <p className="text-[11px] mt-1 opacity-80">
            {stats.failed > 0 ? 'Requires admin investigation / retry' : 'No failed deliveries'}
          </p>
        </div>

        {/* Queued / In Progress */}
        <div className={`p-4 rounded-2xl border transition-all ${
          isDark ? 'bg-[#083002]/40 border-[#138601]/25' : 'bg-white border-gray-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">
            <span>Queued / Retrying</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black mt-2 text-gray-900 dark:text-white">
            {stats.queued.toLocaleString()}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            Scheduled delivery queue
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-3 ${
        isDark ? 'bg-[#083002]/40 border-[#138601]/25' : 'bg-white border-gray-200 shadow-xs'
      }`}>
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ref, student name, matric, email..."
            className="w-full pl-9.5 pr-4 py-2 text-xs rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/40 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
        </form>

        {/* Status and Category Selectors */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-500 dark:text-gray-400 font-semibold hidden sm:inline">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/40 text-gray-800 dark:text-gray-200 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="sent">Delivered (Sent)</option>
              <option value="failed">Failed Delivery</option>
              <option value="queued">Queued</option>
            </select>
          </div>

          {/* Payment Type Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-500 dark:text-gray-400 font-semibold hidden sm:inline">Category:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/40 text-gray-800 dark:text-gray-200 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="ID_CARD">Digital Student ID Card</option>
              <option value="DEPARTMENTAL_DUES">Departmental Dues</option>
              <option value="EVENT_TICKET">Event Ticket</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => loadLogs(true)}
            disabled={loading || refreshing}
            className="p-2 rounded-xl border border-gray-200 dark:border-[#138601]/40 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
            title="Refresh Notification Logs"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className={`rounded-2xl border overflow-hidden shadow-xs ${
        isDark ? 'bg-[#083002]/30 border-[#138601]/25' : 'bg-white border-gray-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b ${isDark ? 'bg-[#041801]/60 border-[#138601]/25 text-gray-300' : 'bg-gray-50/80 border-gray-200 text-gray-600'}`}>
                <th className="py-3 px-4 font-bold">Student Particulars</th>
                <th className="py-3 px-4 font-bold">Payment Category</th>
                <th className="py-3 px-4 font-bold">Transaction Reference</th>
                <th className="py-3 px-4 font-bold">Amount</th>
                <th className="py-3 px-4 font-bold">Notification Type</th>
                <th className="py-3 px-4 font-bold">Delivery Status</th>
                <th className="py-3 px-4 font-bold">Attempts</th>
                <th className="py-3 px-4 font-bold">Timestamp</th>
                <th className="py-3 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#138601]/15">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                      <span>Loading payment email notification logs...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-gray-400">
                    <Mail className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2 opacity-50" />
                    <p className="font-semibold text-gray-600 dark:text-gray-300">No payment notification records found</p>
                    <p className="text-[11px] text-gray-400 mt-1">Verified payments will automatically log transactional email dispatches here.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isSent = log.status === 'sent';
                  const isFailed = log.status === 'failed';
                  const isQueued = log.status === 'queued' || log.status === 'processing';

                  const formattedDate = log.created_at ? new Date(log.created_at).toLocaleString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : '—';

                  const rawAmt = Number(log.amount || 0);

                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-gray-50/60 dark:hover:bg-white/5 transition-colors ${
                        isFailed ? 'bg-red-500/5' : ''
                      }`}
                    >
                      {/* Student Particulars */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900 dark:text-white">
                          {log.student_name || 'Student Member'}
                        </div>
                        <div className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                          {log.registration_number || 'No Reg No'}
                        </div>
                        <div className="text-[11px] text-gray-400 truncate max-w-[180px]">
                          {log.recipient_email}
                        </div>
                      </td>

                      {/* Payment Category */}
                      <td className="py-3.5 px-4 font-semibold text-gray-800 dark:text-gray-200">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/10 text-[11px]">
                          <CreditCard className="w-3 h-3 text-emerald-500" />
                          <span>{log.payment_type ? log.payment_type.replace(/_/g, ' ') : 'Payment'}</span>
                        </div>
                      </td>

                      {/* Transaction Reference */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[11px] font-bold text-gray-900 dark:text-gray-200 bg-gray-100 dark:bg-[#041801] px-2 py-0.5 rounded border border-gray-200 dark:border-white/10">
                          {log.payment_reference}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">
                        {log.currency || 'NGN'} {rawAmt.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Notification Type */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider uppercase ${
                          log.notification_type === 'PAYMENT_SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : log.notification_type === 'PAYMENT_FAILED'
                            ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        }`}>
                          {log.notification_type ? log.notification_type.replace('PAYMENT_', '') : 'SUCCESS'}
                        </span>
                      </td>

                      {/* Delivery Status */}
                      <td className="py-3.5 px-4">
                        {isSent ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>Sent</span>
                          </span>
                        ) : isFailed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30" title={log.error_message || 'Delivery error'}>
                            <AlertTriangle className="w-3 h-3 text-red-500" />
                            <span>Failed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            <Clock className="w-3 h-3 text-amber-500" />
                            <span>Queued</span>
                          </span>
                        )}
                      </td>

                      {/* Attempts */}
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        <span className={log.attempts >= log.max_attempts ? 'text-red-500 font-bold' : 'text-gray-600 dark:text-gray-400'}>
                          {log.attempts || 0} / {log.max_attempts || 3}
                        </span>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3.5 px-4 text-gray-500 dark:text-gray-400 text-[11px] whitespace-nowrap">
                        {formattedDate}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Info */}
                          <button
                            type="button"
                            onClick={() => setSelectedNotif(log)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            title="View Notification Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Retry Button */}
                          {(!isSent || isFailed) && (
                            <button
                              type="button"
                              onClick={() => handleRetry(log.id)}
                              disabled={retryingId === log.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer disabled:opacity-50"
                              title="Resend this payment email"
                            >
                              <RotateCw className={`w-3 h-3 ${retryingId === log.id ? 'animate-spin' : ''}`} />
                              <span>{retryingId === log.id ? 'Sending...' : 'Retry'}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedNotif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className={`w-full max-w-lg rounded-2xl border p-6 space-y-4 shadow-2xl ${
            isDark ? 'bg-[#041801] border-[#138601]/40 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-500 font-bold">
                  Payment Notification Record
                </span>
                <h3 className="text-base font-black mt-0.5">
                  {selectedNotif.payment_reference}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNotif(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Recipient</span>
                  <span className="font-bold">{selectedNotif.student_name}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Reg / Matric</span>
                  <span className="font-mono font-bold">{selectedNotif.registration_number || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Destination Email</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">{selectedNotif.recipient_email}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Amount Verified</span>
                  <span className="font-bold">{selectedNotif.currency} {Number(selectedNotif.amount || 0).toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Provider</span>
                  <span className="font-mono">{selectedNotif.provider || 'resend'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Message ID</span>
                  <span className="font-mono text-[11px] truncate block">{selectedNotif.provider_message_id || 'Pending delivery'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Delivery Status</span>
                  <span className="font-bold uppercase">{selectedNotif.status}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Attempt Count</span>
                  <span className="font-mono">{selectedNotif.attempts} / {selectedNotif.max_attempts}</span>
                </div>
              </div>

              {selectedNotif.error_message && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 space-y-1">
                  <span className="font-bold uppercase text-[10px] block">Error Summary</span>
                  <p className="font-mono text-[11px] leading-relaxed break-words">{selectedNotif.error_message}</p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedNotif(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 transition-colors"
              >
                Close
              </button>
              {selectedNotif.status !== 'sent' && (
                <button
                  type="button"
                  onClick={() => {
                    handleRetry(selectedNotif.id);
                    setSelectedNotif(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#138601] hover:bg-[#0f6c01] text-white transition-colors"
                >
                  Retry Dispatch Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
