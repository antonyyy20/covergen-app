# App Store Cover Generator - Setup Guide

## Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Environment variables configured

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Supabase Setup

### 1. Database Schema

The database schema should already be deployed in your Supabase project with these tables:
- `profiles`
- `projects`
- `assets`
- `generation_jobs`
- `job_assets`
- `generated_outputs`

### 2. Storage Bucket Setup

1. Go to Supabase Dashboard > Storage
2. Create a new bucket named `app-covers`
3. Set it to **PRIVATE** (recommended for security)
4. Configure bucket policies:
   - Allow authenticated users to upload: `projects/{projectId}/assets/{assetId}.{ext}`
   - Allow authenticated users to read: Same path pattern

Example RLS Policy for Storage:
```sql
-- Allow authenticated users to upload to their project folders
CREATE POLICY "Users can upload to own projects"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'app-covers' AND
  (storage.foldername(name))[1] = 'projects' AND
  auth.uid()::text = (SELECT user_id::text FROM projects WHERE id::text = (storage.foldername(name))[2] LIMIT 1)
);

-- Allow authenticated users to read from their project folders
CREATE POLICY "Users can read from own projects"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'app-covers' AND
  (storage.foldername(name))[1] = 'projects' AND
  auth.uid()::text = (SELECT user_id::text FROM projects WHERE id::text = (storage.foldername(name))[2] LIMIT 1)
);
```

### 3. Database Triggers

Ensure you have a trigger to create a profile when a user signs up:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    'user',
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 4. Row Level Security (RLS)

Ensure RLS is enabled on all tables with policies like:

```sql
-- Example for projects table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects"
ON projects FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects"
ON projects FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
ON projects FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
ON projects FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

Apply similar policies to `assets`, `generation_jobs`, `job_assets`, and `generated_outputs` tables.

## Running the Application

1. Start the development server:
```bash
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000)

## Vercel Deployment

### Environment Variables

Set these in Vercel Dashboard > Settings > Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Supabase Redirect URLs

Add these redirect URLs in Supabase Dashboard > Authentication > URL Configuration:
- `http://localhost:3000/auth/callback` (development)
- `https://your-domain.vercel.app/auth/callback` (production)

## Features

✅ Beautiful landing page with Magic UI components  
✅ Email/password authentication  
✅ Protected dashboard with sidebar navigation  
✅ Projects CRUD (Create, Read, Update, Delete)  
✅ Assets upload with Supabase Storage  
✅ Generation jobs creation and management  
✅ Outputs viewing with image previews  
✅ Responsive design with dark mode support  
✅ Real-time data with RLS protection  

## Project Structure

```
app/
  ├── app/              # Protected app routes
  │   ├── layout.tsx    # App shell layout
  │   ├── page.tsx      # Dashboard
  │   └── projects/     # Projects pages
  ├── login/            # Login page
  ├── register/         # Register page
  ├── auth/             # Auth routes
  └── page.tsx          # Landing page

components/
  ├── ui/               # shadcn/ui components
  ├── app/              # App shell components
  └── projects/         # Project-related components

lib/
  └── supabase/         # Supabase client helpers
```

## Google Imagen API Configuration

See [GOOGLE_SETUP.md](./GOOGLE_SETUP.md) for detailed instructions on setting up Google Imagen API with nano/banana models.

### Quick Setup

1. Get API Key from:
   - https://aistudio.google.com/app/apikey (Gemini API)
   - OR Google Cloud Console (Vertex AI)

2. Add to `.env.local`:
   ```env
   GOOGLE_IMAGEN_API_KEY=your_api_key_here
   # OR
   GEMINI_API_KEY=your_api_key_here
   ```

3. Test by creating a job in the app

## Troubleshooting

- **Storage upload fails**: Check bucket policies and ensure bucket is created
- **Authentication issues**: Verify redirect URLs in Supabase dashboard
- **RLS errors**: Ensure policies are correctly set up for authenticated users
- **Image previews not showing**: Check Next.js image config and Supabase storage policies
- **Job fails with "API key not configured"**: Add `GOOGLE_IMAGEN_API_KEY` or `GEMINI_API_KEY` to `.env.local`
- **Job fails with "All endpoints failed"**: Verify API key is valid and Google Imagen API is available in your region
- **Generation takes too long**: Normal for "banana" model, can take 30-60 seconds per image
