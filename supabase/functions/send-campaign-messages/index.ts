import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Delay between messages (in milliseconds) to avoid rate limiting
const MESSAGE_DELAY_MS = 2000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { campaign_id } = await req.json();

    if (!campaign_id) {
      return new Response(
        JSON.stringify({ error: 'campaign_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[send-campaign-messages] Starting campaign:', campaign_id);

    // Fetch campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      console.error('[send-campaign-messages] Campaign not found:', campaignError);
      return new Response(
        JSON.stringify({ error: 'Campaign not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if campaign can be started
    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      return new Response(
        JSON.stringify({ error: `Campaign cannot be started. Current status: ${campaign.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get instance secrets
    const { data: secrets, error: secretsError } = await supabase
      .from('whatsapp_instance_secrets')
      .select('api_url, api_key')
      .eq('instance_id', campaign.instance_id)
      .single();

    if (secretsError || !secrets) {
      console.error('[send-campaign-messages] Failed to fetch instance secrets');
      return new Response(
        JSON.stringify({ error: 'Instance secrets not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get instance info
    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('instance_name, provider_type, instance_id_external')
      .eq('id', campaign.instance_id)
      .single();

    if (!instance) {
      console.error('[send-campaign-messages] Instance not found');
      return new Response(
        JSON.stringify({ error: 'Instance not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine which identifier to use for Evolution API calls
    const evolutionInstanceId = instance.provider_type === 'cloud' && instance.instance_id_external
      ? instance.instance_id_external
      : instance.instance_name;

    // Fetch target contacts with opt-in
    const targetContactIds = campaign.target_contacts || [];
    
    if (targetContactIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No target contacts specified' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: contacts, error: contactsError } = await supabase
      .from('whatsapp_contacts')
      .select('id, phone_number, name, opt_in')
      .in('id', targetContactIds)
      .eq('opt_in', true)
      .eq('is_group', false);

    if (contactsError) {
      console.error('[send-campaign-messages] Error fetching contacts:', contactsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch contacts' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-campaign-messages] Found ${contacts?.length || 0} contacts with opt-in`);

    // Update campaign status
    await supabase
      .from('campaigns')
      .update({
        status: 'sending',
        started_at: new Date().toISOString(),
        total_recipients: contacts?.length || 0,
      })
      .eq('id', campaign_id);

    // Create campaign logs for each contact
    const logsToInsert = (contacts || []).map(contact => ({
      campaign_id,
      contact_id: contact.id,
      status: 'pending',
    }));

    if (logsToInsert.length > 0) {
      await supabase.from('campaign_logs').insert(logsToInsert);
    }

    // Start sending messages in background
    const campaignData = {
      message_content: campaign.message_content,
      message_type: campaign.message_type || 'text',
      media_url: campaign.media_url,
      media_mimetype: campaign.media_mimetype,
    };

    (globalThis as any).EdgeRuntime?.waitUntil?.(sendCampaignMessages(
      supabase,
      campaign_id,
      campaignData,
      contacts || [],
      secrets.api_url,
      secrets.api_key,
      evolutionInstanceId,
      instance.provider_type || 'self_hosted'
    )) || sendCampaignMessages(
      supabase,
      campaign_id,
      campaignData,
      contacts || [],
      secrets.api_url,
      secrets.api_key,
      evolutionInstanceId,
      instance.provider_type || 'self_hosted'
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Campaign started',
        total_recipients: contacts?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[send-campaign-messages] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

interface CampaignData {
  message_content: string;
  message_type: string;
  media_url: string | null;
  media_mimetype: string | null;
}

async function sendCampaignMessages(
  supabase: any,
  campaignId: string,
  campaignData: CampaignData,
  contacts: Array<{ id: string; phone_number: string; name: string }>,
  apiUrl: string,
  apiKey: string,
  instanceName: string,
  providerType: string
) {
  console.log(`[send-campaign-messages] Starting to send ${contacts.length} messages`);
  console.log(`[send-campaign-messages] Message type: ${campaignData.message_type}`);

  let sentCount = 0;
  let failedCount = 0;

  // Determine correct auth header based on provider type
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (providerType === 'cloud') {
    headers['Authorization'] = `Bearer ${apiKey}`;
  } else {
    headers['apikey'] = apiKey;
  }

  for (const contact of contacts) {
    try {
      console.log(`[send-campaign-messages] Sending to: ${contact.phone_number}`);

      let endpoint: string;
      let body: any;

      // Choose endpoint and body based on message type
      switch (campaignData.message_type) {
        case 'image':
          endpoint = `${apiUrl}/message/sendMedia/${instanceName}`;
          body = {
            number: contact.phone_number,
            mediatype: 'image',
            media: campaignData.media_url,
            caption: campaignData.message_content || '',
          };
          break;

        case 'document':
          endpoint = `${apiUrl}/message/sendMedia/${instanceName}`;
          body = {
            number: contact.phone_number,
            mediatype: 'document',
            media: campaignData.media_url,
            caption: campaignData.message_content || '',
            fileName: 'document',
          };
          break;

        case 'text':
        default:
          endpoint = `${apiUrl}/message/sendText/${instanceName}`;
          body = {
            number: contact.phone_number,
            text: campaignData.message_content,
          };
          break;
      }

      // Send message via Evolution API
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const responseData = await response.json();

      if (response.ok && responseData.key) {
        sentCount++;
        
        // Update log status to sent
        await supabase
          .from('campaign_logs')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('campaign_id', campaignId)
          .eq('contact_id', contact.id);

        console.log(`[send-campaign-messages] Message sent to ${contact.phone_number}`);
      } else {
        failedCount++;
        
        // Update log status to failed
        await supabase
          .from('campaign_logs')
          .update({
            status: 'failed',
            error_message: responseData.message || responseData.error || 'Unknown error',
          })
          .eq('campaign_id', campaignId)
          .eq('contact_id', contact.id);

        console.error(`[send-campaign-messages] Failed to send to ${contact.phone_number}:`, responseData);
      }

      // Update campaign counts
      await supabase
        .from('campaigns')
        .update({
          sent_count: sentCount,
          failed_count: failedCount,
        })
        .eq('id', campaignId);

      // Delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, MESSAGE_DELAY_MS));

    } catch (error: any) {
      console.error(`[send-campaign-messages] Error sending to ${contact.phone_number}:`, error);
      failedCount++;

      await supabase
        .from('campaign_logs')
        .update({
          status: 'failed',
          error_message: error.message || 'Network error',
        })
        .eq('campaign_id', campaignId)
        .eq('contact_id', contact.id);
    }
  }

  // Mark campaign as completed
  await supabase
    .from('campaigns')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      sent_count: sentCount,
      failed_count: failedCount,
    })
    .eq('id', campaignId);

  console.log(`[send-campaign-messages] Campaign completed. Sent: ${sentCount}, Failed: ${failedCount}`);
}
