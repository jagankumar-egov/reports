# DHR Elasticsearch Index Design

## Index Naming Strategy

### Convention
```
dhr-{tenant_id}-{entity}-{version}
```

### Index Names
- `dhr-{tenant_id}-filters-v1` - Saved query filters
- `dhr-{tenant_id}-dashboards-v1` - Dashboard configurations
- `dhr-{tenant_id}-gadgets-v1` - Dashboard gadgets
- `dhr-{tenant_id}-exports-v1` - Export process tracking
- `dhr-{tenant_id}-audit-v1` - Audit trail for all changes
- `dhr-{tenant_id}-users-v1` - User preferences and settings

### Index Settings (Common)
```json
{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 1,
    "refresh_interval": "5s",
    "index": {
      "max_result_window": 10000,
      "mapping": {
        "total_fields": {
          "limit": "2000"
        }
      }
    },
    "analysis": {
      "analyzer": {
        "dhr_text_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "trim"]
        }
      }
    }
  }
}
```

---

## 1. Filter Configuration Index

### Index Name: `dhr-{tenant_id}-filters-v1`

```json
{
  "mappings": {
    "properties": {
      "id": {
        "type": "keyword"
      },
      "name": {
        "type": "text",
        "analyzer": "dhr_text_analyzer",
        "fields": {
          "keyword": {
            "type": "keyword"
          }
        }
      },
      "description": {
        "type": "text",
        "analyzer": "dhr_text_analyzer"
      },
      "jql": {
        "type": "text",
        "index": false
      },
      "jql_parsed": {
        "type": "object",
        "properties": {
          "projects": {
            "type": "keyword"
          },
          "fields_used": {
            "type": "keyword"
          },
          "operators": {
            "type": "keyword"
          }
        }
      },
      "favourite": {
        "type": "boolean"
      },
      "is_public": {
        "type": "boolean"
      },
      "allowed_indexes": {
        "type": "keyword"
      },
      "tags": {
        "type": "keyword"
      },
      "usage_stats": {
        "type": "object",
        "properties": {
          "total_executions": {
            "type": "long"
          },
          "last_executed_at": {
            "type": "date"
          },
          "avg_execution_time_ms": {
            "type": "long"
          },
          "total_records_returned": {
            "type": "long"
          }
        }
      },
      "permissions": {
        "type": "object",
        "properties": {
          "owner_id": {
            "type": "keyword"
          },
          "shared_with": {
            "type": "nested",
            "properties": {
              "entity_type": {
                "type": "keyword"
              },
              "entity_id": {
                "type": "keyword"
              },
              "permissions": {
                "type": "keyword"
              }
            }
          }
        }
      },
      "metadata": {
        "type": "object",
        "properties": {
          "tenant_id": {
            "type": "keyword"
          },
          "created_by": {
            "type": "keyword"
          },
          "created_at": {
            "type": "date"
          },
          "updated_by": {
            "type": "keyword"
          },
          "updated_at": {
            "type": "date"
          },
          "version": {
            "type": "integer"
          },
          "status": {
            "type": "keyword"
          }
        }
      },
      "audit_info": {
        "type": "object",
        "properties": {
          "created_by_name": {
            "type": "text"
          },
          "updated_by_name": {
            "type": "text"
          },
          "client_ip": {
            "type": "ip"
          },
          "user_agent": {
            "type": "text",
            "index": false
          },
          "change_reason": {
            "type": "text"
          }
        }
      }
    }
  }
}
```

---

## 2. Dashboard Configuration Index

### Index Name: `dhr-{tenant_id}-dashboards-v1`

