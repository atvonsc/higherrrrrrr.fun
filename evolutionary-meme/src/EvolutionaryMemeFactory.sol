// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./BondingCurve.sol";
import "./interfaces/IDiamondCut.sol";
import "./facets/DiamondCutFacet.sol";
import "./facets/ERC20Facet.sol";
import "./facets/CoreFacet.sol";
import "./facets/MarketFacet.sol";
import "./facets/MemeFacet.sol";
import "./facets/NFTConvictionFacet.sol";
import {LibDiamond} from "./libraries/LibDiamond.sol";
import "./EvolutionaryMeme.sol";

/**
 * @title EvolutionaryMemeFactory
 * @notice Factory for deploying new dynamic meme tokens with upgradeable facets
 */
contract EvolutionaryMemeFactory {
    struct MemeLevel {
        uint256 priceThreshold;
        string memeName;
    }

    // Immutable addresses
    address public immutable implementation;
    address public immutable feeRecipient;
    address public immutable weth;
    address public immutable positionManager;
    address public immutable swapRouter;

    // Facet addresses
    address public immutable diamondCutFacet;
    address public immutable erc20Facet;
    address public immutable coreFacet;
    address public immutable marketFacet;
    address public immutable memeFacet;
    address public immutable nftConvictionFacet;

    // Events
    event MemeTokenDeployed(
        address indexed token,
        address indexed creator,
        string memeType,
        address bondingCurve,
        uint256 timestamp
    );

    event FacetAdded(
        address indexed token,
        address indexed facet,
        bytes4[] selectors
    );

    // Errors
    error InvalidArrayLengths();
    error ZeroAddress();
    error UnknownFacet();
    error DeploymentFailed();
    error InvalidInitialization();
    error FacetCutFailed();

    constructor(
        address _feeRecipient,
        address _weth,
        address _positionManager,
        address _swapRouter
    ) {
        if (_feeRecipient == address(0)) revert ZeroAddress();
        if (_weth == address(0)) revert ZeroAddress();
        if (_positionManager == address(0)) revert ZeroAddress();
        if (_swapRouter == address(0)) revert ZeroAddress();

        feeRecipient = _feeRecipient;
        weth = _weth;
        positionManager = _positionManager;
        swapRouter = _swapRouter;

        // Deploy implementation
        implementation = address(new EvolutionaryMeme(
            _feeRecipient,
            _weth,
            _positionManager,
            _swapRouter
        ));

        // Deploy facets
        diamondCutFacet = address(new DiamondCutFacet());
        erc20Facet = address(new ERC20Facet());
        coreFacet = address(new CoreFacet());
        marketFacet = address(new MarketFacet());
        memeFacet = address(new MemeFacet());
        nftConvictionFacet = address(new NFTConvictionFacet());
    }

    function deployMeme(
        string memory symbol,
        string memory tokenURI,
        string memory memeType,
        uint256[] calldata priceThresholds,
        string[] calldata memeNames
    ) external returns (address memeToken, address bondingCurveAddress) {
        if (priceThresholds.length != memeNames.length) revert InvalidArrayLengths();
        if (priceThresholds.length == 0) revert InvalidArrayLengths();

        // Deploy bonding curve
        bondingCurveAddress = address(new BondingCurve());

        // Create meme levels
        LibDiamond.MemeLevel[] memory memeLevels = new LibDiamond.MemeLevel[](priceThresholds.length);
        for (uint i = 0; i < priceThresholds.length; i++) {
            memeLevels[i] = LibDiamond.MemeLevel({
                priceThreshold: priceThresholds[i],
                memeName: memeNames[i]
            });
        }

        // Deploy proxy
        ERC1967Proxy proxy = new ERC1967Proxy(
            implementation,
            new bytes(0)
        );
        memeToken = address(proxy);

        // Setup facets
        IDiamondCut.FacetCut[] memory cuts = new IDiamondCut.FacetCut[](6);

        // Add Diamond Cut facet first
        cuts[0] = IDiamondCut.FacetCut({
            facetAddress: diamondCutFacet,
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: _getFunctionSelectors(diamondCutFacet)
        });

        cuts[1] = IDiamondCut.FacetCut({
            facetAddress: erc20Facet,
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: _getFunctionSelectors(erc20Facet)
        });

        cuts[2] = IDiamondCut.FacetCut({
            facetAddress: coreFacet,
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: _getFunctionSelectors(coreFacet)
        });

        cuts[3] = IDiamondCut.FacetCut({
            facetAddress: marketFacet,
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: _getFunctionSelectors(marketFacet)
        });

        cuts[4] = IDiamondCut.FacetCut({
            facetAddress: memeFacet,
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: _getFunctionSelectors(memeFacet)
        });

        cuts[5] = IDiamondCut.FacetCut({
            facetAddress: nftConvictionFacet,
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: _getFunctionSelectors(nftConvictionFacet)
        });

        // Initialize
        bytes memory initData = abi.encodeWithSelector(
            CoreFacet.initialize.selector,
            bondingCurveAddress,
            tokenURI,
            memeLevels[0].memeName,
            symbol,
            memeType,
            memeLevels
        );

        try IDiamondCut(memeToken).diamondCut(cuts, coreFacet, initData) {
            // Initialize meme state after core initialization
            MemeFacet(memeToken).initializeMeme(memeType, memeLevels);

            emit MemeTokenDeployed(
                memeToken,
                msg.sender,
                memeType,
                bondingCurveAddress,
                block.timestamp
            );

            return (memeToken, bondingCurveAddress);
        } catch {
            revert DeploymentFailed();
        }
    }

    function _getFunctionSelectors(address facet) internal pure returns (bytes4[] memory selectors) {
        if (facet == address(0)) revert ZeroAddress();

        if (facet == diamondCutFacet) {
            selectors = new bytes4[](1);
            selectors[0] = IDiamondCut.diamondCut.selector;
        }
        else if (facet == erc20Facet) {
            selectors = new bytes4[](9);
            selectors[0] = ERC20Facet.name.selector;
            selectors[1] = ERC20Facet.symbol.selector;
            selectors[2] = ERC20Facet.decimals.selector;
            selectors[3] = ERC20Facet.totalSupply.selector;
            selectors[4] = ERC20Facet.balanceOf.selector;
            selectors[5] = ERC20Facet.allowance.selector;
            selectors[6] = ERC20Facet.approve.selector;
            selectors[7] = ERC20Facet.transfer.selector;
            selectors[8] = ERC20Facet.transferFrom.selector;
        }
        else if (facet == coreFacet) {
            selectors = new bytes4[](6);
            selectors[0] = CoreFacet.initialize.selector;
            selectors[1] = CoreFacet.tokenURI.selector;
            selectors[2] = CoreFacet.marketType.selector;
            selectors[3] = bytes4(keccak256("multicall(bytes[])")); // Optional multicall support
            selectors[4] = bytes4(keccak256("getImplementation()"));
            selectors[5] = bytes4(keccak256("getMarketState()"));
        }
        else if (facet == marketFacet) {
            selectors = new bytes4[](18);
            // Market core functions
            selectors[0] = MarketFacet.buy.selector;
            selectors[1] = MarketFacet.sell.selector;
            selectors[2] = MarketFacet.getMarketInfo.selector;
            // Bonding curve functions
            selectors[3] = MarketFacet.getTokensForEth.selector;
            selectors[4] = MarketFacet.getEthForTokens.selector;
            selectors[5] = MarketFacet.getCurrentPrice.selector;
            selectors[6] = MarketFacet.getCurrentPriceView.selector;
            // Pool functions
            selectors[7] = MarketFacet.initializePool.selector;
            selectors[8] = MarketFacet.graduateMarket.selector;
            selectors[9] = MarketFacet.swapExactInputSingle.selector;
            // Callback functions
            selectors[10] = MarketFacet.uniswapV3SwapCallback.selector;
            selectors[11] = MarketFacet.onERC721Received.selector;
            // Market state functions
            selectors[12] = bytes4(keccak256("getMarketState()"));
            selectors[13] = bytes4(keccak256("getPoolInfo()"));
            selectors[14] = bytes4(keccak256("getBondingCurveState()"));
            // Receive/fallback
            selectors[15] = bytes4(0xd0e30db0); // receive()
            selectors[16] = bytes4(keccak256("fallback()"));
            selectors[17] = bytes4(keccak256("getQuote(uint256)"));
        }
        else if (facet == memeFacet) {
            selectors = new bytes4[](10);
            selectors[0] = MemeFacet.initializeMeme.selector;
            selectors[1] = MemeFacet.updateMeme.selector;
            selectors[2] = MemeFacet.getCurrentPrice.selector;
            selectors[3] = MemeFacet.getMemeLevelsCount.selector;
            selectors[4] = MemeFacet.getAllMemeLevels.selector;
            selectors[5] = MemeFacet.getMemeState.selector;
            selectors[6] = MemeFacet.getCurrentMeme.selector;
            selectors[7] = MemeFacet.getMemeType.selector;
            selectors[8] = MemeFacet.onERC721Received.selector;
            selectors[9] = bytes4(keccak256("name()")); // ERC20 name override
        }
        else if (facet == nftConvictionFacet) {
            selectors = new bytes4[](16);
            // NFT core
            selectors[0] = NFTConvictionFacet.hasConviction.selector;
            selectors[1] = NFTConvictionFacet.mintConviction.selector;
            selectors[2] = NFTConvictionFacet.burnConviction.selector;
            // ERC721 metadata
            selectors[3] = NFTConvictionFacet.tokenURI.selector;
            selectors[4] = NFTConvictionFacet.name.selector;
            selectors[5] = NFTConvictionFacet.symbol.selector;
            // ERC721 core
            selectors[6] = NFTConvictionFacet.balanceOf.selector;
            selectors[7] = NFTConvictionFacet.ownerOf.selector;
            selectors[8] = NFTConvictionFacet.approve.selector;
            selectors[9] = NFTConvictionFacet.getApproved.selector;
            selectors[10] = NFTConvictionFacet.setApprovalForAll.selector;
            selectors[11] = NFTConvictionFacet.isApprovedForAll.selector;
            // Transfer functions
            selectors[12] = NFTConvictionFacet.transferFrom.selector;
            selectors[13] = NFTConvictionFacet.safeTransferFrom.selector;
            selectors[14] = bytes4(keccak256("safeTransferFrom(address,address,uint256,bytes)"));
            // Conviction specific
            selectors[15] = bytes4(keccak256("getConvictionData(uint256)"));
        }
        else {
            revert UnknownFacet();
        }
    }

    /**
     * @notice Gets all facet addresses and their selectors
     */
    function getFacetInfo(address memeToken) external view returns (
        address[] memory facets,
        uint256[] memory selectorCounts,
        bool initialized
    ) {
        facets = new address[](6);
        selectorCounts = new uint256[](6);

        facets[0] = diamondCutFacet;
        facets[1] = erc20Facet;
        facets[2] = coreFacet;
        facets[3] = marketFacet;
        facets[4] = memeFacet;
        facets[5] = nftConvictionFacet;

        for(uint i = 0; i < facets.length; i++) {
            try IDiamondCut(memeToken).facetFunctionSelectors(facets[i]) returns (bytes4[] memory selectors) {
                selectorCounts[i] = selectors.length;
            } catch {
                selectorCounts[i] = 0;
            }
        }

        // Check if token is initialized
        try ERC20Facet(memeToken).name() returns (string memory) {
            initialized = true;
        } catch {
            initialized = false;
        }

        return (facets, selectorCounts, initialized);
    }

    /**
     * @notice Gets all system addresses
     */
    function getAddresses() external view returns (
        address _implementation,
        address _feeRecipient,
        address _weth,
        address _positionManager,
        address _swapRouter
    ) {
        return (
            implementation,
            feeRecipient,
            weth,
            positionManager,
            swapRouter
        );
    }
}