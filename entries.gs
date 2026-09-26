/* =========================================================

FIND IT!

Entries.gs

PHOTO SUBMISSIONS / PASSES / ENTRY LOOKUPS

========================================================= */



/* =========================================================

SUBMIT ENTRY

========================================================= */


function submitEntry(data) {


data = data || {};


const gameCode =

String(

data.gameCode || ""

).trim().toUpperCase();


const playerId =

String(

data.playerId || ""

).trim();


const playerName =

String(

data.playerName || ""

).trim();


const categoryId =

String(

data.categoryId || ""

).trim();


const categoryNumber =

Number(

data.categoryNumber || 0

);


const photoData =

String(

data.photoData || ""

).trim();



console.log(

"================================================="

);


console.log(

"SUBMIT ENTRY START"

);


console.log(

"Game:",

gameCode

);


console.log(

"Player:",

playerId,

playerName

);


console.log(

"Category:",

categoryId,

categoryNumber

);


console.log(

"Photo data length:",

photoData.length

);



/* =====================================================

VALIDATION

===================================================== */


if (!gameCode) {

return {

success: false,

error: "Game code is required."

};

}


if (!playerId) {

return {

success: false,

error: "Player ID is required."

};

}


if (!playerName) {

return {

success: false,

error: "Player name is required."

};

}


if (!categoryId) {

return {

success: false,

error: "Category ID is required."

};

}


if (!photoData) {

return {

success: false,

error: "Photo data is required."

};

}



/* =====================================================

GAME

===================================================== */


const game =

getGame(gameCode);


if (!game) {

return {

success: false,

error: "Game not found."

};

}


const gameStatus =

String(

game.status || ""

).trim().toUpperCase();


console.log(

"GAME STATUS:",

gameStatus

);


if (gameStatus !== "PLAYING") {

return {

success: false,

error:

"The game is not currently playing."

};

}



/* =====================================================

PLAYER

===================================================== */


const player =

findPlayer(

gameCode,

playerId

);


if (!player) {

return {

success: false,

error:

"Player not found in this game."

};

}



/* =====================================================

LOCK

===================================================== */


const lock =

LockService.getScriptLock();


try {


lock.waitLock(30000);



/* =================================================

GET ENTRIES SHEET

================================================= */


const sheet =

getSheet(

ENTRIES_SHEET

);


if (!sheet) {


console.log(

"ERROR: Entries sheet not found."

);


return {

success: false,

error:

"Entries sheet not found."

};

}



/* =================================================

SPREADSHEET DEBUG INFORMATION

================================================= */


const spreadsheet =

sheet.getParent();


console.log(

"SPREADSHEET NAME:",

spreadsheet.getName()

);


console.log(

"SPREADSHEET ID:",

spreadsheet.getId()

);


console.log(

"ENTRIES SHEET NAME:",

sheet.getName()

);



/* =================================================

HEADERS

================================================= */


const headers =

getHeaders(sheet);


console.log(

"ENTRIES HEADERS:",

headers

);



const requiredColumns = [


"EntryID",

"GameCode",

"PlayerID",

"PlayerName",

"CategoryID",

"CategoryNumber",

"Status",

"PhotoID",

"PhotoURL",

"Submitted"


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


return {

success: false,

error:

"Entries sheet is missing column: " +

requiredColumns[i]

};


}


}



/* =================================================

DUPLICATE CHECK

================================================= */


const lastRowBeforeDuplicateCheck =

sheet.getLastRow();


if (

lastRowBeforeDuplicateCheck >= 2

) {


const values =

sheet

.getRange(

2,

1,

lastRowBeforeDuplicateCheck - 1,

headers.length

)

.getValues();


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


const categoryIdColumn =

findColumn(

headers,

"CategoryID"

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


const rowCategoryId =

String(

row[

categoryIdColumn

] || ""

).trim();



if (

rowGameCode === gameCode &&

rowPlayerId === playerId &&

rowCategoryId === categoryId

) {


console.log(

"DUPLICATE ENTRY FOUND."

);


return {

success: false,

error:

"You have already completed this category."

};


}


}


}



/* =================================================

DRIVE FOLDER

================================================= */


let folder;


const folders =

DriveApp

.getFoldersByName(

"Find It Photos"

);


if (

folders.hasNext()

) {


folder =

folders.next();


} else {


folder =

DriveApp

.createFolder(

"Find It Photos"

);


}



/* =================================================

FOLDER SHARING

================================================= */


try {


folder.setSharing(

DriveApp.Access.ANYONE_WITH_LINK,

DriveApp.Permission.VIEW

);


} catch (error) {


console.log(

"Folder sharing warning:",

error.message

);


}



/* =================================================

PHOTO DATA

================================================= */


const match =

photoData.match(

/^data:(image\/[^;]+);base64,(.+)$/

);


if (!match) {


console.log(

"ERROR: Invalid photo data."

);


return {

success: false,

error:

"Invalid photo data."

};


}



const mimeType =

match[1];


const base64Data =

match[2];



let bytes;


try {


bytes =

Utilities

.base64Decode(

base64Data

);


} catch (error) {


console.log(

"BASE64 ERROR:",

error.message

);


return {

success: false,

error:

"Unable to decode photo."

};


}



const blob =

Utilities

.newBlob(

bytes,

mimeType

);



/* =================================================

FILE EXTENSION

================================================= */


let extension =

"jpg";


if (

mimeType ===

"image/png"

) {


extension =

"png";


} else if (

mimeType ===

"image/webp"

) {


extension =

"webp";


} else if (

mimeType ===

"image/heic"

) {


extension =

"heic";


}



/* =================================================

FILE NAME

================================================= */


const timestamp =

Date.now();


const fileName =

gameCode +

"_" +

playerId +

"_" +

categoryId +

"_" +

timestamp +

"." +

extension;


blob.setName(

fileName

);



/* =================================================

CREATE DRIVE FILE

================================================= */


let file;


try {


file =

folder.createFile(

blob

);

file.setDescription(

"Find It! GameCode: " +

gameCode +

" | PlayerID: " +

playerId

);

console.log(

"DRIVE FILE CREATED:",

file.getId()

);


} catch (error) {


console.log(

"DRIVE CREATE ERROR:",

error.message

);


return {

success: false,

error:

"Unable to save photo: " +

error.message

};


}



/* =================================================

FILE ACCESS

================================================= */


try {


file.setSharing(

DriveApp.Access.ANYONE_WITH_LINK,

DriveApp.Permission.VIEW

);


} catch (error) {


console.log(

"FILE SHARING ERROR:",

error.message

);


try {

file.setTrashed(true);

} catch (trashError) {}


return {

success: false,

error:

"Unable to make photo accessible: " +

error.message

};


}



/* =================================================

PHOTO INFORMATION

================================================= */


const photoId =

file.getId();


let resourceKey =

"";


try {


if (

typeof file.getResourceKey ===

"function"

) {


resourceKey =

String(

file.getResourceKey() ||

""

).trim();


}


} catch (error) {


resourceKey =

"";


}



const photoUrl =

buildDrivePhotoUrl(

photoId,

resourceKey

);



console.log(

"PHOTO ID:",

photoId

);


console.log(

"PHOTO URL:",

photoUrl

);



/* =================================================

ENTRY ID

================================================= */


const entryId =

Utilities.getUuid();



/* =================================================

BUILD ENTRY ROW

================================================= */


const row =

new Array(

headers.length

).fill("");



setIfColumnExists(

row,

headers,

"EntryID",

entryId

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

"PlayerID",

playerId

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

"Status",

"Submitted"

);


setIfColumnExists(

row,

headers,

"PhotoID",

photoId

);


setIfColumnExists(

row,

headers,

"PhotoURL",

photoUrl

);


setIfColumnExists(

row,

headers,

"Submitted",

new Date()

);



console.log(

"ENTRY ROW TO WRITE:",

JSON.stringify(row)

);



/* =================================================

DETERMINE EXACT WRITE ROW

================================================= */


const rowBeforeWrite =

sheet.getLastRow();


const writeRow =

Math.max(

2,

rowBeforeWrite + 1

);



console.log(

"ENTRIES LAST ROW BEFORE:",

rowBeforeWrite

);


console.log(

"EXACT ROW TO WRITE:",

writeRow

);



/* =================================================

WRITE DIRECTLY TO EXACT ROW

================================================= */


try {


sheet

.getRange(

writeRow,

1,

1,

headers.length

)

.setValues([

row

]);


SpreadsheetApp.flush();


console.log(

"ENTRY SETVALUES COMPLETE."

);


} catch (writeError) {


console.log(

"ENTRY WRITE ERROR:",

writeError.message

);


try {

file.setTrashed(true);

} catch (trashError) {}


return {

success: false,

error:

"Photo uploaded but Entries row could not be written: " +

writeError.message,

spreadsheetId:

spreadsheet.getId(),

spreadsheetName:

spreadsheet.getName(),

sheetName:

sheet.getName()

};


}



/* =================================================

VERIFY EXACT ROW

================================================= */


SpreadsheetApp.flush();


const verifyValues =

sheet

.getRange(

writeRow,

1,

1,

headers.length

)

.getValues()[0];



console.log(

"EXACT ROW READ BACK:",

JSON.stringify(

verifyValues

)

);



const verifyEntryId =

String(

getValueFromRow(

headers,

verifyValues,

"EntryID"

) || ""

).trim();



const verifyGameCode =

String(

getValueFromRow(

headers,

verifyValues,

"GameCode"

) || ""

)

.trim()

.toUpperCase();



const verifyPlayerId =

String(

getValueFromRow(

headers,

verifyValues,

"PlayerID"

) || ""

).trim();



const verifyPhotoId =

String(

getValueFromRow(

headers,

verifyValues,

"PhotoID"

) || ""

).trim();



const verifyCategoryId =

String(

getValueFromRow(

headers,

verifyValues,

"CategoryID"

) || ""

).trim();



console.log(

"ENTRY VERIFICATION:",

JSON.stringify({

expectedEntryId:

entryId,


actualEntryId:

verifyEntryId,


expectedGameCode:

gameCode,


actualGameCode:

verifyGameCode,


expectedPlayerId:

playerId,


actualPlayerId:

verifyPlayerId,


expectedCategoryId:

categoryId,


actualCategoryId:

verifyCategoryId,


expectedPhotoId:

photoId,


actualPhotoId:

verifyPhotoId,


writeRow:

writeRow

})

);



const entryVerified =

verifyEntryId === entryId &&

verifyGameCode === gameCode &&

verifyPlayerId === playerId &&

verifyCategoryId === categoryId &&

verifyPhotoId === photoId;



if (!entryVerified) {


console.log(

"ERROR: ENTRY WAS NOT VERIFIED."

);



try {

file.setTrashed(true);

} catch (trashError) {


console.log(

"Unable to trash orphan photo:",

trashError.message

);


}



return {

success: false,

error:

"Photo was uploaded but the Entries spreadsheet row could not be verified.",

spreadsheetId:

spreadsheet.getId(),

spreadsheetName:

spreadsheet.getName(),

sheetName:

sheet.getName(),

attemptedRow:

writeRow

};


}



console.log(

"ENTRY SUCCESSFULLY STORED:",

entryId

);



/* =================================================

UPDATE PLAYER

================================================= */


let playerCompleted =

false;


try {


playerCompleted =

updatePlayerProgress(

gameCode,

playerId,

"Completed"

);


SpreadsheetApp.flush();


} catch (error) {


console.log(

"PLAYER UPDATE WARNING:",

error.message

);


}



/* =================================================

CHECK GAME COMPLETION

================================================= */


let completion = {


gameStatus:

gameStatus,


currentCategory:

categoryNumber


};



let completionWarning =

"";



try {


completion =

checkGameCompletion(

gameCode

);


console.log(

"GAME COMPLETION CHECK:",

completion

);


} catch (error) {


completionWarning =

error.message ||

String(error);


console.log(

"GAME COMPLETION WARNING:",

completionWarning

);


}



/* =================================================

FINAL RESPONSE

================================================= */


console.log(

"PHOTO SUBMISSION COMPLETE:",

JSON.stringify({


entryId:

entryId,


photoId:

photoId,


gameCode:

gameCode,


playerId:

playerId,


categoryId:

categoryId,


spreadsheetId:

spreadsheet.getId(),


spreadsheetName:

spreadsheet.getName(),


sheetName:

sheet.getName(),


writtenRow:

writeRow,


gameStatus:

completion.gameStatus


})

);



return {


success:

true,


entryId:

entryId,


photoId:

photoId,


photoUrl:

photoUrl,


resourceKey:

resourceKey,


playerCompleted:

playerCompleted,


gameStatus:

completion.gameStatus,


currentCategory:

completion.currentCategory,


completionWarning:

completionWarning,


/* =========================================

TEMPORARY DEBUG INFORMATION

========================================= */


spreadsheetId:

spreadsheet.getId(),


spreadsheetName:

spreadsheet.getName(),


sheetName:

sheet.getName(),


writtenRow:

writeRow


};


} finally {


try {

lock.releaseLock();

} catch (error) {}


}


}



