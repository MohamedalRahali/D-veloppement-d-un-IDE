import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

const TerminalComponent = ({ 
  id, 
  workingDirectory, 
  onCommandExecuted,
  height = '300px',
  theme = 'dark'
}) => {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [commandHistory, setCommandHistory] = useState([]);
  const [currentCommand, setCurrentCommand] = useState('');

  useEffect(() => {
    if (terminalRef.current) {
      // Configurer xterm.js
      xtermRef.current = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Consolas, "Courier New", monospace',
        theme: theme === 'dark' ? {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
          cursor: '#ffffff',
          selection: '#264f78',
          black: '#000000',
          red: '#cd3131',
          green: '#0dbc79',
          yellow: '#e5e510',
          blue: '#2472c8',
          magenta: '#bc3fbc',
          cyan: '#11a8cd',
          white: '#e5e5e5',
          brightBlack: '#666666',
          brightRed: '#f14c4c',
          brightGreen: '#23d18b',
          brightYellow: '#f5f543',
          brightBlue: '#3b8eea',
          brightMagenta: '#d670d6',
          brightCyan: '#29b8db',
          brightWhite: '#ffffff'
        } : {
          background: '#ffffff',
          foreground: '#000000',
          cursor: '#000000',
          selection: '#add6ff',
          black: '#000000',
          red: '#cd3131',
          green: '#00bc00',
          yellow: '#949800',
          blue: '#0451a5',
          magenta: '#bc05bc',
          cyan: '#0598bc',
          white: '#555555',
          brightBlack: '#666666',
          brightRed: '#cd3131',
          brightGreen: '#14ce14',
          brightYellow: '#b5ba00',
          brightBlue: '#0451a5',
          brightMagenta: '#bc05bc',
          brightCyan: '#0598bc',
          brightWhite: '#a5a5a5'
        },
        cols: 80,
        rows: 24,
        scrollback: 1000,
        allowTransparency: true
      });

      fitAddonRef.current = new FitAddon();
      xtermRef.current.loadAddon(fitAddonRef.current);
      xtermRef.current.open(terminalRef.current);
      fitAddonRef.current.fit();

      // Simuler un terminal basique
      const welcomeMessage = `Secure IDE Terminal v1.0.0
Working Directory: ${workingDirectory}
Type 'help' for available commands.

$ `;
      xtermRef.current.write(welcomeMessage);

      // Gérer les entrées utilisateur
      xtermRef.current.onData((data) => {
        if (data === '\r') {
          // Commande terminée
          const command = currentCommand.trim();
          if (command) {
            executeCommand(command);
            setCurrentCommand('');
          }
          xtermRef.current.write('\r\n$ ');
        } else if (data === '\u007f') {
          // Backspace
          if (currentCommand.length > 0) {
            setCurrentCommand(prev => prev.slice(0, -1));
            xtermRef.current.write('\b \b');
          }
        } else if (data >= ' ') {
          // Caractère normal
          setCurrentCommand(prev => prev + data);
          xtermRef.current.write(data);
        }
      });

      // Gérer le redimensionnement
      const handleResize = () => {
        if (fitAddonRef.current) {
          fitAddonRef.current.fit();
        }
      };

      window.addEventListener('resize', handleResize);
      setIsConnected(true);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (xtermRef.current) {
          xtermRef.current.dispose();
        }
      };
    }
  }, [workingDirectory, theme]);

  const executeCommand = (command) => {
    // Logger la commande
    if (onCommandExecuted) {
      onCommandExecuted(command);
    }

    // Simuler quelques commandes basiques
    const cmd = command.toLowerCase();
    let response = '';

    switch (cmd) {
      case 'help':
        response = `Available commands:
- help: Show this help
- ls: List files (simulated)
- pwd: Show current directory
- clear: Clear terminal
- date: Show current date
- whoami: Show current user
- echo [text]: Echo text
- exit: Close terminal

$ `;
        break;
      case 'ls':
        response = `Desktop/  Documents/  Downloads/  Pictures/  Videos/
node_modules/  package.json  src/  main.js

$ `;
        break;
      case 'pwd':
        response = `${workingDirectory}\n$ `;
        break;
      case 'clear':
        xtermRef.current.clear();
        response = `$ `;
        break;
      case 'date':
        response = `${new Date().toLocaleString()}\n$ `;
        break;
      case 'whoami':
        response = `secure-ide-user\n$ `;
        break;
      case 'exit':
        response = `Terminal closed.\n`;
        break;
      default:
        if (cmd.startsWith('echo ')) {
          response = `${command.substring(5)}\n$ `;
        } else {
          response = `Command not found: ${command}\n$ `;
        }
    }

    xtermRef.current.write(response);
  };

  return (
    <div style={{ 
      height: height, 
      width: '100%',
      border: '1px solid #444',
      borderRadius: '4px',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <div 
        ref={terminalRef} 
        style={{ 
          height: '100%', 
          width: '100%',
          padding: '8px'
        }} 
      />
      {!isConnected && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#888',
          fontSize: '14px'
        }}>
          Connexion au terminal...
        </div>
      )}
    </div>
  );
};

export default TerminalComponent; 