import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { CallManager } from './call-manager';
import { config, validateConfig } from './config';
import { InitiateCallRequest, CallResponse, CallState } from './types';
import { createDatabaseAPIRouter } from './routes/database-api';

// Validate configuration
validateConfig();

const app = express();
const server = createServer(app);

// WebSocket server for frontend communication
const frontendWss = new WebSocketServer({ noServer: true });

// WebSocket server for Twilio media streams
const mediaWss = new WebSocketServer({ noServer: true });

// Call manager instance
const callManager = new CallManager();

// Middleware
app.use(cors({
  origin: [
    config.server.frontendUrl,
    'http://localhost:5173',  // Vite default port (HTTP)
    'https://localhost:5173',  // Vite default port (HTTPS)
    'http://localhost:5174',  // Vite alternative port (HTTP)
    'https://localhost:5174',  // Vite alternative port (HTTPS)
    'http://localhost:5175',  // Vite alternative port (HTTP)
    'https://localhost:5175',  // Vite alternative port (HTTPS)
    'http://localhost:5176',  // Vite alternative port (HTTP)
    'https://localhost:5176',  // Vite alternative port (HTTPS)
    'http://localhost:3000',   // Alternative port
    'http://172.27.114.113:5173',  // WSL network IP (Windows access - HTTP)
    'https://172.27.114.113:5173',  // WSL network IP (Windows access - HTTPS)
    'http://172.27.114.113:5174',  // WSL network IP port 5174 (HTTP)
    'https://172.27.114.113:5174',  // WSL network IP port 5174 (HTTPS)
    'http://172.27.114.113:5176',  // WSL network IP port 5176 (HTTP)
    'https://172.27.114.113:5176',  // WSL network IP port 5176 (HTTPS)
    'http://10.255.255.254:5173',   // Alternative network interface (HTTP)
    'https://10.255.255.254:5173',   // Alternative network interface (HTTPS)
    'http://10.255.255.254:5174',   // Alternative network interface port 5174 (HTTP)
    'https://10.255.255.254:5174',   // Alternative network interface port 5174 (HTTPS)
    'http://10.255.255.254:5176',   // Alternative network interface port 5176 (HTTP)
    'https://10.255.255.254:5176',   // Alternative network interface port 5176 (HTTPS)
    'http://192.168.1.247:5173',    // Local network IP (HTTP)
    'https://192.168.1.247:5173',   // Local network IP (HTTPS)
    'http://192.168.1.247:3001',    // Local network API (HTTP)
    'https://192.168.1.247:3001'    // Local network API (HTTPS)
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// ============================================================================
// REST API ENDPOINTS
// ============================================================================

/**
 * POST /api/calls - Initiate a new outbound call
 * Accepts optional demoConfig for custom system prompts
 */
app.post('/api/calls', async (req, res) => {
  try {
    const { phoneNumber, provider, demoConfig }: InitiateCallRequest = req.body;

    if (!phoneNumber || !provider) {
      return res.status(400).json({
        error: 'Missing required fields: phoneNumber, provider'
      });
    }

    // Validate phone number format (basic)
    if (!phoneNumber.match(/^\+?[1-9]\d{1,14}$/)) {
      return res.status(400).json({
        error: 'Invalid phone number format. Use E.164 format (+1234567890)'
      });
    }

    // Validate provider
    if (provider !== 'openai' && provider !== 'gemini') {
      return res.status(400).json({
        error: 'Invalid provider. Must be "openai" or "gemini"'
      });
    }

    // Log demo config if provided
    if (demoConfig) {
      console.log(`📝 Call initiated with demo config: ${demoConfig.name || 'unnamed'}`);
      if (demoConfig.agentConfig?.systemPrompt) {
        console.log(`   Custom systemPrompt: ${demoConfig.agentConfig.systemPrompt.substring(0, 100)}...`);
      }
    }

    // Initiate call with optional demo config
    const callId = await callManager.initiateCall(phoneNumber, provider, demoConfig);

    const response: CallResponse = {
      callId,
      status: 'initiated'
    };

    res.json(response);
  } catch (error: any) {
    console.error('❌ Error initiating call:', error);
    res.status(500).json({
      error: error.message || 'Failed to initiate call'
    });
  }
});

/**
 * DELETE /api/calls/:callId - End an active call
 */
app.delete('/api/calls/:callId', async (req, res) => {
  try {
    const { callId } = req.params;

    await callManager.endCall(callId);

    res.json({ status: 'ended', callId });
  } catch (error: any) {
    console.error('❌ Error ending call:', error);
    res.status(500).json({
      error: error.message || 'Failed to end call'
    });
  }
});

/**
 * GET /api/calls/:callId - Get call session details
 */
app.get('/api/calls/:callId', (req, res) => {
  const { callId } = req.params;

  const session = callManager.getCallSession(callId);

  if (!session) {
    return res.status(404).json({ error: 'Call not found' });
  }

  res.json(session);
});

/**
 * GET /api/calls - Get all active calls
 */
app.get('/api/calls', (req, res) => {
  const calls = callManager.getActiveCalls();
  res.json({ calls });
});

// ============================================================================
// PATIENT API ENDPOINTS
// ============================================================================

/**
 * GET /api/patients - List all patients
 */
app.get('/api/patients', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const patients = await callManager.getCRMService().listPatients(limit, offset);
    res.json({ patients, count: patients.length });
  } catch (error: any) {
    console.error('❌ Error listing patients:', error);
    res.status(500).json({ error: error.message || 'Failed to list patients' });
  }
});

/**
 * GET /api/patients/:id - Get patient by ID
 */
app.get('/api/patients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await callManager.getCRMService().getPatientById(id);

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
 * GET /api/patients/phone/:phoneNumber - Get patient by phone number
 */
app.get('/api/patients/phone/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const patient = await callManager.getCRMService().getPatientInfo(phoneNumber);

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json(patient);
  } catch (error: any) {
    console.error('❌ Error getting patient by phone:', error);
    res.status(500).json({ error: error.message || 'Failed to get patient' });
  }
});

/**
 * POST /api/patients - Create new patient
 */
app.post('/api/patients', async (req, res) => {
  try {
    const patientData = req.body;

    // Validate required fields
    if (!patientData.phoneNumber || !patientData.parentName || !patientData.address) {
      return res.status(400).json({
        error: 'Missing required fields: phoneNumber, parentName, address'
      });
    }

    const patientId = await callManager.getCRMService().createPatient(patientData);
    res.status(201).json({ id: patientId, message: 'Patient created successfully' });
  } catch (error: any) {
    console.error('❌ Error creating patient:', error);
    res.status(500).json({ error: error.message || 'Failed to create patient' });
  }
});

/**
 * PUT /api/patients/:id - Update patient
 */
app.put('/api/patients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    await callManager.getCRMService().updatePatient(id, updates);
    res.json({ message: 'Patient updated successfully' });
  } catch (error: any) {
    console.error('❌ Error updating patient:', error);
    res.status(500).json({ error: error.message || 'Failed to update patient' });
  }
});

