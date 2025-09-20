import React from 'react';
import { createRoot } from 'react-dom/client';

console.log('=== REACT APP STARTING ===');
console.log('React version:', React.version);
console.log('Document ready state:', document.readyState);

// Composant de test simple
function TestApp() {
  console.log('TestApp component rendering...');
  return React.createElement('div', {
    style: {
      padding: '20px',
      color: '#fff',
      background: '#1e1e1e',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, [
    React.createElement('h1', { key: 'title' }, 'Secure IDE - Test'),
    React.createElement('p', { key: 'status' }, 'React fonctionne !'),
    React.createElement('button', {
      key: 'button',
      onClick: () => alert('Bouton cliqué !'),
      style: {
        padding: '10px 20px',
        background: '#007acc',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
      }
    }, 'Test Button')
  ]);
}

// Initialisation
function initApp() {
  console.log('=== INITIALIZING APP ===');
  
  const container = document.getElementById('root');
  console.log('Container found:', !!container);
  console.log('Container content before React:', container.innerHTML);

  if (!container) {
    console.error('❌ Root container not found!');
    document.body.innerHTML = '<div class="error">Error: Root container not found</div>';
    return;
  }

  try {
    console.log('Creating React root...');
    const root = createRoot(container);
    console.log('✅ React root created successfully');
    
    console.log('Rendering TestApp component...');
    root.render(React.createElement(TestApp));
    console.log('✅ TestApp component rendered');
    
    // Vérifier après un délai
    setTimeout(() => {
      console.log('Container content after React:', container.innerHTML);
      if (container.innerHTML.includes('Chargement de Secure IDE')) {
        console.log('⚠️ React app may not have loaded properly');
      } else {
        console.log('✅ React app loaded successfully');
      }
    }, 1000);
    
  } catch (error) {
    console.error('❌ Error rendering app:', error);
    container.innerHTML = `<div class="error">
      <h2>Erreur de chargement</h2>
      <p>${error.message}</p>
      <button onclick="window.location.reload()">Recharger</button>
    </div>`;
  }
}

// Attendre que le DOM soit prêt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

console.log('=== REACT APP INITIALIZED ===');
