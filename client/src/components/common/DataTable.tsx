import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Box,
  Typography,
  Tooltip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

export interface TableColumn {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
}

export interface TableRow {
  id: string;
  [key: string]: any;
}

interface DataTableProps {
  columns: string[];
  rows: TableRow[];
  page: number;
  rowsPerPage: number;
  totalCount: number;
  onPageChange: (event: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  loading?: boolean;
  emptyMessage?: string;
  dense?: boolean;
  rowsPerPageOptions?: number[];
}

const DataTable: React.FC<DataTableProps> = ({
  columns,
  rows,
  page,
  rowsPerPage,
  totalCount,
  onPageChange,
  onRowsPerPageChange,
  loading = false,
  emptyMessage = 'No data available',
  dense = true,
  rowsPerPageOptions = [5, 10, 25, 50],
}) => {
  const theme = useTheme();

  const formatCellValue = (rawValue: any) => {
    if (rawValue !== undefined && rawValue !== null) {
      return typeof rawValue === 'object'
        ? JSON.stringify(rawValue)
        : String(rawValue);
    }
    return '-';
  };

  const getTooltipContent = (rawValue: any) => {
    if (rawValue !== undefined && rawValue !== null) {
      return typeof rawValue === 'object'
        ? JSON.stringify(rawValue, null, 2)
        : String(rawValue);
    }
    return 'No data';
  };

  const shouldShowTooltip = (cellValue: string, rawValue: any) => {
    return cellValue.length > 30 || typeof rawValue === 'object';
  };

  if (rows.length === 0 && !loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <TableContainer component={Paper} variant="outlined">
        <Table 
          sx={{ minWidth: 650 }} 
          size={dense ? "small" : "medium"}
        >
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column}
                  sx={{
                    fontWeight: 'bold',
                    backgroundColor: theme.palette.grey[50],
                  }}
                >
                  {column}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                {columns.map((column) => {
                  const rawValue = row[column];
                  const cellValue = formatCellValue(rawValue);
                  const tooltipContent = getTooltipContent(rawValue);
                  const showTooltip = shouldShowTooltip(cellValue, rawValue);
                  
                  return (
                    <TableCell 
                      key={`${row.id}-${column}`}
                      sx={{
                        maxWidth: '200px',
                        maxHeight: '60px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        position: 'relative',
                      }}
                    >
                      {showTooltip ? (
                        <Tooltip 
                          title={
                            <Box component="pre" sx={{ 
                              whiteSpace: 'pre-wrap', 
                              fontSize: '0.75rem',
                              fontFamily: 'monospace',
                              maxWidth: '400px',
                              maxHeight: '300px',
                              overflow: 'auto'
                            }}>
                              {tooltipContent}
                            </Box>
                          } 
                          placement="top"
                          arrow
                          enterDelay={300}
                        >
                          <span style={{ cursor: 'help' }}>{cellValue}</span>
                        </Tooltip>
                      ) : (
                        <span>{cellValue}</span>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={rowsPerPageOptions}
        component="div"
        count={totalCount}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
      />
    </>
  );
};

export default DataTable;