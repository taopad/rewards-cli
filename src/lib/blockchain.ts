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

export const getOperator = async (): Promise<string> => {
    return await publicClient.readContract({
        ...TaopadContract,
        functionName: "operator",
    })
}

export const getRoot = async (chainId: number, token: `0x${string}`): Promise<string> => {
    const publicClient = publicClientFactory(chainId)

    return await publicClient.readContract({
        ...DistributorContract,
        functionName: "roots",
        args: [token],
    })
}

export const formatAmount = async (chainId: number, token: `0x${string}`, amount: number): Promise<bigint> => {
    const publicClient = publicClientFactory(chainId)

    const decimals = await publicClient.readContract({
        address: token,
        abi: [
            {
                "inputs": [],
                "name": "decimals",
                "outputs": [
                    {
                        "internalType": "uint8",
                        "name": "",
                        "type": "uint8"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            },
        ] as const,
        functionName: "decimals",
    })

    return BigInt(amount) * (10n ** BigInt(decimals))
}
