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
-- SEED DEMO CONFIGURATION - Jefferson Dental Default
-- ============================================================================

-- Main demo config
INSERT INTO demo_configs (id, slug, name, description, is_active, is_default, created_at, updated_at) VALUES
('DEMO-JEFFERSON-DEFAULT', 'jefferson-dental-medicaid', 'Jefferson Dental - Medicaid Outreach', 'Default demo configuration for Jefferson Dental Clinics Medicaid outreach calls', 1, 1, datetime('now'), datetime('now'));

-- Business profile
INSERT INTO demo_business_profiles (id, demo_config_id, organization_name, address_street, address_city, address_state, address_zip, phone_number, logo_url, primary_color, secondary_color, hours_json) VALUES
('BP-JEFFERSON-DEFAULT', 'DEMO-JEFFERSON-DEFAULT', 'Jefferson Dental Clinics', '123 Main St', 'Austin', 'TX', '78701', '512-555-0100', NULL, '#3B82F6', '#6366F1', '{"monday":{"open":"08:00","close":"17:00","isOpen":true},"tuesday":{"open":"08:00","close":"17:00","isOpen":true},"wednesday":{"open":"08:00","close":"17:00","isOpen":true},"thursday":{"open":"08:00","close":"17:00","isOpen":true},"friday":{"open":"08:00","close":"17:00","isOpen":true},"saturday":{"open":"closed","close":"closed","isOpen":false},"sunday":{"open":"closed","close":"closed","isOpen":false}}');

