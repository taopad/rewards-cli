import fs from "fs"
import { PrismaClient } from "@prisma/client"

import { initBlock } from "../../config"
import { Snapshot, RewardMap, Distribution } from "../types"

type SnapshotLineDb = {
    block_number: bigint
    address: string
    balance: string
    is_contract: boolean
    is_blacklisted: boolean
}

type SnapshotDb = SnapshotLineDb[]

const prisma = new PrismaClient()

const replacer = (_: any, v: any) => typeof v === 'bigint' ? v.toString() : v

const stringify = (object: Object) => JSON.stringify(object, replacer, "  ")

export const writeSnapshot = (outFile: string, snapshot: Snapshot) => {
    fs.writeFileSync(outFile, stringify(snapshot));
}

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

    const results = await prisma.proofs.findMany({
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

export const getDistributionAt = async (blockNumber: bigint) => {
    return await prisma.distributions.findFirst({
        where: {
            block_number: blockNumber
        }
    })
}

export const saveDistribution = async (
    chainId: number,
    token: `0x${string}`,
    blockNumber: bigint,
    distribution: Distribution
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
        prisma.proofs.createMany({
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

export const disconnect = async () => prisma.$disconnect()
