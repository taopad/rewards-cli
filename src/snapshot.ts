import { Snapshot } from "./types"
import { transferEvents } from "./lib/events"
import { getCurrentBlockNumber, getNewHolderInfo } from "./lib/blockchain"
import { getLastSnapshotBlockNumber, getSnapshotAt, saveSnapshot, disconnect } from "./lib/storage"
import { snapshotToHolderMap, holderMapToSnapshot } from "./lib/utils"

const getIncrementedHolderMap = async (fromBlock: bigint, toBlock: bigint, snapshot: Snapshot): Promise<Snapshot> => {
    const holderMap = snapshotToHolderMap(snapshot)

    const events = transferEvents(fromBlock, toBlock)

    for await (const event of events) {
        const [addr1, addr2, value] = event.args

        if (!holderMap[addr1]) holderMap[addr1] = await getNewHolderInfo(toBlock, addr1)
        if (!holderMap[addr2]) holderMap[addr2] = await getNewHolderInfo(toBlock, addr2)

        // order matters because some events have the same from and to addresses.
        holderMap[addr2].balance = holderMap[addr2].balance + value

        const newHolder1BalanceOf = holderMap[addr1].balance - value

        holderMap[addr1].balance = newHolder1BalanceOf > 0n ? newHolder1BalanceOf : 0n
    }

    return holderMapToSnapshot(toBlock, holderMap)
}

const snapshot = async () => {
    const blockLimit = process.argv.length > 2 ? BigInt(process.argv[2]) : 0n

    const lastBlock = await getLastSnapshotBlockNumber()

    const fromBlock = lastBlock + 1n
    const toBlock = blockLimit === 0n ? await getCurrentBlockNumber() : lastBlock + blockLimit

    const prevSnapshot = await getSnapshotAt(lastBlock)

    const nextSnapshot = await getIncrementedHolderMap(fromBlock, toBlock, prevSnapshot)

    saveSnapshot(nextSnapshot)
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
