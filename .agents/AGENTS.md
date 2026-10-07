# Agent Rules & Guidelines

## Yellow Pages Business Cover Images
- Whenever adding or displaying business images/flyers in **Yellow Pages** (`YellowPages.jsx`), always set the `imagePosition` property to align the crop so that the brand name and main title logo on the flyer are clearly visible inside the card's header area.
- Common positions:
  - `top left`: for top-left aligned brand logos (e.g., Peacemaker Tech)
  - `top right`: for top-right aligned brand logos (e.g., Niforix)
  - `top center`: for top-centered brand titles/logos (e.g., Cypher.dev)

## Dynamic Live Data & Cloudinary/Supabase Synchronization
- **Zero Hardcoded Mock Data**: For all dynamic public sections and management dashboards—including **Alumni**, **Events**, **Campus Clubs**, **Yellow Pages**, **News / Articles**, **Gallery**, **NACOS Executives**, and **Spiritual Life**—never hardcode mock/demo items or Unsplash image links into components or service files.
- **Strict Supabase & Cloudinary Sourced**: All entities must be loaded live from Supabase database tables (`media_assets`, `website_events`, `website_news`, `website_gallery`, `id_card_settings`, etc.) and rendered via Cloudinary CDN URLs (`@nacos/media`).
- **Clean Empty Fallbacks**: Initial fallback arrays must default to `[]`. When no database records exist, dashboards and public pages must cleanly show empty states or real live additions created through the admin dashboards.
- **Admin Dashboard Synchronization**: All create, edit, approve, and delete actions performed in `website-admin` and `portal-admin` must immediately persist to Supabase and propagate in real-time across client views.

