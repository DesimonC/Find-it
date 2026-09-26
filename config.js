/* ==================================================
   FIND IT!
   config.js
================================================== */


/* ==================================================
   GOOGLE APPS SCRIPT API
================================================== */

const API_URL =
    "https://script.google.com/macros/s/AKfycbwIn0RBpE2qvPYOJX7Lh2kG2P06ui1xe0l3C3knaz0jML-DR0LokEStbPAv8VzS8nEz0w/exec";


/* ==================================================
   GAME SETTINGS
================================================== */

const GAME_CONFIG = {

    // Available category counts
    categoryOptions: [
        1,
        3,
        7,
        11
    ],

    // Default category count
    defaultCategoryCount: 1,

    // Game length options
    gameLengths: {

        untilComplete: {
            value: "untilComplete",
            label: "Until Complete"
        }

    },

    // Default game length
    defaultGameLength:
        "untilComplete",

    // Maximum player name length
    maxPlayerNameLength: 20,

    // Maximum game-code length
    gameCodeLength: 6

};


/* ==================================================
   APPLICATION SETTINGS
================================================== */

const APP_CONFIG = {

    appName:
        "Find it!",

    version:
        "1.0",

    // Lobby refresh
    lobbyRefreshTime:
        3000,

    // Collection/game refresh
    gameRefreshTime:
        3000,

    // Scoring refresh
    scoringRefreshTime:
        4000

};


/* ==================================================
   DEBUG
================================================== */

const DEBUG =
    true;


if (DEBUG) {

    console.log(
        "================================="
    );

    console.log(
        "Find it! config.js loaded"
    );

    console.log(
        "API URL:",
        API_URL
    );

    console.log(
        "Game configuration:",
        GAME_CONFIG
    );

    console.log(
        "================================="
    );

}