const { assert }    = require("chai")
    // , moment        = require('moment')
    , truffleAssert = require('truffle-assertions')
    , etheraffle    = artifacts.require('etheraffle')
    , random1       = "[URL] ['json(https://api.random.org/json-rpc/1/invoke).result.random[\"data\", \"serialNumber\"]','\\n{\"jsonrpc\": \"2.0\",\"method\":\"generateSignedIntegers\",\"id\":\""
    , random2       = "\",\"params\":{\"n\":\"6\",\"min\":1,\"max\":49,\"replacement\":false,\"base\":10,\"apiKey\":${[decrypt] BBxn5oQTs8LKRkJb32LS+dHf/c//H3sSjehJchlucpdFGEjBwtSu08okSPoSkoQQpPCW56kz7PoGm5VEc8r722oEg01AdB03CbURpSxU5cF9Q7MeyNAaDUcTOvlX1L2T/h/k4PUD6FEIvtynHZrSMisEF+r7WJxgiA==}}']"
    , api1          = "[URL] ['json(https://etheraffle.com/api/test).m','{\"r\":\""
    , api2          = "\",\"k\":${[decrypt] BEhjzZIYd3GIvFUu4rWqwYOFKucnwToOUpP3x/svZVz/Vo68c6yIiq8k6XQDmPLajzSTD/TrpR5cF4BnLLhNDtELy7hQyMmFTuUa3JXBs0G0f4d7cTeIX8IG37KxtNfcvUafJy25}}']"
    , fakeRandom1   = "[URL] ['json(https://etheraffle.com/api/test).m','{\"r\":\""
    , fakeRandom2   = "\",\"k\":${[decrypt] BEhjzZIYd3GIvFUu4rWqwYOFKucnwToOUpP3x/svZVz/Vo68c6yIiq8k6XQDmPLajzSTD/TrpR5cF4BnLLhNDtELy7hQyMmFTuUa3JXBs0G0f4d7cTeIX8IG37KxtNfcvUafJy25}}']"
    
// Correct Orac callback time = struct timestamp + rafend

contract('Etheraffle Oraclize Tests', accounts => {

  it('Contract should have prize pool of 1 ETH', async () => {
    // Add 1 ETH to prize pool -> query prize pool -> assert that it's 1ETH.
    const contract  = await etheraffle.deployed()
        , amount    = 1*10**18
    await contract.manuallyAddToPrizePool({from: accounts[6], value: amount})
    const prizePool = await contract.prizePool.call()
    assert.equal(prizePool.toNumber(), amount, 'Prize pool is not 1 ETH!')
  })
  
  it('Non-owner cannot set Oraclize strings', async () => {
    // Change string as non-owner -> Check tx fails -> Check strings weren't changed.
    const contract = await etheraffle.deployed()
        , owner    = await contract.etheraffle.call()
        , r1       = 'Only'
        , r2       = 'owner'
        , a1       = 'can'
        , a2       = 'set'
        , caller   = accounts[5]
    assert.notEqual(owner, caller, 'Function caller is same address contract owner!')
    try {
      await contract.manuallySetOraclizeString(r1, r2, a1, a2, {from: caller})
      assert.fail('Only contract owner should be able to set Oraclize strings!')
    } catch (e) {
      // console.log('Error when non-owner attempts to set Oraclize strings: ', e)
      // Transaction reverts as expected!
    }
    const r1After = await contract.randomStr1.call()
        , r2After = await contract.randomStr2.call()
        , a1After = await contract.apiStr1.call()
        , a2After = await contract.apiStr2.call()
    assert.notEqual(r1, r1After, 'Random1 string was changed and shouldn\'t have been!')
    assert.notEqual(r2, r2After, 'Random2 string was changed and shouldn\'t have been!')
    assert.notEqual(a1, a1After, 'Api1 string was changed and shouldn\'t have been!')
    assert.notEqual(a2, a2After, 'Api2 string was changed and shouldn\'t have been!')
  })

  it('Owner can set Oraclize strings', async () => {
    // Get owner -> change strings as owner -> check they match.
    const contract = await etheraffle.deployed()
        , owner    = await contract.etheraffle.call()
    await contract.manuallySetOraclizeString(random1, random2, api1, api2, {from: owner})
    const random1After = await contract.randomStr1.call()
        , random2After = await contract.randomStr2.call()
        , api1After    = await contract.apiStr1.call()
        , api2After    = await contract.apiStr2.call()
    assert.equal(random1, random1After, 'Random1 string was not set correctly!')
    assert.equal(random2, random2After, 'Random2 string was not set correctly!')
    assert.equal(api1, api1After, 'Api1 string was not set correctly!')
    assert.equal(api2, api2After, 'Api2 string was not set correctly!')
  })

  it('Non-owner cannot make a manual Oraclize query', async () => {
    const contract = await etheraffle.deployed()
        , owner = await contract.etheraffle.call()
        , guineaPig = accounts[5]
        , week = 1
        , delay = 0
        , random = false
        , manual = true
        , status = false
    assert.notEqual(owner, guineaPig, 'Guinea pig account is the same as owner!')
    try {
      await contract.manuallyMakeOraclizeCall(week, delay, random, manual, status, {from: guineaPig})
    } catch (e) {
      // console.log('Error when non-owner attempts to make Oraclize query: ', e)
      // Transaction reverts as expected!
    }
  })
  //Check callbacks don't work when paused
  //Check qid structs are made correctly for both types
  //enter x number of times and do the maths to calc the prizes correctly
  //check events fired by orac cbs to make sure timings are correct for the recursion
  //check manual ones don't cause recursion
  //check non manual ones DO cause recursion
  //make api have a true/false flag? change the string to make random calls for real, vs "random" from api? Check flag exists first, since it won't for the real api one!
})

//_contract = etheraffle.at(contract.address)
const getAllEvents = _contract => {
  return new Promise((resolve, reject) => {
    return _contract.allEvents({},{fromBlock:0, toBlock: 'latest'})
    .get((err, res) => !err ? resolve(res) : console.log(err))
  })
}
