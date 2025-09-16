#!/usr/bin/env node

import { Command } from 'commander';
import { ConfigManager } from './config';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import axios from 'axios';

const program = new Command();

// Function to test webhook connection and validate access token
async function testWebhookConnection(webhookUrl: string, accessToken: string, environment: string): Promise<{ success: boolean; message: string; projectId?: string }> {
    let projectId: string | undefined = undefined;
  try {
    console.log(chalk.blue('🔗 Testing webhook connection...'));
    
    // const testPayload = {
    //   event: 'wingman.init',
    //   data: {
    //     message: 'Wingman initialization test',
    //     timestamp: new Date().toISOString(),
    //     environment: environment,
    //     projectInfo: {
    //       name: 'wingman-test',
    //       version: '1.0.0'
    //     },
    //     errorType: 'initialization',
    //     severity: 'low' as const,
    //     accessToken: accessToken,
    //     projectPath: process.cwd()
    //   },
    //   timestamp: Date.now(),
    //   source: 'wingman-monitor-init'
    // };
    const testPayload = {
      event: 'wingman.init',
      data: {
            accessToken: accessToken,
            environment: environment,
        },
          timestamp: Date.now(),
            source: 'wingman-monitor-init'
      }
        

    const response = await axios.post(webhookUrl, testPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'Wingman-Monitor/1.0.0'
      },      timeout: 10000 // 10 second timeout for init
    });

    if (response.status >= 200 && response.status < 300) {
      projectId = response.data?.projectId; // Grab projectId from webhook response
      return { 
        success: true, 
        message: 'Webhook connection successful',
        projectId: projectId
      };
    } else {
      return { 
        success: false, 
        message: `Webhook returned status ${response.status}` 
      };
    }
    
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        return { 
          success: false, 
          message: 'Unable to connect to webhook URL. Please check the URL and ensure the server is running.' 
        };
      } else if (error.response?.status === 401) {
        return { 
          success: false, 
          message: 'Access token is invalid or unauthorized.' 
        };
      } else if (error.response?.status === 404) {
        return { 
          success: false, 
          message: 'Webhook endpoint not found. Please check the URL.' 
        };
      } else if (error.response && error.response.status >= 500) {
        return { 
          success: false, 
          message: 'Webhook server error. Please try again later.' 
        };
      } else {
        return { 
          success: false, 
          message: `Webhook error: ${error.response?.status || error.message}` 
        };
      }
    }
    
    return { 
      success: false, 
      message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

program
  .name('wingman')
  .description('Runtime error monitoring CLI')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize Wingman monitoring in the current project')
  .argument('<accessToken>', 'Access token for webhook authentication')
  .option('-w, --webhook <url>', 'Webhook URL for error reporting')
  .option('-e, --env <environment>', 'Environment name (development, staging, production)', 'development')
  .action(async (accessToken: string, options: { webhook?: string; env: string }) => {
    try {
      console.log(chalk.blue('🛡️  Initializing Wingman monitoring...'));
      
      const webhookUrl = options.webhook || process.env.WINGMAN_WEBHOOK_URL || 'https://patchworks-sigma.vercel.app/webhook';
      
      // Test webhook connection and validate access token FIRST
      const testResult = await testWebhookConnection(webhookUrl, accessToken, options.env);
      if (!testResult.success) {
        console.error(chalk.red('❌ Webhook test failed:'), testResult.message);
        console.log(chalk.yellow('💡 Please check:'));
        console.log(chalk.gray('   - Your webhook URL is correct'));
        console.log(chalk.gray('   - Your access token is valid'));
        console.log(chalk.gray('   - Your webhook server is running and accessible'));
        process.exit(1);
      }
      
      console.log(chalk.green('✅ Webhook connection verified'));
      
      const config = new ConfigManager();
    // Grab projectId from the webhook response if available
    
    if (testResult.success && testResult.message && typeof testResult === 'object') {
      // If the response contains data with projectId, extract it
      // You may want to adjust this depending on your actual response structure
      // For example, if testWebhookConnection returns the full response data:
      // projectId = testResult.projectId;
      // But currently, testWebhookConnection only returns { success, message }
      // So you need to modify testWebhookConnection to return projectId if present

      // Example if you update testWebhookConnection to return projectId:
      // projectId = testResult.projectId;
    }    await config.initialize({
      accessToken,
      projectId: testResult.projectId,
      environment: options.env,
      projectPath: process.cwd()
    });
      
      // Create wingman config file
      const configPath = path.join(process.cwd(), '.wingman.json');      const configData: any = {
        accessToken,
        environment: options.env,
        enabled: true,
        createdAt: new Date().toISOString()
      };
      
      if (testResult.projectId) {
        configData.projectId = testResult.projectId;
      }
      
      await fs.writeJson(configPath, configData, { spaces: 2 });
      
      console.log(chalk.green('✅ Wingman monitoring initialized successfully!'));
      if (testResult.projectId) {
        console.log(chalk.blue(`🆔 Project ID: ${testResult.projectId}`));
      }
      console.log(chalk.yellow('📝 Configuration saved to .wingman.json'));
      console.log(chalk.gray('💡 Add the following to your main application file:'));
      console.log(chalk.cyan('   import { WingmanMonitor } from "wingman-monitor";'));
      console.log(chalk.cyan('   const monitor = new WingmanMonitor();'));
      console.log(chalk.cyan('   monitor.start();'));
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to initialize Wingman:'), error);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Check Wingman monitoring status')
  .action(async () => {
    try {
      const configPath = path.join(process.cwd(), '.wingman.json');
      
      if (!await fs.pathExists(configPath)) {
        console.log(chalk.yellow('⚠️  Wingman not initialized. Run "wingman init <accessToken>" first.'));
        return;
      }
      
      const config = await fs.readJson(configPath);
      console.log(chalk.blue('🛡️  Wingman Status:'));
      console.log(chalk.green(`   Environment: ${config.environment}`));
      console.log(chalk.green(`   Webhook URL: ${config.webhookUrl}`));
      console.log(chalk.green(`   Status: ${config.enabled ? 'Enabled' : 'Disabled'}`));
      console.log(chalk.gray(`   Initialized: ${config.createdAt}`));
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to check status:'), error);
    }
  });

program
  .command('disable')
  .description('Disable Wingman monitoring')
  .action(async () => {
    try {
      const configPath = path.join(process.cwd(), '.wingman.json');
      
      if (!await fs.pathExists(configPath)) {
        console.log(chalk.yellow('⚠️  Wingman not initialized.'));
        return;
      }
      
      const config = await fs.readJson(configPath);
      config.enabled = false;
      await fs.writeJson(configPath, config, { spaces: 2 });
      
      console.log(chalk.yellow('⏸️  Wingman monitoring disabled'));
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to disable Wingman:'), error);
    }
  });

program
  .command('enable')
  .description('Enable Wingman monitoring')
  .action(async () => {
    try {
      const configPath = path.join(process.cwd(), '.wingman.json');
      
      if (!await fs.pathExists(configPath)) {
        console.log(chalk.yellow('⚠️  Wingman not initialized.'));
        return;
      }
      
      const config = await fs.readJson(configPath);
      config.enabled = true;
      await fs.writeJson(configPath, config, { spaces: 2 });
      
      console.log(chalk.green('▶️  Wingman monitoring enabled'));
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to enable Wingman:'), error);
    }
  });

program.parse();
