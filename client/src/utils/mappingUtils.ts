export interface FieldInfo {
  name: string;
  type: string;
  fullPath: string;
  isAnalyzed: boolean;
  isKeyword: boolean;
  isNumeric: boolean;
  isDate: boolean;
  isBoolean: boolean;
  hasKeywordVariant: boolean;
}

/**
 * Extract field information from Elasticsearch mapping
 */
export function extractFieldsFromMapping(mapping: any): FieldInfo[] {
  const fields: FieldInfo[] = [];
  
  function traverseMapping(properties: any, path = '') {
    if (!properties) return;
    
    Object.entries(properties).forEach(([fieldName, fieldDef]: [string, any]) => {
      const fullPath = path ? `${path}.${fieldName}` : fieldName;
      
      if (fieldDef.type) {
        // This is a field with a type
        const fieldInfo: FieldInfo = {
          name: fieldName,
          type: fieldDef.type,
          fullPath,
          isAnalyzed: fieldDef.type === 'text' && !fieldDef.index === false,
          isKeyword: fieldDef.type === 'keyword',
          isNumeric: ['integer', 'long', 'short', 'byte', 'double', 'float', 'half_float', 'scaled_float'].includes(fieldDef.type),
          isDate: fieldDef.type === 'date',
          isBoolean: fieldDef.type === 'boolean',
          hasKeywordVariant: false,
        };
        
        // Check if text field has keyword variant
        if (fieldDef.fields && fieldDef.fields.keyword) {
          fieldInfo.hasKeywordVariant = true;
          // Also add the keyword variant as a separate field
          fields.push({
            name: `${fieldName}.keyword`,
            type: 'keyword',
            fullPath: `${fullPath}.keyword`,
            isAnalyzed: false,
            isKeyword: true,
            isNumeric: false,
            isDate: false,
            isBoolean: false,
            hasKeywordVariant: false,
          });
        }
        
        fields.push(fieldInfo);
        
        // Also traverse any additional field variants
        if (fieldDef.fields) {
          Object.entries(fieldDef.fields).forEach(([variantName, variantDef]: [string, any]) => {
            if (variantName !== 'keyword' && (variantDef as any).type) {
              fields.push({
                name: `${fieldName}.${variantName}`,
                type: (variantDef as any).type,
                fullPath: `${fullPath}.${variantName}`,
                isAnalyzed: (variantDef as any).type === 'text',
                isKeyword: (variantDef as any).type === 'keyword',
                isNumeric: ['integer', 'long', 'short', 'byte', 'double', 'float', 'half_float', 'scaled_float'].includes((variantDef as any).type),
                isDate: (variantDef as any).type === 'date',
                isBoolean: (variantDef as any).type === 'boolean',
                hasKeywordVariant: false,
              });
            }
          });
        }
      }
      
      // Recursively traverse nested objects
      if (fieldDef.properties) {
        traverseMapping(fieldDef.properties, fullPath);
      }
    });
  }
  
  // Handle different mapping structures
  if (mapping.mappings) {
    // Modern ES structure
    if (mapping.mappings.properties) {
      traverseMapping(mapping.mappings.properties);
    } else {
      // Handle case where mappings might have type names (older ES versions)
      Object.values(mapping.mappings).forEach((typeMapping: any) => {
        if (typeMapping.properties) {
          traverseMapping(typeMapping.properties);
        }
      });
    }
  } else if (mapping.properties) {
    // Direct properties
    traverseMapping(mapping.properties);
  }
  
  // Sort fields by full path for better organization
  return fields.sort((a, b) => a.fullPath.localeCompare(b.fullPath));
}

/**
 * Get suggested operators for a field based on its type
 */
