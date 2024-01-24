import { Snapshot } from "./types"
import { transferEvents } from "./lib/events"
import { getHolderInfo } from "./lib/blockchain"
import { getSnapshotAt, writeSnapshot, disconnect } from "./lib/storage"
import { snapshotToHolderMap } from "./lib/utils"
import { initBlock } from "../config"

const compare = async (blockNumber: bigint, snapshot: Snapshot) => {
    const snapshot1: Snapshot = []
    const snapshot2: Snapshot = []
    const seen: Record<string, boolean> = {}

    const holderMap = snapshotToHolderMap(snapshot)

    const events = transferEvents(initBlock, blockNumber)

    for await (const event of events) {
        const [addr1, addr2] = event.args

        for (const address of [addr1, addr2]) {
            if (!seen[address]) {
                seen[address] = true
                const { balance, isContract, isBlacklisted } = await getHolderInfo(blockNumber, address)
                if (balance > 0) {
                    const holderInfo = holderMap[address]

                    if (holderInfo.balance !== balance) {
                        throw new Error(`invalid snapshot balance ${address} ${balance} ${holderInfo.balance}`)
                    }

                    if (holderInfo.isContract !== isContract) {
                        throw new Error(`invalid snapshot isContract ${address} ${isContract} ${holderInfo.isContract}`)
                    }

                    if (holderInfo.isBlacklisted !== isBlacklisted) {
                        throw new Error(`invalid snapshot isBlacklisted ${address} ${isBlacklisted} ${holderInfo.isBlacklisted}`)
                    }

                    snapshot1.push({
                        blockNumber,
                        address,
                        balance: balance,
                        isContract,
                        isBlacklisted,
                    })

                    snapshot2.push({
                        blockNumber,
                        address,
                        balance: holderInfo.balance,
                        isContract: holderInfo.isContract,
                        isBlacklisted: holderInfo.isBlacklisted,
                    })
                }
            }
        }
    }

    if (snapshot1.length !== Object.keys(holderMap).length) {
        throw new Error("invalid snapshot length")
    }

    writeSnapshot(`./data/snapshot-${blockNumber}-1.json`, snapshot1)
    writeSnapshot(`./data/snapshot-${blockNumber}-2.json`, snapshot2)
}

const verify = async () => {
    if (process.argv.length < 3) {
        throw new Error("block number is required")
    }

    const blockNumber = BigInt(process.argv[2])

    const snapshot = await getSnapshotAt(blockNumber)

    if (snapshot.length === 0) {
        throw new Error(`no data for snapshot at block ${blockNumber}`)
    }

    await compare(blockNumber, snapshot)
}

verify()
    .then(async () => {
        await disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await disconnect()
        process.exit(1)
    })
