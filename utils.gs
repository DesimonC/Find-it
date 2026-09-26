/* =========================================================

FIND IT!

Utils.gs

SHARED BACKEND UTILITIES

========================================================= */



/* =========================================================

GET SHEET

========================================================= */


function getSheet(

sheetName

) {


const spreadsheet =

SpreadsheetApp

.getActiveSpreadsheet();


const sheet =

spreadsheet.getSheetByName(

sheetName

);


if (!sheet) {


throw new Error(

"Sheet not found: " +

sheetName

);


}


return sheet;


}



/* =========================================================

GET HEADERS

========================================================= */


function getHeaders(

sheet

) {


if (!sheet) {


throw new Error(

"Sheet is required."

);


}


if (

sheet.getLastColumn() <

1

) {


return [];


}


return sheet

.getRange(

1,

1,

1,

sheet.getLastColumn()

)

.getValues()[0]

.map(

function(header) {


return String(

header || ""

).trim();


}

);


}



/* =========================================================

FIND COLUMN

Returns zero-based column index.

========================================================= */


function findColumn(

headers,

columnName

) {


if (

!Array.isArray(headers)

) {


return -1;


}


const wanted =

String(

columnName || ""

)

.trim()

.toLowerCase();


if (!wanted) {


return -1;


}


for (

let i = 0;

i < headers.length;

i++

) {


if (

String(

headers[i] || ""

)

.trim()

.toLowerCase() ===

wanted

) {


return i;


}


}


return -1;


}



/* =========================================================

ROW TO OBJECT

========================================================= */


function rowToObject(

headers,

row

) {


const object = {};


if (

!Array.isArray(headers) ||

!Array.isArray(row)

) {


return object;


}


headers.forEach(

function(

header,

index

) {


const key =

String(

header || ""

).trim();


if (!key) {


return;


}


object[key] =

row[index];


}

);


return object;


}



/* =========================================================

GET VALUE FROM ROW

========================================================= */


function getValueFromRow(

headers,

row,

columnName

) {


const columnIndex =

findColumn(

headers,

columnName

);


if (

columnIndex === -1

) {


return "";


}


return (

row[columnIndex] !==

undefined

)

? row[columnIndex]

: "";


}



/* =========================================================

SET VALUE IF COLUMN EXISTS

========================================================= */


function setIfColumnExists(

row,

headers,

columnName,

value

) {


const columnIndex =

findColumn(

headers,

columnName

);


if (

columnIndex === -1

) {


return false;


}


row[columnIndex] =

value;


return true;


}

