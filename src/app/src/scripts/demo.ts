#!/usr/bin/env ts-node

/**
 * Counter Program Demo Script
 *
 * This script demonstrates all counter operations in sequence:
 * 1. Initialize counter (if not exists)
 * 2. Increment counter multiple times
 * 3. Decrement counter multiple times
 * 4. Show final state
 *
 * Usage:
 *   npm run demo
 *   or
 *   ts-node src/scripts/demo.ts
 */

import { loadConfig, getAccountBalance } from "../utils/config";
import {
  initializeCounter,
  incrementCounter,
  decrementCounter,
  getCounterAccount,
  displayCounterState,
} from "../utils/counter";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  try {
    console.log("🎭 Starting Counter Program Demo...\n");

    // Load configuration
    const { connection, wallet, program } = loadConfig();
    const authority = wallet.publicKey;

    // Check wallet balance
    const balance = await getAccountBalance(connection, authority);
    console.log(`💰 Wallet balance: ${balance.toFixed(4)} SOL`);

    if (balance < 0.1) {
      console.error(
        "❌ Insufficient balance. Need at least 0.1 SOL for demo transactions."
      );
      process.exit(1);
    }

    // Step 1: Initialize counter (if not exists)
    console.log("\n🔹 Step 1: Checking/Initializing Counter");
    console.log("=".repeat(50));

    let counterAccount = await getCounterAccount(program, authority);
    if (!counterAccount) {
      await initializeCounter(program, authority);
      await sleep(2000); // Wait for confirmation
    } else {
      console.log("✅ Counter already exists");
    }

    await displayCounterState(program, authority);

    // Step 2: Increment counter multiple times
    console.log("\n🔹 Step 2: Incrementing Counter (3 times)");
    console.log("=".repeat(50));

    for (let i = 1; i <= 3; i++) {
      console.log(`\n--- Increment ${i}/3 ---`);
      await incrementCounter(program, authority);
      await sleep(2000); // Wait between transactions
    }

    await displayCounterState(program, authority);

    // Step 3: Decrement counter multiple times
    console.log("\n🔹 Step 3: Decrementing Counter (2 times)");
    console.log("=".repeat(50));

    for (let i = 1; i <= 2; i++) {
      console.log(`\n--- Decrement ${i}/2 ---`);
      await decrementCounter(program, authority);
      await sleep(2000); // Wait between transactions
    }

    // Step 4: Final state
    console.log("\n🔹 Step 4: Final State");
    console.log("=".repeat(50));
    await displayCounterState(program, authority);

    console.log("\n🎉 Demo completed successfully!");
    console.log("\n📝 Summary:");
    console.log("   ✅ Counter initialized (if needed)");
    console.log("   ✅ Incremented 3 times");
    console.log("   ✅ Decremented 2 times");
    console.log("   ✅ Final count should be 1");

    console.log("\n💡 Check your backend indexer to see the captured events!");
  } catch (error) {
    console.error("❌ Demo failed:", error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}
