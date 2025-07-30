import {
  BorshCoder,
  Idl,
  EventParser as AnchorEventParser,
  Event,
} from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

// Counter Program IDL - This should match the generated IDL from your Anchor program
export const COUNTER_PROGRAM_IDL: Idl = {
  version: "0.1.0",
  name: "counter_program",
  instructions: [
    {
      name: "initialize",
      accounts: [
        { name: "counter", isMut: true, isSigner: false },
        { name: "authority", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: "increment",
      accounts: [
        { name: "counter", isMut: true, isSigner: false },
        { name: "authority", isMut: false, isSigner: true },
      ],
      args: [],
    },
    {
      name: "decrement",
      accounts: [
        { name: "counter", isMut: true, isSigner: false },
        { name: "authority", isMut: false, isSigner: true },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: "Counter",
      type: {
        kind: "struct",
        fields: [
          { name: "count", type: "u64" },
          { name: "authority", type: "publicKey" },
        ],
      },
    },
  ],
  events: [
    {
      name: "CounterInitialized",
      fields: [
        { name: "authority", type: "publicKey", index: false },
        { name: "count", type: "u64", index: false },
      ],
    },
    {
      name: "CounterIncremented",
      fields: [
        { name: "authority", type: "publicKey", index: false },
        { name: "oldCount", type: "u64", index: false },
        { name: "newCount", type: "u64", index: false },
        { name: "timestamp", type: "i64", index: false },
      ],
    },
    {
      name: "CounterDecremented",
      fields: [
        { name: "authority", type: "publicKey", index: false },
        { name: "oldCount", type: "u64", index: false },
        { name: "newCount", type: "u64", index: false },
        { name: "timestamp", type: "i64", index: false },
      ],
    },
  ],
  errors: [
    {
      code: 6000,
      name: "UnderflowError",
      msg: "Counter cannot be decremented below zero",
    },
  ],
};

export const COUNTER_PROGRAM_ID = new PublicKey(
  "FVrsAkavtKsAV6KHwRpMCmZonqC2XckWZmcpuLcm9n5E"
);

export class EventParser {
  private coder: BorshCoder;
  private anchorParser: AnchorEventParser;

  constructor() {
    this.coder = new BorshCoder(COUNTER_PROGRAM_IDL);
    this.anchorParser = new AnchorEventParser(COUNTER_PROGRAM_ID, this.coder);
  }

  parseTransactionLogs(logs: string[]): Event[] {
    const events: Event[] = [];

    // Filter logs that contain base64 encoded event data
    const eventLogs = logs.filter(
      (log) => log.includes("Program data:") || log.includes("Program log:")
    );

    for (const log of eventLogs) {
      try {
        // Extract base64 data from log
        let base64Data: string | null = null;

        if (log.includes("Program data:")) {
          base64Data = log.split("Program data: ")[1];
        } else if (log.includes("Program log:")) {
          const match = log.match(/Program log: (.+)/);
          if (match && match[1]) {
            // Try to decode as base64
            try {
              const decoded = Buffer.from(match[1], "base64");
              if (decoded.length > 0) {
                base64Data = match[1];
              }
            } catch {
              // Not base64, skip
              continue;
            }
          }
        }

        if (base64Data) {
          const event = this.parseEventData(base64Data);
          if (event) {
            events.push(event);
          }
        }
      } catch (error) {
        console.error("Error parsing log:", error);
      }
    }

    return events;
  }

  private parseEventData(base64Data: string): Event | null {
    try {
      // Decode the event using the coder
      const event = this.coder.events.decode(base64Data);
      if (event) {
        return event;
      }
    } catch (error) {
      console.error("Error decoding event:", error);
    }

    return null;
  }

  // Alternative method to parse from webhook transaction data
  parseFromWebhookTransaction(transaction: any): Event[] {
    const events: Event[] = [];

    if (!transaction.meta?.logMessages) {
      return events;
    }

    return this.parseTransactionLogs(transaction.meta.logMessages);
  }
}
