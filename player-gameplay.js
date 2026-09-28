/* =========================================================
   FIND IT!
   player-gameplay.js
   PLAYER GAMEPLAY + COLLECTION / CHALLENGE FLOW
========================================================= */
console.log("=================================");
console.log("Find It! player-gameplay.js loaded");
console.log("=================================");

let playerGameplayStatusTimer=null;
let playerGameplayStatusPolling=false;
let playerGameplayOpen=false;
let gameplayCategories=[];
let gameplayCurrentCategory=null;
let gameplayCompletedCategoryIds=new Set();
let gameplayCompletedCategoryNumbers=new Set();
let gameplaySubmittedPhotosById=new Map();
let gameplaySubmittedPhotosByNumber=new Map();
let gameplayStartVotingBusy=false;

function normaliseGameplayCategory(category){
 category=category||{};
 return {
  categoryId:category.categoryId??category.CategoryID??category.id??category.ID??"",
  categoryNumber:Number(category.categoryNumber??category.CategoryNumber??category.number??category.Number??0),
  categoryName:category.categoryName||category.CategoryName||category.name||category.Name||"",
  description:category.description||category.Description||"",
  gameCode:String(category.gameCode||category.GameCode||"").trim().toUpperCase()
 };
}

function gameplayIsHost(){
 if(!currentPlayer||!currentPlayerGame)return false;
 const playerId=String(currentPlayer.playerId||currentPlayer.PlayerID||"").trim();
 const hostId=String(currentPlayerGame.hostPlayerId||currentPlayerGame.HostPlayerID||"").trim();
 return !!(currentPlayer.isHost===true||(playerId&&hostId&&playerId===hostId));
}

async function gameplayLoadPlayers(game,player){
 if(!game||!game.gameCode)return[];
 let serverPlayers=[];
 try{
  const result=await apiGet("getPlayers",{gameCode:game.gameCode});
  if(Array.isArray(result))serverPlayers=result;
  else if(result&&Array.isArray(result.players))serverPlayers=result.players;
 }catch(error){console.error("PLAYER GAMEPLAY: Could not get players:",error);}
 const merged=[],seen=new Set();
 function addPlayer(item){
  if(!item)return;
  const p=typeof normalisePlayer==="function"?normalisePlayer(item):{...item,playerId:String(item.playerId||item.PlayerID||"").trim(),playerName:String(item.playerName||item.PlayerName||"").trim(),gameCode:String(item.gameCode||item.GameCode||game.gameCode||"").trim().toUpperCase()};
  if(!p.playerId||seen.has(p.playerId))return;
  seen.add(p.playerId);merged.push(p);
 }
 serverPlayers.forEach(addPlayer);
 if(game.hostPlayerId&&!seen.has(game.hostPlayerId))addPlayer({playerId:game.hostPlayerId,gameCode:game.gameCode,playerName:game.hostName||"Host",isHost:true});
 if(player&&player.playerId&&!seen.has(player.playerId))addPlayer(player);
 merged.forEach(item=>{if(game.hostPlayerId&&String(item.playerId).trim()===String(game.hostPlayerId).trim())item.isHost=true;});
 game.players=merged;currentPlayerGame=game;
 if(currentPlayer&&currentPlayer.playerId&&game.hostPlayerId&&currentPlayer.playerId===game.hostPlayerId)currentPlayer.isHost=true;
 return merged;
}

async function gameplayLoadCategories(game){
 if(!game||!game.gameCode){gameplayCategories=[];return[];}
 try{
  console.log("PLAYER GAMEPLAY: Requesting getGameCategories:",game.gameCode);
  const result=await apiGet("getGameCategories",{gameCode:game.gameCode});
  console.log("PLAYER GAMEPLAY: Raw getGameCategories response:",result);
  let categories=[];
  if(result&&Array.isArray(result.categories))categories=result.categories;
  else if(Array.isArray(result))categories=result;
  gameplayCategories=categories.map(normaliseGameplayCategory).filter(c=>c.categoryId!==""||c.categoryNumber).sort((a,b)=>a.categoryNumber-b.categoryNumber);
  console.log("PLAYER GAMEPLAY: Categories loaded:",gameplayCategories);
  return gameplayCategories;
 }catch(error){console.error("PLAYER GAMEPLAY: Could not load categories:",error);gameplayCategories=[];return[];}
}

