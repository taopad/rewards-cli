import { isAddress } from "viem"

import { database } from "./lib/database"
import { isSupportedChainId } from "./types"
import { outputDistributionPendingData } from "./lib/view"

const parseChainId = () => {
    if (process.argv.length < 3) {
        throw new Error("chain id is required [chain_id, token_address, reward_amount, block_number?]")
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

const parseTokenAddress = () => {
    if (process.argv.length < 4) {
        throw new Error("token address is required [chain_id, token_address, reward_amount, block_number?]")
    }

    const token = process.argv[3]

    if (!isAddress(token)) {
        throw new Error("token_address must be a valid address")
    }

    return token
}

const distributionData = async () => {
    // parse input.
    const chainId = parseChainId()
    const token = parseTokenAddress()

    // output the distribution pending data.
    await outputDistributionPendingData(chainId, token)
}

distributionData()
    .then(async () => {
        await database.disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await database.disconnect()
        process.exit(1)
    })
