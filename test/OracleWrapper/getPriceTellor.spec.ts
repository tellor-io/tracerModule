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
    UsingTellor
} from "../../types"
const {
    abi,
    bytecode,
  } = require("usingtellor/artifacts/contracts/TellorPlayground.sol/TellorPlayground.json");
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

chai.use(chaiAsPromised)
const { expect } = chai

describe("OracleWrapper - getPrice", () => {
    let oracleWrapper: TellorOracleWrapper
    let testOracle: UsingTellor
    let testOracle2: UsingTellor
    let signers: SignerWithAddress[]
    beforeEach(async () => {
        // Deploy the contract
        signers = await ethers.getSigners()
        const tellorOracleFactory = (await ethers.getContractFactory(
            "UsingTellor",
            signers[0]
        )) as UsingTellor__factory
        const tellorOracle = await tellorOracleFactory.deploy("0x0000000000000000000000000000000000000000")

        // Deploy tokens
        const oracleWrapperFactory = (await ethers.getContractFactory(
            "TellorOracleWrapper",
            signers[0]
        )) as TellorOracleWrapper__factory
        oracleWrapper = await oracleWrapperFactory.deploy(
            tellorOracle.address,
            signers[0].address,
            1
        )
        await oracleWrapper.deployed()

        // Deploy the sample oracle
        const oracleFactory = (await ethers.getContractFactory(
            "UsingTellor",
            signers[0]
        )) as UsingTellor__factory
        testOracle = await oracleFactory.deploy("0x0")
        testOracle2 = await oracleFactory.deploy("0x0")
    })
    it("should return the current price for the requested market", async () => {
        expect((await oracleWrapper.getPrice()).gte(0)).to.eq(true)
    })
})
