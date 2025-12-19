CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "public";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'supervisor',
    'agent'
);


--
-- Name: sentiment_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sentiment_type AS ENUM (
    'positive',
    'neutral',
    'negative'
);


--
-- Name: archive_sentiment_to_history(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.archive_sentiment_to_history() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.whatsapp_sentiment_history (
    conversation_id,
    contact_id,
    sentiment,
    confidence_score,
    summary,
    messages_analyzed,
    created_at
  ) VALUES (
    OLD.conversation_id,
    OLD.contact_id,
    OLD.sentiment,
    OLD.confidence_score,
    OLD.summary,
    OLD.messages_analyzed,
    OLD.created_at
  );
  RETURN NEW;
END;
$$;


--
-- Name: archive_topics_to_history(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.archive_topics_to_history() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  old_topics TEXT[];
  old_primary TEXT;
  old_confidence NUMERIC;
  old_reasoning TEXT;
  old_model TEXT;
  old_categorized_at TIMESTAMPTZ;
BEGIN
  -- Extrair dados antigos do metadata JSONB
  IF OLD.metadata ? 'topics' THEN
    old_topics := ARRAY(SELECT jsonb_array_elements_text(OLD.metadata->'topics'));
    old_primary := OLD.metadata->>'primary_topic';
    old_confidence := (OLD.metadata->>'ai_confidence')::NUMERIC;
    old_reasoning := OLD.metadata->>'ai_reasoning';
    old_model := OLD.metadata->>'categorization_model';
    old_categorized_at := (OLD.metadata->>'categorized_at')::TIMESTAMPTZ;
    
    -- Só arquivar se tinha tópicos anteriores
    IF array_length(old_topics, 1) > 0 THEN
      INSERT INTO public.whatsapp_topics_history (
        conversation_id,
        contact_id,
        topics,
        primary_topic,
        ai_confidence,
        ai_reasoning,
        categorization_model,
        created_at
      ) VALUES (
        OLD.id,
        OLD.contact_id,
        old_topics,
        old_primary,
        old_confidence,
        old_reasoning,
        old_model,
        COALESCE(old_categorized_at, OLD.updated_at)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: can_access_conversation(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_access_conversation(_user_id uuid, _conversation_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    -- Admins e supervisors podem ver tudo
    SELECT 1 WHERE has_role(_user_id, 'admin'::app_role)
    UNION
    SELECT 1 WHERE has_role(_user_id, 'supervisor'::app_role)
    UNION
    -- Agentes só veem conversas atribuídas a eles
    SELECT 1 FROM whatsapp_conversations
    WHERE id = _conversation_id AND assigned_to = _user_id
    UNION
    -- Agentes também veem conversas não atribuídas (fila)
    SELECT 1 FROM whatsapp_conversations
    WHERE id = _conversation_id AND assigned_to IS NULL
  )
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _is_first_user boolean;
  _assigned_role app_role;
  _require_approval boolean;
  _is_approved boolean;
BEGIN
  -- Verificar se é o primeiro usuário
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO _is_first_user;
  
  -- Verificar se aprovação de conta está habilitada
  SELECT (value = 'true') INTO _require_approval
  FROM public.project_config
  WHERE key = 'require_account_approval'
  LIMIT 1;
  
  -- Se _require_approval é NULL (configuração não existe), assume false
  _require_approval := COALESCE(_require_approval, false);
  
  IF _is_first_user THEN
    _assigned_role := 'admin';
    _is_approved := true; -- Primeiro usuário sempre aprovado
  ELSE
    _assigned_role := 'agent';
    -- Se aprovação obrigatória está desabilitada, aprovar automaticamente
    _is_approved := NOT _require_approval;
  END IF;

  -- Inserir perfil com is_approved definido
  INSERT INTO public.profiles (id, full_name, email, is_active, is_approved)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    true,
    _is_approved
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Inserir role com conflict handling
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, _assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN new;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


--
-- Name: is_first_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_first_user() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1)
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: assignment_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignment_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    instance_id uuid,
    rule_type text NOT NULL,
    fixed_agent_id uuid,
    round_robin_agents uuid[] DEFAULT '{}'::uuid[],
    round_robin_last_index integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT assignment_rules_rule_type_check CHECK ((rule_type = ANY (ARRAY['fixed'::text, 'round_robin'::text])))
);


--
-- Name: conversation_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversation_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    assigned_from uuid,
    assigned_to uuid NOT NULL,
    assigned_by uuid,
    reason text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text NOT NULL,
    avatar_url text,
    status text DEFAULT 'online'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true NOT NULL,
    email text,
    is_approved boolean DEFAULT false,
    CONSTRAINT profiles_status_check CHECK ((status = ANY (ARRAY['online'::text, 'offline'::text, 'away'::text, 'busy'::text])))
);


--
-- Name: project_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'agent'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: whatsapp_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    instance_id uuid NOT NULL,
    phone_number character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    profile_picture_url text,
    is_group boolean DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    notes text
);