async function gameplayLoadProgress(game,player){
 gameplayCompletedCategoryIds=new Set();
 gameplayCompletedCategoryNumbers=new Set();
 gameplaySubmittedPhotosById=new Map();
 gameplaySubmittedPhotosByNumber=new Map();
 if(!game||!game.gameCode||!player||!player.playerId)return;
 async function addCompleted(action,collectionName){
  try{
   const result=await apiGet(action,{gameCode:game.gameCode});
   let rows=[];
   if(result&&Array.isArray(result[collectionName]))rows=result[collectionName];
   else if(Array.isArray(result))rows=result;
   rows.forEach(row=>{
    const rowPlayerId=String(row.playerId||row.PlayerID||"").trim();
    if(rowPlayerId!==player.playerId)return;
    const categoryId=row.categoryId??row.CategoryID??"";
    const categoryNumber=Number(row.categoryNumber??row.CategoryNumber??0);
    if(categoryId!=="")gameplayCompletedCategoryIds.add(String(categoryId));
    if(categoryNumber)gameplayCompletedCategoryNumbers.add(categoryNumber);
    if(collectionName==="entries"){
     const photoUrl=String(row.photoUrl||row.PhotoURL||"").trim();
     if(photoUrl){
      if(categoryId!=="")gameplaySubmittedPhotosById.set(String(categoryId),photoUrl);
      if(categoryNumber)gameplaySubmittedPhotosByNumber.set(categoryNumber,photoUrl);
     }
    }
   });
  }catch(error){console.error("PLAYER GAMEPLAY: Could not load "+action+":",error);}
 }
 await addCompleted("getEntries","entries");
 await addCompleted("getPasses","passes");
}

