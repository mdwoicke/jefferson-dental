/**
 * Testing Service
 * Handles test scenario management and execution tracking for voice agent testing
 */

import { DatabaseAdapter, TestScenario, TestExecution } from '../database/db-interface';

export class TestingService {
  constructor(private dbAdapter: DatabaseAdapter) {}

  // =========================================================================
  // TEST SCENARIO MANAGEMENT
  // =========================================================================

  /**
   * Create a new test scenario
   */
  async createTestScenario(scenario: Omit<TestScenario, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const id = await this.dbAdapter.createTestScenario(scenario);
      console.log(`✅ Created test scenario: ${scenario.name} (${id})`);
      return id;
    } catch (error) {
      console.error('Error creating test scenario:', error);
      throw error;
    }
  }

  /**
   * Get a test scenario by ID
   */
  async getTestScenario(id: string): Promise<TestScenario | null> {
    try {
      return await this.dbAdapter.getTestScenarioById(id);
    } catch (error) {
      console.error('Error getting test scenario:', error);
      throw error;
    }
  }

  /**
   * Update an existing test scenario
   */
  async updateTestScenario(id: string, updates: Partial<TestScenario>): Promise<void> {
    try {
      await this.dbAdapter.updateTestScenario(id, updates);
      console.log(`✅ Updated test scenario ${id}`);
    } catch (error) {
      console.error('Error updating test scenario:', error);
      throw error;
    }
  }

  /**
   * Delete a test scenario
   */
  async deleteTestScenario(id: string): Promise<void> {
    try {
      await this.dbAdapter.deleteTestScenario(id);
      console.log(`✅ Deleted test scenario ${id}`);
    } catch (error) {
      console.error('Error deleting test scenario:', error);
      throw error;
    }
  }

  /**
   * List all active test scenarios
   */
  async listActiveScenarios(limit: number = 100, offset: number = 0): Promise<TestScenario[]> {
    try {
      return await this.dbAdapter.listTestScenarios('active', limit, offset);
    } catch (error) {
      console.error('Error listing active scenarios:', error);
      throw error;
    }
  }

  /**
   * List all test scenarios (including deprecated/draft)
   */
  async listAllScenarios(limit: number = 100, offset: number = 0): Promise<TestScenario[]> {
    try {
      return await this.dbAdapter.listTestScenarios(undefined, limit, offset);
    } catch (error) {
      console.error('Error listing all scenarios:', error);
      throw error;
    }
  }

  // =========================================================================
  // TEST EXECUTION
  // =========================================================================

  /**
   * Run a test and record the execution result
   */
  async runTest(
    scenarioId: string,
    conversationId: string | undefined,
    actualResult: any
  ): Promise<{
    executionId: string;
    status: 'pass' | 'fail' | 'error';
    differences?: string;
  }> {
    try {
      const scenario = await this.dbAdapter.getTestScenarioById(scenarioId);
      if (!scenario) {
        throw new Error(`Test scenario ${scenarioId} not found`);
      }

      const expectedResult = scenario.expectedOutcome;
      const actualResultString = JSON.stringify(actualResult, null, 2);

      // Compare results
      const comparison = this.compareResults(expectedResult, actualResultString, scenario.validationRules);

      // Record execution
      const executionId = await this.dbAdapter.createTestExecution({
        scenarioId,
        conversationId,
        testStatus: comparison.status,
        expectedResult,
        actualResult: actualResultString,
        differences: comparison.differences,
        executionTimeMs: 0
      });

      console.log(`🧪 Test execution ${executionId}: ${comparison.status.toUpperCase()} - ${scenario.name}`);
      if (comparison.differences) {
        console.log(`   Differences: ${comparison.differences}`);
      }

      return {
        executionId,
        status: comparison.status,
        differences: comparison.differences
      };
    } catch (error: any) {
      console.error('Error running test:', error);

      // Record error execution
      const executionId = await this.dbAdapter.createTestExecution({
        scenarioId,
        conversationId,
        testStatus: 'error',
        actualResult: JSON.stringify(actualResult),
        errorMessage: error.message
      });

      return {
        executionId,
        status: 'error',
        differences: error.message
      };
    }
  }

  /**
   * Compare expected and actual results
   */
  private compareResults(
    expected: string | undefined,
    actual: string,
    validationRules?: string
  ): {
    status: 'pass' | 'fail';
    differences?: string;
  } {
    // If no expected outcome defined, test passes
    if (!expected || expected.trim() === '') {
      return { status: 'pass' };
    }

    // If validation rules exist, use them (future enhancement)
    if (validationRules) {
      try {
        // Parse validation rules as JSON and apply custom logic
        // For now, just do string comparison
      } catch (error) {
        console.warn('Could not parse validation rules:', error);
      }
    }

    // Simple string comparison
    const normalizedExpected = this.normalizeForComparison(expected);
    const normalizedActual = this.normalizeForComparison(actual);

    if (normalizedExpected === normalizedActual) {
      return { status: 'pass' };
    }

    // Find differences
    const differences = this.findDifferences(expected, actual);

    return {
      status: 'fail',
      differences
    };
  }

  /**
   * Normalize strings for comparison (remove whitespace, etc.)
   */
  private normalizeForComparison(str: string): string {
    return str
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  /**
   * Find differences between expected and actual (simple diff)
   */
  private findDifferences(expected: string, actual: string): string {
    if (expected === actual) return '';

    const expectedLines = expected.split('\n');
    const actualLines = actual.split('\n');

    const diffs: string[] = [];

    const maxLines = Math.max(expectedLines.length, actualLines.length);
    for (let i = 0; i < maxLines; i++) {
      const expLine = expectedLines[i] || '<missing>';
      const actLine = actualLines[i] || '<missing>';

      if (expLine !== actLine) {
        diffs.push(`Line ${i + 1}: expected "${expLine}", got "${actLine}"`);
      }
    }

    return diffs.slice(0, 5).join('; '); // Limit to first 5 differences
  }

  /**
   * Get test execution results for a scenario
   */
  async getTestResults(scenarioId: string, limit: number = 100): Promise<TestExecution[]> {
    try {
      return await this.dbAdapter.listTestExecutionsByScenario(scenarioId, limit);
    } catch (error) {
      console.error('Error getting test results:', error);
      throw error;
    }
  }

  /**
   * Get all test executions
   */
  async getAllTestExecutions(limit: number = 100, offset: number = 0): Promise<TestExecution[]> {
    try {
      return await this.dbAdapter.listAllTestExecutions(limit, offset);
    } catch (error) {
      console.error('Error getting all test executions:', error);
      throw error;
    }
  }

  /**
   * Get test pass rate for a scenario
   */
  async getScenarioPassRate(scenarioId: string): Promise<{
    totalRuns: number;
    passes: number;
    failures: number;
    errors: number;
    passRate: number;
  }> {
    try {
      const executions = await this.getTestResults(scenarioId);

      const totalRuns = executions.length;
      const passes = executions.filter(e => e.testStatus === 'pass').length;
      const failures = executions.filter(e => e.testStatus === 'fail').length;
      const errors = executions.filter(e => e.testStatus === 'error').length;
      const passRate = totalRuns > 0 ? passes / totalRuns : 0;

      return {
        totalRuns,
        passes,
        failures,
        errors,
        passRate: Math.round(passRate * 100) / 100
      };
    } catch (error) {
      console.error('Error calculating pass rate:', error);
      throw error;
    }
  }

  /**
   * Get overall testing statistics
   */
  async getOverallStats(): Promise<{
    totalScenarios: number;
    activeScenarios: number;
    totalExecutions: number;
    overallPassRate: number;
  }> {
    try {
      const allScenarios = await this.listAllScenarios(1000);
      const activeScenarios = allScenarios.filter(s => s.status === 'active');
      const allExecutions = await this.getAllTestExecutions(10000);

      const totalExecutions = allExecutions.length;
      const passes = allExecutions.filter(e => e.testStatus === 'pass').length;
      const overallPassRate = totalExecutions > 0 ? passes / totalExecutions : 0;

      return {
        totalScenarios: allScenarios.length,
        activeScenarios: activeScenarios.length,
        totalExecutions,
        overallPassRate: Math.round(overallPassRate * 100) / 100
      };
    } catch (error) {
      console.error('Error getting overall stats:', error);
      throw error;
    }
  }
}