--
-- Name: whatsapp_conversation_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_conversation_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    content text NOT NULL,
    is_pinned boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.whatsapp_conversation_notes REPLICA IDENTITY FULL;


--
-- Name: whatsapp_conversation_summaries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_conversation_summaries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    summary text NOT NULL,
    key_points jsonb DEFAULT '[]'::jsonb,
    action_items jsonb DEFAULT '[]'::jsonb,
    sentiment_at_time character varying(20),
    messages_count integer DEFAULT 0,
    period_start timestamp with time zone,
    period_end timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: whatsapp_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    instance_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    status character varying(50) DEFAULT 'active'::character varying,
    last_message_at timestamp with time zone,
    last_message_preview text,
    unread_count integer DEFAULT 0,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    assigned_to uuid
);

ALTER TABLE ONLY public.whatsapp_conversations REPLICA IDENTITY FULL;


--
-- Name: whatsapp_instance_secrets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_instance_secrets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    instance_id uuid NOT NULL,
    api_key text NOT NULL,
    api_url text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: whatsapp_instances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_instances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    instance_name character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'disconnected'::character varying,
    qr_code text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    provider_type text DEFAULT 'self_hosted'::text NOT NULL,
    instance_id_external text
);

ALTER TABLE ONLY public.whatsapp_instances REPLICA IDENTITY FULL;


--
-- Name: whatsapp_macros; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_macros (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    instance_id uuid,
    name text NOT NULL,
    shortcut text NOT NULL,
    content text NOT NULL,
    description text,
    category text DEFAULT 'geral'::text,
    is_active boolean DEFAULT true,
    usage_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: whatsapp_message_edit_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_message_edit_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id text NOT NULL,
    conversation_id uuid NOT NULL,
    previous_content text NOT NULL,
    edited_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: whatsapp_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    remote_jid character varying(255) NOT NULL,
    message_id character varying(255) NOT NULL,
    content text NOT NULL,
    message_type character varying(50) DEFAULT 'text'::character varying,
    media_url text,
    media_mimetype character varying(100),
    is_from_me boolean DEFAULT false,
    status character varying(50) DEFAULT 'sent'::character varying,
    quoted_message_id character varying(255),
    "timestamp" timestamp with time zone NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    edited_at timestamp with time zone,
    original_content text,
    audio_transcription text,
    transcription_status character varying(20) DEFAULT NULL::character varying
);

ALTER TABLE ONLY public.whatsapp_messages REPLICA IDENTITY FULL;


--
-- Name: whatsapp_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id text NOT NULL,
    conversation_id uuid NOT NULL,
    emoji text NOT NULL,
    reactor_jid text NOT NULL,
    is_from_me boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.whatsapp_reactions REPLICA IDENTITY FULL;


--
-- Name: whatsapp_sentiment_analysis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_sentiment_analysis (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    sentiment public.sentiment_type DEFAULT 'neutral'::public.sentiment_type NOT NULL,
    confidence_score numeric(3,2),
    summary text,
    reasoning text,
    messages_analyzed integer DEFAULT 0,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT whatsapp_sentiment_analysis_confidence_score_check CHECK (((confidence_score >= (0)::numeric) AND (confidence_score <= (1)::numeric)))
);

