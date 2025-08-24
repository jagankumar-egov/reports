# DHR Frontend Design Document

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Design System](#design-system)
4. [Phase 1: Query & Data Tables](#phase-1-query--data-tables)
5. [Phase 2: Filter Management](#phase-2-filter-management)
6. [Phase 3: Dashboard System](#phase-3-dashboard-system)
7. [Phase 4: Export Functionality](#phase-4-export-functionality)
8. [Phase 5: Documentation & UX](#phase-5-documentation--ux)
9. [Implementation Strategy](#implementation-strategy)

---

## Architecture Overview

### High-Level Frontend Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    DHR Frontend Application                 │
├─────────────────────────────────────────────────────────────┤
│  Phase 1: Query Engine    │  Phase 2: Filter Management    │
│  - Query Builder          │  - Filter CRUD                 │
│  - Data Tables           │  - Filter Library              │
│  - Result Viewer         │  - Quick Filters               │
├─────────────────────────────────────────────────────────────┤
│  Phase 3: Dashboard System │ Phase 4: Export System        │
│  - Dashboard Builder      │  - Export Manager             │
│  - Gadget Library        │  - Process Tracker            │
│  - Layout Manager        │  - Download Center             │
├─────────────────────────────────────────────────────────────┤
│  Phase 5: Documentation & UX                               │
│  - Help System           │  - Onboarding                  │
│  - User Guides          │  - Interactive Tutorials       │
└─────────────────────────────────────────────────────────────┘
│
├── Shared Components Layer
│   ├── Navigation        ├── Data Grid        ├── Charts
│   ├── Forms            ├── Modals           ├── Notifications
│   └── Authentication   └── Error Handling   └── Loading States
│
├── State Management Layer (Redux Toolkit + RTK Query)
│   ├── Query State      ├── Filter State     ├── Dashboard State
│   ├── User State       ├── Export State     ├── UI State
│
├── API Layer (Axios + React Query)
│   ├── Query API        ├── Filter API       ├── Dashboard API
│   ├── Export API       ├── Auth API         ├── Filestore API
│
└── Core Services Layer
    ├── Authentication   ├── Error Handling   ├── Caching
    ├── Permissions     ├── Analytics        ├── Theme
```

---

## Technology Stack

### Core Technologies
```json
{
  "framework": "React 18.x",
  "language": "TypeScript",
  "ui_library": "Material-UI (MUI) v5",
  "charting": "Apache ECharts + echarts-for-react",
  "state_management": "Redux Toolkit + RTK Query",
  "routing": "React Router v6",
  "styling": "MUI System + Emotion",
  "build_tool": "Vite",
  "testing": "Jest + React Testing Library",
  "e2e_testing": "Cypress"
}
```

### Additional Libraries
```json
{
  "data_grid": "@mui/x-data-grid-pro",
  "date_handling": "date-fns",
  "forms": "react-hook-form + yup",
  "icons": "@mui/icons-material + lucide-react",
  "notifications": "notistack",
  "drag_drop": "@dnd-kit/core",
  "code_editor": "@monaco-editor/react",
  "file_handling": "react-dropzone",
  "tour_guide": "reactour"
}
```

### Project Structure
```
src/
├── components/           # Reusable UI components
│   ├── common/          # Generic components
│   ├── forms/           # Form components
│   ├── charts/          # Chart components
│   └── layout/          # Layout components
├── pages/               # Page components (one per route)
│   ├── query/           # Phase 1: Query pages
│   ├── filters/         # Phase 2: Filter pages
│   ├── dashboards/      # Phase 3: Dashboard pages
│   ├── exports/         # Phase 4: Export pages
│   └── help/            # Phase 5: Documentation pages
├── hooks/               # Custom React hooks
├── services/            # API services and utilities
├── store/               # Redux store configuration
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
└── constants/           # Application constants
```

---

## Design System

### Material-UI Theme Configuration
```typescript
const dhrTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',      // DHR Blue
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#9c27b0',      // DHR Purple
      light: '#ba68c8',
      dark: '#7b1fa2',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    success: {
      main: '#2e7d32',
    },
    warning: {
      main: '#ed6c02',
    },
    error: {
      main: '#d32f2f',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontSize: '2.5rem', fontWeight: 300 },
    h2: { fontSize: '2rem', fontWeight: 400 },
    h3: { fontSize: '1.75rem', fontWeight: 400 },
    h4: { fontSize: '1.5rem', fontWeight: 500 },
    h5: { fontSize: '1.25rem', fontWeight: 500 },
    h6: { fontSize: '1rem', fontWeight: 500 },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
  },
});
```

### Component Design Principles
- **Consistent Spacing**: 8px grid system
- **Responsive Design**: Mobile-first approach
- **Accessibility**: WCAG 2.1 AA compliance
- **Performance**: Lazy loading and virtualization
- **Theming**: Light/dark mode support

---

## Phase 1: Direct Elasticsearch Query ✅ **COMPLETED**

**Timeline: 4-6 weeks**
**Goal: Enable users to execute direct Elasticsearch queries and view results in tabular format**

### ✅ **Phase 1 Implementation Status**

**Phase 1 has been successfully completed and deployed** with the following core functionality:

#### **Implemented Features:**
- ✅ **Direct ES Query Interface**: Full JSON query syntax support
- ✅ **Interactive Query Guidelines**: Tabbed examples (Basic, Filters, Aggregations, Advanced)
- ✅ **Dynamic Results Table**: Column selection, sorting, pagination
- ✅ **Excel Export**: Full dataset export with customizable columns
- ✅ **Performance Optimization**: `_source` field filtering and query optimization
- ✅ **Error Handling**: Structured error messages with helpful suggestions
- ✅ **Session Management**: Column preferences saved per index
- ✅ **Responsive Design**: Mobile-friendly interface

#### **Actual Implementation Architecture:**
```typescript
// Current Phase 1 Structure (Implemented)
DHR Phase 1 (Direct Query):
├── DirectQueryPage.tsx           // Main query interface page
├── DirectQuery.tsx               // Core query component
│   ├── Query Configuration       // Index selection, parameters
│   ├── Interactive Guidelines    // Tabbed query examples
│   ├── Results Display          // Dynamic table with tooltips
│   └── Export & Column Tools    // Excel export, column selection
├── Sidebar Navigation           // Clean phase-focused navigation
├── Error Handling              // Structured API error display
└── Session Storage             // Column preferences persistence
```

#### **Key Differences from Original Design:**
- **Simplified Approach**: Focused on direct ES queries instead of JQL
- **Interactive Guidelines**: Built-in query examples with copy-paste functionality  
- **Real-time Optimization**: `_source` filtering for performance
- **Enhanced UX**: Structured error handling and session management

### 1.1 Query Builder Component
```typescript
// components/query/QueryBuilder.tsx
interface QueryBuilderProps {
  onQueryChange: (query: string) => void;
  allowedIndexes: string[];
  availableFields: FieldDefinition[];
}

const QueryBuilder: React.FC<QueryBuilderProps> = ({
  onQueryChange,
  allowedIndexes,
  availableFields
}) => {
  // Visual query builder with JQL support
  // Auto-completion for fields and values
  // Syntax highlighting
  // Query validation
};
```

### 1.2 Data Table Component
```typescript
// components/data/DataTable.tsx
import { DataGridPro } from '@mui/x-data-grid-pro';

interface DataTableProps {
  data: QueryResult[];
  columns: GridColDef[];
  loading: boolean;
  totalRows: number;
  onPageChange: (page: number) => void;
  onSortChange: (sort: GridSortModel) => void;
}

const DataTable: React.FC<DataTableProps> = ({
  data,
  columns,
  loading,
  totalRows,
  onPageChange,
  onSortChange
}) => {
  return (
    <DataGridPro
      rows={data}
      columns={columns}
      loading={loading}
      pagination
      paginationMode="server"
      rowCount={totalRows}
      pageSize={50}
      rowsPerPageOptions={[25, 50, 100]}
      onPageChange={onPageChange}
      onSortModelChange={onSortChange}
      checkboxSelection
      disableSelectionOnClick
      components={{
        Toolbar: CustomDataGridToolbar,
        NoRowsOverlay: CustomNoDataOverlay,
        LoadingOverlay: CustomLoadingOverlay,
      }}
    />
  );
};
```

### 1.3 Query Execution Page
```typescript
// pages/query/QueryPage.tsx
const QueryPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  
  const executeQuery = useCallback(async () => {
    setLoading(true);
    try {
      const response = await queryAPI.execute({
        jql: query,
        startAt: 0,
        maxResults: 50,
        fields: selectedFields
      });
      setResult(response.data);
    } catch (error) {
      showErrorNotification(error.message);
    } finally {
      setLoading(false);
    }
  }, [query, selectedFields]);

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4">Query Data</Typography>
        <Typography variant="body1" color="text.secondary">
          Execute queries against health data indexes
        </Typography>
      </Box>
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <QueryBuilder
                onQueryChange={setQuery}
                allowedIndexes={allowedIndexes}
                availableFields={availableFields}
              />
              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={executeQuery}
                  disabled={!query || loading}
                  startIcon={<PlayArrowIcon />}
                >
                  Execute Query
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setQuery('')}
                  startIcon={<ClearIcon />}
                >
                  Clear
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12}>
          {result && (
            <Card>
              <CardHeader
                title={`Results (${result.total} records)`}
                action={
                  <Chip
                    label={`${result.issues.length} shown`}
                    color="primary"
                    variant="outlined"
                  />
                }
              />
              <CardContent>
                <DataTable
                  data={result.issues}
                  columns={generateColumns(result.fields)}
                  loading={loading}
                  totalRows={result.total}
                  onPageChange={handlePageChange}
                  onSortChange={handleSortChange}
                />
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Container>
  );
};
```

### 1.4 Phase 1 Features
- **Visual Query Builder**: Drag-and-drop query construction
- **JQL Editor**: Code editor with syntax highlighting
- **Field Browser**: Explore available fields and their types
- **Auto-complete**: Smart suggestions for fields and values
- **Query Validation**: Real-time syntax checking
- **Results Table**: Sortable, filterable data grid
- **Pagination**: Server-side pagination for large datasets
- **Export to CSV**: Basic export functionality
- **Query History**: Recent queries persistence

### 1.5 Phase 1 Components
```
Phase 1 Components:
├── QueryBuilder/
│   ├── VisualBuilder.tsx
│   ├── JQLEditor.tsx
│   ├── FieldSelector.tsx
│   └── QueryValidator.tsx
├── DataTable/
│   ├── DataGrid.tsx
│   ├── ColumnConfig.tsx
│   ├── CustomToolbar.tsx
│   └── DataExport.tsx
├── Common/
│   ├── SearchInput.tsx
│   ├── LoadingSpinner.tsx
│   ├── ErrorBoundary.tsx
│   └── NoDataMessage.tsx
└── Pages/
    ├── QueryPage.tsx
    ├── ResultsPage.tsx
    └── HistoryPage.tsx
```

---

## Phase 2: Filter Management

**Timeline: 3-4 weeks**
**Goal: Create, save, edit, and manage query filters**

### 2.1 Filter Manager Component
```typescript
// components/filters/FilterManager.tsx
interface FilterManagerProps {
  onFilterSelect: (filter: Filter) => void;
  allowEdit?: boolean;
}

const FilterManager: React.FC<FilterManagerProps> = ({
  onFilterSelect,
  allowEdit = true
}) => {
  const [filters, setFilters] = useState<Filter[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'updated'>('name');
  
  return (
    <Card>
      <CardHeader
        title="Saved Filters"
        action={
          allowEdit && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Create Filter
            </Button>
          )
        }
      />
      <CardContent>
        <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
          <TextField
            placeholder="Search filters..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon />,
            }}
            size="small"
            fullWidth
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="created">Created</MenuItem>
              <MenuItem value="updated">Updated</MenuItem>
            </Select>
          </FormControl>
        </Box>
        
        <List>
          {filteredFilters.map((filter) => (
            <FilterListItem
              key={filter.id}
              filter={filter}
              onSelect={() => onFilterSelect(filter)}
              onEdit={allowEdit ? handleEditFilter : undefined}
              onDelete={allowEdit ? handleDeleteFilter : undefined}
            />
          ))}
        </List>
      </CardContent>
    </Card>
  );
};
```

### 2.2 Filter Creation Dialog
```typescript
// components/filters/FilterDialog.tsx
interface FilterDialogProps {
  open: boolean;
  onClose: () => void;
  filter?: Filter; // For editing
  onSave: (filter: Partial<Filter>) => void;
}

