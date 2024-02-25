import { mainnet, arbitrum } from "viem/chains"
import { PublicClient, createPublicClient, erc20Abi, http } from "viem"
import { SupportedChainId } from "../types"

export const TaopadAddress = "0x5483DC6abDA5F094865120B2D251b5744fc2ECB5" as `0x${string}`
export const UniswapLpAddress = "0xcd8804fE8a25325f4EC56e1D5Fb5e3b93ECb9e6E" as `0x${string}`
export const DistributorAddress = "0xcc79E3C699572f3b90cB3b13E48F5237FeabDD3F" as `0x${string}`

const TaopadContract = {
    address: TaopadAddress,
    abi: [
        {
            "inputs": [],
            "name": "operator",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
    ] as const,
}

const DistributorContract = {
    address: DistributorAddress,
    abi: [
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "name": "roots",
            "outputs": [
                {
                    "internalType": "bytes32",
                    "name": "",
                    "type": "bytes32"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ] as const,
}

export const chains = [mainnet, arbitrum]

const publicClients: Record<SupportedChainId, PublicClient> = {
    [mainnet.id]: createPublicClient({ chain: mainnet, transport: http() }),
    [arbitrum.id]: createPublicClient({ chain: arbitrum, transport: http() }),
}

const getOperator = async () => {
    return await publicClients[mainnet.id].readContract({
        ...TaopadContract,
        functionName: "operator",
    })
}

export const taopad = {
    operator: getOperator,
}

const getRoot = async (chainId: SupportedChainId, token: `0x${string}`) => {
    return await publicClients[chainId].readContract({
        ...DistributorContract,
        functionName: "roots",
        args: [token],
    })
}

export const distributor = {
    root: getRoot,
}

const getBlockchainName = (chainId: SupportedChainId) => {
    return chains.find(chain => chain.id === chainId)!.name
}

const getLastFinalizedBlockNumber = async () => {
    return (await publicClients[mainnet.id].getBlock({ blockTag: "finalized" })).number
}

const getBlockTimestamp = async (blockNumber: bigint) => {
    return (await publicClients[mainnet.id].getBlock({ blockNumber })).timestamp
}

const getTokenInfo = async (chainId: SupportedChainId, token: `0x${string}`) => {
    const [name, symbol, decimals] = await publicClients[chainId].multicall({
        allowFailure: false,
        contracts: [
            {
                abi: erc20Abi,
                address: token,
                functionName: "name",
            },
            {
                abi: erc20Abi,
                address: token,
                functionName: "symbol",
            },
            {
                abi: erc20Abi,
                address: token,
                functionName: "decimals",
            },
        ]
    })

    return { name, symbol, decimals }
}

export const blockchain = {
    tokenInfo: getTokenInfo,
    blockchainName: getBlockchainName,
    blockTimestamp: getBlockTimestamp,
    lastBlockNumber: getLastFinalizedBlockNumber,
}
