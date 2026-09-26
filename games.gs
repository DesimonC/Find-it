/* =========================================================

FIND IT!

Games.gs

GAME MANAGEMENT


CURRENT GAME SYSTEM:

- No game timer

- No game length

- Game continues until everyone completes

- Host is a real player

- Host can end early and start scoring

- Categories are randomly selected

========================================================= */



/* =========================================================

CREATE GAME

========================================================= */


function createGame(data) {


data = data || {};


const hostName =

String(

data.hostName ||

data.playerName ||

""

).trim();


const categoryCount = Number(data.categoryCount || 1);



if (!hostName) {


throw new Error(

"Host name is required."

);


}



if (\n\n!Number.isInteger(categoryCount) ||\n\ncategoryCount < 1 ||\n\ncategoryCount > 10\n\n) {


throw new Error(

"Category count must be at least 1."

);


}



/* ---------------------------------------------------------

GET ACTIVE CATEGORIES

--------------------------------------------------------- */


const categoriesResult =

getCategories();


const categories =

categoriesResult &&

Array.isArray(

categoriesResult.categories

)

? categoriesResult.categories

: [];



if (

!categories.length

) {


throw new Error(

"No valid categories found."

);


}



if (

categoryCount >

categories.length

) {


throw new Error(

"Not enough active categories available."

);


}



/* ---------------------------------------------------------

GET GAMES SHEET

--------------------------------------------------------- */


const sheet =

getSheet(

GAMES_SHEET

);



if (!sheet) {


throw new Error(

"Games sheet not found."

);


}



const headers =

getHeaders(

sheet

);



const requiredColumns = [


"GameCode",

"HostPlayerID",

"HostName",

"CategoryCount",

"Status",

"StartTime",

"CurrentCategory",

"Created"


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

"Games sheet is missing column: " +

column

);


}


}

);



/* ---------------------------------------------------------

CREATE GAME

--------------------------------------------------------- */


const gameCode =

generateGameCode();



const hostPlayerId =

generatePlayerId();



const now =

new Date();



const row =

new Array(

headers.length

).fill("");



setIfColumnExists(

row,

headers,

"GameCode",

gameCode

);



setIfColumnExists(

row,

headers,

"HostPlayerID",

hostPlayerId

);



setIfColumnExists(

row,

headers,

"HostName",

hostName

);



setIfColumnExists(

row,

headers,

"CategoryCount",

categoryCount

);



/*

* GAME LENGTH REMOVED.

*

* If the old columns still exist,

* deliberately leave them blank.

*/


setIfColumnExists(

row,

headers,

"GameLength",

""

);



setIfColumnExists(

row,

headers,

"Status",

"WAITING"

);



setIfColumnExists(

row,

headers,

"StartTime",

""

);



setIfColumnExists(

row,

headers,

"EndTime",

""

);



setIfColumnExists(

row,

headers,

"CurrentCategory",

0

);



setIfColumnExists(

row,

headers,

"Created",

now

);



sheet.appendRow(

row

);



/* ---------------------------------------------------------

ADD HOST AS REAL PLAYER

--------------------------------------------------------- */


addPlayerToSheet({


playerId:

hostPlayerId,


gameCode:

gameCode,


playerName:

hostName,


isHost:

true


});



/* ---------------------------------------------------------

CREATE RANDOM GAME CATEGORIES

--------------------------------------------------------- */


createGameCategories(

gameCode,

categoryCount

);



/* ---------------------------------------------------------

RETURN GAME

--------------------------------------------------------- */


return {


success: true,


game:

getGame(

gameCode

),


gameCode:

gameCode,


playerId:

hostPlayerId,


hostPlayerId:

hostPlayerId,


hostName:

hostName


};


}



/* =========================================================

GENERATE GAME CODE

========================================================= */


function generateGameCode() {


const characters =

"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";


let attempts =

0;



while (

attempts < 100

) {


let code =

"";



for (

let i = 0;

i < 6;

i++

) {


code +=

characters.charAt(

Math.floor(

Math.random() *

characters.length

)

);


}



if (

!getGame(

code

)

) {


return code;


}



attempts++;


}



throw new Error(

"Unable to generate a unique game code."

);


}