const FilterDialog: React.FC<FilterDialogProps> = ({
  open,
  onClose,
  filter,
  onSave
}) => {
  const { control, handleSubmit, formState: { errors } } = useForm<FilterForm>({
    resolver: yupResolver(filterSchema),
    defaultValues: filter || {
      name: '',
      description: '',
      jql: '',
      favourite: false,
      tags: [],
    }
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {filter ? 'Edit Filter' : 'Create New Filter'}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Filter Name"
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  fullWidth
                  required
                />
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Controller
              name="tags"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  {...field}
                  multiple
                  options={availableTags}
                  freeSolo
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option}
                        {...getTagProps({ index })}
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="Tags" />
                  )}
                />
              )}
            />
          </Grid>
          <Grid item xs={12}>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Description"
                  multiline
                  rows={3}
                  fullWidth
                />
              )}
            />
          </Grid>
          <Grid item xs={12}>
            <Controller
              name="jql"
              control={control}
              render={({ field }) => (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Query (JQL)
                  </Typography>
                  <JQLEditor
                    value={field.value}
                    onChange={field.onChange}
                    height="200px"
                    error={!!errors.jql}
                  />
                  {errors.jql && (
                    <FormHelperText error>
                      {errors.jql.message}
                    </FormHelperText>
                  )}
                </Box>
              )}
            />
          </Grid>
          <Grid item xs={12}>
            <Controller
              name="favourite"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={field.value}
                      onChange={field.onChange}
                    />
                  }
                  label="Mark as favourite"
                />
              )}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit(onSave)}
          startIcon={<SaveIcon />}
        >
          {filter ? 'Update' : 'Create'} Filter
        </Button>
      </DialogActions>
    </Dialog>
  );
};
```

### 2.3 Filter Library Page
```typescript
// pages/filters/FiltersPage.tsx
const FiltersPage: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState<Filter | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [previewData, setPreviewData] = useState<QueryResult | null>(null);
  
  const { data: filters, isLoading, refetch } = useGetFiltersQuery();
  
  const handleFilterSelect = useCallback(async (filter: Filter) => {
    setSelectedFilter(filter);
    // Preview the filter results
    try {
      const result = await queryAPI.execute({
        jql: filter.jql,
        startAt: 0,
        maxResults: 10,
      });
      setPreviewData(result.data);
    } catch (error) {
      showErrorNotification('Failed to preview filter');
    }
  }, []);

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4">Filter Library</Typography>
          <Typography variant="body1" color="text.secondary">
            Manage and organize your saved query filters
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Filter
        </Button>
      </Box>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <FilterManager
            onFilterSelect={handleFilterSelect}
            allowEdit={true}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          {selectedFilter && (
            <Card>
              <CardHeader
                title={selectedFilter.name}
                subheader={`Created ${formatDate(selectedFilter.metadata.created_at)}`}
                action={
                  <Box>
                    <IconButton onClick={() => handleEditFilter(selectedFilter)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDeleteFilter(selectedFilter.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                }
              />
              <CardContent>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {selectedFilter.description}
                </Typography>
                
                {selectedFilter.tags.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    {selectedFilter.tags.map((tag) => (
                      <Chip key={tag} label={tag} size="small" sx={{ mr: 1 }} />
                    ))}
                  </Box>
                )}
                
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">Query (JQL)</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'grey.50' }}>
                      <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace' }}>
                        {selectedFilter.jql}
                      </Typography>
                    </Paper>
                  </AccordionDetails>
                </Accordion>
                
                {previewData && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Preview ({previewData.total} total results)
                    </Typography>
                    <DataTable
                      data={previewData.issues.slice(0, 5)}
                      columns={generateColumns(previewData.fields)}
                      loading={false}
                      totalRows={5}
                      onPageChange={() => {}}
                      onSortChange={() => {}}
                      hideFooter
                    />
                  </Box>
                )}
              </CardContent>
              <CardActions>
                <Button
                  variant="contained"
                  startIcon={<PlayArrowIcon />}
                  onClick={() => navigateToQuery(selectedFilter.jql)}
                >
                  Execute Query
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ContentCopyIcon />}
                  onClick={() => copyToClipboard(selectedFilter.jql)}
                >
                  Copy Query
                </Button>
              </CardActions>
            </Card>
          )}
        </Grid>
      </Grid>
      
      <FilterDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSave={handleCreateFilter}
      />
    </Container>
  );
};
```

### 2.4 Phase 2 Features
- **Filter CRUD**: Create, read, update, delete filters
- **Filter Library**: Browse and search saved filters
- **Filter Preview**: Quick preview of filter results
- **Filter Tagging**: Organize filters with tags
- **Favorites**: Mark frequently used filters
- **Filter Sharing**: Share filters with other users
- **Usage Analytics**: Track filter usage statistics
- **Bulk Operations**: Delete/tag multiple filters
- **Import/Export**: Backup and restore filters

---

## Phase 3: Dashboard System

**Timeline: 6-8 weeks**
**Goal: Create interactive dashboards with charts and gadgets**

### 3.1 Dashboard Builder
```typescript
// components/dashboards/DashboardBuilder.tsx
import ReactECharts from 'echarts-for-react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';

