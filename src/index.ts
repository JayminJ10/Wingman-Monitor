export { WingmanMonitor, ErrorReport } from './monitor';
export { ConfigManager, WingmanConfig } from './config';
export { 
  WingmanProvider, 
  useWingman, 
  useWingmanReporting,
  useWingmanConfig,
  type WingmanProviderProps 
} from './provider';
export { shouldReportError, getEnvironmentConfig } from './utils/errorFiltering';
export { getStoredAccessToken, requireAccessToken } from './utils/tokenResolver';

// Default export for easy importing
import { WingmanMonitor } from './monitor';
export default WingmanMonitor;
