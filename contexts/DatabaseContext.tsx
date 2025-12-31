import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CRMService } from '../services/crm-service';
import { CallMetricsService } from '../services/call-metrics-service';
import { TestingService } from '../services/testing-service';
import { initBrowserDatabase } from '../database/frontend/db-init';
import { BrowserDatabaseAdapter } from '../database/frontend/browser-adapter';
import { APIBasedDatabaseAdapter } from '../database/frontend/api-adapter';
import type { DatabaseAdapter } from '../database/db-interface';

// Database mode configuration
const USE_UNIFIED_DATABASE = false; // Set to false to use browser-only sql.js database
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

interface DatabaseContextValue {
  crmService: CRMService | null;
  callMetricsService: CallMetricsService | null;
  testingService: TestingService | null;
  dbAdapter: DatabaseAdapter | null;
  isInitialized: boolean;
  error: Error | null;
}

const DatabaseContext = createContext<DatabaseContextValue | undefined>(undefined);

export const DatabaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [crmService, setCrmService] = useState<CRMService | null>(null);
  const [callMetricsService, setCallMetricsService] = useState<CallMetricsService | null>(null);
  const [testingService, setTestingService] = useState<TestingService | null>(null);
  const [dbAdapter, setDbAdapter] = useState<DatabaseAdapter | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initDatabase = async () => {
      try {
        let adapter: DatabaseAdapter;

        if (USE_UNIFIED_DATABASE) {
          // Use API-based adapter for unified database (browser + telephony)
          console.log('🚀 Initializing unified database connection...');
          console.log(`   Backend URL: ${BACKEND_URL}`);
          adapter = new APIBasedDatabaseAdapter(BACKEND_URL);
          console.log('✅ APIBasedDatabaseAdapter created - unified logging enabled');
          console.log('   ℹ️  All calls (browser + telephony) will be stored in the backend database');
        } else {
          // Use local browser database (legacy mode)
          console.log('🚀 Initializing local browser database...');
          const db = await initBrowserDatabase();
          adapter = new BrowserDatabaseAdapter(db);
          console.log('✅ BrowserDatabaseAdapter created - local storage only');
          console.log('   ⚠️  Browser calls will NOT be visible in telephony logs');
        }

        setDbAdapter(adapter);
        console.log('✅ Database adapter ready:', adapter.constructor.name);

        // Initialize CRM service with database adapter
        const service = new CRMService(adapter);
        setCrmService(service);
        console.log('✅ CRMService initialized with adapter');

        // Initialize CallMetricsService
        const metricsService = new CallMetricsService(adapter);
        setCallMetricsService(metricsService);
        console.log('✅ CallMetricsService initialized with adapter');

        // Initialize TestingService
        const testService = new TestingService(adapter);
        setTestingService(testService);
        console.log('✅ TestingService initialized with adapter');

        setIsInitialized(true);
        console.log('✅ Database and all services initialized - isInitialized set to TRUE');
      } catch (err: any) {
        console.error('❌ Failed to initialize database:', err);
        setError(err);
      }
    };

    initDatabase();
  }, []);

  return (
    <DatabaseContext.Provider value={{ crmService, callMetricsService, testingService, dbAdapter, isInitialized, error }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within DatabaseProvider');
  }
  return context;
};
