/**
 * Clinic Service
 * Manages clinic information, hours, services, and directions
 */

export interface ClinicHours {
  day: string;
  open: string;
  close: string;
  isOpen: boolean;
}

export interface ClinicLocation {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface DentalService {
  service_name: string;
  description: string;
  duration_minutes: number;
  covered_by_medicaid: boolean;
  typical_cost_without_insurance?: number;
}

export class ClinicService {
  private readonly CLINIC_INFO: ClinicLocation = {
    name: 'Jefferson Dental Clinics - Main Street',
    address: '123 Main Street',
    city: 'Austin',
    state: 'TX',
    zip: '78701',
    phone: '512-555-0100',
    coordinates: {
      lat: 30.2672,
      lng: -97.7431
    }
  };

  /**
   * Get clinic operating hours
   */
  async getClinicHours(args?: { date?: string }): Promise<{
    location: string;
    hours: ClinicHours[];
    special_notes?: string;
  }> {
    console.log('🕐 Getting clinic hours');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));

    const standardHours: ClinicHours[] = [
      {
        day: 'Monday',
        open: '8:00 AM',
        close: '5:00 PM',
        isOpen: true
      },
      {
        day: 'Tuesday',
        open: '8:00 AM',
        close: '5:00 PM',
        isOpen: true
      },
      {
        day: 'Wednesday',
        open: '8:00 AM',
        close: '7:00 PM',
        isOpen: true
      },
      {
        day: 'Thursday',
        open: '8:00 AM',
        close: '5:00 PM',
        isOpen: true
      },
      {
        day: 'Friday',
        open: '8:00 AM',
        close: '5:00 PM',
        isOpen: true
      },
      {
        day: 'Saturday',
        open: '9:00 AM',
        close: '1:00 PM',
        isOpen: true
      },
      {
        day: 'Sunday',
        open: 'Closed',
        close: 'Closed',
        isOpen: false
      }
    ];

    console.log('✅ Clinic hours retrieved');

