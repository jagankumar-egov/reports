#!/bin/bash

# Data Restore Script for DHR Backend
# This script restores backed up data to Elasticsearch from JSON files

ES_URL="http://localhost:9200"
BACKUP_DIR="./data-backup"
LOG_FILE="./data-backup/restore.log"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to log messages
log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

# Function to check if Elasticsearch is available
check_elasticsearch() {
    log "${BLUE}🔍 Checking Elasticsearch connectivity...${NC}"
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$ES_URL" > /dev/null 2>&1; then
            log "${GREEN}✅ Elasticsearch is available${NC}"
            return 0
        fi
        log "${YELLOW}⏳ Waiting for Elasticsearch... (attempt $attempt/$max_attempts)${NC}"
        sleep 2
        ((attempt++))
    done
    
    log "${RED}❌ Elasticsearch is not available after $max_attempts attempts${NC}"
    return 1
}

# Function to create index with mapping
create_index_with_mapping() {
    local index_name=$1
    local mapping_file="$BACKUP_DIR/${index_name}-mapping.json"
    
    log "${BLUE}📁 Creating index: $index_name${NC}"
    
    if [ -f "$mapping_file" ]; then
        # Extract mapping from backup and create index
        python3 << EOF
import json
import requests

# Read mapping file
with open('$mapping_file', 'r') as f:
    mapping_data = json.load(f)

# Extract the mapping for the index
index_mapping = mapping_data['$index_name']['mappings']

# Create index with mapping
index_config = {
    'settings': {
        'number_of_shards': 1,
        'number_of_replicas': 0
    },
    'mappings': index_mapping
}

try:
    response = requests.put('$ES_URL/$index_name', json=index_config)
    if response.status_code in [200, 201]:
        print('✅ Index created successfully')
    else:
        print(f'❌ Failed to create index: {response.text}')
except Exception as e:
    print(f'❌ Error creating index: {e}')
EOF
    else
        log "${YELLOW}⚠️  Mapping file not found for $index_name, creating with default settings${NC}"
        curl -X PUT "$ES_URL/$index_name" -H 'Content-Type: application/json' -d'{
            "settings": {
                "number_of_shards": 1,
                "number_of_replicas": 0
            }
        }' 2>/dev/null
    fi
}

# Function to restore data to an index
restore_index_data() {
    local index_name=$1
    local data_file="$BACKUP_DIR/${index_name}.json"
    
    log "${BLUE}📊 Restoring data for index: $index_name${NC}"
    
    if [ ! -f "$data_file" ]; then
        log "${RED}❌ Data file not found: $data_file${NC}"
        return 1
    fi
    
    # Use Python to process and restore the data
    python3 << EOF
import json
import requests
from datetime import datetime

# Read the backup data
with open('$data_file', 'r') as f:
    backup_data = json.load(f)

documents = backup_data['hits']['hits']
restored_count = 0
error_count = 0

print(f"📦 Found {len(documents)} documents to restore")

for doc in documents:
    doc_id = doc['_id']
    doc_source = doc['_source']
    
    try:
        # Index the document
        response = requests.post(f'$ES_URL/$index_name/_doc/{doc_id}', json=doc_source)
        
        if response.status_code in [200, 201]:
            restored_count += 1
        else:
            print(f"❌ Failed to restore document {doc_id}: {response.text}")
            error_count += 1
            
    except Exception as e:
        print(f"❌ Error restoring document {doc_id}: {e}")
        error_count += 1

print(f"✅ Restored {restored_count} documents")
if error_count > 0:
    print(f"❌ {error_count} documents failed to restore")

# Refresh the index
try:
    refresh_response = requests.post(f'$ES_URL/$index_name/_refresh')
    if refresh_response.status_code == 200:
        print(f"🔄 Index {index_name} refreshed")
    else:
        print(f"⚠️  Failed to refresh index: {refresh_response.text}")
except Exception as e:
    print(f"⚠️  Error refreshing index: {e}")

EOF
}

# Function to verify data restoration
verify_data() {
    local index_name=$1
    log "${BLUE}🔍 Verifying data for index: $index_name${NC}"
    
    local count=$(curl -s "$ES_URL/$index_name/_count" | python3 -c "import sys,json; print(json.load(sys.stdin)['count'])" 2>/dev/null)
    if [ -n "$count" ]; then
        log "${GREEN}✅ Index $index_name contains $count documents${NC}"
    else
        log "${YELLOW}⚠️  Could not verify document count for $index_name${NC}"
    fi
}

# Main execution
main() {
    log "${BLUE}🚀 Starting data restoration process...${NC}"
    log "Timestamp: $(date)"
    log "Backup directory: $BACKUP_DIR"
    log "Elasticsearch URL: $ES_URL"
    log ""
    
    # Check if backup directory exists
    if [ ! -d "$BACKUP_DIR" ]; then
        log "${RED}❌ Backup directory not found: $BACKUP_DIR${NC}"
        exit 1
    fi
    
    # Check Elasticsearch connectivity
    if ! check_elasticsearch; then
        log "${RED}❌ Cannot connect to Elasticsearch. Please ensure:"
        log "   1. Elasticsearch is running"
        log "   2. Port-forward is active: kubectl port-forward service/elasticsearch 9200:9200"
        log "   3. The ES_URL ($ES_URL) is correct${NC}"
        exit 1
    fi
    
    # Define indexes to restore
    local indexes=("project-index-v1" "project-task-index-v1" "household-index-v1" "stock-index-v1")
    
    log "${BLUE}📋 Indexes to restore: ${indexes[*]}${NC}"
    log ""
    
    # Restore each index
    for index in "${indexes[@]}"; do
        log "${YELLOW}🔄 Processing index: $index${NC}"
        
        # Delete existing index if it exists
        log "🗑️  Deleting existing index (if exists)..."
        curl -X DELETE "$ES_URL/$index" >/dev/null 2>&1
        
        # Create index with mapping
        create_index_with_mapping "$index"
        
        # Restore data
        restore_index_data "$index"
        
        # Verify restoration
        verify_data "$index"
        
        log ""
    done
    
    log "${GREEN}🎉 Data restoration completed!${NC}"
    log ""
    log "${BLUE}📊 Final Summary:${NC}"
    
    # Get final counts
    for index in "${indexes[@]}"; do
        verify_data "$index"
    done
    
    log ""
    log "${BLUE}🔍 You can now test queries like:${NC}"
    log "  - project = project-index-v1"
    log "  - project = project-task-index-v1 AND status = 'active'"
    log "  - project = household-index-v1"
    log ""
    log "Restoration log saved to: $LOG_FILE"
}

# Run main function
main "$@"