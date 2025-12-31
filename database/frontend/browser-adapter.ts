/**
 * Browser Database Adapter
 * Implements DatabaseAdapter interface using sql.js (SQLite in WebAssembly)
 */

import { Database } from 'sql.js';
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
  CallMetrics,
  TestScenario,
  TestExecution,
  SkillExecutionLog
} from '../db-interface';
import { scheduleSave } from './db-init';

export class BrowserDatabaseAdapter implements DatabaseAdapter {
  constructor(private db: Database) {}

  // =========================================================================
  // PATIENT OPERATIONS
  // =========================================================================

  async getPatient(phoneNumber: string): Promise<PatientRecord | null> {
    try {
      const stmt = this.db.prepare(
        'SELECT * FROM patients WHERE phone_number = ?'
      );
      stmt.bind([phoneNumber]);

      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();

        const children = await this.getChildrenByPatient(row.id as string);

        return {
          id: row.id as string,
          phoneNumber: row.phone_number as string,
          parentName: row.parent_name as string,
          address: {
            street: row.address_street as string,
            city: row.address_city as string,
            state: row.address_state as string,
            zip: row.address_zip as string
          },
          preferredLanguage: row.preferred_language as string,
          lastVisit: row.last_visit as string | undefined,
          notes: row.notes as string | undefined,
          children
        };
      }

      stmt.free();
      return null;
    } catch (error) {
      console.error('Error getting patient:', error);
      throw error;
    }
  }

  async getPatientById(id: string): Promise<PatientRecord | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM patients WHERE id = ?');
      stmt.bind([id]);

      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();

        const children = await this.getChildrenByPatient(id);

        return {
          id: row.id as string,
          phoneNumber: row.phone_number as string,
          parentName: row.parent_name as string,
          address: {
            street: row.address_street as string,
            city: row.address_city as string,
            state: row.address_state as string,
            zip: row.address_zip as string
          },
          preferredLanguage: row.preferred_language as string,
          lastVisit: row.last_visit as string | undefined,
          notes: row.notes as string | undefined,
          children
        };
      }

      stmt.free();
      return null;
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

      stmt.bind([
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
      ]);

      stmt.step();
      stmt.free();

      scheduleSave();
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
      stmt.bind(values);
      stmt.step();
      stmt.free();

      scheduleSave();
    } catch (error) {
      console.error('Error updating patient:', error);
      throw error;
    }
  }

  async deletePatient(id: string): Promise<void> {
    try {
      const stmt = this.db.prepare('DELETE FROM patients WHERE id = ?');
      stmt.bind([id]);
      stmt.step();
      stmt.free();

      scheduleSave();
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
      stmt.bind([limit, offset]);

      const patients: PatientRecord[] = [];

      while (stmt.step()) {
        const row = stmt.getAsObject();
        const children = await this.getChildrenByPatient(row.id as string);

        patients.push({
          id: row.id as string,
          phoneNumber: row.phone_number as string,
          parentName: row.parent_name as string,
          address: {
            street: row.address_street as string,
            city: row.address_city as string,
            state: row.address_state as string,
            zip: row.address_zip as string
          },
          preferredLanguage: row.preferred_language as string,
          lastVisit: row.last_visit as string | undefined,
          notes: row.notes as string | undefined,
          children
        });
      }

      stmt.free();
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
      stmt.bind([patientId]);

      const children: Child[] = [];

      while (stmt.step()) {
        const row = stmt.getAsObject();
        children.push({
          id: row.id as number,
          patient_id: row.patient_id as string,
          name: row.name as string,
          age: row.age as number,
          medicaid_id: row.medicaid_id as string,
          date_of_birth: row.date_of_birth as string | undefined,
          special_needs: row.special_needs as string | undefined,
          created_at: row.created_at as string
        });
      }

      stmt.free();
      return children;
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

      stmt.bind([
        patientId,
        child.name,
        child.age,
        child.medicaid_id,
        child.date_of_birth || null,
        child.special_needs || null
      ]);

      stmt.step();
      stmt.free();

      const idStmt = this.db.prepare('SELECT last_insert_rowid() as id');
      idStmt.step();
      const result = idStmt.getAsObject();
      const childId = result.id as number;
      idStmt.free();

      scheduleSave();
      return childId;
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
      stmt.bind(values);
      stmt.step();
      stmt.free();

      scheduleSave();
    } catch (error) {
      console.error('Error updating child:', error);
      throw error;
    }
  }

  async deleteChild(childId: number): Promise<void> {
    try {
      const stmt = this.db.prepare('DELETE FROM children WHERE id = ?');
      stmt.bind([childId]);
      stmt.step();
      stmt.free();

      scheduleSave();
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

      stmt.bind([
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
      ]);

      stmt.step();
      stmt.free();

      scheduleSave();
      return appointment.id;
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw error;
    }
  }

  async getAppointment(appointmentId: string): Promise<Appointment | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM appointments WHERE id = ?');
      stmt.bind([appointmentId]);

      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();

        const childrenStmt = this.db.prepare(`
          SELECT COUNT(*) as count
          FROM appointment_children
          WHERE appointment_id = ?
        `);
        childrenStmt.bind([appointmentId]);
        childrenStmt.step();
        const childCount = childrenStmt.getAsObject().count as number;
        childrenStmt.free();

        return {
          id: row.id as string,
          booking_id: row.booking_id as string,
          patient_id: row.patient_id as string,
          appointment_time: row.appointment_time as string,
          appointment_type: row.appointment_type as any,
          status: row.status as any,
          location: row.location as string,
          confirmation_sent: Boolean(row.confirmation_sent),
          confirmation_method: row.confirmation_method as string | undefined,
          confirmation_sid: row.confirmation_sid as string | undefined,
          cancellation_reason: row.cancellation_reason as string | undefined,
          created_at: row.created_at as string,
          updated_at: row.updated_at as string,
          child_count: childCount
        };
      }

      stmt.free();
      return null;
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
      stmt.bind(values);
      stmt.step();
      stmt.free();

      scheduleSave();
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

      if (filters.booking_id) {
        query += ' AND booking_id = ?';
        params.push(filters.booking_id);
      }

      query += ' ORDER BY appointment_time DESC';

      const stmt = this.db.prepare(query);
      stmt.bind(params);

      const appointments: Appointment[] = [];

      while (stmt.step()) {
        const row = stmt.getAsObject();

        const childrenStmt = this.db.prepare(`
          SELECT COUNT(*) as count
          FROM appointment_children
          WHERE appointment_id = ?
        `);
        childrenStmt.bind([row.id]);
        childrenStmt.step();
        const childCount = childrenStmt.getAsObject().count as number;
        childrenStmt.free();

        appointments.push({
          id: row.id as string,
          booking_id: row.booking_id as string,
          patient_id: row.patient_id as string,
          appointment_time: row.appointment_time as string,
          appointment_type: row.appointment_type as any,
          status: row.status as any,
          location: row.location as string,
          confirmation_sent: Boolean(row.confirmation_sent),
          confirmation_method: row.confirmation_method as string | undefined,
          confirmation_sid: row.confirmation_sid as string | undefined,
          cancellation_reason: row.cancellation_reason as string | undefined,
          created_at: row.created_at as string,
          updated_at: row.updated_at as string,
          child_count: childCount
        });
      }

      stmt.free();
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
      stmt.bind([appointmentId, childId]);
      stmt.step();
      stmt.free();

      scheduleSave();
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
      stmt.bind([appointmentId]);

      const children: Child[] = [];

      while (stmt.step()) {
        const row = stmt.getAsObject();
        children.push({
          id: row.id as number,
          patient_id: row.patient_id as string,
          name: row.name as string,
          age: row.age as number,
          medicaid_id: row.medicaid_id as string,
          date_of_birth: row.date_of_birth as string | undefined,
          special_needs: row.special_needs as string | undefined,
          created_at: row.created_at as string
        });
      }

      stmt.free();
      return children;
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

      stmt.bind([
        conversation.id,
        conversation.patient_id || null,
        conversation.phone_number,
        conversation.direction,
        conversation.provider,
        conversation.call_sid || null,
        conversation.started_at
      ]);

      stmt.step();
      stmt.free();

      scheduleSave();
      return conversation.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  async getConversation(conversationId: string): Promise<Conversation | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM conversations WHERE id = ?');
      stmt.bind([conversationId]);

      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();

        return {
          id: row.id as string,
          patient_id: row.patient_id as string | undefined,
          phone_number: row.phone_number as string,
          direction: row.direction as any,
          provider: row.provider as any,
          call_sid: row.call_sid as string | undefined,
          started_at: row.started_at as string,
          ended_at: row.ended_at as string | undefined,
          duration_seconds: row.duration_seconds as number | undefined,
          outcome: row.outcome as string | undefined,
          outcome_details: row.outcome_details as string | undefined
        };
      }

      stmt.free();
      return null;
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

      stmt.bind([
        data.ended_at,
        data.duration_seconds,
        data.outcome,
        data.outcome_details || null,
        conversationId
      ]);

      stmt.step();
      stmt.free();

      scheduleSave();
    } catch (error) {
      console.error('Error ending conversation:', error);
      throw error;
    }
  }

  async logConversationTurn(turn: Omit<ConversationTurn, 'id'>): Promise<number> {
    try {
      // Convert Blob to Uint8Array if needed (SQL.js doesn't support Blob)
      let audioData: Uint8Array | null = null;
      if (turn.audio_data) {
        if (turn.audio_data instanceof Blob) {
          const arrayBuffer = await turn.audio_data.arrayBuffer();
          audioData = new Uint8Array(arrayBuffer);
        } else {
          audioData = turn.audio_data;
        }
      }

      const stmt = this.db.prepare(`
        INSERT INTO conversation_turns (
          conversation_id, turn_number, role, content_type, content_text, audio_data, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.bind([
        turn.conversation_id,
        turn.turn_number,
        turn.role,
        turn.content_type,
        turn.content_text || null,
        audioData,
        turn.timestamp
      ]);

      stmt.step();
      stmt.free();

      const idStmt = this.db.prepare('SELECT last_insert_rowid() as id');
      idStmt.step();
      const result = idStmt.getAsObject();
      const turnId = result.id as number;
      idStmt.free();

      scheduleSave();
      return turnId;
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
      stmt.bind([conversationId]);

      const turns: ConversationTurn[] = [];

      while (stmt.step()) {
        const row = stmt.getAsObject();
        turns.push({
          id: row.id as number,
          conversation_id: row.conversation_id as string,
          turn_number: row.turn_number as number,
          role: row.role as any,
          content_type: row.content_type as any,
          content_text: row.content_text as string | undefined,
          audio_data: row.audio_data as Uint8Array | undefined,
          timestamp: row.timestamp as string
        });
      }

      stmt.free();
      return turns;
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
      stmt.bind([conversationId]);

      stmt.step();
      const result = stmt.getAsObject();
      const count = result.count as number;
      stmt.free();

      return count;
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
      stmt.bind(params);

      const conversations: Conversation[] = [];

      while (stmt.step()) {
        const row = stmt.getAsObject();
        conversations.push({
          id: row.id as string,
          patient_id: row.patient_id as string | undefined,
          phone_number: row.phone_number as string,
          direction: row.direction as any,
          provider: row.provider as any,
          call_sid: row.call_sid as string | undefined,
          started_at: row.started_at as string,
          ended_at: row.ended_at as string | undefined,
          duration_seconds: row.duration_seconds as number | undefined,
          outcome: row.outcome as string | undefined,
          outcome_details: row.outcome_details as string | undefined
        });
      }

      stmt.free();
      return conversations;
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

      stmt.bind([
        functionCall.conversation_id,
        functionCall.call_id || null,
        functionCall.function_name,
        functionCall.arguments,
        functionCall.result || null,
        functionCall.status,
        functionCall.execution_time_ms || null,
        functionCall.timestamp,
        functionCall.error_message || null
      ]);

      stmt.step();
      stmt.free();

      const idStmt = this.db.prepare('SELECT last_insert_rowid() as id');
      idStmt.step();
      const result = idStmt.getAsObject();
      const callId = result.id as number;
      idStmt.free();

      scheduleSave();
      return callId;
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

      stmt.bind([
        data.result,
        data.status,
        data.execution_time_ms || null,
        data.error_message || null,
        id
      ]);

      stmt.step();
      stmt.free();

      scheduleSave();
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
      stmt.bind([conversationId]);

      const functionCalls: FunctionCallLog[] = [];

      while (stmt.step()) {
        const row = stmt.getAsObject();
        functionCalls.push({
          id: row.id as number,
          conversation_id: row.conversation_id as string,
          call_id: row.call_id as string | undefined,
          function_name: row.function_name as string,
          arguments: row.arguments as string,
          result: row.result as string | undefined,
          status: row.status as any,
          execution_time_ms: row.execution_time_ms as number | undefined,
          timestamp: row.timestamp as string,
          error_message: row.error_message as string | undefined
        });
      }

      stmt.free();
      return functionCalls;
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

      stmt.bind([errorMessage, id]);
      stmt.step();
      stmt.free();

      scheduleSave();
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

      stmt.bind([
        audit.table_name,
        audit.record_id,
        audit.operation,
        audit.field_name || null,
        audit.old_value ? JSON.stringify(audit.old_value) : null,
        audit.new_value ? JSON.stringify(audit.new_value) : null,
        audit.changed_by,
        audit.change_reason || null,
        audit.metadata ? JSON.stringify(audit.metadata) : null
      ]);

      stmt.step();
      stmt.free();

      scheduleSave();
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
      stmt.bind([tableName, recordId]);

      const auditRecords: AuditRecord[] = [];

      while (stmt.step()) {
        const row = stmt.getAsObject();
        auditRecords.push({
          table_name: row.table_name as string,
          record_id: row.record_id as string,
          operation: row.operation as any,
          field_name: row.field_name as string | undefined,
          old_value: row.old_value ? JSON.parse(row.old_value as string) : undefined,
          new_value: row.new_value ? JSON.parse(row.new_value as string) : undefined,
          changed_by: row.changed_by as string,
          change_reason: row.change_reason as string | undefined,
          metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined
        });
      }

      stmt.free();
      return auditRecords;
    } catch (error) {
      console.error('Error getting audit records:', error);
      throw error;
    }
  }

  // =========================================================================
  // TRANSACTION OPERATIONS
  // =========================================================================

  async beginTransaction(): Promise<void> {
    try {
      this.db.run('BEGIN TRANSACTION');
    } catch (error) {
      console.error('Error beginning transaction:', error);
      throw error;
    }
  }

  async commit(): Promise<void> {
    try {
      this.db.run('COMMIT');
      scheduleSave();
    } catch (error) {
      console.error('Error committing transaction:', error);
      throw error;
    }
  }

  async rollback(): Promise<void> {
    try {
      this.db.run('ROLLBACK');
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

      if (params.length > 0) {
        stmt.bind(params);
      }

      const results: any[] = [];

      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }

      stmt.free();
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
        patients_count: 0,
        children_count: 0,
        appointments_count: 0,
        conversations_count: 0,
        function_calls_count: 0
      };

      const queries = [
        { key: 'patients_count', sql: 'SELECT COUNT(*) as count FROM patients' },
        { key: 'children_count', sql: 'SELECT COUNT(*) as count FROM children' },
        { key: 'appointments_count', sql: 'SELECT COUNT(*) as count FROM appointments' },
        { key: 'conversations_count', sql: 'SELECT COUNT(*) as count FROM conversations' },
        { key: 'function_calls_count', sql: 'SELECT COUNT(*) as count FROM function_calls' }
      ];

      for (const query of queries) {
        const stmt = this.db.prepare(query.sql);
        stmt.step();
        const result = stmt.getAsObject();
        stats[query.key as keyof typeof stats] = result.count as number;
        stmt.free();
      }

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
        patients: await this.executeRawSQL('SELECT * FROM patients'),
        children: await this.executeRawSQL('SELECT * FROM children'),
        appointments: await this.executeRawSQL('SELECT * FROM appointments'),
        appointment_children: await this.executeRawSQL('SELECT * FROM appointment_children'),
        conversations: await this.executeRawSQL('SELECT * FROM conversations'),
        conversation_turns: await this.executeRawSQL('SELECT * FROM conversation_turns'),
        function_calls: await this.executeRawSQL('SELECT * FROM function_calls'),
        audit_trail: await this.executeRawSQL('SELECT * FROM audit_trail')
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

      await this.beginTransaction();

      try {
        this.db.run('DELETE FROM function_calls');
        this.db.run('DELETE FROM conversation_turns');
        this.db.run('DELETE FROM conversations');
        this.db.run('DELETE FROM appointment_children');
        this.db.run('DELETE FROM appointments');
        this.db.run('DELETE FROM children');
        this.db.run('DELETE FROM patients');
        this.db.run('DELETE FROM audit_trail');

        for (const patient of data.patients || []) {
          const stmt = this.db.prepare(`
            INSERT INTO patients (id, phone_number, parent_name, address_street, address_city,
                                  address_state, address_zip, preferred_language, last_visit,
                                  notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          stmt.bind([
            patient.id, patient.phone_number, patient.parent_name,
            patient.address_street, patient.address_city, patient.address_state,
            patient.address_zip, patient.preferred_language, patient.last_visit,
            patient.notes, patient.created_at, patient.updated_at
          ]);
          stmt.step();
          stmt.free();
        }

        await this.commit();
        scheduleSave();
      } catch (error) {
        await this.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error importing from JSON:', error);
      throw error;
    }
  }

  // =========================================================================
  // CALL METRICS OPERATIONS
  // =========================================================================

  async createCallMetrics(metrics: Omit<CallMetrics, 'id' | 'createdAt'>): Promise<string> {
    try {
      const id = `CM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const createdAt = new Date().toISOString();

      const stmt = this.db.prepare(`
        INSERT INTO call_metrics (
          id, conversation_id, call_duration_seconds, outcome,
          quality_score, user_satisfaction, interruptions_count,
          fallback_count, error_count, completion_rate, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run([
        id,
        metrics.conversationId,
        metrics.callDurationSeconds ?? null,
        metrics.outcome,
        metrics.qualityScore ?? null,
        metrics.userSatisfaction ?? null,
        metrics.interruptionsCount,
        metrics.fallbackCount,
        metrics.errorCount,
        metrics.completionRate,
        metrics.notes ?? null,
        createdAt
      ]);

      stmt.free();
      scheduleSave();
      return id;
    } catch (error) {
      console.error('Error creating call metrics:', error);
      throw error;
    }
  }

  async getCallMetricsByConversation(conversationId: string): Promise<CallMetrics | null> {
    try {
      const stmt = this.db.prepare(
        'SELECT * FROM call_metrics WHERE conversation_id = ?'
      );
      stmt.bind([conversationId]);

      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();

        return {
          id: row.id as string,
          conversationId: row.conversation_id as string,
          callDurationSeconds: row.call_duration_seconds as number | undefined,
          outcome: row.outcome as 'success' | 'partial' | 'failure' | 'abandoned',
          qualityScore: row.quality_score as number | undefined,
          userSatisfaction: row.user_satisfaction as 'satisfied' | 'neutral' | 'dissatisfied' | undefined,
          interruptionsCount: row.interruptions_count as number,
          fallbackCount: row.fallback_count as number,
          errorCount: row.error_count as number,
          completionRate: row.completion_rate as number,
          notes: row.notes as string | undefined,
          createdAt: row.created_at as string
        };
      }

      stmt.free();
      return null;
    } catch (error) {
      console.error('Error getting call metrics:', error);
      throw error;
    }
  }

  async updateCallMetrics(id: string, updates: Partial<CallMetrics>): Promise<void> {
    try {
      const fields: string[] = [];
      const values: any[] = [];

      if (updates.callDurationSeconds !== undefined) {
        fields.push('call_duration_seconds = ?');
        values.push(updates.callDurationSeconds);
      }
      if (updates.outcome !== undefined) {
        fields.push('outcome = ?');
        values.push(updates.outcome);
      }
      if (updates.qualityScore !== undefined) {
        fields.push('quality_score = ?');
        values.push(updates.qualityScore);
      }
      if (updates.userSatisfaction !== undefined) {
        fields.push('user_satisfaction = ?');
        values.push(updates.userSatisfaction);
      }
      if (updates.interruptionsCount !== undefined) {
        fields.push('interruptions_count = ?');
        values.push(updates.interruptionsCount);
      }
      if (updates.fallbackCount !== undefined) {
        fields.push('fallback_count = ?');
        values.push(updates.fallbackCount);
      }
      if (updates.errorCount !== undefined) {
        fields.push('error_count = ?');
        values.push(updates.errorCount);
      }
      if (updates.completionRate !== undefined) {
        fields.push('completion_rate = ?');
        values.push(updates.completionRate);
      }
      if (updates.notes !== undefined) {
        fields.push('notes = ?');
        values.push(updates.notes);
      }

      if (fields.length === 0) return;

      values.push(id);
      const stmt = this.db.prepare(
        `UPDATE call_metrics SET ${fields.join(', ')} WHERE id = ?`
      );
      stmt.run(values);
      stmt.free();
      scheduleSave();
    } catch (error) {
      console.error('Error updating call metrics:', error);
      throw error;
    }
  }

  async listAllCallMetrics(limit: number = 100, offset: number = 0): Promise<CallMetrics[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM call_metrics
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `);
      stmt.bind([limit, offset]);

      const metrics: CallMetrics[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        metrics.push({
          id: row.id as string,
          conversationId: row.conversation_id as string,
          callDurationSeconds: row.call_duration_seconds as number | undefined,
          outcome: row.outcome as 'success' | 'partial' | 'failure' | 'abandoned',
          qualityScore: row.quality_score as number | undefined,
          userSatisfaction: row.user_satisfaction as 'satisfied' | 'neutral' | 'dissatisfied' | undefined,
          interruptionsCount: row.interruptions_count as number,
          fallbackCount: row.fallback_count as number,
          errorCount: row.error_count as number,
          completionRate: row.completion_rate as number,
          notes: row.notes as string | undefined,
          createdAt: row.created_at as string
        });
      }

      stmt.free();
      return metrics;
    } catch (error) {
      console.error('Error listing call metrics:', error);
      throw error;
    }
  }

  // =========================================================================
  // TEST SCENARIO OPERATIONS
  // =========================================================================

  async createTestScenario(scenario: Omit<TestScenario, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const id = `TS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      const stmt = this.db.prepare(`
        INSERT INTO test_scenarios (
          id, name, description, category, status,
          expected_outcome, setup_script, validation_rules,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run([
        id,
        scenario.name,
        scenario.description ?? null,
        scenario.category,
        scenario.status,
        scenario.expectedOutcome ?? null,
        scenario.setupScript ?? null,
        scenario.validationRules ?? null,
        now,
        now
      ]);

      stmt.free();
      scheduleSave();
      return id;
    } catch (error) {
      console.error('Error creating test scenario:', error);
      throw error;
    }
  }

  async getTestScenarioById(id: string): Promise<TestScenario | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM test_scenarios WHERE id = ?');
      stmt.bind([id]);

      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();

        return {
          id: row.id as string,
          name: row.name as string,
          description: row.description as string | undefined,
          category: row.category as 'functional' | 'edge-case' | 'regression' | 'performance',
          status: row.status as 'active' | 'deprecated' | 'draft',
          expectedOutcome: row.expected_outcome as string | undefined,
          setupScript: row.setup_script as string | undefined,
          validationRules: row.validation_rules as string | undefined,
          createdAt: row.created_at as string,
          updatedAt: row.updated_at as string
        };
      }

      stmt.free();
      return null;
    } catch (error) {
      console.error('Error getting test scenario:', error);
      throw error;
    }
  }

  async updateTestScenario(id: string, updates: Partial<TestScenario>): Promise<void> {
    try {
      const fields: string[] = ['updated_at = ?'];
      const values: any[] = [new Date().toISOString()];

      if (updates.name !== undefined) {
        fields.push('name = ?');
        values.push(updates.name);
      }
      if (updates.description !== undefined) {
        fields.push('description = ?');
        values.push(updates.description);
      }
      if (updates.category !== undefined) {
        fields.push('category = ?');
        values.push(updates.category);
      }
      if (updates.status !== undefined) {
        fields.push('status = ?');
        values.push(updates.status);
      }
      if (updates.expectedOutcome !== undefined) {
        fields.push('expected_outcome = ?');
        values.push(updates.expectedOutcome);
      }
      if (updates.setupScript !== undefined) {
        fields.push('setup_script = ?');
        values.push(updates.setupScript);
      }
      if (updates.validationRules !== undefined) {
        fields.push('validation_rules = ?');
        values.push(updates.validationRules);
      }

      values.push(id);
      const stmt = this.db.prepare(
        `UPDATE test_scenarios SET ${fields.join(', ')} WHERE id = ?`
      );
      stmt.run(values);
      stmt.free();
      scheduleSave();
    } catch (error) {
      console.error('Error updating test scenario:', error);
      throw error;
    }
  }

  async listTestScenarios(status?: string, limit: number = 100, offset: number = 0): Promise<TestScenario[]> {
    try {
      let sql = 'SELECT * FROM test_scenarios';
      const params: any[] = [];

      if (status) {
        sql += ' WHERE status = ?';
        params.push(status);
      }

      sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const stmt = this.db.prepare(sql);
      stmt.bind(params);

      const scenarios: TestScenario[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        scenarios.push({
          id: row.id as string,
          name: row.name as string,
          description: row.description as string | undefined,
          category: row.category as 'functional' | 'edge-case' | 'regression' | 'performance',
          status: row.status as 'active' | 'deprecated' | 'draft',
          expectedOutcome: row.expected_outcome as string | undefined,
          setupScript: row.setup_script as string | undefined,
          validationRules: row.validation_rules as string | undefined,
          createdAt: row.created_at as string,
          updatedAt: row.updated_at as string
        });
      }

      stmt.free();
      return scenarios;
    } catch (error) {
      console.error('Error listing test scenarios:', error);
      throw error;
    }
  }

  async deleteTestScenario(id: string): Promise<void> {
    try {
      const stmt = this.db.prepare('DELETE FROM test_scenarios WHERE id = ?');
      stmt.run([id]);
      stmt.free();
      scheduleSave();
    } catch (error) {
      console.error('Error deleting test scenario:', error);
      throw error;
    }
  }

  // =========================================================================
  // TEST EXECUTION OPERATIONS
  // =========================================================================

  async createTestExecution(execution: Omit<TestExecution, 'id' | 'executedAt'>): Promise<string> {
    try {
      const id = `TE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const executedAt = new Date().toISOString();

      const stmt = this.db.prepare(`
        INSERT INTO test_executions (
          id, scenario_id, conversation_id, test_status,
          expected_result, actual_result, differences,
          execution_time_ms, error_message, executed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run([
        id,
        execution.scenarioId,
        execution.conversationId ?? null,
        execution.testStatus,
        execution.expectedResult ?? null,
        execution.actualResult ?? null,
        execution.differences ?? null,
        execution.executionTimeMs ?? null,
        execution.errorMessage ?? null,
        executedAt
      ]);

      stmt.free();
      scheduleSave();
      return id;
    } catch (error) {
      console.error('Error creating test execution:', error);
      throw error;
    }
  }

  async getTestExecutionById(id: string): Promise<TestExecution | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM test_executions WHERE id = ?');
      stmt.bind([id]);

      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();

        return {
          id: row.id as string,
          scenarioId: row.scenario_id as string,
          conversationId: row.conversation_id as string | undefined,
          testStatus: row.test_status as 'pass' | 'fail' | 'error' | 'skipped',
          expectedResult: row.expected_result as string | undefined,
          actualResult: row.actual_result as string | undefined,
          differences: row.differences as string | undefined,
          executionTimeMs: row.execution_time_ms as number | undefined,
          errorMessage: row.error_message as string | undefined,
          executedAt: row.executed_at as string
        };
      }

      stmt.free();
      return null;
    } catch (error) {
      console.error('Error getting test execution:', error);
      throw error;
    }
  }

  async listTestExecutionsByScenario(scenarioId: string, limit: number = 100): Promise<TestExecution[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM test_executions
        WHERE scenario_id = ?
        ORDER BY executed_at DESC
        LIMIT ?
      `);
      stmt.bind([scenarioId, limit]);

      const executions: TestExecution[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        executions.push({
          id: row.id as string,
          scenarioId: row.scenario_id as string,
          conversationId: row.conversation_id as string | undefined,
          testStatus: row.test_status as 'pass' | 'fail' | 'error' | 'skipped',
          expectedResult: row.expected_result as string | undefined,
          actualResult: row.actual_result as string | undefined,
          differences: row.differences as string | undefined,
          executionTimeMs: row.execution_time_ms as number | undefined,
          errorMessage: row.error_message as string | undefined,
          executedAt: row.executed_at as string
        });
      }

      stmt.free();
      return executions;
    } catch (error) {
      console.error('Error listing test executions:', error);
      throw error;
    }
  }

  async listAllTestExecutions(limit: number = 100, offset: number = 0): Promise<TestExecution[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM test_executions
        ORDER BY executed_at DESC
        LIMIT ? OFFSET ?
      `);
      stmt.bind([limit, offset]);

      const executions: TestExecution[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        executions.push({
          id: row.id as string,
          scenarioId: row.scenario_id as string,
          conversationId: row.conversation_id as string | undefined,
          testStatus: row.test_status as 'pass' | 'fail' | 'error' | 'skipped',
          expectedResult: row.expected_result as string | undefined,
          actualResult: row.actual_result as string | undefined,
          differences: row.differences as string | undefined,
          executionTimeMs: row.execution_time_ms as number | undefined,
          errorMessage: row.error_message as string | undefined,
          executedAt: row.executed_at as string
        });
      }

      stmt.free();
      return executions;
    } catch (error) {
      console.error('Error listing all test executions:', error);
      throw error;
    }
  }

  // =========================================================================
  // SKILL EXECUTION LOG OPERATIONS
  // =========================================================================

  async createSkillExecutionLog(log: Omit<SkillExecutionLog, 'id' | 'createdAt'>): Promise<string> {
    try {
      const id = `SEL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const createdAt = new Date().toISOString();

      const stmt = this.db.prepare(`
        INSERT INTO skill_execution_logs (
          id, conversation_id, skill_name, step_number, step_name,
          tool_used, input_args, output_result, execution_status,
          execution_time_ms, error_message, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run([
        id,
        log.conversationId,
        log.skillName,
        log.stepNumber,
        log.stepName,
        log.toolUsed ?? null,
        log.inputArgs ?? null,
        log.outputResult ?? null,
        log.executionStatus,
        log.executionTimeMs ?? null,
        log.errorMessage ?? null,
        createdAt
      ]);

      stmt.free();
      scheduleSave();
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
      stmt.bind([conversationId]);

      const logs: SkillExecutionLog[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        logs.push({
          id: row.id as string,
          conversationId: row.conversation_id as string,
          skillName: row.skill_name as string,
          stepNumber: row.step_number as number,
          stepName: row.step_name as string,
          toolUsed: row.tool_used as string | undefined,
          inputArgs: row.input_args as string | undefined,
          outputResult: row.output_result as string | undefined,
          executionStatus: row.execution_status as 'success' | 'failure' | 'skipped',
          executionTimeMs: row.execution_time_ms as number | undefined,
          errorMessage: row.error_message as string | undefined,
          createdAt: row.created_at as string
        });
      }

      stmt.free();
      return logs;
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
      stmt.bind([skillName, limit]);

      const logs: SkillExecutionLog[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        logs.push({
          id: row.id as string,
          conversationId: row.conversation_id as string,
          skillName: row.skill_name as string,
          stepNumber: row.step_number as number,
          stepName: row.step_name as string,
          toolUsed: row.tool_used as string | undefined,
          inputArgs: row.input_args as string | undefined,
          outputResult: row.output_result as string | undefined,
          executionStatus: row.execution_status as 'success' | 'failure' | 'skipped',
          executionTimeMs: row.execution_time_ms as number | undefined,
          errorMessage: row.error_message as string | undefined,
          createdAt: row.created_at as string
        });
      }

      stmt.free();
      return logs;
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
      stmt.bind([limit, offset]);

      const logs: SkillExecutionLog[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        logs.push({
          id: row.id as string,
          conversationId: row.conversation_id as string,
          skillName: row.skill_name as string,
          stepNumber: row.step_number as number,
          stepName: row.step_name as string,
          toolUsed: row.tool_used as string | undefined,
          inputArgs: row.input_args as string | undefined,
          outputResult: row.output_result as string | undefined,
          executionStatus: row.execution_status as 'success' | 'failure' | 'skipped',
          executionTimeMs: row.execution_time_ms as number | undefined,
          errorMessage: row.error_message as string | undefined,
          createdAt: row.created_at as string
        });
      }

      stmt.free();
      return logs;
    } catch (error) {
      console.error('Error listing all skill executions:', error);
      throw error;
    }
  }

  close(): void {
    this.db.close();
  }
}
