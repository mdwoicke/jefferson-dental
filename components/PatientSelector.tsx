import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import type { PatientRecord } from '../database/db-interface';

interface PatientSelectorProps {
  selectedPatientId: string | null;
  onSelect: (patientId: string | null) => void;
}

export const PatientSelector: React.FC<PatientSelectorProps> = ({
  selectedPatientId,
  onSelect,
}) => {
  const { crmService, isInitialized } = useDatabase();
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load patients
  useEffect(() => {
    if (!isInitialized || !crmService) return;

    const loadPatients = async () => {
      try {
        const data = await crmService.listPatients(100, 0);
        setPatients(data);
      } catch (error) {
        console.error('Failed to load patients:', error);
      }
    };

    loadPatients();
  }, [isInitialized, crmService]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  const filteredPatients = patients.filter(
    (p) =>
      p.parentName.toLowerCase().includes(search.toLowerCase()) ||
      p.phoneNumber.includes(search) ||
      p.children.some((c) => c.name.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSelect = (patientId: string | null) => {
    onSelect(patientId);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md hover:bg-white dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
      >
        <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        <div className="text-left">
          <div className="text-xs text-slate-500 dark:text-slate-400">Test Patient</div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {selectedPatient ? selectedPatient.parentName : 'None Selected'}
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-700">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search patients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-teal-500 focus:border-blue-500 dark:focus:border-teal-500 outline-none"
                autoFocus
              />
            </div>
          </div>

          {/* Patient List */}
          <div className="max-h-80 overflow-y-auto">
            {/* No Patient Option */}
            <button
              onClick={() => handleSelect(null)}
              className={`w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700 ${
                !selectedPatientId ? 'bg-blue-50 dark:bg-teal-900/30' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                  <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-700 dark:text-slate-200">No Patient</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Generic test call</div>
                </div>
                {!selectedPatientId && (
                  <svg className="w-5 h-5 text-blue-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </button>

            {/* Patient Options */}
            {filteredPatients.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                <p className="text-sm">
                  {search ? 'No patients found' : 'No patients available'}
                </p>
                {!search && (
                  <Link
                    to="/admin/patients/new"
                    className="inline-block mt-2 text-sm text-blue-600 dark:text-teal-400 hover:text-blue-700 dark:hover:text-teal-300 font-semibold"
                    onClick={() => setIsOpen(false)}
                  >
                    Add a patient →
                  </Link>
                )}
              </div>
            ) : (
              filteredPatients.map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => handleSelect(patient.id)}
                  className={`w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700 ${
                    selectedPatientId === patient.id ? 'bg-blue-50 dark:bg-teal-900/30' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-teal-500 dark:to-cyan-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-sm">
                        {patient.parentName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">{patient.parentName}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 truncate">{patient.phoneNumber}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-emerald-900/30 text-green-700 dark:text-emerald-400 text-xs font-semibold rounded-full">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                          {patient.children.length}
                        </span>
                        {patient.preferredLanguage && patient.preferredLanguage !== 'English' && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">{patient.preferredLanguage}</span>
                        )}
                      </div>
                    </div>
                    {selectedPatientId === patient.id && (
                      <svg
                        className="w-5 h-5 text-blue-600 dark:text-teal-400 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Manage Patients Link */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
            <Link
              to="/admin"
              className="flex items-center justify-center gap-2 w-full py-2 text-sm text-blue-600 dark:text-teal-400 hover:text-blue-700 dark:hover:text-teal-300 font-semibold transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Manage Patients
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
