import "dotenv/config"

import { createPublicClient, http } from "viem"
import { mainnet, arbitrum } from "viem/chains"

import TaopadAbi from "../abi/Taopad"
import DistributorAbi from "../abi/Distributor"

if (!process.env.RPC_URL) throw new Error("RPC_URL env var must be defined")
if (!process.env.BATCH_SIZE) throw new Error("BATCH_SIZE env var must be defined")

// block where taopad was deployed
export const initBlock = 18786171n

export const batchSize = BigInt(process.env.BATCH_SIZE as string)

export const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(process.env.RPC_URL as string)
})

// taopad contract.
export const TaopadContract = {
    abi: TaopadAbi,
    address: "0x5483DC6abDA5F094865120B2D251b5744fc2ECB5" as `0x${string}`,
}

// distributor contract.
export const DistributorContract = {
    abi: DistributorAbi,
    address: "0xcc79E3C699572f3b90cB3b13E48F5237FeabDD3F" as `0x${string}`
}

// distribution are allowed only on those chains.
const chains = [mainnet, arbitrum]

const chainIds = chains.map(c => c.id)

const selectChain = (chainId: number) => chains.filter(c => c.id === chainId).shift()

export const publicClientFactory = (chainId: number) => {
    if (chainId === 1) {
        return publicClient
    }

    const chain = selectChain(chainId)

    if (chain === undefined) {
        throw new Error("invalid chain id")
    }

    return createPublicClient({ chain, transport: http() })
}
