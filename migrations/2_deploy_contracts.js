let MyToken = artifacts.require('MyToken.sol');
let Bank = artifacts.require('Bank.sol');
require('dotenv').config({ path: '../.env' });

module.exports = async function (deployer) {
  let addr = await web3.eth.getAccounts();
  let tokenInstance = await deployer.deploy(
    MyToken,
    process.env.INITIAL_TOKENS,
    process.env.TOKEN_NAME,
    process.env.TOKEN_SYMBOL
  );
  await deployer.deploy(
    Bank,
    MyToken.address,
    process.env.TOKEN_REWARD_POOL,
    process.env.TIME_PERIOD
  );
  await tokenInstance.transfer(
    Bank.address,
    process.env.TOKEN_REWARD_POOL
  );
  /* await tokenInstance.transfer(
    addr[1],
    1000
  );
  await tokenInstance.transfer(
    addr[2],
    4000
  );
  await tokenInstance.transfer(
    addr[3],
    5000
  );
  await tokenInstance.transfer(
    addr[4],
    10000
  ); */
};
