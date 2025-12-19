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

    // Extract user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify admin or supervisor role
    const { data: isAdmin } = await supabaseAdmin.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    const { data: isSupervisor } = await supabaseAdmin.rpc('has_role', {
      _user_id: user.id,
      _role: 'supervisor'
    });

    if (!isAdmin && !isSupervisor) {
      return new Response(JSON.stringify({ error: 'Forbidden - Admin or Supervisor required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { instanceId } = await req.json();

    console.log('[test-instance-connection] Testing instance:', instanceId);

    // Fetch secrets with service role (bypasses RLS)
    const { data: secrets, error: secretsError } = await supabaseAdmin
      .from('whatsapp_instance_secrets')
      .select('api_key, api_url')
      .eq('instance_id', instanceId)
      .single();

    if (secretsError || !secrets) {
      console.error('[test-instance-connection] Failed to fetch secrets:', secretsError);
      return new Response(JSON.stringify({ error: 'Instance secrets not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch instance name, provider_type, and instance_id_external
    const { data: instance, error: instanceError } = await supabaseAdmin
      .from('whatsapp_instances')
      .select('instance_name, provider_type, instance_id_external')
      .eq('id', instanceId)
      .single();

    if (instanceError || !instance) {
      console.error('[test-instance-connection] Failed to fetch instance:', instanceError);
      return new Response(JSON.stringify({ error: 'Instance not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const providerType = (instance as any).provider_type || 'self_hosted';
    const instanceIdExternal = (instance as any).instance_id_external;
    console.log('[test-instance-connection] Provider type:', providerType, 'Instance ID External:', instanceIdExternal);

    // For Cloud, use instance_id_external (UUID) instead of instance_name
    const instanceIdentifier = providerType === 'cloud' && instanceIdExternal
      ? instanceIdExternal
      : instance.instance_name;

    // Test connection with Evolution API using correct auth headers
    console.log('[test-instance-connection] Testing connection to Evolution API with identifier:', instanceIdentifier);
    const authHeaders = getEvolutionAuthHeaders(secrets.api_key, providerType);
    
    const response = await fetch(
      `${secrets.api_url}/instance/connectionState/${instanceIdentifier}`,
      { headers: authHeaders }
    );

    if (!response.ok) {
      console.error('[test-instance-connection] Evolution API returned error:', response.status);
      const errorText = await response.text();
      console.error('[test-instance-connection] Error details:', errorText);
      return new Response(JSON.stringify({ error: 'Connection test failed', details: errorText }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle empty response body (Evolution Cloud returns empty body on success)
    const responseText = await response.text();
    let data: any = {};
    
    if (responseText) {
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.log('[test-instance-connection] Response is not JSON:', responseText);
      }
    }
    
    console.log('[test-instance-connection] Connection test successful, data:', JSON.stringify(data));

    // Map Evolution API state to our status
    // Empty response with 200 status means connected for Evolution Cloud
    let newStatus = 'disconnected';
    if (!responseText || data.state === 'open' || data.instance?.state === 'open') {
      newStatus = 'connected';
    } else if (data.state === 'connecting') {
      newStatus = 'connecting';
    }

    // Update status in database
    await supabaseAdmin
      .from('whatsapp_instances')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', instanceId);

    console.log(`[test-instance-connection] Updated instance status to ${newStatus}`);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[test-instance-connection] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});