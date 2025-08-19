#!/usr/bin/env node

const { Client } = require('@elastic/elasticsearch');
const fs = require('fs');
const path = require('path');

// Wait for Elasticsearch to be ready
const waitForElasticsearch = async (client, maxRetries = 30) => {
  console.log('⏳ Waiting for Elasticsearch to be ready...');
  for (let i = 0; i < maxRetries; i++) {
    try {
      const health = await client.cluster.health();
      if (health.status === 'yellow' || health.status === 'green') {
        console.log('✅ Elasticsearch is ready!');
        return true;
      }
    } catch (error) {
      console.log(`Attempt ${i + 1}/${maxRetries}: Elasticsearch not ready yet...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  throw new Error('Elasticsearch failed to become ready');
};

// Create indices with proper mappings
const createIndices = async (client) => {
  const indices = [
    {
      name: 'project-index-v1',
      mappings: {
        properties: {
          project_id: { type: 'keyword' },
          project_name: { type: 'text' },
          project_type: { type: 'keyword' },
          campaign_id: { type: 'keyword' },
          campaign_name: { type: 'text' },
          campaign_boundaries: {
            type: 'nested',
            properties: {
              boundary_id: { type: 'keyword' },
              boundary_name: { type: 'text' },
              boundary_type: { type: 'keyword' },
              parent_boundary_id: { type: 'keyword' },
              location: { type: 'geo_point' }
            }
          },
          state: { type: 'keyword' },
          district: { type: 'keyword' },
          start_date: { type: 'date' },
          end_date: { type: 'date' },
          budget_allocated: { type: 'float' },
          budget_utilized: { type: 'float' },
          status: { type: 'keyword' },
          created_date: { type: 'date' },
          updated_date: { type: 'date' }
        }
      }
    },
    {
      name: 'project-task-index-v1',
      mappings: {
        properties: {
          task_id: { type: 'keyword' },
          project_id: { type: 'keyword' },
          task_name: { type: 'text' },
          task_type: { type: 'keyword' },
          assignee: { type: 'keyword' },
          status: { type: 'keyword' },
          priority: { type: 'keyword' },
          due_date: { type: 'date' },
          completed_date: { type: 'date' },
          campaign_boundary_id: { type: 'keyword' },
          resources_required: { type: 'integer' },
          resources_used: { type: 'integer' },
          created_date: { type: 'date' },
          updated_date: { type: 'date' }
        }
      }
    },
    {
      name: 'household-index-v1',
      mappings: {
        properties: {
          household_id: { type: 'keyword' },
          head_of_household: { type: 'text' },
          total_members: { type: 'integer' },
          campaign_boundary_id: { type: 'keyword' },
          address: {
            type: 'object',
            properties: {
              street: { type: 'text' },
              locality: { type: 'text' },
              ward: { type: 'keyword' },
              district: { type: 'keyword' },
              state: { type: 'keyword' },
              pincode: { type: 'keyword' },
              location: { type: 'geo_point' }
            }
          },
          registration_date: { type: 'date' },
          last_survey_date: { type: 'date' },
          economic_status: { type: 'keyword' },
          health_insurance: { type: 'boolean' },
          services_availed: { type: 'keyword' },
          created_date: { type: 'date' },
          updated_date: { type: 'date' }
        }
      }
    },
    {
      name: 'health_facilities',
      mappings: {
        properties: {
          facility_id: { type: 'keyword' },
          facility_name: { type: 'text' },
          facility_type: { type: 'keyword' },
          campaign_boundary_id: { type: 'keyword' },
          state: { type: 'keyword' },
          district: { type: 'keyword' },
          location: { type: 'geo_point' },
          ownership: { type: 'keyword' },
          services: { type: 'keyword' },
          bed_count: { type: 'integer' },
          staff_count: { type: 'integer' },
          created_date: { type: 'date' },
          updated_date: { type: 'date' }
        }
      }
    }
  ];

  for (const index of indices) {
    try {
      // Delete index if it exists
      const exists = await client.indices.exists({ index: index.name });
      if (exists) {
        console.log(`🗑️  Deleting existing index: ${index.name}`);
        await client.indices.delete({ index: index.name });
      }

      // Create index with mappings
      console.log(`📝 Creating index: ${index.name}`);
      await client.indices.create({
        index: index.name,
        body: {
          mappings: index.mappings
        }
      });
    } catch (error) {
      console.error(`Error creating index ${index.name}:`, error);
    }
  }
};

// Generate sample data
const generateSampleData = () => {
  const states = ['Karnataka', 'Maharashtra', 'Tamil Nadu', 'Kerala', 'Andhra Pradesh'];
  const districts = {
    'Karnataka': ['Bangalore', 'Mysore', 'Hubli', 'Mangalore', 'Belgaum'],
    'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Thane'],
    'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem'],
    'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam'],
    'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool']
  };

  const facilityTypes = ['Primary Health Center', 'Community Health Center', 'District Hospital', 'Private Hospital', 'Medical College'];
  const services = ['OPD', 'Emergency', 'Surgery', 'Maternity', 'Pediatrics', 'ICU', 'Diagnostics', 'Pharmacy'];
  const projectTypes = ['Health Infrastructure', 'Disease Control', 'Maternal Health', 'Child Health', 'Nutrition', 'Sanitation'];
  const taskTypes = ['Survey', 'Registration', 'Service Delivery', 'Monitoring', 'Reporting', 'Training'];
  const campaignTypes = ['Vaccination Drive', 'Health Screening', 'Awareness Campaign', 'Disease Surveillance', 'Nutrition Program'];

  const data = {
    'project-index-v1': [],
    'project-task-index-v1': [],
    'household-index-v1': [],
    'health_facilities': []
  };

  // Generate health facilities
  for (let i = 1; i <= 100; i++) {
    const state = states[Math.floor(Math.random() * states.length)];
    const district = districts[state][Math.floor(Math.random() * districts[state].length)];
    
    data.health_facilities.push({
      facility_id: `FAC${String(i).padStart(5, '0')}`,
      facility_name: `${district} ${facilityTypes[Math.floor(Math.random() * facilityTypes.length)]} ${i}`,
      facility_type: facilityTypes[Math.floor(Math.random() * facilityTypes.length)],
      state: state,
      district: district,
      location: {
        lat: 8 + Math.random() * 29, // India's latitude range
        lon: 68 + Math.random() * 29  // India's longitude range
      },
      ownership: Math.random() > 0.6 ? 'Government' : 'Private',
      services: services.slice(0, Math.floor(Math.random() * services.length) + 1),
      bed_count: Math.floor(Math.random() * 500) + 10,
      staff_count: Math.floor(Math.random() * 200) + 5,
      created_date: new Date(2020, 0, 1).toISOString(),
      updated_date: new Date().toISOString()
    });
  }

  // Generate patient records
  for (let i = 1; i <= 500; i++) {
    const admissionDate = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
    const dischargeDate = new Date(admissionDate.getTime() + (Math.random() * 10 + 1) * 24 * 60 * 60 * 1000);
    
    data.patient_records.push({
      patient_id: `PAT${String(i).padStart(6, '0')}`,
      facility_id: `FAC${String(Math.floor(Math.random() * 100) + 1).padStart(5, '0')}`,
      age: Math.floor(Math.random() * 80) + 1,
      gender: Math.random() > 0.5 ? 'Male' : 'Female',
      diagnosis: diseases[Math.floor(Math.random() * diseases.length)],
      diagnosis_code: `ICD${Math.floor(Math.random() * 1000)}`,
      admission_date: admissionDate.toISOString(),
      discharge_date: dischargeDate.toISOString(),
      treatment_outcome: Math.random() > 0.1 ? 'Recovered' : 'Under Treatment',
      total_cost: Math.floor(Math.random() * 100000) + 1000,
      insurance_covered: Math.random() > 0.3
    });
  }

  // Generate health programs
  for (let i = 1; i <= 50; i++) {
    const state = states[Math.floor(Math.random() * states.length)];
    const district = districts[state][Math.floor(Math.random() * districts[state].length)];
    const budget = Math.floor(Math.random() * 10000000) + 100000;
    const target = Math.floor(Math.random() * 50000) + 1000;
    
    data.health_programs.push({
      program_id: `PRG${String(i).padStart(4, '0')}`,
      program_name: `${programTypes[Math.floor(Math.random() * programTypes.length)]} Program ${i}`,
      program_type: programTypes[Math.floor(Math.random() * programTypes.length)],
      state: state,
      district: district,
      start_date: new Date(2023, Math.floor(Math.random() * 12), 1).toISOString(),
      end_date: new Date(2024, Math.floor(Math.random() * 12), 28).toISOString(),
      budget_allocated: budget,
      budget_utilized: budget * Math.random(),
      beneficiaries_target: target,
      beneficiaries_reached: Math.floor(target * Math.random()),
      status: Math.random() > 0.3 ? 'Active' : 'Completed'
    });
  }

  // Generate disease surveillance data
  for (let i = 1; i <= 200; i++) {
    const state = states[Math.floor(Math.random() * states.length)];
    const district = districts[state][Math.floor(Math.random() * districts[state].length)];
    const cases = Math.floor(Math.random() * 1000) + 1;
    
    data.disease_surveillance.push({
      report_id: `RPT${String(i).padStart(6, '0')}`,
      disease_name: diseases[Math.floor(Math.random() * diseases.length)],
      disease_code: `DIS${Math.floor(Math.random() * 100)}`,
      state: state,
      district: district,
      reported_date: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString(),
      cases_reported: cases,
      deaths_reported: Math.floor(cases * 0.02),
      age_group: ['0-5', '6-18', '19-45', '46-60', '60+'][Math.floor(Math.random() * 5)],
      severity: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)]
    });
  }

  return data;
};

// Bulk insert data
const insertData = async (client, data) => {
  for (const [indexName, documents] of Object.entries(data)) {
    if (documents.length === 0) continue;

    console.log(`📊 Inserting ${documents.length} documents into ${indexName}...`);
    
    const body = documents.flatMap(doc => [
      { index: { _index: indexName } },
      doc
    ]);

    try {
      const result = await client.bulk({ body, refresh: true });
      
      if (result.errors) {
        console.error(`❌ Some documents failed to insert into ${indexName}`);
        const failedDocs = result.items.filter(item => item.index.error);
        console.error(JSON.stringify(failedDocs, null, 2));
      } else {
        console.log(`✅ Successfully inserted ${documents.length} documents into ${indexName}`);
      }
    } catch (error) {
      console.error(`❌ Error inserting data into ${indexName}:`, error);
    }
  }
};

// Main execution
const main = async () => {
  const esUrl = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
  console.log(`🔗 Connecting to Elasticsearch at: ${esUrl}`);

  const client = new Client({
    node: esUrl,
    requestTimeout: 60000
  });

  try {
    // Wait for Elasticsearch
    await waitForElasticsearch(client);

    // Create indices
    console.log('\n📚 Creating indices...');
    await createIndices(client);

    // Generate sample data
    console.log('\n🎲 Generating sample data...');
    const data = generateSampleData();

    // Insert data
    console.log('\n💾 Inserting sample data...');
    await insertData(client, data);

    // Verify data
    console.log('\n🔍 Verifying data...');
    for (const indexName of Object.keys(data)) {
      const count = await client.count({ index: indexName });
      console.log(`   ${indexName}: ${count.count} documents`);
    }

    console.log('\n🎉 Seed data successfully loaded!');
    console.log('📊 You can now access Kibana at http://localhost:5601 to explore the data');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };