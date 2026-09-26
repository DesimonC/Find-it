/* =========================================================
   FIND IT!
   host.js
   =========================================================

   HOST FLOW

   SPLASH
      ↓
   HOST SETUP
      ↓
   CREATE GAME
      ↓
   HOST LOBBY
      ↓
   START GAME
      ↓
   COLLECTION SCREEN
      ↓
   EVERYONE COMPLETE
      ↓
   START SCORING
      ↓
   SCORING
      ↓
   START VOTING
      ↓
   VOTING
      ↓
   WINNERS

   IMPORTANT
   ---------------------------------------------------------
   - Host is a real player.
   - Host button = initialiseHost()
   - Create button = hostCreateGame()
   - Host gameplay uses collectionScreen.
   - There is NO hostControlScreen.
   - START VOTING is shown during SCORING.
   - Old/stale game responses cannot move the game backwards.
   - No automatic old-game restoration on startup.
   - Category count is any whole number from 1 to 10. Default is 1.
========================================================= */


/* =========================================================
   STATE
========================================================= */

let hostGame = null;
let hostGameCode = "";
let hostPlayer = null;

let hostLobbyTimer = null;
let hostStatusTimer = null;

let hostLobbyPolling = false;
let hostStatusPolling = false;


/* =========================================================
   STATUS ORDER
========================================================= */

const HOST_STATUS_ORDER = {
    WAITING: 0,
    PLAYING: 1,
    SCORING: 2,
    VOTING: 3,
    FINISHED: 4
};


function hostStatusCanMoveForward(
    oldStatus,
    newStatus
) {

    oldStatus =
        String(
            oldStatus || ""
        )
        .trim()
        .toUpperCase();

    newStatus =
        String(
            newStatus || ""
        )
        .trim()
        .toUpperCase();

    if (!oldStatus) {
        return true;
    }

    if (!newStatus) {
        return true;
    }

    const oldValue =
        HOST_STATUS_ORDER[oldStatus];

    const newValue =
        HOST_STATUS_ORDER[newStatus];

    if (
        oldValue === undefined ||
        newValue === undefined
    ) {
        return true;
    }

    if (newValue < oldValue) {

        console.warn(
            "HOST: Ignoring stale status:",
            {
                current: oldStatus,
                received: newStatus
            }
        );

        return false;
    }

    return true;
}


/* =========================================================
   NORMALISE GAME
========================================================= */

function normaliseHostGame(game) {

    if (!game) {
        return null;
    }

    return {

        ...game,

        gameCode:
            String(
                game.gameCode ||
                game.GameCode ||
                ""
            )
            .trim()
            .toUpperCase(),

        hostPlayerId:
            String(
                game.hostPlayerId ||
                game.HostPlayerID ||
                ""
            )
            .trim(),

        hostName:
            String(
                game.hostName ||
                game.HostName ||
                ""
            )
            .trim(),

        categoryCount:
            Number(
                game.categoryCount ||
                game.CategoryCount ||
                1
            ),

        gameLength:
            game.gameLength ||
            game.GameLength ||
            "",

        status:
            String(
                game.status ||
                game.Status ||
                "WAITING"
            )
            .trim()
            .toUpperCase(),

        currentCategory:
            Number(
                game.currentCategory ||
                game.CurrentCategory ||
                0
            )
    };
}


/* =========================================================
   STORAGE
========================================================= */

function saveHostGame(game) {

    if (!game) {
        return;
    }

    try {

        localStorage.setItem(
            "findItGame",
            JSON.stringify(game)
        );

        localStorage.setItem(
            "findItHostGame",
            JSON.stringify(game)
        );

    } catch (error) {

        console.error(
            "HOST: Could not save game:",
            error
        );
    }
}


function saveHostCode(code) {

    code =
        String(
            code || ""
        )
        .trim()
        .toUpperCase();

    if (!code) {
        return;
    }

    hostGameCode = code;

    try {

        localStorage.setItem(
            "findItGameCode",
            code
        );

        localStorage.setItem(
            "gameCode",
            code
        );

        localStorage.setItem(
            "GameCode",
            code
        );

    } catch (error) {

        console.error(
            "HOST: Could not save game code:",
            error
        );
    }
}


function saveHostPlayer(player) {

    if (!player) {
        return;
    }

    hostPlayer = player;

    try {

        localStorage.setItem(
            "findItCurrentPlayer",
            JSON.stringify(player)
        );

        localStorage.setItem(
            "findItPlayer",
            JSON.stringify(player)
        );

    } catch (error) {

        console.error(
            "HOST: Could not save host player:",
            error
        );
    }
}


