import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("TestPepeNFT", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.

  const mintPrice = ethers.utils.parseEther("0.005");
  const mintPriceMinus = ethers.utils.parseEther("-0.005");
  const tokenSalePrice = ethers.utils.parseEther("0.6");
  const tokenSalePriceMinus = ethers.utils.parseEther("-0.6");
  const addrNull = "0x0000000000000000000000000000000000000000";

  async function deployOneYearLockFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, ...acc] = await ethers.getSigners();

    const PepeNFT = await ethers.getContractFactory("PepeNFT");
    const contractPepeNFT = await PepeNFT.deploy();

    return { contractPepeNFT, owner, acc };
  }

  describe("mint()", function () {
    it("PASS", async function () {
      const { contractPepeNFT, acc } = await loadFixture(
        deployOneYearLockFixture
      );

      await expect(
        contractPepeNFT
          .connect(acc[0])
          .mint(acc[0].address, { value: mintPrice })
      ).to.changeEtherBalances(
        [contractPepeNFT.address, acc[0].address],
        [mintPrice, mintPriceMinus]
      );

      expect(await contractPepeNFT.ownerOf(0)).to.be.equal(
        acc[0].address
      );
      expect(await contractPepeNFT.adminFee()).to.be.equal(mintPrice);
    });

    it("PASS - diffrent 'to' address", async function () {
      const { contractPepeNFT, acc } = await loadFixture(
        deployOneYearLockFixture
      );

      await expect(
        contractPepeNFT
          .connect(acc[0])
          .mint(acc[1].address, { value: mintPrice })
      ).to.changeEtherBalances(
        [contractPepeNFT.address, acc[0].address],
        [mintPrice, mintPriceMinus]
      );

      expect(await contractPepeNFT.ownerOf(0)).to.be.equal(
        acc[1].address
      );
      expect(await contractPepeNFT.adminFee()).to.be.equal(mintPrice);
    });

    it("PASS - event emit", async function () {
      const { contractPepeNFT, acc } = await loadFixture(
        deployOneYearLockFixture
      );

      await expect(
        contractPepeNFT
          .connect(acc[0])
          .mint(acc[0].address, { value: mintPrice })
      )
        .to.emit(contractPepeNFT, "NftMinted")
        .withArgs(acc[0].address, 0);
    });

    it("PASS - check adminFee with multiple mint", async function () {
      const { contractPepeNFT, acc } = await loadFixture(
        deployOneYearLockFixture
      );
      const adminFee10 = ethers.utils.parseEther("0.05"); // mintPrice * 10

      for (let i = 0; i < 10; i++) {
        await contractPepeNFT
          .connect(acc[i])
          .mint(acc[i].address, { value: mintPrice });
        expect(await contractPepeNFT.ownerOf(i)).to.be.equal(
          acc[i].address
        );
      }
      expect(await contractPepeNFT.adminFee()).to.be.equal(adminFee10);
    });

    it("FAIL - below mintPrice", async function () {
      const { contractPepeNFT, acc } = await loadFixture(
        deployOneYearLockFixture
      );
      const belowMintPrice = ethers.utils.parseEther("0.0005");

      await expect(
        contractPepeNFT
          .connect(acc[0])
          .mint(acc[0].address, { value: belowMintPrice })
      ).to.be.revertedWith("E#0");

      await expect(contractPepeNFT.ownerOf(0)).to.be.revertedWith(
        "ERC721: invalid token ID"
      );
      expect(await contractPepeNFT.adminFee()).to.be.equal(0);
    });

    it("FAIL - above mintPrice", async function () {
      const { contractPepeNFT, acc } = await loadFixture(
        deployOneYearLockFixture
      );
      const aboveMintPrice = ethers.utils.parseEther("5");

      await expect(
        contractPepeNFT
          .connect(acc[0])
          .mint(acc[0].address, { value: aboveMintPrice })
      ).to.be.revertedWith("E#0");

      await expect(contractPepeNFT.ownerOf(0)).to.be.revertedWith(
        "ERC721: invalid token ID"
      );
      expect(await contractPepeNFT.adminFee()).to.be.equal(0);
    });
  });

  describe("changeMintPrice()", function () {
    it("PASS", async function () {
      const { contractPepeNFT, owner } = await loadFixture(
        deployOneYearLockFixture
      );
      const newMintPrice = ethers.utils.parseEther("1");

      expect(await contractPepeNFT.mintPrice()).to.be.equal(mintPrice);
      await contractPepeNFT.connect(owner).changeMintPrice(newMintPrice);
      expect(await contractPepeNFT.mintPrice()).to.be.equal(newMintPrice);
    });

    it("FAIL - not ADMIN_ROLE", async function () {
      const { contractPepeNFT, acc } = await loadFixture(
        deployOneYearLockFixture
      );
      const newMintPrice = ethers.utils.parseEther("1");

      expect(await contractPepeNFT.mintPrice()).to.be.equal(mintPrice);
      await expect(
        contractPepeNFT.connect(acc[0]).changeMintPrice(newMintPrice)
      ).to.be.revertedWith(
        `AccessControl: account ${acc[0].address.toLowerCase()} is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775`
      );
      expect(await contractPepeNFT.mintPrice()).to.be.equal(mintPrice);
    });
  });

  describe("withdrawAdminFee()", function () {
    it("PASS", async function () {
      const { contractPepeNFT, owner, acc } = await loadFixture(
        deployOneYearLockFixture
      );
      const adminFeeToWithdraw = ethers.utils.parseEther("0.01");
      const adminFeeToWithdrawMinus = ethers.utils.parseEther("-0.01");

      await contractPepeNFT
        .connect(acc[0])
        .mint(acc[0].address, { value: mintPrice });
      await contractPepeNFT
        .connect(acc[1])
        .mint(acc[1].address, { value: mintPrice });

      await expect(
        contractPepeNFT.connect(owner).withdrawAdminFee()
      ).to.changeEtherBalances(
        [owner.address, contractPepeNFT.address],
        [adminFeeToWithdraw, adminFeeToWithdrawMinus]
      );
      expect(await contractPepeNFT.adminFee()).to.be.equal(0);
    });

    it("FAIL - not ADMIN_ROLE", async function () {
      const { contractPepeNFT, acc } = await loadFixture(
        deployOneYearLockFixture
      );
      const adminFeeToWithdraw = ethers.utils.parseEther("0.01");

      await contractPepeNFT
        .connect(acc[0])
        .mint(acc[0].address, { value: mintPrice });
      await contractPepeNFT
        .connect(acc[1])
        .mint(acc[1].address, { value: mintPrice });

      await expect(
        contractPepeNFT.connect(acc[0]).withdrawAdminFee()
      ).to.be.revertedWith(
        `AccessControl: account ${acc[0].address.toLowerCase()} is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775`
      );
      expect(await contractPepeNFT.adminFee()).to.be.equal(
        adminFeeToWithdraw
      );
    });
  });

  describe("startSale()", function () {
    it("PASS", async function () {
      const { contractPepeNFT, acc } = await loadFixture(
        deployOneYearLockFixture
      );
      const tokenId = 0;

      await contractPepeNFT
        .connect(acc[0])
        .mint(acc[0].address, { value: mintPrice });
      await contractPepeNFT
        .connect(acc[0])
        .approve(contractPepeNFT.address, tokenId);

      await contractPepeNFT
        .connect(acc[0])
        .startSale(tokenId, tokenSalePrice);

      expect(await contractPepeNFT.ownerOf(tokenId)).to.be.equal(
        contractPepeNFT.address
      );
      expect(
        (await contractPepeNFT.tokenIdToSale(tokenId))[0]
      ).to.be.equal(acc[0].address);
      expect(
        (await contractPepeNFT.tokenIdToSale(tokenId))[1]
      ).to.be.equal(tokenSalePrice);
    });

    it("PASS - event emit", async function () {
      const { contractPepeNFT, acc } = await loadFixture(
        deployOneYearLockFixture
      );
      const tokenId = 0;

      await contractPepeNFT
        .connect(acc[0])
        .mint(acc[0].address, { value: mintPrice });
      await contractPepeNFT
        .connect(acc[0])
        .approve(contractPepeNFT.address, tokenId);

      await expect(
        contractPepeNFT
          .connect(acc[0])
          .startSale(tokenId, tokenSalePrice)
      )
        .to.emit(contractPepeNFT, "NftPutOnSale")
        .withArgs(tokenId, tokenSalePrice);
    });

    it("FAIL - price equals 0", async function () {
      const { contractPepeNFT, acc } = await loadFixture(
        deployOneYearLockFixture
      );
      const tokenId = 0;

      await contractPepeNFT
        .connect(acc[0])
        .mint(acc[0].address, { value: mintPrice });
      await contractPepeNFT
        .connect(acc[0])
        .approve(contractPepeNFT.address, tokenId);

      await expect(
        contractPepeNFT.connect(acc[0]).startSale(tokenId, 0)
      ).to.be.revertedWith("E#3");

      expect(await contractPepeNFT.ownerOf(tokenId)).to.be.equal(
        acc[0].address
      );
      expect(
        (await contractPepeNFT.tokenIdToSale(tokenId))[0]
      ).to.be.equal(addrNull);
      expect(
        (await contractPepeNFT.tokenIdToSale(tokenId))[1]
      ).to.be.equal(0);
    });

    it("FAIL - not owner of token", async function () {
      const { contractPepeNFT, acc } = await loadFixture(
        deployOneYearLockFixture
      );
      const tokenId = 0;

      await contractPepeNFT
        .connect(acc[0])
        .mint(acc[0].address, { value: mintPrice });
      await contractPepeNFT
        .connect(acc[0])
        .approve(contractPepeNFT.address, tokenId);

      await expect(
        contractPepeNFT
          .connect(acc[1])
          .startSale(tokenId, tokenSalePrice)
      ).to.be.revertedWith("E#2");

      expect(await contractPepeNFT.ownerOf(tokenId)).to.be.equal(
        acc[0].address
      );
      expect(
        (await contractPepeNFT.tokenIdToSale(tokenId))[0]
      ).to.be.equal(addrNull);
      expect(
        (await contractPepeNFT.tokenIdToSale(tokenId))[1]
      ).to.be.equal(0);
    });
  });

  describe("cancelSale()", function () {
    it("PASS", async function () {
      const { contractPepeNFT, acc } = await loadFixture(
        deployOneYearLockFixture
      );
      const tokenId = 0;

      await contractPepeNFT
        .connect(acc[0])
        .mint(acc[0].address, { value: mintPrice });
      await contractPepeNFT
        .connect(acc[0])
        .approve(contractPepeNFT.address, tokenId);
      await contractPepeNFT
        .connect(acc[0])
        .startSale(tokenId, tokenSalePrice);

      await contractPepeNFT.connect(acc[0]).cancelSale(tokenId);

      expect(await contractPepeNFT.ownerOf(tokenId)).to.be.equal(
        acc[0].address
      );
      expect(
        (await contractPepeNFT.tokenIdToSale(tokenId))[0]
      ).to.be.equal(addrNull);
      expect(
        (await contractPepeNFT.tokenIdToSale(tokenId))[1]
      ).to.be.equal(0);
    });

    it("FAIL - token not on sale", async function () {
      const { contractPepeNFT, acc } = await loadFixture(
        deployOneYearLockFixture
      );
      const tokenId = 0;

      await contractPepeNFT
        .connect(acc[0])
        .mint(acc[0].address, { value: mintPrice });
      await contractPepeNFT
        .connect(acc[0])
        .approve(contractPepeNFT.address, tokenId);

      await expect(
        contractPepeNFT.connect(acc[0]).cancelSale(tokenId)
      ).to.be.revertedWith("E#5");

      expect(await contractPepeNFT.ownerOf(tokenId)).to.be.equal(
        acc[0].address
      );
      expect(
        (await contractPepeNFT.tokenIdToSale(tokenId))[0]
      ).to.be.equal(addrNull);
      expect(
        (await contractPepeNFT.tokenIdToSale(tokenId))[1]
      ).to.be.equal(0);
    });

    it("FAIL - not owner of token on sale", async function () {
      const { contractPepeNFT, acc } = await loadFixture(
        deployOneYearLockFixture
      );
      const tokenId = 0;

      await contractPepeNFT
        .connect(acc[0])
        .mint(acc[0].address, { value: mintPrice });
      await contractPepeNFT
        .connect(acc[0])
        .approve(contractPepeNFT.address, tokenId);
      await contractPepeNFT
        .connect(acc[0])
        .startSale(tokenId, tokenSalePrice);

      await expect(
        contractPepeNFT.connect(acc[1]).cancelSale(tokenId)
      ).to.be.revertedWith("E#4");

      expect(await contractPepeNFT.ownerOf(tokenId)).to.be.equal(
        contractPepeNFT.address
      );
      expect(
        (await contractPepeNFT.tokenIdToSale(tokenId))[0]
      ).to.be.equal(acc[0].address);
      expect(
        (await contractPepeNFT.tokenIdToSale(tokenId))[1]
      ).to.be.equal(tokenSalePrice);
    });
  });

  describe("changeTokenPrice()", function () {
    it("PASS", async function () {
      const { contractPepeNFT, acc } = await loadFixture(
        deployOneYearLockFixture
      );
      const tokenId = 0;
      const newTokenSalePrice = ethers.utils.parseEther("2");

      await contractPepeNFT
        .connect(acc[0])
        .mint(acc[0].address, { value: mintPrice });
      await contractPepeNFT
        .connect(acc[0])
        .approve(contractPepeNFT.address, tokenId);
      await contractPepeNFT
        .connect(acc[0])
        .startSale(tokenId, tokenSalePrice);

      await contractPepeNFT
        .connect(acc[0])
        .changeTokenPrice(tokenId, newTokenSalePrice);

      expect(await contractPepeNFT.ownerOf(tokenId)).to.be.equal(
        contractPepeNFT.address
      );
      expect(
        (await contractPepeNFT.tokenIdToSale(tokenId))[0]
      ).to.be.equal(acc[0].address);
      expect(
        (await contractPepeNFT.tokenIdToSale(tokenId))[1]
      ).to.be.equal(newTokenSalePrice);
    });

    it("FAIL - token not on sale", async function () {
      const { contractPepeNFT, acc } = await loadFixture(
        deployOneYearLockFixture
      );
      const tokenId = 0;
      const newTokenSalePrice = ethers.utils.parseEther("2");

      await contractPepeNFT
        .connect(acc[0])
        .mint(acc[0].address, { value: mintPrice });
      await contractPepeNFT
        .connect(acc[0])
        .approve(contractPepeNFT.address, tokenId);

      await expect(
        contractPepeNFT
          .connect(acc[0])
          .changeTokenPrice(tokenId, newTokenSalePrice)
      ).to.be.revertedWith("E#5");

      expect(await contractPepeNFT.ownerOf(tokenId)).to.be.equal(
        acc[0].address
      );
      expect(
        (await contractPepeNFT.tokenIdToSale(tokenId))[0]
      ).to.be.equal(addrNull);
      expect(
        (await contractPepeNFT.tokenIdToSale(tokenId))[1]
      ).to.be.equal(0);
    });

    it("FAIL - not owner of token on sale", async function () {
      const { contractPepeNFT, acc } = await loadFixture(
        deployOneYearLockFixture
      );
      const tokenId = 0;
      const newTokenSalePrice = ethers.utils.parseEther("2");

      await contractPepeNFT
        .connect(acc[0])
        .mint(acc[0].address, { value: mintPrice });
      await contractPepeNFT
        .connect(acc[0])
        .approve(contractPepeNFT.address, tokenId);
      await contractPepeNFT
        .connect(acc[0])
        .startSale(tokenId, tokenSalePrice);

      await expect(
        contractPepeNFT
          .connect(acc[1])
          .changeTokenPrice(tokenId, newTokenSalePrice)
      ).to.be.revertedWith("E#4");

      expect(await contractPepeNFT.ownerOf(tokenId)).to.be.equal(
        contractPepeNFT.address
      );
      expect(
        (await contractPepeNFT.tokenIdToSale(tokenId))[0]
      ).to.be.equal(acc[0].address);
      expect(
        (await contractPepeNFT.tokenIdToSale(tokenId))[1]
      ).to.be.equal(tokenSalePrice);
    });
  });

  describe("buyTokenOnSale()", function () {
    it("PASS", async function () {
      const { contractPepeNFT, acc } = await loadFixture(
        deployOneYearLockFixture
      );
      const tokenId = 0;

      await contractPepeNFT
        .connect(acc[0])
        .mint(acc[0].address, { value: mintPrice });
      await contractPepeNFT
        .connect(acc[0])
        .approve(contractPepeNFT.address, tokenId);
      await contractPepeNFT
        .connect(acc[0])
        .startSale(tokenId, tokenSalePrice);

      await expect(
        contractPepeNFT
          .connect(acc[1])
          .buyTokenOnSale(tokenId, { value: tokenSalePrice })
      ).to.be.changeEtherBalances(
        [acc[0].address, acc[1].address],
        [tokenSalePrice, tokenSalePriceMinus]
      );

      expect(await contractPepeNFT.ownerOf(tokenId)).to.be.equal(
        acc[1].address
      );
      expect(
        (await contractPepeNFT.tokenIdToSale(tokenId))[0]
      ).to.be.equal(addrNull);
      expect(
        (await contractPepeNFT.tokenIdToSale(tokenId))[1]
      ).to.be.equal(0);
    });

    it("PASS - event emit", async function () {
      const { contractPepeNFT, acc } = await loadFixture(
        deployOneYearLockFixture
      );
      const tokenId = 0;

      await contractPepeNFT
        .connect(acc[0])
        .mint(acc[0].address, { value: mintPrice });
      await contractPepeNFT
        .connect(acc[0])
        .approve(contractPepeNFT.address, tokenId);
      await contractPepeNFT
        .connect(acc[0])
        .startSale(tokenId, tokenSalePrice);

      await expect(
        contractPepeNFT
          .connect(acc[1])
          .buyTokenOnSale(tokenId, { value: tokenSalePrice })
      )
        .to.emit(contractPepeNFT, "NftSold")
        .withArgs(tokenId, tokenSalePrice);
    });

    it("FAIL - token not on sale", async function () {
      const { contractPepeNFT, acc } = await loadFixture(
        deployOneYearLockFixture
      );
      const tokenId = 0;

      await contractPepeNFT
        .connect(acc[0])
        .mint(acc[0].address, { value: mintPrice });
      await contractPepeNFT
        .connect(acc[0])
        .approve(contractPepeNFT.address, tokenId);

      await expect(
        contractPepeNFT
          .connect(acc[1])
          .buyTokenOnSale(tokenId, { value: tokenSalePrice })
      ).to.be.revertedWith("E#5");

      expect(await contractPepeNFT.ownerOf(tokenId)).to.be.equal(
        acc[0].address
      );
      expect(
        (await contractPepeNFT.tokenIdToSale(tokenId))[0]
      ).to.be.equal(addrNull);
      expect(
        (await contractPepeNFT.tokenIdToSale(tokenId))[1]
      ).to.be.equal(0);
    });

    it("FAIL - different price", async function () {
      const { contractPepeNFT, acc } = await loadFixture(
        deployOneYearLockFixture
      );
      const tokenId = 0;

      await contractPepeNFT
        .connect(acc[0])
        .mint(acc[0].address, { value: mintPrice });
      await contractPepeNFT
        .connect(acc[0])
        .approve(contractPepeNFT.address, tokenId);
      await contractPepeNFT
        .connect(acc[0])
        .startSale(tokenId, tokenSalePrice);

      await expect(
        contractPepeNFT
          .connect(acc[1])
          .buyTokenOnSale(tokenId, { value: 0 })
      ).to.be.revertedWith("E#0");

      expect(await contractPepeNFT.ownerOf(tokenId)).to.be.equal(
        contractPepeNFT.address
      );
      expect(
        (await contractPepeNFT.tokenIdToSale(tokenId))[0]
      ).to.be.equal(acc[0].address);
      expect(
        (await contractPepeNFT.tokenIdToSale(tokenId))[1]
      ).to.be.equal(tokenSalePrice);
    });
  });
});
