import React, { useState, useEffect } from 'react';
import WebsiteAdminLayout from '../components/WebsiteAdminLayout';
import { 
  Camera, 
  Plus, 
  Trash2, 
  Star, 
  Check, 
  Search, 
  Edit3, 
  Eye, 
  Upload,
  AlertCircle
} from 'lucide-react';
import { MediaUpload, CloudinaryImage, CLOUDINARY_FOLDERS, deleteMedia } from '@nacos/media';
import { recordAdminAction } from '@nacos/supabase/adminAuth';
import { syncWebsiteGalleryItem } from '@nacos/supabase/media';
import { supabase } from '@nacos/supabase';

const INITIAL_GALLERY = [
  {
    id: 'gal-1',
    title: 'Department Front Entrance',
    caption: 'NACOS Student Leaders at the Department of Computer Science (TETFUND Complex)',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569317/nacos/gallery/gallery_dept_front.jpg',
    cloudinary_public_id: 'nacos/gallery/gallery_dept_front',
    category: 'Academics',
    is_featured: true,
    created_at: '2026-08-10T12:00:00Z'
  },
  {
    id: 'gal-2',
    title: 'Student Group Mixer',
    caption: 'FUTO Computing Students Outdoor Hangout & Mixer',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569318/nacos/gallery/gallery_student_group.jpg',
    cloudinary_public_id: 'nacos/gallery/gallery_student_group',
    category: 'Socials',
    is_featured: true,
    created_at: '2026-08-12T14:30:00Z'
  },
  {
    id: 'gal-3',
    title: 'Cultural Day Celebrations',
    caption: 'Traditional Attire Cultural Day Celebrations',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569319/nacos/gallery/gallery_traditional_day.jpg',
    cloudinary_public_id: 'nacos/gallery/gallery_traditional_day',
    category: 'Culture',
    is_featured: true,
    created_at: '2026-08-15T16:00:00Z'
  },
  {
    id: 'gal-4',
    title: 'Community Nature Outing',
    caption: 'Student Community Outing & Nature Meetup',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569318/nacos/gallery/gallery_nature_hangout.jpg',
    cloudinary_public_id: 'nacos/gallery/gallery_nature_hangout',
    category: 'Socials',
    is_featured: false,
    created_at: '2026-08-18T10:00:00Z'
  },
  {
    id: 'gal-5',
    title: 'Tech Symposium Panel',
    caption: 'Tech Symposium Panel Discussion with Industry Guest Speakers',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569327/nacos/gallery/nacos1.jpg',
    cloudinary_public_id: 'nacos/gallery/nacos1',
    category: 'Tech Events',
    is_featured: false,
    created_at: '2026-08-20T11:00:00Z'
  },
  {
    id: 'gal-6',
    title: 'Hackathon Sprint',
    caption: 'Hackathon Sprint & Collaborative Coding Arena',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569330/nacos/gallery/nacos2.jpg',
    cloudinary_public_id: 'nacos/gallery/nacos2',
    category: 'Tech Events',
    is_featured: false,
    created_at: '2026-08-22T09:00:00Z'
  },
  {
    id: 'gal-7',
    title: 'Software Project Demo Day',
    caption: 'Departmental Software Project Demonstration Day',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569331/nacos/gallery/nacos3.jpg',
    cloudinary_public_id: 'nacos/gallery/nacos3',
    category: 'Academics',
    is_featured: false,
    created_at: '2026-08-25T13:00:00Z'
  },
  {
    id: 'gal-8',
    title: 'Freshmen Induction Ceremony',
    caption: 'Freshmen Orientation & Computing Induction Ceremony',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569332/nacos/gallery/nacos4.jpg',
    cloudinary_public_id: 'nacos/gallery/nacos4',
    category: 'Campus Life',
    is_featured: false,
    created_at: '2026-08-28T10:00:00Z'
  },
  {
    id: 'gal-9',
    title: 'NACOS Dinner & Awards Gala',
    caption: 'Annual NACOS Dinner & Outstanding Scholar Awards Gala',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569332/nacos/gallery/nacos5.jpg',
    cloudinary_public_id: 'nacos/gallery/nacos5',
    category: 'Culture',
    is_featured: false,
    created_at: '2026-09-01T18:00:00Z'
  },
  {
    id: 'gal-10',
    title: 'Cloud & Security Workshop',
    caption: 'Hands-on Cloud & Cyber Security Workshop Session',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569333/nacos/gallery/nacos6.jpg',
    cloudinary_public_id: 'nacos/gallery/nacos6',
    category: 'Tech Events',
    is_featured: false,
    created_at: '2026-09-03T15:00:00Z'
  },
  {
    id: 'gal-11',
    title: 'Sports Championship & Relay',
    caption: 'Departmental Sports Championship & Track Relay',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569334/nacos/gallery/nacos7.jpg',
    cloudinary_public_id: 'nacos/gallery/nacos7',
    category: 'Sports',
    is_featured: false,
    created_at: '2026-09-05T16:00:00Z'
  },
  {
    id: 'gal-12',
    title: 'Alumni Career Talk',
    caption: 'Alumni Tech Talk & Career Advisory Fireside Chat',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569335/nacos/gallery/nacos8.jpg',
    cloudinary_public_id: 'nacos/gallery/nacos8',
    category: 'Academics',
    is_featured: false,
    created_at: '2026-09-08T12:00:00Z'
  }
];

