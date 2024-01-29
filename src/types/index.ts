type SnapshotLine = {
    blockNumber: bigint
    address: string
    balance: bigint
    isContract: boolean
    isBlacklisted: boolean
}

export type Snapshot = SnapshotLine[]

export type HolderMap = Record<string, HolderInfo>

export type HolderInfo = {
    balance: bigint
    isContract: boolean
    isBlacklisted: boolean
}

export type RewardMap = Record<string, bigint>

export type Proof = [string, bigint, string[]]

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
    proofs: Proof[]
}
