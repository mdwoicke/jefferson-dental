# Jefferson Dental AI Agent - Function Reference

This document provides comprehensive documentation for all available functions that the AI agent can call, including input parameters and example outputs.

## Table of Contents

1. [Appointment Management](#appointment-management)
2. [Patient/CRM Management](#patientcrm-management)
3. [Notifications & Communications](#notifications--communications)
4. [Insurance & Eligibility](#insurance--eligibility)
5. [Clinic Information](#clinic-information)

---

## Appointment Management

### 1. check_availability

**Description**: Check available appointment slots for a specific date and time range.

**Input Parameters**:
```typescript
{
  date: string;            // YYYY-MM-DD format
  time_range: string;      // "morning" | "afternoon" | "evening"
  num_children: number;    // Number of children to schedule (1+)
}
```

**Example Input**:
```json
{
  "date": "2025-01-15",
  "time_range": "morning",
  "num_children": 2
}
```

**Example Output**:
```json
[
  {
    "time": "9:00 AM",
    "datetime": "2025-01-15T09:00:00.000Z",
    "available_chairs": 3,
    "can_accommodate": true
  },
  {
    "time": "10:30 AM",
    "datetime": "2025-01-15T10:30:00.000Z",
    "available_chairs": 2,
    "can_accommodate": true
  }
]
```

---

### 2. book_appointment

**Description**: Book a dental appointment for specified children.

**Input Parameters**:
```typescript
{
  child_names: string[];        // Names of children to schedule
  appointment_time: string;     // ISO 8601 datetime
  appointment_type: string;     // "exam" | "cleaning" | "exam_and_cleaning" | "emergency"
}
```

**Example Input**:
```json
{
  "child_names": ["Tony", "Paula"],
  "appointment_time": "2025-01-15T09:00:00.000Z",
  "appointment_type": "exam_and_cleaning"
}
```

**Example Output**:
```json
{
  "booking_id": "APT-1736966400-XY7K9M2QA",
  "status": "confirmed",
  "child_names": ["Tony", "Paula"],
  "appointment_time": "2025-01-15T09:00:00.000Z",
  "appointment_type": "exam_and_cleaning",
  "location": "Jefferson Dental - Main Street",
  "confirmation_sent": false
}
```

---

### 3. reschedule_appointment

**Description**: Reschedule an existing appointment to a new time.

**Input Parameters**:
```typescript
{
  booking_id: string;            // The booking ID to reschedule
  new_appointment_time: string;  // New ISO 8601 datetime
  reason?: string;               // Optional reason for rescheduling
}
```

**Example Input**:
```json
{
  "booking_id": "APT-1736966400-XY7K9M2QA",
  "new_appointment_time": "2025-01-16T14:00:00.000Z",
  "reason": "Parent schedule conflict"
}
```

**Example Output**:
```json
{
  "success": true,
  "booking_id": "APT-1736966400-XY7K9M2QA",
  "old_time": "2025-01-15T09:00:00.000Z",
  "new_time": "2025-01-16T14:00:00.000Z",
  "message": "Appointment successfully rescheduled"
}
```

---

### 4. cancel_appointment

**Description**: Cancel an existing appointment.

**Input Parameters**:
```typescript
{
  booking_id: string;    // The booking ID to cancel
  reason: string;        // Reason for cancellation
}
```

**Example Input**:
```json
{
  "booking_id": "APT-1736966400-XY7K9M2QA",
  "reason": "Child is sick"
}
```

**Example Output**:
```json
{
  "success": true,
  "message": "Appointment cancelled successfully"
}
```

---

### 5. get_appointment_history

**Description**: Get appointment history for the current patient.

**Input Parameters**: None (uses current patient context)

**Example Input**:
```json
{}
```

**Example Output**:
```json
[
  {
    "booking_id": "APT-1735766400-ABC123XYZ",
    "appointment_time": "2024-12-10T09:00:00.000Z",
    "appointment_type": "exam_and_cleaning",
    "status": "completed",
    "location": "Jefferson Dental - Main Street",
    "child_names": ["Tony", "Paula"]
  },
  {
    "booking_id": "APT-1734556800-DEF456UVW",
    "appointment_time": "2024-11-15T14:00:00.000Z",
    "appointment_type": "cleaning",
    "status": "completed",
    "location": "Jefferson Dental - Main Street",
    "child_names": ["Tony"]
  }
]
```

---

### 6. add_appointment_notes

**Description**: Add notes to an existing appointment (e.g., special needs, preferences).

**Input Parameters**:
```typescript
{
  booking_id: string;    // The booking ID
  notes: string;         // Notes to add
}
```

**Example Input**:
```json
{
  "booking_id": "APT-1736966400-XY7K9M2QA",
  "notes": "Child has sensory sensitivity - please use quiet tools"
}
```

**Example Output**:
```json
{
  "success": true,
  "message": "Notes successfully added to appointment"
}
```

---

## Patient/CRM Management

### 7. get_patient_info

**Description**: Retrieve patient information from CRM by phone number.

**Input Parameters**:
```typescript
{
  phone_number: string;    // Patient phone number
}
```

**Example Input**:
```json
{
  "phone_number": "+15125550123"
}
```

**Example Output**:
```json
{
  "id": "PAT-1234567890-ABC123XYZ",
  "phoneNumber": "+15125550123",
  "parentName": "Maria Rodriguez",
  "address": {
    "street": "456 Oak Avenue",
    "city": "Austin",
    "state": "TX",
    "zip": "78701"
  },
  "preferredLanguage": "Spanish",
  "children": [
    {
      "id": 1,
      "name": "Tony",
      "age": 9,
      "medicaid_id": "MCD-TX-987654321",
      "date_of_birth": "2016-03-15",
      "special_needs": null
    },
    {
      "id": 2,
      "name": "Paula",
      "age": 7,
      "medicaid_id": "MCD-TX-987654322",
      "date_of_birth": "2018-06-22",
      "special_needs": "Autism spectrum - needs extra time"
    }
  ],
  "lastVisit": "2024-12-10",
  "notes": "Prefers morning appointments"
}
```

---

## Notifications & Communications

### 8. send_confirmation_sms

**Description**: Send SMS confirmation after booking appointment.

**Input Parameters**:
```typescript
{
  phone_number: string;          // Recipient phone number
  appointment_details: string;   // Appointment details for SMS
}
```

**Example Input**:
```json
{
  "phone_number": "+15125550123",
  "appointment_details": "Jefferson Dental appointment for Tony and Paula on Wednesday, January 15 at 9:00 AM. Location: 123 Main Street. Call 512-555-0100 to reschedule."
}
```

**Example Output**:
```json
{
  "sent": true,
  "message_sid": "SM1736966400ABC123XYZ456789DEF"
}
```

---

### 9. send_appointment_reminder

**Description**: Send an SMS reminder for an upcoming appointment.

**Input Parameters**:
```typescript
{
  phone_number: string;        // Recipient phone number
  patient_name: string;        // Parent/guardian name
  child_name: string;          // Child name
  appointment_time: string;    // ISO 8601 datetime
  location: string;            // Clinic location
}
```

**Example Input**:
```json
{
  "phone_number": "+15125550123",
  "patient_name": "Maria",
  "child_name": "Tony",
  "appointment_time": "2025-01-15T09:00:00.000Z",
  "location": "Jefferson Dental - Main Street"
}
```

**Example Output**:
```json
{
  "sent": true,
  "message_sid": "SM1736966400REMINDER123456789"
}
```

**SMS Message Content** (generated automatically):
```
Hi Maria! This is a reminder that Tony has a dental appointment at Jefferson Dental on Wednesday, January 15, 2025 at 9:00 AM. Location: Jefferson Dental - Main Street. Reply CONFIRM to confirm or call 512-555-0100 to reschedule.
```

---

### 10. send_cancellation_notification

**Description**: Send SMS notification when an appointment is cancelled.

**Input Parameters**:
```typescript
{
  phone_number: string;      // Recipient phone number
  patient_name: string;      // Parent/guardian name
  child_name: string;        // Child name
  cancelled_time: string;    // ISO 8601 datetime of cancelled appointment
}
```

**Example Input**:
```json
{
  "phone_number": "+15125550123",
  "patient_name": "Maria",
  "child_name": "Tony",
  "cancelled_time": "2025-01-15T09:00:00.000Z"
}
```

**Example Output**:
```json
{
  "sent": true,
  "message_sid": "SM1736966400CANCEL123456789"
}
```

**SMS Message Content**:
```
Hi Maria, your appointment for Tony on Wednesday, January 15, 2025 at 9:00 AM has been cancelled. Call us at 512-555-0100 to reschedule. - Jefferson Dental
```

---

### 11. send_follow_up_survey

**Description**: Send a follow-up satisfaction survey after an appointment.

**Input Parameters**:
```typescript
{
  phone_number: string;      // Recipient phone number
  patient_name: string;      // Parent/guardian name
  appointment_id: string;    // Appointment booking ID
}
```

**Example Input**:
```json
{
  "phone_number": "+15125550123",
  "patient_name": "Maria",
  "appointment_id": "APT-1736966400-XY7K9M2QA"
}
```

**Example Output**:
```json
{
  "sent": true,
  "message_sid": "SM1736966400SURVEY123456789",
  "survey_link": "https://jefferson-dental.com/survey/APT-1736966400-XY7K9M2QA"
}
```

---

## Insurance & Eligibility

### 12. check_insurance_eligibility

**Description**: Verify Medicaid insurance eligibility for a child.

**Input Parameters**:
```typescript
{
  medicaid_id: string;        // Child Medicaid ID number
  child_name: string;         // Child name
  date_of_birth?: string;     // Child DOB (YYYY-MM-DD), optional
}
```

**Example Input**:
```json
{
  "medicaid_id": "MCD-TX-987654321",
  "child_name": "Tony",
  "date_of_birth": "2016-03-15"
}
```

**Example Output (Eligible)**:
```json
{
  "eligible": true,
  "coverage_type": "CHIP / STAR Kids",
  "effective_date": "2024-06-15",
  "termination_date": "2026-01-15",
  "copay_amount": 0,
  "message": "Tony is covered under Texas CHIP/STAR Kids. All preventive dental services are fully covered with no copay."
}
```

**Example Output (Not Eligible)**:
```json
{
  "eligible": false,
  "coverage_type": "None",
  "copay_amount": 0,
  "message": "Unable to verify active Medicaid coverage for Tony. Please contact Texas Medicaid at 1-800-964-2777 to verify eligibility."
}
```

---

## Clinic Information

### 13. get_clinic_hours

**Description**: Get clinic operating hours.

**Input Parameters**:
```typescript
{
  date?: string;    // Optional specific date (YYYY-MM-DD)
}
```

**Example Input**:
```json
{
  "date": "2025-01-15"
}
```

**Example Output**:
```json
{
  "location": "Jefferson Dental - Main Street",
  "hours": [
    { "day": "Monday", "open": "8:00 AM", "close": "5:00 PM", "isOpen": true },
    { "day": "Tuesday", "open": "8:00 AM", "close": "5:00 PM", "isOpen": true },
    { "day": "Wednesday", "open": "8:00 AM", "close": "7:00 PM", "isOpen": true },
    { "day": "Thursday", "open": "8:00 AM", "close": "5:00 PM", "isOpen": true },
    { "day": "Friday", "open": "8:00 AM", "close": "5:00 PM", "isOpen": true },
    { "day": "Saturday", "open": "9:00 AM", "close": "1:00 PM", "isOpen": true },
    { "day": "Sunday", "open": "Closed", "close": "Closed", "isOpen": false }
  ],
  "special_notes": "We offer extended hours on Wednesdays until 7 PM for your convenience."
}
```

---

### 14. get_directions

**Description**: Get directions and address information for the clinic.

**Input Parameters**:
```typescript
{
  from_address?: string;    // Optional starting address for directions
}
```

**Example Input**:
```json
{
  "from_address": "1234 Elm Street, Austin, TX"
}
```

**Example Output**:
```json
{
  "clinic_address": "123 Main Street",
  "full_address": "123 Main Street, Austin, TX 78701",
  "phone": "512-555-0100",
  "directions_url": "https://www.google.com/maps/dir/1234+Elm+Street,+Austin,+TX/123+Main+Street,+Austin,+TX+78701",
  "parking_info": "Free parking available in the lot behind our building. Street parking also available on Main Street.",
  "public_transit": "Bus routes 7, 20, and 801 stop within 2 blocks. MetroRail Red Line: Downtown Station (0.4 miles)"
}
```

---

### 15. get_available_services

**Description**: Get list of available dental services and their coverage status.

**Input Parameters**: None

**Example Input**:
```json
{}
```

**Example Output**:
```json
{
  "services": [
    {
      "service_name": "Comprehensive Dental Exam",
      "description": "Complete oral health evaluation including cavity check, gum health assessment, and oral cancer screening",
      "duration_minutes": 45,
      "covered_by_medicaid": true
    },
    {
      "service_name": "Dental Cleaning (Prophylaxis)",
      "description": "Professional teeth cleaning to remove plaque and tartar buildup",
      "duration_minutes": 45,
      "covered_by_medicaid": true
    },
    {
      "service_name": "Cavity Fillings",
      "description": "Treatment of tooth decay with composite (tooth-colored) fillings",
      "duration_minutes": 60,
      "covered_by_medicaid": true
    },
    {
      "service_name": "Root Canal Therapy",
      "description": "Treatment of infected tooth pulp to save the tooth",
      "duration_minutes": 90,
      "covered_by_medicaid": true,
      "typical_cost_without_insurance": 800
    },
    {
      "service_name": "Emergency Dental Care",
      "description": "Same-day treatment for dental emergencies like severe pain or trauma",
      "duration_minutes": 60,
      "covered_by_medicaid": true
    }
  ],
  "medicaid_coverage_note": "All listed services are covered under Texas Medicaid (CHIP/STAR Kids) for eligible children. No copay required for preventive services."
}
```

---

### 16. get_appointment_preparation

**Description**: Get information about what to bring and how to prepare for an appointment.

**Input Parameters**: None

**Example Input**:
```json
{}
```

**Example Output**:
```json
{
  "required_documents": [
    "Child's Medicaid card (CHIP/STAR Kids)",
    "Parent/Guardian photo ID (driver's license or state ID)",
    "Proof of address (utility bill, lease agreement, or mail within last 30 days)"
  ],
  "recommended_items": [
    "List of current medications child is taking",
    "Previous dental records (if transferring from another dentist)",
    "Child's favorite toy or comfort item",
    "Snack and water for after the appointment"
  ],
  "preparation_tips": [
    "Arrive 10 minutes early to complete any necessary paperwork",
    "Brush your child's teeth before the appointment",
    "Talk positively about the dentist to help reduce anxiety",
    "For young children, read a book about visiting the dentist beforehand",
    "Let us know about any special needs or behavioral considerations"
  ]
}
```

---

## Function Summary Table

| Function Name | Category | Purpose | Mock Response |
|--------------|----------|---------|---------------|
| `check_availability` | Appointments | Find available time slots | ✅ Yes |
| `book_appointment` | Appointments | Book new appointment | ✅ Yes |
| `reschedule_appointment` | Appointments | Change appointment time | ✅ Yes |
| `cancel_appointment` | Appointments | Cancel appointment | ✅ Yes |
| `get_appointment_history` | Appointments | View past appointments | ✅ Yes |
| `add_appointment_notes` | Appointments | Add special instructions | ✅ Yes |
| `get_patient_info` | CRM | Retrieve patient details | ✅ Yes |
| `send_confirmation_sms` | Notifications | Confirm booking via SMS | ✅ Yes (Mock) |
| `send_appointment_reminder` | Notifications | Send reminder SMS | ✅ Yes (Mock) |
| `send_cancellation_notification` | Notifications | Notify cancellation | ✅ Yes (Mock) |
| `send_follow_up_survey` | Notifications | Request feedback | ✅ Yes (Mock) |
| `check_insurance_eligibility` | Insurance | Verify Medicaid coverage | ✅ Yes (Mock 90% eligible) |
| `get_clinic_hours` | Clinic Info | Operating hours | ✅ Yes |
| `get_directions` | Clinic Info | Directions and parking | ✅ Yes |
| `get_available_services` | Clinic Info | List dental services | ✅ Yes |
| `get_appointment_preparation` | Clinic Info | What to bring | ✅ Yes |

---

## Implementation Notes

### Mock vs Real Functions

- **Database-backed**: `check_availability`, `book_appointment`, `reschedule_appointment`, `cancel_appointment`, `get_appointment_history`, `add_appointment_notes`, `get_patient_info`
- **Mock (Simulated)**: `send_confirmation_sms`, `send_appointment_reminder`, `send_cancellation_notification`, `send_follow_up_survey`, `check_insurance_eligibility` (includes realistic delays and 90% success rate)
- **Static Data**: `get_clinic_hours`, `get_directions`, `get_available_services`, `get_appointment_preparation`

### Error Handling

All functions include proper error handling and will throw descriptive errors when:
- Required parameters are missing
- Patient context is not set (when required)
- Database operations fail
- Invalid data is provided

### Logging

All functions log their operations to the console with emoji-prefixed messages:
- 📅 Appointment operations
- 👤 Patient/CRM operations
- 📱 SMS/notification operations
- 🏥 Insurance operations
- 🕐 Clinic information requests

---

*Last Updated: 2025-01-15*
