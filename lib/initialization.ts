import { ToolRegistry } from './tool-registry';
import { SkillEngine } from './skill-engine';
import { DatabaseAdapter } from '../database/db-interface';
import { featureFlags } from '../config/feature-flags';

export interface DynamicSystemState {
  mode: 'static' | 'dynamic' | 'error-fallback';
  initialized: boolean;
  toolRegistry: ToolRegistry | null;
  skillEngine: SkillEngine | null;
  error?: Error;
}

/**
 * Manually register tools for browser environment
 * (Browser doesn't support filesystem auto-discovery)
 */
async function registerToolsManually(toolRegistry: ToolRegistry, dbAdapter: DatabaseAdapter): Promise<void> {
  try {
    // Dynamically import all tool classes
    const [
      CheckAvailabilityTool,
      BookAppointmentTool,
      RescheduleAppointmentTool,
      CancelAppointmentTool,
      GetAppointmentHistoryTool,
      AddAppointmentNotesTool,
      GetPatientInfoTool,
      SendConfirmationSMSTool,
      SendAppointmentReminderTool,
      CheckInsuranceEligibilityTool,
      GetClinicHoursTool,
      GetDirectionsTool,
      GetAvailableServicesTool,
      GetAppointmentPreparationTool
    ] = await Promise.all([
      import('../tools/appointment-tools/check-availability.tool').then(m => m.default),
      import('../tools/appointment-tools/book-appointment.tool').then(m => m.default),
      import('../tools/appointment-tools/reschedule-appointment.tool').then(m => m.default),
      import('../tools/appointment-tools/cancel-appointment.tool').then(m => m.default),
      import('../tools/appointment-tools/get-appointment-history.tool').then(m => m.default),
      import('../tools/appointment-tools/add-appointment-notes.tool').then(m => m.default),
      import('../tools/patient-tools/get-patient-info.tool').then(m => m.default),
      import('../tools/notification-tools/send-confirmation-sms.tool').then(m => m.default),
      import('../tools/notification-tools/send-appointment-reminder.tool').then(m => m.default),
      import('../tools/clinic-tools/check-insurance-eligibility.tool').then(m => m.default),
      import('../tools/clinic-tools/get-clinic-hours.tool').then(m => m.default),
      import('../tools/clinic-tools/get-directions.tool').then(m => m.default),
      import('../tools/clinic-tools/get-available-services.tool').then(m => m.default),
      import('../tools/clinic-tools/get-appointment-preparation.tool').then(m => m.default)
    ]);

    // Instantiate and register each tool
    const tools = [
      new CheckAvailabilityTool(dbAdapter),
      new BookAppointmentTool(dbAdapter),
      new RescheduleAppointmentTool(dbAdapter),
      new CancelAppointmentTool(dbAdapter),
      new GetAppointmentHistoryTool(dbAdapter),
      new AddAppointmentNotesTool(dbAdapter),
      new GetPatientInfoTool(dbAdapter),
      new SendConfirmationSMSTool(dbAdapter),
      new SendAppointmentReminderTool(dbAdapter),
      new CheckInsuranceEligibilityTool(dbAdapter),
      new GetClinicHoursTool(dbAdapter),
      new GetDirectionsTool(dbAdapter),
      new GetAvailableServicesTool(dbAdapter),
      new GetAppointmentPreparationTool(dbAdapter)
    ];

    tools.forEach(tool => toolRegistry.register(tool));
    console.log(`   ✅ Manually registered ${tools.length} tools (browser mode)`);
  } catch (error) {
    console.error('❌ Failed to manually register tools:', error);
    throw error;
  }
}

/**
 * Manually register skills for browser environment
 */
async function registerSkillsManually(skillEngine: SkillEngine): Promise<void> {
  try {
    // Import skill classes
    const ScheduleAppointmentSkill = await import('../skills/scheduling/schedule-appointment-skill').then(m => m.default);

    // Register skill classes (not instances - SkillEngine instantiates them)
    skillEngine.register(ScheduleAppointmentSkill);

    console.log(`   ✅ Manually registered 1 skill (browser mode)`);
  } catch (error) {
    console.error('❌ Failed to manually register skills:', error);
    throw error;
  }
}

/**
 * Initialize the dynamic tool and skill system
 *
 * This function coordinates the initialization of the ToolRegistry and SkillEngine.
 * It handles all error cases and provides graceful fallback to static mode.
 *
 * @param dbAdapter Database adapter for services
 * @returns System state with initialized components or fallback mode
 */
export async function initializeDynamicSystem(
  dbAdapter: DatabaseAdapter
): Promise<DynamicSystemState> {
  // If flag is OFF, return static immediately
  if (!featureFlags.enableDynamicTools) {
    return {
      mode: 'static',
      initialized: false,
      toolRegistry: null,
      skillEngine: null
    };
  }

  // Try to initialize dynamic system
  try {
    console.log('🔧 Initializing dynamic tool system...');

    // Initialize ToolRegistry
    const toolRegistry = new ToolRegistry(dbAdapter);

    // Browser vs Node.js: Use appropriate registration method
    const isBrowser = typeof window !== 'undefined';
    if (isBrowser) {
      console.log('   🌐 Browser environment detected - using manual registration');
      await registerToolsManually(toolRegistry, dbAdapter);
    } else {
      console.log('   📁 Node.js environment detected - using auto-discovery');
      await toolRegistry.discoverTools('./tools');
      console.log(`   ✅ Discovered ${toolRegistry.list().length} tools`);
    }

    // Initialize SkillEngine
    const skillEngine = new SkillEngine(toolRegistry, dbAdapter);

    if (isBrowser) {
      await registerSkillsManually(skillEngine);
    } else {
      await skillEngine.discoverSkills('./skills');
      console.log(`   ✅ Discovered ${skillEngine.list().length} skills`);
    }

    return {
      mode: 'dynamic',
      initialized: true,
      toolRegistry,
      skillEngine
    };
  } catch (error: any) {
    console.error('❌ Dynamic system initialization failed:', error);

    // Fall back to static if enabled
    if (featureFlags.fallbackToStatic) {
      console.warn('⚠️  Falling back to static function handlers');
      return {
        mode: 'error-fallback',
        initialized: false,
        toolRegistry: null,
        skillEngine: null,
        error
      };
    }

    // If fallback is disabled, rethrow the error
    throw error;
  }
}
