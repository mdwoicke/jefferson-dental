# Cancel Appointment

Cancel an existing appointment.

## Metadata

- **Name**: cancel_appointment
- **Version**: 1.0.0
- **Category**: appointment
- **Requires Patient Context**: true

## Parameters

### booking_id

- **Type**: string
- **Required**: true
- **Description**: The booking ID of the appointment to cancel

### reason

- **Type**: string
- **Required**: true
- **Description**: Reason for cancellation

## Returns

- **Type**: object
- **Description**: Cancellation confirmation with success status and message
