/**
 * CRM Service
 * Manages patient information using database adapter
 */

import { DatabaseAdapter, PatientRecord } from '../database/db-interface';

export class CRMService {
  constructor(private dbAdapter: DatabaseAdapter) {}

  /**
   * Get patient information from database by phone number
   */
  async getPatientInfo(phoneNumber: string): Promise<PatientRecord | null> {
    console.log('👤 Looking up patient:', phoneNumber);

    try {
      const patient = await this.dbAdapter.getPatient(phoneNumber);

      if (patient) {
        console.log('✅ Patient found:', patient.parentName);
      } else {
        console.log('⚠️  Patient not found');
      }

      return patient;
    } catch (error) {
      console.error('❌ Error getting patient info:', error);
      throw error;
    }
  }

  /**
   * Get patient information by patient ID
   */
  async getPatientById(patientId: string): Promise<PatientRecord | null> {
    console.log('👤 Looking up patient by ID:', patientId);

    try {
      const patient = await this.dbAdapter.getPatientById(patientId);

      if (patient) {
        console.log('✅ Patient found:', patient.parentName);
      } else {
        console.log('⚠️  Patient not found');
      }

      return patient;
    } catch (error) {
      console.error('❌ Error getting patient by ID:', error);
      throw error;
    }
  }

