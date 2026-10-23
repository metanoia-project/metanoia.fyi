// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Face — one avatar NFT per wallet, minted at registration.
contract MetanoiaFace {
    string public constant name = "Metanoia Face";
    string public constant symbol = "FACE";

    uint256 public nextId = 1;
    mapping(uint256 => address) public ownerOf;
    mapping(address => uint256) public balanceOf;
    mapping(address => uint256) public faceOf;
    mapping(uint256 => string) private _tokenURI;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    function mint(string calldata uri) external returns (uint256) {
        return mintTo(msg.sender, uri);
    }

    function mintTo(address to, string calldata uri) public returns (uint256) {
        require(to != address(0), "zero");
        require(faceOf[to] == 0, "already minted");
        uint256 id = nextId++;
        ownerOf[id] = to;
        faceOf[to] = id;
        balanceOf[to] = 1;
        _tokenURI[id] = uri;
        emit Transfer(address(0), to, id);
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