const AdminGallery = () => {
  const [items, setItems] = useState(INITIAL_GALLERY);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // New Item State
  const [newItemCaption, setNewItemCaption] = useState('');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Campus Life');
  const [newItemFeatured, setNewItemFeatured] = useState(false);

  useEffect(() => {
    async function loadGallery() {
       try {
         const { data, error } = await supabase
           .from('website_gallery')
           .select('*')
           .order('sort_order', { ascending: true });

         if (!error && data && data.length > 0) {
           const mapped = data.map(d => ({
             id: d.id,
             title: d.title,
             caption: d.caption,
             image_url: d.image_url,
             cloudinary_public_id: d.cloudinary_public_id,
             category: d.category,
             is_featured: d.is_featured,
             created_at: d.created_at
           }));
           const dbIds = new Set(mapped.map(m => m.cloudinary_public_id));
           setItems([...mapped, ...INITIAL_GALLERY.filter(i => !dbIds.has(i.cloudinary_public_id))]);
           return;
         }
       } catch (err) {
         console.warn('Supabase gallery query bypassed:', err);
       }

       const stored = localStorage.getItem('nacos_website_gallery_store');
       if (stored) {
         try {
           setItems(JSON.parse(stored));
         } catch (e) {
           console.error(e);
         }
       }
    }
    loadGallery();
  }, []);

  const showFeedback = (text, type = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleToggleFeatured = async (id) => {
    const updated = items.map(item => {
      if (item.id === id) {
        const next = !item.is_featured;
        recordAdminAction('gallery_feature_toggle', 'gallery', item.cloudinary_public_id, {
          is_featured: next
        });
        if (item.cloudinary_public_id) {
          supabase.from('website_gallery').update({ is_featured: next }).eq('cloudinary_public_id', item.cloudinary_public_id).then(() => {});
        }
        return { ...item, is_featured: next };
      }
      return item;
    });

    setItems(updated);
    localStorage.setItem('nacos_website_gallery_store', JSON.stringify(updated));
    showFeedback('Gallery featured status updated in database.');
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.caption}" from the website gallery?`)) return;

    if (item.cloudinary_public_id) {
      await deleteMedia(item.cloudinary_public_id);
      try {
        await supabase.from('website_gallery').delete().eq('cloudinary_public_id', item.cloudinary_public_id);
      } catch (e) {
        console.warn('Supabase gallery delete bypassed', e);
      }
    }

    const updated = items.filter(i => i.id !== item.id);
    setItems(updated);
    localStorage.setItem('nacos_website_gallery_store', JSON.stringify(updated));

    await recordAdminAction('gallery_delete', 'gallery', item.cloudinary_public_id, {
      title: item.title
    });

    showFeedback('Photo removed from campus gallery and database.');
  };

  const handleUploadSuccess = async ({ url, publicId }) => {
    const newItem = {
      id: `gal-${Date.now()}`,
      title: newItemTitle || 'Campus Moment',
      caption: newItemCaption || 'FUTO Computing Community photo',
      image_url: url,
      cloudinary_public_id: publicId,
      category: newItemCategory,
      is_featured: newItemFeatured,
      created_at: new Date().toISOString()
    };

    // Two-way sync to Cloudinary + Supabase
    await syncWebsiteGalleryItem(newItem);

    const updated = [newItem, ...items.filter(i => i.cloudinary_public_id !== publicId)];
    setItems(updated);
    localStorage.setItem('nacos_website_gallery_store', JSON.stringify(updated));

    await recordAdminAction('gallery_create', 'gallery', publicId, {
      caption: newItem.caption,
      category: newItem.category
    });

    setIsAddOpen(false);
    setNewItemTitle('');
    setNewItemCaption('');
    showFeedback('Photo published & synced with database & Cloudinary!');
  };

  return (
    <WebsiteAdminLayout
      title="Campus Life Gallery Manager"
      subtitle="Curate the photo memories, student meetups, and academic milestones shown on the public website."
    >
      <div className="space-y-6">
        
        {/* Actions Bar */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 flex items-center justify-between">
          <div className="text-xs text-gray-500 dark:text-green-200/70">
            Showing <strong className="text-gray-900 dark:text-white">{items.length}</strong> active gallery photos
          </div>

          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#138601] hover:bg-[#0f6c01] transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Photo to Gallery
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800/40">
            <Check className="w-4 h-4 text-[#138601] dark:text-[#4bd043]" />
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl overflow-hidden bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/30 flex flex-col shadow-sm group hover:border-[#138601] transition-all"
            >
              <div className="relative aspect-[4/3] bg-gray-100 dark:bg-[#041801] overflow-hidden">
                <CloudinaryImage
                  src={item.image_url}
                  alt={item.caption}
                  preset="gallery_preview"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                <div className="absolute top-3 left-3 flex gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide bg-black/75 text-white backdrop-blur">
                    {item.category}
                  </span>
                  {item.is_featured && (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500 text-black flex items-center gap-1">
                      <Star className="w-3 h-3 fill-black" /> Featured
                    </span>
                  )}
                </div>

                <div className="absolute top-3 right-3 flex gap-1.5">
                  <button
                    type="button"
                    title={item.is_featured ? 'Remove from featured' : 'Mark as featured'}
                    onClick={() => handleToggleFeatured(item.id)}
                    className={`p-2 rounded-lg backdrop-blur cursor-pointer transition-colors ${
                      item.is_featured ? 'bg-amber-400 text-black' : 'bg-black/60 text-white hover:bg-black'
                    }`}
                  >
                    <Star className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Delete Photo"
                    onClick={() => handleDelete(item)}
                    className="p-2 rounded-lg bg-red-600/80 hover:bg-red-600 text-white backdrop-blur cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between text-xs space-y-2">
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white leading-snug">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-green-200/70 mt-1 line-clamp-2">
                    {item.caption}
                  </p>
                </div>

                <div className="pt-2 border-t border-gray-100 dark:border-[#138601]/20 flex items-center justify-between text-[10px] text-gray-400 font-mono">
                  <span>{item.cloudinary_public_id}</span>
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Modal */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#083002] border border-gray-200 dark:border-[#138601]/40 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#138601]/20 pb-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Add Photo to Campus Gallery
                </h3>
                <button onClick={() => setIsAddOpen(false)} className="text-gray-400">✕</button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Traditional Attire Day 2026"
                    value={newItemTitle}
                    onChange={(e) => setNewItemTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-[#138601]/40"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Detailed Caption</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Describe this moment..."
                    value={newItemCaption}
                    onChange={(e) => setNewItemCaption(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-[#138601]/40"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Category</label>
                    <select
                      value={newItemCategory}
                      onChange={(e) => setNewItemCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#041801] border border-gray-300 dark:border-[#138601]/40"
                    >
                      <option value="Campus Life">Campus Life</option>
                      <option value="Academics">Academics</option>
                      <option value="Culture">Culture</option>
                      <option value="Socials">Socials</option>
                      <option value="Tech Events">Tech Events</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="featCheck"
                      checked={newItemFeatured}
                      onChange={(e) => setNewItemFeatured(e.target.checked)}
                      className="rounded text-[#138601]"
                    />
                    <label htmlFor="featCheck" className="font-semibold cursor-pointer">
                      Feature on Homepage
                    </label>
                  </div>
                </div>

                <div className="pt-2">
                  <MediaUpload
                    folder={CLOUDINARY_FOLDERS.GALLERY}
                    label="Upload Photo (Cloudinary CDN)"
                    aspectRatio="landscape"
                    previewPreset="gallery_preview"
                    onUploadSuccess={handleUploadSuccess}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </WebsiteAdminLayout>
  );
};

export default AdminGallery;
