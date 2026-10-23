// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Face — unique look, one mint per wallet.
contract MetanoiaFace {
    string public constant name = "Metanoia Face";
    string public constant symbol = "FACE";

    bytes4 private constant ERC721_ID = 0x80ac58cd;
    bytes4 private constant ERC721_METADATA_ID = 0x5b5e139f;
    bytes4 private constant ERC165_ID = 0x01ffc9a7;
    bytes4 private constant ERC721_RECEIVED = 0x150b7a02;

    uint256 public nextId = 1;
    mapping(uint256 => address) public ownerOf;
    mapping(address => uint256) public balanceOf;
    mapping(address => uint256) public faceOf;
    mapping(bytes32 => uint256) public idByHash;
    mapping(uint256 => string) private _tokenURI;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    function supportsInterface(bytes4 id) external pure returns (bool) {
        return id == ERC721_ID || id == ERC721_METADATA_ID || id == ERC165_ID;
    }

    function contractURI() external pure returns (string memory) {
        return "https://metanoia.fyi/face.json";
    }

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

    function approve(address to, uint256 id) external {
        address owner = ownerOf[id];
        require(owner != address(0), "none");
        require(msg.sender == owner || _operatorApprovals[owner][msg.sender], "not owner");
        _tokenApprovals[id] = to;
        emit Approval(owner, to, id);
    }

    function getApproved(uint256 id) external view returns (address) {
        require(ownerOf[id] != address(0), "none");
        return _tokenApprovals[id];
    }

    function setApprovalForAll(address operator, bool approved) external {
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address owner, address operator) external view returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    function transferFrom(address from, address to, uint256 id) public {
        _transfer(from, to, id);
    }

    function safeTransferFrom(address from, address to, uint256 id) external {
        safeTransferFrom(from, to, id, "");
    }

    function safeTransferFrom(address from, address to, uint256 id, bytes memory data) public {
        _transfer(from, to, id);
        _checkOnReceived(from, to, id, data);
    }

    function _isApprovedOrOwner(address spender, uint256 id) private view returns (bool) {
        address owner = ownerOf[id];
        return spender == owner || _tokenApprovals[id] == spender || _operatorApprovals[owner][spender];
    }

    function _transfer(address from, address to, uint256 id) private {
        require(to != address(0), "zero");
        require(ownerOf[id] == from, "from");
        require(_isApprovedOrOwner(msg.sender, id), "not owner");
        require(faceOf[to] == 0, "already minted");

        delete _tokenApprovals[id];
        balanceOf[from] -= 1;
        balanceOf[to] += 1;
        ownerOf[id] = to;
        faceOf[from] = 0;
        faceOf[to] = id;
        emit Transfer(from, to, id);
    }

    function _checkOnReceived(address from, address to, uint256 id, bytes memory data) private {
        if (to.code.length == 0) return;
        (bool ok, bytes memory ret) = to.call(
            abi.encodeWithSelector(ERC721_RECEIVED, msg.sender, from, id, data)
        );
        require(ok && ret.length >= 32 && bytes4(ret) == ERC721_RECEIVED, "unsafe");
    }
}
