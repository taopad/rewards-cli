import { isAddress } from "viem"
import { StandardMerkleTree } from "@openzeppelin/merkle-tree"

import { graphql } from "./lib/graphql"
import { database } from "./lib/database"
import { getLastFinalizedBlockNumber } from "./lib/blockchain"
import { Snapshot, RewardMap, DistributionItem } from "./types"

export type DistributionTreeResult = {
    totalShares: bigint
    totalRewards: bigint
    root: string
    list: DistributionItem[]
}

const shareReducer = (acc: bigint, current: bigint) => acc + current

const parseChainId = (): number => {
    if (process.argv.length < 3) {
        throw new Error("chain id is required [chain_id, token_address, reward_amount, block_number?]")
    }

    const chainId = parseInt(process.argv[2])

    if (isNaN(chainId)) {
        throw new Error("chain_id must be parsable as number")
    }

    return chainId
}

const parseTokenAddress = (): `0x${string}` => {
    if (process.argv.length < 4) {
        throw new Error("token address is required [chain_id, token_address, reward_amount, block_number?]")
    }

    const token = process.argv[3]

    if (!isAddress(token)) {
        throw new Error("token_address must be a valid address")
    }

    return token
}

const parseRewardAmount = (): bigint => {
    if (process.argv.length < 5) {
        throw new Error("reward_amount is required [chain_id, token_address, reward_amount, block_number?]")
    }

    try {
        return BigInt(process.argv[4])
    } catch (e: any) {
        throw new Error("reward_amount must be parsable as bigint")
    }
}

const parseOptionalBlockNumber = (): bigint | undefined => {
    if (process.argv.length < 6) {
        return undefined
    }

    try {
        return BigInt(process.argv[5])
    } catch (e: any) {
        throw new Error("block_number must be parsable as bigint")
    }

}

const getValidBlockNumber = async (blockNumber: bigint | undefined) => {
    const lastFinalizedBlockNumber = await getLastFinalizedBlockNumber()

    if (blockNumber === undefined) {
        return lastFinalizedBlockNumber
    }

    if (blockNumber <= lastFinalizedBlockNumber) {
        return blockNumber
    }

    throw new Error("block number must be before last finalized block number")
}

const getDistributionTree = async (snapshot: Snapshot, rewardMap: RewardMap, rewardAmount: bigint): Promise<DistributionTreeResult> => {
    let totalRewards = 0n
    const totalShares = Object.values(snapshot).reduce(shareReducer)

    for (const [address, balance] of Object.entries(snapshot)) {
        const rewards = (balance * rewardAmount) / totalShares

        totalRewards += rewards

        if (rewards > 0) {
            rewardMap[address] = (rewardMap[address] ?? 0n) + rewards
        }
    }

    const list: DistributionItem[] = []

    const tree = StandardMerkleTree.of(Object.entries(rewardMap), ["address", "uint256"])

    for (const [i, [address, amount]] of tree.entries()) {
        list.push({
            address: address,
            balance: snapshot[address] ?? 0n,
            amount: amount,
            proof: tree.getProof(i),
        });
    }

    return { totalShares, totalRewards, root: tree.root, list }
}

const distribute = async () => {
    // parse input.
    const chainId = parseChainId()
    const token = parseTokenAddress()
    const rewardAmount = parseRewardAmount()
    const blockNumber = await getValidBlockNumber(parseOptionalBlockNumber())

    // ensure theres no more recent distribution for this token on this chain.
    const lastDistribution = await database.distribution.getLast(chainId, token)

    if (lastDistribution != null && lastDistribution.blockNumber >= blockNumber) {
        throw new Error(`distribution already exists for ${lastDistribution.blockNumber}`)
    }

    // take the snapshot with the given block.
    const snapshot = await graphql.snapshot(blockNumber, 0n)

    // ensure snapshot is not empty.
    if (Object.entries(snapshot).length === 0) {
        throw new Error("empty snapshot")
    }

    // get the last reward map for this distribution.
    const rewardMap = await database.distribution.getLastRewardMap(chainId, token)

    // compute the distribution merkle tree
    const { totalShares, totalRewards, root, list } = await getDistributionTree(snapshot, rewardMap, rewardAmount)

    // save the distribution merkle tree.
    database.distribution.save({ chainId, token, blockNumber, totalShares, totalRewards, root, list })

    // display the tree root to the user.
    console.log(`npm run pending ${chainId} ${token} to display values to send to the contract`)
}

distribute()
    .then(async () => {
        await database.disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await database.disconnect()
        process.exit(1)
    })
