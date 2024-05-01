import { prisma } from "../db"
import { Allocation } from "../types"
import { ProofLineDb, parseProofMap } from "./proofMap"

type AllocationDb = {
    chain_id: number
    launchpad: string
    block_number: bigint
    snapshots: number
    interval: number
    total_shares: string
    total_allocations: string
    root: string
    allocations_proofs: ProofLineDb[]
}

const parseAllocation = (line: AllocationDb): Allocation => ({
    chainId: line.chain_id,
    launchpad: line.launchpad as `0x${string}`,
    blockNumber: line.block_number,
    snapshots: line.snapshots,
    interval: line.interval,
    totalShares: BigInt(line.total_shares),
    totalAllocations: BigInt(line.total_allocations),
    root: line.root as `0x${string}`,
    proofs: parseProofMap(line.allocations_proofs),
})

export const fetchAllocation = async (chainId: number, launchpad: `0x${string}`): Promise<Allocation | null> => {
    const result = await prisma.allocations.findFirst({
        include: { allocations_proofs: true },
        where: {
            chain_id: chainId,
            launchpad: { equals: launchpad, mode: "insensitive" },
        },
    })

    if (result === null) {
        return null
    }

    return parseAllocation(result)
}

export const saveAllocation = async (allocation: Allocation) => {
    await prisma.$transaction([
        prisma.allocations.create({
            data: {
                chain_id: allocation.chainId,
                launchpad: allocation.launchpad.toLowerCase(),
                block_number: allocation.blockNumber,
                snapshots: allocation.snapshots,
                interval: allocation.interval,
                total_shares: allocation.totalShares.toString(),
                total_allocations: allocation.totalAllocations.toString(),
                root: allocation.root,
            },
        }),
        prisma.allocations_proofs.createMany({
            data: Object.entries(allocation.proofs).map(([key, value]) => ({
                chain_id: allocation.chainId,
                launchpad: allocation.launchpad.toLowerCase(),
                address: key.toLowerCase(),
                shares: value.shares.toString(),
                amount: value.amount.toString(),
                proof: value.proof,
            }))
        })
    ])
}
