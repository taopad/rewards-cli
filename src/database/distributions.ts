import { prisma } from "../db"
import { Distribution } from "../types"
import { ProofLineDb, parseProofMap } from "./proofMap"

type DistributionDb = {
    chain_id: number
    token: string
    block_number: bigint
    snapshots: number
    interval: number
    total_shares: string
    total_rewards: string
    root: string
    distributions_proofs: ProofLineDb[]
}

const parseDistribution = (line: DistributionDb): Distribution => ({
    chainId: line.chain_id,
    token: line.token as `0x${string}`,
    blockNumber: line.block_number,
    snapshots: line.snapshots,
    interval: line.interval,
    totalShares: BigInt(line.total_shares),
    totalRewards: BigInt(line.total_rewards),
    root: line.root as `0x${string}`,
    proofs: parseProofMap(line.distributions_proofs),
})

export const fetchDistribution = async (chainId: number, token: `0x${string}`, blockNumber: bigint): Promise<Distribution | null> => {
    const result = await prisma.distributions.findFirst({
        include: { distributions_proofs: true },
        where: {
            chain_id: chainId,
            token: { equals: token, mode: "insensitive" },
            block_number: blockNumber,
        },
    })

    if (result === null) {
        return null
    }

    return parseDistribution(result)
}

export const fetchLastDistribution = async (chainId: number, token: `0x${string}`): Promise<Distribution | null> => {
    const result = await prisma.distributions.aggregate({
        _max: { block_number: true },
        where: {
            chain_id: chainId,
            token: { equals: token, mode: "insensitive" },
        }
    })

    const blockNumber = result._max.block_number

    if (blockNumber === null) {
        return null
    }

    return fetchDistribution(chainId, token, blockNumber)
}

export const saveDistribution = async (distribution: Distribution) => {
    await prisma.$transaction([
        prisma.distributions.create({
            data: {
                chain_id: distribution.chainId,
                token: distribution.token.toLowerCase(),
                block_number: distribution.blockNumber,
                snapshots: distribution.snapshots,
                interval: distribution.interval,
                total_shares: distribution.totalShares.toString(),
                total_rewards: distribution.totalRewards.toString(),
                root: distribution.root,
            },
        }),
        prisma.distributions_proofs.createMany({
            data: Object.entries(distribution.proofs).map(([key, value]) => ({
                chain_id: distribution.chainId,
                token: distribution.token.toLowerCase(),
                block_number: distribution.blockNumber,
                address: key.toLowerCase(),
                shares: value.shares.toString(),
                amount: value.amount.toString(),
                proof: value.proof,
            }))
        })
    ])
}