ALTER TABLE ONLY public.whatsapp_sentiment_analysis REPLICA IDENTITY FULL;


--
-- Name: whatsapp_sentiment_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_sentiment_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    sentiment public.sentiment_type NOT NULL,
    confidence_score numeric(3,2),
    summary text,
    messages_analyzed integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: whatsapp_topics_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_topics_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    topics text[] NOT NULL,
    primary_topic text,
    ai_confidence numeric,
    ai_reasoning text,
    categorization_model text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: assignment_rules assignment_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_rules
    ADD CONSTRAINT assignment_rules_pkey PRIMARY KEY (id);


--
-- Name: conversation_assignments conversation_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_assignments
    ADD CONSTRAINT conversation_assignments_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: project_config project_config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_config
    ADD CONSTRAINT project_config_key_key UNIQUE (key);


--
-- Name: project_config project_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_config
    ADD CONSTRAINT project_config_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: whatsapp_contacts whatsapp_contacts_instance_id_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_contacts
    ADD CONSTRAINT whatsapp_contacts_instance_id_phone_number_key UNIQUE (instance_id, phone_number);


--
-- Name: whatsapp_contacts whatsapp_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_contacts
    ADD CONSTRAINT whatsapp_contacts_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_conversation_notes whatsapp_conversation_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_conversation_notes
    ADD CONSTRAINT whatsapp_conversation_notes_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_conversation_summaries whatsapp_conversation_summaries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_conversation_summaries
    ADD CONSTRAINT whatsapp_conversation_summaries_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_conversations whatsapp_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_conversations
    ADD CONSTRAINT whatsapp_conversations_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_instance_secrets whatsapp_instance_secrets_instance_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_instance_secrets
    ADD CONSTRAINT whatsapp_instance_secrets_instance_id_key UNIQUE (instance_id);


--
-- Name: whatsapp_instance_secrets whatsapp_instance_secrets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_instance_secrets
    ADD CONSTRAINT whatsapp_instance_secrets_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_instances whatsapp_instances_instance_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_instances
    ADD CONSTRAINT whatsapp_instances_instance_name_key UNIQUE (instance_name);


--
-- Name: whatsapp_instances whatsapp_instances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_instances
    ADD CONSTRAINT whatsapp_instances_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_macros whatsapp_macros_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_macros
    ADD CONSTRAINT whatsapp_macros_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_message_edit_history whatsapp_message_edit_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_message_edit_history
    ADD CONSTRAINT whatsapp_message_edit_history_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_messages whatsapp_messages_conversation_id_message_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_messages
    ADD CONSTRAINT whatsapp_messages_conversation_id_message_id_key UNIQUE (conversation_id, message_id);


--
-- Name: whatsapp_messages whatsapp_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_messages
    ADD CONSTRAINT whatsapp_messages_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_reactions whatsapp_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_reactions
    ADD CONSTRAINT whatsapp_reactions_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_sentiment_analysis whatsapp_sentiment_analysis_conversation_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_sentiment_analysis
    ADD CONSTRAINT whatsapp_sentiment_analysis_conversation_id_key UNIQUE (conversation_id);


--
-- Name: whatsapp_sentiment_analysis whatsapp_sentiment_analysis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_sentiment_analysis
    ADD CONSTRAINT whatsapp_sentiment_analysis_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_sentiment_history whatsapp_sentiment_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_sentiment_history
    ADD CONSTRAINT whatsapp_sentiment_history_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_topics_history whatsapp_topics_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_topics_history
    ADD CONSTRAINT whatsapp_topics_history_pkey PRIMARY KEY (id);


--
-- Name: idx_assignments_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignments_assigned_to ON public.conversation_assignments USING btree (assigned_to);


--
-- Name: idx_assignments_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignments_conversation ON public.conversation_assignments USING btree (conversation_id);


