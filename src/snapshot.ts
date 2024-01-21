import { HolderMap } from "./types"
import { transferEvents } from "./lib/events"
import { getCurrentBlockNumber, getNewHolderInfo } from "./lib/blockchain"
import { getLastBlockNumber, getHolderMapAt, saveSnapshot, disconnect } from "./lib/storage"

const getIncrementedHolderMap = async (fromBlock: bigint, toBlock: bigint, holderMap: HolderMap): Promise<HolderMap> => {
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
    const blockLimit = process.argv.length > 2 ? BigInt(process.argv[2]) : 0n

    const fromBlock = await getLastBlockNumber()
    const toBlock = blockLimit === 0n ? await getCurrentBlockNumber() : fromBlock + blockLimit

    const prevHolderMap = await getHolderMapAt(fromBlock)

    const newHolderMap = await getIncrementedHolderMap(fromBlock + 1n, toBlock, prevHolderMap)

    saveSnapshot(toBlock, newHolderMap)
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