interface DashboardBuilderProps {
  dashboard: Dashboard;
  onSave: (dashboard: Dashboard) => void;
  editMode: boolean;
}

const DashboardBuilder: React.FC<DashboardBuilderProps> = ({
  dashboard,
  onSave,
  editMode
}) => {
  const [gadgets, setGadgets] = useState<Gadget[]>(dashboard.gadgets || []);
  const [selectedGadget, setSelectedGadget] = useState<string | null>(null);
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      // Update gadget positions
      updateGadgetPositions(active.id, over.id);
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {editMode && (
        <DashboardToolbar
          onAddGadget={handleAddGadget}
          onSave={() => onSave({ ...dashboard, gadgets })}
          onPreview={() => setEditMode(false)}
        />
      )}
      
      <DndContext onDragEnd={handleDragEnd}>
        <Grid container spacing={2} sx={{ flex: 1, p: 2, overflow: 'auto' }}>
          {gadgets.map((gadget) => (
            <Grid
              key={gadget.id}
              item
              xs={gadget.position.width}
              sx={{ height: gadget.position.height * 100 }}
            >
              <GadgetContainer
                gadget={gadget}
                selected={selectedGadget === gadget.id}
                editMode={editMode}
                onSelect={() => setSelectedGadget(gadget.id)}
                onUpdate={handleUpdateGadget}
                onDelete={handleDeleteGadget}
              />
            </Grid>
          ))}
        </Grid>
      </DndContext>
      
      {editMode && (
        <GadgetSidebar
          open={!!selectedGadget}
          gadget={gadgets.find(g => g.id === selectedGadget)}
          onClose={() => setSelectedGadget(null)}
          onUpdate={handleUpdateGadget}
        />
      )}
    </Box>
  );
};
```

### 3.2 Chart Components
```typescript
// components/charts/ChartGadget.tsx
interface ChartGadgetProps {
  gadget: Gadget;
  data: any[];
  loading: boolean;
}

