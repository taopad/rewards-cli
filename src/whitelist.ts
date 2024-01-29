import { StandardMerkleTree } from "@openzeppelin/merkle-tree"

import { Snapshot, Whitelist, WhitelistResult, WhitelistProof } from "./types"
import { getLastSnapshotBlockNumber, getSnapshotAt } from "./lib/storage"
import { getWhitelists, saveWhitelist, disconnect } from "./lib/storage"
import { snapshotToHolderMap } from "./lib/utils"

const createWhitelist = (minAmount: bigint, snapshot: Snapshot): WhitelistResult => {
    const holderMap = snapshotToHolderMap(snapshot)

    const addresses: [string][] = []

    for (const address in holderMap) {
        const holder = holderMap[address]

        if (!holder.isContract && !holder.isBlacklisted && holder.balance >= minAmount) {
            addresses.push([address])
        }
    }

    const tree = StandardMerkleTree.of(addresses, ["address"])

    const proofs: WhitelistProof[] = []

    for (const [i, [address]] of tree.entries()) {
        proofs.push([address, holderMap[address].balance, tree.getProof(i)]);
    }

    return { root: tree.root, proofs }
}

const parseMinAmount = (): number => {
    if (process.argv.length < 3) {
        throw new Error("min_amount is required [min_amount, block_number?]")
    }

    const rewardAmount = parseInt(process.argv[2])

    if (isNaN(rewardAmount)) {
        throw new Error("min_amount must be parsable as number")
    }

    return rewardAmount
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

const hasWhitelistAt = (blockNumber: bigint, whitelists: Whitelist[]) => {
    return whitelists.filter(w => w.blockNumber === blockNumber).length > 0
}

const whitelist = async () => {
    // parse input.
    const minAmount = BigInt(parseMinAmount()) * 10n ** 18n
    const blockNumber = await getBlockNumber(parseOptionalBlockNumber())

    // ensure theres a snapshot for this block number.
    const snapshot = await getSnapshotAt(blockNumber)

    if (snapshot.length === 0) {
        throw new Error(`no snapshot for block ${blockNumber}`)
    }

    // ensure theres no whitelist at this block.
    const whitelists = await getWhitelists();

    if (hasWhitelistAt(blockNumber, whitelists)) {
        throw new Error(`whitelist already exists at block ${blockNumber}`)
    }

    const whitelist = createWhitelist(minAmount, snapshot)

    saveWhitelist(blockNumber, minAmount, whitelist)

    console.log(`${blockNumber} ${whitelist.root}`)
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
