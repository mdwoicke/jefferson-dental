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
