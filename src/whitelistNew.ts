import yesno from "yesno"
import { isAddress, formatUnits } from "viem"
import { StandardMerkleTree } from "@openzeppelin/merkle-tree"

import { graphql } from "./lib/graphql"
import { database } from "./lib/database"
import { blockchain } from "./lib/blockchain"
import { outputWhitelistData } from "./lib/view"
import { SupportedChainId, Snapshot, WhitelistItem, isSupportedChainId } from "./types"

type WhitelistTreeResult = {
    totalRewards: bigint
    root: `0x${string}`
    list: WhitelistItem[]
}

const parseChainId = () => {
    if (process.argv.length < 3) {
        throw new Error("chain id is required [chain_id, launchpad_address, total_allocations, block_number?]")
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
        throw new Error("launchpad_address is required [chain_id, launchpad_address, total_allocations, block_number?]")
    }

    const launchpad = process.argv[3]

    if (!isAddress(launchpad)) {
        throw new Error("launchpad_address must be a valid address")
    }

    return launchpad
}

const parseTotalAllocations = () => {
    if (process.argv.length < 5) {
        throw new Error("total_allocations is required [chain_id, launchpad_address, total_allocations, block_number?]")
    }

    try {
        return BigInt(process.argv[4])
    } catch (e: any) {
        throw new Error("total_allocations must be parsable as bigint")
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

const confirmParameters = async (chainId: SupportedChainId, launchpad: `0x${string}`, totalAllocations: bigint, blockNumber: bigint) => {
    const timestamp = Number(await blockchain.blockTimestamp(blockNumber) * 1000n)
    const blockchainName = blockchain.blockchainName(chainId)

    try {
        const launchpadInfo = await blockchain.launchpadInfo(chainId, launchpad)
        const tokenInfo = await blockchain.tokenInfo(chainId, launchpadInfo.token)

        console.log(`Chain: ${blockchainName}`)
        console.log(`Launchpad: ${launchpadInfo.name} (${launchpad})`)
        console.log(`Token: ${tokenInfo.name} (${launchpadInfo.token})`)
        console.log(`Total allocations: ${formatUnits(totalAllocations, tokenInfo.decimals)} \$${tokenInfo.symbol}`)
        console.log(`Block number: ${blockNumber} (${(new Date(timestamp)).toUTCString()})`)
    } catch (e) {
        throw new Error(`address ${launchpad} on ${blockchainName} does not seem to be a launchpad contract address`)
    }

    const ok = await yesno({ question: 'Are you sure you want to continue?' })

    if (!ok) {
        throw new Error("terminated by user")
    }
}

const roundFloor = (value: bigint, decimals: number) => {
    const unit = 10n ** BigInt(decimals)

    return (value / unit) * unit
}

const getWhitelistTree = async (snapshot: Snapshot, totalAllocations: bigint, decimals: number): Promise<WhitelistTreeResult> => {
    let totalRewards = 0n
    const totalShares = Object.values(snapshot).reduce((acc, current) => acc + current, 0n)

    const allocations: Record<string, bigint> = {}

    for (const [address, balance] of Object.entries(snapshot)) {
        const allocation = roundFloor((balance * totalAllocations) / totalShares, decimals)

        totalRewards += allocation

        if (allocation > 0) {
            allocations[address] = allocation
        }
    }

    const list: WhitelistItem[] = []
    const tree = StandardMerkleTree.of(Object.entries(allocations), ["address", "uint256"])

    for (const [i, [address, allocation]] of tree.entries()) {
        list.push({
            address: address as `0x${string}`,
            proof: tree.getProof(i) as `0x${string}`[],
            balance: snapshot[address],
            rewards: allocation,
        })
    }

    return { totalRewards, root: tree.root as `0x${string}`, list }
}

const whitelistNew = async () => {
    // parse input.
    const chainId = parseChainId()
    const launchpad = parseLaunchpad()
    const totalAllocations = parseTotalAllocations()
    const blockNumber = await getValidBlockNumber(parseOptionalBlockNumber())
    const minBalance = 0n

    // confirm the distribution.
    await confirmParameters(chainId, launchpad, totalAllocations, blockNumber)

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

    // get token decimals.
    const { token } = await blockchain.launchpadInfo(chainId, launchpad)
    const { decimals } = await blockchain.tokenInfo(chainId, token)

    // compute the whitelist markle tree.
    const { totalRewards, root, list } = await getWhitelistTree(snapshot, totalAllocations, decimals)

    // save the whitelist merkle tree.
    await database.whitelists.save({ chainId, launchpad, root, blockNumber, minBalance, totalRewards, list })

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
