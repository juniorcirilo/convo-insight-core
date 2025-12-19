import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContactToFix {
  id: string;
  phone_number: string;
  name: string;
  instance_id: string;
}

interface Instance {
  id: string;
  api_url: string;
  api_key: string;
  instance_name: string;
}

interface FixResult {
  contactId: string;
  phoneNumber: string;
  oldName: string;
  newName?: string;
  profilePictureUrl?: string;
  success: boolean;
  error?: string;
}

Deno.serve(async (req) => {
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

    // Verify admin role
    const { data: isAdmin } = await supabaseAdmin.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden - Admin required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('[fix-contact-names] Starting contact name correction process');

    // Fetch all affected contacts
    const { data: allContacts, error: fetchError } = await supabaseAdmin
      .from('whatsapp_contacts')
      .select('id, phone_number, name, instance_id');
    
    if (fetchError) {
      console.error('[fix-contact-names] Error fetching contacts:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch contacts', details: fetchError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter contacts where name = phone_number
    const contactsToFix = allContacts?.filter(contact => 
      contact.name === contact.phone_number
    ) || [];
    
    if (contactsToFix.length === 0) {
      console.log('[fix-contact-names] No contacts to fix');
      return new Response(
        JSON.stringify({ 
          message: 'No contacts with incorrect names found',
          total: 0,
          updated: 0,
          failed: 0,
          details: []
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[fix-contact-names] Found ${contactsToFix.length} contacts to fix`);

    const results: FixResult[] = [];
    let successCount = 0;
    let failedCount = 0;

    // Process each contact
    for (const contact of contactsToFix) {
      try {
        console.log(`[fix-contact-names] Processing contact ${contact.id} - ${contact.phone_number}`);
        
        // Get instance details
        const { data: instance, error: instanceError } = await supabaseAdmin
          .from('whatsapp_instances')
          .select('id, instance_name')
          .eq('id', contact.instance_id)
          .single();

        if (instanceError || !instance) {
          console.error(`[fix-contact-names] No instance found for ${contact.instance_id}`);
          results.push({
            contactId: contact.id,
            phoneNumber: contact.phone_number,
            oldName: contact.name,
            success: false,
            error: 'Instance not found'
          });
          failedCount++;
          continue;
        }
        
        // Fetch instance secrets
        const { data: secrets } = await supabaseAdmin
          .from('whatsapp_instance_secrets')
          .select('api_url, api_key')
          .eq('instance_id', instance.id)
          .single();

        if (!secrets) {
          console.error(`[fix-contact-names] No secrets found for instance ${instance.id}`);
          results.push({
            contactId: contact.id,
            phoneNumber: contact.phone_number,
            oldName: contact.name,
            success: false,
            error: 'Instance secrets not found'
          });
          failedCount++;
          continue;
        }

        // Call Evolution API to fetch profile
        const fetchProfileUrl = `${secrets.api_url}/chat/fetchProfile/${instance.instance_name}`;
        console.log(`[fix-contact-names] Fetching profile from: ${fetchProfileUrl}`);

        const profileResponse = await fetch(fetchProfileUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': secrets.api_key,
          },
          body: JSON.stringify({
            number: contact.phone_number
          })
        });

        if (!profileResponse.ok) {
          const errorText = await profileResponse.text();
          console.error(`[fix-contact-names] Evolution API error:`, errorText);
          results.push({
            contactId: contact.id,
            phoneNumber: contact.phone_number,
            oldName: contact.name,
            success: false,
            error: `API error: ${profileResponse.status}`
          });
          failedCount++;
          continue;
        }

        const profileData = await profileResponse.json();
        console.log(`[fix-contact-names] Profile data received:`, profileData);

        // Extract name from profile data (Evolution API returns it in different formats)
        const newName = profileData.name || profileData.pushName || profileData.notify || contact.phone_number;
        const profilePictureUrl = profileData.profilePictureUrl || profileData.picture || null;

        // Update contact in database
        const updateData: any = {
          name: newName,
          updated_at: new Date().toISOString()
        };

        if (profilePictureUrl) {
          updateData.profile_picture_url = profilePictureUrl;
        }

        const { error: updateError } = await supabaseAdmin
          .from('whatsapp_contacts')
          .update(updateData)
          .eq('id', contact.id);

        if (updateError) {
          console.error('[fix-contact-names] Error updating contact:', updateError);
          results.push({
            contactId: contact.id,
            phoneNumber: contact.phone_number,
            oldName: contact.name,
            newName: newName,
            success: false,
            error: 'Database update failed'
          });
          failedCount++;
        } else {
          console.log(`[fix-contact-names] Successfully updated contact: ${contact.phone_number} -> ${newName}`);
          results.push({
            contactId: contact.id,
            phoneNumber: contact.phone_number,
            oldName: contact.name,
            newName: newName,
            profilePictureUrl: profilePictureUrl || undefined,
            success: true
          });
          successCount++;
        }

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`[fix-contact-names] Error processing contact ${contact.phone_number}:`, error);
        results.push({
          contactId: contact.id,
          phoneNumber: contact.phone_number,
          oldName: contact.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        failedCount++;
      }
    }

    // 3. Return report
    const report = {
      message: 'Contact name correction completed',
      total: contactsToFix.length,
      updated: successCount,
      failed: failedCount,
      details: results
    };

    console.log('[fix-contact-names] Process completed:', report);

    return new Response(
      JSON.stringify(report),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[fix-contact-names] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
