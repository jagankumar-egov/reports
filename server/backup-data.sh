#!/bin/bash

# Data Backup Script for DHR Backend
# This script backs up data from Elasticsearch to JSON files

ES_URL="http://localhost:9200"
BACKUP_DIR="./data-backup"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
VERSIONED_BACKUP_DIR="./data-backup/backup_$TIMESTAMP"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to log messages
log() {
    echo -e "$1"
}

# Function to check if Elasticsearch is available
check_elasticsearch() {
    log "${BLUE}🔍 Checking Elasticsearch connectivity...${NC}"
    
    if curl -s "$ES_URL" > /dev/null 2>&1; then
        log "${GREEN}✅ Elasticsearch is available${NC}"
        return 0
    else
        log "${RED}❌ Elasticsearch is not available${NC}"
        return 1
    fi
}

# Function to backup an index
backup_index() {
    local index_name=$1
    local backup_dir=$2
    
    log "${BLUE}📦 Backing up index: $index_name${NC}"
    
    # Create backup directory if it doesn't exist
    mkdir -p "$backup_dir"
    
    # Export data
    log "   📊 Exporting data..."
    if curl -s "$ES_URL/$index_name/_search?size=10000" > "$backup_dir/${index_name}.json"; then
        log "${GREEN}   ✅ Data exported successfully${NC}"
    else
        log "${RED}   ❌ Failed to export data${NC}"
        return 1
    fi
    
    # Export mapping
    log "   🗺️  Exporting mapping..."
    if curl -s "$ES_URL/$index_name/_mapping" > "$backup_dir/${index_name}-mapping.json"; then
        log "${GREEN}   ✅ Mapping exported successfully${NC}"
    else
        log "${RED}   ❌ Failed to export mapping${NC}"
        return 1
    fi
    
    # Get document count for verification
    local count=$(curl -s "$ES_URL/$index_name/_count" | python3 -c "import sys,json; print(json.load(sys.stdin)['count'])" 2>/dev/null)
    if [ -n "$count" ]; then
        log "${GREEN}   📄 Backed up $count documents${NC}"
    fi
    
    return 0
}

# Function to create summary
create_summary() {
    local backup_dir=$1
    local summary_file="$backup_dir/backup_summary.json"
    
    log "${BLUE}📋 Creating backup summary...${NC}"
    
    python3 << EOF
import json
import os
from datetime import datetime

backup_info = {
    "backup_timestamp": "$TIMESTAMP",
    "backup_date": datetime.now().isoformat(),
    "elasticsearch_url": "$ES_URL",
    "indexes": {}
}

indexes = ["project-index-v1", "project-task-index-v1", "household-index-v1", "stock-index-v1"]

for index in indexes:
    data_file = os.path.join("$backup_dir", f"{index}.json")
    mapping_file = os.path.join("$backup_dir", f"{index}-mapping.json")
    
    index_info = {
        "data_file": f"{index}.json",
        "mapping_file": f"{index}-mapping.json",
        "data_file_exists": os.path.exists(data_file),
        "mapping_file_exists": os.path.exists(mapping_file)
    }
    
    if os.path.exists(data_file):
        try:
            with open(data_file, 'r') as f:
                data = json.load(f)
            doc_count = data['hits']['total']['value'] if isinstance(data['hits']['total'], dict) else data['hits']['total']
            index_info["document_count"] = doc_count
        except:
            index_info["document_count"] = "unknown"
    
    backup_info["indexes"][index] = index_info

with open("$summary_file", 'w') as f:
    json.dump(backup_info, f, indent=2)

print(f"Summary saved to: $summary_file")
EOF
}

# Main execution
main() {
    log "${BLUE}🚀 Starting data backup process...${NC}"
    log "Timestamp: $(date)"
    log "Elasticsearch URL: $ES_URL"
    log "Backup directory: $BACKUP_DIR"
    log ""
    
    # Check Elasticsearch connectivity
    if ! check_elasticsearch; then
        log "${RED}❌ Cannot connect to Elasticsearch. Please ensure:"
        log "   1. Elasticsearch is running"
        log "   2. Port-forward is active: kubectl port-forward service/elasticsearch 9200:9200"
        log "   3. The ES_URL ($ES_URL) is correct${NC}"
        exit 1
    fi
    
    # Determine backup directory
    local target_dir="$BACKUP_DIR"
    if [ "$1" = "--versioned" ]; then
        target_dir="$VERSIONED_BACKUP_DIR"
        log "${YELLOW}📁 Creating versioned backup in: $target_dir${NC}"
    else
        log "${YELLOW}📁 Creating backup in: $target_dir${NC}"
    fi
    
    # Create backup directory
    mkdir -p "$target_dir"
    
    # Define indexes to backup
    local indexes=("project-index-v1" "project-task-index-v1" "household-index-v1" "stock-index-v1")
    
    log "${BLUE}📋 Indexes to backup: ${indexes[*]}${NC}"
    log ""
    
    # Backup each index
    local success_count=0
    for index in "${indexes[@]}"; do
        if backup_index "$index" "$target_dir"; then
            ((success_count++))
        fi
        log ""
    done
    
    # Create backup summary
    create_summary "$target_dir"
    log ""
    
    # Final summary
    if [ $success_count -eq ${#indexes[@]} ]; then
        log "${GREEN}🎉 Backup completed successfully!${NC}"
        log "${GREEN}✅ All $success_count indexes backed up${NC}"
    else
        log "${YELLOW}⚠️  Backup completed with issues${NC}"
        log "${YELLOW}✅ $success_count out of ${#indexes[@]} indexes backed up${NC}"
    fi
    
    log ""
    log "${BLUE}📁 Backup location: $target_dir${NC}"
    log "${BLUE}🔄 To restore this backup, run: ./restore-data.sh${NC}"
    
    # Show file sizes
    log ""
    log "${BLUE}📊 Backup files:${NC}"
    ls -lh "$target_dir"/*.json 2>/dev/null || log "${YELLOW}⚠️  No backup files found${NC}"
}

# Show usage
show_usage() {
    log "${BLUE}Usage: $0 [options]${NC}"
    log ""
    log "Options:"
    log "  --versioned    Create a timestamped backup directory"
    log "  --help         Show this help message"
    log ""
    log "Examples:"
    log "  $0              # Create backup in ./data-backup/"
    log "  $0 --versioned  # Create backup in ./data-backup/backup_YYYYMMDD_HHMMSS/"
}

# Handle command line arguments
case "$1" in
    --help|-h)
        show_usage
        exit 0
        ;;
    --versioned|-v)
        main --versioned
        ;;
    "")
        main
        ;;
    *)
        log "${RED}❌ Unknown option: $1${NC}"
        show_usage
        exit 1
        ;;
esac