#!/usr/bin/env ts-node

/**
 * Initialize Counter Script
 *
 * This script initializes a new counter account for the current wallet.
 * Each wallet can only have one counter account.
 *
 * Usage:
 *   npm run initialize
 *   or
 *   ts-node src/scripts/initialize.ts
 */

import { loadConfig, getAccountBalance } from "../utils/config";
import {
  initializeCounter,
  getCounterAccount,
  displayCounterState,
} from "../utils/counter";

async function main() {
  try {
    console.log("🏁 Starting Counter Initialization...\n");

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

    // Check if counter already exists
    const existingCounter = await getCounterAccount(program, authority);
    if (existingCounter) {
      console.log("⚠️  Counter already exists for this wallet!");
      await displayCounterState(program, authority);
      process.exit(0);
    }

    // Initialize the counter
    const signature = await initializeCounter(program, authority);

    // Display the new state
    await displayCounterState(program, authority);

    console.log("🎉 Counter initialization completed successfully!");
    console.log(`\n💡 Next steps:`);
    console.log(`   - Run "npm run increment" to increment the counter`);
    console.log(`   - Run "npm run decrement" to decrement the counter`);
  } catch (error) {
    console.error("❌ Error initializing counter:", error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}
