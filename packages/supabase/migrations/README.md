# NACOS FUTO Database Migrations & Schemas Guide

This directory contains versioned PostgreSQL migration scripts for Supabase.

---

## 📌 Which Script Should I Run?

### 1. Brand-New Database Setup (Recommended)
If you are setting up a new Supabase project or wiping and rebuilding the database:
- **Run `supabase_schema.sql` (at repository root)** or [`packages/supabase/src/schema.sql`](../src/schema.sql).
- Copy and paste the entire script into your **Supabase SQL Editor** and click **Run**.
- This sets up all 18 subsystems in one idempotent transaction:
  1. Academic System Configuration & Dynamic Level Calculation
  2. Verified Student Registry (FUTO Ground Truth Records)
  3. Student Profiles & Auth
  4. OTP 2FA Verification (Termii SMS & Resend Email)
  5. Verification Sessions & Rate Limiting
  6. Account Recovery Requests
  7. Administrative Users & Scopes (Portal & Website CMS isolation)
  8. Digital ID Card Applications & Verification
  9. Academic Courses & Curriculum
  10. Student Academic Results & CGPA
  11. Departmental Dues & Verification
  12. CMS News & Announcements
  13. CMS Events & Hackathons
  14. CMS Campus Gallery
  15. CMS Media Assets Library
  16. Admin Audit Trails
  17. Row Level Security (RLS) Policies
  18. Default Seed Data (Pre-seeded Super Admin, Portal Admin, Web Admin, Courses, Verified Students)

---

### 2. Incremental Migrations (Existing Database)
If your database is already populated and you want to apply specific version updates:

| Migration File | Date | Description |
| :--- | :--- | :--- |
| `20260903_student_id_card_system.sql` | 2026-09-03 | Creates digital ID cards and student verification schema. |
| `20260904_cloudinary_media_integration.sql` | 2026-09-04 | Media assets, Cloudinary integration tables, and policies. |
| `20260904_id_card_applications_system.sql` | 2026-09-04 | ID card application review and approval workflow tables. |
| `20260904_website_admin_auth_and_scopes.sql` | 2026-09-04 | Legacy admin auth, audit logs, and CMS roles. |
| `20260905_verified_students.sql` | 2026-09-05 | Institutional verified students table and lookup indexes. |
| `20260919_secure_registration_otp_system.sql` | 2026-09-19 | OTP verifications, verification sessions, rate limits, and recovery requests. |
| `20260920_fix_admin_scopes_schema.sql` | 2026-09-20 | Standalone migration to fix `admin_scopes` relation: adds `password_hash`, converts `id` to `TEXT`, nullifies `user_id`, and migrates `permissions` to `JSONB`. |

---

## 🔒 Administrative Access Setup
For initial setup and administration:
- Administrative scopes and role permissions are provisioned in the `admin_scopes` table.
- Administrators authenticate using email and cryptographic password hashes with scope-level isolation (`super_admin`, `student_portal`, `main_website`).
- Manage and rotate administrative credentials directly in your Supabase project dashboard or via the scoped admin consoles.
