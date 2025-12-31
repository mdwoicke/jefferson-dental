import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemoConfig } from '../contexts/DemoConfigContext';

interface DemoConfigSelectorProps {
  onOpenWizard?: () => void;
}

export const DemoConfigSelector: React.FC<DemoConfigSelectorProps> = ({ onOpenWizard }) => {
  const navigate = useNavigate();
  const { activeConfig, allConfigs, isLoading, setActiveConfigId } = useDemoConfig();
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = async (configId: string) => {
    try {
      await setActiveConfigId(configId);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to switch demo:', error);
    }
  };

  if (isLoading && !activeConfig) {
    return (
      <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-800/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/40 dark:border-slate-700/70 shadow-sm">
        <span className="text-xs text-slate-500 dark:text-slate-400">Loading demos...</span>
      </div>
    );
  }

  // If no configs exist yet, show a "Create Demo" button
  if (allConfigs.length === 0) {
    return (
      <button
        onClick={onOpenWizard}
        className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-full shadow-sm hover:from-purple-700 hover:to-blue-700 transition-all text-xs font-medium"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Create Demo
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white/60 dark:bg-slate-800/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/40 dark:border-slate-700/70 shadow-sm hover:bg-white/80 dark:hover:bg-slate-700/80 transition-all"
      >
        <svg className="w-4 h-4 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <span className="text-xs font-medium text-slate-700 dark:text-slate-200 max-w-[120px] truncate">
          {activeConfig?.name || 'Select Demo'}
        </span>
        <svg className={`w-3 h-3 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 z-50 overflow-hidden">
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 py-2">
                Available Demos
              </div>

              {allConfigs.map(config => (
                <button
                  key={config.id}
                  onClick={() => handleSelect(config.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                    config.id === activeConfig?.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {config.name}
                    </div>
                    {config.description && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {config.description}
                      </div>
                    )}
                  </div>

                  {config.id === activeConfig?.id && (
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 ml-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}

                  {config.isDefault && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded ml-2 flex-shrink-0">
                      Default
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="border-t border-gray-200 dark:border-slate-700 p-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenWizard?.();
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-sm">Create New Demo</span>
              </button>

              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/admin/demos');
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm">Manage Demos</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DemoConfigSelector;
