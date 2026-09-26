/* =========================================================

FIND IT!

FinishGame.gs


FINISH GAME

- Save splash is handled by frontend BEFORE this runs

- Delete all game photos from Drive

- Delete Entries rows

- Delete Passes rows

- Delete Votes rows

- Delete GameCategories rows

- Delete Players rows

- Delete Games row


Categories sheet is NOT touched.

========================================================= */



function finishGame(data) {


data =

data || {};


const gameCode =

String(

data.gameCode ||

""

)

.trim()

.toUpperCase();


const winningPhotoId =

String(

data.winningPhotoId ||

""

)

.trim();



if (!gameCode) {


return {

success: false,

error: "Game code is required."

};

}



const ss =

SpreadsheetApp.getActiveSpreadsheet();



const deleted = {

games: 0,

players: 0,

entries: 0,

gameCategories: 0,

passes: 0,

votes: 0

};



let photosDeleted = 0;



const lock =

LockService.getScriptLock();



lock.waitLock(30000);



try {


/* =================================================

DELETE GAME PHOTOS

================================================= */


photosDeleted =

deleteGamePhotos(

gameCode

);



/* =================================================

DELETE SHEET ROWS

================================================= */


deleted.entries =

deleteRowsByGameCode(

ss,

"Entries",

gameCode,

"GameCode"

);



deleted.passes =

deleteRowsByGameCode(

ss,

"Passes",

gameCode,

"GameCode"

);



deleted.votes =

deleteRowsByGameCode(

ss,

"Votes",

gameCode,

"GameCode"

);



deleted.gameCategories =

deleteRowsByGameCode(

ss,

"GameCategories",

gameCode,

"GameCode"

);



deleted.players =

deleteRowsByGameCode(

ss,

"Players",

gameCode,

"GameCode"

);



deleted.games =

deleteRowsByGameCode(

ss,

"Games",

gameCode,

"GameCode"

);



SpreadsheetApp.flush();



return {

success: true,


gameCode:

gameCode,


deleted:

deleted,


keptPhotoId:

"",


photosDeleted:

photosDeleted

};



} catch (error) {


console.error(

"finishGame error:",

error

);


return {

success: false,


error:

error.message ||

String(error)

};


} finally {


lock.releaseLock();

}

}



/* =========================================================

DELETE ALL PHOTOS FOR GAME

========================================================= */


function deleteGamePhotos(gameCode) {


let deletedCount = 0;



const folderIterator =

DriveApp

.getFoldersByName(

"Find It Photos"

);



if (!folderIterator.hasNext()) {


console.log(

"Find It Photos folder not found."

);


return 0;

}



const folder =

folderIterator.next();



const files =

folder.getFiles();



while (files.hasNext()) {


const file =

files.next();


try {


const description =

String(

file.getDescription() ||

""

);



/*

* Files created by Find It! have their

* game information stored in the

* description when available.

*

* Also check filename.

*/


const name =

String(

file.getName() ||

""

);



if (

description

.indexOf(gameCode) !== -1

||

name

.indexOf(gameCode) !== -1

) {


file.setTrashed(true);


deletedCount++;


continue;

}



/*

* If the file cannot be matched from

* metadata/name, leave it alone.

*/


} catch (error) {


console.warn(

"Could not delete file:",

file.getId(),

error

);

}

}



return deletedCount;

}



/* =========================================================

DELETE ROWS MATCHING GAME CODE

========================================================= */


function deleteRowsByGameCode(

ss,

sheetName,

gameCode,

headerName

) {


const sheet =

ss.getSheetByName(

sheetName

);



if (!sheet) {


console.log(

"Sheet not found:",

sheetName

);


return 0;

}



const values =

sheet

.getDataRange()

.getValues();



if (

!values ||

values.length < 2

) {

return 0;

}



const headers =

values[0];



const columnIndex =

headers.indexOf(

headerName

);



if (

columnIndex === -1

) {


throw new Error(

"Column " +

headerName +

" not found in " +

sheetName

);

}



let deletedCount = 0;



/*

* Delete from bottom upwards so row

* numbers remain valid.

*/


for (

let rowIndex =

values.length - 1;

rowIndex >= 1;

rowIndex--

) {


const rowGameCode =

String(

values[rowIndex][columnIndex] ||

""

)

.trim()

.toUpperCase();



if (

rowGameCode ===

gameCode

) {


sheet.deleteRow(

rowIndex + 1

);


deletedCount++;

}

}



return deletedCount;

}

