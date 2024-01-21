type SnapshotLine = {
    block_number: bigint
    address: string
    balance: string
    is_contract: boolean
    is_blacklisted: boolean
}

export type Snapshot = SnapshotLine[]

export type HolderMap = Record<string, HolderInfo>

export type HolderInfo = {
    balance: bigint
    isContract: boolean
    isBlacklisted: boolean
}
