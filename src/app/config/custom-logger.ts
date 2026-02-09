import { LoggerService } from '@nestjs/common';

let clc: any;
try {
  clc = require('cli-color');
} catch (e) {
  // Fallback if cli-color fails to load
  clc = null;
}

export class CustomLogger implements LoggerService {
  log(message: string, context?: string) {
    // Filter out route mapping logs
    if (
      context === 'RoutesResolver' ||
      context === 'RouterExplorer' ||
      message.includes('Mapped {') ||
      message.includes('route')
    ) {
      return; // Don't log route mapping messages
    }
    
    try {
      // Green for info/log messages (like NestJS default)
      const contextStr = clc ? clc.green(`[${context || 'Application'}]`) : `[${context || 'Application'}]`;
      console.log(`${contextStr} ${message}`);
    } catch (e) {
      // Fallback to plain console.log if cli-color fails
      console.log(`[${context || 'Application'}] ${message}`);
    }
  }

  error(message: string, trace?: string, context?: string) {
    try {
      // Red for errors
      const contextStr = clc ? clc.red(`[${context || 'Application'}]`) : `[${context || 'Application'}]`;
      const errorMessage = clc ? clc.red(message) : message;
      console.error(`${contextStr} ${errorMessage}`, trace || '');
    } catch (e) {
      console.error(`[${context || 'Application'}] ${message}`, trace || '');
    }
  }

  warn(message: string, context?: string) {
    try {
      // Yellow for warnings
      const contextStr = clc ? clc.yellow(`[${context || 'Application'}]`) : `[${context || 'Application'}]`;
      const warnMessage = clc ? clc.yellow(message) : message;
      console.warn(`${contextStr} ${warnMessage}`);
    } catch (e) {
      console.warn(`[${context || 'Application'}] ${message}`);
    }
  }

  debug(message: string, context?: string) {
    // Magenta for debug (development only)
    if (process.env.NODE_ENV === 'development') {
      try {
        const contextStr = clc ? clc.magentaBright(`[${context || 'Application'}]`) : `[${context || 'Application'}]`;
        const debugMessage = clc ? clc.magenta(message) : message;
        console.debug(`${contextStr} ${debugMessage}`);
      } catch (e) {
        console.debug(`[${context || 'Application'}] ${message}`);
      }
    }
  }

  verbose(message: string, context?: string) {
    // Cyan for verbose (development only)
    if (process.env.NODE_ENV === 'development') {
      try {
        const contextStr = clc ? clc.cyanBright(`[${context || 'Application'}]`) : `[${context || 'Application'}]`;
        const verboseMessage = clc ? clc.cyan(message) : message;
        console.log(`${contextStr} ${verboseMessage}`);
      } catch (e) {
        console.log(`[${context || 'Application'}] ${message}`);
      }
    }
  }
}
