/**
 * Demo Configuration Types
 *
 * These types define the structure for dynamically configurable demo scenarios.
 * Each demo can have its own business profile, AI agent settings, conversation
 * flow, tool configurations, SMS templates, and UI customization.
 */

// ============================================================================
// CORE DEMO CONFIG
// ============================================================================

export interface DemoConfig {
  id: string;
  slug: string;
  name: string;
  description?: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;

  // Related configurations
  businessProfile: BusinessProfile;
  agentConfig: AgentConfig;
  scenario: ScenarioConfig;
  toolConfigs: ToolConfig[];
  smsTemplates: SMSTemplate[];
  uiLabels: UILabels;
  mockDataPools: MockDataPool[];
  ambientAudio?: AmbientAudioConfig;
}

// ============================================================================
// BUSINESS PROFILE
// ============================================================================

export interface BusinessProfile {
  id: string;
  demoConfigId: string;
  organizationName: string;
  address: Address;
  phoneNumber: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  hours: BusinessHours;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface BusinessHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export interface DayHours {
  open: string;   // "08:00" or "closed"
  close: string;  // "17:00" or "closed"
  isOpen: boolean;
}

// ============================================================================
// AI AGENT CONFIG
// ============================================================================

export interface AgentConfig {
  id: string;
  demoConfigId: string;
  agentName: string;
  voiceName: VoiceName;
  personalityDescription?: string;
  systemPrompt: string;
  openingScript?: string;
  closingScript?: string;
  objectionHandling: ObjectionResponse[];
}

export type VoiceName =
  | 'alloy'
  | 'echo'
  | 'fable'
  | 'onyx'
  | 'nova'
  | 'shimmer'
  | 'Zephyr'
  | 'Puck'
  | 'Charon'
  | 'Kore'
  | 'Fenrir'
  | 'Aoede';

export interface ObjectionResponse {
  objection: string;   // e.g., "Is this a scam?"
  response: string;    // e.g., "I completely understand your caution..."
}

// ============================================================================
// SCENARIO CONFIG
// ============================================================================

export interface ScenarioConfig {
  id: string;
  demoConfigId: string;
  callDirection: 'inbound' | 'outbound';
  useCase: string;
  targetAudience?: string;
  demoPatientData: DemoPatientData;
  keyTalkingPoints: string[];
  edgeCases: EdgeCase[];
}

export interface DemoPatientData {
  parentName: string;
  phoneNumber: string;
  address: Address;
  preferredLanguage?: string;
  children: DemoChild[];
  notes?: string;
}

export interface DemoChild {
  name: string;
  age: number;
  medicaidId?: string;
  dateOfBirth?: string;
  specialNeeds?: string;
}

export interface EdgeCase {
  scenario: string;
  handling: string;
}

// ============================================================================
// MOCK DATA POOLS
// ============================================================================

export type MockDataPoolType =
  // Dental pools
  | 'patients'
  | 'children'
  | 'appointments'
  | 'available_slots'
  // NEMT pools
  | 'members'
  | 'facilities'
  | 'rides'
  | 'drivers'
  | 'addresses';

export interface MockDataPool {
  id: string;
  demoConfigId: string;
  poolType: MockDataPoolType;
  poolName: string;
  records: MockDataRecord[];
  schema?: MockDataSchema;
  createdAt?: string;
  updatedAt?: string;
}

export interface MockDataRecord {
  id: string;
  [key: string]: unknown;
}

export interface MockDataSchema {
  type: 'object';
  properties: Record<string, MockDataFieldSchema>;
  required?: string[];
}

export interface MockDataFieldSchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
  default?: unknown;
}

