import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('[process-scheduled-campaigns] Checking for scheduled campaigns...');

    // Find campaigns that are scheduled and ready to start
    const now = new Date().toISOString();
    
    const { data: scheduledCampaigns, error } = await supabase
      .from('campaigns')
      .select('id, name, scheduled_at')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now);

    if (error) {
      console.error('[process-scheduled-campaigns] Error fetching campaigns:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch campaigns' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!scheduledCampaigns || scheduledCampaigns.length === 0) {
      console.log('[process-scheduled-campaigns] No scheduled campaigns ready to start');
      return new Response(
        JSON.stringify({ processed: 0, message: 'No campaigns to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[process-scheduled-campaigns] Found ${scheduledCampaigns.length} campaigns to process`);

    let processed = 0;
    const errors: string[] = [];

    for (const campaign of scheduledCampaigns) {
      try {
        console.log(`[process-scheduled-campaigns] Starting campaign: ${campaign.name} (${campaign.id})`);

        // Call the send-campaign-messages function
        const { error: invokeError } = await supabase.functions.invoke('send-campaign-messages', {
          body: { campaign_id: campaign.id },
        });

        if (invokeError) {
          console.error(`[process-scheduled-campaigns] Error starting campaign ${campaign.id}:`, invokeError);
          errors.push(`Campaign ${campaign.id}: ${invokeError.message}`);
        } else {
          processed++;
          console.log(`[process-scheduled-campaigns] Campaign ${campaign.id} started successfully`);
        }
      } catch (err: any) {
        console.error(`[process-scheduled-campaigns] Exception for campaign ${campaign.id}:`, err);
        errors.push(`Campaign ${campaign.id}: ${err.message}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        processed, 
        total: scheduledCampaigns.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[process-scheduled-campaigns] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