const ChartGadget: React.FC<ChartGadgetProps> = ({ gadget, data, loading }) => {
  const chartOptions = useMemo(() => {
    switch (gadget.type) {
      case 'pie-chart':
        return generatePieChartOptions(data, gadget.config);
      case 'bar-chart':
        return generateBarChartOptions(data, gadget.config);
      case 'line-chart':
        return generateLineChartOptions(data, gadget.config);
      default:
        return {};
    }
  }, [data, gadget.type, gadget.config]);

  if (loading) {
    return <ChartSkeleton />;
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title={gadget.title}
        action={
          <IconButton size="small">
            <MoreVertIcon />
          </IconButton>
        }
      />
      <CardContent sx={{ height: 'calc(100% - 64px)' }}>
        <ReactECharts
          option={chartOptions}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'svg' }}
        />
      </CardContent>
    </Card>
  );
};

// Chart option generators
const generatePieChartOptions = (data: any[], config: GadgetConfig) => ({
  tooltip: {
    trigger: 'item',
    formatter: '{a} <br/>{b}: {c} ({d}%)'
  },
  legend: {
    orient: 'vertical',
    left: 'left',
    show: config.show_legend !== false
  },
  series: [
    {
      name: config.title || 'Data',
      type: 'pie',
      radius: config.radius || '50%',
      data: data.map(item => ({
        value: item.count,
        name: item.name
      })),
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }
  ]
});

