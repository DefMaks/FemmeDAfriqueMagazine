-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.ad_clicks (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  ad_id bigint NOT NULL,
  user_id uuid,
  comic_id bigint,
  release_id bigint,
  zone text NOT NULL CHECK (zone = ANY (ARRAY['home'::text, 'in_read'::text, 'coinshop'::text, 'inner'::text, 'single'::text, 'page'::text])),
  clicked_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ad_clicks_pkey PRIMARY KEY (id),
  CONSTRAINT ad_clicks_ad_id_fkey FOREIGN KEY (ad_id) REFERENCES public.advertisements(id),
  CONSTRAINT ad_clicks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.ad_views (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  ad_id bigint NOT NULL,
  user_id uuid,
  comic_id bigint,
  release_id bigint,
  zone text NOT NULL CHECK (zone = ANY (ARRAY['home'::text, 'in_read'::text, 'coinshop'::text, 'inner'::text, 'single'::text, 'page'::text])),
  viewed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ad_views_pkey PRIMARY KEY (id),
  CONSTRAINT ad_views_ad_id_fkey FOREIGN KEY (ad_id) REFERENCES public.advertisements(id),
  CONSTRAINT ad_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.admin_notifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title character varying NOT NULL,
  message text NOT NULL,
  type character varying DEFAULT 'info'::character varying,
  read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  read_at timestamp with time zone,
  CONSTRAINT admin_notifications_pkey PRIMARY KEY (id)
);
CREATE TABLE public.admins (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid UNIQUE,
  email text NOT NULL UNIQUE,
  full_name text,
  role text NOT NULL CHECK (role = ANY (ARRAY['super_admin'::text, 'admin'::text, 'editor'::text])),
  created_at timestamp with time zone DEFAULT now(),
  last_login timestamp with time zone,
  is_active boolean DEFAULT true,
  CONSTRAINT admins_pkey PRIMARY KEY (id),
  CONSTRAINT admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.advertisements (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  admin_id uuid,
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  status text DEFAULT 'à venir'::text CHECK (status = ANY (ARRAY['à venir'::text, 'en cours'::text, 'expiré'::text])),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  client_id uuid,
  zone text CHECK (zone = ANY (ARRAY['home'::text, 'inner'::text, 'single'::text, 'page'::text, 'coinshop'::text, 'in_read'::text])),
  inner_link text,
  external_link text,
  target ARRAY,
  CONSTRAINT advertisements_pkey PRIMARY KEY (id),
  CONSTRAINT advertisements_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admins(id),
  CONSTRAINT fk_advertisement_client FOREIGN KEY (client_id) REFERENCES public.clients(id)
);
CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  company_name text NOT NULL,
  contact_person text,
  email text NOT NULL UNIQUE,
  phone text,
  address text,
  tax_id text,
  payout_number text,
  defmaks_fees_cdf numeric DEFAULT 0,
  defmaks_fees_usd numeric DEFAULT 0,
  is_defmaks_app boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  initials text,
  ville text,
  pays text,
  logo text CHECK (validate_logo_url(logo)),
  CONSTRAINT clients_pkey PRIMARY KEY (id)
);
CREATE TABLE public.coins (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL,
  app_source text NOT NULL CHECK (app_source = ANY (ARRAY['katuni'::text, 'quiz'::text, 'radio'::text, 'academy'::text, 'defmaks_admin'::text])),
  transaction_type text NOT NULL CHECK (transaction_type = ANY (ARRAY['purchase'::text, 'spend'::text, 'refund'::text, 'bonus'::text, 'transfer'::text])),
  amount integer NOT NULL CHECK (amount > 0),
  cdf_equivalent numeric,
  usd_equivalent numeric,
  description text,
  external_reference text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT coins_pkey PRIMARY KEY (id),
  CONSTRAINT coins_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  plan_code text,
  first_name text NOT NULL,
  last_name text NOT NULL,
  work_email text NOT NULL,
  phone_number text NOT NULL,
  company_name text,
  company_size text,
  business_units_count integer DEFAULT 1,
  country USER-DEFINED NOT NULL DEFAULT 'RDC'::central_africa_country,
  message text NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'new'::contact_status,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT contacts_pkey PRIMARY KEY (id),
  CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES public.clients(id)
);
CREATE TABLE public.database_logs (
  id bigint NOT NULL DEFAULT nextval('database_logs_id_seq'::regclass),
  log_time timestamp with time zone NOT NULL DEFAULT now(),
  activity text,
  detail jsonb,
  CONSTRAINT database_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.notifications (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  admin_id uuid,
  title text NOT NULL,
  content text NOT NULL,
  image_url text,
  created_at timestamp with time zone DEFAULT now(),
  target_user_type text CHECK (target_user_type = ANY (ARRAY['all'::text, 'specific_users'::text])),
  is_active boolean DEFAULT true,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admins(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid UNIQUE,
  client_id uuid,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT profiles_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id)
);
CREATE TABLE public.saved_articles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  article_id text NOT NULL,
  article_data jsonb NOT NULL,
  media text NOT NULL DEFAULT 'FDA'::text,
  saved_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT saved_articles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.system_health_checks (
  id bigint NOT NULL DEFAULT nextval('system_health_checks_id_seq'::regclass),
  checked_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL,
  message text,
  CONSTRAINT system_health_checks_pkey PRIMARY KEY (id)
);
CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  wallet_id uuid,
  amount numeric NOT NULL,
  currency USER-DEFINED NOT NULL,
  transaction_type USER-DEFINED NOT NULL,
  description text,
  external_reference text,
  defmaks_revenue_cdf numeric DEFAULT 0,
  defmaks_revenue_usd numeric DEFAULT 0,
  transaction_date timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  transaction_platform USER-DEFINED DEFAULT 'ECARD'::transaction_platform,
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id)
);
CREATE TABLE public.user_coin_balances_mat (
  user_id uuid NOT NULL,
  total_balance bigint NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_coin_balances_mat_pkey PRIMARY KEY (user_id)
);
CREATE TABLE public.wallets (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  profile_id uuid UNIQUE,
  wallet_address text NOT NULL UNIQUE,
  balance_cdf numeric DEFAULT 0,
  balance_usd numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT wallets_pkey PRIMARY KEY (id),
  CONSTRAINT wallets_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.web_client_notifications (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  client_id bigint NOT NULL,
  offset_days integer NOT NULL,
  notified_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT web_client_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT web_client_notifications_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.web_clients(id)
);
CREATE TABLE public.web_clients (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL,
  client_name text,
  contact_email text NOT NULL,
  domain text NOT NULL,
  expiration_date timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  project_name text,
  CONSTRAINT web_clients_pkey PRIMARY KEY (id),
  CONSTRAINT web_clients_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);