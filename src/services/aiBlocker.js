const { session } = require('electron');

// Liste complète des sites d'IA à bloquer
const AI_SITES = [
  // GitHub Copilot
  'github.com/copilot',
  'copilot.github.com',
  'copilot-proxy.githubusercontent.com',
  
  // OpenAI ChatGPT
  'chat.openai.com',
  'platform.openai.com',
  'api.openai.com',
  
  // Google AI
  'bard.google.com',
  'generativelanguage.googleapis.com',
  'ai.google.dev',
  
  // Microsoft AI
  'copilot.microsoft.com',
  'www.bing.com/chat',
  'copilotstudio.microsoft.com',
  
  // Anthropic Claude
  'claude.ai',
  'console.anthropic.com',
  
  // Autres IA populaires
  'replit.com/ghostwriter',
  'cursor.sh',
  'codeium.com',
  'tabnine.com',
  'kite.com',
  'intellicode.visualstudio.com',
  
  // APIs d'IA
  'api.anthropic.com',
  'api.cohere.ai',
  'api.huggingface.co',
  'api.deepai.org',
  
  // Sites de génération de code
  'code-generator.com',
  'ai-code-generator.com',
  'code-ai.com',
  'ai-coder.com'
];

// Mots-clés à détecter dans les requêtes
const AI_KEYWORDS = [
  'copilot',
  'chatgpt',
  'bard',
  'claude',
  'ai code',
  'code generation',
  'generate code',
  'ai assistant',
  'code completion',
  'intellicode',
  'ghostwriter',
  'codeium',
  'tabnine',
  'kite'
];

function initializeAIBlocker() {
  console.log('🔒 Initialisation du blocage IA...');
  
  // Bloquer les sites d'IA
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const url = details.url.toLowerCase();
    
    // Vérifier si l'URL contient un site d'IA
    const isAISite = AI_SITES.some(site => url.includes(site.toLowerCase()));
    
    if (isAISite) {
      console.log(`🚫 Site IA bloqué: ${details.url}`);
      logBlockedAccess('ai_site_blocked', { url: details.url, timestamp: new Date().toISOString() });
      callback({ cancel: true });
      return;
    }
    
    // Vérifier les mots-clés dans l'URL
    const hasAIKeywords = AI_KEYWORDS.some(keyword => url.includes(keyword.toLowerCase()));
    
    if (hasAIKeywords) {
      console.log(`🚫 Requête IA détectée: ${details.url}`);
      logBlockedAccess('ai_keyword_detected', { url: details.url, keyword: AI_KEYWORDS.find(k => url.includes(k.toLowerCase())), timestamp: new Date().toISOString() });
      callback({ cancel: true });
      return;
    }
    
    callback({ cancel: false });
  });
  
  // Bloquer les requêtes API d'IA
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const headers = details.requestHeaders;
    
    // Détecter les headers d'API d'IA
    const aiHeaders = [
      'authorization: bearer sk-', // OpenAI
      'x-api-key: ', // Anthropic
      'anthropic-version: ', // Anthropic
      'x-cohere-version: ', // Cohere
    ];
    
    const hasAIHeaders = aiHeaders.some(header => {
      const [key, value] = header.split(': ');
      return headers[key] && headers[key].toLowerCase().includes(value.toLowerCase());
    });
    
    if (hasAIHeaders) {
      console.log(`🚫 Headers IA détectés: ${details.url}`);
      logBlockedAccess('ai_api_blocked', { url: details.url, headers: Object.keys(headers), timestamp: new Date().toISOString() });
      callback({ cancel: true });
      return;
    }
    
    callback({ requestHeaders: headers });
  });
  
  console.log('✅ Blocage IA initialisé');
}

function logBlockedAccess(eventType, data) {
  const logger = require('./logger.js');
  logger.logEvent(eventType, {
    ...data,
    severity: 'high',
    action: 'blocked'
  });
}

module.exports = {
  initializeAIBlocker,
  AI_SITES,
  AI_KEYWORDS
}; 