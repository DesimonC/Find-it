/* =========================================================

FIND IT!

Voting.gs

SCORING / VOTING / WINNERS


IMPORTANT:

getGame(gameCode) returns the GAME OBJECT directly.

========================================================= */




/* =========================================================

SUBMIT VOTE

========================================================= */


function submitVote(

data

) {


data =

data || {};


const gameCode =

String(

data.gameCode ||

data.GameCode ||

""

)

.trim()

.toUpperCase();


const playerId =

String(

data.playerId ||

data.voterPlayer ||

data.PlayerID ||

""

)

.trim();


const entryId =

String(

data.entryId ||

data.votedEntryId ||

data.VotedEntryID ||

""

)

.trim();


if (!gameCode) {

return {

success: false,

error:

"Game code is required."

};

}


if (!playerId) {

return {

success: false,

error:

"Player ID is required."

};

}


if (!entryId) {

return {

success: false,

error:

"Entry ID is required."

};

}


/*

* getGame() returns the game directly.

*/

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


const status =

String(

game.status ||

""

)

.trim()

.toUpperCase();


if (status !== "VOTING") {

return {

success: false,

error:

"Voting is not currently open.",

status:

status

};

}


const voter =

findPlayer(

gameCode,

playerId

);


if (!voter) {

return {

success: false,

error:

"Voter not found."

};

}


const entries =

getRawEntriesForGame(

gameCode

);


const selectedEntry =

entries.find(

entry =>

String(

entry.entryId ||

""

)

.trim() ===

entryId

);


if (!selectedEntry) {

return {

success: false,

error:

"Voting entry not found."

};

}


if (

String(

selectedEntry.status ||

""

)

.trim()

.toLowerCase() ===

"rejected"

) {

return {

success: false,

error:

"This entry cannot receive votes."

};

}


const categoryId =

String(

selectedEntry.categoryId ||

""

)

.trim();


const categoryNumber =

Number(

selectedEntry.categoryNumber ||

0

);


const sheet =

getOrCreateVotesSheet();


const headers =

getHeaders(

sheet

);


const lastRow =

sheet.getLastRow();


/*

* PREVENT DUPLICATE VOTE

*/


if (lastRow >= 2) {


const values =

sheet

.getRange(

2,

1,

lastRow - 1,

headers.length

)

.getValues();


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


const voterColumn =

findColumn(

headers,

"VoterPlayer"

);


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

] ||

""

)

.trim()

.toUpperCase();


const rowCategoryId =

String(

row[

categoryIdColumn

] ||

""

)

.trim();


const rowVoter =

String(

row[

voterColumn

] ||

""

)

.trim();


if (

rowGameCode ===

gameCode &&

rowCategoryId ===

categoryId &&

rowVoter ===

playerId

) {


return {

success: false,

error:

"You have already voted for this category."

};

}

}

}


/*

* SAVE VOTE

*/


const row =

new Array(

headers.length

).fill("");


setIfColumnExists(

row,

headers,

"VoteID",

Utilities

.getUuid()

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

"CategoryID",

categoryId

);


setIfColumnExists(

row,

headers,

"CategoryNumber",

categoryNumber

);


setIfColumnExists(

row,

headers,

"VoterPlayer",

playerId

);


setIfColumnExists(

row,

headers,

"VotedEntryID",

entryId

);


setIfColumnExists(

row,

headers,

"VoteTime",

new Date()

);


sheet.appendRow(

row

);


SpreadsheetApp

.flush();


const progress =

getVotingProgress(

gameCode

);


return {

success: true,

entryId:

entryId,

categoryId:

categoryId,

categoryNumber:

categoryNumber,

votesReceived:

progress.votesReceived,

votesRequired:

progress.votesRequired,

votingComplete:

progress.votingComplete

};

}



/* =========================================================

GET VOTING PROGRESS

========================================================= */


