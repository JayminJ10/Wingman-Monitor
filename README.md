# Wingman Monitor

🛡️ **Runtime error monitoring package that hooks into applications and reports errors to webhook endpoints**

Wingman Monitor is a lightweight, easy-to-use error monitoring solution that automatically captures and reports runtime errors from your Node.js and browser applications to your webhook endpoints.

## Features

- 🚀 **Easy Setup**: Initialize with a single command
- 🔍 **Comprehensive Monitoring**: Captures uncaught exceptions, unhandled rejections, and console errors
- 🌐 **Cross-Platform**: Works in both Node.js and browser environments
- 📡 **Webhook Integration**: Send error reports to any webhook endpoint
- 🎯 **Environment Aware**: Separate monitoring for development, staging, and production
- ⚙️ **Configurable**: Enable/disable monitoring, custom severity levels
- 📊 **Rich Error Context**: Includes stack traces, timestamps, and project information

## Installation

```bash
npm install wingman-monitor
```

## Quick Start

### 1. Initialize Wingman in your project

```bash
npx wingman init YOUR_ACCESS_TOKEN
```

Optional parameters:
```bash
npx wingman init YOUR_ACCESS_TOKEN --webhook https://your-webhook-url.com/errors --env production
```

### 2. Add to your application

```javascript
// ES6/TypeScript
import { WingmanMonitor } from 'wingman-monitor';

// CommonJS
const { WingmanMonitor } = require('wingman-monitor');

// Create and start the monitor
const monitor = new WingmanMonitor();
monitor.start();
```

### 3. That's it! 🎉

Wingman will now automatically capture and report runtime errors to your webhook endpoint.

## CLI Commands

### Initialize monitoring
```bash
npx wingman init <accessToken> [options]
```

Options:
- `--webhook <url>`: Custom webhook URL (default: https://api.wingman-monitor.com/webhook)
- `--env <environment>`: Environment name (default: development)

### Check status
```bash
npx wingman status
```

### Enable/Disable monitoring
```bash
npx wingman enable
npx wingman disable
```

## Advanced Usage

### Manual Error Reporting

```javascript
import { WingmanMonitor } from 'wingman-monitor';

const monitor = new WingmanMonitor();
await monitor.start();

// Report custom errors
try {
  // Your code here
} catch (error) {
  await monitor.reportCustomError(error, {
    userId: 'user123',
    action: 'checkout',
    additionalData: 'custom metadata'
  });
}
```

### Configuration

The `.wingman.json` configuration file is created automatically when you run `wingman init`:

```json
{
  "accessToken": "your-access-token",
  "webhookUrl": "https://your-webhook-url.com/errors",
  "environment": "production",
  "enabled": true,
  "createdAt": "2025-06-24T12:00:00.000Z"
}
```

### Error Report Format

Wingman sends error reports in the following format:

```json
{
  "message": "Error message",
  "stack": "Error stack trace",
  "timestamp": "2025-06-24T12:00:00.000Z",
  "environment": "production",
  "projectInfo": {
    "name": "my-app",
    "version": "1.0.0",
    "url": "https://github.com/user/repo"
  },
  "errorType": "uncaughtException",
  "severity": "critical",
  "metadata": {
    "additional": "data"
  },
  "accessToken": "your-access-token",
  "projectPath": "/path/to/project"
}
```

### Error Types

- `uncaughtException`: Uncaught exceptions in Node.js
- `unhandledRejection`: Unhandled promise rejections
- `windowError`: Browser window errors
- `windowUnhandledRejection`: Browser unhandled promise rejections
- `consoleError`: Errors logged to console
- `customError`: Manually reported errors

### Severity Levels

- `low`: Minor issues, console errors
- `medium`: Standard errors, custom errors
- `high`: Unhandled rejections
- `critical`: Uncaught exceptions

## API Reference

### WingmanMonitor

#### Constructor
```javascript
new WingmanMonitor(projectPath?: string)
```

#### Methods

##### `start(): Promise<void>`
Starts error monitoring. Loads configuration and sets up error handlers.

##### `stop(): void`
Stops error monitoring and removes error handlers.

##### `reportCustomError(error: Error, metadata?: Record<string, any>): Promise<void>`
Manually report a custom error with optional metadata.

##### `isActive(): boolean`
Returns whether monitoring is currently active.

### ConfigManager

#### Constructor
```javascript
new ConfigManager(projectPath?: string)
```

#### Methods

##### `initialize(config: WingmanConfig): Promise<void>`
Initialize configuration with provided settings.

##### `load(): Promise<WingmanConfig | null>`
Load configuration from `.wingman.json` file.

##### `save(config: Partial<WingmanConfig>): Promise<void>`
Save configuration updates to file.

##### `isEnabled(): boolean`
Check if monitoring is enabled.

## Environment Variables

You can also configure Wingman using environment variables:

- `WINGMAN_ACCESS_TOKEN`: Access token for authentication
- `WINGMAN_WEBHOOK_URL`: Webhook URL for error reports
- `WINGMAN_ENVIRONMENT`: Environment name
- `WINGMAN_ENABLED`: Enable/disable monitoring (true/false)

## Best Practices

1. **Use different access tokens** for different environments
2. **Set appropriate webhook URLs** for each environment
3. **Test your webhook endpoint** before deploying
4. **Monitor the monitoring**: Ensure Wingman itself doesn't cause issues
5. **Use custom error reporting** for business-logic specific errors

## Webhook Endpoint Requirements

Your webhook endpoint should:
- Accept POST requests
- Handle JSON payload
- Return appropriate HTTP status codes (200-299 for success)
- Include authentication validation using the access token

Example webhook handler (Express.js):

```javascript
app.post('/webhook/errors', (req, res) => {
  const { accessToken, message, errorType, severity } = req.body;
  
  // Validate access token
  if (accessToken !== process.env.EXPECTED_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Process the error report
  console.log(`[${severity}] ${errorType}: ${message}`);
  
  // Store in database, send alerts, etc.
  
  res.status(200).json({ success: true });
});
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📧 Email: support@wingman-monitor.com
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/wingman-monitor/issues)
- 📖 Documentation: [Full Documentation](https://docs.wingman-monitor.com)

---

Made with ❤️ by the Wingman team