```json
{
  "mappings": {
    "properties": {
      "id": {
        "type": "keyword"
      },
      "name": {
        "type": "text",
        "analyzer": "dhr_text_analyzer",
        "fields": {
          "keyword": {
            "type": "keyword"
          }
        }
      },
      "description": {
        "type": "text",
        "analyzer": "dhr_text_analyzer"
      },
      "layout": {
        "type": "object",
        "properties": {
          "type": {
            "type": "keyword"
          },
          "columns": {
            "type": "integer"
          },
          "rows": {
            "type": "integer"
          },
          "responsive": {
            "type": "boolean"
          }
        }
      },
      "theme": {
        "type": "object",
        "properties": {
          "name": {
            "type": "keyword"
          },
          "primary_color": {
            "type": "keyword"
          },
          "secondary_color": {
            "type": "keyword"
          }
        }
      },
      "gadget_count": {
        "type": "integer"
      },
      "is_public": {
        "type": "boolean"
      },
      "is_default": {
        "type": "boolean"
      },
      "tags": {
        "type": "keyword"
      },
      "category": {
        "type": "keyword"
      },
      "refresh_interval": {
        "type": "integer"
      },
      "auto_refresh": {
        "type": "boolean"
      },
      "permissions": {
        "type": "object",
        "properties": {
          "owner_id": {
            "type": "keyword"
          },
          "shared_with": {
            "type": "nested",
            "properties": {
              "entity_type": {
                "type": "keyword"
              },
              "entity_id": {
                "type": "keyword"
              },
              "permissions": {
                "type": "keyword"
              }
            }
          }
        }
      },
      "usage_stats": {
        "type": "object",
        "properties": {
          "total_views": {
            "type": "long"
          },
          "unique_viewers": {
            "type": "long"
          },
          "last_viewed_at": {
            "type": "date"
          },
          "avg_load_time_ms": {
            "type": "long"
          }
        }
      },
      "metadata": {
        "type": "object",
        "properties": {
          "tenant_id": {
            "type": "keyword"
          },
          "created_by": {
            "type": "keyword"
          },
          "created_at": {
            "type": "date"
          },
          "updated_by": {
            "type": "keyword"
          },
          "updated_at": {
            "type": "date"
          },
          "version": {
            "type": "integer"
          },
          "status": {
            "type": "keyword"
          }
        }
      },
      "audit_info": {
        "type": "object",
        "properties": {
          "created_by_name": {
            "type": "text"
          },
          "updated_by_name": {
            "type": "text"
          },
          "client_ip": {
            "type": "ip"
          },
          "user_agent": {
            "type": "text",
            "index": false
          },
          "change_reason": {
            "type": "text"
          }
        }
      }
    }
  }
}
```

---

## 3. Gadget Configuration Index

### Index Name: `dhr-{tenant_id}-gadgets-v1`

