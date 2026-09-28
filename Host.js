/* =========================================================
   FIND IT!
   Host.js

   HOST SETUP / LOBBY ONLY

   Current flow:
   SPLASH -> HOST SETUP -> LOBBY -> PLAYING

   Once PLAYING starts, host-gameplay.js + player-gameplay.js
   own the game flow. There is no separate SCORING screen.
   START VOTING belongs to player-collection.js underneath
   the host's completed challenge cards.
========================================================= */

let hostGame = null;
let hostGameCode = "";
let hostPlayer = null;

let hostLobbyTimer = null;
let hostLobbyPolling = false;
let hostStatusTimer = null;
let hostStatusPolling = false;

let hostSelectedCategoryCount = 1;

const HOST_STATUS_ORDER = {
    WAITING: 0,
    PLAYING: 1,
    SCORING: 1,
    VOTING: 2,
    FINISHED: 3
};

function hostStatusCanMoveForward(oldStatus, newStatus) {
    oldStatus = String(oldStatus || "").trim().toUpperCase();
    newStatus = String(newStatus || "").trim().toUpperCase();

    if (!oldStatus || !newStatus) return true;

    const oldValue = HOST_STATUS_ORDER[oldStatus];
    const newValue = HOST_STATUS_ORDER[newStatus];

    if (oldValue === undefined || newValue === undefined) return true;

    if (newValue < oldValue) {
        console.warn("HOST: Ignoring stale status:", {
            current: oldStatus,
            received: newStatus
        });
        return false;
    }

    return true;
}

function normaliseHostGame(game) {
    if (!game) return null;

    return {
        ...game,
        gameCode: String(game.gameCode || game.GameCode || "").trim().toUpperCase(),
        hostPlayerId: String(game.hostPlayerId || game.HostPlayerID || "").trim(),
        hostName: String(game.hostName || game.HostName || "").trim(),
        categoryCount: Number(game.categoryCount || game.CategoryCount || 1),
        gameLength: game.gameLength || game.GameLength || "",
        status: String(game.status || game.Status || "WAITING").trim().toUpperCase(),
        currentCategory: Number(game.currentCategory || game.CurrentCategory || 0)
    };
}

function saveHostGame(game) {
    if (!game) return;
    try {
        localStorage.setItem("findItGame", JSON.stringify(game));
        localStorage.setItem("findItHostGame", JSON.stringify(game));
    } catch (error) {
        console.error("HOST: Could not save game:", error);
    }
}

function saveHostCode(code) {
    code = String(code || "").trim().toUpperCase();
    if (!code) return;

    hostGameCode = code;

    try {
        localStorage.setItem("findItGameCode", code);
        localStorage.setItem("gameCode", code);
        localStorage.setItem("GameCode", code);
    } catch (error) {
        console.error("HOST: Could not save game code:", error);
    }
}

function saveHostPlayer(player) {
    if (!player) return;

    hostPlayer = player;

    try {
        localStorage.setItem("findItCurrentPlayer", JSON.stringify(player));
        localStorage.setItem("findItPlayer", JSON.stringify(player));
    } catch (error) {
        console.error("HOST: Could not save host player:", error);
    }
}

function clearHostRuntime() {
    stopHostLobbyPolling();
    stopHostStatusPolling();

    hostGame = null;
    hostGameCode = "";
    hostPlayer = null;

    try {
        [
            "findItGame",
            "findItHostGame",
            "findItGameCode",
            "gameCode",
            "GameCode",
            "findItCurrentPlayer",
            "findItPlayer",
            "findItCurrentCategory"
        ].forEach(function(key) {
            localStorage.removeItem(key);
        });
    } catch (error) {
        console.error("HOST: Could not clear previous session state:", error);
    }
}

function initialiseHost() {
    console.log("HOST: HOST button pressed.");
    clearHostRuntime();
    showHostSetup();
}

function showHostSetup() {
    console.log("HOST: Opening host setup.");

    const nameInput = document.getElementById("hostNameInput");
    if (nameInput) nameInput.value = "";

    setHostCategoryCount(1);

    if (typeof window.showScreen === "function") {
        window.showScreen("hostSetupScreen");
    } else {
        console.error("HOST: showScreen() not found.");
    }
}

