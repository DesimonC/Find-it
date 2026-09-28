/* =========================================================
   FIND IT!
   player-gameplay.js
   PLAYER GAME STATUS + SCREEN TRANSITIONS

   Collection/challenge rendering now lives in:
   player-collection.js
========================================================= */
console.log("=================================");
console.log("Find It! player-gameplay.js loaded");
console.log("=================================");

let playerGameplayStatusTimer=null;
let playerGameplayStatusPolling=false;
let playerGameplayOpen=false;

function playerGameplayPhotoFlowActive(){
 try{
  if(typeof isPlayerPhotoFlowActive==="function")return isPlayerPhotoFlowActive();
 }catch(error){}
 const photoScreen=document.getElementById("photoUploadScreen");
 return !!(photoScreen&&(photoScreen.classList.contains("active")||photoScreen.style.display==="block"));
}

function stopPlayerGameplayStatusPolling(){
 if(playerGameplayStatusTimer){
  clearInterval(playerGameplayStatusTimer);
  playerGameplayStatusTimer=null;
 }
 try{
  if(typeof stopPlayerGameStatusPolling==="function")stopPlayerGameStatusPolling();
 }catch(error){}
}

async function playerGameplayStatusPoll(){
 if(playerGameplayStatusPolling)return;
 if(!currentPlayerGame||!currentPlayerGame.gameCode)return;
 playerGameplayStatusPolling=true;
 try{
  const result=await apiGet("getGame",{gameCode:currentPlayerGame.gameCode});
  if(!result)return;
  const game=typeof normalisePlayerGame==="function"?normalisePlayerGame(result):result;
  if(!game||!game.gameCode)return;
  if(typeof shouldAcceptPlayerGameStatus==="function"&&!shouldAcceptPlayerGameStatus(currentPlayerGame.status,game.status))return;

  currentPlayerGame={...currentPlayerGame,...game};
  if(typeof savePlayerSession==="function")savePlayerSession();
  console.log("PLAYER GAMEPLAY: Game status:",currentPlayerGame.status);

  if(currentPlayerGame.status==="PLAYING"||currentPlayerGame.status==="SCORING"){
   if(typeof window.refreshPlayerCategories!=="function"||typeof window.openPlayerCollectionScreen!=="function"){
    throw new Error("player-collection.js is not loaded before player-gameplay.js");
   }
   if(playerGameplayPhotoFlowActive()){
    playerGameplayOpen=true;
    await window.refreshPlayerCategories();
    return;
   }
   if(!playerGameplayOpen){
    playerGameplayOpen=true;
    await window.openPlayerCollectionScreen(currentPlayerGame,currentPlayer);
   }else{
    await window.refreshPlayerCategories();
   }
   return;
  }

  if(currentPlayerGame.status==="VOTING"){
   playerGameplayOpen=false;
   if(typeof openVoting==="function")await openVoting();
   else if(typeof openVotingScreen==="function")await openVotingScreen();
   else if(typeof window.showScreen==="function")window.showScreen("votingScreen");
   return;
  }

  if(currentPlayerGame.status==="FINISHED"){
   playerGameplayOpen=false;
   stopPlayerGameplayStatusPolling();
   if(typeof openWinnerScreen==="function")await openWinnerScreen();
   else if(typeof openResults==="function")await openResults();
   else if(typeof window.showScreen==="function")window.showScreen("winnerScreen");
  }
 }catch(error){
  console.error("PLAYER GAMEPLAY: Status poll failed:",error);
 }finally{
  playerGameplayStatusPolling=false;
 }
}

function startPlayerGameplayStatusPolling(){
 stopPlayerGameplayStatusPolling();
 playerGameplayStatusTimer=setInterval(playerGameplayStatusPoll,2000);
}

async function openPlayerGameplay(game,player){
 console.log("PLAYER GAMEPLAY: openPlayerGame entry:",{
  gameCode:game&&(game.gameCode||game.GameCode),
  playerId:player&&(player.playerId||player.PlayerID)
 });
 if(!game||!player){
  console.error("PLAYER GAMEPLAY: Cannot open game - missing game/player.");
  return;
 }
 currentPlayerGame=typeof normalisePlayerGame==="function"?normalisePlayerGame(game):game;
 currentPlayer=typeof normalisePlayer==="function"?normalisePlayer(player):player;
 if(!currentPlayerGame||!currentPlayerGame.gameCode||!currentPlayer||!currentPlayer.playerId){
  console.error("PLAYER GAMEPLAY: Invalid normalised game/player state.");
  return;
 }
 if(currentPlayerGame.hostPlayerId&&String(currentPlayer.playerId).trim().toUpperCase()===String(currentPlayerGame.hostPlayerId).trim().toUpperCase())currentPlayer.isHost=true;
 if(typeof savePlayerSession==="function")savePlayerSession();

 if(currentPlayerGame.status==="PLAYING"||currentPlayerGame.status==="SCORING"){
  if(typeof window.openPlayerCollectionScreen!=="function"){
   throw new Error("openPlayerCollectionScreen() unavailable. Load player-collection.js before player-gameplay.js.");
  }
  playerGameplayOpen=true;
  await window.openPlayerCollectionScreen(currentPlayerGame,currentPlayer);
 }
 startPlayerGameplayStatusPolling();
 console.log("PLAYER GAMEPLAY: Gameplay initialised.");
}

window.openPlayerGame=openPlayerGameplay;
window.playerGameplayStatusPoll=playerGameplayStatusPoll;
window.startPlayerGameplayStatusPolling=startPlayerGameplayStatusPolling;
window.stopPlayerGameplayStatusPolling=stopPlayerGameplayStatusPolling;

console.log("PLAYER GAMEPLAY: exports ready:",{
 openPlayerGame:typeof window.openPlayerGame,
 playerGameplayStatusPoll:typeof window.playerGameplayStatusPoll
});