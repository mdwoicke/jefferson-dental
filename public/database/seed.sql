-- Jefferson Dental Clinics - Seed Data
-- Migrated from mock data in services/crm-service.ts
-- Version: 1.0
-- Date: 2025-01-15

-- ============================================================================
-- SEED PATIENTS
-- ============================================================================

INSERT INTO patients (id, phone_number, parent_name, address_street, address_city, address_state, address_zip, preferred_language, last_visit, notes) VALUES
('PAT-001', '+15551234567', 'Maria Garcia', '123 Main St', 'Austin', 'TX', '78701', 'English', NULL, 'New patient assigned via Medicaid'),
('PAT-002', '+15559876543', 'John Smith', '456 Oak Avenue', 'Austin', 'TX', '78702', 'English', '2024-11-15', 'Prefers morning appointments'),
('PAT-003', '+19132209085', 'Mike', '999 Test St', 'Austin', 'TX', '78704', 'English', NULL, 'Test patient for inbound calls'),
('PAT-DEMO', 'demo', 'Demo Parent', '789 Demo St', 'Austin', 'TX', '78703', 'English', NULL, 'Demo account for testing');

-- ============================================================================
-- SEED CHILDREN
-- ============================================================================

INSERT INTO children (patient_id, name, age, medicaid_id, date_of_birth, special_needs) VALUES
('PAT-001', 'Tony', 8, 'MCD-001-A', '2017-03-15', NULL),
('PAT-001', 'Paula', 6, 'MCD-001-B', '2019-07-22', NULL),
('PAT-002', 'Emma', 7, 'MCD-002-A', '2018-05-10', NULL),
('PAT-002', 'Liam', 5, 'MCD-002-B', '2020-01-18', NULL),
('PAT-002', 'Olivia', 3, 'MCD-002-C', '2022-09-30', 'Mild anxiety around loud noises'),
('PAT-003', 'Tony', 8, 'MCD-003-A', '2017-03-15', NULL),
('PAT-003', 'Paula', 6, 'MCD-003-B', '2019-07-22', NULL),
('PAT-DEMO', 'Alex', 9, 'MCD-DEMO-A', '2016-11-05', NULL),
('PAT-DEMO', 'Sam', 7, 'MCD-DEMO-B', '2018-08-12', NULL);

-- ============================================================================
-- SAMPLE APPOINTMENTS (for testing)
-- ============================================================================

-- One completed appointment for John Smith's family
INSERT INTO appointments (id, booking_id, patient_id, appointment_time, appointment_type, status, location, confirmation_sent, confirmation_method, confirmation_sid) VALUES
('APT-SAMPLE-001', 'APT-SAMPLE-001', 'PAT-002', '2024-11-15T10:00:00Z', 'exam_and_cleaning', 'completed', 'Jefferson Dental - Main Street', 1, 'sms', 'SM-MOCK-12345');

-- Link children to the appointment
INSERT INTO appointment_children (appointment_id, child_id) VALUES
('APT-SAMPLE-001', (SELECT id FROM children WHERE patient_id = 'PAT-002' AND name = 'Emma')),
('APT-SAMPLE-001', (SELECT id FROM children WHERE patient_id = 'PAT-002' AND name = 'Liam'));

-- Future appointment for Maria Garcia
INSERT INTO appointments (id, booking_id, patient_id, appointment_time, appointment_type, status, location, confirmation_sent, confirmation_method) VALUES
('APT-SAMPLE-002', 'APT-SAMPLE-002', 'PAT-001', '2025-01-25T14:00:00Z', 'exam_and_cleaning', 'confirmed', 'Jefferson Dental - Main Street', 1, 'sms');

-- Link children to the future appointment
INSERT INTO appointment_children (appointment_id, child_id) VALUES
('APT-SAMPLE-002', (SELECT id FROM children WHERE patient_id = 'PAT-001' AND name = 'Tony')),
('APT-SAMPLE-002', (SELECT id FROM children WHERE patient_id = 'PAT-001' AND name = 'Paula'));

-- ============================================================================
-- SAMPLE CONVERSATION LOG (for testing conversation viewer)
-- ============================================================================

INSERT INTO conversations (id, patient_id, phone_number, direction, provider, call_sid, started_at, ended_at, duration_seconds, outcome, outcome_details) VALUES
('CONV-SAMPLE-001', 'PAT-002', '+15559876543', 'outbound', 'openai', 'CA-MOCK-12345', '2024-11-14T09:30:00Z', '2024-11-14T09:35:45Z', 345, 'appointment_booked', '{"booking_id": "APT-SAMPLE-001", "children_count": 2}');