function setHostCategoryCount(count) {
    count = Number(count);
    if (!Number.isInteger(count) || count < 1 || count > 10) count = 1;

    hostSelectedCategoryCount = count;
    window.hostSelectedCategoryCount = count;

    document.querySelectorAll("[data-category-count]").forEach(function(button) {
        button.classList.toggle(
            "selected",
            Number(button.dataset.categoryCount) === count
        );
    });
}

function setupHostCategoryButtons() {
    document.querySelectorAll("[data-category-count]").forEach(function(button) {
        if (button.dataset.hostCategoryBound === "true") return;

        button.dataset.hostCategoryBound = "true";
        button.addEventListener("click", function(event) {
            event.preventDefault();
            setHostCategoryCount(Number(button.dataset.categoryCount));
        });
    });
}

async function hostCreateGame() {
    console.log("HOST: CREATE GAME pressed.");

    const input = document.getElementById("hostNameInput");
    const hostName = String(input ? input.value : "").trim();

    if (!hostName) {
        alert("Please enter your name.");
        if (input) input.focus();
        return;
    }

    let categoryCount = Number(
        hostSelectedCategoryCount || window.hostSelectedCategoryCount || 1
    );

    if (!Number.isInteger(categoryCount) || categoryCount < 1 || categoryCount > 10) {
        categoryCount = 1;
    }

    const button = document.getElementById("generateGameButton");
    if (button) {
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.textContent = "CREATING...";
    }

    try {
        console.log("HOST: Sending createGame:", { hostName, categoryCount });

        const result = await window.apiPost("createGame", {
            hostName: hostName,
            categoryCount: categoryCount
        });

        console.log("HOST: createGame response:", result);

        if (!result || result.success === false) {
            throw new Error(result && result.error ? result.error : "Could not create game.");
        }

        const game = normaliseHostGame(result.game || result);
        if (!game || !game.gameCode) {
            throw new Error("The server did not return a game code.");
        }

        const playerId = String(
            result.playerId || result.hostPlayerId || game.hostPlayerId || ""
        ).trim();

        if (!playerId) {
            throw new Error("The server did not return the host player ID.");
        }

        hostGame = game;
        hostGameCode = game.gameCode;
        hostPlayer = {
            playerId: playerId,
            playerName: game.hostName || hostName,
            gameCode: game.gameCode,
            isHost: true
        };

        saveHostCode(game.gameCode);
        saveHostGame(game);
        saveHostPlayer(hostPlayer);

        await openHostLobby();

    } catch (error) {
        console.error("HOST: CREATE GAME failed:", error);
        alert(error.message || "Could not create game.");
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = button.dataset.originalText || "CREATE GAME";
        }
    }
}

async function openHostLobby() {
    if (!hostGameCode) {
        console.error("HOST: No game code available.");
        return;
    }

    const codeElement = document.getElementById("hostGameCode");
    if (codeElement) codeElement.textContent = hostGameCode;

    if (typeof window.showScreen === "function") {
        window.showScreen("hostLobbyScreen");
    }

    await refreshHostLobby();
    startHostLobbyPolling();
}

async function refreshHostLobby() {
    if (!hostGameCode) return;

    try {
        const gameResult = await window.apiGet("getGame", {
            gameCode: hostGameCode
        });

        if (!gameResult || gameResult.success === false) {
            throw new Error(
                gameResult && gameResult.error ? gameResult.error : "Could not load game."
            );
        }

        const incoming = normaliseHostGame(gameResult.game || gameResult);
        if (!incoming) return;

        if (hostGame && !hostStatusCanMoveForward(hostGame.status, incoming.status)) {
            return;
        }

        hostGame = incoming;
        saveHostGame(hostGame);

        if (hostGame.status === "WAITING") {
            await loadHostPlayers();
            return;
        }

        stopHostLobbyPolling();

        if (hostGame.status === "PLAYING" || hostGame.status === "SCORING") {
            openHostPlaying();
            return;
        }

        if (hostGame.status === "VOTING") {
            openHostVoting();
            return;
        }

        if (hostGame.status === "FINISHED") {
            openHostFinished();
        }

    } catch (error) {
        console.error("HOST: Lobby refresh failed:", error);
    }
}

