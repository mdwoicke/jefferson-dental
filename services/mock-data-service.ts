/**
 * Mock Data Service
 * Provides runtime access to mock data pools for tool handlers.
 * This service loads mock data from demo configurations and provides
 * methods to query and manipulate the data during voice AI sessions.
 */

import {
  MockDataPool,
  MockDataPoolType,
  MockDataRecord,
  MOCK_DATA_POOL_SCHEMAS
} from '../types/demo-config';

/**
 * NEMT Member interface for type-safe access
 */
export interface NEMTMember extends MockDataRecord {
  memberId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  addressStreet: string;
  addressApartment?: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
  planType: 'Medicaid' | 'Medicare' | 'Dual';
  eligibilityStatus: 'active' | 'inactive' | 'pending';
  assistanceType: 'ambulatory' | 'wheelchair' | 'stretcher' | 'wheelchair_xl';
  totalRidesAllowed: number;
  ridesUsed: number;
  benefitResetDate?: string;
  notes?: string;
}

/**
 * Facility interface
 */
export interface Facility extends MockDataRecord {
  name: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  facilityType?: 'hospital' | 'clinic' | 'dialysis' | 'pharmacy' | 'imaging' | 'other';
  phone?: string;
}

/**
 * Ride booking interface
 */
export interface RideBooking extends MockDataRecord {
  confirmationNumber: string;
  memberId: string;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'in_progress';
  tripType: 'one_way' | 'round_trip';
  pickupDate: string;
  pickupTime: string;
  pickupAddress: string;
  dropoffAddress: string;
  facilityName?: string;
  appointmentTime?: string;
  assistanceType?: 'ambulatory' | 'wheelchair' | 'stretcher' | 'wheelchair_xl';
  returnTripType?: 'scheduled' | 'will_call';
  returnPickupTime?: string;
  driverName?: string;
  vehicleInfo?: string;
  eta?: number;
}

/**
 * Driver interface
 */
export interface Driver extends MockDataRecord {
  name: string;
  vehicle: string;
  phone?: string;
  vehicleType?: 'sedan' | 'suv' | 'wheelchair_van' | 'stretcher_van';
}

/**
 * Address interface
 */
export interface AddressRecord extends MockDataRecord {
  street: string;
  city?: string;
  state?: string;
  zip?: string;
  type?: 'residential' | 'medical' | 'commercial';
}

/**
 * Patient interface for dental
 */
export interface Patient extends MockDataRecord {
  patientId: string;
  parentName: string;
  phone: string;
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  preferredLanguage?: string;
  notes?: string;
}

/**
 * Child interface for dental
 */
export interface Child extends MockDataRecord {
  patientId?: string;
  name: string;
  age: number;
  medicaidId?: string;
  dateOfBirth?: string;
  specialNeeds?: string;
}

/**
 * Appointment interface
 */
export interface Appointment extends MockDataRecord {
  bookingId: string;
  patientId?: string;
  appointmentTime: string;
  appointmentType: 'exam' | 'cleaning' | 'exam_and_cleaning' | 'emergency';
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  location?: string;
  childNames?: string[];
}

/**
 * Available slot interface
 */
export interface AvailableSlot extends MockDataRecord {
  date: string;
  time: string;
  datetime?: string;
  availableChairs?: number;
  timeRange?: 'morning' | 'afternoon' | 'evening';
  canAccommodate?: boolean;
}

/**
 * MockDataService provides runtime access to mock data pools.
 * It loads data from demo configurations and allows tool handlers
 * to query and modify the data during voice sessions.
 */
export class MockDataService {
  private pools: Map<MockDataPoolType, MockDataPool> = new Map();
  private demoConfigId: string | null = null;

  /**
   * Load mock data pools from an array of pools
   */
  loadPools(pools: MockDataPool[]): void {
    this.pools.clear();
    pools.forEach(pool => {
      this.pools.set(pool.poolType, pool);
    });
    console.log(`📦 Loaded ${pools.length} mock data pools`);
  }

