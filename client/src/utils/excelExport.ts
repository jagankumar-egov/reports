/**
 * Utility functions for exporting data to Excel format
 * Uses browser APIs to create and download Excel files without external dependencies
 */

export interface ExportData {
  columns: string[];
  rows: Record<string, any>[];
}

/**
 * Convert table data to CSV format and download as Excel-compatible file
 */
export const exportToExcel = (data: ExportData, filename: string = 'export') => {
  const { columns, rows } = data;
  
  // Create CSV content
  const csvContent = createCSVContent(columns, rows);
  
  // Create and trigger download
  downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
};

/**
 * Create CSV content from table data
 */
const createCSVContent = (columns: string[], rows: Record<string, any>[]): string => {
  // Create header row
  const headerRow = columns.map(col => escapeCSVValue(col)).join(',');
  
  // Create data rows
  const dataRows = rows.map(row => 
    columns.map(col => {
      const value = row[col];
      let cellValue = '';
      
      if (value === undefined || value === null) {
        cellValue = '';
      } else if (typeof value === 'object') {
        cellValue = JSON.stringify(value);
      } else {
        cellValue = String(value);
      }
      
      return escapeCSVValue(cellValue);
    }).join(',')
  );
  
  return [headerRow, ...dataRows].join('\n');
};

/**
 * Escape CSV values to handle commas, quotes, and newlines
 */
const escapeCSVValue = (value: string): string => {
  // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

/**
 * Create and trigger file download
 */
const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob(['\uFEFF' + content], { type: mimeType }); // Add BOM for UTF-8
  const url = window.URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  window.URL.revokeObjectURL(url);
};

/**
 * Session storage utilities for column preferences
 */
export const COLUMN_PREFERENCES_KEY = 'directQuery_columnPreferences';

export interface ColumnPreferences {
  [indexName: string]: {
    selectedColumns: string[];
    lastUpdated: string;
  };
}

/**
 * Save column preferences to session storage
 */
export const saveColumnPreferences = (indexName: string, selectedColumns: string[]) => {
  try {
    const preferences = getColumnPreferences();
    preferences[indexName] = {
      selectedColumns: [...selectedColumns],
      lastUpdated: new Date().toISOString(),
    };
    sessionStorage.setItem(COLUMN_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.warn('Failed to save column preferences:', error);
  }
};

/**
 * Get column preferences from session storage
 */
export const getColumnPreferences = (): ColumnPreferences => {
  try {
    const stored = sessionStorage.getItem(COLUMN_PREFERENCES_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn('Failed to load column preferences:', error);
    return {};
  }
};

/**
 * Get selected columns for a specific index
 */
export const getSelectedColumnsForIndex = (indexName: string): string[] | null => {
  const preferences = getColumnPreferences();
  return preferences[indexName]?.selectedColumns || null;
};

/**
 * Clear column preferences for a specific index
 */
export const clearColumnPreferencesForIndex = (indexName: string) => {
  try {
    const preferences = getColumnPreferences();
    delete preferences[indexName];
    sessionStorage.setItem(COLUMN_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.warn('Failed to clear column preferences:', error);
  }
};