function getVotingProgress(

gameCode

) {


gameCode =

String(

gameCode ||

""

)

.trim()

.toUpperCase();


if (!gameCode) {

return {

votesReceived: 0,

votesRequired: 0,

votingComplete: false

};

}


const playersResult =

findPlayers(

gameCode

);


const players =

playersResult &&

playersResult.success &&

Array.isArray(

playersResult.players

)

? playersResult.players

: [];


const entries =

getRawEntriesForGame(

gameCode

);


/*

* Get categories from the actual

* game categories, not only entries.

*

* This keeps voting progress correct

* even if a category has unusual data.

*/


const categoriesResult =

getGameCategories(

gameCode

);


const categories =

categoriesResult &&

categoriesResult.success &&

Array.isArray(

categoriesResult.categories

)

? categoriesResult.categories

: [];


/*

* Only categories containing at least

* one non-rejected entry can be voted on.

*/


const activeCategoryMap =

{};


entries.forEach(

entry => {


if (

String(

entry.status ||

""

)

.trim()

.toLowerCase() ===

"rejected"

) {

return;

}


const categoryId =

String(

entry.categoryId ||

""

)

.trim();


if (categoryId) {

activeCategoryMap[

categoryId

] = true;

}

}

);


const activeCategoryCount =

Object.keys(

activeCategoryMap

).length;


const votesRequired =

players.length *

activeCategoryCount;


const sheet =

getSheet(

VOTES_SHEET

);


if (!sheet) {

return {

votesReceived: 0,

votesRequired:

votesRequired,

votingComplete:

false

};

}


const headers =

getHeaders(

sheet

);


const lastRow =

sheet.getLastRow();


if (lastRow < 2) {

return {

votesReceived: 0,

votesRequired:

votesRequired,

votingComplete:

false

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


const voterColumn =

findColumn(

headers,

"VoterPlayer"

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


const completedVotes =

{};


values.forEach(

row => {


const rowGameCode =

String(

row[

gameCodeColumn

] ||

""

)

.trim()

.toUpperCase();


if (

rowGameCode !==

gameCode

) {

return;

}


const voter =

String(

row[

voterColumn

] ||

""

)

.trim();


const categoryId =

String(

row[

categoryIdColumn

] ||

""

)

.trim();


if (

!voter ||

!categoryId

) {

return;

}


const key =

voter +

"|" +

categoryId;


completedVotes[

key

] = true;

}

);


const votesReceived =

Object.keys(

completedVotes

).length;


return {

votesReceived:

votesReceived,

votesRequired:

votesRequired,

votingComplete:

votesRequired > 0 &&

votesReceived >=

votesRequired

};

}



/* =========================================================

GET VOTING WINNERS

========================================================= */


function getVotingWinners(

gameCode

) {


gameCode =

String(

gameCode ||

""

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


const entries =

getRawEntriesForGame(

gameCode

);


const categoriesResult =

getGameCategories(

gameCode

);


const categories =

categoriesResult &&

categoriesResult.success

? categoriesResult.categories

: [];


const categoryNames =

{};


categories.forEach(

category => {


categoryNames[

String(

category.categoryId

)

] =

category.name;

}

);


const sheet =

getSheet(

VOTES_SHEET

);


const voteCounts =

{};


if (sheet) {


const headers =

getHeaders(

sheet

);


const lastRow =

sheet.getLastRow();


if (lastRow >= 2) {


const values =

sheet

.getRange(

2,

1,

lastRow - 1,

headers.length

)

.getValues();


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


const entryColumn =

findColumn(

headers,

"VotedEntryID"

);


values.forEach(

row => {


const rowGameCode =

String(

row[

gameCodeColumn

] ||

""

)

.trim()

.toUpperCase();


if (

rowGameCode !==

gameCode

) {

return;

}


const categoryId =

String(

row[

categoryIdColumn

] ||

""

)

.trim();


const entryId =

String(

row[

entryColumn

] ||

""

)

.trim();


if (

!categoryId ||

!entryId

) {

return;

}


const key =

categoryId +

"|" +

entryId;


voteCounts[key] =

Number(

voteCounts[key] ||

0

) + 1;

}

);

}

}


const winners =

[];


categories.forEach(

category => {


const categoryId =

String(

category.categoryId ||

""

)

.trim();


const categoryEntries =

entries.filter(

entry =>

String(

entry.categoryId ||

""

)

.trim() ===

categoryId &&

String(

entry.status ||

""

)

.trim()

.toLowerCase() !==

"rejected"

);


if (

categoryEntries.length === 0

) {

return;

}


let winningEntry =

categoryEntries[0];


let winningVotes =

Number(

voteCounts[

categoryId +

"|" +

String(

winningEntry.entryId ||

""

)

.trim()

] ||

0

);


for (

let i = 1;

i < categoryEntries.length;

i++

) {


const entry =

categoryEntries[i];


const count =

Number(

voteCounts[

categoryId +

"|" +

String(

entry.entryId ||

""

)

.trim()

] ||

0

);


if (

count >

winningVotes

) {


winningEntry =

entry;


winningVotes =

count;

}

}


winners.push({


categoryId:

categoryId,


categoryNumber:

Number(

category.categoryNumber ||

winningEntry.categoryNumber ||

0

),


categoryName:

categoryNames[

categoryId

] ||

category.name ||

"",


entryId:

winningEntry.entryId,


playerId:

winningEntry.playerId,


playerName:

winningEntry.playerName,


photoId:

winningEntry.photoId,


photoUrl:

winningEntry.photoUrl,


voteCount:

winningVotes

});

}

);


winners.sort(

(

a,

b

) =>

Number(

a.categoryNumber

) -

Number(

b.categoryNumber

)

);


return {

success: true,

gameCode:

gameCode,

winners:

winners

};

}


/* =========================================================

GET VOTING RESULTS

FINAL RESULTS

========================================================= */


function getVotingResults(

data

) {


data =

data || {};


const gameCode =

String(

data.gameCode ||

data.GameCode ||

""

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


/* =====================================================

GET ALL ENTRIES

===================================================== */


const entries =

getRawEntriesForGame(

gameCode

);


/* =====================================================

READ ALL VOTES

===================================================== */


const sheet =

getSheet(

VOTES_SHEET

);


const voteCounts =

{};


const playerVoteTotals =

{};


let totalVotes =

0;


if (sheet) {


const headers =

getHeaders(

sheet

);


const lastRow =

sheet.getLastRow();


if (lastRow >= 2) {


const values =

sheet

.getRange(

2,

1,

lastRow - 1,

headers.length

)

.getValues();


const gameCodeColumn =

findColumn(

headers,

"GameCode"

);


const entryColumn =

findColumn(

headers,

"VotedEntryID"

);


values.forEach(

row => {


const rowGameCode =

String(

row[

gameCodeColumn

] ||

""

)

.trim()

.toUpperCase();


if (

rowGameCode !==

gameCode

) {

return;

}


const entryId =

String(

row[

entryColumn

] ||

""

)

.trim();


if (!entryId) {

return;

}


/* -------------------------------------

COUNT VOTE FOR PHOTO

------------------------------------- */


voteCounts[

entryId

] =

Number(

voteCounts[

entryId

] ||

0

) + 1;


/* -------------------------------------

COUNT VOTE FOR PHOTO OWNER

------------------------------------- */


const votedEntry =

entries.find(

entry =>

String(

entry.entryId ||

""

)

.trim() ===

entryId

);


if (votedEntry) {


const ownerId =

String(

votedEntry.playerId ||

""

)

.trim();


if (ownerId) {


playerVoteTotals[

ownerId

] =

Number(

playerVoteTotals[

ownerId

] ||

0

) + 1;

}

}


totalVotes++;

}

);

}

}


/* =====================================================

BUILD PHOTO RESULTS

===================================================== */


const results =

entries

.filter(

entry =>

String(

entry.status ||

""

)

.trim()

.toLowerCase() !==

"rejected"

)

.map(

entry => {


const entryId =

String(

entry.entryId ||

""

)

.trim();


const voteCount =

Number(

voteCounts[

entryId

] ||

0

);


return {


entryId:

entry.entryId,


gameCode:

entry.gameCode,


playerId:

entry.playerId,


playerName:

entry.playerName,


categoryId:

entry.categoryId,


categoryNumber:

entry.categoryNumber,


status:

entry.status,


photoId:

entry.photoId,


photoUrl:

entry.photoUrl,


submitted:

entry.submitted,


voteCount:

voteCount,


points:

voteCount

};

}

);


/* =====================================================

SORT PHOTO RESULTS

Category order first.

Within a category, highest votes first.

We do NOT use this ordering to determine the

overall winning photo tie-break. That is handled

separately using the actual Submitted timestamp.

===================================================== */


results.sort(

(

a,

b

) => {


const categoryCompare =

Number(

a.categoryNumber ||

0

) -

Number(

b.categoryNumber ||

0

);


if (

categoryCompare !==

0

) {

return categoryCompare;

}


return (

Number(

b.voteCount ||

0

) -

Number(

a.voteCount ||

0

)

);

}

);


/* =====================================================

DETERMINE CATEGORY WINNERS

===================================================== */


const winners =

[];


const categoryGroups =

{};


results.forEach(

result => {


const key =

String(

result.categoryId ||

result.categoryNumber ||

""

);


if (

!categoryGroups[key]

) {


categoryGroups[key] =

[];

}


categoryGroups[key]

.push(

result

);

}

);


Object.keys(

categoryGroups

).forEach(

categoryId => {


const group =

categoryGroups[

categoryId

];


if (!group.length) {

return;

}


/*

* First entry is the default winner.

*

* If votes are tied, the first entry

* remains the winner.

*/

let winner =

group[0];


group.forEach(

entry => {


if (

Number(

entry.voteCount ||

0

) >

Number(

winner.voteCount ||

0

)

) {


winner =

entry;

}

}

);


winners.push(

winner

);

}

);


winners.sort(

(

a,

b

) =>

Number(

a.categoryNumber ||

0

) -

Number(

b.categoryNumber ||

0

)

);


/* =====================================================

BUILD WINNING ENTRIES

THESE ARE ONLY THE CATEGORY WINNERS.

===================================================== */


const winningEntries =

winners.map(

winner => ({


entryId:

winner.entryId,


gameCode:

winner.gameCode,


playerId:

winner.playerId,


playerName:

winner.playerName,


categoryId:

winner.categoryId,


categoryNumber:

winner.categoryNumber,


categoryName:

getCategoryNameForResult(

gameCode,

winner.categoryId

),


photoId:

winner.photoId,


photoUrl:

winner.photoUrl,


submitted:

winner.submitted,


voteCount:

winner.voteCount,


points:

winner.points

})

);


/* =====================================================

CALCULATE OVERALL PLAYER WINNER

A player's total is ALL votes received by ALL

of that player's photos.

===================================================== */


const playerTotals =

{};


entries.forEach(

entry => {


const playerId =

String(

entry.playerId ||

""

)

.trim();


if (!playerId) {

return;

}


const playerName =

String(

entry.playerName ||

""

)

.trim();


if (

!playerTotals[

playerId

]

) {


playerTotals[

playerId

] = {


playerId:

playerId,


playerName:

playerName,


totalVotes:

0

};

}


playerTotals[

playerId

].totalVotes =

Number(

playerTotals[

playerId

].totalVotes ||

0

) +

Number(

voteCounts[

String(

entry.entryId ||

""

)

.trim()

] ||

0

);

}

);


/* =====================================================

INCLUDE PLAYERS WITH ZERO VOTES

===================================================== */


const playersResult =

findPlayers(

gameCode

);


const players =

playersResult &&

playersResult.success &&

Array.isArray(

playersResult.players

)

? playersResult.players

: [];


players.forEach(

player => {


const playerId =

String(

player.playerId ||

""

)

.trim();


if (!playerId) {

return;

}


if (

!playerTotals[

playerId

]

) {


playerTotals[

playerId

] = {


playerId:

playerId,


playerName:

String(

player.playerName ||

""

)

.trim(),


totalVotes:

0

};

}

}

);


/* =====================================================

PLAYER STANDINGS

===================================================== */


const playerStandings =

Object.keys(

playerTotals

)

.map(

playerId =>

playerTotals[

playerId

]

);


playerStandings.sort(

(

a,

b

) => {


const voteCompare =

Number(

b.totalVotes ||

0

) -

Number(

a.totalVotes ||

0

);


if (

voteCompare !==

0

) {


return voteCompare;

}


/*

* PLAYER TIE-BREAK

*

* Leaving your existing alphabetical

* tie-break in place for now.

*/

return String(

a.playerName ||

""

)

.localeCompare(

String(

b.playerName ||

""

)

);

}

);


/* =====================================================

OVERALL WINNER

===================================================== */


const overallWinner =

playerStandings.length > 0

? playerStandings[0]

: null;


/* =====================================================

DETERMINE OVERALL WINNING PHOTO

RULE:

1. Only look at photos belonging to the

overall winning player.

2. Highest vote count wins.

3. If tied, earliest Submitted timestamp wins.

4. If Submitted timestamps are identical or

unavailable, preserve the original Entries

sheet order.

===================================================== */


let overallWinningPhoto =

null;


if (

overallWinner &&

overallWinner.playerId

) {


const overallWinnerPlayerId =

String(

overallWinner.playerId

)

.trim();


const winnerPhotos =

results.filter(

entry =>

String(

entry.playerId ||

""

)

.trim() ===

overallWinnerPlayerId

);


if (

winnerPhotos.length > 0

) {


/*

* Keep the original Entries order available

* for the final fallback.

*/

const originalEntryOrder =

{};


entries.forEach(

(

entry,

index

) => {


const entryId =

String(

entry.entryId ||

""

)

.trim();


if (entryId) {


originalEntryOrder[

entryId

] =

index;

}

}

);


/*

* Sort ONLY the winner's photos.

*/

winnerPhotos.sort(

(

a,

b

) => {


/* ---------------------------------

FIRST:

Most votes wins.

--------------------------------- */


const voteDifference =

Number(

b.voteCount ||

0

) -

Number(

a.voteCount ||

0

);


if (

voteDifference !==

0

) {


return voteDifference;

}


/* ---------------------------------

SECOND:

Earliest Submitted timestamp.

--------------------------------- */


const aTime =

getSubmissionTimeForWinner(

a.submitted

);


const bTime =

getSubmissionTimeForWinner(

b.submitted

);


if (

aTime !==

bTime

) {


/*

* Valid timestamps sort

* earliest first.

*/

if (

aTime ===

0

) {

return 1;

}


if (

bTime ===

0

) {

return -1;

}


return (

aTime -

bTime

);

}


/* ---------------------------------

THIRD:

Original Entries sheet order.

--------------------------------- */


return (

Number(

originalEntryOrder[

String(

a.entryId ||

""

)

.trim()

] ||

0

) -

Number(

originalEntryOrder[

String(

b.entryId ||

""

)

.trim()

] ||

0

)

);

}

);


overallWinningPhoto =

winnerPhotos[0];


}

}


/* =====================================================

FINAL RESULT

===================================================== */


return {


success:

true,


gameCode:

gameCode,


/*

* All individual photo results.

*/

results:

results,


/*

* One winner for each category.

*/

winners:

winners,


/*

* Only category-winning photos.

*/

winningEntries:

winningEntries,


/*

* Overall winning player.

*/

overallWinner:

overallWinner,


/*

* The overall winner's highest-voted photo.

*

* This is the photo that will ultimately

* remain in Drive after FINISH.

*/

overallWinningPhoto:

overallWinningPhoto,


/*

* Full player leaderboard.

*/

playerStandings:

playerStandings,


totalEntries:

results.length,


totalVotes:

totalVotes

};

}



/* =========================================================

GET SUBMISSION TIME FOR WINNER TIE-BREAK

========================================================= */


function getSubmissionTimeForWinner(

submitted

) {


if (

!submitted

) {

return 0;

}


/*

* Google Sheets dates normally arrive in Apps Script

* as Date objects.

*/

if (

submitted instanceof Date

) {


const time =

submitted.getTime();


return isNaN(time)

? 0

: time;

}


/*

* Also support ISO/date strings in case the value

* has already been converted before reaching here.

*/

const parsed =

new Date(

submitted

);


const time =

parsed.getTime();


return isNaN(time)

? 0

: time;

}


/* =========================================================

GET CATEGORY NAME FOR RESULT

========================================================= */


function getCategoryNameForResult(

gameCode,

categoryId

) {


gameCode =

String(

gameCode ||

""

)

.trim()

.toUpperCase();


categoryId =

String(

categoryId ||

""

)

.trim();


if (

!gameCode ||

!categoryId

) {

return "";

}


const result =

getGameCategories(

gameCode

);


const categories =

result &&

result.success &&

Array.isArray(

result.categories

)

? result.categories

: [];


const category =

categories.find(

item =>

String(

item.categoryId ||

""

)

.trim() ===

categoryId

);


return category

? String(

category.name ||

""

).trim()

: "";

}



/* =========================================================

GET OR CREATE VOTES SHEET

========================================================= */


function getOrCreateVotesSheet() {


let sheet =

getSheet(

VOTES_SHEET

);


if (!sheet) {


sheet =

SpreadsheetApp

.getActiveSpreadsheet()

.insertSheet(

VOTES_SHEET

);


sheet

.appendRow([

"VoteID",

"GameCode",

"CategoryID",

"CategoryNumber",

"VoterPlayer",

"VotedEntryID",

"VoteTime"

]);

}


const headers =

getHeaders(

sheet

);


const requiredColumns = [

"VoteID",

"GameCode",

"CategoryID",

"CategoryNumber",

"VoterPlayer",

"VotedEntryID",

"VoteTime"

];


for (

let i = 0;

i < requiredColumns.length;

i++

) {


if (

findColumn(

headers,

requiredColumns[i]

) === -1

) {


throw new Error(

"Votes sheet is missing column: " +

requiredColumns[i]

);

}

}


return sheet;

}