const generateBarChartOptions = (data: any[], config: GadgetConfig) => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow'
    }
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true
  },
  xAxis: [
    {
      type: 'category',
      data: data.map(item => item.name),
      axisTick: {
        alignWithLabel: true
      }
    }
  ],
  yAxis: [
    {
      type: 'value'
    }
  ],
  series: [
    {
      name: config.title || 'Data',
      type: 'bar',
      barWidth: '60%',
      data: data.map(item => item.count),
      itemStyle: {
        color: config.color || '#1976d2'
      }
    }
  ]
});
```

### 3.3 Dashboard Management
```typescript
// pages/dashboards/DashboardsPage.tsx
const DashboardsPage: React.FC = () => {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  const { data: dashboards, isLoading } = useGetDashboardsQuery();
  
  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4">Dashboards</Typography>
          <Typography variant="body1" color="text.secondary">
            Create and manage your data visualization dashboards
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <ToggleButtonGroup
            value={view}
            exclusive
            onChange={(_, newView) => newView && setView(newView)}
            size="small"
          >
            <ToggleButton value="grid">
              <GridViewIcon />
            </ToggleButton>
            <ToggleButton value="list">
              <ListIcon />
            </ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Dashboard
          </Button>
        </Box>
      </Box>
      
      <Box sx={{ mb: 3 }}>
        <TextField
          placeholder="Search dashboards..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon />,
          }}
          size="small"
          sx={{ width: 300 }}
        />
      </Box>
      
      {view === 'grid' ? (
        <Grid container spacing={3}>
          {filteredDashboards.map((dashboard) => (
            <Grid item xs={12} sm={6} md={4} key={dashboard.id}>
              <DashboardCard
                dashboard={dashboard}
                onOpen={() => navigate(`/dashboards/${dashboard.id}`)}
                onEdit={() => navigate(`/dashboards/${dashboard.id}/edit`)}
                onDelete={() => handleDeleteDashboard(dashboard.id)}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <DashboardsList
          dashboards={filteredDashboards}
          onOpen={(id) => navigate(`/dashboards/${id}`)}
          onEdit={(id) => navigate(`/dashboards/${id}/edit`)}
          onDelete={handleDeleteDashboard}
        />
      )}
      
      <CreateDashboardDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSave={handleCreateDashboard}
      />
    </Container>
  );
};
```

### 3.4 Phase 3 Features
- **Dashboard Builder**: Drag-and-drop interface for creating dashboards
- **Chart Library**: Pie, bar, line, area, scatter charts using ECharts
- **Gadget System**: Reusable chart and data components
- **Layout Management**: Grid-based responsive layouts
- **Dashboard Templates**: Pre-built dashboard templates
- **Real-time Updates**: Auto-refresh capabilities
- **Dashboard Sharing**: Share dashboards with teams
- **Export Options**: Export dashboards as images/PDFs
- **Responsive Design**: Mobile-friendly dashboard viewing

---

## Phase 4: Export Functionality

**Timeline: 3-4 weeks**
**Goal: Comprehensive data export with process tracking**

### 4.1 Export Manager
```typescript
// components/exports/ExportManager.tsx
interface ExportManagerProps {
  filterId?: string;
  onExportInitiated?: (processId: string) => void;
}

const ExportManager: React.FC<ExportManagerProps> = ({
  filterId,
  onExportInitiated
}) => {
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [processes, setProcesses] = useState<ExportProcess[]>([]);
  
  const { data: exportProcesses, refetch } = useGetExportProcessesQuery();
  
  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">Export Center</Typography>
        <Button
          variant="contained"
          startIcon={<FileDownloadIcon />}
          onClick={() => setExportDialogOpen(true)}
          disabled={!filterId}
        >
          New Export
        </Button>
      </Box>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader title="Export Processes" />
            <CardContent>
              <ExportProcessList
                processes={exportProcesses || []}
                onRefresh={refetch}
                onDownload={handleDownload}
                onCancel={handleCancelExport}
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <ExportStatsCard processes={exportProcesses || []} />
        </Grid>
      </Grid>
      
      <ExportDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        filterId={filterId}
        onExportInitiated={(processId) => {
          onExportInitiated?.(processId);
          refetch();
        }}
      />
    </Box>
  );
};
```

### 4.2 Export Process Tracker
```typescript
// components/exports/ExportProcessTracker.tsx
interface ExportProcessTrackerProps {
  process: ExportProcess;
  onDownload: (processId: string) => void;
  onCancel: (processId: string) => void;
}