/* =========================================================
   CLEAR OLD HOST STATE
========================================================= */

function clearHostRuntime() {

    stopHostLobbyPolling();
    stopHostStatusPolling();

    hostGame = null;
    hostGameCode = "";
    hostPlayer = null;
}


/* =========================================================
   HOST BUTTON
   SPLASH → HOST SETUP
========================================================= */

function initialiseHost() {

    console.log(
        "HOST: HOST button pressed."
    );

    /*
       Starting a new host session should NOT
       automatically reopen an old game.
    */

    clearHostRuntime();

    showHostSetup();
}


/* =========================================================
   HOST SETUP
========================================================= */

function showHostSetup() {

    console.log(
        "HOST: Opening host setup."
    );

    const nameInput =
        document.getElementById(
            "hostNameInput"
        );

    if (nameInput) {
        nameInput.value = "";
    }

    setHostCategoryCount(1);

    if (
        typeof window.showScreen ===
        "function"
    ) {

        window.showScreen(
            "hostSetupScreen"
        );

    } else {

        console.error(
            "HOST: showScreen() not found."
        );
    }
}


/* =========================================================
   CATEGORY COUNT
========================================================= */

let hostSelectedCategoryCount = 1;


function setHostCategoryCount(count) {

    count = Number(count);

    if (
        !Number.isInteger(count) || count < 1 || count > 10
    ) {
        count = 1;
    }

    hostSelectedCategoryCount =
        count;

    window.hostSelectedCategoryCount =
        count;

    console.log(
        "HOST: Category count:",
        count
    );

    const buttons =
        document.querySelectorAll(
            "[data-category-count]"
        );

    buttons.forEach(
        function(button) {

            const value =
                Number(
                    button.dataset.categoryCount
                );

            button.classList.toggle(
                "selected",
                value === count
            );
        }
    );

}


/* =========================================================
   CATEGORY BUTTON EVENTS
========================================================= */

function setupHostCategoryButtons() {

    const buttons =
        document.querySelectorAll(
            "[data-category-count]"
        );

    buttons.forEach(
        function(button) {

            if (
                button.dataset.hostCategoryBound ===
                "true"
            ) {
                return;
            }

            button.dataset.hostCategoryBound =
                "true";

            button.addEventListener(
                "click",
                function(event) {

                    event.preventDefault();

                    setHostCategoryCount(
                        Number(
                            button.dataset.categoryCount
                        )
                    );
                }
            );
        }
    );
}


/* =========================================================
   CREATE GAME
========================================================= */

async function hostCreateGame() {

    console.log(
        "HOST: CREATE GAME pressed."
    );

    const input =
        document.getElementById(
            "hostNameInput"
        );

    const hostName =
        String(
            input
                ? input.value
                : ""
        )
        .trim();

    if (!hostName) {

        alert(
            "Please enter your name."
        );

        if (input) {
            input.focus();
        }

        return;
    }

    let categoryCount =
        Number(
            hostSelectedCategoryCount ||
            window.hostSelectedCategoryCount ||
            1
        );

    if (
        !Number.isInteger(categoryCount) || categoryCount < 1 || categoryCount > 10
    ) {
        categoryCount = 1;
    }

    const button =
        document.getElementById(
            "generateGameButton"
        );

    if (button) {

        button.disabled = true;

        button.dataset.originalText =
            button.textContent;

        button.textContent =
            "CREATING...";
    }

    try {

        console.log(
            "HOST: Sending createGame:",
            {
                hostName: hostName,
                categoryCount: categoryCount
            }
        );

        const result =
            await window.apiPost(
                "createGame",
                {
                    hostName:
                        hostName,

                    categoryCount:
                        categoryCount
                }
            );

        console.log(
            "HOST: createGame response:",
            result
        );

        if (
            !result ||
            result.success === false
        ) {

            throw new Error(
                result &&
                result.error
                    ? result.error
                    : "Could not create game."
            );
        }

        const returnedGame =
            result.game ||
            result;

        const game =
            normaliseHostGame(
                returnedGame
            );

        if (!game.gameCode) {

            throw new Error(
                "The server did not return a game code."
            );
        }

        /*
           createGame normally gives us the
           host player ID.
        */

        const playerId =
            String(
                result.playerId ||
                result.hostPlayerId ||
                game.hostPlayerId ||
                ""
            )
            .trim();

        if (!playerId) {

            throw new Error(
                "The server did not return the host player ID."
            );
        }

        hostGame =
            game;

        hostGameCode =
            game.gameCode;

        hostPlayer = {

            playerId:
                playerId,

            playerName:
                game.hostName ||
                hostName,

            gameCode:
                game.gameCode,

            isHost:
                true
        };

        saveHostCode(
            game.gameCode
        );

        saveHostGame(
            game
        );

        saveHostPlayer(
            hostPlayer
        );

        console.log(
            "HOST: New game created:",
            hostGame
        );

        console.log(
            "HOST: Host player:",
            hostPlayer
        );

        await openHostLobby();

    } catch (error) {

        console.error(
            "HOST: CREATE GAME failed:",
            error
        );

        alert(
            error.message ||
            "Could not create game."
        );

    } finally {

        if (button) {

            button.disabled = false;

            button.textContent =
                button.dataset.originalText ||
                "CREATE GAME";
        }
    }
}


