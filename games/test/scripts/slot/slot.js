var pixi = require('pixi.js');
var gameManager = require('./../../gameManager.js');

var reel = require('./reels/reel.js');
var reelLines = require('./reels/reelLines.js')

var slot = exports;

slot.reelArr = [];
slot.spinning = false;
slot.spinData = [];
slot.reelData = [];


slot.initializeSlot = function(spinData, reelData){
  slot.reelData = reelData;
  slot.spinData = spinData;
  slot.cont = gameManager.objectManager.getObjectByName("slotGameContainer");
  for(let i = 0; i < 5; i++){
    var r = new reel(reelData, gameManager.dataManager.settingsData, gameManager.dataManager.assetData);
    r.createReel(spinData[i], i);
    slot.reelArr.push(r);
    slot.cont.displayObject.addChild(r.tile);
    r.tile.x = (144 + 10) * i;
  }
  return slot;
}

slot.startSpin = function(){
  //console.log("spinData: " + slot.spinData);
  let gameLogoAnim = gameManager.objectManager.getObjectByName("gameLogo");
  gameLogoAnim.displayObject.playAnimation();
  reelLines.stopWinningLineAnimations();
  slot.setActiveLineButton(slot.activeLine, true, false);
  if(slot.lineTimer != undefined)slot.lineTimer.stop();
  slot.spinning = true;
  slot.setSpinButtonText("STOP");
  //if last reel is not spinning, then none of them are. In this example, they spin synchronously so order is not important.
  //if slot is not spinning and pressed spin button, get new spin data from server simulator

  if(!slot.spinStarted){
    slot.updateWinText("Good Luck!");
    gameManager.objectManager.getObjectByName("lineContainer").displayObject.removeChildren();
    gameManager.objectManager.getObjectByName("animationContainer").displayObject.removeChildren();
    gameManager.objectManager.getObjectByName("cashTextObject").displayObject.setState("stop");

    //reelLines.deactivateLineButtons();
    slot.finishedReelCount = 0;
    if(!slot.reelArr[4].isSpinning){
        slot.spinData = gameManager.server.randomizeSpin();
        slot.winData = gameManager.server.checkWin(slot.activeLine);
        //slot.winData = [[3, 3, 6], [6,4,6], [2, 3, 1], [4,5,9]];
        console.log( slot.winData.length != 0 ? ' %c Win Amount: ' + gameManager.server.earnings +
        '\n Win data: ' +slot.winData : "%c No earnings on this spin ", 'background: #222; color: #bada55; font-size:150%');
        slot.updateCashText();
    }

    //you can trace it on the console if the spin stops on correct position or not.
    //result of every spin will be show on the console.
    //you can check if visuals are correct by looking at the assets folder
    console.log("spin is initiated, spin order: " + slot.reelData[0][slot.spinData[0]]
    + " " + slot.reelData[1][slot.spinData[1]] + " "
    + slot.reelData[2][slot.spinData[2]] + " "
    + slot.reelData[3][slot.spinData[3]] + " "
    + slot.reelData[4][slot.spinData[4]] + " ");

    slot.tArr = new Array();
    for(var i = 0; i < 5; i++){
        var t = pixi.timerManager.createTimer(250 * i + 0.1);
        t.index = i;
        slot.tArr.push(t);
    }
    slot.spinStarted = true;

    //if not spinning, start spinning each reel, if spinning, stop them and set the final position
    for(var i = 0; i < 5; i++){
      if(!slot.reelArr[i].isSpinning){
        console.log("target for reel " + i + ": " + slot.reelData[i][slot.spinData[i]] + "\narray: " + slot.reelData[i])
        slot.reelArr[i].textureChanged = false;
        slot.tArr[i].start();
        slot.tArr[i].on('end', function(del){
          delay((del-0.1)/250);
        });

        function delay(ind){
          var flag = false;
          for(var j = ind; j >0; j--){
              if(!slot.reelArr[j-1].isSpinning && j > 0)flag = true;
          }
          if(!flag){
              slot.reelArr[ind].startSpin(slot.spinData[ind]);
          }
        }
      }
    }
  }
  else{
      slot.stopSpin(slot.spinData);
  }
}

slot.setActiveLineButton = function(buttonIndex, setActiveLine = true, buttonClick = true){
  if(setActiveLine)
    slot.activeLine = buttonIndex;
  var lineBtnCont = gameManager.objectManager.getObjectByName("lineButtonContainer");
  var ctr = 0;
  lineBtnCont.displayObject.children.forEach(elm =>{
    ctr++;
    if(elm.name == ("btnLine" + buttonIndex)){
      elm.setState("selected");
      elm.clicked = true;
    }
    else{
      if(!setActiveLine && slot.activeLine != ctr){
        elm.setState("init");
        elm.clicked = false;
      }else if(setActiveLine){
        elm.setState("init");
        elm.clicked = false;
      }
    }
  });

  //if the function is invoked by a buttonclick event
  if(buttonClick){
    slot.lineTimer = pixi.timerManager.createTimer(2000);
    slot.lineTimer.start();
    slot.lineTimer.on('end', function(){
      var lineCont = gameManager.objectManager.getObjectByName("lineContainer");
      if(setActiveLine)
        lineCont.displayObject.removeChildren();
    });
  }
}