/* =========================================================

SUBMIT PASS

========================================================= */


function submitPass(data) {


data = data || {};


const gameCode =

String(

data.gameCode || ""

).trim().toUpperCase();


const playerId =

String(

data.playerId || ""

).trim();


const playerName =

String(

data.playerName || ""

).trim();


const categoryId =

String(

data.categoryId || ""

).trim();


const categoryNumber =

Number(

data.categoryNumber || 0

);



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


if (!playerName) {


return {

success: false,

error:

"Player name is required."

};


}


if (!categoryId) {


return {

success: false,

error:

"Category ID is required."

};


}



const game =

getGame(gameCode);


if (!game) {


return {

success: false,

error:

"Game not found."

};


}



const gameStatus =

String(

game.status || ""

).trim().toUpperCase();



if (

gameStatus !==

"PLAYING"

) {


return {

success: false,

error:

"The game is not currently playing."

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

"Player not found in this game."

};


}



const lock =

LockService.getScriptLock();



try {


lock.waitLock(30000);



const sheet =

getOrCreatePassesSheet();


const headers =

getHeaders(sheet);


const lastRow =

sheet.getLastRow();



/* =================================================

DUPLICATE PASS CHECK

================================================= */


if (

lastRow >= 2

) {


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


const playerIdColumn =

findColumn(

headers,

"PlayerID"

);


const categoryIdColumn =

findColumn(

headers,

"CategoryID"

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



const rowCategoryId =

String(

row[

categoryIdColumn

] || ""

).trim();



if (

rowGameCode === gameCode &&

rowPlayerId === playerId &&

rowCategoryId === categoryId

) {


return {

success: false,

error:

"You have already passed this category."

};


}


}


}



/* =================================================

BUILD PASS ROW

================================================= */


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

"PlayerID",

playerId

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

"Passed",

true

);



/* =================================================

WRITE PASS

================================================= */


const writeRow =

Math.max(

2,

sheet.getLastRow() + 1

);



sheet

.getRange(

writeRow,

1,

1,

headers.length

)

.setValues([

row

]);



SpreadsheetApp.flush();



/* =================================================

VERIFY PASS

================================================= */


const verifyValues =

sheet

.getRange(

writeRow,

1,

1,

headers.length

)

.getValues()[0];



const verifyGameCode =

String(

getValueFromRow(

headers,

verifyValues,

"GameCode"

) || ""

)

.trim()

.toUpperCase();



const verifyPlayerId =

String(

getValueFromRow(

headers,

verifyValues,

"PlayerID"

) || ""

).trim();



const verifyCategoryId =

String(

getValueFromRow(

headers,

verifyValues,

"CategoryID"

) || ""

).trim();



if (

verifyGameCode !== gameCode ||

verifyPlayerId !== playerId ||

verifyCategoryId !== categoryId

) {


return {

success: false,

error:

"Pass was written but could not be verified.",

sheetName:

sheet.getName(),

writtenRow:

writeRow

};


}



/* =================================================

UPDATE PLAYER

================================================= */


let playerPassed =

false;


try {


playerPassed =

updatePlayerProgress(

gameCode,

playerId,

"Passed"

);


} catch (error) {


console.log(

"PASS PLAYER UPDATE WARNING:",

error.message

);


}



SpreadsheetApp.flush();



/* =================================================

GAME COMPLETION

================================================= */


let completion = {


gameStatus:

gameStatus,


currentCategory:

categoryNumber


};



try {


completion =

checkGameCompletion(

gameCode

);


} catch (error) {


console.log(

"PASS COMPLETION WARNING:",

error.message

);


}



return {


success:

true,


playerPassed:

playerPassed,


gameStatus:

completion.gameStatus,


currentCategory:

completion.currentCategory


};



} finally {


try {

lock.releaseLock();

} catch (error) {}


}


}



/* =========================================================

GET OR CREATE PASSES SHEET

========================================================= */


function getOrCreatePassesSheet() {


let sheet =
  SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(PASSES_SHEET);



if (!sheet) {


sheet =

SpreadsheetApp

.getActiveSpreadsheet()

.insertSheet(

PASSES_SHEET

);



sheet.appendRow([


"GameCode",

"PlayerID",

"PlayerName",

"CategoryID",

"CategoryNumber",

"Passed"


]);


}



const headers =

getHeaders(sheet);



const requiredColumns = [


"GameCode",

"PlayerID",

"PlayerName",

"CategoryID",

"CategoryNumber",

"Passed"


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

"Passes sheet is missing column: " +

requiredColumns[i]

);


}


}



return sheet;


}



/* =========================================================

GET ENTRIES

========================================================= */


function getEntries(gameCode) {


gameCode =

String(

gameCode || ""

).trim().toUpperCase();



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



const votingProgress =

getVotingProgress(

gameCode

);



return {


success:

true,


entries:

entries,


votesReceived:

votingProgress.votesReceived,


votesRequired:

votingProgress.votesRequired,


votingComplete:

votingProgress.votingComplete


};


}



/* =========================================================

BUILD DRIVE PHOTO URL

========================================================= */


function buildDrivePhotoUrl(

photoId,

resourceKey

) {


photoId =

String(

photoId || ""

).trim();


resourceKey =

String(

resourceKey || ""

).trim();



if (!photoId) {

return "";

}



let url =

"https://drive.google.com/thumbnail?id=" +

encodeURIComponent(

photoId

) +

"&sz=w1200";



if (resourceKey) {


url +=

"&resourcekey=" +

encodeURIComponent(

resourceKey

);


}



return url;


}



