/**
 * Demo Config Service
 * Manages demo configuration data using database adapter
 */

import { DatabaseAdapter } from '../database/db-interface';
import {
  DemoConfig,
  BusinessProfile,
  AgentConfig,
  ScenarioConfig,
  ToolConfig,
  SMSTemplate,
  UILabels,
  DemoConfigRow,
  BusinessProfileRow,
  AgentConfigRow,
  ScenarioRow,
  ToolConfigRow,
  SMSTemplateRow,
  UILabelsRow,
  getDefaultBusinessHours,
  generateSlug,
  PREDEFINED_TOOLS,
  PredefinedToolName
} from '../types/demo-config';

export class DemoConfigService {
  constructor(private dbAdapter: DatabaseAdapter) {}

  // =========================================================================
  // DEMO CONFIG CRUD
  // =========================================================================

  /**
   * Get all demo configurations
   */
  async listDemoConfigs(): Promise<DemoConfig[]> {
    console.log('📋 Listing demo configs');

    try {
      const rows = await this.dbAdapter.executeRawSQL(
        'SELECT * FROM demo_configs ORDER BY is_default DESC, name ASC'
      ) as DemoConfigRow[];

      const configs: DemoConfig[] = [];
      for (const row of rows) {
        const config = await this.getDemoConfigById(row.id);
        if (config) configs.push(config);
      }

      console.log(`✅ Found ${configs.length} demo configs`);
      return configs;
    } catch (error) {
      console.error('❌ Error listing demo configs:', error);
      throw error;
    }
  }

  /**
   * Get demo config by ID with all related data
   */
  async getDemoConfigById(id: string): Promise<DemoConfig | null> {
    console.log('🔍 Getting demo config:', id);

    try {
      const rows = await this.dbAdapter.executeRawSQL(
        'SELECT * FROM demo_configs WHERE id = ?',
        [id]
      ) as DemoConfigRow[];

      if (rows.length === 0) {
        console.log('⚠️ Demo config not found');
        return null;
      }

      const row = rows[0];
      const config = await this.assembleFullConfig(row);

      console.log('✅ Demo config found:', config.name);
      return config;
    } catch (error) {
      console.error('❌ Error getting demo config:', error);
      throw error;
    }
  }

  /**
   * Get demo config by slug
   */
  async getDemoConfigBySlug(slug: string): Promise<DemoConfig | null> {
    console.log('🔍 Getting demo config by slug:', slug);

    try {
      const rows = await this.dbAdapter.executeRawSQL(
        'SELECT * FROM demo_configs WHERE slug = ?',
        [slug]
      ) as DemoConfigRow[];

      if (rows.length === 0) {
        console.log('⚠️ Demo config not found');
        return null;
      }

      return this.assembleFullConfig(rows[0]);
    } catch (error) {
      console.error('❌ Error getting demo config by slug:', error);
      throw error;
    }
  }

  /**
   * Get the currently active demo config
   */
  async getActiveDemoConfig(): Promise<DemoConfig | null> {
    console.log('🎯 Getting active demo config');

    try {
      const rows = await this.dbAdapter.executeRawSQL(
        'SELECT * FROM demo_configs WHERE is_active = 1 LIMIT 1'
      ) as DemoConfigRow[];

      if (rows.length === 0) {
        // Fall back to default config
        const defaultRows = await this.dbAdapter.executeRawSQL(
          'SELECT * FROM demo_configs WHERE is_default = 1 LIMIT 1'
        ) as DemoConfigRow[];

        if (defaultRows.length === 0) {
          console.log('⚠️ No active or default demo config found');
          return null;
        }

        return this.assembleFullConfig(defaultRows[0]);
      }

      return this.assembleFullConfig(rows[0]);
    } catch (error) {
      console.error('❌ Error getting active demo config:', error);
      throw error;
    }
  }

