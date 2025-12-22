# LLMPatients

A Next.js application for simulating patient interactions using Large Language Models.

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Build

```bash
pnpm build
```

## Logger

The project includes a custom logger with emoji indicators and ANSI colors for easy identification in the terminal.

### Usage

```typescript
import { createLogger } from "@/lib/logger";

// Create a logger with a namespace
const logger = createLogger("MyComponent");

// Log messages at different levels
logger.debug("Debug message");     // 🔍 [MyComponent] Debug message
logger.info("Info message");       // 📘 [MyComponent] Info message
logger.warn("Warning message");    // ⚠️ [MyComponent] Warning message
logger.error("Error message");     // ❌ [MyComponent] Error message
```

### Log Levels

| Level   | Emoji | Color   | Description                     |
|---------|-------|---------|----------------------------------|
| `debug` | 🔍    | Cyan    | Detailed debugging information   |
| `info`  | 📘    | Blue    | General information              |
| `warn`  | ⚠️    | Yellow  | Warning messages                 |
| `error` | ❌    | Red     | Error messages                   |

### Adding Context

You can add metadata to your log messages:

```typescript
const logger = createLogger("API");

// Log with additional context
logger.info("User logged in", { userId: 123, email: "user@example.com" });
// 📘 [API] User logged in { userId: 123, email: 'user@example.com' }

// Log errors with full stack trace
logger.error("Failed to fetch data", new Error("Network timeout"));
// ❌ [API] Failed to fetch data { error: { name: 'Error', message: 'Network timeout', stack: '...' } }
```

### Child Loggers

Create child loggers with persistent context:

```typescript
const logger = createLogger("Auth");
const userLogger = logger.child({ userId: 123 });

userLogger.info("Session started");
// 📘 [Auth] Session started { userId: 123 }

userLogger.info("Permissions loaded", { roles: ["admin"] });
// 📘 [Auth] Permissions loaded { userId: 123, roles: ['admin'] }
```

### Configuration

Control the log level using environment variables:

```bash
# .env or .env.local
LOG_LEVEL=debug          # Server-side log level
NEXT_PUBLIC_LOG_LEVEL=info  # Client-side log level
```

Available levels (from most to least verbose):
- `debug` - All logs (default in development)
- `info` - Info, warnings, and errors
- `warn` - Warnings and errors only (default in production)
- `error` - Errors only

### Filtering Logs in Terminal

Since all app logs use the emoji prefix, you can easily filter them:

```bash
# Show only your app logs
pnpm dev 2>&1 | grep --line-buffered "🔍\|📘\|⚠️\|❌"

# Show only errors and warnings
pnpm dev 2>&1 | grep --line-buffered "⚠️\|❌"
```

## License

MIT

