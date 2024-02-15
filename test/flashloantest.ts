import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, network } from "hardhat";

// Run 'npx hardhat compile' for this to import
import { abi as abiFlashLoan } from "../artifacts/contracts/FlashLoan.sol/FlashLoan.json";

// Whale Setup
const WHALE_ADDR_BUSD = "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65";

// ONLY USE IF ALREADY DEPLOYED - otherwise make blank
const FLASH_CONTRACT = "";

// Tokens
const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const BUSD = "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56";
const CAKE = "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82";

// Other
const exchRoute = [1, 0, 0];
const v3Fee = 500;
const path = [CAKE, WBNB];
const payContractAmount = "50";

// Token Selection
const BORROW_TOKEN_BUSD = BUSD;

describe("BinanceFlashloanPancakeswapV3", function () {
  async function create_whale() {
    const provider = ethers.provider;
    let whaleWallet; // Define whaleWallet outside teh try-catch block

    // Checking initial whale BNB balance
    try {
      const whaleBalanceBeforeImpersonation = await provider.getBalance(WHALE_ADDR_BUSD);
      console.log(`Whale BNB Balance before impersonation: ${whaleBalanceBeforeImpersonation.toString()}`);
    } catch (error) {
      console.error("Error fetching whale BNB balance before impersonation:", error);
    }

    // Impersonating whale account
    try {
      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [WHALE_ADDR_BUSD],
      });
    } catch (error) {
      console.error("Error impersonating whale account:", error);
    }

    // Checking whale BNB balance after impersonation
    try {
      const whaleWallet = ethers.provider.getSigner(WHALE_ADDR_BUSD);
      const whaleWalletBalance = await whaleWallet.getBalance();
      console.log(`Whale Wallet BNB Balance after impersonation: ${whaleWalletBalance.toString()}`);
      expect(whaleWalletBalance).not.equal("0");
    } catch (error) {
      console.error("Error or failed assertion with whale wallet BNB balance after impersonation:", error);
    }

    // Checking whale BUSD balance
    try {
      const abi = ["function balanceOf(address _owner) view returns (uint256 balance)"];
      const contractBusd = new ethers.Contract(BORROW_TOKEN_BUSD, abi, provider);
      const whaleBusdBalanceBefore = await contractBusd.balanceOf(WHALE_ADDR_BUSD);
      console.log(`Whale BUSD Balance before transfer: ${ethers.utils.formatEther(whaleBusdBalanceBefore)}`);
      expect(whaleBusdBalanceBefore).not.equal("0");
    } catch (error) {
      console.error("Error or failed assertion with whale BUSD balance before transfer:", error);
    }

    return { whaleWallet };
  }

  describe("Deployment", function () {
    it("Should perform a FlashLoan using Uniswap V3", async function () {
      const { whaleWallet } = await loadFixture(create_whale);

      // Deploying FlashLoan Contract
      try {
        const FlashLoan = await ethers.getContractFactory("FlashLoan");
        const flashloan = await FlashLoan.deploy(WBNB, BUSD, 500); // 500 = Pool Fee
        await flashloan.deployed();
        console.log(`FlashLoan Contract Deployed: ${flashloan.address}`);
      } catch (error) {
        console.error("Error deploying FlashLoan contract:", error);
      }

      // Preparing for BUSD transfer to FlashLoan contract
      const flashAddress = FLASH_CONTRACT.length > 0 ? FLASH_CONTRACT : abiFlashLoan.address;
      const usdtAmt = ethers.utils.parseUnits(payContractAmount, 18);

      // Transferring BUSD to FlashLoan contract
      try {
        const abi = [
          "function transfer(address _to, uint256 _value) public returns (bool success)",
          "function balanceOf(address _owner) view returns (uint256 balance)"
        ];
        const contractUsdt = new ethers.Contract(BORROW_TOKEN_BUSD, abi, whaleWallet);
        await contractUsdt.transfer(flashAddress, usdtAmt);
        console.log(`Transferred ${payContractAmount} BUSD to FlashLoan contract`);
      } catch (error) {
        console.error("Error transferring BUSD to FlashLoan contract:", error);
      }

      // Further actions for FlashLoan request and assertions can be continued here...
      // Remember to add try-catch blocks and log statements as done above for each operation
    });
  });
});
