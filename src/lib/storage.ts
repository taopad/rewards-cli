import { PrismaClient } from "@prisma/client"

import { Snapshot, HolderMap } from "../types"
import { initBlock } from "../../config/values"

const prisma = new PrismaClient()

const parseHolderMap = (snapshot: Snapshot): HolderMap => {
    const holderMap: HolderMap = {}

    for (const item of snapshot) {
        holderMap[item.address] = {
            balance: BigInt(item.balance),
            isContract: item.is_contract,
            isBlacklisted: item.is_blacklisted,
        }
    }

    return holderMap
}

const formatSnapshot = (blockNumber: bigint, holderMap: HolderMap): Snapshot => {
    const snapshot: Snapshot = []

    for (const address in holderMap) {
        const holderInfo = holderMap[address]

        if (holderInfo.balance > 0) {
            snapshot.push({
                block_number: blockNumber,
                address: address,
                balance: holderInfo.balance.toString(),
                is_contract: holderInfo.isContract,
                is_blacklisted: holderInfo.isBlacklisted,
            })
        }
    }

    return snapshot
}

export const getLastBlockNumber = async () => {
    const result = await prisma.snapshots_v1_block_numbers.aggregate({
        _max: {
            block_number: true
        }
    })

    const max = result._max.block_number

    return max === null ? initBlock - 1n : max
}

export const getHolderMapAt = async (blockNumber: bigint): Promise<HolderMap> => {
    const results = await prisma.snapshots_v1.findMany({
        where: {
            block_number: blockNumber
        }
    })

    return parseHolderMap(results)
}

export const saveSnapshot = async (blockNumber: bigint, holderMap: HolderMap) => {
    await prisma.snapshots_v1.createMany({
        data: formatSnapshot(blockNumber, holderMap)
    })
}

export const disconnect = async () => prisma.$disconnect()
