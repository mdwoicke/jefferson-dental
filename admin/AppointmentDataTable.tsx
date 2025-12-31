/**
 * Appointment Data Table Component
 * Displays all booked appointments with patient and child details
 */

import React, { useState, useEffect } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import { Appointment } from '../database/db-interface';
import { DataExportButton } from '../components/DataExportButton';

export const AppointmentDataTable: React.FC = () => {
  const { dbAdapter, isInitialized } = useDatabase();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isInitialized && dbAdapter) {
      loadAppointments();
    }
  }, [isInitialized, dbAdapter]);

  const loadAppointments = async () => {
    if (!dbAdapter) return;

    setLoading(true);
    try {
      const data = await dbAdapter.listAppointments({});
      setAppointments(data);
      console.log(`✅ Loaded ${data.length} appointments`);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAppointments = appointments.filter(apt =>
    apt.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    apt.booking_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    apt.patient_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      'no-show': 'bg-gray-200 text-gray-700'
    };

    const style = styles[status as keyof typeof styles] || 'bg-gray-200 text-gray-700';

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${style}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-500">Loading appointments...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with search and export */}
      <div className="flex items-center justify-between gap-4">
        <input
          type="text"
          placeholder="Search appointments..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <DataExportButton
          data={filteredAppointments}
          filename="appointments"
          format="csv"
        />
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4">
          <div className="text-sm text-gray-600">Total</div>
          <div className="text-2xl font-bold text-gray-800">{appointments.length}</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">Pending</div>
          <div className="text-2xl font-bold text-yellow-700">
            {appointments.filter(a => a.status === 'pending').length}
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">Confirmed</div>
          <div className="text-2xl font-bold text-blue-700">
            {appointments.filter(a => a.status === 'confirmed').length}
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">Completed</div>
          <div className="text-2xl font-bold text-green-700">
            {appointments.filter(a => a.status === 'completed').length}
          </div>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">Cancelled</div>
          <div className="text-2xl font-bold text-red-700">
            {appointments.filter(a => a.status === 'cancelled').length}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/80 backdrop-blur-xl rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Booking ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Appointment Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Children
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    {searchQuery ? 'No appointments match your search' : 'No appointments found'}
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((appointment) => (
                  <tr key={appointment.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">
                      {appointment.booking_id}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">
                      {appointment.patient_id.substring(0, 12)}...
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(appointment.appointment_time).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {appointment.appointment_type.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {appointment.location}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {getStatusBadge(appointment.status)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {appointment.child_count || 1}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer stats */}
      <div className="text-sm text-gray-500 text-center">
        Showing {filteredAppointments.length} of {appointments.length} appointments
      </div>
    </div>
  );
};

export default AppointmentDataTable;