/**
 * DELETE /api/patients/:id - Delete patient
 */
app.delete('/api/patients/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await callManager.getCRMService().deletePatient(id);
    res.json({ message: 'Patient deleted successfully' });
  } catch (error: any) {
    console.error('❌ Error deleting patient:', error);
    res.status(500).json({ error: error.message || 'Failed to delete patient' });
  }
});

// ============================================================================
// CONVERSATION API ENDPOINTS
// ============================================================================

/**
 * GET /api/conversations - List all conversations with optional filters
 */
app.get('/api/conversations', async (req, res) => {
  try {
    const { patientId, phoneNumber, fromDate, toDate, outcome, limit, offset } = req.query;

    const conversations = await callManager.getConversationLogger().listConversations({
      patientId: patientId as string,
      phoneNumber: phoneNumber as string,
      fromDate: fromDate as string,
      toDate: toDate as string,
      outcome: outcome as string,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0
    });

    res.json({ conversations, count: conversations.length });
  } catch (error: any) {
    console.error('❌ Error listing conversations:', error);
    res.status(500).json({ error: error.message || 'Failed to list conversations' });
  }
});

/**
 * GET /api/conversations/:conversationId - Get conversation turns/transcript
 */
app.get('/api/conversations/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const turns = await callManager.getConversationLogger().getConversationHistory(conversationId);

    res.json({ conversationId, turns, count: turns.length });
  } catch (error: any) {
    console.error('❌ Error fetching conversation:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch conversation' });
  }
});

