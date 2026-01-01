# Create Demo from Call Transcript

A comprehensive skill for creating a production-quality voice AI demo based on a call transcript and optional website URL.

---
name: create-demo-from-transcript
version: 1.0.0
category: demo-creation
description: Creates a complete voice AI demo configuration from a sample call transcript and website research
command: /create-demo
---

## Overview

This skill guides the creation of a new demo configuration for the Voice AI platform. It takes a sample call transcript (showing the conversation flow) and optionally a company website URL to research, then generates all necessary components for a fully functional demo.

## Prerequisites

Before starting, ensure you have:
- A sample call transcript (text file or pasted content)
- (Optional) Company website URL for research
- Understanding of the call direction (inbound vs outbound)
- Industry/use case context

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| `transcript` | Yes | Sample call transcript showing agent-caller conversation |
| `url` | No | Company website URL for branding/context research |
| `demo_slug` | No | URL-safe identifier (auto-generated if not provided) |
| `call_direction` | No | 'inbound' or 'outbound' (inferred from transcript) |

## Output Files

This skill creates/modifies the following files:

| File | Purpose |
|------|---------|
| `services/{industry}-service.ts` | Mock service with data and business logic |
| `types/demo-config.ts` | Tool definitions added to predefined tools |
| `providers/openai-provider.ts` | Tool handlers added |
| `database/seed.sql` | Complete demo seed data |
| `public/database/seed.sql` | Browser-side seed data (mirror) |

---

## Workflow Steps

### Phase 1: Research & Analysis

#### Step 1.1: Analyze the Transcript

Read the transcript carefully and extract:

```markdown
## Transcript Analysis Checklist

### Call Flow
- [ ] Identify call direction (inbound/outbound)
- [ ] Extract opening greeting pattern
- [ ] Map verification/authentication steps
- [ ] Document main workflow steps
- [ ] Note closing script pattern

### Data Points Collected
- [ ] List all data fields gathered (names, IDs, addresses, dates, etc.)
- [ ] Identify verification requirements
- [ ] Note any confirmation numbers or IDs generated

### Decision Points
- [ ] Map conditional branches (if X then Y)
- [ ] Identify edge cases mentioned or implied
- [ ] Note objections/concerns and responses

### Entities & Relationships
- [ ] Primary user type (member, patient, customer)
- [ ] Secondary entities (companions, children, etc.)
- [ ] Service/product being scheduled
```

#### Step 1.2: Research Website (if URL provided)

Use WebFetch to gather:

```markdown
## Website Research Checklist

- [ ] Company name and branding
- [ ] Primary colors (extract hex codes if visible)
- [ ] Services offered
- [ ] Operating hours
- [ ] Contact information
- [ ] Taglines or slogans
- [ ] Industry-specific terminology
```

#### Step 1.3: Determine Industry & Tool Set

Based on analysis, identify:

```markdown
## Industry Classification

| Industry | Example Use Cases | Key Tools Needed |
|----------|------------------|------------------|
| Healthcare/Dental | Appointment scheduling | check_availability, book_appointment, get_patient_info |
| NEMT | Ride booking | verify_member, book_ride, get_ride_status, add_companion |
| Insurance | Claims, quotes | verify_policy, get_quote, file_claim |
| Retail | Order status, returns | get_order_status, initiate_return, track_shipment |
| Utilities | Service requests | verify_account, schedule_service, report_outage |
```

---

### Phase 2: Design & Planning

#### Step 2.1: Define Tools

For each action the agent performs, define a tool:

```typescript
// Tool Definition Template
{
  toolName: 'tool_name',
  toolType: 'predefined',
  isEnabled: true,
  displayName: 'Human Readable Name',
  description: 'What this tool does',
  parametersSchema: {
    type: 'object',
    properties: {
      param1: { type: 'string', description: 'Description' },
      param2: { type: 'number', description: 'Description' }
    },
    required: ['param1']
  },
  mockResponseDelayMs: 300  // Realistic delay
}
```

#### Step 2.2: Design System Prompt

Use XML/Markdown hybrid structure for clarity:

```xml
<system_instruction>

## IDENTITY & ROLE
<identity>
- **Name**: [Agent Name]
- **Role**: [Role Title]
- **Organization**: [Company Name]
- **Voice**: [Personality traits]
- **Expertise**: [Domain knowledge]
</identity>

---

## CALL CONTEXT
[Inbound/Outbound context and services offered]

---

## VERIFICATION PROTOCOL (if applicable)
<verification_protocol>
**Step 1**: [First verification step]
**Step 2**: [Second verification step]
**Step 3**: [Call verification tool]
</verification_protocol>

---

## CALL FLOW
<call_flow>
### Opening
[Opening script]

### Main Flow
[Step-by-step workflow]

### Closing
[Closing script]
</call_flow>

---

## EDGE CASES
<edge_cases>
### [Edge Case 1]
[How to handle]

### [Edge Case 2]
[How to handle]
</edge_cases>

---

## SMS CONSENT PROTOCOL
<sms_protocol>
**CRITICAL**: Explicit verbal consent required
[Consent requirements]
</sms_protocol>

---

## PROHIBITED ACTIONS
<prohibited_actions>
- **NO** [prohibited action 1]
- **NO** [prohibited action 2]
</prohibited_actions>

---

## COMMUNICATION STYLE
<communication_style>
- [Style guideline 1]
- [Style guideline 2]
</communication_style>

</system_instruction>
```

#### Step 2.3: Define Demo Member/Patient Data

Create realistic demo data:

```json
{
  "parentName": "Maria Santos",
  "phoneNumber": "(555) 987-6543",
  "address": {
    "street": "1234 Oak Street, Apt 5B",
    "city": "Phoenix",
    "state": "AZ",
    "zip": "85004"
  },
  "notes": "Key context about this demo user"
}
```

#### Step 2.4: Define Objection Handling

Create 5-7 common objections with responses:

```json
[
  {
    "objection": "Common question or concern",
    "response": "Scripted response addressing the concern"
  }
]
```

---

### Phase 3: Implementation

#### Step 3.1: Create Mock Service

Create `services/{industry}-service.ts`:

```typescript
/**
 * {Industry} Service
 * Mock service for {Demo Name} demo
 */

// Define interfaces for data types
export interface PrimaryEntity {
  id: string;
  // ... fields from transcript
}

// Mock database
const MOCK_DATA: PrimaryEntity[] = [
  // 2-3 demo records
];

// Service functions matching tools
export const ServiceName = {
  functionOne(args: { /* params */ }): ReturnType {
    // Implementation with mock data
  },

  functionTwo(args: { /* params */ }): ReturnType {
    // Implementation
  }
};

export default ServiceName;
```

#### Step 3.2: Add Tool Definitions to Types

Edit `types/demo-config.ts`:

1. Add tool names to `PredefinedToolName` union type:
```typescript
export type PredefinedToolName =
  // ... existing tools
  | 'new_tool_one'
  | 'new_tool_two';
```

2. Add tool definitions to `PREDEFINED_TOOLS` object:
```typescript
new_tool_one: {
  toolName: 'new_tool_one',
  toolType: 'predefined',
  isEnabled: true,
  displayName: 'New Tool One',
  description: 'Description',
  parametersSchema: { /* schema */ },
  mockResponseDelayMs: 300
}
```

#### Step 3.3: Add Tool Handlers to Provider

Edit `providers/openai-provider.ts`:

1. Import the service:
```typescript
import { ServiceName } from '../services/{industry}-service';
```

2. Add tool definitions to `getStaticToolDefinitions()`:
```typescript
{
  type: 'function',
  name: 'new_tool_one',
  description: 'Description',
  parameters: { /* schema */ }
}
```

3. Add cases to `executeStaticFunction()`:
```typescript
case 'new_tool_one':
  return this.handleNewToolOne(args);
```

4. Add handler methods:
```typescript
private handleNewToolOne(args: ArgType): ReturnType {
  console.log('Icon Description:', args);
  return ServiceName.functionOne(args);
}
```

#### Step 3.4: Create Seed Data

Add to both `database/seed.sql` and `public/database/seed.sql`:

