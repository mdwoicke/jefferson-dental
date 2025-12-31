/**
 * Node.js Database Adapter
 * Implements DatabaseAdapter interface using better-sqlite3 (native SQLite for Node.js)
 */

import Database from 'better-sqlite3';
import {
  DatabaseAdapter,
  PatientRecord,
  Child,
  Appointment,
  CreateAppointmentData,
  AppointmentFilters,
  Conversation,
  CreateConversationData,
  ConversationTurn,
  FunctionCallLog,
  AuditRecord,
  SkillExecutionLog
} from './db-interface';

export class NodeDatabaseAdapter implements DatabaseAdapter {
  constructor(private db: Database.Database) {}

  // =========================================================================
  // PATIENT OPERATIONS
  // =========================================================================

  async getPatient(phoneNumber: string): Promise<PatientRecord | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM patients WHERE phone_number = ?');
      const row = stmt.get(phoneNumber) as any;

      if (!row) return null;

      const children = await this.getChildrenByPatient(row.id);

      return {
        id: row.id,
        phoneNumber: row.phone_number,
        parentName: row.parent_name,
        address: {
          street: row.address_street,
          city: row.address_city,
          state: row.address_state,
          zip: row.address_zip
        },
        preferredLanguage: row.preferred_language,
        lastVisit: row.last_visit || undefined,
        notes: row.notes || undefined,
        children
      };
    } catch (error) {
      console.error('Error getting patient:', error);
      throw error;
    }
  }

  async getPatientById(id: string): Promise<PatientRecord | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM patients WHERE id = ?');
      const row = stmt.get(id) as any;

      if (!row) return null;

      const children = await this.getChildrenByPatient(id);

      return {
        id: row.id,
        phoneNumber: row.phone_number,
        parentName: row.parent_name,
        address: {
          street: row.address_street,
          city: row.address_city,
          state: row.address_state,
          zip: row.address_zip
        },
        preferredLanguage: row.preferred_language,
        lastVisit: row.last_visit || undefined,
        notes: row.notes || undefined,
        children
      };
    } catch (error) {
      console.error('Error getting patient by ID:', error);
      throw error;
    }
  }

  async createPatient(patient: Omit<PatientRecord, 'id'> & { id: string }): Promise<string> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO patients (
          id, phone_number, parent_name, address_street, address_city,
          address_state, address_zip, preferred_language, last_visit, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        patient.id,
        patient.phoneNumber,
        patient.parentName,
        patient.address.street,
        patient.address.city,
        patient.address.state,
        patient.address.zip,
        patient.preferredLanguage || 'English',
        patient.lastVisit || null,
        patient.notes || null
      );

      return patient.id;
    } catch (error) {
      console.error('Error creating patient:', error);
      throw error;
    }
  }

  async updatePatient(id: string, updates: Partial<PatientRecord>): Promise<void> {
    try {
      const setClauses: string[] = [];
      const values: any[] = [];

      if (updates.phoneNumber !== undefined) {
        setClauses.push('phone_number = ?');
        values.push(updates.phoneNumber);
      }
      if (updates.parentName !== undefined) {
        setClauses.push('parent_name = ?');
        values.push(updates.parentName);
      }
      if (updates.address?.street !== undefined) {
        setClauses.push('address_street = ?');
        values.push(updates.address.street);
      }
      if (updates.address?.city !== undefined) {
        setClauses.push('address_city = ?');
        values.push(updates.address.city);
      }
      if (updates.address?.state !== undefined) {
        setClauses.push('address_state = ?');
        values.push(updates.address.state);
      }
      if (updates.address?.zip !== undefined) {
        setClauses.push('address_zip = ?');
        values.push(updates.address.zip);
      }
      if (updates.preferredLanguage !== undefined) {
        setClauses.push('preferred_language = ?');
        values.push(updates.preferredLanguage);
      }
      if (updates.lastVisit !== undefined) {
        setClauses.push('last_visit = ?');
        values.push(updates.lastVisit);
      }
      if (updates.notes !== undefined) {
        setClauses.push('notes = ?');
        values.push(updates.notes);
      }

      if (setClauses.length === 0) return;

      values.push(id);

      const stmt = this.db.prepare(
        `UPDATE patients SET ${setClauses.join(', ')} WHERE id = ?`
      );
      stmt.run(...values);
    } catch (error) {
      console.error('Error updating patient:', error);
      throw error;
    }
  }

  async deletePatient(id: string): Promise<void> {
    try {
      const stmt = this.db.prepare('DELETE FROM patients WHERE id = ?');
      stmt.run(id);
    } catch (error) {
      console.error('Error deleting patient:', error);
      throw error;
    }
  }

  async listPatients(limit: number = 100, offset: number = 0): Promise<PatientRecord[]> {
    try {
      const stmt = this.db.prepare(
        'SELECT * FROM patients ORDER BY created_at DESC LIMIT ? OFFSET ?'
      );
      const rows = stmt.all(limit, offset) as any[];

      const patients: PatientRecord[] = [];

      for (const row of rows) {
        const children = await this.getChildrenByPatient(row.id);

        patients.push({
          id: row.id,
          phoneNumber: row.phone_number,
          parentName: row.parent_name,
          address: {
            street: row.address_street,
            city: row.address_city,
            state: row.address_state,
            zip: row.address_zip
          },
          preferredLanguage: row.preferred_language,
          lastVisit: row.last_visit || undefined,
          notes: row.notes || undefined,
          children
        });
      }

      return patients;
    } catch (error) {
      console.error('Error listing patients:', error);
      throw error;
    }
  }

  // =========================================================================
  // CHILDREN OPERATIONS
  // =========================================================================

  async getChildrenByPatient(patientId: string): Promise<Child[]> {
    try {
      const stmt = this.db.prepare(
        'SELECT * FROM children WHERE patient_id = ? ORDER BY age DESC'
      );
      const rows = stmt.all(patientId) as any[];

      return rows.map(row => ({
        id: row.id,
        patient_id: row.patient_id,
        name: row.name,
        age: row.age,
        medicaid_id: row.medicaid_id,
        date_of_birth: row.date_of_birth || undefined,
        special_needs: row.special_needs || undefined,
        created_at: row.created_at
      }));
    } catch (error) {
      console.error('Error getting children:', error);
      throw error;
    }
  }

  async createChild(
    patientId: string,
    child: Omit<Child, 'id' | 'patient_id' | 'created_at'>
  ): Promise<number> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO children (patient_id, name, age, medicaid_id, date_of_birth, special_needs)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        patientId,
        child.name,
        child.age,
        child.medicaid_id,
        child.date_of_birth || null,
        child.special_needs || null
      );

      return result.lastInsertRowid as number;
    } catch (error) {
      console.error('Error creating child:', error);
      throw error;
    }
  }

  async updateChild(childId: number, updates: Partial<Child>): Promise<void> {
    try {
      const setClauses: string[] = [];
      const values: any[] = [];

      if (updates.name !== undefined) {
        setClauses.push('name = ?');
        values.push(updates.name);
      }
      if (updates.age !== undefined) {
        setClauses.push('age = ?');
        values.push(updates.age);
      }
      if (updates.medicaid_id !== undefined) {
        setClauses.push('medicaid_id = ?');
        values.push(updates.medicaid_id);
      }
      if (updates.date_of_birth !== undefined) {
        setClauses.push('date_of_birth = ?');
        values.push(updates.date_of_birth);
      }
      if (updates.special_needs !== undefined) {
        setClauses.push('special_needs = ?');
        values.push(updates.special_needs);
      }

      if (setClauses.length === 0) return;

      values.push(childId);

      const stmt = this.db.prepare(
        `UPDATE children SET ${setClauses.join(', ')} WHERE id = ?`
      );
      stmt.run(...values);
    } catch (error) {
      console.error('Error updating child:', error);
      throw error;
    }
  }

  async deleteChild(childId: number): Promise<void> {
    try {
      const stmt = this.db.prepare('DELETE FROM children WHERE id = ?');
      stmt.run(childId);
    } catch (error) {
      console.error('Error deleting child:', error);
      throw error;
    }
  }

  // =========================================================================
  // APPOINTMENT OPERATIONS
  // =========================================================================

  async createAppointment(appointment: CreateAppointmentData): Promise<string> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO appointments (
          id, booking_id, patient_id, appointment_time, appointment_type,
          status, location, confirmation_sent, confirmation_method, confirmation_sid
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        appointment.id,
        appointment.booking_id || appointment.id,
        appointment.patient_id,
        appointment.appointment_time,
        appointment.appointment_type,
        appointment.status || 'pending',
        appointment.location,
        appointment.confirmation_sent ? 1 : 0,
        appointment.confirmation_method || null,
        appointment.confirmation_sid || null
      );

      return appointment.id;
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw error;
    }
  }

  async getAppointment(appointmentId: string): Promise<Appointment | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM appointments WHERE id = ?');
      const row = stmt.get(appointmentId) as any;

      if (!row) return null;

      const childCountStmt = this.db.prepare(`
        SELECT COUNT(*) as count
        FROM appointment_children
        WHERE appointment_id = ?
      `);
      const childCount = (childCountStmt.get(appointmentId) as any).count;

      return {
        id: row.id,
        booking_id: row.booking_id,
        patient_id: row.patient_id,
        appointment_time: row.appointment_time,
        appointment_type: row.appointment_type,
        status: row.status,
        location: row.location,
        confirmation_sent: Boolean(row.confirmation_sent),
        confirmation_method: row.confirmation_method || undefined,
        confirmation_sid: row.confirmation_sid || undefined,
        cancellation_reason: row.cancellation_reason || undefined,
        created_at: row.created_at,
        updated_at: row.updated_at,
        child_count: childCount
      };
    } catch (error) {
      console.error('Error getting appointment:', error);
      throw error;
    }
  }

  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<void> {
    try {
      const setClauses: string[] = [];
      const values: any[] = [];

      if (updates.status !== undefined) {
        setClauses.push('status = ?');
        values.push(updates.status);
      }
      if (updates.appointment_time !== undefined) {
        setClauses.push('appointment_time = ?');
        values.push(updates.appointment_time);
      }
      if (updates.appointment_type !== undefined) {
        setClauses.push('appointment_type = ?');
        values.push(updates.appointment_type);
      }
      if (updates.location !== undefined) {
        setClauses.push('location = ?');
        values.push(updates.location);
      }
      if (updates.confirmation_sent !== undefined) {
        setClauses.push('confirmation_sent = ?');
        values.push(updates.confirmation_sent ? 1 : 0);
      }
      if (updates.confirmation_method !== undefined) {
        setClauses.push('confirmation_method = ?');
        values.push(updates.confirmation_method);
      }
      if (updates.confirmation_sid !== undefined) {
        setClauses.push('confirmation_sid = ?');
        values.push(updates.confirmation_sid);
      }
      if (updates.cancellation_reason !== undefined) {
        setClauses.push('cancellation_reason = ?');
        values.push(updates.cancellation_reason);
      }

      if (setClauses.length === 0) return;

      values.push(id);

      const stmt = this.db.prepare(
        `UPDATE appointments SET ${setClauses.join(', ')} WHERE id = ?`
      );
      stmt.run(...values);
    } catch (error) {
      console.error('Error updating appointment:', error);
      throw error;
    }
  }

  async listAppointments(filters: AppointmentFilters): Promise<Appointment[]> {
    try {
      let query = 'SELECT * FROM appointments WHERE 1=1';
      const params: any[] = [];

      if (filters.date) {
        query += ' AND DATE(appointment_time) = DATE(?)';
        params.push(filters.date);
      }

      if (filters.from_date) {
        query += ' AND DATE(appointment_time) >= DATE(?)';
        params.push(filters.from_date);
      }

      if (filters.to_date) {
        query += ' AND DATE(appointment_time) <= DATE(?)';
        params.push(filters.to_date);
      }

      if (filters.status && filters.status.length > 0) {
        const placeholders = filters.status.map(() => '?').join(',');
        query += ` AND status IN (${placeholders})`;
        params.push(...filters.status);
      }

      if (filters.patient_id) {
        query += ' AND patient_id = ?';
        params.push(filters.patient_id);
      }

      query += ' ORDER BY appointment_time DESC';

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params) as any[];

      const appointments: Appointment[] = [];

      for (const row of rows) {
        const childCountStmt = this.db.prepare(`
          SELECT COUNT(*) as count
          FROM appointment_children
          WHERE appointment_id = ?
        `);
        const childCount = (childCountStmt.get(row.id) as any).count;

        appointments.push({
          id: row.id,
          booking_id: row.booking_id,
          patient_id: row.patient_id,
          appointment_time: row.appointment_time,
          appointment_type: row.appointment_type,
          status: row.status,
          location: row.location,
          confirmation_sent: Boolean(row.confirmation_sent),
          confirmation_method: row.confirmation_method || undefined,
          confirmation_sid: row.confirmation_sid || undefined,
          cancellation_reason: row.cancellation_reason || undefined,
          created_at: row.created_at,
          updated_at: row.updated_at,
          child_count: childCount
        });
      }

      return appointments;
    } catch (error) {
      console.error('Error listing appointments:', error);
      throw error;
    }
  }

  async linkChildToAppointment(appointmentId: string, childId: number): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        INSERT OR IGNORE INTO appointment_children (appointment_id, child_id)
        VALUES (?, ?)
      `);
      stmt.run(appointmentId, childId);
    } catch (error) {
      console.error('Error linking child to appointment:', error);
      throw error;
    }
  }

  async getAppointmentChildren(appointmentId: string): Promise<Child[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT c.*
        FROM children c
        JOIN appointment_children ac ON c.id = ac.child_id
        WHERE ac.appointment_id = ?
      `);
      const rows = stmt.all(appointmentId) as any[];

      return rows.map(row => ({
        id: row.id,
        patient_id: row.patient_id,
        name: row.name,
        age: row.age,
        medicaid_id: row.medicaid_id,
        date_of_birth: row.date_of_birth || undefined,
        special_needs: row.special_needs || undefined,
        created_at: row.created_at
      }));
    } catch (error) {
      console.error('Error getting appointment children:', error);
      throw error;
    }
  }

  // =========================================================================
  // CONVERSATION OPERATIONS
  // =========================================================================

  async createConversation(conversation: CreateConversationData): Promise<string> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO conversations (
          id, patient_id, phone_number, direction, provider, call_sid, started_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        conversation.id,
        conversation.patient_id || null,
        conversation.phone_number,
        conversation.direction,
        conversation.provider,
        conversation.call_sid || null,
        conversation.started_at
      );

      return conversation.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  async getConversation(conversationId: string): Promise<Conversation | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM conversations WHERE id = ?');
      const row = stmt.get(conversationId) as any;

      if (!row) return null;

      return {
        id: row.id,
        patient_id: row.patient_id || undefined,
        phone_number: row.phone_number,
        direction: row.direction,
        provider: row.provider,
        call_sid: row.call_sid || undefined,
        started_at: row.started_at,
        ended_at: row.ended_at || undefined,
        duration_seconds: row.duration_seconds || undefined,
        outcome: row.outcome || undefined,
        outcome_details: row.outcome_details || undefined
      };
    } catch (error) {
      console.error('Error getting conversation:', error);
      throw error;
    }
  }

  async endConversation(
    conversationId: string,
    data: {
      ended_at: string;
      duration_seconds: number;
      outcome: string;
      outcome_details?: string;
    }
  ): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        UPDATE conversations
        SET ended_at = ?, duration_seconds = ?, outcome = ?, outcome_details = ?
        WHERE id = ?
      `);

      stmt.run(
        data.ended_at,
        data.duration_seconds,
        data.outcome,
        data.outcome_details || null,
        conversationId
      );
    } catch (error) {
      console.error('Error ending conversation:', error);
      throw error;
    }
  }

  async logConversationTurn(turn: Omit<ConversationTurn, 'id'>): Promise<number> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO conversation_turns (
          conversation_id, turn_number, role, content_type, content_text, audio_data, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        turn.conversation_id,
        turn.turn_number,
        turn.role,
        turn.content_type,
        turn.content_text || null,
        turn.audio_data || null,
        turn.timestamp
      );

      return result.lastInsertRowid as number;
    } catch (error) {
      console.error('Error logging conversation turn:', error);
      throw error;
    }
  }

  async getConversationHistory(conversationId: string): Promise<ConversationTurn[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM conversation_turns
        WHERE conversation_id = ?
        ORDER BY turn_number ASC
      `);
      const rows = stmt.all(conversationId) as any[];

      return rows.map(row => ({
        id: row.id,
        conversation_id: row.conversation_id,
        turn_number: row.turn_number,
        role: row.role,
        content_type: row.content_type,
        content_text: row.content_text || undefined,
        audio_data: row.audio_data || undefined,
        timestamp: row.timestamp
      }));
    } catch (error) {
      console.error('Error getting conversation history:', error);
      throw error;
    }
  }

  async getConversationTurnCount(conversationId: string): Promise<number> {
    try {
      const stmt = this.db.prepare(`
        SELECT COUNT(*) as count
        FROM conversation_turns
        WHERE conversation_id = ?
      `);
      const result = stmt.get(conversationId) as any;

      return result.count;
    } catch (error) {
      console.error('Error getting turn count:', error);
      throw error;
    }
  }

  async listConversations(filters?: {
    patient_id?: string;
    phone_number?: string;
    from_date?: string;
    to_date?: string;
    outcome?: string;
    limit?: number;
    offset?: number;
  }): Promise<Conversation[]> {
    try {
      let query = 'SELECT * FROM conversations WHERE 1=1';
      const params: any[] = [];

      if (filters?.patient_id) {
        query += ' AND patient_id = ?';
        params.push(filters.patient_id);
      }

      if (filters?.phone_number) {
        query += ' AND phone_number = ?';
        params.push(filters.phone_number);
      }

      if (filters?.from_date) {
        query += ' AND DATE(started_at) >= DATE(?)';
        params.push(filters.from_date);
      }

      if (filters?.to_date) {
        query += ' AND DATE(started_at) <= DATE(?)';
        params.push(filters.to_date);
      }

      if (filters?.outcome) {
        query += ' AND outcome = ?';
        params.push(filters.outcome);
      }

      query += ' ORDER BY started_at DESC';

      if (filters?.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);

        if (filters?.offset) {
          query += ' OFFSET ?';
          params.push(filters.offset);
        }
      }

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params) as any[];

      return rows.map(row => ({
        id: row.id,
        patient_id: row.patient_id || undefined,
        phone_number: row.phone_number,
        direction: row.direction,
        provider: row.provider,
        call_sid: row.call_sid || undefined,
        started_at: row.started_at,
        ended_at: row.ended_at || undefined,
        duration_seconds: row.duration_seconds || undefined,
        outcome: row.outcome || undefined,
        outcome_details: row.outcome_details || undefined
      }));
    } catch (error) {
      console.error('Error listing conversations:', error);
      throw error;
    }
  }

  // =========================================================================
  // FUNCTION CALL OPERATIONS
  // =========================================================================

  async logFunctionCall(functionCall: Omit<FunctionCallLog, 'id'>): Promise<number> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO function_calls (
          conversation_id, call_id, function_name, arguments, result,
          status, execution_time_ms, timestamp, error_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        functionCall.conversation_id,
        functionCall.call_id || null,
        functionCall.function_name,
        functionCall.arguments,
        functionCall.result || null,
        functionCall.status,
        functionCall.execution_time_ms || null,
        functionCall.timestamp,
        functionCall.error_message || null
      );

      return result.lastInsertRowid as number;
    } catch (error) {
      console.error('Error logging function call:', error);
      throw error;
    }
  }

  async updateFunctionCallResult(
    id: number,
    data: {
      result: string;
      status: 'success' | 'error';
      execution_time_ms?: number;
      error_message?: string;
    }
  ): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        UPDATE function_calls
        SET result = ?, status = ?, execution_time_ms = ?, error_message = ?
        WHERE id = ?
      `);

      stmt.run(
        data.result,
        data.status,
        data.execution_time_ms || null,
        data.error_message || null,
        id
      );
    } catch (error) {
      console.error('Error updating function call result:', error);
      throw error;
    }
  }

  async getFunctionCalls(conversationId: string): Promise<FunctionCallLog[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM function_calls
        WHERE conversation_id = ?
        ORDER BY timestamp ASC
      `);
      const rows = stmt.all(conversationId) as any[];

      return rows.map(row => ({
        id: row.id,
        conversation_id: row.conversation_id,
        call_id: row.call_id || undefined,
        function_name: row.function_name,
        arguments: row.arguments,
        result: row.result || undefined,
        status: row.status,
        execution_time_ms: row.execution_time_ms || undefined,
        timestamp: row.timestamp,
        error_message: row.error_message || undefined
      }));
    } catch (error) {
      console.error('Error getting function calls:', error);
      throw error;
    }
  }

  async updateFunctionCallError(id: number, errorMessage: string): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        UPDATE function_calls
        SET status = 'error', error_message = ?
        WHERE id = ?
      `);

      stmt.run(errorMessage, id);
    } catch (error) {
      console.error('Error updating function call error:', error);
      throw error;
    }
  }

  // =========================================================================
  // AUDIT OPERATIONS
  // =========================================================================

  async logAudit(audit: AuditRecord): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO audit_trail (
          table_name, record_id, operation, field_name, old_value, new_value,
          changed_by, change_reason, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        audit.table_name,
        audit.record_id,
        audit.operation,
        audit.field_name || null,
        audit.old_value ? JSON.stringify(audit.old_value) : null,
        audit.new_value ? JSON.stringify(audit.new_value) : null,
        audit.changed_by,
        audit.change_reason || null,
        audit.metadata ? JSON.stringify(audit.metadata) : null
      );
    } catch (error) {
      console.error('Error logging audit:', error);
      throw error;
    }
  }

  async getAuditRecords(tableName: string, recordId: string): Promise<AuditRecord[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM audit_trail
        WHERE table_name = ? AND record_id = ?
        ORDER BY timestamp DESC
      `);
      const rows = stmt.all(tableName, recordId) as any[];

      return rows.map(row => ({
        table_name: row.table_name,
        record_id: row.record_id,
        operation: row.operation,
        field_name: row.field_name || undefined,
        old_value: row.old_value ? JSON.parse(row.old_value) : undefined,
        new_value: row.new_value ? JSON.parse(row.new_value) : undefined,
        changed_by: row.changed_by,
        change_reason: row.change_reason || undefined,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      }));
    } catch (error) {
      console.error('Error getting audit records:', error);
      throw error;
    }
  }

  // =========================================================================
  // SKILL EXECUTION LOG OPERATIONS
  // =========================================================================

  async createSkillExecutionLog(log: Omit<SkillExecutionLog, 'id' | 'createdAt'>): Promise<string> {
    try {
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();

      const stmt = this.db.prepare(`
        INSERT INTO skill_execution_logs (
          id, conversation_id, skill_name, step_number, step_name,
          tool_used, input_args, output_result, execution_status,
          execution_time_ms, error_message, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        log.conversationId,
        log.skillName,
        log.stepNumber,
        log.stepName,
        log.toolUsed || null,
        log.inputArgs || null,
        log.outputResult || null,
        log.executionStatus,
        log.executionTimeMs || null,
        log.errorMessage || null,
        createdAt
      );

      return id;
    } catch (error) {
      console.error('Error creating skill execution log:', error);
      throw error;
    }
  }

  async listSkillExecutionsByConversation(conversationId: string): Promise<SkillExecutionLog[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM skill_execution_logs
        WHERE conversation_id = ?
        ORDER BY step_number ASC
      `);
      const rows = stmt.all(conversationId) as any[];

      return rows.map(row => ({
        id: row.id,
        conversationId: row.conversation_id,
        skillName: row.skill_name,
        stepNumber: row.step_number,
        stepName: row.step_name,
        toolUsed: row.tool_used || undefined,
        inputArgs: row.input_args || undefined,
        outputResult: row.output_result || undefined,
        executionStatus: row.execution_status,
        executionTimeMs: row.execution_time_ms || undefined,
        errorMessage: row.error_message || undefined,
        createdAt: row.created_at
      }));
    } catch (error) {
      console.error('Error listing skill executions by conversation:', error);
      throw error;
    }
  }

  async listSkillExecutionsBySkill(skillName: string, limit: number = 100): Promise<SkillExecutionLog[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM skill_execution_logs
        WHERE skill_name = ?
        ORDER BY created_at DESC
        LIMIT ?
      `);
      const rows = stmt.all(skillName, limit) as any[];

      return rows.map(row => ({
        id: row.id,
        conversationId: row.conversation_id,
        skillName: row.skill_name,
        stepNumber: row.step_number,
        stepName: row.step_name,
        toolUsed: row.tool_used || undefined,
        inputArgs: row.input_args || undefined,
        outputResult: row.output_result || undefined,
        executionStatus: row.execution_status,
        executionTimeMs: row.execution_time_ms || undefined,
        errorMessage: row.error_message || undefined,
        createdAt: row.created_at
      }));
    } catch (error) {
      console.error('Error listing skill executions by skill:', error);
      throw error;
    }
  }

  async listAllSkillExecutions(limit: number = 100, offset: number = 0): Promise<SkillExecutionLog[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM skill_execution_logs
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `);
      const rows = stmt.all(limit, offset) as any[];

      return rows.map(row => ({
        id: row.id,
        conversationId: row.conversation_id,
        skillName: row.skill_name,
        stepNumber: row.step_number,
        stepName: row.step_name,
        toolUsed: row.tool_used || undefined,
        inputArgs: row.input_args || undefined,
        outputResult: row.output_result || undefined,
        executionStatus: row.execution_status,
        executionTimeMs: row.execution_time_ms || undefined,
        errorMessage: row.error_message || undefined,
        createdAt: row.created_at
      }));
    } catch (error) {
      console.error('Error listing all skill executions:', error);
      throw error;
    }
  }

  // =========================================================================
  // TRANSACTION OPERATIONS
  // =========================================================================

  async beginTransaction(): Promise<void> {
    try {
      this.db.exec('BEGIN TRANSACTION');
    } catch (error) {
      console.error('Error beginning transaction:', error);
      throw error;
    }
  }

  async commit(): Promise<void> {
    try {
      this.db.exec('COMMIT');
    } catch (error) {
      console.error('Error committing transaction:', error);
      throw error;
    }
  }

  async rollback(): Promise<void> {
    try {
      this.db.exec('ROLLBACK');
    } catch (error) {
      console.error('Error rolling back transaction:', error);
      throw error;
    }
  }

  // =========================================================================
  // UTILITY OPERATIONS
  // =========================================================================

  async executeRawSQL(sql: string, params: any[] = []): Promise<any> {
    try {
      const stmt = this.db.prepare(sql);
      const results = stmt.all(...params);
      return results;
    } catch (error) {
      console.error('Error executing raw SQL:', error);
      throw error;
    }
  }

  async getStats(): Promise<{
    patients_count: number;
    children_count: number;
    appointments_count: number;
    conversations_count: number;
    function_calls_count: number;
  }> {
    try {
      const stats = {
        patients_count: (this.db.prepare('SELECT COUNT(*) as count FROM patients').get() as any).count,
        children_count: (this.db.prepare('SELECT COUNT(*) as count FROM children').get() as any).count,
        appointments_count: (this.db.prepare('SELECT COUNT(*) as count FROM appointments').get() as any).count,
        conversations_count: (this.db.prepare('SELECT COUNT(*) as count FROM conversations').get() as any).count,
        function_calls_count: (this.db.prepare('SELECT COUNT(*) as count FROM function_calls').get() as any).count
      };

      return stats;
    } catch (error) {
      console.error('Error getting stats:', error);
      throw error;
    }
  }

  async exportToJSON(): Promise<string> {
    try {
      const data = {
        version: 1,
        exported_at: new Date().toISOString(),
        patients: this.db.prepare('SELECT * FROM patients').all(),
        children: this.db.prepare('SELECT * FROM children').all(),
        appointments: this.db.prepare('SELECT * FROM appointments').all(),
        appointment_children: this.db.prepare('SELECT * FROM appointment_children').all(),
        conversations: this.db.prepare('SELECT * FROM conversations').all(),
        conversation_turns: this.db.prepare('SELECT * FROM conversation_turns').all(),
        function_calls: this.db.prepare('SELECT * FROM function_calls').all(),
        audit_trail: this.db.prepare('SELECT * FROM audit_trail').all()
      };

      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Error exporting to JSON:', error);
      throw error;
    }
  }

  async importFromJSON(json: string): Promise<void> {
    try {
      const data = JSON.parse(json);

      const importTransaction = this.db.transaction((data: any) => {
        this.db.exec('DELETE FROM function_calls');
        this.db.exec('DELETE FROM conversation_turns');
        this.db.exec('DELETE FROM conversations');
        this.db.exec('DELETE FROM appointment_children');
        this.db.exec('DELETE FROM appointments');
        this.db.exec('DELETE FROM children');
        this.db.exec('DELETE FROM patients');
        this.db.exec('DELETE FROM audit_trail');

        const insertPatient = this.db.prepare(`
          INSERT INTO patients (id, phone_number, parent_name, address_street, address_city,
                                address_state, address_zip, preferred_language, last_visit,
                                notes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const patient of data.patients || []) {
          insertPatient.run(
            patient.id, patient.phone_number, patient.parent_name,
            patient.address_street, patient.address_city, patient.address_state,
            patient.address_zip, patient.preferred_language, patient.last_visit,
            patient.notes, patient.created_at, patient.updated_at
          );
        }
      });

      importTransaction(data);
    } catch (error) {
      console.error('Error importing from JSON:', error);
      throw error;
    }
  }

  close(): void {
    this.db.close();
  }
}
