import React, { useState, useEffect } from 'react';
import WebsiteAdminLayout from '../components/WebsiteAdminLayout';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Check, 
  MapPin, 
  Clock, 
  Star, 
  Eye, 
  EyeOff, 
  Upload,
  Edit3
} from 'lucide-react';
import { MediaUpload, CloudinaryImage, CLOUDINARY_FOLDERS, deleteMedia } from '@nacos/media';
import { recordAdminAction } from '@nacos/supabase/adminAuth';
import { syncWebsiteEvent } from '@nacos/supabase/media';
import { supabase } from '@nacos/supabase';

const INITIAL_EVENTS = [
  {
    id: 'evt-1',
    title: 'Masked Affairs: Cum and Mingle',
    slug: 'masked-affairs-2026',
    date: 'Aug 15, 2026',
    time: '8:00 PM',
    location: 'SOPS Theatre, FUTO',
    description: 'Premium masked party, networking night, and social mixer hosted by the Office of the Directors of Socials.',
    image_url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=1200',
    cloudinary_public_id: 'nacos/events/masked_affairs',
    is_published: true,
    is_featured: true
  },
  {
    id: 'evt-2',
    title: 'The Founders Table 1.0',
    slug: 'founders-table-1',
    date: 'August 2026',
    time: '12:00 PM',
    location: 'CSC Seminar Hall, FUTO',
    description: 'Delving into tech startups, entrepreneurship, venture capital, and building The Next Big Thing.',
    image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1200',
    cloudinary_public_id: 'nacos/events/founders_table',
    is_published: true,
    is_featured: true
  },
  {
    id: 'evt-3',
    title: 'Tech Day & Hackathon Showcase',
    slug: 'tech-day-2026',
    date: 'Sept 10, 2026',
    time: '10:00 AM',
    location: 'ICT Centre Hall A',
    description: 'Annual department project exhibition and developer demos showcasing student software innovations.',
    image_url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=1200',
    cloudinary_public_id: 'nacos/events/tech_day',
    is_published: true,
    is_featured: false
  }
];

