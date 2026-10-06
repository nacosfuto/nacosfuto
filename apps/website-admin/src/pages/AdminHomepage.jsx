import React, { useState, useEffect } from 'react';
import WebsiteAdminLayout from '../components/WebsiteAdminLayout';
import { Home, Save, CheckCircle, AlertCircle, RefreshCw, Eye, Sparkles } from 'lucide-react';
import { supabase } from '@nacos/supabase';
import { recordAdminAction } from '@nacos/supabase/adminAuth';

const AdminHomepage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: '' });

  const [formData, setFormData] = useState({
    hero_headline: 'Empowering the Next Generation of Tech Innovators',
    hero_subtext: 'Department of Computer Science • Federal University of Technology, Owerri. Advancing computing excellence, AI research, and transformative engineering.',
    announcement_active: true,
    announcement_text: 'Registration for 2026/2027 Academic Session & BuildX NACOS National Hackathon is now live!',
    announcement_link: '/announcements',
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
        setFormData(JSON.parse(stored));
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
            setFormData(parsed);
            localStorage.setItem('nacos_homepage_cms_db', JSON.stringify(parsed));
          }
        } catch (_) {}
      } else {
        // 2. Fallback to website_homepage_content if available
        const { data, error } = await supabase
          .from('website_homepage_content')
          .select('*')
          .eq('id', 'default')
          .maybeSingle();

        if (!error && data?.content) {
          setFormData(data.content);
        }
      }
    } catch (e) {}
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    localStorage.setItem('nacos_homepage_cms_db', JSON.stringify(formData));

    // Authoritative live sync to Supabase store_homepage_content
    try {
      await supabase
        .from('id_card_settings')
        .upsert({
          id: 'store_homepage_content',
          academic_session: JSON.stringify(formData),
          updated_at: new Date().toISOString()
        });
    } catch (e) {}

    try {
      await supabase
        .from('website_homepage_content')
        .upsert({ id: 'default', content: formData, updated_at: new Date().toISOString() });
    } catch (e) {}

    await recordAdminAction('homepage_content_updated', 'homepage', 'default', {
      headline: formData.hero_headline,
      announcement_active: formData.announcement_active
    });

    setSaving(false);
    setNotification({ message: 'Homepage content updated successfully!', type: 'success' });
    setTimeout(() => setNotification({ message: '', type: '' }), 4000);
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
            <RefreshCw className="w-6 h-6 animate-spin text-[#138601] mx-auto mb-2" />
            Loading homepage configuration...
          </div>
        ) : (
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
            <div className="p-6 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Top Announcement Ticker Banner
                </h3>
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.announcement_active}
                    onChange={(e) => setFormData({ ...formData, announcement_active: e.target.checked })}
                    className="w-4 h-4 text-[#138601] rounded"
                  />
                  <span>Show Banner on Public Site</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-green-200 mb-1">
                  Banner Text
                </label>
                <input
                  type="text"
                  value={formData.announcement_text}
                  onChange={(e) => setFormData({ ...formData, announcement_text: e.target.value })}
                  className="w-full px-4 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 text-gray-900 dark:text-white"
                />
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
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] rounded-xl shadow-sm transition-colors cursor-pointer inline-flex items-center gap-2"
              >
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{saving ? 'Publishing Updates...' : 'Save & Publish Changes'}</span>
              </button>
            </div>

          </form>
        )}

      </div>
    </WebsiteAdminLayout>
  );
};

export default AdminHomepage;
