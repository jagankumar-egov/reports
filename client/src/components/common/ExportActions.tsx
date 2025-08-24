import React from 'react';
import {
  Button,
  Box,
} from '@mui/material';
import {
  Download as DownloadIcon,
  ViewColumn as ColumnIcon,
} from '@mui/icons-material';

interface ExportActionsProps {
  onExcelExport: () => void;
  onColumnFilterClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  selectedColumnsCount: number;
  totalColumnsCount: number;
  disabled?: boolean;
  showExcelExport?: boolean;
  showColumnFilter?: boolean;
  excelLabel?: string;
  columnLabel?: string;
}

const ExportActions: React.FC<ExportActionsProps> = ({
  onExcelExport,
  onColumnFilterClick,
  selectedColumnsCount,
  totalColumnsCount,
  disabled = false,
  showExcelExport = true,
  showColumnFilter = true,
  excelLabel = 'Export Excel',
  columnLabel = 'Columns',
}) => {
  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      {showExcelExport && (
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={onExcelExport}
          disabled={disabled}
        >
          {excelLabel}
        </Button>
      )}
      
      {showColumnFilter && (
        <Button
          variant="outlined"
          startIcon={<ColumnIcon />}
          onClick={onColumnFilterClick}
          disabled={disabled}
        >
          {columnLabel} ({selectedColumnsCount}/{totalColumnsCount})
        </Button>
      )}
    </Box>
  );
};

export default ExportActions;