/* =========================================================

GET GAME

ROBUST VERSION

- No timer

- No game length

- Does NOT hide errors

========================================================= */


function getGame(gameCode) {


console.log(

"================================="

);


console.log(

"GET GAME START"

);


console.log(

"RAW GAME CODE:",

gameCode

);


console.log(

"================================="

);


/* ---------------------------------------------------------

NORMALISE GAME CODE

--------------------------------------------------------- */


gameCode =

String(

gameCode || ""

)

.trim()

.toUpperCase();


if (!gameCode) {


console.error(

"GET GAME ERROR: NO GAME CODE"

);


return null;

}


/* ---------------------------------------------------------

GET GAMES SHEET

--------------------------------------------------------- */


const sheet =

getSheet(

GAMES_SHEET

);


if (!sheet) {


console.error(

"GET GAME ERROR: GAMES SHEET NOT FOUND"

);


throw new Error(

"Games sheet not found."

);

}


/* ---------------------------------------------------------

READ SHEET

--------------------------------------------------------- */


const values =

sheet

.getDataRange()

.getValues();


if (

!values ||

values.length < 2

) {


console.log(

"GET GAME: GAMES SHEET HAS NO GAME ROWS"

);


return null;

}


const headers =

values[0];


console.log(

"GAMES HEADERS:",

JSON.stringify(headers)

);


/* ---------------------------------------------------------

FIND REQUIRED COLUMN

--------------------------------------------------------- */


const gameCodeColumn =

findColumn(

headers,

"GameCode"

);


if (

gameCodeColumn === -1

) {


throw new Error(

"Games sheet is missing GameCode column."

);

}


console.log(

"GAME CODE COLUMN:",

gameCodeColumn

);


/* ---------------------------------------------------------

FIND GAME

--------------------------------------------------------- */


for (

let i = 1;

i < values.length;

i++

) {


const row =

values[i];


const rawCode =

row[

gameCodeColumn

];


const rowGameCode =

String(

rawCode === null ||

rawCode === undefined

? ""

: rawCode

)

.trim()

.toUpperCase();


console.log(

"CHECKING GAME ROW:",

i + 1,

"RAW:",

rawCode,

"NORMALISED:",

rowGameCode

);


if (

rowGameCode !==

gameCode

) {

continue;

}


console.log(

"GAME FOUND ON ROW:",

i + 1

);


/* -----------------------------------------------------

BUILD GAME OBJECT

----------------------------------------------------- */


const game = {


gameCode:

rowGameCode,


hostPlayerId:

String(

getValueFromRow(

headers,

row,

"HostPlayerID"

) || ""

)

.trim(),


hostName:

String(

getValueFromRow(

headers,

row,

"HostName"

) || ""

)

.trim(),


categoryCount:

Number(

getValueFromRow(

headers,

row,

"CategoryCount"

) || 0

),


/* -------------------------------------------------

OLD FIELD KEPT FOR FRONTEND COMPATIBILITY

------------------------------------------------- */


gameLength:

"",


status:

String(

getValueFromRow(

headers,

row,

"Status"

) || ""

)

.trim()

.toUpperCase(),


startTime:

getValueFromRow(

headers,

row,

"StartTime"

) || "",


/* -------------------------------------------------

NO TIMER

------------------------------------------------- */


endTime:

"",


currentCategory:

Number(

getValueFromRow(

headers,

row,

"CurrentCategory"

) || 0

),


created:

getValueFromRow(

headers,

row,

"Created"

) || ""

};


/* -----------------------------------------------------

NORMALISE DATES

----------------------------------------------------- */


if (

game.startTime instanceof Date

) {


game.startTime =

game.startTime.toISOString();

}


if (

game.created instanceof Date

) {


game.created =

game.created.toISOString();

}


/* -----------------------------------------------------

DEBUG OUTPUT

----------------------------------------------------- */


console.log(

"GET GAME RESULT:"

);


console.log(

JSON.stringify(

game

)

);


return game;

}


/* ---------------------------------------------------------

GAME NOT FOUND

--------------------------------------------------------- */


console.log(

"GET GAME: GAME NOT FOUND:",

gameCode

);


return null;

}

