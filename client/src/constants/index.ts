// DHR Frontend Constants

export const APP_CONFIG = {
  name: 'DHR - Digit Health Reports',
  version: '1.0.0',
  phase: 'Phase 1: Query & Data Tables',
  description: 'Health data querying and reporting system',
};

export const API_CONFIG = {
  baseURL: '/api',
  timeout: 30000,
  retries: 3,
};

export const PAGINATION_CONFIG = {
  defaultPageSize: 50,
  pageSizeOptions: [25, 50, 100, 200],
  maxResults: 1000,
};

export const QUERY_CONFIG = {
  maxJQLLength: 5000,
  validationDelay: 500, // ms
  historyLimit: 50,
};

export const UI_CONFIG = {
  sidebarWidth: 240,
  appBarHeight: 64,
  notifications: {
    autoHideDuration: 5000,
    maxNotifications: 3,
  },
};

export const FIELD_TYPES = {
  STRING: ['text', 'keyword', 'string'],
  NUMBER: ['long', 'integer', 'short', 'byte', 'double', 'float', 'half_float', 'scaled_float', 'number'],
  DATE: ['date'],
  BOOLEAN: ['boolean'],
  OBJECT: ['object', 'nested'],
  GEO: ['geo_point', 'geo_shape'],
  IP: ['ip'],
  BINARY: ['binary'],
} as const;

export const JQL_EXAMPLES = [
  {
    name: 'Basic Project Query',
    jql: 'project = "PATIENTS"',
    description: 'Find all records from the patients project',
  },
  {
    name: 'Status Filter',
    jql: 'project = "PATIENTS" AND status = "active"',
    description: 'Find active patient records',
  },
  {
    name: 'Date Range Query',
    jql: 'project = "VISITS" AND created >= "2024-01-01" AND created <= "2024-12-31"',
    description: 'Find visits within a date range',
  },
  {
    name: 'Multiple Values',
    jql: 'project = "TREATMENTS" AND medication IN ("aspirin", "ibuprofen", "acetaminophen")',
    description: 'Find treatments with specific medications',
  },
  {
    name: 'Text Search',
    jql: 'project = "PATIENTS" AND diagnosis ~ "diabetes"',
    description: 'Find patients with diabetes in their diagnosis',
  },
];

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  VALIDATION_ERROR: 'Validation failed. Please check your input.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access to this resource is forbidden.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'Internal server error. Please contact support.',
  UNKNOWN_ERROR: 'An unexpected error occurred.',
} as const;

export const SUCCESS_MESSAGES = {
  QUERY_EXECUTED: 'Query executed successfully',
  DATA_LOADED: 'Data loaded successfully',
  EXPORT_STARTED: 'Export started successfully',
  SETTINGS_SAVED: 'Settings saved successfully',
} as const;