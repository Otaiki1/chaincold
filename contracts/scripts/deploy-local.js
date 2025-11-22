const hre = require("hardhat");

async function main() {
  const [deployer, gateway] = await hre.ethers.getSigners();

  console.log("Deployer:", deployer.address);
  console.log("Gateway (sample):", gateway.address);

  // Deploy MockUSDC
  const Mock = await hre.ethers.getContractFactory("MockERC20");
  const mock = await Mock.deploy("Mock USDC", "mUSDC");
  await mock.deployed();

  console.log("MockUSDC:", mock.address);

  // Mint some tokens to deployer and gateway (6 decimals)
  const mintAmt = hre.ethers.utils.parseUnits("10000", 6);
  await mock.mint(deployer.address, mintAmt);
  await mock.mint(gateway.address, mintAmt);
  console.log("Minted tokens.");

  // Deploy ShipmentRegistry
  const Reg = await hre.ethers.getContractFactory("ShipmentRegistry");
  const reg = await Reg.deploy();
  await reg.deployed();

  console.log("ShipmentRegistry:", reg.address);

  // Authorize the sample gateway address as an authorized gateway
  const tx = await reg.setGateway(gateway.address, true);
  await tx.wait();

  console.log("Authorized gateway:", gateway.address);

  console.log("All done. Save these addresses for the relayer:");
  console.log("MOCK_TOKEN=", mock.address);
  console.log("REGISTRY=", reg.address);
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});


