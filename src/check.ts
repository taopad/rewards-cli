import { PrismaClient } from "@prisma/client"
import { StandardMerkleTree } from "@openzeppelin/merkle-tree"
import { disconnect } from "./lib/storage"

const prisma = new PrismaClient()

const getDistributions = async () => {
    return await prisma.distributions.findMany({
        select: {
            chain_id: true,
            token: true,
            block_number: true,
            root: true,
        },
    })
}

const getLastDistributionBlockNumber = async (chainId: number, token: string) => {
    const results = await prisma.distributions.aggregate({
        _max: {
            block_number: true
        },
        where: { chain_id: chainId, token }
    })

    return results._max.block_number ?? 0n
}

const getRewardAmounts = async (chainId: number, token: string) => {
    return await prisma.$queryRaw<{ block_number: bigint, amounts: string[] }[]>`
        SELECT MAX(block_number) AS block_number, ARRAY_AGG(amount ORDER BY block_number ASC) as amounts
        FROM distributions_proofs
        WHERE chain_id = ${chainId} AND token = ${token}
        GROUP BY address`
}

const getDistributionResults = async (chainId: number, token: string, blockNumber: bigint) => {
    return await prisma.distributions_proofs.findMany({
        select: {
            address: true,
            amount: true,
            proof: true,
        },
        where: {
            chain_id: { equals: chainId },
            token: { equals: token },
            block_number: { equals: blockNumber },
        }
    })
}

const getWhitelists = async () => {
    return await prisma.whitelists.findMany({
        select: {
            block_number: true,
            min_amount: true,
            root: true,
        }
    })
}

const getWhitelistResults = async (blockNumber: bigint, amount: bigint) => {
    return await prisma.whitelists_proofs.findMany({
        select: {
            address: true,
            proof: true,
        },
        where: {
            block_number: { equals: blockNumber },
            min_amount: { equals: amount.toString() },
        }
    })
}

const check = async () => {
    // check distributions.
    const distributions = await getDistributions()

    if (distributions.length === 0) {
        console.log("no distribution to check")
    }

    for (const { chain_id, token, block_number, root } of distributions) {
        const rewards = await getRewardAmounts(chain_id, token)
        const blockNumber = await getLastDistributionBlockNumber(chain_id, token)

        if (rewards.length === 0) {
            console.log("no rewards to check")
        }

        for (const reward of rewards) {
            console.log(reward.block_number, reward.amounts)

            if (reward.block_number != blockNumber) {
                throw new Error()
            }

            let lastAmount = 0n

            for (const amount of reward.amounts) {
                if (BigInt(amount) < lastAmount) {
                    throw new Error()
                }

                lastAmount = BigInt(amount)
            }
        }

        const results = await getDistributionResults(chain_id, token, block_number)

        if (results.length === 0) {
            console.log("no distribution result to check")
        }

        for (const { address, amount, proof } of results) {
            const verified = StandardMerkleTree.verify(root, ["address", "uint256"], [address, amount], proof);

            console.log(verified, address, amount, root, proof)

            if (!verified) throw new Error()
        }
    }

    // check whitelist.
    const whitelists = await getWhitelists()

    if (whitelists.length === 0) {
        console.log("no whitelist to check")
    }

    for (const { block_number, min_amount, root } of whitelists) {
        const results = await getWhitelistResults(block_number, BigInt(min_amount))

        if (results.length === 0) {
            console.log("no whitelist result to check")
        }

        for (const { address, proof } of results) {
            const verified = StandardMerkleTree.verify(root, ["address"], [address], proof);

            console.log(verified, address, root, proof)

            if (!verified) throw new Error()
        }
    }
}

check()
    .then(async () => {
        await disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await disconnect()
        process.exit(1)
    })
