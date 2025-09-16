import axios from 'axios';
import { ConfigManager, WingmanConfig } from './config';

export interface ErrorReport {
  message: string;
  errorType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  environment: string;
  accessToken: string;
  timestamp: number;
  stack?: string;
  projectInfo?: {
    name?: string;
    version?: string;
    url?: string;
  };
  metadata?: Record<string, any>;
}

export class WingmanMonitor {
  private config: WingmanConfig | null = null;
  private configManager: ConfigManager;
  private isStarted = false;
  private originalErrorHandler: OnErrorEventHandler | null = null;
  private originalUnhandledRejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null;
  private originalConsoleError: (...args: any[]) => void;
  private originalConsoleWarn: (...args: any[]) => void;
  private originalConsoleLog: (...args: any[]) => void;
  private recentLogs: Array<{type: string, message: string, timestamp: number, args: any[]}> = [];
  private maxLogs = 50;

  constructor(projectPath?: string) {
    this.configManager = new ConfigManager(projectPath);
    this.originalConsoleError = console.error;
    this.originalConsoleWarn = console.warn;
    this.originalConsoleLog = console.log;
  }

  private captureConsoleLog(type: string, args: any[]): void {
    const logEntry = {
      type,
      message: args.map(arg => {
        try {
          return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
        } catch {
          return '[Circular Object]';
        }
      }).join(' '),
      timestamp: Date.now(),
      args
    };
    
    this.recentLogs.push(logEntry);
    if (this.recentLogs.length > this.maxLogs) {
      this.recentLogs.shift(); // Remove oldest log
    }
  }

  private getRelevantLogs(errorTimestamp: number, windowMs = 5000): string {
    // Get logs from 5 seconds before the error
    const startTime = errorTimestamp - windowMs;
    
    const relevantLogs = this.recentLogs.filter(log => 
      log.timestamp >= startTime && log.timestamp <= errorTimestamp
    );
    
    if (relevantLogs.length === 0) return '';
    
    let logContext = '\n\n--- Recent Console Activity ---\n';
    relevantLogs.forEach(log => {
      const timestamp = new Date(log.timestamp).toISOString();
      logContext += `[${timestamp}] ${log.type.toUpperCase()}: ${log.message}\n`;
    });
    
    return logContext;
  }

  private buildComprehensiveMessage(primaryMessage: string, errorContext: any = {}): string {
    let message = primaryMessage;
    
    // Add relevant recent logs
    const relevantLogs = this.getRelevantLogs(Date.now());
    if (relevantLogs) {
      message += relevantLogs;
    }
    
    // Add error context
    if (errorContext.url) {
      message += `\n\n--- Context ---\nURL: ${errorContext.url}`;
    }
    if (errorContext.userAgent) {
      message += `\nUser Agent: ${errorContext.userAgent}`;
    }
    if (errorContext.stack) {
      message += `\n\n--- Stack Trace ---\n${errorContext.stack}`;
    }
    
    return message;
  }

  async start(): Promise<void> {
    try {
      // Load configuration
      this.config = await this.configManager.load();
      
      if (!this.config) {
        console.warn('Wingman: No configuration found. Run "wingman init <accessToken>" first.');
        return;
      }

      if (!this.config.enabled) {
        console.log('Wingman: Monitoring is disabled.');
        return;
      }

      if (this.isStarted) {
        console.warn('Wingman: Already started.');
        return;
      }

      this.setupErrorHandlers();
      this.isStarted = true;
      
      console.log(`Wingman: Monitoring started for ${this.config.environment} environment`);
      
    } catch (error) {
      console.error('Wingman: Failed to start monitoring:', error);
    }
  }

  stop(): void {
    if (!this.isStarted) return;

    this.removeErrorHandlers();
    this.isStarted = false;
    console.log('Wingman: Monitoring stopped');
  }

