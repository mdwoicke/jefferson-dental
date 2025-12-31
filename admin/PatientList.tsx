import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import type { PatientRecord } from '../database/db-interface';

interface PatientListProps {
  onDeleteRequest: (patient: PatientRecord) => void;
}

export const PatientList: React.FC<PatientListProps> = ({ onDeleteRequest }) => {
  const { crmService, isInitialized } = useDatabase();
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [callingPatients, setCallingPatients] = useState<Set<string>>(new Set());

  const loadPatients = async () => {
    if (!isInitialized || !crmService) return;

    try {
      setLoading(true);
      const data = await crmService.listPatients(100, 0);
      setPatients(data);
    } catch (error) {
      console.error('Failed to load patients:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, [isInitialized, crmService]);

  const toggleRow = (patientId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(patientId)) {
      newExpanded.delete(patientId);
    } else {
      newExpanded.add(patientId);
    }
    setExpandedRows(newExpanded);
  };

  const handleCallPatient = async (patient: PatientRecord) => {
    try {
      setCallingPatients(prev => new Set(prev).add(patient.id));

      const response = await fetch('http://localhost:3001/api/calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: patient.phoneNumber,
          provider: 'openai'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to initiate call');
      }

      const data = await response.json();
      console.log('Call initiated:', data);
      alert(`Outbound call initiated to ${patient.parentName} (${patient.phoneNumber})\nCall ID: ${data.callId}`);
    } catch (error) {
      console.error('Call initiation failed:', error);
      alert('Failed to initiate call. Check console for details.');
    } finally {
      setCallingPatients(prev => {
        const next = new Set(prev);
        next.delete(patient.id);
        return next;
      });
    }
  };

  const filteredPatients = patients.filter(p =>
    p.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.phoneNumber.includes(searchQuery) ||
    p.address.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Initializing database...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading patients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Patients</h1>
          <p className="text-slate-600 mt-1">
            {filteredPatients.length} {filteredPatients.length === 1 ? 'patient' : 'patients'}
            {searchQuery && ' found'}
          </p>
        </div>
        <Link
          to="/admin/patients/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors shadow-lg shadow-blue-500/30"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Patient
        </Link>
      </div>

      {/* Search Bar */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-lg border border-slate-200">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
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
            placeholder="Search by name, phone, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Patient Table */}
      {filteredPatients.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-12 shadow-lg border border-slate-200 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            {searchQuery ? 'No patients found' : 'No patients yet'}
          </h3>
          <p className="text-slate-600 mb-4">
            {searchQuery
              ? 'Try adjusting your search criteria'
              : 'Get started by adding your first patient'}
          </p>
          {!searchQuery && (
            <Link
              to="/admin/patients/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Your First Patient
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Parent Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Phone</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Address</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Children</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Last Visit</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPatients.map((patient) => (
                  <React.Fragment key={patient.id}>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{patient.parentName}</div>
                        {patient.preferredLanguage && patient.preferredLanguage !== 'English' && (
                          <div className="text-xs text-slate-500 mt-1">
                            Speaks {patient.preferredLanguage}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{patient.phoneNumber}</td>
                      <td className="px-6 py-4 text-slate-600">
                        <div>{patient.address.city}, {patient.address.state}</div>
                        <div className="text-xs text-slate-500">{patient.address.zip}</div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleRow(patient.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 hover:bg-green-200 text-green-700 text-sm font-semibold rounded-full transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                          {patient.children.length}
                          <svg
                            className={`w-3 h-3 transition-transform ${expandedRows.has(patient.id) ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {patient.lastVisit || <span className="text-slate-400">Never</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleCallPatient(patient)}
                            disabled={callingPatients.has(patient.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Call patient (outbound)"
                          >
                            {callingPatients.has(patient.id) ? (
                              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                            )}
                          </button>
                          <Link
                            to={`/admin/patients/${patient.id}/edit`}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit patient"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </Link>
                          <button
                            onClick={() => onDeleteRequest(patient)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete patient"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedRows.has(patient.id) && patient.children.length > 0 && (
                      <tr className="bg-slate-50">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="pl-4">
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">Children</h4>
                            <div className="space-y-2">
                              {patient.children.map((child) => (
                                <div
                                  key={child.id}
                                  className="flex items-center gap-4 p-3 bg-white rounded-lg border border-slate-200"
                                >
                                  <div className="flex-1">
                                    <div className="font-semibold text-slate-900">{child.name}</div>
                                    <div className="text-sm text-slate-600">
                                      Age {child.age}
                                      {child.date_of_birth && ` • DOB: ${child.date_of_birth}`}
                                    </div>
                                  </div>
                                  <div className="text-sm text-slate-600">
                                    <div className="text-xs text-slate-500">Medicaid ID</div>
                                    <div className="font-mono">{child.medicaid_id}</div>
                                  </div>
                                  {child.special_needs && (
                                    <div className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                                      Special Needs
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
