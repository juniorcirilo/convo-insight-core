-- Add media fields to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'text',
ADD COLUMN IF NOT EXISTS media_mimetype TEXT;

-- Add index for scheduled campaigns lookup
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled 
ON public.campaigns(status, scheduled_at) 
WHERE status = 'scheduled';

-- Create comment explaining the media_type column
COMMENT ON COLUMN public.campaigns.media_type IS 'Type of message: text, image, document, video';