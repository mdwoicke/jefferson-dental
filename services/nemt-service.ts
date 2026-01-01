/**
 * NEMT (Non-Emergency Medical Transportation) Service
 * Mock service for Care Car demo - simulates ride booking and member management
 *
 * Supports two modes:
 * 1. Static mock data (default) - uses hardcoded MOCK_MEMBERS array
 * 2. MockDataService integration - uses configurable per-demo mock data pools
 */

import { MockDataService, NEMTMember as MockNEMTMember, Facility, RideBooking as MockRide, Driver, AddressRecord } from './mock-data-service';

// Optional MockDataService instance for per-demo data
let mockDataServiceInstance: MockDataService | null = null;

/**
 * Set the MockDataService instance for dynamic mock data
 */
export function setMockDataService(service: MockDataService | null): void {
  mockDataServiceInstance = service;
  if (service) {
    console.log('🔌 NEMT Service: MockDataService connected');
  } else {
    console.log('🔌 NEMT Service: MockDataService disconnected, using static data');
  }
}

/**
 * Get the current MockDataService instance
 */
export function getMockDataService(): MockDataService | null {
  return mockDataServiceInstance;
}

// Mock member database
export interface NEMTMember {
  memberId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  address: {
    street: string;
    apartment?: string;
    city: string;
    state: string;
    zip: string;
  };
  planType: 'Medicaid' | 'Medicare' | 'Dual';
  eligibilityStatus: 'active' | 'inactive' | 'pending';
  assistanceType: 'ambulatory' | 'wheelchair' | 'stretcher' | 'wheelchair_xl';
  totalRidesAllowed: number;
  ridesUsed: number;
  notes?: string;
  companions?: Companion[];
}

export interface Companion {
  name: string;
  phone: string;
  relationship?: string;
}