export interface MockDataPoolRow {
  id: string;
  demo_config_id: string;
  pool_type: string;
  pool_name: string;
  records_json: string;
  schema_json: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Predefined schemas for known mock data pool types.
 * These define the expected structure of records in each pool.
 */
export const MOCK_DATA_POOL_SCHEMAS: Record<MockDataPoolType, MockDataSchema> = {
  // =========================================================================
  // NEMT Schemas
  // =========================================================================
  members: {
    type: 'object',
    properties: {
      memberId: { type: 'string', description: 'Member ID (e.g., M987654321)' },
      firstName: { type: 'string', description: 'First name' },
      lastName: { type: 'string', description: 'Last name' },
      dateOfBirth: { type: 'string', description: 'Date of birth (YYYY-MM-DD)' },
      phone: { type: 'string', description: 'Phone number' },
      addressStreet: { type: 'string', description: 'Street address' },
      addressApartment: { type: 'string', description: 'Apartment/Unit' },
      addressCity: { type: 'string', description: 'City' },
      addressState: { type: 'string', description: 'State' },
      addressZip: { type: 'string', description: 'ZIP code' },
      planType: { type: 'string', enum: ['Medicaid', 'Medicare', 'Dual'], description: 'Insurance plan type' },
      eligibilityStatus: { type: 'string', enum: ['active', 'inactive', 'pending'], description: 'Eligibility status' },
      assistanceType: { type: 'string', enum: ['ambulatory', 'wheelchair', 'stretcher', 'wheelchair_xl'], description: 'Mobility assistance type' },
      totalRidesAllowed: { type: 'number', description: 'Monthly ride limit' },
      ridesUsed: { type: 'number', description: 'Rides used this period' },
      benefitResetDate: { type: 'string', description: 'Date when rides reset (YYYY-MM-DD)' },
      notes: { type: 'string', description: 'Member notes' }
    },
    required: ['memberId', 'firstName', 'lastName', 'dateOfBirth', 'phone']
  },
  facilities: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Facility name' },
      address: { type: 'string', description: 'Full street address' },
      city: { type: 'string', description: 'City' },
      state: { type: 'string', description: 'State' },
      zip: { type: 'string', description: 'ZIP code' },
      facilityType: { type: 'string', enum: ['hospital', 'clinic', 'dialysis', 'pharmacy', 'imaging', 'other'], description: 'Type of facility' },
      phone: { type: 'string', description: 'Facility phone number' }
    },
    required: ['name', 'address']
  },
  rides: {
    type: 'object',
    properties: {
      confirmationNumber: { type: 'string', description: 'Confirmation number (e.g., CC-847291)' },
      memberId: { type: 'string', description: 'Member ID' },
      status: { type: 'string', enum: ['confirmed', 'pending', 'completed', 'cancelled', 'in_progress'], description: 'Ride status' },
      tripType: { type: 'string', enum: ['one_way', 'round_trip'], description: 'Trip type' },
      pickupDate: { type: 'string', description: 'Pickup date (YYYY-MM-DD)' },
      pickupTime: { type: 'string', description: 'Pickup time (HH:MM)' },
      pickupAddress: { type: 'string', description: 'Full pickup address' },
      dropoffAddress: { type: 'string', description: 'Full dropoff address' },
      facilityName: { type: 'string', description: 'Destination facility name' },
      appointmentTime: { type: 'string', description: 'Appointment time (HH:MM)' },
      assistanceType: { type: 'string', enum: ['ambulatory', 'wheelchair', 'stretcher', 'wheelchair_xl'], description: 'Assistance type' },
      returnTripType: { type: 'string', enum: ['scheduled', 'will_call'], description: 'Return trip type' },
      returnPickupTime: { type: 'string', description: 'Return pickup time (HH:MM)' },
      driverName: { type: 'string', description: 'Assigned driver name' },
      vehicleInfo: { type: 'string', description: 'Vehicle description' },
      eta: { type: 'number', description: 'ETA in minutes' }
    },
    required: ['confirmationNumber', 'memberId', 'status']
  },
  drivers: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Driver name (e.g., Marcus W.)' },
      vehicle: { type: 'string', description: 'Vehicle description with plate' },
      phone: { type: 'string', description: 'Driver phone number' },
      vehicleType: { type: 'string', enum: ['sedan', 'suv', 'wheelchair_van', 'stretcher_van'], description: 'Vehicle type' }
    },
    required: ['name', 'vehicle']
  },
  addresses: {
    type: 'object',
    properties: {
      street: { type: 'string', description: 'Street address' },
      city: { type: 'string', description: 'City' },
      state: { type: 'string', description: 'State' },
      zip: { type: 'string', description: 'ZIP code' },
      type: { type: 'string', enum: ['residential', 'medical', 'commercial'], description: 'Address type' }
    },
    required: ['street']
  },

  // =========================================================================
  // Dental Schemas
  // =========================================================================
  patients: {
    type: 'object',
    properties: {
      patientId: { type: 'string', description: 'Patient ID' },
      parentName: { type: 'string', description: 'Parent/guardian name' },
      phone: { type: 'string', description: 'Phone number' },
      addressStreet: { type: 'string', description: 'Street address' },
      addressCity: { type: 'string', description: 'City' },
      addressState: { type: 'string', description: 'State' },
      addressZip: { type: 'string', description: 'ZIP code' },
      preferredLanguage: { type: 'string', description: 'Preferred language', default: 'English' },
      notes: { type: 'string', description: 'Patient notes' }
    },
    required: ['patientId', 'parentName', 'phone']
  },
  children: {
    type: 'object',
    properties: {
      patientId: { type: 'string', description: 'Parent patient ID' },
      name: { type: 'string', description: 'Child name' },
      age: { type: 'number', description: 'Age' },
      medicaidId: { type: 'string', description: 'Medicaid ID' },
      dateOfBirth: { type: 'string', description: 'Date of birth (YYYY-MM-DD)' },
      specialNeeds: { type: 'string', description: 'Special needs notes' }
    },
    required: ['name', 'age']
  },
  appointments: {
    type: 'object',
    properties: {
      bookingId: { type: 'string', description: 'Booking ID' },
      patientId: { type: 'string', description: 'Patient ID' },
      appointmentTime: { type: 'string', description: 'ISO datetime' },
      appointmentType: { type: 'string', enum: ['exam', 'cleaning', 'exam_and_cleaning', 'emergency'], description: 'Appointment type' },
      status: { type: 'string', enum: ['pending', 'confirmed', 'completed', 'cancelled'], description: 'Appointment status' },
      location: { type: 'string', description: 'Clinic location' },
      childNames: { type: 'array', description: 'Names of children for this appointment' }
    },
    required: ['bookingId', 'appointmentTime', 'appointmentType']
  },
  available_slots: {
    type: 'object',
    properties: {
      date: { type: 'string', description: 'Date (YYYY-MM-DD)' },
      time: { type: 'string', description: 'Time (HH:MM)' },
      datetime: { type: 'string', description: 'ISO datetime' },
      availableChairs: { type: 'number', description: 'Number of available chairs' },
      timeRange: { type: 'string', enum: ['morning', 'afternoon', 'evening'], description: 'Time range' },
      canAccommodate: { type: 'boolean', description: 'Can accommodate multiple children' }
    },
    required: ['date', 'time']
  }
};

