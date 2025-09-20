const { app, BrowserWindow, ipcMain, clipboard, net, session } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const logger = require('./src/services/logger.js');
const { initializeAIBlocker } = require('./src/services/aiBlocker.js');

let mainWindow;

function createWindow() {
  console.log('Creating main window...');
  
  // Vérifier si le fichier preload existe
  const preloadPath = path.join(__dirname, 'preload.js');
  console.log('Preload path:', preloadPath);
  console.log('Preload file exists:', fs.existsSync(preloadPath));
  
  if (!fs.existsSync(preloadPath)) {
    console.error('❌ Preload file not found!');
    return;
  }
  
  // Lire le contenu du preload pour vérifier qu'il est correct
  try {
    const preloadContent = fs.readFileSync(preloadPath, 'utf8');
    console.log('✅ Preload file content length:', preloadContent.length);
    console.log('✅ Preload file starts with:', preloadContent.substring(0, 100));
  } catch (error) {
    console.error('❌ Error reading preload file:', error);
  }
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
      sandbox: false,
      enableRemoteModule: false,
      webSecurity: false,
      allowRunningInsecureContent: true
    },
    icon: path.join(__dirname, 'icon.png'),
    titleBarStyle: 'default',
    show: false
  });

  // Écouter les événements de la fenêtre
  mainWindow.webContents.on('did-start-loading', () => {
    console.log('🔄 Window started loading...');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ Main window loaded successfully');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('❌ Failed to load:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('preload-error', (event, preloadPath, error) => {
    console.error('❌ Preload error:', preloadPath, error);
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer ${level}] ${message} (${sourceId}:${line})`);
  });

  // Charger l'application
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    console.log('Loading URL: http://localhost:3000');
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile('index.html');
  }

  // Afficher la fenêtre quand elle est prête
  mainWindow.once('ready-to-show', () => {
    console.log('🎉 Window ready to show');
    mainWindow.show();
  });

  // Gérer la fermeture
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Définir le Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self' 'unsafe-inline' 'unsafe-eval' data: http: https: ws: wss:"]
      }
    });
  });

  console.log('Main window created');
}

// Gestionnaires IPC
ipcMain.handle('get-user-data-path', () => {
  return app.getPath('userData');
});

ipcMain.handle('get-directory-tree', async (event, rootPath, maxDepth = 3, maxItems = 100) => {
  console.log('get-directory-tree called with:', rootPath, maxDepth, maxItems);
  
  function getTree(dirPath, currentDepth = 0) {
    try {
      const stats = fs.statSync(dirPath);
      if (!stats.isDirectory()) {
        return { name: path.basename(dirPath), path: dirPath, type: 'file' };
      }
      
      if (currentDepth >= maxDepth) {
        return { name: path.basename(dirPath), path: dirPath, type: 'directory', children: [] };
      }
      
      const children = fs.readdirSync(dirPath)
        .slice(0, maxItems)
        .map(child => {
          const childPath = path.join(dirPath, child);
          try {
            const childStats = fs.statSync(childPath);
            if (childStats.isDirectory()) {
              return getTree(childPath, currentDepth + 1);
            } else {
              return { name: child, path: childPath, type: 'file' };
            }
          } catch (error) {
            return null;
          }
        })
        .filter(Boolean);
      
      return {
        name: path.basename(dirPath),
        path: dirPath,
        type: 'directory',
        children
      };
    } catch (error) {
      console.error(`Erreur lors de la lecture du dossier ${dirPath}:`, error);
      return {
        name: path.basename(dirPath),
        path: dirPath,
        type: 'directory',
        children: []
      };
    }
  }

  try {
    console.log('Starting tree generation for:', rootPath);
    const result = getTree(rootPath);
    console.log('Tree generated successfully, items:', result.children ? result.children.length : 0);
    
    // Logger l'accès au répertoire
    logger.logEvent({
      type: 'directory_accessed',
      data: {
        path: rootPath,
        itemCount: result.children ? result.children.length : 0,
        timestamp: new Date().toISOString()
      }
    });
    
    return result;
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'arborescence:', error);
    return {
      name: path.basename(rootPath),
      path: rootPath,
      type: 'directory',
      children: []
    };
  }
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    logger.logEvent({
      type: 'file_read',
      data: { path: filePath, timestamp: new Date().toISOString() }
    });
    return content;
  } catch (error) {
    console.error('Erreur lors de la lecture du fichier:', error);
    return null;
  }
});

ipcMain.handle('write-file', async (event, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    logger.logEvent({
      type: 'file_written',
      data: { path: filePath, timestamp: new Date().toISOString() }
    });
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'écriture du fichier:', error);
    return false;
  }
});

ipcMain.handle('create-file', async (event, filePath, content = '') => {
  try {
    if (fs.existsSync(filePath)) {
      return false;
    }
    fs.writeFileSync(filePath, content, 'utf8');
    logger.logEvent({
      type: 'file_created',
      data: { path: filePath, timestamp: new Date().toISOString() }
    });
    return true;
  } catch (error) {
    console.error('Erreur lors de la création du fichier:', error);
    return false;
  }
});

ipcMain.handle('delete-file', async (event, filePath) => {
  try {
    fs.unlinkSync(filePath);
    logger.logEvent({
      type: 'file_deleted',
      data: { path: filePath, timestamp: new Date().toISOString() }
    });
    return true;
  } catch (error) {
    console.error('Erreur lors de la suppression du fichier:', error);
    return false;
  }
});

ipcMain.handle('create-directory', async (event, dirPath) => {
  try {
    if (fs.existsSync(dirPath)) {
      return false;
    }
    fs.mkdirSync(dirPath, { recursive: true });
    logger.logEvent({
      type: 'directory_created',
      data: { path: dirPath, timestamp: new Date().toISOString() }
    });
    return true;
  } catch (error) {
    console.error('Erreur lors de la création du dossier:', error);
    return false;
  }
});

ipcMain.handle('delete-directory', async (event, dirPath) => {
  try {
    fs.rmSync(dirPath, { recursive: true, force: true });
    logger.logEvent({
      type: 'directory_deleted',
      data: { path: dirPath, timestamp: new Date().toISOString() }
    });
    return true;
  } catch (error) {
    console.error('Erreur lors de la suppression du dossier:', error);
    return false;
  }
});

ipcMain.handle('rename-path', async (event, oldPath, newPath) => {
  try {
    fs.renameSync(oldPath, newPath);
    logger.logEvent({
      type: 'path_renamed',
      data: { oldPath, newPath, timestamp: new Date().toISOString() }
    });
    return true;
  } catch (error) {
    console.error('Erreur lors du renommage:', error);
    return false;
  }
});

// Presse-papiers
ipcMain.handle('read-clipboard-text', async (event) => {
  try {
    const text = clipboard.readText();
    logger.logEvent({
      type: 'clipboard_read',
      data: { 
        contentLength: text.length,
        timestamp: new Date().toISOString() 
      }
    });
    return text;
  } catch (error) {
    console.error('Erreur lors de la lecture du presse-papiers:', error);
    return '';
  }
});

ipcMain.handle('write-clipboard-text', async (event, text) => {
  try {
    clipboard.writeText(text);
    logger.logEvent({
      type: 'clipboard_written',
      data: { 
        contentLength: text.length,
        timestamp: new Date().toISOString() 
      }
    });
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'écriture dans le presse-papiers:', error);
    return false;
  }
});

// Informations système
ipcMain.handle('get-system-info', async (event) => {
  try {
    const networkInterfaces = os.networkInterfaces();
    const macAddress = {};
    
    // Extraire les adresses MAC et IP
    Object.keys(networkInterfaces).forEach(interfaceName => {
      const interfaces = networkInterfaces[interfaceName];
      macAddress[interfaceName] = interfaces.map(iface => ({
        address: iface.address,
        mac: iface.mac,
        family: iface.family,
        internal: iface.internal
      }));
    });

    const systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      userInfo: os.userInfo(),
      macAddress: macAddress,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpus: os.cpus().length
    };

    logger.logEvent({
      type: 'system_info_accessed',
      data: { 
        hostname: systemInfo.hostname,
        platform: systemInfo.platform,
        timestamp: new Date().toISOString() 
      }
    });

    return systemInfo;
  } catch (error) {
    console.error('Erreur lors de la récupération des informations système:', error);
    return null;
  }
});

// Logging
ipcMain.handle('log-event', async (event, logData) => {
  try {
    logger.logEvent(logData);
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du log:', error);
    return false;
  }
});

// Surveillance du presse-papiers améliorée
let lastClipboardContent = '';
let clipboardMonitoringInterval;

function monitorClipboard() {
  clipboardMonitoringInterval = setInterval(() => {
    try {
      const currentContent = clipboard.readText();
      
      if (currentContent !== lastClipboardContent && currentContent.trim() !== '') {
        console.log('📋 Contenu clipboard détecté:', currentContent.substring(0, 100) + '...');
        
        // Analyser le contenu pour détecter du code
        const isCode = detectCodeContent(currentContent);
        
        logger.logEvent('clipboard_action', {
          action: 'copy',
          content_length: currentContent.length,
          content_preview: currentContent.substring(0, 200),
          is_code: isCode,
          timestamp: new Date().toISOString(),
          severity: isCode ? 'high' : 'medium'
        });
        
        lastClipboardContent = currentContent;
      }
    } catch (error) {
      console.error('Erreur surveillance clipboard:', error);
    }
  }, 1000); // Vérifier toutes les secondes
}

// Détecter si le contenu clipboard contient du code
function detectCodeContent(content) {
  const codePatterns = [
    /function\s+\w+\s*\(/i,
    /const\s+\w+\s*=/i,
    /let\s+\w+\s*=/i,
    /var\s+\w+\s*=/i,
    /if\s*\(/i,
    /for\s*\(/i,
    /while\s*\(/i,
    /class\s+\w+/i,
    /import\s+/i,
    /export\s+/i,
    /require\s*\(/i,
    /console\.log/i,
    /return\s+/i,
    /public\s+class/i,
    /private\s+/i,
    /protected\s+/i,
    /def\s+\w+/i,
    /print\s*\(/i,
    /#include/i,
    /using\s+namespace/i,
    /namespace\s+\w+/i,
    /<html>/i,
    /<script>/i,
    /<style>/i,
    /<!DOCTYPE/i
  ];
  
  return codePatterns.some(pattern => pattern.test(content));
}

// Surveillance de l'accès internet
function monitorInternetAccess() {
  const testUrl = 'https://www.google.com';
  
  setInterval(async () => {
    try {
      const request = net.request(testUrl);
      request.on('response', (response) => {
        if (response.statusCode === 200) {
          logger.logEvent({
            type: 'internet_access',
            data: { timestamp: new Date().toISOString() }
          });
        }
      });
      request.on('error', (error) => {
        console.log('Pas d\'accès internet:', error.message);
      });
      request.end();
    } catch (error) {
      console.error('Erreur lors du test d\'accès internet:', error);
    }
  }, 30000); // Tester toutes les 30 secondes
}

// Initialisation de l'application
app.whenReady().then(() => {
  console.log('🚀 Application prête');
  
  // Initialiser le blocage IA
  initializeAIBlocker();
  
  // Démarrer la surveillance clipboard
  monitorClipboard();
  
  // Démarrer la surveillance internet
  setTimeout(() => {
    monitorInternetAccess();
  }, 2000);
  
  createWindow();
  
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  console.error('Erreur non capturée:', error);
  logger.logEvent({
    type: 'uncaught_exception',
    data: { 
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString() 
    }
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promesse rejetée non gérée:', reason);
  logger.logEvent({
    type: 'unhandled_rejection',
    data: { 
      reason: reason.toString(),
      timestamp: new Date().toISOString() 
    }
  });
});