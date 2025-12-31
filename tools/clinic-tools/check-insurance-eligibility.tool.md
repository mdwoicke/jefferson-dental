# Check Insurance Eligibility

Verify Medicaid insurance eligibility for a child.

## Metadata

- **Name**: check_insurance_eligibility
- **Version**: 1.0.0
- **Category**: clinic
- **Requires Patient Context**: false

## Parameters

### medicaid_id

- **Type**: string
- **Required**: true
- **Description**: Child Medicaid ID number

### child_name

- **Type**: string
- **Required**: true
- **Description**: Child name

### date_of_birth

- **Type**: string
- **Required**: false
- **Description**: Child date of birth (YYYY-MM-DD)

## Returns

- **Type**: object
- **Description**: Insurance eligibility status with coverage details and active status
