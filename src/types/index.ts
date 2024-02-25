import { chains } from "../lib/blockchain"

export type SupportedChainId = typeof chains[number]["id"]

export type Snapshot = Record<string, bigint>

export type RewardMap = Record<string, bigint>

export type Distribution = {
    chainId: SupportedChainId
    token: `0x${string}`
    blockNumber: bigint
    totalShares: bigint
    totalRewards: bigint
    root: `0x${string}`
    list: DistributionItem[]
}

export type DistributionItem = {
    address: `0x${string}`
    balance: bigint
    amount: bigint
    proof: `0x${string}`[]
}

export type Whitelist = {
    chainId: SupportedChainId
    launchpad: `0x${string}`
    root: `0x${string}`
    blockNumber: bigint
    minBalance: bigint
    list: WhitelistItem[]
}

export type WhitelistItem = {
    address: `0x${string}`
    proof: `0x${string}`[]
    balance: bigint
}

export const isSupportedChainId = (chainId: number): chainId is SupportedChainId => {
    return chains.find(chain => chain.id === chainId) !== undefined
}
