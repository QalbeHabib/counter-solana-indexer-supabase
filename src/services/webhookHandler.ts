import { EventParser } from "../utils/eventParser";
import { EventModel, CounterEvent } from "../models/Event";
import { PublicKey, Connection, clusterApiUrl } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet, BN } from "@coral-xyz/anchor";
import winston from "winston";

export interface HeliusWebhookPayload {
  [key: string]: {
    signature: string;
    slot: number;
    timestamp: number;
    fee: number;
    feePayer: string;
    instructions: {
      accounts: string[];
      data: string;
      programId: string;
      innerInstructions: any[];
    }[];
    events: any;
    accountData: any[];
    nativeTransfers: any[];
    tokenTransfers: any[];
    transactionError: any;
    type: string;
    source: string;
    description: string;
  };
}

export class WebhookHandler {
  private eventParser: EventParser;
  private eventModel: EventModel;
  private logger: winston.Logger;
  private connection: Connection;
  private counterProgramId: PublicKey;

  constructor(eventModel: EventModel, logger: winston.Logger) {
    this.eventParser = new EventParser();
    this.eventModel = eventModel;
    this.logger = logger;
    this.connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    this.counterProgramId = new PublicKey(
      "FVrsAkavtKsAV6KHwRpMCmZonqC2XckWZmcpuLcm9n5E"
    );
  }

  // Helper to get counter PDA
  private getCounterPDA(authority: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("counter"), authority.toBuffer()],
      this.counterProgramId
    );
  }

  // Query the counter account to get current state
  private async getCounterState(
    authority: PublicKey
  ): Promise<{ count: BN } | null> {
    try {
      const [counterPDA] = this.getCounterPDA(authority);
      const accountInfo = await this.connection.getAccountInfo(counterPDA);

      if (!accountInfo) {
        return null;
      }

      // Parse the account data (8 bytes discriminator + 8 bytes count + 32 bytes authority)
      // For now, let's extract the count from the raw account data
      const data = accountInfo.data;
      if (data.length >= 16) {
        // Skip 8-byte discriminator, read 8-byte count (little endian)
        const countBuffer = data.subarray(8, 16);
        const count = new BN(countBuffer, "le");
        return { count };
      }

      return null;
    } catch (error) {
      this.logger.error(`Error querying counter account: ${error}`);
      return null;
    }
  }

  async processWebhook(payload: HeliusWebhookPayload): Promise<void> {
    // Get all transaction keys from the payload
    const transactionKeys = Object.keys(payload).filter(
      (key) => key !== "timestamp" && payload[key].signature
    );

    if (transactionKeys.length === 0) {
      this.logger.info("Received webhook with no transactions");
      return;
    }

    this.logger.info(
      `Processing webhook with ${transactionKeys.length} transactions`
    );

    for (const key of transactionKeys) {
      try {
        const transaction = payload[key];
        if (!transaction.signature) {
          this.logger.warn("Transaction missing signature", transaction);
          continue;
        }

        // Check if transaction failed
        if (transaction.transactionError) {
          this.logger.debug(
            `Skipping failed transaction ${transaction.signature}`
          );
          continue;
        }

        // Check if this transaction involves our counter program
        const hasCounterProgram = transaction.instructions.some(
          (instruction: any) =>
            instruction.programId ===
            "FVrsAkavtKsAV6KHwRpMCmZonqC2XckWZmcpuLcm9n5E"
        );

        if (!hasCounterProgram) {
          this.logger.debug(
            `Skipping transaction ${transaction.signature} - not counter program`
          );
          continue;
        }

        this.logger.info(
          `Processing counter transaction ${transaction.signature}`
        );
        await this.processCounterTransaction(transaction);
      } catch (error) {
        this.logger.error("Error processing transaction:", error);
      }
    }
  }

  private async processCounterTransaction(transaction: any): Promise<void> {
    for (const instruction of transaction.instructions) {
      if (
        instruction.programId === "FVrsAkavtKsAV6KHwRpMCmZonqC2XckWZmcpuLcm9n5E"
      ) {
        try {
          // Decode the instruction data to determine the operation
          const instructionData = instruction.data;

          // Determine event type based on instruction data
          let eventType:
            | "CounterInitialized"
            | "CounterIncremented"
            | "CounterDecremented";

          // Base64 decode the instruction data to get bytes for comparison
          const instructionBytes = Buffer.from(instructionData, "base64");
          const discriminator = instructionBytes.subarray(0, 8);

          // Debug: Log the full instruction data
          this.logger.info(`Instruction data (base64): ${instructionData}`);
          this.logger.info(
            `Instruction bytes (hex): ${instructionBytes.toString("hex")}`
          );
          this.logger.info(
            `Discriminator (hex): ${discriminator.toString("hex")}`
          );

          // Let's use the actual discriminator we're seeing
          const actualDiscriminator = discriminator.toString("hex");

          // For now, let's identify the operation based on the discriminator we're seeing
          if (actualDiscriminator === "dab42b70d1cbdd58") {
            // This seems to be increment based on your logs showing increment operations
            eventType = "CounterIncremented";
            this.logger.info("Detected increment operation from discriminator");
          } else if (actualDiscriminator === "af6fd31375989975") {
            // This would be initialize (placeholder - add real discriminator when you see it)
            eventType = "CounterInitialized";
            this.logger.info(
              "Detected initialize operation from discriminator"
            );
          } else if (actualDiscriminator === "6ae3a83bf81b9665") {
            // This would be decrement (placeholder - add real discriminator when you see it)
            eventType = "CounterDecremented";
            this.logger.info("Detected decrement operation from discriminator");
          } else {
            // We'll add more discriminators as we see them
            this.logger.warn(
              `Unknown instruction discriminator: ${actualDiscriminator}`
            );

            // For now, let's assume it's an increment if we don't recognize it
            // We can refine this as we see more transactions
            eventType = "CounterIncremented";
            this.logger.info("Defaulting to increment operation");
          }

          // Get the authority (second account in the instruction)
          const authorityPubkey = new PublicKey(instruction.accounts[1]);

          // Query the current counter state (after the transaction)
          const counterState = await this.getCounterState(authorityPubkey);

          if (!counterState) {
            this.logger.warn(
              `Could not query counter state for authority ${authorityPubkey.toString()}`
            );
            continue;
          }

          const newCount = counterState.count.toNumber();
          let oldCount: number | undefined = undefined;

          // Calculate old count based on operation type
          switch (eventType) {
            case "CounterInitialized":
              oldCount = undefined; // No previous count
              break;
            case "CounterIncremented":
              oldCount = newCount - 1; // Previous count was 1 less
              break;
            case "CounterDecremented":
              oldCount = newCount + 1; // Previous count was 1 more
              break;
          }

          const counterEvent: CounterEvent = {
            signature: transaction.signature,
            block_time: transaction.timestamp,
            slot: transaction.slot,
            event_type: eventType,
            authority: authorityPubkey.toString(),
            old_count: oldCount,
            new_count: newCount,
            timestamp: transaction.timestamp, // Use transaction timestamp
            processed_at: new Date().toISOString(),
          };

          await this.eventModel.saveEvent(counterEvent);
          this.logger.info(
            `Saved ${eventType} event: ${oldCount} → ${newCount} (tx: ${transaction.signature})`
          );
        } catch (error) {
          this.logger.error(`Error processing counter instruction:`, error);
        }
      }
    }
  }
}
