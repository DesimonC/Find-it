/* =========================================================

FIND IT!

Players.gs

PLAYER CREATION / JOIN / REJOIN / PLAYER LOOKUPS


IMPORTANT:

getGame(gameCode) returns the GAME OBJECT directly.


It does NOT return:

{

success: true,

game: {...}

}

========================================================= */



/* =========================================================

GENERATE PLAYER ID

========================================================= */


function generatePlayerId() {


return (

"P" +

Utilities

.getUuid()

.replace(/-/g, "")

.substring(0, 12)

.toUpperCase()

);

}



/* =========================================================

ADD PLAYER TO SHEET

========================================================= */


function addPlayerToSheet(data) {


data =

data || {};


const playerId =

String(

data.playerId || ""

).trim();


const gameCode =

String(

data.gameCode || ""

)

.trim()

.toUpperCase();


const playerName =

String(

data.playerName || ""

).trim();


const isHost =

data.isHost === true ||

String(

data.isHost || ""

)

.toLowerCase() === "true";



if (

!playerId ||

!gameCode ||

!playerName

) {


throw new Error(

"Player ID, game code and player name are required."

);

}



const sheet =

getSheet(

PLAYERS_SHEET

);



const headers =

getHeaders(

sheet

);



const requiredColumns = [

"PlayerID",

"GameCode",

"PlayerName",

"IsHost",

"Joined",

"Completed",

"Passed",

"Score"

];



requiredColumns.forEach(

function(column) {


if (

findColumn(

headers,

column

) === -1

) {


throw new Error(

"Players sheet is missing column: " +

column

);

}

}

);



const row =

new Array(

headers.length

).fill("");



setIfColumnExists(

row,

headers,

"PlayerID",

playerId

);


setIfColumnExists(

row,

headers,

"GameCode",

gameCode

);


setIfColumnExists(

row,

headers,

"PlayerName",

playerName

);


setIfColumnExists(

row,

headers,

"IsHost",

isHost

);


setIfColumnExists(

row,

headers,

"Joined",

new Date()

);


setIfColumnExists(

row,

headers,

"Completed",

0

);


setIfColumnExists(

row,

headers,

"Passed",

0

);


setIfColumnExists(

row,

headers,

"Score",

0

);



sheet.appendRow(

row

);



return {


success:

true,


playerId:

playerId,


gameCode:

gameCode,


playerName:

playerName,


isHost:

isHost

};

}



/* =========================================================

JOIN GAME

========================================================= */


function joinGame(data) {


data =

data || {};



const gameCode =

String(

data.gameCode || ""

)

.trim()

.toUpperCase();



const playerName =

String(

data.playerName ||

data.name ||

""

).trim();



if (!gameCode) {


return {

success: false,

error:

"Game code is required."

};

}



if (!playerName) {


return {

success: false,

error:

"Player name is required."

};

}



/* ---------------------------------------------------------

GET GAME


getGame() returns the game directly.

--------------------------------------------------------- */


const game =

getGame(

gameCode

);



if (!game) {


return {

success: false,

error:

"Game not found."

};

}



if (

String(

game.status || ""

)

.trim()

.toUpperCase() !==

"WAITING"

) {


return {

success: false,

error:

"This game has already started."

};

}



/* ---------------------------------------------------------

CHECK DUPLICATE NAME

--------------------------------------------------------- */


const playersResult =

findPlayers(

gameCode

);



if (

playersResult &&

playersResult.success

) {


const duplicate =

playersResult.players.some(

function(player) {


return (

String(

player.name ||

player.playerName ||

""

)

.trim()

.toLowerCase() ===

playerName.toLowerCase()

);

}

);



if (duplicate) {


return {

success: false,

error:

"That player name is already in use."

};

}

}



/* ---------------------------------------------------------

CREATE PLAYER

--------------------------------------------------------- */


const playerId =

generatePlayerId();



addPlayerToSheet({


playerId:

playerId,


gameCode:

gameCode,


playerName:

playerName,


isHost:

false

});



return {


success: true,


player: {


playerId:

playerId,


gameCode:

gameCode,


name:

playerName,


playerName:

playerName,


isHost:

false,


completed:

0,


passed:

0,


score:

0

},


game:

game

};

}



/* =========================================================

REJOIN GAME

========================================================= */


