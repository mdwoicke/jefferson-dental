# Reschedule Appointment

Reschedule an existing appointment to a new time.

## Metadata

- **Name**: reschedule_appointment
- **Version**: 1.0.0
- **Category**: appointment
- **Requires Patient Context**: true

## Parameters

### booking_id

- **Type**: string
- **Required**: true
- **Description**: The booking ID of the appointment to reschedule

### new_appointment_time

- **Type**: string
- **Required**: true
- **Description**: New ISO 8601 datetime for the appointment

### reason

- **Type**: string
- **Required**: false
- **Description**: Optional reason for rescheduling

## Returns

- **Type**: object
- **Description**: Rescheduling confirmation with updated appointment details
