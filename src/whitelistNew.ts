import yesno from "yesno"
import { isAddress, formatUnits } from "viem"
import { StandardMerkleTree } from "@openzeppelin/merkle-tree"

import { graphql } from "./lib/graphql"
import { database } from "./lib/database"
import { blockchain } from "./lib/blockchain"
import { outputWhitelistData } from "./lib/view"
import { SupportedChainId, Snapshot, WhitelistItem, isSupportedChainId } from "./types"

type WhitelistTreeResult = {
    root: `0x${string}`,
    list: WhitelistItem[]
}

const parseChainId = () => {
    if (process.argv.length < 3) {
        throw new Error("chain id is required [chain_id, launchpad_address, min_balance, block_number?]")
    }

    const chainId = parseInt(process.argv[2])

    if (isNaN(chainId)) {
        throw new Error("chain_id must be parsable as number")
    }

    if (!isSupportedChainId(chainId)) {
        throw new Error(`chain_id ${chainId} is not supported`)
    }

    return chainId
}

const parseLaunchpad = () => {
    if (process.argv.length < 4) {
        throw new Error("launchpad_address is required [chain_id, launchpad_address, min_balance, block_number?]")
    }

    const launchpad = process.argv[3]

    if (!isAddress(launchpad)) {
        throw new Error("launchpad_address must be a valid address")
    }

    return launchpad
}

const parseMinBalance = () => {
    if (process.argv.length < 5) {
        throw new Error("min_balance is required [chain_id, launchpad_address, min_balance, block_number?]")
    }

    try {
        return BigInt(process.argv[4])
    } catch (e: any) {
        throw new Error("min_balance must be parsable as bigint")
    }
}

const parseOptionalBlockNumber = () => {
    if (process.argv.length < 6) {
        return undefined
    }

    try {
        return BigInt(process.argv[5])
    } catch (e: any) {
        throw new Error("block_number must be parsable as bigint")
    }
}

const getValidBlockNumber = async (blockNumber: bigint | undefined) => {
    const lastBlockNumber = await blockchain.lastBlockNumber()

    if (blockNumber === undefined) {
        return lastBlockNumber
    }

    if (blockNumber <= lastBlockNumber) {
        return blockNumber
    }

    throw new Error("block number must be before last finalized block number")
}

const confirmParameters = async (chainId: SupportedChainId, launchpad: `0x${string}`, minBalance: bigint, blockNumber: bigint) => {
    const timestamp = Number(await blockchain.blockTimestamp(blockNumber) * 1000n)
    const blockchainName = blockchain.blockchainName(chainId)

    try {
        const { name } = await blockchain.launchpadInfo(chainId, launchpad)

        console.log(`Chain: ${blockchainName}`)
        console.log(`Launchpad: ${name} (${launchpad})`)
        console.log(`Min balance: ${formatUnits(minBalance, 18)} \$TPAD`)
        console.log(`Block number: ${blockNumber} (${(new Date(timestamp)).toUTCString()})`)
    } catch (e) {
        throw new Error(`address ${launchpad} on ${blockchainName} does not seem to be a launchpad contract address`)
    }

    const ok = await yesno({ question: 'Are you sure you want to continue?' })

    if (!ok) {
        throw new Error("terminated by user")
    }
}

const getWhitelistTree = async (snapshot: Snapshot): Promise<WhitelistTreeResult> => {
    const list: WhitelistItem[] = []

    const addresses = Object.keys(snapshot)

    const tree = StandardMerkleTree.of(addresses.map(address => [address]), ["address"])

    for (const [i, [address]] of tree.entries()) {
        list.push({
            address: address as `0x${string}`,
            proof: tree.getProof(i) as `0x${string}`[],
            balance: snapshot[address] ?? 0n,
        })
    }

    return { root: tree.root as `0x${string}`, list }
}

const whitelistNew = async () => {
    // parse input.
    const chainId = parseChainId()
    const launchpad = parseLaunchpad()
    const minBalance = parseMinBalance()
    const blockNumber = await getValidBlockNumber(parseOptionalBlockNumber())

    // confirm the distribution.
    await confirmParameters(chainId, launchpad, minBalance, blockNumber)

    // ensure whitelist does not exist.
    const maybeWhitelist = await database.whitelists.get(chainId, launchpad)

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
    await database.whitelists.save({ chainId, launchpad, root, blockNumber, minBalance, list })

    // output the whitelist data.
    await outputWhitelistData(chainId, launchpad)
}

whitelistNew()
    .then(async () => {
        await database.disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await database.disconnect()
        process.exit(1)
    })
