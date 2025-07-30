# Solana Counter Event Indexer

A complete Solana event indexing system that uses Helius webhooks to capture and store counter program events in Supabase.

## Features

- 🔄 Real-time event indexing via Helius webhooks
- 📊 Supabase database for reliable data storage
- 🎯 Counter program event tracking (Initialize, Increment, Decrement)
- 🚀 RESTful API for querying events
- 📈 Built-in statistics and state tracking

## Quick Start

### 1. Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account and project
- Helius API key

### 2. Database Setup

1. Create a new Supabase project
2. Go to the SQL Editor in your Supabase dashboard
3. Run the schema from `supabase-schema.sql`

### 3. Environment Configuration

1. Copy `env-example.txt` to `.env`
2. Update the environment variables:

```env
# Server Configuration
PORT=3000

# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key

# Helius Webhook Authentication
WEBHOOK_AUTH_HEADER=Bearer your-secret-token

# CORS Configuration
CORS_ORIGIN=*

# Logging
LOG_LEVEL=info
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Start the Server

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Helius Webhook Configuration

Configure your Helius webhook with these settings:

- **Webhook URL**: `https://your-domain.com/webhook/helius`
- **Webhook Type**: Enhanced
- **Transaction Types**: Any (or specific to your program)
- **Account Addresses**: Your deployed counter program ID
- **Authentication Header**: `Bearer your-secret-token` (matching `WEBHOOK_AUTH_HEADER`)

## API Endpoints

### Health Check

```
GET /health
```

### Get Recent Events

```
GET /api/events?limit=100
```

### Get Events by Authority

```
GET /api/events/:authority?limit=100
```

### Get Counter State

```
GET /api/counter/:authority
```

### Get Statistics

```
GET /api/stats
```

## Database Schema

The system uses a single `counter_events` table with the following structure:

```sql
counter_events (
    id BIGSERIAL PRIMARY KEY,
    signature TEXT UNIQUE NOT NULL,
    block_time BIGINT NOT NULL,
    slot BIGINT NOT NULL,
    event_type TEXT NOT NULL,
    authority TEXT NOT NULL,
    old_count BIGINT,
    new_count BIGINT NOT NULL,
    timestamp BIGINT,
    processed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
)
```

## Event Types

The indexer captures three types of counter events:

1. **CounterInitialized**: When a new counter is created
2. **CounterIncremented**: When a counter value increases
3. **CounterDecremented**: When a counter value decreases

## Architecture

```
Solana Network → Helius Webhook → Express Server → Supabase Database
                                      ↓
                              Event Parser & Handler
                                      ↓
                                 RESTful API
```

## Error Handling

- Duplicate events are automatically ignored
- Failed webhook processing doesn't block the response to Helius
- All errors are logged with Winston
- Database connection failures are handled gracefully

## Development

### Running Tests

```bash
npm test
```

### Building for Production

```bash
npm run build
```

### Logging

The application uses Winston for structured logging:

- Console output with colors for development
- File logging (`error.log` and `combined.log`)
- Configurable log levels via `LOG_LEVEL` environment variable

## Deployment

1. Set up your Supabase database using the provided schema
2. Configure environment variables for your production environment
3. Deploy to your preferred hosting platform (Vercel, Railway, Heroku, etc.)
4. Update your Helius webhook URL to point to your deployed endpoint

## Security

- Enable Row Level Security (RLS) in Supabase
- Use authentication headers for webhook validation
- Keep your Supabase keys and Helius API keys secure
- Consider implementing rate limiting for production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
