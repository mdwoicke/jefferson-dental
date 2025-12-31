/**
 * Feature Flags Configuration
 *
 * Centralized management of feature flags for the Jefferson Dental application.
 * Controls which features are enabled/disabled at build time and runtime.
 */

export interface FeatureFlags {
  enableDynamicTools: boolean;
  enableSkills: boolean;
  fallbackToStatic: boolean;
}

/**
 * Active feature flags configuration
 *
 * - enableDynamicTools: Use new ToolRegistry/SkillEngine system instead of hardcoded functions
 * - enableSkills: Enable multi-step skill workflows
 * - fallbackToStatic: Automatically fall back to static handlers if dynamic system fails
 */
export const featureFlags: FeatureFlags = {
  enableDynamicTools: true, // Enable new ToolRegistry/SkillEngine system
  enableSkills: true, // Enable multi-step skill workflows
  fallbackToStatic: true // Always allow fallback for safety
};

/**
 * Log current feature flag status to console
 * Useful for debugging and verifying configuration
 */
export function logFeatureFlags(): void {
  console.log('🚩 Feature Flags:');
  console.log(`   Dynamic Tools: ${featureFlags.enableDynamicTools ? '✅ ON' : '❌ OFF'}`);
  console.log(`   Skills: ${featureFlags.enableSkills ? '✅ ON' : '❌ OFF'}`);
  console.log(`   Fallback to Static: ${featureFlags.fallbackToStatic ? '✅ YES' : '❌ NO'}`);
}
