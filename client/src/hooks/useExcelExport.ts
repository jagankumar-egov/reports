import { useCallback } from 'react';
import { exportToExcel, ExportData } from '@/utils/excelExport';
import { DirectQueryResponse } from '@/types';

export interface UseExcelExportOptions {
  selectedIndex?: string;
  selectedColumns?: string[];
}

export interface UseExcelExportResult {
  exportToExcel: (result: DirectQueryResponse, customFilename?: string) => void;
  isExportDisabled: (result: DirectQueryResponse | null) => boolean;
}

/**
 * Reusable hook for Excel export functionality across all query interfaces
 */
export const useExcelExport = (options: UseExcelExportOptions = {}): UseExcelExportResult => {
  const { selectedIndex, selectedColumns } = options;

  /**
   * Format Elasticsearch response for table display
   */
  const formatResultsForTable = useCallback((hits: any[]): { columns: string[]; rows: any[] } => {
    if (!hits || hits.length === 0) {
      return { columns: [], rows: [] };
    }

    // Extract all possible columns from all hits
    const allColumns = new Set<string>();
    hits.forEach(hit => {
      const flattenedSource = flattenObject(hit._source || {});
      Object.keys(flattenedSource).forEach(key => allColumns.add(key));
      
      // Always include _id, _score if available
      if (hit._id !== undefined) allColumns.add('_id');
      if (hit._score !== undefined) allColumns.add('_score');
    });

    const columns = Array.from(allColumns).sort();
    
    // Convert hits to rows
    const rows = hits.map(hit => {
      const flattenedSource = flattenObject(hit._source || {});
      const row: any = { ...flattenedSource };
      
      if (hit._id !== undefined) row._id = hit._id;
      if (hit._score !== undefined) row._score = hit._score;
      
      return row;
    });

    return { columns, rows };
  }, []);

  /**
   * Flatten nested objects for table display
   */
  const flattenObject = (obj: any, prefix = ''): Record<string, any> => {
    const flattened: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (value === null || value === undefined) {
        flattened[newKey] = value;
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        // Recursively flatten nested objects
        Object.assign(flattened, flattenObject(value, newKey));
      } else if (Array.isArray(value)) {
        // Convert arrays to JSON strings
        flattened[newKey] = JSON.stringify(value);
      } else {
        flattened[newKey] = value;
      }
    }
    
    return flattened;
  };

  /**
   * Export Elasticsearch results to Excel
   */
  const handleExcelExport = useCallback((result: DirectQueryResponse, customFilename?: string) => {
    if (!result?.hits?.hits || result.hits.hits.length === 0) {
      console.warn('No data available for export');
      return;
    }

    // Format the results for table display
    const { columns, rows } = formatResultsForTable(result.hits.hits);

    if (columns.length === 0 || rows.length === 0) {
      console.warn('No valid data found for export');
      return;
    }

    // Filter columns if selectedColumns is provided
    let exportColumns = columns;
    let exportRows = rows;

    if (selectedColumns && selectedColumns.length > 0) {
      // Only include selected columns (exclude metadata columns from filtering)
      const metadataColumns = ['_id', '_score'];
      exportColumns = columns.filter(col => 
        selectedColumns.includes(col) || metadataColumns.includes(col)
      );
      
      // Filter row data to only include selected columns
      exportRows = rows.map(row => {
        const filteredRow: any = {};
        exportColumns.forEach(col => {
          filteredRow[col] = row[col];
        });
        return filteredRow;
      });
    }

    // Prepare export data
    const exportData: ExportData = {
      columns: exportColumns,
      rows: exportRows,
    };

    // Generate filename
    const baseFilename = customFilename || 'elasticsearch_query_results';
    const indexSuffix = selectedIndex ? `_${selectedIndex}` : '';
    const dateSuffix = new Date().toISOString().split('T')[0];
    const filename = `${baseFilename}${indexSuffix}_${dateSuffix}`;

    // Export to Excel
    exportToExcel(exportData, filename);
  }, [formatResultsForTable, selectedIndex, selectedColumns]);

  /**
   * Check if export should be disabled
   */
  const isExportDisabled = useCallback((result: DirectQueryResponse | null): boolean => {
    return !result?.hits?.hits || result.hits.hits.length === 0;
  }, []);

  return {
    exportToExcel: handleExcelExport,
    isExportDisabled,
  };
};

export default useExcelExport;