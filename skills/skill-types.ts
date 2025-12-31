/**
 * Type definitions for the skills system
 */

import { SkillMetadata, SkillContext, SkillResult } from './skill-base';

// Re-export types from skill-base for convenience
export type { SkillMetadata, SkillContext, SkillResult };

/**
 * Skill dependency validation result
 */
export interface SkillDependencyValidation {
  valid: boolean;
  missing?: string[];
}
