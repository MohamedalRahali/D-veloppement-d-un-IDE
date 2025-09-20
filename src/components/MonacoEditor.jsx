import React, { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';

const MonacoEditor = ({ 
  value, 
  onChange, 
  language = 'plaintext', 
  theme = 'vs-dark',
  readOnly = false,
  height = '60vh'
}) => {
  const editorRef = useRef(null);
  const monacoEditorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current) {
      // Configurer Monaco Editor
      monacoEditorRef.current = monaco.editor.create(editorRef.current, {
        value: value || '',
        language: language,
        theme: theme,
        automaticLayout: true,
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        fontSize: 14,
        fontFamily: 'Consolas, "Courier New", monospace',
        lineNumbers: 'on',
        roundedSelection: false,
        scrollbar: {
          vertical: 'visible',
          horizontal: 'visible'
        },
        readOnly: readOnly,
        wordWrap: 'on',
        folding: true,
        lineDecorationsWidth: 10,
        lineNumbersMinChars: 3,
        renderLineHighlight: 'all',
        selectOnLineNumbers: true,
        glyphMargin: true,
        useTabStops: false,
        tabSize: 2,
        insertSpaces: true,
        detectIndentation: true,
        trimAutoWhitespace: true,
        largeFileOptimizations: true,
        suggest: {
          insertMode: 'replace'
        }
      });

      // Écouter les changements
      monacoEditorRef.current.onDidChangeModelContent(() => {
        const newValue = monacoEditorRef.current.getValue();
        onChange(newValue);
      });

      // Configurer les thèmes
      monaco.editor.defineTheme('vs-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#1e1e1e',
          'editor.foreground': '#d4d4d4',
          'editor.lineHighlightBackground': '#2a2d2e',
          'editor.selectionBackground': '#264f78',
          'editor.inactiveSelectionBackground': '#3a3d41'
        }
      });

      monaco.editor.defineTheme('vs-light', {
        base: 'vs',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#ffffff',
          'editor.foreground': '#000000',
          'editor.lineHighlightBackground': '#f7f7f7',
          'editor.selectionBackground': '#add6ff',
          'editor.inactiveSelectionBackground': '#e5ebf1'
        }
      });
    }

    return () => {
      if (monacoEditorRef.current) {
        monacoEditorRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (monacoEditorRef.current && value !== undefined) {
      const currentValue = monacoEditorRef.current.getValue();
      if (currentValue !== value) {
        monacoEditorRef.current.setValue(value);
      }
    }
  }, [value]);

  useEffect(() => {
    if (monacoEditorRef.current) {
      monaco.editor.setTheme(theme);
    }
  }, [theme]);

  useEffect(() => {
    if (monacoEditorRef.current) {
      monacoEditorRef.current.updateOptions({ readOnly });
    }
  }, [readOnly]);

  // Détecter automatiquement le langage basé sur l'extension du fichier
  const detectLanguage = (filename) => {
    if (!filename) return 'plaintext';
    
    const ext = filename.split('.').pop().toLowerCase();
    const languageMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'json': 'json',
      'xml': 'xml',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'sql': 'sql',
      'md': 'markdown',
      'txt': 'plaintext'
    };
    
    return languageMap[ext] || 'plaintext';
  };

  return (
    <div 
      ref={editorRef} 
      style={{ 
        height: height, 
        width: '100%',
        border: '1px solid #444',
        borderRadius: '4px'
      }} 
    />
  );
};

export default MonacoEditor; 