/**
 * Ride Utilities
 * Helper functions for extracting and formatting ride booking data
 */

import { RideBooking } from '../services/nemt-service';

// TranscriptItem types (matching TranscriptPanel.tsx and hooks)
interface TranscriptMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  createdAt: Date;
  sequenceNumber: number;
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
  timestamp: Date;
  createdAt: Date;
  sequenceNumber: number;
}

export type TranscriptItem = TranscriptMessage | FunctionCallItem;

/**
 * Ride booking result from the book_ride function
 */
export interface RideBookingResult {
  success: boolean;
  confirmation_number: string;
  pickup: {
    date: string;
    time: string;
    address: string;
  };
  dropoff: {
    facility?: string;
    address: string;
  };
  appointment_time: string;
  assistance_type: string;
  return_trip?: string;
  remaining_rides: number;
}

/**
 * Extract successful ride bookings from transcript items
 * Filters for successful book_ride function calls
 */
export function extractSuccessfulRides(transcriptItems: TranscriptItem[]): RideBookingResult[] {
  if (!transcriptItems || transcriptItems.length === 0) {
    return [];
  }

  const rides: RideBookingResult[] = [];

  for (const item of transcriptItems) {
    // Check if this is a function call item
    if ('type' in item && item.type === 'function_call') {
      // Check if it's a successful book_ride call
      if (
        item.functionName === 'book_ride' &&
        item.status === 'success' &&
        item.result &&
        item.result.success === true
      ) {
        rides.push(item.result as RideBookingResult);
      }
    }
  }

  // Sort by pickup date/time (earliest first)
  rides.sort((a, b) => {
    const dateA = new Date(`${a.pickup.date}T${a.pickup.time}`);
    const dateB = new Date(`${b.pickup.date}T${b.pickup.time}`);
    return dateA.getTime() - dateB.getTime();
  });

  return rides;
}

/**
 * Format pickup date and time to human-readable format
 * Example: "2025-01-15" + "09:30" → "Wednesday, Jan 15th at 9:30 AM"
 */
export function formatRideDateTime(dateStr: string, timeStr: string): string {
  try {
    const date = new Date(`${dateStr}T${timeStr}`);

    const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date);
    const monthName = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
    const dayNumber = date.getDate();
    const time = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);

    const suffix = getOrdinalSuffix(dayNumber);

    return `${dayName}, ${monthName} ${dayNumber}${suffix} at ${time}`;
  } catch (error) {
    console.error('Error formatting ride date/time:', error);
    return `${dateStr} at ${timeStr}`;
  }
}

/**
 * Get ordinal suffix for a day number (1st, 2nd, 3rd, 4th, etc.)
 */
function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

/**
 * Format assistance type to display name
 */
export function formatAssistanceType(type: string): string {
  const typeMap: Record<string, string> = {
    'ambulatory': 'Ambulatory',
    'wheelchair': 'Wheelchair',
    'stretcher': 'Stretcher',
    'wheelchair_xl': 'Bariatric Wheelchair'
  };

  return typeMap[type.toLowerCase()] || type;
}

/**
 * Format trip type to display name
 */
export function formatTripType(tripType: string): string {
  const typeMap: Record<string, string> = {
    'one_way': 'One Way',
    'round_trip': 'Round Trip'
  };

  return typeMap[tripType.toLowerCase()] || tripType;
}
