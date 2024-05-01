import "dotenv/config"
import { Client, fetchExchange, gql } from "@urql/core"

import { Snapshot } from "./types"
import { getOperator } from "./blockchain"
import { TaopadAddress, UniswapLpAddress, DistributorAddress } from "./blockchain"

if (process.env.SUBGRAPH_URL === undefined) {
    throw new Error("SUBGRAPH_URL must be defined")
}

type GetHolders = {
    holders: HolderSubgraphItem[]
}

type HolderSubgraphItem = {
    id: string
    address: string
    balance: string
    isBlacklisted: boolean
}

const client = new Client({
    url: process.env.SUBGRAPH_URL,
    exchanges: [fetchExchange],
})

const allQuery = gql(`
    query GetHolders ($blockNumber: Int!, $first: Int!, $skip: Int!) {
        holders(
            block: { number: $blockNumber },
            where: { balance_gt: "0", isBlacklisted: false },
            orderBy: address,
            orderDirection: asc,
            first: $first,
            skip: $skip
        ) {
            id
            address
            balance
            isBlacklisted
        }
    }
`)

const minBalanceQuery = gql(`
    query GetHolders ($blockNumber: Int!, $minBalance: String!, $first: Int!, $skip: Int!) {
        holders(
            block: { number: $blockNumber },
            where: { balance_gte: $minBalance, isBlacklisted: false },
            orderBy: address,
            orderDirection: asc,
            first: $first,
            skip: $skip
        ) {
            id
            address
            balance
            isBlacklisted
        }
    }
`)

// produce the excluded addresses. Taopad itself, LP, distributor and current operator.
const getIsExcluded = async () => {
    const operator = await getOperator()

    const excluded = [TaopadAddress, UniswapLpAddress, DistributorAddress, operator]
        .map(address => address.toLowerCase())

    return (address: string) => excluded.includes(address.toLowerCase() as `0x${string}`)
}

const queryHolderSubgraph = async (blockNumber: bigint, minBalance: bigint, first: number, skip: number) => {
    const query = minBalance === 0n ? allQuery : minBalanceQuery

    const results = await client.query<GetHolders>(query, {
        blockNumber: Number(blockNumber),
        minBalance: minBalance.toString(),
        first: first,
        skip: skip,
    })

    if (results.data === undefined) {
        throw new Error("snapshot query error")
    }

    return results.data.holders
}

export const getSnapshot = async (blockNumber: bigint, minBalance: bigint): Promise<Snapshot> => {
    const first = 1000
    const snapshot: Snapshot = {}
    const isExcluded = await getIsExcluded()

    for (let skip = 0; skip <= 20 * first; skip += first) {
        const results = await queryHolderSubgraph(blockNumber, minBalance, first, skip)

        for (const { address, balance } of results) {
            if (!isExcluded(address)) {
                snapshot[address.toLowerCase()] = BigInt(balance)
            }
        }

        if (results.length < first) {
            return snapshot
        }
    }

    return {}
}
