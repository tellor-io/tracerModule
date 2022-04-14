//SPDX-License-Identifier: CC-BY-NC-ND-4.0
pragma solidity 0.8.7;

import "../interfaces/IOracleWrapper.sol";
import "usingtellor/contracts/UsingTellor.sol";

/// @title The oracle management contract for Tellor oracles
contract TellorOracleWrapper is IOracleWrapper, UsingTellor {
    // #### Globals
    /**
     * @notice The address of the Tellor oracle contract
     */
    address public override oracle;
    address public immutable override deployer;
    uint8 private constant MAX_DECIMALS = 18;
    int256 public scaler;
    bytes32 public queryId;

    // #### Functions
    constructor(
        address payable _oracle,
        address _deployer,
        uint256 _poolId
    ) UsingTellor(_oracle) {
        require(_oracle != address(0), "Oracle cannot be null");
        require(_deployer != address(0), "Deployer cannot be null");
        oracle = _oracle;
        deployer = _deployer;
        //Tellor query id
        bytes memory _b = abi.encode("TracerFinance", abi.encode(_poolId));
        queryId = keccak256(_b);
        // reset the scaler for consistency
        uint8 _decimals = IOracleWrapper(oracle).decimals();
        require(_decimals <= MAX_DECIMALS, "COA: too many decimals");
        // scaler is always <= 10^18 and >= 1 so this cast is safe
        unchecked {
            scaler = int256(10**(MAX_DECIMALS - _decimals));
        }
    }

    function decimals() external pure override returns (uint8) {
        return MAX_DECIMALS;
    }

    /**
     * @notice Returns the oracle price in WAD format
     */
    function getPrice() external view override returns (int256) {
        (int256 _price, ) = _readPriceBefore(queryId, block.timestamp - 5 minutes);
        return _price;
    }

    /**
     * @return _price The latest price
     * @return _data The metadata. Implementations can choose what data to return here. This implementation returns the timestamp
     */
    function getPriceAndMetadata() external view override returns (int256, bytes memory) {
        (int256 _price, uint256 _timestampReceived) = _readPriceBefore(queryId, block.timestamp - 5 minutes);
        bytes memory _data = abi.encodePacked(_timestampReceived);
        return (_price, _data);
    }

    /**
     * @dev An internal function that gets the WAD value price and latest timestamp
     */
    function _readPriceBefore(bytes32 _queryId, uint256 _timestamp) internal view returns (int256, uint256) {
        (bool _didGet, bytes memory _value, uint256 _timestampReceived) = getDataBefore(_queryId, _timestamp);
        require(_didGet, "could not get current value");
        require(_value.length == 32, "value is not 32 bytes");
        int256 _price = abi.decode(_value, (int256));
        return (toWad(_price), _timestampReceived);
    }

    /**
     * @notice Converts a raw value to a WAD value based on the decimals in the feed
     * @dev This allows consistency for oracles used throughout the protocol
     *      and allows oracles to have their decimals changed without affecting
     *      the market itself
     */
    function toWad(int256 raw) internal view returns (int256) {
        return raw * scaler;
    }

    /**
     * @notice Converts from a WAD value to a raw value based on the decimals in the feed
     */
    function fromWad(int256 wad) external view override returns (int256) {
        return wad / scaler;
    }

    function poll() external pure override returns (int256) {
        return 0;
    }
}
