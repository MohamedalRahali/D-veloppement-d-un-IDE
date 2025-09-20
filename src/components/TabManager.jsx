import React, { useState } from 'react';

const TabManager = ({ tabs, activeTab, onTabChange, onTabClose, onTabReorder }) => {
  const [draggedTab, setDraggedTab] = useState(null);

  const handleTabClick = (tabId) => {
    onTabChange(tabId);
  };

  const handleTabClose = (e, tabId) => {
    e.stopPropagation();
    onTabClose(tabId);
  };

  const handleDragStart = (e, tabId) => {
    setDraggedTab(tabId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetTabId) => {
    e.preventDefault();
    if (draggedTab && draggedTab !== targetTabId) {
      onTabReorder(draggedTab, targetTabId);
    }
    setDraggedTab(null);
  };

  const getFileIcon = (filename) => {
    if (!filename) return '📄';
    
    const ext = filename.split('.').pop().toLowerCase();
    const iconMap = {
      'js': '📜',
      'jsx': '⚛️',
      'ts': '📘',
      'tsx': '⚛️',
      'html': '🌐',
      'css': '🎨',
      'scss': '🎨',
      'json': '📋',
      'xml': '📄',
      'py': '🐍',
      'java': '☕',
      'cpp': '⚙️',
      'c': '⚙️',
      'cs': '💎',
      'php': '🐘',
      'rb': '💎',
      'go': '🐹',
      'rs': '🦀',
      'sql': '🗄️',
      'md': '📝',
      'txt': '📄',
      'png': '🖼️',
      'jpg': '🖼️',
      'jpeg': '🖼️',
      'gif': '🖼️',
      'svg': '🖼️',
      'pdf': '📕',
      'zip': '📦',
      'rar': '📦',
      'tar': '📦',
      'gz': '📦'
    };
    
    return iconMap[ext] || '📄';
  };

  const getTabTitle = (filePath) => {
    if (!filePath) return 'Nouveau fichier';
    const parts = filePath.split('\\');
    return parts[parts.length - 1] || 'Nouveau fichier';
  };

  return (
    <div className="tabs">
      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          draggable
          onDragStart={(e) => handleDragStart(e, tab.id)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, tab.id)}
          onClick={() => handleTabClick(tab.id)}
          className={`tab ${activeTab === tab.id ? 'active' : ''} ${draggedTab === tab.id ? 'dragging' : ''}`}
        >
          <div className="tab-content">
            <span className="tab-icon">
              {getFileIcon(tab.filePath)}
            </span>
            <span className="tab-title">
              {getTabTitle(tab.filePath)}
            </span>
            <button
              onClick={(e) => handleTabClose(e, tab.id)}
              className="tab-close-btn"
              title="Fermer l'onglet"
            >
              ×
            </button>
            {tab.modified && (
              <div className="tab-modified-indicator" />
            )}
          </div>
        </div>
      ))}
      
      {/* Bouton pour ajouter un nouvel onglet */}
      <button
        onClick={() => onTabChange('new')}
        className="tab-add-btn"
        title="Nouvel onglet"
      >
        +
      </button>
    </div>
  );
};

export default TabManager; 