function rejoinGame(data) {


data =

data || {};



const gameCode =

String(

data.gameCode || ""

)

.trim()

.toUpperCase();



const playerName =

String(

data.playerName ||

data.name ||

""

).trim();



if (!gameCode) {


return {

success: false,

error:

"Game code is required."

};

}



if (!playerName) {


return {

success: false,

error:

"Player name is required."

};

}



/* ---------------------------------------------------------

GET GAME


getGame() returns the game directly.

--------------------------------------------------------- */


const game =

getGame(

gameCode

);



if (!game) {


return {

success: false,

error:

"Game not found."

};

}



const sheet =

getSheet(

PLAYERS_SHEET

);



const headers =

getHeaders(

sheet

);



const lastRow =

sheet.getLastRow();



if (

lastRow < 2

) {


return {

success: false,

error:

"Player not found."

};

}



const values =

sheet

.getRange(

2,

1,

lastRow - 1,

headers.length

)

.getValues();



for (

let i = 0;

i < values.length;

i++

) {


const row =

values[i];



const rowGameCode =

String(

getValueFromRow(

headers,

row,

"GameCode"

) || ""

)

.trim()

.toUpperCase();



const rowPlayerName =

String(

getValueFromRow(

headers,

row,

"PlayerName"

) || ""

).trim();



if (

rowGameCode ===

gameCode &&

rowPlayerName

.toLowerCase() ===

playerName.toLowerCase()

) {


const player =

rowToPlayerObject(

headers,

row

);



return {


success: true,


player:

player,


game:

game

};

}

}



return {


success: false,


error:

"Player not found in this game."

};

}



/* =========================================================

RESTORE HOST

========================================================= */


function restoreHost(data) {


data =

data || {};



const gameCode =

String(

data.gameCode || ""

)

.trim()

.toUpperCase();



if (!gameCode) {


return {

success: false,

error:

"Game code is required."

};

}



/* ---------------------------------------------------------

GET GAME


getGame() returns the game directly.

--------------------------------------------------------- */


const game =

getGame(

gameCode

);



if (!game) {


return {

success: false,

error:

"Game not found."

};

}



/* ---------------------------------------------------------

FIND HOST

--------------------------------------------------------- */


const host =

findPlayer(

gameCode,

game.hostPlayerId

);



if (!host) {


return {

success: false,

error:

"Host player not found."

};

}



if (!host.isHost) {


return {

success: false,

error:

"Player is not the host."

};

}



return {


success: true,


player: {


playerId:

host.playerId,


gameCode:

host.gameCode,


name:

host.name,


playerName:

host.playerName ||

host.name,


isHost:

true,


completed:

host.completed,


passed:

host.passed,


score:

host.score

},


game:

game

};

}



/* =========================================================

GET PLAYERS

========================================================= */


function getPlayers(gameCode) {


gameCode =

String(

gameCode || ""

)

.trim()

.toUpperCase();



if (!gameCode) {


return {


success: false,


players: [],


error:

"Game code is required."

};

}



const result =

findPlayers(

gameCode

);



if (

!result ||

result.success === false

) {


return {


success: false,


players: [],


error:

result &&

result.error

? result.error

: "Unable to load players."

};

}



return {


success: true,


gameCode:

gameCode,


players:

result.players || []

};

}



/* =========================================================

GET SINGLE PLAYER

========================================================= */


function getPlayer(

playerId,

gameCode

) {


playerId =

String(

playerId || ""

).trim();



gameCode =

String(

gameCode || ""

)

.trim()

.toUpperCase();



if (!playerId) {


return {


success: false,


error:

"Player ID is required."

};

}



if (!gameCode) {


return {


success: false,


error:

"Game code is required."

};

}



const player =

findPlayer(

gameCode,

playerId

);



if (!player) {


return {


success: false,


error:

"Player not found."

};

}



return {


success: true,


player:

player

};

}



/* =========================================================

ROW TO PLAYER OBJECT

========================================================= */


