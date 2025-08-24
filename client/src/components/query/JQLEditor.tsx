import React, { useRef, useEffect } from 'react';
import { Box } from '@mui/material';
import Editor, { OnMount } from '@monaco-editor/react';
import { editor } from 'monaco-editor';

interface JQLEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string;
  readOnly?: boolean;
  error?: boolean;
  onValidate?: (isValid: boolean, errors: any[]) => void;
}

const JQLEditor: React.FC<JQLEditorProps> = ({
  value,
  onChange,
  height = '150px',
  readOnly = false,
  error = false,
  onValidate,
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Define JQL language
    monaco.languages.register({ id: 'jql' });

    // Define JQL syntax highlighting
    monaco.languages.setMonarchTokensProvider('jql', {
      tokenizer: {
        root: [
          // Keywords
          [/\b(project|AND|OR|NOT|IN|NULL|ORDER BY|ASC|DESC|LIMIT)\b/i, 'keyword'],
          
          // Operators
          [/[=!~<>]+/, 'operator'],
          
          // Strings
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/"/, 'string', '@string'],
          [/'([^'\\]|\\.)*$/, 'string.invalid'],
          [/'/, 'string', '@string2'],
          
          // Numbers
          [/\d+/, 'number'],
          
          // Field names
          [/[a-zA-Z_][a-zA-Z0-9_]*/, 'identifier'],
          
          // Parentheses
          [/[()[\]]/, 'delimiter.bracket'],
          
          // Commas
          [/,/, 'delimiter.comma'],
          
          // Whitespace
          [/[ \t\r\n]+/, 'white'],
        ],
        
        string: [
          [/[^\\"]+/, 'string'],
          [/\\./, 'string.escape.invalid'],
          [/"/, 'string', '@pop'],
        ],
        
        string2: [
          [/[^\\']+/, 'string'],
          [/\\./, 'string.escape.invalid'],
          [/'/, 'string', '@pop'],
        ],
      },
    });

    // Define JQL language configuration
    monaco.languages.setLanguageConfiguration('jql', {
      brackets: [
        ['(', ')'],
        ['[', ']'],
      ],
      autoClosingPairs: [
        { open: '(', close: ')' },
        { open: '[', close: ']' },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
      ],
      surroundingPairs: [
        { open: '(', close: ')' },
        { open: '[', close: ']' },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
      ],
    });

    // Define completion provider
    monaco.languages.registerCompletionItemProvider('jql', {
      provideCompletionItems: (model, position) => {
        const suggestions = [
          // Keywords
          {
            label: 'project',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'project = ',
            documentation: 'Filter by project',
          },
          {
            label: 'AND',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'AND ',
            documentation: 'Logical AND operator',
          },
          {
            label: 'OR',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'OR ',
            documentation: 'Logical OR operator',
          },
          {
            label: 'NOT',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'NOT ',
            documentation: 'Logical NOT operator',
          },
          {
            label: 'IN',
            kind: monaco.languages.CompletionItemKind.Operator,
            insertText: 'IN (',
            documentation: 'IN operator for multiple values',
          },
          {
            label: 'IS NULL',
            kind: monaco.languages.CompletionItemKind.Operator,
            insertText: 'IS NULL',
            documentation: 'Check if field is null',
          },
          {
            label: 'IS NOT NULL',
            kind: monaco.languages.CompletionItemKind.Operator,
            insertText: 'IS NOT NULL',
            documentation: 'Check if field is not null',
          },
          {
            label: 'ORDER BY',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'ORDER BY ',
            documentation: 'Sort results',
          },
          
          // Common field names (these would be dynamic in a real implementation)
          {
            label: 'status',
            kind: monaco.languages.CompletionItemKind.Field,
            insertText: 'status',
            documentation: 'Status field',
          },
          {
            label: 'priority',
            kind: monaco.languages.CompletionItemKind.Field,
            insertText: 'priority',
            documentation: 'Priority field',
          },
          {
            label: 'assignee',
            kind: monaco.languages.CompletionItemKind.Field,
            insertText: 'assignee',
            documentation: 'Assignee field',
          },
          {
            label: 'created',
            kind: monaco.languages.CompletionItemKind.Field,
            insertText: 'created',
            documentation: 'Created date field',
          },
          {
            label: 'updated',
            kind: monaco.languages.CompletionItemKind.Field,
            insertText: 'updated',
            documentation: 'Updated date field',
          },
        ];

        return { suggestions };
      },
    });

    // Custom theme for JQL
    monaco.editor.defineTheme('jql-theme', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '0000ff', fontStyle: 'bold' },
        { token: 'operator', foreground: 'ff6600' },
        { token: 'string', foreground: '008000' },
        { token: 'number', foreground: 'ff0000' },
        { token: 'identifier', foreground: '000000' },
      ],
      colors: {
        'editor.background': error ? '#fff5f5' : '#ffffff',
        'editor.lineHighlightBackground': '#f5f5f5',
      },
    });

    monaco.editor.setTheme('jql-theme');

    // Set up validation
    const model = editor.getModel();
    if (model && onValidate) {
      model.onDidChangeContent(() => {
        const markers = monaco.editor.getModelMarkers({ resource: model.uri });
        onValidate(markers.length === 0, markers);
      });
    }
  };

  const handleChange = (value: string | undefined) => {
    onChange(value || '');
  };

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: error ? 'error.main' : 'divider',
        borderRadius: 1,
        overflow: 'hidden',
        '&:hover': {
          borderColor: error ? 'error.main' : 'text.primary',
        },
      }}
    >
      <Editor
        height={height}
        language="jql"
        value={value}
        onChange={handleChange}
        onMount={handleEditorDidMount}
        options={{
          readOnly,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 14,
          lineHeight: 20,
          tabSize: 2,
          insertSpaces: true,
          wordWrap: 'on',
          automaticLayout: true,
          folding: false,
          lineNumbers: 'off',
          glyphMargin: false,
          lineDecorationsWidth: 0,
          lineNumbersMinChars: 0,
          renderLineHighlight: 'none',
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
        }}
      />
    </Box>
  );
};

export default JQLEditor;