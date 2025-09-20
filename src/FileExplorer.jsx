import React, { useEffect, useState } from 'react';

function FileNode({ node, onFileClick, onFolderSelect, depth = 0, selectedFolder = '' }) {
  const [expanded, setExpanded] = useState(depth < 2); // Ouvrir seulement les 2 premiers niveaux
  const [children, setChildren] = useState(node.children || []);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (node.type === 'directory') {
      // Sélectionner le dossier
      if (onFolderSelect) {
        onFolderSelect(node.path);
      }
      
      if (!expanded && (!children || children.length === 0)) {
        // Charger les enfants seulement quand on ouvre
        setLoading(true);
        try {
          console.log('Loading children for:', node.path);
          const childTree = await window.api.getDirectoryTree(node.path);
          console.log('Children loaded:', childTree);
          setChildren(childTree.children || []);
        } catch (error) {
          console.error('Erreur lors du chargement des enfants:', error);
          setChildren([]);
        }
        setLoading(false);
      }
      setExpanded(!expanded);
    } else {
      onFileClick(node.path);
    }
  };

  // Emoji selon type et état
  let emoji = '📄';
  if (node.type === 'directory') {
    if (loading) emoji = '⏳';
    else if (expanded) emoji = '📂';
    else emoji = '📁';
  }

  // Limiter l'affichage pour éviter les performances
  const maxDepth = 4;
  if (depth > maxDepth) return null;

  const isSelected = selectedFolder === node.path;

  return (
    <div className="file-node" style={{ marginLeft: Math.min(depth * 16, 64) }}>
      <div 
        onClick={handleClick} 
        className={`file-item ${isSelected ? 'selected' : ''} ${node.type === 'directory' ? 'directory' : 'file'}`}
      >
        <span className="file-icon">{emoji}</span> 
        <span className="file-name">
          {node.name}
        </span>
        {isSelected && <span className="selected-indicator">✓</span>}
      </div>
      {expanded && children && children.length > 0 && (
        <div>
          {children.slice(0, 50).map(child => ( // Limiter à 50 éléments max
            <FileNode 
              key={child.path} 
              node={child} 
              onFileClick={onFileClick}
              onFolderSelect={onFolderSelect}
              selectedFolder={selectedFolder}
              depth={depth + 1}
            />
          ))}
          {children.length > 50 && (
            <div style={{ 
              marginLeft: 16, 
              color: '#888', 
              fontSize: '11px', 
              fontStyle: 'italic' 
            }}>
              ... et {children.length - 50} autres éléments
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FileExplorer({ root, onFileClick, onFolderSelect, selectedFolder = '' }) {
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchTree() {
      try {
        setLoading(true);
        setError(null);
        
        console.log('=== FILEEXPLORER DEBUG START ===');
        console.log('FileExplorer: Checking window object...');
        console.log('window available:', typeof window !== 'undefined');
        console.log('window.api available:', typeof window !== 'undefined' && !!window.api);
        
        if (typeof window === 'undefined') {
          throw new Error('window object is not available');
        }
        
        if (!window.api) {
          console.log('window.api is undefined, checking window object keys:', Object.keys(window));
          throw new Error('window.api is not available - preload script may not be loaded');
        }
        
        // Test simple de l'API
        console.log('Testing window.api.test...');
        try {
          const testResult = window.api.test();
          console.log('✅ Test result:', testResult);
        } catch (testError) {
          console.error('❌ Test failed:', testError);
        }
        
        console.log('window.api methods available:', Object.keys(window.api));
        console.log('window.api.getDirectoryTree available:', !!(window.api && window.api.getDirectoryTree));
        
        if (!window.api.getDirectoryTree) {
          throw new Error('window.api.getDirectoryTree is not available');
        }
        
        console.log('FileExplorer: Fetching tree for root:', root);
        // Charger seulement le niveau racine avec une limite
        const res = await window.api.getDirectoryTree(root);
        console.log('FileExplorer: Tree received:', res);
        
        // Limiter les enfants du niveau racine pour les performances
        if (res.children && res.children.length > 20) {
          res.children = res.children.slice(0, 20);
        }
        
        setTree(res);
        console.log('=== FILEEXPLORER DEBUG END ===');
      } catch (e) {
        console.error('=== FILEEXPLORER ERROR ===');
        console.error('Erreur lors de la récupération de l\'arborescence', e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    
    if (root) {
      fetchTree();
    }
  }, [root]);

  if (loading) {
    return (
      <div style={{ 
        background: '#23272e', 
        height: '100%', 
        width: 260, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#888',
        fontSize: '14px'
      }}>
        ⏳ Chargement de l'arborescence...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        background: '#23272e', 
        height: '100%', 
        width: 260, 
        padding: '16px',
        color: '#f44',
        fontSize: '12px'
      }}>
        ❌ Erreur: {error}
        <br />
        <button 
          onClick={() => window.location.reload()} 
          style={{ 
            marginTop: '8px', 
            padding: '4px 8px', 
            background: '#007acc', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '2px',
            cursor: 'pointer'
          }}
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!tree) {
    return (
      <div style={{ 
        background: '#23272e', 
        height: '100%', 
        width: 260, 
        padding: '16px',
        color: '#888',
        fontSize: '12px'
      }}>
        📁 Aucun dossier trouvé
      </div>
    );
  }

  return (
    <div style={{ 
      background: '#23272e', 
      height: '100%', 
      width: 260, 
      overflowY: 'auto', 
      borderRight: '1px solid #333',
      fontSize: '13px'
    }}>
      <div style={{ 
        padding: '8px 12px', 
        background: '#2d2d30', 
        borderBottom: '1px solid #333',
        fontWeight: 'bold',
        color: '#fff'
      }}>
        📁 Explorateur de fichiers
      </div>
      <FileNode 
        node={tree} 
        onFileClick={onFileClick}
        onFolderSelect={onFolderSelect}
        selectedFolder={selectedFolder}
      />
    </div>
  );
}