  /**
   * Create a new demo config with all related data
   */
  async createDemoConfig(config: Partial<DemoConfig>): Promise<string> {
    console.log('➕ Creating demo config:', config.name);

    try {
      await this.dbAdapter.beginTransaction();

      const configId = `DEMO-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const slug = config.slug || generateSlug(config.name || 'untitled');

      // Create main config record
      await this.dbAdapter.executeRawSQL(
        `INSERT INTO demo_configs (id, slug, name, description, is_active, is_default)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          configId,
          slug,
          config.name || 'Untitled Demo',
          config.description || null,
          config.isActive ? 1 : 0,
          config.isDefault ? 1 : 0
        ]
      );

      // Create business profile
      if (config.businessProfile) {
        await this.createBusinessProfile(configId, config.businessProfile);
      }

      // Create agent config
      if (config.agentConfig) {
        await this.createAgentConfig(configId, config.agentConfig);
      }

      // Create scenario
      if (config.scenario) {
        await this.createScenario(configId, config.scenario);
      }

      // Create tool configs
      if (config.toolConfigs) {
        for (const tool of config.toolConfigs) {
          await this.createToolConfig(configId, tool);
        }
      }

      // Create SMS templates
      if (config.smsTemplates) {
        for (const template of config.smsTemplates) {
          await this.createSMSTemplate(configId, template);
        }
      }

      // Create UI labels
      if (config.uiLabels) {
        await this.createUILabels(configId, config.uiLabels);
      }

      // Log audit trail
      await this.dbAdapter.logAudit({
        table_name: 'demo_configs',
        record_id: configId,
        operation: 'INSERT',
        changed_by: 'system',
        change_reason: 'New demo config created'
      });

      await this.dbAdapter.commit();

