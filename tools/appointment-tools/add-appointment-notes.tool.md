# Add Appointment Notes

Add notes to an existing appointment (e.g., special needs, preferences).

## Metadata

- **Name**: add_appointment_notes
- **Version**: 1.0.0
- **Category**: appointment
- **Requires Patient Context**: true

## Parameters

### booking_id

- **Type**: string
- **Required**: true
- **Description**: The booking ID of the appointment

### notes

- **Type**: string
- **Required**: true
- **Description**: Notes to add to the appointment

## Returns

- **Type**: object
- **Description**: Confirmation of notes added with updated appointment details
