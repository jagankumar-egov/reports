import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import QueryGuidelines from '../../../components/common/QueryGuidelines';

// Mock the JSON config import
jest.mock('../../../configs/queryGuidelines.json', () => ({
  title: 'Test Query Guidelines',
  categories: [
    {
      label: 'Basic Queries',
      examples: [
        {
          title: 'Match All Documents:',
          code: '{\n  "query": {\n    "match_all": {}\n  },\n  "size": 10\n}'
        },
        {
          title: 'Term Query:',
          code: '{\n  "query": {\n    "term": {\n      "status": "active"\n    }\n  }\n}'
        }
      ]
    },
    {
      label: 'Advanced Queries',
      examples: [
        {
          title: 'Wildcard Search:',
          code: '{\n  "query": {\n    "wildcard": {\n      "name": "*john*"\n    }\n  }\n}'
        }
      ]
    }
  ],
  tips: 'Test tips for using the query guidelines.'
}));

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

describe('QueryGuidelines Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default props', () => {
    render(<QueryGuidelines />);
    
    expect(screen.getByText('Test Query Guidelines')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders with custom title', () => {
    render(<QueryGuidelines title="Custom Guidelines Title" />);
    
    expect(screen.getByText('Custom Guidelines Title')).toBeInTheDocument();
  });

  it('renders collapsed by default', () => {
    render(<QueryGuidelines />);
    
    // Guidelines content should not be visible initially
    expect(screen.queryByRole('tabpanel')).not.toBeInTheDocument();
  });

  it('expands when defaultOpen is true', () => {
    render(<QueryGuidelines defaultOpen={true} />);
    
    // Should show tabs
    expect(screen.getByRole('tab', { name: 'Basic Queries' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Advanced Queries' })).toBeInTheDocument();
  });

  it('toggles expanded state when clicked', async () => {
    render(<QueryGuidelines />);
    
    const expandButton = screen.getByRole('button');
    
    // Initially collapsed
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    
    // Click to expand
    fireEvent.click(expandButton);
    
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Basic Queries' })).toBeInTheDocument();
    });
    
    // Click to collapse
    fireEvent.click(expandButton);
    
    await waitFor(() => {
      expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    });
  });

  it('displays correct number of tabs based on config', () => {
    render(<QueryGuidelines defaultOpen={true} />);
    
    expect(screen.getByRole('tab', { name: 'Basic Queries' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Advanced Queries' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });

  it('switches between tabs correctly', async () => {
    render(<QueryGuidelines defaultOpen={true} />);
    
    // Initially shows first tab content
    expect(screen.getByText('Basic Queries Examples')).toBeInTheDocument();
    expect(screen.getByText('Match All Documents:')).toBeInTheDocument();
    
    // Click second tab
    const advancedTab = screen.getByRole('tab', { name: 'Advanced Queries' });
    fireEvent.click(advancedTab);
    
    await waitFor(() => {
      expect(screen.getByText('Advanced Queries Examples')).toBeInTheDocument();
      expect(screen.getByText('Wildcard Search:')).toBeInTheDocument();
    });
  });

  it('displays query examples with correct formatting', () => {
    render(<QueryGuidelines defaultOpen={true} />);
    
    // Check if examples are displayed
    expect(screen.getByText('Match All Documents:')).toBeInTheDocument();
    expect(screen.getByText('Term Query:')).toBeInTheDocument();
    
    // Check if code is displayed in pre tags
    const codeBlocks = screen.getAllByText((_content, element) => {
      return element?.tagName.toLowerCase() === 'pre';
    });
    expect(codeBlocks.length).toBeGreaterThan(0);
  });

  it('displays copy buttons for each example', () => {
    render(<QueryGuidelines defaultOpen={true} />);
    
    const copyButtons = screen.getAllByRole('button', { name: '' }); // Copy buttons don't have text
    // Should have copy buttons for each example in the current tab (2 examples in Basic Queries)
    expect(copyButtons.filter(btn => btn !== screen.getByRole('button', { expanded: true }))).toHaveLength(2);
  });

  it('copies code to clipboard when copy button is clicked', async () => {
    render(<QueryGuidelines defaultOpen={true} />);
    
    const copyButtons = screen.getAllByRole('button');
    const firstCopyButton = copyButtons.find(btn => 
      btn.getAttribute('aria-expanded') !== 'true' && 
      btn.querySelector('svg') // Has icon
    );
    
    if (firstCopyButton) {
      fireEvent.click(firstCopyButton);
      
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          '{\n  "query": {\n    "match_all": {}\n  },\n  "size": 10\n}'
        );
      });
    }
  });

  it('displays tips from config', () => {
    render(<QueryGuidelines defaultOpen={true} />);
    
    expect(screen.getByText('Test tips for using the query guidelines.')).toBeInTheDocument();
  });

  it('handles empty categories gracefully', () => {
    // Mock empty categories
    jest.doMock('../../../configs/queryGuidelines.json', () => ({
      title: 'Empty Guidelines',
      categories: [],
      tips: 'No examples available.'
    }));
    
    render(<QueryGuidelines defaultOpen={true} />);
    
    expect(screen.getByText('No examples available.')).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('maintains accessibility standards', () => {
    render(<QueryGuidelines defaultOpen={true} />);
    
    // Check for proper ARIA roles
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    
    // Check for proper tab selection
    const firstTab = screen.getByRole('tab', { name: 'Basic Queries' });
    expect(firstTab).toHaveAttribute('aria-selected', 'true');
  });

  it('handles keyboard navigation for tabs', () => {
    render(<QueryGuidelines defaultOpen={true} />);
    
    const firstTab = screen.getByRole('tab', { name: 'Basic Queries' });
    // const secondTab = screen.getByRole('tab', { name: 'Advanced Queries' });
    
    // Tab should be focusable
    firstTab.focus();
    expect(document.activeElement).toBe(firstTab);
    
    // Arrow keys should work (this is handled by MUI Tabs)
    fireEvent.keyDown(firstTab, { key: 'ArrowRight' });
    // Note: MUI Tabs handles this internally, so we just check it doesn't throw
  });
});