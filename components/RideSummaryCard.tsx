/**
 * RideSummaryCard Component
 * Displays stylish ride summary cards after successful bookings
 */

import React from 'react';
import { RideBookingResult, formatRideDateTime, formatAssistanceType } from '../utils/ride-utils';

interface RideSummaryCardProps {
  rides: RideBookingResult[];
  memberName?: string;
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

const CarIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-8 5h8m-4 5v-3m-6 3h12a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-1.923-.641a1 1 0 01-.684-.949V8a1 1 0 00-1-1H9.709a1 1 0 00-1 1v1.18a1 1 0 01-.684.95L6.102 10.77a1 1 0 00-.684.949V15a2 2 0 002 2z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const WheelchairIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

export function RideSummaryCard({ rides, memberName }: RideSummaryCardProps) {
  // Don't render if no rides
  if (!rides || rides.length === 0) {
    return null;
  }

  return (
    <div className="w-full animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <CarIcon />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Rides Scheduled</h2>
      </div>

      {/* Rides Grid */}
      <div className="space-y-4">
        {rides.map((ride) => (
          <div
            key={ride.confirmation_number}
            className="bg-gradient-to-br from-blue-50 to-white dark:from-slate-800 dark:to-slate-900 border-2 border-blue-200 dark:border-blue-500/30 shadow-lg shadow-blue-500/10 dark:shadow-blue-500/10 rounded-xl p-6 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/20 dark:hover:shadow-blue-500/30 transition-all duration-300"
          >
            {/* Status Badge */}
            <div className="flex items-center justify-between mb-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold text-xs border border-blue-300 dark:border-blue-700">
                <CheckmarkIcon />
                <span>CONFIRMED</span>
              </div>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {ride.confirmation_number}
              </span>
            </div>

            {/* Main Content Grid */}
            <div className="space-y-4">
              {/* Member Name */}
              {memberName && (
                <div className="flex items-start gap-3">
                  <div className="mt-1 text-slate-600 dark:text-slate-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Member</p>
                    <p className="text-base font-semibold text-slate-800 dark:text-slate-200">{memberName}</p>
                  </div>
                </div>
              )}

              {/* Pickup Time */}
              <div className="flex items-start gap-3">
                <div className="mt-1 text-slate-600 dark:text-slate-400">
                  <CalendarIcon />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Pickup Time</p>
                  <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
                    {formatRideDateTime(ride.pickup.date, ride.pickup.time)}
                  </p>
                </div>
              </div>

              {/* Route: Pickup → Dropoff */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-3">
                {/* Pickup */}
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">Pickup</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{ride.pickup.address}</p>
                  </div>
                </div>

                {/* Arrow connector */}
                <div className="flex items-center gap-3 pl-2">
                  <div className="w-0.5 h-4 bg-slate-300 dark:bg-slate-600 ml-[10px]"></div>
                </div>

                {/* Dropoff */}
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
                    <MapPinIcon />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">Dropoff</p>
                    {ride.dropoff.facility && (
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{ride.dropoff.facility}</p>
                    )}
                    <p className="text-sm text-slate-600 dark:text-slate-400">{ride.dropoff.address}</p>
                  </div>
                </div>
              </div>

              {/* Appointment Time */}
              <div className="flex items-start gap-3">
                <div className="mt-1 text-slate-600 dark:text-slate-400">
                  <ClockIcon />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Appointment Time</p>
                  <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
                    {ride.appointment_time}
                  </p>
                </div>
              </div>

              {/* Assistance Type */}
              <div className="flex items-start gap-3">
                <div className="mt-1 text-slate-600 dark:text-slate-400">
                  <WheelchairIcon />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Assistance Type</p>
                  <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
                    {formatAssistanceType(ride.assistance_type)}
                  </p>
                </div>
              </div>

              {/* Return Trip */}
              {ride.return_trip && (
                <div className="flex items-start gap-3">
                  <div className="mt-1 text-slate-600 dark:text-slate-400">
                    <RefreshIcon />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Return Trip</p>
                    <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
                      {ride.return_trip}
                    </p>
                  </div>
                </div>
              )}

              {/* Remaining Rides */}
              <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <CheckmarkIcon />
                    <span className="text-sm font-medium">Ride confirmed</span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {ride.remaining_rides} rides remaining
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Note */}
      {rides.length > 1 && (
        <div className="mt-4 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Total: <span className="font-semibold text-blue-600 dark:text-blue-400">{rides.length}</span> ride{rides.length !== 1 ? 's' : ''} scheduled
          </p>
        </div>
      )}
    </div>
  );
}