export function getSuggestedOperators(field: FieldInfo): Array<{ value: string; label: string; description: string }> {
  const operators = [];
  
  if (field.isKeyword || field.hasKeywordVariant) {
    operators.push(
      { value: 'term', label: 'Equals', description: 'Exact match' },
      { value: 'terms', label: 'In', description: 'Match any of the provided values' },
      { value: 'prefix', label: 'Starts with', description: 'Prefix match' },
      { value: 'wildcard', label: 'Wildcard', description: 'Pattern matching with * and ?' },
      { value: 'regexp', label: 'Regex', description: 'Regular expression match' }
    );
  }
  
  if (field.isAnalyzed || field.type === 'text') {
    operators.push(
      { value: 'match', label: 'Match', description: 'Text search with analysis' },
      { value: 'match_phrase', label: 'Match Phrase', description: 'Exact phrase match' },
      { value: 'match_phrase_prefix', label: 'Match Phrase Prefix', description: 'Phrase prefix match' },
      { value: 'multi_match', label: 'Multi Match', description: 'Search across multiple fields' }
    );
  }
  
  if (field.isNumeric || field.isDate) {
    operators.push(
      { value: 'term', label: 'Equals', description: 'Exact match' },
      { value: 'range', label: 'Range', description: 'Between values' },
      { value: 'gt', label: 'Greater than', description: '>' },
      { value: 'gte', label: 'Greater or equal', description: '>=' },
      { value: 'lt', label: 'Less than', description: '<' },
      { value: 'lte', label: 'Less or equal', description: '<=' }
    );
  }
  
  if (field.isBoolean) {
    operators.push(
      { value: 'term', label: 'Equals', description: 'Exact match' }
    );
  }
  
  // Common operators for all fields
  operators.push(
    { value: 'exists', label: 'Exists', description: 'Field has a value' },
    { value: 'missing', label: 'Missing', description: 'Field is missing or null' }
  );
  
  // Remove duplicates and return
  const uniqueOperators = operators.filter((op, index, self) => 
    index === self.findIndex(o => o.value === op.value)
  );
  
  return uniqueOperators;
}

/**
 * Generate Elasticsearch query clause from field, operator, and value
 */
export function generateQueryClause(field: FieldInfo, operator: string, value: string | string[]): any {
  const fieldName = field.isKeyword || field.hasKeywordVariant ? 
    (field.fullPath.endsWith('.keyword') ? field.fullPath : `${field.fullPath}.keyword`) : 
    field.fullPath;
  
  switch (operator) {
    case 'term':
      return { term: { [fieldName]: value } };
      
    case 'terms':
      const values = Array.isArray(value) ? value : value.toString().split(',').map(v => v.trim());
      return { terms: { [fieldName]: values } };
      
    case 'match':
      return { match: { [field.fullPath]: value } };
      
    case 'match_phrase':
      return { match_phrase: { [field.fullPath]: value } };
      
    case 'match_phrase_prefix':
      return { match_phrase_prefix: { [field.fullPath]: value } };
      
    case 'prefix':
      return { prefix: { [fieldName]: value } };
      
    case 'wildcard':
      return { wildcard: { [fieldName]: value } };
      
    case 'regexp':
      return { regexp: { [fieldName]: value } };
      
    case 'range':
      if (typeof value === 'string' && value.includes(' TO ')) {
        const [from, to] = value.split(' TO ').map(v => v.trim());
        return { range: { [field.fullPath]: { gte: from, lte: to } } };
      }
      return { range: { [field.fullPath]: { gte: value, lte: value } } };
      
    case 'gt':
      return { range: { [field.fullPath]: { gt: value } } };
      
    case 'gte':
      return { range: { [field.fullPath]: { gte: value } } };
      
    case 'lt':
      return { range: { [field.fullPath]: { lt: value } } };
      
    case 'lte':
      return { range: { [field.fullPath]: { lte: value } } };
      
    case 'exists':
      return { exists: { field: field.fullPath } };
      
    case 'missing':
      return { bool: { must_not: { exists: { field: field.fullPath } } } };
      
    default:
      return { term: { [fieldName]: value } };
  }
}