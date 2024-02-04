import { isAddress } from "viem"
import { StandardMerkleTree } from "@openzeppelin/merkle-tree"

import { chainIds, selectChain } from "../config"
import { Snapshot, RewardMap, Distribution, DistributionResult, RewardItem } from "./types"
import { getLastSnapshotBlockNumber, getSnapshotAt } from "./lib/storage"
import { getLastRewardMap, getLastDistribution, saveDistribution, disconnect } from "./lib/storage"
import { getOperator, getRoot, formatAmount } from "./lib/blockchain"

const shareMapper = (share: { balance: bigint }) => share.balance

const shareReducer = (acc: bigint, current: bigint) => acc + current

const getShareFilter = async () => {
    const operator = await getOperator()

    return (share: { address: string, isContract: boolean, isBlacklisted: boolean }) => {
        return share.address !== operator && !share.isContract && !share.isBlacklisted
    }
}

const getDistributionResult = async (rewardAmount: bigint, rewardMap: RewardMap, snapshot: Snapshot): Promise<DistributionResult> => {
    const shares = snapshot.filter(await getShareFilter())

    const totalShares = shares.map(shareMapper).reduce(shareReducer)

    let totalRewards = 0n
    const balanceMap: Record<string, bigint> = {}

    for (const { address, balance } of shares) {
        const rewards = (balance * rewardAmount) / totalShares

        totalRewards += rewards
        balanceMap[address] = balance

        if (rewards > 0) {
            rewardMap[address] = (rewardMap[address] ?? 0n) + rewards
        }
    }

    const tree = StandardMerkleTree.of(Object.entries(rewardMap), ["address", "uint256"])

    const list: RewardItem[] = []

    for (const [i, [address, amount]] of tree.entries()) {
        list.push({
            address: address,
            balance: balanceMap[address] ?? 0n,
            amount: amount,
            proof: tree.getProof(i),
        });
    }

    return { totalShares, totalRewards, root: tree.root, list }
}

const parseChainId = (): number => {
    if (process.argv.length < 3) {
        throw new Error("chain id is required [chain_id, token_address, reward_amount, block_number?]")
    }

    const chainId = parseInt(process.argv[2])

    if (isNaN(chainId)) {
        throw new Error("chain_id must be parsable as number")
    }

    const chain = selectChain(chainId)

    if (chain === undefined) {
        throw new Error(`chain_id must be one of [${chainIds.join(", ")}]`)
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

const parseRewardAmount = (): number => {
    if (process.argv.length < 5) {
        throw new Error("reward_amount is required [chain_id, token_address, reward_amount, block_number?]")
    }

    const rewardAmount = parseInt(process.argv[4])

    if (isNaN(rewardAmount)) {
        throw new Error("reward_amount must be parsable as number")
    }

    return rewardAmount
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

const getBlockNumber = async (blockNumber: bigint | undefined) => {
    if (blockNumber === undefined) {
        return await getLastSnapshotBlockNumber()
    }

    return blockNumber
}

const distribute = async () => {
    // 10000 USDC on ethereum
    // 1 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 10000

    // parse input.
    const chainId = parseChainId()
    const token = parseTokenAddress()
    const rewardAmount = await formatAmount(chainId, token, parseRewardAmount())
    const blockNumber = await getBlockNumber(parseOptionalBlockNumber())

    // ensure theres a snapshot for this block number.
    const snapshot = await getSnapshotAt(blockNumber)

    if (snapshot.length === 0) {
        throw new Error(`no snapshot for block ${blockNumber}`)
    }

    // ensure theres no more recent distribution for this token on this chain.
    const lastDistribution = await getLastDistribution(chainId, token)

    if (lastDistribution != null && lastDistribution.blockNumber >= blockNumber) {
        throw new Error(`distribution already exists for ${lastDistribution.blockNumber}`)
    }

    // compute and save the distribution.
    const rewardMap = await getLastRewardMap(chainId, token)

    const distribution = await getDistributionResult(rewardAmount, rewardMap, snapshot)

    saveDistribution(chainId, token, blockNumber, distribution)
}

distribute()
    .then(async () => {
        await disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await disconnect()
        process.exit(1)
    })
