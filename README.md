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

## Database

By default, the application uses **SQLite** for local development.

### Initialize Database (SQLite)

1. Ensure `.env` has the correct `DATABASE_URL`:
   ```env
   DATABASE_URL="file:./dev.db"
   ```

2. Push the schema to the database:
   ```bash
   pnpm db:push
   ```

3. (Optional) Seed the database with initial data:
   ```bash
   pnpm db:seed
   ```

### PostgreSQL (Optional)

If you prefer to use PostgreSQL:
1. Update `.env`:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
   ```
2. Run the specific PostgreSQL push command:
   ```bash
   pnpm db:push:postgres
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

## TTS Integration (Text-to-Speech)

This project supports local Text-to-Speech using **Chatterbox (Turbo)** and **VibeVoice (0.5b)** directly integrated via Python.

### Prerequisites

- Python 3.10+ (tested with 3.11)
- `pip`

### Setup Services

The services are located in the `services/` directory.

#### 1. Chatterbox

Chatterbox requires a virtual environment and dependencies:

```bash
cd services/chatterbox
python3.11 -m venv .venv
source .venv/bin/activate
pip install -e .
```

#### 2. VibeVoice

VibeVoice uses the system python or a compatible environment (Python 3.9+). 
Ensure you have the necessary dependencies installed (pytorch, transformers, etc) or use the `scripts/install-services.ts` helper (note: helper might only clone repos).

### Configuration

Set the `TTS_PROVIDER` environment variable in `.env`:

```env
# Options: 'chatterbox', 'vibevoice', 'elevenlabs', 'none'
TTS_PROVIDER="chatterbox"

# Optional: VibeVoice URL if running remotely (default is local bridge)
# VIBEVOICE_URL="http://localhost:3000" 
```

### Testing

To run a comprehensive test of all platform functionalities (system diagnostics + TTS integration):

```bash
pnpm test
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