/* =========================================================
   OPEN LOBBY
========================================================= */

async function openHostLobby() {

    if (!hostGameCode) {

        console.error(
            "HOST: No game code available."
        );

        return;
    }

    console.log(
        "HOST: Opening lobby:",
        hostGameCode
    );

    const codeElement =
        document.getElementById(
            "hostGameCode"
        );

    if (codeElement) {

        codeElement.textContent =
            hostGameCode;
    }

    if (
        typeof window.showScreen ===
        "function"
    ) {

        window.showScreen(
            "hostLobbyScreen"
        );
    }

    await refreshHostLobby();

    startHostLobbyPolling();
}


/* =========================================================
   REFRESH LOBBY
========================================================= */

async function refreshHostLobby() {

    if (!hostGameCode) {
        return;
    }

    try {

        const gameResult =
            await window.apiGet(
                "getGame",
                {
                    gameCode:
                        hostGameCode
                }
            );

        if (
            !gameResult ||
            gameResult.success === false
        ) {

            throw new Error(
                gameResult &&
                gameResult.error
                    ? gameResult.error
                    : "Could not load game."
            );
        }

        const incoming =
            normaliseHostGame(
                gameResult.game ||
                gameResult
            );

        if (!incoming) {
            return;
        }

        if (
            hostGame &&
            !hostStatusCanMoveForward(
                hostGame.status,
                incoming.status
            )
        ) {

            return;
        }

        hostGame =
            incoming;

        saveHostGame(
            hostGame
        );

        console.log(
            "HOST: Lobby game status:",
            hostGame.status
        );


        if (
            hostGame.status ===
            "WAITING"
        ) {

            await loadHostPlayers();

            return;
        }


        if (
            hostGame.status ===
            "PLAYING"
        ) {

            stopHostLobbyPolling();

            openHostPlaying();

            startHostStatusPolling();

            return;
        }


        if (
            hostGame.status ===
            "SCORING"
        ) {

            stopHostLobbyPolling();

            showHostVotingButton();

            return;
        }


        if (
            hostGame.status ===
            "VOTING"
        ) {

            stopHostLobbyPolling();

            showHostVotingButton(
                true
            );

            startHostStatusPolling();

            return;
        }


        if (
            hostGame.status ===
            "FINISHED"
        ) {

            stopHostLobbyPolling();

            showHostWinnersControl();

            return;
        }

    } catch (error) {

        console.error(
            "HOST: Lobby refresh failed:",
            error
        );
    }
}


/* =========================================================
   LOAD PLAYERS
========================================================= */

async function loadHostPlayers() {

    if (!hostGameCode) {
        return;
    }

    try {

        const result =
            await window.apiGet(
                "getPlayers",
                {
                    gameCode:
                        hostGameCode
                }
            );

        if (
            !result ||
            result.success === false
        ) {

            throw new Error(
                result &&
                result.error
                    ? result.error
                    : "Could not load players."
            );
        }

        const players =
            Array.isArray(
                result.players
            )
                ? result.players
                : [];

        renderHostPlayers(
            players
        );

    } catch (error) {

        console.error(
            "HOST: Could not load players:",
            error
        );
    }
}


/* =========================================================
   RENDER PLAYERS
========================================================= */

