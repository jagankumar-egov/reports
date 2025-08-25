import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Help as HelpIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import queryGuidelinesConfig from '../../configs/queryGuidelines.json';

interface QueryExample {
  title: string;
  code: string;
}

interface QueryCategory {
  label: string;
  examples: QueryExample[];
}

interface GuidelinesConfig {
  title: string;
  categories: QueryCategory[];
  tips: string;
}

interface QueryGuidelinesProps {
  title?: string;
  defaultOpen?: boolean;
}

const QueryGuidelines: React.FC<QueryGuidelinesProps> = ({
  title,
  defaultOpen = false,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const [selectedTab, setSelectedTab] = useState(0);
  const [config] = useState<GuidelinesConfig>(queryGuidelinesConfig);

  const displayTitle = title || config.title;

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const renderExample = (example: QueryExample) => (
    <Box key={example.title} sx={{ mb: 2 }}>
      <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
        {example.title}
      </Typography>
      <Box sx={{ 
        bgcolor: 'grey.50', 
        p: 2, 
        borderRadius: 1, 
        fontFamily: 'monospace', 
        fontSize: '0.875rem',
        position: 'relative'
      }}>
        <IconButton
          size="small"
          sx={{ position: 'absolute', top: 4, right: 4 }}
          onClick={() => copyToClipboard(example.code)}
        >
          <CopyIcon fontSize="small" />
        </IconButton>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
          {example.code}
        </pre>
      </Box>
    </Box>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <IconButton
          onClick={() => setOpen(!open)}
          size="small"
        >
          {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
        <Typography variant="body2" color="text.secondary">
          {displayTitle}
        </Typography>
        <HelpIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
      </Box>
      
      <Collapse in={open}>
        <Box sx={{ 
          border: 1, 
          borderColor: 'divider', 
          borderRadius: 1, 
          p: 2, 
          bgcolor: 'background.paper',
          mb: 2
        }}>
          <Tabs 
            value={selectedTab} 
            onChange={(_, newTab) => setSelectedTab(newTab)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
          >
            {config.categories.map((category, index) => (
              <Tab key={index} label={category.label} />
            ))}
          </Tabs>
          
          {config.categories.map((category, index) => (
            selectedTab === index && (
              <Box key={index}>
                <Typography variant="subtitle2" gutterBottom>
                  {category.label} Examples
                </Typography>
                {category.examples.map(renderExample)}
              </Box>
            )
          ))}
          
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            {config.tips}
          </Typography>
        </Box>
      </Collapse>
    </Box>
  );
};

export default QueryGuidelines;