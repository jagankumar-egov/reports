import { format, parseISO, isValid } from 'date-fns';

/**
 * Format a value based on its type for display in the data table
 */
export const formatValue = (value: any, fieldType: string): string => {
  if (value === null || value === undefined) {
    return '';
  }

  switch (fieldType) {
    case 'date':
      return formatDate(value);
    
    case 'number':
    case 'long':
    case 'integer':
    case 'double':
    case 'float':
      return formatNumber(value);
    
    case 'boolean':
      return formatBoolean(value);
    
    case 'object':
    case 'nested':
      return formatObject(value);
    
    case 'string':
    case 'text':
    case 'keyword':
    default:
      return formatString(value);
  }
};

/**
 * Format date values
 */
export const formatDate = (value: any): string => {
  if (!value) return '';
  
  try {
    let date: Date;
    
    if (typeof value === 'string') {
      // Try to parse ISO string
      date = parseISO(value);
    } else if (typeof value === 'number') {
      // Assume timestamp
      date = new Date(value);
    } else if (value instanceof Date) {
      date = value;
    } else {
      return String(value);
    }
    
    if (!isValid(date)) {
      return String(value);
    }
    
    return format(date, 'MMM dd, yyyy HH:mm');
  } catch (error) {
    return String(value);
  }
};

/**
 * Format number values
 */
export const formatNumber = (value: any): string => {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  
  const num = Number(value);
  if (isNaN(num)) {
    return String(value);
  }
  
  // Format based on the number size
  if (Math.abs(num) >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (Math.abs(num) >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  } else if (num % 1 !== 0) {
    // Decimal number
    return num.toFixed(2);
  } else {
    // Integer
    return num.toLocaleString();
  }
};

/**
 * Format boolean values
 */
export const formatBoolean = (value: any): string => {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  // Handle string representations
  const stringValue = String(value).toLowerCase();
  if (stringValue === 'true' || stringValue === '1' || stringValue === 'yes') {
    return 'Yes';
  } else if (stringValue === 'false' || stringValue === '0' || stringValue === 'no') {
    return 'No';
  }
  
  return String(value);
};

/**
 * Format object/nested values
 */
export const formatObject = (value: any): string => {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (typeof value === 'object') {
    try {
      // Show a summary for objects
      if (Array.isArray(value)) {
        return `Array[${value.length}]`;
      } else {
        const keys = Object.keys(value);
        if (keys.length === 0) {
          return '{}';
        } else if (keys.length === 1) {
          return `{${keys[0]}: ${formatValue(value[keys[0]], 'string')}}`;
        } else {
          return `{${keys.length} fields}`;
        }
      }
    } catch (error) {
      return '[Object]';
    }
  }
  
  return String(value);
};

/**
 * Format string values
 */
export const formatString = (value: any): string => {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // Truncate very long strings
  if (stringValue.length > 100) {
    return stringValue.substring(0, 97) + '...';
  }
  
  return stringValue;
};

/**
 * Get the appropriate field type for data grid columns
 */
export const getFieldType = (elasticsearchType: string): 'string' | 'number' | 'date' | 'boolean' => {
  switch (elasticsearchType) {
    case 'long':
    case 'integer':
    case 'short':
    case 'byte':
    case 'double':
    case 'float':
    case 'half_float':
    case 'scaled_float':
    case 'number':
      return 'number';
    
    case 'date':
      return 'date';
    
    case 'boolean':
      return 'boolean';
    
    case 'text':
    case 'keyword':
    case 'string':
    case 'object':
    case 'nested':
    default:
      return 'string';
  }
};

/**
 * Format field name for display
 */
export const formatFieldName = (fieldName: string): string => {
  return fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Get a display-friendly type name
 */
export const getDisplayType = (elasticsearchType: string): string => {
  const typeMap: Record<string, string> = {
    'text': 'Text',
    'keyword': 'Keyword',
    'long': 'Number',
    'integer': 'Integer',
    'short': 'Short',
    'byte': 'Byte',
    'double': 'Decimal',
    'float': 'Float',
    'half_float': 'Half Float',
    'scaled_float': 'Scaled Float',
    'date': 'Date',
    'boolean': 'Boolean',
    'binary': 'Binary',
    'object': 'Object',
    'nested': 'Nested',
    'geo_point': 'Geo Point',
    'geo_shape': 'Geo Shape',
    'ip': 'IP Address',
  };
  
  return typeMap[elasticsearchType] || elasticsearchType;
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number = 50): string => {
  if (!text || text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength - 3) + '...';
};