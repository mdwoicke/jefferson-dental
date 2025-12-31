import React from 'react';
import { useWizardContext } from '../DemoWizard';

export const BusinessProfileStep: React.FC = () => {
  const { config, updateBusinessProfile, validationErrors } = useWizardContext();
  const profile = config.businessProfile;

  const handleChange = (field: string, value: string) => {
    if (field.startsWith('address.')) {
      const addressField = field.replace('address.', '');
      updateBusinessProfile({
        address: {
          ...profile?.address,
          [addressField]: value
        }
      } as any);
    } else {
      updateBusinessProfile({ [field]: value } as any);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Business Profile
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Enter your organization's information. This will be used in the demo UI and AI prompts.
        </p>
      </div>

      {/* Organization Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Organization Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={profile?.organizationName || ''}
          onChange={(e) => handleChange('organizationName', e.target.value)}
          placeholder="e.g., Jefferson Dental Clinics"
          className={`w-full px-4 py-2 border rounded-lg
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     placeholder-gray-400 dark:placeholder-gray-500
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     ${validationErrors.organizationName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
        />
        {validationErrors.organizationName && (
          <p className="mt-1 text-sm text-red-500">{validationErrors.organizationName[0]}</p>
        )}
      </div>

      {/* Phone Number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Phone Number <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          value={profile?.phoneNumber || ''}
          onChange={(e) => handleChange('phoneNumber', e.target.value)}
          placeholder="e.g., 512-555-0100"
          className={`w-full px-4 py-2 border rounded-lg
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     placeholder-gray-400 dark:placeholder-gray-500
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     ${validationErrors.phoneNumber ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
        />
        {validationErrors.phoneNumber && (
          <p className="mt-1 text-sm text-red-500">{validationErrors.phoneNumber[0]}</p>
        )}
      </div>

      {/* Address */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Business Address
        </h3>

        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
            Street Address
          </label>
          <input
            type="text"
            value={profile?.address?.street || ''}
            onChange={(e) => handleChange('address.street', e.target.value)}
            placeholder="e.g., 123 Main Street"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       placeholder-gray-400 dark:placeholder-gray-500
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="col-span-2">
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              City
            </label>
            <input
              type="text"
              value={profile?.address?.city || ''}
              onChange={(e) => handleChange('address.city', e.target.value)}
              placeholder="e.g., Austin"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         placeholder-gray-400 dark:placeholder-gray-500
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              State
            </label>
            <input
              type="text"
              value={profile?.address?.state || ''}
              onChange={(e) => handleChange('address.state', e.target.value)}
              placeholder="e.g., TX"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         placeholder-gray-400 dark:placeholder-gray-500
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              ZIP Code
            </label>
            <input
              type="text"
              value={profile?.address?.zip || ''}
              onChange={(e) => handleChange('address.zip', e.target.value)}
              placeholder="e.g., 78701"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         placeholder-gray-400 dark:placeholder-gray-500
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Branding Colors */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Brand Colors
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              Primary Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={profile?.primaryColor || '#3B82F6'}
                onChange={(e) => handleChange('primaryColor', e.target.value)}
                className="w-12 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
              />
              <input
                type="text"
                value={profile?.primaryColor || '#3B82F6'}
                onChange={(e) => handleChange('primaryColor', e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           font-mono text-sm
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              Secondary Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={profile?.secondaryColor || '#6366F1'}
                onChange={(e) => handleChange('secondaryColor', e.target.value)}
                className="w-12 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
              />
              <input
                type="text"
                value={profile?.secondaryColor || '#6366F1'}
                onChange={(e) => handleChange('secondaryColor', e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           font-mono text-sm
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Logo URL (optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Logo URL (optional)
        </label>
        <input
          type="url"
          value={profile?.logoUrl || ''}
          onChange={(e) => handleChange('logoUrl', e.target.value)}
          placeholder="https://example.com/logo.png"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     placeholder-gray-400 dark:placeholder-gray-500
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Provide a URL to your organization's logo for branding
        </p>
      </div>
    </div>
  );
};

export default BusinessProfileStep;