```json
{
  "mappings": {
    "properties": {
      "id": {
        "type": "keyword"
      },
      "dashboard_id": {
        "type": "keyword"
      },
      "name": {
        "type": "text",
        "analyzer": "dhr_text_analyzer",
        "fields": {
          "keyword": {
            "type": "keyword"
          }
        }
      },
      "title": {
        "type": "text",
        "analyzer": "dhr_text_analyzer"
      },
      "type": {
        "type": "keyword"
      },
      "filter_id": {
        "type": "keyword"
      },
      "config": {
        "type": "object",
        "properties": {
          "chart_type": {
            "type": "keyword"
          },
          "aggregation_field": {
            "type": "keyword"
          },
          "group_by_field": {
            "type": "keyword"
          },
          "sort_order": {
            "type": "keyword"
          },
          "limit": {
            "type": "integer"
          },
          "colors": {
            "type": "keyword"
          },
          "show_legend": {
            "type": "boolean"
          },
          "show_labels": {
            "type": "boolean"
          },
          "custom_fields": {
            "type": "object",
            "dynamic": true
          }
        }
      },
      "position": {
        "type": "object",
        "properties": {
          "row": {
            "type": "integer"
          },
          "col": {
            "type": "integer"
          },
          "width": {
            "type": "integer"
          },
          "height": {
            "type": "integer"
          },
          "z_index": {
            "type": "integer"
          }
        }
      },
      "display_options": {
        "type": "object",
        "properties": {
          "refresh_interval": {
            "type": "integer"
          },
          "auto_refresh": {
            "type": "boolean"
          },
          "show_title": {
            "type": "boolean"
          },
          "show_border": {
            "type": "boolean"
          },
          "background_color": {
            "type": "keyword"
          }
        }
      },
      "data_cache": {
        "type": "object",
        "properties": {
          "enabled": {
            "type": "boolean"
          },
          "ttl_seconds": {
            "type": "integer"
          },
          "last_cached_at": {
            "type": "date"
          }
        }
      },
      "usage_stats": {
        "type": "object",
        "properties": {
          "total_renders": {
            "type": "long"
          },
          "avg_render_time_ms": {
            "type": "long"
          },
          "last_rendered_at": {
            "type": "date"
          },
          "error_count": {
            "type": "long"
          }
        }
      },
      "metadata": {
        "type": "object",
        "properties": {
          "tenant_id": {
            "type": "keyword"
          },
          "created_by": {
            "type": "keyword"
          },
          "created_at": {
            "type": "date"
          },
          "updated_by": {
            "type": "keyword"
          },
          "updated_at": {
            "type": "date"
          },
          "version": {
            "type": "integer"
          },
          "status": {
            "type": "keyword"
          }
        }
      },
      "audit_info": {
        "type": "object",
        "properties": {
          "created_by_name": {
            "type": "text"
          },
          "updated_by_name": {
            "type": "text"
          },
          "client_ip": {
            "type": "ip"
          },
          "user_agent": {
            "type": "text",
            "index": false
          },
          "change_reason": {
            "type": "text"
          }
        }
      }
    }
  }
}
```

---

## 4. Export Process Index

### Index Name: `dhr-{tenant_id}-exports-v1`

```json
{
  "mappings": {
    "properties": {
      "id": {
        "type": "keyword"
      },
      "filter_id": {
        "type": "keyword"
      },
      "filter_name": {
        "type": "keyword"
      },
      "format": {
        "type": "keyword"
      },
      "status": {
        "type": "keyword"
      },
      "priority": {
        "type": "keyword"
      },
      "fields": {
        "type": "keyword"
      },
      "max_results": {
        "type": "long"
      },
      "progress": {
        "type": "integer"
      },
      "records_processed": {
        "type": "long"
      },
      "total_records": {
        "type": "long"
      },
      "file_info": {
        "type": "object",
        "properties": {
          "file_store_id": {
            "type": "keyword"
          },
          "file_name": {
            "type": "keyword"
          },
          "file_size_bytes": {
            "type": "long"
          },
          "file_checksum": {
            "type": "keyword"
          }
        }
      },
      "timing": {
        "type": "object",
        "properties": {
          "estimated_time_seconds": {
            "type": "integer"
          },
          "actual_time_seconds": {
            "type": "integer"
          },
          "queue_time_seconds": {
            "type": "integer"
          },
          "processing_time_seconds": {
            "type": "integer"
          },
          "upload_time_seconds": {
            "type": "integer"
          }
        }
      },
      "error_info": {
        "type": "object",
        "properties": {
          "error_code": {
            "type": "keyword"
          },
          "error_message": {
            "type": "text"
          },
          "error_stack": {
            "type": "text",
            "index": false
          },
          "retry_count": {
            "type": "integer"
          },
          "is_retryable": {
            "type": "boolean"
          }
        }
      },
      "resource_usage": {
        "type": "object",
        "properties": {
          "memory_peak_mb": {
            "type": "integer"
          },
          "cpu_time_seconds": {
            "type": "integer"
          },
          "io_read_bytes": {
            "type": "long"
          },
          "io_write_bytes": {
            "type": "long"
          }
        }
      },
      "metadata": {
        "type": "object",
        "properties": {
          "tenant_id": {
            "type": "keyword"
          },
          "user_id": {
            "type": "keyword"
          },
          "user_name": {
            "type": "keyword"
          },
          "initiated_at": {
            "type": "date"
          },
          "started_at": {
            "type": "date"
          },
          "completed_at": {
            "type": "date"
          },
          "expires_at": {
            "type": "date"
          },
          "worker_node": {
            "type": "keyword"
          },
          "job_id": {
            "type": "keyword"
          }
        }
      },
      "audit_info": {
        "type": "object",
        "properties": {
          "client_ip": {
            "type": "ip"
          },
          "user_agent": {
            "type": "text",
            "index": false
          },
          "request_id": {
            "type": "keyword"
          },
          "session_id": {
            "type": "keyword"
          }
        }
      }
    }
  }
}
```

