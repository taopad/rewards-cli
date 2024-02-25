import { isAddress } from "viem"

import { database } from "./lib/database"
import { isSupportedChainId } from "./types"
import { outputWhitelistData } from "./lib/view"

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
        throw new Error("launchpad_address is required [launchpad_address, min_balance, block_number?]")
    }

    const launchpad = process.argv[3]

    if (!isAddress(launchpad)) {
        throw new Error("launchpad_address must be a valid address")
    }

    return launchpad
}

const whitelistData = async () => {
    // parse input.
    const chainId = parseChainId()
    const launchpad = parseLaunchpad()

    // output the whitelist data.
    await outputWhitelistData(chainId, launchpad)
}

whitelistData()
    .then(async () => {
        await database.disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await database.disconnect()
        process.exit(1)
    })