    return {
      location: this.CLINIC_INFO.name,
      hours: standardHours,
      special_notes: 'We offer extended hours on Wednesdays until 7 PM for your convenience.'
    };
  }

  /**
   * Get directions to the clinic
   */
  async getDirections(args: {
    from_address?: string;
  }): Promise<{
    clinic_address: string;
    full_address: string;
    phone: string;
    directions_url: string;
    parking_info: string;
    public_transit?: string;
  }> {
    console.log('🗺️  Getting directions to clinic');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 250));

    const fullAddress = `${this.CLINIC_INFO.address}, ${this.CLINIC_INFO.city}, ${this.CLINIC_INFO.state} ${this.CLINIC_INFO.zip}`;
    const encodedAddress = encodeURIComponent(fullAddress);

    let directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;

    if (args.from_address) {
      const encodedFrom = encodeURIComponent(args.from_address);
      directionsUrl = `https://www.google.com/maps/dir/${encodedFrom}/${encodedAddress}`;
    }

    console.log('✅ Directions retrieved');

    return {
      clinic_address: this.CLINIC_INFO.address,
      full_address: fullAddress,
      phone: this.CLINIC_INFO.phone,
      directions_url: directionsUrl,
      parking_info: 'Free parking available in the lot behind our building. Street parking also available on Main Street.',
      public_transit: 'Bus routes 7, 20, and 801 stop within 2 blocks. MetroRail Red Line: Downtown Station (0.4 miles)'
    };
  }

  /**
   * Get list of available dental services
   */
  async getAvailableServices(): Promise<{
    services: DentalService[];
    medicaid_coverage_note: string;
  }> {
    console.log('🦷 Getting available dental services');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const services: DentalService[] = [
      {
        service_name: 'Comprehensive Dental Exam',
        description: 'Complete oral health evaluation including cavity check, gum health assessment, and oral cancer screening',
        duration_minutes: 45,
        covered_by_medicaid: true
      },
      {
        service_name: 'Dental Cleaning (Prophylaxis)',
        description: 'Professional teeth cleaning to remove plaque and tartar buildup',
        duration_minutes: 45,
        covered_by_medicaid: true
      },
      {
        service_name: 'Fluoride Treatment',
        description: 'Topical fluoride application to strengthen tooth enamel and prevent cavities',
        duration_minutes: 15,
        covered_by_medicaid: true
      },
      {
        service_name: 'Dental X-Rays',
        description: 'Digital radiographs to detect cavities, bone loss, and other dental issues',
        duration_minutes: 20,
        covered_by_medicaid: true
      },
      {
        service_name: 'Cavity Fillings',
        description: 'Treatment of tooth decay with composite (tooth-colored) fillings',
        duration_minutes: 60,
        covered_by_medicaid: true
      },
      {
        service_name: 'Tooth Extraction',
        description: 'Removal of severely damaged or decayed teeth',
        duration_minutes: 45,
        covered_by_medicaid: true,
        typical_cost_without_insurance: 150
      },
      {
        service_name: 'Dental Sealants',
        description: 'Protective coating applied to back teeth to prevent cavities',
        duration_minutes: 30,
        covered_by_medicaid: true
      },
      {
        service_name: 'Root Canal Therapy',
        description: 'Treatment of infected tooth pulp to save the tooth',
        duration_minutes: 90,
        covered_by_medicaid: true,
        typical_cost_without_insurance: 800
      },
      {
        service_name: 'Dental Crowns',
        description: 'Cap placed over damaged tooth to restore shape and function',
        duration_minutes: 90,
        covered_by_medicaid: true,
        typical_cost_without_insurance: 1000
      },
      {
        service_name: 'Emergency Dental Care',
        description: 'Same-day treatment for dental emergencies like severe pain or trauma',
        duration_minutes: 60,
        covered_by_medicaid: true
      }
    ];

    console.log(`✅ Retrieved ${services.length} dental services`);

    return {
      services: services,
      medicaid_coverage_note: 'All listed services are covered under Texas Medicaid (CHIP/STAR Kids) for eligible children. No copay required for preventive services.'
    };
  }

  /**
   * Get information about what to bring to appointment
   */
  async getAppointmentPreparation(): Promise<{
    required_documents: string[];
    recommended_items: string[];
    preparation_tips: string[];
  }> {
    console.log('📋 Getting appointment preparation info');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 150));

    console.log('✅ Appointment preparation info retrieved');

    return {
      required_documents: [
        "Child's Medicaid card (CHIP/STAR Kids)",
        "Parent/Guardian photo ID (driver's license or state ID)",
        'Proof of address (utility bill, lease agreement, or mail within last 30 days)'
      ],
      recommended_items: [
        'List of current medications child is taking',
        'Previous dental records (if transferring from another dentist)',
        "Child's favorite toy or comfort item",
        'Snack and water for after the appointment'
      ],
      preparation_tips: [
        'Arrive 10 minutes early to complete any necessary paperwork',
        'Brush your child\'s teeth before the appointment',
        'Talk positively about the dentist to help reduce anxiety',
        'For young children, read a book about visiting the dentist beforehand',
        'Let us know about any special needs or behavioral considerations'
      ]
    };
  }

  /**
   * Check if clinic is currently open
   */
  async isClinicOpen(args?: { datetime?: string }): Promise<{
    is_open: boolean;
    current_status: string;
    next_opening?: string;
    emergency_contact?: string;
  }> {
    console.log('🏥 Checking if clinic is currently open');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Use provided datetime or current time
    const checkTime = args?.datetime ? new Date(args.datetime) : new Date();
    const day = checkTime.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = checkTime.getHours();
    const minute = checkTime.getMinutes();
    const timeInMinutes = hour * 60 + minute;

    let isOpen = false;
    let currentStatus = '';
    let nextOpening = '';

    // Check if it's a weekday (Mon-Fri)
    if (day >= 1 && day <= 5) {
      // Monday-Thursday: 8 AM - 5 PM (Wednesday until 7 PM)
      const openTime = 8 * 60; // 8:00 AM
      const closeTime = (day === 3) ? 19 * 60 : 17 * 60; // 7 PM Wed, 5 PM others

      isOpen = timeInMinutes >= openTime && timeInMinutes < closeTime;
      currentStatus = isOpen ? 'Open now' : 'Closed';

      if (!isOpen && timeInMinutes < openTime) {
        nextOpening = 'Today at 8:00 AM';
      } else if (!isOpen) {
        nextOpening = day === 5 ? 'Saturday at 9:00 AM' : 'Tomorrow at 8:00 AM';
      }
    } else if (day === 6) {
      // Saturday: 9 AM - 1 PM
      const openTime = 9 * 60;
      const closeTime = 13 * 60;

      isOpen = timeInMinutes >= openTime && timeInMinutes < closeTime;
      currentStatus = isOpen ? 'Open now' : 'Closed';
      nextOpening = isOpen ? '' : 'Monday at 8:00 AM';
    } else {
      // Sunday: Closed
      currentStatus = 'Closed (Sunday)';
      nextOpening = 'Monday at 8:00 AM';
    }

    console.log(`✅ Clinic status: ${currentStatus}`);

    return {
      is_open: isOpen,
      current_status: currentStatus,
      next_opening: nextOpening || undefined,
      emergency_contact: 'For dental emergencies after hours, call 512-555-0911 or visit Dell Children\'s Medical Center ER'
    };
  }

  /**
   * Get frequently asked questions
   */
  async getFAQ(): Promise<Array<{ question: string; answer: string }>> {
    console.log('❓ Getting FAQ');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));

    const faqs = [
      {
        question: 'Do you accept Medicaid?',
        answer: 'Yes! We accept all Texas Medicaid programs including CHIP and STAR Kids. All preventive dental services are fully covered with no copay for eligible children.'
      },
      {
        question: 'What should I bring to my first appointment?',
        answer: "Please bring your child's Medicaid card, a photo ID for the parent/guardian, and proof of address (utility bill or lease agreement)."
      },
      {
        question: 'How long does a dental cleaning appointment take?',
        answer: 'A typical cleaning and exam appointment takes about 45 minutes to 1 hour. For multiple children, plan additional time.'
      },
      {
        question: 'Do you see children with special needs?',
        answer: 'Absolutely! Our team is experienced in working with children with special needs. Please let us know about any accommodations needed when scheduling.'
      },
      {
        question: 'What is your cancellation policy?',
        answer: 'We request 24 hours notice for cancellations or rescheduling. You can call us at 512-555-0100 to modify your appointment.'
      },
      {
        question: 'Do you offer emergency dental services?',
        answer: 'Yes! We reserve time slots each day for dental emergencies. Call us immediately if your child experiences severe tooth pain, trauma, or swelling.'
      },
      {
        question: 'Can siblings be seen on the same day?',
        answer: 'Yes! We can schedule back-to-back appointments for siblings to make it convenient for your family.'
      },
      {
        question: 'Is there parking available?',
        answer: 'Yes! We have a free parking lot behind our building, and street parking is also available on Main Street.'
      }
    ];

    console.log(`✅ Retrieved ${faqs.length} FAQs`);

    return faqs;
  }

  /**
   * Check insurance eligibility
   */
  async checkInsuranceEligibility(args: {
    medicaid_id: string;
    child_name: string;
    date_of_birth?: string;
  }): Promise<{
    eligible: boolean;
    coverage_type: string;
    plan_name: string;
    coverage_details: string[];
    copay_required: boolean;
    notes?: string;
  }> {
    console.log('🏥 Checking insurance eligibility:', args);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Simulated eligibility check - in production this would query an actual eligibility system
    return {
      eligible: true,
      coverage_type: 'Texas Medicaid (CHIP/STAR Kids)',
      plan_name: 'STAR Kids',
      coverage_details: [
        'Preventive care (exams, cleanings) - 100% covered',
        'Fillings and basic restorative care - 100% covered',
        'Emergency dental services - 100% covered',
        'Orthodontics (if medically necessary) - Prior authorization required'
      ],
      copay_required: false,
      notes: 'Eligibility verified. Patient is active and eligible for all covered dental services.'
    };
  }
}
