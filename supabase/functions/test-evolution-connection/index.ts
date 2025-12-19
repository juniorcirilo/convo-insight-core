import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getEvolutionAuthHeaders(apiKey: string, providerType: string): Record<string, string> {
  // Evolution Cloud confirmou: ambos usam header 'apikey'
  return {
    'apikey': apiKey,
    'Content-Type': 'application/json'
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { api_url, api_key, instance_name, instance_id_external, provider_type } = await req.json();

    console.log('🔍 Testing Evolution connection:', {
      provider_type,
      api_url,
      instance_name,
      instance_id_external: instance_id_external ? `${instance_id_external.substring(0, 8)}...` : null,
    });

    if (!api_url || !api_key || !instance_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: api_url, api_key, instance_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const headers = getEvolutionAuthHeaders(api_key, provider_type);
    
    // For cloud provider, use instance_id_external (UUID), otherwise use instance_name
    const instanceIdentifier = provider_type === 'cloud' && instance_id_external 
      ? instance_id_external 
      : instance_name;

    const fullUrl = `${api_url}/instance/connectionState/${instanceIdentifier}`;
    
    console.log('📡 Calling Evolution API:', {
      url: fullUrl,
      headers: {
        ...headers,
        ...(headers.Authorization ? { Authorization: `Bearer ${api_key.substring(0, 10)}...` } : {}),
        ...(headers.apikey ? { apikey: `${api_key.substring(0, 10)}...` } : {})
      }
    });

    const response = await fetch(fullUrl, { 
      method: 'GET',
      headers 
    });

    const responseText = await response.text();
    console.log('📥 Evolution API Response:', {
      status: response.status,
      statusText: response.statusText,
      body: responseText.substring(0, 500)
    });

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (!response.ok) {
      // IMPORTANT: return HTTP 200 so supabase-js doesn't treat it as an Edge Function failure.
      // We still surface the real upstream status in the JSON payload.
      console.error('❌ Evolution API error:', responseData);
      return new Response(
        JSON.stringify({
          success: false,
          error: responseData?.message || responseText || 'Connection test failed',
          status: response.status,
          details: responseData,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Connection test successful:', responseData);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: responseData,
        connectionState: responseData?.instance?.state || responseData?.state || 'unknown'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('❌ Error testing connection:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