      console.log('✅ Demo config created:', configId);
      return configId;
    } catch (error) {
      await this.dbAdapter.rollback();
      console.error('❌ Error creating demo config:', error);
      throw error;
    }
  }

  /**
   * Update an existing demo config
   */
  async updateDemoConfig(id: string, updates: Partial<DemoConfig>): Promise<void> {
    console.log('✏️ Updating demo config:', id);

    try {
      await this.dbAdapter.beginTransaction();

      // Update main config fields
      const fields: string[] = [];
      const values: any[] = [];

      if (updates.name !== undefined) {
        fields.push('name = ?');
        values.push(updates.name);
      }
      if (updates.slug !== undefined) {
        fields.push('slug = ?');
        values.push(updates.slug);
      }
      if (updates.description !== undefined) {
        fields.push('description = ?');
        values.push(updates.description);
      }
      if (updates.isActive !== undefined) {
        fields.push('is_active = ?');
        values.push(updates.isActive ? 1 : 0);
      }
      if (updates.isDefault !== undefined) {
        fields.push('is_default = ?');
        values.push(updates.isDefault ? 1 : 0);
      }

      if (fields.length > 0) {
        values.push(id);
        await this.dbAdapter.executeRawSQL(
          `UPDATE demo_configs SET ${fields.join(', ')} WHERE id = ?`,
          values
        );
      }

      // Update related tables
      if (updates.businessProfile) {
        await this.updateBusinessProfile(id, updates.businessProfile);
      }
      if (updates.agentConfig) {
        await this.updateAgentConfig(id, updates.agentConfig);
      }
      if (updates.scenario) {
        await this.updateScenario(id, updates.scenario);
      }
      if (updates.toolConfigs) {
        await this.replaceToolConfigs(id, updates.toolConfigs);
      }
      if (updates.smsTemplates) {
        await this.replaceSMSTemplates(id, updates.smsTemplates);
      }
      if (updates.uiLabels) {
        await this.updateUILabels(id, updates.uiLabels);
      }

      // Log audit trail
      await this.dbAdapter.logAudit({
        table_name: 'demo_configs',
        record_id: id,
        operation: 'UPDATE',
        new_value: updates,
        changed_by: 'system',
        change_reason: 'Demo config updated'
      });

      await this.dbAdapter.commit();

      console.log('✅ Demo config updated:', id);
    } catch (error) {
      await this.dbAdapter.rollback();
      console.error('❌ Error updating demo config:', error);
      throw error;
    }
  }

  /**
   * Delete a demo config and all related data
   */
  async deleteDemoConfig(id: string): Promise<void> {
    console.log('🗑️ Deleting demo config:', id);

    try {
      // Check if this is the default config
      const config = await this.getDemoConfigById(id);
      if (config?.isDefault) {
        throw new Error('Cannot delete the default demo config');
      }

      await this.dbAdapter.executeRawSQL(
        'DELETE FROM demo_configs WHERE id = ?',
        [id]
      );

      // Log audit trail
      await this.dbAdapter.logAudit({
        table_name: 'demo_configs',
        record_id: id,
        operation: 'DELETE',
        changed_by: 'system',
        change_reason: 'Demo config deleted'
      });

      console.log('✅ Demo config deleted:', id);
    } catch (error) {
      console.error('❌ Error deleting demo config:', error);
      throw error;
    }
  }

  /**
   * Set a demo config as active (deactivates all others)
   */
  async setActiveConfig(id: string): Promise<void> {
    console.log('🎯 Setting active demo config:', id);

    try {
      await this.dbAdapter.beginTransaction();

      // Deactivate all configs
      await this.dbAdapter.executeRawSQL(
        'UPDATE demo_configs SET is_active = 0'
      );

      // Activate the specified config
      await this.dbAdapter.executeRawSQL(
        'UPDATE demo_configs SET is_active = 1 WHERE id = ?',
        [id]
      );

      await this.dbAdapter.commit();

      console.log('✅ Active config set:', id);
    } catch (error) {
      await this.dbAdapter.rollback();
      console.error('❌ Error setting active config:', error);
      throw error;
    }
  }

  /**
   * Duplicate a demo config
   */
  async duplicateDemoConfig(id: string, newName: string): Promise<string> {
    console.log('📋 Duplicating demo config:', id);

    try {
      const original = await this.getDemoConfigById(id);
      if (!original) {
        throw new Error(`Demo config ${id} not found`);
      }

      const newConfig: Partial<DemoConfig> = {
        ...original,
        name: newName,
        slug: generateSlug(newName),
        isActive: false,
        isDefault: false
      };

      // Remove IDs so new ones are generated
      delete newConfig.id;
      if (newConfig.businessProfile) delete newConfig.businessProfile.id;
      if (newConfig.agentConfig) delete newConfig.agentConfig.id;
      if (newConfig.scenario) delete newConfig.scenario.id;
      if (newConfig.uiLabels) delete newConfig.uiLabels.id;
      newConfig.toolConfigs?.forEach(t => delete (t as any).id);
      newConfig.smsTemplates?.forEach(t => delete (t as any).id);

      return this.createDemoConfig(newConfig);
    } catch (error) {
      console.error('❌ Error duplicating demo config:', error);
      throw error;
    }
  }

  /**
   * Export a demo config as JSON
   */
  async exportDemoConfig(id: string): Promise<string> {
    const config = await this.getDemoConfigById(id);
    if (!config) {
      throw new Error(`Demo config ${id} not found`);
    }
    return JSON.stringify(config, null, 2);
  }

  /**
   * Import a demo config from JSON
   */
  async importDemoConfig(json: string): Promise<string> {
    const config = JSON.parse(json) as Partial<DemoConfig>;

    // Remove IDs to generate new ones
    delete config.id;
    delete config.createdAt;
    delete config.updatedAt;
    config.isActive = false;
    config.isDefault = false;

    return this.createDemoConfig(config);
  }

  // =========================================================================
  // PRIVATE HELPER METHODS
  // =========================================================================

  private async assembleFullConfig(row: DemoConfigRow): Promise<DemoConfig> {
    const [
      businessProfile,
      agentConfig,
      scenario,
      toolConfigs,
      smsTemplates,
      uiLabels
    ] = await Promise.all([
      this.getBusinessProfile(row.id),
      this.getAgentConfig(row.id),
      this.getScenario(row.id),
      this.getToolConfigs(row.id),
      this.getSMSTemplates(row.id),
      this.getUILabels(row.id)
    ]);

    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description || undefined,
      isActive: row.is_active === 1,
      isDefault: row.is_default === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      businessProfile: businessProfile!,
      agentConfig: agentConfig!,
      scenario: scenario!,
      toolConfigs,
      smsTemplates,
      uiLabels: uiLabels!
    };
  }

  // -------------------------------------------------------------------------
  // Business Profile
  // -------------------------------------------------------------------------

  private async getBusinessProfile(demoConfigId: string): Promise<BusinessProfile | null> {
    const rows = await this.dbAdapter.executeRawSQL(
      'SELECT * FROM demo_business_profiles WHERE demo_config_id = ?',
      [demoConfigId]
    ) as BusinessProfileRow[];

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      demoConfigId: row.demo_config_id,
      organizationName: row.organization_name,
      address: {
        street: row.address_street,
        city: row.address_city,
        state: row.address_state,
        zip: row.address_zip
      },
      phoneNumber: row.phone_number,
      logoUrl: row.logo_url || undefined,
      primaryColor: row.primary_color,
      secondaryColor: row.secondary_color,
      hours: row.hours_json ? JSON.parse(row.hours_json) : getDefaultBusinessHours()
    };
  }

  private async createBusinessProfile(demoConfigId: string, profile: Partial<BusinessProfile>): Promise<void> {
    const id = `BP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await this.dbAdapter.executeRawSQL(
      `INSERT INTO demo_business_profiles
       (id, demo_config_id, organization_name, address_street, address_city, address_state, address_zip, phone_number, logo_url, primary_color, secondary_color, hours_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        demoConfigId,
        profile.organizationName || '',
        profile.address?.street || '',
        profile.address?.city || '',
        profile.address?.state || '',
        profile.address?.zip || '',
        profile.phoneNumber || '',
        profile.logoUrl || null,
        profile.primaryColor || '#3B82F6',
        profile.secondaryColor || '#6366F1',
        profile.hours ? JSON.stringify(profile.hours) : null
      ]
    );
  }

  private async updateBusinessProfile(demoConfigId: string, profile: Partial<BusinessProfile>): Promise<void> {
    const existing = await this.getBusinessProfile(demoConfigId);

    if (!existing) {
      await this.createBusinessProfile(demoConfigId, profile);
      return;
    }

    await this.dbAdapter.executeRawSQL(
      `UPDATE demo_business_profiles SET
       organization_name = ?, address_street = ?, address_city = ?, address_state = ?, address_zip = ?,
       phone_number = ?, logo_url = ?, primary_color = ?, secondary_color = ?, hours_json = ?
       WHERE demo_config_id = ?`,
      [
        profile.organizationName ?? existing.organizationName,
        profile.address?.street ?? existing.address.street,
        profile.address?.city ?? existing.address.city,
        profile.address?.state ?? existing.address.state,
        profile.address?.zip ?? existing.address.zip,
        profile.phoneNumber ?? existing.phoneNumber,
        profile.logoUrl ?? existing.logoUrl ?? null,
        profile.primaryColor ?? existing.primaryColor,
        profile.secondaryColor ?? existing.secondaryColor,
        profile.hours ? JSON.stringify(profile.hours) : (existing.hours ? JSON.stringify(existing.hours) : null),
        demoConfigId
      ]
    );
  }

  // -------------------------------------------------------------------------
  // Agent Config
  // -------------------------------------------------------------------------

  private async getAgentConfig(demoConfigId: string): Promise<AgentConfig | null> {
    const rows = await this.dbAdapter.executeRawSQL(
      'SELECT * FROM demo_agent_configs WHERE demo_config_id = ?',
      [demoConfigId]
    ) as AgentConfigRow[];

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      demoConfigId: row.demo_config_id,
      agentName: row.agent_name,
      voiceName: row.voice_name as any,
      personalityDescription: row.personality_description || undefined,
      systemPrompt: row.system_prompt,
      openingScript: row.opening_script || undefined,
      closingScript: row.closing_script || undefined,
      objectionHandling: row.objection_handling_json ? JSON.parse(row.objection_handling_json) : []
    };
  }

  private async createAgentConfig(demoConfigId: string, config: Partial<AgentConfig>): Promise<void> {
    const id = `AC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await this.dbAdapter.executeRawSQL(
      `INSERT INTO demo_agent_configs
       (id, demo_config_id, agent_name, voice_name, personality_description, system_prompt, opening_script, closing_script, objection_handling_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        demoConfigId,
        config.agentName || 'AI Agent',
        config.voiceName || 'alloy',
        config.personalityDescription || null,
        config.systemPrompt || '',
        config.openingScript || null,
        config.closingScript || null,
        config.objectionHandling ? JSON.stringify(config.objectionHandling) : null
      ]
    );
  }

  private async updateAgentConfig(demoConfigId: string, config: Partial<AgentConfig>): Promise<void> {
    const existing = await this.getAgentConfig(demoConfigId);

    if (!existing) {
      await this.createAgentConfig(demoConfigId, config);
      return;
    }

    await this.dbAdapter.executeRawSQL(
      `UPDATE demo_agent_configs SET
       agent_name = ?, voice_name = ?, personality_description = ?, system_prompt = ?,
       opening_script = ?, closing_script = ?, objection_handling_json = ?
       WHERE demo_config_id = ?`,
      [
        config.agentName ?? existing.agentName,
        config.voiceName ?? existing.voiceName,
        config.personalityDescription ?? existing.personalityDescription ?? null,
        config.systemPrompt ?? existing.systemPrompt,
        config.openingScript ?? existing.openingScript ?? null,
        config.closingScript ?? existing.closingScript ?? null,
        config.objectionHandling ? JSON.stringify(config.objectionHandling) : (existing.objectionHandling ? JSON.stringify(existing.objectionHandling) : null),
        demoConfigId
      ]
    );
  }

  // -------------------------------------------------------------------------
  // Scenario
  // -------------------------------------------------------------------------

  private async getScenario(demoConfigId: string): Promise<ScenarioConfig | null> {
    const rows = await this.dbAdapter.executeRawSQL(
      'SELECT * FROM demo_scenarios WHERE demo_config_id = ?',
      [demoConfigId]
    ) as ScenarioRow[];

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      demoConfigId: row.demo_config_id,
      callDirection: row.call_direction as 'inbound' | 'outbound',
      useCase: row.use_case,
      targetAudience: row.target_audience || undefined,
      demoPatientData: row.demo_patient_data_json ? JSON.parse(row.demo_patient_data_json) : { parentName: '', phoneNumber: '', address: { street: '', city: '', state: '', zip: '' }, children: [] },
      keyTalkingPoints: row.key_talking_points_json ? JSON.parse(row.key_talking_points_json) : [],
      edgeCases: row.edge_cases_json ? JSON.parse(row.edge_cases_json) : []
    };
  }

  private async createScenario(demoConfigId: string, scenario: Partial<ScenarioConfig>): Promise<void> {
    const id = `SC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await this.dbAdapter.executeRawSQL(
      `INSERT INTO demo_scenarios
       (id, demo_config_id, call_direction, use_case, target_audience, demo_patient_data_json, key_talking_points_json, edge_cases_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        demoConfigId,
        scenario.callDirection || 'outbound',
        scenario.useCase || '',
        scenario.targetAudience || null,
        scenario.demoPatientData ? JSON.stringify(scenario.demoPatientData) : null,
        scenario.keyTalkingPoints ? JSON.stringify(scenario.keyTalkingPoints) : null,
        scenario.edgeCases ? JSON.stringify(scenario.edgeCases) : null
      ]
    );
  }

  private async updateScenario(demoConfigId: string, scenario: Partial<ScenarioConfig>): Promise<void> {
    const existing = await this.getScenario(demoConfigId);

    if (!existing) {
      await this.createScenario(demoConfigId, scenario);
      return;
    }

    await this.dbAdapter.executeRawSQL(
      `UPDATE demo_scenarios SET
       call_direction = ?, use_case = ?, target_audience = ?,
       demo_patient_data_json = ?, key_talking_points_json = ?, edge_cases_json = ?
       WHERE demo_config_id = ?`,
      [
        scenario.callDirection ?? existing.callDirection,
        scenario.useCase ?? existing.useCase,
        scenario.targetAudience ?? existing.targetAudience ?? null,
        scenario.demoPatientData ? JSON.stringify(scenario.demoPatientData) : JSON.stringify(existing.demoPatientData),
        scenario.keyTalkingPoints ? JSON.stringify(scenario.keyTalkingPoints) : JSON.stringify(existing.keyTalkingPoints),
        scenario.edgeCases ? JSON.stringify(scenario.edgeCases) : JSON.stringify(existing.edgeCases),
        demoConfigId
      ]
    );
  }

  // -------------------------------------------------------------------------
  // Tool Configs
  // -------------------------------------------------------------------------

  private async getToolConfigs(demoConfigId: string): Promise<ToolConfig[]> {
    const rows = await this.dbAdapter.executeRawSQL(
      'SELECT * FROM demo_tool_configs WHERE demo_config_id = ? ORDER BY tool_name',
      [demoConfigId]
    ) as ToolConfigRow[];

    return rows.map(row => ({
      id: row.id,
      demoConfigId: row.demo_config_id,
      toolName: row.tool_name,
      toolType: row.tool_type as 'predefined' | 'custom',
      isEnabled: row.is_enabled === 1,
      displayName: row.display_name || row.tool_name,
      description: row.description || '',
      parametersSchema: row.parameters_schema_json ? JSON.parse(row.parameters_schema_json) : { type: 'object', properties: {}, required: [] },
      mockResponseTemplate: row.mock_response_template || undefined,
      mockResponseDelayMs: row.mock_response_delay_ms
    }));
  }

  private async createToolConfig(demoConfigId: string, tool: Partial<ToolConfig>): Promise<void> {
    const id = `TC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await this.dbAdapter.executeRawSQL(
      `INSERT INTO demo_tool_configs
       (id, demo_config_id, tool_name, tool_type, is_enabled, display_name, description, parameters_schema_json, mock_response_template, mock_response_delay_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        demoConfigId,
        tool.toolName || '',
        tool.toolType || 'predefined',
        tool.isEnabled ? 1 : 0,
        tool.displayName || tool.toolName || '',
        tool.description || '',
        tool.parametersSchema ? JSON.stringify(tool.parametersSchema) : null,
        tool.mockResponseTemplate || null,
        tool.mockResponseDelayMs || 300
      ]
    );
  }

  private async replaceToolConfigs(demoConfigId: string, tools: ToolConfig[]): Promise<void> {
    // Delete existing tools
    await this.dbAdapter.executeRawSQL(
      'DELETE FROM demo_tool_configs WHERE demo_config_id = ?',
      [demoConfigId]
    );

    // Create new tools
    for (const tool of tools) {
      await this.createToolConfig(demoConfigId, tool);
    }
  }

  // -------------------------------------------------------------------------
  // SMS Templates
  // -------------------------------------------------------------------------

  private async getSMSTemplates(demoConfigId: string): Promise<SMSTemplate[]> {
    const rows = await this.dbAdapter.executeRawSQL(
      'SELECT * FROM demo_sms_templates WHERE demo_config_id = ? ORDER BY template_type',
      [demoConfigId]
    ) as SMSTemplateRow[];

    return rows.map(row => ({
      id: row.id,
      demoConfigId: row.demo_config_id,
      templateType: row.template_type as 'confirmation' | 'reminder' | 'cancellation' | 'custom',
      templateName: row.template_name,
      senderName: row.sender_name,
      messageTemplate: row.message_template
    }));
  }

  private async createSMSTemplate(demoConfigId: string, template: Partial<SMSTemplate>): Promise<void> {
    const id = `SMS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await this.dbAdapter.executeRawSQL(
      `INSERT INTO demo_sms_templates
       (id, demo_config_id, template_type, template_name, sender_name, message_template)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        demoConfigId,
        template.templateType || 'confirmation',
        template.templateName || '',
        template.senderName || 'Demo Clinic',
        template.messageTemplate || ''
      ]
    );
  }

  private async replaceSMSTemplates(demoConfigId: string, templates: SMSTemplate[]): Promise<void> {
    // Delete existing templates
    await this.dbAdapter.executeRawSQL(
      'DELETE FROM demo_sms_templates WHERE demo_config_id = ?',
      [demoConfigId]
    );

    // Create new templates
    for (const template of templates) {
      await this.createSMSTemplate(demoConfigId, template);
    }
  }

  // -------------------------------------------------------------------------
  // UI Labels
  // -------------------------------------------------------------------------

  private async getUILabels(demoConfigId: string): Promise<UILabels | null> {
    const rows = await this.dbAdapter.executeRawSQL(
      'SELECT * FROM demo_ui_labels WHERE demo_config_id = ?',
      [demoConfigId]
    ) as UILabelsRow[];

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      demoConfigId: row.demo_config_id,
      headerText: row.header_text,
      headerBadge: row.header_badge,
      footerText: row.footer_text,
      heroTitle: row.hero_title,
      heroSubtitle: row.hero_subtitle || undefined,
      userSpeakerLabel: row.user_speaker_label,
      agentSpeakerLabel: row.agent_speaker_label,
      callButtonText: row.call_button_text,
      endCallButtonText: row.end_call_button_text,
      badgeText: row.badge_text
    };
  }

  private async createUILabels(demoConfigId: string, labels: Partial<UILabels>): Promise<void> {
    const id = `UL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await this.dbAdapter.executeRawSQL(
      `INSERT INTO demo_ui_labels
       (id, demo_config_id, header_text, header_badge, footer_text, hero_title, hero_subtitle, user_speaker_label, agent_speaker_label, call_button_text, end_call_button_text, badge_text)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        demoConfigId,
        labels.headerText || 'Demo Clinic',
        labels.headerBadge || '(Demo)',
        labels.footerText || 'Enhanced Demo',
        labels.heroTitle || 'Proactive care for every family',
        labels.heroSubtitle || null,
        labels.userSpeakerLabel || 'Caller',
        labels.agentSpeakerLabel || 'Agent',
        labels.callButtonText || 'Start Demo Call',
        labels.endCallButtonText || 'End Call',
        labels.badgeText || 'VOICE AI DEMO'
      ]
    );
  }

  private async updateUILabels(demoConfigId: string, labels: Partial<UILabels>): Promise<void> {
    const existing = await this.getUILabels(demoConfigId);

    if (!existing) {
      await this.createUILabels(demoConfigId, labels);
      return;
    }

    await this.dbAdapter.executeRawSQL(
      `UPDATE demo_ui_labels SET
       header_text = ?, header_badge = ?, footer_text = ?, hero_title = ?, hero_subtitle = ?,
       user_speaker_label = ?, agent_speaker_label = ?, call_button_text = ?, end_call_button_text = ?, badge_text = ?
       WHERE demo_config_id = ?`,
      [
        labels.headerText ?? existing.headerText,
        labels.headerBadge ?? existing.headerBadge,
        labels.footerText ?? existing.footerText,
        labels.heroTitle ?? existing.heroTitle,
        labels.heroSubtitle ?? existing.heroSubtitle ?? null,
        labels.userSpeakerLabel ?? existing.userSpeakerLabel,
        labels.agentSpeakerLabel ?? existing.agentSpeakerLabel,
        labels.callButtonText ?? existing.callButtonText,
        labels.endCallButtonText ?? existing.endCallButtonText,
        labels.badgeText ?? existing.badgeText,
        demoConfigId
      ]
    );
  }

  // =========================================================================
  // HELPER METHODS
  // =========================================================================

  /**
   * Initialize default tool configs from predefined tools registry
   */
  getDefaultToolConfigs(): Partial<ToolConfig>[] {
    return Object.entries(PREDEFINED_TOOLS).map(([name, config]) => ({
      ...config,
      demoConfigId: ''
    }));
  }

  /**
   * Get a specific predefined tool config
   */
  getPredefinedTool(name: PredefinedToolName): Omit<ToolConfig, 'id' | 'demoConfigId'> | undefined {
    return PREDEFINED_TOOLS[name];
  }
}