--
-- Name: idx_contacts_instance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contacts_instance ON public.whatsapp_contacts USING btree (instance_id);


--
-- Name: idx_contacts_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contacts_phone ON public.whatsapp_contacts USING btree (phone_number);


--
-- Name: idx_conversations_assigned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_assigned ON public.whatsapp_conversations USING btree (assigned_to);


--
-- Name: idx_conversations_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_assigned_to ON public.whatsapp_conversations USING btree (assigned_to);


--
-- Name: idx_conversations_contact; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_contact ON public.whatsapp_conversations USING btree (contact_id);


--
-- Name: idx_conversations_instance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_instance ON public.whatsapp_conversations USING btree (instance_id);


--
-- Name: idx_conversations_last_message; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_last_message ON public.whatsapp_conversations USING btree (last_message_at DESC);


--
-- Name: idx_macros_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_macros_active ON public.whatsapp_macros USING btree (is_active);


--
-- Name: idx_macros_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_macros_category ON public.whatsapp_macros USING btree (category);


--
-- Name: idx_macros_instance_shortcut; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_macros_instance_shortcut ON public.whatsapp_macros USING btree (instance_id, shortcut) WHERE (is_active = true);


--
-- Name: idx_message_edit_history_message_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_message_edit_history_message_id ON public.whatsapp_message_edit_history USING btree (message_id);


--
-- Name: idx_messages_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_conversation ON public.whatsapp_messages USING btree (conversation_id);


--
-- Name: idx_messages_message_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_message_id ON public.whatsapp_messages USING btree (message_id);


--
-- Name: idx_messages_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_timestamp ON public.whatsapp_messages USING btree ("timestamp" DESC);


--
-- Name: idx_notes_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notes_conversation ON public.whatsapp_conversation_notes USING btree (conversation_id);


--
-- Name: idx_notes_pinned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notes_pinned ON public.whatsapp_conversation_notes USING btree (conversation_id, is_pinned DESC, created_at DESC);


--
-- Name: idx_profiles_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_is_active ON public.profiles USING btree (is_active);


--
-- Name: idx_reactions_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reactions_conversation ON public.whatsapp_reactions USING btree (conversation_id);


--
-- Name: idx_reactions_conversation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reactions_conversation_id ON public.whatsapp_reactions USING btree (conversation_id);


--
-- Name: idx_reactions_message; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reactions_message ON public.whatsapp_reactions USING btree (message_id);


--
-- Name: idx_reactions_message_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reactions_message_id ON public.whatsapp_reactions USING btree (message_id);


--
-- Name: idx_sentiment_contact; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sentiment_contact ON public.whatsapp_sentiment_analysis USING btree (contact_id);


--
-- Name: idx_sentiment_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sentiment_conversation ON public.whatsapp_sentiment_analysis USING btree (conversation_id);


--
-- Name: idx_sentiment_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sentiment_type ON public.whatsapp_sentiment_analysis USING btree (sentiment);


--
-- Name: idx_summaries_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_summaries_conversation ON public.whatsapp_conversation_summaries USING btree (conversation_id);


--
-- Name: idx_summaries_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_summaries_created ON public.whatsapp_conversation_summaries USING btree (created_at DESC);


--
-- Name: idx_topics_history_contact; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topics_history_contact ON public.whatsapp_topics_history USING btree (contact_id);


--
-- Name: idx_topics_history_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topics_history_conversation ON public.whatsapp_topics_history USING btree (conversation_id);


--
-- Name: idx_topics_history_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topics_history_created ON public.whatsapp_topics_history USING btree (created_at DESC);


--
-- Name: idx_whatsapp_messages_transcription_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_messages_transcription_status ON public.whatsapp_messages USING btree (transcription_status) WHERE (transcription_status IS NOT NULL);


--
-- Name: unique_active_rule_per_instance; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_active_rule_per_instance ON public.assignment_rules USING btree (instance_id) WHERE (is_active = true);


--
-- Name: unique_reaction_per_message; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_reaction_per_message ON public.whatsapp_reactions USING btree (message_id, reactor_jid);


