# Elasticsearch Reports Tool - Requirements Document

## 1. Executive Summary

### 1.1 Purpose
This document outlines the functional and non-functional requirements for an Elasticsearch-based reporting tool that enables users to create, manage, and view reports and dashboards using data from Elasticsearch indices.

### 1.2 Scope
The system will provide a web-based interface for administrators to build data points and dashboards, and for viewers to access and export report data. All configurations will be persisted in Elasticsearch, and the system will integrate with existing Elasticsearch clusters through configured allowed indices only.

### 1.3 Stakeholders
- **Reports Admin**: Users who create and manage data points and dashboards
- **Dashboard Viewer**: End users who view dashboards and export data
- **System Administrator**: IT personnel managing the deployment and infrastructure

## 2. Functional Requirements

### 2.1 Environment Configuration

#### FR-ENV-001: User Role Configuration
- The system SHALL support two user roles configured at the environment level: "reports-admin" and "reports-viewer"
- User roles SHALL be determined by environment configuration, not by authentication implementation
- The system SHALL read user role from environment variables or configuration files

#### FR-ENV-002: Elasticsearch Connection Configuration
- The system SHALL read Elasticsearch connection URL from environment configuration
- The system SHALL support configuring ES cluster credentials at environment level
- The system SHALL validate connection to Elasticsearch on startup

#### FR-ENV-003: Allowed Indices Configuration
- The system SHALL maintain a configurable list of allowed indices at the environment level
- The system SHALL ONLY permit access to indices explicitly listed in the configuration
- The system SHALL prevent any access to indices outside the allowed list
- The allowed indices list SHALL be defined in environment variables or configuration files

### 2.2 Elasticsearch Access Restrictions

#### FR-ES-001: Read-Only Access to Source Indices
- The system SHALL ONLY perform read operations on source data indices
- The system SHALL NOT write, update, or delete any documents in source indices
- The system SHALL NOT modify mappings or settings of source indices
- The system SHALL NOT execute direct user queries against Elasticsearch

#### FR-ES-002: Configuration Index Access
- The system SHALL ONLY write to designated reports configuration indices:
  - reports_datapoints
  - reports_dashboards
  - reports_audit (optional)
- The system SHALL create these indices if they don't exist on first run
- The system SHALL ONLY modify documents in these configuration indices

#### FR-ES-003: Query Execution
- The system SHALL ONLY execute pre-defined, validated queries from saved data points
- The system SHALL NOT accept or execute arbitrary queries from users
- All queries SHALL be constructed programmatically based on saved configurations
- The system SHALL validate all query parameters before execution

### 2.3 Index and Field Discovery

#### FR-INDEX-001: Index Listing
- The system SHALL provide a list of available Elasticsearch indices from the environment-configured allowed list
- Admins SHALL ONLY see indices that are in the allowed indices configuration
- The system SHALL NOT display or allow access to any index outside the configured list

#### FR-INDEX-002: Field Discovery
- The system SHALL auto-discover fields and their types from ES mappings for allowed indices only
- The system SHALL use ES Mapping API to retrieve field information
- The system SHALL use Field Capabilities API for multi-index compatibility

#### FR-INDEX-003: Field Metadata
- The system SHALL display field types (keyword, text, numeric, date, boolean, nested)
- The system SHALL indicate whether fields are searchable and aggregatable
- The system SHALL provide example values for fields when available

### 2.4 Data Point Management

#### FR-DP-001: Data Point Creation
- Admins SHALL be able to create new data points
- Each data point SHALL include:
  - Name and unique slug
  - Description
  - Source indices and time field
  - Query configuration
  - Field projections
  - Aggregation definitions
  - Tags for organization

#### FR-DP-002: Query Builder
- The system SHALL provide a visual query builder interface
- The system SHALL support the following filter types:
  - Term and terms filters
  - Range filters (dates and numerics)
  - Exists filters
  - Wildcard filters (with guards)
  - Query string (with guards)

