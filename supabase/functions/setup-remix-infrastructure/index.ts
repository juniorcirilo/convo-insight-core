import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[setup-remix-infrastructure] Starting infrastructure setup...');

    const results = {
      bucketsCreated: [] as string[],
      bucketsExisted: [] as string[],
      errors: [] as string[],
    };

    // Create Storage Buckets
    console.log('[setup-remix-infrastructure] Creating storage buckets...');

    // Create whatsapp-media bucket
    const { data: whatsappMediaBucket } = await supabase
      .storage
      .getBucket('whatsapp-media');

    if (!whatsappMediaBucket) {
      const { error: createWhatsappMediaError } = await supabase
        .storage
        .createBucket('whatsapp-media', { public: true });
      
      if (createWhatsappMediaError) {
        console.error('[setup-remix-infrastructure] Error creating whatsapp-media bucket:', createWhatsappMediaError);
        results.errors.push(`whatsapp-media bucket: ${createWhatsappMediaError.message}`);
      } else {
        console.log('[setup-remix-infrastructure] Created whatsapp-media bucket');
        results.bucketsCreated.push('whatsapp-media');
      }
    } else {
      console.log('[setup-remix-infrastructure] whatsapp-media bucket already exists');
      results.bucketsExisted.push('whatsapp-media');
    }

    // Create avatars bucket
    const { data: avatarsBucket } = await supabase
      .storage
      .getBucket('avatars');

    if (!avatarsBucket) {
      const { error: createAvatarsError } = await supabase
        .storage
        .createBucket('avatars', { public: true });
      
      if (createAvatarsError) {
        console.error('[setup-remix-infrastructure] Error creating avatars bucket:', createAvatarsError);
        results.errors.push(`avatars bucket: ${createAvatarsError.message}`);
      } else {
        console.log('[setup-remix-infrastructure] Created avatars bucket');
        results.bucketsCreated.push('avatars');
      }
    } else {
      console.log('[setup-remix-infrastructure] avatars bucket already exists');
      results.bucketsExisted.push('avatars');
    }

    console.log('[setup-remix-infrastructure] Setup complete:', results);

    return new Response(
      JSON.stringify({
        success: results.errors.length === 0,
        message: results.bucketsCreated.length > 0 
          ? `Created ${results.bucketsCreated.length} bucket(s)`
          : 'All buckets already existed',
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('[setup-remix-infrastructure] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
