function prefillGameCodeFromQr() {
    try {
        const params = new URLSearchParams(window.location.search);
        const code = String(params.get("gameCode") || params.get("code") || "").trim().toUpperCase();
        if (!code) return;
        const input = document.getElementById("gameCodeInput");
        if (input) input.value = code;
    } catch (error) { console.warn("QR: Could not read game code:", error); }
}

/* ==================================================
   FIND IT!
   app.js
   Main application controller
================================================== */

console.log("=================================");
console.log("Find it! app.js loaded");
console.log("=================================");


/* ==================================================
   APP INITIALISATION
================================================== */

document.addEventListener(
    "DOMContentLoaded",
    initApp
);

/* =========================================================
   LOAD SAVED WINNING PHOTO ON APP START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

    prefillGameCodeFromQr();

        console.log(
            "SPLASH: Checking for saved winning photo..."
        );

        if (
            typeof loadSavedSplashPhoto ===
            "function"
        ) {

            loadSavedSplashPhoto();

        } else {

            console.error(
                "SPLASH: loadSavedSplashPhoto() is not available"
            );

        }

    }
);
function initApp() {

    console.log(
        "Initialising Find it! app..."
    );


    /* ------------------------------------------
       SPLASH BUTTONS
    ------------------------------------------ */

    setupSplashButtons();


    /* ------------------------------------------
       BACK BUTTONS
    ------------------------------------------ */

    setupBackButtons();


    /* ------------------------------------------
       CHECK SAVED PLAYER
    ------------------------------------------ */

    restoreSavedPlayer();


    console.log(
        "Find it! app initialisation complete"
    );

}


/* ==================================================
   SPLASH BUTTON SETUP
================================================== */

function setupSplashButtons() {

    const hostButton =
        document.getElementById(
            "hostButton"
        );

    const joinButton =
        document.getElementById(
            "joinButton"
        );

    const rejoinButton =
        document.getElementById(
            "rejoinButton"
        );


    /* ------------------------------------------
       HOST
    ------------------------------------------ */

    if (hostButton) {

        hostButton.onclick =
            splashHost;

        console.log(
            "Host button connected"
        );

    }


    /* ------------------------------------------
       JOIN
    ------------------------------------------ */

    if (joinButton) {

        joinButton.onclick =
            splashJoin;

        console.log(
            "Join button connected"
        );

    }


    /* ------------------------------------------
       REJOIN
    ------------------------------------------ */

    if (rejoinButton) {

        rejoinButton.onclick =
            splashRejoin;

        console.log(
            "Rejoin button connected"
        );

    }


    /* ------------------------------------------
       ENTER KEY
    ------------------------------------------ */

    const nameInput =
        document.getElementById(
            "playerNameInput"
        );

    const codeInput =
        document.getElementById(
            "gameCodeInput"
        );


    if (nameInput) {

        nameInput.addEventListener(
            "keydown",
            function(event) {

                if (
                    event.key === "Enter"
                ) {

                    splashJoin();

                }

            }
        );

    }


    if (codeInput) {

        codeInput.addEventListener(
            "keydown",
            function(event) {

                if (
                    event.key === "Enter"
                ) {

                    splashJoin();

                }

            }
        );

    }

}


/* ==================================================
   SPLASH HOST
================================================== */

function splashHost() {

    console.log(
        "================================="
    );

    console.log(
        "SPLASH HOST"
    );

    console.log(
        "================================="
    );


    clearSplashMessage();


    /*
       Host setup has its own name field,
       so we simply open the host setup
       screen.
    */

    if (
        typeof openHostSetup ===
        "function"
    ) {

        openHostSetup();

        return;

    }


    showScreen(
        "hostSetupScreen"
    );

}


/* ==================================================
   SPLASH JOIN
================================================== */

