# Updated Wingman Usage Guide

## 1. One-Time Initialization

First, initialize Wingman with your access token:

```bash
npx wingman init your-access-token-here
```

This creates a `.wingman.json` file with your token and configuration.

## 2. Provider Usage (No Token Required!)

### Next.js App Router (app/layout.tsx)

```typescript
import { WingmanProvider } from 'wingman'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {/* No apiKey prop needed! Token is loaded from .wingman.json */}
        <WingmanProvider>
          {children}
        </WingmanProvider>
      </body>
    </html>
  )
}
```

### Next.js Pages Router (pages/_app.tsx)

```typescript
import type { AppProps } from 'next/app'
import { WingmanProvider } from 'wingman'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WingmanProvider 
      enableErrorReporting={process.env.NODE_ENV === 'production'}
      enablePerformanceMonitoring={true}
    >
      <Component {...pageProps} />
    </WingmanProvider>
  )
}
```

## 3. Using Wingman in Components

```typescript
import { useWingman, useWingmanReporting } from 'wingman'

export default function UserProfile() {
  const { monitor, isActive } = useWingman()
  const { reportError, reportInfo } = useWingmanReporting()

  const handleButtonClick = async () => {
    try {
      reportInfo('User clicked profile button')
      
      const response = await fetch('/api/user')
      if (!response.ok) throw new Error('Failed to fetch user')
      
      const user = await response.json()
      // Handle success
    } catch (error) {
      reportError(error, { 
        component: 'UserProfile',
        action: 'fetch_user' 
      })
    }
  }

  return (
    <div>
      <p>Monitoring Status: {isActive ? 'Active' : 'Inactive'}</p>
      <button onClick={handleButtonClick}>
        Load Profile
      </button>
    </div>
  )
}
```

## 4. Environment Configuration

The provider automatically detects environment and applies appropriate settings:

- **Development**: Error reporting disabled by default
- **Production**: Error reporting enabled by default
- **Override**: Use props to override defaults

```typescript
<WingmanProvider 
  enableErrorReporting={false}  // Force disable even in production
  enablePerformanceMonitoring={true}
>
  {children}
</WingmanProvider>
```

## 5. Error Handling

The provider automatically catches:

- ✅ Global JavaScript errors
- ✅ Unhandled promise rejections  
- ✅ React component errors (via error boundary)
- ✅ Manual error reports via hooks

## 6. Error Filtering

Errors are automatically filtered based on:

- **Environment**: No errors reported in development
- **Browser extensions**: Chrome extension errors filtered out
- **Network issues**: User-related network errors filtered out
- **Ad blockers**: Script loading errors filtered out

## 7. Development Experience

In development mode:
- Shows helpful configuration error messages
- Displays error details in the UI
- Provides clear setup instructions

In production mode:
- Silently handles configuration errors
- Only reports actual application errors
- Clean user experience

## Files Created

```
your-project/
├── .wingman.json       # Contains access token and config
└── .gitignore          # Updated to ignore .wingman.json
```

## Benefits

✅ **Simple setup** - One command, no code changes needed  
✅ **Secure** - Token stored locally, not in code  
✅ **Smart filtering** - Only reports relevant errors  
✅ **Environment aware** - Different behavior for dev/prod  
✅ **React friendly** - Easy hooks and context  
✅ **TypeScript ready** - Full type support