function gameplayCategoryComplete(category){
 if(!category)return false;
 const id=String(category.categoryId||"").trim(),number=Number(category.categoryNumber||0);
 return!!((id&&gameplayCompletedCategoryIds.has(id))||(number&&gameplayCompletedCategoryNumbers.has(number)));
}
function gameplayCategoryPhoto(category){
 if(!category)return"";
 const id=String(category.categoryId||"").trim(),number=Number(category.categoryNumber||0);
 return(id&&gameplaySubmittedPhotosById.get(id))||(number&&gameplaySubmittedPhotosByNumber.get(number))||"";
}
function gameplayEscapeHtml(value){return String(value||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");}
function gameplayEscapeAttribute(value){return gameplayEscapeHtml(value);}

function gameplaySetCurrentCategory(category){
 gameplayCurrentCategory=normaliseGameplayCategory(category);
 if(!gameplayCurrentCategory.gameCode&&currentPlayerGame)gameplayCurrentCategory.gameCode=currentPlayerGame.gameCode;
 try{playerCurrentCategory=gameplayCurrentCategory;}catch(error){}
 try{localStorage.setItem("findItCurrentCategory",JSON.stringify(gameplayCurrentCategory));}catch(error){console.error("PLAYER GAMEPLAY: Could not save current category:",error);}
}
function gameplayOpenCategory(category){
 category=normaliseGameplayCategory(category);
 if(gameplayCategoryComplete(category))return;
 console.log("PLAYER GAMEPLAY: Opening challenge:",category);
 gameplaySetCurrentCategory(category);
 if(typeof window.openPhotoUpload==="function"){window.openPhotoUpload(category);return;}
 console.error("PLAYER GAMEPLAY: openPhotoUpload() is unavailable.");
 if(typeof window.showScreen==="function")window.showScreen("photoUploadScreen");
}

async function gameplayStartVoting(){
 if(gameplayStartVotingBusy||!gameplayIsHost()||!currentPlayerGame||!currentPlayerGame.gameCode)return;
 const allComplete=gameplayCategories.length>0&&gameplayCategories.every(gameplayCategoryComplete);
 if(!allComplete){console.warn("PLAYER GAMEPLAY: Start Voting blocked - host challenges are not complete.");return;}
 const button=document.getElementById("scoreGameButton");
 gameplayStartVotingBusy=true;
 if(button){button.disabled=true;button.textContent="Starting Voting...";}
 try{
  console.log("PLAYER GAMEPLAY: Host requesting startVoting:",currentPlayerGame.gameCode);
  const result=await apiPost("startVoting",{gameCode:currentPlayerGame.gameCode,playerId:currentPlayer.playerId});
  if(!result||result.success===false)throw new Error(result&&result.error?result.error:"Could not start voting.");
  console.log("PLAYER GAMEPLAY: startVoting accepted. Waiting for server VOTING status.",result);
  if(button)button.textContent="Waiting for Voting...";
  /* Do not navigate here. The status poll owns the VOTING transition for everyone. */
  await playerGameplayStatusPoll();
 }catch(error){
  console.error("PLAYER GAMEPLAY: Start Voting failed:",error);
  gameplayStartVotingBusy=false;
  if(button){button.disabled=false;button.textContent="Start Voting";}
  alert(error.message||"Could not start voting.");
 }
}

function gameplayUpdateHostVotingControl(completedCount,total){
 const controls=document.getElementById("hostCollectionControls");
 const button=document.getElementById("scoreGameButton");
 if(!controls||!button)return;
 const isHost=gameplayIsHost();
 const allComplete=total>0&&completedCount>=total;
 if(!isHost){controls.classList.add("hidden");controls.style.display="none";return;}
 controls.classList.remove("hidden");controls.style.display="";
 const card=controls.querySelector(".host-control-card");
 const text=card?card.querySelector("p"):null;
 if(allComplete){
  if(text)text.textContent="All your challenges are complete. Start voting when you are ready to move everyone to the voting screen.";
  button.textContent=gameplayStartVotingBusy?"Starting Voting...":"Start Voting";
  button.disabled=gameplayStartVotingBusy;
  button.onclick=function(event){event.preventDefault();gameplayStartVoting();};
  button.style.display="";
 }else{
  if(text)text.textContent="Complete all your challenges. The Start Voting button will appear when your collection is complete.";
  button.onclick=null;
  button.disabled=true;
  button.style.display="none";
 }
}

function gameplayRenderCategoryCards(categories){
 const container=document.getElementById("categoryCards");
 if(!container){console.error("PLAYER GAMEPLAY: #categoryCards not found.");return;}
 categories=Array.isArray(categories)?categories:gameplayCategories;
 container.innerHTML="";
 if(!categories.length){container.innerHTML='<div class="category-empty">No challenges were returned for this game.</div>';gameplayUpdateHostVotingControl(0,0);return;}
 let completedCount=0;
 categories.forEach(function(category,index){
  const complete=gameplayCategoryComplete(category),photoUrl=gameplayCategoryPhoto(category);
  if(complete)completedCount++;
  const card=document.createElement("button");
  card.type="button";card.className="category-card";
  if(complete){card.classList.add("completed");card.disabled=true;card.setAttribute("aria-disabled","true");}
  const number=category.categoryNumber||index+1,name=category.categoryName||"Find It!";
  const thumbnail=complete&&photoUrl?`<div class="category-photo-thumbnail" style="margin:8px auto 6px;max-width:120px;"><img src="${gameplayEscapeAttribute(photoUrl)}" alt="Submitted photo for ${gameplayEscapeAttribute(name)}" loading="lazy" style="display:block;width:100%;height:90px;object-fit:cover;border-radius:10px;"></div>`:"";
  card.innerHTML=`<div class="category-number">${number}</div><div class="category-name">${gameplayEscapeHtml(name)}</div>${thumbnail}<div class="category-action">${complete?(photoUrl?"✓ Completed":"✓ Passed"):"FIND IT →"}</div>`;
  if(!complete)card.addEventListener("click",function(event){event.preventDefault();gameplayOpenCategory(category);});
  container.appendChild(card);
 });
 const total=categories.length,progressText=document.getElementById("collectionProgressText");
 if(progressText)progressText.textContent=completedCount+" / "+total;
 const progressBar=document.getElementById("collectionProgressBar");
 if(progressBar){const percent=total>0?Math.round(completedCount/total*100):0;progressBar.style.width=percent+"%";}
 gameplayUpdateHostVotingControl(completedCount,total);
}

async function gameplayRefreshCategories(){if(!currentPlayerGame||!currentPlayer)return;await gameplayLoadCategories(currentPlayerGame);await gameplayLoadProgress(currentPlayerGame,currentPlayer);gameplayRenderCategoryCards(gameplayCategories);}

async function openGameplayCollectionScreen(game,player){
 currentPlayerGame=typeof normalisePlayerGame==="function"?normalisePlayerGame(game):game;
 currentPlayer=typeof normalisePlayer==="function"?normalisePlayer(player):player;
 if(currentPlayerGame.hostPlayerId&&currentPlayer.playerId===currentPlayerGame.hostPlayerId)currentPlayer.isHost=true;
 console.log("PLAYER GAMEPLAY: Opening collection screen:",{gameCode:currentPlayerGame.gameCode,playerId:currentPlayer.playerId});
 await gameplayLoadPlayers(currentPlayerGame,currentPlayer);
 if(typeof savePlayerSession==="function")savePlayerSession();
 const nameElement=document.getElementById("collectionPlayerName");if(nameElement)nameElement.textContent=currentPlayer.playerName||"";
 await gameplayLoadCategories(currentPlayerGame);await gameplayLoadProgress(currentPlayerGame,currentPlayer);gameplayRenderCategoryCards(gameplayCategories);
 if(typeof window.showScreen==="function")window.showScreen("collectionScreen");else if(typeof showScreen==="function")showScreen("collectionScreen");else throw new Error("showScreen() is unavailable.");
 /* Legacy Host.js controls may run here; re-apply the new host-only voting contract afterwards. */
 if(typeof setupHostCollectionControls==="function")setupHostCollectionControls();
 if(typeof checkAndUpdateHostControls==="function")await checkAndUpdateHostControls();
 const completed=gameplayCategories.filter(gameplayCategoryComplete).length;
 gameplayUpdateHostVotingControl(completed,gameplayCategories.length);
 console.log("PLAYER GAMEPLAY: Collection rendered with",gameplayCategories.length,"challenge(s).");
}

function playerGameplayPhotoFlowActive(){
 try{if(typeof isPlayerPhotoFlowActive==="function")return isPlayerPhotoFlowActive();}catch(error){}
 const photoScreen=document.getElementById("photoUploadScreen");
 return!!(photoScreen&&(photoScreen.classList.contains("active")||photoScreen.style.display==="block"));
}
function stopPlayerGameplayStatusPolling(){
 if(playerGameplayStatusTimer){clearInterval(playerGameplayStatusTimer);playerGameplayStatusTimer=null;}
 try{if(typeof stopPlayerGameStatusPolling==="function")stopPlayerGameStatusPolling();}catch(error){}
}
async function playerGameplayStatusPoll(){
 if(playerGameplayStatusPolling)return;if(!currentPlayerGame||!currentPlayerGame.gameCode)return;playerGameplayStatusPolling=true;
 try{
  const result=await apiGet("getGame",{gameCode:currentPlayerGame.gameCode});if(!result)return;
  const game=typeof normalisePlayerGame==="function"?normalisePlayerGame(result):result;if(!game||!game.gameCode)return;
  if(typeof shouldAcceptPlayerGameStatus==="function"&&!shouldAcceptPlayerGameStatus(currentPlayerGame.status,game.status))return;
  currentPlayerGame={...currentPlayerGame,...game};if(typeof savePlayerSession==="function")savePlayerSession();
  console.log("PLAYER GAMEPLAY: Game status:",currentPlayerGame.status);
  if(currentPlayerGame.status==="PLAYING"||currentPlayerGame.status==="SCORING"){
   /* SCORING is retained as a legacy backend status, but it no longer changes screens. */
   if(playerGameplayPhotoFlowActive()){playerGameplayOpen=true;await gameplayRefreshCategories();return;}
   if(!playerGameplayOpen){playerGameplayOpen=true;await openGameplayCollectionScreen(currentPlayerGame,currentPlayer);}else await gameplayRefreshCategories();return;
  }
  if(currentPlayerGame.status==="VOTING"){
   playerGameplayOpen=false;gameplayStartVotingBusy=false;
   if(typeof openVoting==="function")await openVoting();else if(typeof openVotingScreen==="function")await openVotingScreen();else if(typeof window.showScreen==="function")window.showScreen("votingScreen");return;
  }
  if(currentPlayerGame.status==="FINISHED"){
   playerGameplayOpen=false;stopPlayerGameplayStatusPolling();
   if(typeof openWinnerScreen==="function")await openWinnerScreen();else if(typeof openResults==="function")await openResults();else if(typeof window.showScreen==="function")window.showScreen("winnerScreen");
  }
 }catch(error){console.error("PLAYER GAMEPLAY: Status poll failed:",error);}finally{playerGameplayStatusPolling=false;}
}
function startPlayerGameplayStatusPolling(){stopPlayerGameplayStatusPolling();playerGameplayStatusTimer=setInterval(playerGameplayStatusPoll,2000);}

async function openPlayerGameplay(game,player){
 console.log("PLAYER GAMEPLAY: openPlayerGame entry:",{gameCode:game&&(game.gameCode||game.GameCode),playerId:player&&(player.playerId||player.PlayerID)});
 if(!game||!player){console.error("PLAYER GAMEPLAY: Cannot open game - missing game/player.");return;}
 currentPlayerGame=typeof normalisePlayerGame==="function"?normalisePlayerGame(game):game;
 currentPlayer=typeof normalisePlayer==="function"?normalisePlayer(player):player;
 if(!currentPlayerGame||!currentPlayerGame.gameCode||!currentPlayer||!currentPlayer.playerId){console.error("PLAYER GAMEPLAY: Invalid normalised game/player state.");return;}
 if(currentPlayerGame.hostPlayerId&&currentPlayer.playerId===currentPlayerGame.hostPlayerId)currentPlayer.isHost=true;
 if(typeof savePlayerSession==="function")savePlayerSession();
 if(currentPlayerGame.status==="PLAYING"||currentPlayerGame.status==="SCORING"){playerGameplayOpen=true;await openGameplayCollectionScreen(currentPlayerGame,currentPlayer);}
 startPlayerGameplayStatusPolling();console.log("PLAYER GAMEPLAY: Gameplay initialised.");
}

window.openPlayerGame=openPlayerGameplay;
window.openPlayerCollectionScreen=openGameplayCollectionScreen;
window.loadPlayerCategories=gameplayLoadCategories;
window.loadPlayerProgress=gameplayLoadProgress;
window.renderPlayerCategoryCards=gameplayRenderCategoryCards;
window.refreshPlayerCategories=gameplayRefreshCategories;
window.playerGameplayStatusPoll=playerGameplayStatusPoll;
window.startPlayerGameplayStatusPolling=startPlayerGameplayStatusPolling;
window.stopPlayerGameplayStatusPolling=stopPlayerGameplayStatusPolling;
window.gameplayStartVoting=gameplayStartVoting;
console.log("PLAYER GAMEPLAY: exports ready:",{openPlayerGame:typeof window.openPlayerGame,openPlayerCollectionScreen:typeof window.openPlayerCollectionScreen,loadPlayerCategories:typeof window.loadPlayerCategories,renderPlayerCategoryCards:typeof window.renderPlayerCategoryCards});