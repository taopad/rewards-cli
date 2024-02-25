import { isAddress } from "viem"
import { StandardMerkleTree } from "@openzeppelin/merkle-tree"

import { graphql } from "./lib/graphql"
import { database } from "./lib/database"
import { outputDistributionPendingData } from "./lib/view"
import { getLastFinalizedBlockNumber } from "./lib/blockchain"
import { Snapshot, RewardMap, DistributionItem, isSupportedChainId } from "./types"

export type DistributionTreeResult = {
    totalShares: bigint
    totalRewards: bigint
    root: `0x${string}`
    list: DistributionItem[]
}

const parseChainId = () => {
    if (process.argv.length < 3) {
        throw new Error("chain id is required [chain_id, token_address, reward_amount, block_number?]")
    }

    const chainId = parseInt(process.argv[2])

    if (isNaN(chainId)) {
        throw new Error("chain_id must be parsable as number")
    }

    if (!isSupportedChainId(chainId)) {
        throw new Error(`chain_id ${chainId} is not supported`)
    }

    return chainId
}

const parseTokenAddress = () => {
    if (process.argv.length < 4) {
        throw new Error("token address is required [chain_id, token_address, reward_amount, block_number?]")
    }

    const token = process.argv[3]

    if (!isAddress(token)) {
        throw new Error("token_address must be a valid address")
    }

    return token
}

const parseRewardAmount = () => {
    if (process.argv.length < 5) {
        throw new Error("reward_amount is required [chain_id, token_address, reward_amount, block_number?]")
    }

    try {
        const amount = BigInt(process.argv[4])

        if (amount > 0n) {
            return amount
        }

        throw new Error()
    } catch (e: any) {
        throw new Error("reward_amount must be parsable as bigint and must be greater than 0")
    }
}

const parseOptionalBlockNumber = () => {
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
    const totalShares = Object.values(snapshot).reduce((acc, current) => acc + current, 0n)

    if (totalShares === 0n) {
        throw new Error("total shares is 0")
    }

    for (const [address, balance] of Object.entries(snapshot)) {
        const rewards = (balance * rewardAmount) / totalShares

        totalRewards += rewards

        if (rewards > 0) {
            rewardMap[address] = (rewardMap[address] ?? 0n) + rewards
        }
    }

    if (totalRewards === 0n) {
        throw new Error("total rewards is 0")
    }

    const list: DistributionItem[] = []

    const tree = StandardMerkleTree.of(Object.entries(rewardMap), ["address", "uint256"])

    for (const [i, [address, amount]] of tree.entries()) {
        list.push({
            address: address as `0x${string}`,
            balance: snapshot[address] ?? 0n,
            amount: amount,
            proof: tree.getProof(i) as `0x${string}`[],
        });
    }

    return { totalShares, totalRewards, root: tree.root as `0x${string}`, list }
}

const distribute = async () => {
    // parse input.
    const chainId = parseChainId()
    const token = parseTokenAddress()
    const rewardAmount = parseRewardAmount()
    const blockNumber = await getValidBlockNumber(parseOptionalBlockNumber())

    // ensure theres no more recent distribution for this token on this chain.
    const lastDistribution = await database.distributions.getLast(chainId, token)

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
    const rewardMap = await database.distributions.getLastRewardMap(chainId, token)

    // compute the distribution merkle tree
    const { totalShares, totalRewards, root, list } = await getDistributionTree(snapshot, rewardMap, rewardAmount)

    // save the distribution merkle tree.
    database.distributions.save({ chainId, token, blockNumber, totalShares, totalRewards, root, list })

    // output the distribution pending data.
    await outputDistributionPendingData(chainId, token)
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
