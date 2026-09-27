/* =========================================================
   FIND IT!
   player-gameplay.js

   PLAYER GAMEPLAY + COLLECTION / CHALLENGE FLOW

   Load order:
     player.js
     player-gameplay.js
     host-gameplay.js

   Owns:
   - public window.openPlayerGame
   - PLAYING / SCORING / VOTING / FINISHED polling
   - collection screen
   - game players for gameplay
   - game categories
   - player progress
   - challenge card rendering
   - challenge -> photo hand-off
========================================================= */

console.log("=================================");
console.log("Find It! player-gameplay.js loaded");
console.log("=================================");

let playerGameplayStatusTimer = null;
let playerGameplayStatusPolling = false;
let playerGameplayOpen = false;

/* Gameplay-owned category state. */
let gameplayCategories = [];
let gameplayCurrentCategory = null;
let gameplayCompletedCategoryIds = new Set();
let gameplayCompletedCategoryNumbers = new Set();


/* =========================================================
   NORMALISE CATEGORY
========================================================= */

function normaliseGameplayCategory(category) {
    category = category || {};

    return {
        categoryId:
            category.categoryId ??
            category.CategoryID ??
            category.id ??
            category.ID ??
            "",

        categoryNumber:
            Number(
                category.categoryNumber ??
                category.CategoryNumber ??
                category.number ??
                category.Number ??
                0
            ),

        categoryName:
            category.categoryName ||
            category.CategoryName ||
            category.name ||
            category.Name ||
            "",

        description:
            category.description ||
            category.Description ||
            "",

        gameCode:
            String(
                category.gameCode ||
                category.GameCode ||
                ""
            ).trim().toUpperCase()
    };
}


/* =========================================================
   LOAD GAME PLAYERS
========================================================= */

async function gameplayLoadPlayers(game, player) {
    if (!game || !game.gameCode) return [];

    let serverPlayers = [];

    try {
        const result = await apiGet(
            "getPlayers",
            { gameCode: game.gameCode }
        );

        if (Array.isArray(result)) {
            serverPlayers = result;
        } else if (result && Array.isArray(result.players)) {
            serverPlayers = result.players;
        }
    } catch (error) {
        console.error("PLAYER GAMEPLAY: Could not get players:", error);
    }

    const merged = [];
    const seen = new Set();

    function addPlayer(item) {
        if (!item) return;

        const p = typeof normalisePlayer === "function"
            ? normalisePlayer(item)
            : {
                ...item,
                playerId: String(item.playerId || item.PlayerID || "").trim(),
                playerName: String(item.playerName || item.PlayerName || "").trim(),
                gameCode: String(item.gameCode || item.GameCode || game.gameCode || "").trim().toUpperCase()
            };

        if (!p.playerId || seen.has(p.playerId)) return;
        seen.add(p.playerId);
        merged.push(p);
    }

    serverPlayers.forEach(addPlayer);

    if (game.hostPlayerId && !seen.has(game.hostPlayerId)) {
        addPlayer({
            playerId: game.hostPlayerId,
            gameCode: game.gameCode,
            playerName: game.hostName || "Host",
            isHost: true
        });
    }

    if (player && player.playerId && !seen.has(player.playerId)) {
        addPlayer(player);
    }

    merged.forEach(function(item) {
        if (
            game.hostPlayerId &&
            String(item.playerId).trim() === String(game.hostPlayerId).trim()
        ) {
            item.isHost = true;
        }
    });

    game.players = merged;
    currentPlayerGame = game;

    if (
        currentPlayer &&
        currentPlayer.playerId &&
        game.hostPlayerId &&
        currentPlayer.playerId === game.hostPlayerId
    ) {
        currentPlayer.isHost = true;
    }

    return merged;
}


/* =========================================================
   LOAD CATEGORIES
========================================================= */

async function gameplayLoadCategories(game) {
    if (!game || !game.gameCode) {
        gameplayCategories = [];
        return [];
    }

    try {
        console.log(
            "PLAYER GAMEPLAY: Requesting getGameCategories:",
            game.gameCode
        );

        const result = await apiGet(
            "getGameCategories",
            { gameCode: game.gameCode }
        );

        console.log(
            "PLAYER GAMEPLAY: Raw getGameCategories response:",
            result
        );

        let categories = [];

        if (result && Array.isArray(result.categories)) {
            categories = result.categories;
        } else if (Array.isArray(result)) {
            categories = result;
        }

        gameplayCategories = categories
            .map(normaliseGameplayCategory)
            .filter(function(category) {
                return (
                    category.categoryId !== "" ||
                    category.categoryNumber
                );
            })
            .sort(function(a, b) {
                return a.categoryNumber - b.categoryNumber;
            });

        console.log(
            "PLAYER GAMEPLAY: Categories loaded:",
            gameplayCategories
        );

        return gameplayCategories;

    } catch (error) {
        console.error(
            "PLAYER GAMEPLAY: Could not load categories:",
            error
        );
        gameplayCategories = [];
        return [];
    }
}


