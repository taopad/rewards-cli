import { isAddress } from "viem"
import { StandardMerkleTree } from "@openzeppelin/merkle-tree"

import { chainIds, selectChain } from "../config"
import { RewardMap, Snapshot, Distribution, Proof } from "./types"
import { getDistributionAt, getLastSnapshotBlockNumber, getSnapshotAt } from "./lib/storage"
import { getLastRewardMap, saveDistribution, disconnect } from "./lib/storage"
import { formatAmount } from "./lib/blockchain"

const shareFilter = (share: { isContract: boolean, isBlacklisted: boolean }) => !share.isContract && !share.isBlacklisted

const shareMapper = (share: { balance: bigint }) => share.balance

const shareReducer = (acc: bigint, current: bigint) => acc + current

const getDistribution = async (rewardAmount: bigint, rewardMap: RewardMap, snapshot: Snapshot): Promise<Distribution> => {
    const shares = snapshot.filter(shareFilter)

    const totalShares = shares.map(shareMapper).reduce(shareReducer)

    let totalRewards = 0n

    for (const { address, balance } of shares) {
        const rewards = (balance * rewardAmount) / totalShares

        totalRewards += rewards

        if (rewards > 0) {
            rewardMap[address] = (rewardMap[address] ?? 0n) + rewards
        }
    }

    const tree = StandardMerkleTree.of(Object.entries(rewardMap), ["address", "uint256"])

    const proofs: Proof[] = []

    for (const [i, v] of tree.entries()) {
        proofs.push([...v, tree.getProof(i)]);
    }

    return { totalShares, totalRewards, root: tree.root, proofs }
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

const distribute = async () => {
    // 10000 USDC on ethereum
    // 1 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 10000

    // parse input.
    const chainId = parseChainId()
    const token = parseTokenAddress()
    const rewardAmount = await formatAmount(chainId, token, parseRewardAmount())

    // get last snapshot block number.
    const blockNumber = await getLastSnapshotBlockNumber()

    // ensure theres a snapshot for this block.
    const snapshot = await getSnapshotAt(blockNumber)

    if (snapshot.length === 0) {
        throw new Error(`no snapshot for block ${blockNumber}`)
    }

    // ensure no distribution exists for this block.
    const hasDistribution = (await getDistributionAt(blockNumber)) !== null

    if (hasDistribution) {
        throw new Error(`distribution already exists for block ${blockNumber}`)
    }

    // compute and save the distribution.
    const rewardMap = await getLastRewardMap(chainId, token)

    const distribution = await getDistribution(rewardAmount, rewardMap, snapshot)

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
