/**
 * Frontend API Client
 * Makes HTTP requests to the backend API for patient data
 */

import type { PatientRecord } from '../database/db-interface';

const API_BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';

/**
 * API Client for backend communication
 */
export class APIClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * List all patients
   */
  async listPatients(limit: number = 100, offset: number = 0): Promise<PatientRecord[]> {
    const response = await fetch(`${this.baseUrl}/api/patients?limit=${limit}&offset=${offset}`);

    if (!response.ok) {
      throw new Error(`Failed to list patients: ${response.statusText}`);
    }

    const data = await response.json();
    return data.patients;
  }

  /**
   * Get patient by ID
   */
  async getPatientById(id: string): Promise<PatientRecord | null> {
    const response = await fetch(`${this.baseUrl}/api/patients/${id}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to get patient: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get patient by phone number
   */
  async getPatientByPhone(phoneNumber: string): Promise<PatientRecord | null> {
    const response = await fetch(`${this.baseUrl}/api/patients/phone/${encodeURIComponent(phoneNumber)}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to get patient by phone: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Create new patient
   */
  async createPatient(patientData: Omit<PatientRecord, 'id'>): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/patients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(patientData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create patient');
    }

    const data = await response.json();
    return data.id;
  }

  /**
   * Update patient
   */
  async updatePatient(id: string, updates: Partial<PatientRecord>): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/patients/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update patient');
    }
  }

  /**
   * Delete patient
   */
  async deletePatient(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/patients/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete patient');
    }
  }
}

// Export singleton instance
export const apiClient = new APIClient();
