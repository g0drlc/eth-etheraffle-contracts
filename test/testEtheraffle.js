const { assert }    = require("chai")
    , moment        = require('moment')
    , truffleAssert = require('truffle-assertions')
    , ethRelief     = artifacts.require('ethRelief')
    , etheraffle    = artifacts.require('etheraffle')
    , disbursal     = artifacts.require('etheraffleDisbursal')

// Run ethereum-bridge for oraclize w/ node bridge -a 9 -H 127.0.0.1 -p 9545 --dev

contract('Etheraffle', accounts => {
  // Correct setup checks
  it('Contract should be owned by account[0]', async () => {
    const contract  = await etheraffle.deployed()
        , contOwner = await contract.etheraffle.call()
    assert.equal(contOwner, accounts[0])
  })
})
