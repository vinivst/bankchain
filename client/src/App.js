import React, { Component } from "react";
import MyToken from './contracts/MyToken.json';
import Bank from './contracts/Bank.json';
import getWeb3 from "./getWeb3";
import {
  Container,
  Row,
  Col,
  InputGroup,
  InputGroupText,
  Input,
  Button,
  Card,
  CardText,
  CardBody,
  CardTitle,
} from 'reactstrap';

import "./App.css";

class App extends Component {
  state = {
    loaded: false,
    bankAddress: Bank.address,
    amount: 0,
    bank: null,
    myToken: null,
    accounts: null,
    depositAmount: 0
  };



  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();
      console.log(accounts);

      // Get the contract instance.
      const networkId = await web3.eth.net.getId();

      const myToken = await new web3.eth.Contract(
        MyToken.abi,
        MyToken.networks[networkId] &&
        MyToken.networks[networkId].address
      );

      console.log(MyToken.networks[networkId].address);

      const bank = new web3.eth.Contract(
        Bank.abi,
        Bank.networks[networkId] &&
        Bank.networks[networkId].address
      );

      let tokenRewardPool = await bank.methods.tokenRewardPool().call();
      console.log(tokenRewardPool);

      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ loaded: true, bank: bank, myToken: myToken, accounts: accounts });
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };

  handleInputChange = (event) => {
    const target = event.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;
    this.setState({
      [name]: value,
    });
    //console.log(kycAddress);
    //console.log(this.kycContract.options.address);
  };

  handleApprove = async () => {
    const { amount, myToken, accounts, bank } = this.state;
    await myToken.methods
      .approve(bank._address, amount)
      .send({ from: accounts[0] });
    alert('Account ' + accounts[0] + ' approved ' + amount + 'to be spent.');
  };

  handleDeposit = async () => {
    const { depositAmount, accounts, bank } = this.state;
    await bank.methods
      .deposit(depositAmount)
      .send({ from: accounts[0] });
    alert('Account ' + accounts[0] + ' deposited ' + depositAmount);
  };

  handleWithdraw = async () => {
    const { accounts, bank } = this.state;
    await bank.methods
      .withdraw()
      .send({ from: accounts[0] });
    alert('Account ' + accounts[0] + ' withdrawal successfully!');
  };

  render() {
    if (!this.state.loaded) {
      return <div>Loading Web3, accounts, and contract...You must have Metamask and
        switch to Rinkeby network</div>;
    }
    return (
      <Container>
        <div className="App">
          <Row>
            <Col>
              <h1>Bank Demo</h1>
              <br />
            </Col>
          </Row>
          <Row>
            <Col>
              <h2>Invest and earn interest!</h2>
              <br />
            </Col>
          </Row>
          <Row>
            <Col>
              <h3>Approve your account</h3>
              <br />
            </Col>
          </Row>
          <Row>
            <Col sm="12" md={{ size: 6, offset: 3 }}>
              <InputGroup>
                <InputGroupText>
                  Amount to approve:
                </InputGroupText>
                <br />
                <Input
                  type="number"
                  name="amount"
                  value={this.state.amount}
                  onChange={this.handleInputChange}
                />
                <InputGroupText>
                  <Button color="primary" style={{ backgroundColor: '#2E8B57', borderRadius: '5px', color: 'white' }} onClick={this.handleApprove}>
                    Approve
                  </Button>
                </InputGroupText>
              </InputGroup>
            </Col>
          </Row>
          <Row>
            <Col>
              <br />
              <h2>Interact with Bank Contract</h2>
            </Col>
          </Row>
          <Row className="Cards">
            <Col>
              <Card
                body
                inverse
                style={{ backgroundColor: '#A9A9A9', borderColor: '#333', maxWidth: '50%', margin: 'auto', borderRadius: '5px' }}
              >
                <CardBody>
                  <CardTitle tag="h5">Deposit</CardTitle>
                  <CardText>Amount to Deposit:</CardText>
                  <Input
                    type="number"
                    name="depositAmount"
                    value={this.state.depositAmount}
                    onChange={this.handleInputChange}
                  />
                  <Button
                    color="primary"
                    style={{ backgroundColor: '#4682B4', borderRadius: '5px', color: 'white' }}
                    onClick={this.handleDeposit}
                  >
                    Deposit Now
                  </Button>
                </CardBody>
              </Card>
            </Col>
            <Col>
              <Card
                body
                inverse
                style={{ backgroundColor: '#A9A9A9', borderColor: '#333', maxWidth: '50%', margin: 'auto', borderRadius: '5px' }}
              >
                <CardBody>
                  <CardTitle tag="h5">Withdraw</CardTitle>
                  <CardText>Withdraw all tokens</CardText>
                  <Button
                    color="danger"
                    style={{ backgroundColor: '#8B0000', borderRadius: '5px', color: 'white' }}
                    onClick={this.handleWithdraw}
                  >
                    Withdraw Now
                  </Button>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </div>
      </Container >
    );
  }
}

export default App;
