[{
  "constant": false,
  "inputs": [{
    "name": "_addr",
    "type": "address"
  }],
  "name": "upgrade",
  "outputs": [],
  "payable": false,
  "type": "function"
}, {
  "constant": false,
  "inputs": [{
    "name": "_addr",
    "type": "address"
  }],
  "name": "selfDestruct",
  "outputs": [],
  "payable": false,
  "type": "function"
}, {
  "constant": false,
  "inputs": [{
    "name": "_newAddr",
    "type": "address"
  }],
  "name": "setEtheraffle",
  "outputs": [],
  "payable": false,
  "type": "function"
}, {
  "constant": false,
  "inputs": [],
  "name": "receiveEther",
  "outputs": [],
  "payable": true,
  "type": "function"
}, {
  "inputs": [{
    "name": "_etheraffle",
    "type": "address"
  }],
  "payable": false,
  "type": "constructor"
}, {
  "payable": true,
  "type": "fallback"
}, {
  "anonymous": false,
  "inputs": [{
    "indexed": false,
    "name": "fromWhere",
    "type": "address"
  }, {
    "indexed": false,
    "name": "howMuch",
    "type": "uint256"
  }, {
    "indexed": false,
    "name": "atTime",
    "type": "uint256"
  }],
  "name": "LogEtherReceived",
  "type": "event"
}, {
  "anonymous": false,
  "inputs": [{
    "indexed": false,
    "name": "toWhere",
    "type": "address"
  }, {
    "indexed": false,
    "name": "amountTransferred",
    "type": "uint256"
  }, {
    "indexed": false,
    "name": "atTime",
    "type": "uint256"
  }],
  "name": "LogUpgrade",
  "type": "event"
}]
