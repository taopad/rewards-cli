export type HolderMap = Record<string, HolderInfo>

export type HolderInfo = {
    balance: bigint
    isContract: boolean
    isBlacklisted: boolean
}

type SnapshotLine = {
    blockNumber: bigint
    address: string
    balance: bigint
    isContract: boolean
    isBlacklisted: boolean
}

export type Snapshot = SnapshotLine[]

export type RewardMap = Record<string, bigint>

export type Distribution = {
    chainId: number
    token: string
    blockNumber: bigint
    totalShares: bigint
    totalRewards: bigint
    root: string
}

export type DistributionResult = {
    totalShares: bigint
    totalRewards: bigint
    root: string
    proofs: DistributionProof[]
}

export type DistributionProof = [string, bigint, string[]]

export type Whitelist = {
    blockNumber: bigint
    minAmount: bigint
    root: string
}

export type WhitelistResult = {
    root: string
    proofs: WhitelistProof[]
}

export type WhitelistProof = [string, bigint, string[]]
