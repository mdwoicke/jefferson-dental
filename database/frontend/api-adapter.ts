/**
 * API-Based Database Adapter
 * Makes HTTP requests to the backend database API for unified storage
 * This allows both browser and telephony calls to be stored in the same database
 */

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

export class APIBasedDatabaseAdapter implements DatabaseAdapter {
  private baseUrl: string;

  constructor(backendUrl: string = 'http://localhost:3001') {
    this.baseUrl = `${backendUrl}/api/db`;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // =========================================================================
  // PATIENT OPERATIONS
  // =========================================================================

  async getPatient(phoneNumber: string): Promise<PatientRecord | null> {
    try {
      const result = await this.request<PatientRecord>(`/patients/phone/${encodeURIComponent(phoneNumber)}`);
      return result;
    } catch (error: any) {
      if (error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async getPatientById(id: string): Promise<PatientRecord | null> {
    try {
      const result = await this.request<PatientRecord>(`/patients/${id}`);
      return result;
    } catch (error: any) {
      if (error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async listPatients(limit?: number, offset?: number): Promise<PatientRecord[]> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());

    const result = await this.request<{ patients: PatientRecord[] }>(`/patients?${params}`);
    return result.patients;
  }

  async createPatient(data: Omit<PatientRecord, 'id' | 'children'>): Promise<string> {
    const result = await this.request<{ id: string }>('/patients', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return result.id;
  }

  async updatePatient(id: string, data: Partial<PatientRecord>): Promise<void> {
    await this.request(`/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deletePatient(id: string): Promise<void> {
    await this.request(`/patients/${id}`, {
      method: 'DELETE'
    });
  }

  // =========================================================================
  // CHILDREN OPERATIONS
  // =========================================================================

  async getChildrenByPatient(patientId: string): Promise<Child[]> {
    const result = await this.request<{ children: Child[] }>(`/patients/${patientId}/children`);
    return result.children;
  }

  async addChild(data: Omit<Child, 'id' | 'created_at'>): Promise<number> {
    const result = await this.request<{ id: number }>('/children', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return result.id;
  }

  async updateChild(id: number, data: Partial<Child>): Promise<void> {
    await this.request(`/children/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteChild(id: number): Promise<void> {
    await this.request(`/children/${id}`, {
      method: 'DELETE'
    });
  }

  // =========================================================================
  // APPOINTMENT OPERATIONS
  // =========================================================================

  async listAppointments(filters?: AppointmentFilters): Promise<Appointment[]> {
    const params = new URLSearchParams();
    if (filters?.patient_id) params.append('patient_id', filters.patient_id);
    if (filters?.child_id) params.append('child_id', filters.child_id.toString());
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const result = await this.request<{ appointments: Appointment[] }>(`/appointments?${params}`);
    return result.appointments;
  }

  async createAppointment(data: CreateAppointmentData): Promise<string> {
    const result = await this.request<{ id: string }>('/appointments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return result.id;
  }

  async updateAppointment(id: string, data: Partial<Appointment>): Promise<void> {
    await this.request(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async cancelAppointment(id: number): Promise<void> {
    await this.request(`/appointments/${id}`, {
      method: 'DELETE'
    });
  }

  async linkChildToAppointment(appointmentId: string, childId: number): Promise<void> {
    await this.request(`/appointments/${appointmentId}/children`, {
      method: 'POST',
      body: JSON.stringify({ childId })
    });
  }

  async getAppointmentChildren(appointmentId: string): Promise<Child[]> {
    const result = await this.request<{ children: Child[] }>(`/appointments/${appointmentId}/children`);
    return result.children;
  }

  async getAppointment(appointmentId: string): Promise<Appointment | null> {
    try {
      const result = await this.request<Appointment>(`/appointments/${appointmentId}`);
      return result;
    } catch (error: any) {
      if (error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  // =========================================================================
  // CONVERSATION OPERATIONS
  // =========================================================================

  async createConversation(data: CreateConversationData): Promise<void> {
    await this.request('/conversations', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getConversation(conversationId: string): Promise<Conversation | null> {
    try {
      const result = await this.request<Conversation>(`/conversations/${conversationId}`);
      return result;
    } catch (error: any) {
      if (error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async endConversation(
    conversationId: string,
    data: { ended_at: string; duration_seconds: number; outcome: string; outcome_details: string | null }
  ): Promise<void> {
    await this.request(`/conversations/${conversationId}/end`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
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
    const params = new URLSearchParams();
    if (filters?.patient_id) params.append('patient_id', filters.patient_id);
    if (filters?.phone_number) params.append('phone_number', filters.phone_number);
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);
    if (filters?.outcome) params.append('outcome', filters.outcome);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const result = await this.request<{ conversations: Conversation[] }>(`/conversations?${params}`);
    return result.conversations;
  }

  async logConversationTurn(data: {
    conversation_id: string;
    turn_number: number;
    role: 'user' | 'assistant' | 'system';
    content_type: 'text' | 'audio' | 'function_call' | 'function_result';
    content_text: string | null;
    audio_data: Uint8Array | null;
    timestamp: string;
  }): Promise<number> {
    // Convert Uint8Array to base64 for JSON transport
    const dataToSend = {
      ...data,
      audio_data: data.audio_data ? btoa(String.fromCharCode(...data.audio_data)) : null
    };

    const result = await this.request<{ id: number }>(`/conversations/${data.conversation_id}/turns`, {
      method: 'POST',
      body: JSON.stringify(dataToSend)
    });
    return result.id;
  }

  async getConversationHistory(conversationId: string): Promise<ConversationTurn[]> {
    const result = await this.request<{ turns: ConversationTurn[] }>(`/conversations/${conversationId}/turns`);
    return result.turns;
  }

  // =========================================================================
  // FUNCTION CALL OPERATIONS
  // =========================================================================

  async logFunctionCall(data: {
    conversation_id: string;
    call_id: string | null;
    function_name: string;
    arguments: string;
    status: string;
    timestamp: string;
  }): Promise<number> {
    const result = await this.request<{ id: number }>('/function-calls', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return result.id;
  }

  async updateFunctionCallResult(
    functionCallId: number,
    data: {
      result: string;
      status: 'success' | 'error';
      execution_time_ms?: number;
      error_message?: string;
    }
  ): Promise<void> {
    await this.request(`/function-calls/${functionCallId}/result`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async updateFunctionCallError(functionCallId: number, errorMessage: string): Promise<void> {
    await this.request(`/function-calls/${functionCallId}/error`, {
      method: 'PUT',
      body: JSON.stringify({ errorMessage })
    });
  }

  async getFunctionCalls(conversationId: string): Promise<FunctionCallLog[]> {
    const result = await this.request<{ functionCalls: FunctionCallLog[] }>(
      `/conversations/${conversationId}/function-calls`
    );
    return result.functionCalls;
  }

  // =========================================================================
  // CALL METRICS OPERATIONS
  // =========================================================================

  async recordCallMetrics(data: Omit<CallMetrics, 'id' | 'created_at'>): Promise<void> {
    await this.request('/call-metrics', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async listCallMetrics(filters?: {
    conversation_id?: string;
    from_date?: string;
    to_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<CallMetrics[]> {
    const params = new URLSearchParams();
    if (filters?.conversation_id) params.append('conversation_id', filters.conversation_id);
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const result = await this.request<{ metrics: CallMetrics[] }>(`/call-metrics?${params}`);
    return result.metrics;
  }

  // =========================================================================
  // TEST SCENARIO OPERATIONS
  // =========================================================================

  async createTestScenario(data: Omit<TestScenario, 'id' | 'created_at'>): Promise<number> {
    const result = await this.request<{ id: number }>('/test-scenarios', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return result.id;
  }

  async listTestScenarios(): Promise<TestScenario[]> {
    const result = await this.request<{ scenarios: TestScenario[] }>('/test-scenarios');
    return result.scenarios;
  }

  async recordTestExecution(data: Omit<TestExecution, 'id' | 'executed_at'>): Promise<number> {
    const result = await this.request<{ id: number }>('/test-executions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return result.id;
  }

  async listTestExecutions(filters?: {
    scenario_id?: number;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<TestExecution[]> {
    const params = new URLSearchParams();
    if (filters?.scenario_id) params.append('scenario_id', filters.scenario_id.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const result = await this.request<{ executions: TestExecution[] }>(`/test-executions?${params}`);
    return result.executions;
  }

  // =========================================================================
  // SKILL EXECUTION OPERATIONS
  // =========================================================================

  async logSkillExecution(data: Omit<SkillExecutionLog, 'id' | 'started_at'>): Promise<number> {
    const result = await this.request<{ id: number }>('/skill-executions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return result.id;
  }

  async updateSkillExecution(
    id: number,
    data: {
      status?: 'running' | 'completed' | 'failed';
      ended_at?: string;
      result?: string;
      error_message?: string;
    }
  ): Promise<void> {
    await this.request(`/skill-executions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async listSkillExecutionLogs(filters?: {
    conversation_id?: string;
    skill_name?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<SkillExecutionLog[]> {
    const params = new URLSearchParams();
    if (filters?.conversation_id) params.append('conversation_id', filters.conversation_id);
    if (filters?.skill_name) params.append('skill_name', filters.skill_name);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const result = await this.request<{ logs: SkillExecutionLog[] }>(`/skill-executions?${params}`);
    return result.logs;
  }

  async createSkillExecutionLog(log: Omit<SkillExecutionLog, 'id' | 'createdAt'>): Promise<string> {
    const result = await this.request<{ id: string }>('/skill-executions', {
      method: 'POST',
      body: JSON.stringify(log)
    });
    return result.id;
  }

  async listSkillExecutionsByConversation(conversationId: string): Promise<SkillExecutionLog[]> {
    const result = await this.request<{ executions: SkillExecutionLog[] }>(
      `/conversations/${conversationId}/skill-executions`
    );
    return result.executions;
  }

  async listSkillExecutionsBySkill(skillName: string, limit: number = 100): Promise<SkillExecutionLog[]> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());

    const result = await this.request<{ executions: SkillExecutionLog[] }>(
      `/skills/${encodeURIComponent(skillName)}/executions?${params}`
    );
    return result.executions;
  }

  async listAllSkillExecutions(limit: number = 100, offset: number = 0): Promise<SkillExecutionLog[]> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    const result = await this.request<{ executions: SkillExecutionLog[] }>(`/skill-executions?${params}`);
    return result.executions;
  }

  // =========================================================================
  // AUDIT LOG OPERATIONS
  // =========================================================================

  async logAudit(data: Omit<AuditRecord, 'id' | 'changed_at'>): Promise<void> {
    await this.request('/audit', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
}
