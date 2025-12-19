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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[setup-project-config] Starting automatic project configuration...');

    // 1. Store project credentials in project_config table
    console.log('[setup-project-config] Storing project credentials...');
    
    const { error: configError1 } = await supabase
      .from('project_config')
      .upsert({ key: 'project_url', value: supabaseUrl }, { onConflict: 'key' });

    const { error: configError2 } = await supabase
      .from('project_config')
      .upsert({ key: 'anon_key', value: supabaseAnonKey }, { onConflict: 'key' });

    if (configError1 || configError2) {
      console.error('[setup-project-config] Error storing config:', configError1 || configError2);
      throw new Error('Failed to store configuration');
    }

    console.log('[setup-project-config] Configuration completed successfully!');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Project configuration completed successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('[setup-project-config] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 200, // Always return 200 to avoid retries
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
