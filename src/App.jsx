import React, { useState, useEffect } from 'react';
import FileExplorer from './FileExplorer';
import MonacoEditor from './components/MonacoEditor';
import TabManager from './components/TabManager';
import TerminalComponent from './components/Terminal';

console.log('=== APP COMPONENT LOADING ===');

const App = () => {
  console.log('App component rendering...');
  
  const [rootPath, setRootPath] = useState('');
  const [tabs, setTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [tabContents, setTabContents] = useState({});
  const [showTerminal, setShowTerminal] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [refreshExplorer, setRefreshExplorer] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [modalError, setModalError] = useState('');
  const [showCreateDirModal, setShowCreateDirModal] = useState(false);
  const [newDirName, setNewDirName] = useState('');
  const [dirModalError, setDirModalError] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('');
  const [clipboardContent, setClipboardContent] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [autoSave, setAutoSave] = useState(true);

  useEffect(() => {
    console.log('App useEffect running...');
    // Obtenir le chemin utilisateur pour Windows
    const getUserPath = async () => {
      try {
        console.log('Getting user data path...');
        const userDataPath = await window.api.getUserDataPath();
        console.log('User data path:', userDataPath);
        const homeDir = userDataPath.split('\\').slice(0, -1).join('\\');
        setRootPath(homeDir);
        setSelectedFolder(homeDir);
        console.log('Root path set to:', homeDir);
      } catch (error) {
        console.error('Erreur lors de l\'obtention du chemin utilisateur:', error);
        setRootPath('C:\\Users');
        setSelectedFolder('C:\\Users');
      }
    };
    getUserPath();

    // Obtenir l'adresse IP
    getIpAddress();

    // Surveiller le presse-papiers
    monitorClipboard();
  }, []);

  // Obtenir l'adresse IP
  const getIpAddress = async () => {
    try {
      const systemInfo = await window.api.getSystemInfo();
      if (systemInfo.macAddress) {
        const interfaces = Object.values(systemInfo.macAddress);
        const ipAddresses = interfaces.flat().map(iface => iface.address).filter(ip => ip && ip !== '127.0.0.1');
        if (ipAddresses.length > 0) {
          setIpAddress(ipAddresses[0]);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'IP:', error);
    }
  };

  // Surveiller le presse-papiers
  const monitorClipboard = async () => {
    try {
      const clipboardText = await window.api.readClipboardText();
      setClipboardContent(clipboardText);
    } catch (error) {
      console.error('Erreur lors de la lecture du presse-papiers:', error);
    }
  };

  // Sauvegarde automatique
  useEffect(() => {
    if (autoSave && activeTab) {
      const timer = setTimeout(() => {
        saveTab(activeTab);
      }, 2000); // Sauvegarder après 2 secondes d'inactivité

      return () => clearTimeout(timer);
    }
  }, [tabContents[activeTab], autoSave]);

  // Charger le contenu d'un fichier dans un onglet
  const loadFileInTab = async (filePath) => {
    const existingTab = tabs.find(tab => tab.filePath === filePath);
    if (existingTab) {
      setActiveTab(existingTab.id);
      return;
    }

    const content = await window.api.readFile(filePath);
    const newTab = {
      id: `tab-${Date.now()}`,
      filePath: filePath,
      modified: false
    };

    setTabs(prev => [...prev, newTab]);
    setTabContents(prev => ({ ...prev, [newTab.id]: content || '' }));
    setActiveTab(newTab.id);
  };

  // Gérer les changements dans l'éditeur
  const handleEditorChange = (tabId, newContent) => {
    setTabContents(prev => ({ ...prev, [tabId]: newContent }));
    setTabs(prev => prev.map(tab => 
      tab.id === tabId ? { ...tab, modified: true } : tab
    ));
  };



  // Copier le contenu actuel
  const copyCurrentContent = async () => {
    if (activeTab) {
      const content = tabContents[activeTab];
      await window.api.writeClipboardText(content);
      setClipboardContent(content);
      console.log('Contenu copié dans le presse-papiers');
    }
  };

  // Coller le contenu du presse-papiers
  const pasteContent = async () => {
    try {
      const clipboardText = await window.api.readClipboardText();
      if (activeTab && clipboardText) {
        const currentContent = tabContents[activeTab] || '';
        const newContent = currentContent + clipboardText;
        handleEditorChange(activeTab, newContent);
        console.log('Contenu collé depuis le presse-papiers');
      }
    } catch (error) {
      console.error('Erreur lors du collage:', error);
    }
  };

  // Fermer un onglet
  const closeTab = async (tabId) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab && tab.modified) {
      const shouldSave = window.confirm('Voulez-vous sauvegarder les modifications ?');
      if (shouldSave) {
        // Sauvegarde automatique déjà en place
        console.log('Sauvegarde automatique activée');
      }
    }

    setTabs(prev => prev.filter(t => t.id !== tabId));
    setTabContents(prev => {
      const newContents = { ...prev };
      delete newContents[tabId];
      return newContents;
    });

    if (activeTab === tabId) {
      const remainingTabs = tabs.filter(t => t.id !== tabId);
      setActiveTab(remainingTabs.length > 0 ? remainingTabs[0].id : null);
    }
  };

  // Réorganiser les onglets
  const reorderTabs = (draggedId, targetId) => {
    const draggedIndex = tabs.findIndex(t => t.id === draggedId);
    const targetIndex = tabs.findIndex(t => t.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;

    const newTabs = [...tabs];
    const [draggedTab] = newTabs.splice(draggedIndex, 1);
    newTabs.splice(targetIndex, 0, draggedTab);
    
    setTabs(newTabs);
  };

  // Gérer les commandes du terminal
  const handleTerminalCommand = (command) => {
    // Logger la commande exécutée
    window.api.logEvent({
      type: 'terminal_command',
      data: {
        command,
        timestamp: new Date().toISOString()
      }
    });
  };

  // Détecter le langage basé sur l'extension
  const getLanguageFromPath = (filePath) => {
    if (!filePath) return 'plaintext';
    const ext = filePath.split('.').pop().toLowerCase();
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

  // Fichier
  const handleCreateFile = () => {
    setShowCreateModal(true);
    setNewFileName('');
    setModalError('');
  };

  const handleCreateFileConfirm = async (e) => {
    e.preventDefault();
    if (!newFileName.trim()) {
      setModalError('Nom du fichier requis');
      return;
    }
    let dir = selectedFolder || rootPath;
    const fullPath = dir.endsWith('\\') ? dir + newFileName : dir + '\\' + newFileName;
    const ok = await window.api.createFile(fullPath, '');
    if (ok) {
      setRefreshExplorer(r => r + 1);
      await loadFileInTab(fullPath);
      setShowCreateModal(false);
    } else {
      setModalError('Erreur lors de la création du fichier (existe déjà ?)');
    }
  };

  const handleDeleteFile = async () => {
    if (!activeTab) return;
    const activeTabData = tabs.find(t => t.id === activeTab);
    if (!activeTabData || !activeTabData.filePath) return;
    
    if (!window.confirm('Supprimer ce fichier ?')) return;
    const ok = await window.api.deleteFile(activeTabData.filePath);
    if (ok) {
      await closeTab(activeTab);
      setRefreshExplorer(r => r + 1);
    } else {
      alert('Erreur lors de la suppression.');
    }
  };

  // Dossier
  const handleCreateDir = () => {
    setShowCreateDirModal(true);
    setNewDirName('');
    setDirModalError('');
  };

  const handleCreateDirConfirm = async (e) => {
    e.preventDefault();
    if (!newDirName.trim()) {
      setDirModalError('Nom du dossier requis');
      return;
    }
    let dir = selectedFolder || rootPath;
    const fullPath = dir.endsWith('\\') ? dir + newDirName : dir + '\\' + newDirName;
    const ok = await window.api.createDirectory(fullPath);
    if (ok) {
      setRefreshExplorer(r => r + 1);
      setShowCreateDirModal(false);
    } else {
      setDirModalError('Erreur lors de la création du dossier (existe déjà ?)');
    }
  };

  // Sélectionner un dossier
  const handleFolderSelect = (folderPath) => {
    setSelectedFolder(folderPath);
    console.log('Dossier sélectionné:', folderPath);
  };

  console.log('App component about to render, rootPath:', rootPath);

  if (!rootPath) {
    console.log('Root path not ready, showing loading...');
    return <div style={{ padding: 20, color: '#fff', background: '#1e1e1e', height: '100vh' }}>Chargement...</div>;
  }

  const activeTabData = tabs.find(t => t.id === activeTab);
  const currentLanguage = activeTabData ? getLanguageFromPath(activeTabData.filePath) : 'plaintext';

  console.log('App component rendering main UI...');

  return (
    <div className="secure-ide">
      {/* Top Bar */}
      <div className="top-bar">
        <div className="top-bar-left">
          <h1 className="app-title">
            🚀💻✨ Secure IDE ✨💻🚀
          </h1>
          
          <div className="top-bar-actions">
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="theme-toggle"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            <button 
              onClick={() => setShowTerminal(!showTerminal)}
              className={`terminal-toggle ${showTerminal ? 'active' : ''}`}
            >
              💻
            </button>

            <button 
              onClick={() => setAutoSave(!autoSave)}
              className={`autosave-toggle ${autoSave ? 'active' : ''}`}
            >
              💾
            </button>
          </div>
        </div>

        <div className="top-bar-center">
          {activeTab && (
            <div className="file-actions">

              <button onClick={copyCurrentContent} className="action-btn copy">
                📋✨ Copier
              </button>
              <button onClick={pasteContent} className="action-btn paste">
                📋✨ Coller
              </button>
              <button onClick={handleDeleteFile} className="action-btn delete">
                🗑️💥 Supprimer
              </button>

            </div>
          )}
        </div>

        <div className="top-bar-right">
          {ipAddress && (
            <div className="ip-display">
              🌐 {ipAddress}
            </div>
          )}
        </div>
      </div>

      {/* Main Layout */}
      <div className="main-layout">
        {/* Left Panel - File Explorer */}
        <div className="left-panel">
          <div className="panel-header">
            <h3>📁🗂️ Explorateur de fichiers 📁🗂️</h3>
            <div className="panel-actions">
              <button onClick={handleCreateFile} className="panel-btn">
                📄✨ Nouveau fichier
              </button>
              <button onClick={handleCreateDir} className="panel-btn">
                📁✨ Nouveau dossier
              </button>
            </div>
          </div>
          
          <div className="current-folder">
            📁🗂️ {selectedFolder.split('\\').pop() || selectedFolder} 📁🗂️
          </div>
          
          <div className="file-explorer-container">
            <FileExplorer 
              key={refreshExplorer} 
              root={rootPath} 
              onFileClick={loadFileInTab}
              onFolderSelect={handleFolderSelect}
            />
          </div>
        </div>

        {/* Center Panel - Editor */}
        <div className="center-panel">
          {/* Tabs */}
          {tabs.length > 0 && (
            <div className="tabs-container">
              <TabManager
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onTabClose={closeTab}
                onTabReorder={reorderTabs}
              />
            </div>
          )}

          {/* Editor Area */}
          <div className="editor-area">
            {activeTab ? (
              <div className="editor-wrapper">
                <MonacoEditor
                  value={tabContents[activeTab] || ''}
                  onChange={(content) => handleEditorChange(activeTab, content)}
                  language={currentLanguage}
                  theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
                  height="100%"
                />
              </div>
            ) : (
              <div className="welcome-screen">
                <div className="welcome-content">
                  <h1>🚀💻✨ Secure IDE ✨💻🚀</h1>
                  <p>Sélectionnez un fichier pour commencer à éditer</p>
                  <div className="welcome-features">
                    <div className="feature">
                      <span>📝</span>
                      <span>Édition de code avancée</span>
                    </div>
                    <div className="feature">
                      <span>🖥️</span>
                      <span>Terminal intégré</span>
                    </div>
                    <div className="feature">
                      <span>🔒</span>
                      <span>Sécurité renforcée</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Terminal & Info */}
        <div className="right-panel">
          {/* Terminal */}
          {showTerminal && (
            <div className="terminal-section">
              <div className="section-header">
                <h3>🖥️ Terminal</h3>
                <span className="terminal-path">📁 {selectedFolder || rootPath}</span>
              </div>
              <div className="terminal-content">
                <TerminalComponent
                  id="main-terminal"
                  workingDirectory={selectedFolder || rootPath}
                  onCommandExecuted={handleTerminalCommand}
                  height="100%"
                  theme={theme}
                />
              </div>
            </div>
          )}

          {/* Info Panel */}
          <div className="info-section">
            <div className="section-header">
              <h3>ℹ️ Informations</h3>
            </div>
            <div className="info-content">
              <div className="info-grid">
                <div className="info-card">
                  <div className="info-icon">📁</div>
                  <div className="info-text">
                    <div className="info-label">Dossier actuel</div>
                    <div className="info-value">{selectedFolder.split('\\').pop() || selectedFolder}</div>
                  </div>
                </div>
                
                <div className="info-card">
                  <div className="info-icon">📄</div>
                  <div className="info-text">
                    <div className="info-label">Fichiers ouverts</div>
                    <div className="info-value">{tabs.length}</div>
                  </div>
                </div>
                
                <div className="info-card">
                  <div className="info-icon">💾</div>
                  <div className="info-text">
                    <div className="info-label">Auto-save</div>
                    <div className="info-value">{autoSave ? 'Activé' : 'Désactivé'}</div>
                  </div>
                </div>
                
                <div className="info-card">
                  <div className="info-icon">🌐</div>
                  <div className="info-text">
                    <div className="info-label">Adresse IP</div>
                    <div className="info-value">{ipAddress || 'Non disponible'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gestionnaire d'onglets */}
      {tabs.length > 0 && (
        <TabManager
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onTabClose={closeTab}
          onTabReorder={reorderTabs}
        />
      )}

      {/* Contenu principal */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Explorateur de fichiers */}
        <div style={{ width: 260, background: theme === 'dark' ? '#252526' : '#f3f3f3' }}>
          <div style={{ 
            padding: '8px 12px', 
            background: theme === 'dark' ? '#2d2d30' : '#e9ecef',
            borderBottom: `1px solid ${theme === 'dark' ? '#3e3e42' : '#dee2e6'}`,
            fontSize: '12px',
            color: theme === 'dark' ? '#cccccc' : '#495057'
          }}>
            📁 Dossier actuel: {selectedFolder.split('\\').pop() || selectedFolder}
          </div>
          
          <button 
            onClick={handleCreateFile} 
            style={{ 
              width: '100%', 
              padding: 8, 
              background: '#007acc', 
              color: '#ffffff', 
              border: 'none', 
              borderRadius: 0, 
              fontWeight: 'bold', 
              cursor: 'pointer' 
            }}
          >
            + Nouveau fichier
          </button>
          <button 
            onClick={handleCreateDir} 
            style={{ 
              width: '100%', 
              padding: 8, 
              background: '#28a745', 
              color: '#ffffff', 
              border: 'none', 
              borderRadius: 0, 
              fontWeight: 'bold', 
              cursor: 'pointer' 
            }}
          >
            + Nouveau dossier
          </button>
          <FileExplorer 
            key={refreshExplorer} 
            root={rootPath} 
            onFileClick={loadFileInTab}
            onFolderSelect={handleFolderSelect}
          />
        </div>

        {/* Zone d'édition */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {activeTab ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <MonacoEditor
                value={tabContents[activeTab] || ''}
                onChange={(content) => handleEditorChange(activeTab, content)}
                language={currentLanguage}
                theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
                height={showTerminal ? '60%' : '100%'}
              />
              
              {/* Terminal */}
              {showTerminal && (
                <div style={{ height: '40%', padding: '8px' }}>
                  <TerminalComponent
                    id="main-terminal"
                    workingDirectory={selectedFolder || rootPath}
                    onCommandExecuted={handleTerminalCommand}
                    height="100%"
                    theme={theme}
                  />
                </div>
              )}
            </div>
          ) : (
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: theme === 'dark' ? '#888' : '#666',
              fontSize: '18px'
            }}>
              Sélectionnez un fichier pour commencer à éditer
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <div className="modal">
          <form onSubmit={handleCreateFileConfirm} className="modal-content">
            <h2>📄 Créer un nouveau fichier</h2>
            <input
              autoFocus
              type="text"
              value={newFileName}
              onChange={e => { setNewFileName(e.target.value); setModalError(''); }}
              placeholder="Nom du fichier (ex: test.txt)"
              className="modal-input"
            />
            {modalError && <div className="modal-error">{modalError}</div>}
            <div className="modal-actions">
              <button type="button" onClick={() => setShowCreateModal(false)} className="modal-btn cancel">Annuler</button>
              <button type="submit" className="modal-btn">Créer</button>
            </div>
          </form>
        </div>
      )}

      {showCreateDirModal && (
        <div className="modal">
          <form onSubmit={handleCreateDirConfirm} className="modal-content">
            <h2>📁 Créer un nouveau dossier</h2>
            <input
              autoFocus
              type="text"
              value={newDirName}
              onChange={e => { setNewDirName(e.target.value); setDirModalError(''); }}
              placeholder="Nom du dossier (ex: mon_dossier)"
              className="modal-input"
            />
            {dirModalError && <div className="modal-error">{dirModalError}</div>}
            <div className="modal-actions">
              <button type="button" onClick={() => setShowCreateDirModal(false)} className="modal-btn cancel">Annuler</button>
              <button type="submit" className="modal-btn">Créer</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

console.log('=== APP COMPONENT DEFINED ===');

export default App;
