const { assert }    = require("chai")
    , moment        = require('moment')
    , truffleAssert = require('truffle-assertions')
    , etheraffle    = artifacts.require('etheraffle')
    , ethRelief     = artifacts.require('ethRelief')
    , freeLOT       = artifacts.require('etheraffleFreeLOT')
    , disbursal     = artifacts.require('etheraffleDisbursal')
    , random1       = "[URL] ['json(https://api.random.org/json-rpc/1/invoke).result.random[\"data\", \"serialNumber\"]','\\n{\"jsonrpc\": \"2.0\",\"method\":\"generateSignedIntegers\",\"id\":\""
    , random2       = "\",\"params\":{\"n\":\"6\",\"min\":1,\"max\":49,\"replacement\":false,\"base\":10,\"apiKey\":${[decrypt] BBxn5oQTs8LKRkJb32LS+dHf/c//H3sSjehJchlucpdFGEjBwtSu08okSPoSkoQQpPCW56kz7PoGm5VEc8r722oEg01AdB03CbURpSxU5cF9Q7MeyNAaDUcTOvlX1L2T/h/k4PUD6FEIvtynHZrSMisEF+r7WJxgiA==}}']"
    , api1          = "[URL] ['json(https://etheraffle.com/api/test).m','{\"r\":\""
    , api2          = "\",\"k\":${[decrypt] BEhjzZIYd3GIvFUu4rWqwYOFKucnwToOUpP3x/svZVz/Vo68c6yIiq8k6XQDmPLajzSTD/TrpR5cF4BnLLhNDtELy7hQyMmFTuUa3JXBs0G0f4d7cTeIX8IG37KxtNfcvUafJy25}}']"
    , fakeRandom1   = "[URL] ['json(https://etheraffle.com/api/test).m','{\"flag\":\"true\",\"r\":\""
    , fakeRandom2   = "\",\"k\":${[decrypt] BEhjzZIYd3GIvFUu4rWqwYOFKucnwToOUpP3x/svZVz/Vo68c6yIiq8k6XQDmPLajzSTD/TrpR5cF4BnLLhNDtELy7hQyMmFTuUa3JXBs0G0f4d7cTeIX8IG37KxtNfcvUafJy25}}']"
// TODO: Write a function to check for revert in error messages so we can assert off that.

