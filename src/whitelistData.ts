import { isAddress } from "viem"

import { database } from "./lib/database"
import { outputWhitelistData } from "./lib/view"

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

const whitelistData = async () => {
    // parse input.
    const launchpad = parseLaunchpad()

    // output the whitelist data.
    await outputWhitelistData(launchpad)
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
