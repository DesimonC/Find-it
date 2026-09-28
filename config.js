/* ==================================================
   FIND IT!
   config.js
================================================== */


/* ==================================================
   GOOGLE APPS SCRIPT API
================================================== */

const API_URL =
    "https://script.google.com/macros/s/AKfycbzD9-8rmqAffsOF1BVPd3jU3GCmFvkEbHMx7wljCzTgomc6UHdCFq1_nQ3NfH7WOqpWtg/exec";


/* ==================================================
   GAME SETTINGS
================================================== */

const GAME_CONFIG = {

    // Host enters the number of challenges directly.
    // Valid range: 1 to 10.
    categoryMin: 1,
    categoryMax: 10,
    defaultCategoryCount: 1,

    // Game is always until complete. No timer.
    gameLengths: {
        untilComplete: {
            value: "untilComplete",
            label: "Until Complete"
        }
    },

    defaultGameLength:
        "untilComplete",

    maxPlayerNameLength: 20,
    gameCodeLength: 6

};


/* ==================================================
   APPLICATION SETTINGS
================================================== */

const APP_CONFIG = {
    appName: "Find it!",
    version: "1.0",
    lobbyRefreshTime: 3000,
    gameRefreshTime: 3000,
    scoringRefreshTime: 4000
};


/* ==================================================
   HOST CATEGORY INPUT

   The current index.html still contains the old fixed
   category buttons. We replace that UI at runtime so the
   repository does not need to retain the old 1/3/7/11
   choices.
================================================== */

function setupHostCategoryInput() {

    const setupScreen =
        document.getElementById("hostSetupScreen");

    if (!setupScreen) {
        return;
    }

    const optionRow =
        setupScreen.querySelector(".option-row");

    if (!optionRow) {
        return;
    }

    if (document.getElementById("hostCategoryCountInput")) {
        return;
    }

    optionRow.innerHTML = "";

    const label =
        document.createElement("label");

    label.htmlFor = "hostCategoryCountInput";
    label.textContent = "Number of challenges (1–10)";
    label.className = "help-text";

    const input =
        document.createElement("input");

    input.id = "hostCategoryCountInput";
    input.className = "text-input";
    input.type = "number";
    input.min = String(GAME_CONFIG.categoryMin);
    input.max = String(GAME_CONFIG.categoryMax);
    input.step = "1";
    input.value = String(GAME_CONFIG.defaultCategoryCount);
    input.inputMode = "numeric";
    input.autocomplete = "off";
    input.setAttribute("aria-label", "Number of challenges");

    optionRow.appendChild(label);
    optionRow.appendChild(input);

    input.addEventListener("input", function () {
        const value = Number(input.value);

        if (Number.isInteger(value) && value >= 1 && value <= 10) {
            window.hostEnteredCategoryCount = value;
        }
    });

    input.addEventListener("change", function () {
        const value = Number(input.value);

        if (!Number.isInteger(value) || value < 1 || value > 10) {
            input.value = String(GAME_CONFIG.defaultCategoryCount);
            window.hostEnteredCategoryCount = GAME_CONFIG.defaultCategoryCount;
            input.setCustomValidity("Enter a whole number from 1 to 10.");
        } else {
            input.setCustomValidity("");
            window.hostEnteredCategoryCount = value;
        }
    });

    window.hostEnteredCategoryCount =
        GAME_CONFIG.defaultCategoryCount;

    console.log(
        "HOST: Category input installed. Range 1-10, default 1."
    );
}


/* ==================================================
   CREATE-GAME API GUARD

   Host.js still sends its legacy internal value. This
   wrapper replaces that value with the number entered by
   the host immediately before createGame reaches the API.
================================================== */

function installCategoryCountApiGuard() {

    if (
        typeof window.apiPost !== "function" ||
        window.__findItCategoryApiGuardInstalled
    ) {
        return;
    }

    const originalApiPost =
        window.apiPost;

    window.apiPost =
        async function(action, data) {

            if (action === "createGame") {

                const input =
                    document.getElementById(
                        "hostCategoryCountInput"
                    );

                const entered = Number(
                    input
                        ? input.value
                        : GAME_CONFIG.defaultCategoryCount
                );

                if (
                    !Number.isInteger(entered) ||
                    entered < GAME_CONFIG.categoryMin ||
                    entered > GAME_CONFIG.categoryMax
                ) {
                    throw new Error(
                        "Number of challenges must be a whole number from 1 to 10."
                    );
                }

                data = {
                    ...(data || {}),
                    categoryCount: entered
                };

                window.hostEnteredCategoryCount = entered;
            }

            return originalApiPost(action, data);
        };

    window.__findItCategoryApiGuardInstalled = true;

    console.log(
        "HOST: createGame category-count guard installed."
    );
}


/* ==================================================
   DEBUG
================================================== */

const DEBUG = true;

if (DEBUG) {
    console.log("=================================");
    console.log("Find it! config.js loaded");
    console.log("API URL:", API_URL);
    console.log("Game configuration:", GAME_CONFIG);
    console.log("=================================");
}


/* ==================================================
   DOM READY
================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {
        setupHostCategoryInput();
        installCategoryCountApiGuard();
    }
);
