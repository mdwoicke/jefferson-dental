/**
 * Data Export Button Component
 * Reusable button for exporting table data to CSV or JSON
 */

import React from 'react';

interface DataExportButtonProps {
  data: any[];
  filename: string;
  format?: 'csv' | 'json';
  className?: string;
}

export const DataExportButton: React.FC<DataExportButtonProps> = ({
  data,
  filename,
  format = 'csv',
  className = ''
}) => {
  const exportToCSV = () => {
    if (data.length === 0) {
      alert('No data to export');
      return;
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header];
          // Handle nested objects and arrays
          const stringValue = typeof value === 'object'
            ? JSON.stringify(value).replace(/"/g, '""')
            : String(value).replace(/"/g, '""');
          return `"${stringValue}"`;
        }).join(',')
      )
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log(`✅ Exported ${data.length} rows to ${filename}.csv`);
  };

  const exportToJSON = () => {
    if (data.length === 0) {
      alert('No data to export');
      return;
    }

    // Create JSON content with pretty formatting
    const jsonContent = JSON.stringify(data, null, 2);

    // Create blob and download
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log(`✅ Exported ${data.length} items to ${filename}.json`);
  };

  const handleExport = () => {
    if (format === 'csv') {
      exportToCSV();
    } else {
      exportToJSON();
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={data.length === 0}
      className={`
        px-4 py-2 rounded-lg font-medium
        transition-all duration-200
        ${data.length === 0
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
        }
        ${className}
      `}
      title={`Export to ${format.toUpperCase()}`}
    >
      <span className="flex items-center gap-2">
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        Export {format.toUpperCase()}
      </span>
    </button>
  );
};

export default DataExportButton;
