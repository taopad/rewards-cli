import { publicClient } from "../config/values"
import { TaopadContract } from "../config/contracts"

import { transferEvents } from "./lib/events"
import { HolderInfo, HolderMap } from "./types"

import { saveSnapshot, disconnect } from "./lib/storage"
import { getLastBlockNumber, getHolderMapAt } from "./lib/storage"

const getCurrentBlockNumber = async () => {
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

const getNewHolderInfo = async (blockNumber: bigint, address: `0x${string}`): Promise<HolderInfo> => {
    const isContract = await getIsContract(address)
    const isBlacklisted = await getIsBlacklisted(blockNumber, address)

    return { balance: 0n, isContract, isBlacklisted }
}

const getIncrementedSnapshot = async (fromBlock: bigint, toBlock: bigint, holderMap: HolderMap): Promise<HolderMap> => {
    const events = transferEvents(fromBlock, toBlock)

    for await (const event of events) {
        const [addr1, addr2, value] = event.args

        if (!holderMap[addr1]) holderMap[addr1] = await getNewHolderInfo(toBlock, addr1)
        if (!holderMap[addr2]) holderMap[addr2] = await getNewHolderInfo(toBlock, addr2)

        const newHolder1BalanceOf = holderMap[addr1].balance - value
        const newHolder2BalanceOf = holderMap[addr2].balance + value

        holderMap[addr1].balance = newHolder1BalanceOf > 0n ? newHolder1BalanceOf : 0n
        holderMap[addr2].balance = newHolder2BalanceOf > 0n ? newHolder2BalanceOf : 0n
    }

    return holderMap
}

const snapshot = async () => {
    const fromBlock = await getLastBlockNumber()
    const fromHolderMap = await getHolderMapAt(fromBlock)

    const currentBlockNumber = await getCurrentBlockNumber()

    const newHolderMap = await getIncrementedSnapshot(fromBlock + 1n, currentBlockNumber, fromHolderMap)

    saveSnapshot(currentBlockNumber, newHolderMap)
}

snapshot()
    .then(async () => {
        await disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await disconnect()
        process.exit(1)
    })
