import { database } from "./database"
import { distributor } from "./blockchain"
import { SupportedChainId } from "../types"

export const outputDistributionPendingData = async (chainId: SupportedChainId, token: `0x${string}`) => {
    // get current root.
    const currentRoot = await distributor.root(chainId, token)

    // get all the distributions.
    const distributions = await database.distributions.all(chainId, token)

    // nothing to update when no distribution.
    if (distributions.length === 0) {
        throw new Error(`no distribution for ${chainId}, ${token}`)
    }

    // get the block number of the distribution with the current root.
    const currentDistribution = distributions.find(d => d.root === currentRoot)

    const blockNumber = currentDistribution === undefined ? 0n : currentDistribution.blockNumber

    // get all distributions after this block number.
    const pendingDistributions = distributions.filter(d => d.blockNumber > blockNumber)

    if (pendingDistributions.length === 0) {
        console.log(`contract is up to date`)
    } else {
        // get the total amount of rewards to send.
        const total = pendingDistributions.map(d => d.totalRewards).reduce((t, c) => t + c, 0n)

        // order by most recent block number.
        const root = pendingDistributions.sort((a, b) => Number(b.blockNumber - a.blockNumber)).shift()!.root

        // log it to console.
        console.log(`updateRoot(\n${token}\n${total}\n${root}\n)`)
    }
}

export const outputWhitelistData = async (chainId: SupportedChainId, launchpad: `0x${string}`) => {
    const whitelist = await database.whitelists.get(chainId, launchpad)

    if (whitelist === null) {
        throw new Error(`no whitelist for launchpad ${launchpad}`)
    }

    // log it to console.
    console.log(`updateWhitelist(\n${whitelist.blockNumber}\n${whitelist.minBalance}\n${whitelist.root}\n)`)
}