#### FR-DP-003: Aggregation Support
- The system SHALL support the following aggregation types:
  - Terms aggregation
  - Date histogram
  - Histogram
  - Statistical aggregations (sum, avg, min, max)
  - Percentile ranks
  - Cardinality
  - Top hits (for sample rows)

#### FR-DP-004: Data Point Testing
- Admins SHALL be able to preview/test data points before saving
- The system SHALL validate queries against ES before saving
- The system SHALL display sample results during configuration

#### FR-DP-005: Data Point Versioning
- The system SHALL maintain version history for data points
- Each update SHALL increment the version number
- The system SHALL track created/updated timestamps and users

#### FR-DP-006: Data Point Management
- Admins SHALL be able to list and search data points
- Admins SHALL be able to update existing data points
- Admins SHALL be able to soft-delete data points (archive)
- The system SHALL support tagging for organization

### 2.5 Dashboard Management

#### FR-DASH-001: Dashboard Creation
- Admins SHALL be able to create dashboards
- Each dashboard SHALL include:
  - Name and unique slug
  - Description
  - Layout configuration
  - Widget definitions
  - Tags

#### FR-DASH-002: Widget Types
- The system SHALL support the following visualization types using ECharts:
  - Table (Material UI DataGrid)
  - Bar chart (ECharts bar)
  - Line chart (ECharts line)
  - Area chart (ECharts area)
  - Pie/Donut chart (ECharts pie)
  - KPI (Material UI Card with metric display)
  - Scatter plot (ECharts scatter)
  - Heatmap (ECharts heatmap)
  - Map (future version - ECharts map)

#### FR-DASH-003: Layout Management
- The system SHALL provide a grid-based layout system
- Admins SHALL be able to drag and resize widgets
- The system SHALL support 12-column grid layout
- The system SHALL allow configurable row heights

#### FR-DASH-004: Widget Configuration
- Each widget SHALL be bound to a data point
- Admins SHALL be able to override data point queries per widget
- Admins SHALL be able to configure widget-specific settings (titles, colors, axes)

#### FR-DASH-005: Dashboard Versioning
- The system SHALL maintain version history for dashboards
- Each update SHALL increment the version number
- The system SHALL track created/updated timestamps and users

#### FR-DASH-006: Dashboard Management
- Admins SHALL be able to list and search dashboards
- Admins SHALL be able to update existing dashboards
- Admins SHALL be able to soft-delete dashboards (archive)
- Admins SHALL be able to share dashboards with specific roles

### 2.6 Dashboard Viewing

#### FR-VIEW-001: Dashboard Access
- Viewers SHALL be able to access dashboards based on their environment-configured role
- The system SHALL check user role from environment configuration
- Dashboard access SHALL be determined by the configured user role

#### FR-VIEW-002: Runtime Filtering
- Viewers SHALL be able to apply global time range filters
- Viewers SHALL be able to apply term filters to data
- Filters SHALL update all widgets in real-time
- The system SHALL support per-widget filter overrides

#### FR-VIEW-003: Data Refresh
- The system SHALL execute queries in real-time when dashboards are loaded
- The system SHALL support manual refresh of dashboard data
- The system SHALL batch multiple widget queries for performance

### 2.7 Data Export

#### FR-EXPORT-001: Export Formats
- The system SHALL support CSV export
- The system SHALL support Excel (XLSX) export
- The system SHALL support export of individual widgets
- The system SHALL support export of entire dashboards

#### FR-EXPORT-002: Export Options
- Viewers SHALL be able to export filtered data
- The system SHALL stream large exports for performance
- The system SHALL include metadata in exports (timestamps, filters applied)

#### FR-EXPORT-003: Export Limits
- The system SHALL implement configurable export size limits
- The system SHALL provide progress indication for large exports

### 2.8 Configuration Persistence

#### FR-CONFIG-001: Configuration Storage
- All configurations SHALL be stored in Elasticsearch indices
- The system SHALL use the following configuration indices:
  - reports_datapoints
  - reports_dashboards
  - reports_folders (optional)
  - reports_audit

#### FR-CONFIG-002: Configuration Schema
- Configuration documents SHALL include common metadata:
  - version number
  - created/updated timestamps
  - created/updated user identifiers
  - archive status

