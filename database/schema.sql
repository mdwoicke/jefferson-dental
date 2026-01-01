-- Jefferson Dental Clinics - SQLite Database Schema
-- Version: 3.0
-- Date: 2025-01-21

-- ============================================================================
-- PATIENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  phone_number TEXT NOT NULL UNIQUE,
  parent_name TEXT NOT NULL,
  address_street TEXT NOT NULL,
  address_city TEXT NOT NULL,
  address_state TEXT NOT NULL,
  address_zip TEXT NOT NULL,
  preferred_language TEXT DEFAULT 'English',
  last_visit TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_patients_phone ON patients(phone_number);
CREATE INDEX idx_patients_created ON patients(created_at);

-- ============================================================================
-- CHILDREN TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS children (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id TEXT NOT NULL,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  medicaid_id TEXT NOT NULL,
  date_of_birth TEXT,
  special_needs TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

CREATE INDEX idx_children_patient ON children(patient_id);

-- ============================================================================
-- APPOINTMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL UNIQUE,
  patient_id TEXT NOT NULL,
  appointment_time TEXT NOT NULL,
  appointment_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  location TEXT NOT NULL,
  confirmation_sent INTEGER DEFAULT 0,
  confirmation_method TEXT,
  confirmation_sid TEXT,
  cancellation_reason TEXT,
  child_count INTEGER DEFAULT 1,
  rescheduled INTEGER DEFAULT 0,
  reschedule_reason TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no-show')),
  CHECK (appointment_type IN ('exam', 'cleaning', 'exam_and_cleaning', 'emergency'))
);

CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_time ON appointments(appointment_time);
CREATE INDEX idx_appointments_status ON appointments(status);

-- ============================================================================
-- APPOINTMENT_CHILDREN JOIN TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS appointment_children (
  appointment_id TEXT NOT NULL,
  child_id INTEGER NOT NULL,
  PRIMARY KEY (appointment_id, child_id),
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- ============================================================================
-- CONVERSATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  phone_number TEXT NOT NULL,
  direction TEXT NOT NULL,
  provider TEXT NOT NULL,
  call_sid TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration_seconds INTEGER,
  outcome TEXT,
  outcome_details TEXT,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
  CHECK (direction IN ('inbound', 'outbound')),
  CHECK (provider IN ('openai', 'gemini'))
);

CREATE INDEX idx_conversations_patient ON conversations(patient_id);
CREATE INDEX idx_conversations_started ON conversations(started_at);
CREATE INDEX idx_conversations_phone ON conversations(phone_number);

-- ============================================================================
-- CONVERSATION_TURNS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS conversation_turns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id TEXT NOT NULL,
  turn_number INTEGER NOT NULL,
  role TEXT NOT NULL,
  content_type TEXT NOT NULL,
  content_text TEXT,
  audio_data BLOB,
  timestamp TEXT NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CHECK (role IN ('user', 'assistant', 'system')),
  CHECK (content_type IN ('text', 'audio', 'function_call', 'function_result'))
);

CREATE INDEX idx_turns_conversation ON conversation_turns(conversation_id);
CREATE INDEX idx_turns_number ON conversation_turns(conversation_id, turn_number);

-- ============================================================================
-- FUNCTION_CALLS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS function_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id TEXT NOT NULL,
  call_id TEXT,
  function_name TEXT NOT NULL,
  arguments TEXT NOT NULL,
  result TEXT,
  status TEXT DEFAULT 'pending',
  execution_time_ms INTEGER,
  timestamp TEXT NOT NULL,
  error_message TEXT,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CHECK (status IN ('pending', 'success', 'error'))
);

CREATE INDEX idx_function_calls_conversation ON function_calls(conversation_id);
CREATE INDEX idx_function_calls_function ON function_calls(function_name);
CREATE INDEX idx_function_calls_status ON function_calls(status);
CREATE INDEX idx_function_calls_timestamp ON function_calls(timestamp);

-- ============================================================================
-- AUDIT_TRAIL TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_trail (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_by TEXT NOT NULL,
  change_reason TEXT,
  metadata TEXT,
  timestamp TEXT DEFAULT (datetime('now')),
  CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE'))
);

CREATE INDEX idx_audit_table ON audit_trail(table_name);
CREATE INDEX idx_audit_record ON audit_trail(table_name, record_id);
CREATE INDEX idx_audit_timestamp ON audit_trail(timestamp);

-- ============================================================================
-- SCHEMA_VERSION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT DEFAULT (datetime('now')),
  description TEXT NOT NULL
);

-- Insert initial schema version
INSERT OR IGNORE INTO schema_version (version, description) VALUES
(1, 'Initial schema with patients, children, appointments, conversations, function_calls, and audit_trail tables');

