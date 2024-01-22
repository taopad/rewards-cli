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
    totalShares: bigint
    totalRewards: bigint
    root: string
    proofs: Proof[]
}
