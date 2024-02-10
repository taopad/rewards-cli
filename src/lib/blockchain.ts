import { HolderInfo } from "../types"
import { publicClient, publicClientFactory } from "../../config"
import { TaopadContract, DistributorContract } from "../../config"

export const getCurrentBlockNumber = async () => {
    return await publicClient.getBlockNumber()
}

const getIsContract = async (address: `0x${string}`) => {
    const bytecode = await publicClient.getBytecode({ address })

    return bytecode !== undefined
}

const getIsBlacklisted = async (blockNumber: bigint, address: `0x${string}`) => {
    return await publicClient.readContract({
        blockNumber,
        ...TaopadContract,
        functionName: "isBlacklisted",
        args: [address],
    })
}

export const getNewHolderInfo = async (blockNumber: bigint, address: `0x${string}`): Promise<HolderInfo> => {
    const isContract = await getIsContract(address)
    const isBlacklisted = await getIsBlacklisted(blockNumber, address)

    return { balance: 0n, isContract, isBlacklisted }
}

export const getHolderInfo = async (blockNumber: bigint, address: `0x${string}`): Promise<HolderInfo> => {
    const isContract = await getIsContract(address)

    const [balance, isBlacklisted] = await publicClient.multicall({
        blockNumber,
        allowFailure: false,
        contracts: [
            {
                ...TaopadContract,
                functionName: "balanceOf",
                args: [address],
            },
            {
                ...TaopadContract,
                functionName: "isBlacklisted",
                args: [address],
            },
        ],
    })

    return { balance, isContract, isBlacklisted }
}

export const getRoot = async (chainId: number, token: `0x${string}`): Promise<string> => {
    const publicClient = publicClientFactory(chainId)

    return await publicClient.readContract({
        ...DistributorContract,
        functionName: "roots",
        args: [token],
    })
}