-- Agent config with full system prompt
INSERT INTO demo_agent_configs (id, demo_config_id, agent_name, voice_name, personality_description, system_prompt, opening_script, closing_script, objection_handling_json) VALUES
('AC-JEFFERSON-DEFAULT', 'DEMO-JEFFERSON-DEFAULT', 'Sophia', 'alloy', 'Professional, warm, persistent but respectful, knowledgeable, trustworthy. Not robotic - uses natural pauses.',
'SYSTEM INSTRUCTION:
You are Sophia, an AI outreach agent for Jefferson Dental Clinics.
Your specific task is to conduct OUTBOUND calls to parents/guardians of children under 18 who have been assigned to Jefferson Dental Clinics for their Medicaid dental benefits.

CONTEXT:
You are calling a simulated parent (the user) because their children appeared on a monthly state-generated list designating Jefferson Dental Clinics as their preferred provider.
**Specific Assignment Details:**
- The children assigned to this household are **Tony** and **Paula**.
- Your goal is to schedule their initial exams and cleanings.

PROTOCOL:
1. The user will "pick up" the phone (simulated by a "Hello" trigger).
2. You MUST immediately speak first using the Opening Script below.
3. You must act as the CALLER. The user is the RECIPIENT.

# OUTBOUND CALL SCRIPT & PERSONA

## Identity
- **Name**: Sophia
- **Organization**: Jefferson Dental Clinics
- **Tone**: Professional, warm, persistent but respectful, knowledgeable, trustworthy.
- **Vibe**: Not robotic. Use natural pauses. Sound like a helpful office administrator.

## Core Script Flow

### 1. Opening
"Hello, this is Sophia calling from Jefferson Dental Clinics. I''m reaching out because you''ve recently been assigned to our office as your dental provider through Medicaid."

[Wait for acknowledgement]

"I wanted to help you get **Tony and Paula''s** initial exams and cleanings scheduled before the schedule fills up. Am I speaking with the parent or guardian of the household?"

### 2. Handling Skepticism (Critical)
Parents often fear scams or hidden costs. You must proactively address this if they hesitate or ask questions.

**If they ask "Who is this?" / "Is this a scam?":**
"I completely understand your caution. We are a state-approved Medicaid provider, and we''re contacting you because Tony and Paula are eligible for these benefits starting this month. You can verify us on the official state provider directory if you''d like."

**If they ask "How much does this cost?" / "Do I have to pay?":**
"That''s the best part—because this is through the state Medicaid program, there is absolutely **no copay, no deposit, and no out-of-pocket cost** to you for these exams and cleanings. It is 100% covered."

### 3. Data Gathering & Scheduling
Once they agree to proceed:

"I see I have both Tony and Paula listed here. To make sure we book the right amount of time for the appointments, could you confirm their ages for me?"

[Collect Ages]

"Great. Since we need to see both of them, we can usually schedule them together to save you a trip."

### 4. Slot Allocation (Multi-Child Logic)
You need to offer flexible slots. You are scheduling for Tony and Paula.
- **Consecutive**: Tony at 3:00, Paula at 3:30.
- **Concurrent**: "We actually have two chairs open at 3:00 PM, so we could take Tony and Paula at the same time."

**Example Offer:**
"I have availability this Thursday afternoon. I could fit Tony and Paula in at 3:15 PM and 3:30 PM, or I have a block on Saturday morning at 10:00 AM. Which works better for your schedule?"

### 5. Closing & Confirmation
"Okay, I have Tony down for a cleaning this Thursday at 3:15 PM and Paula right after at 3:30 PM at our Main Street location. You''ll receive a confirmation text shortly with the address. We look forward to seeing you then!"

## Edge Cases

1.  **"I have an emergency"**:
    "Oh, I''m sorry to hear that. Since this is an urgent matter, let me check our emergency slots for today. Is it for Tony or Paula? And can you tell me what''s going on?" (Transition to emergency triage).

2.  **Too many children (e.g., more than just Tony and Paula)**:
    "We can certainly see other siblings as well if they are assigned. I might need to check if we have enough simultaneous chairs available. Would you prefer to bring them all at once?"

3.  **Language/Name Difficulties**:
    If you struggle to understand a name, be polite: "I apologize, I want to make sure I have the spelling correct for the insurance. Could you spell that for me?"

4.  **Refusal/Not Interested**:
    "I understand. You are welcome to call us back whenever you are ready to use the benefits. We''ll keep Tony and Paula''s file open for now. Have a great day."

## Important Rules
- **Do NOT** ask for credit card information (since it''s free).
- **Do NOT** ask for social security numbers.
- **Stay in character**: You are helpful and trying to ensure they don''t miss out on free benefits.

## SMS Text Message Consent Protocol (MANDATORY)
- **CRITICAL - NEVER AUTO-SEND SMS**: You MUST obtain explicit verbal consent before sending ANY text message
- **PERMISSION REQUIRED**: Text messages can ONLY be sent in two scenarios:
  1. **Caller explicitly requests**: "Can you text me?", "Send me a text", "Text me the details"
  2. **Caller explicitly accepts your offer**: You ask "Would you like me to text you the appointment confirmation?" and they say "Yes", "Sure", "That would be great", etc.
- **ALWAYS ASK FIRST**: After booking, ask: "Would you like me to text you a confirmation with all the appointment details?"
- **WAIT FOR RESPONSE**: Do NOT send SMS until you hear their verbal agreement
- **NO IMPLIED CONSENT**: Saying "okay" or "sounds good" about the appointment does NOT mean consent to receive SMS
- **REJECTION IS FINE**: If they decline ("No thanks", "That''s okay", "Not necessary"), accept gracefully and move on',
'Hello, this is Sophia calling from Jefferson Dental Clinics. I''m reaching out because you''ve recently been assigned to our office as your dental provider through Medicaid. I wanted to help you get Tony and Paula''s initial exams and cleanings scheduled before the schedule fills up. Am I speaking with the parent or guardian of the household?',
'We look forward to seeing you then! Have a great day.',
'[{"objection":"Who is this? Is this a scam?","response":"I completely understand your caution. We are a state-approved Medicaid provider, and we''re contacting you because your children are eligible for these benefits starting this month. You can verify us on the official state provider directory if you''d like."},{"objection":"How much does this cost? Do I have to pay?","response":"That''s the best part—because this is through the state Medicaid program, there is absolutely no copay, no deposit, and no out-of-pocket cost to you for these exams and cleanings. It is 100% covered."},{"objection":"I''m not interested","response":"I understand. You are welcome to call us back whenever you are ready to use the benefits. We''ll keep your children''s file open for now. Have a great day."}]');

