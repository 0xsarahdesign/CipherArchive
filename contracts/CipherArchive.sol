// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, eaddress, externalEaddress} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title CipherArchive
/// @notice Stores encrypted file metadata and encrypted secret addresses
/// @dev The encrypted address is stored as an `eaddress` to keep the secret key off-chain while still allowing user decryption through the relayer.
contract CipherArchive is ZamaEthereumConfig {
    struct StoredFile {
        string fileName;
        bytes encryptedIpfsHash;
        eaddress encryptedSecretAddress;
        address owner;
        uint256 createdAt;
    }

    mapping(address => StoredFile[]) private _filesByOwner;

    event FileStored(address indexed owner, uint256 indexed index, string fileName, bytes encryptedIpfsHash);
    event AccessGranted(address indexed owner, uint256 indexed index, address indexed grantee);

    /// @notice Store a new encrypted file reference for the caller
    /// @param fileName Original file name
    /// @param encryptedIpfsHash IPFS hash encrypted with the caller generated address
    /// @param secretAddress Encrypted address handle produced client-side
    /// @param inputProof Proof returned by the relayer SDK for the encrypted address
    /// @return index Position of the stored file for the caller
    function storeFile(
        string calldata fileName,
        bytes calldata encryptedIpfsHash,
        externalEaddress secretAddress,
        bytes calldata inputProof
    ) external returns (uint256 index) {
        require(bytes(fileName).length > 0, "Filename required");
        require(encryptedIpfsHash.length > 0, "Encrypted hash required");
        require(inputProof.length > 0, "Proof required");

        eaddress validatedAddress = FHE.fromExternal(secretAddress, inputProof);

        StoredFile memory record = StoredFile({
            fileName: fileName,
            encryptedIpfsHash: encryptedIpfsHash,
            encryptedSecretAddress: validatedAddress,
            owner: msg.sender,
            createdAt: block.timestamp
        });

        _filesByOwner[msg.sender].push(record);
        index = _filesByOwner[msg.sender].length - 1;

        FHE.allow(_filesByOwner[msg.sender][index].encryptedSecretAddress, msg.sender);
        FHE.allowThis(_filesByOwner[msg.sender][index].encryptedSecretAddress);

        emit FileStored(msg.sender, index, fileName, encryptedIpfsHash);
    }

    /// @notice Grant another address permission to decrypt the stored secret address
    /// @param owner Owner of the file
    /// @param fileIndex Index of the stored file
    /// @param grantee Address allowed to decrypt the secret address
    function grantAddressAccess(address owner, uint256 fileIndex, address grantee) external {
        require(owner == msg.sender, "Not file owner");
        require(fileIndex < _filesByOwner[owner].length, "Invalid index");

        FHE.allow(_filesByOwner[owner][fileIndex].encryptedSecretAddress, grantee);
        emit AccessGranted(owner, fileIndex, grantee);
    }

    /// @notice Return a single stored file
    /// @param owner Owner of the file
    /// @param fileIndex Index of the stored file
    function getFile(address owner, uint256 fileIndex) external view returns (StoredFile memory) {
        require(fileIndex < _filesByOwner[owner].length, "Invalid index");
        return _filesByOwner[owner][fileIndex];
    }

    /// @notice Return all stored files for an owner
    /// @param owner Address whose files are requested
    function listFiles(address owner) external view returns (StoredFile[] memory) {
        return _filesByOwner[owner];
    }

    /// @notice Return the number of stored files for an owner
    /// @param owner Address whose file count is requested
    function getFileCount(address owner) external view returns (uint256) {
        return _filesByOwner[owner].length;
    }
}
