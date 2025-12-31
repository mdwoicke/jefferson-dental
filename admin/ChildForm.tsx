import React, { useState, useEffect } from 'react';
import type { Child } from '../database/db-interface';
import { validateRequired, validateAge, validateDateOfBirth, validateMedicaidId } from '../utils/validation';

interface ChildFormProps {
  child?: Omit<Child, 'id' | 'patient_id' | 'created_at'>;
  onSave: (child: Omit<Child, 'id' | 'patient_id' | 'created_at'>) => void;
  onCancel: () => void;
}

export const ChildForm: React.FC<ChildFormProps> = ({ child, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: child?.name || '',
    age: child?.age?.toString() || '',
    medicaid_id: child?.medicaid_id || '',
    date_of_birth: child?.date_of_birth || '',
    special_needs: child?.special_needs || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate name
    const nameResult = validateRequired(formData.name, 'Name');
    if (!nameResult.isValid) {
      newErrors.name = nameResult.error!;
    }

    // Validate age
    const ageResult = validateAge(formData.age);
    if (!ageResult.isValid) {
      newErrors.age = ageResult.error!;
    }

    // Validate Medicaid ID
    const medicaidResult = validateMedicaidId(formData.medicaid_id, true);
    if (!medicaidResult.isValid) {
      newErrors.medicaid_id = medicaidResult.error!;
    }

    // Validate date of birth (optional)
    if (formData.date_of_birth) {
      const dobResult = validateDateOfBirth(formData.date_of_birth);
      if (!dobResult.isValid) {
        newErrors.date_of_birth = dobResult.error!;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSave({
      name: formData.name.trim(),
      age: parseInt(formData.age, 10),
      medicaid_id: formData.medicaid_id.trim(),
      date_of_birth: formData.date_of_birth.trim() || undefined,
      special_needs: formData.special_needs.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-slate-900">
            {child ? 'Edit Child' : 'Add Child'}
          </h3>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Child's Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                errors.name ? 'border-red-500' : 'border-slate-200'
              }`}
              placeholder="e.g., Sarah Johnson"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          {/* Age and Date of Birth */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Age <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                max="150"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                className={`w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                  errors.age ? 'border-red-500' : 'border-slate-200'
                }`}
                placeholder="e.g., 8"
              />
              {errors.age && <p className="text-red-500 text-sm mt-1">{errors.age}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Date of Birth (Optional)
              </label>
              <input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                className={`w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                  errors.date_of_birth ? 'border-red-500' : 'border-slate-200'
                }`}
              />
              {errors.date_of_birth && <p className="text-red-500 text-sm mt-1">{errors.date_of_birth}</p>}
            </div>
          </div>

          {/* Medicaid ID */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Medicaid ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.medicaid_id}
              onChange={(e) => setFormData({ ...formData, medicaid_id: e.target.value })}
              className={`w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                errors.medicaid_id ? 'border-red-500' : 'border-slate-200'
              }`}
              placeholder="e.g., MCD-12345678"
            />
            {errors.medicaid_id && <p className="text-red-500 text-sm mt-1">{errors.medicaid_id}</p>}
          </div>

          {/* Special Needs */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Special Needs (Optional)
            </label>
            <textarea
              value={formData.special_needs}
              onChange={(e) => setFormData({ ...formData, special_needs: e.target.value })}
              className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              rows={3}
              placeholder="e.g., Requires wheelchair access"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              {child ? 'Update Child' : 'Add Child'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
