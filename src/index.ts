import express, { Request, Response } from "express";
import cors from "cors";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import winston from "winston";
import dotenv from "dotenv";
import { EventModel } from "./models/Event";
import {
  WebhookHandler,
  HeliusWebhookPayload,
} from "./services/webhookHandler";

// Load environment variables
dotenv.config();

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

// Configuration
const config = {
  port: process.env.PORT || 3000,
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseKey: process.env.SUPABASE_ANON_KEY || "",
  webhookAuth: process.env.WEBHOOK_AUTH_HEADER || "",
  corsOrigin: process.env.CORS_ORIGIN || "*",
};

// Express app setup
const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(cors({ origin: config.corsOrigin }));

// Global variables
let supabase: SupabaseClient;
let eventModel: EventModel;
let webhookHandler: WebhookHandler;

// Webhook authentication middleware
const authenticateWebhook = (req: Request, res: Response, next: Function) => {
  // Log all headers for debugging
  logger.info("Webhook request headers:", req.headers);

  const authHeader =
    req.headers["authorization"] ||
    req.headers["x-auth"] ||
    req.headers["auth"];

  if (config.webhookAuth && config.webhookAuth.length > 0) {
    if (!authHeader || authHeader !== config.webhookAuth) {
      logger.warn("Unauthorized webhook request", {
        expected: config.webhookAuth,
        received: authHeader,
      });
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  next();
};

// Routes

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    supabase: supabase ? "connected" : "disconnected",
  });
});

// Helius webhook endpoint
app.post(
  "/webhook/helius",
  authenticateWebhook,
  async (req: Request, res: Response) => {
    try {
      logger.info("Received Helius webhook");
      const payload = req.body as HeliusWebhookPayload;

      // Process webhook asynchronously
      webhookHandler.processWebhook(payload).catch((error) => {
        logger.error("Error processing webhook:", error);
      });

      // Immediately respond to Helius
      res.status(200).json({ received: true });
    } catch (error) {
      logger.error("Error handling webhook:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Debug route to catch any webhook attempts
app.post("/", (req: Request, res: Response) => {
  logger.info("Received POST to root:", {
    headers: req.headers,
    body: req.body,
    url: req.url,
    originalUrl: req.originalUrl,
  });
  res
    .status(200)
    .json({ message: "Root endpoint - webhook should go to /webhook/helius" });
});

// API endpoints

// Get recent events
app.get("/api/events", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const events = await eventModel.getRecentEvents(limit);
    res.json({ events });
  } catch (error) {
    logger.error("Error fetching events:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// Get events by authority
app.get("/api/events/:authority", async (req: Request, res: Response) => {
  try {
    const { authority } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    const events = await eventModel.getEventsByAuthority(authority, limit);
    res.json({ events });
  } catch (error) {
    logger.error("Error fetching events by authority:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// Get counter state for an authority
app.get("/api/counter/:authority", async (req: Request, res: Response) => {
  try {
    const { authority } = req.params;
    const state = await eventModel.getCounterState(authority);

    if (!state) {
      return res.status(404).json({ error: "Counter not found" });
    }

    res.json({ authority, ...state });
  } catch (error) {
    logger.error("Error fetching counter state:", error);
    res.status(500).json({ error: "Failed to fetch counter state" });
  }
});

// Get statistics
app.get("/api/stats", async (req: Request, res: Response) => {
  try {
    const events = await eventModel.getRecentEvents(1000);

    const stats = {
      totalEvents: events.length,
      eventTypes: {
        initialized: events.filter((e) => e.event_type === "CounterInitialized")
          .length,
        incremented: events.filter((e) => e.event_type === "CounterIncremented")
          .length,
        decremented: events.filter((e) => e.event_type === "CounterDecremented")
          .length,
      },
      uniqueAuthorities: new Set(events.map((e) => e.authority)).size,
      lastEventTime: events[0]?.processed_at || null,
    };

    res.json(stats);
  } catch (error) {
    logger.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

// Initialize database and start server
async function start() {
  try {
    // Validate Supabase configuration
    if (!config.supabaseUrl || !config.supabaseKey) {
      throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY are required");
    }

    // Initialize Supabase client
    logger.info("Initializing Supabase client...");
    supabase = createClient(config.supabaseUrl, config.supabaseKey);

    eventModel = new EventModel(supabase);
    webhookHandler = new WebhookHandler(eventModel, logger);

    logger.info("Connected to Supabase");

    // Start server
    app.listen(config.port, () => {
      logger.info(`Server is running on port ${config.port}`);
      logger.info(
        `Webhook endpoint: http://localhost:${config.port}/webhook/helius`
      );
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Shutting down...");
  process.exit(0);
});

// Start the application
start();
