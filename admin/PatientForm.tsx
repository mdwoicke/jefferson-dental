import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import { ChildForm } from './ChildForm';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/Toast';
import type { PatientRecord, Child } from '../database/db-interface';
import { validateRequired, validatePhoneNumber, validateZipCode } from '../utils/validation';
import { generateId } from '../utils/formatting';

interface ChildWithTempId extends Omit<Child, 'id' | 'patient_id' | 'created_at'> {
  tempId?: number;
}

export const PatientForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { crmService, isInitialized } = useDatabase();
  const { toasts, showToast, removeToast } = useToast();

  const isEditMode = !!id;

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    parentName: '',
    phoneNumber: '',
    street: '',
    city: '',
    state: 'TX',
    zip: '',
    preferredLanguage: 'English',
    lastVisit: '',
    notes: '',
  });

  const [children, setChildren] = useState<ChildWithTempId[]>([]);
  const [editingChild, setEditingChild] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load patient data in edit mode
  useEffect(() => {
    if (!isEditMode || !isInitialized || !crmService) return;

    const loadPatient = async () => {
      try {
        setLoading(true);
        const patient = await crmService.getPatientById(id!);

        if (!patient) {
          showToast('Patient not found', 'error');
          navigate('/admin/patients');
          return;
        }

        setFormData({
          parentName: patient.parentName,
          phoneNumber: patient.phoneNumber,
          street: patient.address.street,
          city: patient.address.city,
          state: patient.address.state,
          zip: patient.address.zip,
          preferredLanguage: patient.preferredLanguage || 'English',
          lastVisit: patient.lastVisit || '',
          notes: patient.notes || '',
        });

        setChildren(
          patient.children.map((child) => ({
            name: child.name,
            age: child.age,
            medicaid_id: child.medicaid_id,
            date_of_birth: child.date_of_birth,
            special_needs: child.special_needs,
            tempId: child.id,
          }))
        );
      } catch (error) {
        console.error('Failed to load patient:', error);
        showToast('Failed to load patient data', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadPatient();
  }, [id, isEditMode, isInitialized, crmService]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate parent name
    const nameResult = validateRequired(formData.parentName, 'Parent name');
    if (!nameResult.isValid) {
      newErrors.parentName = nameResult.error!;
    }

    // Validate phone number
    const phoneResult = validatePhoneNumber(formData.phoneNumber);
    if (!phoneResult.isValid) {
      newErrors.phoneNumber = phoneResult.error!;
    }

    // Validate address
    const streetResult = validateRequired(formData.street, 'Street address');
    if (!streetResult.isValid) {
      newErrors.street = streetResult.error!;
    }

    const cityResult = validateRequired(formData.city, 'City');
    if (!cityResult.isValid) {
      newErrors.city = cityResult.error!;
    }

    const stateResult = validateRequired(formData.state, 'State');
    if (!stateResult.isValid) {
      newErrors.state = stateResult.error!;
    }

    const zipResult = validateZipCode(formData.zip);
    if (!zipResult.isValid) {
      newErrors.zip = zipResult.error!;
    }

    // Validate at least one child
    if (children.length === 0) {
      newErrors.children = 'At least one child is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('Please fix the errors in the form', 'error');
      return;
    }

    if (!crmService) {
      showToast('CRM service not ready', 'error');
      return;
    }

    try {
      setSaving(true);

      const patientData = {
        parentName: formData.parentName.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        address: {
          street: formData.street.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          zip: formData.zip.trim(),
        },
        preferredLanguage: formData.preferredLanguage.trim() || undefined,
        lastVisit: formData.lastVisit.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        children: children.map(child => ({
          name: child.name,
          age: child.age,
          medicaid_id: child.medicaid_id,
          date_of_birth: child.date_of_birth,
          special_needs: child.special_needs,
        })),
      };

      if (isEditMode) {
        // Update existing patient (includes children)
        await crmService.updatePatient(id!, patientData);
        showToast('Patient updated successfully', 'success');
      } else {
        // Create new patient (includes children)
        await crmService.createPatient(patientData);
        showToast('Patient created successfully', 'success');
      }

      // Navigate back to patient list
      setTimeout(() => {
        navigate('/admin/patients');
      }, 1000);
    } catch (error) {
      console.error('Failed to save patient:', error);
      showToast('Failed to save patient', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addChild = (child: Omit<Child, 'id' | 'patient_id' | 'created_at'>) => {
    setChildren([...children, { ...child, tempId: Date.now() }]);
    setEditingChild(null);
  };

  const updateChild = (tempId: number, updates: Omit<Child, 'id' | 'patient_id' | 'created_at'>) => {
    setChildren(children.map((c) => (c.tempId === tempId ? { ...updates, tempId } : c)));
    setEditingChild(null);
  };

  const removeChild = (tempId: number) => {
    setChildren(children.filter((c) => c.tempId !== tempId));
  };

  if (!isInitialized || loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">{loading ? 'Loading patient...' : 'Initializing...'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            to="/admin/patients"
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              {isEditMode ? 'Edit Patient' : 'Add New Patient'}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {isEditMode ? 'Update patient information' : 'Create a new patient record'}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Parent Information */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Parent/Guardian Information</h2>

            <div className="space-y-4">
              {/* Parent Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Parent/Guardian Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.parentName}
                  onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                  className={`w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 ${
                    errors.parentName ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'
                  }`}
                  placeholder="e.g., Maria Garcia"
                />
                {errors.parentName && <p className="text-red-500 text-sm mt-1">{errors.parentName}</p>}
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className={`w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 ${
                    errors.phoneNumber ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'
                  }`}
                  placeholder="e.g., (512) 555-0100"
                />
                {errors.phoneNumber && <p className="text-red-500 text-sm mt-1">{errors.phoneNumber}</p>}
              </div>

              {/* Preferred Language */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Preferred Language
                </label>
                <select
                  value={formData.preferredLanguage}
                  onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="Vietnamese">Vietnamese</option>
                  <option value="Chinese">Chinese</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Address</h2>

            <div className="space-y-4">
              {/* Street */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  className={`w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 ${
                    errors.street ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'
                  }`}
                  placeholder="e.g., 456 Oak Street"
                />
                {errors.street && <p className="text-red-500 text-sm mt-1">{errors.street}</p>}
              </div>

              {/* City, State, ZIP */}
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className={`w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 ${
                      errors.city ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'
                    }`}
                    placeholder="e.g., Austin"
                  />
                  {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    State <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className={`w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white dark:bg-slate-700 text-slate-900 dark:text-white ${
                      errors.state ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    <option value="TX">Texas</option>
                    <option value="CA">California</option>
                    <option value="NY">New York</option>
                    <option value="FL">Florida</option>
                  </select>
                  {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    ZIP Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.zip}
                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                    className={`w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 ${
                      errors.zip ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'
                    }`}
                    placeholder="e.g., 78704"
                  />
                  {errors.zip && <p className="text-red-500 text-sm mt-1">{errors.zip}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Children */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Children</h2>
                {errors.children && <p className="text-red-500 text-sm mt-1">{errors.children}</p>}
              </div>
              <button
                type="button"
                onClick={() => setEditingChild(-1)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Child
              </button>
            </div>

            {children.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 dark:bg-slate-700/30 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-600">
                <p className="text-slate-600 dark:text-slate-400">No children added yet</p>
                <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">Click "Add Child" to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {children.map((child) => (
                  <div
                    key={child.tempId}
                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-200 dark:border-slate-600"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900 dark:text-white">{child.name}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        Age {child.age} • Medicaid ID: {child.medicaid_id}
                      </div>
                      {child.date_of_birth && (
                        <div className="text-sm text-slate-500 dark:text-slate-500">DOB: {child.date_of_birth}</div>
                      )}
                      {child.special_needs && (
                        <div className="text-sm text-purple-700 dark:text-purple-400 mt-1">
                          Special needs: {child.special_needs}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingChild(child.tempId!)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="Edit child"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeChild(child.tempId!)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Remove child"
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
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Additional Information */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Additional Information</h2>

            <div className="space-y-4">
              {/* Last Visit */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Last Visit Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.lastVisit}
                  onChange={(e) => setFormData({ ...formData, lastVisit: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400"
                  rows={4}
                  placeholder="Any additional information about this family..."
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 justify-end">
            <Link
              to="/admin/patients"
              className="px-6 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>{isEditMode ? 'Update Patient' : 'Create Patient'}</>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Child Form Modal */}
      {editingChild !== null && (
        <ChildForm
          child={editingChild === -1 ? undefined : children.find((c) => c.tempId === editingChild)}
          onSave={editingChild === -1 ? addChild : (data) => updateChild(editingChild, data)}
          onCancel={() => setEditingChild(null)}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </>
  );
};
