const { expectRevert } = require('@openzeppelin/test-helpers');
require("dotenv").config({ path: "../.env" });
const Token = artifacts.require("MyToken");
const Bank = artifacts.require("Bank");

contract("Bank Test", async accounts => {
    let tokenInstance, bankInstance, rewardPool, contractBalance, timePeriod, r1, r2, r3;
    let initialReward = 1000;
    let t = 12;

    const sleep = (milliseconds) => {
        const date = Date.now();
        let currentDate = null;
        do {
            currentDate = Date.now();
        } while (currentDate - date < milliseconds);
    }

    beforeEach(async () => {
        tokenInstance = await Token.new(process.env.INITIAL_TOKENS, process.env.TOKEN_NAME, process.env.TOKEN_SYMBOL);
        bankInstance = await Bank.new(tokenInstance.address, initialReward, t);
        await tokenInstance.transfer(
            bankInstance.address,
            process.env.TOKEN_REWARD_POOL
        );
        r1 = await bankInstance.r1();
        r2 = await bankInstance.r2();
        r3 = await bankInstance.r3();
        await tokenInstance.transfer(accounts[1], 1000);
        await tokenInstance.transfer(accounts[2], 4000);
        await tokenInstance.transfer(accounts[3], 5000);
    });

    it("Should has be correctly deployed", async () => {
        rewardPool = await bankInstance.tokenRewardPool();
        timePeriod = await bankInstance.timePeriod();
        assert.equal(initialReward, rewardPool.toNumber(), "Reward Pool is not set correctly");
        assert.equal(t, timePeriod.toNumber(), "Time Period is not set correctly");
        assert.equal(initialReward * 0.2, r1.toNumber(), "R1 is not set correctly");
        assert.equal(initialReward * 0.3, r2.toNumber(), "R2 is not set correctly");
        assert.equal(initialReward * 0.5, r3.toNumber(), "R3 is not set correctly");
    });

    it("Can deposit before t has passed", async () => {
        const amount = 1000;
        await tokenInstance.approve(bankInstance.address, amount, { from: accounts[0] });
        await bankInstance.deposit(amount, { from: accounts[0] });
        let balance = await bankInstance.balanceOf(accounts[0]);
        contractBalance = await bankInstance.contractBalance();
        assert.equal(amount, balance.toNumber(), "Account's Contract Balance didn't set correctly");
        assert.equal(amount, contractBalance.toNumber(), "Contract Balance didn't set correctly");
    });

    it("Can't deposit after t has passed", async () => {
        const amount = 1000;
        await tokenInstance.approve(bankInstance.address, amount, { from: accounts[0] });
        sleep(t * 1000 + 1);
        await expectRevert(
            bankInstance.deposit(amount, { from: accounts[0] }),
            'We are no longer accepting deposits.'
        );
        let balance = await bankInstance.balanceOf(accounts[0]);
        contractBalance = await bankInstance.contractBalance();
        assert.notEqual(amount, balance.toNumber(), "Account's Contract Balance has changed");
        assert.notEqual(amount, contractBalance.toNumber(), "Contract Balance has changed");
    });

    it("Can't deposit zero amount", async () => {
        const amount = 0;
        await tokenInstance.approve(bankInstance.address, amount, { from: accounts[0] });
        await expectRevert(
            bankInstance.deposit(amount, { from: accounts[0] }),
            'You need to deposit at least some tokens'
        );
        let balance = await bankInstance.balanceOf(accounts[0]);
        contractBalance = await bankInstance.contractBalance();
        assert.equal(amount, balance.toNumber(), "Account's Contract Balance is not zero");
        assert.equal(amount, contractBalance.toNumber(), "Contract Balance is not zero");
    });

    it("Can't deposit with zero allowance", async () => {
        const amount = 1000;
        await expectRevert(
            bankInstance.deposit(amount, { from: accounts[0] }),
            'Check the token allowance'
        );
        let balance = await bankInstance.balanceOf(accounts[0]);
        contractBalance = await bankInstance.contractBalance();
        assert.notEqual(amount, balance.toNumber(), "Account's Contract Balance has changed");
        assert.notEqual(amount, contractBalance.toNumber(), "Contract Balance has changed");
    });

    it("Can't withdraw before 2t has passed", async () => {
        const amount = 1000;
        await tokenInstance.approve(bankInstance.address, amount, { from: accounts[0] });
        await bankInstance.deposit(amount, { from: accounts[0] });
        await expectRevert(
            bankInstance.withdraw(),
            'Withdrawals are not allowed yet.'
        );
        let balance = await bankInstance.balanceOf(accounts[0]);
        contractBalance = await bankInstance.contractBalance();
        assert.equal(amount, balance.toNumber(), "Withdraw wrongly done");
        assert.equal(amount, contractBalance.toNumber(), "Withdraw wrongly done");
    });

    it("Can't withdraw without funds.", async () => {
        sleep(2 * t * 1000 + 1);
        await expectRevert(
            bankInstance.withdraw(),
            'Insufficient funds.'
        );
        let balance = await bankInstance.balanceOf(accounts[0]);
        contractBalance = await bankInstance.contractBalance();
        assert.equal(0, balance.toNumber(), "Withdraw wrongly done");
        assert.equal(0, contractBalance.toNumber(), "Withdraw wrongly done");
    });

    it("Can withdraw - R1 Case.", async () => {
        const amount = 1000;
        const amount2 = 4000;
        await tokenInstance.approve(bankInstance.address, amount, { from: accounts[1] });
        await bankInstance.deposit(amount, { from: accounts[1] });
        await tokenInstance.approve(bankInstance.address, amount2, { from: accounts[2] });
        await bankInstance.deposit(amount2, { from: accounts[2] });
        const balance = await bankInstance.balanceOf(accounts[1]);
        contractBalance = await bankInstance.contractBalance();
        sleep(2 * t * 1000 + 1);
        await bankInstance.withdraw({ from: accounts[1] });
        const finalBalance = amount + ((balance.toNumber() / contractBalance.toNumber()) * r1.toNumber());
        console.log(finalBalance);
        const tokenFinalBalance = await tokenInstance.balanceOf(accounts[1]);
        console.log(tokenFinalBalance.toNumber());
        assert.equal(finalBalance, tokenFinalBalance.toNumber(), "Withdraw wrongly done");
    });

    it("Can withdraw - R2 Case 1 - Someone already withdrawn at R1.", async () => {
        const amount = 1000;
        const amount2 = 4000;
        await tokenInstance.approve(bankInstance.address, amount, { from: accounts[1] });
        await bankInstance.deposit(amount, { from: accounts[1] });
        await tokenInstance.approve(bankInstance.address, amount2, { from: accounts[2] });
        await bankInstance.deposit(amount2, { from: accounts[2] });
        const balance = await bankInstance.balanceOf(accounts[1]);
        const balance2 = await bankInstance.balanceOf(accounts[2]);
        const contractBalanceBefore = await bankInstance.contractBalance();
        sleep(2 * t * 1000 + 1);
        await bankInstance.withdraw({ from: accounts[1] });
        const contractBalanceAfter = await bankInstance.contractBalance();
        sleep(t * 1000);
        await bankInstance.withdraw({ from: accounts[2] });
        r1 = r1.toNumber() - ((balance.toNumber() / contractBalanceBefore.toNumber()) * r1.toNumber());
        const finalBalance = amount2 + ((balance2.toNumber() / contractBalanceAfter.toNumber()) * r1) + ((balance2.toNumber() / contractBalanceAfter.toNumber()) * r2.toNumber());
        console.log(finalBalance);
        const tokenFinalBalance = await tokenInstance.balanceOf(accounts[2]);
        console.log(tokenFinalBalance.toNumber());
        assert.equal(finalBalance, tokenFinalBalance.toNumber(), "Withdraw wrongly done");
    });

    it("Can withdraw - R2 Case 2 - No one withdrawn at R1.", async () => {
        const amount = 1000;
        const amount2 = 4000;
        await tokenInstance.approve(bankInstance.address, amount, { from: accounts[1] });
        await bankInstance.deposit(amount, { from: accounts[1] });
        await tokenInstance.approve(bankInstance.address, amount2, { from: accounts[2] });
        await bankInstance.deposit(amount2, { from: accounts[2] });
        const balance = await bankInstance.balanceOf(accounts[1]);
        const balance2 = await bankInstance.balanceOf(accounts[2]);
        const contractBalanceBefore = await bankInstance.contractBalance();
        sleep(3 * t * 1000 + 1);
        await bankInstance.withdraw({ from: accounts[1] });
        const contractBalanceAfter = await bankInstance.contractBalance();
        await bankInstance.withdraw({ from: accounts[2] });
        r1 = r1.toNumber() - ((balance.toNumber() / contractBalanceBefore.toNumber()) * r1.toNumber());
        console.log(r1);
        r2 = r2.toNumber() - ((balance.toNumber() / contractBalanceBefore.toNumber()) * r2.toNumber());
        console.log(r2);
        sleep(2000);
        const finalBalance = amount2 + ((balance2.toNumber() / contractBalanceAfter.toNumber()) * r1) + ((balance2.toNumber() / contractBalanceAfter.toNumber()) * r2);
        console.log(finalBalance);
        const tokenFinalBalance = await tokenInstance.balanceOf(accounts[2]);
        console.log(tokenFinalBalance.toNumber());
        assert.equal(finalBalance, tokenFinalBalance.toNumber(), "Withdraw wrongly done");
    });

    it("Can withdraw - R3 Case 1 - Someone already withdrawn at R1 and at R2.", async () => {
        const amount = 1000;
        const amount2 = 4000;
        const amount3 = 5000;
        await tokenInstance.approve(bankInstance.address, amount, { from: accounts[1] });
        await bankInstance.deposit(amount, { from: accounts[1] });
        await tokenInstance.approve(bankInstance.address, amount2, { from: accounts[2] });
        await bankInstance.deposit(amount2, { from: accounts[2] });
        await tokenInstance.approve(bankInstance.address, amount3, { from: accounts[3] });
        await bankInstance.deposit(amount3, { from: accounts[3] });
        const balance = await bankInstance.balanceOf(accounts[1]);
        const balance2 = await bankInstance.balanceOf(accounts[2]);
        const balance3 = await bankInstance.balanceOf(accounts[3]);
        contractBalance = await bankInstance.contractBalance({ gas: 3000000 });
        sleep(2 * t * 1000 + 1);
        await bankInstance.withdraw({ from: accounts[1] });
        const contractBalance2 = await bankInstance.contractBalance();
        sleep(t * 1000);
        await bankInstance.withdraw({ from: accounts[2], gas: 3000000 });
        const contractBalance3 = await bankInstance.contractBalance();
        sleep(t * 1000);
        await bankInstance.withdraw({ from: accounts[3] });
        r1 = r1.toNumber() - ((balance.toNumber() / contractBalance.toNumber()) * r1.toNumber());
        r1 = r1 - ((balance2.toNumber() / contractBalance2.toNumber()) * r1);
        console.log(r1);
        r2 = r2.toNumber() - Math.round(((balance2.toNumber() / contractBalance2.toNumber()) * r2.toNumber()));
        console.log(r2);
        console.log(r3.toNumber());
        sleep(2000);
        const finalBalance = amount3 + ((balance3.toNumber() / contractBalance3.toNumber()) * r1) + ((balance3.toNumber() / contractBalance3.toNumber()) * r2) + r3.toNumber();
        console.log(finalBalance);
        const tokenFinalBalance = await tokenInstance.balanceOf(accounts[3]);
        console.log(tokenFinalBalance.toNumber());
        assert.equal(finalBalance, tokenFinalBalance.toNumber(), "Withdraw wrongly done");
    });

    it("Can withdraw - R3 Case 2 - No one withdrawn at R1 but someone already withdrawn at R2.", async () => {
        const amount = 1000;
        const amount2 = 4000;
        const amount3 = 5000;
        await tokenInstance.approve(bankInstance.address, amount, { from: accounts[1] });
        await bankInstance.deposit(amount, { from: accounts[1] });
        await tokenInstance.approve(bankInstance.address, amount2, { from: accounts[2] });
        await bankInstance.deposit(amount2, { from: accounts[2] });
        await tokenInstance.approve(bankInstance.address, amount3, { from: accounts[3] });
        await bankInstance.deposit(amount3, { from: accounts[3] });
        const balance = await bankInstance.balanceOf(accounts[1]);
        const balance2 = await bankInstance.balanceOf(accounts[2]);
        const balance3 = await bankInstance.balanceOf(accounts[3]);
        contractBalance = await bankInstance.contractBalance();
        sleep(3 * t * 1000 + 1);
        await bankInstance.withdraw({ from: accounts[1] });
        await bankInstance.withdraw({ from: accounts[2], gas: 3000000 });
        const contractBalance2 = await bankInstance.contractBalance();
        sleep(t * 1000);
        await bankInstance.withdraw({ from: accounts[3] });
        r1 = r1.toNumber() - ((balance.toNumber() / contractBalance.toNumber()) * r1.toNumber()) - ((balance2.toNumber() / contractBalance.toNumber()) * r1.toNumber());
        console.log(r1);
        r2 = r2.toNumber() - ((balance.toNumber() / contractBalance.toNumber()) * r2.toNumber()) - ((balance2.toNumber() / contractBalance.toNumber()) * r2.toNumber());
        console.log(r2);
        sleep(2000);
        const finalBalance = amount3 + ((balance3.toNumber() / contractBalance2.toNumber()) * r1) + ((balance3.toNumber() / contractBalance2.toNumber()) * r2) + r3.toNumber();
        console.log(finalBalance);
        const tokenFinalBalance = await tokenInstance.balanceOf(accounts[3]);
        console.log(tokenFinalBalance.toNumber());
        assert.equal(finalBalance, tokenFinalBalance.toNumber(), "Withdraw wrongly done");
    });

    it("Can withdraw - R3 Case 3 - Someone already withdrawn at R1 but no one withdrawn at R2.", async () => {
        const amount = 1000;
        const amount2 = 4000;
        const amount3 = 5000;
        await tokenInstance.approve(bankInstance.address, amount, { from: accounts[1] });
        await bankInstance.deposit(amount, { from: accounts[1] });
        await tokenInstance.approve(bankInstance.address, amount2, { from: accounts[2] });
        await bankInstance.deposit(amount2, { from: accounts[2] });
        await tokenInstance.approve(bankInstance.address, amount3, { from: accounts[3] });
        await bankInstance.deposit(amount3, { from: accounts[3] });
        const balance = await bankInstance.balanceOf(accounts[1]);
        const balance2 = await bankInstance.balanceOf(accounts[2]);
        const balance3 = await bankInstance.balanceOf(accounts[3]);
        contractBalance = await bankInstance.contractBalance();
        sleep(2 * t * 1000 + 1);
        await bankInstance.withdraw({ from: accounts[1] });
        await bankInstance.withdraw({ from: accounts[2] });
        const contractBalance2 = await bankInstance.contractBalance();
        sleep(2 * t * 1000);
        await bankInstance.withdraw({ from: accounts[3], gas: 3000000 });
        r1 = r1.toNumber() - ((balance.toNumber() / contractBalance.toNumber()) * r1.toNumber()) - ((balance2.toNumber() / contractBalance.toNumber()) * r1.toNumber());
        console.log(r1);
        sleep(2000);
        const finalBalance = amount3 + ((balance3.toNumber() / contractBalance2.toNumber()) * r1) + r2.toNumber() + r3.toNumber();
        console.log(finalBalance);
        const tokenFinalBalance = await tokenInstance.balanceOf(accounts[3]);
        console.log(tokenFinalBalance.toNumber());
        assert.equal(finalBalance, tokenFinalBalance.toNumber(), "Withdraw wrongly done");
    });

    it("Only owner can withdraw remaining funds", async () => {
        await expectRevert(
            bankInstance.bankWithdrawal({ from: accounts[1] }),
            'Ownable: caller is not the owner'
        );
    });

    it("Bank can't withdraw before 4t has passed.", async () => {
        await expectRevert(
            bankInstance.bankWithdrawal(),
            'Bank Withdrawals are not allowed yet.'
        );
    });

    it("Bank can't withdraw while users still have funds on the contract", async () => {
        const amount = 1000;
        await tokenInstance.approve(bankInstance.address, amount, { from: accounts[0] });
        await bankInstance.deposit(amount, { from: accounts[0] });
        sleep(4 * t * 1000 + 1);
        await expectRevert(
            bankInstance.bankWithdrawal(),
            'Bank Withdrawals are not allowed yet.'
        );
    });

    it("Bank should withdraw after 4t has passed and all users has withdrawn their funds", async () => {
        const amount = 1000;
        await tokenInstance.approve(bankInstance.address, amount, { from: accounts[1] });
        await bankInstance.deposit(amount, { from: accounts[1] });
        sleep(2 * t * 1000 + 1);
        await bankInstance.withdraw({ from: accounts[1] });
        sleep(2 * t * 1000);
        const balanceBefore = await tokenInstance.balanceOf(accounts[0]);
        await bankInstance.bankWithdrawal();
        const balanceAfter = await tokenInstance.balanceOf(accounts[0]);
        assert.equal(balanceAfter.toNumber(), balanceBefore.toNumber() + r2.toNumber() + r3.toNumber(), "Bank withdraw wrongly done");
    });

});