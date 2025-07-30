#!/usr/bin/env ts-node

/**
 * Counter Event Monitor
 *
 * This script monitors counter events in real-time by listening to logs.
 * Useful for testing and debugging the event indexing pipeline.
 *
 * Usage:
 *   ts-node src/scripts/monitor.ts
 */

import { loadConfig } from "../utils/config";
import { Connection, PublicKey } from "@solana/web3.js";

async function main() {
  try {
    console.log("👁️  Starting Counter Event Monitor...\n");

    const { connection, program, programId } = loadConfig();

    console.log(`🔍 Monitoring program: ${programId.toString()}`);
    console.log(`🌐 RPC endpoint: ${connection.rpcEndpoint}`);
    console.log("📡 Listening for events...\n");

    // Subscribe to program logs
    const subscriptionId = connection.onLogs(
      programId,
      (logs, context) => {
        console.log(`🔔 New transaction detected:`);
        console.log(`   Signature: ${logs.signature}`);
        console.log(`   Slot: ${context.slot}`);

        // Parse logs for events
        logs.logs.forEach((log, index) => {
          if (log.includes("Program log:") || log.includes("Program data:")) {
            console.log(`   Log ${index}: ${log}`);
          }
        });

        // Check for specific event indicators
        const logString = logs.logs.join(" ");
        if (logString.includes("CounterInitialized")) {
          console.log("   🎉 CounterInitialized event detected!");
        } else if (logString.includes("CounterIncremented")) {
          console.log("   📈 CounterIncremented event detected!");
        } else if (logString.includes("CounterDecremented")) {
          console.log("   📉 CounterDecremented event detected!");
        }

        console.log("   ----------------------------------------\n");
      },
      "confirmed"
    );

    console.log(`✅ Subscribed to logs (ID: ${subscriptionId})`);
    console.log("Press Ctrl+C to stop monitoring...\n");

    // Keep the process running
    process.on("SIGINT", () => {
      console.log("\n🛑 Stopping monitor...");
      connection.removeOnLogsListener(subscriptionId);
      process.exit(0);
    });

    // Keep alive
    setInterval(() => {
      // Just keep the process running
    }, 1000);
  } catch (error) {
    console.error("❌ Error starting monitor:", error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}