--
-- Name: whatsapp_sentiment_analysis archive_sentiment_before_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER archive_sentiment_before_update BEFORE UPDATE ON public.whatsapp_sentiment_analysis FOR EACH ROW EXECUTE FUNCTION public.archive_sentiment_to_history();


--
-- Name: whatsapp_conversations archive_topics_before_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER archive_topics_before_update BEFORE UPDATE ON public.whatsapp_conversations FOR EACH ROW EXECUTE FUNCTION public.archive_topics_to_history();


--
-- Name: whatsapp_sentiment_analysis sentiment_archive_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sentiment_archive_trigger BEFORE UPDATE ON public.whatsapp_sentiment_analysis FOR EACH ROW EXECUTE FUNCTION public.archive_sentiment_to_history();


--
-- Name: assignment_rules update_assignment_rules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_assignment_rules_updated_at BEFORE UPDATE ON public.assignment_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: whatsapp_contacts update_contacts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.whatsapp_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: whatsapp_conversations update_conversations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.whatsapp_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: whatsapp_instances update_instances_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_instances_updated_at BEFORE UPDATE ON public.whatsapp_instances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: whatsapp_macros update_macros_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_macros_updated_at BEFORE UPDATE ON public.whatsapp_macros FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: whatsapp_conversation_notes update_notes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.whatsapp_conversation_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: assignment_rules assignment_rules_fixed_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_rules
    ADD CONSTRAINT assignment_rules_fixed_agent_id_fkey FOREIGN KEY (fixed_agent_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: assignment_rules assignment_rules_instance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_rules
    ADD CONSTRAINT assignment_rules_instance_id_fkey FOREIGN KEY (instance_id) REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE;


--
-- Name: conversation_assignments conversation_assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_assignments
    ADD CONSTRAINT conversation_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: conversation_assignments conversation_assignments_assigned_from_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_assignments
    ADD CONSTRAINT conversation_assignments_assigned_from_fkey FOREIGN KEY (assigned_from) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: conversation_assignments conversation_assignments_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_assignments
    ADD CONSTRAINT conversation_assignments_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: conversation_assignments conversation_assignments_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_assignments
    ADD CONSTRAINT conversation_assignments_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: whatsapp_contacts whatsapp_contacts_instance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_contacts
    ADD CONSTRAINT whatsapp_contacts_instance_id_fkey FOREIGN KEY (instance_id) REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE;


--
-- Name: whatsapp_conversation_notes whatsapp_conversation_notes_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_conversation_notes
    ADD CONSTRAINT whatsapp_conversation_notes_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE;


--
-- Name: whatsapp_conversation_summaries whatsapp_conversation_summaries_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_conversation_summaries
    ADD CONSTRAINT whatsapp_conversation_summaries_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE;


--
-- Name: whatsapp_conversations whatsapp_conversations_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_conversations
    ADD CONSTRAINT whatsapp_conversations_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: whatsapp_conversations whatsapp_conversations_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_conversations
    ADD CONSTRAINT whatsapp_conversations_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE;


--
-- Name: whatsapp_conversations whatsapp_conversations_instance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_conversations
    ADD CONSTRAINT whatsapp_conversations_instance_id_fkey FOREIGN KEY (instance_id) REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE;


--
-- Name: whatsapp_instance_secrets whatsapp_instance_secrets_instance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_instance_secrets
    ADD CONSTRAINT whatsapp_instance_secrets_instance_id_fkey FOREIGN KEY (instance_id) REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE;


--
-- Name: whatsapp_macros whatsapp_macros_instance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_macros
    ADD CONSTRAINT whatsapp_macros_instance_id_fkey FOREIGN KEY (instance_id) REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE;


--
-- Name: whatsapp_message_edit_history whatsapp_message_edit_history_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_message_edit_history
    ADD CONSTRAINT whatsapp_message_edit_history_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id);


--
-- Name: whatsapp_messages whatsapp_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_messages
    ADD CONSTRAINT whatsapp_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE;