async function splashJoin() {

    console.log(
        "================================="
    );

    console.log(
        "SPLASH JOIN"
    );

    console.log(
        "================================="
    );


    clearSplashMessage();


    const nameInput =
        document.getElementById(
            "playerNameInput"
        );

    const codeInput =
        document.getElementById(
            "gameCodeInput"
        );


    if (!nameInput) {

        showSplashMessage(
            "Player name box not found."
        );

        return;

    }


    if (!codeInput) {

        showSplashMessage(
            "Game code box not found."
        );

        return;

    }


    const playerName =
        nameInput.value
            .trim();


    const gameCode =
        codeInput.value
            .trim()
            .toUpperCase();


    /* ------------------------------------------
       VALIDATE NAME
    ------------------------------------------ */

    if (!playerName) {

        showSplashMessage(
            "Please enter your name."
        );

        nameInput.focus();

        return;

    }


    const maxNameLength =
        typeof GAME_CONFIG !==
        "undefined" &&
        GAME_CONFIG.maxPlayerNameLength
            ? GAME_CONFIG.maxPlayerNameLength
            : 20;


    if (
        playerName.length >
        maxNameLength
    ) {

        showSplashMessage(
            "Your name is too long."
        );

        nameInput.focus();

        return;

    }


    /* ------------------------------------------
       VALIDATE GAME CODE
    ------------------------------------------ */

    if (!gameCode) {

        showSplashMessage(
            "Please enter a game code."
        );

        codeInput.focus();

        return;

    }


    if (
        gameCode.length !== 6
    ) {

        showSplashMessage(
            "Game code must be 6 characters."
        );

        codeInput.focus();

        return;

    }


    /* ------------------------------------------
       JOIN
    ------------------------------------------ */

    console.log(
        "Joining:",
        playerName,
        gameCode
    );


    const button =
        document.getElementById(
            "joinButton"
        );


    if (button) {

        button.disabled = true;

        button.textContent =
            "JOINING...";

    }


    try {

        /*
           player.js contains the actual
           player join function.
        */

        if (
            typeof playerJoinGame !==
            "function"
        ) {

            throw new Error(
                "Player join function is not available."
            );

        }


        /*
           Store the values temporarily so
           playerJoinGame() can use them.
        */

        if (nameInput) {

            nameInput.dataset.submittedName =
                playerName;

        }


        if (codeInput) {

            codeInput.dataset.submittedCode =
                gameCode;

        }


        /*
           playerJoinGame() reads the same
           splash fields.
        */

        await playerJoinGame();


    } catch (error) {

        console.error(
            "Splash join failed:",
            error
        );


        showSplashMessage(
            error.message ||
            "Unable to join game."
        );


    } finally {

        if (button) {

            button.disabled = false;

            button.textContent =
                "JOIN GAME";

        }

    }

}


/* ==================================================
   SPLASH REJOIN
================================================== */

async function splashRejoin() {

    console.log(
        "================================="
    );

    console.log(
        "SPLASH REJOIN"
    );

    console.log(
        "================================="
    );


    clearSplashMessage();


    const nameInput =
        document.getElementById(
            "playerNameInput"
        );

    const codeInput =
        document.getElementById(
            "gameCodeInput"
        );


    if (!nameInput) {

        showSplashMessage(
            "Player name box not found."
        );

        return;

    }


    if (!codeInput) {

        showSplashMessage(
            "Game code box not found."
        );

        return;

    }


    const playerName =
        nameInput.value
            .trim();


    const gameCode =
        codeInput.value
            .trim()
            .toUpperCase();


    /* ------------------------------------------
       VALIDATE NAME
    ------------------------------------------ */

    if (!playerName) {

        showSplashMessage(
            "Please enter your name."
        );

        nameInput.focus();

        return;

    }


    /* ------------------------------------------
       VALIDATE CODE
    ------------------------------------------ */

    if (!gameCode) {

        showSplashMessage(
            "Please enter the game code."
        );

        codeInput.focus();

        return;

    }


    if (
        gameCode.length !== 6
    ) {

        showSplashMessage(
            "Game code must be 6 characters."
        );

        codeInput.focus();

        return;

    }


    /* ------------------------------------------
       BUTTON
    ------------------------------------------ */

    const button =
        document.getElementById(
            "rejoinButton"
        );


    if (button) {

        button.disabled = true;

        button.textContent =
            "REJOINING...";

    }


    try {

        console.log(
            "Rejoining:",
            playerName,
            gameCode
        );


        /*
           player.js contains the actual
           rejoin function.
        */

        if (
            typeof playerRejoinGame !==
            "function"
        ) {

            throw new Error(
                "Player rejoin function is not available."
            );

        }


        await playerRejoinGame();


    } catch (error) {

        console.error(
            "Splash rejoin failed:",
            error
        );


        showSplashMessage(
            error.message ||
            "Unable to rejoin game."
        );


    } finally {

        if (button) {

            button.disabled = false;

            button.textContent =
                "REJOIN GAME";

        }

    }

}


/* ==================================================
   RESTORE SAVED PLAYER
================================================== */

