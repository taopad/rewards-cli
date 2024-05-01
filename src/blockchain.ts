import { mainnet, arbitrum } from "viem/chains"
import { PublicClient, createPublicClient, erc20Abi, http } from "viem"

export const TaopadAddress = "0x5483DC6abDA5F094865120B2D251b5744fc2ECB5" as `0x${string}`
export const UniswapLpAddress = "0xcd8804fE8a25325f4EC56e1D5Fb5e3b93ECb9e6E" as `0x${string}`
export const DistributorAddress = "0xcc79E3C699572f3b90cB3b13E48F5237FeabDD3F" as `0x${string}`

const TaopadAbi = [
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
] as const

const DistributorAbi = [
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
] as const

const LaunchpadAbi = [
    {
        "inputs": [],
        "name": "name",
        "outputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "token",
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
] as const

const chains = [mainnet, arbitrum]

type SupportedChainId = typeof chains[number]["id"]

const publicClients: Record<SupportedChainId, PublicClient> = {
    [mainnet.id]: createPublicClient({ chain: mainnet, transport: http() }),
    [arbitrum.id]: createPublicClient({ chain: arbitrum, transport: http() }),
}

function isSupportedChainId(chainId: number): chainId is SupportedChainId {
    return chains.find(c => c.id === chainId) !== undefined
}

const getPublicClient = (chainId: number): PublicClient => {
    if (isSupportedChainId(chainId)) {
        return publicClients[chainId]
    }

    throw new Error(`Chain id ${chainId} is not supported`)
}

export const getBlockchain = (chainId: number) => {
    if (isSupportedChainId(chainId)) {
        return chains.find(chain => chain.id === chainId)!
    }

    throw new Error(`Chain id ${chainId} is not supported`)
}

export const getLastFinalizedBlock = async () => {
    return await publicClients[mainnet.id].getBlock({ blockTag: "finalized" })
}

export const getOperator = async () => {
    return await publicClients[mainnet.id].readContract({
        abi: TaopadAbi,
        address: TaopadAddress,
        functionName: "operator",
    })
}

export const getBlockInfo = async (blockNumber: bigint) => {
    return await publicClients[mainnet.id].getBlock({ blockNumber })
}

export const getTokenInfo = async (chainId: number, token: `0x${string}`) => {
    const publicClient = getPublicClient(chainId)

    try {
        const [name, symbol, decimals] = await publicClient.multicall({
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

    catch (e) {
        throw new Error(`specified token (chain: ${chainId}, address: ${token}) does not seem to be an ERC20 contract.`)
    }
}

export const getLaunchpadInfo = async (chainId: number, launchpad: `0x${string}`) => {
    const publicClient = getPublicClient(chainId)

    try {
        const [name, token] = await publicClient.multicall({
            allowFailure: false,
            contracts: [
                {
                    abi: LaunchpadAbi,
                    address: launchpad,
                    functionName: "name",
                },
                {
                    abi: LaunchpadAbi,
                    address: launchpad,
                    functionName: "token",
                },
            ]
        })

        return { name, token }
    }

    catch (e) {
        throw new Error(`specified launchpad (chain: ${chainId}, address: ${launchpad}) does not seem to be a launchpad contract.`)
    }
}

export const getRoot = async (chainId: number, token: `0x${string}`) => {
    const publicClient = getPublicClient(chainId)

    return await publicClient.readContract({
        abi: DistributorAbi,
        address: DistributorAddress,
        functionName: "roots",
        args: [token],
    })
}
