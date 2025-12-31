import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useDatabase } from './DatabaseContext';
import { DemoConfigService } from '../services/demo-config-service';
import type { DemoConfig } from '../types/demo-config';

interface DemoConfigContextValue {
  // State
  activeConfig: DemoConfig | null;
  allConfigs: DemoConfig[];
  isLoading: boolean;
  error: string | null;

  // Service instance
  demoConfigService: DemoConfigService | null;

  // Actions
  setActiveConfigId: (id: string) => Promise<void>;
  refreshConfigs: () => Promise<void>;
  createConfig: (config: Partial<DemoConfig>) => Promise<string>;
  updateConfig: (id: string, updates: Partial<DemoConfig>) => Promise<void>;
  deleteConfig: (id: string) => Promise<void>;
  duplicateConfig: (id: string, newName: string) => Promise<string>;
  exportConfig: (id: string) => Promise<string>;
  importConfig: (json: string) => Promise<string>;
}

const DemoConfigContext = createContext<DemoConfigContextValue | undefined>(undefined);

export const DemoConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { dbAdapter, isInitialized: dbInitialized } = useDatabase();

  const [demoConfigService, setDemoConfigService] = useState<DemoConfigService | null>(null);
  const [activeConfig, setActiveConfig] = useState<DemoConfig | null>(null);
  const [allConfigs, setAllConfigs] = useState<DemoConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize service when database is ready
  useEffect(() => {
    if (dbInitialized && dbAdapter) {
      console.log('🎭 Initializing DemoConfigService...');
      const service = new DemoConfigService(dbAdapter);
      setDemoConfigService(service);
    }
  }, [dbInitialized, dbAdapter]);

  // Load configs when service is ready
  useEffect(() => {
    if (demoConfigService) {
      loadConfigs();
    }
  }, [demoConfigService]);

  const loadConfigs = async () => {
    if (!demoConfigService) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('📋 Loading demo configs...');

      // Get all configs
      const configs = await demoConfigService.listDemoConfigs();
      setAllConfigs(configs);

      // Get active config
      const active = await demoConfigService.getActiveDemoConfig();
      setActiveConfig(active);

      console.log(`✅ Loaded ${configs.length} demo configs, active: ${active?.name || 'none'}`);
    } catch (err: any) {
      console.error('❌ Failed to load demo configs:', err);
      setError(err.message || 'Failed to load demo configurations');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshConfigs = useCallback(async () => {
    await loadConfigs();
  }, [demoConfigService]);

  const setActiveConfigId = useCallback(async (id: string) => {
    if (!demoConfigService) {
      throw new Error('DemoConfigService not initialized');
    }

    try {
      setIsLoading(true);
      await demoConfigService.setActiveConfig(id);

      // Refresh to get updated state
      await loadConfigs();

      console.log(`✅ Active config changed to: ${id}`);
    } catch (err: any) {
      console.error('❌ Failed to set active config:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [demoConfigService]);

  const createConfig = useCallback(async (config: Partial<DemoConfig>): Promise<string> => {
    if (!demoConfigService) {
      throw new Error('DemoConfigService not initialized');
    }

    try {
      setIsLoading(true);
      const id = await demoConfigService.createDemoConfig(config);

      // Refresh to include new config
      await loadConfigs();

      console.log(`✅ Created new demo config: ${id}`);
      return id;
    } catch (err: any) {
      console.error('❌ Failed to create config:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [demoConfigService]);

  const updateConfig = useCallback(async (id: string, updates: Partial<DemoConfig>): Promise<void> => {
    if (!demoConfigService) {
      throw new Error('DemoConfigService not initialized');
    }

    try {
      setIsLoading(true);
      await demoConfigService.updateDemoConfig(id, updates);

      // Refresh to get updated data
      await loadConfigs();

      console.log(`✅ Updated demo config: ${id}`);
    } catch (err: any) {
      console.error('❌ Failed to update config:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [demoConfigService]);

  const deleteConfig = useCallback(async (id: string): Promise<void> => {
    if (!demoConfigService) {
      throw new Error('DemoConfigService not initialized');
    }

    try {
      setIsLoading(true);
      await demoConfigService.deleteDemoConfig(id);

      // Refresh to remove deleted config
      await loadConfigs();

      console.log(`✅ Deleted demo config: ${id}`);
    } catch (err: any) {
      console.error('❌ Failed to delete config:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [demoConfigService]);

  const duplicateConfig = useCallback(async (id: string, newName: string): Promise<string> => {
    if (!demoConfigService) {
      throw new Error('DemoConfigService not initialized');
    }

    try {
      setIsLoading(true);
      const newId = await demoConfigService.duplicateDemoConfig(id, newName);

      // Refresh to include duplicated config
      await loadConfigs();

      console.log(`✅ Duplicated demo config: ${id} -> ${newId}`);
      return newId;
    } catch (err: any) {
      console.error('❌ Failed to duplicate config:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [demoConfigService]);

  const exportConfigFn = useCallback(async (id: string): Promise<string> => {
    if (!demoConfigService) {
      throw new Error('DemoConfigService not initialized');
    }

    try {
      return await demoConfigService.exportDemoConfig(id);
    } catch (err: any) {
      console.error('❌ Failed to export config:', err);
      setError(err.message);
      throw err;
    }
  }, [demoConfigService]);

  const importConfigFn = useCallback(async (json: string): Promise<string> => {
    if (!demoConfigService) {
      throw new Error('DemoConfigService not initialized');
    }

    try {
      setIsLoading(true);
      const id = await demoConfigService.importDemoConfig(json);

      // Refresh to include imported config
      await loadConfigs();

      console.log(`✅ Imported demo config: ${id}`);
      return id;
    } catch (err: any) {
      console.error('❌ Failed to import config:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [demoConfigService]);

  return (
    <DemoConfigContext.Provider
      value={{
        activeConfig,
        allConfigs,
        isLoading,
        error,
        demoConfigService,
        setActiveConfigId,
        refreshConfigs,
        createConfig,
        updateConfig,
        deleteConfig,
        duplicateConfig,
        exportConfig: exportConfigFn,
        importConfig: importConfigFn
      }}
    >
      {children}
    </DemoConfigContext.Provider>
  );
};

export const useDemoConfig = () => {
  const context = useContext(DemoConfigContext);
  if (!context) {
    throw new Error('useDemoConfig must be used within DemoConfigProvider');
  }
  return context;
};

/**
 * Hook to get the active config only (simpler interface)
 */
export const useActiveDemoConfig = () => {
  const { activeConfig, isLoading } = useDemoConfig();
  return { activeConfig, isLoading };
};

/**
 * Hook to check if demo config system is ready
 */
export const useDemoConfigReady = () => {
  const { demoConfigService, isLoading, error } = useDemoConfig();
  return {
    isReady: !!demoConfigService && !isLoading,
    isLoading,
    error
  };
};
