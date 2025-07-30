import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Wallet, Program } from "@coral-xyz/anchor";
import { CounterProgram } from "../../constant/counter_program";
import IDL from "../../constant/counter_program.json";
import dotenv from "dotenv";
import bs58 from "bs58";

// Load environment variables
dotenv.config();

export interface AppConfig {
  connection: Connection;
  wallet: Wallet;
  provider: AnchorProvider;
  program: Program<CounterProgram>;
  programId: PublicKey;
}

export const PROGRAM_ID = new PublicKey(IDL.address);

export function loadConfig(): AppConfig {
  // Validate environment variables
  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
  const programIdString =
    process.env.PROGRAM_ID || "FVrsAkavtKsAV6KHwRpMCmZonqC2XckWZmcpuLcm9n5E";
  const privateKeyString = process.env.PRIVATE_KEY;

  if (!privateKeyString) {
    throw new Error("PRIVATE_KEY environment variable is required");
  }

  // Create connection
  const connection = new Connection(rpcUrl, "confirmed");

  // Create wallet from private key
  let keypair: Keypair;
  try {
    const privateKeyBytes = bs58.decode(privateKeyString);
    keypair = Keypair.fromSecretKey(privateKeyBytes);
  } catch (error) {
    throw new Error("Invalid PRIVATE_KEY format. Must be base58 encoded.");
  }

  const wallet = new Wallet(keypair);

  // Create provider
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });

  // Create program
  const programId = new PublicKey(programIdString);
  const program = new Program<CounterProgram>(IDL as CounterProgram, provider);

  return {
    connection,
    wallet,
    provider,
    program,
    programId,
  };
}

export function getCounterPDA(
  authority: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("counter"), authority.toBuffer()],
    programId
  );
}

export async function getAccountBalance(
  connection: Connection,
  publicKey: PublicKey
): Promise<number> {
  const balance = await connection.getBalance(publicKey);
  return balance / 1_000_000_000; // Convert lamports to SOL
}

export function logTransactionSignature(
  signature: string,
  network: string = "devnet"
) {
  const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=${network}`;
  console.log(`\n🔗 Transaction: ${signature}`);
  console.log(`📱 Explorer: ${explorerUrl}\n`);
}
