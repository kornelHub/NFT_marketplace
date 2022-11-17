// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract PepeNFT is ERC721, ERC721Holder, AccessControl {
    using Counters for Counters.Counter;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    Counters.Counter private _tokenIdCounter;

    struct Sale {
        address seller;
        uint256 price;
    }

    uint256 public mintPrice = 5000000000000000; // 0.005 ETH
    uint256 public adminFee; // admin fee to withdraw
    mapping(uint256 => Sale) public tokenIdToSale;

    event NftMinted(address to, uint256 tokenId);
    event NftPutOnSale(uint256 tokenId, uint256 price);
    event NftSold(uint256 tokenId, uint256 price);

    /* Error msg
        E#0: wrong amount of ETH has beed send!
        E#1: ETH trasnfer failed!
        E#2: You arent owner of this token!
        E#3: Token price placed on sale must be grater that 0!
        E#4: You arent owner of this token on sale!
        E#5: This token isnt on sale!
    */

    constructor() ERC721("PepeNFT", "Pepe") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    modifier isOwner(uint256 _tokenId) {
        require(ownerOf(_tokenId) == msg.sender, "E#2");
        _;
    }

    modifier isOwnerOnSale(uint256 _tokenId) {
        require(tokenIdToSale[_tokenId].seller == msg.sender, "E#4");
        _;
    }

    modifier isTokenOnSale(uint256 _tokenId) {
        require(tokenIdToSale[_tokenId].price > 0, "E#5");
        _;
    }

    function mint(address to) external payable {
        require(msg.value == mintPrice, "E#0");
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        adminFee += msg.value;
        _safeMint(to, tokenId);
        emit NftMinted(to, tokenId);
    }

    function changeMintPrice(uint256 _newPrice) external onlyRole(ADMIN_ROLE) {
        mintPrice = _newPrice;
    }

    function withdrawAdminFee() external onlyRole(ADMIN_ROLE) {
        uint256 withdrawAmount = adminFee;
        adminFee = 0;
        (bool success, ) = payable(msg.sender).call{value: withdrawAmount}("");
        require(success, "E#1");
    }

    function startSale(uint256 _tokenId, uint256 _price)
        external
        isOwner(_tokenId)
    {
        require(_price > 0, "E#3");
        safeTransferFrom(msg.sender, address(this), _tokenId, "");
        tokenIdToSale[_tokenId] = Sale(msg.sender, _price);

        emit NftPutOnSale(_tokenId, _price);
    }

    function cancelSale(uint256 _tokenId)
        external
        isTokenOnSale(_tokenId)
        isOwnerOnSale(_tokenId)
    {
        delete tokenIdToSale[_tokenId];
        this.safeTransferFrom(address(this), msg.sender, _tokenId);
    }

    function changeTokenPrice(uint256 _tokenId, uint256 _newPrice)
        external
        isTokenOnSale(_tokenId)
        isOwnerOnSale(_tokenId)
    {
        tokenIdToSale[_tokenId].price = _newPrice;
    }

    function buyTokenOnSale(uint256 _tokenId)
        external
        payable
        isTokenOnSale(_tokenId)
    {
        require(tokenIdToSale[_tokenId].price == msg.value, "E#0");

        address seller = tokenIdToSale[_tokenId].seller;
        delete tokenIdToSale[_tokenId];

        this.safeTransferFrom(address(this), msg.sender, _tokenId);

        (bool success, ) = payable(seller).call{value: msg.value}("");
        require(success, "E#1");

        emit NftSold(_tokenId, msg.value);
    }

    // The following functions are overrides required by Solidity.

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
