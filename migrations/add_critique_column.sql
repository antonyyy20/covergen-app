-- Add critique column to generation_jobs table
ALTER TABLE public.generation_jobs
ADD COLUMN IF NOT EXISTS critique TEXT;

-- Add job_config column for storing full wizard configuration
ALTER TABLE public.generation_jobs
ADD COLUMN IF NOT EXISTS job_config JSONB;

COMMENT ON COLUMN public.generation_jobs.critique IS 'Rule-based critique of the cover design configuration';
COMMENT ON COLUMN public.generation_jobs.job_config IS 'Full configuration from the guided wizard (goals, style, variants, etc.)';