-- Insert current schema version
INSERT OR IGNORE INTO schema_version (version, description) VALUES
(2, 'Added child_count, rescheduled, reschedule_reason, and notes columns to appointments table');

INSERT OR IGNORE INTO schema_version (version, description) VALUES
(3, 'Added call_metrics, test_scenarios, test_executions, and skill_execution_logs tables for analytics and testing');

-- ============================================================================
-- CALL METRICS TABLE (Analytics & Testing - v3)
-- ============================================================================
CREATE TABLE IF NOT EXISTS call_metrics (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  call_duration_seconds INTEGER,
  outcome TEXT CHECK(outcome IN ('success', 'partial', 'failure', 'abandoned')) DEFAULT 'success',
  quality_score INTEGER CHECK(quality_score BETWEEN 1 AND 5),
  user_satisfaction TEXT CHECK(user_satisfaction IN ('satisfied', 'neutral', 'dissatisfied')),
  interruptions_count INTEGER DEFAULT 0,
  fallback_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  completion_rate REAL CHECK(completion_rate BETWEEN 0 AND 1),
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_call_metrics_conversation ON call_metrics(conversation_id);
CREATE INDEX IF NOT EXISTS idx_call_metrics_outcome ON call_metrics(outcome);
CREATE INDEX IF NOT EXISTS idx_call_metrics_created_at ON call_metrics(created_at);

-- ============================================================================
-- TEST SCENARIOS TABLE (Analytics & Testing - v3)
-- ============================================================================
CREATE TABLE IF NOT EXISTS test_scenarios (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK(category IN ('functional', 'edge-case', 'regression', 'performance')),
  status TEXT CHECK(status IN ('active', 'deprecated', 'draft')) DEFAULT 'active',
  expected_outcome TEXT,
  setup_script TEXT,
  validation_rules TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_test_scenarios_status ON test_scenarios(status);
CREATE INDEX IF NOT EXISTS idx_test_scenarios_category ON test_scenarios(category);

-- ============================================================================
-- TEST EXECUTIONS TABLE (Analytics & Testing - v3)
-- ============================================================================
CREATE TABLE IF NOT EXISTS test_executions (
  id TEXT PRIMARY KEY,
  scenario_id TEXT NOT NULL,
  conversation_id TEXT,
  test_status TEXT CHECK(test_status IN ('pass', 'fail', 'error', 'skipped')) DEFAULT 'pass',
  expected_result TEXT,
  actual_result TEXT,
  differences TEXT,
  execution_time_ms INTEGER,
  error_message TEXT,
  executed_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (scenario_id) REFERENCES test_scenarios(id) ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_test_executions_scenario ON test_executions(scenario_id);
CREATE INDEX IF NOT EXISTS idx_test_executions_status ON test_executions(test_status);
CREATE INDEX IF NOT EXISTS idx_test_executions_executed_at ON test_executions(executed_at);

-- ============================================================================
-- SKILL EXECUTION LOGS TABLE (Analytics & Testing - v3)
-- ============================================================================
CREATE TABLE IF NOT EXISTS skill_execution_logs (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  tool_used TEXT,
  input_args TEXT,
  output_result TEXT,
  execution_status TEXT CHECK(execution_status IN ('success', 'failure', 'skipped')) DEFAULT 'success',
  execution_time_ms INTEGER,
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_skill_logs_conversation ON skill_execution_logs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_skill_logs_skill ON skill_execution_logs(skill_name);
CREATE INDEX IF NOT EXISTS idx_skill_logs_created_at ON skill_execution_logs(created_at);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Trigger to update patients.updated_at
CREATE TRIGGER IF NOT EXISTS update_patients_timestamp
AFTER UPDATE ON patients
FOR EACH ROW
BEGIN
  UPDATE patients SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Trigger to update appointments.updated_at
CREATE TRIGGER IF NOT EXISTS update_appointments_timestamp
AFTER UPDATE ON appointments
FOR EACH ROW
BEGIN
  UPDATE appointments SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Trigger to update test_scenarios.updated_at
CREATE TRIGGER IF NOT EXISTS update_test_scenarios_timestamp
AFTER UPDATE ON test_scenarios
FOR EACH ROW
BEGIN
  UPDATE test_scenarios SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- ============================================================================
-- VIEWS FOR CONVENIENCE
-- ============================================================================

-- View to get patients with their children
CREATE VIEW IF NOT EXISTS patients_with_children AS
SELECT
  p.id as patient_id,
  p.phone_number,
  p.parent_name,
  p.address_street,
  p.address_city,
  p.address_state,
  p.address_zip,
  p.preferred_language,
  p.last_visit,
  p.notes,
  json_group_array(
    json_object(
      'id', c.id,
      'name', c.name,
      'age', c.age,
      'medicaid_id', c.medicaid_id
    )
  ) as children
FROM patients p
LEFT JOIN children c ON p.id = c.patient_id
GROUP BY p.id;

-- View to get appointments with patient and children details
CREATE VIEW IF NOT EXISTS appointments_full AS
SELECT
  a.id,
  a.booking_id,
  a.appointment_time,
  a.appointment_type,
  a.status,
  a.location,
  a.confirmation_sent,
  p.id as patient_id,
  p.phone_number,
  p.parent_name,
  json_group_array(
    json_object(
      'id', c.id,
      'name', c.name,
      'age', c.age
    )
  ) as children
FROM appointments a
JOIN patients p ON a.patient_id = p.id
LEFT JOIN appointment_children ac ON a.id = ac.appointment_id
LEFT JOIN children c ON ac.child_id = c.id
GROUP BY a.id;

-- View to get conversations with metrics
CREATE VIEW IF NOT EXISTS conversations_with_metrics AS
SELECT
  c.id,
  c.patient_id,
  c.phone_number,
  c.direction,
  c.provider,
  c.started_at,
  c.ended_at,
  c.duration_seconds,
  c.outcome,
  cm.call_duration_seconds,
  cm.outcome as metrics_outcome,
  cm.quality_score,
  cm.user_satisfaction,
  cm.completion_rate,
  COUNT(DISTINCT fc.id) as function_calls_count,
  COUNT(DISTINCT sel.id) as skill_steps_count
FROM conversations c
LEFT JOIN call_metrics cm ON c.id = cm.conversation_id
LEFT JOIN function_calls fc ON c.id = fc.conversation_id
LEFT JOIN skill_execution_logs sel ON c.id = sel.conversation_id
GROUP BY c.id;

-- ============================================================================
-- DEMO CONFIGURATIONS TABLE (v4)
-- Stores different demo scenarios that can be selected at runtime
-- ============================================================================
CREATE TABLE IF NOT EXISTS demo_configs (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_active INTEGER DEFAULT 0,
  is_default INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_demo_configs_slug ON demo_configs(slug);
CREATE INDEX IF NOT EXISTS idx_demo_configs_active ON demo_configs(is_active);

-- ============================================================================
-- DEMO BUSINESS PROFILES TABLE (v4)
-- Organization information for each demo
-- ============================================================================
CREATE TABLE IF NOT EXISTS demo_business_profiles (
  id TEXT PRIMARY KEY,
  demo_config_id TEXT NOT NULL UNIQUE,
  organization_name TEXT NOT NULL,
  address_street TEXT NOT NULL,
  address_city TEXT NOT NULL,
  address_state TEXT NOT NULL,
  address_zip TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  secondary_color TEXT DEFAULT '#6366F1',
  hours_json TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (demo_config_id) REFERENCES demo_configs(id) ON DELETE CASCADE
);

-- ============================================================================
-- DEMO AGENT CONFIGS TABLE (v4)
-- AI agent settings for each demo
-- ============================================================================
CREATE TABLE IF NOT EXISTS demo_agent_configs (
  id TEXT PRIMARY KEY,
  demo_config_id TEXT NOT NULL UNIQUE,
  agent_name TEXT NOT NULL DEFAULT 'Sophia',
  voice_name TEXT NOT NULL DEFAULT 'alloy',
  personality_description TEXT,
  system_prompt TEXT NOT NULL,
  opening_script TEXT,
  closing_script TEXT,
  objection_handling_json TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (demo_config_id) REFERENCES demo_configs(id) ON DELETE CASCADE
);

-- ============================================================================
-- DEMO SCENARIOS TABLE (v4)
-- Call scenario details for each demo
-- ============================================================================
CREATE TABLE IF NOT EXISTS demo_scenarios (
  id TEXT PRIMARY KEY,
  demo_config_id TEXT NOT NULL UNIQUE,
  call_direction TEXT NOT NULL CHECK(call_direction IN ('inbound', 'outbound')),
  use_case TEXT NOT NULL,
  target_audience TEXT,
  demo_patient_data_json TEXT,
  key_talking_points_json TEXT,
  edge_cases_json TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (demo_config_id) REFERENCES demo_configs(id) ON DELETE CASCADE
);

-- ============================================================================
-- DEMO TOOL CONFIGS TABLE (v4)
-- Tool/function configurations for each demo
-- ============================================================================
CREATE TABLE IF NOT EXISTS demo_tool_configs (
  id TEXT PRIMARY KEY,
  demo_config_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  tool_type TEXT NOT NULL CHECK(tool_type IN ('predefined', 'custom')),
  is_enabled INTEGER DEFAULT 1,
  display_name TEXT,
  description TEXT,
  parameters_schema_json TEXT,
  mock_response_template TEXT,
  mock_response_delay_ms INTEGER DEFAULT 300,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (demo_config_id) REFERENCES demo_configs(id) ON DELETE CASCADE,
  UNIQUE(demo_config_id, tool_name)
);

CREATE INDEX IF NOT EXISTS idx_demo_tool_configs_demo ON demo_tool_configs(demo_config_id);
CREATE INDEX IF NOT EXISTS idx_demo_tool_configs_type ON demo_tool_configs(tool_type);

-- ============================================================================
-- DEMO SMS TEMPLATES TABLE (v4)
-- SMS message templates for each demo
-- ============================================================================
CREATE TABLE IF NOT EXISTS demo_sms_templates (
  id TEXT PRIMARY KEY,
  demo_config_id TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK(template_type IN ('confirmation', 'reminder', 'cancellation', 'custom')),
  template_name TEXT NOT NULL,
  sender_name TEXT NOT NULL DEFAULT 'Demo Clinic',
  message_template TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (demo_config_id) REFERENCES demo_configs(id) ON DELETE CASCADE,
  UNIQUE(demo_config_id, template_type, template_name)
);

CREATE INDEX IF NOT EXISTS idx_demo_sms_templates_demo ON demo_sms_templates(demo_config_id);

-- ============================================================================
-- DEMO UI LABELS TABLE (v4)
-- UI text customization for each demo
-- ============================================================================
CREATE TABLE IF NOT EXISTS demo_ui_labels (
  id TEXT PRIMARY KEY,
  demo_config_id TEXT NOT NULL UNIQUE,
  header_text TEXT DEFAULT 'Demo Clinic',
  header_badge TEXT DEFAULT '(Enhanced)',
  footer_text TEXT DEFAULT 'Enhanced Demo',
  hero_title TEXT DEFAULT 'Proactive care for every family',
  hero_subtitle TEXT,
  user_speaker_label TEXT DEFAULT 'Caller',
  agent_speaker_label TEXT DEFAULT 'Agent',
  call_button_text TEXT DEFAULT 'Start Demo Call',
  end_call_button_text TEXT DEFAULT 'End Call',
  badge_text TEXT DEFAULT 'VOICE AI DEMO',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (demo_config_id) REFERENCES demo_configs(id) ON DELETE CASCADE
);

-- Trigger to update demo_configs.updated_at
CREATE TRIGGER IF NOT EXISTS update_demo_configs_timestamp
AFTER UPDATE ON demo_configs
FOR EACH ROW
BEGIN
  UPDATE demo_configs SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Insert schema version for demo wizard
INSERT OR IGNORE INTO schema_version (version, description) VALUES
(4, 'Added demo configuration tables for Demo Wizard feature - demo_configs, demo_business_profiles, demo_agent_configs, demo_scenarios, demo_tool_configs, demo_sms_templates, demo_ui_labels');

-- ============================================================================
-- DEMO MOCK DATA POOLS TABLE (v5)
-- Stores configurable mock data per demo for tool responses
-- ============================================================================
CREATE TABLE IF NOT EXISTS demo_mock_data_pools (
  id TEXT PRIMARY KEY,
  demo_config_id TEXT NOT NULL,
  pool_type TEXT NOT NULL,  -- 'members', 'facilities', 'patients', 'children', 'rides', 'appointments', etc.
  pool_name TEXT NOT NULL,  -- Human-readable display name
  records_json TEXT NOT NULL,  -- JSON array of mock data records
  schema_json TEXT,  -- Optional JSON Schema for validation
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (demo_config_id) REFERENCES demo_configs(id) ON DELETE CASCADE,
  UNIQUE(demo_config_id, pool_type)
);

CREATE INDEX IF NOT EXISTS idx_demo_mock_pools_demo ON demo_mock_data_pools(demo_config_id);
CREATE INDEX IF NOT EXISTS idx_demo_mock_pools_type ON demo_mock_data_pools(pool_type);

-- Trigger to update demo_mock_data_pools.updated_at
CREATE TRIGGER IF NOT EXISTS update_demo_mock_data_pools_timestamp
AFTER UPDATE ON demo_mock_data_pools
FOR EACH ROW
BEGIN
  UPDATE demo_mock_data_pools SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Insert schema version for mock data pools
INSERT OR IGNORE INTO schema_version (version, description) VALUES
(5, 'Added demo_mock_data_pools table for configurable per-demo mock data that tools use at runtime');