contract('Etheraffle Oraclize Tests Part VII - Full Raffle Turnover', accounts => {

  /* Following mocked details ensure a 4, 3 & two 2 matches winners exist */
  const win4Matches   = 9
      , win3Matches   = 8 
      , win2Matches   = 7 // and account 1!
      , tempDelay     = 30
      , queryArr      = []
      , mockID        = 999
      , weekDur       = 604800
      , initBal       = 1*10**18
      , mockNumWins   = [1,1,0,0]
      , birthday      = 1500249600
      , numEntries    = accounts.length
      , pctOfPool     = [520, 114, 47, 319]
      , mockWinNums   = [13, 15, 1, 14, 2, 12]
      , _now          = moment.utc().format('X')
      , odds          = [56, 1032, 54200, 13983816]
      , chosenNumbers = accounts.map((_, i) => [1+i,2+i,3+i,4+i,5+i,6+i])
  let bal4Matches, bal2Matches, ppGlobal
  
  /* Query sent event watcher */    
  etheraffle.deployed().then(contract => {
    const queryEvents = contract.LogQuerySent({}, {fromBlock: 0, toBlock: 'latest'})
    let counter = 0
    queryEvents.watch((err, res) => {
      err ? console.log('Error watching query events: ', err) : counter += 1
      queryArr.push(res)
      if (counter == 3) queryEvents.stopWatching()
    })
  })

  it('Contract should setup correctly', async () => {
    // Add 1 ETH to prize pool, set Oraclize strings -> query prize pool & strings -> check that pp & strings are correct.
    const contract = await etheraffle.deployed()
        , amount   = initBal
        , owner    = await contract.etheraffle.call()
    await contract.manuallyAddToPrizePool({from: accounts[6], value: amount})
    const prizePool = await contract.prizePool.call()
    assert.equal(prizePool.toNumber(), amount, 'Prize pool is not 10 ETH!')
    await contract.manuallySetOraclizeString(fakeRandom1, fakeRandom2, api1, api2, {from: owner})
    const random1After = await contract.randomStr1.call()
        , random2After = await contract.randomStr2.call()
        , api1After    = await contract.apiStr1.call()
        , api2After    = await contract.apiStr2.call()
    assert.equal(fakeRandom1, random1After, 'Random1 string was not set correctly!')
    assert.equal(fakeRandom2, random2After, 'Random2 string was not set correctly!')
    assert.equal(api1, api1After, 'Api1 string was not set correctly!')
    assert.equal(api2, api2After, 'Api2 string was not set correctly!')
   })

   it('Percent of pool array should be correct', async () => {
    // Check contract for pop vars -> assert same as vars in main function's scope
    const contract  = await etheraffle.deployed()
    pctOfPool.map(async (pop, i) => {
      let contractPOP = await contract.pctOfPool.call(i)
      assert.equal(contractPOP.toNumber(), pctOfPool[i], `Contract percent of pool at index ${i} is incorrect!`)
    })
  })

  it('Odds array should be correct', async () => {
    // Check contract for pop vars -> assert same as vars in main function's scope
    const contract  = await etheraffle.deployed()
    odds.map(async (odd, i) => {
      let contractOdd = await contract.odds.call(i)
      assert.equal(contractOdd.toNumber(), odds[i], `Contract odds at index ${i} are incorrect!`)
    })
  })

  it('Should set up current week\'s raffle struct correctly', async () => {
    // Get week -> set up new raffle struct -> inspect structs data for veracity.
    const contract  = await etheraffle.deployed()
        , owner     = await contract.etheraffle.call()
        , week      = await contract.getWeek()
        , tktPrice  = await contract.tktPrice.call()
        , birthday  = await contract.BIRTHDAY.call()
        , weekDur   = await contract.WEEKDUR.call()
        , timeStamp = birthday.toNumber() + (week.toNumber() * weekDur.toNumber())
    await contract.manuallySetupRaffleStruct(week.toNumber(), tktPrice.toNumber(), timeStamp, {from: owner})
    const struct = await contract.raffle.call(week.toNumber())
    assert.equal(struct[0].toNumber(), tktPrice.toNumber(), 'Ticket price incorrectly set in struct!')
    assert.equal(struct[2].toNumber(), timeStamp, 'Timestamp incorrectly set in struct!')
    assert.isFalse(struct[3], 'Withdraw should not be open in raffle struct!')
    assert.equal(struct[4].toNumber(), 0, 'There should not be any entries in this raffle!')
    assert.equal(struct[5].toNumber(), 0, 'There should not be any free entries into this raffle!')
  })

  it('Should set current week correctly', async () => {
    // Get week from contract -> set week -> check week is set.
    const contract  = await etheraffle.deployed()
        , owner = await contract.etheraffle.call()
        , week  = await contract.getWeek()
    await contract.manuallySetWeek(week.toNumber(), {from: owner})
    const weekNow  = await contract.week.call()
    assert.equal(week.toNumber(), weekNow.toNumber(), 'Contract\'s week variable not set correctly!')
  })

  it(`Enter the current raffle ${accounts.length} times`, async () => {
    // Enter raffle with each account -> check numEntries has incremented -> check prize pool has incremented
    const contract  = await etheraffle.deployed()
        , affID     = 0
        , week      = await contract.week.call()
        , prizePool = await contract.prizePool.call()
    let struct      = await contract.raffle.call(week.toNumber())
    const tktPrice  = struct[0].toNumber()
    accounts.map(async (account, i) => await contract.enterRaffle(chosenNumbers[i], affID, {from: account, value: tktPrice}))
    struct = await contract.raffle.call(week.toNumber())
    const numEntries   = struct[4].toNumber()
        , newPrizePool = await contract.prizePool.call()
    assert.equal(numEntries, accounts.length, 'Incorrect number of entries into this raffle!')
    assert.equal(newPrizePool.toNumber(), prizePool.toNumber() + (tktPrice * accounts.length), 'Prize pool not incremented correctly!')
  })

  it('Set raffle end time, thereby closing the previous raffle', async () => {
    // Set raf end -> check get week increments -> enter raffle -> check it's a new raffle entry.
    const contract  = await etheraffle.deployed()
        , owner     = await contract.etheraffle.call()
        , week      = await contract.week.call()
        , struct    = await contract.raffle.call(week.toNumber())
        , timeStamp = struct[2].toNumber()
        , rafEnd    = _now - timeStamp
    await contract.manuallySetRafEndTime(rafEnd, {from: owner})
    const rafEndCheck = await contract.rafEnd.call()
    assert.equal(rafEndCheck.toNumber(), rafEnd, 'New raffle end time was not set correctly!')
  })
  
  it('Week number and getWeek() should return different values', async () => {
    // get week from var -> get week from func -> check they differ by one.
    await createDelay(15000)
    const contract = await etheraffle.deployed()
        , weekVar  = await contract.week.call()
        , weekFunc = await contract.getWeek()
    assert.equal(weekFunc.toNumber(), weekVar.toNumber() + 1, 'New raffle end time has not taken affect in getWeek function!')
  })

  it('Raffles can no longer be entered due to next struct not being set up yet', async () => {
    const contract = await etheraffle.deployed()
        , owner    = await contract.etheraffle.call()
        , tktPrice = await contract.tktPrice.call()
        , nums     = [1,2,3,4,5,6]
        , affID    = 0
    try {
      await contract.enterRaffle(nums, affID, {from: owner, value: tktPrice.toNumber()})
      assert.fail(null, null, 'Should not have been able to enter a raffle with no struct set up!')
    } catch (e) {
      // console.log('Error when attempting to enter a closed raffle: ', e)
      // Transaction reverts as expected!
    }
  })

  it(`Should set matches delay to ${tempDelay} seconds`, async () => {
    // Set matches delay to 30s -> check delay set correctly.
    const contract = await etheraffle.deployed()
        , owner    = await contract.etheraffle.call()
    await contract.manuallySetMatchesDelayTime(tempDelay, {from: owner})
    const newDelay = await contract.matchesDelay.call()
    assert.equal(newDelay.toNumber(), tempDelay, 'New matches delay time not set!')
  })

  it('Make a non-manual Random.org api Oraclize query', async () => {
    // Craft non-manual Random.org query -> check it's qID strut is correct
    let qID
    const contract     = await etheraffle.deployed()
        , owner        = await contract.etheraffle.call()
        , week         = await contract.week.call()
        , delay        = 0
        , isRandom     = true
        , isManual     = false
        , status       = false
        , oracCall     = await contract.manuallyMakeOraclizeCall(week.toNumber(), delay, isRandom, isManual, status, {from: owner})
    await truffleAssert.eventEmitted(oracCall, 'LogQuerySent', ev => qID = ev.queryID)
    const struct = await contract.qID.call(qID)
        , paused = await contract.paused.call()
    assert.equal(struct[0], week.toNumber(), 'Query week number and struct week number do not agree!')
    assert.isTrue(struct[1], 'isRandom in struct for this query ID should be true!')
    assert.isFalse(struct[2], 'isManual in struct for this query ID should be false!')
    assert.isFalse(paused, 'Contract should not be paused!')
  })

  it('Should account for profit and costs in the prize pool', async () => {
    // Watch for prize pool modifcation event for calculated amount -> assert veracity
    const contract = await etheraffle.deployed()
        , conEvent = contract.LogPrizePoolModification({}, {fromBlock: 0, toBlock: 'latest'})
        , week     = await contract.getWeek()
        , struct   = await contract.raffle.call(week.toNumber() - 1)
        , take     = await contract.take.call() // ppt 
        , tktPrice = struct[0].toNumber()
        , entries  = struct[4].toNumber()
        , profit   = Math.trunc(((tktPrice * entries) * take.toNumber()) / 1000)
        , ev       = await waitForConditionalEvent(conEvent, profit)
    assert.equal(ev.args.amount.toNumber(), profit, 'Profit and costs have not been accounted for!')
  })

  it('Should disburse funds correctly', async () => {
    // Watch for fund disbursal event -> ensure details correct.
    const contract  = await etheraffle.deployed()
        , conEvent  = await contract.LogFundsDisbursed({}, {fromBlock: 0, toBlock: 'latest'})
        , week      = await contract.getWeek()
        , struct    = await contract.raffle.call(week.toNumber() - 1)
        , take      = await contract.take.call() // ppt 
        , tktPrice  = struct[0].toNumber()
        , entries   = struct[4].toNumber()
        , profit    = Math.trunc(((tktPrice * entries) * take.toNumber()) / 1000)
        , half      = Math.trunc(profit / 2)
        , ev        = await waitForEvent(conEvent)
    assert.equal(ev.args.amount.toNumber(), half, 'Disbursal event amount incorrect!')
  })
  
  it('Disbursal balance should have been incremented', async () => {
    // Query Disbursal contract balance -> calculate half of ER profit -> assert congruent.
    const contract = await etheraffle.deployed()
        , disbCon  = await disbursal.deployed()
        , contBal  = disbursal.web3.eth.getBalance(disbCon.address)
        , week     = await contract.getWeek()
        , struct   = await contract.raffle.call(week.toNumber() - 1)
        , tktPrice = struct[0].toNumber()
        , take     = await contract.take.call()
        , profit   = Math.trunc((tktPrice * numEntries * take) / 1000)
        , half     = Math.trunc(profit / 2)
    assert.equal(contBal.toNumber(), half, `Disbursal balance should be ${half}`)
  })

  it('EthRelief balance should have been incremented', async () => {
    // Query EthRelief contract balance -> calculate half of ER profit -> assert congruent.
    const contract = await etheraffle.deployed()
        , erCon    = await ethRelief.deployed()
        , contBal  = ethRelief.web3.eth.getBalance(erCon.address)
        , week     = await contract.getWeek()
        , struct   = await contract.raffle.call(week.toNumber() - 1)
        , tktPrice = struct[0].toNumber()
        , take     = await contract.take.call()
        , profit   = Math.trunc((tktPrice * numEntries * take) / 1000)
        , half     = Math.trunc(profit / 2)
        , bal      = profit - half // Because of trunc, half may not == profit / 2
    assert.equal(contBal.toNumber(), bal, `EthRelief balance should be ${half}`)
  })

  it('Should set winning numbers correctly', async () => {
    // Watch for winning numbers event -> ensure details correct.
    const contract = await etheraffle.deployed()
        , conEvent = contract.LogWinningNumbers({}, {fromBlock: 0, toBlock: 'latest'})
        , week     = await contract.getWeek()
        , struct   = await contract.raffle.call(week.toNumber() - 1)
        , entries  = struct[4].toNumber()
        , ev       = await waitForEvent(conEvent)
    assert.equal(ev.args.forRaffle.toNumber(), week.toNumber() - 1, 'Winning numbers set for the wrong week!')
    assert.equal(ev.args.numberOfEntries.toNumber(), entries, 'Incorrect number of raffle entries logged!')
    assert.equal(ev.args.randomSerialNo.toNumber(), mockID, 'Incorrect serial number was logged!')
    ev.args.wNumbers.map((num, i) => 
      assert.equal(num.toNumber(), mockWinNums[i], 'Winning numbers logged do not match mocked numbers!'))
  })

  it('Should account for profit & costs then set winning & unclaimed amts correctly', async () => {
    // Pull vars from contract -> calculate winning amounts -> pull win amts from contract -> assert veracity
    const contract  = await etheraffle.deployed()
        , conEvent  = contract.LogPrizePoolsUpdated({}, {fromBlock: 0, toBlock: 'latest'})
        , { args }  = await waitForEvent(conEvent)
        , gasAmt    = await contract.gasAmt.call()
        , gasPrc    = await contract.gasPrc.call()
        , oracCost  = await contract.oracCost.call()
        , oracTot   = ((gasAmt.toNumber() * gasPrc.toNumber()) + oracCost.toNumber()) * 2
        , week      = await contract.getWeek()
        , struct    = await contract.raffle.call(week.toNumber() - 1)
        , take      = await contract.take.call() // ppt 
        , tktPrice  = struct[0].toNumber()
        , structUnc = struct[1].toNumber()
        , entries   = struct[4].toNumber()
        , profit    = Math.trunc(((tktPrice * entries) * take.toNumber()) / 1000)
        , calcPP    = initBal + (numEntries * tktPrice)- oracTot - profit 
        , winDeets  = await contract.getWinningDetails(week.toNumber() - 1)
        , calcAmts  = odds.map((odd,i) => mockNumWins[i] ? calcPayout(odd, tktPrice, take, mockNumWins[i], calcPP, pctOfPool[i]) : 0)
        , contAmts  = winDeets[1].map(e => e.toNumber())
        , eventAmts = args.winningAmounts.map(e => e.toNumber())
        , unclaimed = calcAmts.reduce((acc,e,i) => acc + (e * mockNumWins[i]), 0)
        , newPP     = calcPP - unclaimed
    assert.equal(args.ticketPrice.toNumber(), tktPrice, 'Ticket price for raffle was logged incorrectly!')
    assert.equal(args.forRaffle.toNumber(), week.toNumber() - 1, 'Winning amounts set for wrong week number!')
    assert.equal(args.newMainPrizePool.toNumber(), newPP, 'Calculated new prize pool and event\'s new prize pool do not match!')
    assert.equal(structUnc, unclaimed, 'Calculated unclaimed amount and struct\'s unclaimed amount do not match!')
    assert.equal(args.unclaimedPrizePool.toNumber(), unclaimed, 'Calculated unclaimed amount and event\'s unclaimed amount do not match!')
    calcAmts.map((e,i) => assert.equal(eventAmts[i], e, `Prize pools updated event logged incorrect prize amount at index ${i}`))
    calcAmts.map((e,i) => assert.equal(contAmts[i], e, `Contract\'s win amount at index ${i} does not equal calculated amount!`))
  })

  it('Withdraw should now be open', async () => {
    // Query prev week -> get raffle struct -> ensure withdraw bool set to true.
    const contract = await etheraffle.deployed()
        , week     = await contract.getWeek()
        , struct   = await contract.raffle.call(week.toNumber() - 1)
    assert.isTrue(struct[3], 'Withdraw for raffle should be open!')
  })

  it('New raffle struct should be set up correctly', async () => {
    // Query current week -> get raffle struct -> ensure set up correctly.
    const contract  = await etheraffle.deployed()
        , week      = await contract.getWeek()
        , tktPrice  = await contract.tktPrice.call()
        , struct    = await contract.raffle.call(week.toNumber())
        , timeStamp = birthday + (weekDur * week.toNumber())
    assert.equal(struct[2].toNumber(), timeStamp, `Raffle time stamp for week ${week} is not correct!`)
    assert.equal(struct[0].toNumber(), tktPrice.toNumber(), `Raffle ticket price for week ${week} is not correct!`)
  })

  it('Week and getWeek() should be congruent again', async () => {
    // Query current week -> call getWeek() -> ensure they match.
    const contract = await etheraffle.deployed()
        , getWeek  = await contract.getWeek()
        , week     = await contract.week.call()
    assert.equal(getWeek.toNumber(), week.toNumber(), `Week is ${week} & getWeek() is ${getWeek}!`)
  })

  it('Contract should not be paused', async () => {
    // Query paused variable -> ensure is false.
    const contract = await etheraffle.deployed()
        , paused   = await contract.paused.call()
    assert.isFalse(paused, 'Conctract should not be paused!')
  })

  it(`Can successfully enter the new current raffle`, async () => {
    // Enter raffle -> check numEntries for correct raffle has incremented -> check prize pool has incremented correctly.
    const contract      = await etheraffle.deployed()
        , owner         = await contract.etheraffle.call()
        , affID         = 0
        , nums          = [1,2,3,4,5,6]
        , week          = await contract.getWeek()
        , ppBefore      = await contract.prizePool.call()
    let struct          = await contract.raffle.call(week.toNumber())
    const tktPrice      = struct[0].toNumber()
        , entriesBefore = struct[4].toNumber()
    try {
      await contract.enterRaffle(nums, affID, {from: owner, value: tktPrice})
    } catch (e) {
      assert.fail(null, null, 'Should have been able to enter raffle successfully! Error: ', e)
    }
    struct = await contract.raffle.call(week.toNumber())
    const entriesAfter = struct[4].toNumber()
        , ppAfter      = await contract.prizePool.call()
    assert.equal(entriesAfter, entriesBefore + 1, 'Incorrect number of entries into this raffle!')
    assert.equal(ppAfter.toNumber(), ppBefore.toNumber() + tktPrice, 'Prize pool has not incremented correctly!')
  })

  it('Should have created a new Oraclize query due at correct time', async () => {
    // Get query event -> calc due time from contract vars -> check for equality.
    const contract = await etheraffle.deployed()
        , getWeek  = await contract.getWeek.call()
        , weekDur  = await contract.WEEKDUR.call()
        , birthday = await contract.BIRTHDAY.call()
        , rafEnd   = await contract.rafEnd.call()
        , resDelay = await contract.resultsDelay.call()
        , dueTime  = (getWeek.toNumber() * weekDur.toNumber()) + birthday.toNumber() + rafEnd.toNumber() + resDelay.toNumber()
        , { args } = queryArr[queryArr.length - 1]
    assert.equal(args.dueAt.toNumber(), dueTime, 'Last Oraclize query is due back at incorrect time!')
  })

  it('New Oraclize query struct should have correct details', async () => {
    // Get last query event -> get qID struct from it -> ensure details in qID are correct.
    const contract  = await etheraffle.deployed()
        , week      = await contract.getWeek()
        , { args }  = queryArr[queryArr.length - 1]
        , qIDStruct = await contract.qID.call(args.queryID)
        , weekNo    = qIDStruct[0].toNumber()
        , isRandom  = qIDStruct[1]
        , isManual  = qIDStruct[2]
    assert.isTrue(isRandom, 'Last Oraclize call should be to Random.org!')
    assert.isFalse(isManual, 'Last Oraclize call should be an automated one!')
    assert.equal(week.toNumber(), weekNo, 'Last Oraclize call is for the wrong week!')
  })

  it('Four match winner can successfully withdraw a prize', async () => {
    // Get winner account -> get number of matches -> assert prize worthy -> attempt to withdraw prize.
    const contract = await etheraffle.deployed()
        , week     = await contract.getWeek()
        , winner   = accounts[win4Matches]
        , cNums    = chosenNumbers[win4Matches]
        , entryNum = await contract.getUserNumEntries(winner, week.toNumber() - 1)
        , winDeets = await contract.getWinningDetails(week.toNumber() - 1)
        , winNums  = winDeets[0].map(num => num.toNumber())
        , winAmts  = winDeets[1].map(num => num.toNumber())
        , matches  = await contract.getMatches.call(winNums, cNums)
        , bal      = await etheraffle.web3.eth.getBalance(winner)
    ppGlobal       = await contract.prizePool.call() // set global var to prize pool for later test
    bal4Matches    = bal.toNumber() // set global var to winner's balance for later test
    assert.equal(matches.toNumber(), 4, `Account ${winner} should have 4 matches!`)
    try {
      const wDraw  = await contract.withdrawWinnings(week.toNumber() - 1, entryNum.toNumber(), cNums, {from: winner, gas: 300000})
          , tx     = await web3.eth.getTransaction(wDraw.tx)
          , gasAmt = wDraw.receipt.gasUsed
          , gasPrc = tx.gasPrice.toNumber()
          , gasTot = gasAmt * gasPrc
      truffleAssert.eventEmitted(wDraw, 'LogWithdraw', ev => ev.amountWon == winAmts[matches - 3])
      bal4Matches -= gasTot // Account for gas of above tx in stored account balance for a later test
    } catch (e) {
      assert.fail(null, null, `Winner should have been able to withdraw prize! Error: ${e}`)
    }
  })

  it('Unclaimed prize pool should decrement by 4 match prize amount after withdrawal', async () => {
    // Calc unclaimed - prize just wdrawn -> get unclaimed from SC -> assert they're the same.
    const contract  = await etheraffle.deployed()
        , week      = await contract.getWeek()
        , cNums     = chosenNumbers[win4Matches]
        , struct    = await contract.raffle.call(week.toNumber() - 1)
        , unclaimed = struct[1].toNumber()
        , winDeets  = await contract.getWinningDetails(week.toNumber() - 1)
        , winNums   = winDeets[0].map(num => num.toNumber())
        , winAmts   = winDeets[1].map(num => num.toNumber())
        , calcUnc   = winAmts.reduce((acc,e,i) => acc + (e * mockNumWins[i]), 0)
        , matches   = await contract.getMatches.call(winNums, cNums)
        , prizeAmt  = winAmts[matches - 3]
    assert.equal(unclaimed, calcUnc - prizeAmt,'Unclaimed has not been decremented correctly!')
  })

  it('Prize pool should not decrement by 4 match prize withdrawal amount', async () => {
    // Check prize pool var saved before wdraw is same as pp from SC now.
    const contract = await etheraffle.deployed()
        , ppNow    = await contract.prizePool.call()
    assert.equal(ppGlobal.toNumber(), ppNow.toNumber(), 'Prize pool should not decrement on prize withdrawal!')
  })

  it('Four match prize winner\'s account should have incremented by prize amount', async () => {
    // Get winners balance before -> get balance after -> assert has incremented by prize amoutn
    const contract  = await etheraffle.deployed()
        , winner    = accounts[win4Matches]
        , cNums     = chosenNumbers[win4Matches]  
        , week      = await contract.getWeek()
        , winDeets  = await contract.getWinningDetails(week.toNumber() - 1)
        , winNums   = winDeets[0].map(num => num.toNumber())
        , winAmts   = winDeets[1].map(num => num.toNumber())
        , matches   = await contract.getMatches.call(winNums, cNums)
        , balAfter  = await etheraffle.web3.eth.getBalance(winner)
        , balBefore = bal4Matches
    // Note: Use approx here because JS rounding arrors occasionally calculate the numbers to be 99.9999999% accurate but not exact match! Using 10Gwei as a delta here.
    assert.approximately(balBefore + winAmts[matches.toNumber() - 3], balAfter.toNumber(), 1*10**10, 'Winning account has not received correct amount of eth!')
  })
  
  it('Four match winner cannot successfully withdraw their prize twice', async () => {
    // Check entry is indeed winner -> attempt to withdraw -> check that it fails.
    const contract = await etheraffle.deployed()
        , week     = await contract.getWeek()
        , winner   = accounts[win4Matches]
        , cNums    = chosenNumbers[win4Matches]
        , entryNum = await contract.getUserNumEntries(winner, week.toNumber() - 1)
        , winDeets = await contract.getWinningDetails(week.toNumber() - 1)
        , winNums  = winDeets[0].map(num => num.toNumber())
        , matches  = await contract.getMatches.call(winNums, cNums)
    assert.equal(matches.toNumber(), 4, `Account ${winner} should have 4 matches!`)
    try {
      await contract.withdrawWinnings(week.toNumber() - 1, entryNum.toNumber(), cNums, {from: winner, gas: 300000})
      assert.fail(null, null, 'Withdraw transaction should not have succeeded!')
    } catch (e) {
      // console.log('Error attempting second withdraw: ', e)
      // Transaction reverts as expected!
    }
  })
  
  it('Three match winner cannot withdraw prize when supplying incorrect chosen numbers', async () => {
    // Get winning details -> malform chosen numbers -> attempt to withdraw -> check it fails
    const contract   = await etheraffle.deployed()
        , winner     = accounts[win3Matches]
        , cNums      = chosenNumbers[win3Matches]
        , wrongCNums = cNums.map(e => e + 1)
        , week       = await contract.getWeek()
        , entryNum   = await contract.getUserNumEntries(winner, week.toNumber() - 1)
        , winDeets   = await contract.getWinningDetails(week.toNumber() - 1)
        , winNums    = winDeets[0].map(num => num.toNumber())
        , matches    = await contract.getMatches.call(winNums, cNums)
    assert.equal(matches.toNumber(), 3, `Account ${winner} should have made three matches!`)
    cNums.map((e,i) => assert.notEqual(e, wrongCNums[i], 'Wrong chosen numbers should not match chosen numbers!'))
    try {
      await contract.withdrawWinnings(week.toNumber() - 1, entryNum.toNumber(), wrongCNums, {from: winner, gas: 300000})
      assert.fail(null, null, 'Withdraw transaction should not have succeeded!')
    } catch (e) {
      // console.log('Error attempting second withdraw: ', e)
      // Transaction reverts as expected!
    }
  })
  
  it('Three match winner cannot withdraw prize when supplying incorrect week number', async () => {
    // Get winning details -> malform week number -> attempt to withdraw -> check it fails
    const contract  = await etheraffle.deployed()
        , winner    = accounts[win3Matches]
        , cNums     = chosenNumbers[win3Matches]
        , week      = await contract.getWeek()
        , entryNum  = await contract.getUserNumEntries(winner, week.toNumber() - 1)
        , winDeets  = await contract.getWinningDetails(week.toNumber() - 1)
        , winNums   = winDeets[0].map(num => num.toNumber())
        , matches   = await contract.getMatches.call(winNums, cNums)
        , wrongWeek = week.toNumber() - 2
    assert.equal(matches.toNumber(), 3, `Account ${winner} should have made three matches!`)
    assert.notEqual(week.toNumber() - 1, week.toNumber() - 2, 'Wrong week number should not match correct week number!')
    try {
      await contract.withdrawWinnings(wrongWeek, entryNum.toNumber(), cNums, {from: winner, gas: 300000})
      assert.fail(null, null, 'Withdraw transaction should not have succeeded!')
    } catch (e) {
      // console.log('Error attempting to withdraw using wrong week number: ', e)
      // Transaction fails due to invalid opcode when attempting to read from non-existing array whilst check eNums are valid.
    }
  })

  it('Three match winner cannot withdraw prize when supplying incorrect entry number', async () => {
    // Get winning details -> malform entry number -> attempt to withdraw -> check it fails
    const contract  = await etheraffle.deployed()
        , winner    = accounts[win3Matches]
        , cNums     = chosenNumbers[win3Matches]
        , week      = await contract.getWeek()
        , entryNum  = await contract.getUserNumEntries(winner, week.toNumber() - 1)
        , wrongENum = entryNum.toNumber() + 1
        , winDeets  = await contract.getWinningDetails(week.toNumber() - 1)
        , winNums   = winDeets[0].map(num => num.toNumber())
        , matches   = await contract.getMatches.call(winNums, cNums)
    assert.equal(matches.toNumber(), 3, `Account ${winner} should have made three matches!`)
    assert.notEqual(entryNum.toNumber(), wrongENum, 'Wrong week number should not match correct week number!')
    try {
      await contract.withdrawWinnings(week.toNumber() - 1, wrongENum, cNums, {from: winner, gas: 300000})
      assert.fail(null, null, 'Withdraw transaction should not have succeeded!')
    } catch (e) {
      // console.log('Error attempting to withdraw using wrong entry number: ', e)
      // Transaction fails due to invalid opcode as expected (withdraw attmeps to read from an index in an array that doesn't exist)!
    }
  })

  it('Non-winner cannot successfully withdraw a winner\'s not-yet-withdrawn prize', async () => {
    // Get winning details -> use different account -> attempt withdraw -> check it fails
    const contract  = await etheraffle.deployed()
        , winner    = accounts[win3Matches]
        , nonWinner = accounts[4]
        , cNums     = chosenNumbers[win3Matches]
        , week      = await contract.getWeek()
        , entryNum  = await contract.getUserNumEntries(winner, week.toNumber() - 1)
        , winDeets  = await contract.getWinningDetails(week.toNumber() - 1)
        , winNums   = winDeets[0].map(num => num.toNumber())
        , matches   = await contract.getMatches.call(winNums, cNums)
    assert.equal(matches.toNumber(), 3, `Account ${winner} should have made three matches!`)
    assert.notEqual(winner, nonWinner, 'Non-winner account should not match the actual winner\'s account!')
    try {
      await contract.withdrawWinnings(week.toNumber() - 1, entryNum, cNums, {from: nonWinner, gas: 300000})
      assert.fail(null, null, 'Withdraw transaction should not have succeeded!')
    } catch (e) {
      // console.log('Error attempting to withdraw using wrong entry number: ', e)
      // Transaction reverst as expected (fails the first requirement)!
    }
  })

  it('Three match winner can withdraw prize using correct details', async () => {
    // Get winning details -> attempt withdraw -> check it succeeds
    const contract = await etheraffle.deployed()
        , winner   = accounts[win3Matches]
        , cNums    = chosenNumbers[win3Matches]
        , week     = await contract.getWeek()
        , entryNum = await contract.getUserNumEntries(winner, week.toNumber() - 1)
        , winDeets = await contract.getWinningDetails(week.toNumber() - 1)
        , winNums  = winDeets[0].map(num => num.toNumber())
        , matches  = await contract.getMatches.call(winNums, cNums)
    assert.equal(matches.toNumber(), 3, `Account ${winner} should have made three matches!`)
    try {
      await contract.withdrawWinnings(week.toNumber() - 1, entryNum, cNums, {from: winner, gas: 300000})
    } catch (e) {
      assert.fail(null, null, `Withdraw transaction should have succeeded! Error: ${e}`)
    }
  })

  it('Should add this Etheraffle contract as a FreeLOT minter', async () => {
    // Add Etheraffle as FreeLOT minter -> enusre is minter
    const contract  = await etheraffle.deployed()
        , erAdd     = contract.address
        , freeCont  = await freeLOT.deployed()
        , freeOwner = await freeCont.etheraffle.call()
        , addMinter = await freeCont.addMinter(erAdd, {from: freeOwner})
        , isMinter  = await freeCont.isMinter.call(erAdd)
    truffleAssert.eventEmitted(addMinter, 'LogMinterAddition', ev => ev.newMinter == erAdd)
    assert.isTrue(isMinter, 'Etheraffle should be a minter on the FreeLOT contract!')
  })

  it('Two match winner can withdraw FreeLOT prize', async () => {
    // Get 2 match winners balance of FreeLOT -> get winning details -> withdraw prize -> check it succeeds
    const contract = await etheraffle.deployed()
        , freeCont = await freeLOT.deployed()
        , winner   = accounts[win2Matches]
        , cNums    = chosenNumbers[win2Matches]
        , week     = await contract.getWeek()
        , entryNum = await contract.getUserNumEntries(winner, week.toNumber() - 1)
        , winDeets = await contract.getWinningDetails(week.toNumber() - 1)
        , winNums  = winDeets[0].map(num => num.toNumber())
        , matches  = await contract.getMatches.call(winNums, cNums)
    bal2Matches    = await freeCont.balanceOf.call(winner)
    assert.equal(bal2Matches.toNumber(), 0, '2 match winner should have zero FreeLOT tokens at this point!')
    assert.equal(matches.toNumber(), 2, `Account ${winner} should have made three matches!`)
    try {
      await contract.withdrawWinnings(week.toNumber() - 1, entryNum, cNums, {from: winner, gas: 300000})
    } catch (e) {
      assert.fail(null, null, `Withdraw transaction should have succeeded! Error: ${e}`)
    }
  })

  it('Two match winner gets credited with one FreeLOT token', async () => {
    const freeCont = await freeLOT.deployed()
        , winner   = accounts[win2Matches]
    bal2Matches    = await freeCont.balanceOf.call(winner)
    assert.equal(bal2Matches.toNumber(), 1, '2 match winner should now have one FreeLOT token!')
  })

  it('Two match winner cannot withdraw FreeLOT prize twice', async () => {
    // Get 2 match winners balance of FreeLOT -> get winning details -> withdraw prize -> check it succeeds
    const contract = await etheraffle.deployed()
        , freeCont = await freeLOT.deployed()
        , winner   = accounts[win2Matches]
        , cNums    = chosenNumbers[win2Matches]
        , week     = await contract.getWeek()
        , entryNum = await contract.getUserNumEntries(winner, week.toNumber() - 1)
        , winDeets = await contract.getWinningDetails(week.toNumber() - 1)
        , winNums  = winDeets[0].map(num => num.toNumber())
        , matches  = await contract.getMatches.call(winNums, cNums)
    assert.equal(matches.toNumber(), 2, `Account ${winner} should have made three matches!`)
    try {
      await contract.withdrawWinnings(week.toNumber() - 1, entryNum, cNums, {from: winner, gas: 300000})
      assert.fail(null, null, 'Two match winner should not be able to withdraw prize twice!')
    } catch (e) {
      // console.log('Error when trying to withdraw two match win twice: ', e)
      // Transaction reverts as expected!
    }
  })

  // Check contract status is changed per an oraclize query

})

