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
  Edit3,
  Search,
  Filter,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { MediaUpload, CloudinaryImage, CLOUDINARY_FOLDERS } from '@nacos/media';
import { recordAdminAction } from '@nacos/supabase/adminAuth';
import { 
  getEvents, 
  fetchEventsFromSupabase, 
  saveEvent, 
  deleteEvent, 
  toggleEventPublish, 
  toggleEventFeatured 
} from '@nacos/supabase';

const CATEGORIES = [
  { id: 'all', label: 'All Events' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'recent', label: 'Recent' },
  { id: 'past', label: 'Past & Concluded' }
];

const AdminEvents = () => {
  const [events, setEvents] = useState(() => getEvents({ category: 'all' }));
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('upcoming');
  const [registrationLink, setRegistrationLink] = useState('');
  const [flyerUrl, setFlyerUrl] = useState('');
  const [flyerPublicId, setFlyerPublicId] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);

  // Load latest events from Supabase in background
  useEffect(() => {
    fetchEventsFromSupabase().then(fetched => {
      if (fetched && fetched.length > 0) {
        setEvents(fetched);
      }
    });

    const handleSync = () => {
      setEvents(getEvents({ category: 'all' }));
    };

    window.addEventListener('nacos_website_events_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('nacos_website_events_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const showFeedback = (text, type = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleTogglePublish = async (id) => {
    const updated = await toggleEventPublish(id);
    setEvents(updated);
    const target = updated.find(e => e.id === id);
    if (target) {
      await recordAdminAction(target.is_published ? 'event_publish' : 'event_unpublish', 'event', target.slug, {
        title: target.title
      });
    }
    showFeedback(`Event visibility updated: ${target?.is_published ? 'Active' : 'Hidden'}`);
  };

  const handleToggleFeatured = async (id) => {
    const updated = await toggleEventFeatured(id);
    setEvents(updated);
    const target = updated.find(e => e.id === id);
    if (target) {
      await recordAdminAction(target.is_featured ? 'event_featured' : 'event_unfeatured', 'event', target.slug, {
        title: target.title
      });
    }
    showFeedback(`Featured highlight status updated for "${target?.title}"`);
  };

  const handleDelete = async (eventItem) => {
    if (!window.confirm(`Delete event "${eventItem.title}"? This will remove it from the website, database, and media storage.`)) return;

    const updated = await deleteEvent(eventItem);
    setEvents(updated);

    await recordAdminAction('event_delete', 'event', eventItem.slug, {
      title: eventItem.title
    });

    showFeedback('Event removed from schedule and database.');
  };

  const handleOpenAdd = () => {
    setModalMode('add');
    setSelectedEventId(null);
    setTitle('');
    setSlug('');
    setDate('');
    setTime('10:00 AM');
    setLocation('CSC Seminar Hall, FUTO');
    setDescription('');
    setCategory('upcoming');
    setRegistrationLink('');
    setFlyerUrl('');
    setFlyerPublicId('');
    setIsPublished(true);
    setIsFeatured(false);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (evt) => {
    setModalMode('edit');
    setSelectedEventId(evt.id);
    setTitle(evt.title || '');
    setSlug(evt.slug || '');
    setDate(evt.date || evt.event_date || '');
    setTime(evt.time || evt.event_time || '');
    setLocation(evt.location || '');
    setDescription(evt.description || '');
    setCategory(evt.category || 'upcoming');
    setRegistrationLink(evt.registration_link || evt.registrationLink || '');
    setFlyerUrl(evt.image_url || evt.image || '');
    setFlyerPublicId(evt.cloudinary_public_id || '');
    setIsPublished(evt.is_published !== false);
    setIsFeatured(Boolean(evt.is_featured));
    setIsAddOpen(true);
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!title.trim() || !date.trim()) return;

    setIsSubmitting(true);
    try {
      const generatedSlug = slug.trim() 
        ? slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        : title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const payload = {
        id: modalMode === 'edit' ? selectedEventId : `evt-${Date.now()}`,
        slug: generatedSlug,
        title: title.trim(),
        date: date.trim(),
        event_date: date.trim(),
        time: time.trim() || '10:00 AM',
        event_time: time.trim() || '10:00 AM',
        location: location.trim() || 'CSC Seminar Hall, FUTO',
        description: description.trim(),
        category,
        registration_link: registrationLink.trim() || null,
        registrationLink: registrationLink.trim() || null,
        image_url: flyerUrl || 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569305/nacos/events/event_masked_affairs.jpg',
        image: flyerUrl || 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569305/nacos/events/event_masked_affairs.jpg',
        cloudinary_public_id: flyerPublicId || null,
        is_published: isPublished,
        is_featured: isFeatured
      };

      await saveEvent(payload);

      await recordAdminAction(modalMode === 'edit' ? 'event_update' : 'event_create', 'event', payload.slug, {
        title: payload.title,
        date: payload.date,
        category: payload.category
      });

      setEvents(getEvents({ category: 'all' }));
      setIsAddOpen(false);
      showFeedback(modalMode === 'edit' ? 'Event details updated & synced!' : 'New event published & synced with database!');
    } catch (err) {
      console.error('Error saving event:', err);
      showFeedback('Failed to save event. Check console for details.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered events
  const filteredEvents = events.filter(evt => {
    const matchesCategory = activeCategory === 'all' || evt.category === activeCategory;
    const matchesSearch = !searchQuery.trim() || 
      evt.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const upcomingCount = events.filter(e => e.category === 'upcoming').length;
  const recentCount = events.filter(e => e.category === 'recent').length;
  const pastCount = events.filter(e => e.category === 'past').length;

  return (
    <WebsiteAdminLayout
      title="Events & Flyers Management"
      subtitle="Coordinate public tech symposiums, conventions, workshops, and flyer uploads synced across website, database, and Cloudinary CDN."
    >
      <div className="space-y-6">
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 shadow-sm">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-green-200/60 uppercase tracking-wider block">Total Events</span>
            <span className="text-2xl font-black text-gray-900 dark:text-white mt-1 block">{events.length}</span>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 shadow-sm">
            <span className="text-[11px] font-semibold text-green-600 dark:text-[#4bd043] uppercase tracking-wider block">Upcoming</span>
            <span className="text-2xl font-black text-green-600 dark:text-[#4bd043] mt-1 block">{upcomingCount}</span>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 shadow-sm">
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">Recent</span>
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 block">{recentCount}</span>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 shadow-sm">
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Past / Concluded</span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block">{pastCount}</span>
          </div>
        </div>

        {/* Filter and Actions Bar */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-gray-100 dark:bg-[#041801] rounded-xl border border-gray-200 dark:border-[#138601]/20">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-[#138601] text-white shadow-sm'
                    : 'text-gray-600 dark:text-green-200/70 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search & Add Button */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 md:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-gray-50 dark:bg-[#041801] border border-gray-200 dark:border-[#138601]/30 text-gray-900 dark:text-white focus:outline-none focus:border-[#138601]"
              />
            </div>

            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] transition-all shadow-sm cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Add Event
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            feedback.type === 'error'
              ? 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800/40'
              : 'bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800/40'
          }`}>
            <Check className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Events Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((evt) => (
            <div
              key={evt.id || evt.slug}
              className="rounded-2xl overflow-hidden bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 flex flex-col shadow-sm hover:border-[#138601] transition-all group"
            >
              <div className="relative aspect-[16/10] bg-gray-100 dark:bg-[#041801] overflow-hidden">
                <CloudinaryImage
                  src={evt.image_url || evt.image}
                  alt={evt.title}
                  preset="card"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Status Badges */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${
                    evt.category === 'upcoming'
                      ? 'bg-green-600 text-white'
                      : evt.category === 'recent'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-600 text-white'
                  }`}>
                    {evt.category?.toUpperCase() || 'UPCOMING'}
                  </span>
                  
                  {evt.is_featured && (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500 text-white flex items-center gap-1 shadow-sm">
                      <Sparkles className="w-2.5 h-2.5" /> Featured
                    </span>
                  )}
                  
                  {!evt.is_published && (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-black/75 text-amber-300">
                      Hidden
                    </span>
                  )}
                </div>

                {/* Action Buttons Overlay */}
                <div className="absolute top-3 right-3 flex gap-1.5">
                  <button
                    type="button"
                    title={evt.is_featured ? 'Remove from featured' : 'Highlight as featured'}
                    onClick={() => handleToggleFeatured(evt.id)}
                    className={`p-2 rounded-lg backdrop-blur cursor-pointer transition-colors ${
                      evt.is_featured ? 'bg-amber-500 text-white' : 'bg-black/60 hover:bg-amber-500 text-white'
                    }`}
                  >
                    <Star className="w-3.5 h-3.5" fill={evt.is_featured ? 'currentColor' : 'none'} />
                  </button>
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
                    title={evt.is_published ? 'Hide from website' : 'Make live on website'}
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
                      <span>{evt.date || evt.event_date} {evt.time ? `• ${evt.time}` : ''}</span>
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

                <div className="pt-2 border-t border-gray-100 dark:border-[#138601]/20 flex items-center justify-between text-[10px] text-gray-400 font-mono">
                  <span>Slug: /{evt.slug}</span>
                  {(evt.registration_link || evt.registrationLink) && (
                    <a
                      href={evt.registration_link || evt.registrationLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#138601] dark:text-[#4bd043] font-sans font-semibold hover:underline flex items-center gap-1"
                    >
                      Registration <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredEvents.length === 0 && (
            <div className="col-span-full py-16 text-center text-gray-500 dark:text-green-200/50">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40 text-[#138601]" />
              <p className="text-sm">No events found matching your filter criteria.</p>
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#138601]/20 pb-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {modalMode === 'edit' ? 'Edit Event Details' : 'Add New Event to Website'}
                </h3>
                <button onClick={() => setIsAddOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
              </div>

              <form onSubmit={handleSaveEvent} className="space-y-3.5 text-xs">
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
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-green-200">Event Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Masked Affairs: Cum and Mingle"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-[#138601]/40 text-gray-900 dark:text-white focus:outline-none focus:border-[#138601]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1 text-gray-700 dark:text-green-200">Category *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-[#138601]/40 text-gray-900 dark:text-white focus:outline-none focus:border-[#138601]"
                    >
                      <option value="upcoming">Upcoming Event</option>
                      <option value="recent">Recent Event</option>
                      <option value="past">Past / Concluded Event</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-gray-700 dark:text-green-200">URL Slug (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. masked-affairs-2026"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-[#138601]/40 text-gray-900 dark:text-white focus:outline-none focus:border-[#138601]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1 text-gray-700 dark:text-green-200">Event Date *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Aug 15, 2026"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-[#138601]/40 text-gray-900 dark:text-white focus:outline-none focus:border-[#138601]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-gray-700 dark:text-green-200">Time</label>
                    <input
                      type="text"
                      placeholder="e.g. 8:00 PM"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-[#138601]/40 text-gray-900 dark:text-white focus:outline-none focus:border-[#138601]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-green-200">Venue / Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SOPS Theatre, FUTO"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-[#138601]/40 text-gray-900 dark:text-white focus:outline-none focus:border-[#138601]"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-green-200">Registration / RSVP Link (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://forms.gle/..."
                    value={registrationLink}
                    onChange={(e) => setRegistrationLink(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-[#138601]/40 text-gray-900 dark:text-white focus:outline-none focus:border-[#138601]"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-gray-700 dark:text-green-200">Event Description *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Provide full event overview, guest speakers, attire, and schedule..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-[#138601]/40 text-gray-900 dark:text-white focus:outline-none focus:border-[#138601]"
                  />
                </div>

                <div className="pt-1">
                  <MediaUpload
                    folder={CLOUDINARY_FOLDERS.EVENTS}
                    label={modalMode === 'edit' ? 'Replace Event Flyer (Cloudinary CDN)' : 'Official Event Flyer (Cloudinary CDN)'}
                    aspectRatio="landscape"
                    onUploadSuccess={({ url, publicId }) => {
                      setFlyerUrl(url);
                      setFlyerPublicId(publicId);
                    }}
                  />
                </div>

                <div className="flex items-center gap-6 pt-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPublished}
                      onChange={(e) => setIsPublished(e.target.checked)}
                      className="rounded border-gray-300 text-[#138601] focus:ring-[#138601]"
                    />
                    <span className="font-semibold text-gray-700 dark:text-green-200">Publish immediately</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isFeatured}
                      onChange={(e) => setIsFeatured(e.target.checked)}
                      className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                    />
                    <span className="font-semibold text-gray-700 dark:text-green-200">Mark as Featured</span>
                  </label>
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-gray-100 dark:border-[#138601]/20">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-[#041801] text-gray-700 dark:text-gray-300 hover:bg-gray-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 rounded-xl bg-[#138601] hover:bg-[#0f6c01] text-white font-semibold cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : modalMode === 'edit' ? 'Save Changes' : 'Publish Event'}
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
