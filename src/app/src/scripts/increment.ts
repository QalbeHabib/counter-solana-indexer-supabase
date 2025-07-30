#!/usr/bin/env ts-node

/**
 * Increment Counter Script
 *
 * This script increments the counter by 1 for the current wallet.
 * The counter must be initialized first.
 *
 * Usage:
 *   npm run increment
 *   or
 *   ts-node src/scripts/increment.ts
 */

import { loadConfig, getAccountBalance, PROGRAM_ID } from "../utils/config";
import { incrementCounter, displayCounterState } from "../utils/counter";

async function main() {
  try {
    console.log("📈 Starting Counter Increment...\n");
    console.log("🔑 Program ID:", { PROGRAM_ID: PROGRAM_ID.toBase58() });

    // Load configuration
    const { connection, wallet, program } = loadConfig();
    const authority = wallet.publicKey;

    // Check wallet balance
    const balance = await getAccountBalance(connection, authority);
    console.log(`💰 Wallet balance: ${balance.toFixed(4)} SOL`);

    if (balance < 0.01) {
      console.error(
        "❌ Insufficient balance. Need at least 0.01 SOL for transaction fees."
      );
      process.exit(1);
    }

    // Display current state
    console.log("📊 Current state:");
    await displayCounterState(program, authority);

    // Increment the counter
    const signature = await incrementCounter(program, authority);

    // Display the new state
    console.log("📊 New state:");
    await displayCounterState(program, authority);

    console.log("🎉 Counter increment completed successfully!");
  } catch (error: any) {
    console.error("❌ Error incrementing counter:", error);

    if (error.message.includes("not initialized")) {
      console.log(
        '\n💡 Hint: Run "npm run initialize" first to create the counter.'
      );
    }

    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}
