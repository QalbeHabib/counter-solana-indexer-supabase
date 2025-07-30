import { PublicKey, SystemProgram } from "@solana/web3.js";
import { Program, BN } from "@coral-xyz/anchor";
import { CounterProgram } from "../../../../../counter-program/target/types/counter_program";
import { getCounterPDA, logTransactionSignature } from "./config";

export interface CounterAccount {
  count: BN;
  authority: PublicKey;
}

export async function getCounterAccount(
  program: Program<CounterProgram>,
  authority: PublicKey
): Promise<CounterAccount | null> {
  try {
    const [counterPDA] = getCounterPDA(authority, program.programId);
    const account = await program.account.counter.fetch(counterPDA);
    return account;
  } catch (error) {
    console.log(
      `Counter account not found for authority: ${authority.toString()}`
    );
    return null;
  }
}

export async function initializeCounter(
  program: Program<CounterProgram>,
  authority: PublicKey
): Promise<string> {
  const [counterPDA] = getCounterPDA(authority, program.programId);

  console.log("🚀 Initializing counter...");
  console.log(`👤 Authority: ${authority.toString()}`);
  console.log(`🔑 Counter PDA: ${counterPDA.toString()}`);

  const signature = await program.methods
    .initialize()
    .accounts({
      // @ts-ignore
      counter: counterPDA,
      authority: authority,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  logTransactionSignature(signature);
  console.log("✅ Counter initialized successfully!");

  return signature;
}

export async function incrementCounter(
  program: Program<CounterProgram>,
  authority: PublicKey
): Promise<string> {
  const [counterPDA] = getCounterPDA(authority, program.programId);

  // Get current state
  const currentState = await getCounterAccount(program, authority);
  if (!currentState) {
    throw new Error("Counter not initialized. Run initialize first.");
  }

  console.log("📈 Incrementing counter...");
  console.log(`👤 Authority: ${authority.toString()}`);
  console.log(`🔑 Counter PDA: ${counterPDA.toString()}`);
  console.log(`📊 Current count: ${currentState.count.toString()}`);

  const signature = await program.methods
    .increment()
    .accounts({
      counter: counterPDA,
      authority: authority,
    })
    .rpc();

  logTransactionSignature(signature);
  console.log(
    `✅ Counter incremented! New count: ${currentState.count
      .add(new BN(1))
      .toString()}`
  );

  return signature;
}

export async function decrementCounter(
  program: Program<CounterProgram>,
  authority: PublicKey
): Promise<string> {
  const [counterPDA] = getCounterPDA(authority, program.programId);

  // Get current state
  const currentState = await getCounterAccount(program, authority);
  if (!currentState) {
    throw new Error("Counter not initialized. Run initialize first.");
  }

  if (currentState.count.eq(new BN(0))) {
    throw new Error("Cannot decrement counter below zero.");
  }

  console.log("📉 Decrementing counter...");
  console.log(`👤 Authority: ${authority.toString()}`);
  console.log(`🔑 Counter PDA: ${counterPDA.toString()}`);
  console.log(`📊 Current count: ${currentState.count.toString()}`);

  const signature = await program.methods
    .decrement()
    .accounts({
      counter: counterPDA,
      authority: authority,
    })
    .rpc();

  logTransactionSignature(signature);
  console.log(
    `✅ Counter decremented! New count: ${currentState.count
      .sub(new BN(1))
      .toString()}`
  );

  return signature;
}

export async function displayCounterState(
  program: Program<CounterProgram>,
  authority: PublicKey
): Promise<void> {
  const counterState = await getCounterAccount(program, authority);

  console.log("\n📊 Counter State:");
  console.log("================");

  if (counterState) {
    console.log(`👤 Authority: ${counterState.authority.toString()}`);
    console.log(`🔢 Count: ${counterState.count.toString()}`);

    const [counterPDA] = getCounterPDA(authority, program.programId);
    console.log(`🔑 Counter PDA: ${counterPDA.toString()}`);
  } else {
    console.log("❌ Counter not initialized");
  }

  console.log("================\n");
}
