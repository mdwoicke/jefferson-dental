/**
 * Database API Routes
 * Provides REST API access to the backend database for browser clients
 * This enables unified logging where both browser and telephony calls are stored in the same database
 */

import { Router } from 'express';
import { DatabaseAdapter } from '../database/db-interface';

export function createDatabaseAPIRouter(dbAdapter: DatabaseAdapter): Router {
  const router = Router();

  // ============================================================================
  // CONVERSATION ENDPOINTS
  // ============================================================================

  /**
   * GET /api/db/conversations - List all conversations with optional filters
   */
  router.get('/conversations', async (req, res) => {
    try {
      const filters = {
        patient_id: req.query.patient_id as string | undefined,
        phone_number: req.query.phone_number as string | undefined,
        from_date: req.query.from_date as string | undefined,
        to_date: req.query.to_date as string | undefined,
        outcome: req.query.outcome as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0
      };

      const conversations = await dbAdapter.listConversations(filters);
      res.json({ conversations, count: conversations.length });
    } catch (error: any) {
      console.error('❌ Error listing conversations:', error);
      res.status(500).json({ error: error.message || 'Failed to list conversations' });
    }
  });

  /**
   * GET /api/db/conversations/:id - Get conversation by ID
   */
  router.get('/conversations/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const conversation = await dbAdapter.getConversation(id);

      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      res.json(conversation);
    } catch (error: any) {
      console.error('❌ Error getting conversation:', error);
      res.status(500).json({ error: error.message || 'Failed to get conversation' });
    }
  });

  /**
   * POST /api/db/conversations - Create a new conversation
   */
  router.post('/conversations', async (req, res) => {
    try {
      const data = req.body;
      await dbAdapter.createConversation(data);
      res.status(201).json({ success: true, id: data.id });
    } catch (error: any) {
      console.error('❌ Error creating conversation:', error);
      res.status(500).json({ error: error.message || 'Failed to create conversation' });
    }
  });

  /**
   * PUT /api/db/conversations/:id/end - End a conversation
   */
  router.put('/conversations/:id/end', async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      await dbAdapter.endConversation(id, data);
      res.json({ success: true });
    } catch (error: any) {
      console.error('❌ Error ending conversation:', error);
      res.status(500).json({ error: error.message || 'Failed to end conversation' });
    }
  });

  /**
   * GET /api/db/conversations/:id/turns - Get conversation history (all turns)
   */
  router.get('/conversations/:id/turns', async (req, res) => {
    try {
      const { id } = req.params;
      const turns = await dbAdapter.getConversationHistory(id);
      res.json({ turns, count: turns.length });
    } catch (error: any) {
      console.error('❌ Error getting conversation turns:', error);
      res.status(500).json({ error: error.message || 'Failed to get conversation turns' });
    }
  });

  /**
   * POST /api/db/conversations/:id/turns - Log a conversation turn
   */
  router.post('/conversations/:id/turns', async (req, res) => {
    try {
      const data = {
        ...req.body,
        conversation_id: req.params.id
      };
      const turnId = await dbAdapter.logConversationTurn(data);
      res.status(201).json({ success: true, id: turnId });
    } catch (error: any) {
      console.error('❌ Error logging conversation turn:', error);
      res.status(500).json({ error: error.message || 'Failed to log conversation turn' });
    }
  });

  // ============================================================================
  // FUNCTION CALL ENDPOINTS
  // ============================================================================

  /**
   * GET /api/db/conversations/:id/function-calls - Get function calls for a conversation
   */
  router.get('/conversations/:id/function-calls', async (req, res) => {
    try {
      const { id } = req.params;
      const functionCalls = await dbAdapter.getFunctionCalls(id);
      res.json({ functionCalls, count: functionCalls.length });
    } catch (error: any) {
      console.error('❌ Error getting function calls:', error);
      res.status(500).json({ error: error.message || 'Failed to get function calls' });
    }
  });

  /**
   * POST /api/db/function-calls - Log a function call
   */
  router.post('/function-calls', async (req, res) => {
    try {
      const data = req.body;
      const functionCallId = await dbAdapter.logFunctionCall(data);
      res.status(201).json({ success: true, id: functionCallId });
    } catch (error: any) {
      console.error('❌ Error logging function call:', error);
      res.status(500).json({ error: error.message || 'Failed to log function call' });
    }
  });

  /**
   * PUT /api/db/function-calls/:id/result - Update function call result
   */
  router.put('/function-calls/:id/result', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = req.body;
      await dbAdapter.updateFunctionCallResult(id, data);
      res.json({ success: true });
    } catch (error: any) {
      console.error('❌ Error updating function call result:', error);
      res.status(500).json({ error: error.message || 'Failed to update function call result' });
    }
  });

  /**
   * PUT /api/db/function-calls/:id/error - Update function call error
   */
  router.put('/function-calls/:id/error', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { errorMessage } = req.body;
      await dbAdapter.updateFunctionCallError(id, errorMessage);
      res.json({ success: true });
    } catch (error: any) {
      console.error('❌ Error updating function call error:', error);
      res.status(500).json({ error: error.message || 'Failed to update function call error' });
    }
  });

  // ============================================================================
  // APPOINTMENT ENDPOINTS
  // ============================================================================

  /**
   * GET /api/db/appointments - List all appointments
   */
  router.get('/appointments', async (req, res) => {
    try {
      const filters: any = {
        patient_id: req.query.patient_id as string | undefined,
        from_date: req.query.from_date as string | undefined,
        to_date: req.query.to_date as string | undefined
      };

      // Handle status parameter (can be string or string[])
      if (req.query.status) {
        const status = req.query.status as string;
        filters.status = status.split(','); // Convert comma-separated to array
      }

      const appointments = await dbAdapter.listAppointments(filters);
      res.json({ appointments, count: appointments.length });
    } catch (error: any) {
      console.error('❌ Error listing appointments:', error);
      res.status(500).json({ error: error.message || 'Failed to list appointments' });
    }
  });

  /**
   * POST /api/db/appointments - Create an appointment
   */
  router.post('/appointments', async (req, res) => {
    try {
      const data = req.body;
      const appointmentId = await dbAdapter.createAppointment(data);
      res.status(201).json({ success: true, id: appointmentId });
    } catch (error: any) {
      console.error('❌ Error creating appointment:', error);
      res.status(500).json({ error: error.message || 'Failed to create appointment' });
    }
  });

  /**
   * PUT /api/db/appointments/:id - Update appointment
   */
  router.put('/appointments/:id', async (req, res) => {
    try {
      const id = req.params.id; // Keep as string
      const data = req.body;
      await dbAdapter.updateAppointment(id, data);
      res.json({ success: true });
    } catch (error: any) {
      console.error('❌ Error updating appointment:', error);
      res.status(500).json({ error: error.message || 'Failed to update appointment' });
    }
  });

  /**
   * POST /api/db/appointments/:id/children - Link child to appointment
   */
  router.post('/appointments/:id/children', async (req, res) => {
    try {
      const appointmentId = req.params.id;
      const { childId } = req.body;
      await dbAdapter.linkChildToAppointment(appointmentId, childId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('❌ Error linking child to appointment:', error);
      res.status(500).json({ error: error.message || 'Failed to link child to appointment' });
    }
  });

  /**
   * GET /api/db/appointments/:id/children - Get children for appointment
   */
  router.get('/appointments/:id/children', async (req, res) => {
    try {
      const appointmentId = req.params.id;
      const children = await dbAdapter.getAppointmentChildren(appointmentId);
      res.json({ children, count: children.length });
    } catch (error: any) {
      console.error('❌ Error getting appointment children:', error);
      res.status(500).json({ error: error.message || 'Failed to get appointment children' });
    }
  });

  // ============================================================================
  // PATIENT ENDPOINTS
  // ============================================================================

  /**
   * GET /api/db/patients - List all patients
   */
  router.get('/patients', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const patients = await dbAdapter.listPatients(limit, offset);
      res.json({ patients, count: patients.length });
    } catch (error: any) {
      console.error('❌ Error listing patients:', error);
      res.status(500).json({ error: error.message || 'Failed to list patients' });
    }
  });

  /**
   * GET /api/db/patients/:id - Get patient by ID
   */
  router.get('/patients/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const patient = await dbAdapter.getPatientById(id);

      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      res.json(patient);
    } catch (error: any) {
      console.error('❌ Error getting patient:', error);
      res.status(500).json({ error: error.message || 'Failed to get patient' });
    }
  });

  /**
   * GET /api/db/patients/phone/:phoneNumber - Get patient by phone
   */
  router.get('/patients/phone/:phoneNumber', async (req, res) => {
    try {
      const { phoneNumber } = req.params;
      const patient = await dbAdapter.getPatient(phoneNumber);

      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      res.json(patient);
    } catch (error: any) {
      console.error('❌ Error getting patient by phone:', error);
      res.status(500).json({ error: error.message || 'Failed to get patient by phone' });
    }
  });

  /**
   * POST /api/db/patients - Create patient
   */
  router.post('/patients', async (req, res) => {
    try {
      const data = req.body;
      const patientId = await dbAdapter.createPatient(data);
      res.status(201).json({ success: true, id: patientId });
    } catch (error: any) {
      console.error('❌ Error creating patient:', error);
      res.status(500).json({ error: error.message || 'Failed to create patient' });
    }
  });

  /**
   * PUT /api/db/patients/:id - Update patient
   */
  router.put('/patients/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      await dbAdapter.updatePatient(id, data);
      res.json({ success: true });
    } catch (error: any) {
      console.error('❌ Error updating patient:', error);
      res.status(500).json({ error: error.message || 'Failed to update patient' });
    }
  });

  /**
   * DELETE /api/db/patients/:id - Delete patient
   */
  router.delete('/patients/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await dbAdapter.deletePatient(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('❌ Error deleting patient:', error);
      res.status(500).json({ error: error.message || 'Failed to delete patient' });
    }
  });

  // ============================================================================
  // CHILDREN ENDPOINTS
  // ============================================================================

  /**
   * GET /api/db/patients/:patientId/children - Get children for a patient
   */
  router.get('/patients/:patientId/children', async (req, res) => {
    try {
      const { patientId } = req.params;
      const children = await dbAdapter.getChildrenByPatient(patientId);
      res.json({ children, count: children.length });
    } catch (error: any) {
      console.error('❌ Error getting children:', error);
      res.status(500).json({ error: error.message || 'Failed to get children' });
    }
  });

  /**
   * POST /api/db/children - Add child
   */
  router.post('/children', async (req, res) => {
    try {
      const { patient_id, ...childData } = req.body;
      const childId = await dbAdapter.createChild(patient_id, childData);
      res.status(201).json({ success: true, id: childId });
    } catch (error: any) {
      console.error('❌ Error adding child:', error);
      res.status(500).json({ error: error.message || 'Failed to add child' });
    }
  });

  /**
   * PUT /api/db/children/:id - Update child
   */
  router.put('/children/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = req.body;
      await dbAdapter.updateChild(id, data);
      res.json({ success: true });
    } catch (error: any) {
      console.error('❌ Error updating child:', error);
      res.status(500).json({ error: error.message || 'Failed to update child' });
    }
  });

  /**
   * DELETE /api/db/children/:id - Delete child
   */
  router.delete('/children/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await dbAdapter.deleteChild(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('❌ Error deleting child:', error);
      res.status(500).json({ error: error.message || 'Failed to delete child' });
    }
  });

  // Note: Call metrics and test scenarios endpoints
  // are not implemented in the backend DatabaseAdapter interface yet.
  // These features are only available in the frontend BrowserDatabaseAdapter.

  // ============================================================================
  // AUDIT LOG ENDPOINTS
  // ============================================================================

  /**
   * POST /api/db/audit - Log audit entry
   */
  router.post('/audit', async (req, res) => {
    try {
      const data = req.body;
      await dbAdapter.logAudit(data);
      res.status(201).json({ success: true });
    } catch (error: any) {
      console.error('❌ Error logging audit:', error);
      res.status(500).json({ error: error.message || 'Failed to log audit' });
    }
  });

  // ============================================================================
  // SKILL EXECUTION LOG ENDPOINTS
  // ============================================================================

  /**
   * GET /api/db/skill-executions - List all skill executions with pagination
   */
  router.get('/skill-executions', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const executions = await dbAdapter.listAllSkillExecutions(limit, offset);
      res.json({ executions, count: executions.length });
    } catch (error: any) {
      console.error('❌ Error listing skill executions:', error);
      res.status(500).json({ error: error.message || 'Failed to list skill executions' });
    }
  });

  /**
   * GET /api/db/conversations/:conversationId/skill-executions - List skill executions by conversation
   */
  router.get('/conversations/:conversationId/skill-executions', async (req, res) => {
    try {
      const { conversationId } = req.params;
      const executions = await dbAdapter.listSkillExecutionsByConversation(conversationId);
      res.json({ executions, count: executions.length });
    } catch (error: any) {
      console.error('❌ Error listing skill executions by conversation:', error);
      res.status(500).json({ error: error.message || 'Failed to list skill executions by conversation' });
    }
  });

  /**
   * GET /api/db/skills/:skillName/executions - List skill executions by skill name
   */
  router.get('/skills/:skillName/executions', async (req, res) => {
    try {
      const { skillName } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const executions = await dbAdapter.listSkillExecutionsBySkill(skillName, limit);
      res.json({ executions, count: executions.length });
    } catch (error: any) {
      console.error('❌ Error listing skill executions by skill:', error);
      res.status(500).json({ error: error.message || 'Failed to list skill executions by skill' });
    }
  });

  /**
   * POST /api/db/skill-executions - Create new skill execution log entry
   */
  router.post('/skill-executions', async (req, res) => {
    try {
      const data = req.body;
      const executionId = await dbAdapter.createSkillExecutionLog(data);
      res.status(201).json({ success: true, id: executionId });
    } catch (error: any) {
      console.error('❌ Error creating skill execution log:', error);
      res.status(500).json({ error: error.message || 'Failed to create skill execution log' });
    }
  });

  return router;
}
