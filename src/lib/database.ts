import { PrismaClient } from "@prisma/client"

import { Whitelist } from "../types"
import { RewardMap, Distribution } from "../types"

const prisma = new PrismaClient()

// =============================================================================
// distribution management.
// =============================================================================

const getLastDistributionBlockNumber = async (chainId: number, token: `0x${string}`) => {
    const results = await prisma.distributions.aggregate({
        _max: {
            block_number: true
        },
        where: { chain_id: chainId, token }
    })

    return results._max.block_number
}

export const getLastDistribution = async (chainId: number, token: `0x${string}`): Promise<Distribution | null> => {
    const blockNumber = await getLastDistributionBlockNumber(chainId, token)

    if (blockNumber == null) {
        return null
    }

    const result = await prisma.distributions.findFirst({
        where: {
            chain_id: chainId,
            token: token,
            block_number: blockNumber,
        },
    })

    if (result == null) {
        return null
    }

    return {
        chainId: result.chain_id,
        token: result.token,
        blockNumber: result.block_number,
        totalShares: BigInt(result.total_shares),
        totalRewards: BigInt(result.total_rewards),
        root: result.root,
        list: [],
    }
}

export const getLastRewardMap = async (chainId: number, token: `0x${string}`): Promise<RewardMap> => {
    const rewardMap: RewardMap = {}

    const blockNumber = await getLastDistributionBlockNumber(chainId, token)

    if (blockNumber === null) {
        return rewardMap
    }

    const results = await prisma.distributions_proofs.findMany({
        where: {
            chain_id: chainId,
            block_number: blockNumber,
            token,
        }
    })

    for (const { address, amount } of results) {
        rewardMap[address] = BigInt(amount)
    }

    return rewardMap
}

export const saveDistribution = async (distribution: Distribution) => {
    const { token, chainId, blockNumber, totalShares, totalRewards, root, list } = distribution

    await prisma.$transaction([
        prisma.distributions.create({
            data: {
                token,
                chain_id: chainId,
                block_number: blockNumber,
                total_shares: totalShares.toString(),
                total_rewards: totalRewards.toString(),
                root,
            }
        }),
        prisma.distributions_proofs.createMany({
            data: distribution.list.map(({ address, balance, amount, proof }) => ({
                token,
                chain_id: chainId,
                block_number: blockNumber,
                address,
                balance: balance.toString(),
                amount: amount.toString(),
                proof,
            }))
        })
    ])
}

// =============================================================================
// whitelist management.
// =============================================================================

const getWhitelist = async (launchpad: `0x${string}`): Promise<Whitelist | null> => {
    const result = await prisma.whitelists.findFirst({
        where: { launchpad },
        include: { whitelists_proofs: true }
    })

    return result === null ? null : {
        launchpad: result.launchpad,
        root: result.root,
        list: result.whitelists_proofs
    }
}

const saveWhitelist = async (whitelist: Whitelist) => {
    const { launchpad, root, list } = whitelist

    await prisma.$transaction([
        prisma.whitelists.create({
            data: { launchpad, root }
        }),
        prisma.whitelists_proofs.createMany({
            data: list.map(({ address, proof }) => ({ launchpad, address, proof }))
        })
    ])
}

// =============================================================================
// export all.
// =============================================================================

export const database = {
    distribution: {
        getLast: getLastDistribution,
        getLastRewardMap: getLastRewardMap,
        save: saveDistribution,
    },
    whitelist: {
        get: getWhitelist,
        save: saveWhitelist,
    },
    disconnect: async () => prisma.$disconnect(),
}
