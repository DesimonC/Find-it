/* =========================================================

FIND IT!

Code.gs

MAIN GOOGLE APPS SCRIPT ROUTER

========================================================= */



/* =========================================================

GET REQUESTS

========================================================= */


function doGet(e) {


try {


e =

e || {};


const params =

e.parameter ||

{};


const action =

String(

params.action ||

""

)

.trim();


console.log(

"================================="

);


console.log(

"GET REQUEST"

);


console.log(

"GET ACTION:",

action

);


console.log(

"GET PARAMS:",

params

);


console.log(

"================================="

);



const data =

buildGetData(

params

);



/* =====================================================

GET ROUTING

===================================================== */


switch (action) {



/* ---------------------------------------------------

CATEGORIES

--------------------------------------------------- */


case "getCategories":


return jsonResponse(

getCategories()

);



/* ---------------------------------------------------

GAME

--------------------------------------------------- */

case "getGame":


if (!data.gameCode) {


return jsonResponse({

success: false,

error:

"Game code is required."

});


}


return jsonResponse(

getGame(

data.gameCode

)

);



/* ---------------------------------------------------

PLAYERS

--------------------------------------------------- */


case "getPlayers":


if (!data.gameCode) {


return jsonResponse({

success: false,

error:

"Game code is required."

});


}


return jsonResponse(

getPlayers(

data.gameCode

)

);



/* ---------------------------------------------------

SINGLE PLAYER

--------------------------------------------------- */


case "getPlayer":


if (!data.playerId) {


return jsonResponse({

success: false,

error:

"Player ID is required."

});


}


return jsonResponse(

getPlayer(

data.playerId,

data.gameCode

)

);



/* ---------------------------------------------------

GAME CATEGORIES

--------------------------------------------------- */


case "getGameCategories":


if (!data.gameCode) {


return jsonResponse({

success: false,

error:

"Game code is required."

});


}


return jsonResponse(

getGameCategories(

data.gameCode

)

);



/* ---------------------------------------------------

ENTRIES

--------------------------------------------------- */


case "getEntries":


if (!data.gameCode) {


return jsonResponse({

success: false,

error:

"Game code is required."

});


}


return jsonResponse(

getEntries(

data.gameCode

)

);



/* ---------------------------------------------------

VOTING RESULTS

IMPORTANT:

getVotingResults() expects the

COMPLETE data object.

--------------------------------------------------- */


case "getVotingResults":


if (!data.gameCode) {


return jsonResponse({

success: false,

error:

"Game code is required."

});


}


return jsonResponse(

getVotingResults(

data

)

);



/* ---------------------------------------------------

VOTING WINNERS

getVotingWinners() expects

the game code directly.

--------------------------------------------------- */


case "getVotingWinners":


if (!data.gameCode) {


return jsonResponse({

success: false,

error:

"Game code is required."

});


}


return jsonResponse(

getVotingWinners(

data.gameCode

)

);



/* ---------------------------------------------------

SCORES

--------------------------------------------------- */


case "getScores":


if (!data.gameCode) {


return jsonResponse({

success: false,

error:

"Game code is required."

});


}


return jsonResponse(

getScores(

data.gameCode

)

);



/* ---------------------------------------------------

WINNERS

--------------------------------------------------- */


case "getWinners":


if (!data.gameCode) {


return jsonResponse({

success: false,

error:

"Game code is required."

});


}


return jsonResponse(

getWinners(

data.gameCode

)

);



/* ---------------------------------------------------

PHOTO

--------------------------------------------------- */


case "getPhoto":


if (!data.photoId) {


return jsonResponse({

success: false,

error:

"Photo ID is required."

});


}


return jsonResponse(

getPhoto(

data.photoId

)

);



/* ---------------------------------------------------

UNKNOWN ACTION

--------------------------------------------------- */


default:


console.error(

"UNKNOWN GET ACTION:",

action

);


return jsonResponse({

success: false,

error:

"Unknown GET action: " +

action

});


}


} catch (error) {


console.error(

"================================="

);


console.error(

"GET ERROR"

);


console.error(

error

);


console.error(

"================================="

);


return jsonResponse({

success: false,

error:

getErrorMessage(

error

)

});


}


}



/* =========================================================

POST REQUESTS

========================================================= */


