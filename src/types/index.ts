export type Snapshot = Record<string, bigint>

export type RewardMap = Record<string, bigint>

export type Distribution = {
    chainId: number
    token: string
    blockNumber: bigint
    totalShares: bigint
    totalRewards: bigint
    root: string
    list: DistributionItem[]
}

export type DistributionItem = {
    address: string,
    balance: bigint,
    amount: bigint,
    proof: string[],
}

export type Whitelist = {
    launchpad: string
    root: string
    list: WhitelistItem[]
}

export type WhitelistItem = {
    address: string,
    proof: string[],
}