```sql
-- ============================================================================
-- SEED DEMO CONFIGURATION - {Demo Name}
-- {Brief description}
-- ============================================================================

-- Main demo config
INSERT INTO demo_configs (id, slug, name, description, is_active, is_default, created_at, updated_at) VALUES
('DEMO-{ID}', '{slug}', '{Name}', '{Description}', 1, 0, datetime('now'), datetime('now'));

-- Business profile
INSERT INTO demo_business_profiles (...) VALUES (...);

-- Agent config with system prompt
INSERT INTO demo_agent_configs (...) VALUES (...);

-- Scenario config
INSERT INTO demo_scenarios (...) VALUES (...);

-- Tool configurations
INSERT INTO demo_tool_configs (...) VALUES (...);

-- SMS templates
INSERT INTO demo_sms_templates (...) VALUES (...);

-- UI labels
INSERT INTO demo_ui_labels (...) VALUES (...);
```

---

### Phase 4: Quality Checklist

Before completing, verify:

```markdown
## Quality Checklist

### Service Layer
- [ ] All transcript actions have corresponding functions
- [ ] Mock data is realistic and consistent
- [ ] Functions return appropriate response formats
- [ ] Error cases are handled

### Tool Definitions
- [ ] All tools added to PredefinedToolName
- [ ] All tools have complete parameter schemas
- [ ] Required vs optional parameters are correct
- [ ] Descriptions are clear and helpful

### Provider Integration
- [ ] Service imported correctly
- [ ] Tool definitions added to getStaticToolDefinitions()
- [ ] Cases added to executeStaticFunction()
- [ ] Handler methods implemented
- [ ] Console logging for debugging

### Seed Data
- [ ] demo_configs record created
- [ ] demo_business_profiles with branding
- [ ] demo_agent_configs with full system prompt
- [ ] demo_scenarios with demo data JSON
- [ ] demo_tool_configs for all tools
- [ ] demo_sms_templates (3-4 templates)
- [ ] demo_ui_labels with themed text

### System Prompt
- [ ] Identity section complete
- [ ] Verification protocol (if applicable)
- [ ] Complete call flow
- [ ] Edge cases documented
- [ ] SMS consent protocol
- [ ] Prohibited actions listed
- [ ] Communication style guidelines

### Consistency
- [ ] IDs follow naming pattern (DEMO-{NAME}, TC-{NAME}-001, etc.)
- [ ] SQL escaping correct ('' for single quotes)
- [ ] JSON valid in all _json columns
- [ ] Both seed.sql files identical
```

---

## Example: NEMT Demo Creation

### Input
- **Transcript**: Care Car ride booking call
- **URL**: https://carecar.co
- **Direction**: Inbound

### Output Summary

| Component | Details |
|-----------|---------|
| Service | `services/nemt-service.ts` with 10 functions |
| Tools | 10 NEMT-specific tools added |
| Handlers | 10 handler methods in provider |
| Seed Data | Complete Care Car configuration |
| Agent | "Jordan" with XML/Markdown system prompt |

### Tools Created

| Tool | Purpose |
|------|---------|
| verify_member | Identity verification |
| get_member_info | Profile retrieval |
| check_ride_eligibility | Benefit status |
| search_address | Address validation |
| book_ride | Ride booking |
| get_ride_status | Status check |
| cancel_ride | Cancellation |
| update_ride | Modifications |
| add_companion | Companion management |
| check_nemt_availability | Vehicle availability |

---

## Tips & Best Practices

### System Prompt Design
1. Use XML tags for structure (`<identity>`, `<call_flow>`, etc.)
2. Use Markdown for formatting within sections
3. Include specific scripts, not just guidelines
4. Add phonetic alphabet guidance for confirmation numbers
5. Include timing guidance (pauses, pacing)

### Mock Data Design
1. Use realistic but clearly fake data (555 phone numbers)
2. Include 2-3 demo records for variety
3. Pre-populate some "existing" records for status checks
4. Include edge cases in mock data

### Tool Design
1. Match tool names to natural language ("book_ride" not "createRideReservation")
2. Keep parameters flat when possible
3. Include optional parameters for flexibility
4. Return structured responses with success/error states

### UI Labels
1. Match button text to call direction ("Simulate Inbound Call" vs "Start Outbound Call")
2. Use industry-appropriate terminology
3. Keep hero text concise and compelling

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Tool not appearing | Check tool added to all 3 locations (types, definitions, handler) |
| SQL error on seed | Check for unescaped quotes (use '') |
| Mock data not loading | Ensure service is imported in provider |
| System prompt too long | Move detailed scripts to objection_handling_json |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01 | Initial skill creation based on Care Car demo |
