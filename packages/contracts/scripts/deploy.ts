import hre from "hardhat";

async function main() {
  const [deployer, authority] = await hre.ethers.getSigners();
  const Registry = await hre.ethers.getContractFactory("HalalCertificateRegistry");
  const registry = await Registry.deploy(authority.address);

  await registry.waitForDeployment();

  console.log("HalalCertificateRegistry deployed to:", await registry.getAddress());
  console.log("Admin:", deployer.address);
  console.log("Authority:", authority.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