function renderHostPlayers(players) {

    const list =
        document.getElementById(
            "hostPlayerList"
        );

    const count =
        document.getElementById(
            "hostPlayerCount"
        );

    if (count) {

        count.textContent =
            String(
                players.length
            );
    }

    if (!list) {
        return;
    }

    list.innerHTML = "";

    players.forEach(
        function(player) {

            const name =
                String(
                    player.playerName ||
                    player.PlayerName ||
                    ""
                );

            const isHost =
                player.isHost === true ||
                String(
                    player.isHost ||
                    ""
                )
                .toUpperCase() ===
                "TRUE";

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "host-player-item";

            item.innerHTML =
                escapeHostHtml(name) +
                (
                    isHost
                        ? " <strong>(HOST)</strong>"
                        : ""
                );

            list.appendChild(
                item
            );
        }
    );


    /*
       Host is a player.

       Therefore one player is enough
       to enable START GAME.
    */

    const startButton =
        document.getElementById(
            "startGameButton"
        );

    if (startButton) {

        startButton.disabled =
            players.length < 1;

        startButton.classList.toggle(
            "disabled",
            players.length < 1
        );
    }
}


/* =========================================================
   START GAME
========================================================= */

async function hostStartGame() {

    console.log(
        "HOST: START GAME pressed."
    );

    if (!hostGameCode) {

        alert(
            "No game code is available."
        );

        return;
    }

    const button =
        document.getElementById(
            "startGameButton"
        );

    if (button) {

        button.disabled = true;
        button.textContent =
            "STARTING...";
    }

    try {

        const result =
            await window.apiPost(
                "startGame",
                {
                    gameCode:
                        hostGameCode
                }
            );

        console.log(
            "HOST: startGame response:",
            result
        );

        if (
            !result ||
            result.success === false
        ) {

            throw new Error(
                result &&
                result.error
                    ? result.error
                    : "Could not start game."
            );
        }

        const game =
            normaliseHostGame(
                result.game ||
                result
            );

        if (
            hostGame &&
            !hostStatusCanMoveForward(
                hostGame.status,
                game.status
            )
        ) {

            return;
        }

        hostGame =
            game;

        saveHostGame(
            hostGame
        );

        stopHostLobbyPolling();

        openHostPlaying();

        startHostStatusPolling();

    } catch (error) {

        console.error(
            "HOST: START GAME failed:",
            error
        );

        alert(
            error.message ||
            "Could not start game."
        );

        if (button) {

            button.disabled = false;
            button.textContent =
                "START GAME";
        }
    }
}


/* =========================================================
   OPEN PLAYING
========================================================= */

function openHostPlaying() {

    console.log(
        "HOST: Opening collection screen."
    );

    if (
        typeof window.openPlayerGame ===
        "function"
    ) {

        window.openPlayerGame(
            hostGame,
            hostPlayer
        );

        return;
    }

    if (
        typeof window.showScreen ===
        "function"
    ) {

        window.showScreen(
            "collectionScreen"
        );
    }
}


/* =========================================================
   STATUS POLLING
========================================================= */

function startHostStatusPolling() {

    stopHostStatusPolling();

    if (!hostGameCode) {
        return;
    }

    hostStatusPolling = true;

    hostStatusTimer =
        setInterval(
            function() {

                if (
                    !hostStatusPolling
                ) {
                    return;
                }

                refreshHostStatus();

            },
            2500
        );

    refreshHostStatus();
}


function stopHostStatusPolling() {

    hostStatusPolling = false;

    if (hostStatusTimer) {

        clearInterval(
            hostStatusTimer
        );

        hostStatusTimer = null;
    }
}


/* =========================================================
   REFRESH STATUS
========================================================= */

async function refreshHostStatus() {

    if (
        !hostStatusPolling ||
        !hostGameCode
    ) {
        return;
    }

    try {

        const result =
            await window.apiGet(
                "getGame",
                {
                    gameCode:
                        hostGameCode
                }
            );

        if (
            !result ||
            result.success === false
        ) {
            return;
        }

        const incoming =
            normaliseHostGame(
                result.game ||
                result
            );

        if (!incoming) {
            return;
        }

        if (
            hostGame &&
            !hostStatusCanMoveForward(
                hostGame.status,
                incoming.status
            )
        ) {

            return;
        }

        hostGame =
            incoming;

        saveHostGame(
            hostGame
        );

        console.log(
            "HOST: Game status:",
            hostGame.status
        );


        if (
            hostGame.status ===
            "PLAYING"
        ) {

            /*
               player.js handles the
               everyone-complete control.
            */

            if (
                typeof window.checkAndUpdateHostControls ===
                "function"
            ) {

                window.checkAndUpdateHostControls();
            }

            return;
        }


        if (
            hostGame.status ===
            "SCORING"
        ) {

            stopHostStatusPolling();

            showHostVotingButton();

            return;
        }


        if (
            hostGame.status ===
            "VOTING"
        ) {

            showHostVotingButton(
                true
            );

            return;
        }


        if (
            hostGame.status ===
            "FINISHED"
        ) {

            stopHostStatusPolling();

            showHostWinnersControl();

            return;
        }

    } catch (error) {

        console.error(
            "HOST: Status refresh failed:",
            error
        );
    }
}


