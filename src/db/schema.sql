-- Spender MVP Database Schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- TYPES
-- ============================================

-- Service types users can add
CREATE TYPE service_type AS ENUM ('mobile', 'internet', 'energy', 'insurance');

-- Offer status
CREATE TYPE offer_status AS ENUM ('pending', 'accepted', 'rejected');

-- User roles
CREATE TYPE user_role AS ENUM ('user', 'company');

-- ============================================
-- TABLES
-- ============================================

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Companies (pre-seeded, no self-registration in MVP)
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  service_types service_type[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id)
);

-- User services (what users currently pay for)
CREATE TABLE user_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_type service_type NOT NULL,
  current_provider TEXT NOT NULL,
  monthly_cost INTEGER NOT NULL, -- in smallest currency unit (øre/cents)
  postal_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Offers from companies to users
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_service_id UUID NOT NULL REFERENCES user_services(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  offered_monthly_cost INTEGER NOT NULL,
  status offer_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

-- User requests from onboarding wizard
CREATE TABLE user_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_type service_type NOT NULL,
  postal_code TEXT,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_user_services_user_id ON user_services(user_id);
CREATE INDEX idx_user_services_service_type ON user_services(service_type);
CREATE INDEX idx_user_services_postal_code ON user_services(postal_code);

CREATE INDEX idx_offers_company_id ON offers(company_id);
CREATE INDEX idx_offers_user_service_id ON offers(user_service_id);
CREATE INDEX idx_offers_status ON offers(status);

CREATE INDEX idx_user_requests_user_id ON user_requests(user_id);
CREATE INDEX idx_user_requests_service_type ON user_requests(service_type);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_requests ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Companies policies
CREATE POLICY "Companies can view own company"
  ON companies FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Companies can update own company"
  ON companies FOR UPDATE
  USING (auth.uid() = profile_id);

-- User services policies
CREATE POLICY "Users can view own services"
  ON user_services FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own services"
  ON user_services FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own services"
  ON user_services FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own services"
  ON user_services FOR DELETE
  USING (auth.uid() = user_id);

-- Companies can view aggregated service demand
CREATE POLICY "Companies can view services for offers"
  ON user_services FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.profile_id = auth.uid()
    )
  );

-- Offers policies
CREATE POLICY "Users can view offers for their services"
  ON offers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_services
      WHERE user_services.id = offers.user_service_id
      AND user_services.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update offer status (accept/reject)"
  ON offers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_services
      WHERE user_services.id = offers.user_service_id
      AND user_services.user_id = auth.uid()
    )
  );

CREATE POLICY "Companies can view own offers"
  ON offers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = offers.company_id
      AND companies.profile_id = auth.uid()
    )
  );

CREATE POLICY "Companies can create offers"
  ON offers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = offers.company_id
      AND companies.profile_id = auth.uid()
    )
  );

CREATE POLICY "Companies can update own offers"
  ON offers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = offers.company_id
      AND companies.profile_id = auth.uid()
    )
  );

-- User requests policies
CREATE POLICY "Users can view their own requests"
  ON user_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own requests"
  ON user_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own requests"
  ON user_requests FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own requests"
  ON user_requests FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_services_updated_at
  BEFORE UPDATE ON user_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_offers_updated_at
  BEFORE UPDATE ON offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_requests_updated_at
  BEFORE UPDATE ON user_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- AGGREGATED VIEW FOR COMPANIES
-- ============================================

-- Companies see demand aggregated by postal code
CREATE OR REPLACE FUNCTION get_service_demand(p_service_type service_type)
RETURNS TABLE (
  postal_code TEXT,
  user_count BIGINT,
  avg_monthly_cost INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    us.postal_code,
    COUNT(*)::BIGINT as user_count,
    AVG(us.monthly_cost)::INTEGER as avg_monthly_cost
  FROM user_services us
  WHERE us.service_type = p_service_type
  GROUP BY us.postal_code
  ORDER BY user_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;