/**
 * Get default pool name for a given pool type
 */
export function getDefaultPoolName(poolType: MockDataPoolType): string {
  const names: Record<MockDataPoolType, string> = {
    members: 'NEMT Members',
    facilities: 'Medical Facilities',
    rides: 'Ride Bookings',
    drivers: 'Drivers',
    addresses: 'Address Book',
    patients: 'Patients',
    children: 'Children',
    appointments: 'Appointments',
    available_slots: 'Available Slots'
  };
  return names[poolType];
}

/**
 * Get pool types relevant to a demo based on its tool configurations
 */
export function getRelevantPoolTypes(toolConfigs: ToolConfig[]): MockDataPoolType[] {
  const toolNames = toolConfigs.map(t => t.toolName);
  const poolTypes: MockDataPoolType[] = [];

  // NEMT tools -> NEMT pools
  const nemtTools = ['verify_member', 'get_member_info', 'check_ride_eligibility', 'book_ride', 'get_ride_status', 'cancel_ride', 'update_ride', 'add_companion', 'check_nemt_availability', 'search_address'];
  if (nemtTools.some(t => toolNames.includes(t))) {
    poolTypes.push('members', 'facilities', 'rides', 'drivers', 'addresses');
  }

  // Dental tools -> Dental pools
  const dentalTools = ['check_availability', 'book_appointment', 'get_patient_info', 'reschedule_appointment', 'cancel_appointment', 'get_appointment_history'];
  if (dentalTools.some(t => toolNames.includes(t))) {
    poolTypes.push('patients', 'children', 'appointments', 'available_slots');
  }

  return [...new Set(poolTypes)]; // Remove duplicates
}

// ============================================================================
// TOOL CONFIG
// ============================================================================

export interface ToolConfig {
  id: string;
  demoConfigId: string;
  toolName: string;
  toolType: 'predefined' | 'custom';
  isEnabled: boolean;
  displayName: string;
  description: string;
  parametersSchema: ToolParameterSchema;
  mockResponseTemplate?: string;
  mockResponseDelayMs: number;
}

export interface ToolParameterSchema {
  type: 'object';
  properties: Record<string, ParameterDefinition>;
  required: string[];
}