---

## 5. Comprehensive Audit Trail Index

### Index Name: `dhr-{tenant_id}-audit-v1`

```json
{
  "mappings": {
    "properties": {
      "audit_id": {
        "type": "keyword"
      },
      "event_type": {
        "type": "keyword"
      },
      "entity_type": {
        "type": "keyword"
      },
      "entity_id": {
        "type": "keyword"
      },
      "entity_name": {
        "type": "text",
        "analyzer": "dhr_text_analyzer"
      },
      "action": {
        "type": "keyword"
      },
      "sub_action": {
        "type": "keyword"
      },
      "operation_status": {
        "type": "keyword"
      },
      "user_info": {
        "type": "object",
        "properties": {
          "user_id": {
            "type": "keyword"
          },
          "user_name": {
            "type": "keyword"
          },
          "user_email": {
            "type": "keyword"
          },
          "user_role": {
            "type": "keyword"
          },
          "user_department": {
            "type": "keyword"
          }
        }
      },
      "session_info": {
        "type": "object",
        "properties": {
          "session_id": {
            "type": "keyword"
          },
          "request_id": {
            "type": "keyword"
          },
          "client_ip": {
            "type": "ip"
          },
          "user_agent": {
            "type": "text",
            "index": false
          },
          "origin": {
            "type": "keyword"
          },
          "referer": {
            "type": "keyword"
          }
        }
      },
      "changes": {
        "type": "object",
        "properties": {
          "before": {
            "type": "object",
            "dynamic": true
          },
          "after": {
            "type": "object",
            "dynamic": true
          },
          "changed_fields": {
            "type": "keyword"
          },
          "change_summary": {
            "type": "text"
          },
          "change_reason": {
            "type": "text"
          }
        }
      },
      "system_info": {
        "type": "object",
        "properties": {
          "tenant_id": {
            "type": "keyword"
          },
          "service_name": {
            "type": "keyword"
          },
          "service_version": {
            "type": "keyword"
          },
          "environment": {
            "type": "keyword"
          },
          "server_hostname": {
            "type": "keyword"
          },
          "server_ip": {
            "type": "ip"
          }
        }
      },
      "performance": {
        "type": "object",
        "properties": {
          "execution_time_ms": {
            "type": "long"
          },
          "memory_usage_mb": {
            "type": "integer"
          },
          "database_queries": {
            "type": "integer"
          },
          "external_api_calls": {
            "type": "integer"
          }
        }
      },
      "security": {
        "type": "object",
        "properties": {
          "risk_level": {
            "type": "keyword"
          },
          "security_flags": {
            "type": "keyword"
          },
          "permission_checked": {
            "type": "boolean"
          },
          "authentication_method": {
            "type": "keyword"
          },
          "authorization_result": {
            "type": "keyword"
          }
        }
      },
      "business_context": {
        "type": "object",
        "properties": {
          "department": {
            "type": "keyword"
          },
          "project": {
            "type": "keyword"
          },
          "campaign": {
            "type": "keyword"
          },
          "cost_center": {
            "type": "keyword"
          },
          "business_impact": {
            "type": "keyword"
          }
        }
      },
      "compliance": {
        "type": "object",
        "properties": {
          "data_classification": {
            "type": "keyword"
          },
          "retention_period_days": {
            "type": "integer"
          },
          "compliance_tags": {
            "type": "keyword"
          },
          "gdpr_relevant": {
            "type": "boolean"
          },
          "pii_involved": {
            "type": "boolean"
          }
        }
      },
      "timestamp": {
        "type": "date"
      },
      "event_date": {
        "type": "date",
        "format": "yyyy-MM-dd"
      },
      "event_hour": {
        "type": "integer"
      },
      "day_of_week": {
        "type": "integer"
      }
    }
  }
}
```