slot.stopSpin = function(args){
  for(var i = 0; i < 5; i++){
      slot.reelArr[i].stopReel(slot.spinData[i]);
  }
}

slot.finishSpinSequence = function(){
    console.log("spin is finished");
    let gameLogoAnim = gameManager.objectManager.getObjectByName("gameLogo");
    gameLogoAnim.displayObject.gotoAndStop(0);
    if(slot.winData.length != 0){
        var lnCont = gameManager.objectManager.getObjectByName("lineContainer");
        reelLines.animateWinningLines(slot.winData);
        gameManager.objectManager.getObjectByName("cashTextObject").displayObject.setState("play");
        slot.updateWinText();
    }
    else{
      slot.updateWinText("Try Again!")
    }
    slot.spinStarted = false;
    slot.spinning = false;
    slot.setSpinButtonText("SPIN");
    slot.setActiveLineButton(slot.activeLine, true, false);
    gameManager.server.updateWallet();
    slot.updateCashText();
}

slot.updateCashText = function(){
  var cashText = gameManager.objectManager.getObjectByName("cashText");
  cashText.displayObject.content(gameManager.server.wallet);
}

slot.updateWinText = function(text = null){
  var winText = gameManager.objectManager.getObjectByName("winText");
  if(text == null)
    winText.displayObject.content("You Won " + gameManager.server.earnings);
  else
    winText.displayObject.content(text);
}

slot.playSymbolAnimationsByLine = function(winArr, winLine, animCount){
    var animCont = gameManager.objectManager.getObjectByName('animationContainer').displayObject;
    var reelCont = gameManager.objectManager.getObjectByName('slotGameContainer');
    for(var i = 0; i < animCount; i++){
        var anim = new gameManager.animType();
        animCont.addChild(anim.instantiateAnimByName("symbolAnim"));
        anim.displayObject.x = 260 + 154 * i;
        anim.displayObject.y = 124 + 144 * winLine[i];
        anim.displayObject.playAnimation();
    }
}

slot.increaseNumberOfLines = function(){
  let retObj = gameManager.server.increaseNumberOfLines();
  gameManager.objectManager.getObjectByName("lineNumberText").displayObject.content(retObj.selectedLines);
  gameManager.objectManager.getObjectByName("spinValueText").displayObject.content(retObj.spinValue);
  slot.drawLine(retObj.selectedLines, true);
}

slot.decreaseNumberOfLines = function(){
  let retObj = gameManager.server.decreaseNumberOfLines();
  gameManager.objectManager.getObjectByName("lineNumberText").displayObject.content(retObj.selectedLines);
  gameManager.objectManager.getObjectByName("spinValueText").displayObject.content(retObj.spinValue);
  slot.drawLine(retObj.selectedLines, true);
}

slot.increaseCoinValue = function(){
  let retObj = gameManager.server.increaseCoinValue();
  gameManager.objectManager.getObjectByName("coinValueText").displayObject.content(retObj.coinValue);
  gameManager.objectManager.getObjectByName("spinValueText").displayObject.content(retObj.spinValue);
}

slot.decreaseCoinValue = function(){
  let retObj = gameManager.server.decreaseCoinValue();
  gameManager.objectManager.getObjectByName("coinValueText").displayObject.content(retObj.coinValue);
  gameManager.objectManager.getObjectByName("spinValueText").displayObject.content(retObj.spinValue);
}

slot.drawLine = function(v, inc=false){
  slot.setActiveLineButton(v);
  var lnCont = gameManager.objectManager.getObjectByName("lineContainer");
  if(lnCont.displayObject.children != null)
    lnCont.displayObject.removeChildren();


  if(!inc){
    lnCont.displayObject.addChild(gameManager.reelLines.drawLine(v));
    let retObj = gameManager.server.setNumberOfLines(v);
    gameManager.objectManager.getObjectByName("lineNumberText").displayObject.content(retObj.selectedLines);
    gameManager.objectManager.getObjectByName("spinValueText").displayObject.content(retObj.spinValue);
  }
  else{
    for(var i = 1; i < v+1; i++){
      var t = pixi.timerManager.createTimer(i * 100);
      t.start();
      t.on('end', function f(t){
        lnCont.displayObject.addChild(gameManager.reelLines.drawLine(t/100));
      });
    }
  }
}

slot.setSpinButtonText = function(textVal){
  var text = gameManager.objectManager.getObjectByName("spinText");
  text.displayObject.content(textVal);
}