/* =========================================================
   LOBBY POLLING
========================================================= */

function startHostLobbyPolling() {

    stopHostLobbyPolling();

    if (!hostGameCode) {
        return;
    }

    hostLobbyPolling = true;

    hostLobbyTimer =
        setInterval(
            function() {

                if (
                    hostLobbyPolling
                ) {

                    refreshHostLobby();
                }

            },
            2500
        );
}


function stopHostLobbyPolling() {

    hostLobbyPolling = false;

    if (hostLobbyTimer) {

        clearInterval(
            hostLobbyTimer
        );

        hostLobbyTimer = null;
    }
}


/* =========================================================
   START SCORING
========================================================= */

async function hostStartScoring() {

    console.log(
        "HOST: START SCORING pressed."
    );

    if (!hostGameCode) {
        return;
    }

    const button =
        document.getElementById(
            "scoreGameButton"
        );

    if (button) {

        button.disabled = true;
        button.textContent =
            "STARTING SCORING...";
    }

    try {

        const result =
            await window.apiPost(
                "startScoring",
                {
                    gameCode:
                        hostGameCode
                }
            );

        console.log(
            "HOST: startScoring response:",
            result
        );

        if (
            !result ||
            result.success === false
        ) {

            throw new Error(
                result &&
                result.error
                    ? result.error
                    : "Could not start scoring."
            );
        }

        const game =
            normaliseHostGame(
                result.game ||
                result
            );

        if (
            hostGame &&
            !hostStatusCanMoveForward(
                hostGame.status,
                game.status
            )
        ) {

            return;
        }

        hostGame =
            game;

        saveHostGame(
            hostGame
        );

        showHostVotingButton();

    } catch (error) {

        console.error(
            "HOST: START SCORING failed:",
            error
        );

        alert(
            error.message ||
            "Could not start scoring."
        );

        if (button) {

            button.disabled = false;
            button.textContent =
                "End Game & Start Scoring";
        }
    }
}


/* =========================================================
   SHOW START VOTING
========================================================= */

function showHostVotingButton(
    alreadyVoting
) {

    alreadyVoting =
        alreadyVoting === true;

    console.log(
        "HOST: Showing voting control:",
        alreadyVoting
    );

    /*
       NEVER use hostControlScreen.
    */

    let button =
        document.getElementById(
            "startVotingButton"
        );


    /*
       If the HTML already has a button,
       use it.
    */

    if (button) {

        button.classList.remove(
            "hidden"
        );

        button.style.display =
            "block";

        button.disabled =
            alreadyVoting;

        button.textContent =
            alreadyVoting
                ? "VOTING IN PROGRESS"
                : "START VOTING";

    } else {

        /*
           Create the button if the HTML
           does not contain one.
        */

        button =
            document.createElement(
                "button"
            );

        button.id =
            "startVotingButton";

        button.type =
            "button";

        button.className =
            "host-start-voting-button";

        button.textContent =
            alreadyVoting
                ? "VOTING IN PROGRESS"
                : "START VOTING";

        button.disabled =
            alreadyVoting;

        button.addEventListener(
            "click",
            hostStartVoting
        );


        const scoringScreen =
            document.getElementById(
                "scoringIntroScreen"
            );

        const scoringArea =
            document.getElementById(
                "scoringScreen"
            );

        const target =
            scoringScreen ||
            scoringArea ||
            document.getElementById(
                "collectionScreen"
            );

        if (target) {

            target.appendChild(
                button
            );
        }
    }


    /*
       Only change screen when entering
       SCORING.

       Do not attempt to show
       hostControlScreen.
    */

    if (!alreadyVoting) {

        if (
            typeof window.showScreen ===
            "function"
        ) {

            window.showScreen(
                "scoringIntroScreen"
            );
        }

    } else {

        if (
            typeof window.openVotingScreen ===
            "function"
        ) {

            window.openVotingScreen();

        } else if (
            typeof window.showScreen ===
            "function"
        ) {

            window.showScreen(
                "votingSection"
            );
        }
    }
}


