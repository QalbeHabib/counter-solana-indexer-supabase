#!/usr/bin/env ts-node

/**
 * Counter Program CLI
 *
 * Main entry point for counter program interactions.
 *
 * Usage:
 *   npm run dev -- <command> [args]
 *
 * Commands:
 *   init     - Initialize a new counter
 *   inc      - Increment the counter
 *   dec      - Decrement the counter
 *   status   - Show counter status
 *   demo     - Run full demo
 */

import { loadConfig } from "./utils/config";
import { displayCounterState } from "./utils/counter";

async function showUsage() {
  console.log("\n🔢 Counter Program CLI");
  console.log("=".repeat(30));
  console.log("Available commands:");
  console.log("  npm run initialize  - Initialize a new counter");
  console.log("  npm run increment   - Increment the counter");
  console.log("  npm run decrement   - Decrement the counter");
  console.log("  npm run demo        - Run full demo");
  console.log("  npm run dev status  - Show counter status");
  console.log("\nEnvironment setup:");
  console.log("  1. Copy env-example.txt to .env");
  console.log("  2. Set your PRIVATE_KEY (base58 format)");
  console.log("  3. Set SOLANA_RPC_URL (default: devnet)");
  console.log("  4. Run npm install\n");
}

async function showStatus() {
  try {
    const { wallet, program } = loadConfig();
    const authority = wallet.publicKey;

    console.log("\n📊 Counter Status");
    console.log("=".repeat(30));
    await displayCounterState(program, authority);
  } catch (error) {
    console.error("❌ Error getting status:", error);
  }
}

async function main() {
  const command = process.argv[2];

  switch (command) {
    case "status":
      await showStatus();
      break;
    case "help":
    case "--help":
    case "-h":
      await showUsage();
      break;
    default:
      await showUsage();
      break;
  }
}

// Run the CLI if called directly
if (require.main === module) {
  main();
}
