import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedCipherArchive = await deploy("CipherArchive", {
    from: deployer,
    log: true,
  });

  console.log(`CipherArchive contract: `, deployedCipherArchive.address);
};
export default func;
func.id = "deploy_cipherArchive"; // id required to prevent reexecution
func.tags = ["CipherArchive"];