async function loadHostPlayers() {
    if (!hostGameCode) return;

    try {
        const result = await window.apiGet("getPlayers", {
            gameCode: hostGameCode
        });

        if (!result || result.success === false) {
            throw new Error(result && result.error ? result.error : "Could not load players.");
        }

        renderHostPlayers(Array.isArray(result.players) ? result.players : []);
    } catch (error) {
        console.error("HOST: Could not load players:", error);
    }
}

function renderHostPlayers(players) {
    const list = document.getElementById("hostPlayerList");
    const count = document.getElementById("hostPlayerCount");

    if (count) count.textContent = String(players.length);

    if (list) {
        list.innerHTML = "";
        players.forEach(function(player) {
            const name = String(player.playerName || player.PlayerName || player.name || "");
            const isHost = player.isHost === true ||
                String(player.isHost || player.IsHost || "").toUpperCase() === "TRUE";

            const item = document.createElement("div");
            item.className = "host-player-item";
            item.textContent = name + (isHost ? " (HOST)" : "");
            list.appendChild(item);
        });
    }

    const startButton = document.getElementById("startGameButton");
    if (startButton) {
        startButton.disabled = players.length < 1;
        startButton.classList.toggle("disabled", players.length < 1);
    }
}

async function hostStartGame() {
    console.log("HOST: START GAME pressed.");

    if (!hostGameCode) {
        alert("No game code is available.");
        return;
    }

    const button = document.getElementById("startGameButton");
    if (button) {
        button.disabled = true;
        button.textContent = "STARTING...";
    }

    try {
        const result = await window.apiPost("startGame", {
            gameCode: hostGameCode
        });

        if (!result || result.success === false) {
            throw new Error(result && result.error ? result.error : "Could not start game.");
        }

        const game = normaliseHostGame(result.game || result);
        if (hostGame && game && !hostStatusCanMoveForward(hostGame.status, game.status)) {
            return;
        }

        hostGame = game;
        saveHostGame(hostGame);
        stopHostLobbyPolling();
        openHostPlaying();

    } catch (error) {
        console.error("HOST: START GAME failed:", error);
        alert(error.message || "Could not start game.");

        if (button) {
            button.disabled = false;
            button.textContent = "START GAME";
        }
    }
}

function openHostPlaying() {
    console.log("HOST: Handing PLAYING to player gameplay.");

    if (typeof window.openPlayerGame === "function") {
        window.openPlayerGame(hostGame, hostPlayer);
        return;
    }

    if (typeof window.showScreen === "function") {
        window.showScreen("collectionScreen");
    }
}

/* Kept as no-op compatibility functions because older modules may call them.
   Host.js no longer owns gameplay status polling. */
function startHostStatusPolling() {
    hostStatusPolling = false;
}

function stopHostStatusPolling() {
    hostStatusPolling = false;
    if (hostStatusTimer) {
        clearInterval(hostStatusTimer);
        hostStatusTimer = null;
    }
}

function startHostLobbyPolling() {
    stopHostLobbyPolling();
    if (!hostGameCode) return;

    hostLobbyPolling = true;
    hostLobbyTimer = setInterval(function() {
        if (hostLobbyPolling) refreshHostLobby();
    }, 2500);
}

function stopHostLobbyPolling() {
    hostLobbyPolling = false;
    if (hostLobbyTimer) {
        clearInterval(hostLobbyTimer);
        hostLobbyTimer = null;
    }
}

function prepareHostVotingSession() {
    if (!hostGame || !hostPlayer) return;

    hostPlayer = {
        ...hostPlayer,
        playerId: String(hostPlayer.playerId || hostGame.hostPlayerId || "").trim(),
        gameCode: hostGame.gameCode,
        isHost: true
    };

    saveHostGame(hostGame);
    saveHostCode(hostGame.gameCode);
    saveHostPlayer(hostPlayer);
}

function openHostVoting() {
    console.log("HOST: Server is VOTING - handing off to voting.js.");
    prepareHostVotingSession();

    if (typeof window.openVoting === "function") {
        window.openVoting();
    } else if (typeof window.openVotingScreen === "function") {
        window.openVotingScreen();
    } else {
        console.error("HOST: Voting entry function is unavailable.");
    }
}

function openHostFinished() {
    console.log("HOST: Server is FINISHED.");

    if (typeof window.loadFinalVotingResults === "function") {
        window.loadFinalVotingResults(hostGameCode);
        return;
    }

    if (typeof window.loadVotingResults === "function") {
        window.loadVotingResults(hostGameCode);
    }
}

