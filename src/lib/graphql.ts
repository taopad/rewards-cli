import "dotenv/config"
import { Client, fetchExchange, gql } from "@urql/core"

import { taopad } from "./blockchain"
import { TaopadAddress, UniswapLpAddress, DistributorAddress } from "./blockchain"
import { Snapshot } from "../types"

if (process.env.SUBGRAPH_URL === undefined) {
    throw new Error("SUBGRAPH_URL must be defined")
}

const subgraph = {
    url: process.env.SUBGRAPH_URL
}

// produce the excluded addresses. Taopad itself, LP, distributor and current operator.
const getIsExcluded = async () => {
    const operator = await taopad.operator()

    const excluded = [TaopadAddress, UniswapLpAddress, DistributorAddress, operator]

    return (address: string) => excluded.includes(address as `0x${string}`)
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
    url: subgraph.url,
    exchanges: [fetchExchange],
});

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

const queryHolderSubgraph = async (blockNumber: bigint, minBalance: bigint, first: number, skip: number) => {
    const query = minBalance === 0n ? allQuery : minBalanceQuery

    const results = await client.query<GetHolders>(query, {
        blockNumber: Number(blockNumber),
        minBalance: minBalance.toString(),
        first: first,
        skip: skip,
    })

    if (results.data === undefined) {
        throw new Error("query error")
    }

    return results.data.holders
}

const getSnapshot = async (blockNumber: bigint, minBalance: bigint): Promise<Snapshot> => {
    const first = 1000
    const snapshot: Snapshot = {}
    const isExcluded = await getIsExcluded()

    for (let skip = 0; skip <= 20 * first; skip += first) {
        const results = await queryHolderSubgraph(blockNumber, minBalance, first, skip)

        for (const { address, balance } of results) {
            if (!isExcluded(address)) {
                snapshot[address] = BigInt(balance)
            }
        }

        if (results.length < first) {
            return snapshot
        }
    }

    return {}
}

export const graphql = {
    snapshot: getSnapshot,
}
