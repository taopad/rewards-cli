import fs from "fs"
import { PrismaClient } from "@prisma/client"

import { initBlock } from "../../config"
import { Snapshot } from "../types"
import { Whitelist, WhitelistResult } from "../types"
import { RewardMap, Distribution, DistributionResult } from "../types"

const prisma = new PrismaClient()

const replacer = (_: any, v: any) => typeof v === 'bigint' ? v.toString() : v

const stringify = (object: Object) => JSON.stringify(object, replacer, "  ")

export const writeSnapshot = (outFile: string, snapshot: Snapshot) => {
    fs.writeFileSync(outFile, stringify(snapshot));
}

// =============================================================================
// snapshot data.
// =============================================================================

type SnapshotLineDb = {
    block_number: bigint
    address: string
    balance: string
    is_contract: boolean
    is_blacklisted: boolean
}

type SnapshotDb = SnapshotLineDb[]

const parseSnapshot = (snapshot: SnapshotDb): Snapshot => {
    return snapshot.map(line => ({
        blockNumber: line.block_number,
        address: line.address,
        balance: BigInt(line.balance),
        isContract: line.is_contract,
        isBlacklisted: line.is_blacklisted,
    }))
}

const formatSnapshot = (snapshot: Snapshot): SnapshotDb => {
    return snapshot.map(line => ({
        block_number: line.blockNumber,
        address: line.address,
        balance: line.balance.toString(),
        is_contract: line.isContract,
        is_blacklisted: line.isBlacklisted,
    }))
}

export const getLastSnapshotBlockNumber = async () => {
    const results = await prisma.snapshots.aggregate({
        _max: {
            block_number: true
        }
    })

    const max = results._max.block_number

    return max === null ? initBlock - 1n : max
}

export const getSnapshotAt = async (blockNumber: bigint): Promise<Snapshot> => {
    const results = await prisma.snapshots.findMany({
        where: {
            block_number: blockNumber
        }
    })

    return parseSnapshot(results)
}

export const saveSnapshot = async (snapshot: Snapshot) => {
    await prisma.snapshots.createMany({
        data: formatSnapshot(snapshot)
    })
}

// =============================================================================
// distributions data.
// =============================================================================

type DistributionLineDb = {
    chain_id: number
    token: string
    block_number: bigint
    total_shares: string
    total_rewards: string
    root: string
}

type DistributionDb = DistributionLineDb[]

const parseDistributions = (distributions: DistributionDb): Distribution[] => {
    return distributions.map(line => ({
        chainId: line.chain_id,
        token: line.token,
        blockNumber: line.block_number,
        totalShares: BigInt(line.total_shares),
        totalRewards: BigInt(line.total_rewards),
        root: line.root,
    }))
}

export const getDistributions = async (chainId: number, token: `0x${string}`): Promise<Distribution[]> => {
    const results = await prisma.distributions.findMany({
        where: {
            chain_id: chainId,
            token: token,
        },
    })

    return parseDistributions(results)
}

export const saveDistribution = async (
    chainId: number,
    token: `0x${string}`,
    blockNumber: bigint,
    distribution: DistributionResult
) => {
    await prisma.$transaction([
        prisma.distributions.create({
            data: {
                token,
                chain_id: chainId,
                block_number: blockNumber,
                total_shares: distribution.totalShares.toString(),
                total_rewards: distribution.totalRewards.toString(),
                root: distribution.root,
            }
        }),
        prisma.distributions_proofs.createMany({
            data: distribution.proofs.map(proof => ({
                token,
                chain_id: chainId,
                block_number: blockNumber,
                address: proof[0],
                amount: proof[1].toString(),
                proofs: proof[2],
            }))
        })
    ])
}

const getLastDistributionBlockNumber = async (chainId: number, token: `0x${string}`) => {
    const results = await prisma.distributions.aggregate({
        _max: {
            block_number: true
        },
        where: { chain_id: chainId, token }
    })

    return results._max.block_number
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

// =============================================================================
// whitelist data.
// =============================================================================

export const getWhitelist = async (blockNumber: bigint, minAmount: bigint): Promise<Whitelist | null> => {
    const result = await prisma.whitelists.findFirst({
        where: {
            block_number: blockNumber,
            min_amount: minAmount.toString(),
        }
    })

    return result === null ? null : {
        blockNumber: result.block_number,
        minAmount: BigInt(result.min_amount),
        root: result.root,
    }
}

export const saveWhitelist = async (
    blockNumber: bigint,
    minAmount: bigint,
    whitelist: WhitelistResult
) => {
    await prisma.$transaction([
        prisma.whitelists.create({
            data: {
                block_number: blockNumber,
                min_amount: minAmount.toString(),
                root: whitelist.root,
            }
        }),
        prisma.whitelists_proofs.createMany({
            data: whitelist.proofs.map(proof => ({
                block_number: blockNumber,
                min_amount: minAmount.toString(),
                address: proof[0],
                balance: proof[1].toString(),
                proofs: proof[2],
            }))
        })
    ])
}

export const disconnect = async () => prisma.$disconnect()
