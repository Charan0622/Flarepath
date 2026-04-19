-- Phase 2: Incident reports table for AI-generated post-incident summaries

CREATE TABLE incident_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  ai_summary text,
  manual_notes text,
  cause text,
  damage_estimate_usd numeric,
  injuries int DEFAULT 0,
  fatalities int DEFAULT 0,
  response_time_seconds int,
  units_involved int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_incident ON incident_reports(incident_id);

ALTER TABLE incident_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read reports" ON incident_reports FOR SELECT
  USING (incident_id IN (
    SELECT id FROM incidents WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "service role inserts reports" ON incident_reports FOR INSERT
  WITH CHECK (true);

CREATE POLICY "service role updates reports" ON incident_reports FOR UPDATE
  USING (true);

CREATE TRIGGER set_updated_at_reports BEFORE UPDATE ON incident_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
