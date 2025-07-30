#!/usr/bin/env ts-node

/**
 * Decrement Counter Script
 *
 * This script decrements the counter by 1 for the current wallet.
 * The counter must be initialized first and must be greater than 0.
 *
 * Usage:
 *   npm run decrement
 *   or
 *   ts-node src/scripts/decrement.ts
 */

import { loadConfig, getAccountBalance, PROGRAM_ID } from "../utils/config";
import { decrementCounter, displayCounterState } from "../utils/counter";

async function main() {
  try {
    console.log("📉 Starting Counter Decrement...\n");
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

    // Decrement the counter
    const signature = await decrementCounter(program, authority);

    // Display the new state
    console.log("📊 New state:");
    await displayCounterState(program, authority);

    console.log("🎉 Counter decrement completed successfully!");
  } catch (error: any) {
    console.error("❌ Error decrementing counter:", error);

    if (error.message.includes("not initialized")) {
      console.log(
        '\n💡 Hint: Run "npm run initialize" first to create the counter.'
      );
    } else if (error.message.includes("below zero")) {
      console.log("\n💡 Hint: Counter is already at 0. Increment it first.");
    }

    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}