/* =========================================================
   START VOTING
========================================================= */

async function hostStartVoting() {

    console.log(
        "HOST: START VOTING pressed."
    );

    if (!hostGameCode) {

        alert(
            "No game code is available."
        );

        return;
    }

    const button =
        document.getElementById(
            "startVotingButton"
        );

    if (button) {

        button.disabled = true;
        button.textContent =
            "STARTING VOTING...";
    }

    try {

        const result =
            await window.apiPost(
                "startVoting",
                {
                    gameCode:
                        hostGameCode
                }
            );

        console.log(
            "HOST: startVoting response:",
            result
        );

        if (
            !result ||
            result.success === false
        ) {

            throw new Error(
                result &&
                result.error
                    ? result.error
                    : "Could not start voting."
            );
        }

        const returnedGame =
            result.game ||
            result;

        const game =
            normaliseHostGame(
                returnedGame
            );

        if (
            game &&
            hostGame &&
            !hostStatusCanMoveForward(
                hostGame.status,
                game.status
            )
        ) {

            return;
        }

        if (game) {

            hostGame =
                game;

        } else {

            hostGame = {
                ...(hostGame || {}),
                status: "VOTING"
            };
        }

        saveHostGame(
            hostGame
        );

        if (
            typeof window.openVotingScreen ===
            "function"
        ) {

            window.openVotingScreen();

        } else if (
            typeof window.showScreen ===
            "function"
        ) {

            window.showScreen(
                "votingSection"
            );
        }

        startHostStatusPolling();

    } catch (error) {

        console.error(
            "HOST: START VOTING failed:",
            error
        );

        alert(
            error.message ||
            "Could not start voting."
        );

        if (button) {

            button.disabled = false;
            button.textContent =
                "START VOTING";
        }
    }
}


/* =========================================================
   HIDE START VOTING
========================================================= */

function hideHostVotingButton() {

    const button =
        document.getElementById(
            "startVotingButton"
        );

    if (!button) {
        return;
    }

    button.classList.add(
        "hidden"
    );

    button.style.display =
        "none";
}


/* =========================================================
   WINNERS CONTROL
========================================================= */

function showHostWinnersControl() {

    console.log(
        "HOST: Showing winners control."
    );

    hideHostVotingButton();

    const screen =
        document.getElementById(
            "hostWinnersControlScreen"
        );

    const button =
        document.getElementById(
            "showWinnersButton"
        );

    if (button) {

        button.classList.remove(
            "hidden"
        );

        button.style.display =
            "block";

        button.disabled = false;

        button.textContent =
            "SHOW WINNERS";
    }

    if (
        screen &&
        typeof window.showScreen ===
        "function"
    ) {

        window.showScreen(
            "hostWinnersControlScreen"
        );
    }
}


/* =========================================================
   SHOW WINNERS
========================================================= */

async function hostShowWinners() {

    console.log(
        "HOST: SHOW WINNERS pressed."
    );

    if (!hostGameCode) {
        return;
    }

    const button =
        document.getElementById(
            "showWinnersButton"
        );

    if (button) {

        button.disabled = true;
        button.textContent =
            "LOADING WINNERS...";
    }

    try {

        if (
            typeof window.loadFinalVotingResults ===
            "function"
        ) {

            await window.loadFinalVotingResults(
                hostGameCode
            );

        } else if (
            typeof window.loadVotingResults ===
            "function"
        ) {

            await window.loadVotingResults(
                hostGameCode
            );
        }


        if (
            typeof window.showWinnerReveal ===
            "function"
        ) {

            window.showWinnerReveal();

        } else if (
            typeof window.showScreen ===
            "function"
        ) {

            window.showScreen(
                "winnerRevealScreen"
            );
        }

    } catch (error) {

        console.error(
            "HOST: SHOW WINNERS failed:",
            error
        );

        alert(
            error.message ||
            "Could not load winners."
        );

    } finally {

        if (button) {

            button.disabled = false;
            button.textContent =
                "SHOW WINNERS";
        }
    }
}


/* =========================================================
   HOST REJOIN
========================================================= */

