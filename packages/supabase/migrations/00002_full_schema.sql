-- Phase 1 Week 2: Full schema — stations, vehicles, incidents, ai_triage, dispatches, location_pings, audit_log
-- Requires: CREATE EXTENSION IF NOT EXISTS postgis; (run separately first)

-- Stations
CREATE TABLE stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  location geography(POINT, 4326) NOT NULL,
  address text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_stations_org ON stations(organization_id);
CREATE INDEX idx_stations_location ON stations USING GIST(location);

-- Vehicles
CREATE TABLE vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  station_id uuid NOT NULL REFERENCES stations(id),
  call_sign text NOT NULL,
  type text NOT NULL CHECK (type IN ('engine', 'ladder', 'tanker', 'ambulance', 'rescue')),
  capacity int NOT NULL DEFAULT 6,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'dispatched', 'maintenance')),
  current_location geography(POINT, 4326),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_vehicles_org ON vehicles(organization_id);
CREATE INDEX idx_vehicles_station ON vehicles(station_id);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_location ON vehicles USING GIST(current_location);

-- Incidents
CREATE TABLE incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  reported_at timestamptz NOT NULL DEFAULT now(),
  reporter_name text,
  reporter_phone text,
  location geography(POINT, 4326) NOT NULL,
  address text NOT NULL,
  type text NOT NULL CHECK (type IN ('structure_fire', 'vehicle_fire', 'wildfire', 'medical', 'hazmat', 'rescue', 'false_alarm', 'other')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'triaged', 'dispatched', 'on_scene', 'resolved', 'cancelled')),
  description text,
  hazards text[] DEFAULT '{}',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_incidents_org ON incidents(organization_id);
CREATE INDEX idx_incidents_status ON incidents(status) WHERE status IN ('open', 'triaged', 'dispatched', 'on_scene');
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_location ON incidents USING GIST(location);
CREATE INDEX idx_incidents_created ON incidents USING BRIN(created_at);

-- AI Triage (1:1 with incidents)
CREATE TABLE ai_triage (
  incident_id uuid PRIMARY KEY REFERENCES incidents(id) ON DELETE CASCADE,
  predicted_type text,
  predicted_severity text,
  confidence numeric,
  extracted_entities jsonb DEFAULT '{}',
  recommended_vehicles jsonb DEFAULT '[]',
  recommended_crew_size int,
  reasoning text,
  model text,
  prompt_hash text,
  latency_ms int,
  input_tokens int,
  output_tokens int,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Dispatches
CREATE TABLE dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES incidents(id),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id),
  crew uuid[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'acknowledged', 'en_route', 'on_scene', 'returning', 'completed')),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  en_route_at timestamptz,
  on_scene_at timestamptz,
  returning_at timestamptz,
  completed_at timestamptz,
  route_geojson jsonb,
  distance_m int,
  eta_seconds int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dispatches_incident ON dispatches(incident_id);
CREATE INDEX idx_dispatches_vehicle ON dispatches(vehicle_id);
CREATE INDEX idx_dispatches_status ON dispatches(status);

-- Location Pings (high-volume)
CREATE TABLE location_pings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id uuid NOT NULL REFERENCES dispatches(id),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id),
  location geography(POINT, 4326) NOT NULL,
  speed_kmh numeric,
  heading numeric,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pings_dispatch ON location_pings(dispatch_id);
CREATE INDEX idx_pings_recorded ON location_pings USING BRIN(recorded_at);

-- Audit Log
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES profiles(id),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  diff jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_log USING BRIN(created_at);

-- Enable RLS on all new tables
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_triage ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_pings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Stations (org members can read)
CREATE POLICY "org members read stations" ON stations FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies: Vehicles (org members can read, dispatchers+ can update)
CREATE POLICY "org members read vehicles" ON vehicles FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "dispatchers update vehicles" ON vehicles FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('dispatcher', 'admin', 'chief')
  ));

-- RLS Policies: Incidents (org members can read, dispatchers+ can create/update)
CREATE POLICY "org members read incidents" ON incidents FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "dispatchers create incidents" ON incidents FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('dispatcher', 'admin', 'chief')
  ));

CREATE POLICY "dispatchers update incidents" ON incidents FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('dispatcher', 'admin', 'chief')
  ));

-- RLS Policies: AI Triage (readable by org members via incident join)
CREATE POLICY "org members read triage" ON ai_triage FOR SELECT
  USING (incident_id IN (
    SELECT id FROM incidents WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "service role inserts triage" ON ai_triage FOR INSERT
  WITH CHECK (true);

-- RLS Policies: Dispatches
CREATE POLICY "org members read dispatches" ON dispatches FOR SELECT
  USING (incident_id IN (
    SELECT id FROM incidents WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "dispatchers create dispatches" ON dispatches FOR INSERT
  WITH CHECK (incident_id IN (
    SELECT id FROM incidents WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('dispatcher', 'admin', 'chief')
    )
  ));

CREATE POLICY "update own dispatch status" ON dispatches FOR UPDATE
  USING (auth.uid() = ANY(crew) OR incident_id IN (
    SELECT id FROM incidents WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('dispatcher', 'admin', 'chief')
    )
  ));

-- RLS Policies: Location Pings (assigned crew can insert, org can read)
CREATE POLICY "crew inserts pings" ON location_pings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "org reads pings" ON location_pings FOR SELECT
  USING (dispatch_id IN (
    SELECT id FROM dispatches WHERE incident_id IN (
      SELECT id FROM incidents WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  ));

-- RLS Policies: Audit Log (admins + chiefs can read)
CREATE POLICY "admins read audit" ON audit_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'chief')
  ));

CREATE POLICY "service role inserts audit" ON audit_log FOR INSERT
  WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER set_updated_at_stations BEFORE UPDATE ON stations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_vehicles BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_incidents BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_dispatches BEFORE UPDATE ON dispatches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
