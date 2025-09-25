// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IU2UExecutable.sol";
import "./IU2UGateway.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title CrossChainAggregator
 * @notice Cross-chain token swap aggregator using IU2U protocol
 * @dev Enables A token -> IU2U -> B token swaps across different chains
 */
contract CrossChainAggregator is IU2UExecutable, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // IU2U gateway contract
    IU2UGateway public immutable iu2uGateway;

    // Swap data structure for cross-chain operations
    struct SwapData {
        address tokenIn;           // Input token address
        address tokenOut;          // Output token address (IU2U on source, target token on destination)
        uint256 amountIn;          // Input amount
        uint256 amountOutMin;      // Minimum output amount (slippage protection)
        address to;                // Recipient address
        uint256 deadline;          // Transaction deadline
        bytes routerCalldata;      // Encoded function call for DEX router
        address router;            // DEX router address
    }

    // Cross-chain swap request
    struct CrossChainSwapRequest {
        address user;              // Original user address
        string destinationChain;   // Target chain name
        address destinationToken;  // Target token on destination chain
        uint256 amountOutMin;      // Minimum amount out on destination
        uint256 deadline;          // Swap deadline
        bytes destinationSwapData; // Swap calldata for destination chain
        address destinationRouter; // Router address on destination chain
    }

    // Events
    event CrossChainSwapInitiated(
        address indexed user,
        address indexed tokenIn,
        uint256 amountIn,
        string destinationChain,
        address indexed destinationToken,
        bytes32 swapId
    );

    event CrossChainSwapCompleted(
        bytes32 indexed swapId,
        address indexed user,
        address indexed tokenOut,
        uint256 amountOut
    );

    event SwapFailed(
        bytes32 indexed swapId,
        address indexed user,
        string reason
    );

    // Supported routers per chain
    mapping(address => bool) public supportedRouters;
    
    // Swap tracking
    mapping(bytes32 => CrossChainSwapRequest) public swapRequests;
    
    // Failed swaps for manual recovery
    mapping(bytes32 => bool) public failedSwaps;

    constructor(
        address gateway_,
        address iu2uGateway_,
        address initialOwner
    ) IU2UExecutable(gateway_) Ownable() {
        iu2uGateway = IU2UGateway(iu2uGateway_);
        _transferOwnership(initialOwner);
    }

    /**
     * @notice Initiate cross-chain swap: TokenA -> IU2U -> TokenB
     * @param swapData Source chain swap data (TokenA -> IU2U)
     * @param destinationChain Target chain name
     * @param destinationToken Target token address
     * @param destinationSwapData Encoded swap data for destination chain
     * @param destinationRouter Router address on destination chain
     * @param amountOutMin Minimum amount out on destination chain
     */
    function crossChainSwap(
        SwapData calldata swapData,
        string calldata destinationChain,
        address destinationToken,
        bytes calldata destinationSwapData,
        address destinationRouter,
        uint256 amountOutMin
    ) external nonReentrant {
        require(swapData.deadline >= block.timestamp, "Swap expired");
        require(supportedRouters[swapData.router], "Unsupported router");
        require(swapData.tokenOut == address(iu2uGateway.iu2uToken()), "Output must be IU2U");

        // Generate unique swap ID
        bytes32 swapId = keccak256(abi.encodePacked(
            msg.sender,
            swapData.tokenIn,
            swapData.amountIn,
            destinationChain,
            destinationToken,
            block.timestamp,
            block.number
        ));

        // Store cross-chain swap request
        swapRequests[swapId] = CrossChainSwapRequest({
            user: msg.sender,
            destinationChain: destinationChain,
            destinationToken: destinationToken,
            amountOutMin: amountOutMin,
            deadline: swapData.deadline,
            destinationSwapData: destinationSwapData,
            destinationRouter: destinationRouter
        });

        // Transfer input token from user
        IERC20(swapData.tokenIn).safeTransferFrom(
            msg.sender,
            address(this),
            swapData.amountIn
        );

        // Execute swap on source chain (TokenA -> IU2U)
        uint256 iu2uAmount = _executeSwap(swapData);
        require(iu2uAmount >= swapData.amountOutMin, "Insufficient output amount");

        // Prepare payload for destination chain
        bytes memory payload = abi.encode(
            swapId,
            msg.sender,
            destinationToken,
            iu2uAmount,
            amountOutMin,
            swapData.deadline,
            destinationSwapData,
            destinationRouter
        );

        // Bridge IU2U to destination chain with swap instructions
        _callContractWithToken(
            destinationChain,
            _getAggregatorAddress(destinationChain),
            payload,
            "IU2U",
            iu2uAmount
        );

        emit CrossChainSwapInitiated(
            msg.sender,
            swapData.tokenIn,
            swapData.amountIn,
            destinationChain,
            destinationToken,
            swapId
        );
    }

    /**
     * @notice Execute cross-chain swap completion on destination chain
     * @dev Called by IU2U gateway when receiving cross-chain message
     */
    function _executeWithToken(
        string calldata, /* sourceChain */
        string calldata, /* sourceAddress */
        bytes calldata payload,
        string calldata tokenSymbol,
        uint256 amount
    ) internal override {
        require(
            keccak256(bytes(tokenSymbol)) == keccak256(bytes("IU2U")),
            "Invalid token"
        );

        // Decode payload
        (
            bytes32 swapId,
            address user,
            address destinationToken,
            uint256 iu2uAmount,
            uint256 amountOutMin,
            uint256 deadline,
            bytes memory destinationSwapData,
            address destinationRouter
        ) = abi.decode(payload, (bytes32, address, address, uint256, uint256, uint256, bytes, address));

        require(block.timestamp <= deadline, "Swap expired");
        require(supportedRouters[destinationRouter], "Unsupported router");
        require(amount == iu2uAmount, "Amount mismatch");

        try this._performDestinationSwap(
            swapId,
            user,
            destinationToken,
            amount,
            amountOutMin,
            destinationSwapData,
            destinationRouter
        ) {
            // Swap completed successfully
        } catch Error(string memory reason) {
            // Handle failed swap
            failedSwaps[swapId] = true;

            // Send IU2U directly to user as fallback
            iu2uGateway.iu2uToken().transfer(user, amount);

            emit SwapFailed(swapId, user, reason);
        }
    }

    /**
     * @notice Perform destination chain swap (IU2U -> TokenB)
     * @dev External function to enable try-catch error handling
     */
    function _performDestinationSwap(
        bytes32 swapId,
        address user,
        address destinationToken,
        uint256 iu2uAmount,
        uint256 amountOutMin,
        bytes calldata swapData,
        address router
    ) external {
        require(msg.sender == address(this), "Only self");

        IU2U iu2u = iu2uGateway.iu2uToken();

        // Approve router to spend IU2U
        iu2u.approve(router, iu2uAmount);

        // Get balance before swap
        uint256 balanceBefore = IERC20(destinationToken).balanceOf(address(this));

        // Execute swap using provided calldata
        (bool success, ) = router.call(swapData);
        require(success, "Router call failed");

        // Calculate received amount
        uint256 balanceAfter = IERC20(destinationToken).balanceOf(address(this));
        uint256 amountOut = balanceAfter - balanceBefore;
        
        require(amountOut >= amountOutMin, "Insufficient output amount");

        // Transfer tokens to user
        IERC20(destinationToken).safeTransfer(user, amountOut);

        emit CrossChainSwapCompleted(swapId, user, destinationToken, amountOut);
    }

    /**
     * @notice Execute swap on source chain
     * @param swapData Swap parameters
     * @return iu2uAmount Amount of IU2U received
     */
    function _executeSwap(SwapData calldata swapData) internal returns (uint256 iu2uAmount) {
        IERC20 tokenIn = IERC20(swapData.tokenIn);
        IERC20 iu2u = IERC20(swapData.tokenOut); // Should be IU2U

        // Approve router to spend input token
        tokenIn.approve(swapData.router, swapData.amountIn);

        // Get IU2U balance before swap
        uint256 balanceBefore = iu2u.balanceOf(address(this));

        // Execute swap using provided calldata
        (bool success, ) = swapData.router.call(swapData.routerCalldata);
        require(success, "Router call failed");

        // Calculate IU2U received
        uint256 balanceAfter = iu2u.balanceOf(address(this));
        iu2uAmount = balanceAfter - balanceBefore;

        return iu2uAmount;
    }

    /**
     * @notice Get aggregator address on destination chain
     * @return Aggregator contract address on destination chain
     */
    function _getAggregatorAddress(string memory /* chainName */) internal view returns (string memory) {
        // In practice, this would be a mapping of chain names to aggregator addresses
        // For now, we'll use the same address format
        return _addressToString(address(this));
    }

    /**
     * @notice Convert address to string
     */
    function _addressToString(address addr) internal pure returns (string memory) {
        bytes memory data = abi.encodePacked(addr);
        bytes memory alphabet = "0123456789abcdef";
        
        bytes memory str = new bytes(2 + data.length * 2);
        str[0] = "0";
        str[1] = "x";
        for (uint i = 0; i < data.length; i++) {
            str[2+i*2] = alphabet[uint(uint8(data[i] >> 4))];
            str[3+i*2] = alphabet[uint(uint8(data[i] & 0x0f))];
        }
        return string(str);
    }

    // Admin functions

    /**
     * @notice Add supported router
     * @param router Router address to add
     */
    function addSupportedRouter(address router) external onlyOwner {
        supportedRouters[router] = true;
    }

    /**
     * @notice Remove supported router
     * @param router Router address to remove
     */
    function removeSupportedRouter(address router) external onlyOwner {
        supportedRouters[router] = false;
    }

    /**
     * @notice Emergency withdrawal of tokens
     * @param token Token address
     * @param amount Amount to withdraw
     * @param to Recipient address
     */
    function emergencyWithdraw(
        address token,
        uint256 amount,
        address to
    ) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    /**
     * @notice Recover failed swap manually
     * @param swapId Failed swap ID
     * @param user User address
     * @param token Token to send
     * @param amount Amount to send
     */
    function recoverFailedSwap(
        bytes32 swapId,
        address user,
        address token,
        uint256 amount
    ) external onlyOwner {
        require(failedSwaps[swapId], "Swap not failed");
        
        IERC20(token).safeTransfer(user, amount);
        failedSwaps[swapId] = false;
    }
}