async function hostRejoinGame() {
    const input = document.getElementById("hostRejoinCodeInput") ||
        document.getElementById("rejoinGameCodeInput") ||
        document.getElementById("gameCodeInput");

    const code = String(input ? input.value : "").trim().toUpperCase();

    if (!/^[A-Z0-9]{6}$/.test(code)) {
        alert("Please enter the 6-character game code.");
        return;
    }

    try {
        const result = await window.apiPost("restoreHost", { gameCode: code });

        if (!result || result.success === false) {
            throw new Error(result && result.error ? result.error : "Could not rejoin game.");
        }

        const game = normaliseHostGame(result.game || result);
        if (!game) throw new Error("No game was returned.");

        hostGame = game;
        hostGameCode = code;
        hostPlayer = {
            playerId: String(result.playerId || result.hostPlayerId || game.hostPlayerId || "").trim(),
            playerName: game.hostName,
            gameCode: code,
            isHost: true
        };

        saveHostCode(code);
        saveHostGame(game);
        saveHostPlayer(hostPlayer);

        if (game.status === "WAITING") {
            await openHostLobby();
        } else if (game.status === "PLAYING" || game.status === "SCORING") {
            openHostPlaying();
        } else if (game.status === "VOTING") {
            openHostVoting();
        } else if (game.status === "FINISHED") {
            openHostFinished();
        }

    } catch (error) {
        console.error("HOST: REJOIN failed:", error);
        alert(error.message || "Could not rejoin game.");
    }
}

function hostFinishGame() {
    stopHostLobbyPolling();
    stopHostStatusPolling();

    hostGame = null;
    hostGameCode = "";
    hostPlayer = null;

    try {
        ["findItGame", "findItHostGame", "findItGameCode", "gameCode", "GameCode"].forEach(
            function(key) { localStorage.removeItem(key); }
        );
    } catch (error) {
        console.error("HOST: Storage cleanup failed:", error);
    }

    if (typeof window.showScreen === "function") {
        window.showScreen("splash");
    }
}

function setupHostEvents() {
    setupHostCategoryButtons();

    const hostButton = document.getElementById("hostButton");
    if (hostButton && hostButton.dataset.hostBound !== "true") {
        hostButton.dataset.hostBound = "true";
        hostButton.addEventListener("click", function(event) {
            event.preventDefault();
            initialiseHost();
        });
    }

    const createButton = document.getElementById("generateGameButton");
    if (createButton && createButton.dataset.hostBound !== "true") {
        createButton.dataset.hostBound = "true";
        createButton.addEventListener("click", function(event) {
            event.preventDefault();
            hostCreateGame();
        });
    }

    const startButton = document.getElementById("startGameButton");
    if (startButton && startButton.dataset.hostBound !== "true") {
        startButton.dataset.hostBound = "true";
        startButton.addEventListener("click", function(event) {
            event.preventDefault();
            hostStartGame();
        });
    }

    const rejoinButton = document.getElementById("hostRejoinButton") ||
        document.getElementById("rejoinHostButton");

    if (rejoinButton && rejoinButton.dataset.hostBound !== "true") {
        rejoinButton.dataset.hostBound = "true";
        rejoinButton.addEventListener("click", function(event) {
            event.preventDefault();
            hostRejoinGame();
        });
    }
}

window.initialiseHost = initialiseHost;
window.showHostSetup = showHostSetup;
window.setHostCategoryCount = setHostCategoryCount;
window.hostCreateGame = hostCreateGame;
window.openHostLobby = openHostLobby;
window.refreshHostLobby = refreshHostLobby;
window.loadHostPlayers = loadHostPlayers;
window.renderHostPlayers = renderHostPlayers;
window.hostStartGame = hostStartGame;
window.openHostPlaying = openHostPlaying;
window.hostRejoinGame = hostRejoinGame;
window.hostFinishGame = hostFinishGame;
window.startHostLobbyPolling = startHostLobbyPolling;
window.stopHostLobbyPolling = stopHostLobbyPolling;
window.startHostStatusPolling = startHostStatusPolling;
window.stopHostStatusPolling = stopHostStatusPolling;
window.openHostVoting = openHostVoting;

document.addEventListener("DOMContentLoaded", function() {
    console.log("HOST: DOM ready - clean host flow loaded.");
    setupHostEvents();
});
