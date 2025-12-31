# Schedule Appointment Skill

---
name: schedule_appointment
version: 1.0.0
category: scheduling
description: Multi-step workflow to schedule dental appointments for children
required_tools: [check_availability, book_appointment, send_confirmation_sms]
verification_message: MD-FILE-LOADED-SUCCESSFULLY-v1.0.0
---

## Overview

This skill orchestrates the complete appointment scheduling workflow for Jefferson Dental Clinics.
It handles checking availability, booking appointments, and sending SMS confirmations.

## Workflow Steps

1. **Check Availability** - Query available time slots based on date, time range, and number of children
2. **Select Slot** - Process user's selection of a specific time slot
3. **Book Appointment** - Create the appointment booking in the system
4. **Send Confirmation** - Send SMS confirmation to the parent/guardian

## Required Tools

- `check_availability` - Check available appointment slots
- `book_appointment` - Book a dental appointment
- `send_confirmation_sms` - Send SMS confirmation

## Input Parameters

```typescript
{
  date: string;              // YYYY-MM-DD format
  time_range: 'morning' | 'afternoon' | 'evening';
  num_children: number;      // Number of children to schedule
  child_names: string[];     // Names of children
  appointment_type: 'exam' | 'cleaning' | 'exam_and_cleaning' | 'emergency';
  phone_number: string;      // For SMS confirmation
}
```

## Output

```typescript
{
  success: boolean;
  booking_id?: string;
  appointment_time?: string;
  confirmation_sent?: boolean;
  sms_sid?: string;
  error?: string;
  steps_completed: number;
}
```

## Error Handling

- If availability check fails, return error immediately
- If booking fails, do not send SMS
- Log all steps to skill_execution_logs regardless of outcome

## Usage Example

```typescript
const skill = new ScheduleAppointmentSkill(metadata, dbAdapter, toolRegistry, context);
const result = await skill.execute({
  date: '2025-12-25',
  time_range: 'morning',
  num_children: 2,
  child_names: ['Tony', 'Paula'],
  appointment_type: 'exam_and_cleaning',
  phone_number: '+15551234567'
});
```
