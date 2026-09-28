/* =========================================================
   FIND IT!
   player-collection.js
   COLLECTION / CHALLENGE SCREEN
========================================================= */
console.log("=================================");
console.log("Find It! player-collection.js loaded");
console.log("=================================");

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
 const playerId=String(currentPlayer.playerId||currentPlayer.PlayerID||"").trim().toUpperCase();
 const hostId=String(currentPlayerGame.hostPlayerId||currentPlayerGame.HostPlayerID||"").trim().toUpperCase();
 const explicitHost=currentPlayer.isHost===true||String(currentPlayer.isHost||"").toLowerCase()==="true";
 if(explicitHost)return true;
 if(playerId&&hostId&&playerId===hostId)return true;
 const players=Array.isArray(currentPlayerGame.players)?currentPlayerGame.players:[];
 return players.some(function(p){
  const id=String(p.playerId||p.PlayerID||"").trim().toUpperCase();
  const isHost=p.isHost===true||String(p.isHost||"").toLowerCase()==="true";
  return !!(playerId&&id===playerId&&isHost);
 });
}

async function gameplayLoadPlayers(game,player){
 if(!game||!game.gameCode)return[];
 let serverPlayers=[];
 try{
  const result=await apiGet("getPlayers",{gameCode:game.gameCode});
  if(Array.isArray(result))serverPlayers=result;
  else if(result&&Array.isArray(result.players))serverPlayers=result.players;
 }catch(error){console.error("PLAYER COLLECTION: Could not get players:",error);}
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
 if(currentPlayer&&currentPlayer.playerId&&game.hostPlayerId&&String(currentPlayer.playerId).trim().toUpperCase()===String(game.hostPlayerId).trim().toUpperCase())currentPlayer.isHost=true;
 return merged;
}

async function gameplayLoadCategories(game){
 if(!game||!game.gameCode){gameplayCategories=[];return[];}
 try{
  console.log("PLAYER COLLECTION: Requesting getGameCategories:",game.gameCode);
  const result=await apiGet("getGameCategories",{gameCode:game.gameCode});
  let categories=[];
  if(result&&Array.isArray(result.categories))categories=result.categories;
  else if(Array.isArray(result))categories=result;
  gameplayCategories=categories.map(normaliseGameplayCategory).filter(c=>c.categoryId!==""||c.categoryNumber).sort((a,b)=>a.categoryNumber-b.categoryNumber);
  console.log("PLAYER COLLECTION: Categories loaded:",gameplayCategories);
  return gameplayCategories;
 }catch(error){console.error("PLAYER COLLECTION: Could not load categories:",error);gameplayCategories=[];return[];}
}

