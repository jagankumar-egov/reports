import queryGuidelinesConfig from '../../configs/queryGuidelines.json';

describe('QueryGuidelines Configuration', () => {
  it('should have valid structure', () => {
    expect(queryGuidelinesConfig).toHaveProperty('title');
    expect(queryGuidelinesConfig).toHaveProperty('categories');
    expect(queryGuidelinesConfig).toHaveProperty('tips');
    
    expect(typeof queryGuidelinesConfig.title).toBe('string');
    expect(Array.isArray(queryGuidelinesConfig.categories)).toBe(true);
    expect(typeof queryGuidelinesConfig.tips).toBe('string');
  });

  it('should have non-empty title and tips', () => {
    expect(queryGuidelinesConfig.title.length).toBeGreaterThan(0);
    expect(queryGuidelinesConfig.tips.length).toBeGreaterThan(0);
  });

  it('should have valid categories structure', () => {
    expect(queryGuidelinesConfig.categories.length).toBeGreaterThan(0);
    
    queryGuidelinesConfig.categories.forEach((category) => {
      expect(category).toHaveProperty('label');
      expect(category).toHaveProperty('examples');
      
      expect(typeof category.label).toBe('string');
      expect(category.label.length).toBeGreaterThan(0);
      expect(Array.isArray(category.examples)).toBe(true);
      
      // Each category should have at least one example
      expect(category.examples.length).toBeGreaterThan(0);
    });
  });

  it('should have valid examples structure', () => {
    queryGuidelinesConfig.categories.forEach((category) => {
      category.examples.forEach((example) => {
        expect(example).toHaveProperty('title');
        expect(example).toHaveProperty('code');
        
        expect(typeof example.title).toBe('string');
        expect(typeof example.code).toBe('string');
        expect(example.title.length).toBeGreaterThan(0);
        expect(example.code.length).toBeGreaterThan(0);
      });
    });
  });

  it('should have valid JSON code in examples', () => {
    queryGuidelinesConfig.categories.forEach((category) => {
      category.examples.forEach((example) => {
        // Test that the code can be parsed as valid JSON
        expect(() => JSON.parse(example.code)).not.toThrow();
        
        // Test that parsed JSON has basic Elasticsearch query structure
        const parsed = JSON.parse(example.code);
        
        // Should have either query, aggs, or size property (basic ES query components)
        const hasValidStructure = 
          parsed.hasOwnProperty('query') || 
          parsed.hasOwnProperty('aggs') || 
          parsed.hasOwnProperty('size');
        
        expect(hasValidStructure).toBe(true);
      });
    });
  });

  it('should have expected categories', () => {
    const categoryLabels = queryGuidelinesConfig.categories.map(cat => cat.label);
    
    // Check for expected standard categories
    expect(categoryLabels).toContain('Basic Queries');
    expect(categoryLabels).toContain('Filters');
    expect(categoryLabels).toContain('Aggregations');
    expect(categoryLabels).toContain('Advanced');
  });

  it('should have proper Elasticsearch query examples', () => {
    // Test specific examples exist
    const basicCategory = queryGuidelinesConfig.categories.find(cat => cat.label === 'Basic Queries');
    expect(basicCategory).toBeDefined();
    
    if (basicCategory) {
      const matchAllExample = basicCategory.examples.find(ex => ex.title.includes('Match All'));
      expect(matchAllExample).toBeDefined();
      
      if (matchAllExample) {
        const parsed = JSON.parse(matchAllExample.code);
        expect(parsed.query.match_all).toBeDefined();
      }
    }
    
    // Test aggregations category
    const aggsCategory = queryGuidelinesConfig.categories.find(cat => cat.label === 'Aggregations');
    expect(aggsCategory).toBeDefined();
    
    if (aggsCategory) {
      const termsAggExample = aggsCategory.examples.find(ex => ex.title.includes('Terms'));
      expect(termsAggExample).toBeDefined();
      
      if (termsAggExample) {
        const parsed = JSON.parse(termsAggExample.code);
        expect(parsed.aggs).toBeDefined();
      }
    }
  });

  it('should have unique category labels', () => {
    const labels = queryGuidelinesConfig.categories.map(cat => cat.label);
    const uniqueLabels = [...new Set(labels)];
    
    expect(labels.length).toBe(uniqueLabels.length);
  });

  it('should have unique example titles within each category', () => {
    queryGuidelinesConfig.categories.forEach((category) => {
      const titles = category.examples.map(ex => ex.title);
      const uniqueTitles = [...new Set(titles)];
      
      expect(titles.length).toBe(uniqueTitles.length);
    });
  });
});