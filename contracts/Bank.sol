// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Bank is Ownable{
    IERC20 public token;
    uint public tokenRewardPool;
    uint public r1;
    uint public r2;
    uint public r3;
    uint public timePeriod;
    uint public timeContractLaunched;
    mapping(address => uint) public balanceOf;
    uint public contractBalance;
    uint private users;

    event Deposit(address sender, uint amount);
    event Withdrawal(address sender, uint amount);

    constructor (IERC20 _token, uint32 _tokenRewardPool, uint _timePeriod) {
        token = _token;
        tokenRewardPool = _tokenRewardPool;
        r1 = 20 * tokenRewardPool / 100;
        r2 = 30 * tokenRewardPool / 100;
        r3 = 50 * tokenRewardPool / 100;
        timePeriod = _timePeriod;
        timeContractLaunched = block.timestamp;
    }

    function deposit(uint256 amount) public {
        require(block.timestamp - timeContractLaunched < timePeriod, "We are no longer accepting deposits.");
        require(amount > 0, "You need to deposit at least some tokens");
        uint allowance = token.allowance(msg.sender, address(this));
        require(allowance >= amount, "Check the token allowance");
        token.transferFrom(msg.sender, address(this), amount);
        balanceOf[msg.sender] += amount;
        contractBalance += amount;
        users++;
        emit Deposit(msg.sender, amount);
    }

    function withdraw() public {
        uint timeNow = block.timestamp;
        require(timeNow > timeContractLaunched + 2 * timePeriod, "Withdrawals are not allowed yet.");
        require(balanceOf[msg.sender] > 0, "Insufficient funds.");
        if (timeNow > timeContractLaunched + 2 * timePeriod && timeNow < timeContractLaunched + 3 * timePeriod) {
            uint amountr1 = r1 * balanceOf[msg.sender] / contractBalance;
            uint amount = balanceOf[msg.sender] + amountr1;
            token.transfer(msg.sender, amount);
            contractBalance -= balanceOf[msg.sender];
            balanceOf[msg.sender] = 0;
            r1 -= amountr1;
            users--;
            emit Withdrawal(msg.sender, amount);            
        } else if(timeNow > timeContractLaunched + 3 * timePeriod && timeNow < timeContractLaunched + 4 * timePeriod) {
            uint amountr1 = r1 * balanceOf[msg.sender] / contractBalance;
            uint amountr2 = r2 * balanceOf[msg.sender] / contractBalance;
            uint amount = balanceOf[msg.sender] + amountr1 + amountr2;
            token.transfer(msg.sender, amount);
            contractBalance -= balanceOf[msg.sender];
            balanceOf[msg.sender] = 0;
            r1 -= amountr1;
            r2 -= amountr2;
            users--;
            emit Withdrawal(msg.sender, amount);
        } else if(timeNow > timeContractLaunched + 4 * timePeriod) {
            uint amountr1 = r1 * balanceOf[msg.sender] / contractBalance;
            uint amountr2 = r2 * balanceOf[msg.sender] / contractBalance;
            uint amountr3 = r3 * balanceOf[msg.sender] / contractBalance;
            uint amount = balanceOf[msg.sender] + amountr1 + amountr2 + amountr3;
            token.transfer(msg.sender, amount);
            contractBalance -= balanceOf[msg.sender];
            balanceOf[msg.sender] = 0;
            r1 -= amountr1;
            r2 -= amountr2;
            r3 -= amountr3;
            users--;
            emit Withdrawal(msg.sender, amount);
        }        
    }

    function bankWithdrawal() public onlyOwner {
        uint timeNow = block.timestamp;
        require(timeNow > timeContractLaunched + 4 * timePeriod && users == 0, "Bank Withdrawals are not allowed yet.");
        uint amount = r1 + r2 + r3;
        token.transfer(msg.sender, amount);
        r1 = 0;
        r2 = 0;
        r3 = 0;        
        emit Withdrawal(msg.sender, amount);
    }
}