function rowToPlayerObject(

headers,

row

) {


const isHostValue =

getValueFromRow(

headers,

row,

"IsHost"

);



const isHost =

isHostValue === true ||

String(

isHostValue || ""

)

.trim()

.toLowerCase() ===

"true";



const playerName =

String(

getValueFromRow(

headers,

row,

"PlayerName"

) || ""

).trim();



return {


playerId:

String(

getValueFromRow(

headers,

row,

"PlayerID"

) || ""

).trim(),


gameCode:

String(

getValueFromRow(

headers,

row,

"GameCode"

) || ""

)

.trim()

.toUpperCase(),


name:

playerName,


playerName:

playerName,


isHost:

isHost,


completed:

Number(

getValueFromRow(

headers,

row,

"Completed"

) || 0

),


passed:

Number(

getValueFromRow(

headers,

row,

"Passed"

) || 0

),


score:

Number(

getValueFromRow(

headers,

row,

"Score"

) || 0

)

};

}



/* =========================================================

FIND PLAYER

========================================================= */


function findPlayer(

gameCode,

playerId

) {


gameCode =

String(

gameCode || ""

)

.trim()

.toUpperCase();



playerId =

String(

playerId || ""

).trim();



if (

!gameCode ||

!playerId

) {

return null;

}



const sheet =

getSheet(

PLAYERS_SHEET

);



const headers =

getHeaders(

sheet

);



const lastRow =

sheet.getLastRow();



if (

lastRow < 2

) {

return null;

}



const values =

sheet

.getRange(

2,

1,

lastRow - 1,

headers.length

)

.getValues();



for (

let i = 0;

i < values.length;

i++

) {


const row =

values[i];



const rowGameCode =

String(

getValueFromRow(

headers,

row,

"GameCode"

) || ""

)

.trim()

.toUpperCase();



const rowPlayerId =

String(

getValueFromRow(

headers,

row,

"PlayerID"

) || ""

).trim();



if (

rowGameCode ===

gameCode &&

rowPlayerId ===

playerId

) {


return rowToPlayerObject(

headers,

row

);

}

}



return null;

}



/* =========================================================

FIND ALL PLAYERS

========================================================= */


function findPlayers(

gameCode

) {


gameCode =

String(

gameCode || ""

)

.trim()

.toUpperCase();



if (!gameCode) {


return {


success: false,


error:

"Game code is required."

};

}



const sheet =

getSheet(

PLAYERS_SHEET

);



const headers =

getHeaders(

sheet

);



const lastRow =

sheet.getLastRow();



if (

lastRow < 2

) {


return {


success: true,


players: []

};

}



const values =

sheet

.getRange(

2,

1,

lastRow - 1,

headers.length

)

.getValues();



const players = [];



values.forEach(

function(row) {


const rowGameCode =

String(

getValueFromRow(

headers,

row,

"GameCode"

) || ""

)

.trim()

.toUpperCase();



if (

rowGameCode !==

gameCode

) {

return;

}



players.push(

rowToPlayerObject(

headers,

row

)

);

}

);



return {


success: true,


players:

players

};

}



/* =========================================================

UPDATE PLAYER PROGRESS

========================================================= */


function updatePlayerProgress(

gameCode,

playerId,

field

) {


gameCode =

String(

gameCode || ""

)

.trim()

.toUpperCase();



playerId =

String(

playerId || ""

).trim();



field =

String(

field || ""

).trim();



if (

field !== "Completed" &&

field !== "Passed"

) {

return null;

}



const sheet =

getSheet(

PLAYERS_SHEET

);



const headers =

getHeaders(

sheet

);



const gameCodeColumn =

findColumn(

headers,

"GameCode"

);



const playerIdColumn =

findColumn(

headers,

"PlayerID"

);



const fieldColumn =

findColumn(

headers,

field

);



if (

gameCodeColumn === -1 ||

playerIdColumn === -1 ||

fieldColumn === -1

) {

return null;

}



const lastRow =

sheet.getLastRow();



if (

lastRow < 2

) {

return null;

}



const values =

sheet

.getRange(

2,

1,

lastRow - 1,

headers.length

)

.getValues();



for (

let i = 0;

i < values.length;

i++

) {


const row =

values[i];



const rowGameCode =

String(

row[

gameCodeColumn

] || ""

)

.trim()

.toUpperCase();



const rowPlayerId =

String(

row[

playerIdColumn

] || ""

).trim();



if (

rowGameCode !==

gameCode ||

rowPlayerId !==

playerId

) {

continue;

}



const currentValue =

Number(

row[

fieldColumn

] || 0

);



const newValue =

currentValue + 1;



row[

fieldColumn

] =

newValue;



sheet

.getRange(

i + 2,

1,

1,

headers.length

)

.setValues([

row

]);



return newValue;

}



return null;

}