const createDelay = time =>
  new Promise(resolve => setTimeout(resolve, time))

/* Payout Calculations from the smart contract re-written in JS */
const calcPayout = (_odds, _tktPrice, _take, _numWinners, _prizePool, _pctOfPool) => 
  oddsTotal(_odds, _tktPrice, _take, _numWinners) < splitsTotal(_prizePool, _pctOfPool, _numWinners) 
    ? oddsSingle(_odds, _tktPrice, _take) 
    : splitsSingle(_prizePool, _pctOfPool, _numWinners)

const oddsTotal = (_odds, _tktPrice, _take, _numWinners) => 
  oddsSingle(_odds, _tktPrice, _take) * _numWinners;

const splitsTotal = (_prizePool, _pctOfPool, _numWinners) =>
  splitsSingle(_prizePool, _pctOfPool, _numWinners) * _numWinners

const oddsSingle = (_odds, _tktPrice, _take) =>
  (_tktPrice * _odds * (1000 - _take)) / 1000

const splitsSingle = (_prizePool, _pctOfPool, _numWinners) =>
  (_prizePool * _pctOfPool) / (_numWinners * 1000)

const waitForEvent = _event => 
  new Promise((resolve, reject) => 
    _event.watch((err, res) =>
      err ? reject(err) : (resolve(res), _event.stopWatching())))

const waitForConditionalEvent = (_event, _amt) => 
  new Promise((resolve, reject) => 
    _event.watch((err, res) => {
      if (err) reject(err)
      if (res.args.amount.toNumber() == _amt) {
        resolve(res)
        _event.stopWatching()
      }
    })
  )
