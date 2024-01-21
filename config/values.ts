import "dotenv/config"
import { createPublicClient, http } from "viem"
import { mainnet } from "viem/chains"

if (!process.env.RPC_URL) throw new Error("RPC_URL env var must be defined")
if (!process.env.BATCH_SIZE) throw new Error("BATCH_SIZE env var must be defined")

// block where taopad was deployed
export const initBlock = 18786171n

export const batchSize = BigInt(process.env.BATCH_SIZE as string)

export const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(process.env.RPC_URL as string)
})