/* =========================================================

CLEAN PHOTO URL

========================================================= */


function cleanPhotoUrl(

photoUrl,

photoId

) {


photoId =

String(

photoId || ""

).trim();



if (photoId) {


let resourceKey =

"";



try {


const file =

DriveApp.getFileById(

photoId

);



if (

typeof file.getResourceKey ===

"function"

) {


resourceKey =

String(

file.getResourceKey() ||

""

).trim();


}


} catch (error) {


resourceKey =

"";


}



return buildDrivePhotoUrl(

photoId,

resourceKey

);


}



let clean =

String(

photoUrl || ""

).trim();



const markdownMatch =

clean.match(

/^\[([^\]]+)\]\(([^)]+)\)$/

);



if (markdownMatch) {


clean =

markdownMatch[2];


}



clean =

clean

.replace(

/^["']+|["']+$/g,

""

)

.trim();



return clean;


}



/* =========================================================

GET RAW ENTRIES FOR GAME

========================================================= */


function getRawEntriesForGame(

gameCode

) {


gameCode =

String(

gameCode || ""

).trim().toUpperCase();



const sheet =

getSheet(

ENTRIES_SHEET

);



if (!sheet) {

return [];

}



const headers =

getHeaders(sheet);



const lastRow =

sheet.getLastRow();



if (lastRow < 2) {

return [];

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



const entries =

[];



values.forEach(

row => {


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



const photoId =

String(

getValueFromRow(

headers,

row,

"PhotoID"

) || ""

).trim();



const rawPhotoUrl =

getValueFromRow(

headers,

row,

"PhotoURL"

);



const photoUrl =

cleanPhotoUrl(

rawPhotoUrl,

photoId

);



let resourceKey =

"";



if (photoId) {


try {


const file =

DriveApp.getFileById(

photoId

);



if (

typeof file.getResourceKey ===

"function"

) {


resourceKey =

String(

file.getResourceKey() ||

""

).trim();


}


} catch (error) {


resourceKey =

"";


}


}



entries.push({


entryId:

getValueFromRow(

headers,

row,

"EntryID"

),


gameCode:

rowGameCode,


playerId:

getValueFromRow(

headers,

row,

"PlayerID"

),


playerName:

getValueFromRow(

headers,

row,

"PlayerName"

),


categoryId:

getValueFromRow(

headers,

row,

"CategoryID"

),


categoryNumber:

Number(

getValueFromRow(

headers,

row,

"CategoryNumber"

) || 0

),


status:

getValueFromRow(

headers,

row,

"Status"

),


photoId:

photoId,


photoUrl:

photoUrl,


resourceKey:

resourceKey,


submitted:

getValueFromRow(

headers,

row,

"Submitted"

)


});


}

);



return entries;


}



/* =========================================================

GET PHOTO

========================================================= */


function getPhoto(photoId) {


photoId =

String(

photoId || ""

).trim();



if (!photoId) {


return {

success: false,

error:

"Photo ID is required."

};


}



let file;



try {


file =

DriveApp.getFileById(

photoId

);


} catch (error) {


return {

success: false,

error:

"Photo not found: " +

error.message

};


}



try {


const blob =

file.getBlob();


const bytes =

blob.getBytes();


const base64 =

Utilities

.base64Encode(

bytes

);



let mimeType =

blob.getContentType();



if (!mimeType) {

mimeType =

"image/jpeg";

}



return {


success:

true,


photoId:

photoId,


mimeType:

mimeType,


base64:

base64


};



} catch (error) {


return {


success:

false,


error:

"Unable to read photo: " +

error.message


};


}


}



/* =========================================================

AUTHORISE FIND IT DRIVE

========================================================= */


function authoriseFindItDrive() {


let folder;



const folders =

DriveApp

.getFoldersByName(

"Find It Photos"

);



if (

folders.hasNext()

) {


folder =

folders.next();


} else {


folder =

DriveApp

.createFolder(

"Find It Photos"

);


}



try {


folder.setSharing(

DriveApp.Access.ANYONE_WITH_LINK,

DriveApp.Permission.VIEW

);


} catch (error) {


Logger.log(

"Drive sharing warning: " +

error.message

);


}



Logger.log(

"Find It Photos folder ID: " +

folder.getId()

);



return {


success:

true,


folderId:

folder.getId(),


folderName:

folder.getName()


};


}



/* =========================================================

CLEAN UP GAME PHOTOS

---------------------------------------------------------

Keeps ONLY the selected overall winning photo.

========================================================= */


function cleanupGamePhotos(data) {


data =

data || {};



const gameCode =

String(

data.gameCode || ""

)

.trim()

.toUpperCase();



const winningPhotoId =

String(

data.winningPhotoId ||

data.photoId ||

""

).trim();



if (!gameCode) {


return {

success: false,

error:

"Game code is required."

};


}



if (!winningPhotoId) {


return {

success: false,

error:

"Winning photo ID is required."

};


}



const entries =

getRawEntriesForGame(

gameCode

);



if (

!entries ||

entries.length === 0

) {


return {


success:

true,


gameCode:

gameCode,


keptPhotoId:

winningPhotoId,


deletedCount:

0,


message:

"No photos found for this game."


};


}



const photoIds =

{};



entries.forEach(

entry => {


const photoId =

String(

entry.photoId || ""

).trim();



if (photoId) {


photoIds[

photoId

] = true;


}


}

);



if (

!photoIds[

winningPhotoId

]

) {


return {


success:

false,


error:

"The winning photo does not belong to this game. No photos were deleted."


};


}



const lock =

LockService.getScriptLock();



try {


lock.waitLock(30000);



let deletedCount =

0;


let keptCount =

0;


const errors =

[];



Object.keys(

photoIds

).forEach(

photoId => {


if (

photoId ===

winningPhotoId

) {


keptCount++;


console.log(

"KEEPING WINNING PHOTO:",

photoId

);


return;


}



try {


const file =

DriveApp.getFileById(

photoId

);



file.setTrashed(

true

);



deletedCount++;



console.log(

"TRASHED GAME PHOTO:",

photoId

);



} catch (error) {


const message =

"Unable to trash photo " +

photoId +

": " +

error.message;



errors.push(

message

);



console.log(

message

);


}


}

);



console.log(

"GAME PHOTO CLEANUP COMPLETE:",

{

gameCode:

gameCode,


winningPhotoId:

winningPhotoId,


deletedCount:

deletedCount,


keptCount:

keptCount,


errors:

errors


}

);



return {


success:

errors.length === 0,


gameCode:

gameCode,


keptPhotoId:

winningPhotoId,


deletedCount:

deletedCount,


keptCount:

keptCount,


errors:

errors,


message:

errors.length === 0

? "All non-winning game photos were deleted."

: "Game cleanup completed with some errors."


};



} finally {


try {

lock.releaseLock();

} catch (error) {}


}


}

