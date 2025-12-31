/**
 * DatabaseAdapter Interface
 *
 * Abstract interface for database operations that can be implemented
 * by different database providers (sql.js for browser, better-sqlite3 for Node.js)
 */
export interface PatientRecord {
    id: string;
    phoneNumber: string;
    parentName: string;
    address: {
        street: string;
        city: string;
        state: string;
        zip: string;
    };
    preferredLanguage?: string;
    lastVisit?: string;
    notes?: string;
    children: Child[];
}
export interface Child {
    id: number;
    patient_id: string;
    name: string;
    age: number;
    medicaid_id: string;
    date_of_birth?: string;
    special_needs?: string;
    created_at: string;
}
export interface Appointment {
    id: string;
    booking_id: string;
    patient_id: string;
    appointment_time: string;
    appointment_type: 'exam' | 'cleaning' | 'exam_and_cleaning' | 'emergency';
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
    location: string;
    confirmation_sent: boolean;
    confirmation_method?: string;
    confirmation_sid?: string;
    cancellation_reason?: string;
    created_at: string;
    updated_at: string;
    child_count?: number;
}
export interface CreateAppointmentData {
    id: string;
    booking_id?: string;
    patient_id: string;
    appointment_time: string;
    appointment_type: string;
    status?: string;
    location: string;
    confirmation_sent?: boolean;
    confirmation_method?: string;
    confirmation_sid?: string;
}
export interface AppointmentFilters {
    date?: string;
    status?: string[];
    patient_id?: string;
    booking_id?: string;
    from_date?: string;
    to_date?: string;
}
export interface Conversation {
    id: string;
    patient_id?: string;
    phone_number: string;
    direction: 'inbound' | 'outbound';
    provider: 'openai' | 'gemini';
    call_sid?: string;
    started_at: string;
    ended_at?: string;
    duration_seconds?: number;
    outcome?: string;
    outcome_details?: string;
}
export interface CreateConversationData {
    id: string;
    patient_id?: string;
    phone_number: string;
    direction: 'inbound' | 'outbound';
    provider: 'openai' | 'gemini';
    call_sid?: string;
    started_at: string;
}
export interface ConversationTurn {
    id?: number;
    conversation_id: string;
    turn_number: number;
    role: 'user' | 'assistant' | 'system';
    content_type: 'text' | 'audio' | 'function_call' | 'function_result';
    content_text?: string;
    audio_data?: Blob | Uint8Array;
    timestamp: string;
}
export interface FunctionCallLog {
    id?: number;
    conversation_id: string;
    call_id?: string;
    function_name: string;
    arguments: string;
    result?: string;
    status: 'pending' | 'success' | 'error';
    execution_time_ms?: number;
    timestamp: string;
    error_message?: string;
}
export interface AuditRecord {
    table_name: string;
    record_id: string;
    operation: 'INSERT' | 'UPDATE' | 'DELETE';
    field_name?: string;
    old_value?: any;
    new_value?: any;
    changed_by: string;
    change_reason?: string;
    metadata?: any;
}
export interface DatabaseAdapter {
    /**
     * Get patient by phone number
     */
    getPatient(phoneNumber: string): Promise<PatientRecord | null>;
    /**
     * Get patient by ID
     */
    getPatientById(id: string): Promise<PatientRecord | null>;
    /**
     * Create a new patient
     */
    createPatient(patient: Omit<PatientRecord, 'id'> & {
        id: string;
    }): Promise<string>;
    /**
     * Update an existing patient
     */
    updatePatient(id: string, updates: Partial<PatientRecord>): Promise<void>;
    /**
     * Delete a patient (cascades to children and appointments)
     */
    deletePatient(id: string): Promise<void>;
    /**
     * List all patients with pagination
     */
    listPatients(limit?: number, offset?: number): Promise<PatientRecord[]>;
    /**
     * Get all children for a patient
     */
    getChildrenByPatient(patientId: string): Promise<Child[]>;
    /**
     * Create a new child
     */
    createChild(patientId: string, child: Omit<Child, 'id' | 'patient_id' | 'created_at'>): Promise<number>;
    /**
     * Update a child
     */
    updateChild(childId: number, updates: Partial<Child>): Promise<void>;
    /**
     * Delete a child
     */
    deleteChild(childId: number): Promise<void>;
    /**
     * Create a new appointment
     */
    createAppointment(appointment: CreateAppointmentData): Promise<string>;
    /**
     * Get appointment by ID
     */
    getAppointment(appointmentId: string): Promise<Appointment | null>;
    /**
     * Update an appointment
     */
    updateAppointment(id: string, updates: Partial<Appointment>): Promise<void>;
    /**
     * List appointments with filters
     */
    listAppointments(filters: AppointmentFilters): Promise<Appointment[]>;
    /**
     * Link a child to an appointment
     */
    linkChildToAppointment(appointmentId: string, childId: number): Promise<void>;
    /**
     * Get children linked to an appointment
     */
    getAppointmentChildren(appointmentId: string): Promise<Child[]>;
    /**
     * Create a new conversation
     */
    createConversation(conversation: CreateConversationData): Promise<string>;
    /**
     * Get a conversation by ID
     */
    getConversation(conversationId: string): Promise<Conversation | null>;
    /**
     * End a conversation with outcome
     */
    endConversation(conversationId: string, data: {
        ended_at: string;
        duration_seconds: number;
        outcome: string;
        outcome_details?: string;
    }): Promise<void>;
    /**
     * Log a conversation turn
     */
    logConversationTurn(turn: Omit<ConversationTurn, 'id'>): Promise<number>;
    /**
     * Get conversation history (all turns)
     */
    getConversationHistory(conversationId: string): Promise<ConversationTurn[]>;
    /**
     * Get turn count for a conversation
     */
    getConversationTurnCount(conversationId: string): Promise<number>;
    /**
     * List conversations with filters
     */
    listConversations(filters?: {
        patient_id?: string;
        phone_number?: string;
        from_date?: string;
        to_date?: string;
        outcome?: string;
        limit?: number;
        offset?: number;
    }): Promise<Conversation[]>;
    /**
     * Log a function call
     */
    logFunctionCall(functionCall: Omit<FunctionCallLog, 'id'>): Promise<number>;
    /**
     * Update function call result
     */
    updateFunctionCallResult(id: number, data: {
        result: string;
        status: 'success' | 'error';
        execution_time_ms?: number;
        error_message?: string;
    }): Promise<void>;
    /**
     * Get all function calls for a conversation
     */
    getFunctionCalls(conversationId: string): Promise<FunctionCallLog[]>;
    /**
     * Update function call error
     */
    updateFunctionCallError(id: number, errorMessage: string): Promise<void>;
    /**
     * Log an audit trail entry
     */
    logAudit(audit: AuditRecord): Promise<void>;
    /**
     * Get audit records for a specific record
     */
    getAuditRecords(tableName: string, recordId: string): Promise<AuditRecord[]>;
    /**
     * Begin a transaction
     */
    beginTransaction(): Promise<void>;
    /**
     * Commit the current transaction
     */
    commit(): Promise<void>;
    /**
     * Rollback the current transaction
     */
    rollback(): Promise<void>;
    /**
     * Execute raw SQL (for admin console)
     */
    executeRawSQL(sql: string, params?: any[]): Promise<any>;
    /**
     * Get database statistics
     */
    getStats(): Promise<{
        patients_count: number;
        children_count: number;
        appointments_count: number;
        conversations_count: number;
        function_calls_count: number;
    }>;
    /**
     * Export database as JSON
     */
    exportToJSON(): Promise<string>;
    /**
     * Import database from JSON
     */
    importFromJSON(json: string): Promise<void>;
    /**
     * Close database connection (for cleanup)
     */
    close(): void;
}
//# sourceMappingURL=db-interface.d.ts.map