export interface ParameterDefinition {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: string[];
  items?: ParameterDefinition;
  default?: unknown;
}

// ============================================================================
// SMS TEMPLATES
// ============================================================================

export interface SMSTemplate {
  id: string;
  demoConfigId: string;
  templateType: 'confirmation' | 'reminder' | 'cancellation' | 'custom';
  templateName: string;
  senderName: string;
  messageTemplate: string;
}

// ============================================================================
// AMBIENT AUDIO CONFIG
// ============================================================================

export interface AmbientAudioConfig {
  enabled: boolean;
  volume: number;  // 0-1 scale
  audioFile: string;  // Path to audio file (e.g., '/audio/office-ambience.mp3')
}

// ============================================================================
// UI LABELS
// ============================================================================

export interface UILabels {
  id: string;
  demoConfigId: string;
  headerText: string;
  headerBadge: string;
  footerText: string;
  heroTitle: string;
  heroSubtitle?: string;
  userSpeakerLabel: string;
  agentSpeakerLabel: string;
  callButtonText: string;
  endCallButtonText: string;
  badgeText: string;
}

// ============================================================================
// WIZARD STATE
// ============================================================================

export type WizardStep =
  | 'script-import'
  | 'business-profile'
  | 'agent-config'
  | 'scenario'
  | 'tools'
  | 'sms-templates'
  | 'ui-labels'
  | 'preview'
  | 'save';

export interface WizardState {
  currentStep: WizardStep;
  isAiParsing: boolean;
  aiParseError?: string;
  rawScript?: string;
  demoConfig: Partial<DemoConfig>;
  validationErrors: Record<string, string[]>;
  isDirty: boolean;
}

// ============================================================================
// AI PARSING
// ============================================================================

export interface AIParseRequest {
  rawScript: string;
  additionalContext?: string;
}

export interface AIParseResult {
  success: boolean;
  extractedConfig: Partial<DemoConfig>;
  confidence: number;
  suggestions: string[];
  warnings: string[];
}

// ============================================================================
// DATABASE ROW TYPES (for mapping from SQLite)
// ============================================================================

export interface DemoConfigRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_active: number;
  is_default: number;
  ambient_audio_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessProfileRow {
  id: string;
  demo_config_id: string;
  organization_name: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  phone_number: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  hours_json: string | null;
  created_at: string;
}

export interface AgentConfigRow {
  id: string;
  demo_config_id: string;
  agent_name: string;
  voice_name: string;
  personality_description: string | null;
  system_prompt: string;
  opening_script: string | null;
  closing_script: string | null;
  objection_handling_json: string | null;
  created_at: string;
}

export interface ScenarioRow {
  id: string;
  demo_config_id: string;
  call_direction: string;
  use_case: string;
  target_audience: string | null;
  demo_patient_data_json: string | null;
  key_talking_points_json: string | null;
  edge_cases_json: string | null;
  created_at: string;
}

export interface ToolConfigRow {
  id: string;
  demo_config_id: string;
  tool_name: string;
  tool_type: string;
  is_enabled: number;
  display_name: string | null;
  description: string | null;
  parameters_schema_json: string | null;
  mock_response_template: string | null;
  mock_response_delay_ms: number;
  created_at: string;
}

export interface SMSTemplateRow {
  id: string;
  demo_config_id: string;
  template_type: string;
  template_name: string;
  sender_name: string;
  message_template: string;
  created_at: string;
}

export interface UILabelsRow {
  id: string;
  demo_config_id: string;
  header_text: string;
  header_badge: string;
  footer_text: string;
  hero_title: string;
  hero_subtitle: string | null;
  user_speaker_label: string;
  agent_speaker_label: string;
  call_button_text: string;
  end_call_button_text: string;
  badge_text: string;
  created_at: string;
}

// ============================================================================
// PREDEFINED TOOLS REGISTRY
// ============================================================================

export type PredefinedToolName =
  // Healthcare/Dental tools
  | 'check_availability'
  | 'book_appointment'
  | 'get_patient_info'
  | 'send_confirmation_sms'
  | 'reschedule_appointment'
  | 'cancel_appointment'
  | 'get_appointment_history'
  | 'add_appointment_notes'
  | 'send_appointment_reminder'
  | 'check_insurance_eligibility'
  | 'get_clinic_hours'
  | 'get_directions'
  | 'get_available_services'
  | 'get_appointment_preparation'
  // NEMT (Non-Emergency Medical Transportation) tools
  | 'verify_member'
  | 'get_member_info'
  | 'check_ride_eligibility'
  | 'search_address'
  | 'book_ride'
  | 'get_ride_status'
  | 'cancel_ride'
  | 'update_ride'
  | 'add_companion'
  | 'check_nemt_availability';

