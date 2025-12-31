/**
 * Conversation Logger Service
 * Logs AI conversations, turns, and function calls to database
 */

import { DatabaseAdapter } from '../database/db-interface';

export type ConversationRole = 'user' | 'assistant' | 'system';
export type ContentType = 'text' | 'audio' | 'function_call' | 'function_result';

export interface ConversationContext {
  conversationId: string;
  patientId?: string;
  phoneNumber: string;
  provider: 'openai' | 'gemini';
  direction: 'inbound' | 'outbound';
  callSid?: string;
}

export class ConversationLogger {
  private turnCounters: Map<string, number> = new Map();

  constructor(private dbAdapter: DatabaseAdapter) {}

  /**
   * Start a new conversation and return the conversation ID
   */
  async startConversation(context: {
    patientId?: string;
    phoneNumber: string;
    direction: 'inbound' | 'outbound';
    provider: 'openai' | 'gemini';
    callSid?: string;
  }): Promise<string> {
    console.log(`💬 Starting ${context.direction} conversation via ${context.provider}`);

    try {
      const conversationId = `CONV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      await this.dbAdapter.createConversation({
        id: conversationId,
        patient_id: context.patientId,
        phone_number: context.phoneNumber,
        direction: context.direction,
        provider: context.provider,
        call_sid: context.callSid,
        started_at: new Date().toISOString()
      });

      // Initialize turn counter
      this.turnCounters.set(conversationId, 0);

      console.log(`✅ Conversation started: ${conversationId}`);
      return conversationId;
    } catch (error) {
      console.error('❌ Error starting conversation:', error);
      throw error;
    }
  }

  /**
   * Log a conversation turn (user, assistant, or system message)
   */
  async logTurn(
    conversationId: string,
    turn: {
      role: ConversationRole;
      contentType: ContentType;
      contentText?: string;
      audioData?: Uint8Array | Blob;
    },
    speechStartTime?: Date // Optional: actual time when speech occurred (for accurate ordering)
  ): Promise<number> {
    try {
      // Increment turn counter
      const currentCount = this.turnCounters.get(conversationId) || 0;
      const turnNumber = currentCount + 1;
      this.turnCounters.set(conversationId, turnNumber);

      // Convert Blob to Uint8Array if needed
      let audioData: Uint8Array | undefined;
      if (turn.audioData instanceof Blob) {
        const arrayBuffer = await turn.audioData.arrayBuffer();
        audioData = new Uint8Array(arrayBuffer);
      } else {
        audioData = turn.audioData;
      }

      // Use provided speech start time for accurate ordering, or fall back to current time
      const timestamp = (speechStartTime || new Date()).toISOString();

      const turnId = await this.dbAdapter.logConversationTurn({
        conversation_id: conversationId,
        turn_number: turnNumber,
        role: turn.role,
        content_type: turn.contentType,
        content_text: turn.contentText,
        audio_data: audioData,
        timestamp: timestamp
      });

      // Log to console (truncate long text)
      const preview = turn.contentText
        ? turn.contentText.substring(0, 80) + (turn.contentText.length > 80 ? '...' : '')
        : `[${turn.contentType}]`;

      console.log(`💬 Turn ${turnNumber} (${turn.role}): ${preview}`);

      return turnId;
    } catch (error) {
      console.error('❌ Error logging conversation turn:', error);
      throw error;
    }
  }

  /**
   * Log a function call (when AI invokes a function)
   */
  async logFunctionCall(
    conversationId: string,
    functionCall: {
      callId?: string;
      functionName: string;
      arguments: any;
    }
  ): Promise<number> {
    console.log(`⚡ Function called: ${functionCall.functionName}`);

    try {
      const functionCallId = await this.dbAdapter.logFunctionCall({
        conversation_id: conversationId,
        call_id: functionCall.callId,
        function_name: functionCall.functionName,
        arguments: JSON.stringify(functionCall.arguments),
        status: 'pending',
        timestamp: new Date().toISOString()
      });

      console.log(`✅ Function call logged: ${functionCallId}`);
      return functionCallId;
    } catch (error) {
      console.error('❌ Error logging function call:', error);
      throw error;
    }
  }

  /**
   * Update function call result (after execution)
   */
  async updateFunctionResult(
    functionCallId: number,
    result: {
      result: any;
      status: 'success' | 'error';
      executionTimeMs?: number;
      errorMessage?: string;
    }
  ): Promise<void> {
    try {
      await this.dbAdapter.updateFunctionCallResult(functionCallId, {
        result: JSON.stringify(result.result),
        status: result.status,
        execution_time_ms: result.executionTimeMs,
        error_message: result.errorMessage
      });

      const statusEmoji = result.status === 'success' ? '✅' : '❌';
      console.log(
        `${statusEmoji} Function result: ${result.status} (${result.executionTimeMs}ms)`
      );
    } catch (error) {
      console.error('❌ Error updating function result:', error);
      throw error;
    }
  }

  /**
   * Update function call with error
   */
  async updateFunctionError(
    functionCallId: number,
    errorMessage: string
  ): Promise<void> {
    console.log(`❌ Function error: ${errorMessage}`);

    try {
      await this.dbAdapter.updateFunctionCallError(functionCallId, errorMessage);
    } catch (error) {
      console.error('❌ Error updating function error:', error);
      throw error;
    }
  }

  /**
   * End a conversation with outcome
   */
  async endConversation(
    conversationId: string,
    outcome: {
      outcome: string;
      outcomeDetails?: any;
    }
  ): Promise<void> {
    console.log(`🏁 Ending conversation: ${conversationId} (${outcome.outcome})`);

    try {
      // Get conversation start time to calculate duration
      const conversation = await this.dbAdapter.getConversation(conversationId);

      if (!conversation) {
        throw new Error(`Conversation ${conversationId} not found`);
      }

      const startTime = new Date(conversation.started_at);
      const endTime = new Date();
      const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

      await this.dbAdapter.endConversation(conversationId, {
        ended_at: endTime.toISOString(),
        duration_seconds: durationSeconds,
        outcome: outcome.outcome,
        outcome_details: outcome.outcomeDetails ? JSON.stringify(outcome.outcomeDetails) : undefined
      });

      // Clean up turn counter
      this.turnCounters.delete(conversationId);

      console.log(`✅ Conversation ended: ${durationSeconds}s, outcome: ${outcome.outcome}`);
    } catch (error) {
      console.error('❌ Error ending conversation:', error);
      throw error;
    }
  }

  /**
   * Get conversation history (all turns)
   */
  async getConversationHistory(conversationId: string) {
    console.log(`📖 Getting conversation history: ${conversationId}`);

    try {
      const turns = await this.dbAdapter.getConversationHistory(conversationId);
      console.log(`✅ Found ${turns.length} turns`);
      return turns;
    } catch (error) {
      console.error('❌ Error getting conversation history:', error);
      throw error;
    }
  }

  /**
   * Get function calls for a conversation
   */
  async getFunctionCalls(conversationId: string) {
    console.log(`⚡ Getting function calls: ${conversationId}`);

    try {
      const functionCalls = await this.dbAdapter.getFunctionCalls(conversationId);
      console.log(`✅ Found ${functionCalls.length} function calls`);
      return functionCalls;
    } catch (error) {
      console.error('❌ Error getting function calls:', error);
      throw error;
    }
  }

  /**
   * Get conversation details
   */
  async getConversation(conversationId: string) {
    console.log(`📄 Getting conversation: ${conversationId}`);

    try {
      const conversation = await this.dbAdapter.getConversation(conversationId);

      if (!conversation) {
        console.log(`⚠️  Conversation not found: ${conversationId}`);
        return null;
      }

      console.log(`✅ Conversation found: ${conversation.direction} ${conversation.provider}`);
      return conversation;
    } catch (error) {
      console.error('❌ Error getting conversation:', error);
      throw error;
    }
  }

  /**
   * List conversations with filters
   */
  async listConversations(filters?: {
    patientId?: string;
    phoneNumber?: string;
    fromDate?: string;
    toDate?: string;
    outcome?: string;
    limit?: number;
    offset?: number;
  }) {
    console.log('📋 Listing conversations:', filters);

    try {
      const conversations = await this.dbAdapter.listConversations({
        patient_id: filters?.patientId,
        phone_number: filters?.phoneNumber,
        from_date: filters?.fromDate,
        to_date: filters?.toDate,
        outcome: filters?.outcome,
        limit: filters?.limit,
        offset: filters?.offset
      });

      console.log(`✅ Found ${conversations.length} conversations`);
      return conversations;
    } catch (error) {
      console.error('❌ Error listing conversations:', error);
      throw error;
    }
  }

  /**
   * Get conversation statistics
   */
  async getConversationStats(conversationId: string) {
    console.log(`📊 Getting conversation stats: ${conversationId}`);

    try {
      const conversation = await this.dbAdapter.getConversation(conversationId);
      const turns = await this.dbAdapter.getConversationHistory(conversationId);
      const functionCalls = await this.dbAdapter.getFunctionCalls(conversationId);

      if (!conversation) {
        return null;
      }

      const userTurns = turns.filter(t => t.role === 'user').length;
      const assistantTurns = turns.filter(t => t.role === 'assistant').length;
      const successfulCalls = functionCalls.filter(fc => fc.status === 'success').length;
      const failedCalls = functionCalls.filter(fc => fc.status === 'error').length;

      const stats = {
        conversationId,
        duration: conversation.duration_seconds,
        outcome: conversation.outcome,
        totalTurns: turns.length,
        userTurns,
        assistantTurns,
        totalFunctionCalls: functionCalls.length,
        successfulFunctionCalls: successfulCalls,
        failedFunctionCalls: failedCalls,
        provider: conversation.provider,
        direction: conversation.direction
      };

      console.log(`✅ Conversation stats:`, stats);
      return stats;
    } catch (error) {
      console.error('❌ Error getting conversation stats:', error);
      throw error;
    }
  }

  /**
   * Link conversation to patient (if patient ID was unknown at start)
   */
  async linkConversationToPatient(
    conversationId: string,
    patientId: string
  ): Promise<void> {
    console.log(`🔗 Linking conversation ${conversationId} to patient ${patientId}`);

    try {
      // This would require adding an update method to the database adapter
      // For now, we'll log it as an audit entry
      await this.dbAdapter.logAudit({
        table_name: 'conversations',
        record_id: conversationId,
        operation: 'UPDATE',
        field_name: 'patient_id',
        new_value: patientId,
        changed_by: 'system',
        change_reason: 'Patient identified during conversation'
      });

      console.log(`✅ Conversation linked to patient`);
    } catch (error) {
      console.error('❌ Error linking conversation to patient:', error);
      throw error;
    }
  }
}
