/**
 * AppointmentSummaryCard Component
 * Displays stylish appointment summary cards after successful bookings
 */

import React from 'react';
import { AppointmentBooking } from '../services/appointment-service';
import { formatAppointmentTime, formatAppointmentType } from '../utils/appointment-utils';

interface AppointmentSummaryCardProps {
  bookings: AppointmentBooking[];
  parentName?: string;
}

// Icon Components
const CheckmarkIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const MapPinIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const ClipboardCheckIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);

export function AppointmentSummaryCard({ bookings, parentName }: AppointmentSummaryCardProps) {
  // Don't render if no bookings
  if (!bookings || bookings.length === 0) {
    return null;
  }

  return (
    <div className="w-full animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <SparklesIcon />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Appointments Scheduled</h2>
      </div>

      {/* Bookings Grid */}
      <div className="space-y-4">
        {bookings.map((booking) => (
          <div
            key={booking.booking_id}
            className="bg-gradient-to-br from-emerald-50 to-white dark:from-slate-800 dark:to-slate-900 border-2 border-emerald-200 dark:border-emerald-500/30 shadow-lg shadow-emerald-500/10 dark:shadow-emerald-500/10 rounded-xl p-6 hover:scale-[1.02] hover:shadow-2xl hover:shadow-emerald-500/20 dark:hover:shadow-emerald-500/30 transition-all duration-300"
          >
            {/* Status Badge */}
            <div className="flex items-center justify-between mb-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-semibold text-xs border border-emerald-300 dark:border-emerald-700">
                <CheckmarkIcon />
                <span>CONFIRMED</span>
              </div>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                ID: {booking.booking_id}
              </span>
            </div>

            {/* Main Content Grid */}
            <div className="space-y-4">
              {/* Parent Name */}
              {parentName && (
                <div className="flex items-start gap-3">
                  <div className="mt-1 text-slate-600 dark:text-slate-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Patient</p>
                    <p className="text-base font-semibold text-slate-800 dark:text-slate-200">{parentName}</p>
                  </div>
                </div>
              )}

              {/* Children */}
              <div className="flex items-start gap-3">
                <div className="mt-1 text-slate-600 dark:text-slate-400">
                  <UsersIcon />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Children</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {booking.child_names.map((childName, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-sm font-medium border border-blue-200 dark:border-blue-700"
                      >
                        {childName}
                      </span>
                    ))}
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 dark:bg-blue-600 text-white text-xs font-bold">
                      {booking.child_names.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Appointment Time */}
              <div className="flex items-start gap-3">
                <div className="mt-1 text-slate-600 dark:text-slate-400">
                  <CalendarIcon />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Date & Time</p>
                  <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
                    {formatAppointmentTime(booking.appointment_time)}
                  </p>
                </div>
              </div>

              {/* Appointment Type */}
              <div className="flex items-start gap-3">
                <div className="mt-1 text-slate-600 dark:text-slate-400">
                  <ClipboardCheckIcon />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Service Type</p>
                  <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
                    {formatAppointmentType(booking.appointment_type)}
                  </p>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start gap-3">
                <div className="mt-1 text-slate-600 dark:text-slate-400">
                  <MapPinIcon />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Location</p>
                  <p className="text-base font-semibold text-slate-800 dark:text-slate-200">{booking.location}</p>
                </div>
              </div>

              {/* Confirmation Status */}
              {booking.confirmation_sent && (
                <div className="mt-4 pt-4 border-t border-emerald-200 dark:border-emerald-700">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <CheckmarkIcon />
                    <span className="text-sm font-medium">SMS confirmation sent</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Note */}
      {bookings.length > 1 && (
        <div className="mt-4 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Total: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{bookings.length}</span> appointment{bookings.length !== 1 ? 's' : ''} scheduled
          </p>
        </div>
      )}
    </div>
  );
}