#### FR-CONFIG-003: Audit Trail
- The system SHALL track all configuration changes
- Audit logs SHALL include:
  - Action type (create, update, delete)
  - Entity type and ID
  - User information
  - Timestamp
  - Change diff

## 3. Non-Functional Requirements

### 3.1 Performance Requirements

#### NFR-PERF-001: Query Performance
- Dashboard queries SHALL complete within 5 seconds for datasets up to 1 million documents
- The system SHALL support pagination for large result sets
- The system SHALL implement query optimization strategies

#### NFR-PERF-002: Concurrent Users
- The system SHALL support at least 100 concurrent viewers
- The system SHALL support at least 20 concurrent administrators
- The system SHALL implement connection pooling for ES queries

#### NFR-PERF-003: Export Performance
- CSV exports SHALL begin streaming within 2 seconds
- The system SHALL handle exports up to 100,000 rows
- Large exports SHALL use streaming to minimize memory usage

#### NFR-PERF-004: UI Responsiveness
- Page load times SHALL be under 3 seconds
- UI interactions SHALL respond within 200ms
- The system SHALL implement lazy loading for large lists

### 3.2 Security Requirements

#### NFR-SEC-001: Access Control
- The system SHALL enforce environment-configured role-based access
- The system SHALL validate user roles from environment configuration
- The system SHALL restrict admin functions to users with admin role configuration

#### NFR-SEC-002: Elasticsearch Security
- The system SHALL ONLY access indices listed in the allowed indices configuration
- The system SHALL NOT execute any direct user queries against Elasticsearch
- The system SHALL ONLY write to designated configuration indices
- The system SHALL validate all operations against the allowed indices list

#### NFR-SEC-003: Query Security
- The system SHALL ONLY execute pre-validated, saved queries from data points
- The system SHALL sanitize all user inputs to prevent injection attacks
- The system SHALL validate all query parameters before execution
- The system SHALL implement rate limiting on query endpoints

#### NFR-SEC-004: Data Security
- The system SHALL use HTTPS for all communications
- The system SHALL not log sensitive data or Elasticsearch credentials
- The system SHALL protect Elasticsearch connection details
- The system SHALL never expose raw Elasticsearch errors to end users

### 3.3 Scalability Requirements

#### NFR-SCALE-001: Horizontal Scaling
- The backend API SHALL support horizontal scaling
- The system SHALL be stateless to enable load balancing
- The system SHALL support deployment in container orchestration platforms

#### NFR-SCALE-002: Data Volume
- The system SHALL handle indices with up to 10 billion documents
- The system SHALL support up to 1000 data points
- The system SHALL support up to 500 dashboards

#### NFR-SCALE-003: Caching
- The system SHALL implement caching for field mappings
- The system SHALL cache frequently accessed configurations
- The system SHALL support Redis for distributed caching (optional)

### 3.4 Availability Requirements

#### NFR-AVAIL-001: Uptime
- The system SHALL target 99.9% availability
- The system SHALL implement health check endpoints
- The system SHALL support zero-downtime deployments

#### NFR-AVAIL-002: Fault Tolerance
- The system SHALL handle ES cluster failures gracefully
- The system SHALL implement circuit breakers for external dependencies
- The system SHALL provide meaningful error messages to users

### 3.5 Usability Requirements

#### NFR-USE-001: User Interface
- The UI SHALL be responsive and work on desktop and tablet devices
- The UI SHALL follow Material Design principles via Material UI components
- The UI SHALL use Material UI theming for consistent look and feel
- The UI SHALL follow accessibility guidelines (WCAG 2.1 Level AA)
- The UI SHALL provide intuitive navigation and clear labeling

#### NFR-USE-002: User Experience
- The system SHALL provide real-time validation feedback
- The system SHALL include help documentation and tooltips
- The system SHALL remember user preferences (filters, layouts)

#### NFR-USE-003: Browser Support
- The system SHALL support Chrome (latest 2 versions)
- The system SHALL support Firefox (latest 2 versions)
- The system SHALL support Safari (latest 2 versions)
- The system SHALL support Edge (latest 2 versions)

