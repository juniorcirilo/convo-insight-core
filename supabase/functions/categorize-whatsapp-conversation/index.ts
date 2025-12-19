import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const systemPrompt = `Você é um especialista em categorizar conversas de atendimento ao cliente via WhatsApp.

TÓPICOS PADRÃO (SEMPRE PREFERIR ESTES):

**Comercial:**
- vendas, cobranca, renovacao

**Suporte:**
- duvida_tecnica, duvida_produto, acesso

**Relacionamento:**
- feedback, cancelamento, onboarding

**Operacional:**
- agendamento, documentacao, atualizacao_cadastral

**Outros:**
- geral, spam

TAREFA:
Analise a conversa e retorne um JSON com:
{
  "primary_topic": "tópico principal da lista acima",
  "secondary_topics": ["tópico 2", "tópico 3"], // opcional, máximo 2
  "confidence": 0.95, // 0-1
  "reasoning": "breve explicação",
  "custom_topic": null // ou "nome_customizado" se REALMENTE necessário
}

REGRAS:
1. SEMPRE tente encaixar nos tópicos padrão primeiro
2. Use custom_topic apenas se a conversa for MUITO específica e não se encaixar em nenhum tópico
3. Seja conservador: prefira "geral" a criar novo tópico
4. Se a conversa abordar múltiplos assuntos, coloque até 2 tópicos secundários
5. Retorne APENAS o JSON, sem markdown ou texto adicional`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId } = await req.json();

    if (!conversationId) {
      return new Response(
        JSON.stringify({ error: 'conversationId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'Configuração de IA não encontrada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`🔍 Categorizando conversa: ${conversationId}`);

    // 1. Buscar mensagens da conversa
    const { data: messages, error: msgError } = await supabase
      .from('whatsapp_messages')
      .select('content, is_from_me, timestamp, message_type')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: true });

    if (msgError) {
      console.error('Erro ao buscar mensagens:', msgError);
      throw msgError;
    }

    // 2. Filtrar e formatar apenas mensagens de texto
    const textMessages = messages
      ?.filter(m => m.content && m.message_type === 'text')
      .map(m => {
        const sender = m.is_from_me ? 'Atendente' : 'Cliente';
        return `${sender}: ${m.content}`;
      }) || [];

    if (textMessages.length === 0) {
      console.log('❌ Sem mensagens de texto para categorizar');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Sem mensagens de texto para categorizar' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limitar a últimas 50 mensagens para não estourar contexto
    const recentMessages = textMessages.slice(-50);
    const formattedMessages = recentMessages.join('\n');
    console.log(`📝 ${recentMessages.length} mensagens para analisar`);

    // 3. Chamar Lovable AI Gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `CONVERSA:\n\n${formattedMessages}` }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit excedido. Tente novamente em alguns minutos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos de IA esgotados.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('Erro na API:', errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const aiResponse = aiData.choices[0].message.content.trim();

    // 4. Parse JSON (remover markdown se houver)
    const cleanJson = aiResponse
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    let result;
    try {
      result = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('Erro ao parsear resposta da IA:', aiResponse);
      throw new Error('Falha ao parsear resposta da IA');
    }

    // 5. Preparar metadata
    const topics = [
      result.primary_topic,
      ...(result.secondary_topics || [])
    ].filter(Boolean);

    if (result.custom_topic) {
      topics.push(result.custom_topic);
    }

    // 6. Buscar metadata existente e fazer merge
    const { data: existingConv } = await supabase
      .from('whatsapp_conversations')
      .select('metadata')
      .eq('id', conversationId)
      .single();

    const existingMetadata = existingConv?.metadata || {};

    const newMetadata = {
      ...existingMetadata,
      topics,
      primary_topic: result.primary_topic,
      ai_confidence: result.confidence || 0.8,
      categorized_at: new Date().toISOString(),
      categorization_model: 'google/gemini-2.5-flash',
      ai_reasoning: result.reasoning,
      custom_topics: result.custom_topic ? [result.custom_topic] : []
    };

    console.log('🏷️ Tópicos identificados:', topics);

    // 7. Atualizar conversa
    const { error: updateError } = await supabase
      .from('whatsapp_conversations')
      .update({ metadata: newMetadata })
      .eq('id', conversationId);

    if (updateError) {
      console.error('Erro ao atualizar conversa:', updateError);
      throw updateError;
    }

    console.log(`✅ Conversa categorizada com sucesso`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        metadata: newMetadata,
        message: 'Conversa categorizada com sucesso'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao categorizar:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        success: false
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
