/**
 * Determines whether an error should be reported based on environment and error characteristics
 */
export const shouldReportError = (error: Error, context?: any): boolean => {
  // Don't report errors in development
  if (process.env.NODE_ENV === 'development') {
    return false
  }

  // Filter out known browser extension errors
  if (error.message.includes('chrome-extension://')) {
    return false
  }

  // Filter out network errors that might be user-related
  if (error.message.includes('Failed to fetch') && context?.status === 0) {
    return false
  }

  // Filter out script loading errors from ad blockers
  if (error.message.includes('Script error')) {
    return false
  }

  return true
}

/**
 * Gets environment-based configuration for Wingman
 */
export const getEnvironmentConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production'
  const isVercel = process.env.VERCEL === '1'
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  return {
    enableErrorReporting: isProduction,
    enablePerformanceMonitoring: isProduction,
    enableDebugLogs: isDevelopment,
    apiEndpoint: isProduction 
      ? 'https://api.wingman.dev' 
      : 'http://localhost:3001'
  }
}