/* =========================================================

GET PLAYERS

Returns all players for a game.

Host is included because the host is a real player.

========================================================= */


function getPlayers(gameCode) {


gameCode =

String(

gameCode || ""

)

.trim()

.toUpperCase();


console.log(

"================================="

);


console.log(

"GET PLAYERS"

);


console.log(

"GAME CODE:",

gameCode

);


console.log(

"================================="

);


if (!gameCode) {


return {

success: false,

error:

"Game code is required.",

players: []

};

}


const result =

findPlayers(

gameCode

);


const players =

result &&

Array.isArray(

result.players

)

? result.players

: [];


console.log(

"PLAYERS FOUND:",

players.length

);


return {

success: true,

gameCode:

gameCode,

players:

players

};

}

/* =========================================================

START GAME


Host only.


No timer is created.

Game continues until completion.

========================================================= */


function startGame(

data

) {


data =

data || {};



const gameCode =

String(

data.gameCode || ""

)

.trim()

.toUpperCase();



if (!gameCode) {


throw new Error(

"Game code is required."

);


}



const game =

getGame(

gameCode

);



if (!game) {


throw new Error(

"Game not found."

);


}



const playerId =

String(

data.playerId ||

game.hostPlayerId ||

""

).trim();



if (!playerId) {


throw new Error(

"Host player ID could not be found."

);


}



if (

playerId !==

game.hostPlayerId

) {


throw new Error(

"Only the host can start the game."

);


}



if (

game.status ===

"PLAYING"

) {


return {


success: true,


game:

getGame(

gameCode

)


};


}



if (

game.status !==

"WAITING"

) {


throw new Error(

"Game cannot be started from status: " +

game.status

);


}



const sheet =

getSheet(

GAMES_SHEET

);



if (!sheet) {


throw new Error(

"Games sheet not found."

);


}



const values =

sheet

.getDataRange()

.getValues();



const headers =

values[0];



for (

let i = 1;

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



if (

rowGameCode !==

gameCode

) {


continue;


}



const now =

new Date();



setIfColumnExists(

row,

headers,

"Status",

"PLAYING"

);



setIfColumnExists(

row,

headers,

"StartTime",

now

);



setIfColumnExists(

row,

headers,

"CurrentCategory",

0

);



/*

* IMPORTANT:

* No EndTime.

* No GameLength.

* No countdown.

*/


setIfColumnExists(

row,

headers,

"GameLength",

""

);



setIfColumnExists(

row,

headers,

"EndTime",

""

);



sheet

.getRange(

i + 1,

1,

1,

headers.length

)

.setValues([

row

]);



break;


}



return {


success: true,


game:

getGame(

gameCode

)


};


}



/* =========================================================

CREATE GAME CATEGORIES

========================================================= */


function createGameCategories(

gameCode,

categoryCount

) {


gameCode =

String(

gameCode || ""

)

.trim()

.toUpperCase();



categoryCount =

Number(

categoryCount || 0

);



if (\n\n!gameCode ||\n\n!Number.isInteger(categoryCount) ||\n\ncategoryCount < 1 ||\n\ncategoryCount > 10\n\n) {


throw new Error(

"Invalid game category settings."

);


}



const categoriesResult =

getCategories();



const categories =

categoriesResult &&

Array.isArray(

categoriesResult.categories

)

? categoriesResult.categories

: [];



if (

!categories.length

) {


throw new Error(

"No valid categories found."

);


}



if (

categoryCount >

categories.length

) {


throw new Error(

"Not enough active categories available."

);


}



const sheet =

getSheet(

GAME_CATEGORIES_SHEET

);



if (!sheet) {


throw new Error(

"GameCategories sheet not found."

);


}



const headers =

getHeaders(

sheet

);



const requiredColumns = [


"GameCode",

"CategoryID",

"CategoryNumber"


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

"GameCategories sheet is missing column: " +

column

);


}


}

);



