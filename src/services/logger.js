const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');

class Logger {
  constructor() {
    this.encryptionKey = 'votre_cle_secrete_tres_longue_et_securisee_32_chars!!';
    this.logDir = path.join(app.getPath('userData'), 'logs');
    this.logFile = path.join(this.logDir, 'activity.log');

    if (!fs.existsSync(this.logDir)) {
      try {
        fs.mkdirSync(this.logDir, { recursive: true });
      } catch (error) {
        console.error('Erreur lors de la création du dossier de logs:', error);
      }
    }
  }

  encrypt(text) {
    try {
      const iv = crypto.randomBytes(16);
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Erreur de chiffrement:', error);
      // Fallback simple pour éviter les erreurs
      return Buffer.from(text).toString('base64');
    }
  }

  decrypt(encryptedText) {
    try {
      if (encryptedText.includes(':')) {
        const parts = encryptedText.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      } else {
        return Buffer.from(encryptedText, 'base64').toString('utf8');
      }
    } catch (error) {
      console.error('Erreur de déchiffrement:', error);
      return encryptedText;
    }
  }

  logEvent(eventData) {
    try {
      const logEntry = {
        ...eventData,
        timestamp: eventData.timestamp || new Date().toISOString(),
        id: crypto.randomBytes(16).toString('hex')
      };
      const encryptedLog = this.encrypt(JSON.stringify(logEntry));
      fs.appendFileSync(this.logFile, encryptedLog + '\n');
      console.log('Log enregistré:', logEntry.type);
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du log:', error);
    }
  }

  getLogFilePath() {
    return this.logFile;
  }
}

module.exports = new Logger(); 