/**
 * GET /api/conversations/:conversationId/details - Get full conversation details including function calls
 */
app.get('/api/conversations/:conversationId/details', async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await callManager.getConversationLogger().getConversation(conversationId);
    const turns = await callManager.getConversationLogger().getConversationHistory(conversationId);
    const functionCalls = await callManager.getConversationLogger().getFunctionCalls(conversationId);
    const stats = await callManager.getConversationLogger().getConversationStats(conversationId);

    res.json({
      conversation,
      turns,
      functionCalls,
      stats
    });
  } catch (error: any) {
    console.error('❌ Error fetching conversation details:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch conversation details' });
  }
});

// ============================================================================
// DATABASE API ENDPOINTS (for browser unified access)
// ============================================================================

// Mount the database API router
app.use('/api/db', createDatabaseAPIRouter(callManager.getDbAdapter()));

// ============================================================================
// TWILIO WEBHOOK ENDPOINTS
// ============================================================================

/**
 * POST /voice-webhook - Twilio calls this when call is answered
 * Returns TwiML that connects the media stream to our WebSocket
 * Handles both outbound (initiated via API) and inbound calls
 */
app.post('/voice-webhook', async (req, res) => {
  const { CallSid, From, To, Direction } = req.body;

  console.log('📞 Twilio voice webhook called');
  console.log(`   Call SID: ${CallSid}`);
  console.log(`   From: ${From}`);
  console.log(`   To: ${To}`);
  console.log(`   Direction: ${Direction}`);

  // Check if this is an inbound call (no existing session)
  const existingSession = callManager.findSessionByTwilioSid(CallSid);

  if (!existingSession && Direction === 'inbound') {
    // This is an inbound call - create a session for it
    try {
      await callManager.createInboundSession(
        CallSid,
        From,
        To,
        config.ai.inboundProvider
      );
      console.log(`✅ Inbound session created for ${CallSid}`);
    } catch (error) {
      console.error('❌ Failed to create inbound session:', error);
    }
  }

  // Generate TwiML response that streams audio to our WebSocket
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://${config.server.host.replace('https://', '').replace('http://', '')}/media-stream" />
  </Connect>
</Response>`;

  res.type('text/xml');
  res.send(twiml);
});

/**
 * POST /call-status - Twilio status callback
 */
app.post('/call-status', (req, res) => {
  const { CallSid, CallStatus } = req.body;

  console.log(`📊 Call status update: ${CallSid} - ${CallStatus}`);

  // Map Twilio status to our CallState
  const statusMap: Record<string, CallState> = {
    'initiated': CallState.DIALING,
    'ringing': CallState.RINGING,
    'answered': CallState.CONNECTED,
    'completed': CallState.ENDED,
    'failed': CallState.FAILED,
    'busy': CallState.FAILED,
    'no-answer': CallState.FAILED
  };

  const callState = statusMap[CallStatus];
  if (callState) {
    // Find and update call session
    for (const session of callManager.getActiveCalls()) {
      if (session.twilioCallSid === CallSid) {
        console.log(`   Updating call ${session.id} to state: ${callState}`);
        break;
      }
    }
  }

  res.sendStatus(200);
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: config.nodeEnv,
    activeCalls: callManager.getActiveCalls().length
  });
});

// ============================================================================
// WEBSOCKET UPGRADE HANDLING
// ============================================================================

server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;

  if (pathname === '/media-stream') {
    // Twilio media stream WebSocket
    mediaWss.handleUpgrade(request, socket, head, (ws) => {
      mediaWss.emit('connection', ws, request);
    });
  } else if (pathname === '/') {
    // Frontend communication WebSocket
    frontendWss.handleUpgrade(request, socket, head, (ws) => {
      frontendWss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// ============================================================================
// WEBSOCKET HANDLERS
// ============================================================================

/**
 * Twilio Media Stream WebSocket connections
 */
mediaWss.on('connection', async (ws: WebSocket, req) => {
  console.log('🔌 Twilio media stream WebSocket connected');

  // Extract call SID from query params if available
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const callSid = url.searchParams.get('callSid');

  // Handle media stream through call manager
  await callManager.handleMediaStream(ws, callSid || undefined);
});

/**
 * Frontend WebSocket connections (for real-time updates)
 */
frontendWss.on('connection', (ws: WebSocket) => {
  console.log('🔌 Frontend WebSocket connected');

  // Send initial state
  const activeCalls = callManager.getActiveCalls();
  ws.send(JSON.stringify({
    type: 'initialState',
    data: { calls: activeCalls }
  }));

  // Forward call state changes to frontend
  const stateChangeListener = (session: any) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'callStateChanged',
        data: session
      }));
    }
  };

  // Forward function call events to frontend
  const functionCallListener = (data: any) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'functionCall',
        data: data
      }));
    }
  };

  // Forward function result events to frontend
  const functionResultListener = (data: any) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'functionResult',
        data: data
      }));
    }
  };

  // Forward transcript delta events to frontend (real-time streaming)
  const transcriptDeltaListener = (data: any) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'transcriptDelta',
        data: data
      }));
    }
  };

  // Forward transcript complete events to frontend
  const transcriptCompleteListener = (data: any) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'transcriptComplete',
        data: data
      }));
    }
  };

  callManager.on('callStateChanged', stateChangeListener);
  callManager.on('functionCall', functionCallListener);
  callManager.on('functionResult', functionResultListener);
  callManager.on('transcriptDelta', transcriptDeltaListener);
  callManager.on('transcriptComplete', transcriptCompleteListener);

  // Cleanup on disconnect
  ws.on('close', () => {
    console.log('🔌 Frontend WebSocket disconnected');
    callManager.off('callStateChanged', stateChangeListener);
    callManager.off('functionCall', functionCallListener);
    callManager.off('functionResult', functionResultListener);
    callManager.off('transcriptDelta', transcriptDeltaListener);
    callManager.off('transcriptComplete', transcriptCompleteListener);
  });

  ws.on('error', (error) => {
    console.error('❌ Frontend WebSocket error:', error);
  });
});

// ============================================================================
// START SERVER
// ============================================================================

const PORT = config.server.port;

server.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 JEFFERSON DENTAL TELEPHONY SERVER');
  console.log('='.repeat(60));
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌐 Backend host: ${config.server.host}`);
  console.log(`🎨 Frontend URL: ${config.server.frontendUrl}`);
  console.log(`📞 Twilio phone: ${config.twilio.phoneNumber || '(not configured)'}`);
  console.log(`🤖 OpenAI configured: ${config.ai.openaiKey ? '✅' : '❌'}`);
  console.log(`🤖 Gemini configured: ${config.ai.geminiKey ? '✅' : '❌'}`);
  console.log('='.repeat(60));
  console.log('\n📝 Endpoints:');
  console.log(`   POST   /api/calls              - Initiate call`);
  console.log(`   DELETE /api/calls/:callId      - End call`);
  console.log(`   GET    /api/calls/:callId      - Get call status`);
  console.log(`   GET    /api/calls              - List active calls`);
  console.log(`   GET    /api/patients           - List all patients`);
  console.log(`   GET    /api/patients/:id       - Get patient by ID`);
  console.log(`   POST   /api/patients           - Create patient`);
  console.log(`   PUT    /api/patients/:id       - Update patient`);
  console.log(`   DELETE /api/patients/:id       - Delete patient`);
  console.log(`   POST   /voice-webhook          - Twilio TwiML endpoint`);
  console.log(`   POST   /call-status            - Twilio status callback`);
  console.log(`   GET    /health                 - Health check`);
  console.log('\n🔌 WebSocket Endpoints:');
  console.log(`   ws://localhost:${PORT}/              - Frontend updates`);
  console.log(`   wss://${config.server.host.replace('https://', '').replace('http://', '')}/media-stream  - Twilio media`);
  console.log('\n✅ Server ready!\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
