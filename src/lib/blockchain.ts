import { HolderInfo } from "../types"
import { publicClient, TaopadContract } from "../../config"

export const getCurrentBlockNumber = async () => {
    return await publicClient.getBlockNumber()
}

export const getIsContract = async (address: `0x${string}`) => {
    const bytecode = await publicClient.getBytecode({ address })

    return bytecode !== undefined
}

export const getIsBlacklisted = async (blockNumber: bigint, address: `0x${string}`) => {
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
