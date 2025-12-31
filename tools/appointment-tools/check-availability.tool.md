# Check Availability

Check available appointment slots for a specific date and time range. Use when the user asks about available times.

## Metadata

- **Name**: check_availability
- **Version**: 1.0.0
- **Category**: appointment
- **Requires Patient Context**: false

## Parameters

### date

- **Type**: string
- **Required**: true
- **Description**: The date to check availability (YYYY-MM-DD format)

### time_range

- **Type**: string
- **Required**: true
- **Description**: Preferred time of day
- **Enum**: morning, afternoon, evening

### num_children

- **Type**: number
- **Required**: true
- **Description**: Number of children to schedule

## Returns

- **Type**: array
- **Description**: Array of available time slots with datetime and time information