  /**
   * Set the demo config ID for context
   */
  setDemoConfigId(id: string): void {
    this.demoConfigId = id;
  }

  /**
   * Get the current demo config ID
   */
  getDemoConfigId(): string | null {
    return this.demoConfigId;
  }

  /**
   * Check if pools are loaded
   */
  hasData(): boolean {
    return this.pools.size > 0;
  }

  /**
   * Get all records from a pool
   */
  getPool<T extends MockDataRecord = MockDataRecord>(poolType: MockDataPoolType): T[] {
    const pool = this.pools.get(poolType);
    if (!pool) {
      console.log(`⚠️ Pool '${poolType}' not found, returning empty array`);
      return [];
    }
    return pool.records as T[];
  }

  /**
   * Find a single record matching a predicate
   */
  findRecord<T extends MockDataRecord = MockDataRecord>(
    poolType: MockDataPoolType,
    predicate: (record: T) => boolean
  ): T | undefined {
    const records = this.getPool<T>(poolType);
    return records.find(predicate);
  }

  /**
   * Find all records matching a predicate
   */
  findRecords<T extends MockDataRecord = MockDataRecord>(
    poolType: MockDataPoolType,
    predicate: (record: T) => boolean
  ): T[] {
    const records = this.getPool<T>(poolType);
    return records.filter(predicate);
  }

  /**
   * Get a random record from a pool
   */
  getRandomRecord<T extends MockDataRecord = MockDataRecord>(poolType: MockDataPoolType): T | undefined {
    const records = this.getPool<T>(poolType);
    if (records.length === 0) return undefined;
    return records[Math.floor(Math.random() * records.length)];
  }

  /**
   * Get a record by ID
   */
  getById<T extends MockDataRecord = MockDataRecord>(
    poolType: MockDataPoolType,
    id: string
  ): T | undefined {
    return this.findRecord<T>(poolType, (r) => r.id === id);
  }

  /**
   * Add a record to a pool (runtime only, not persisted)
   */
  addRecord<T extends MockDataRecord>(poolType: MockDataPoolType, record: T): void {
    const pool = this.pools.get(poolType);
    if (!pool) {
      console.error(`❌ Cannot add record: pool '${poolType}' not found`);
      return;
    }
    pool.records.push(record);
    console.log(`➕ Added record to ${poolType} pool:`, record.id);
  }

  /**
   * Update a record in a pool (runtime only, not persisted)
   */
  updateRecord<T extends MockDataRecord>(
    poolType: MockDataPoolType,
    id: string,
    updates: Partial<T>
  ): T | undefined {
    const pool = this.pools.get(poolType);
    if (!pool) {
      console.error(`❌ Cannot update record: pool '${poolType}' not found`);
      return undefined;
    }

    const index = pool.records.findIndex(r => r.id === id);
    if (index === -1) {
      console.error(`❌ Record '${id}' not found in ${poolType} pool`);
      return undefined;
    }

    pool.records[index] = { ...pool.records[index], ...updates };
    console.log(`✏️ Updated record in ${poolType} pool:`, id);
    return pool.records[index] as T;
  }

  /**
   * Remove a record from a pool (runtime only, not persisted)
   */
  removeRecord(poolType: MockDataPoolType, id: string): boolean {
    const pool = this.pools.get(poolType);
    if (!pool) {
      console.error(`❌ Cannot remove record: pool '${poolType}' not found`);
      return false;
    }

    const index = pool.records.findIndex(r => r.id === id);
    if (index === -1) {
      return false;
    }

    pool.records.splice(index, 1);
    console.log(`🗑️ Removed record from ${poolType} pool:`, id);
    return true;
  }

  // =========================================================================
  // NEMT-Specific Helper Methods
  // =========================================================================

  /**
   * Find a member by member ID
   */
  findMemberById(memberId: string): NEMTMember | undefined {
    return this.findRecord<NEMTMember>('members', (m) =>
      m.memberId.toLowerCase() === memberId.toLowerCase()
    );
  }

  /**
   * Find a member by phone number
   */
  findMemberByPhone(phone: string): NEMTMember | undefined {
    const normalizedPhone = phone.replace(/\D/g, '');
    return this.findRecord<NEMTMember>('members', (m) =>
      m.phone.replace(/\D/g, '') === normalizedPhone
    );
  }

  /**
   * Find facilities by name (partial match)
   */
  searchFacilities(query: string): Facility[] {
    const lowerQuery = query.toLowerCase();
    return this.findRecords<Facility>('facilities', (f) =>
      f.name.toLowerCase().includes(lowerQuery) ||
      f.address.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Find a ride by confirmation number
   */
  findRideByConfirmation(confirmationNumber: string): RideBooking | undefined {
    return this.findRecord<RideBooking>('rides', (r) =>
      r.confirmationNumber.toLowerCase() === confirmationNumber.toLowerCase()
    );
  }

  /**
   * Get all rides for a member
   */
  getRidesForMember(memberId: string): RideBooking[] {
    return this.findRecords<RideBooking>('rides', (r) =>
      r.memberId.toLowerCase() === memberId.toLowerCase()
    );
  }

  /**
   * Get a random driver
   */
  getRandomDriver(): Driver | undefined {
    return this.getRandomRecord<Driver>('drivers');
  }

  /**
   * Search addresses (for autocomplete)
   */
  searchAddresses(query: string, city?: string): AddressRecord[] {
    const lowerQuery = query.toLowerCase();
    return this.findRecords<AddressRecord>('addresses', (a) => {
      const matchesStreet = a.street.toLowerCase().includes(lowerQuery);
      const matchesCity = !city || (a.city?.toLowerCase() === city.toLowerCase());
      return matchesStreet && matchesCity;
    });
  }

  // =========================================================================
  // Dental-Specific Helper Methods
  // =========================================================================

  /**
   * Find a patient by phone number
   */
  findPatientByPhone(phone: string): Patient | undefined {
    const normalizedPhone = phone.replace(/\D/g, '');
    return this.findRecord<Patient>('patients', (p) =>
      p.phone.replace(/\D/g, '') === normalizedPhone ||
      p.phone.replace(/\D/g, '').endsWith(normalizedPhone)
    );
  }

  /**
   * Get children for a patient
   */
  getChildrenForPatient(patientId: string): Child[] {
    return this.findRecords<Child>('children', (c) =>
      c.patientId === patientId
    );
  }

  /**
   * Get available appointment slots for a date
   */
  getAvailableSlots(date: string, timeRange?: 'morning' | 'afternoon' | 'evening'): AvailableSlot[] {
    return this.findRecords<AvailableSlot>('available_slots', (s) => {
      const matchesDate = s.date === date;
      const matchesTime = !timeRange || s.timeRange === timeRange;
      return matchesDate && matchesTime;
    });
  }

  /**
   * Get appointments for a patient
   */
  getAppointmentsForPatient(patientId: string): Appointment[] {
    return this.findRecords<Appointment>('appointments', (a) =>
      a.patientId === patientId
    );
  }

  // =========================================================================
  // Utility Methods
  // =========================================================================

  /**
   * Get pool schema for validation
   */
  getPoolSchema(poolType: MockDataPoolType): typeof MOCK_DATA_POOL_SCHEMAS[typeof poolType] {
    return MOCK_DATA_POOL_SCHEMAS[poolType];
  }

  /**
   * Get pool statistics
   */
  getPoolStats(): Record<MockDataPoolType, number> {
    const stats: Partial<Record<MockDataPoolType, number>> = {};
    this.pools.forEach((pool, type) => {
      stats[type] = pool.records.length;
    });
    return stats as Record<MockDataPoolType, number>;
  }

  /**
   * Clear all pools
   */
  clear(): void {
    this.pools.clear();
    this.demoConfigId = null;
    console.log('🗑️ Cleared all mock data pools');
  }

  /**
   * Generate a new unique ID for a pool type
   */
  generateId(poolType: MockDataPoolType): string {
    const prefix = poolType.toUpperCase().substring(0, 3);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }
}

// Export a singleton instance for convenience
export const mockDataService = new MockDataService();
