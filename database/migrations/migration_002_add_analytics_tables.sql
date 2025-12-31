-- Migration 002: Analytics and Testing Tables
-- Date: 2025-01-21
-- Description: Add call metrics, test scenarios, test executions, and skill execution logs

-- Call Metrics: Quality and performance tracking
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

-- Test Scenarios: Automated test case definitions
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

-- Test Executions: Test run results
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

-- Skill Execution Logs: Multi-step workflow tracking
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

-- View: Full conversation context with metrics
CREATE VIEW IF NOT EXISTS conversations_with_metrics AS
SELECT
  c.id,
  c.conversation_id,
  c.patient_id,
  c.start_time,
  c.end_time,
  c.status,
  cm.call_duration_seconds,
  cm.outcome,
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

-- Update schema version
INSERT OR IGNORE INTO schema_version (version, description) VALUES
(2, 'Added call_metrics, test_scenarios, test_executions, and skill_execution_logs tables for analytics and testing');
