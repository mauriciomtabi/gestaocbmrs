-- =====================================================
-- SCHEMA COMPLETO - GESTÃO CBM SAPUCAIA DO SUL
-- Execute no SQL Editor do novo projeto Supabase
-- =====================================================

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABELA: profiles (vinculada aos usuários auth)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  war_name TEXT,
  email TEXT,
  rank TEXT,
  cpf TEXT,
  profile_photo TEXT,
  allowed_screens TEXT[] DEFAULT ARRAY['dashboard', 'fuel', 'face-checkin'],
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para criar perfil automaticamente ao criar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- TABELA: providers (prestadores de serviço)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  process_number TEXT,
  phone TEXT,
  address TEXT,
  assigned_entity TEXT,
  total_hours_to_fulfill NUMERIC DEFAULT 40,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'suspended', 'returned')),
  return_reason TEXT,
  return_attachment TEXT,
  identity_doc TEXT,
  referral_doc TEXT,
  observations TEXT,
  referral_date DATE,
  receipt_date DATE,
  profile_photo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: audit_logs (histórico de prestadores)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID REFERENCES public.providers(id) ON DELETE CASCADE,
  user_name TEXT,
  action TEXT,
  details TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: attendance (registros de presença)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID REFERENCES public.providers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  entry_time TEXT,
  exit_time TEXT,
  duration_minutes INTEGER DEFAULT 0,
  attachment_data TEXT,
  attachment_type TEXT,
  type TEXT DEFAULT 'presence' CHECK (type IN ('presence', 'justification')),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: vehicles (veículos da frota)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plate TEXT NOT NULL,
  fleet_code TEXT,
  model TEXT,
  brand TEXT,
  year TEXT,
  color TEXT,
  photo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: fuel_supplies (abastecimentos e manutenções)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.fuel_supplies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date TEXT NOT NULL,
  location TEXT,
  cnpj TEXT,
  fuel_type TEXT,
  liters NUMERIC DEFAULT 0,
  price_per_liter NUMERIC DEFAULT 0,
  total_value NUMERIC DEFAULT 0,
  driver TEXT,
  plate TEXT,
  km NUMERIC DEFAULT 0,
  attendant TEXT,
  protocol TEXT,
  attachment_data TEXT,
  attachment_type TEXT,
  ticket_log_data TEXT,
  ticket_log_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: fuel_audit_logs (histórico de abastecimentos)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.fuel_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fuel_supply_id UUID REFERENCES public.fuel_supplies(id) ON DELETE CASCADE,
  user_name TEXT,
  action TEXT,
  details TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: face_descriptors (descritores faciais biométricos)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.face_descriptors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID UNIQUE REFERENCES public.providers(id) ON DELETE CASCADE,
  descriptor FLOAT8[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: monthly_evaluations (avaliações mensais)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.monthly_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID REFERENCES public.providers(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  had_absences BOOLEAN DEFAULT FALSE,
  good_behavior BOOLEAN DEFAULT TRUE,
  disciplinary_issues BOOLEAN DEFAULT FALSE,
  satisfactory_service BOOLEAN DEFAULT TRUE,
  observations TEXT,
  evaluated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_id, year, month)
);

-- =====================================================
-- TABELA: service_swaps (trocas de serviço)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.service_swaps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  escalado_id UUID REFERENCES auth.users(id),
  substituto_id UUID REFERENCES auth.users(id),
  funcao TEXT CHECK (funcao IN ('CG', 'COV', 'Linha', 'COBOM')),
  data DATE NOT NULL,
  horario_inicio TEXT,
  horario_fim TEXT,
  status TEXT DEFAULT 'aguardando_substituto' CHECK (
    status IN ('aguardando_substituto', 'aguardando_escalado', 'recusado_substituto', 'pendente', 'aprovado', 'reprovado', 'cancelado', 'arquivado')
  ),
  aprovador_id UUID REFERENCES auth.users(id),
  observacao TEXT,
  data_aprovacao TIMESTAMPTZ,
  data_pagamento DATE,
  horario_inicio_pagamento TEXT,
  horario_fim_pagamento TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: sys_config (configurações do sistema)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.sys_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELA: station_nicknames (apelidos de postos)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.station_nicknames (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_name TEXT UNIQUE NOT NULL,
  nickname TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- =====================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_descriptors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_swaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sys_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.station_nicknames ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS - Usuários autenticados têm acesso total
-- =====================================================

-- profiles
CREATE POLICY "Authenticated users can read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update profiles" ON public.profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- providers
CREATE POLICY "Authenticated users can read providers" ON public.providers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert providers" ON public.providers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update providers" ON public.providers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete providers" ON public.providers FOR DELETE TO authenticated USING (true);

-- audit_logs
CREATE POLICY "Authenticated users can read audit_logs" ON public.audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert audit_logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete audit_logs" ON public.audit_logs FOR DELETE TO authenticated USING (true);

-- attendance
CREATE POLICY "Authenticated users can read attendance" ON public.attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert attendance" ON public.attendance FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update attendance" ON public.attendance FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete attendance" ON public.attendance FOR DELETE TO authenticated USING (true);

-- vehicles
CREATE POLICY "Authenticated users can read vehicles" ON public.vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert vehicles" ON public.vehicles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update vehicles" ON public.vehicles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete vehicles" ON public.vehicles FOR DELETE TO authenticated USING (true);

-- fuel_supplies
CREATE POLICY "Authenticated users can read fuel_supplies" ON public.fuel_supplies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fuel_supplies" ON public.fuel_supplies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update fuel_supplies" ON public.fuel_supplies FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete fuel_supplies" ON public.fuel_supplies FOR DELETE TO authenticated USING (true);

-- fuel_audit_logs
CREATE POLICY "Authenticated users can read fuel_audit_logs" ON public.fuel_audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fuel_audit_logs" ON public.fuel_audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- face_descriptors
CREATE POLICY "Authenticated users can read face_descriptors" ON public.face_descriptors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert face_descriptors" ON public.face_descriptors FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update face_descriptors" ON public.face_descriptors FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete face_descriptors" ON public.face_descriptors FOR DELETE TO authenticated USING (true);

-- monthly_evaluations
CREATE POLICY "Authenticated users can read monthly_evaluations" ON public.monthly_evaluations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert monthly_evaluations" ON public.monthly_evaluations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update monthly_evaluations" ON public.monthly_evaluations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete monthly_evaluations" ON public.monthly_evaluations FOR DELETE TO authenticated USING (true);

-- service_swaps
CREATE POLICY "Authenticated users can read service_swaps" ON public.service_swaps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert service_swaps" ON public.service_swaps FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update service_swaps" ON public.service_swaps FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete service_swaps" ON public.service_swaps FOR DELETE TO authenticated USING (true);

-- sys_config
CREATE POLICY "Authenticated users can read sys_config" ON public.sys_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert sys_config" ON public.sys_config FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update sys_config" ON public.sys_config FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- station_nicknames
CREATE POLICY "Authenticated users can read station_nicknames" ON public.station_nicknames FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert station_nicknames" ON public.station_nicknames FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update station_nicknames" ON public.station_nicknames FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete station_nicknames" ON public.station_nicknames FOR DELETE TO authenticated USING (true);

-- =====================================================
-- FIM DO SCHEMA
-- =====================================================
