// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import "./interfaces/IIU2UGateway.sol";
import "./IU2UExecutable.sol";
import "./IU2U.sol";

contract IU2UGateway is IIU2UGateway, Ownable {
    using EnumerableSet for EnumerableSet.AddressSet;
    using SignatureChecker for address;
    using ECDSA for bytes32;

    uint256 u2u_chainid = 2484; // 2484 is U2U Nebulas Testnet
    IU2U public immutable iu2uToken;
    EnumerableSet.AddressSet private relayers;

    mapping(address => bool) public whitelisted;
    mapping(bytes32 => bool) public commandExecuted;
    mapping(string => uint256) public chainIds;
    mapping(uint256 => string) public chainNames;
    mapping(bytes32 => bytes) public approvedPayloads; // Store approved payloads for execution

    // GMP Protocol structures
    struct Command {
        uint256 commandType;
        bytes data;
    }

    // Command types
    uint256 public constant COMMAND_APPROVE_CONTRACT_CALL = 0;
    uint256 public constant COMMAND_APPROVE_CONTRACT_CALL_WITH_MINT = 1;
    uint256 public constant COMMAND_BURN_TOKEN = 2;
    uint256 public constant COMMAND_MINT_TOKEN = 4;

    event RelayerAdded(address indexed relayer);
    event RelayerRemoved(address indexed relayer);
    event ChainAdded(string indexed chainName, uint256 chainId);
    event ChainRemoved(string indexed chainName);

    constructor(address owner_, address payable iu2uToken_) Ownable() {
        // Transfer ownership to the specified owner
        _transferOwnership(owner_);

        // Set IU2U token address
        iu2uToken = IU2U(iu2uToken_);

        // Initialize default chains
        chainIds["u2u-nebulas-testnet"] = 2484;
        chainNames[2484] = "u2u-nebulas-testnet";
        chainIds["ethereum"] = 1;
        chainNames[1] = "ethereum";
        chainIds["bsc"] = 56;
        chainNames[56] = "bsc";
        chainIds["polygon"] = 137;
        chainNames[137] = "polygon";
        chainIds["base"] = 8453;
        chainNames[8453] = "base";
        chainIds["arbitrum"] = 42161;
        chainNames[42161] = "arbitrum";
        chainIds["avalanche"] = 43114;
        chainNames[43114] = "avalanche";
        chainIds["optimism"] = 10;
        chainNames[10] = "optimism";
    }

    modifier onlyRelayer() {
        require(whitelisted[msg.sender], "Caller not whitelisted relayers");
        _;
    }

    modifier onlyU2UChain() {
        require(block.chainid == u2u_chainid, "Not U2U Chain");
        _;
    }

    modifier notExecuted(bytes32 commandId) {
        require(!commandExecuted[commandId], "Command already executed");
        _;
    }

    // Chain management functions
    function addChain(string memory chainName, uint256 chainId) external onlyOwner {
        require(bytes(chainName).length > 0, "Invalid chain name");
        require(chainId > 0, "Invalid chain ID");
        require(chainIds[chainName] == 0, "Chain already exists");

        chainIds[chainName] = chainId;
        chainNames[chainId] = chainName;

        emit ChainAdded(chainName, chainId);
    }

    function removeChain(string memory chainName) external onlyOwner {
        uint256 chainId = chainIds[chainName];
        require(chainId > 0, "Chain does not exist");

        delete chainIds[chainName];
        delete chainNames[chainId];

        emit ChainRemoved(chainName);
    }

    function getChainId(string memory chainName) external view returns (uint256) {
        return chainIds[chainName];
    }

    function getChainName(uint256 chainId) external view returns (string memory) {
        return chainNames[chainId];
    }

    // add new whitelisted relayer
    function addWhitelistedRelayer(address relayer) public onlyOwner {
        require(relayer != address(0), 'address is not valid');
        require(!whitelisted[relayer], 'Already relayer');

        whitelisted[relayer] = true;
        relayers.add(relayer);

        emit RelayerAdded(relayer);
    }

    // remove current whitelisted relayer
    function removeWhitelistedRelayer(address relayer) public onlyOwner {
        require(whitelisted[relayer], 'Relayer not whitelisted');

        whitelisted[relayer] = false;
        relayers.remove(relayer);

        emit RelayerRemoved(relayer);
    }

    // GMP Protocol Core Functions
    /**
     * @dev Call a contract on another chain
     * @param destinationChain The name of the destination chain
     * @param destinationContractAddress The address of the contract to call
     * @param payload The payload to send to the contract
     */
    function callContract(
        string memory destinationChain,
        string memory destinationContractAddress,
        bytes memory payload
    ) external {
        require(chainIds[destinationChain] > 0, "Unsupported destination chain");
        require(bytes(destinationContractAddress).length > 0, "Invalid destination address");

        bytes32 payloadHash = keccak256(payload);

        emit ContractCall(
            msg.sender,
            destinationChain,
            destinationContractAddress,
            payloadHash,
            payload
        );
    }

    /**
     * @dev Call a contract on another chain with token transfer
     * @param destinationChain The name of the destination chain
     * @param destinationContractAddress The address of the contract to call
     * @param payload The payload to send to the contract
     * @param symbol The symbol of the token to send
     * @param amount The amount of tokens to send
     */
    function callContractWithToken(
        string memory destinationChain,
        string memory destinationContractAddress,
        bytes memory payload,
        string memory symbol,
        uint256 amount
    ) external {
        require(chainIds[destinationChain] > 0, "Unsupported destination chain");
        require(bytes(destinationContractAddress).length > 0, "Invalid destination address");
        require(amount > 0, "Amount must be greater than zero");
        require(keccak256(bytes(symbol)) == keccak256(bytes("IU2U")), "Unsupported token");

        // Burn tokens from sender on source chain
        iu2uToken.burn(msg.sender, amount);

        bytes32 payloadHash = keccak256(payload);

        emit ContractCallWithToken(
            msg.sender,
            destinationChain,
            destinationContractAddress,
            payloadHash,
            payload,
            symbol,
            amount
        );
    }

    /**
     * @dev Send tokens to another chain
     * @param destinationChain The name of the destination chain
     * @param destinationAddress The address to send tokens to
     * @param symbol The symbol of the token to send
     * @param amount The amount of tokens to send
     */
    function sendToken(
        string memory destinationChain,
        string memory destinationAddress,
        string memory symbol,
        uint256 amount
    ) external {
        require(chainIds[destinationChain] > 0, "Unsupported destination chain");
        require(bytes(destinationAddress).length > 0, "Invalid destination address");
        require(amount > 0, "Amount must be greater than zero");
        require(keccak256(bytes(symbol)) == keccak256(bytes("IU2U")), "Unsupported token");

        // Burn tokens from sender on source chain
        iu2uToken.burn(msg.sender, amount);

        emit TokenSent(
            msg.sender,
            destinationChain,
            destinationAddress,
            symbol,
            amount
        );
    }

    function sendToken(
        string memory destinationChain,
        string memory destinationAddress,        
        string memory symbol
    ) external payable onlyU2UChain {
        uint256 amount = msg.value;
        require(amount > 0, "Amount must be greater than zero");
        require(keccak256(bytes(symbol)) == keccak256(bytes("IU2U")), "Unsupported token");

        payable(address(iu2uToken)).call{value: amount};

        emit TokenSent(
            msg.sender,
            destinationChain,
            destinationAddress,
            symbol,
            amount
        );
    }

    // GMP Command Execution Functions (for relayers)

    /**
     * @dev Execute commands from relayers
     * @param commandId Unique identifier for the command
     * @param commands Array of commands to execute
     * @param signature Signature from authorized relayer
     */
    function execute(
        bytes32 commandId,
        Command[] memory commands,
        bytes memory signature
    ) external onlyRelayer notExecuted(commandId) {
        // Mark command as executed to prevent replay
        commandExecuted[commandId] = true;

        // Verify signature
        bytes32 hash = keccak256(abi.encode(commandId, commands));
        address signer = recoverSigner(hash, signature);
        require(whitelisted[signer], "Invalid signer");

        // Execute all commands
        for (uint256 i = 0; i < commands.length; i++) {
            _executeCommand(commandId, commands[i]);
        }

        emit Executed(commandId);
    }

    /**
     * @dev Internal function to execute individual commands
     */
    function _executeCommand(bytes32 commandId, Command memory command) internal {
        if (command.commandType == COMMAND_APPROVE_CONTRACT_CALL) {
            _approveContractCall(commandId, command.data);
        } else if (command.commandType == COMMAND_APPROVE_CONTRACT_CALL_WITH_MINT) {
            _approveContractCallWithMint(commandId, command.data);
        } else if (command.commandType == COMMAND_MINT_TOKEN) {
            _mintToken(command.data);
        } else if (command.commandType == COMMAND_BURN_TOKEN) {
            _burnToken(command.data);
        } else {
            revert("Unknown command type");
        }
    }

    /**
     * @dev Approve a contract call from another chain
     */
    function _approveContractCall(bytes32 commandId, bytes memory data) internal {
        (
            string memory sourceChain,
            string memory sourceAddress,
            address contractAddress,
            bytes32 payloadHash,
            bytes32 sourceTxHash,
            uint256 sourceEventIndex,
            bytes memory payload
        ) = abi.decode(data, (string, string, address, bytes32, bytes32, uint256, bytes));

        // Verify payload hash matches
        require(keccak256(payload) == payloadHash, "Invalid payload hash");

        // Store approved payload for potential execution
        approvedPayloads[commandId] = payload;

        emit ContractCallApproved(
            commandId,
            sourceChain,
            sourceAddress,
            contractAddress,
            payloadHash,
            sourceTxHash,
            sourceEventIndex
        );

        // Execute the contract call if the contract implements IU2UExecutable
        if (contractAddress.code.length > 0) {
            try this._safeExecuteCall(
                commandId,
                sourceChain,
                sourceAddress,
                contractAddress,
                payload
            ) {
                // Call succeeded
            } catch {
                // Call failed, but we don't revert the entire transaction
                // The event is still emitted so the approval is recorded
            }
        }
    }

    /**
     * @dev Approve a contract call with mint from another chain
     */
    function _approveContractCallWithMint(bytes32 commandId, bytes memory data) internal {
        (
            string memory sourceChain,
            string memory sourceAddress,
            address contractAddress,
            bytes32 payloadHash,
            string memory symbol,
            uint256 amount,
            bytes32 sourceTxHash,
            uint256 sourceEventIndex,
            bytes memory payload
        ) = abi.decode(data, (string, string, address, bytes32, string, uint256, bytes32, uint256, bytes));

        require(keccak256(bytes(symbol)) == keccak256(bytes("IU2U")), "Unsupported token");

        // Verify payload hash matches
        require(keccak256(payload) == payloadHash, "Invalid payload hash");

        // Store approved payload for potential execution
        approvedPayloads[commandId] = payload;

        // Mint tokens to the destination contract
        iu2uToken.mint(contractAddress, amount);

        emit ContractCallApprovedWithMint(
            commandId,
            sourceChain,
            sourceAddress,
            contractAddress,
            payloadHash,
            symbol,
            amount,
            sourceTxHash,
            sourceEventIndex
        );

        // Execute the contract call with token if the contract implements IU2UExecutable
        if (contractAddress.code.length > 0) {
            try this._safeExecuteCallWithToken(
                commandId,
                sourceChain,
                sourceAddress,
                contractAddress,
                payload,
                symbol,
                amount
            ) {
                // Call succeeded
            } catch {
                // Call failed, but we don't revert the entire transaction
                // The tokens are still minted and event is emitted
            }
        }
    }

    /**
     * @dev Mint tokens (for cross-chain transfers)
     */
    function _mintToken(bytes memory data) internal {
        (address to, uint256 amount, string memory symbol) = abi.decode(data, (address, uint256, string));

        require(keccak256(bytes(symbol)) == keccak256(bytes("IU2U")), "Unsupported token");
        require(amount > 0, "Amount must be greater than zero");
        require(to != address(0), "Invalid recipient");

        // Mint tokens using the IU2U token contract
        iu2uToken.mint(to, amount);
    }

    /**
     * @dev Burn tokens (for cross-chain transfers)
     */
    function _burnToken(bytes memory data) internal {
        (address from, uint256 amount, string memory symbol) = abi.decode(data, (address, uint256, string));

        require(keccak256(bytes(symbol)) == keccak256(bytes("IU2U")), "Unsupported token");
        require(amount > 0, "Amount must be greater than zero");
        require(from != address(0), "Invalid sender");

        // Burn tokens using the IU2U token contract
        iu2uToken.burn(from, amount);
    }

    /**
     * @dev Safely execute a contract call (external function for try-catch)
     */
    function _safeExecuteCall(
        bytes32 commandId,
        string memory sourceChain,
        string memory sourceAddress,
        address contractAddress,
        bytes memory payload
    ) external {
        require(msg.sender == address(this), "Only self");

        // Try to call the execute function on the target contract
        (bool success, ) = contractAddress.call(
            abi.encodeWithSignature(
                "execute(bytes32,string,string,bytes)",
                commandId,
                sourceChain,
                sourceAddress,
                payload
            )
        );

        require(success, "Contract call failed");
    }

    /**
     * @dev Safely execute a contract call with token (external function for try-catch)
     */
    function _safeExecuteCallWithToken(
        bytes32 commandId,
        string memory sourceChain,
        string memory sourceAddress,
        address contractAddress,
        bytes memory payload,
        string memory symbol,
        uint256 amount
    ) external {
        require(msg.sender == address(this), "Only self");

        // Try to call the executeWithToken function on the target contract
        (bool success, ) = contractAddress.call(
            abi.encodeWithSignature(
                "executeWithToken(bytes32,string,string,bytes,string,uint256)",
                commandId,
                sourceChain,
                sourceAddress,
                payload,
                symbol,
                amount
            )
        );

        require(success, "Contract call with token failed");
    }

    // Utility functions
    /**
     * @dev Check if a command has been executed
     * @param commandId The command ID to check
     * @return True if the command has been executed
     */
    function isCommandExecuted(bytes32 commandId) external view returns (bool) {
        return commandExecuted[commandId];
    }

    /**
     * @dev Check if a contract call is approved
     * @param commandId Unique identifier for the command
     * @return True if the contract call is approved
     */
    function isContractCallApproved(
        bytes32 commandId,
        string calldata /* sourceChain */,
        string calldata /* sourceAddress */,
        address /* contractAddress */,
        bytes32 /* payloadHash */
    ) external view returns (bool) {
        return commandExecuted[commandId];
    }

    /**
     * @dev Check if a contract call with mint is approved
     * @param commandId Unique identifier for the command
     * @return True if the contract call with mint is approved
     */
    function isContractCallAndMintApproved(
        bytes32 commandId,
        string calldata /* sourceChain */,
        string calldata /* sourceAddress */,
        address /* contractAddress */,
        bytes32 /* payloadHash */,
        string calldata /* symbol */,
        uint256 /* amount */
    ) external view returns (bool) {
        return commandExecuted[commandId];
    }

    /**
     * @dev Get approved payload for a command
     * @param commandId The command ID to get payload for
     * @return The approved payload data
     */
    function getApprovedPayload(bytes32 commandId) external view returns (bytes memory) {
        return approvedPayloads[commandId];
    }

    /**
     * @dev Validate contract call for IU2UExecutable contracts
     * @param commandId Unique identifier for the command
     * @param sourceChain Name of the source chain
     * @param sourceAddress Address of the sender on the source chain
     * @param payloadHash Hash of the payload
     * @return True if valid and approved
     */
    function validateContractCall(
        bytes32 commandId,
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes32 payloadHash
    ) external view returns (bool) {
        if (!commandExecuted[commandId]) {
            return false;
        }

        bytes memory storedPayload = approvedPayloads[commandId];
        if (storedPayload.length == 0) {
            return false;
        }

        return keccak256(storedPayload) == payloadHash;
    }

    /**
     * @dev Validate contract call with mint for IU2UExecutable contracts
     * @param commandId Unique identifier for the command
     * @param sourceChain Name of the source chain
     * @param sourceAddress Address of the sender on the source chain
     * @param payloadHash Hash of the payload
     * @param symbol Token symbol
     * @param amount Token amount
     * @return True if valid and approved
     */
    function validateContractCallAndMint(
        bytes32 commandId,
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes32 payloadHash,
        string calldata symbol,
        uint256 amount
    ) external view returns (bool) {
        if (!commandExecuted[commandId]) {
            return false;
        }

        bytes memory storedPayload = approvedPayloads[commandId];
        if (storedPayload.length == 0) {
            return false;
        }

        return keccak256(storedPayload) == payloadHash;
    }

    /**
     * @dev Check if an address is a whitelisted relayer
     * @param relayer The address to check
     * @return True if the address is whitelisted
     */
    function isWhitelistedRelayer(address relayer) external view returns (bool) {
        return whitelisted[relayer];
    }

    /**
     * @dev Get all whitelisted relayers
     * @return Array of whitelisted relayer addresses
     */
    function getAllRelayers() external view returns (address[] memory) {
        uint256 length = relayers.length();
        address[] memory result = new address[](length);

        for (uint256 i = 0; i < length; i++) {
            result[i] = relayers.at(i);
        }

        return result;
    }

    /**
     * @dev Get the number of whitelisted relayers
     * @return The number of relayers
     */
    function getRelayerCount() external view returns (uint256) {
        return relayers.length();
    }

    // Recover the signer address from the signature
    function recoverSigner(bytes32 _hash, bytes memory _signature) public pure returns (address) {
        bytes32 ethSignedMessageHash = _hash.toEthSignedMessageHash();
        return ethSignedMessageHash.recover(_signature);
    }

}