export const PREDEFINED_TOOLS: Record<PredefinedToolName, Omit<ToolConfig, 'id' | 'demoConfigId'>> = {
  check_availability: {
    toolName: 'check_availability',
    toolType: 'predefined',
    isEnabled: true,
    displayName: 'Check Availability',
    description: 'Check available appointment slots for a specific date and time range',
    parametersSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date to check (YYYY-MM-DD)' },
        time_range: { type: 'string', enum: ['morning', 'afternoon', 'evening'], description: 'Time preference' },
        num_children: { type: 'number', description: 'Number of children to schedule' }
      },
      required: ['date', 'time_range', 'num_children']
    },
    mockResponseDelayMs: 300
  },
  book_appointment: {
    toolName: 'book_appointment',
    toolType: 'predefined',
    isEnabled: true,
    displayName: 'Book Appointment',
    description: 'Book an appointment for specified children',
    parametersSchema: {
      type: 'object',
      properties: {
        child_names: { type: 'array', items: { type: 'string' }, description: 'Names of children' },
        appointment_time: { type: 'string', description: 'ISO 8601 datetime' },
        appointment_type: { type: 'string', enum: ['exam', 'cleaning', 'exam_and_cleaning', 'emergency'], description: 'Type of appointment' }
      },
      required: ['child_names', 'appointment_time', 'appointment_type']
    },
    mockResponseDelayMs: 400
  },
  get_patient_info: {
    toolName: 'get_patient_info',
    toolType: 'predefined',
    isEnabled: true,
    displayName: 'Get Patient Info',
    description: 'Retrieve patient information from the database',
    parametersSchema: {
      type: 'object',
      properties: {
        phone_number: { type: 'string', description: 'Patient phone number' }
      },
      required: ['phone_number']
    },
    mockResponseDelayMs: 200
  },
  send_confirmation_sms: {
    toolName: 'send_confirmation_sms',
    toolType: 'predefined',
    isEnabled: true,
    displayName: 'Send SMS Confirmation',
    description: 'Send appointment confirmation via SMS (requires explicit consent)',
    parametersSchema: {
      type: 'object',
      properties: {
        phone_number: { type: 'string', description: 'Phone number to send SMS to' },
        appointment_details: { type: 'string', description: 'Appointment details to include' }
      },
      required: ['phone_number', 'appointment_details']
    },
    mockResponseDelayMs: 500
  },
  reschedule_appointment: {
    toolName: 'reschedule_appointment',
    toolType: 'predefined',
    isEnabled: false,
    displayName: 'Reschedule Appointment',
    description: 'Reschedule an existing appointment to a new time',
    parametersSchema: {
      type: 'object',
      properties: {
        booking_id: { type: 'string', description: 'Existing booking ID' },
        new_appointment_time: { type: 'string', description: 'New ISO 8601 datetime' },
        reason: { type: 'string', description: 'Reason for rescheduling' }
      },
      required: ['booking_id', 'new_appointment_time']
    },
    mockResponseDelayMs: 400
  },
  cancel_appointment: {
    toolName: 'cancel_appointment',
    toolType: 'predefined',
    isEnabled: false,
    displayName: 'Cancel Appointment',
    description: 'Cancel an existing appointment',
    parametersSchema: {
      type: 'object',
      properties: {
        booking_id: { type: 'string', description: 'Booking ID to cancel' },
        reason: { type: 'string', description: 'Reason for cancellation' }
      },
      required: ['booking_id']
    },
    mockResponseDelayMs: 300
  },
  get_appointment_history: {
    toolName: 'get_appointment_history',
    toolType: 'predefined',
    isEnabled: false,
    displayName: 'Get Appointment History',
    description: 'Retrieve past appointments for current patient',
    parametersSchema: {
      type: 'object',
      properties: {},
      required: []
    },
    mockResponseDelayMs: 200
  },
  add_appointment_notes: {
    toolName: 'add_appointment_notes',
    toolType: 'predefined',
    isEnabled: false,
    displayName: 'Add Appointment Notes',
    description: 'Add notes to an existing appointment',
    parametersSchema: {
      type: 'object',
      properties: {
        booking_id: { type: 'string', description: 'Booking ID' },
        notes: { type: 'string', description: 'Notes to add' }
      },
      required: ['booking_id', 'notes']
    },
    mockResponseDelayMs: 200
  },
  send_appointment_reminder: {
    toolName: 'send_appointment_reminder',
    toolType: 'predefined',
    isEnabled: false,
    displayName: 'Send Appointment Reminder',
    description: 'Send a reminder SMS for upcoming appointment',
    parametersSchema: {
      type: 'object',
      properties: {
        phone_number: { type: 'string', description: 'Phone number' },
        patient_name: { type: 'string', description: 'Patient name' },
        child_name: { type: 'string', description: 'Child name' },
        appointment_time: { type: 'string', description: 'Appointment time' },
        location: { type: 'string', description: 'Location' }
      },
      required: ['phone_number', 'patient_name', 'child_name', 'appointment_time', 'location']
    },
    mockResponseDelayMs: 500
  },
  check_insurance_eligibility: {
    toolName: 'check_insurance_eligibility',
    toolType: 'predefined',
    isEnabled: false,
    displayName: 'Check Insurance Eligibility',
    description: 'Verify Medicaid/insurance coverage',
    parametersSchema: {
      type: 'object',
      properties: {
        medicaid_id: { type: 'string', description: 'Medicaid ID' },
        child_name: { type: 'string', description: 'Child name' },
        date_of_birth: { type: 'string', description: 'Date of birth' }
      },
      required: ['medicaid_id', 'child_name', 'date_of_birth']
    },
    mockResponseDelayMs: 600
  },
  get_clinic_hours: {
    toolName: 'get_clinic_hours',
    toolType: 'predefined',
    isEnabled: true,
    displayName: 'Get Clinic Hours',
    description: 'Get clinic operating hours',
    parametersSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Optional date (YYYY-MM-DD)' }
      },
      required: []
    },
    mockResponseDelayMs: 100
  },
  get_directions: {
    toolName: 'get_directions',
    toolType: 'predefined',
    isEnabled: true,
    displayName: 'Get Directions',
    description: 'Get clinic location and directions',
    parametersSchema: {
      type: 'object',
      properties: {
        from_address: { type: 'string', description: 'Starting address' }
      },
      required: []
    },
    mockResponseDelayMs: 200
  },
  get_available_services: {
    toolName: 'get_available_services',
    toolType: 'predefined',
    isEnabled: true,
    displayName: 'Get Available Services',
    description: 'List available dental services',
    parametersSchema: {
      type: 'object',
      properties: {},
      required: []
    },
    mockResponseDelayMs: 100
  },
  get_appointment_preparation: {
    toolName: 'get_appointment_preparation',
    toolType: 'predefined',
    isEnabled: true,
    displayName: 'Get Appointment Preparation',
    description: 'Get information on what to bring/prepare for appointment',
    parametersSchema: {
      type: 'object',
      properties: {},
      required: []
    },
    mockResponseDelayMs: 100
  },

  // ============================================================================
  // NEMT (Non-Emergency Medical Transportation) TOOLS
  // ============================================================================

  verify_member: {
    toolName: 'verify_member',
    toolType: 'predefined',
    isEnabled: true,
    displayName: 'Verify Member',
    description: 'Verify member identity using Member ID, name, and date of birth',
    parametersSchema: {
      type: 'object',
      properties: {
        member_id: { type: 'string', description: 'Member ID number' },
        first_name: { type: 'string', description: 'Member first name' },
        last_name: { type: 'string', description: 'Member last name' },
        date_of_birth: { type: 'string', description: 'Date of birth (YYYY-MM-DD)' }
      },
      required: ['member_id', 'first_name', 'last_name', 'date_of_birth']
    },
    mockResponseDelayMs: 400
  },

  get_member_info: {
    toolName: 'get_member_info',
    toolType: 'predefined',
    isEnabled: true,
    displayName: 'Get Member Info',
    description: 'Retrieve full member profile including address, assistance type, and ride history',
    parametersSchema: {
      type: 'object',
      properties: {
        member_id: { type: 'string', description: 'Member ID number' }
      },
      required: ['member_id']
    },
    mockResponseDelayMs: 300
  },

  check_ride_eligibility: {
    toolName: 'check_ride_eligibility',
    toolType: 'predefined',
    isEnabled: true,
    displayName: 'Check Ride Eligibility',
    description: 'Check remaining rides and eligibility status for the current benefit period',
    parametersSchema: {
      type: 'object',
      properties: {
        member_id: { type: 'string', description: 'Member ID number' }
      },
      required: ['member_id']
    },
    mockResponseDelayMs: 300
  },

  search_address: {
    toolName: 'search_address',
    toolType: 'predefined',
    isEnabled: true,
    displayName: 'Search Address',
    description: 'Validate and autocomplete an address for pickup or dropoff',
    parametersSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Address search query' },
        city: { type: 'string', description: 'City to filter results' },
        state: { type: 'string', description: 'State to filter results' }
      },
      required: ['query']
    },
    mockResponseDelayMs: 200
  },

  book_ride: {
    toolName: 'book_ride',
    toolType: 'predefined',
    isEnabled: true,
    displayName: 'Book Ride',
    description: 'Book a one-way or round-trip medical transportation ride',
    parametersSchema: {
      type: 'object',
      properties: {
        member_id: { type: 'string', description: 'Member ID number' },
        trip_type: { type: 'string', enum: ['one_way', 'round_trip'], description: 'Type of trip' },
        pickup_address: { type: 'string', description: 'Full pickup address' },
        pickup_city: { type: 'string', description: 'Pickup city' },
        pickup_state: { type: 'string', description: 'Pickup state' },
        pickup_zip: { type: 'string', description: 'Pickup ZIP code' },
        dropoff_address: { type: 'string', description: 'Full dropoff address' },
        dropoff_city: { type: 'string', description: 'Dropoff city' },
        dropoff_state: { type: 'string', description: 'Dropoff state' },
        dropoff_zip: { type: 'string', description: 'Dropoff ZIP code' },
        pickup_date: { type: 'string', description: 'Pickup date (YYYY-MM-DD)' },
        pickup_time: { type: 'string', description: 'Pickup time (HH:MM)' },
        appointment_time: { type: 'string', description: 'Appointment time (HH:MM)' },
        assistance_type: { type: 'string', enum: ['ambulatory', 'wheelchair', 'stretcher', 'wheelchair_xl'], description: 'Type of mobility assistance needed' },
        facility_name: { type: 'string', description: 'Name of medical facility' },
        return_trip_type: { type: 'string', enum: ['scheduled', 'will_call'], description: 'Return trip type' },
        return_pickup_time: { type: 'string', description: 'Return pickup time if scheduled (HH:MM)' },
        notes: { type: 'string', description: 'Additional notes or special instructions' }
      },
      required: ['member_id', 'trip_type', 'pickup_address', 'pickup_city', 'pickup_state', 'pickup_zip', 'dropoff_address', 'dropoff_city', 'dropoff_state', 'dropoff_zip', 'pickup_date', 'pickup_time', 'appointment_time', 'assistance_type']
    },
    mockResponseDelayMs: 600
  },

  get_ride_status: {
    toolName: 'get_ride_status',
    toolType: 'predefined',
    isEnabled: true,
    displayName: 'Get Ride Status',
    description: 'Check the status of an existing ride using confirmation number',
    parametersSchema: {
      type: 'object',
      properties: {
        confirmation_number: { type: 'string', description: 'Ride confirmation number' }
      },
      required: ['confirmation_number']
    },
    mockResponseDelayMs: 300
  },

  cancel_ride: {
    toolName: 'cancel_ride',
    toolType: 'predefined',
    isEnabled: true,
    displayName: 'Cancel Ride',
    description: 'Cancel a scheduled ride',
    parametersSchema: {
      type: 'object',
      properties: {
        confirmation_number: { type: 'string', description: 'Ride confirmation number' },
        reason: { type: 'string', description: 'Reason for cancellation' }
      },
      required: ['confirmation_number']
    },
    mockResponseDelayMs: 400
  },

  update_ride: {
    toolName: 'update_ride',
    toolType: 'predefined',
    isEnabled: true,
    displayName: 'Update Ride',
    description: 'Modify details of an existing ride',
    parametersSchema: {
      type: 'object',
      properties: {
        confirmation_number: { type: 'string', description: 'Ride confirmation number' },
        pickup_time: { type: 'string', description: 'New pickup time (HH:MM)' },
        pickup_date: { type: 'string', description: 'New pickup date (YYYY-MM-DD)' },
        appointment_time: { type: 'string', description: 'New appointment time (HH:MM)' },
        return_trip_type: { type: 'string', enum: ['scheduled', 'will_call'], description: 'Return trip type' },
        return_pickup_time: { type: 'string', description: 'Return pickup time if scheduled (HH:MM)' },
        notes: { type: 'string', description: 'Additional notes' }
      },
      required: ['confirmation_number']
    },
    mockResponseDelayMs: 400
  },

  add_companion: {
    toolName: 'add_companion',
    toolType: 'predefined',
    isEnabled: true,
    displayName: 'Add Companion',
    description: 'Add a companion to travel with the member on their ride',
    parametersSchema: {
      type: 'object',
      properties: {
        confirmation_number: { type: 'string', description: 'Ride confirmation number' },
        companion_name: { type: 'string', description: 'Companion full name' },
        companion_phone: { type: 'string', description: 'Companion phone number' },
        relationship: { type: 'string', description: 'Relationship to member (optional)' }
      },
      required: ['confirmation_number', 'companion_name', 'companion_phone']
    },
    mockResponseDelayMs: 300
  },

  check_nemt_availability: {
    toolName: 'check_nemt_availability',
    toolType: 'predefined',
    isEnabled: true,
    displayName: 'Check NEMT Availability',
    description: 'Check vehicle availability for a specific date, time, and location',
    parametersSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date to check (YYYY-MM-DD)' },
        time: { type: 'string', description: 'Time to check (HH:MM)' },
        pickup_zip: { type: 'string', description: 'Pickup ZIP code' },
        assistance_type: { type: 'string', enum: ['ambulatory', 'wheelchair', 'stretcher', 'wheelchair_xl'], description: 'Type of vehicle needed' }
      },
      required: ['date', 'time', 'pickup_zip', 'assistance_type']
    },
    mockResponseDelayMs: 400
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get default business hours (Mon-Fri 8am-5pm)
 */
