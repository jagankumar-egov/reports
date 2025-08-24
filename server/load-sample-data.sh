#!/bin/bash

# Sample data loading script for DHR Backend
# This script creates indexes and loads sample data into local Elasticsearch

ES_URL="http://localhost:9200"

echo "🚀 Loading sample data into Elasticsearch..."

# Function to create index with settings
create_index() {
    local index=$1
    echo "Creating index: $index"
    kubectl exec deployment/elasticsearch -- curl -X PUT "$ES_URL/$index" -H 'Content-Type: application/json' -d'{
        "settings": {
            "number_of_shards": 1,
            "number_of_replicas": 0
        }
    }' 2>/dev/null
    echo ""
}

# Function to add document
add_document() {
    local index=$1
    local data=$2
    kubectl exec deployment/elasticsearch -- curl -X POST "$ES_URL/$index/_doc" -H 'Content-Type: application/json' -d"$data" 2>/dev/null
    echo ""
}

# Create indexes
echo "📁 Creating indexes..."
create_index "project-index-v1"
create_index "project-task-index-v1"
create_index "household-index-v1"

# Add sample data for project-index-v1
echo "📊 Adding project data..."
add_document "project-index-v1" '{
    "projectId": "PROJ-001",
    "projectName": "Urban Health Initiative",
    "status": "active",
    "createdDate": "2025-01-15",
    "location": "Mumbai",
    "budget": 5000000,
    "beneficiaries": 10000
}'

add_document "project-index-v1" '{
    "projectId": "PROJ-002",
    "projectName": "Rural Vaccination Drive",
    "status": "active",
    "createdDate": "2025-02-20",
    "location": "Karnataka Rural",
    "budget": 3000000,
    "beneficiaries": 25000
}'

add_document "project-index-v1" '{
    "projectId": "PROJ-003",
    "projectName": "Maternal Health Program",
    "status": "completed",
    "createdDate": "2024-11-10",
    "location": "Delhi",
    "budget": 7500000,
    "beneficiaries": 15000
}'

# Add sample data for project-task-index-v1
echo "📋 Adding task data..."
add_document "project-task-index-v1" '{
    "taskId": "TASK-001",
    "projectId": "PROJ-001",
    "taskName": "Health Camp Setup",
    "status": "in_progress",
    "assignedTo": "Dr. Sharma",
    "dueDate": "2025-09-01",
    "priority": "high"
}'

add_document "project-task-index-v1" '{
    "taskId": "TASK-002",
    "projectId": "PROJ-001",
    "taskName": "Medical Equipment Procurement",
    "status": "completed",
    "assignedTo": "Admin Team",
    "completedDate": "2025-08-15",
    "priority": "medium"
}'

add_document "project-task-index-v1" '{
    "taskId": "TASK-003",
    "projectId": "PROJ-002",
    "taskName": "Vaccine Distribution",
    "status": "pending",
    "assignedTo": "Field Team",
    "dueDate": "2025-09-15",
    "priority": "high"
}'

# Add sample data for household-index-v1
echo "🏠 Adding household data..."
add_document "household-index-v1" '{
    "householdId": "HH-001",
    "headOfHousehold": "Rajesh Kumar",
    "members": 5,
    "address": "123 Main Street, Mumbai",
    "income": "50000",
    "healthInsurance": true,
    "projectId": "PROJ-001"
}'

add_document "household-index-v1" '{
    "householdId": "HH-002",
    "headOfHousehold": "Priya Patel",
    "members": 4,
    "address": "456 Park Avenue, Bangalore",
    "income": "35000",
    "healthInsurance": false,
    "projectId": "PROJ-002"
}'

add_document "household-index-v1" '{
    "householdId": "HH-003",
    "headOfHousehold": "Mohammed Ali",
    "members": 6,
    "address": "789 Green Lane, Delhi",
    "income": "45000",
    "healthInsurance": true,
    "projectId": "PROJ-003"
}'

add_document "household-index-v1" '{
    "householdId": "HH-004",
    "headOfHousehold": "Sunita Devi",
    "members": 3,
    "address": "321 Village Road, Karnataka",
    "income": "25000",
    "healthInsurance": false,
    "projectId": "PROJ-002"
}'

# Refresh all indexes to make data immediately searchable
echo "🔄 Refreshing indexes..."
kubectl exec deployment/elasticsearch -- curl -X POST "$ES_URL/_refresh" 2>/dev/null
echo ""

echo "✅ Sample data loaded successfully!"
echo ""
echo "📊 Index Summary:"
echo "- project-index-v1: 3 documents"
echo "- project-task-index-v1: 3 documents"
echo "- household-index-v1: 4 documents"
echo ""
echo "🔍 You can now test queries like:"
echo "  - project = project-index-v1"
echo "  - project = project-task-index-v1 AND status = 'in_progress'"
echo "  - project = household-index-v1 AND healthInsurance = false"