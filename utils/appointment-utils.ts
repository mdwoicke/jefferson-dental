/**
 * Appointment Utilities
 * Helper functions for extracting and formatting appointment data
 */

import { AppointmentBooking } from '../services/appointment-service';

// TranscriptItem types (matching TranscriptPanel.tsx and hooks)
interface TranscriptMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date; // Last updated time
  createdAt: Date; // Immutable creation time (used for ordering)
  sequenceNumber: number; // Monotonic sequence for guaranteed ordering
  isPartial?: boolean;
  responseId?: string;
  itemId?: string;
}

interface FunctionCallItem {
  id: string;
  type: 'function_call';
  callId: string;
  functionName: string;
  arguments: any;
  result?: any;
  status: 'pending' | 'success' | 'error';
  executionTimeMs?: number;
  errorMessage?: string;
  timestamp: Date; // Last updated time
  createdAt: Date; // Immutable creation time (used for ordering)
  sequenceNumber: number; // Monotonic sequence for guaranteed ordering
}

export type TranscriptItem = TranscriptMessage | FunctionCallItem;

/**
 * Extract successful appointment bookings from transcript items
 * Filters for successful book_appointment function calls and schedule_appointment skill calls
 */
export function extractSuccessfulBookings(transcriptItems: TranscriptItem[]): AppointmentBooking[] {
  if (!transcriptItems || transcriptItems.length === 0) {
    return [];
  }

  const bookings: AppointmentBooking[] = [];

  for (const item of transcriptItems) {
    // Check if this is a function call item
    if ('type' in item && item.type === 'function_call') {
      // Check if it's a successful book_appointment call (individual function)
      if (
        item.functionName === 'book_appointment' &&
        item.status === 'success' &&
        item.result
      ) {
        bookings.push(item.result as AppointmentBooking);
      }
      // ALSO check for schedule_appointment skill (multi-step workflow)
      else if (
        item.functionName === 'schedule_appointment' &&
        item.status === 'success' &&
        item.result &&
        item.result.booking // The skill stores full booking in result.booking
      ) {
        bookings.push(item.result.booking as AppointmentBooking);
      }
    }
  }

  // Sort by appointment time (earliest first)
  bookings.sort((a, b) => {
    return new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime();
  });

  return bookings;
}

/**
 * Format ISO datetime string to human-readable format
 * Example: "2024-12-23T14:00:00.000Z" → "Monday, Dec 23rd at 2:00 PM"
 */
export function formatAppointmentTime(isoString: string): string {
  try {
    const date = new Date(isoString);

    // Format: "Monday, Dec 23rd at 2:00 PM"
    const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date);
    const monthName = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
    const dayNumber = date.getDate();
    const time = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);

    // Add ordinal suffix (st, nd, rd, th)
    const suffix = getOrdinalSuffix(dayNumber);

    return `${dayName}, ${monthName} ${dayNumber}${suffix} at ${time}`;
  } catch (error) {
    console.error('Error formatting appointment time:', error);
    return isoString; // Fallback to raw string
  }
}

/**
 * Get ordinal suffix for a day number (1st, 2nd, 3rd, 4th, etc.)
 */
function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th'; // Special case for 11-20
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

/**
 * Extract SMS confirmation requests from transcript items
 * Returns the most recent send_confirmation_sms function call with its details
 */
export function extractSMSConfirmationRequest(transcriptItems: TranscriptItem[]): {
  phoneNumber: string;
  appointmentDetails: string;
  timestamp: Date;
} | null {
  if (!transcriptItems || transcriptItems.length === 0) {
    return null;
  }

  // Find all SMS confirmation function calls
  const smsRequests: Array<{
    phoneNumber: string;
    appointmentDetails: string;
    timestamp: Date;
  }> = [];

  for (const item of transcriptItems) {
    // Check if this is a function call item
    if ('type' in item && item.type === 'function_call') {
      // Check if it's a send_confirmation_sms call
      if (item.functionName === 'send_confirmation_sms' && item.status === 'success') {
        smsRequests.push({
          phoneNumber: item.arguments?.phone_number || '',
          appointmentDetails: item.arguments?.appointment_details || '',
          timestamp: item.timestamp
        });
      }
    }
  }

  // Return the most recent SMS request (if any)
  if (smsRequests.length > 0) {
    return smsRequests[smsRequests.length - 1];
  }

  return null;
}

/**
 * Format appointment type from snake_case to Title Case
 * Example: "exam_and_cleaning" → "Exam & Cleaning"
 */
export function formatAppointmentType(type: string): string {
  if (!type) return 'Appointment';

  // Map specific types to display names
  const typeMap: Record<string, string> = {
    'exam': 'Exam',
    'cleaning': 'Cleaning',
    'exam_and_cleaning': 'Exam & Cleaning',
    'emergency': 'Emergency'
  };

  if (typeMap[type.toLowerCase()]) {
    return typeMap[type.toLowerCase()];
  }

  // Fallback: Convert snake_case to Title Case
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