export function getDefaultBusinessHours(): BusinessHours {
  const weekday: DayHours = { open: '08:00', close: '17:00', isOpen: true };
  const weekend: DayHours = { open: 'closed', close: 'closed', isOpen: false };

  return {
    monday: weekday,
    tuesday: weekday,
    wednesday: weekday,
    thursday: weekday,
    friday: weekday,
    saturday: weekend,
    sunday: weekend
  };
}

/**
 * Create a new empty demo config with defaults
 */
export function createEmptyDemoConfig(): Partial<DemoConfig> {
  return {
    name: '',
    slug: '',
    description: '',
    isActive: false,
    isDefault: false,
    businessProfile: {
      id: '',
      demoConfigId: '',
      organizationName: '',
      address: { street: '', city: '', state: '', zip: '' },
      phoneNumber: '',
      primaryColor: '#3B82F6',
      secondaryColor: '#6366F1',
      hours: getDefaultBusinessHours()
    },
    agentConfig: {
      id: '',
      demoConfigId: '',
      agentName: 'AI Agent',
      voiceName: 'alloy',
      systemPrompt: '',
      objectionHandling: []
    },
    scenario: {
      id: '',
      demoConfigId: '',
      callDirection: 'outbound',
      useCase: '',
      demoPatientData: {
        parentName: '',
        phoneNumber: '',
        address: { street: '', city: '', state: '', zip: '' },
        children: []
      },
      keyTalkingPoints: [],
      edgeCases: []
    },
    toolConfigs: [],
    smsTemplates: [],
    mockDataPools: [],
    uiLabels: {
      id: '',
      demoConfigId: '',
      headerText: '',
      headerBadge: '(Demo)',
      footerText: '',
      heroTitle: '',
      userSpeakerLabel: 'Caller',
      agentSpeakerLabel: 'Agent',
      callButtonText: 'Start Demo Call',
      endCallButtonText: 'End Call',
      badgeText: 'VOICE AI DEMO'
    },
    ambientAudio: {
      enabled: false,
      volume: 0.3,
      audioFile: '/audio/office-ambience.mp3'
    }
  };
}

/**
 * Generate a URL-safe slug from a name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

/**
 * Interpolate template variables in a string
 * Replaces {{variableName}} with values from the context object
 */
export function interpolateTemplate(
  template: string,
  context: Record<string, string | number | undefined>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = context[key];
    return value !== undefined ? String(value) : match;
  });
}
