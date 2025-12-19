import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to get Evolution API auth headers based on provider type
function getEvolutionAuthHeaders(apiKey: string, providerType: string): Record<string, string> {
  // Evolution Cloud confirmou: ambos usam header 'apikey'
  return { apikey: apiKey };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[sync-contact-profiles] Starting batch profile picture sync');

    // Initialize Supabase client with service role for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch all contacts without profile picture
    const { data: contacts, error: fetchError } = await supabase
      .from('whatsapp_contacts')
      .select('id, phone_number, instance_id, name')
      .is('profile_picture_url', null);

    if (fetchError) {
      console.error('[sync-contact-profiles] Error fetching contacts:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch contacts', details: fetchError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!contacts || contacts.length === 0) {
      console.log('[sync-contact-profiles] No contacts without profile picture found');
      return new Response(
        JSON.stringify({ message: 'No contacts to sync', updated: 0, failed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[sync-contact-profiles] Found ${contacts.length} contacts without profile picture`);

    let updated = 0;
    let failed = 0;

    // 2. Process each contact
    for (const contact of contacts) {
      try {
        // Get instance secrets
        const { data: secrets, error: secretsError } = await supabase
          .from('whatsapp_instance_secrets')
          .select('api_url, api_key')
          .eq('instance_id', contact.instance_id)
          .maybeSingle();

        if (secretsError || !secrets) {
          console.error(`[sync-contact-profiles] No secrets found for instance: ${contact.instance_id}`);
          failed++;
          continue;
        }

        // Get instance name and provider_type
        const { data: instance, error: instanceError } = await supabase
          .from('whatsapp_instances')
          .select('instance_name, provider_type')
          .eq('id', contact.instance_id)
          .maybeSingle();

        if (instanceError || !instance) {
          console.error(`[sync-contact-profiles] Instance not found: ${contact.instance_id}`);
          failed++;
          continue;
        }

        const providerType = (instance as any).provider_type || 'self_hosted';
        const authHeaders = getEvolutionAuthHeaders(secrets.api_key, providerType);

        // Fetch profile from Evolution API
        const response = await fetch(
          `${secrets.api_url}/chat/fetchProfile/${instance.instance_name}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...authHeaders,
            },
            body: JSON.stringify({ number: contact.phone_number }),
          }
        );

        if (!response.ok) {
          console.error(`[sync-contact-profiles] Failed to fetch profile for ${contact.phone_number}: ${response.status}`);
          failed++;
          continue;
        }

        const profileData = await response.json();
        const profilePictureUrl = profileData.profilePictureUrl || profileData.picture;

        if (profilePictureUrl) {
          // Update contact with profile picture
          const { error: updateError } = await supabase
            .from('whatsapp_contacts')
            .update({
              profile_picture_url: profilePictureUrl,
              updated_at: new Date().toISOString(),
            })
            .eq('id', contact.id);

          if (updateError) {
            console.error(`[sync-contact-profiles] Failed to update contact ${contact.id}:`, updateError);
            failed++;
          } else {
            console.log(`[sync-contact-profiles] Updated profile picture for contact: ${contact.name} (${contact.phone_number})`);
            updated++;
          }
        } else {
          console.log(`[sync-contact-profiles] No profile picture available for: ${contact.phone_number}`);
          failed++;
        }

        // Add small delay to avoid rate limiting (50ms between requests)
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`[sync-contact-profiles] Error processing contact ${contact.id}:`, error);
        failed++;
      }
    }

    console.log(`[sync-contact-profiles] Sync complete - Updated: ${updated}, Failed: ${failed}`);

    return new Response(
      JSON.stringify({
        message: 'Profile picture sync completed',
        total: contacts.length,
        updated,
        failed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[sync-contact-profiles] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});