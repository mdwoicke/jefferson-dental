# SMS Auto-Send Issue - Root Cause Analysis

## Problem Summary
The AI agent is sending SMS confirmations **without obtaining explicit user consent**, despite multiple prompt instructions telling it not to.

## Latest Call Evidence (Dec 22, 2025 - 20:50-20:51 UTC)

From `skill_execution_logs`:

```
1. log_conversation_start - SUCCESS
2. check_availability - SUCCESS
3. book_appointment - SUCCESS (sms_sent: false)
4. send_confirmation_sms - FAILURE (20:51:43)
5. send_confirmation_sms - SUCCESS (20:51:59) - test_mode: true
```

**Key Observation**: The AI called `send_confirmation_sms` directly (twice!) after booking, without waiting for user consent.

---

## Root Causes - Three Auto-Send Pathways

### 🔴 **PATHWAY 1: The `schedule_appointment` Skill (Auto-SMS Built-In)**

**Location**: `backend/src/skills/scheduling/schedule-appointment-skill.ts:169-189`

```typescript
// STEP 4: Send Confirmation SMS (ALWAYS RUNS)
const smsStep = await this.invokeTool(
  'Send SMS confirmation',
  'send_confirmation_sms',
  {
    phone_number: args.phone_number,
    appointment_details: appointmentDetails,
    booking_id: result.booking_id
  }
);
```

**The Problem**:
- This skill has **hardcoded SMS sending** as step 4
- NO consent checking whatsoever
- It's registered as a tool in OpenAI with this description:

```typescript
// backend/src/ai/openai-client.ts:272-273
name: 'schedule_appointment',
description: 'Multi-step skill that orchestrates the complete appointment scheduling workflow. Use this when the parent is ready to schedule an appointment. This skill will: (1) check availability, (2) book the appointment, (3) send SMS confirmation.'
```

**The Contradiction**:
- The prompt says: `**DO NOT use the schedule_appointment skill**` (prompt-builder.ts:148)
- But the tool description encourages use: `"Use this when the parent is ready to schedule"`

**Why Prompt Doesn't Work**:
OpenAI's function calling prioritizes tool descriptions over system instructions. The AI sees a convenient workflow tool and uses it, ignoring the buried "don't use this" instruction.

---

### 🔴 **PATHWAY 2: Auto-Send in `book_appointment` Function**

**Location**: `backend/src/ai/openai-client.ts:1242-1273`

```typescript
// Auto-send SMS confirmation if configured for auto or hybrid mode
if (result.status === 'confirmed' &&
    (config.sms.mode === 'auto' || config.sms.mode === 'hybrid')) {

  console.log(`📱 Auto-sending SMS confirmation (mode: ${config.sms.mode})`);

  const smsResult = await this.notificationService!.sendConfirmationSMS({
    phone_number: this.phoneNumber!,
    appointment_details: this.formatConfirmationDetails(result),
    booking_id: result.booking_id
  });
  // ... marks sms_sent = true
}
```

**Current Configuration**: `.env` file shows:
```
SMS_CONFIRMATION_MODE=hybrid
```

**The Problem**:
Even when calling individual functions (check_availability → book_appointment), the `book_appointment` handler itself auto-sends SMS when in 'hybrid' or 'auto' mode, **completely bypassing the consent protocol**.

**Why This is Broken**:
The prompt says "ask for consent" but the code says "auto-send in hybrid mode". The code wins.

---

### 🔴 **PATHWAY 3: Direct `send_confirmation_sms` Call Without Consent**

**What Happened in Last Call**:
The AI called `send_confirmation_sms` directly **twice** after booking:
1. First attempt failed (20:51:43)
2. Second attempt succeeded (20:51:59)

**The Problem**:
The AI is interpreting "verbally confirm appointment details and OFFER to send SMS" as "send SMS immediately after booking".

**Why Prompt Isn't Working**:
The prompt has this instruction:

```
ALWAYS ask first: "Would you like me to send you a text message confirmation?"
WAIT for the parent's response
ONLY call send_confirmation_sms() if they explicitly say "yes"
```

But the `send_confirmation_sms` tool description says nothing about consent:

```typescript
// openai-client.ts:379-380
name: 'send_confirmation_sms',
description: 'Send SMS confirmation after booking appointment'
```

The tool description doesn't encode the consent requirement, so the AI treats it as a normal post-booking action.

---

## Why Changing the Prompt Hasn't Fixed It

### ❌ **Problem 1: Tool Descriptions Override System Instructions**

OpenAI's function calling gives **higher weight** to:
1. Tool/function descriptions (part of the tools schema)
2. Tool/function availability (if tool exists, AI assumes it should use it)

Lower weight to:
3. System instructions buried in long prompts

### ❌ **Problem 2: Configuration Contradicts Prompt**

