// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Face — unique look, one mint per wallet.
contract MetanoiaFace {
    string public constant name = "Metanoia Face";
    string public constant symbol = "FACE";

    uint256 public nextId = 1;
    mapping(uint256 => address) public ownerOf;
    mapping(address => uint256) public balanceOf;
    mapping(address => uint256) public faceOf;
    mapping(bytes32 => uint256) public idByHash;
    mapping(uint256 => string) private _tokenURI;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    function hashFace(bool[9] memory on, bytes3[9] memory color) public pure returns (bytes32) {
        return keccak256(abi.encode(on, color));
    }

    function mint(bool[9] calldata on, bytes3[9] calldata color, string calldata uri) external returns (uint256) {
        bytes32 look = hashFace(on, color);
        require(idByHash[look] == 0, "already exists");
        require(faceOf[msg.sender] == 0, "already minted");

        uint256 id = nextId++;
        ownerOf[id] = msg.sender;
        faceOf[msg.sender] = id;
        balanceOf[msg.sender] = 1;
        idByHash[look] = id;
        _tokenURI[id] = uri;
        emit Transfer(address(0), msg.sender, id);
        return id;
    }

    function tokenURI(uint256 id) external view returns (string memory) {
        require(ownerOf[id] != address(0), "none");
        return _tokenURI[id];
    }

    function supportsInterface(bytes4 id) external pure returns (bool) {
        return id == 0x80ac58cd || id == 0x5b5e139f || id == 0x01ffc9a7;
    }
}
