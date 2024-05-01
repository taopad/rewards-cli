import { ProofMap } from "../types"

export type ProofLineDb = {
    address: string
    shares: string
    amount: string
    proof: string[]
}

export const parseProofMap = (lines: ProofLineDb[]): ProofMap => {
    const proofMap: ProofMap = {}

    for (const line of lines) {
        const key = line.address.toLowerCase()

        proofMap[key] = {
            shares: BigInt(line.shares),
            amount: BigInt(line.amount),
            proof: line.proof as `0x${string}`[]
        }
    }

    return proofMap
}
