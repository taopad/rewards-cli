import "dotenv/config"

import { createPublicClient, http } from "viem"
import { mainnet, arbitrum } from "viem/chains"

import TaopadAbi from "../abi/Taopad"
import DistributorAbi from "../abi/Distributor"

if (!process.env.RPC_URL) throw new Error("RPC_URL env var must be defined")
if (!process.env.BATCH_SIZE) throw new Error("BATCH_SIZE env var must be defined")

const TaopadAddress = "0x5483DC6abDA5F094865120B2D251b5744fc2ECB5" as `0x${string}`
const UniswapLpAddress = "0xcd8804fE8a25325f4EC56e1D5Fb5e3b93ECb9e6E" as `0x${string}`
const DistributorAddress = "0xcc79E3C699572f3b90cB3b13E48F5237FeabDD3F" as `0x${string}`

// block where taopad was deployed
export const initBlock = 18786171n

export const batchSize = BigInt(process.env.BATCH_SIZE as string)

export const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(process.env.RPC_URL as string)
})

// taopad contract.
export const TaopadContract = {
    abi: TaopadAbi,
    address: TaopadAddress,
}

// distributor contract.
export const DistributorContract = {
    abi: DistributorAbi,
    address: DistributorAddress,
}

// distribution are allowed only on those chains.
const chains = [mainnet, arbitrum]

const selectChain = (chainId: number) => chains.filter(c => c.id === chainId).shift()

export const publicClientFactory = (chainId: number) => {
    if (chainId === 1) {
        return publicClient
    }

    const chain = selectChain(chainId)

    if (chain === undefined) {
        throw new Error("invalid chain id")
    }

    return createPublicClient({ chain, transport: http() })
}

// produce the excluded addresses. Taopad itself, LP, distributor and current operator.
const getOperator = async (): Promise<`0x${string}`> => {
    return await publicClient.readContract({
        ...TaopadContract,
        functionName: "operator",
    })
}

export const getIsExcluded = async () => {
    const operator = await getOperator()

    const excluded = [TaopadAddress, UniswapLpAddress, DistributorAddress, operator]

    return (address: string) => excluded.includes(address as `0x${string}`)
}
