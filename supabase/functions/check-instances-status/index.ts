import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to get Evolution API auth headers based on provider type
function getEvolutionAuthHeaders(apiKey: string, providerType: string): Record<string, string> {
  // Evolution Cloud confirmou: ambos usam header 'apikey'
  return { apikey: apiKey };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    console.log('[check-instances-status] Starting periodic status check');

    // Fetch all instances including provider_type and instance_id_external
    const { data: instances, error: instancesError } = await supabaseAdmin
      .from('whatsapp_instances')
      .select('id, instance_name, provider_type, instance_id_external');

    if (instancesError) {
      console.error('[check-instances-status] Failed to fetch instances:', instancesError);
      return new Response(JSON.stringify({ error: 'Failed to fetch instances' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[check-instances-status] Checking ${instances?.length || 0} instances`);

    let updatedCount = 0;
    let errorCount = 0;

    // Check each instance
    for (const instance of instances || []) {
      try {
        // Fetch secrets for this instance
        const { data: secrets, error: secretsError } = await supabaseAdmin
          .from('whatsapp_instance_secrets')
          .select('api_key, api_url')
          .eq('instance_id', instance.id)
          .single();

        if (secretsError || !secrets) {
          console.error(`[check-instances-status] Failed to fetch secrets for instance ${instance.id}`);
          errorCount++;
          continue;
        }

        const providerType = (instance as any).provider_type || 'self_hosted';
        const instanceIdExternal = (instance as any).instance_id_external;
        const authHeaders = getEvolutionAuthHeaders(secrets.api_key, providerType);

        // For Cloud, use instance_id_external (UUID) instead of instance_name
        const instanceIdentifier = providerType === 'cloud' && instanceIdExternal
          ? instanceIdExternal
          : instance.instance_name;

        // Check connection state via Evolution API
        const response = await fetch(
          `${secrets.api_url}/instance/connectionState/${instanceIdentifier}`,
          { headers: authHeaders }
        );

        if (!response.ok) {
          console.error(`[check-instances-status] Evolution API returned error for ${instance.instance_name}: ${response.status}`);
          
          // Mark as disconnected if API call fails
          await supabaseAdmin
            .from('whatsapp_instances')
            .update({ 
              status: 'disconnected',
              updated_at: new Date().toISOString()
            })
            .eq('id', instance.id);
          
          updatedCount++;
          continue;
        }

        const connectionData = await response.json();
        
        // Map Evolution API state to our status
        let newStatus = 'disconnected';
        if (connectionData.state === 'open' || connectionData.instance?.state === 'open') {
          newStatus = 'connected';
        } else if (connectionData.state === 'connecting') {
          newStatus = 'connecting';
        }

        // Update status in database
        await supabaseAdmin
          .from('whatsapp_instances')
          .update({ 
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', instance.id);

        console.log(`[check-instances-status] Updated ${instance.instance_name} to ${newStatus}`);
        updatedCount++;

      } catch (error) {
        console.error(`[check-instances-status] Error checking instance ${instance.instance_name}:`, error);
        errorCount++;
      }
    }

    console.log(`[check-instances-status] Check complete: ${updatedCount} updated, ${errorCount} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated: updatedCount,
        errors: errorCount
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('[check-instances-status] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});