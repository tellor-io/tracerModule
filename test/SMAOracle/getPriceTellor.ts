import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { expect } from "chai"
import { BigNumberish, Contract } from "ethers"
import { ethers } from "hardhat"
import {
    SMAOracle,
    // TesttellorOracle,
    UsingTellor,
    // TesttellorOracle__factory,
    UsingTellor__factory,
    SMAOracle__factory,
    // tellorOracleWrapper__factory,
    TellorOracleWrapper__factory,
    TellorOracleWrapper,
} from "../../types"
const {
    abi,
    bytecode,
} = require("usingtellor/artifacts/contracts/TellorPlayground.sol/TellorPlayground.json")
const h = require("usingtellor/test/helpers/helpers.js")

describe("SMAOracle - getPrice", () => {
    let owner: SignerWithAddress
    let user1: SignerWithAddress
    let user2: SignerWithAddress
    let smaOracle: SMAOracle
    let tellorOracle: any
    let tellorOracleWrapper: any
    const numPeriods: BigNumberish = 10
    const updateInterval: BigNumberish = 60

    let queryDataArgs: string
    let queryData: string
    let queryId: string
    let valueEncoded: string

    let abiCoder = new ethers.utils.AbiCoder()

    beforeEach(async () => {
        ;[owner, user1, user2] = await ethers.getSigners()

        // Deploy the tellor oracle contract
        const TellorOracle = await ethers.getContractFactory(abi, bytecode)
        tellorOracle = await TellorOracle.deploy()
        await tellorOracle.deployed()

        const TellorOracleWrapper = await ethers.getContractFactory(
            "TellorOracleWrapper"
        )
        tellorOracleWrapper = await TellorOracleWrapper.deploy(
            tellorOracle.address,
            owner.address,
            1
        )
        await tellorOracleWrapper.deployed()

        const SMAOracleFactory = (await ethers.getContractFactory(
            "SMAOracle"
        )) as SMAOracle__factory
        smaOracle = await SMAOracleFactory.deploy(
            tellorOracleWrapper.address,
            numPeriods,
            updateInterval,
            owner.address
        )
        await smaOracle.deployed()

        queryDataArgs = abiCoder.encode(["uint256"], ["1"])
        queryData = abiCoder.encode(
            ["string", "bytes"],
            ["TracerFinance", queryDataArgs]
        )
        queryId = ethers.utils.keccak256(queryData)
    })

    it("should return zero before the first poll", async () => {
        const price = await smaOracle.getPrice()
        expect(price).to.eq(0)
    })

    it("should return the spot price after the first poll", async () => {
        const unitPrice: BigNumberish = 2
        const tellorDecimals = 18
        const price = ethers.utils.parseUnits(
            unitPrice.toString(),
            tellorDecimals
        )
        valueEncoded = abiCoder.encode(["uint256"], [price])

        await tellorOracle.submitValue(queryId, valueEncoded, 0, queryData)

        await h.advanceTime(10000)

        await smaOracle.poll()
        const result = await smaOracle.getPrice()
        expect(result).to.equal(
            ethers.utils.parseUnits(unitPrice.toString(), 18)
        )
    })

    it("should return the correct price with 2 entries", async () => {
        const unitPrices: BigNumberish[] = [2, 3]
        const tellorDecimals = await tellorOracle.decimals()
        let count = 0
        for (const unitPrice of unitPrices) {
            const price = ethers.utils.parseUnits(
                unitPrice.toString(),
                tellorDecimals
            )
            valueEncoded = abiCoder.encode(["uint256"], [price])

            await tellorOracle.submitValue(
                queryId,
                valueEncoded,
                count,
                queryData
            )
            await h.advanceTime(10000)
            count++

            await smaOracle.poll()
        }

        const result = await smaOracle.getPrice()
        const expectedUnitPrice = 2.5
        const expectedPrice = ethers.utils.parseUnits(
            expectedUnitPrice.toString(),
            18
        )
        expect(result).to.equal(expectedPrice)
    })

    it("should return the correct price once fully ramped up", async () => {
        const unitPrices: BigNumberish[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] // 10 periods
        const tellorDecimals = await tellorOracle.decimals()
        let count = 0
        for (const unitPrice of unitPrices) {
            const price = ethers.utils.parseUnits(
                unitPrice.toString(),
                tellorDecimals
            )
            valueEncoded = abiCoder.encode(["uint256"], [price])

            await tellorOracle.submitValue(
                queryId,
                valueEncoded,
                count,
                queryData
            )
            await h.advanceTime(10000)
            count++
            await smaOracle.poll()
        }
        const result = await smaOracle.getPrice()
        const expectedUnitPrice = 5.5
        const expectedPrice = ethers.utils.parseUnits(
            expectedUnitPrice.toString(),
            18
        )
        expect(result).to.equal(expectedPrice)
    })

    it("should return the correct price after a price is rolled off", async () => {
        const unitPrices: BigNumberish[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] // More than 10 periods

        const tellorDecimals = await tellorOracle.decimals()
        let count = 0
        for (const unitPrice of unitPrices) {
            const price = ethers.utils.parseUnits(
                unitPrice.toString(),
                tellorDecimals
            )
            valueEncoded = abiCoder.encode(["uint256"], [price])

            await tellorOracle.submitValue(
                queryId,
                valueEncoded,
                count,
                queryData
            )
            await h.advanceTime(10000)
            count++

            await smaOracle.poll()
        }
        const result = await smaOracle.getPrice()
        const expectedUnitPrice = 6.5
        const expectedPrice = ethers.utils.parseUnits(
            expectedUnitPrice.toString(),
            18
        )
        expect(result).to.equal(expectedPrice)
    })

    it("should return the correct price after it has doubled the numPeriods", async () => {
        const unitPrices: BigNumberish[] = [
            1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
            20, 21, 22, 23, 24,
        ]

        const tellorDecimals = await tellorOracle.decimals()
        let count = 0
        for (const unitPrice of unitPrices) {
            const price = ethers.utils.parseUnits(
                unitPrice.toString(),
                tellorDecimals
            )
            valueEncoded = abiCoder.encode(["uint256"], [price])

            await tellorOracle.submitValue(
                queryId,
                valueEncoded,
                count,
                queryData
            )
            await h.advanceTime(10000)
            count++
            await smaOracle.poll()
        }
        const result = await smaOracle.getPrice()
        const expectedUnitPrice = 19.5
        const expectedPrice = ethers.utils.parseUnits(
            expectedUnitPrice.toString(),
            18
        )
        expect(result).to.equal(expectedPrice)
    })

    it("should return the correct price with 25 prices", async () => {
        const unitPrices: BigNumberish[] = [
            1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
            20, 21, 22, 23, 24, 25,
        ]
        let count = 0
        const tellorDecimals = await tellorOracle.decimals()
        for (const unitPrice of unitPrices) {
            const price = ethers.utils.parseUnits(
                unitPrice.toString(),
                tellorDecimals
            )
            valueEncoded = abiCoder.encode(["uint256"], [price])

            await tellorOracle.submitValue(
                queryId,
                valueEncoded,
                count,
                queryData
            )
            await h.advanceTime(10000)
            count++
            await smaOracle.poll()
        }
        const result = await smaOracle.getPrice()
        const expectedUnitPrice = 20.5
        const expectedPrice = ethers.utils.parseUnits(
            expectedUnitPrice.toString(),
            18
        )
        expect(result).to.equal(expectedPrice)
    })
})
