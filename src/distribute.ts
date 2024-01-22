import { StandardMerkleTree } from "@openzeppelin/merkle-tree"

import { RewardMap, Snapshot, Distribution, Proof } from "./types"
import { getLastSnapshotBlockNumber, getSnapshotAt } from "./lib/storage"
import { getLastRewardMap, saveDistribution, disconnect } from "./lib/storage"

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

const distribute = async () => {
    // must pull this from ags
    const chainId = 1
    const token = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" // usdc
    const rewardAmount = 10000000000n // 10000

    const rewardMap = await getLastRewardMap(chainId, token)

    const blockNumber = await getLastSnapshotBlockNumber()

    const snapshot = await getSnapshotAt(blockNumber)

    const distribution = await getDistribution(rewardAmount, rewardMap, snapshot)

    saveDistribution(chainId, token, blockNumber, distribution)

    console.log(chainId, token, blockNumber, distribution)
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
