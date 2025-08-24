import React, { useMemo } from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Chip,
  Typography,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  DataGridPro,
  GridColDef,
  GridRowParams,
  GridPaginationModel,
  GridSortModel,
  GridToolbarContainer,
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
  GridToolbarDensitySelector,
  GridToolbarExport,
} from '@mui/x-data-grid-pro';
import {
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  GetApp as ExportIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

import { HealthRecord, FieldDefinition } from '@/types';
import { formatValue, getFieldType } from '@/utils/dataFormatters';

interface DataTableProps {
  data: HealthRecord[];
  fields: FieldDefinition[];
  loading?: boolean;
  totalRows: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSortChange?: (sortModel: GridSortModel) => void;
  onRowSelect?: (record: HealthRecord) => void;
}

interface CustomToolbarProps {
  totalRows: number;
  selectedRows: number;
  onExport: () => void;
}

const CustomToolbar: React.FC<CustomToolbarProps> = ({ totalRows, selectedRows, onExport }) => {
  return (
    <GridToolbarContainer className="dhr-data-grid-toolbar">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {totalRows.toLocaleString()} records
        </Typography>
        {selectedRows > 0 && (
          <Chip
            label={`${selectedRows} selected`}
            color="primary"
            size="small"
          />
        )}
      </Box>
      
      <Box sx={{ display: 'flex', gap: 1 }}>
        <GridToolbarColumnsButton />
        <GridToolbarFilterButton />
        <GridToolbarDensitySelector />
        <GridToolbarExport />
      </Box>
    </GridToolbarContainer>
  );
};

const DataTable: React.FC<DataTableProps> = ({
  data,
  fields,
  loading = false,
  totalRows,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onRowSelect,
}) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedRecord, setSelectedRecord] = React.useState<HealthRecord | null>(null);
  const [selectedRows, setSelectedRows] = React.useState<string[]>([]);

  // Generate columns from field definitions
  const columns: GridColDef[] = useMemo(() => {
    const baseColumns: GridColDef[] = [
      {
        field: 'id',
        headerName: 'ID',
        width: 150,
        pinned: 'left',
        renderCell: (params) => (
          <Tooltip title={params.value}>
            <Typography variant="body2" className="text-ellipsis">
              {params.value}
            </Typography>
          </Tooltip>
        ),
      },
      {
        field: 'index',
        headerName: 'Source',
        width: 180,
        renderCell: (params) => (
          <Chip
            label={params.value}
            size="small"
            variant="outlined"
            color="secondary"
          />
        ),
      },
    ];

    // Add dynamic columns based on available fields
    const dynamicColumns: GridColDef[] = fields.slice(0, 10).map((field) => {
      const fieldType = getFieldType(field.type);
      
      return {
        field: field.name,
        headerName: field.name,
        width: fieldType === 'string' ? 200 : fieldType === 'number' ? 120 : 150,
        type: fieldType === 'number' ? 'number' : fieldType === 'date' ? 'dateTime' : 'string',
        sortable: field.searchable,
        filterable: field.searchable,
        valueGetter: (params) => {
          const record = params.row as HealthRecord;
          return record.source?.[field.name] || record.fields?.[field.name];
        },
        renderCell: (params) => {
          const value = params.value;
          const formattedValue = formatValue(value, field.type);
          
          if (value === null || value === undefined) {
            return (
              <Typography variant="body2" color="text.disabled" fontStyle="italic">
                null
              </Typography>
            );
          }
          
          return (
            <Tooltip title={formattedValue}>
              <Typography variant="body2" className="text-ellipsis">
                {formattedValue}
              </Typography>
            </Tooltip>
          );
        },
      };
    });

    // Add actions column
    const actionsColumn: GridColDef = {
      field: 'actions',
      headerName: 'Actions',
      width: 80,
      sortable: false,
      filterable: false,
      pinned: 'right',
      renderCell: (params) => (
        <IconButton
          size="small"
          onClick={(event) => {
            setAnchorEl(event.currentTarget);
            setSelectedRecord(params.row as HealthRecord);
          }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      ),
    };

    return [...baseColumns, ...dynamicColumns, actionsColumn];
  }, [fields]);

  const handleRowClick = (params: GridRowParams) => {
    if (onRowSelect) {
      onRowSelect(params.row as HealthRecord);
    }
  };

  const handlePaginationChange = (model: GridPaginationModel) => {
    if (model.page !== page) {
      onPageChange(model.page);
    }
    if (model.pageSize !== pageSize) {
      onPageSizeChange(model.pageSize);
    }
  };

  const handleSortChange = (model: GridSortModel) => {
    if (onSortChange) {
      onSortChange(model);
    }
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRecord(null);
  };

  const handleViewRecord = () => {
    if (selectedRecord && onRowSelect) {
      onRowSelect(selectedRecord);
    }
    handleMenuClose();
  };

  const handleExportSelected = () => {
    // TODO: Implement export selected records
    console.log('Export selected:', selectedRows);
    handleMenuClose();
  };

  const handleExportAll = () => {
    // TODO: Implement export all records
    console.log('Export all records');
  };

  return (
    <Card>
      <CardHeader
        title="Query Results"
        subheader={`${totalRows.toLocaleString()} records found`}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Export Options">
              <IconButton onClick={handleExportAll}>
                <ExportIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Results Info">
              <IconButton>
                <InfoIcon />
              </IconButton>
            </Tooltip>
          </Box>
        }
      />
      
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGridPro
            rows={data}
            columns={columns}
            loading={loading}
            
            // Pagination
            pagination
            paginationMode="server"
            rowCount={totalRows}
            paginationModel={{ page, pageSize }}
            onPaginationModelChange={handlePaginationChange}
            pageSizeOptions={[25, 50, 100, 200]}
            
            // Sorting
            sortingMode="server"
            onSortModelChange={handleSortChange}
            
            // Selection
            checkboxSelection
            onRowSelectionModelChange={(newSelection) => {
              setSelectedRows(newSelection as string[]);
            }}
            
            // Row interaction
            onRowClick={handleRowClick}
            
            // Styling
            sx={{
              border: 'none',
              '& .MuiDataGrid-cell': {
                borderBottom: '1px solid',
                borderColor: 'divider',
              },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: 'grey.50',
                borderBottom: '1px solid',
                borderColor: 'divider',
              },
              '& .MuiDataGrid-row:hover': {
                backgroundColor: 'action.hover',
              },
            }}
            
            // Custom components
            slots={{
              toolbar: () => (
                <CustomToolbar
                  totalRows={totalRows}
                  selectedRows={selectedRows.length}
                  onExport={handleExportAll}
                />
              ),
            }}
            
            // Features
            disableRowSelectionOnClick
            columnHeaderHeight={56}
            rowHeight={52}
          />
        </Box>
      </CardContent>

      {/* Row actions menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleViewRecord}>
          <ListItemIcon>
            <ViewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleExportSelected} disabled={selectedRows.length === 0}>
          <ListItemIcon>
            <ExportIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export Selected</ListItemText>
        </MenuItem>
      </Menu>
    </Card>
  );
};

export default DataTable;