const ExportProcessTracker: React.FC<ExportProcessTrackerProps> = ({
  process,
  onDownload,
  onCancel
}) => {
  const getStatusColor = (status: string): 'primary' | 'warning' | 'success' | 'error' => {
    switch (status) {
      case 'initiated': return 'primary';
      case 'processing': return 'warning';
      case 'completed': return 'success';
      case 'failed': return 'error';
      default: return 'primary';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'initiated': return <HourglassEmptyIcon />;
      case 'processing': return <AutorenewIcon className="animate-spin" />;
      case 'completed': return <CheckCircleIcon />;
      case 'failed': return <ErrorIcon />;
      default: return <HelpIcon />;
    }
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              {getStatusIcon(process.status)}
              <Typography variant="h6" sx={{ ml: 1 }}>
                Export #{process.id.slice(-8)}
              </Typography>
              <Chip
                label={process.status.toUpperCase()}
                color={getStatusColor(process.status)}
                size="small"
                sx={{ ml: 2 }}
              />
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Format: {process.format.toUpperCase()} | 
              Filter: {process.filter_name} |
              Created: {formatDate(process.metadata.initiated_at)}
            </Typography>
            
            {process.status === 'processing' && (
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Progress</Typography>
                  <Typography variant="body2">{process.progress}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={process.progress}
                  sx={{ height: 8, borderRadius: 4 }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Processed {process.records_processed.toLocaleString()} of {process.total_records.toLocaleString()} records
                </Typography>
              </Box>
            )}
            
            {process.status === 'completed' && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="success.main">
                  ✓ {process.records_processed.toLocaleString()} records exported successfully
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  File expires: {formatDate(process.metadata.expires_at)}
                </Typography>
              </Box>
            )}
            
            {process.status === 'failed' && (
              <Alert severity="error" sx={{ mt: 2 }}>
                <AlertTitle>Export Failed</AlertTitle>
                {process.error_info?.error_message}
              </Alert>
            )}
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {process.status === 'completed' && (
              <Tooltip title="Download file">
                <IconButton
                  color="primary"
                  onClick={() => onDownload(process.id)}
                >
                  <FileDownloadIcon />
                </IconButton>
              </Tooltip>
            )}
            
            {(process.status === 'initiated' || process.status === 'processing') && (
              <Tooltip title="Cancel export">
                <IconButton
                  color="error"
                  onClick={() => onCancel(process.id)}
                >
                  <CancelIcon />
                </IconButton>
              </Tooltip>
            )}
            
            <Tooltip title="Copy filestore info">
              <IconButton
                onClick={() => copyFilestoreInfo(process)}
              >
                <ContentCopyIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
```

### 4.3 Export Configuration Dialog
```typescript
// components/exports/ExportDialog.tsx
interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  filterId?: string;
  onExportInitiated: (processId: string) => void;
}

const ExportDialog: React.FC<ExportDialogProps> = ({
  open,
  onClose,
  filterId,
  onExportInitiated
}) => {
  const { control, handleSubmit, watch, formState: { errors } } = useForm<ExportRequest>({
    defaultValues: {
      filterId: filterId || '',
      format: 'csv',
      fields: [],
      maxResults: 10000,
    }
  });
  
  const selectedFormat = watch('format');
  const { data: filter } = useGetFilterQuery(filterId!, { skip: !filterId });
  const { data: availableFields } = useGetFieldsQuery();
  
  const onSubmit = async (data: ExportRequest) => {
    try {
      const response = await exportAPI.initiateExport(data);
      onExportInitiated(response.data.processId);
      onClose();
      showSuccessNotification('Export started successfully');
    } catch (error) {
      showErrorNotification('Failed to start export');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Configure Export</DialogTitle>
      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <Controller
              name="filterId"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  {...field}
                  options={availableFilters}
                  getOptionLabel={(option) => option.name}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Filter"
                      error={!!errors.filterId}
                      helperText={errors.filterId?.message}
                      required
                    />
                  )}
                  value={availableFilters.find(f => f.id === field.value) || null}
                  onChange={(_, value) => field.onChange(value?.id || '')}
                />
              )}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Controller
              name="format"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Export Format</InputLabel>
                  <Select {...field} label="Export Format">
                    <MenuItem value="csv">CSV</MenuItem>
                    <MenuItem value="excel">Excel (.xlsx)</MenuItem>
                    <MenuItem value="json">JSON</MenuItem>
                    <MenuItem value="pdf">PDF Report</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Controller
              name="maxResults"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Max Records"
                  type="number"
                  InputProps={{
                    inputProps: { min: 1, max: 100000 }
                  }}
                  helperText="Maximum number of records to export"
                  fullWidth
                />
              )}
            />
          </Grid>
          
          <Grid item xs={12}>
            <Controller
              name="fields"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  {...field}
                  multiple
                  options={availableFields || []}
                  getOptionLabel={(option) => option.name}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option.name}
                        {...getTagProps({ index })}
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Fields to Export"
                      helperText="Leave empty to export all fields"
                    />
                  )}
                />
              )}
            />
          </Grid>
          
          {selectedFormat === 'pdf' && (
            <Grid item xs={12}>
              <Alert severity="info">
                PDF export will generate a formatted report with charts and summary statistics.
                Large datasets may take longer to process.
              </Alert>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit(onSubmit)}
          startIcon={<FileDownloadIcon />}
        >
          Start Export
        </Button>
      </DialogActions>
    </Dialog>
  );
};
```

### 4.4 Phase 4 Features
- **Multiple Formats**: CSV, Excel, JSON, PDF exports
- **Process Tracking**: Real-time export progress monitoring
- **Background Processing**: Non-blocking export operations
- **File Management**: Integration with DIGIT Filestore
- **Export History**: Track and manage past exports
- **Bulk Operations**: Export multiple filters at once
- **Scheduled Exports**: Set up recurring export jobs
- **Export Templates**: Pre-configured export settings
- **Error Handling**: Robust error reporting and retry logic

---

## Phase 5: Documentation & UX

**Timeline: 2-3 weeks**
**Goal: User onboarding, help system, and documentation**

### 5.1 Interactive Tutorial System
```typescript
// components/help/TutorialManager.tsx
import { useTour } from '@reactour/tour';

