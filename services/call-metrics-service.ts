/**
 * Call Metrics Service
 * Handles recording and calculating call quality metrics for voice agent conversations
 */

import { DatabaseAdapter, CallMetrics, FunctionCallLog, ConversationTurn } from '../database/db-interface';

export class CallMetricsService {
  constructor(private dbAdapter: DatabaseAdapter) {}

  /**
   * Record call metrics for a conversation
   */
  async recordCallMetrics(metrics: Omit<CallMetrics, 'id' | 'createdAt'>): Promise<string> {
    try {
      const id = await this.dbAdapter.createCallMetrics(metrics);
      console.log(`✅ Recorded call metrics for conversation ${metrics.conversationId}: ${id}`);
      return id;
    } catch (error) {
      console.error('Error recording call metrics:', error);
      throw error;
    }
  }

  /**
   * Get call metrics for a specific conversation
   */
  async getMetricsForConversation(conversationId: string): Promise<CallMetrics | null> {
    try {
      return await this.dbAdapter.getCallMetricsByConversation(conversationId);
    } catch (error) {
      console.error('Error getting call metrics:', error);
      throw error;
    }
  }

  /**
   * Calculate metrics from conversation data
   * This automatically analyzes conversation turns, function calls, and timing
   */
  async calculateMetrics(
    conversationId: string,
    functionCalls: FunctionCallLog[],
    turns: ConversationTurn[]
  ): Promise<Partial<CallMetrics>> {
    try {
      // Calculate call duration
      let callDurationSeconds = 0;
      if (turns.length >= 2) {
        const startTime = new Date(turns[0].timestamp);
        const endTime = new Date(turns[turns.length - 1].timestamp);
        callDurationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      }

      // Count errors and fallbacks
      const errorCount = functionCalls.filter(fc => fc.status === 'error').length;
      const fallbackCount = functionCalls.filter(fc =>
        fc.function_name.toLowerCase().includes('fallback') ||
        fc.function_name.toLowerCase().includes('retry')
      ).length;

      // Calculate completion rate (successful function calls / total function calls)
      const totalCalls = functionCalls.length;
      const successfulCalls = functionCalls.filter(fc => fc.status === 'success').length;
      const completionRate = totalCalls > 0 ? successfulCalls / totalCalls : 1.0;

      // Determine outcome based on completion rate and errors
      let outcome: 'success' | 'partial' | 'failure' | 'abandoned';
      if (completionRate >= 0.8 && errorCount === 0) {
        outcome = 'success';
      } else if (completionRate >= 0.5) {
        outcome = 'partial';
      } else if (completionRate > 0) {
        outcome = 'failure';
      } else {
        outcome = 'abandoned';
      }

      // Calculate interruptions (user speaking while assistant is talking)
      const interruptionsCount = 0; // This would require audio analysis, set to 0 for now

      const metrics: Partial<CallMetrics> = {
        conversationId,
        callDurationSeconds,
        outcome,
        interruptionsCount,
        fallbackCount,
        errorCount,
        completionRate: Math.round(completionRate * 100) / 100 // Round to 2 decimals
      };

      console.log(`📊 Calculated metrics for conversation ${conversationId}:`, {
        duration: callDurationSeconds,
        outcome,
        completionRate: `${(completionRate * 100).toFixed(0)}%`,
        errors: errorCount,
        fallbacks: fallbackCount
      });

      return metrics;
    } catch (error) {
      console.error('Error calculating metrics:', error);
      throw error;
    }
  }

  /**
   * Update existing call metrics
   */
  async updateMetrics(id: string, updates: Partial<CallMetrics>): Promise<void> {
    try {
      await this.dbAdapter.updateCallMetrics(id, updates);
      console.log(`✅ Updated call metrics ${id}`);
    } catch (error) {
      console.error('Error updating call metrics:', error);
      throw error;
    }
  }

  /**
   * Get all call metrics with pagination
   */
  async getAllMetrics(limit: number = 100, offset: number = 0): Promise<CallMetrics[]> {
    try {
      return await this.dbAdapter.listAllCallMetrics(limit, offset);
    } catch (error) {
      console.error('Error listing call metrics:', error);
      throw error;
    }
  }

  /**
   * Get summary statistics across all metrics
   */
  async getSummaryStats(): Promise<{
    totalCalls: number;
    successRate: number;
    averageDuration: number;
    averageQuality: number;
  }> {
    try {
      const allMetrics = await this.getAllMetrics(1000);

      const totalCalls = allMetrics.length;
      const successfulCalls = allMetrics.filter(m => m.outcome === 'success').length;
      const successRate = totalCalls > 0 ? successfulCalls / totalCalls : 0;

      const totalDuration = allMetrics.reduce((sum, m) => sum + (m.callDurationSeconds || 0), 0);
      const averageDuration = totalCalls > 0 ? Math.floor(totalDuration / totalCalls) : 0;

      const metricsWithQuality = allMetrics.filter(m => m.qualityScore !== undefined && m.qualityScore !== null);
      const totalQuality = metricsWithQuality.reduce((sum, m) => sum + (m.qualityScore || 0), 0);
      const averageQuality = metricsWithQuality.length > 0 ? totalQuality / metricsWithQuality.length : 0;

      return {
        totalCalls,
        successRate: Math.round(successRate * 100) / 100,
        averageDuration,
        averageQuality: Math.round(averageQuality * 10) / 10
      };
    } catch (error) {
      console.error('Error getting summary stats:', error);
      throw error;
    }
  }
}
