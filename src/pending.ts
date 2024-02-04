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

const tryToGetRoot = async (chainId: number, token: `0x${string}`) => {
    try {
        return await getRoot(chainId, token)
    } catch (e: any) {
        return null
    }
}

const pending = async () => {
    // parse input.
    const chainId = parseChainId()
    const token = parseTokenAddress()

    // get current root.
    const root = await tryToGetRoot(chainId, token)

    // get all the distributions.
    const distributions = await getDistributions(chainId, token)

    // nothing to update when no distribution.
    if (distributions.length === 0) {
        throw new Error(`no distribution for ${chainId}, ${token}`)
    }

    // get the block number of the distribution with the current root.
    const current = distributions.filter(d => d.root === root).shift()

    const blockNumber = current === undefined ? 0n : current.blockNumber

    // get all distributions after this block number.
    const pending = distributions.filter(d => d.blockNumber > blockNumber)

    // get the total amount of rewards to send.
    const total = pending.map(d => d.totalRewards).reduce((t, c) => t + c)

    // order by most recent block number.
    const sorted = pending.sort((a, b) => Number(b.blockNumber - a.blockNumber))

    // log it to admin.
    console.log(`updateRoot(${token}, ${total}, ${sorted[0].root})`)
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