-- Sample conversation turns
INSERT INTO conversation_turns (conversation_id, turn_number, role, content_type, content_text, timestamp) VALUES
('CONV-SAMPLE-001', 1, 'assistant', 'text', 'Hello, this is Sophia calling from Jefferson Dental Clinics. I''m reaching out because you''ve recently been assigned to our office as your dental provider through Medicaid. I wanted to help you get Emma and Liam''s initial exams and cleanings scheduled before the schedule fills up. Am I speaking with John Smith?', '2024-11-14T09:30:05Z'),
('CONV-SAMPLE-001', 2, 'user', 'text', 'Yes, this is John. How did you get my number?', '2024-11-14T09:30:15Z'),
('CONV-SAMPLE-001', 3, 'assistant', 'text', 'I completely understand your caution. We are a state-approved Medicaid provider, and we''re contacting you because Emma and Liam are eligible for these benefits starting this month. You can verify us on the official state provider directory if you''d like. I can confirm your address is 456 Oak Avenue, Austin, TX 78702, which matches our records.', '2024-11-14T09:30:30Z'),
('CONV-SAMPLE-001', 4, 'user', 'text', 'OK, that sounds right. What do I need to do?', '2024-11-14T09:30:42Z'),
('CONV-SAMPLE-001', 5, 'assistant', 'text', 'Great! I see I have Emma (age 7) and Liam (age 5) listed here. To make sure we book the right amount of time for the appointments, could you confirm their ages for me?', '2024-11-14T09:30:50Z'),
('CONV-SAMPLE-001', 6, 'user', 'text', 'Yes, Emma just turned 7 and Liam is 5.', '2024-11-14T09:31:05Z');

-- Sample function calls
INSERT INTO function_calls (conversation_id, call_id, function_name, arguments, result, status, execution_time_ms, timestamp) VALUES
('CONV-SAMPLE-001', 'call_abc123', 'check_availability', '{"date": "2024-11-15", "time_range": "morning", "num_children": 2}', '[{"time": "10:00 AM", "datetime": "2024-11-15T10:00:00Z", "available_chairs": 3, "can_accommodate": true}]', 'success', 487, '2024-11-14T09:31:15Z'),
('CONV-SAMPLE-001', 'call_def456', 'book_appointment', '{"child_names": ["Emma", "Liam"], "appointment_time": "2024-11-15T10:00:00Z", "appointment_type": "exam_and_cleaning"}', '{"booking_id": "APT-SAMPLE-001", "status": "confirmed", "confirmation_sent": false}', 'success', 623, '2024-11-14T09:34:20Z'),
('CONV-SAMPLE-001', 'call_ghi789', 'send_confirmation_sms', '{"phone_number": "+15559876543", "appointment_details": "Appointment confirmed for Emma and Liam on Nov 15 at 10:00 AM at Jefferson Dental - Main Street"}', '{"sent": true, "message_sid": "SM-MOCK-12345"}', 'success', 392, '2024-11-14T09:34:55Z');

-- ============================================================================
-- SAMPLE AUDIT TRAIL
-- ============================================================================

INSERT INTO audit_trail (table_name, record_id, operation, changed_by, change_reason, timestamp) VALUES
('patients', 'PAT-001', 'INSERT', 'system', 'Initial seed data', datetime('now', '-30 days')),
('patients', 'PAT-002', 'INSERT', 'system', 'Initial seed data', datetime('now', '-30 days')),
('patients', 'PAT-003', 'INSERT', 'system', 'Initial seed data', datetime('now', '-30 days')),
('patients', 'PAT-DEMO', 'INSERT', 'system', 'Initial seed data', datetime('now', '-30 days')),
('appointments', 'APT-SAMPLE-001', 'INSERT', 'ai_agent', 'Appointment booked via conversation', '2024-11-14T09:34:22Z'),
('appointments', 'APT-SAMPLE-001', 'UPDATE', 'system', 'Marked as completed after visit', '2024-11-15T11:30:00Z'),
('appointments', 'APT-SAMPLE-002', 'INSERT', 'admin', 'Future appointment scheduled manually', '2025-01-15T08:00:00Z');

-- ============================================================================
-- VERIFICATION QUERIES (commented out - for testing purposes)
-- ============================================================================

-- SELECT 'Patients Count:' as Info, COUNT(*) as Value FROM patients;
-- SELECT 'Children Count:' as Info, COUNT(*) as Value FROM children;
-- SELECT 'Appointments Count:' as Info, COUNT(*) as Value FROM appointments;
-- SELECT 'Conversations Count:' as Info, COUNT(*) as Value FROM conversations;
-- SELECT 'Function Calls Count:' as Info, COUNT(*) as Value FROM function_calls;

-- SELECT * FROM patients_with_children;
-- SELECT * FROM appointments_full;
