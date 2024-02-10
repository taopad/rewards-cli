import { StandardMerkleTree } from "@openzeppelin/merkle-tree"

import { getIsExcluded } from "../config"
import { Snapshot, WhitelistResult, WhitelistItem } from "./types"
import { getLastSnapshotBlockNumber, getSnapshotAt } from "./lib/storage"
import { getWhitelist, saveWhitelist, disconnect } from "./lib/storage"
import { snapshotToHolderMap } from "./lib/utils"

const getWhitelistResult = async (minAmount: bigint, snapshot: Snapshot): Promise<WhitelistResult> => {
    const holderMap = snapshotToHolderMap(snapshot)

    const addresses: [string][] = []
    const isExcluded = await getIsExcluded()

    for (const address in holderMap) {
        const holder = holderMap[address]

        if (!isExcluded(address) && !holder.isBlacklisted && holder.balance >= minAmount) {
            addresses.push([address])
        }
    }

    const tree = StandardMerkleTree.of(addresses, ["address"])

    const list: WhitelistItem[] = []

    for (const [i, [address]] of tree.entries()) {
        list.push({
            address: address,
            balance: holderMap[address].balance,
            proof: tree.getProof(i),
        });
    }

    return { root: tree.root, list }
}

const parseMinAmount = (): bigint => {
    if (process.argv.length < 3) {
        throw new Error("min_amount is required [min_amount, block_number?]")
    }

    try {
        return BigInt(process.argv[2])
    } catch (e: any) {
        throw new Error("min_amount must be parsable as bigint")
    }
}

const parseOptionalBlockNumber = (): bigint | undefined => {
    if (process.argv.length < 4) {
        return undefined
    }

    try {
        return BigInt(process.argv[3])
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

const whitelist = async () => {
    // parse input.
    const minAmount = parseMinAmount()
    const blockNumber = await getBlockNumber(parseOptionalBlockNumber())

    // ensure theres a snapshot for this block number.
    const snapshot = await getSnapshotAt(blockNumber)

    if (snapshot.length === 0) {
        throw new Error(`no snapshot for block ${blockNumber}`)
    }

    // ensure theres no whitelist at this block and min amount.
    if (await getWhitelist(blockNumber, minAmount) !== null) {
        throw new Error(`whitelist already exists at block ${blockNumber} for ${minAmount}`)
    }

    const whitelist = await getWhitelistResult(minAmount, snapshot)

    saveWhitelist(blockNumber, minAmount, whitelist)

    console.log(`${blockNumber}, ${minAmount}, ${whitelist.root}`)
}

whitelist()
    .then(async () => {
        await disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await disconnect()
        process.exit(1)
    })