### 3.6 Maintainability Requirements

#### NFR-MAINT-001: Code Quality
- The codebase SHALL follow TypeScript best practices
- The system SHALL maintain 80% code coverage with tests
- The system SHALL use linting and formatting tools

#### NFR-MAINT-002: Documentation
- The system SHALL include API documentation (OpenAPI/Swagger)
- The system SHALL include deployment documentation
- The system SHALL include user guides for admins and viewers

#### NFR-MAINT-003: Monitoring
- The system SHALL expose metrics for monitoring (Prometheus format)
- The system SHALL implement structured logging
- The system SHALL include distributed tracing support (optional)

## 4. Technical Constraints

### 4.1 Technology Stack
- Frontend: React 18+ with TypeScript
- UI Framework: Material UI (MUI) v5+
- Charting Library: Apache ECharts with echarts-for-react
- Backend: Node.js 18+ with TypeScript
- Database: Elasticsearch 7.10+ or 8.x
- Build Tools: Vite or Create React App
- Package Manager: npm or yarn

### 4.2 Deployment Constraints
- The system SHALL be deployable as Docker containers
- The system SHALL support Kubernetes deployment
- The system SHALL support environment-based configuration for:
  - Elasticsearch connection URL
  - Elasticsearch credentials
  - Allowed indices list
  - User roles
- The system SHALL support reverse proxy deployment

### 4.3 Integration Constraints
- The system SHALL use official Elasticsearch client libraries
- The system SHALL support Elasticsearch security features (if enabled)
- The system SHALL handle Elasticsearch version differences gracefully
- The system SHALL validate connection to configured indices on startup

## 5. Acceptance Criteria

### 5.1 Admin Functionality
- [ ] Admin role users can access admin studio based on environment configuration
- [ ] Admin can discover fields from allowed indices only
- [ ] Admin can create data points with queries and aggregations
- [ ] Admin can preview data point results
- [ ] Admin can create dashboards with multiple widgets
- [ ] Admin can configure widget visualizations
- [ ] Admin can save and update configurations to designated ES indices
- [ ] Admin can manage tags and organization

### 5.2 Viewer Functionality
- [ ] Viewer role users can access dashboards based on environment configuration
- [ ] Viewer can view dashboard with real-time data from allowed indices
- [ ] Viewer can apply filters to dashboard
- [ ] Viewer can export data to CSV
- [ ] Viewer can export data to Excel
- [ ] Viewer sees appropriate error messages

### 5.3 System Functionality
- [ ] System reads configuration from environment variables
- [ ] System validates allowed indices configuration on startup
- [ ] System persists all configurations to designated Elasticsearch indices only
- [ ] System maintains version history
- [ ] System enforces environment-configured role-based access
- [ ] System prevents any direct query execution
- [ ] System handles concurrent users
- [ ] System provides acceptable performance
- [ ] System logs audit trail

## 6. Success Metrics

### 6.1 Performance Metrics
- Average query response time < 3 seconds
- Dashboard load time < 5 seconds
- Export initiation time < 2 seconds
- System uptime > 99.9%

### 6.2 Usage Metrics
- Number of active data points created
- Number of active dashboards created
- Daily active users (admins and viewers)
- Number of exports generated per day
- Average dashboard views per day

### 6.3 Quality Metrics
- Error rate < 1%
- User-reported issues < 5 per month
- Time to resolve critical issues < 4 hours
- Code coverage > 80%

## 7. Risks and Mitigation

### 7.1 Technical Risks
- **Risk**: Elasticsearch query performance degradation
  - **Mitigation**: Implement query optimization, caching, and pagination

- **Risk**: Large export memory consumption
  - **Mitigation**: Use streaming for exports, implement size limits

- **Risk**: Complex aggregation queries timeout
  - **Mitigation**: Implement query timeouts, provide query optimization guidance

### 7.2 Security Risks
- **Risk**: Unauthorized data access
  - **Mitigation**: Strict allowed indices configuration, environment-based role enforcement

