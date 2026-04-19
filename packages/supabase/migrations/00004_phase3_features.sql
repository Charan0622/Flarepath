-- Phase 3: Chat messages, shifts, mutual aid, citizen reports

-- Incident chat messages
CREATE TABLE incident_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id),
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_incident ON incident_messages(incident_id);
CREATE INDEX idx_messages_created ON incident_messages(created_at);

ALTER TABLE incident_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read messages" ON incident_messages FOR SELECT
  USING (incident_id IN (
    SELECT id FROM incidents WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "org members send messages" ON incident_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- Shifts
CREATE TABLE shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_shifts_profile ON shifts(profile_id);
CREATE INDEX idx_shifts_time ON shifts(start_time, end_time);

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read shifts" ON shifts FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "dispatchers manage shifts" ON shifts FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('dispatcher', 'admin', 'chief')
  ));

-- Mutual aid requests
CREATE TABLE mutual_aid_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requesting_org_id uuid NOT NULL REFERENCES organizations(id),
  incident_id uuid NOT NULL REFERENCES incidents(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'fulfilled')),
  resources_needed text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mutual_aid_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read aid requests" ON mutual_aid_requests FOR SELECT
  USING (requesting_org_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "dispatchers create aid requests" ON mutual_aid_requests FOR INSERT
  WITH CHECK (requesting_org_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('dispatcher', 'admin', 'chief')
  ));

CREATE TRIGGER set_updated_at_aid BEFORE UPDATE ON mutual_aid_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Citizen reports (public, no auth)
CREATE TABLE citizen_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_name text,
  reporter_phone text,
  location geography(POINT, 4326),
  address text,
  description text NOT NULL,
  photo_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'converted', 'dismissed')),
  incident_id uuid REFERENCES incidents(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_citizen_reports_status ON citizen_reports(status);
ALTER TABLE citizen_reports ENABLE ROW LEVEL SECURITY;

-- Public can insert (no auth needed)
CREATE POLICY "anyone can submit reports" ON citizen_reports FOR INSERT
  WITH CHECK (true);

-- Org members can read
CREATE POLICY "org members read reports" ON citizen_reports FOR SELECT
  USING (true);