const TutorialManager: React.FC = () => {
  const { setIsOpen, setCurrentStep, setSteps } = useTour();
  
  const tutorials = {
    'getting-started': {
      title: 'Getting Started with DHR',
      steps: [
        {
          selector: '[data-tour="query-builder"]',
          content: 'Start by building your query here. You can use the visual builder or write JQL directly.',
        },
        {
          selector: '[data-tour="execute-button"]',
          content: 'Click here to execute your query and see the results.',
        },
        {
          selector: '[data-tour="results-table"]',
          content: 'Your query results will appear in this table. You can sort, filter, and export the data.',
        },
      ],
    },
    'creating-filters': {
      title: 'Creating and Managing Filters',
      steps: [
        {
          selector: '[data-tour="save-filter"]',
          content: 'Save frequently used queries as filters for quick access.',
        },
        {
          selector: '[data-tour="filter-library"]',
          content: 'Access your saved filters from the Filter Library.',
        },
      ],
    },
    'building-dashboards': {
      title: 'Building Dashboards',
      steps: [
        {
          selector: '[data-tour="dashboard-builder"]',
          content: 'Use the dashboard builder to create interactive visualizations.',
        },
        {
          selector: '[data-tour="add-gadget"]',
          content: 'Add charts and data widgets to your dashboard.',
        },
      ],
    },
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>Interactive Tutorials</Typography>
      <Grid container spacing={2}>
        {Object.entries(tutorials).map(([key, tutorial]) => (
          <Grid item xs={12} sm={6} md={4} key={key}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  {tutorial.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {tutorial.steps.length} steps
                </Typography>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => startTutorial(key)}
                >
                  Start Tutorial
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
```

### 5.2 Help System
```typescript
// components/help/HelpCenter.tsx
const HelpCenter: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const helpArticles = [
    {
      id: '1',
      title: 'Getting Started with DHR',
      category: 'basics',
      content: 'Learn the fundamentals...',
      tags: ['beginner', 'overview'],
    },
    {
      id: '2',
      title: 'Writing JQL Queries',
      category: 'queries',
      content: 'Master the JQL syntax...',
      tags: ['jql', 'queries', 'syntax'],
    },
    // ... more articles
  ];

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ mb: 2 }}>Help Center</Typography>
        <Typography variant="body1" color="text.secondary">
          Find answers and learn how to use DHR effectively
        </Typography>
      </Box>
      
      <Grid container spacing={4}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Categories</Typography>
              <List>
                {categories.map((category) => (
                  <ListItem
                    key={category.id}
                    button
                    selected={selectedCategory === category.id}
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    <ListItemIcon>
                      {category.icon}
                    </ListItemIcon>
                    <ListItemText primary={category.name} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={9}>
          <Box sx={{ mb: 3 }}>
            <TextField
              placeholder="Search help articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon />,
              }}
              fullWidth
            />
          </Box>
          
          <Grid container spacing={2}>
            {filteredArticles.map((article) => (
              <Grid item xs={12} sm={6} key={article.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      {article.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {article.excerpt}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      {article.tags.slice(0, 3).map((tag) => (
                        <Chip key={tag} label={tag} size="small" variant="outlined" />
                      ))}
                    </Box>
                    <Button variant="outlined" size="small">
                      Read More
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
};
```

### 5.3 User Onboarding
```typescript
// components/onboarding/OnboardingFlow.tsx
const OnboardingFlow: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile>({});
  
  const onboardingSteps = [
    {
      title: 'Welcome to DHR',
      component: <WelcomeStep />,
    },
    {
      title: 'Set Up Your Profile',
      component: <ProfileSetupStep onUpdate={setUserProfile} />,
    },
    {
      title: 'Choose Your Interests',
      component: <InterestsStep />,
    },
    {
      title: 'Sample Dashboard',
      component: <SampleDashboardStep />,
    },
    {
      title: 'You\'re All Set!',
      component: <CompletionStep />,
    },
  ];

  return (
    <Dialog open maxWidth="md" fullWidth>
      <DialogContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Stepper activeStep={currentStep} sx={{ flex: 1 }}>
            {onboardingSteps.map((step, index) => (
              <Step key={index}>
                <StepLabel>{step.title}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
        
        <Box sx={{ minHeight: 400 }}>
          {onboardingSteps[currentStep].component}
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
        >
          Back
        </Button>
        <Button
          variant="contained"
          onClick={() => {
            if (currentStep === onboardingSteps.length - 1) {
              completeOnboarding();
            } else {
              setCurrentStep(currentStep + 1);
            }
          }}
        >
          {currentStep === onboardingSteps.length - 1 ? 'Get Started' : 'Next'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
```

### 5.4 Phase 5 Features
- **Interactive Tutorials**: Step-by-step guided tours
- **Help Center**: Searchable knowledge base
- **User Onboarding**: Welcome flow for new users
- **Contextual Help**: In-app help tooltips and hints
- **Video Tutorials**: Embedded video guides
- **FAQ System**: Frequently asked questions
- **Feedback System**: User feedback collection
- **Keyboard Shortcuts**: Hotkey documentation
- **Release Notes**: What's new notifications

---

## Implementation Strategy

### Development Timeline
```
Phase 1: Query & Data Tables    (Weeks 1-6)
├── Week 1-2: Query Builder & JQL Editor
├── Week 3-4: Data Table & Results Display
├── Week 5-6: Query History & Basic Export

Phase 2: Filter Management      (Weeks 7-10)
├── Week 7-8: Filter CRUD Operations
├── Week 9-10: Filter Library & Sharing

Phase 3: Dashboard System       (Weeks 11-18)
├── Week 11-12: Dashboard Builder Framework
├── Week 13-14: Chart Components (ECharts)
├── Week 15-16: Gadget System & Layout
├── Week 17-18: Dashboard Management

Phase 4: Export Functionality   (Weeks 19-22)
├── Week 19-20: Export Manager & Process Tracking
├── Week 21-22: Multiple Format Support

Phase 5: Documentation & UX     (Weeks 23-25)
├── Week 23: Help System & Tutorials
├── Week 24: User Onboarding
├── Week 25: Polish & Testing
```

### Team Structure
- **2 Frontend Developers**: Core feature development
- **1 UI/UX Designer**: Design system and user experience
- **1 QA Engineer**: Testing and quality assurance
- **1 Technical Writer**: Documentation and help content

### Testing Strategy
- **Unit Tests**: 80%+ code coverage using Jest
- **Integration Tests**: API integration testing
- **E2E Tests**: Critical user journeys with Cypress
- **Performance Tests**: Bundle size and runtime performance
- **Accessibility Tests**: WCAG 2.1 AA compliance

### Deployment Strategy
- **Staging Environment**: Feature testing and QA
- **Production Deployment**: Blue-green deployment
- **Feature Flags**: Gradual rollout of new features
- **CDN Distribution**: Global content delivery
- **Progressive Web App**: Offline capabilities

This phased approach ensures steady progress while delivering value at each milestone, allowing for user feedback and iterative improvements throughout the development process.