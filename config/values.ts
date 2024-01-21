import "dotenv/config"
import { createPublicClient, http } from "viem"
import { mainnet } from "viem/chains"

if (!process.env.RPC_URL) throw new Error("RPC_URL env var must be defined")

const rpcUrl = process.env.RPC_URL as string

// block where taopad was deployed
export const initBlock = 18786171n

export const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(rpcUrl)
})
