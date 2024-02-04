import { isAddress } from "viem"

import { chainIds, selectChain } from "../config"
import { getRoot } from "./lib/blockchain"
import { getDistributions, disconnect } from "./lib/storage"

const parseChainId = (): number => {
    if (process.argv.length < 3) {
        throw new Error("chain id is required [chain_id, token_address, reward_amount, block_number?]")
    }

    const chainId = parseInt(process.argv[2])

    if (isNaN(chainId)) {
        throw new Error("chain_id must be parsable as number")
    }

    const chain = selectChain(chainId)

    if (chain === undefined) {
        throw new Error(`chain_id must be one of [${chainIds.join(", ")}]`)
    }

    return chainId
}

const parseTokenAddress = (): `0x${string}` => {
    if (process.argv.length < 4) {
        throw new Error("token address is required [chain_id, token_address, reward_amount, block_number?]")
    }

    const token = process.argv[3]

    if (!isAddress(token)) {
        throw new Error("token_address must be a valid address")
    }

    return token
}

const pending = async () => {
    // parse input.
    const chainId = parseChainId()
    const token = parseTokenAddress()

    // get current root.
    const root = await getRoot(chainId, token)

    // get all the distributions.
    const distributions = await getDistributions(chainId, token)

    // get pending distributions.
    let found = false
    let lastRoot = ""
    let amount = 0n

    for (const distribution of distributions) {
        lastRoot = distribution.root

        if (found) {
            amount += distribution.totalRewards
        }

        if (distribution.root === root) {
            found = true
        }
    }

    console.log(`updateRoot(${token}, ${amount}, ${root})`)
}

pending()
    .then(async () => {
        await disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await disconnect()
        process.exit(1)
    })