async function hostRejoinGame() {

    console.log(
        "HOST: REJOIN pressed."
    );

    const input =
        document.getElementById(
            "hostRejoinCodeInput"
        ) ||
        document.getElementById(
            "rejoinGameCodeInput"
        ) ||
        document.getElementById(
            "gameCodeInput"
        );

    const code =
        String(
            input
                ? input.value
                : ""
        )
        .trim()
        .toUpperCase();

    if (
        !/^[A-Z0-9]{6}$/.test(code)
    ) {

        alert(
            "Please enter the 6-character game code."
        );

        return;
    }

    try {

        const result =
            await window.apiPost(
                "restoreHost",
                {
                    gameCode:
                        code
                }
            );

        console.log(
            "HOST: restoreHost response:",
            result
        );

        if (
            !result ||
            result.success === false
        ) {

            throw new Error(
                result &&
                result.error
                    ? result.error
                    : "Could not rejoin game."
            );
        }

        const game =
            normaliseHostGame(
                result.game ||
                result
            );

        if (!game) {

            throw new Error(
                "No game was returned."
            );
        }

        hostGame =
            game;

        hostGameCode =
            code;

        hostPlayer = {

            playerId:
                String(
                    result.playerId ||
                    result.hostPlayerId ||
                    game.hostPlayerId ||
                    ""
                )
                .trim(),

            playerName:
                game.hostName,

            gameCode:
                code,

            isHost:
                true
        };

        saveHostCode(
            code
        );

        saveHostGame(
            game
        );

        saveHostPlayer(
            hostPlayer
        );


        if (
            game.status ===
            "WAITING"
        ) {

            await openHostLobby();

            return;
        }


        if (
            game.status ===
            "PLAYING"
        ) {

            openHostPlaying();

            startHostStatusPolling();

            return;
        }


        if (
            game.status ===
            "SCORING"
        ) {

            showHostVotingButton();

            return;
        }


        if (
            game.status ===
            "VOTING"
        ) {

            showHostVotingButton(
                true
            );

            startHostStatusPolling();

            return;
        }


        if (
            game.status ===
            "FINISHED"
        ) {

            showHostWinnersControl();

            return;
        }

    } catch (error) {

        console.error(
            "HOST: REJOIN failed:",
            error
        );

        alert(
            error.message ||
            "Could not rejoin game."
        );
    }
}


/* =========================================================
   FINISH
========================================================= */

