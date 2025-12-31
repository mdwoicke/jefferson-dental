# Send Confirmation SMS

Send SMS confirmation after booking appointment.

## Metadata

- **Name**: send_confirmation_sms
- **Version**: 1.0.0
- **Category**: notification
- **Requires Patient Context**: false

## Parameters

### phone_number

- **Type**: string
- **Required**: true
- **Description**: Recipient phone number

### appointment_details

- **Type**: string
- **Required**: true
- **Description**: Appointment details for SMS

## Returns

- **Type**: object
- **Description**: SMS delivery confirmation with status and message ID
