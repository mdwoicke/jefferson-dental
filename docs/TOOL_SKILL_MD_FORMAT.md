# Tool and Skill Markdown Format Specification

This document defines the markdown format for tool and skill definitions in the Jefferson Dental AI Voice Agent system.

## Tool Markdown Format

Tools should be defined in a `.tool.md` file with the following structure:

```markdown
# Tool Name

Brief description of what the tool does.

## Metadata

- **Name**: tool_name
- **Version**: 1.0.0
- **Category**: appointment | patient | notification | clinic | external
- **Requires Auth**: true | false (optional, default: false)
- **Requires Patient Context**: true | false (optional, default: false)

## Parameters

### parameter_name

- **Type**: string | number | boolean | object | array
- **Required**: true | false
- **Description**: Description of the parameter
- **Enum**: value1, value2, value3 (optional, for restricted values)
- **Items**: (for array types)
  - **Type**: string | number | boolean | object
  - **Description**: Description of array items

## Returns

- **Type**: object | array | string | number | boolean
- **Description**: Description of what the tool returns
```

### Example Tool Definition

```markdown
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
```

## Skill Markdown Format

Skills should be defined in a `.skill.md` file with the following structure:

```markdown
# Skill Name

Brief description of what the skill does and its workflow.

## Metadata

- **Name**: skill_name
- **Version**: 1.0.0
- **Category**: scheduling | patient_management | communication | etc
- **Required Tools**: tool1, tool2, tool3
- **Required Skills**: other_skill1, other_skill2 (optional)

## Workflow

Description of the skill's execution workflow, including:

1. Step 1 description
2. Step 2 description
3. Step 3 description
...

## Input Schema

Description of the input object structure:

### field_name

- **Type**: string | number | boolean | object
- **Required**: true | false
- **Description**: Description of the input field

## Output Schema

Description of the output/result structure:

- **Type**: object (SkillResult)
- **Success**: boolean - Whether the skill execution succeeded
- **Message**: string - Human-readable status message
- **Data**: object - Result data (structure varies by skill)
- **Error**: string - Error message (if failed)
```

### Example Skill Definition

```markdown
# Schedule Appointment

Complete workflow for scheduling an appointment with availability check and confirmation.

## Metadata

- **Name**: schedule_appointment
- **Version**: 1.0.0
- **Category**: scheduling
- **Required Tools**: check_availability, book_appointment, send_confirmation_sms

## Workflow

This skill orchestrates a complete appointment scheduling workflow:

1. Check availability for the requested date and time range
2. Select the best available time slot
3. Book the appointment in the system
4. Send SMS confirmation to the patient's parent

If no slots are available, the skill suggests alternative dates.

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
- **Description**: Preferred time of day (morning, afternoon, evening)

### numChildren

- **Type**: number
- **Required**: true
- **Description**: Number of children to schedule

### parentPhone

- **Type**: string
- **Required**: true
- **Description**: Parent's phone number for confirmation SMS

## Output Schema

- **Type**: object (SkillResult)
- **Success**: boolean - True if appointment was scheduled successfully
- **Message**: string - Status message
- **Data**: object - Contains appointmentId, datetime, time, and childNames
- **Error**: string - Error message if scheduling failed
```

## Parser Requirements

The markdown parser must:

1. Parse the markdown file and extract structured data
2. Handle optional fields with sensible defaults
3. Validate that required sections are present
4. Convert string values to appropriate types (boolean, array, etc.)
5. Handle nested structures (like array items)
6. Preserve the description (first paragraph after title)
7. Be resilient to formatting variations (extra whitespace, different markdown styles)

## File Naming Convention

- Tools: `{tool-name}.tool.md` (e.g., `book-appointment.tool.md`)
- Skills: `{skill-name}.skill.md` (e.g., `schedule-appointment.skill.md`)
- Place `.md` files in the same directory as their corresponding `.ts` implementation