  private setupErrorHandlers(): void {
    // Handle uncaught exceptions (Node.js)
    if (typeof process !== 'undefined' && process.on) {
      process.on('uncaughtException', this.handleUncaughtException.bind(this));
      process.on('unhandledRejection', this.handleUnhandledRejection.bind(this));
    }

    // Handle browser errors
    if (typeof window !== 'undefined') {
      this.originalErrorHandler = window.onerror;
      this.originalUnhandledRejectionHandler = window.onunhandledrejection;

      window.onerror = this.handleWindowError.bind(this);
      window.onunhandledrejection = this.handleWindowUnhandledRejection.bind(this);
    }

    // Monkey patch console methods for log capture and error tracking
    this.originalConsoleError = console.error;
    this.originalConsoleWarn = console.warn;
    this.originalConsoleLog = console.log;

    console.error = (...args: any[]) => {
      this.originalConsoleError.apply(console, args);
      this.captureConsoleLog('error', args);
      this.handleConsoleError(args);
    };

    console.warn = (...args: any[]) => {
      this.originalConsoleWarn.apply(console, args);
      this.captureConsoleLog('warn', args);
    };

    console.log = (...args: any[]) => {
      this.originalConsoleLog.apply(console, args);
      this.captureConsoleLog('log', args);
    };
  }

  private removeErrorHandlers(): void {
    if (typeof process !== 'undefined' && process.removeListener) {
      process.removeListener('uncaughtException', this.handleUncaughtException);
      process.removeListener('unhandledRejection', this.handleUnhandledRejection);
    }

    if (typeof window !== 'undefined') {
      if (this.originalErrorHandler) {
        window.onerror = this.originalErrorHandler;
      }
      if (this.originalUnhandledRejectionHandler) {
        window.onunhandledrejection = this.originalUnhandledRejectionHandler;
      }
    }
  }

  private handleUncaughtException(error: Error): void {
    const timestamp = Date.now();
    const comprehensiveMessage = this.buildComprehensiveMessage(error.message, {
      stack: error.stack,
      url: typeof window !== 'undefined' ? window.location?.href : undefined,
      userAgent: typeof window !== 'undefined' ? navigator?.userAgent : undefined
    });

    this.reportError({
      message: comprehensiveMessage,
      stack: error.stack,
      timestamp,
      environment: this.config?.environment || 'unknown',
      projectInfo: this.getProjectInfo(),
      errorType: 'uncaughtException',
      severity: 'critical',
      accessToken: this.config?.accessToken || ''
    });
  }

  private handleUnhandledRejection(reason: any): void {
    const timestamp = Date.now();
    const message = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;
    
    const comprehensiveMessage = this.buildComprehensiveMessage(message, {
      stack,
      url: typeof window !== 'undefined' ? window.location?.href : undefined,
      userAgent: typeof window !== 'undefined' ? navigator?.userAgent : undefined
    });

    this.reportError({
      message: comprehensiveMessage,
      stack,
      timestamp,
      environment: this.config?.environment || 'unknown',
      projectInfo: this.getProjectInfo(),
      errorType: 'unhandledRejection',
      severity: 'high',
      accessToken: this.config?.accessToken || ''
    });
  }

  private handleWindowError(message: string | Event, source?: string, lineno?: number, colno?: number, error?: Error): boolean {
    const timestamp = Date.now();
    const errorMessage = typeof message === 'string' ? message : 'Unknown error';
    
    const comprehensiveMessage = this.buildComprehensiveMessage(errorMessage, {
      stack: error?.stack,
      url: window.location?.href,
      userAgent: navigator?.userAgent,
      source,
      lineno,
      colno
    });

    this.reportError({
      message: comprehensiveMessage,
      stack: error?.stack,
      timestamp,
      environment: this.config?.environment || 'unknown',
      projectInfo: this.getProjectInfo(),
      errorType: 'windowError',
      severity: 'medium',
      accessToken: this.config?.accessToken || '',
      metadata: {
        source,
        lineno,
        colno
      }
    });

    return this.originalErrorHandler ? this.originalErrorHandler(message, source, lineno, colno, error) : true;
  }

  private handleWindowUnhandledRejection(event: PromiseRejectionEvent): boolean {
    const timestamp = Date.now();
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;

    const comprehensiveMessage = this.buildComprehensiveMessage(message, {
      stack,
      url: window.location?.href,
      userAgent: navigator?.userAgent
    });

    this.reportError({
      message: comprehensiveMessage,
      stack,
      timestamp,
      environment: this.config?.environment || 'unknown',
      projectInfo: this.getProjectInfo(),
      errorType: 'windowUnhandledRejection',
      severity: 'high',
      accessToken: this.config?.accessToken || ''
    });

    if (this.originalUnhandledRejectionHandler) {
      this.originalUnhandledRejectionHandler(event);
    }
    return true;
  }

