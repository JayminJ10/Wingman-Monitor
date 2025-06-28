import * as fs from 'fs-extra';
import * as path from 'path';

export interface WingmanConfig {
  accessToken: string;
  projectId?: string;
  environment: string;
  projectPath: string;
  enabled?: boolean;
  createdAt?: string;
}

export class ConfigManager {
  private configPath: string;
  private config: WingmanConfig | null = null;

  constructor(projectPath?: string) {
    this.configPath = path.join(projectPath || process.cwd(), '.wingman.json');
  }

  async initialize(config: WingmanConfig): Promise<void> {
    this.config = {
      ...config,
      enabled: true,
      createdAt: new Date().toISOString()
    };
  }

  async load(): Promise<WingmanConfig | null> {
    try {
      if (await fs.pathExists(this.configPath)) {
        this.config = await fs.readJson(this.configPath);
        return this.config;
      }
    } catch (error) {
      console.error('Failed to load Wingman config:', error);
    }
    return null;
  }

  async save(config: Partial<WingmanConfig>): Promise<void> {
    try {
      if (this.config) {
        this.config = { ...this.config, ...config };
        await fs.writeJson(this.configPath, this.config, { spaces: 2 });
      }
    } catch (error) {
      console.error('Failed to save Wingman config:', error);
    }
  }

  getConfig(): WingmanConfig | null {
    return this.config;
  }

  isEnabled(): boolean {
    return this.config?.enabled === true;
  }
}