/* =========================================================
   LOAD PLAYER PROGRESS
========================================================= */

async function gameplayLoadProgress(game, player) {
    gameplayCompletedCategoryIds = new Set();
    gameplayCompletedCategoryNumbers = new Set();

    if (!game || !game.gameCode || !player || !player.playerId) {
        return;
    }

    async function addCompleted(action, collectionName) {
        try {
            const result = await apiGet(
                action,
                { gameCode: game.gameCode }
            );

            let rows = [];
            if (result && Array.isArray(result[collectionName])) {
                rows = result[collectionName];
            } else if (Array.isArray(result)) {
                rows = result;
            }

            rows.forEach(function(row) {
                const rowPlayerId = String(
                    row.playerId || row.PlayerID || ""
                ).trim();

                if (rowPlayerId !== player.playerId) return;

                const categoryId =
                    row.categoryId ?? row.CategoryID ?? "";
                const categoryNumber = Number(
                    row.categoryNumber ?? row.CategoryNumber ?? 0
                );

                if (categoryId !== "") {
                    gameplayCompletedCategoryIds.add(String(categoryId));
                }

                if (categoryNumber) {
                    gameplayCompletedCategoryNumbers.add(categoryNumber);
                }
            });
        } catch (error) {
            console.error(
                "PLAYER GAMEPLAY: Could not load " + action + ":",
                error
            );
        }
    }

    await addCompleted("getEntries", "entries");
    await addCompleted("getPasses", "passes");
}


/* =========================================================
   CATEGORY COMPLETE
========================================================= */