/* ---------------------------------------------------------

RANDOMISE CATEGORIES

--------------------------------------------------------- */


const shuffled =

categories

.slice()

.sort(

function() {


return (

Math.random() -

0.5

);


}

);



const selected =

shuffled.slice(

0,

categoryCount

);



/* ---------------------------------------------------------

REMOVE OLD CATEGORIES FOR THIS GAME

--------------------------------------------------------- */


const values =

sheet

.getDataRange()

.getValues();



if (

values.length > 1

) {


const gameCodeColumn =

findColumn(

headers,

"GameCode"

);



for (

let i =

values.length - 1;


i >= 1;


i--

) {


const existingCode =

String(

values[i][

gameCodeColumn

] || ""

)

.trim()

.toUpperCase();



if (

existingCode ===

gameCode

) {


sheet.deleteRow(

i + 1

);


}


}


}



/* ---------------------------------------------------------

WRITE SELECTED CATEGORIES

--------------------------------------------------------- */


selected.forEach(

function(

category,

index

) {


const row =

new Array(

headers.length

).fill("");



setIfColumnExists(

row,

headers,

"GameCode",

gameCode

);



setIfColumnExists(

row,

headers,

"CategoryID",

category.categoryId

);



setIfColumnExists(

row,

headers,

"CategoryNumber",

index + 1

);



setIfColumnExists(

row,

headers,

"CategoryName",

category.name

);



setIfColumnExists(

row,

headers,

"Description",

category.description

);



sheet.appendRow(

row

);


}

);



return {


success: true,


categories:

selected


};


}


/* =========================================================

GET GAME CATEGORIES

ROBUST VERSION

========================================================= */


function getGameCategories(gameCode) {


gameCode =

String(gameCode || "")

.trim()

.toUpperCase();


console.log(

"================================="

);


console.log(

"GET GAME CATEGORIES"

);


console.log(

"REQUESTED GAME CODE:",

gameCode

);


console.log(

"================================="

);


if (!gameCode) {


return {

success: true,

gameCode: "",

categories: []

};

}


const sheet =

getSheet(

GAME_CATEGORIES_SHEET

);


if (!sheet) {


throw new Error(

"GameCategories sheet not found."

);

}


const values =

sheet

.getDataRange()

.getValues();


if (

!values ||

values.length === 0

) {


console.log(

"GAME CATEGORIES SHEET IS EMPTY"

);


return {

success: true,

gameCode: gameCode,

categories: []

};

}


const headers =

values[0];


console.log(

"GAME CATEGORIES HEADERS:",

JSON.stringify(headers)

);


const gameCodeColumn =

findColumn(

headers,

"GameCode"

);


const categoryIdColumn =

findColumn(

headers,

"CategoryID"

);


const categoryNumberColumn =

findColumn(

headers,

"CategoryNumber"

);


const categoryNameColumn =

findColumn(

headers,

"CategoryName"

);


const descriptionColumn =

findColumn(

headers,

"Description"

);


console.log(

"COLUMN POSITIONS:",

{

gameCodeColumn:

gameCodeColumn,

categoryIdColumn:

categoryIdColumn,

categoryNumberColumn:

categoryNumberColumn,

categoryNameColumn:

categoryNameColumn,

descriptionColumn:

descriptionColumn

}

);


if (

gameCodeColumn === -1

) {


throw new Error(

"GameCategories sheet is missing GameCode column."

);

}


if (

categoryIdColumn === -1

) {


throw new Error(

"GameCategories sheet is missing CategoryID column."

);

}


const results = [];


/* ---------------------------------------------------------

READ EVERY ROW

--------------------------------------------------------- */


for (

let i = 1;

i < values.length;

i++

) {


const row =

values[i];


const rawGameCode =

row[

gameCodeColumn

];


const rowGameCode =

String(

rawGameCode === null ||

rawGameCode === undefined

? ""

: rawGameCode

)

.trim()

.toUpperCase();


console.log(

"GAME CATEGORY ROW:",

i + 1,

"RAW CODE:",

rawGameCode,

"NORMALISED CODE:",

rowGameCode

);


if (

rowGameCode !==

gameCode

) {


continue;

}


const rawCategoryId =

row[

categoryIdColumn

];


const categoryId =

String(

rawCategoryId === null ||

rawCategoryId === undefined

? ""

: rawCategoryId

)

.trim();


if (!categoryId) {


console.log(

"SKIPPING ROW - NO CATEGORY ID:",

i + 1

);


continue;

}


let categoryNumber = 0;


if (

categoryNumberColumn !== -1

) {


categoryNumber =

Number(

row[

categoryNumberColumn

]

) || 0;

}


let categoryName = "";


if (

categoryNameColumn !== -1

) {


categoryName =

String(

row[

categoryNameColumn

] === null ||

row[

categoryNameColumn

] === undefined

? ""

: row[

categoryNameColumn

]

)

.trim();

}


let description = "";


if (

descriptionColumn !== -1

) {


description =

String(

row[

descriptionColumn

] === null ||

row[

descriptionColumn

] === undefined

? ""

: row[

descriptionColumn

]

)

.trim();

}


results.push({


gameCode:

gameCode,


categoryId:

categoryId,


categoryNumber:

categoryNumber,


name:

categoryName,


categoryName:

categoryName,


description:

description

});

}


/* ---------------------------------------------------------

SORT

--------------------------------------------------------- */


results.sort(

function(a, b) {


return (

Number(

a.categoryNumber || 0

) -

Number(

b.categoryNumber || 0

)

);

}

);


console.log(

"FINAL GAME CATEGORIES:",

JSON.stringify(results)

);


return {


success: true,


gameCode:

gameCode,


categories:

results

};

}


