# App Store Cover Generator

A production-ready MVP web app for generating App Store & Play Store covers using AI. Built with Next.js, Supabase, and shadcn/ui.

## ✨ Features

- 🎨 **Beautiful Landing Page** with Magic UI components (animated gradients, meteors, marquee, etc.)
- 🔐 **Authentication** - Email/password sign up and sign in with Supabase Auth
- 📱 **Protected Dashboard** - Modern sidebar layout with responsive design
- 📁 **Projects Management** - Full CRUD for cover generation projects
- 📸 **Assets Upload** - Upload screenshots, logos, and reference images to Supabase Storage
- 🤖 **Generation Jobs** - Create and manage AI cover generation jobs
- 🎯 **Outputs Preview** - View generated covers with image previews
- 🌙 **Dark Mode** - Built-in dark mode support
- 🔒 **RLS Protection** - All data secured with Row Level Security

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account with a project

### Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

### Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Imagen API (choose one):
GOOGLE_IMAGEN_API_KEY=your_google_imagen_api_key
# OR
GEMINI_API_KEY=your_gemini_api_key

# Optional: For Vertex AI
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_CLOUD_LOCATION=us-central1
```

### Supabase Setup

1. **Create Storage Bucket**: Go to Storage > Create bucket `app-covers` (set to PRIVATE)

2. **Database Schema**: The schema should already be deployed. If not, ensure these tables exist:
   - `profiles` (id, name, role, is_active, created_at, updated_at)
   - `projects` (id, user_id, title, platform, app_name, locale, notes, created_at, updated_at)
   - `assets` (id, project_id, user_id, type, original_filename, mime_type, size_bytes, width, height, storage_provider, storage_key, public_url, checksum_sha256, created_at, deleted_at)
   - `generation_jobs` (id, project_id, user_id, status, provider, model, prompt, target_store, num_variations, created_at, etc.)
   - `job_assets` (job_id, asset_id, role)
   - `generated_outputs` (id, job_id, project_id, user_id, variant_index, label, mime_type, storage_key, public_url, created_at, etc.)

3. **Enable RLS**: Enable Row Level Security on all tables with policies allowing authenticated users to access only their own data.

4. **Set up Trigger**: Create a trigger to automatically create a profile when a user signs up (see SETUP.md for SQL).

See [SETUP.md](./SETUP.md) for detailed Supabase configuration instructions.

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
generador_de_portadas/
├── app/
│   ├── app/                    # Protected app routes
│   │   ├── layout.tsx          # App shell with sidebar/topbar
│   │   ├── page.tsx            # Dashboard
│   │   └── projects/           # Projects pages
│   ├── login/                  # Login page
│   ├── register/               # Register page
│   ├── auth/                   # Auth routes (logout)
│   ├── page.tsx                # Landing page
│   ├── layout.tsx              # Root layout
│   └── globals.css             # Global styles
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── app/                    # App shell components
│   │   ├── sidebar.tsx
│   │   └── topbar.tsx
│   └── projects/               # Project-related components
│       ├── projects-list.tsx
│       ├── create-project-dialog.tsx
│       ├── edit-project-dialog.tsx
│       ├── delete-project-dialog.tsx
│       ├── assets-tab.tsx
│       ├── upload-asset-dialog.tsx
│       ├── jobs-tab.tsx
│       ├── create-job-dialog.tsx
│       ├── job-details-dialog.tsx
│       └── outputs-tab.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser Supabase client
│   │   └── server.ts           # Server Supabase client
│   └── utils.ts                # Utility functions
├── middleware.ts               # Session refresh & route protection
└── tailwind.config.ts          # Tailwind configuration
```

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Database & Auth**: Supabase (Postgres + Auth + Storage)
- **UI Components**: shadcn/ui + Radix UI
- **Styling**: TailwindCSS
- **Magic UI**: Custom components (marquee, meteors, animated gradients, magic cards)
- **Forms**: React Hook Form + Zod validation
- **Notifications**: Sonner (toast)
- **Icons**: Lucide React

## 📝 Key Features Implementation

### Authentication
- Email/password authentication via Supabase Auth
- Server-side session handling with `@supabase/ssr`
- Middleware for automatic session refresh
- Protected routes redirect to `/login`

### Projects CRUD
- List all user projects in a table
- Create projects with dialog form
- Edit projects inline
- Delete projects with confirmation dialog

### Assets Management
- Upload files to Supabase Storage bucket `app-covers`
- Files stored at path: `projects/{projectId}/assets/{assetId}.{ext}`
- Support for images with thumbnail previews
- Group assets by type (reference_cover, app_screenshot, brand_logo, other)
- Soft delete (sets `deleted_at` timestamp)

### Generation Jobs
- Create jobs with prompt, model selection (nano/banana), target store, variations
- Select multiple reference covers and app screenshots as input
- List jobs with status badges
- View job details in dialog
- Jobs stored with status `queued` (actual generation not implemented yet)

### Outputs
- List generated outputs for a project
- Display image previews using signed URLs
- Empty state when no outputs exist

## 🎨 Design System

- **Colors**: shadcn/ui theme with CSS variables for dark mode
- **Typography**: Geist Sans for body, Geist Mono for code
- **Components**: Consistent use of shadcn/ui components
- **Spacing**: Consistent spacing scale
- **Borders**: Rounded corners (rounded-lg, rounded-xl)
- **Shadows**: Soft shadows for cards and dialogs

## 🚢 Deployment

### Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

### Supabase Redirect URLs

Add these in Supabase Dashboard > Authentication > URL Configuration:
- `http://localhost:3000/auth/callback` (development)
- `https://your-domain.vercel.app/auth/callback` (production)

## 📚 Documentation

- [Setup Guide](./SETUP.md) - Detailed Supabase setup instructions
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [shadcn/ui Docs](https://ui.shadcn.com)

## 🔒 Security

- All database queries respect Row Level Security (RLS)
- Only authenticated users can access their own data
- Storage bucket is PRIVATE with signed URLs for image previews
- No service role keys exposed to the client
- Middleware protects all `/app` routes

## 🐛 Troubleshooting

**Storage upload fails**: Ensure bucket `app-covers` exists and is configured correctly with proper policies.

**Authentication redirects**: Check redirect URLs in Supabase Dashboard > Authentication.

**RLS errors**: Verify Row Level Security policies are set up correctly for all tables.

**Images not loading**: Check Next.js image config allows Supabase domain and storage policies allow reads.

## 📄 License

MIT
