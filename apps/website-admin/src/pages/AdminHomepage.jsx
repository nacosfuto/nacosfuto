import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import WebsiteAdminLayout from '../components/WebsiteAdminLayout';
import AdminSaveButton from '../components/AdminSaveButton';
import { Home, Save, CheckCircle, AlertCircle, RefreshCw, Eye, EyeOff, Sparkles, ArrowRight, Loader, Megaphone, Link2, ExternalLink } from 'lucide-react';
import { supabase } from '@nacos/supabase';
import { recordAdminAction } from '@nacos/supabase/adminAuth';
import { adminToast, getSafeErrorMessage } from '../utils/adminToast';

const AdminHomepage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: '' });

  const [formData, setFormData] = useState({
    hero_headline: 'Empowering the Next Generation of Tech Innovators',
    hero_subtext: 'Department of Computer Science • Federal University of Technology, Owerri. Advancing computing excellence, AI research, and transformative engineering.',
    announcement_active: true,
    announcement_text: 'Registration for 2026/2027 Academic Session & BuildX NACOS National Hackathon is now live!',
    announcement_link: '/hackathons',
    announcement_link_text: 'Register Now →',
    stat_students: '1,850+',
    stat_faculty: '45+',
    stat_courses: '80+',
    stat_alumni: '5,000+'
  });

  useEffect(() => {
    loadHomepageContent();
  }, []);

  const loadHomepageContent = async () => {
    setLoading(true);
    try {
      const stored = localStorage.getItem('nacos_homepage_cms_db');
      if (stored) {
        setFormData(prev => ({ ...prev, ...JSON.parse(stored) }));
      }

      // 1. Authoritative check on live Supabase store_homepage_content row
      const { data: storeRow } = await supabase
        .from('id_card_settings')
        .select('academic_session')
        .eq('id', 'store_homepage_content')
        .maybeSingle();

      if (storeRow?.academic_session) {
        try {
          const parsed = JSON.parse(storeRow.academic_session);
          if (parsed && typeof parsed === 'object') {
            setFormData(prev => ({
              ...prev,
              ...parsed
            }));
            localStorage.setItem('nacos_homepage_cms_db', JSON.stringify(parsed));
          }
        } catch (_) {}
      } else {
        // 2. Fallback to website_homepage_content if available
        const { data, error } = await supabase
          .from('website_homepage_content')
          .select('content')
          .eq('id', 'default')
          .maybeSingle();

        if (!error && data?.content) {
          setFormData(prev => ({
            ...prev,
            ...data.content
          }));
        }
      }
    } catch (e) {}
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setNotification({ message: '', type: '' });

    try {
      const payload = {
        ...formData,
        announcement_active: Boolean(formData.announcement_active),
        announcement_text: (formData.announcement_text || '').trim(),
        announcement_link: (formData.announcement_link || '').trim(),
        announcement_link_text: (formData.announcement_link_text || 'Learn More').trim()
      };

      localStorage.setItem('nacos_homepage_cms_db', JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent('nacos_homepage_cms_updated', { detail: payload }));

      // 1. Authoritative live sync to Supabase store_homepage_content
      const { error: storeErr } = await supabase
        .from('id_card_settings')
        .upsert({
          id: 'store_homepage_content',
          academic_session: JSON.stringify(payload),
          updated_at: new Date().toISOString()
        });

      if (storeErr) throw storeErr;

      // 2. Secondary sync to website_homepage_content using valid schema columns
      try {
        await supabase
          .from('website_homepage_content')
          .upsert({
            id: '428fafe8-aacc-44ce-901b-ba6b2cbfb1a7',
            section_key: 'announcement_ticker',
            title: payload.announcement_text,
            cta_link: payload.announcement_link,
            cta_text: payload.announcement_link_text,
            is_active: payload.announcement_active,
            meta_data: payload,
            updated_at: new Date().toISOString()
          });
      } catch (_) {}

      try {
        await recordAdminAction('homepage_content_updated', 'homepage', 'default', {
          headline: payload.hero_headline,
          announcement_active: payload.announcement_active,
          announcement_link: payload.announcement_link
        });
      } catch (_) {}

      adminToast.success('Homepage content updated & published live!');
      setNotification({ message: 'Homepage content updated successfully!', type: 'success' });
      setTimeout(() => setNotification({ message: '', type: '' }), 4000);
    } catch (err) {
      console.error('Error saving homepage content:', err);
      const msg = getSafeErrorMessage(err, 'Failed to save homepage changes. Please try again.');
      adminToast.error(msg);
      setNotification({ message: msg, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <WebsiteAdminLayout
      title="Homepage & Hero Content"
      subtitle="Manage main public website headlines, announcements banner, and metric counters."
    >
      <div className="space-y-6 max-w-4xl">
        
        {notification.message && (
          <div className="p-4 rounded-xl text-xs font-semibold flex items-center gap-2 bg-green-50 text-green-800 border border-green-200 dark:bg-green-950/60 dark:text-green-300">
            <CheckCircle className="w-4 h-4" />
            <span>{notification.message}</span>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500">
            <Loader className="w-6 h-6 animate-spin text-[#138601] mx-auto mb-2" />
            Loading homepage configuration...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Hero Carousel Navigation Banner */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-[#083002] border border-[#138601]/40 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#138601]/25 text-[#4bd043] flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Homepage Hero Carousel Management</h4>
                  <p className="text-xs text-green-200/80 mt-0.5">
                    Upload rotating background slides, configure rotation ordering, focal alignment, and optional CTA buttons.
                  </p>
                </div>
              </div>
              <Link
                to="/admin/hero-carousel"
                className="px-4 py-2 rounded-xl bg-[#138601] hover:bg-[#0f6c01] text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 transition-colors shadow-xs"
              >
                <span>Manage Hero Slides</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
            
            {/* Hero Section */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 space-y-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
                Hero Headline & Narrative
              </h3>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-green-200 mb-1">
                  Main Headline
                </label>
                <input
                  type="text"
                  required
                  value={formData.hero_headline}
                  onChange={(e) => setFormData({ ...formData, hero_headline: e.target.value })}
                  className="w-full px-4 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 text-gray-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-green-200 mb-1">
                  Hero Subtext Narrative
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.hero_subtext}
                  onChange={(e) => setFormData({ ...formData, hero_subtext: e.target.value })}
                  className="w-full px-4 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Announcement Banner Section */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-[#138601]/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#138601]/20 text-[#138601] dark:text-[#4bd043] flex items-center justify-center shrink-0">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <span>Top Announcement Ticker Banner</span>
                      {formData.announcement_active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Live on Site
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                          Disabled (Off)
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-green-200/70 mt-0.5">
                      Publish a sticky, animated scrolling announcement ticker at the top of the public website.
                    </p>
                  </div>
                </div>

                {/* Master Switch */}
                <div className="flex items-center gap-3 self-start sm:self-auto">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {formData.announcement_active ? 'Banner Active' : 'Banner Off'}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.announcement_active}
                    onClick={() => setFormData(prev => ({ ...prev, announcement_active: !prev.announcement_active }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formData.announcement_active ? 'bg-[#138601]' : 'bg-gray-300 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        formData.announcement_active ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Form Inputs Grid */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-700 dark:text-green-200">
                      Announcement Message (Scrolling Ticker Text)
                    </label>
                    <span className="text-[11px] text-gray-400">
                      {formData.announcement_text?.length || 0} characters
                    </span>
                  </div>
                  <input
                    type="text"
                    required={formData.announcement_active}
                    placeholder="e.g., Registration for BuildX NACOS National Hackathon is now live!"
                    value={formData.announcement_text}
                    onChange={(e) => setFormData({ ...formData, announcement_text: e.target.value })}
                    className="w-full px-4 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 text-gray-900 dark:text-white font-medium"
                  />
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                    Continuously scrolls horizontally in an infinite marquee ticker loop across the header.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Provision for Link */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-green-200 mb-1">
                      Ticker Destination Link (Route or External URL)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Link2 className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. /hackathons, /news, /events or https://..."
                        value={formData.announcement_link || ''}
                        onChange={(e) => setFormData({ ...formData, announcement_link: e.target.value })}
                        className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 text-gray-900 dark:text-white"
                      />
                    </div>
                    {/* Quick Link Shortcut Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mr-1">
                        Quick Add:
                      </span>
                      {[
                        { label: 'Hackathons', path: '/hackathons' },
                        { label: 'News', path: '/news' },
                        { label: 'Events', path: '/events' },
                        { label: 'Admissions', path: '/admissions' },
                        { label: 'Portal', path: '/portal' }
                      ].map((item) => (
                        <button
                          key={item.path}
                          type="button"
                          onClick={() => setFormData({ ...formData, announcement_link: item.path })}
                          className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
                            formData.announcement_link === item.path
                              ? 'bg-[#138601] text-white border-[#138601]'
                              : 'bg-gray-100 dark:bg-[#041801] border-gray-200 dark:border-[#138601]/40 text-gray-700 dark:text-gray-300 hover:border-[#138601]'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                      {formData.announcement_link && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, announcement_link: '' })}
                          className="text-[10px] px-2 py-0.5 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 border border-transparent hover:border-red-300"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Provision for Link Action Button Text */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-green-200 mb-1">
                      Action Button Label (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Register Now →, Learn More →, Read Story →"
                      value={formData.announcement_link_text || ''}
                      onChange={(e) => setFormData({ ...formData, announcement_link_text: e.target.value })}
                      className="w-full px-4 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 text-gray-900 dark:text-white"
                    />
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                      Leave empty to default to "Learn More →".
                    </p>
                  </div>
                </div>
              </div>

              {/* Real-Time Live Ticker Preview Box */}
              <div className="pt-3 border-t border-gray-100 dark:border-[#138601]/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-[#138601]" />
                    <span>Live Interactive Preview</span>
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {formData.announcement_active ? 'Hover pauses scrolling' : 'Currently hidden'}
                  </span>
                </div>

                {formData.announcement_active ? (
                  <div className="relative rounded-xl overflow-hidden border border-[#138601]/40 shadow-sm bg-gradient-to-r from-[#083002] via-[#138601] to-[#041801] text-white">
                    <div className="flex items-center h-10 px-3">
                      {/* Left Badge */}
                      <div className="relative z-10 flex items-center gap-1.5 bg-[#083002]/95 border border-[#4bd043]/40 px-2.5 py-0.5 rounded-full shadow-md shrink-0 mr-3">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4bd043] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4bd043]"></span>
                        </span>
                        <Megaphone className="w-3 h-3 text-[#4bd043]" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-green-200">
                          Latest
                        </span>
                      </div>

                      {/* Middle Ticker Track */}
                      <div className="relative flex-1 overflow-hidden h-full flex items-center ticker-wrapper">
                        <div className="animate-ticker flex items-center gap-10 whitespace-nowrap">
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-center gap-3 shrink-0">
                              <span className="font-medium text-white text-xs">
                                {formData.announcement_text || 'Enter announcement message above...'}
                              </span>
                              {formData.announcement_link && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold border border-white/25">
                                  <span>{formData.announcement_link_text || 'Learn More'}</span>
                                  <ArrowRight className="w-2.5 h-2.5" />
                                </span>
                              )}
                              <span className="text-green-300/40 text-xs">✦</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#041801]/60 text-center flex flex-col items-center justify-center gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                      <EyeOff className="w-4 h-4" />
                      <span>The announcement ticker banner is currently TOGGLED OFF (Hidden on website).</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, announcement_active: true }))}
                      className="text-xs font-bold text-[#138601] hover:underline"
                    >
                      Click here to toggle it ON
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Departmental Metrics */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 space-y-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Departmental Key Figures
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">Enrolled Students</label>
                  <input
                    type="text"
                    value={formData.stat_students}
                    onChange={(e) => setFormData({ ...formData, stat_students: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-bold rounded-lg bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">Academic Faculty</label>
                  <input
                    type="text"
                    value={formData.stat_faculty}
                    onChange={(e) => setFormData({ ...formData, stat_faculty: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-bold rounded-lg bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">Active Courses</label>
                  <input
                    type="text"
                    value={formData.stat_courses}
                    onChange={(e) => setFormData({ ...formData, stat_courses: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-bold rounded-lg bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">Alumni Network</label>
                  <input
                    type="text"
                    value={formData.stat_alumni}
                    onChange={(e) => setFormData({ ...formData, stat_alumni: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-bold rounded-lg bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <AdminSaveButton
                loading={saving}
                loadingText="Publishing Updates..."
                icon={Save}
              >
                Save &amp; Publish Changes
              </AdminSaveButton>
            </div>

            </form>
          </div>
        )}

      </div>
    </WebsiteAdminLayout>
  );
};

export default AdminHomepage;
