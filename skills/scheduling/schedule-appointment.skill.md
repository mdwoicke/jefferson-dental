# Schedule Appointment

Complete workflow for scheduling an appointment with availability check and confirmation.

## Metadata

- **Name**: schedule_appointment
- **Version**: 1.0.0
- **Category**: scheduling
- **Required Tools**: check_availability, book_appointment, send_confirmation_sms

## Workflow

This skill orchestrates a complete appointment scheduling workflow:

1. **Check Availability**: Check for available appointment slots on the requested date and time range
2. **Select Best Slot**: Choose the first available time slot (best fit)
3. **Book Appointment**: Create the appointment booking in the system for the specified children
4. **Send Confirmation**: Send SMS confirmation to the parent's phone number with appointment details

If no slots are available for the requested date/time, the skill suggests up to 3 alternative dates within the next 7 days that have availability.

## Input Schema

### patientId

- **Type**: string
- **Required**: true
- **Description**: Unique identifier for the patient

### date

- **Type**: string
- **Required**: true
- **Description**: Requested appointment date (YYYY-MM-DD format)

### timeRange

- **Type**: string
- **Required**: true
- **Description**: Preferred time of day (morning, afternoon, or evening)

### numChildren

- **Type**: number
- **Required**: true
- **Description**: Number of children to schedule for the appointment

### parentPhone

- **Type**: string
- **Required**: true
- **Description**: Parent's phone number for SMS confirmation

## Output Schema

- **Type**: object (SkillResult)
- **Success**: boolean - True if appointment was scheduled successfully, false if scheduling failed
- **Message**: string - Human-readable status message describing the outcome
- **Data**: object - Contains appointmentId, datetime, time, and childNames if successful; contains suggestedDates if no availability found
- **Error**: string - Error message if scheduling failed due to an exception
