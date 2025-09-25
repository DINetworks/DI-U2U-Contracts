// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title MockIU2ULock
 * @notice Mock contract for locking IU2U tokens with delegation support
 * @dev Allows users to deposit IU2U tokens and withdraw them later
 * Supports delegated deposits (deposit on behalf of others) and delegated withdrawals
 */
contract MockIU2ULock is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // IU2U token contract
    IERC20 public immutable iu2uToken;

    // Mapping to track locked balances: user => amount
    mapping(address => uint256) public lockedBalances;

    // Total locked IU2U tokens in the contract
    uint256 public totalLocked;

    // Events
    event Deposited(
        address indexed depositor,
        address indexed beneficiary,
        uint256 amount,
        uint256 totalLocked
    );

    event Withdrawn(
        address indexed withdrawer,
        address indexed receiver,
        uint256 amount,
        uint256 remainingBalance
    );

    /**
     * @dev Constructor
     * @param iu2uToken_ Address of the IU2U token contract
     * @param initialOwner Initial owner of the contract
     */
    constructor(
        address iu2uToken_,
        address initialOwner
    ) {
        require(iu2uToken_ != address(0), "Invalid IU2U token address");
        require(initialOwner != address(0), "Invalid owner address");

        iu2uToken = IERC20(iu2uToken_);
        _transferOwnership(initialOwner);
    }

    /**
     * @notice Deposit IU2U tokens for a beneficiary (delegated deposit)
     * @dev Allows depositing on behalf of another address
     * @param from The address from which tokens will be transferred (delegated depositor)
     * @param beneficiary The address that will own the deposited tokens
     * @param amount The amount of IU2U tokens to deposit
     */
    function deposit(
        address from,
        address beneficiary,
        uint256 amount
    ) external nonReentrant {
        require(from != address(0), "Invalid from address");
        require(beneficiary != address(0), "Invalid beneficiary address");
        require(amount > 0, "Amount must be greater than zero");

        // Transfer IU2U tokens from the 'from' address to this contract
        iu2uToken.safeTransferFrom(from, address(this), amount);

        // Update locked balance for the beneficiary
        lockedBalances[beneficiary] += amount;
        totalLocked += amount;

        emit Deposited(from, beneficiary, amount, totalLocked);
    }

    /**
     * @notice Deposit IU2U tokens for the caller (self-deposit)
     * @param amount The amount of IU2U tokens to deposit
     */
    function deposit(uint256 amount) external {
        this.deposit(msg.sender, msg.sender, amount);
    }

    /**
     * @notice Withdraw IU2U tokens to a receiver address (delegated withdrawal)
     * @dev Only the beneficiary can initiate withdrawal, but can specify different receiver
     * @param to The address that will receive the withdrawn tokens
     * @param amount The amount of IU2U tokens to withdraw
     */
    function withdraw(
        address to,
        uint256 amount
    ) external nonReentrant {
        require(to != address(0), "Invalid receiver address");
        require(amount > 0, "Amount must be greater than zero");
        require(lockedBalances[msg.sender] >= amount, "Insufficient locked balance");

        // Update locked balance
        lockedBalances[msg.sender] -= amount;
        totalLocked -= amount;

        // Transfer IU2U tokens to the receiver
        iu2uToken.safeTransfer(to, amount);

        emit Withdrawn(msg.sender, to, amount, lockedBalances[msg.sender]);
    }

    /**
     * @notice Withdraw IU2U tokens to the caller
     * @param amount The amount of IU2U tokens to withdraw
     */
    function withdraw(uint256 amount) external {
        this.withdraw(msg.sender, amount);
    }

    /**
     * @notice Withdraw all IU2U tokens to a receiver address
     * @param to The address that will receive the withdrawn tokens
     */
    function withdrawAll(address to) external {
        uint256 amount = lockedBalances[msg.sender];
        require(amount > 0, "No tokens to withdraw");
        this.withdraw(to, amount);
    }

    /**
     * @notice Withdraw all IU2U tokens to the caller
     */
    function withdrawAll() external {
        this.withdrawAll(msg.sender);
    }

    /**
     * @notice Get the locked balance of an account
     * @param account The address to query
     * @return The amount of IU2U tokens locked by the account
     */
    function getLockedBalance(address account) external view returns (uint256) {
        return lockedBalances[account];
    }

    /**
     * @notice Get the total amount of IU2U tokens locked in the contract
     * @return The total locked amount
     */
    function getTotalLocked() external view returns (uint256) {
        return totalLocked;
    }

    /**
     * @notice Emergency withdrawal function for the owner
     * @dev Only callable by the owner in case of emergency
     * @param token The token address to withdraw
     * @param amount The amount to withdraw
     * @param to The recipient address
     */
    function emergencyWithdraw(
        address token,
        uint256 amount,
        address to
    ) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        IERC20(token).safeTransfer(to, amount);
    }
}