function doPost(e) {


try {


console.log(

"================================="

);


console.log(

"POST REQUEST RECEIVED"

);


console.log(

"================================="

);



/* -----------------------------------------------------

CHECK REQUEST

----------------------------------------------------- */


if (

!e ||

!e.postData ||

!e.postData.contents

) {


console.error(

"POST REQUEST HAS NO BODY"

);


return jsonResponse({

success: false,

error:

"Empty POST body."

});


}



/* -----------------------------------------------------

PARSE JSON

----------------------------------------------------- */


let body;


try {


body =

JSON.parse(

e.postData.contents

);


} catch (parseError) {


console.error(

"POST JSON PARSE ERROR:",

parseError

);


return jsonResponse({

success: false,

error:

"Invalid JSON POST body."

});


}



body =

body || {};



const action =

String(

body.action ||

""

)

.trim();



const data =

body.data ||

{};



console.log(

"POST ACTION:",

action

);


console.log(

"POST DATA:",

data

);



/* =====================================================

POST ROUTING

===================================================== */


switch (action) {



/* ---------------------------------------------------

CREATE GAME

--------------------------------------------------- */


case "createGame":


return jsonResponse(

createGame(

data

)

);



/* ---------------------------------------------------

JOIN GAME

--------------------------------------------------- */


case "joinGame":


return jsonResponse(

joinGame(

data

)

);



/* ---------------------------------------------------

REJOIN GAME

--------------------------------------------------- */


case "rejoinGame":


return jsonResponse(

rejoinGame(

data

)

);



/* ---------------------------------------------------

RESTORE HOST

--------------------------------------------------- */


case "restoreHost":


return jsonResponse(

restoreHost(

data

)

);



/* ---------------------------------------------------

START GAME

--------------------------------------------------- */


case "startGame":


return jsonResponse(

startGame(

data

)

);



/* ---------------------------------------------------

SUBMIT PHOTO ENTRY

--------------------------------------------------- */


case "submitEntry":


console.log(

"ROUTING TO submitEntry"

);


return jsonResponse(

submitEntry(

data

)

);



/* ---------------------------------------------------

PASS CATEGORY

--------------------------------------------------- */


case "submitPass":


return jsonResponse(

submitPass(

data

)

);



/* ---------------------------------------------------

START SCORING

IMPORTANT:

This is ONLY for the host's

manual END GAME / START SCORING

control.

Natural completion is handled

inside submitEntry / submitPass

through checkGameCompletion().

--------------------------------------------------- */


case "startScoring":


console.log(

"ROUTING TO startScoring"

);


return jsonResponse(

startScoring(

data

)

);



/* ---------------------------------------------------

START VOTING

--------------------------------------------------- */


case "startVoting":


console.log(

"ROUTING TO startVoting"

);


return jsonResponse(

startVoting(

data

)

);



/* ---------------------------------------------------

SUBMIT VOTE

--------------------------------------------------- */


case "submitVote":


return jsonResponse(

submitVote(

data

)

);



/* ---------------------------------------------------

CLEANUP GAME PHOTOS

--------------------------------------------------- */


case "cleanupGamePhotos":


console.log(

"ROUTING TO cleanupGamePhotos"

);


return jsonResponse(

cleanupGamePhotos(

data

)

);


case "finishGame":

return jsonResponse(

finishGame(data)

);

/* ---------------------------------------------------

UNKNOWN ACTION

--------------------------------------------------- */


default:


console.error(

"UNKNOWN POST ACTION:",

action

);


return jsonResponse({

success: false,

error:

"Unknown POST action: " +

action

});


}


} catch (error) {


console.error(

"================================="

);


console.error(

"POST ERROR"

);


console.error(

error

);


console.error(

"================================="

);


return jsonResponse({

success: false,

error:

getErrorMessage(

error

)

});


}


}



/* =========================================================

BUILD GET DATA

========================================================= */


function buildGetData(

params

) {


params =

params ||

{};


return {


gameCode:

String(

params.gameCode ||

params.GameCode ||

""

)

.trim()

.toUpperCase(),


playerId:

String(

params.playerId ||

params.PlayerID ||

params.id ||

""

)

.trim(),


playerName:

String(

params.playerName ||

params.PlayerName ||

params.name ||

""

)

.trim(),


hostName:

String(

params.hostName ||

params.HostName ||

""

)

.trim(),


photoId:

String(

params.photoId ||

params.PhotoID ||

""

)

.trim()


};


}



/* =========================================================

JSON RESPONSE

========================================================= */


function jsonResponse(

data

) {


try {


return ContentService

.createTextOutput(

JSON.stringify(

data || {}

)

)

.setMimeType(

ContentService.MimeType.JSON

);


} catch (error) {


console.error(

"JSON RESPONSE ERROR:",

error

);


return ContentService

.createTextOutput(

JSON.stringify({

success: false,

error:

"Unable to create JSON response."

})

)

.setMimeType(

ContentService.MimeType.JSON

);


}


}



/* =========================================================

ERROR MESSAGE

========================================================= */


function getErrorMessage(

error

) {


if (!error) {


return "Unknown error.";


}


if (

typeof error ===

"string"

) {


return error;


}


if (

error.message

) {


return String(

error.message

);


}


try {


return JSON.stringify(

error

);


} catch (e) {


return String(

error

);


}


}

