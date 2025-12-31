# Book Appointment

Book a dental appointment for specified children. Only call after user confirms.

## Metadata

- **Name**: book_appointment
- **Version**: 1.0.0
- **Category**: appointment
- **Requires Patient Context**: true

## Parameters

### child_names

- **Type**: array
- **Required**: true
- **Description**: Names of children to schedule
- **Items**:
  - **Type**: string
  - **Description**: Child name

### appointment_time

- **Type**: string
- **Required**: true
- **Description**: ISO 8601 datetime for appointment

### appointment_type

- **Type**: string
- **Required**: true
- **Description**: Type of appointment
- **Enum**: exam, cleaning, exam_and_cleaning, emergency

## Returns

- **Type**: object
- **Description**: Booking confirmation with appointment details
