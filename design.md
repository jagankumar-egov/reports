Elasticsearch Reports Tool – Technical Design

1) Problem Statement & Goals

Build a React-based reporting tool that connects to one or more fixed Elasticsearch (ES) indices, auto-discovers available fields, lets a Reports Admin define reusable Data Points (queries/aggregations + field selections), assemble those into Dashboards with charts/tables, persist all configurations back to ES, and allow a Dashboard Viewer to view, filter, and download results (CSV/Excel).

Primary goals

Plug into existing Elasticsearch cluster.

Auto-discover index fields and types from mappings.

No-code/low-code builder for data points and dashboards.

Save configurations as versioned documents in ES.

Role-based access (Admin vs Viewer).

Export to CSV/Excel.

Performant queries on large datasets.

Non-goals (for v1)

Cross-database federation.

Heavy-duty ETL; assume data already indexed in ES.

2) Roles & Permissions

Reports Admin

View configured ES indices

Discover fields/types

Create/Edit/Delete Data Points

Create/Edit/Delete Dashboards

Share dashboards (public link or role-based)

Dashboard Viewer

View dashboards

Apply read-time filters (time range, term filters)

Download results

AuthN/AuthZ

JWT-based auth (e.g., Keycloak/Auth0/custom) → React app stores short-lived access token.

Backend enforces RBAC via roles in JWT (roles: ["reports-admin", "reports-viewer"]).

Optional multitenancy: include tenantId claim → restrict read/write of config indices by tenant.

3) High-Level Architecture

React UI (SPA)
  ├─ Admin Studio (Data Point Builder, Dashboard Builder)
  └─ Viewer (Dashboard Runtime, Filters, Export)

Node.js/TypeScript API (BFF)
  ├─ Auth middleware (JWT verify, roles, tenant)
  ├─ ES Client layer (@elastic/elasticsearch)
  ├─ Config controllers (DataPoints, Dashboards)
  ├─ Query builder (validate, translate UI spec → ES DSL)
  ├─ Exports (CSV/Excel via streaming)
  └─ Caching layer (optional Redis) for mappings/queries

Elasticsearch Cluster
  ├─ Source indices (immutable, provided)
  └─ Config indices (this app owns)
      • reports_datapoints
      • reports_dashboards
      • reports_folders (optional)
      • reports_audit

Data flow

Admin selects an index → UI fetches mapping via API → display fields/types.

Admin builds Data Point (query + fields + aggregations) → save to reports_datapoints.

Admin creates Dashboard, adds visualizations bound to Data Points → save to reports_dashboards.

Viewer opens Dashboard → API resolves Data Points → runs ES queries → returns chart/table data.

Viewer optionally filters/time-range → API re-executes Data Point queries with overrides.

Viewer exports → API streams CSV/Excel.

4) Elasticsearch Integration

4.1 Field Discovery

Use ES Mapping API: GET /{index}/_mapping to list fields and types.

Use Field Capabilities API: POST /_field_caps?fields=* for multi-index compatibility and aggregation support (searchable, aggregatable).

Use GET /{index}/_search with size: 0 and aggs preview to validate aggregations.

4.2 Supported Field Types (v1)

keyword, text (keyword subfields for exact match)

long, integer, float, double

date

boolean

nested (flattened via path selection or nested query)

4.3 Query Patterns

Filters: term, terms, range (dates/numerics), exists, wildcard (guarded), query_string (guarded).

Aggregations: terms, date_histogram, histogram, sum, avg, min, max, percentile_ranks, cardinality, top_hits (for sample rows), bucket_sort, composite (for pagination of buckets).

Sorting & pagination: search-after or from/size (small), composite agg for buckets.

5) Config Indices & Schemas

All config documents include common metadata for RBAC, versioning, and audit.

5.1 Index: reports_datapoints

Mappings (simplified)

{
  "mappings": {
    "properties": {
      "tenantId": { "type": "keyword" },
      "name": { "type": "text", "fields": { "keyword": { "type": "keyword" } } },
      "slug": { "type": "keyword" },
      "description": { "type": "text" },
      "source": {
        "properties": {
          "indices": { "type": "keyword" },
          "timeField": { "type": "keyword" },
          "defaultTimeRange": { "type": "keyword" } 
        }
      },
      "query": { "type": "object", "enabled": false },
      "projections": { "type": "object", "enabled": false },
      "aggs": { "type": "object", "enabled": false },
      "sampleColumns": { "type": "keyword" },
      "tags": { "type": "keyword" },
      "version": { "type": "integer" },
      "createdBy": { "type": "keyword" },
      "createdAt": { "type": "date" },
      "updatedBy": { "type": "keyword" },
      "updatedAt": { "type": "date" },
      "isArchived": { "type": "boolean" }
    }
  }
}

Document example

{
  "tenantId": "hcm",
  "name": "Malaria Cases by LGA",
  "slug": "malaria-cases-by-lga",
  "description": "Counts by local government area in last 90 days",
  "source": { "indices": ["hcm-cases-*"], "timeField": "eventDate", "defaultTimeRange": "now-90d" },
  "query": {
    "bool": { "filter": [ {"range": {"eventDate": {"gte": "now-90d"}}} ] }
  },
  "projections": ["caseId","lga","age","gender"],
  "aggs": {
    "by_lga": { "terms": { "field": "lga.keyword", "size": 1000 } },
    "total": { "value_count": { "field": "caseId" } }
  },
  "sampleColumns": ["caseId","lga","eventDate"],
  "tags": ["cases","geo"],
  "version": 3
}