--
-- Name: whatsapp_reactions whatsapp_reactions_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_reactions
    ADD CONSTRAINT whatsapp_reactions_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE;


--
-- Name: whatsapp_sentiment_analysis whatsapp_sentiment_analysis_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_sentiment_analysis
    ADD CONSTRAINT whatsapp_sentiment_analysis_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE;


--
-- Name: whatsapp_sentiment_analysis whatsapp_sentiment_analysis_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_sentiment_analysis
    ADD CONSTRAINT whatsapp_sentiment_analysis_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE;


--
-- Name: whatsapp_sentiment_history whatsapp_sentiment_history_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_sentiment_history
    ADD CONSTRAINT whatsapp_sentiment_history_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE;


--
-- Name: whatsapp_sentiment_history whatsapp_sentiment_history_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_sentiment_history
    ADD CONSTRAINT whatsapp_sentiment_history_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE;


--
-- Name: conversation_assignments Admins and supervisors can manage assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and supervisors can manage assignments" ON public.conversation_assignments FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role)));


--
-- Name: assignment_rules Admins and supervisors can manage rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and supervisors can manage rules" ON public.assignment_rules USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role)));


--
-- Name: user_roles Admins can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can update any profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: whatsapp_contacts Authenticated users can view contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view contacts" ON public.whatsapp_contacts FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: whatsapp_instances Authenticated users can view instances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view instances" ON public.whatsapp_instances FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: whatsapp_macros Authenticated users can view macros; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view macros" ON public.whatsapp_macros FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: profiles Authenticated users can view profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view profiles" ON public.profiles FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: whatsapp_conversations Only admins can delete conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can delete conversations" ON public.whatsapp_conversations FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: whatsapp_instances Only admins can manage instances; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can manage instances" ON public.whatsapp_instances USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: project_config Only admins can manage project config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can manage project config" ON public.project_config USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: whatsapp_instance_secrets Only admins can manage secrets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can manage secrets" ON public.whatsapp_instance_secrets USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: project_config Public can read security configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can read security configs" ON public.project_config FOR SELECT TO anon USING ((key = ANY (ARRAY['restrict_signup_by_domain'::text, 'allowed_email_domains'::text])));


--
-- Name: whatsapp_conversations Service can insert conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can insert conversations" ON public.whatsapp_conversations FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role)));


--
-- Name: whatsapp_sentiment_analysis Service can manage sentiment; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can manage sentiment" ON public.whatsapp_sentiment_analysis USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role)));


--
-- Name: whatsapp_conversation_summaries Service can manage summaries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can manage summaries" ON public.whatsapp_conversation_summaries USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role)));


--
-- Name: whatsapp_contacts Supervisors can manage contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Supervisors can manage contacts" ON public.whatsapp_contacts USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role)));


--
-- Name: whatsapp_macros Supervisors can manage macros; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Supervisors can manage macros" ON public.whatsapp_macros USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role)));


--
-- Name: whatsapp_reactions Users can add reactions on accessible conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add reactions on accessible conversations" ON public.whatsapp_reactions FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND public.can_access_conversation(auth.uid(), conversation_id)));


--
-- Name: whatsapp_messages Users can insert messages in accessible conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert messages in accessible conversations" ON public.whatsapp_messages FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND public.can_access_conversation(auth.uid(), conversation_id)));


--
-- Name: whatsapp_conversation_notes Users can manage notes on accessible conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage notes on accessible conversations" ON public.whatsapp_conversation_notes USING (((auth.uid() IS NOT NULL) AND public.can_access_conversation(auth.uid(), conversation_id))) WITH CHECK (((auth.uid() IS NOT NULL) AND public.can_access_conversation(auth.uid(), conversation_id)));


--
-- Name: whatsapp_conversations Users can update accessible conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update accessible conversations" ON public.whatsapp_conversations FOR UPDATE USING (((auth.uid() IS NOT NULL) AND public.can_access_conversation(auth.uid(), id)));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: whatsapp_messages Users can update own recent messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own recent messages" ON public.whatsapp_messages FOR UPDATE USING (((auth.uid() IS NOT NULL) AND public.can_access_conversation(auth.uid(), conversation_id) AND (is_from_me = true) AND ("timestamp" > (now() - '00:15:00'::interval))));