  /**
   * Create a new patient
   */
  async createPatient(patient: Omit<PatientRecord, 'id'>): Promise<string> {
    console.log('➕ Creating new patient:', patient.parentName);

    try {
      const patientId = `PAT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      await this.dbAdapter.createPatient({
        ...patient,
        id: patientId
      });

      // Log audit trail
      await this.dbAdapter.logAudit({
        table_name: 'patients',
        record_id: patientId,
        operation: 'INSERT',
        changed_by: 'system',
        change_reason: 'New patient created via CRM service'
      });

      console.log('✅ Patient created:', patientId);
      return patientId;
    } catch (error) {
      console.error('❌ Error creating patient:', error);
      throw error;
    }
  }

  /**
   * Update existing patient
   */
  async updatePatient(patientId: string, updates: Partial<PatientRecord>): Promise<void> {
    console.log('✏️  Updating patient:', patientId);

    try {
      // Get old patient data for audit trail
      const oldPatient = await this.dbAdapter.getPatientById(patientId);

      if (!oldPatient) {
        throw new Error(`Patient ${patientId} not found`);
      }

      // Update patient basic info
      await this.dbAdapter.updatePatient(patientId, updates);

      // Handle children updates if provided
      if (updates.children) {
        console.log(`📝 Updating ${updates.children.length} children for patient ${patientId}`);

        // Get existing children IDs
        const existingChildren = await this.dbAdapter.getChildrenByPatient(patientId);
        const existingChildIds = new Set(existingChildren.map(c => c.id));

        // Process each child in the update
        for (const child of updates.children) {
          if (child.id && existingChildIds.has(child.id)) {
            // Update existing child
            console.log(`  ✏️  Updating child ${child.id}: ${child.name}`);
            await this.dbAdapter.updateChild(child.id, {
              name: child.name,
              age: child.age,
              medicaid_id: child.medicaid_id,
              date_of_birth: child.date_of_birth,
              special_needs: child.special_needs
            });

            // Mark as processed
            existingChildIds.delete(child.id);
          } else if (!child.id || !existingChildIds.has(child.id)) {
            // Create new child (no ID or ID doesn't exist)
            console.log(`  ➕ Creating new child: ${child.name}`);
            await this.addChild(patientId, {
              name: child.name,
              age: child.age,
              medicaid_id: child.medicaid_id || '',
              date_of_birth: child.date_of_birth,
              special_needs: child.special_needs
            });
          }
        }

        // Delete children that were not in the update list
        for (const orphanedChildId of existingChildIds) {
          console.log(`  🗑️  Deleting removed child ${orphanedChildId}`);
          await this.deleteChild(orphanedChildId);
        }

        console.log(`✅ Children updated for patient ${patientId}`);
      }

      // Log audit trail for each updated field
      for (const [field, newValue] of Object.entries(updates)) {
        if (field !== 'children') { // Skip children array in audit (children have their own audit)
          await this.dbAdapter.logAudit({
            table_name: 'patients',
            record_id: patientId,
            operation: 'UPDATE',
            field_name: field,
            old_value: (oldPatient as any)[field],
            new_value: newValue,
            changed_by: 'system',
            change_reason: `Patient ${field} updated`
          });
        }
      }

      console.log('✅ Patient updated:', patientId);
    } catch (error) {
      console.error('❌ Error updating patient:', error);
      throw error;
    }
  }

  /**
   * Delete patient (cascades to children and appointments)
   */
  async deletePatient(patientId: string): Promise<void> {
    console.log('🗑️  Deleting patient:', patientId);

    try {
      // Get patient data for audit trail
      const patient = await this.dbAdapter.getPatientById(patientId);

      if (!patient) {
        throw new Error(`Patient ${patientId} not found`);
      }

      // Delete patient (cascades to children and appointments)
      await this.dbAdapter.deletePatient(patientId);

      // Log audit trail
      await this.dbAdapter.logAudit({
        table_name: 'patients',
        record_id: patientId,
        operation: 'DELETE',
        old_value: patient,
        changed_by: 'system',
        change_reason: 'Patient deleted via CRM service'
      });

      console.log('✅ Patient deleted:', patientId);
    } catch (error) {
      console.error('❌ Error deleting patient:', error);
      throw error;
    }
  }

  /**
   * List all patients with pagination
   */
  async listPatients(limit: number = 100, offset: number = 0): Promise<PatientRecord[]> {
    console.log(`📋 Listing patients (limit: ${limit}, offset: ${offset})`);

    try {
      const patients = await this.dbAdapter.listPatients(limit, offset);
      console.log(`✅ Found ${patients.length} patients`);
      return patients;
    } catch (error) {
      console.error('❌ Error listing patients:', error);
      throw error;
    }
  }

  /**
   * Add child to patient
   */
  async addChild(
    patientId: string,
    child: { name: string; age: number; medicaid_id: string; date_of_birth?: string; special_needs?: string }
  ): Promise<number> {
    console.log(`➕ Adding child to patient ${patientId}:`, child.name);

    try {
      const childId = await this.dbAdapter.createChild(patientId, child);

      // Log audit trail
      await this.dbAdapter.logAudit({
        table_name: 'children',
        record_id: childId.toString(),
        operation: 'INSERT',
        new_value: child,
        changed_by: 'system',
        change_reason: `Child ${child.name} added to patient ${patientId}`
      });

      console.log('✅ Child added:', childId);
      return childId;
    } catch (error) {
      console.error('❌ Error adding child:', error);
      throw error;
    }
  }

  /**
   * Update child information
   */
  async updateChild(
    childId: number,
    updates: { name?: string; age?: number; medicaid_id?: string; date_of_birth?: string; special_needs?: string }
  ): Promise<void> {
    console.log(`✏️  Updating child ${childId}`);

    try {
      await this.dbAdapter.updateChild(childId, updates);

      // Log audit trail
      await this.dbAdapter.logAudit({
        table_name: 'children',
        record_id: childId.toString(),
        operation: 'UPDATE',
        new_value: updates,
        changed_by: 'system',
        change_reason: `Child ${childId} information updated`
      });

      console.log('✅ Child updated:', childId);
    } catch (error) {
      console.error('❌ Error updating child:', error);
      throw error;
    }
  }

  /**
   * Delete child
   */
  async deleteChild(childId: number): Promise<void> {
    console.log(`🗑️  Deleting child ${childId}`);

    try {
      await this.dbAdapter.deleteChild(childId);

      // Log audit trail
      await this.dbAdapter.logAudit({
        table_name: 'children',
        record_id: childId.toString(),
        operation: 'DELETE',
        changed_by: 'system',
        change_reason: `Child ${childId} deleted`
      });

      console.log('✅ Child deleted:', childId);
    } catch (error) {
      console.error('❌ Error deleting child:', error);
      throw error;
    }
  }

  /**
   * Get children for a patient
   */
  async getChildren(patientId: string) {
    console.log(`👶 Getting children for patient ${patientId}`);

    try {
      const children = await this.dbAdapter.getChildrenByPatient(patientId);
      console.log(`✅ Found ${children.length} children`);
      return children;
    } catch (error) {
      console.error('❌ Error getting children:', error);
      throw error;
    }
  }
}