function restoreSavedPlayer() {

    console.log(
        "Checking for saved player..."
    );


    try {

        const saved =
            localStorage.getItem(
                "findItPlayer"
            );


        if (!saved) {

            console.log(
                "No saved player found."
            );

            return;

        }


        const player =
            JSON.parse(
                saved
            );


        if (
            !player ||
            !player.playerId ||
            !player.gameCode
        ) {

            console.warn(
                "Saved player data is invalid."
            );

            localStorage.removeItem(
                "findItPlayer"
            );

            return;

        }


        /*
           Restore global player state
           if player.js has already created it.
        */

        if (
            typeof currentPlayer !==
            "undefined"
        ) {

            currentPlayer =
                player;

        }


        console.log(
            "Saved player found:",
            player
        );


        /*
           Put saved details into the
           splash boxes so the user can
           easily rejoin.
        */

        const nameInput =
            document.getElementById(
                "playerNameInput"
            );

        const codeInput =
            document.getElementById(
                "gameCodeInput"
            );


        if (nameInput) {

            nameInput.value =
                player.playerName ||
                player.name ||
                "";

        }


        if (codeInput) {

            codeInput.value =
                player.gameCode ||
                "";

        }


    } catch (error) {

        console.error(
            "Unable to restore saved player:",
            error
        );

    }

}


/* ==================================================
   BACK BUTTONS
================================================== */

function setupBackButtons() {

    const hostBack =
        document.getElementById(
            "hostSetupBackButton"
        );


    if (hostBack) {

        hostBack.addEventListener(
            "click",
            function() {

                showScreen(
                    "splash"
                );

            }
        );

    }


    const uploadBack =
        document.getElementById(
            "uploadBackButton"
        );


    if (
        uploadBack &&
        typeof openPhotoUpload !==
        "function"
    ) {

        /*
           player.js normally connects
           this button itself.
        */

        console.log(
            "Photo back button will be handled by player.js"
        );

    }

}


/* ==================================================
   SHOW SCREEN
================================================== */

function showScreen(
    screenId
) {

    console.log(
        "Showing screen:",
        screenId
    );


    const screens =
        document.querySelectorAll(
            ".screen"
        );


    screens.forEach(
        function(screen) {

            screen.classList.remove(
                "active"
            );

        }
    );


    const target =
        document.getElementById(
            screenId
        );


    if (!target) {

        console.error(
            "Screen not found:",
            screenId
        );

        return;

    }


    target.classList.add(
        "active"
    );


    window.scrollTo(
        0,
        0
    );

}


/* ==================================================
   SPLASH MESSAGE
================================================== */

function showSplashMessage(
    message
) {

    const element =
        document.getElementById(
            "splashMessage"
        );


    if (!element) {

        console.error(
            message
        );

        return;

    }


    element.textContent =
        message;


    element.style.display =
        "block";

}


/* ==================================================
   CLEAR SPLASH MESSAGE
================================================== */

function clearSplashMessage() {

    const element =
        document.getElementById(
            "splashMessage"
        );


    if (!element) {

        return;

    }


    element.textContent =
        "";

    element.style.display =
        "none";

}


/* ==================================================
   ERROR DISPLAY
================================================== */

function showError(
    message
) {

    console.error(
        "APP ERROR:",
        message
    );


    const toast =
        document.getElementById(
            "errorToast"
        );


    if (!toast) {

        return;

    }


    toast.textContent =
        message;


    toast.classList.remove(
        "hidden"
    );


    setTimeout(
        function() {

            toast.classList.add(
                "hidden"
            );

        },
        4000
    );

}


/* ==================================================
   LOADING
================================================== */

function showLoading(
    message = "Loading..."
) {

    const overlay =
        document.getElementById(
            "loadingOverlay"
        );


    const text =
        document.getElementById(
            "loadingMessage"
        );


    if (text) {

        text.textContent =
            message;

    }


    if (overlay) {

        overlay.classList.remove(
            "hidden"
        );

    }

}


/* ==================================================
   HIDE LOADING
================================================== */

function hideLoading() {

    const overlay =
        document.getElementById(
            "loadingOverlay"
        );


    if (overlay) {

        overlay.classList.add(
            "hidden"
        );

    }

}


/* ==================================================
   PLAY AGAIN
================================================== */

function playAgain() {

    console.log(
        "Play Again pressed"
    );


    if (
        typeof leavePlayerGame ===
        "function"
    ) {

        leavePlayerGame();

        return;

    }


    showScreen(
        "splash"
    );

}


/* ==================================================
   GLOBAL SAFETY
================================================== */

window.showScreen =
    showScreen;

window.splashHost =
    splashHost;

window.splashJoin =
    splashJoin;

window.splashRejoin =
    splashRejoin;

window.showSplashMessage =
    showSplashMessage;

window.showError =
    showError;

window.showLoading =
    showLoading;

window.hideLoading =
    hideLoading;

window.playAgain =
    playAgain;


/* ==================================================
   READY
================================================== */

console.log(
    "Find it! app.js ready"
);