```
Prompt says: "Ask for consent before SMS"
Config says: SMS_CONFIRMATION_MODE=hybrid (auto-send)
Code behavior: Auto-sends SMS after booking
```

The prompt cannot override code execution.

### ❌ **Problem 3: Multiple Tools for Same Task**

The AI has **three ways** to schedule + send SMS:
1. `schedule_appointment` skill (one-shot, auto-SMS)
2. Individual functions (check → book → SMS) with auto-send in 'hybrid' mode
3. Individual functions with manual SMS call

This creates confusion about which workflow to use.

---

## The Fix - Complete Solution

### ✅ **Step 1: Fix Configuration (Immediate)**

Change `.env`:
```bash
# Change from:
SMS_CONFIRMATION_MODE=hybrid

# Change to:
SMS_CONFIRMATION_MODE=ask
```

This disables auto-send in the `book_appointment` handler.

### ✅ **Step 2: Remove or Fix the `schedule_appointment` Skill**

**Option A - Remove from Tools (Recommended)**:

In `backend/src/ai/openai-client.ts:250-312`, **delete** or **comment out** the entire `schedule_appointment` tool registration:

```typescript
// REMOVE THIS ENTIRE BLOCK:
{
  type: 'function',
  name: 'schedule_appointment',
  description: '...',
  parameters: { ... }
},
```

**Option B - Add Consent Parameter**:

Modify the skill to accept a `user_consented_to_sms: boolean` parameter and only send SMS if true. This requires:
1. Adding parameter to skill
2. Conditional SMS sending in skill execution
3. Updating tool description to explain consent requirement

**Recommendation**: Option A (remove) is cleaner. The individual functions already provide the necessary workflow.

### ✅ **Step 3: Update `send_confirmation_sms` Tool Description**

In `backend/src/ai/openai-client.ts:379-395`, change the description to **encode the consent requirement**:

```typescript
{
  type: 'function',
  name: 'send_confirmation_sms',
  description: 'Send SMS confirmation ONLY after explicit user consent. CRITICAL: You must ask the parent "Would you like me to text you a confirmation?" and wait for them to say "yes" before calling this function. Never call this automatically.',
  parameters: { ... }
}
```

### ✅ **Step 4: Strengthen Prompt Instructions**

In `backend/src/utils/prompt-builder.ts:16-24`, move the SMS consent instructions to the **top** of the prompt and make them more prominent:

```typescript
🚨 CRITICAL RULE - SMS CONSENT PROTOCOL:
- NEVER send SMS without explicit verbal permission
- After booking, you MUST ask: "Would you like me to text you a confirmation with the appointment details?"
- WAIT for response ("yes", "sure", "that would be great")
- ONLY if they agree, call send_confirmation_sms()
- If they decline or don't respond clearly, DO NOT send SMS
- Rejection is acceptable - just confirm verbally instead
```

Place this at the **very top** of the system instruction, before the call script.

### ✅ **Step 5: Test the Fix**

After making changes:

1. Restart backend server
2. Make test call
3. When AI books appointment, it should ask: "Would you like me to text you a confirmation?"
4. Test both paths:
   - Say "yes" → SMS should be sent
   - Say "no" → No SMS, verbal confirmation only
5. Check skill_execution_logs to verify no auto-send

---

## Implementation Priority

**High Priority (Do First)**:
1. ✅ Change `.env`: `SMS_CONFIRMATION_MODE=ask`
2. ✅ Remove `schedule_appointment` from tools array
3. ✅ Update `send_confirmation_sms` tool description

**Medium Priority**:
4. ✅ Move SMS consent protocol to top of prompt
5. Test and verify behavior

**Low Priority** (Optional Enhancement):
6. Add logging when SMS consent is requested vs granted
7. Add analytics to track consent rate

---

## Expected Behavior After Fix

### ✅ Correct Flow (SMS Mode: 'ask')

```
AI: "Great! I have Sophie and Maliki scheduled for Monday at 3:30 PM.
     Would you like me to text you a confirmation with the appointment details?"

User: "Yes, please."

AI: [calls send_confirmation_sms()]
    "Perfect! I've just sent you a text message with all the details."
```

### ✅ Correct Flow (User Declines)

```
AI: "Would you like me to text you a confirmation?"

User: "No, that's okay."

AI: [does NOT call send_confirmation_sms()]
    "No problem. Just to confirm verbally: you're all set for Monday,
     December 23rd at 3:30 PM at our Main Street location. The
     appointment is for both Sophie and Maliki."
```

---

## Summary

**The Problem**: Three auto-send pathways bypass consent
**Why Prompt Doesn't Work**: Tool descriptions + config override instructions
**The Fix**:
1. Config: `SMS_CONFIRMATION_MODE=ask`
2. Remove `schedule_appointment` tool
3. Strengthen tool descriptions
4. Move consent protocol to top of prompt

**Estimated Fix Time**: 15 minutes
**Testing Time**: 5 minutes per test call
