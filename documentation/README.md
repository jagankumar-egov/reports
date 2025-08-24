# DHR Phase 1 Documentation

## Overview

This documentation covers the Digit Health Reports (DHR) system Phase 1 implementation, which focuses on Direct Elasticsearch querying capabilities.

## Documentation Structure

### 📚 Available Guides

| Document | Audience | Description |
|----------|----------|-------------|
| **[Developer Guide](./developer-guide.md)** | Developers, DevOps | Technical setup, configuration, API docs, troubleshooting |
| **[User Guide](./user-guide.md)** | Business Analysts, End Users | Feature overview, query examples, best practices |

## Quick Start

### For Developers
👨‍💻 **Start here**: [Developer Guide](./developer-guide.md)
- Environment setup and configuration
- API endpoints and technical details
- Development workflow and troubleshooting

### For Business Users
👩‍💼 **Start here**: [User Guide](./user-guide.md)
- How to use the query interface
- Query examples and best practices
- Data analysis techniques

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DHR Phase 1 Architecture                 │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React + TypeScript)     Backend (Node.js + TS)  │
│  ├─ Direct Query Interface          ├─ Express.js Server   │
│  ├─ Interactive Guidelines          ├─ Direct Query API    │
│  ├─ Results Table & Export          ├─ Input Validation    │
│  └─ Column Selection                └─ Error Handling      │
│                    │                           │            │
│                    └────────────────┬──────────┘            │
│                                     │                       │
│                    ┌────────────────▼──────────────┐        │
│                    │        Elasticsearch          │        │
│                    │   (Health Data Indexes)       │        │
│                    └───────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

### ✅ Phase 1 Completed Features

- **Direct Elasticsearch Querying**: Full JSON syntax support with validation
- **Interactive Query Guidelines**: Tabbed examples (Basic, Filters, Aggregations, Advanced)
- **Dynamic Results Display**: Responsive table with column selection and filtering
- **Excel Export**: Full dataset export with customizable columns
- **Performance Optimization**: Source field filtering and pagination
- **Error Handling**: User-friendly error messages with suggestions
- **Index Management**: Secure whitelist-based index access

### 🔄 System Status

- ✅ Backend API (Node.js + Express)
- ✅ Frontend Interface (React + Material-UI)
- ✅ Elasticsearch Integration
- ✅ Authentication & Security
- ✅ Data Export Capabilities
- ✅ Interactive Documentation

## Getting Started by Role

### Business Analyst / Data Analyst
1. Read the **[User Guide](./user-guide.md)** 
2. Access the DHR web interface
3. Start with the built-in query examples
4. Practice with your organization's health data

### Software Developer
1. Read the **[Developer Guide](./developer-guide.md)**
2. Set up the development environment
3. Configure Elasticsearch connection
4. Run the application locally

### System Administrator
1. Review both guides for full system understanding
2. Configure production environment variables
3. Set up monitoring and backup procedures
4. Manage user access and index permissions

## Configuration Quick Reference

### Environment Variables (Backend)
```bash
ELASTICSEARCH_HOST=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=your_password
ALLOWED_HEALTH_INDEXES=project-index-v1,household-index-v1
NODE_ENV=production
PORT=3001
```

### Environment Variables (Frontend)
```bash
VITE_API_BASE_URL=http://localhost:3001/api
```

## Support & Resources

### 📞 Getting Help

1. **Technical Issues**: Check [Developer Guide - Troubleshooting](./developer-guide.md#troubleshooting)
2. **Usage Questions**: Refer to [User Guide - Getting Help](./user-guide.md#getting-help)
3. **Feature Requests**: Contact your development team
4. **Bug Reports**: Include error messages and steps to reproduce

### 📖 Additional Resources

- **Elasticsearch Documentation**: [elastic.co/guide](https://www.elastic.co/guide/en/elasticsearch/reference/current/)
- **React Documentation**: [reactjs.org](https://reactjs.org/)
- **Material-UI Components**: [mui.com](https://mui.com/)
- **TypeScript Handbook**: [typescriptlang.org](https://www.typescriptlang.org/)

## Version Information

| Component | Version | Status |
|-----------|---------|--------|
| **Phase** | 1.0 | ✅ Complete |
| **Backend** | Node.js 18+ | ✅ Stable |
| **Frontend** | React 18 | ✅ Stable |
| **Database** | Elasticsearch 8.x | ✅ Compatible |
| **Documentation** | Current | ✅ Up to date |

## Roadmap

### 🚀 Future Phases

- **Phase 2**: Visual Query Builder & Saved Queries
- **Phase 3**: Advanced Analytics & Dashboards
- **Phase 4**: Report Generation & Scheduling
- **Phase 5**: Mobile Interface & Offline Capabilities

### 🔄 Current Maintenance

- Regular security updates
- Performance monitoring
- Documentation updates
- Bug fixes and minor enhancements

## Contributing

### Documentation Updates
1. Keep guides synchronized with code changes
2. Add new examples when features are added
3. Update troubleshooting sections based on user feedback
4. Maintain version compatibility information

### Code Contributions
1. Follow the patterns established in Phase 1
2. Update documentation for any new features
3. Include error handling and user feedback
4. Test thoroughly with different data scenarios

---

**Last Updated**: August 2025  
**Document Version**: 1.0  
**System Version**: DHR Phase 1