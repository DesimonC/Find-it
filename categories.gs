/* =========================================================

FIND IT!

Categories.gs

CATEGORY MANAGEMENT

========================================================= */



/* =========================================================

GET ALL ACTIVE CATEGORIES

========================================================= */


function getCategories() {


const sheet =

getSheet(CATEGORIES_SHEET);


if (!sheet) {


throw new Error(

"Categories sheet not found."

);


}


const values =

sheet.getDataRange().getValues();


if (

values.length < 2

) {


return {

success: true,

categories: []

};


}


const headers =

values[0].map(function(header) {


return String(

header || ""

).trim();


});



const categoryIdColumn =

findColumn(

headers,

"CategoryID"

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


const activeColumn =

findColumn(

headers,

"Active"

);



if (

categoryIdColumn === -1 ||

categoryNameColumn === -1

) {


throw new Error(

"Categories sheet must contain CategoryID and CategoryName columns."

);


}



const categories = [];



for (

let i = 1;

i < values.length;

i++

) {


const row =

values[i];



const categoryId =

String(

row[categoryIdColumn] || ""

).trim();


const categoryName =

String(

row[categoryNameColumn] || ""

).trim();


const description =

descriptionColumn >= 0

? String(

row[descriptionColumn] || ""

).trim()

: "";



if (

!categoryId ||

!categoryName

) {


continue;


}



/* -----------------------------------------

ACTIVE CHECK

----------------------------------------- */


let active = true;


if (

activeColumn >= 0

) {


const activeValue =

String(

row[activeColumn] || ""

)

.trim()

.toLowerCase();



if (

activeValue === "false" ||

activeValue === "no" ||

activeValue === "0" ||

activeValue === "inactive"

) {


active = false;


}


}



if (!active) {


continue;


}



categories.push({


categoryId:

categoryId,


name:

categoryName,


categoryName:

categoryName,


description:

description


});


}



return {


success: true,


categories:

categories


};


}

