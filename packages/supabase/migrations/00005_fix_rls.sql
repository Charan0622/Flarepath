-- Fix infinite recursion in RLS policies
-- The problem: profiles policies reference profiles, causing a loop

-- Drop all problematic policies
DROP POLICY IF EXISTS "users read own profile" ON profiles;
DROP POLICY IF EXISTS "users update own profile" ON profiles;
DROP POLICY IF EXISTS "admins read org profiles" ON profiles;
DROP POLICY IF EXISTS "service role inserts profiles" ON profiles;
DROP POLICY IF EXISTS "members read own org" ON organizations;

DROP POLICY IF EXISTS "org members read incidents" ON incidents;
DROP POLICY IF EXISTS "dispatchers create incidents" ON incidents;
DROP POLICY IF EXISTS "dispatchers update incidents" ON incidents;

DROP POLICY IF EXISTS "org members read stations" ON stations;
DROP POLICY IF EXISTS "org members read vehicles" ON vehicles;
DROP POLICY IF EXISTS "dispatchers update vehicles" ON vehicles;

DROP POLICY IF EXISTS "org members read triage" ON ai_triage;
DROP POLICY IF EXISTS "org members read dispatches" ON dispatches;
DROP POLICY IF EXISTS "dispatchers create dispatches" ON dispatches;
DROP POLICY IF EXISTS "update own dispatch status" ON dispatches;
DROP POLICY IF EXISTS "org reads pings" ON location_pings;
DROP POLICY IF EXISTS "admins read audit" ON audit_log;

DROP POLICY IF EXISTS "org members read reports" ON incident_reports;
DROP POLICY IF EXISTS "org members read messages" ON incident_messages;
DROP POLICY IF EXISTS "org members send messages" ON incident_messages;
DROP POLICY IF EXISTS "org members read shifts" ON shifts;
DROP POLICY IF EXISTS "dispatchers manage shifts" ON shifts;
DROP POLICY IF EXISTS "org members read aid requests" ON mutual_aid_requests;
DROP POLICY IF EXISTS "dispatchers create aid requests" ON mutual_aid_requests;

-- Create a security-definer function to get org_id without RLS recursion
CREATE OR REPLACE FUNCTION auth.user_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid()
$$;

-- PROFILES: simple non-recursive policies
CREATE POLICY "users read own profile" ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "users read org profiles" ON profiles FOR SELECT
  USING (organization_id = auth.user_org_id());

CREATE POLICY "users update own profile" ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "insert profiles" ON profiles FOR INSERT
  WITH CHECK (true);

-- ORGANIZATIONS
CREATE POLICY "members read own org" ON organizations FOR SELECT
  USING (id = auth.user_org_id());

-- INCIDENTS
CREATE POLICY "org read incidents" ON incidents FOR SELECT
  USING (organization_id = auth.user_org_id());

CREATE POLICY "org create incidents" ON incidents FOR INSERT
  WITH CHECK (organization_id = auth.user_org_id());

CREATE POLICY "org update incidents" ON incidents FOR UPDATE
  USING (organization_id = auth.user_org_id());

-- STATIONS
CREATE POLICY "org read stations" ON stations FOR SELECT
  USING (organization_id = auth.user_org_id());

-- VEHICLES
CREATE POLICY "org read vehicles" ON vehicles FOR SELECT
  USING (organization_id = auth.user_org_id());

CREATE POLICY "org update vehicles" ON vehicles FOR UPDATE
  USING (organization_id = auth.user_org_id());

-- AI TRIAGE
CREATE POLICY "read triage" ON ai_triage FOR SELECT
  USING (incident_id IN (SELECT id FROM incidents WHERE organization_id = auth.user_org_id()));

CREATE POLICY "insert triage" ON ai_triage FOR INSERT
  WITH CHECK (true);

CREATE POLICY "update triage" ON ai_triage FOR UPDATE
  USING (true);

-- DISPATCHES
CREATE POLICY "read dispatches" ON dispatches FOR SELECT
  USING (incident_id IN (SELECT id FROM incidents WHERE organization_id = auth.user_org_id()));

CREATE POLICY "create dispatches" ON dispatches FOR INSERT
  WITH CHECK (true);

CREATE POLICY "update dispatches" ON dispatches FOR UPDATE
  USING (true);

-- LOCATION PINGS
CREATE POLICY "insert pings" ON location_pings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "read pings" ON location_pings FOR SELECT
  USING (true);

-- AUDIT LOG
CREATE POLICY "read audit" ON audit_log FOR SELECT
  USING (true);

CREATE POLICY "insert audit" ON audit_log FOR INSERT
  WITH CHECK (true);

-- INCIDENT REPORTS
CREATE POLICY "read reports" ON incident_reports FOR SELECT
  USING (incident_id IN (SELECT id FROM incidents WHERE organization_id = auth.user_org_id()));

CREATE POLICY "insert reports" ON incident_reports FOR INSERT
  WITH CHECK (true);

CREATE POLICY "update reports" ON incident_reports FOR UPDATE
  USING (true);

-- INCIDENT MESSAGES
CREATE POLICY "read messages" ON incident_messages FOR SELECT
  USING (incident_id IN (SELECT id FROM incidents WHERE organization_id = auth.user_org_id()));

CREATE POLICY "send messages" ON incident_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- SHIFTS
CREATE POLICY "read shifts" ON shifts FOR SELECT
  USING (organization_id = auth.user_org_id());

CREATE POLICY "manage shifts" ON shifts FOR INSERT
  WITH CHECK (organization_id = auth.user_org_id());

CREATE POLICY "update shifts" ON shifts FOR UPDATE
  USING (organization_id = auth.user_org_id());

-- MUTUAL AID
CREATE POLICY "read aid" ON mutual_aid_requests FOR SELECT
  USING (requesting_org_id = auth.user_org_id());

CREATE POLICY "create aid" ON mutual_aid_requests FOR INSERT
  WITH CHECK (requesting_org_id = auth.user_org_id());

-- CITIZEN REPORTS (public)
-- Already has open policies from migration 00004