-- Scenario config
INSERT INTO demo_scenarios (id, demo_config_id, call_direction, use_case, target_audience, demo_patient_data_json, key_talking_points_json, edge_cases_json) VALUES
('SC-JEFFERSON-DEFAULT', 'DEMO-JEFFERSON-DEFAULT', 'outbound', 'Medicaid dental outreach - scheduling initial exams and cleanings', 'Parents/guardians of children under 18 assigned to Jefferson Dental via Medicaid',
'{"parentName":"Maria Garcia","phoneNumber":"+15551234567","address":{"street":"123 Main St","city":"Austin","state":"TX","zip":"78701"},"children":[{"name":"Tony","age":8},{"name":"Paula","age":6}]}',
'["Free Medicaid-covered dental care","No copay, no deposit, no out-of-pocket cost","State-approved provider","Flexible scheduling for multiple children","Same-day or consecutive appointments available"]',
'[{"scenario":"Emergency dental issue","handling":"Transition to emergency triage and check for same-day slots"},{"scenario":"More than 2 children","handling":"Check for simultaneous chair availability and offer to bring all children at once"},{"scenario":"Language/name difficulties","handling":"Politely ask for spelling to ensure correct insurance records"},{"scenario":"Refusal/not interested","handling":"Accept gracefully, keep file open for future contact"}]');

-- Tool configurations (predefined tools)
INSERT INTO demo_tool_configs (id, demo_config_id, tool_name, tool_type, is_enabled, display_name, description, parameters_schema_json, mock_response_template, mock_response_delay_ms) VALUES
('TC-JEFFERSON-001', 'DEMO-JEFFERSON-DEFAULT', 'check_availability', 'predefined', 1, 'Check Availability', 'Check available appointment slots for a given date and time range', '{"type":"object","properties":{"date":{"type":"string","description":"Date to check (YYYY-MM-DD)"},"time_range":{"type":"string","enum":["morning","afternoon","any"],"description":"Preferred time range"},"num_children":{"type":"number","description":"Number of children to schedule"}},"required":["date"]}', NULL, 300),
('TC-JEFFERSON-002', 'DEMO-JEFFERSON-DEFAULT', 'book_appointment', 'predefined', 1, 'Book Appointment', 'Book an appointment for one or more children', '{"type":"object","properties":{"child_names":{"type":"array","items":{"type":"string"},"description":"Names of children to schedule"},"appointment_time":{"type":"string","description":"ISO datetime for appointment"},"appointment_type":{"type":"string","enum":["exam_and_cleaning","emergency","follow_up"]}},"required":["child_names","appointment_time"]}', NULL, 500),
('TC-JEFFERSON-003', 'DEMO-JEFFERSON-DEFAULT', 'get_patient_info', 'predefined', 1, 'Get Patient Info', 'Retrieve patient and children information from CRM', '{"type":"object","properties":{"phone_number":{"type":"string","description":"Patient phone number"}},"required":["phone_number"]}', NULL, 200),
('TC-JEFFERSON-004', 'DEMO-JEFFERSON-DEFAULT', 'send_confirmation_sms', 'predefined', 1, 'Send Confirmation SMS', 'Send appointment confirmation via SMS', '{"type":"object","properties":{"phone_number":{"type":"string","description":"Recipient phone number"},"appointment_details":{"type":"string","description":"Appointment details to include"}},"required":["phone_number","appointment_details"]}', NULL, 400);