--
-- Name: whatsapp_conversations Users can view accessible conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view accessible conversations" ON public.whatsapp_conversations FOR SELECT USING (((auth.uid() IS NOT NULL) AND public.can_access_conversation(auth.uid(), id)));


--
-- Name: user_roles Users can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view all roles" ON public.user_roles FOR SELECT USING (true);


--
-- Name: conversation_assignments Users can view assignments of accessible conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view assignments of accessible conversations" ON public.conversation_assignments FOR SELECT USING (((auth.uid() IS NOT NULL) AND public.can_access_conversation(auth.uid(), conversation_id)));


--
-- Name: whatsapp_message_edit_history Users can view edit history of accessible conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view edit history of accessible conversations" ON public.whatsapp_message_edit_history FOR SELECT USING (((auth.uid() IS NOT NULL) AND public.can_access_conversation(auth.uid(), conversation_id)));


--
-- Name: whatsapp_messages Users can view messages of accessible conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view messages of accessible conversations" ON public.whatsapp_messages FOR SELECT USING (((auth.uid() IS NOT NULL) AND public.can_access_conversation(auth.uid(), conversation_id)));


--
-- Name: whatsapp_reactions Users can view reactions on accessible conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view reactions on accessible conversations" ON public.whatsapp_reactions FOR SELECT USING (((auth.uid() IS NOT NULL) AND public.can_access_conversation(auth.uid(), conversation_id)));


--
-- Name: whatsapp_sentiment_history Users can view sentiment history of accessible conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view sentiment history of accessible conversations" ON public.whatsapp_sentiment_history FOR SELECT USING (((auth.uid() IS NOT NULL) AND public.can_access_conversation(auth.uid(), conversation_id)));


--
-- Name: whatsapp_sentiment_analysis Users can view sentiment of accessible conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view sentiment of accessible conversations" ON public.whatsapp_sentiment_analysis FOR SELECT USING (((auth.uid() IS NOT NULL) AND public.can_access_conversation(auth.uid(), conversation_id)));


--
-- Name: whatsapp_conversation_summaries Users can view summaries of accessible conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view summaries of accessible conversations" ON public.whatsapp_conversation_summaries FOR SELECT USING (((auth.uid() IS NOT NULL) AND public.can_access_conversation(auth.uid(), conversation_id)));


--
-- Name: whatsapp_topics_history Users can view topics history of accessible conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view topics history of accessible conversations" ON public.whatsapp_topics_history FOR SELECT USING (((auth.uid() IS NOT NULL) AND public.can_access_conversation(auth.uid(), conversation_id)));


--
-- Name: assignment_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assignment_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: conversation_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conversation_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: project_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_config ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: whatsapp_contacts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;

--
-- Name: whatsapp_conversation_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.whatsapp_conversation_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: whatsapp_conversation_summaries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.whatsapp_conversation_summaries ENABLE ROW LEVEL SECURITY;

--
-- Name: whatsapp_conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: whatsapp_instance_secrets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.whatsapp_instance_secrets ENABLE ROW LEVEL SECURITY;

--
-- Name: whatsapp_instances; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

--
-- Name: whatsapp_macros; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.whatsapp_macros ENABLE ROW LEVEL SECURITY;

--
-- Name: whatsapp_message_edit_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.whatsapp_message_edit_history ENABLE ROW LEVEL SECURITY;

--
-- Name: whatsapp_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: whatsapp_reactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.whatsapp_reactions ENABLE ROW LEVEL SECURITY;

--
-- Name: whatsapp_sentiment_analysis; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.whatsapp_sentiment_analysis ENABLE ROW LEVEL SECURITY;

--
-- Name: whatsapp_sentiment_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.whatsapp_sentiment_history ENABLE ROW LEVEL SECURITY;

--
-- Name: whatsapp_topics_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.whatsapp_topics_history ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


