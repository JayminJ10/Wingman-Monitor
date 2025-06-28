# Wingman Next.js Integration

Comprehensive error monitoring for Next.js applications with automatic capture of framework-specific errors and system-level integration.

## 🚀 Quick Start

### 1. Install and Initialize

```bash
# Initialize Wingman in your Next.js project
npx wingman init YOUR_ACCESS_TOKEN

# Check status
npx wingman status
```

### 2. Add to Your App

**Pages Router (`pages/_app.tsx`):**
```typescript
import { useEffect } from 'react';
import { initializeWingmanNextJS, createWingmanErrorBoundary } from 'wingman/nextjs';

const WingmanErrorBoundary = createWingmanErrorBoundary();

export default function MyApp({ Component, pageProps }) {
  useEffect(() => {
    const cleanup = initializeWingmanNextJS();
    return cleanup;
  }, []);

  return (
    <WingmanErrorBoundary>
      <Component {...pageProps} />
    </WingmanErrorBoundary>
  );
}
```

**App Router (`app/layout.tsx`):**
```typescript
'use client';
import { useEffect } from 'react';
import { initializeWingmanNextJS, createWingmanErrorBoundary } from 'wingman/nextjs';

const WingmanErrorBoundary = createWingmanErrorBoundary();

export default function RootLayout({ children }) {
  useEffect(() => {
    const cleanup = initializeWingmanNextJS();
    return cleanup;
  }, []);

  return (
    <html>
      <body>
        <WingmanErrorBoundary>
          {children}
        </WingmanErrorBoundary>
      </body>
    </html>
  );
}
```

### 3. That's It! 🎉

Your Next.js app now has comprehensive error monitoring with zero additional configuration.

## ✨ What Gets Captured Automatically

### Client-Side Errors
- ✅ **Unhandled Exceptions** - Any uncaught JavaScript errors
- ✅ **Promise Rejections** - Unhandled async errors
- ✅ **React Component Errors** - With error boundaries
- ✅ **Navigation Errors** - Next.js router failures
- ✅ **Hydration Issues** - SSR/Client mismatches
- ✅ **Console Errors** - All console.error() calls
- ✅ **Chunk Load Failures** - Dynamic import errors
- ✅ **Module Resolution** - Missing module errors

### Server-Side Errors
- ✅ **Process Crashes** - Uncaught exceptions
- ✅ **API Route Errors** - When wrapped with helpers
- ✅ **SSR Errors** - getServerSideProps failures
- ✅ **Server Component Errors** - App Router components
- ✅ **Middleware Errors** - Next.js middleware failures
- ✅ **Build-Time Errors** - Development warnings

### Next.js Specific Detection
- ✅ **Hydration Mismatches** - Text content differences
- ✅ **Fast Refresh Issues** - Hot reload problems
- ✅ **SSG/ISR Errors** - Static generation failures
- ✅ **Edge Runtime Errors** - Vercel Edge functions
- ✅ **404/500 Patterns** - HTTP error detection

## 🔧 Configuration Options

```typescript
const cleanup = initializeWingmanNextJS({
  autoStart: true,              // Auto-start monitoring
  enableConsoleCapture: true,   // Capture console errors
  enableRouterCapture: true,    // Capture router errors
  enableErrorBoundary: true     // Work with error boundaries
});
```

## 🛠️ Manual Integrations

### API Routes

**Pages Router:**
```typescript
import { withWingmanAPI } from 'wingman/nextjs';

export default withWingmanAPI(async (req, res) => {
  // Your API logic - errors automatically captured
  if (!req.body.name) {
    throw new Error('Name is required');
  }
  res.json({ success: true });
});
```

**App Router:**
```typescript
import { withWingmanAPI } from 'wingman/nextjs';

export const POST = withWingmanAPI(async (request) => {
  const body = await request.json();
  // Errors automatically captured
  return Response.json({ success: true });
});
```

### Server-Side Props

```typescript
import { withWingmanPage } from 'wingman/nextjs';

export const getServerSideProps = withWingmanPage(async (context) => {
  // SSR errors automatically captured
  const data = await fetchData(context.params.id);
  return { props: { data } };
});
```

### Server Components

```typescript
import { withWingmanServerComponents } from 'wingman/nextjs';

const MyComponent = withWingmanServerComponents(async () => {
  // Server component errors automatically captured
  return <div>Content</div>;
}, 'MyComponent');

export default MyComponent;
```

### Middleware

```typescript
// middleware.ts
import { createWingmanMiddleware } from 'wingman/nextjs';

export default createWingmanMiddleware();
```

## 📊 Manual Error Reporting

For custom error tracking within components:

```typescript
import { createWingmanReporter } from 'wingman/nextjs';

function MyComponent() {
  const { reportError, reportInfo, isReady } = createWingmanReporter();

  const handleAction = async () => {
    try {
      await riskyOperation();
    } catch (error) {
      // Report with additional context
      await reportError(error, {
        action: 'user_action',
        userId: getUserId(),
        metadata: { extra: 'context' }
      });
    }
  };

  const handleInfo = async () => {
    await reportInfo('User completed action', {
      action: 'completion',
      timestamp: Date.now()
    });
  };

  return (
    <div>
      <p>Reporter Status: {isReady() ? '✅ Ready' : '⏳ Loading'}</p>
      <button onClick={handleAction}>Risky Action</button>
      <button onClick={handleInfo}>Log Info</button>
    </div>
  );
}
```

## 🔍 Error Context

Every error captured includes rich context:

```typescript
{
  type: 'nextjs_hydration_error',
  severity: 'medium',
  context: 'ssr_hydration',
  framework: 'nextjs',
  runtime: 'client',
  url: 'https://example.com/page',
  userAgent: 'Mozilla/5.0...',
  projectId: 'your-project-id',
  timestamp: '2024-01-15T10:30:00.000Z',
  
  // Next.js specific context
  routerState: { route: '/users/[id]', query: { id: '123' } },
  buildInfo: { dev: true, version: '14.0.0' },
  serverInfo: { region: 'us-east-1', runtime: 'nodejs18.x' }
}
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Application                     │
├─────────────────────────────────────────────────────────────┤
│  Client Side                │  Server Side                  │
│  ┌─────────────────────────┐│  ┌─────────────────────────┐  │
│  │ • React Components      ││  │ • API Routes             │  │
│  │ • Router Navigation     ││  │ • SSR Functions          │  │
│  │ • Console Errors        ││  │ • Server Components      │  │
│  │ • Hydration Issues      ││  │ • Middleware             │  │
│  └─────────────────────────┘│  └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                  Wingman Integration Layer                  │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ • Automatic Error Capture                               │ │
│  │ • Framework-Specific Detection                          │ │
│  │ • Context Enrichment                                    │ │
│  │ • Error Boundary Integration                            │ │
│  └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    Wingman Core Monitor                    │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ • Error Processing & Filtering                          │ │
│  │ • Webhook Delivery                                      │ │
│  │ • Project Management                                    │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🧪 Testing Your Integration

Run the included test suite:

```bash
# Test all Next.js integrations
node test-nextjs-integration.js

# Test specific components
node -e "require('./test-nextjs-integration.js').testSystemLevelIntegration()"
```

Test scenarios covered:
- ✅ Automatic initialization
- ✅ Console error capture
- ✅ Router error capture  
- ✅ API route wrapping
- ✅ SSR error handling
- ✅ Server component monitoring
- ✅ Manual error reporting

## 📋 Production Checklist

### Before Deployment

- [ ] **Wingman Initialized**: `npx wingman status` shows enabled
- [ ] **Integration Added**: `initializeWingmanNextJS()` in root layout
- [ ] **Error Boundary**: Wrapped around your app
- [ ] **Environment Variables**: `WINGMAN_WEBHOOK_URL` configured
- [ ] **Test Errors**: Verify errors reach your monitoring system

### Verification Steps

1. **Test Development Errors**:
   ```javascript
   // Add to any page to test
   <button onClick={() => { throw new Error('Test error'); }}>
     Test Error
   </button>
   ```

2. **Check Console Messages**:
   ```
   ✅ Wingman monitoring initialized for Next.js
   ✅ Wingman: Client-side monitoring started
   ```

3. **Verify Webhook Delivery**:
   - Check your webhook endpoint logs
   - Look for error reports with `framework: 'nextjs'`

### Performance Impact

- **Bundle Size**: < 10KB gzipped
- **Runtime Overhead**: < 1ms per request
- **Memory Usage**: < 5MB additional
- **No Impact**: On successful operations

## 🚨 Common Issues

### TypeScript Errors
```bash
# Install React types if missing
npm install --save-dev @types/react
```

### No Errors Captured
1. Check Wingman status: `npx wingman status`
2. Verify environment variables are set
3. Look for initialization messages in browser console
4. Test with a simple thrown error

### Error Boundary Not Catching
- Ensure `createWingmanErrorBoundary()` wraps your app
- Error boundaries only catch errors in child components
- Use `reportError()` for errors in event handlers

### Server-Side Issues
- Check that API routes are wrapped with `withWingmanAPI()`
- Verify Node.js process isn't exiting before error reporting
- Ensure webhook URL is accessible from your server

## 📚 Examples

Complete working examples available in `/examples`:

- **`/examples/nextjs-pages-router/`** - Pages Router integration
- **`/examples/nextjs-app-router/`** - App Router integration  
- **`/examples/error-boundary-custom/`** - Custom error UI
- **`/examples/manual-reporting/`** - Advanced error reporting

## 🆘 Support

- **Documentation**: [GitHub Wiki](https://github.com/your-org/wingman/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-org/wingman/issues)
- **Examples**: See `/examples` directory
- **Tests**: Run `test-nextjs-integration.js`

## 🎯 Advanced Features

### Custom Error Filtering

```typescript
const cleanup = initializeWingmanNextJS({
  errorFilter: (error, context) => {
    // Don't report 404s
    if (error.message.includes('404')) return false;
    
    // Only report in production
    return process.env.NODE_ENV === 'production';
  }
});
```

### Performance Monitoring

```typescript
import { createWingmanReporter } from 'wingman/nextjs';

const { reportInfo } = createWingmanReporter();

// Track page load times
useEffect(() => {
  const startTime = performance.now();
  
  return () => {
    const loadTime = performance.now() - startTime;
    reportInfo('Page Load Time', {
      loadTime,
      page: router.pathname,
      isFirstLoad: !router.isReady
    });
  };
}, []);
```

### User Context Integration

```typescript
// Add user context to all errors
const cleanup = initializeWingmanNextJS({
  contextEnhancer: (context) => ({
    ...context,
    userId: getCurrentUserId(),
    userPlan: getUserPlan(),
    sessionId: getSessionId()
  })
});
```

---

*Wingman Next.js integration provides the most comprehensive error monitoring for Next.js applications with minimal setup and maximum insight.*