- **Risk**: Query injection attacks
  - **Mitigation**: No direct query execution, only pre-defined data point queries, input validation

- **Risk**: Access to non-allowed indices
  - **Mitigation**: Validate all operations against allowed indices list, reject any access outside configuration

### 7.3 Operational Risks
- **Risk**: Elasticsearch cluster unavailability
  - **Mitigation**: Graceful degradation, clear error messages, retry logic

## 8. Dependencies

### 8.1 External Dependencies
- Elasticsearch cluster (7.10+ or 8.x)
- Redis cache (optional)
- Container runtime (Docker/Kubernetes)

### 8.2 Internal Dependencies
- Network connectivity to Elasticsearch
- Appropriate Elasticsearch permissions for configuration indices
- Configuration indices created with proper mappings
- Environment configuration properly set

## 9. Assumptions

- Elasticsearch cluster is already deployed and operational
- Data is already indexed in Elasticsearch
- Allowed indices are properly configured in environment
- User roles are determined through environment configuration
- Users have appropriate network access to the application
- Elasticsearch indices follow consistent naming patterns
- Time-series data includes appropriate timestamp fields
- System administrators will manage user role assignments through environment configuration

## 10. Out of Scope (Version 1)

- User authentication implementation (handled by environment config)
- User management interface
- Direct query execution interface
- Cross-database federation
- ETL or data transformation capabilities
- Writing to source data indices
- Custom visualization plugins
- Real-time streaming dashboards
- Advanced scheduling and alerting
- Mobile native applications
- Offline dashboard viewing
- Dashboard embedding in external applications
- Custom scripting or formula support
- Machine learning or predictive analytics

## 11. UI Component Specifications

### 11.1 Material UI Components Usage
- **Navigation**: AppBar, Drawer, Tabs for main navigation
- **Forms**: TextField, Select, Checkbox, DatePicker for data point configuration
- **Layout**: Grid, Box, Container for responsive layouts
- **Feedback**: Alert, Snackbar for notifications
- **Data Display**: DataGrid for tables, Card for KPIs
- **Actions**: Button, IconButton, SpeedDial for user actions
- **Loading**: Skeleton, CircularProgress for loading states

### 11.2 ECharts Integration
- **Chart Container**: ResponsiveContainer from echarts-for-react
- **Chart Types**:
  - Line/Area: Time series data visualization
  - Bar: Categorical comparisons
  - Pie/Donut: Part-to-whole relationships
  - Scatter: Correlation analysis
  - Heatmap: Matrix data visualization
- **Interactivity**: Tooltips, zoom, data selection
- **Theming**: Charts SHALL inherit Material UI theme colors

### 11.3 Dashboard Layout
- **Grid System**: Material UI Grid with 12-column layout
- **Widget Container**: Material UI Paper component
- **Drag & Drop**: react-grid-layout integration with Material UI
- **Responsive Breakpoints**: xs, sm, md, lg, xl following Material UI standards

## 12. Environment Configuration Specification

### 12.1 Required Environment Variables
```
# Elasticsearch Configuration
ES_HOST=https://elasticsearch.example.com:9200
ES_USERNAME=reports_user
ES_PASSWORD=secure_password

# Allowed Indices (comma-separated)
ES_ALLOWED_INDICES=logs-*,metrics-*,events-*

# User Role Configuration
USER_ROLE=reports-admin  # or reports-viewer

# Application Configuration
APP_PORT=3000
API_PORT=4000
```

### 12.2 Configuration File Example (config.yaml)
```yaml
elasticsearch:
  host: ${ES_HOST}
  username: ${ES_USERNAME}
  password: ${ES_PASSWORD}
  
allowedIndices:
  - logs-*
  - metrics-*
  - events-*
  
userRole: ${USER_ROLE}

configIndices:
  datapoints: reports_datapoints
  dashboards: reports_dashboards
  audit: reports_audit
```

### 12.3 Configuration Validation
- System SHALL validate all required environment variables on startup
- System SHALL verify connection to Elasticsearch before starting
- System SHALL validate that allowed indices exist and are accessible
- System SHALL fail fast with clear error messages if configuration is invalid