/* =========================================================

CHECK GAME COMPLETION

========================================================= */


function checkGameCompletion(

gameCode

) {


gameCode =

String(

gameCode || ""

)

.trim()

.toUpperCase();



console.log(

"================================="

);


console.log(

"CHECK GAME COMPLETION START"

);


console.log(

"GAME CODE:",

gameCode

);


console.log(

"================================="

);



const game =

getGame(

gameCode

);



if (!game) {


return {


success: false,


gameStatus:

""


};


}



const gameStatus =

String(

game.status || ""

)

.trim()

.toUpperCase();



if (

gameStatus !==

"PLAYING"

) {


return {


success: true,


gameStatus:

gameStatus,


allComplete:

false


};


}



/* ---------------------------------------------------------

GET CATEGORIES

--------------------------------------------------------- */


const gameCategoriesResult =

getGameCategories(

gameCode

);



const categories =

gameCategoriesResult &&

Array.isArray(

gameCategoriesResult.categories

)

? gameCategoriesResult.categories

: [];



if (

categories.length === 0

) {


return {


success: false,


gameStatus:

"PLAYING",


allComplete:

false


};


}



const required =

categories.length;



/* ---------------------------------------------------------

GET ALL PLAYERS

HOST IS INCLUDED.

--------------------------------------------------------- */


const playersResult =

findPlayers(

gameCode

);



const players =

playersResult &&

Array.isArray(

playersResult.players

)

? playersResult.players

: [];



if (

players.length === 0

) {


return {


success: false,


gameStatus:

"PLAYING",


allComplete:

false


};


}



/* ---------------------------------------------------------

CHECK EVERY PLAYER

--------------------------------------------------------- */


let allComplete =

true;



players.forEach(

function(player) {


const completed =

Number(

player.completed || 0

);



const passed =

Number(

player.passed || 0

);



const progress =

completed +

passed;



console.log(

"PLAYER:",

player.playerName ||

player.name,

"PROGRESS:",

progress,

"/",

required

);



if (

progress <

required

) {


allComplete =

false;


}


}

);



/* ---------------------------------------------------------

NOT EVERYONE COMPLETE

--------------------------------------------------------- */


if (!allComplete) {


return {


success: true,


gameStatus:

"PLAYING",


allComplete:

false


};


}



/* ---------------------------------------------------------

EVERYONE COMPLETE

MOVE TO SCORING

--------------------------------------------------------- */


const sheet =

getSheet(

GAMES_SHEET

);



const values =

sheet

.getDataRange()

.getValues();



if (

!values ||

values.length < 2

) {


return {


success: false,


gameStatus:

"PLAYING",


allComplete:

false


};


}



const headers =

values[0];



let updated =

false;



for (

let i = 1;

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



if (

rowGameCode !==

gameCode

) {


continue;


}



setIfColumnExists(

row,

headers,

"Status",

"SCORING"

);



sheet

.getRange(

i + 1,

1,

1,

headers.length

)

.setValues([

row

]);



updated =

true;



break;


}



if (!updated) {


return {


success: false,


gameStatus:

"PLAYING",


allComplete:

false


};


}



return {


success: true,


gameStatus:

"SCORING",


allComplete:

true


};


}



