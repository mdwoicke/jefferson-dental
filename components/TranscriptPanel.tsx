import React, { useEffect, useRef, useState } from 'react';

interface TranscriptMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date; // Last updated time
  createdAt: Date; // Immutable creation time (used for ordering)
  sequenceNumber: number; // Monotonic sequence for guaranteed ordering
  isPartial: boolean;
  responseId?: string;
  itemId?: string;
}

interface FunctionCallItem {
  id: string;
  type: 'function_call';
  callId: string;
  functionName: string;
  arguments: any;
  result?: any;
  status: 'pending' | 'success' | 'error';
  executionTimeMs?: number;
  errorMessage?: string;
  timestamp: Date; // Last updated time
  createdAt: Date; // Immutable creation time (used for ordering)
  sequenceNumber: number; // Monotonic sequence for guaranteed ordering
}

type TranscriptItem = TranscriptMessage | FunctionCallItem;

interface TranscriptPanelProps {
  items: TranscriptItem[];
  isCallActive: boolean;
}

// Icon components for function call status
const PendingIcon = () => (
  <svg className="w-4 h-4 animate-spin text-amber-500" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const SuccessIcon = () => (
  <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);

const ErrorIcon = () => (
  <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ChevronDownIcon = ({ isOpen }: { isOpen: boolean }) => (
  <svg
    className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

export function TranscriptPanel({ items, isCallActive }: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // BULLETPROOF ORDERING: Sort items by createdAt timestamp (primary) and sequenceNumber (secondary)
  // This ensures transcript items always appear in chronological order based on when they occurred,
  // NOT when the WebSocket messages arrived (which can be out of order due to network timing)
  const sortedItems = React.useMemo(() => {
    return [...items].sort((a, b) => {
      // Primary: Sort by creation timestamp (actual event time)
      const timeDiff = a.createdAt.getTime() - b.createdAt.getTime();
      if (timeDiff !== 0) {
        return timeDiff;
      }
      // Secondary: Sort by sequence number (tiebreaker for simultaneous events)
      return a.sequenceNumber - b.sequenceNumber;
    });
  }, [items]);

  // Auto-scroll to bottom when new items arrive (always scroll to show latest)
  useEffect(() => {
    if (scrollRef.current) {
      // Always scroll to bottom to show the latest messages and function calls
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sortedItems]); // Use sorted items to trigger scroll when sorted list changes

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const getSpeakerLabel = (role: 'user' | 'assistant') => {
    return role === 'assistant' ? 'Agent (Sophia)' : 'Parent';
  };

  const getSpeakerColor = (role: 'user' | 'assistant') => {
    return role === 'assistant' ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-emerald-400';
  };

  const getFunctionDisplayName = (functionName: string): string => {
    const nameMap: Record<string, string> = {
      'check_availability': 'Check Availability',
      'book_appointment': 'Book Appointment',
      'get_patient_info': 'Get Patient Info',
      'send_confirmation_sms': 'Send SMS Confirmation'
    };
    return nameMap[functionName] || functionName;
  };

  const getStatusIcon = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'pending': return <PendingIcon />;
      case 'success': return <SuccessIcon />;
      case 'error': return <ErrorIcon />;
    }
  };

  const getStatusColor = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'pending': return 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700';
      case 'success': return 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700';
      case 'error': return 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700';
    }
  };

  const renderItem = (item: TranscriptItem) => {
    if ('type' in item && item.type === 'function_call') {
      // Render function call item
      const isExpanded = expandedItems.has(item.id);

      return (
        <div
          key={item.id}
          className={`border rounded-lg p-3 ${getStatusColor(item.status)} transition-all`}
        >
          {/* Function call header - clickable */}
          <button
            onClick={() => toggleExpanded(item.id)}
            className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
          >
            <div className="flex items-center gap-2">
              {getStatusIcon(item.status)}
              <span className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-200">
                {getFunctionDisplayName(item.functionName)}
              </span>
              {item.executionTimeMs !== undefined && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  ({item.executionTimeMs}ms)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {item.timestamp.toLocaleTimeString()}
              </span>
              <ChevronDownIcon isOpen={isExpanded} />
            </div>
          </button>

          {/* Expanded details */}
          {isExpanded && (
            <div className="mt-3 space-y-3 animate-fadeIn">
              {/* Arguments */}
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mb-1 uppercase tracking-wide">
                  Input:
                </p>
                <pre className="text-xs bg-slate-900 dark:bg-slate-950 text-slate-100 p-2 rounded overflow-x-auto font-mono">
                  {JSON.stringify(item.arguments, null, 2)}
                </pre>
              </div>

              {/* Result or Error */}
              {item.status === 'error' && item.errorMessage && (
                <div>
                  <p className="text-xs text-red-600 dark:text-red-400 font-semibold mb-1 uppercase tracking-wide">
                    Error:
                  </p>
                  <pre className="text-xs bg-red-900 dark:bg-red-950 text-red-100 p-2 rounded overflow-x-auto">
                    {item.errorMessage}
                  </pre>
                </div>
              )}

              {item.status === 'success' && item.result && (
                <div>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-1 uppercase tracking-wide">
                    Output:
                  </p>
                  <pre className="text-xs bg-slate-900 dark:bg-slate-950 text-slate-100 p-2 rounded overflow-x-auto font-mono max-h-48">
                    {JSON.stringify(item.result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      );
    } else {
      // Render regular transcript message
      const message = item as TranscriptMessage;
      const isStreaming = message.isPartial;

      return (
        <div key={message.id} className="flex flex-col">
          <div className="flex items-baseline gap-2">
            <span className={`font-semibold ${getSpeakerColor(message.role)}`}>
              {getSpeakerLabel(message.role)}:
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {message.timestamp.toLocaleTimeString()}
            </span>
            {isStreaming && (
              <span className="flex items-center text-xs text-blue-500 dark:text-blue-400">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1 animate-pulse"></span>
                Streaming...
              </span>
            )}
          </div>
          <p className={`mt-1 ml-4 ${
            isStreaming
              ? 'text-gray-600 dark:text-slate-300 italic'
              : 'text-gray-800 dark:text-slate-200'
          }`}>
            {message.text}
            {isStreaming && (
              <span className="inline-block w-1 h-4 bg-blue-500 ml-1 animate-pulse" />
            )}
          </p>
        </div>
      );
    }
  };

  return (
    <div className="w-full bg-white dark:bg-slate-800/90 rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold dark:text-slate-50">Call Transcript</h2>
        {isCallActive && (
          <span className="flex items-center text-sm text-gray-600 dark:text-gray-300">
            <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
            Recording
          </span>
        )}
      </div>

      <div
        ref={scrollRef}
        className="h-[461px] overflow-y-auto border border-gray-200 dark:border-slate-600 rounded p-4 bg-gray-50 dark:bg-slate-800/50"
      >
        {items.length === 0 ? (
          <p className="text-gray-400 dark:text-gray-400 text-center mt-8">
            {isCallActive ? 'Waiting for conversation to start...' : 'No transcript available'}
          </p>
        ) : (
          <div className="space-y-4">
            {sortedItems.map(item => renderItem(item))}
          </div>
        )}
      </div>

      {items.length > 0 && !isCallActive && (
        <button className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
          Export Transcript
        </button>
      )}
    </div>
  );
}