---

## 6. User Preferences Index

### Index Name: `dhr-{tenant_id}-users-v1`

```json
{
  "mappings": {
    "properties": {
      "user_id": {
        "type": "keyword"
      },
      "user_name": {
        "type": "keyword"
      },
      "email": {
        "type": "keyword"
      },
      "preferences": {
        "type": "object",
        "properties": {
          "default_dashboard_id": {
            "type": "keyword"
          },
          "theme": {
            "type": "keyword"
          },
          "timezone": {
            "type": "keyword"
          },
          "date_format": {
            "type": "keyword"
          },
          "items_per_page": {
            "type": "integer"
          },
          "auto_refresh": {
            "type": "boolean"
          },
          "notifications_enabled": {
            "type": "boolean"
          }
        }
      },
      "recent_items": {
        "type": "nested",
        "properties": {
          "entity_type": {
            "type": "keyword"
          },
          "entity_id": {
            "type": "keyword"
          },
          "entity_name": {
            "type": "text"
          },
          "accessed_at": {
            "type": "date"
          },
          "access_count": {
            "type": "integer"
          }
        }
      },
      "bookmarks": {
        "type": "nested",
        "properties": {
          "entity_type": {
            "type": "keyword"
          },
          "entity_id": {
            "type": "keyword"
          },
          "entity_name": {
            "type": "text"
          },
          "bookmarked_at": {
            "type": "date"
          },
          "tags": {
            "type": "keyword"
          }
        }
      },
      "metadata": {
        "type": "object",
        "properties": {
          "tenant_id": {
            "type": "keyword"
          },
          "created_at": {
            "type": "date"
          },
          "updated_at": {
            "type": "date"
          },
          "last_login_at": {
            "type": "date"
          },
          "status": {
            "type": "keyword"
          }
        }
      }
    }
  }
}
```

---

## Index Lifecycle Management

### Index Templates
```json
{
  "index_patterns": ["dhr-*-*-v*"],
  "template": {
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 1,
      "index.lifecycle.name": "dhr-policy",
      "index.lifecycle.rollover_alias": "dhr-active"
    }
  }
}
```

### Retention Policies
- **Configuration Indexes**: Retained indefinitely with regular backups
- **Audit Index**: 7 years retention (compliance requirement)
- **Export Process Index**: 1 year retention
- **User Preferences**: Retained indefinitely

### Backup Strategy
- Daily snapshots for configuration indexes
- Weekly snapshots for audit indexes
- Monthly full cluster snapshots
- Cross-region backup replication for disaster recovery

---

## Query Patterns & Performance

### Common Queries
1. **Get User Filters**: `GET dhr-{tenant}-filters-v1/_search?q=metadata.created_by:{user_id}`
2. **Dashboard by ID**: `GET dhr-{tenant}-dashboards-v1/_doc/{dashboard_id}`
3. **Audit Trail**: `GET dhr-{tenant}-audit-v1/_search?q=entity_id:{entity_id} AND timestamp:[{from} TO {to}]`
4. **Active Exports**: `GET dhr-{tenant}-exports-v1/_search?q=status:(initiated OR processing)`

### Performance Optimizations
- Use routing for tenant-based sharding
- Implement field-level security for sensitive data
- Create index aliases for active vs archived data
- Use date-based index patterns for time-series data

---

This index design provides comprehensive audit capabilities, efficient querying, and proper data organization for the DHR system.