/* =========================================================

START SCORING

=========================================================


Host-only early finish.


Allows the host to end collection before every

player has completed all categories.

========================================================= */


function startScoring(

data

) {


data =

data || {};



const gameCode =

String(

data.gameCode || ""

)

.trim()

.toUpperCase();



const playerId =

String(

data.playerId || ""

).trim();



if (

!gameCode ||

!playerId

) {


throw new Error(

"Game code and player ID are required."

);


}



const game =

getGame(

gameCode

);



if (!game) {


throw new Error(

"Game not found."

);


}



if (

game.hostPlayerId !==

playerId

) {


throw new Error(

"Only the host can end the game."

);


}



if (

game.status ===

"SCORING"

) {


return {


success: true,


game:

getGame(

gameCode

)


};


}



if (

game.status !==

"PLAYING"

) {


throw new Error(

"Game cannot be ended from status: " +

game.status

);


}



const sheet =

getSheet(

GAMES_SHEET

);



if (!sheet) {


throw new Error(

"Games sheet not found."

);


}



const values =

sheet

.getDataRange()

.getValues();



const headers =

values[0];



for (

let i = 1;

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



if (

rowGameCode !==

gameCode

) {


continue;


}



setIfColumnExists(

row,

headers,

"Status",

"SCORING"

);



setIfColumnExists(

row,

headers,

"EndTime",

""

);



sheet

.getRange(

i + 1,

1,

1,

headers.length

)

.setValues([

row

]);



break;


}



return {


success: true,


game:

getGame(

gameCode

)


};


}



/* =========================================================

START VOTING

========================================================= */


function startVoting(

data

) {


data =

data || {};



const gameCode =

String(

data.gameCode || ""

)

.trim()

.toUpperCase();



const playerId =

String(

data.playerId || ""

).trim();



if (

!gameCode ||

!playerId

) {


throw new Error(

"Game code and player ID are required."

);


}



const game =

getGame(

gameCode

);



if (!game) {


throw new Error(

"Game not found."

);


}



if (

game.hostPlayerId !==

playerId

) {


throw new Error(

"Only the host can start voting."

);


}



if (

game.status ===

"VOTING"

) {


return {


success: true,


game:

getGame(

gameCode

)


};


}



if (

game.status !==

"SCORING"

) {


throw new Error(

"Game is not ready for voting."

);


}



const sheet =

getSheet(

GAMES_SHEET

);



if (!sheet) {


throw new Error(

"Games sheet not found."

);


}



const values =

sheet

.getDataRange()

.getValues();



const headers =

values[0];



for (

let i = 1;

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



if (

rowGameCode !==

gameCode

) {


continue;


}



setIfColumnExists(

row,

headers,

"Status",

"VOTING"

);



sheet

.getRange(

i + 1,

1,

1,

headers.length

)

.setValues([

row

]);



break;


}



return {


success: true,


game:

getGame(

gameCode

)


};


}

