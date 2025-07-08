import { ConfigManager } from '../config';

/**
 * Gets the stored access token from .wingman.json
 */
export async function getStoredAccessToken(): Promise<string | null> {
  try {
    const configManager = new ConfigManager();
    const config = await configManager.load();
    return config?.accessToken || null;
  } catch (error) {
    console.warn('Failed to load Wingman configuration:', error);
    return null;
  }
}

/**
 * Requires that an access token exists, throws if not found
 */
export async function requireAccessToken(): Promise<string> {
  const accessToken = await getStoredAccessToken();
  
  if (!accessToken) {
    throw new Error(
      'Wingman access token not found. Please run: npx wingman init <your-access-token>'
    );
  }
  
  return accessToken;
}