function hostFinishGame() {

    console.log(
        "HOST: Finishing game."
    );

    stopHostLobbyPolling();
    stopHostStatusPolling();

    hostGame = null;
    hostGameCode = "";
    hostPlayer = null;

    /*
       Do not remove the saved winning splash
       photo here. results.js owns that.
    */

    try {

        localStorage.removeItem(
            "findItGame"
        );

        localStorage.removeItem(
            "findItHostGame"
        );

        localStorage.removeItem(
            "findItGameCode"
        );

        localStorage.removeItem(
            "gameCode"
        );

        localStorage.removeItem(
            "GameCode"
        );

    } catch (error) {

        console.error(
            "HOST: Storage cleanup failed:",
            error
        );
    }

    if (
        typeof window.showScreen ===
        "function"
    ) {

        window.showScreen(
            "splash"
        );
    }
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHostHtml(value) {

    return String(
        value == null
            ? ""
            : value
    )
    .replace(
        /&/g,
        "&amp;"
    )
    .replace(
        /</g,
        "&lt;"
    )
    .replace(
        />/g,
        "&gt;"
    )
    .replace(
        /"/g,
        "&quot;"
    )
    .replace(
        /'/g,
        "&#039;"
    );
}


/* =========================================================
   EVENT BINDING
========================================================= */

function setupHostEvents() {

    console.log(
        "HOST: Setting up events."
    );


    /* -----------------------------------------------------
       SPLASH HOST BUTTON
    ----------------------------------------------------- */

    const hostButton =
        document.getElementById(
            "hostButton"
        );

    if (hostButton) {

        console.log(
            "HOST: Found hostButton."
        );

        if (
            hostButton.dataset.hostBound !==
            "true"
        ) {

            hostButton.dataset.hostBound =
                "true";

            hostButton.addEventListener(
                "click",
                function(event) {

                    event.preventDefault();

                    console.log(
                        "HOST: Splash HOST button clicked."
                    );

                    initialiseHost();
                }
            );
        }
    } else {

        console.warn(
            "HOST: hostButton not found."
        );
    }


    /* -----------------------------------------------------
       CREATE GAME
    ----------------------------------------------------- */

    const createButton =
        document.getElementById(
            "generateGameButton"
        );

    if (createButton) {

        console.log(
            "HOST: Found generateGameButton."
        );

        if (
            createButton.dataset.hostBound !==
            "true"
        ) {

            createButton.dataset.hostBound =
                "true";

            createButton.addEventListener(
                "click",
                function(event) {

                    event.preventDefault();

                    console.log(
                        "HOST: CREATE GAME clicked."
                    );

                    hostCreateGame();
                }
            );
        }
    }


    /* -----------------------------------------------------
       START GAME
    ----------------------------------------------------- */

    const startButton =
        document.getElementById(
            "startGameButton"
        );

    if (startButton) {

        if (
            startButton.dataset.hostBound !==
            "true"
        ) {

            startButton.dataset.hostBound =
                "true";

            startButton.addEventListener(
                "click",
                function(event) {

                    event.preventDefault();

                    hostStartGame();
                }
            );
        }
    }


    /* -----------------------------------------------------
       START SCORING
    ----------------------------------------------------- */

    const scoreButton =
        document.getElementById(
            "scoreGameButton"
        );

    if (scoreButton) {

        if (
            scoreButton.dataset.hostBound !==
            "true"
        ) {

            scoreButton.dataset.hostBound =
                "true";

            scoreButton.addEventListener(
                "click",
                function(event) {

                    event.preventDefault();

                    hostStartScoring();
                }
            );
        }
    }


    /* -----------------------------------------------------
       START VOTING
    ----------------------------------------------------- */

    const votingButton =
        document.getElementById(
            "startVotingButton"
        );

    if (votingButton) {

        if (
            votingButton.dataset.hostBound !==
            "true"
        ) {

            votingButton.dataset.hostBound =
                "true";

            votingButton.addEventListener(
                "click",
                function(event) {

                    event.preventDefault();

                    hostStartVoting();
                }
            );
        }
    }


    /* -----------------------------------------------------
       SHOW WINNERS
    ----------------------------------------------------- */

    const winnersButton =
        document.getElementById(
            "showWinnersButton"
        );

    if (winnersButton) {

        if (
            winnersButton.dataset.hostBound !==
            "true"
        ) {

            winnersButton.dataset.hostBound =
                "true";

            winnersButton.addEventListener(
                "click",
                function(event) {

                    event.preventDefault();

                    hostShowWinners();
                }
            );
        }
    }


    /* -----------------------------------------------------
       REJOIN
    ----------------------------------------------------- */

    const rejoinButton =
        document.getElementById(
            "hostRejoinButton"
        ) ||
        document.getElementById(
            "rejoinHostButton"
        );

    if (rejoinButton) {

        if (
            rejoinButton.dataset.hostBound !==
            "true"
        ) {

            rejoinButton.dataset.hostBound =
                "true";

            rejoinButton.addEventListener(
                "click",
                function(event) {

                    event.preventDefault();

                    hostRejoinGame();
                }
            );
        }
    }


    console.log(
        "HOST: Event setup complete."
    );
}


/* =========================================================
   GLOBAL EXPORTS
========================================================= */

window.initialiseHost =
    initialiseHost;

window.showHostSetup =
    showHostSetup;

window.setHostCategoryCount =
    setHostCategoryCount;

window.hostCreateGame =
    hostCreateGame;

window.openHostLobby =
    openHostLobby;

window.refreshHostLobby =
    refreshHostLobby;

window.loadHostPlayers =
    loadHostPlayers;

window.renderHostPlayers =
    renderHostPlayers;

window.hostStartGame =
    hostStartGame;

window.openHostPlaying =
    openHostPlaying;

window.hostStartScoring =
    hostStartScoring;

window.hostStartVoting =
    hostStartVoting;

window.showHostVotingButton =
    showHostVotingButton;

window.hideHostVotingButton =
    hideHostVotingButton;

window.showHostWinnersControl =
    showHostWinnersControl;

window.hostShowWinners =
    hostShowWinners;

window.hostRejoinGame =
    hostRejoinGame;

window.hostFinishGame =
    hostFinishGame;

window.startHostLobbyPolling =
    startHostLobbyPolling;

window.stopHostLobbyPolling =
    stopHostLobbyPolling;

window.startHostStatusPolling =
    startHostStatusPolling;

window.stopHostStatusPolling =
    stopHostStatusPolling;


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        console.log(
            "HOST: DOM ready."
        );

        setupHostEvents();

    }
);