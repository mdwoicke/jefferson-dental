/**
 * Validation utilities for form inputs
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate phone number (US format)
 * Accepts: (123) 456-7890, 123-456-7890, 1234567890, +11234567890
 */
export const validatePhoneNumber = (phone: string): ValidationResult => {
  if (!phone || phone.trim() === '') {
    return { isValid: false, error: 'Phone number is required' };
  }

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Should have 10 digits (or 11 if starts with 1)
  if (digits.length === 10) {
    return { isValid: true };
  }

  if (digits.length === 11 && digits[0] === '1') {
    return { isValid: true };
  }

  return {
    isValid: false,
    error: 'Phone number must be 10 digits (e.g., 512-555-0100)',
  };
};

/**
 * Validate ZIP code (US format)
 * Accepts: 12345 or 12345-6789
 */
export const validateZipCode = (zip: string): ValidationResult => {
  if (!zip || zip.trim() === '') {
    return { isValid: false, error: 'ZIP code is required' };
  }

  const zipPattern = /^\d{5}(-\d{4})?$/;

  if (zipPattern.test(zip.trim())) {
    return { isValid: true };
  }

  return {
    isValid: false,
    error: 'ZIP code must be 5 digits (e.g., 78701) or 9 digits (e.g., 78701-1234)',
  };
};

/**
 * Validate required text field
 */
export const validateRequired = (value: string, fieldName: string): ValidationResult => {
  if (!value || value.trim() === '') {
    return { isValid: false, error: `${fieldName} is required` };
  }

  return { isValid: true };
};

/**
 * Validate age (must be positive number)
 */
export const validateAge = (age: number | string): ValidationResult => {
  const ageNum = typeof age === 'string' ? parseInt(age, 10) : age;

  if (isNaN(ageNum)) {
    return { isValid: false, error: 'Age must be a number' };
  }

  if (ageNum < 0 || ageNum > 150) {
    return { isValid: false, error: 'Age must be between 0 and 150' };
  }

  return { isValid: true };
};

/**
 * Validate date of birth (YYYY-MM-DD format, optional)
 */
export const validateDateOfBirth = (dob: string): ValidationResult => {
  if (!dob || dob.trim() === '') {
    return { isValid: true }; // Optional field
  }

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (!datePattern.test(dob)) {
    return {
      isValid: false,
      error: 'Date of birth must be in YYYY-MM-DD format',
    };
  }

  const date = new Date(dob);
  if (isNaN(date.getTime())) {
    return { isValid: false, error: 'Invalid date' };
  }

  // Check if date is not in the future
  if (date > new Date()) {
    return { isValid: false, error: 'Date of birth cannot be in the future' };
  }

  return { isValid: true };
};

/**
 * Validate Medicaid ID (alphanumeric, required for children)
 */
export const validateMedicaidId = (medicaidId: string, required: boolean = true): ValidationResult => {
  if (!medicaidId || medicaidId.trim() === '') {
    if (required) {
      return { isValid: false, error: 'Medicaid ID is required' };
    }
    return { isValid: true };
  }

  // Allow alphanumeric and hyphens
  const medicaidPattern = /^[A-Za-z0-9-]+$/;

  if (!medicaidPattern.test(medicaidId)) {
    return {
      isValid: false,
      error: 'Medicaid ID must contain only letters, numbers, and hyphens',
    };
  }

  return { isValid: true };
};
