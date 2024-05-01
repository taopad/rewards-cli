export type Snapshot = Record<string, bigint>

export type ProofMap = Record<string, {
    shares: bigint
    amount: bigint
    proof: `0x${string}`[]
}>

export type Distribution = {
    chainId: number
    token: `0x${string}`
    blockNumber: bigint
    snapshots: number
    interval: number
    totalShares: bigint
    totalRewards: bigint
    root: `0x${string}`
    proofs: ProofMap
}

export type Allocation = {
    chainId: number
    launchpad: `0x${string}`
    blockNumber: bigint
    snapshots: number
    interval: number
    totalShares: bigint
    totalAllocations: bigint
    root: `0x${string}`
    proofs: ProofMap
}