  private handleConsoleError(args: any[]): void {
    const timestamp = Date.now();
    const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
    
    // Only report if it looks like an actual error
    if (message.toLowerCase().includes('error') || args.some(arg => arg instanceof Error)) {
      const comprehensiveMessage = this.buildComprehensiveMessage(message, {
        url: typeof window !== 'undefined' ? window.location?.href : undefined,
        userAgent: typeof window !== 'undefined' ? navigator?.userAgent : undefined
      });

      this.reportError({
        message: comprehensiveMessage,
        timestamp,
        environment: this.config?.environment || 'unknown',
        projectInfo: this.getProjectInfo(),
        errorType: 'consoleError',
        severity: 'low',
        accessToken: this.config?.accessToken || '',
        metadata: {
          args: args.map(arg => {
            try {
              return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
            } catch {
              return '[Circular Object]';
            }
          })
        }
      });
    }
  }  private async reportError(errorReport: ErrorReport): Promise<void> {
    if (!this.config) return;

    try {
      // Get webhook URL from environment variable or default (same as CLI)
      const webhookUrl = process.env.WINGMAN_WEBHOOK_URL || 'https://patchworks-sigma.vercel.app/webhook';
      
      // Format payload to match webhook's expected structure
      const payload = {
        event: 'error.runtime',
        data: {
          message: errorReport.message,
          errorType: errorReport.errorType,
          severity: errorReport.severity,
          environment: errorReport.environment,
          accessToken: errorReport.accessToken,
          timestamp: errorReport.timestamp, // This is now a number (Date.now())
          stack: errorReport.stack,
          projectInfo: errorReport.projectInfo,
          metadata: errorReport.metadata
        },
        timestamp: errorReport.timestamp,
        source: 'wingman-monitor'
      };

      await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${errorReport.accessToken}`,
          'User-Agent': 'Wingman-Monitor/1.0.0'
        },
        timeout: 5000 // 5 second timeout
      });

      console.log('Wingman: Error reported successfully');
      
    } catch (error) {
      console.error('Wingman: Failed to report error:', error);
    }
  }

  private getProjectInfo(): ErrorReport['projectInfo'] {
    try {
      // Try to read package.json for project info
      const fs = require('fs');
      const path = require('path');
      const packageJsonPath = path.join(this.config?.projectPath || process.cwd(), 'package.json');
      
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        return {
          name: packageJson.name,
          version: packageJson.version,
          url: packageJson.homepage || packageJson.repository?.url
        };
      }
    } catch (error) {
      // Ignore errors when reading package.json
    }

    return {};
  }

  // Public method to manually report errors
  public async reportCustomError(error: Error, metadata?: Record<string, any>): Promise<void> {
    const timestamp = Date.now();
    const comprehensiveMessage = this.buildComprehensiveMessage(error.message, {
      stack: error.stack,
      url: typeof window !== 'undefined' ? window.location?.href : undefined,
      userAgent: typeof window !== 'undefined' ? navigator?.userAgent : undefined
    });

    await this.reportError({
      message: comprehensiveMessage,
      stack: error.stack,
      timestamp,
      environment: this.config?.environment || 'unknown',
      projectInfo: this.getProjectInfo(),
      errorType: 'customError',
      severity: 'medium',
      accessToken: this.config?.accessToken || '',
      metadata
    });
  }

  // Check if monitoring is active
  public isActive(): boolean {
    return this.isStarted && this.config?.enabled === true;
  }

  // Temporary method for testing webhook calls
  public async testWebhook(): Promise<void> {
    const testError = new Error('Temporary test error');
    const timestamp = Date.now();
    const comprehensiveMessage = this.buildComprehensiveMessage(testError.message, {
      stack: testError.stack,
      url: typeof window !== 'undefined' ? window.location?.href : undefined,
      userAgent: typeof window !== 'undefined' ? navigator?.userAgent : undefined
    });

    await this.reportError({
      message: comprehensiveMessage,
      stack: testError.stack,
      timestamp,
      environment: this.config?.environment || 'test',
      projectInfo: this.getProjectInfo(),
      errorType: 'testError',
      severity: 'low',
      accessToken: this.config?.accessToken || '',
      metadata: { test: true }
    });
    console.log('Test webhook call sent successfully.');
  }
}