const AdminEvents = () => {
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Form State
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [flyerUrl, setFlyerUrl] = useState('');
  const [flyerPublicId, setFlyerPublicId] = useState('');

  useEffect(() => {
    async function loadEvents() {
      try {
        const { data, error } = await supabase
          .from('website_events')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const mapped = data.map(d => ({
            id: d.id,
            title: d.title,
            slug: d.slug,
            date: d.event_date,
            time: d.event_time,
            location: d.location,
            description: d.description,
            image_url: d.image_url,
            cloudinary_public_id: d.cloudinary_public_id,
            is_published: d.is_published,
            is_featured: d.is_featured
          }));
          const dbSlugs = new Set(mapped.map(m => m.slug));
          setEvents([...mapped, ...INITIAL_EVENTS.filter(i => !dbSlugs.has(i.slug))]);
          return;
        }
      } catch (err) {
        console.warn('Supabase events query bypassed:', err);
      }

      const stored = localStorage.getItem('nacos_website_events_store');
      if (stored) {
        try {
          setEvents(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }
    }
    loadEvents();
  }, []);

  const showFeedback = (text, type = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleTogglePublish = async (id) => {
    const updated = events.map(ev => {
      if (ev.id === id) {
        const next = !ev.is_published;
        recordAdminAction(next ? 'event_publish' : 'event_unpublish', 'event', ev.slug, {
          title: ev.title
        });
        // Update in Supabase
        supabase.from('website_events').update({ is_published: next }).eq('slug', ev.slug).then(() => {});
        return { ...ev, is_published: next };
      }
      return ev;
    });

    setEvents(updated);
    localStorage.setItem('nacos_website_events_store', JSON.stringify(updated));
    showFeedback('Event visibility updated in database.');
  };

  const handleDelete = async (eventItem) => {
    if (!window.confirm(`Delete event "${eventItem.title}"?`)) return;

    if (eventItem.cloudinary_public_id) {
      await deleteMedia(eventItem.cloudinary_public_id);
    }

    try {
      await supabase.from('website_events').delete().eq('slug', eventItem.slug);
    } catch (e) {
      console.warn('Supabase event delete bypassed', e);
    }

    const updated = events.filter(e => e.id !== eventItem.id);
    setEvents(updated);
    localStorage.setItem('nacos_website_events_store', JSON.stringify(updated));

    await recordAdminAction('event_delete', 'event', eventItem.slug, {
      title: eventItem.title
    });

    showFeedback('Event removed from schedule and database.');
  };

  const handleOpenAdd = () => {
    setModalMode('add');
    setSelectedEventId(null);
    setTitle('');
    setDate('');
    setTime('');
    setLocation('');
    setDescription('');
    setFlyerUrl('');
    setFlyerPublicId('');
    setIsAddOpen(true);
  };

  const handleOpenEdit = (evt) => {
    setModalMode('edit');
    setSelectedEventId(evt.id);
    setTitle(evt.title || '');
    setDate(evt.date || '');
    setTime(evt.time || '');
    setLocation(evt.location || '');
    setDescription(evt.description || '');
    setFlyerUrl(evt.image_url || '');
    setFlyerPublicId(evt.cloudinary_public_id || '');
    setIsAddOpen(true);
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!title || !date) return;

    if (modalMode === 'edit') {
      const existing = events.find(ev => ev.id === selectedEventId);
      const slug = existing?.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const updatedEvent = {
        ...existing,
        id: selectedEventId,
        title,
        slug,
        date,
        time: time || '10:00 AM',
        location: location || 'CSC Seminar Hall',
        description,
        image_url: flyerUrl || existing?.image_url || 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=1200',
        cloudinary_public_id: flyerPublicId || existing?.cloudinary_public_id,
        updated_at: new Date().toISOString()
      };

      await syncWebsiteEvent(updatedEvent);

      const updated = events.map(ev => ev.id === selectedEventId ? updatedEvent : ev);
      setEvents(updated);
      localStorage.setItem('nacos_website_events_store', JSON.stringify(updated));

      await recordAdminAction('event_update', 'event', slug, {
        title: updatedEvent.title,
        date: updatedEvent.date
      });

      setIsAddOpen(false);
      showFeedback('Event details updated & synced with database!');
    } else {
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const newEvent = {
        id: `evt-${Date.now()}`,
        title,
        slug,
        date,
        time: time || '10:00 AM',
        location: location || 'CSC Seminar Hall',
        description,
        image_url: flyerUrl || 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=1200',
        cloudinary_public_id: flyerPublicId,
        is_published: true,
        is_featured: false
      };

      // 1. Two-way sync to Cloudinary + Supabase
      await syncWebsiteEvent(newEvent);

      const updated = [newEvent, ...events.filter(ev => ev.slug !== slug)];
      setEvents(updated);
      localStorage.setItem('nacos_website_events_store', JSON.stringify(updated));

      await recordAdminAction('event_create', 'event', slug, {
        title: newEvent.title,
        date: newEvent.date
      });

      setIsAddOpen(false);
      setTitle('');
      setDate('');
      setTime('');
      setLocation('');
      setDescription('');
      setFlyerUrl('');
      setFlyerPublicId('');
      showFeedback('New event published & synced with database & Cloudinary!');
    }
  };

  return (
    <WebsiteAdminLayout
      title="Events & Flyers Management"
      subtitle="Coordinate public tech symposiums, social mixers, conventions, and workshop flyer uploads."
    >
      <div className="space-y-6">
        
        {/* Actions Bar */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 flex items-center justify-between">
          <div className="text-xs text-gray-500 dark:text-green-200/70">
            Total Events Scheduled: <strong className="text-gray-900 dark:text-white">{events.length}</strong>
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add New Event
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800/40">
            <Check className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Events Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((evt) => (
            <div
              key={evt.id}
              className="rounded-2xl overflow-hidden bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 flex flex-col shadow-sm hover:border-[#138601] transition-all"
            >
              <div className="relative aspect-[16/10] bg-gray-100 dark:bg-[#041801] overflow-hidden">
                <CloudinaryImage
                  src={evt.image_url}
                  alt={evt.title}
                  preset="card"
                  className="w-full h-full object-cover"
                />

                <div className="absolute top-3 left-3">
                  <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${
                    evt.is_published 
                      ? 'bg-green-600 text-white' 
                      : 'bg-black/75 text-gray-300'
                  }`}>
                    {evt.is_published ? 'Active Event' : 'Draft / Hidden'}
                  </span>
                </div>

                <div className="absolute top-3 right-3 flex gap-1.5">
                  <button
                    type="button"
                    title="Edit Event Details"
                    onClick={() => handleOpenEdit(evt)}
                    className="p-2 rounded-lg bg-black/60 hover:bg-[#138601] text-white backdrop-blur cursor-pointer transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    title={evt.is_published ? 'Hide from public' : 'Make visible'}
                    onClick={() => handleTogglePublish(evt.id)}
                    className="p-2 rounded-lg bg-black/60 hover:bg-black text-white backdrop-blur cursor-pointer transition-colors"
                  >
                    {evt.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    title="Delete Event"
                    onClick={() => handleDelete(evt)}
                    className="p-2 rounded-lg bg-red-600/80 hover:bg-red-600 text-white backdrop-blur cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between text-xs space-y-3">
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-snug">
                    {evt.title}
                  </h3>
                  <div className="space-y-1 text-gray-500 dark:text-green-200/70 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#138601] dark:text-[#4bd043]" />
                      <span>{evt.date} • {evt.time}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#138601] dark:text-[#4bd043]" />
                      <span className="truncate">{evt.location}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-600 dark:text-green-100/70 line-clamp-2 mt-2">
                    {evt.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-gray-100 dark:border-[#138601]/20 text-[10px] text-gray-400 font-mono">
                  Slug: /{evt.slug}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#138601]/20 pb-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {modalMode === 'edit' ? 'Edit Event Details' : 'Add New Event to Website'}
                </h3>
                <button onClick={() => setIsAddOpen(false)} className="text-gray-400">✕</button>
              </div>

              <form onSubmit={handleSaveEvent} className="space-y-3 text-xs">
                {flyerUrl && (
                  <div className="relative aspect-[16/9] max-h-44 rounded-xl overflow-hidden bg-gray-100 dark:bg-[#041801]">
                    <img
                      src={flyerUrl}
                      alt={title || 'Flyer preview'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-semibold mb-1">Event Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Artificial Intelligence Workshop"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-[#138601]/40 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Event Date</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Oct 24, 2026"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-[#138601]/40"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Time</label>
                    <input
                      type="text"
                      placeholder="e.g. 10:00 AM"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-[#138601]/40"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Venue / Location</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SOPS Theatre, FUTO"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-[#138601]/40"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Event Description</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Full details regarding speakers, schedule, dress code, etc."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-[#138601]/40"
                  />
                </div>

                <div className="pt-2">
                  <MediaUpload
                    folder={CLOUDINARY_FOLDERS.EVENTS}
                    label={modalMode === 'edit' ? 'Replace Event Flyer (Optional)' : 'Official Event Flyer (Cloudinary CDN)'}
                    aspectRatio="landscape"
                    onUploadSuccess={({ url, publicId }) => {
                      setFlyerUrl(url);
                      setFlyerPublicId(publicId);
                    }}
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-gray-100 dark:border-[#138601]/20">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-[#041801] text-gray-700 dark:text-gray-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl bg-[#138601] hover:bg-[#0f6c01] text-white font-semibold cursor-pointer"
                  >
                    {modalMode === 'edit' ? 'Save Changes' : 'Publish Event'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </WebsiteAdminLayout>
  );
};

export default AdminEvents;