function gameplayCategoryComplete(category) {
    if (!category) return false;

    const id = String(category.categoryId || "").trim();
    const number = Number(category.categoryNumber || 0);

    return !!(
        (id && gameplayCompletedCategoryIds.has(id)) ||
        (number && gameplayCompletedCategoryNumbers.has(number))
    );
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function gameplayEscapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   CURRENT CHALLENGE
========================================================= */

function gameplaySetCurrentCategory(category) {
    gameplayCurrentCategory = normaliseGameplayCategory(category);

    if (!gameplayCurrentCategory.gameCode && currentPlayerGame) {
        gameplayCurrentCategory.gameCode = currentPlayerGame.gameCode;
    }

    /* Keep legacy player state in sync when accessible. */
    try {
        playerCurrentCategory = gameplayCurrentCategory;
    } catch (error) {}

    try {
        localStorage.setItem(
            "findItCurrentCategory",
            JSON.stringify(gameplayCurrentCategory)
        );
    } catch (error) {
        console.error(
            "PLAYER GAMEPLAY: Could not save current category:",
            error
        );
    }
}


/* =========================================================
   OPEN CHALLENGE / PHOTO HAND-OFF
========================================================= */

function gameplayOpenCategory(category) {
    category = normaliseGameplayCategory(category);

    if (gameplayCategoryComplete(category)) return;

    console.log("PLAYER GAMEPLAY: Opening challenge:", category);
    gameplaySetCurrentCategory(category);

    if (typeof window.openPhotoUpload === "function") {
        window.openPhotoUpload(category);
        return;
    }

    console.error("PLAYER GAMEPLAY: openPhotoUpload() is unavailable.");

    if (typeof window.showScreen === "function") {
        window.showScreen("photoUploadScreen");
    }
}


/* =========================================================
   RENDER CATEGORY CARDS
========================================================= */

function gameplayRenderCategoryCards(categories) {
    const container = document.getElementById("categoryCards");

    if (!container) {
        console.error("PLAYER GAMEPLAY: #categoryCards not found.");
        return;
    }

    categories = Array.isArray(categories)
        ? categories
        : gameplayCategories;

    container.innerHTML = "";

    if (!categories.length) {
        container.innerHTML =
            '<div class="category-empty">No challenges were returned for this game.</div>';
        return;
    }

    let completedCount = 0;

    categories.forEach(function(category, index) {
        const complete = gameplayCategoryComplete(category);
        if (complete) completedCount++;

        const card = document.createElement("button");
        card.type = "button";
        card.className = "category-card";

        if (complete) {
            card.classList.add("completed");
            card.disabled = true;
        }

        const number = category.categoryNumber || index + 1;
        const name = category.categoryName || "Find It!";

        card.innerHTML = `
            <div class="category-number">${number}</div>
            <div class="category-name">${gameplayEscapeHtml(name)}</div>
            <div class="category-action">${complete ? "✓ Complete" : "FIND IT →"}</div>
        `;

        if (!complete) {
            card.addEventListener("click", function(event) {
                event.preventDefault();
                gameplayOpenCategory(category);
            });
        }

        container.appendChild(card);
    });

    const total = categories.length;
    const progressText = document.getElementById("collectionProgressText");
    if (progressText) {
        progressText.textContent = completedCount + " / " + total;
    }

    const progressBar = document.getElementById("collectionProgressBar");
    if (progressBar) {
        const percent = total > 0
            ? Math.round((completedCount / total) * 100)
            : 0;
        progressBar.style.width = percent + "%";
    }
}


/* =========================================================
   REFRESH COLLECTION
========================================================= */

async function gameplayRefreshCategories() {
    if (!currentPlayerGame || !currentPlayer) return;

    await gameplayLoadCategories(currentPlayerGame);
    await gameplayLoadProgress(currentPlayerGame, currentPlayer);
    gameplayRenderCategoryCards(gameplayCategories);
}


/* =========================================================
   OPEN COLLECTION SCREEN
========================================================= */

async function openGameplayCollectionScreen(game, player) {
    currentPlayerGame = typeof normalisePlayerGame === "function"
        ? normalisePlayerGame(game)
        : game;

    currentPlayer = typeof normalisePlayer === "function"
        ? normalisePlayer(player)
        : player;

    if (
        currentPlayerGame.hostPlayerId &&
        currentPlayer.playerId === currentPlayerGame.hostPlayerId
    ) {
        currentPlayer.isHost = true;
    }

    console.log(
        "PLAYER GAMEPLAY: Opening collection screen:",
        {
            gameCode: currentPlayerGame.gameCode,
            playerId: currentPlayer.playerId
        }
    );

    await gameplayLoadPlayers(currentPlayerGame, currentPlayer);

    if (typeof savePlayerSession === "function") {
        savePlayerSession();
    }

    const nameElement = document.getElementById("collectionPlayerName");
    if (nameElement) {
        nameElement.textContent = currentPlayer.playerName || "";
    }

    await gameplayLoadCategories(currentPlayerGame);
    await gameplayLoadProgress(currentPlayerGame, currentPlayer);
    gameplayRenderCategoryCards(gameplayCategories);

    if (typeof window.showScreen === "function") {
        window.showScreen("collectionScreen");
    } else if (typeof showScreen === "function") {
        showScreen("collectionScreen");
    } else {
        throw new Error("showScreen() is unavailable.");
    }

    if (typeof setupHostCollectionControls === "function") {
        setupHostCollectionControls();
    }

    if (typeof checkAndUpdateHostControls === "function") {
        await checkAndUpdateHostControls();
    }

    console.log(
        "PLAYER GAMEPLAY: Collection rendered with",
        gameplayCategories.length,
        "challenge(s)."
    );
}


/* =========================================================
   PHOTO FLOW GUARD
========================================================= */

function playerGameplayPhotoFlowActive() {
    try {
        if (typeof isPlayerPhotoFlowActive === "function") {
            return isPlayerPhotoFlowActive();
        }
    } catch (error) {}

    const photoScreen = document.getElementById("photoUploadScreen");
    return !!(
        photoScreen &&
        (
            photoScreen.classList.contains("active") ||
            photoScreen.style.display === "block"
        )
    );
}


/* =========================================================
   STATUS POLLING
========================================================= */

function stopPlayerGameplayStatusPolling() {
    if (playerGameplayStatusTimer) {
        clearInterval(playerGameplayStatusTimer);
        playerGameplayStatusTimer = null;
    }

    try {
        if (typeof stopPlayerGameStatusPolling === "function") {
            stopPlayerGameStatusPolling();
        }
    } catch (error) {}
}

async function playerGameplayStatusPoll() {
    if (playerGameplayStatusPolling) return;
    if (!currentPlayerGame || !currentPlayerGame.gameCode) return;

    playerGameplayStatusPolling = true;

    try {
        const result = await apiGet(
            "getGame",
            { gameCode: currentPlayerGame.gameCode }
        );

        if (!result) return;

        const game = typeof normalisePlayerGame === "function"
            ? normalisePlayerGame(result)
            : result;

        if (!game || !game.gameCode) return;

        if (
            typeof shouldAcceptPlayerGameStatus === "function" &&
            !shouldAcceptPlayerGameStatus(
                currentPlayerGame.status,
                game.status
            )
        ) {
            return;
        }

        currentPlayerGame = {
            ...currentPlayerGame,
            ...game
        };

        if (typeof savePlayerSession === "function") {
            savePlayerSession();
        }

        console.log(
            "PLAYER GAMEPLAY: Game status:",
            currentPlayerGame.status
        );

        if (currentPlayerGame.status === "PLAYING") {
            if (playerGameplayPhotoFlowActive()) {
                playerGameplayOpen = true;
                await gameplayRefreshCategories();
                return;
            }

            if (!playerGameplayOpen) {
                playerGameplayOpen = true;
                await openGameplayCollectionScreen(
                    currentPlayerGame,
                    currentPlayer
                );
            } else {
                await gameplayRefreshCategories();
            }
            return;
        }

        if (currentPlayerGame.status === "SCORING") {
            playerGameplayOpen = false;

            if (typeof openPlayerScoringScreen === "function") {
                await openPlayerScoringScreen(
                    currentPlayerGame,
                    currentPlayer
                );
            } else if (typeof window.showScreen === "function") {
                window.showScreen("scoringScreen");
            }
            return;
        }

        if (currentPlayerGame.status === "VOTING") {
            playerGameplayOpen = false;

            if (typeof openVoting === "function") {
                await openVoting();
            } else if (typeof openVotingScreen === "function") {
                await openVotingScreen();
            } else if (typeof window.showScreen === "function") {
                window.showScreen("votingScreen");
            }
            return;
        }

        if (currentPlayerGame.status === "FINISHED") {
            playerGameplayOpen = false;
            stopPlayerGameplayStatusPolling();

            if (typeof openWinnerScreen === "function") {
                await openWinnerScreen();
            } else if (typeof openResults === "function") {
                await openResults();
            } else if (typeof window.showScreen === "function") {
                window.showScreen("winnerScreen");
            }
        }

    } catch (error) {
        console.error("PLAYER GAMEPLAY: Status poll failed:", error);
    } finally {
        playerGameplayStatusPolling = false;
    }
}

function startPlayerGameplayStatusPolling() {
    stopPlayerGameplayStatusPolling();
    playerGameplayStatusTimer = setInterval(
        playerGameplayStatusPoll,
        2000
    );
}


/* =========================================================
   PUBLIC GAMEPLAY ENTRY
========================================================= */

async function openPlayerGameplay(game, player) {
    console.log(
        "PLAYER GAMEPLAY: openPlayerGame entry:",
        {
            gameCode: game && (game.gameCode || game.GameCode),
            playerId: player && (player.playerId || player.PlayerID)
        }
    );

    if (!game || !player) {
        console.error(
            "PLAYER GAMEPLAY: Cannot open game - missing game/player."
        );
        return;
    }

    currentPlayerGame = typeof normalisePlayerGame === "function"
        ? normalisePlayerGame(game)
        : game;

    currentPlayer = typeof normalisePlayer === "function"
        ? normalisePlayer(player)
        : player;

    if (
        !currentPlayerGame ||
        !currentPlayerGame.gameCode ||
        !currentPlayer ||
        !currentPlayer.playerId
    ) {
        console.error(
            "PLAYER GAMEPLAY: Invalid normalised game/player state."
        );
        return;
    }

    if (
        currentPlayerGame.hostPlayerId &&
        currentPlayer.playerId === currentPlayerGame.hostPlayerId
    ) {
        currentPlayer.isHost = true;
    }

    if (typeof savePlayerSession === "function") {
        savePlayerSession();
    }

    if (currentPlayerGame.status === "PLAYING") {
        playerGameplayOpen = true;
        await openGameplayCollectionScreen(
            currentPlayerGame,
            currentPlayer
        );
    }

    startPlayerGameplayStatusPolling();

    console.log("PLAYER GAMEPLAY: Gameplay initialised.");
}


/* =========================================================
   GLOBAL EXPORTS
========================================================= */

window.openPlayerGame = openPlayerGameplay;
window.openPlayerCollectionScreen = openGameplayCollectionScreen;
window.loadPlayerCategories = gameplayLoadCategories;
window.loadPlayerProgress = gameplayLoadProgress;
window.renderPlayerCategoryCards = gameplayRenderCategoryCards;
window.refreshPlayerCategories = gameplayRefreshCategories;
window.playerGameplayStatusPoll = playerGameplayStatusPoll;
window.startPlayerGameplayStatusPolling = startPlayerGameplayStatusPolling;
window.stopPlayerGameplayStatusPolling = stopPlayerGameplayStatusPolling;

console.log(
    "PLAYER GAMEPLAY: exports ready:",
    {
        openPlayerGame: typeof window.openPlayerGame,
        openPlayerCollectionScreen:
            typeof window.openPlayerCollectionScreen,
        loadPlayerCategories:
            typeof window.loadPlayerCategories,
        renderPlayerCategoryCards:
            typeof window.renderPlayerCategoryCards
    }
);