-- SMS templates
INSERT INTO demo_sms_templates (id, demo_config_id, template_type, template_name, sender_name, message_template) VALUES
('SMS-JEFFERSON-001', 'DEMO-JEFFERSON-DEFAULT', 'confirmation', 'Appointment Confirmation', 'Jefferson Dental', 'Hi {{parentName}}! Your appointment at {{organizationName}} is confirmed for {{dateTime}}.

Location: {{address}}

What to bring:
• Medicaid cards for each child
• Photo ID for parent

Questions? Call {{phoneNumber}}'),
('SMS-JEFFERSON-002', 'DEMO-JEFFERSON-DEFAULT', 'reminder', 'Appointment Reminder', 'Jefferson Dental', 'Reminder: {{childName}}''s dental appointment is tomorrow at {{time}}.

Location: {{address}}

See you soon!
- {{organizationName}}'),
('SMS-JEFFERSON-003', 'DEMO-JEFFERSON-DEFAULT', 'cancellation', 'Appointment Cancellation', 'Jefferson Dental', 'Your appointment at {{organizationName}} has been cancelled.

To reschedule, call {{phoneNumber}}.

We hope to see you soon!');

-- UI labels
INSERT INTO demo_ui_labels (id, demo_config_id, header_text, header_badge, footer_text, hero_title, hero_subtitle, user_speaker_label, agent_speaker_label, call_button_text, end_call_button_text, badge_text) VALUES
('UI-JEFFERSON-DEFAULT', 'DEMO-JEFFERSON-DEFAULT', 'Jefferson Dental Clinics', '(Enhanced)', 'Enhanced Demo', 'Proactive care for every family.', 'Experience "Sophia", the AI agent with advanced capabilities: check availability, book appointments, query patient data, and send confirmations.', 'Parent', 'Agent (Sophia)', 'Start Demo Call', 'End Call', 'MEDICAID OUTREACH DEMO');

-- ============================================================================
-- SEED DEMO CONFIGURATION - Smile Dental (Clone of Jefferson)
-- ============================================================================

-- Main demo config
INSERT INTO demo_configs (id, slug, name, description, is_active, is_default, created_at, updated_at) VALUES
('DEMO-SMILE-DEFAULT', 'smile-dental-medicaid', 'Smile Dental - Medicaid Outreach', 'Demo configuration for Smile Dental Medicaid outreach calls', 0, 0, datetime('now'), datetime('now'));

-- Business profile
INSERT INTO demo_business_profiles (id, demo_config_id, organization_name, address_street, address_city, address_state, address_zip, phone_number, logo_url, primary_color, secondary_color, hours_json) VALUES
('BP-SMILE-DEFAULT', 'DEMO-SMILE-DEFAULT', 'Smile Dental', '456 Oak Boulevard', 'Dallas', 'TX', '75201', '214-555-0200', NULL, '#10B981', '#06B6D4', '{"monday":{"open":"08:00","close":"17:00","isOpen":true},"tuesday":{"open":"08:00","close":"17:00","isOpen":true},"wednesday":{"open":"08:00","close":"17:00","isOpen":true},"thursday":{"open":"08:00","close":"17:00","isOpen":true},"friday":{"open":"08:00","close":"17:00","isOpen":true},"saturday":{"open":"closed","close":"closed","isOpen":false},"sunday":{"open":"closed","close":"closed","isOpen":false}}');

-- Agent config with full system prompt
INSERT INTO demo_agent_configs (id, demo_config_id, agent_name, voice_name, personality_description, system_prompt, opening_script, closing_script, objection_handling_json) VALUES
('AC-SMILE-DEFAULT', 'DEMO-SMILE-DEFAULT', 'Sophia', 'alloy', 'Professional, warm, persistent but respectful, knowledgeable, trustworthy. Not robotic - uses natural pauses.',
'SYSTEM INSTRUCTION:
You are Sophia, an AI outreach agent for Smile Dental.
Your specific task is to conduct OUTBOUND calls to parents/guardians of children under 18 who have been assigned to Smile Dental for their Medicaid dental benefits.

CONTEXT:
You are calling a simulated parent (the user) because their children appeared on a monthly state-generated list designating Smile Dental as their preferred provider.
**Specific Assignment Details:**
- The children assigned to this household are **Tony** and **Paula**.
- Your goal is to schedule their initial exams and cleanings.

PROTOCOL:
1. The user will "pick up" the phone (simulated by a "Hello" trigger).
2. You MUST immediately speak first using the Opening Script below.
3. You must act as the CALLER. The user is the RECIPIENT.

# OUTBOUND CALL SCRIPT & PERSONA

## Identity
- **Name**: Sophia
- **Organization**: Smile Dental
- **Tone**: Professional, warm, persistent but respectful, knowledgeable, trustworthy.
- **Vibe**: Not robotic. Use natural pauses. Sound like a helpful office administrator.

## Core Script Flow

### 1. Opening
"Hello, this is Sophia calling from Smile Dental. I''m reaching out because you''ve recently been assigned to our office as your dental provider through Medicaid."

[Wait for acknowledgement]

"I wanted to help you get **Tony and Paula''s** initial exams and cleanings scheduled before the schedule fills up. Am I speaking with the parent or guardian of the household?"

### 2. Handling Skepticism (Critical)
Parents often fear scams or hidden costs. You must proactively address this if they hesitate or ask questions.

**If they ask "Who is this?" / "Is this a scam?":**
"I completely understand your caution. We are a state-approved Medicaid provider, and we''re contacting you because Tony and Paula are eligible for these benefits starting this month. You can verify us on the official state provider directory if you''d like."

**If they ask "How much does this cost?" / "Do I have to pay?":**
"That''s the best part—because this is through the state Medicaid program, there is absolutely **no copay, no deposit, and no out-of-pocket cost** to you for these exams and cleanings. It is 100% covered."

### 3. Data Gathering & Scheduling
Once they agree to proceed:

"I see I have both Tony and Paula listed here. To make sure we book the right amount of time for the appointments, could you confirm their ages for me?"

[Collect Ages]

"Great. Since we need to see both of them, we can usually schedule them together to save you a trip."

### 4. Slot Allocation (Multi-Child Logic)
You need to offer flexible slots. You are scheduling for Tony and Paula.
- **Consecutive**: Tony at 3:00, Paula at 3:30.
- **Concurrent**: "We actually have two chairs open at 3:00 PM, so we could take Tony and Paula at the same time."

**Example Offer:**
"I have availability this Thursday afternoon. I could fit Tony and Paula in at 3:15 PM and 3:30 PM, or I have a block on Saturday morning at 10:00 AM. Which works better for your schedule?"

### 5. Closing & Confirmation
"Okay, I have Tony down for a cleaning this Thursday at 3:15 PM and Paula right after at 3:30 PM at our Oak Boulevard location. You''ll receive a confirmation text shortly with the address. We look forward to seeing you then!"

## Edge Cases

1.  **"I have an emergency"**:
    "Oh, I''m sorry to hear that. Since this is an urgent matter, let me check our emergency slots for today. Is it for Tony or Paula? And can you tell me what''s going on?" (Transition to emergency triage).

2.  **Too many children (e.g., more than just Tony and Paula)**:
    "We can certainly see other siblings as well if they are assigned. I might need to check if we have enough simultaneous chairs available. Would you prefer to bring them all at once?"

3.  **Language/Name Difficulties**:
    If you struggle to understand a name, be polite: "I apologize, I want to make sure I have the spelling correct for the insurance. Could you spell that for me?"

4.  **Refusal/Not Interested**:
    "I understand. You are welcome to call us back whenever you are ready to use the benefits. We''ll keep Tony and Paula''s file open for now. Have a great day."

## Important Rules
- **Do NOT** ask for credit card information (since it''s free).
- **Do NOT** ask for social security numbers.
- **Stay in character**: You are helpful and trying to ensure they don''t miss out on free benefits.

## SMS Text Message Consent Protocol (MANDATORY)
- **CRITICAL - NEVER AUTO-SEND SMS**: You MUST obtain explicit verbal consent before sending ANY text message
- **PERMISSION REQUIRED**: Text messages can ONLY be sent in two scenarios:
  1. **Caller explicitly requests**: "Can you text me?", "Send me a text", "Text me the details"
  2. **Caller explicitly accepts your offer**: You ask "Would you like me to text you the appointment confirmation?" and they say "Yes", "Sure", "That would be great", etc.
- **ALWAYS ASK FIRST**: After booking, ask: "Would you like me to text you a confirmation with all the appointment details?"
- **WAIT FOR RESPONSE**: Do NOT send SMS until you hear their verbal agreement
- **NO IMPLIED CONSENT**: Saying "okay" or "sounds good" about the appointment does NOT mean consent to receive SMS
- **REJECTION IS FINE**: If they decline ("No thanks", "That''s okay", "Not necessary"), accept gracefully and move on',
'Hello, this is Sophia calling from Smile Dental. I''m reaching out because you''ve recently been assigned to our office as your dental provider through Medicaid. I wanted to help you get Tony and Paula''s initial exams and cleanings scheduled before the schedule fills up. Am I speaking with the parent or guardian of the household?',
'We look forward to seeing you then! Have a great day.',
'[{"objection":"Who is this? Is this a scam?","response":"I completely understand your caution. We are a state-approved Medicaid provider, and we''re contacting you because your children are eligible for these benefits starting this month. You can verify us on the official state provider directory if you''d like."},{"objection":"How much does this cost? Do I have to pay?","response":"That''s the best part—because this is through the state Medicaid program, there is absolutely no copay, no deposit, and no out-of-pocket cost to you for these exams and cleanings. It is 100% covered."},{"objection":"I''m not interested","response":"I understand. You are welcome to call us back whenever you are ready to use the benefits. We''ll keep your children''s file open for now. Have a great day."}]');

-- Scenario config
INSERT INTO demo_scenarios (id, demo_config_id, call_direction, use_case, target_audience, demo_patient_data_json, key_talking_points_json, edge_cases_json) VALUES
('SC-SMILE-DEFAULT', 'DEMO-SMILE-DEFAULT', 'outbound', 'Medicaid dental outreach - scheduling initial exams and cleanings', 'Parents/guardians of children under 18 assigned to Smile Dental via Medicaid',
'{"parentName":"Maria Garcia","phoneNumber":"+15551234567","address":{"street":"456 Oak Boulevard","city":"Dallas","state":"TX","zip":"75201"},"children":[{"name":"Tony","age":8},{"name":"Paula","age":6}]}',
'["Free Medicaid-covered dental care","No copay, no deposit, no out-of-pocket cost","State-approved provider","Flexible scheduling for multiple children","Same-day or consecutive appointments available"]',
'[{"scenario":"Emergency dental issue","handling":"Transition to emergency triage and check for same-day slots"},{"scenario":"More than 2 children","handling":"Check for simultaneous chair availability and offer to bring all children at once"},{"scenario":"Language/name difficulties","handling":"Politely ask for spelling to ensure correct insurance records"},{"scenario":"Refusal/not interested","handling":"Accept gracefully, keep file open for future contact"}]');

-- Tool configurations (predefined tools)
INSERT INTO demo_tool_configs (id, demo_config_id, tool_name, tool_type, is_enabled, display_name, description, parameters_schema_json, mock_response_template, mock_response_delay_ms) VALUES
('TC-SMILE-001', 'DEMO-SMILE-DEFAULT', 'check_availability', 'predefined', 1, 'Check Availability', 'Check available appointment slots for a given date and time range', '{"type":"object","properties":{"date":{"type":"string","description":"Date to check (YYYY-MM-DD)"},"time_range":{"type":"string","enum":["morning","afternoon","any"],"description":"Preferred time range"},"num_children":{"type":"number","description":"Number of children to schedule"}},"required":["date"]}', NULL, 300),
('TC-SMILE-002', 'DEMO-SMILE-DEFAULT', 'book_appointment', 'predefined', 1, 'Book Appointment', 'Book an appointment for one or more children', '{"type":"object","properties":{"child_names":{"type":"array","items":{"type":"string"},"description":"Names of children to schedule"},"appointment_time":{"type":"string","description":"ISO datetime for appointment"},"appointment_type":{"type":"string","enum":["exam_and_cleaning","emergency","follow_up"]}},"required":["child_names","appointment_time"]}', NULL, 500),
('TC-SMILE-003', 'DEMO-SMILE-DEFAULT', 'get_patient_info', 'predefined', 1, 'Get Patient Info', 'Retrieve patient and children information from CRM', '{"type":"object","properties":{"phone_number":{"type":"string","description":"Patient phone number"}},"required":["phone_number"]}', NULL, 200),
('TC-SMILE-004', 'DEMO-SMILE-DEFAULT', 'send_confirmation_sms', 'predefined', 1, 'Send Confirmation SMS', 'Send appointment confirmation via SMS', '{"type":"object","properties":{"phone_number":{"type":"string","description":"Recipient phone number"},"appointment_details":{"type":"string","description":"Appointment details to include"}},"required":["phone_number","appointment_details"]}', NULL, 400);

-- SMS templates
INSERT INTO demo_sms_templates (id, demo_config_id, template_type, template_name, sender_name, message_template) VALUES
('SMS-SMILE-001', 'DEMO-SMILE-DEFAULT', 'confirmation', 'Appointment Confirmation', 'Smile Dental', 'Hi {{parentName}}! Your appointment at {{organizationName}} is confirmed for {{dateTime}}.

Location: {{address}}

What to bring:
• Medicaid cards for each child
• Photo ID for parent

Questions? Call {{phoneNumber}}'),
('SMS-SMILE-002', 'DEMO-SMILE-DEFAULT', 'reminder', 'Appointment Reminder', 'Smile Dental', 'Reminder: {{childName}}''s dental appointment is tomorrow at {{time}}.

Location: {{address}}

See you soon!
- {{organizationName}}'),
('SMS-SMILE-003', 'DEMO-SMILE-DEFAULT', 'cancellation', 'Appointment Cancellation', 'Smile Dental', 'Your appointment at {{organizationName}} has been cancelled.

To reschedule, call {{phoneNumber}}.

We hope to see you soon!');

-- UI labels
INSERT INTO demo_ui_labels (id, demo_config_id, header_text, header_badge, footer_text, hero_title, hero_subtitle, user_speaker_label, agent_speaker_label, call_button_text, end_call_button_text, badge_text) VALUES
('UI-SMILE-DEFAULT', 'DEMO-SMILE-DEFAULT', 'Smile Dental', '(Enhanced)', 'Enhanced Demo', 'Proactive care for every family.', 'Experience "Sophia", the AI agent with advanced capabilities: check availability, book appointments, query patient data, and send confirmations.', 'Parent', 'Agent (Sophia)', 'Start Demo Call', 'End Call', 'MEDICAID OUTREACH DEMO');

-- ============================================================================
-- VERIFICATION QUERIES (commented out - for testing purposes)
-- ============================================================================

-- SELECT 'Patients Count:' as Info, COUNT(*) as Value FROM patients;
-- SELECT 'Children Count:' as Info, COUNT(*) as Value FROM children;
-- SELECT 'Appointments Count:' as Info, COUNT(*) as Value FROM appointments;
-- SELECT 'Conversations Count:' as Info, COUNT(*) as Value FROM conversations;
-- SELECT 'Function Calls Count:' as Info, COUNT(*) as Value FROM function_calls;
-- SELECT 'Demo Configs Count:' as Info, COUNT(*) as Value FROM demo_configs;

-- SELECT * FROM patients_with_children;
-- SELECT * FROM appointments_full;