5.2 Index: reports_dashboards

Mappings (simplified)

{
  "mappings": {
    "properties": {
      "tenantId": { "type": "keyword" },
      "name": { "type": "text", "fields": { "keyword": { "type": "keyword" } } },
      "slug": { "type": "keyword" },
      "description": { "type": "text" },
      "layout": { "type": "object", "enabled": false },
      "widgets": { "type": "nested", "enabled": false },
      "tags": { "type": "keyword" },
      "version": { "type": "integer" },
      "createdBy": { "type": "keyword" },
      "createdAt": { "type": "date" },
      "updatedBy": { "type": "keyword" },
      "updatedAt": { "type": "date" },
      "isArchived": { "type": "boolean" }
    }
  }
}

Document example

{
  "tenantId": "hcm",
  "name": "HCM – Field Ops Overview",
  "slug": "hcm-field-ops",
  "description": "Key operational KPIs",
  "layout": { "type": "grid", "cols": 12, "rowHeight": 110 },
  "widgets": [
    {
      "id": "w1",
      "type": "line",
      "title": "Cases over time",
      "dataPointId": "malaria-cases-series",
      "position": { "x": 0, "y": 0, "w": 6, "h": 3 },
      "overrides": { "aggs": { "series": { "date_histogram": { "field": "eventDate", "calendar_interval": "day" } } } }
    },
    {
      "id": "w2",
      "type": "bar",
      "title": "Cases by LGA",
      "dataPointId": "malaria-cases-by-lga",
      "position": { "x": 6, "y": 0, "w": 6, "h": 3 }
    },
    {
      "id": "w3",
      "type": "table",
      "title": "Recent cases (sample)",
      "dataPointId": "malaria-cases-list",
      "position": { "x": 0, "y": 3, "w": 12, "h": 4 },
      "overrides": { "size": 50 }
    }
  ],
  "tags": ["ops","kpi"],
  "version": 7
}

5.3 Index: reports_audit (optional)

Track changes to configs.

{
  "action": "update",
  "entity": "datapoint",
  "entityId": "malaria-cases-by-lga",
  "user": "jagan",
  "timestamp": "2025-08-17T08:31:00Z",
  "diff": { "version": { "from": 2, "to": 3 } }
}

6) Backend (Node.js + TypeScript) – API Design

Base: /api/v1

6.1 Discovery

GET /indices → returns allowed indices list (from config/env or ES cat indices pattern).

GET /indices/:index/mapping → flattened fields list with type & flags (aggregatable, searchable).

POST /field-caps → for multi-index field caps.

6.2 Data Points

GET /datapoints?tenantId&query=... → list/search.

POST /datapoints → create.

GET /datapoints/:id → read.

PUT /datapoints/:id → update (bumps version).

DELETE /datapoints/:id → soft-delete (isArchived=true).

POST /datapoints/:id/run → execute with optional runtime filter overrides.

6.3 Dashboards

GET /dashboards?tenantId → list.

POST /dashboards → create.

GET /dashboards/:id → read.

PUT /dashboards/:id → update.

DELETE /dashboards/:id → archive.

POST /dashboards/:id/run → resolve widgets → batch run data points.

6.4 Exports

POST /datapoints/:id/export → stream CSV/Excel.

POST /dashboards/:id/export → export each widget as sheet, zip, or single xlsx.

6.5 Security

All endpoints protected by JWT.

Enforce role + tenant checks.

Rate limiting on run/export endpoints.

6.6 Query Builder Contract

Input (from UI):

{
  "indices": ["hcm-cases-*"],
  "timeField": "eventDate",
  "filters": [
    { "type": "term", "field": "lga.keyword", "value": "Gidan Bukambu" },
    { "type": "range", "field": "eventDate", "gte": "now-30d" }
  ],
  "aggs": {
    "by_lga": { "terms": { "field": "lga.keyword", "size": 50 } },
    "series": { "date_histogram": { "field": "eventDate", "calendar_interval": "day" } }
  },
  "size": 0
}

Output (ES DSL): server constructs search body safely and validates fields/types using cached mapping.

7) React UI – Screens & State

7.1 Modules

Auth & Routing: Protected routes for Admin Studio; public/limited for Viewer.

Index Explorer (Admin):

Select index (from allowed list)

Field catalog: name, type, aggregatable/searchable badges, example values (sample via terms)

Data Point Builder (Admin):

Source: indices, time field, default time range

Filters: field pickers, operators, value inputs (supports multi-select, date pickers)

Projections: choose columns (for table/exports)

Aggregations: visual builder (terms/histogram/date_histogram/metrics)

Preview: run and show sample chart/table

Save (name/slug/tags/description)

Dashboard Builder (Admin):

Canvas/grid layout (drag/resize)

Widget types: Table, Bar, Line, Area, Pie/Donut, KPI (metric), Map (future)

Bind widget to Data Point, define encoding (x/y/series), overrides

Save dashboard

Dashboard Viewer:

Runtime filters (global time range; per-widget filter overrides)

Interactions: click-to-filter (brush/drilldown v2)

Export: CSV/Excel for widget or entire dashboard

7.2 State Management

React Query for server data (mappings, runs, lists) with cache keys per datapoint+filters.

Zustand/Context for ephemer
