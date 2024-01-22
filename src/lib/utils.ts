import { Snapshot, HolderMap } from "../types"

export const snapshotToHolderMap = (snapshot: Snapshot): HolderMap => {
    const holderMap: HolderMap = {}

    for (const line of snapshot) {
        holderMap[line.address] = { ...line }
    }

    return holderMap
}

export const holderMapToSnapshot = (blockNumber: bigint, holderMap: HolderMap): Snapshot => {
    const snapshot: Snapshot = []

    for (const address in holderMap) {
        const holderInfo = holderMap[address]

        if (holderInfo.balance > 0) {
            snapshot.push({ ...holderInfo, blockNumber, address })
        }
    }

    return snapshot
}
