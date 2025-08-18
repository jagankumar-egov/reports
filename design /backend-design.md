# DHR (Digit Health Reports) Backend Design Document

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Elasticsearch Strategy](#elasticsearch-strategy)
4. [Data Models](#data-models)
5. [API Services](#api-services)
6. [Bulk Export System](#bulk-export-system)
7. [Security & Configuration](#security--configuration)
8. [Deployment & Scaling](#deployment--scaling)

---

## System Overview

### Purpose
DHR is a Jira-like dashboard and reporting system that provides:
- Query execution against health data indexes
- Filter management and saving
- Dashboard creation and management
- Bulk data export capabilities
- Real-time analytics and visualization

### Key Components
- **Query Engine**: Elasticsearch-based search and filtering
- **Configuration Store**: Saved filters, dashboards, and user preferences
- **Export Service**: Asynchronous bulk data processing
- **Dashboard Engine**: Dynamic gadget management
- **API Gateway**: RESTful interface for all operations

---

## Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Apps   │────│   API Gateway   │────│  DHR Services   │
│ (Web/Mobile/API)│    │ (Load Balancer) │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                       ┌─────────────────┐             │
                       │ Elasticsearch   │─────────────┼──────────┐
                       │    Cluster      │             │          │
                       └─────────────────┘             │          │
                                                       │          │
                       ┌─────────────────┐             │          │
                       │ DIGIT Filestore │─────────────┘          │
                       │   Service       │                        │
                       └─────────────────┘                        │
                                │                                 │
                       ┌─────────────────┐                        │
                       │ Storage Backend │                        │
                       │ (S3/Azure/Disk) │                        │
                       └─────────────────┘                        │
                                                                  │
                       ┌─────────────────┐                        │
                       │  Redis Queue    │────────────────────────┘
                       │ (Export Jobs)   │
                       └─────────────────┘
```

### Service Architecture
```
DHR Backend Services
├── Query Service (Port 3001)
├── Filter Service (Port 3002)  
├── Dashboard Service (Port 3003)
├── Export Service (Port 3004)
├── Configuration Service (Port 3005)
└── Gateway Service (Port 3000)
```

---

## Elasticsearch Strategy

### Index Structure
DHR will use multiple Elasticsearch indexes for different purposes:

#### 1. Health Data Indexes (Read-Only)
These are your existing health data indexes that DHR will query:
```
health-data-*
├── health-data-patients
├── health-data-visits  
├── health-data-treatments
├── health-data-outcomes
└── health-data-analytics
```

#### 2. DHR Configuration Indexes (Read/Write)
DHR-managed indexes for storing application data:
```
dhr-config-*
├── dhr-config-filters
├── dhr-config-dashboards
├── dhr-config-gadgets
├── dhr-config-users
└── dhr-config-exports
```

### Elasticsearch Mapping Strategy

#### Health Data Access Pattern
```json
{
  "allowed_indexes": [
    "health-data-patients",
    "health-data-visits", 
    "health-data-treatments",
    "health-data-outcomes"
  ],
  "field_mapping": {
    "patients": ["patient_id", "age", "gender", "location"],
    "visits": ["visit_id", "patient_id", "date", "diagnosis"],
    "treatments": ["treatment_id", "patient_id", "medication", "dosage"],
    "outcomes": ["outcome_id", "patient_id", "result", "followup_date"]
  }
}
```

#### DHR Configuration Mappings
```json
{
  "dhr-config-filters": {
    "mappings": {
      "properties": {
        "id": {"type": "keyword"},
        "name": {"type": "text"},
        "jql": {"type": "text"},
        "description": {"type": "text"},
        "user_id": {"type": "keyword"},
        "favourite": {"type": "boolean"},
        "created_at": {"type": "date"},
        "updated_at": {"type": "date"}
      }
    }
  },
  "dhr-config-dashboards": {
    "mappings": {
      "properties": {
        "id": {"type": "keyword"},
        "name": {"type": "text"},
        "description": {"type": "text"},
        "user_id": {"type": "keyword"},
        "share_permissions": {"type": "object"},
        "created_at": {"type": "date"},
        "updated_at": {"type": "date"}
      }
    }
  }
}
```

---

## Data Models

### Core Entities

#### Filter Model
```typescript
interface Filter {
  id: string;
  name: string;
  jql: string;
  description?: string;
  favourite: boolean;
  user_id: string;
  allowed_indexes: string[];
  created_at: Date;
  updated_at: Date;
}
```

#### Dashboard Model
```typescript
interface Dashboard {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  share_permissions: SharePermission[];
  created_at: Date;
  updated_at: Date;
}

interface SharePermission {
  type: 'user' | 'group' | 'public';
  entity_id?: string;
  permissions: ('read' | 'write' | 'admin')[];
}
```

#### Gadget Model
```typescript
interface Gadget {
  id: string;
  dashboard_id: string;
  type: 'pie-chart' | 'bar-chart' | 'line-chart' | 'table' | 'stat';
  title: string;
  filter_id: string;
  config: GadgetConfig;
  position: {
    row: number;
    col: number;
    width: number;
    height: number;
  };
  created_at: Date;
  updated_at: Date;
}
```

#### Export Process Model
```typescript
interface ExportProcess {
  id: string;
  user_id: string;
  filter_id: string;
  format: 'csv' | 'excel' | 'json' | 'pdf';
  fields: string[];
  max_results: number;
  status: 'initiated' | 'processing' | 'completed' | 'failed' | 'expired';
  progress: number;
  records_processed: number;
  total_records: number;
  file_store_id?: string;  // DIGIT Filestore ID - only thing we store
  tenant_id: string;       // Tenant ID for filestore access
  error_message?: string;
  created_at: Date;
  completed_at?: Date;
  // Note: No download_url or expires_at - filestore handles this
}
```

---

## API Services

### 1. Query Service
**Purpose**: Execute searches against health data indexes

```typescript
class QueryService {
  async executeQuery(params: {
    jql: string;
    allowed_indexes: string[];
    start_at: number;
    max_results: number;
    fields: string[];
  }): Promise<QueryResult> {
    // Convert JQL to Elasticsearch query
    // Execute against allowed indexes
    // Return paginated results
  }
  
  async validateQuery(jql: string, indexes: string[]): Promise<boolean> {
    // Validate JQL syntax
    // Check field availability
  }
}
```

### 2. Filter Service  
**Purpose**: Manage saved filters and queries

```typescript
class FilterService {
  async createFilter(filter: CreateFilterRequest): Promise<Filter> {
    // Validate JQL
    // Store in dhr-config-filters index
  }
  
  async updateFilter(id: string, updates: UpdateFilterRequest): Promise<Filter> {
    // Update in Elasticsearch
  }
  
  async deleteFilter(id: string, user_id: string): Promise<void> {
    // Remove from index
  }
  
  async listFilters(user_id: string): Promise<Filter[]> {
    // Query user's filters
  }
}
```

### 3. Dashboard Service
**Purpose**: Manage dashboards and gadgets

```typescript
class DashboardService {
  async createDashboard(dashboard: CreateDashboardRequest): Promise<Dashboard> {
    // Store in dhr-config-dashboards
  }
  
  async addGadget(dashboard_id: string, gadget: CreateGadgetRequest): Promise<Gadget> {
    // Store in dhr-config-gadgets
  }
  
  async getDashboardConfig(id: string): Promise<DashboardConfig> {
    // Get dashboard + all gadgets
    // Return complete configuration
  }
}
```

### 4. Export Service
**Purpose**: Handle bulk data exports with DIGIT Filestore integration

```typescript
class ExportService {
  constructor(
    private digitFilestore: DigitFilestoreService,
    private queryService: QueryService
  ) {}

  async initiateExport(request: ExportRequest): Promise<ExportProcess> {
    // Validate filter and permissions
    const filter = await this.filterService.getFilter(request.filterId);
    
    // Create process record
    const process = await this.createProcessRecord({
      ...request,
      status: 'initiated',
      user_id: request.userId
    });
    
    // Queue background job
    await this.exportQueue.add('processExport', { processId: process.id });
    
    return process;
  }
  
  async getProcessStatus(process_id: string): Promise<ExportProcess> {
    // Query process status from dhr-config-exports index
    return await this.getProcessFromIndex(process_id);
  }
  
  // No download method needed - users call filestore directly
  // DHR only provides the filestore ID and tenant info
  
  async processExport(process_id: string): Promise<void> {
    // Background job implementation with filestore integration
    const process = await this.getProcess(process_id);
    
    try {
      await this.updateProcessStatus(process_id, 'processing');
      
      // Execute the filter query
      const data = await this.queryService.executeAllResults(
        process.filter_id,
        process.fields,
        process.max_results
      );
      
      // Format the data
      const formattedData = await this.formatData(data, process.format);
      
      // Upload to DIGIT Filestore
      const fileResult = await this.digitFilestore.uploadFile(formattedData, {
        fileName: `dhr_export_${process_id}.${process.format}`,
        module: 'DHR',
        tag: 'EXPORT'
      });
      
      // Update process as completed - only store filestore ID
      await this.updateProcessStatus(process_id, 'completed', {
        file_store_id: fileResult.fileStoreId,
        records_processed: data.length
      });
      
    } catch (error) {
      await this.updateProcessStatus(process_id, 'failed', {
        error_message: error.message
      });
    }
  }
}
```

---

## Bulk Export System

### Architecture
```
Export Request → Queue → Background Worker → File Generation → DIGIT Filestore
     ↓              ↓           ↓                ↓              ↓
Process Record → Job Queue → Data Fetch → Format Convert → Upload & Get FileStore ID
                                                             ↓
                                              Store FileStore ID + Tenant ID Only
                                                             ↓
                                              Users call filestore directly for download
```

### Implementation Strategy

#### 1. Process Management
```typescript
class ExportProcessor {
  async processExport(processId: string) {
    const process = await this.getProcess(processId);
    
    try {
      // Update status to processing
      await this.updateProcessStatus(processId, 'processing');
      
      // Execute the filter query
      const data = await this.queryService.executeAllResults(
        process.filter_id,
        process.fields
      );
      
      // Format the data
      const formattedData = await this.formatData(data, process.format);
      
      // Upload to DIGIT Filestore
      const fileResult = await this.digitFilestore.uploadFile(formattedData, {
        fileName: `export_${processId}.${process.format}`,
        module: 'DHR',
        tag: 'EXPORT'
      });
      
      // Update process as completed
      await this.updateProcessStatus(processId, 'completed', {
        file_store_id: fileResult.fileStoreId,
        download_url: `/export/download/${processId}`,
        records_processed: data.length,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days (filestore retention)
      });
      
    } catch (error) {
      await this.updateProcessStatus(processId, 'failed', {
        error_message: error.message
      });
    }
  }
}
```

#### 2. Data Formatting
```typescript
class DataFormatter {
  async formatAsCsv(data: any[]): Promise<Buffer> {
    // Convert JSON to CSV
  }
  
  async formatAsExcel(data: any[]): Promise<Buffer> {
    // Convert JSON to Excel
  }
  
  async formatAsPdf(data: any[]): Promise<Buffer> {
    // Generate PDF report
  }
}
```

#### 3. DIGIT Filestore Integration (Simplified)
```typescript
class DigitFilestoreService {
  private filestoreUrl: string;
  private tenantId: string;
  
  constructor(config: FilestoreConfig) {
    this.filestoreUrl = config.url;
    this.tenantId = config.tenantId;
  }
  
  async uploadFile(data: Buffer, metadata: {
    fileName: string;
    module: string;
    tag: string;
  }): Promise<FilestoreResponse> {
    const formData = new FormData();
    formData.append('file', data, metadata.fileName);
    formData.append('tenantId', this.tenantId);
    formData.append('module', metadata.module);
    formData.append('tag', metadata.tag);
    
    const response = await fetch(`${this.filestoreUrl}/filestore/v1/files`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${await this.getAuthToken()}`
      }
    });
    
    const result = await response.json();
    return {
      fileStoreId: result.files[0].fileStoreId,
      fileName: result.files[0].fileName
      // No need to return URL - users will call filestore directly
    };
  }
  
  private async getAuthToken(): Promise<string> {
    // Implement OAuth token retrieval for DIGIT platform
    // This will depend on your authentication setup
  }
  
  // Note: No download methods needed - users call filestore directly
  // DHR only stores fileStoreId and tenantId
}
```

---

## Security & Configuration

### Elasticsearch Configuration
```typescript
interface ElasticsearchConfig {
  hosts: string[];
  auth: {
    username: string;
    password: string;
  };
  ssl: {
    ca: string;
    rejectUnauthorized: boolean;
  };
  allowed_indexes: {
    read: string[];
    write: string[];
  };
}
```

### Access Control
```typescript
class AccessControl {
  async validateIndexAccess(user_id: string, indexes: string[]): Promise<boolean> {
    // Check if user can access these indexes
  }
  
  async validateDashboardAccess(user_id: string, dashboard_id: string): Promise<boolean> {
    // Check dashboard permissions
  }
}
```

### Environment Configuration
```typescript
interface DHRConfig {
  elasticsearch: ElasticsearchConfig;
  redis: RedisConfig; // For job queue
  filestore: FilestoreConfig; // DIGIT Filestore integration
  api: {
    port: number;
    cors_origins: string[];
    rate_limit: {
      window_ms: number;
      max_requests: number;
    };
  };
  export: {
    max_file_size: number;
    retention_days: number; // Aligned with filestore retention
    concurrent_jobs: number;
    supported_formats: string[];
  };
}

interface FilestoreConfig {
  url: string; // DIGIT Filestore service URL
  tenant_id: string; // Tenant ID for multi-tenancy
  auth: {
    client_id: string;
    client_secret: string;
    token_url: string;
  };
  module_name: string; // 'DHR' - used for file organization
  storage_type: 'S3' | 'AZURE' | 'DISK' | 'MINIO'; // Backend storage type
  retention_policy: {
    days: number; // How long files are kept
    auto_cleanup: boolean; // Automatic cleanup of expired files
  };
}
```

---

## Deployment & Scaling

### Service Deployment
```yaml
# docker-compose.yml
version: '3.8'
services:
  dhr-gateway:
    image: dhr/gateway:latest
    ports: ["3000:3000"]
    environment:
      - FILESTORE_URL=${DIGIT_FILESTORE_URL}
      - FILESTORE_TENANT_ID=${TENANT_ID}
    
  dhr-query:
    image: dhr/query:latest
    ports: ["3001:3001"]
    
  dhr-export:
    image: dhr/export:latest
    ports: ["3004:3004"]
    environment:
      - FILESTORE_URL=${DIGIT_FILESTORE_URL}
      - FILESTORE_AUTH_URL=${DIGIT_AUTH_URL}
      - FILESTORE_CLIENT_ID=${DIGIT_CLIENT_ID}
      - FILESTORE_CLIENT_SECRET=${DIGIT_CLIENT_SECRET}
    
  redis:
    image: redis:alpine
    
  # External services (managed separately)
  elasticsearch:
    external: true # Your existing ES cluster
  
  digit-filestore:
    external: true # DIGIT Filestore service
```

### Kubernetes Deployment
```yaml
# dhr-export-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dhr-export
spec:
  template:
    spec:
      containers:
      - name: dhr-export
        image: dhr/export:latest
        env:
        - name: FILESTORE_URL
          valueFrom:
            configMapKeyRef:
              name: dhr-config
              key: filestore.url
        - name: FILESTORE_TENANT_ID
          valueFrom:
            configMapKeyRef:
              name: dhr-config
              key: filestore.tenant_id
        - name: FILESTORE_CLIENT_SECRET
          valueFrom:
            secretKeyRef:
              name: dhr-secrets
              key: filestore.client_secret
```

### Horizontal Scaling Strategy
- **Query Service**: Scale based on search load
- **Export Service**: Scale based on export queue size  
- **Gateway**: Multiple instances behind load balancer
- **File Storage**: Distributed storage for export files

### Monitoring & Observability
```typescript
class MetricsCollector {
  // Query performance metrics
  // Export processing times
  // Error rates and alerts
  // Elasticsearch cluster health
}
```

---

## Implementation Phases

### Phase 1: Core Query & Filter Management
- Elasticsearch integration
- Basic query execution
- Filter CRUD operations

### Phase 2: Dashboard & Visualization
- Dashboard management
- Gadget system
- Basic charts and tables

### Phase 3: Bulk Export System
- Asynchronous export processing
- Multiple format support
- Progress tracking

### Phase 4: Advanced Features
- Advanced analytics
- Scheduled reports
- User management
- Performance optimization

---

## DIGIT Filestore Integration Details

### Benefits of Using DIGIT Filestore
- **Unified File Management**: Consistent file handling across DIGIT platform
- **Multi-Backend Support**: Works with S3, Azure, Disk, or Minio storage
- **Automatic Scaling**: Built-in support for high-volume file operations
- **Security**: Integrated with DIGIT authentication and authorization
- **Retention Management**: Automatic cleanup of expired files
- **Multi-Tenancy**: Tenant-aware file storage and retrieval

### File Organization Strategy
```
DIGIT Filestore Structure for DHR:
├── Module: DHR
│   ├── Tag: EXPORT
│   │   ├── dhr_export_001.csv
│   │   ├── dhr_export_002.xlsx
│   │   └── dhr_export_003.json
│   └── Tag: TEMP
│       ├── temp_file_001.pdf
│       └── temp_file_002.csv
```

### API Flow Integration (Simplified)
```
1. POST /export/bulk
   └── Creates export process record in Elasticsearch
   └── Queues background job in Redis
   └── Returns processId to user

2. Background Job Processing
   └── Fetches data from health indexes
   └── Formats data (CSV/Excel/JSON/PDF)
   └── Uploads to DIGIT Filestore → Returns fileStoreId
   └── Updates process record with fileStoreId + tenantId

3. GET /export/process/{processId}
   └── Returns process status with fileStoreId and tenantId
   └── User calls DIGIT Filestore directly to download file

4. User Downloads File (Direct to Filestore)
   └── User calls: GET /filestore/v1/files/url?tenantId={tenantId}&fileStoreIds={fileStoreId}
   └── Filestore returns download URL
   └── User downloads file directly from filestore

5. Cleanup Process (Automatic)
   └── DIGIT Filestore handles retention policy automatically
   └── No cleanup needed in DHR
```

### Configuration Template
```yaml
# application.yml
dhr:
  filestore:
    url: "${DIGIT_FILESTORE_URL:http://filestore:8080}"
    tenant_id: "${TENANT_ID:pb}"
    module_name: "DHR"
    auth:
      client_id: "${FILESTORE_CLIENT_ID}"
      client_secret: "${FILESTORE_CLIENT_SECRET}"
      token_url: "${DIGIT_AUTH_URL}/auth/oauth/token"
    retention_policy:
      days: 7
      auto_cleanup: true
    upload:
      max_file_size: "100MB"
      allowed_formats: ["csv", "xlsx", "json", "pdf"]
```

### Security Considerations
- **Authentication**: OAuth2 integration with DIGIT platform
- **Authorization**: Tenant-based access control
- **File Access**: Time-limited download URLs
- **Data Privacy**: Automatic file expiration
- **Audit Trail**: File upload/download logging

### Error Handling
```typescript
class FilestoreErrorHandler {
  static handleUploadError(error: any): string {
    switch (error.code) {
      case 'FILE_TOO_LARGE':
        return 'Export file exceeds maximum size limit';
      case 'STORAGE_FULL':
        return 'Storage capacity reached. Please try again later';
      case 'INVALID_FORMAT':
        return 'File format not supported for export';
      case 'AUTH_FAILED':
        return 'Authentication failed with filestore service';
      default:
        return 'File upload failed. Please contact support';
    }
  }
}
```

---

This design provides a robust, scalable foundation for the DHR system with seamless DIGIT Filestore integration, ensuring efficient file management and adherence to DIGIT platform standards.