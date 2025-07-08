import React, { createContext, useContext, ReactNode } from 'react';
import { WingmanMonitor } from './monitor';
import { WingmanConfig } from './config';
import { shouldReportError, getEnvironmentConfig } from './utils/errorFiltering';
import { requireAccessToken } from './utils/tokenResolver';

interface WingmanContextType {
  monitor: WingmanMonitor | null;
  isActive: boolean;
}

const WingmanContext = createContext<WingmanContextType>({
  monitor: null,
  isActive: false,
});

export interface WingmanProviderProps {
  children: ReactNode;
  /**
   * Custom configuration for Wingman Monitor
   * If not provided, will load from wingman.config.json
   */
  config?: Partial<WingmanConfig>;
  /**
   * Whether to automatically start monitoring when the provider mounts
   * @default true
   */
  autoStart?: boolean;
  /**
   * Custom project path for configuration loading
   */
  projectPath?: string;
  /**
   * Enable error boundary for React component errors
   * @default true
   */
  enableErrorBoundary?: boolean;
  /**
   * Enable error reporting (overrides environment detection)
   */
  enableErrorReporting?: boolean;
  /**
   * Enable performance monitoring
   * @default true
   */
  enablePerformanceMonitoring?: boolean;
}

interface WingmanProviderState {
  hasError: boolean;
  error?: Error;
  isInitialized: boolean;
  initError?: string;
}

export class WingmanProvider extends React.Component<WingmanProviderProps, WingmanProviderState> {
  private monitor: WingmanMonitor;
  private isActive = false;
  private handleError?: (event: ErrorEvent) => void;
  private handleRejection?: (event: PromiseRejectionEvent) => void;

  constructor(props: WingmanProviderProps) {
    super(props);
    this.state = { 
      hasError: false, 
      isInitialized: false 
    };
    this.monitor = new WingmanMonitor(props.projectPath);
  }

  static getDerivedStateFromError(error: Error): WingmanProviderState {
    return { hasError: true, error, isInitialized: false };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Check if we should report this error based on environment and filters
    if (this.isActive && shouldReportError(error, { type: 'React Component Error' })) {
      this.monitor.reportCustomError(error, {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
        type: 'React Component Error',
      });
    }
  }

  async componentDidMount() {
    const { autoStart = true } = this.props;
    const envConfig = getEnvironmentConfig();
    
    if (autoStart) {
      try {
        // Try to get the access token from .wingman.json
        const accessToken = await requireAccessToken();
        
        // Update monitor configuration with the token
        this.monitor = new WingmanMonitor(this.props.projectPath);
        
        await this.monitor.start();
        this.isActive = this.monitor.isActive();
        
        // Update state to indicate successful initialization
        this.setState({ isInitialized: true });
        
        // Only set up global error listeners in environments where we want to report errors
        const shouldEnableErrorReporting = this.props.enableErrorReporting ?? envConfig.enableErrorReporting;
        if (shouldEnableErrorReporting && this.isActive) {
          this.setupGlobalErrorHandlers();
        }
      } catch (error) {
        console.error('Wingman: Failed to start monitoring in provider:', error);
        this.setState({ 
          initError: error instanceof Error ? error.message : 'Failed to initialize Wingman',
          isInitialized: false 
        });
      }
    }
  }

  private setupGlobalErrorHandlers() {
    // Handle uncaught JavaScript errors
    this.handleError = (event: ErrorEvent) => {
      const error = event.error || new Error(event.message);
      const context = {
        type: 'global_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      };

      if (shouldReportError(error, context)) {
        this.monitor.reportCustomError(error, context);
      }
    };

    // Handle unhandled promise rejections
    this.handleRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));
      
      const context = {
        type: 'unhandled_promise_rejection',
        reason: event.reason,
      };

