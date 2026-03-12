import AsyncStorage from '@react-native-async-storage/async-storage';

interface LogEntry {
  timestamp: string;
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  message: string;
  error?: any;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 100;

  private async addLog(level: LogEntry['level'], message: string, error?: any): Promise<void> {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    };

    this.logs.push(entry);
    
    // Garder seulement les derniers logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Sauvegarder dans AsyncStorage
    try {
      await AsyncStorage.setItem('app_logs', JSON.stringify(this.logs));
    } catch (e) {
      console.error('❌ Erreur sauvegarde logs:', e);
    }

    // Afficher dans console
    const logMessage = `[${entry.timestamp}] ${level}: ${message}`;
    switch (level) {
      case 'ERROR':
        console.error(logMessage, error || '');
        break;
      case 'WARN':
        console.warn(logMessage);
        break;
      case 'INFO':
        console.info(logMessage);
        break;
      case 'DEBUG':
        console.debug(logMessage);
        break;
    }
  }

  async error(message: string, error?: any): Promise<void> {
    await this.addLog('ERROR', message, error);
  }

  async warn(message: string): Promise<void> {
    await this.addLog('WARN', message);
  }

  async info(message: string): Promise<void> {
    await this.addLog('INFO', message);
  }

  async debug(message: string): Promise<void> {
    await this.addLog('DEBUG', message);
  }

  async getLogs(): Promise<LogEntry[]> {
    try {
      const stored = await AsyncStorage.getItem('app_logs');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('❌ Erreur lecture logs:', e);
      return [];
    }
  }

  async clearLogs(): Promise<void> {
    this.logs = [];
    try {
      await AsyncStorage.removeItem('app_logs');
      console.log('🗑️ Logs effacés');
    } catch (e) {
      console.error('❌ Erreur effacement logs:', e);
    }
  }

  async getErrorLogs(): Promise<LogEntry[]> {
    const allLogs = await this.getLogs();
    return allLogs.filter(log => log.level === 'ERROR');
  }

  // Afficher les logs d'erreur dans un format lisible
  async formatErrorLogs(): Promise<string> {
    const errorLogs = await this.getErrorLogs();
    if (errorLogs.length === 0) {
      return '✅ Aucune erreur détectée';
    }

    let formatted = `❌ ${errorLogs.length} erreur(s) détectée(s):\n\n`;
    
    errorLogs.forEach((log, index) => {
      formatted += `--- Erreur ${index + 1} ---\n`;
      formatted += `📅 ${log.timestamp}\n`;
      formatted += `📝 ${log.message}\n`;
      
      if (log.error) {
        formatted += `🔍 ${log.error.name}: ${log.error.message}\n`;
        if (log.error.stack) {
          formatted += `📚 Stack:\n${log.error.stack}\n`;
        }
      }
      formatted += '\n';
    });

    return formatted;
  }
}

export const logger = new Logger();

// Intercepter les erreurs globales non capturées
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('error', (event) => {
    logger.error('Erreur globale non capturée', event.error);
  });

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Promesse rejetée non capturée', event.reason);
  });
}