async function gameplayLoadProgress(game,player){
 gameplayCompletedCategoryIds=new Set();
 gameplayCompletedCategoryNumbers=new Set();
 gameplaySubmittedPhotosById=new Map();
 gameplaySubmittedPhotosByNumber=new Map();
 if(!game||!game.gameCode||!player||!player.playerId)return;
 const activePlayerId=String(player.playerId||player.PlayerID||"").trim().toUpperCase();
 async function addCompleted(action,collectionName){
  try{
   const result=await apiGet(action,{gameCode:game.gameCode});
   let rows=[];
   if(result&&Array.isArray(result[collectionName]))rows=result[collectionName];
   else if(Array.isArray(result))rows=result;
   rows.forEach(row=>{
    const rowPlayerId=String(row.playerId||row.PlayerID||"").trim().toUpperCase();
    if(!rowPlayerId||rowPlayerId!==activePlayerId)return;
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
  }catch(error){console.error("PLAYER COLLECTION: Could not load "+action+":",error);}
 }
 await addCompleted("getEntries","entries");
}

function gameplayCategoryComplete(category){
 if(!category)return false;
 const id=String(category.categoryId||"").trim(),number=Number(category.categoryNumber||0);
 return !!((id&&gameplayCompletedCategoryIds.has(id))||(number&&gameplayCompletedCategoryNumbers.has(number)));
}

function gameplayCategoryPhoto(category){
 if(!category)return"";
 const id=String(category.categoryId||"").trim(),number=Number(category.categoryNumber||0);
 return (id&&gameplaySubmittedPhotosById.get(id))||(number&&gameplaySubmittedPhotosByNumber.get(number))||"";
}

function gameplayEscapeHtml(value){return String(value||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");}
function gameplayEscapeAttribute(value){return gameplayEscapeHtml(value);}

function gameplaySetCurrentCategory(category){
 gameplayCurrentCategory=normaliseGameplayCategory(category);
 if(!gameplayCurrentCategory.gameCode&&currentPlayerGame)gameplayCurrentCategory.gameCode=currentPlayerGame.gameCode;
 try{playerCurrentCategory=gameplayCurrentCategory;}catch(error){}
 try{localStorage.setItem("findItCurrentCategory",JSON.stringify(gameplayCurrentCategory));}catch(error){console.error("PLAYER COLLECTION: Could not save current category:",error);}
}

function gameplayOpenCategory(category){
 category=normaliseGameplayCategory(category);
 if(gameplayCategoryComplete(category))return;
 gameplaySetCurrentCategory(category);
 if(typeof window.openPhotoUpload==="function"){window.openPhotoUpload(category);return;}
 console.error("PLAYER COLLECTION: openPhotoUpload() is unavailable.");
 if(typeof window.showScreen==="function")window.showScreen("photoUploadScreen");
}

async function gameplayStartVoting(){
 if(gameplayStartVotingBusy||!gameplayIsHost()||!currentPlayerGame||!currentPlayerGame.gameCode)return;
 const allComplete=gameplayCategories.length>0&&gameplayCategories.every(gameplayCategoryComplete);
 if(!allComplete)return;
 const button=document.getElementById("scoreGameButton");
 gameplayStartVotingBusy=true;
 if(button){button.disabled=true;button.textContent="Starting Voting...";}
 try{
  const result=await apiPost("startVoting",{gameCode:currentPlayerGame.gameCode,playerId:currentPlayer.playerId});
  if(!result||result.success===false)throw new Error(result&&result.error?result.error:"Could not start voting.");
  if(button)button.textContent="Waiting for Voting...";
  if(typeof window.playerGameplayStatusPoll==="function")await window.playerGameplayStatusPoll();
 }catch(error){
  console.error("PLAYER COLLECTION: Start Voting failed:",error);
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
 const allComplete=total>0&&completedCount===total;
 if(!isHost||!allComplete){
  controls.classList.add("hidden");controls.style.display="none";
  button.onclick=null;button.disabled=true;button.style.display="none";return;
 }
 controls.classList.remove("hidden");controls.hidden=false;controls.style.display="block";
 const card=controls.querySelector(".host-control-card");
 const text=card?card.querySelector("p"):null;
 if(text)text.textContent="All your challenges are complete. Press Start Voting when you are ready.";
 button.classList.remove("hidden");button.hidden=false;button.style.display="block";
 button.textContent=gameplayStartVotingBusy?"Starting Voting...":"Start Voting";
 button.disabled=gameplayStartVotingBusy;
 button.onclick=function(event){event.preventDefault();gameplayStartVoting();};
}

function gameplayUpdateWaitingMessage(completedCount,total){
 let message=document.getElementById("collectionWaitingForHost");
 if(!message){
  message=document.createElement("div");
  message.id="collectionWaitingForHost";
  message.className="collection-waiting-message";
  message.style.display="none";
  const cards=document.getElementById("categoryCards");
  if(cards&&cards.parentNode)cards.parentNode.insertBefore(message,cards.nextSibling);
 }
 const show=!gameplayIsHost()&&total>0&&completedCount===total&&currentPlayerGame&&currentPlayerGame.status==="PLAYING";
 if(show){message.textContent="Waiting for the host to start voting…";message.style.display="block";}
 else message.style.display="none";
}

function gameplayRenderCategoryCards(categories){
 const container=document.getElementById("categoryCards");
 if(!container){console.error("PLAYER COLLECTION: #categoryCards not found.");return;}
 categories=Array.isArray(categories)?categories:gameplayCategories;
 container.innerHTML="";
 if(!categories.length){container.innerHTML='<div class="category-empty">No challenges were returned for this game.</div>';gameplayUpdateWaitingMessage(0,0);gameplayUpdateHostVotingControl(0,0);return;}
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
 const total=categories.length;
 const progressText=document.getElementById("collectionProgressText");
 if(progressText)progressText.textContent=completedCount+" / "+total;
 const progressBar=document.getElementById("collectionProgressBar");
 if(progressBar){const percent=total>0?Math.round(completedCount/total*100):0;progressBar.style.width=percent+"%";}
 gameplayUpdateWaitingMessage(completedCount,total);
 gameplayUpdateHostVotingControl(completedCount,total);
}

async function gameplayRefreshCategories(){
 if(!currentPlayerGame||!currentPlayer)return;
 await gameplayLoadCategories(currentPlayerGame);
 await gameplayLoadProgress(currentPlayerGame,currentPlayer);
 gameplayRenderCategoryCards(gameplayCategories);
}

async function openGameplayCollectionScreen(game,player){
 currentPlayerGame=typeof normalisePlayerGame==="function"?normalisePlayerGame(game):game;
 currentPlayer=typeof normalisePlayer==="function"?normalisePlayer(player):player;
 if(currentPlayerGame.hostPlayerId&&String(currentPlayer.playerId).trim().toUpperCase()===String(currentPlayerGame.hostPlayerId).trim().toUpperCase())currentPlayer.isHost=true;
 await gameplayLoadPlayers(currentPlayerGame,currentPlayer);
 if(typeof savePlayerSession==="function")savePlayerSession();
 const nameElement=document.getElementById("collectionPlayerName");if(nameElement)nameElement.textContent=currentPlayer.playerName||"";
 await gameplayLoadCategories(currentPlayerGame);
 await gameplayLoadProgress(currentPlayerGame,currentPlayer);
 gameplayRenderCategoryCards(gameplayCategories);
 if(typeof window.showScreen==="function")window.showScreen("collectionScreen");
 else if(typeof showScreen==="function")showScreen("collectionScreen");
 else throw new Error("showScreen() is unavailable.");
 if(typeof setupHostCollectionControls==="function")setupHostCollectionControls();
 if(typeof checkAndUpdateHostControls==="function")await checkAndUpdateHostControls();
 const completed=gameplayCategories.filter(gameplayCategoryComplete).length;
 gameplayUpdateWaitingMessage(completed,gameplayCategories.length);
 gameplayUpdateHostVotingControl(completed,gameplayCategories.length);
}

window.openPlayerCollectionScreen=openGameplayCollectionScreen;
window.loadPlayerCategories=gameplayLoadCategories;
window.loadPlayerProgress=gameplayLoadProgress;
window.renderPlayerCategoryCards=gameplayRenderCategoryCards;
window.refreshPlayerCategories=gameplayRefreshCategories;
window.gameplayStartVoting=gameplayStartVoting;
console.log("PLAYER COLLECTION: exports ready");