      if (shouldReportError(error, context)) {
        this.monitor.reportCustomError(error, context);
      }
    };

    window.addEventListener('error', this.handleError);
    window.addEventListener('unhandledrejection', this.handleRejection);
  }

  private removeGlobalErrorHandlers() {
    if (this.handleError) {
      window.removeEventListener('error', this.handleError);
    }
    if (this.handleRejection) {
      window.removeEventListener('unhandledrejection', this.handleRejection);
    }
  }

  componentWillUnmount() {
    // Clean up global error handlers
    this.removeGlobalErrorHandlers();
    
    if (this.isActive) {
      this.monitor.stop();
      this.isActive = false;
    }
  }

  render() {
    const { children, enableErrorBoundary = true } = this.props;
    const { hasError, error, initError, isInitialized } = this.state;

    const contextValue: WingmanContextType = {
      monitor: this.monitor,
      isActive: this.isActive,
    };

    // Show initialization error in development only
    if (initError && process.env.NODE_ENV === 'development') {
      return (
        <WingmanContext.Provider value={contextValue}>
          <div style={{ 
            padding: '20px', 
            backgroundColor: '#fff3cd', 
            border: '1px solid #ffeaa7',
            borderRadius: '4px',
            margin: '20px'
          }}>
            <h3>Wingman Configuration Error</h3>
            <p>{initError}</p>
            <p style={{ fontSize: '14px', color: '#666' }}>
              Run: <code>npx wingman init &lt;your-access-token&gt;</code>
            </p>
          </div>
          {children}
        </WingmanContext.Provider>
      );
    }

    if (enableErrorBoundary && hasError) {
      return (
        <WingmanContext.Provider value={contextValue}>
          <div style={{ 
            padding: '20px', 
            backgroundColor: '#fee', 
            border: '1px solid #fcc',
            borderRadius: '4px',
            margin: '20px'
          }}>
            <h2>Something went wrong</h2>
            <p>An error occurred in the application. The error has been reported.</p>
            {process.env.NODE_ENV === 'development' && error && (
              <details style={{ marginTop: '10px' }}>
                <summary>Error details (development only)</summary>
                <pre style={{ 
                  backgroundColor: '#f5f5f5', 
                  padding: '10px', 
                  overflow: 'auto',
                  marginTop: '10px'
                }}>
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        </WingmanContext.Provider>
      );
    }

    return (
      <WingmanContext.Provider value={contextValue}>
        {children}
      </WingmanContext.Provider>
    );
  }
}

/**
 * Hook to access the Wingman monitor instance and status
 */
export function useWingman(): WingmanContextType {
  const context = useContext(WingmanContext);
  if (!context) {
    throw new Error('useWingman must be used within a WingmanProvider');
  }
  return context;
}

/**
 * Hook to manually report errors to Wingman
 */
export function useWingmanReporting() {
  const { monitor, isActive } = useWingman();

  const reportError = React.useCallback((error: Error | string, metadata?: Record<string, any>) => {
    if (!isActive || !monitor) {
      console.warn('Wingman: Cannot report error - monitor not active');
      return;
    }

    const errorObj = typeof error === 'string' ? new Error(error) : error;
    
    // Apply error filtering before reporting
    if (shouldReportError(errorObj, metadata)) {
      monitor.reportCustomError(errorObj, metadata);
    }
  }, [monitor, isActive]);

  const reportInfo = React.useCallback((message: string, metadata?: Record<string, any>) => {
    if (!isActive || !monitor) {
      console.warn('Wingman: Cannot report info - monitor not active');
      return;
    }

    const infoError = new Error(message);
    const infoMetadata = { 
      ...metadata, 
      severity: 'low',
      type: 'Info'
    };

    // Apply error filtering (info messages still go through the same filtering)
    if (shouldReportError(infoError, infoMetadata)) {
      monitor.reportCustomError(infoError, infoMetadata);
    }
  }, [monitor, isActive]);

  return {
    reportError,
    reportInfo,
    isActive,
  };
}

/**
 * Hook to access environment configuration and settings
 */
export function useWingmanConfig() {
  const envConfig = getEnvironmentConfig();
  const { isActive } = useWingman();

  return {
    ...envConfig,
    isActive,
    shouldReportErrors: envConfig.enableErrorReporting && isActive,
  };
}
