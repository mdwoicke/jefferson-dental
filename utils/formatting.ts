/**
 * Formatting utilities for display
 */

/**
 * Format phone number to (XXX) XXX-XXXX
 */
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Format based on length
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  // Return original if doesn't match expected format
  return phone;
};

/**
 * Format date from YYYY-MM-DD to readable format (MM/DD/YYYY)
 */
export const formatDate = (date: string): string => {
  if (!date) return '';

  try {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
  } catch {
    return date;
  }
};

/**
 * Format full address to single line
 */
export const formatAddress = (address: {
  street: string;
  city: string;
  state: string;
  zip: string;
}): string => {
  return `${address.street}, ${address.city}, ${address.state} ${address.zip}`;
};

/**
 * Capitalize first letter of each word
 */
export const toTitleCase = (str: string): string => {
  if (!str) return '';

  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Generate a unique ID for new records
 */
export const generateId = (prefix: string = 'PAT'): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}-${timestamp}-${random}`;
};
