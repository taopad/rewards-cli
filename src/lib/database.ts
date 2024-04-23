import { PrismaClient } from "@prisma/client"

import { Whitelist } from "../types"
import { SupportedChainId, RewardMap, Distribution } from "../types"

const prisma = new PrismaClient()

// =============================================================================
// distribution management.
// =============================================================================

const getDistributions = async (chainId: SupportedChainId, token: `0x${string}`): Promise<Distribution[]> => {
    const results = await prisma.distributions.findMany({
        where: {
            chain_id: chainId,
            token: { equals: token, mode: "insensitive" },
        },
    })

    return results.map(item => ({
        chainId: item.chain_id as SupportedChainId,
        token: item.token as `0x${string}`,
        blockNumber: item.block_number,
        totalShares: BigInt(item.total_shares),
        totalRewards: BigInt(item.total_rewards),
        root: item.root as `0x${string}`,
        list: [],
    }))
}

const getLastDistributionBlockNumber = async (chainId: SupportedChainId, token: `0x${string}`) => {
    const results = await prisma.distributions.aggregate({
        _max: {
            block_number: true
        },
        where: {
            chain_id: chainId,
            token: { equals: token, mode: "insensitive" },
        },
    })

    return results._max.block_number
}

export const getLastDistribution = async (chainId: SupportedChainId, token: `0x${string}`): Promise<Distribution | null> => {
    const blockNumber = await getLastDistributionBlockNumber(chainId, token)

    if (blockNumber == null) {
        return null
    }

    const result = await prisma.distributions.findFirst({
        where: {
            chain_id: chainId,
            token: { equals: token, mode: "insensitive" },
            block_number: blockNumber,
        },
    })

    if (result == null) {
        return null
    }

    return {
        chainId: result.chain_id as SupportedChainId,
        token: result.token as `0x${string}`,
        blockNumber: result.block_number,
        totalShares: BigInt(result.total_shares),
        totalRewards: BigInt(result.total_rewards),
        root: result.root as `0x${string}`,
        list: [],
    }
}

export const getLastRewardMap = async (chainId: SupportedChainId, token: `0x${string}`): Promise<RewardMap> => {
    const rewardMap: RewardMap = {}

    const blockNumber = await getLastDistributionBlockNumber(chainId, token)

    if (blockNumber === null) {
        return rewardMap
    }

    const results = await prisma.distributions_proofs.findMany({
        where: {
            chain_id: chainId,
            token: { equals: token, mode: "insensitive" },
            block_number: blockNumber,
        }
    })

    for (const { address, amount } of results) {
        rewardMap[address.toLowerCase()] = BigInt(amount)
    }

    return rewardMap
}

export const saveDistribution = async (distribution: Distribution) => {
    const { token, chainId, blockNumber, totalShares, totalRewards, root, list } = distribution

    await prisma.$transaction([
        prisma.distributions.create({
            data: {
                chain_id: chainId,
                token: token.toLowerCase(),
                block_number: blockNumber,
                total_shares: totalShares.toString(),
                total_rewards: totalRewards.toString(),
                root,
            }
        }),
        prisma.distributions_proofs.createMany({
            data: list.map(({ address, balance, amount, proof }) => ({
                chain_id: chainId,
                token: token.toLowerCase(),
                block_number: blockNumber,
                address: address.toLowerCase(),
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

const getWhitelist = async (chainId: SupportedChainId, launchpad: `0x${string}`): Promise<Whitelist | null> => {
    const result = await prisma.whitelists.findFirst({
        where: {
            chain_id: chainId,
            launchpad: { equals: launchpad, mode: "insensitive" },
        },
    })

    return result === null ? null : {
        chainId: result.chain_id as SupportedChainId,
        launchpad: result.launchpad as `0x${string}`,
        root: result.root as `0x${string}`,
        blockNumber: result.block_number,
        minBalance: BigInt(result.min_balance),
        list: [],
    }
}

const saveWhitelist = async (whitelist: Whitelist) => {
    const { chainId, launchpad, root, list } = whitelist

    await prisma.$transaction([
        prisma.whitelists.create({
            data: {
                chain_id: chainId,
                launchpad: launchpad.toLowerCase(),
                root,
                block_number: whitelist.blockNumber,
                min_balance: whitelist.minBalance.toString(),
                total_rewards: "0",
            }
        }),
        prisma.whitelists_proofs.createMany({
            data: list.map(({ address, proof, balance }) => ({
                chain_id: chainId,
                launchpad: launchpad.toLowerCase(),
                address: address.toLowerCase(),
                proof,
                balance: balance.toString(),
                rewards: "0",
            }))
        })
    ])
}

// =============================================================================
// export all.
// =============================================================================

export const database = {
    distributions: {
        all: getDistributions,
        getLast: getLastDistribution,
        getLastRewardMap: getLastRewardMap,
        save: saveDistribution,
    },
    whitelists: {
        get: getWhitelist,
        save: saveWhitelist,
    },
    disconnect: async () => prisma.$disconnect(),
}