export interface RideBooking {
  confirmationNumber: string;
  memberId: string;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'in_progress';
  tripType: 'one_way' | 'round_trip';
  pickup: {
    date: string;
    time: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  dropoff: {
    facilityName?: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  appointmentTime: string;
  assistanceType: string;
  returnTrip?: {
    type: 'scheduled' | 'will_call';
    pickupTime?: string;
  };
  companions?: Companion[];
  notes?: string;
  createdAt: string;
  driverInfo?: {
    name: string;
    vehicle: string;
    eta: string;
  };
}

// Mock member database - for demo purposes (Louisville, KY focused)
const MOCK_MEMBERS: NEMTMember[] = [
  {
    memberId: 'M987654321',
    firstName: 'Dorothy',
    lastName: 'Williams',
    dateOfBirth: '1958-03-15',
    phone: '(502) 555-8234',
    address: {
      street: '1847 Algonquin Parkway',
      apartment: 'Apt 4',
      city: 'Louisville',
      state: 'KY',
      zip: '40210'
    },
    planType: 'Medicaid',
    eligibilityStatus: 'active',
    assistanceType: 'wheelchair',
    totalRidesAllowed: 12,
    ridesUsed: 4,
    notes: 'Dialysis patient, 3x weekly at Jewish Hospital Dialysis Center',
    companions: []
  },
  {
    memberId: 'M123456789',
    firstName: 'Jane',
    lastName: 'Smith',
    dateOfBirth: '1965-12-20',
    phone: '(502) 555-0147',
    address: {
      street: '216 Cecil Avenue',
      apartment: 'Apartment 1',
      city: 'Louisville',
      state: 'KY',
      zip: '40216'
    },
    planType: 'Medicaid',
    eligibilityStatus: 'active',
    assistanceType: 'ambulatory',
    totalRidesAllowed: 20,
    ridesUsed: 2,
    notes: 'Cardiology appointments at Norton Healthcare'
  },
  {
    memberId: 'M555888999',
    firstName: 'Robert',
    lastName: 'Thompson',
    dateOfBirth: '1972-07-04',
    phone: '(502) 555-3892',
    address: {
      street: '3421 Taylor Boulevard',
      city: 'Louisville',
      state: 'KY',
      zip: '40215'
    },
    planType: 'Medicare',
    eligibilityStatus: 'active',
    assistanceType: 'ambulatory',
    totalRidesAllowed: 24,
    ridesUsed: 10,
    notes: 'Physical therapy twice weekly at Baptist Health'
  }
];

// Mock ride bookings storage
const MOCK_RIDES: Map<string, RideBooking> = new Map();

// Pre-populate with some existing rides
MOCK_RIDES.set('CC-847291', {
  confirmationNumber: 'CC-847291',
  memberId: 'M987654321',
  status: 'confirmed',
  tripType: 'round_trip',
  pickup: {
    date: '2025-01-15',
    time: '09:30',
    address: '1847 Algonquin Parkway, Apt 4',
    city: 'Louisville',
    state: 'KY',
    zip: '40210'
  },
  dropoff: {
    facilityName: 'Jewish Hospital Dialysis Center',
    address: '200 Abraham Flexner Way',
    city: 'Louisville',
    state: 'KY',
    zip: '40202'
  },
  appointmentTime: '10:15',
  assistanceType: 'wheelchair',
  returnTrip: {
    type: 'will_call'
  },
  createdAt: '2025-01-10T14:30:00Z'
});

/**
 * Generate a unique confirmation number
 */
function generateConfirmationNumber(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'CC-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Format address for display
 */
function formatAddress(address: { street: string; apartment?: string; city: string; state: string; zip: string }): string {
  const parts = [address.street];
  if (address.apartment) parts.push(address.apartment);
  parts.push(`${address.city}, ${address.state} ${address.zip}`);
  return parts.join(', ');
}

// DEMO MODE: When true, returns mock data for non-existent members/rides
// This allows flexible demo testing without requiring exact mock data matches
const DEMO_MODE_LENIENT = true;

// Realistic mock data pools for demo mode
const DEMO_FACILITIES = [
  'Baptist Health Medical Center',
  'Norton Healthcare Pavilion',
  'UofL Health - Mary & Elizabeth Hospital',
  'Clark Memorial Hospital',
  'Kindred Hospital Louisville',
  'Jewish Hospital Dialysis Center',
  'Passport Health Plan Clinic',
  'Louisville VA Medical Center'
];

const DEMO_STREETS = [
  '2847 Bardstown Road',
  '1522 Eastern Parkway',
  '4103 Shelbyville Road',
  '892 South 4th Street',
  '3201 Poplar Level Road',
  '1845 Brownsboro Road',
  '756 East Broadway',
  '2100 Dixie Highway'
];

const DEMO_DRIVERS = [
  { name: 'Marcus W.', vehicle: 'White Ford Transit, Plate: KY-4521' },
  { name: 'Angela T.', vehicle: 'Silver Dodge Caravan, Plate: KY-8834' },
  { name: 'Jerome H.', vehicle: 'Blue Chrysler Pacifica, Plate: KY-2156' },
  { name: 'Patricia M.', vehicle: 'White Chevy Express, Plate: KY-7743' }
];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Helper: Find a member by ID, checking MockDataService first, then static data
 */
function findMemberById(memberId: string): NEMTMember | undefined {
  // Try MockDataService first
  if (mockDataServiceInstance && mockDataServiceInstance.hasData()) {
    const dynamicMember = mockDataServiceInstance.findMemberById(memberId);
    if (dynamicMember) {
      // Convert MockDataService format to NEMTMember format
      return {
        memberId: dynamicMember.memberId,
        firstName: dynamicMember.firstName,
        lastName: dynamicMember.lastName,
        dateOfBirth: dynamicMember.dateOfBirth,
        phone: dynamicMember.phone,
        address: {
          street: dynamicMember.addressStreet,
          apartment: dynamicMember.addressApartment,
          city: dynamicMember.addressCity,
          state: dynamicMember.addressState,
          zip: dynamicMember.addressZip
        },
        planType: dynamicMember.planType,
        eligibilityStatus: dynamicMember.eligibilityStatus,
        assistanceType: dynamicMember.assistanceType,
        totalRidesAllowed: dynamicMember.totalRidesAllowed,
        ridesUsed: dynamicMember.ridesUsed,
        notes: dynamicMember.notes
      };
    }
  }

  // Fallback to static mock data
  return MOCK_MEMBERS.find(m =>
    m.memberId.toLowerCase() === memberId.toLowerCase()
  );
}

/**
 * Helper: Get a random driver from MockDataService or static data
 */
function getRandomDriver(): { name: string; vehicle: string } {
  if (mockDataServiceInstance && mockDataServiceInstance.hasData()) {
    const driver = mockDataServiceInstance.getRandomDriver();
    if (driver) {
      return { name: driver.name, vehicle: driver.vehicle };
    }
  }
  return getRandomElement(DEMO_DRIVERS);
}

/**
 * Helper: Get a random facility from MockDataService or static data
 */
function getRandomFacility(): string {
  if (mockDataServiceInstance && mockDataServiceInstance.hasData()) {
    const facilities = mockDataServiceInstance.getPool<Facility>('facilities');
    if (facilities.length > 0) {
      return getRandomElement(facilities).name;
    }
  }
  return getRandomElement(DEMO_FACILITIES);
}

/**
 * Helper: Get a random street from MockDataService or static data
 */
function getRandomStreet(): string {
  if (mockDataServiceInstance && mockDataServiceInstance.hasData()) {
    const addresses = mockDataServiceInstance.getPool<AddressRecord>('addresses');
    if (addresses.length > 0) {
      return getRandomElement(addresses).street;
    }
  }
  return getRandomElement(DEMO_STREETS);
}

// NEMT Service Functions

export const NEMTService = {
  /**
   * Verify a member's identity
   * In DEMO MODE: Returns verified=true for any member not in database
   * This allows flexible testing without requiring exact mock data matches
   */
  verifyMember(args: {
    member_id: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
  }): {
    verified: boolean;
    member_id?: string;
    full_name?: string;
    plan_type?: string;
    remaining_rides?: number;
    eligibility_status?: string;
    error?: string;
  } {
    // Use helper that checks MockDataService first, then static data
    const member = findMemberById(args.member_id);

    // If member found in mock database, validate against it
    if (member) {
      // Check name match (case insensitive, partial match allowed)
      const firstNameMatch = member.firstName.toLowerCase().includes(args.first_name.toLowerCase()) ||
                            args.first_name.toLowerCase().includes(member.firstName.toLowerCase());
      const lastNameMatch = member.lastName.toLowerCase().includes(args.last_name.toLowerCase()) ||
                           args.last_name.toLowerCase().includes(member.lastName.toLowerCase());

      if (!firstNameMatch || !lastNameMatch) {
        if (DEMO_MODE_LENIENT) {
          console.log('🔐 DEMO MODE: Name mismatch ignored, verifying anyway');
        } else {
          return {
            verified: false,
            error: 'Name does not match our records. Please verify and try again.'
          };
        }
      }

      // Check DOB match (flexible format handling)
      const normalizedInputDOB = args.date_of_birth.replace(/[\/\-]/g, '');
      const normalizedMemberDOB = member.dateOfBirth.replace(/[\/\-]/g, '');

      if (!normalizedInputDOB.includes(normalizedMemberDOB.slice(-4)) &&
          !normalizedMemberDOB.includes(normalizedInputDOB)) {
        if (DEMO_MODE_LENIENT) {
          console.log('🔐 DEMO MODE: DOB mismatch ignored, verifying anyway');
        } else {
          return {
            verified: false,
            error: 'Date of birth does not match our records.'
          };
        }
      }

      const remainingRides = member.totalRidesAllowed - member.ridesUsed;

      return {
        verified: true,
        member_id: member.memberId,
        full_name: `${member.firstName} ${member.lastName}`,
        plan_type: member.planType,
        remaining_rides: remainingRides,
        eligibility_status: member.eligibilityStatus
      };
    }

    // Member not found in mock database
    if (DEMO_MODE_LENIENT) {
      // DEMO MODE: Create a synthetic verified response
      console.log(`🔐 DEMO MODE: Member ${args.member_id} not in database, auto-verifying for demo`);
      return {
        verified: true,
        member_id: args.member_id,
        full_name: `${args.first_name} ${args.last_name}`,
        plan_type: 'Medicaid',
        remaining_rides: 10,
        eligibility_status: 'active'
      };
    }

    return {
      verified: false,
      error: 'Member ID not found in our system. Please verify the ID and try again.'
    };
  },

  /**
   * Get full member information
   * In DEMO MODE: Returns synthetic member data if not found
   */
  getMemberInfo(args: { member_id: string }): NEMTMember | { error: string } {
    // Use helper that checks MockDataService first, then static data
    const member = findMemberById(args.member_id);

    if (!member) {
      if (DEMO_MODE_LENIENT) {
        console.log(`🔐 DEMO MODE: Creating synthetic member info for ${args.member_id}`);
        // Return synthetic member data for demo with realistic Louisville, KY data
        return {
          memberId: args.member_id,
          firstName: 'Member',
          lastName: 'On File',
          dateOfBirth: '1962-08-14',
          phone: '(502) 555-0147',
          address: {
            street: getRandomStreet(),
            city: 'Louisville',
            state: 'KY',
            zip: '40216'
          },
          planType: 'Medicaid',
          eligibilityStatus: 'active',
          assistanceType: 'ambulatory',
          totalRidesAllowed: 20,
          ridesUsed: 3,
          notes: 'Regular medical appointments'
        };
      }
      return { error: 'Member not found' };
    }

    return member;
  },

  /**
   * Check ride eligibility
   * In DEMO MODE: Returns eligible=true with mock data if member not found
   */
  checkRideEligibility(args: { member_id: string }): {
    eligible: boolean;
    remaining_rides: number;
    total_rides: number;
    rides_used: number;
    plan_type: string;
    eligibility_status: string;
    next_reset_date?: string;
    error?: string;
  } {
    // Use helper that checks MockDataService first, then static data
    const member = findMemberById(args.member_id);

    if (!member) {
      if (DEMO_MODE_LENIENT) {
        console.log(`🔐 DEMO MODE: Returning synthetic eligibility for ${args.member_id}`);
        return {
          eligible: true,
          remaining_rides: 18,
          total_rides: 20,
          rides_used: 2,
          plan_type: 'Medicaid',
          eligibility_status: 'active',
          next_reset_date: '2025-02-01'
        };
      }
      return {
        eligible: false,
        remaining_rides: 0,
        total_rides: 0,
        rides_used: 0,
        plan_type: 'unknown',
        eligibility_status: 'not_found',
        error: 'Member not found'
      };
    }

    const remainingRides = member.totalRidesAllowed - member.ridesUsed;

    return {
      eligible: remainingRides > 0 && member.eligibilityStatus === 'active',
      remaining_rides: remainingRides,
      total_rides: member.totalRidesAllowed,
      rides_used: member.ridesUsed,
      plan_type: member.planType,
      eligibility_status: member.eligibilityStatus,
      next_reset_date: '2025-02-01' // Mock next reset
    };
  },

  /**
   * Search and validate an address
   */
  searchAddress(args: { query: string; city?: string; state?: string }): {
    found: boolean;
    suggestions: Array<{
      address: string;
      city: string;
      state: string;
      zip: string;
      formatted: string;
    }>;
  } {
    // Mock address search - Louisville, KY focused
    const mockAddresses = [
      { address: '200 Abraham Flexner Way', city: 'Louisville', state: 'KY', zip: '40202' },
      { address: '550 South Jackson Street', city: 'Louisville', state: 'KY', zip: '40202' },
      { address: '4910 Chamberlain Lane', city: 'Louisville', state: 'KY', zip: '40241' },
      { address: '1850 Bluegrass Avenue', city: 'Louisville', state: 'KY', zip: '40215' },
      { address: '315 East Broadway', city: 'Louisville', state: 'KY', zip: '40202' },
      { address: '2301 South 3rd Street', city: 'Louisville', state: 'KY', zip: '40208' },
      { address: '4001 Dutchmans Lane', city: 'Louisville', state: 'KY', zip: '40207' },
      { address: '1169 Eastern Parkway', city: 'Louisville', state: 'KY', zip: '40217' }
    ];

    const query = args.query.toLowerCase();
    const filtered = mockAddresses.filter(addr =>
      addr.address.toLowerCase().includes(query) ||
      query.includes(addr.address.toLowerCase().split(' ')[0])
    );

    // If no matches found but in demo mode, return some suggestions anyway
    if (filtered.length === 0 && DEMO_MODE_LENIENT) {
      return {
        found: true,
        suggestions: mockAddresses.slice(0, 3).map(addr => ({
          ...addr,
          formatted: `${addr.address}, ${addr.city}, ${addr.state} ${addr.zip}`
        }))
      };
    }

    return {
      found: filtered.length > 0,
      suggestions: filtered.map(addr => ({
        ...addr,
        formatted: `${addr.address}, ${addr.city}, ${addr.state} ${addr.zip}`
      }))
    };
  },

  /**
   * Book a ride
   */
  bookRide(args: {
    member_id: string;
    trip_type: 'one_way' | 'round_trip';
    pickup_address: string;
    pickup_city: string;
    pickup_state: string;
    pickup_zip: string;
    dropoff_address: string;
    dropoff_city: string;
    dropoff_state: string;
    dropoff_zip: string;
    pickup_date: string;
    pickup_time: string;
    appointment_time: string;
    assistance_type: string;
    facility_name?: string;
    return_trip_type?: 'scheduled' | 'will_call';
    return_pickup_time?: string;
    notes?: string;
  }): {
    success: boolean;
    confirmation_number?: string;
    pickup?: { date: string; time: string; address: string };
    dropoff?: { facility?: string; address: string };
    appointment_time?: string;
    assistance_type?: string;
    return_trip?: string;
    remaining_rides?: number;
    error?: string;
  } {
    // Use helper that checks MockDataService first, then static data
    let member = findMemberById(args.member_id);

    // In DEMO MODE, create synthetic member if not found
    if (!member && DEMO_MODE_LENIENT) {
      console.log(`🔐 DEMO MODE: Creating synthetic member for booking: ${args.member_id}`);
      member = {
        memberId: args.member_id,
        firstName: 'Demo',
        lastName: 'Member',
        dateOfBirth: '1970-01-01',
        phone: '(502) 555-0000',
        address: { street: getRandomStreet(), city: 'Louisville', state: 'KY', zip: '40216' },
        planType: 'Medicaid',
        eligibilityStatus: 'active',
        assistanceType: 'ambulatory',
        totalRidesAllowed: 20,
        ridesUsed: 2
      };
    }

    if (!member) {
      return { success: false, error: 'Member not found' };
    }

    if (member.ridesUsed >= member.totalRidesAllowed) {
      return { success: false, error: 'No rides remaining for this benefit period' };
    }

    if (member.eligibilityStatus !== 'active') {
      return { success: false, error: 'Member eligibility is not active' };
    }

    const confirmationNumber = generateConfirmationNumber();

    const ride: RideBooking = {
      confirmationNumber,
      memberId: args.member_id,
      status: 'confirmed',
      tripType: args.trip_type,
      pickup: {
        date: args.pickup_date,
        time: args.pickup_time,
        address: args.pickup_address,
        city: args.pickup_city,
        state: args.pickup_state,
        zip: args.pickup_zip
      },
      dropoff: {
        facilityName: args.facility_name,
        address: args.dropoff_address,
        city: args.dropoff_city,
        state: args.dropoff_state,
        zip: args.dropoff_zip
      },
      appointmentTime: args.appointment_time,
      assistanceType: args.assistance_type,
      returnTrip: args.trip_type === 'round_trip' ? {
        type: args.return_trip_type || 'will_call',
        pickupTime: args.return_pickup_time
      } : undefined,
      notes: args.notes,
      createdAt: new Date().toISOString()
    };

    MOCK_RIDES.set(confirmationNumber, ride);

    // Update member's ride count
    member.ridesUsed += args.trip_type === 'round_trip' ? 2 : 1;

    const pickupAddress = `${args.pickup_address}, ${args.pickup_city}, ${args.pickup_state} ${args.pickup_zip}`;
    const dropoffAddress = `${args.dropoff_address}, ${args.dropoff_city}, ${args.dropoff_state} ${args.dropoff_zip}`;

    return {
      success: true,
      confirmation_number: confirmationNumber,
      pickup: {
        date: args.pickup_date,
        time: args.pickup_time,
        address: pickupAddress
      },
      dropoff: {
        facility: args.facility_name,
        address: dropoffAddress
      },
      appointment_time: args.appointment_time,
      assistance_type: args.assistance_type,
      return_trip: args.trip_type === 'round_trip'
        ? (args.return_trip_type === 'scheduled'
            ? `Scheduled pickup at ${args.return_pickup_time}`
            : 'Call when ready')
        : undefined,
      remaining_rides: member.totalRidesAllowed - member.ridesUsed
    };
  },

  /**
   * Get ride status
   * In DEMO MODE: Returns a synthetic confirmed ride if not found
   */
  getRideStatus(args: { confirmation_number: string }): {
    found: boolean;
    status?: string;
    pickup?: { date: string; time: string; address: string };
    dropoff?: { facility?: string; address: string };
    appointment_time?: string;
    driver_info?: { name: string; vehicle: string; eta: string };
    return_trip?: { type: string; pickup_time?: string };
    error?: string;
  } {
    const ride = MOCK_RIDES.get(args.confirmation_number.toUpperCase());

    if (!ride) {
      if (DEMO_MODE_LENIENT) {
        console.log(`🔐 DEMO MODE: Creating synthetic ride status for ${args.confirmation_number}`);
        // Generate a realistic future date
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 3);
        const dateStr = futureDate.toISOString().split('T')[0];

        const pickupStreet = getRandomStreet();
        const facility = getRandomFacility();

        return {
          found: true,
          status: 'confirmed',
          pickup: {
            date: dateStr,
            time: '09:30',
            address: `${pickupStreet}, Louisville, KY 40216`
          },
          dropoff: {
            facility: facility,
            address: '550 South Jackson Street, Louisville, KY 40202'
          },
          appointment_time: '10:15',
          return_trip: {
            type: 'will_call'
          }
        };
      }
      return { found: false, error: 'Ride not found with that confirmation number' };
    }

    const pickupAddress = `${ride.pickup.address}, ${ride.pickup.city}, ${ride.pickup.state} ${ride.pickup.zip}`;
    const dropoffAddress = `${ride.dropoff.address}, ${ride.dropoff.city}, ${ride.dropoff.state} ${ride.dropoff.zip}`;

    // Mock driver info for rides happening today
    const today = new Date().toISOString().split('T')[0];
    const driverInfo = ride.pickup.date === today ? {
      name: 'Michael T.',
      vehicle: 'White Toyota Sienna, License: AZ-4521',
      eta: '15 minutes'
    } : undefined;

    return {
      found: true,
      status: ride.status,
      pickup: {
        date: ride.pickup.date,
        time: ride.pickup.time,
        address: pickupAddress
      },
      dropoff: {
        facility: ride.dropoff.facilityName,
        address: dropoffAddress
      },
      appointment_time: ride.appointmentTime,
      driver_info: driverInfo,
      return_trip: ride.returnTrip ? {
        type: ride.returnTrip.type,
        pickup_time: ride.returnTrip.pickupTime
      } : undefined
    };
  },

  /**
   * Cancel a ride
   * In DEMO MODE: Successfully cancels any ride, even if not found
   */
  cancelRide(args: {
    confirmation_number: string;
    reason?: string
  }): {
    success: boolean;
    message?: string;
    rides_refunded?: number;
    error?: string;
  } {
    const ride = MOCK_RIDES.get(args.confirmation_number.toUpperCase());

    if (!ride) {
      if (DEMO_MODE_LENIENT) {
        console.log(`🔐 DEMO MODE: Simulating cancellation for ${args.confirmation_number}`);
        return {
          success: true,
          message: `Ride ${args.confirmation_number} has been cancelled successfully.`,
          rides_refunded: 1
        };
      }
      return { success: false, error: 'Ride not found with that confirmation number' };
    }

    if (ride.status === 'cancelled') {
      return { success: false, error: 'This ride has already been cancelled' };
    }

    if (ride.status === 'completed' || ride.status === 'in_progress') {
      return { success: false, error: 'Cannot cancel a ride that is in progress or completed' };
    }

    // Update ride status
    ride.status = 'cancelled';

    // Refund rides to member
    const member = MOCK_MEMBERS.find(m => m.memberId === ride.memberId);
    const ridesRefunded = ride.tripType === 'round_trip' ? 2 : 1;
    if (member) {
      member.ridesUsed = Math.max(0, member.ridesUsed - ridesRefunded);
    }

    return {
      success: true,
      message: `Ride ${args.confirmation_number} has been cancelled successfully.`,
      rides_refunded: ridesRefunded
    };
  },

  /**
   * Update ride details
   * In DEMO MODE: Successfully updates any ride, even if not found
   */
  updateRide(args: {
    confirmation_number: string;
    pickup_time?: string;
    pickup_date?: string;
    appointment_time?: string;
    return_trip_type?: 'scheduled' | 'will_call';
    return_pickup_time?: string;
    notes?: string;
  }): {
    success: boolean;
    updated_fields?: string[];
    new_details?: Partial<RideBooking>;
    error?: string;
  } {
    const ride = MOCK_RIDES.get(args.confirmation_number.toUpperCase());

    if (!ride) {
      if (DEMO_MODE_LENIENT) {
        console.log(`🔐 DEMO MODE: Simulating update for ${args.confirmation_number}`);
        const updatedFields: string[] = [];
        if (args.pickup_time) updatedFields.push('pickup_time');
        if (args.pickup_date) updatedFields.push('pickup_date');
        if (args.appointment_time) updatedFields.push('appointment_time');
        if (args.return_trip_type) updatedFields.push('return_trip_type');
        if (args.return_pickup_time) updatedFields.push('return_pickup_time');
        if (args.notes) updatedFields.push('notes');

        // Generate realistic future date if not provided
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 3);
        const dateStr = futureDate.toISOString().split('T')[0];

        return {
          success: true,
          updated_fields: updatedFields,
          new_details: {
            pickup: {
              date: args.pickup_date || dateStr,
              time: args.pickup_time || '09:30',
              address: getRandomStreet(),
              city: 'Louisville',
              state: 'KY',
              zip: '40216'
            },
            appointmentTime: args.appointment_time || '10:15',
            notes: args.notes
          }
        };
      }
      return { success: false, error: 'Ride not found with that confirmation number' };
    }

    if (ride.status === 'cancelled' || ride.status === 'completed') {
      return { success: false, error: 'Cannot modify a cancelled or completed ride' };
    }

    const updatedFields: string[] = [];

    if (args.pickup_time) {
      ride.pickup.time = args.pickup_time;
      updatedFields.push('pickup_time');
    }
    if (args.pickup_date) {
      ride.pickup.date = args.pickup_date;
      updatedFields.push('pickup_date');
    }
    if (args.appointment_time) {
      ride.appointmentTime = args.appointment_time;
      updatedFields.push('appointment_time');
    }
    if (args.return_trip_type && ride.returnTrip) {
      ride.returnTrip.type = args.return_trip_type;
      updatedFields.push('return_trip_type');
    }
    if (args.return_pickup_time && ride.returnTrip) {
      ride.returnTrip.pickupTime = args.return_pickup_time;
      updatedFields.push('return_pickup_time');
    }
    if (args.notes) {
      ride.notes = args.notes;
      updatedFields.push('notes');
    }

    return {
      success: true,
      updated_fields: updatedFields,
      new_details: {
        pickup: ride.pickup,
        appointmentTime: ride.appointmentTime,
        returnTrip: ride.returnTrip,
        notes: ride.notes
      }
    };
  },

  /**
   * Add a companion to a ride
   * In DEMO MODE: Successfully adds companion to any ride, even if not found
   */
  addCompanion(args: {
    confirmation_number: string;
    companion_name: string;
    companion_phone: string;
    relationship?: string;
  }): {
    success: boolean;
    message?: string;
    companion_added?: Companion;
    error?: string;
  } {
    const ride = MOCK_RIDES.get(args.confirmation_number.toUpperCase());

    const companion: Companion = {
      name: args.companion_name,
      phone: args.companion_phone,
      relationship: args.relationship
    };

    if (!ride) {
      if (DEMO_MODE_LENIENT) {
        console.log(`🔐 DEMO MODE: Simulating add companion for ${args.confirmation_number}`);
        return {
          success: true,
          message: `${args.companion_name} has been added as a companion for this ride.`,
          companion_added: companion
        };
      }
      return { success: false, error: 'Ride not found with that confirmation number' };
    }

    if (ride.status === 'cancelled' || ride.status === 'completed') {
      return { success: false, error: 'Cannot add companion to a cancelled or completed ride' };
    }

    if (!ride.companions) {
      ride.companions = [];
    }

    // Check if companion already exists
    const existingCompanion = ride.companions.find(
      c => c.name.toLowerCase() === args.companion_name.toLowerCase()
    );

    if (existingCompanion) {
      return {
        success: false,
        error: 'A companion with this name is already added to the ride'
      };
    }

    ride.companions.push(companion);

    return {
      success: true,
      message: `${args.companion_name} has been added as a companion for this ride.`,
      companion_added: companion
    };
  },

  /**
   * Check vehicle availability
   */
  checkAvailability(args: {
    date: string;
    time: string;
    pickup_zip: string;
    assistance_type: string;
  }): {
    available: boolean;
    earliest_available_time?: string;
    suggested_times?: string[];
    message?: string;
  } {
    // Mock availability check - in production would check real fleet availability
    const hour = parseInt(args.time.split(':')[0]);

    // Simulate limited availability during peak hours
    if (hour >= 8 && hour <= 10) {
      // High demand period
      const isAvailable = Math.random() > 0.3; // 70% chance available

      if (!isAvailable) {
        return {
          available: false,
          earliest_available_time: `${hour + 1}:00`,
          suggested_times: [`${hour + 1}:00`, `${hour + 1}:30`, `${hour + 2}:00`],
          message: 'High demand period. Alternative times available.'
        };
      }
    }

    // Check if wheelchair/stretcher availability
    if (args.assistance_type === 'stretcher' || args.assistance_type === 'wheelchair_xl') {
      // Limited specialized vehicles
      const isAvailable = Math.random() > 0.2; // 80% chance

      if (!isAvailable) {
        return {
          available: false,
          earliest_available_time: args.time,
          suggested_times: [],
          message: `Limited ${args.assistance_type} vehicles. We may need to confirm availability.`
        };
      }
    }

    return {
      available: true,
      message: 'Vehicle available for requested time.'
    };
  }
};

export default NEMTService;
