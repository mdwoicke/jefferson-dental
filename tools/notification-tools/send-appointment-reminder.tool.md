# Send Appointment Reminder

Send an SMS reminder for an upcoming appointment.

## Metadata

- **Name**: send_appointment_reminder
- **Version**: 1.0.0
- **Category**: notification
- **Requires Patient Context**: false

## Parameters

### phone_number

- **Type**: string
- **Required**: true
- **Description**: Recipient phone number

### patient_name

- **Type**: string
- **Required**: true
- **Description**: Parent/guardian name

### child_name

- **Type**: string
- **Required**: true
- **Description**: Child name

### appointment_time

- **Type**: string
- **Required**: true
- **Description**: ISO 8601 datetime of appointment

### location

- **Type**: string
- **Required**: true
- **Description**: Clinic location

## Returns

- **Type**: object
- **Description**: SMS delivery confirmation with status and message ID
