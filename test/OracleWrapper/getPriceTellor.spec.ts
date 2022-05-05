import { ethers } from "hardhat"
import chai from "chai"
import chaiAsPromised from "chai-as-promised"
import {
    // ChainlinkOracleWrapper__factory,
    TellorOracleWrapper__factory,
    // ChainlinkOracleWrapper,
    TellorOracleWrapper,
    // TestChainlinkOracle__factory,
    UsingTellor__factory,
    // TestChainlinkOracle,
    UsingTellor,
} from "../../types"
const {
    abi,
    bytecode,
} = require("usingtellor/artifacts/contracts/TellorPlayground.sol/TellorPlayground.json")
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
const h = require("usingtellor/test/helpers/helpers.js")

chai.use(chaiAsPromised)
const { expect } = chai

describe("OracleWrapper - getPrice", () => {
    let oracleWrapper: TellorOracleWrapper
    let testOracle: UsingTellor
    let testOracle2: UsingTellor
    let signers: SignerWithAddress[]

    let queryDataArgs: string
    let queryData: string
    let queryId: string
    let valueEncoded: string
    let abiCoder = new ethers.utils.AbiCoder()

    let tellorOracle: any
    let tellorOracleWrapper: any

    beforeEach(async () => {
        signers = await ethers.getSigners()

        // Deploy the tellor oracle contract
        const TellorOracle = await ethers.getContractFactory(abi, bytecode)
        tellorOracle = await TellorOracle.deploy()
        await tellorOracle.deployed()

        const TellorOracleWrapper = await ethers.getContractFactory(
            "TellorOracleWrapper"
        )
        tellorOracleWrapper = await TellorOracleWrapper.deploy(
            tellorOracle.address,
            signers[0].address,
            1
        )
        await tellorOracleWrapper.deployed()

        const tellorOracleFactory = (await ethers.getContractFactory(
            "UsingTellor",
            signers[0]
        )) as UsingTellor__factory
        await tellorOracleFactory.deploy(tellorOracle.address)

        // // Deploy the sample oracle
        const oracleFactory = (await ethers.getContractFactory(
            "UsingTellor",
            signers[0]
        )) as UsingTellor__factory
        testOracle = await oracleFactory.deploy(tellorOracle.address)
        testOracle2 = await oracleFactory.deploy(tellorOracle.address)
    })
    it("should return the current price for the requested market", async () => {
        queryDataArgs = abiCoder.encode(["uint256"], ["1"])
        queryData = abiCoder.encode(
            ["string", "bytes"],
            ["TracerFinance", queryDataArgs]
        )
        queryId = ethers.utils.keccak256(queryData)

        valueEncoded = abiCoder.encode(["uint256"], [99])

        await tellorOracle.submitValue(queryId, valueEncoded, 0, queryData)

        await h.advanceTime(10000)
        expect((await tellorOracleWrapper.getPrice()).toNumber()).to.equal(99)
    })
})
