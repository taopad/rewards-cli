import { isAddress } from "viem"
import { StandardMerkleTree } from "@openzeppelin/merkle-tree"

import { graphql } from "./lib/graphql"
import { database } from "./lib/database"
import { outputWhitelistData } from "./lib/view"
import { getLastFinalizedBlockNumber } from "./lib/blockchain"
import { Snapshot, WhitelistItem } from "./types"

type WhitelistTreeResult = {
    root: `0x${string}`,
    list: WhitelistItem[]
}

const parseLaunchpad = () => {
    if (process.argv.length < 3) {
        throw new Error("launchpad_address is required [launchpad_address, min_balance, block_number?]")
    }

    const launchpad = process.argv[2]

    if (!isAddress(launchpad)) {
        throw new Error("launchpad_address must be a valid address")
    }

    return launchpad
}

const parseMinBalance = () => {
    if (process.argv.length < 4) {
        throw new Error("min_balance is required [launchpad_address, min_balance, block_number?]")
    }

    try {
        return BigInt(process.argv[3])
    } catch (e: any) {
        throw new Error("min_balance must be parsable as bigint")
    }
}

const parseOptionalBlockNumber = () => {
    if (process.argv.length < 5) {
        return undefined
    }

    try {
        return BigInt(process.argv[4])
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

const getWhitelistTree = async (snapshot: Snapshot): Promise<WhitelistTreeResult> => {
    const list: WhitelistItem[] = []

    const addresses = Object.keys(snapshot)

    const tree = StandardMerkleTree.of(addresses.map(address => [address]), ["address"])

    for (const [i, [address]] of tree.entries()) {
        list.push({
            address: address as `0x${string}`,
            proof: tree.getProof(i) as `0x${string}`[],
        })
    }

    return { root: tree.root as `0x${string}`, list }
}

const whitelist = async () => {
    // parse input.
    const launchpad = parseLaunchpad()
    const minBalance = parseMinBalance()
    const blockNumber = await getValidBlockNumber(parseOptionalBlockNumber())

    // ensure whitelist does not exist.
    const maybeWhitelist = await database.whitelists.get(launchpad)

    if (maybeWhitelist !== null) {
        throw Error(`whitelist already exists for launchpad ${launchpad}`)
    }

    // take the snapshot with the given block and min balance.
    const snapshot = await graphql.snapshot(blockNumber, minBalance)

    // ensure snapshot is not empty.
    if (Object.entries(snapshot).length === 0) {
        throw new Error("empty snapshot")
    }

    // compute the whitelist markle tree.
    const { root, list } = await getWhitelistTree(snapshot)

    // save the whitelist merkle tree.
    database.whitelists.save({ launchpad, root, list })

    // output the whitelist data.
    await outputWhitelistData(launchpad)
}

whitelist()
    .then(async () => {
        await database.disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await database.disconnect()
        process.exit(1)
    })
