import { ethers } from "hardhat"
import chai from "chai"
import chaiAsPromised from "chai-as-promised"
import {
    LeveragedPool,
    TestToken,
    ERC20,
    PoolSwapLibrary,
    PoolCommitter,
    PoolKeeper,
} from "../../types"

import {
    DEFAULT_FEE,
    DEFAULT_MAX_COMMIT_QUEUE_LENGTH,
    DEFAULT_MIN_COMMIT_SIZE,
    POOL_CODE,
} from "../constants"
import {
    deployPoolAndTokenContracts,
    getRandomInt,
    generateRandomAddress,
    createCommit,
    CommitEventArgs,
    timeout,
} from "../utilities"

chai.use(chaiAsPromised)
const { expect } = chai

const amountCommitted = "1000"
const amountMinted = ethers.utils.parseEther("10000")
const feeAddress = generateRandomAddress()
const lastPrice = getRandomInt(99999999, 1)
const updateInterval = 3600
const frontRunningInterval = 1 // seconds
const fee = DEFAULT_FEE
const leverage = 1

describe("Uncommit", () => {
    let token: TestToken
    let shortToken: ERC20
    let pool: LeveragedPool
    let library: PoolSwapLibrary
    let poolCommitter: PoolCommitter
    let poolKeeper: PoolKeeper

    describe("In particular orders", () => {
        const commits: CommitEventArgs[] | undefined = []
        beforeEach(async () => {
            const result = await deployPoolAndTokenContracts(
                POOL_CODE,
                frontRunningInterval,
                updateInterval,
                leverage,
                DEFAULT_MIN_COMMIT_SIZE,
                DEFAULT_MAX_COMMIT_QUEUE_LENGTH,
                feeAddress,
                fee
            )
            pool = result.pool
            library = result.library
            token = result.token
            shortToken = result.shortToken
            poolCommitter = result.poolCommitter
            poolKeeper = result.poolKeeper

            await token.approve(pool.address, amountMinted)
        })
        it("Scan down: Should maintain earliest and latest unexecuted commits", async () => {
            let earliestCommitUnexecuted
            let latestCommitUnexecuted
            for (let i = 0; i < 5; i++) {
                await createCommit(poolCommitter, [2], amountCommitted)
            }
            for (let i = 1; i < 4; i++) {
                await poolCommitter.uncommit(i)
            }
            earliestCommitUnexecuted =
                await poolCommitter.earliestCommitUnexecuted()
            latestCommitUnexecuted =
                await poolCommitter.latestCommitUnexecuted()
            expect(earliestCommitUnexecuted).to.equal(0)
            expect(latestCommitUnexecuted).to.equal(4)

            await poolCommitter.uncommit(4)
            earliestCommitUnexecuted =
                await poolCommitter.earliestCommitUnexecuted()
            latestCommitUnexecuted =
                await poolCommitter.latestCommitUnexecuted()
            expect(earliestCommitUnexecuted).to.equal(0)
            expect(latestCommitUnexecuted).to.equal(0)

            await poolCommitter.uncommit(0)
            earliestCommitUnexecuted =
                await poolCommitter.earliestCommitUnexecuted()
            latestCommitUnexecuted =
                await poolCommitter.latestCommitUnexecuted()
            expect(earliestCommitUnexecuted).to.equal(
                await poolCommitter.NO_COMMITS_REMAINING()
            )
            expect(latestCommitUnexecuted).to.equal(0)

            await timeout((updateInterval + 1) * 1000)
            // Shouldn't revert
            await (
                await poolKeeper.performUpkeepSinglePool(pool.address)
            ).wait()
        })

        it("Scan up: Should maintain earliest and latest unexecuted commits", async () => {
            let earliestCommitUnexecuted
            let latestCommitUnexecuted
            earliestCommitUnexecuted =
                await poolCommitter.earliestCommitUnexecuted()
            latestCommitUnexecuted =
                await poolCommitter.latestCommitUnexecuted()
            for (let i = 0; i < 5; i++) {
                await createCommit(poolCommitter, [2], amountCommitted)
            }
            earliestCommitUnexecuted =
                await poolCommitter.earliestCommitUnexecuted()
            latestCommitUnexecuted =
                await poolCommitter.latestCommitUnexecuted()
            for (let i = 1; i < 4; i++) {
                await poolCommitter.uncommit(i)
            }
            earliestCommitUnexecuted =
                await poolCommitter.earliestCommitUnexecuted()
            latestCommitUnexecuted =
                await poolCommitter.latestCommitUnexecuted()
            expect(earliestCommitUnexecuted).to.equal(0)
            expect(latestCommitUnexecuted).to.equal(4)

            await poolCommitter.uncommit(0)
            earliestCommitUnexecuted =
                await poolCommitter.earliestCommitUnexecuted()
            latestCommitUnexecuted =
                await poolCommitter.latestCommitUnexecuted()
            expect(earliestCommitUnexecuted).to.equal(4)
            expect(latestCommitUnexecuted).to.equal(4)

            await poolCommitter.uncommit(4)
            earliestCommitUnexecuted =
                await poolCommitter.earliestCommitUnexecuted()
            latestCommitUnexecuted =
                await poolCommitter.latestCommitUnexecuted()
            expect(earliestCommitUnexecuted).to.equal(
                await poolCommitter.NO_COMMITS_REMAINING()
            )

            await timeout((updateInterval + 1) * 1000)
            // Shouldn't revert
            await (
                await poolKeeper.performUpkeepSinglePool(pool.address)
            ).wait()
        })
    })
})