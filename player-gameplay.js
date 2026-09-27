/* =========================================================
   FIND IT!
   player-gameplay.js

   PLAYER GAMEPLAY ENTRY + STATUS FLOW

   Load order:
     player.js
     player-gameplay.js
     host-gameplay.js

   This module deliberately owns the public openPlayerGame()
   entry used by host-gameplay.js. It uses the gameplay helpers
   already defined by player.js, while correcting the status
   branch scoping for PLAYING / SCORING / VOTING / FINISHED.
========================================================= */

console.log("=================================");
console.log("Find It! player-gameplay.js loaded");
console.log("=================================");

let playerGameplayStatusTimer = null;
let playerGameplayStatusPolling = false;
let playerGameplayOpen = false;


/* =========================================================
   PHOTO FLOW GUARD
========================================================= */

function playerGameplayPhotoFlowActive() {
    try {
        if (typeof isPlayerPhotoFlowActive === "function") {
            return isPlayerPhotoFlowActive();
        }
    } catch (error) {
        console.warn(
            "PLAYER GAMEPLAY: Could not inspect photo flow:",
            error
        );
    }

    const photoScreen =
        document.getElementById("photoUploadScreen");

    return !!(
        photoScreen &&
        (
            photoScreen.classList.contains("active") ||
            photoScreen.style.display === "block"
        )
    );
}


/* =========================================================
   STOP STATUS POLLING
========================================================= */

function stopPlayerGameplayStatusPolling() {
    if (playerGameplayStatusTimer) {
        clearInterval(playerGameplayStatusTimer);
        playerGameplayStatusTimer = null;
    }

    /* Stop the legacy player.js timer too, if one exists. */
    try {
        if (typeof stopPlayerGameStatusPolling === "function") {
            stopPlayerGameStatusPolling();
        }
    } catch (error) {
        console.warn(
            "PLAYER GAMEPLAY: Could not stop legacy player polling:",
            error
        );
    }
}


/* =========================================================
   STATUS POLL
========================================================= */

async function playerGameplayStatusPoll() {
    if (playerGameplayStatusPolling) {
        return;
    }

    if (
        typeof currentPlayerGame === "undefined" ||
        !currentPlayerGame ||
        !currentPlayerGame.gameCode
    ) {
        return;
    }

    playerGameplayStatusPolling = true;

    try {
        const result = await apiGet(
            "getGame",
            {
                gameCode: currentPlayerGame.gameCode
            }
        );

        if (!result) {
            return;
        }

        const game =
            typeof normalisePlayerGame === "function"
                ? normalisePlayerGame(result)
                : result;

        if (!game || !game.gameCode) {
            return;
        }

        if (
            typeof shouldAcceptPlayerGameStatus === "function" &&
            currentPlayerGame &&
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

        /* =================================================
           PLAYING
        ================================================= */

        if (currentPlayerGame.status === "PLAYING") {
            if (playerGameplayPhotoFlowActive()) {
                playerGameplayOpen = true;

                if (typeof refreshPlayerCategories === "function") {
                    await refreshPlayerCategories();
                }

                if (typeof checkAndUpdateHostControls === "function") {
                    await checkAndUpdateHostControls();
                }

                return;
            }

            if (!playerGameplayOpen) {
                playerGameplayOpen = true;

                if (typeof openPlayerCollectionScreen !== "function") {
                    throw new Error(
                        "openPlayerCollectionScreen() is unavailable."
                    );
                }

                await openPlayerCollectionScreen(
                    currentPlayerGame,
                    currentPlayer
                );
            } else {
                if (typeof refreshPlayerCategories === "function") {
                    await refreshPlayerCategories();
                }

                if (typeof checkAndUpdateHostControls === "function") {
                    await checkAndUpdateHostControls();
                }
            }

            return;
        }

        /* =================================================
           SCORING
        ================================================= */

        if (currentPlayerGame.status === "SCORING") {
            playerGameplayOpen = false;

            if (
                typeof isCurrentPlayerHost === "function" &&
                isCurrentPlayerHost(
                    currentPlayerGame,
                    currentPlayer
                )
            ) {
                if (typeof showHostStartVotingControl === "function") {
                    await showHostStartVotingControl();
                    return;
                }
            }

            if (typeof openPlayerScoringScreen === "function") {
                await openPlayerScoringScreen(
                    currentPlayerGame,
                    currentPlayer
                );
            } else if (typeof showScreen === "function") {
                showScreen("scoringScreen");
            }

            return;
        }

        /* =================================================
           VOTING
        ================================================= */

        if (currentPlayerGame.status === "VOTING") {
            playerGameplayOpen = false;

            if (typeof openVoting === "function") {
                await openVoting();
            } else if (typeof openVotingScreen === "function") {
                await openVotingScreen();
            } else if (typeof showScreen === "function") {
                showScreen("votingScreen");
            }

            return;
        }

        /* =================================================
           FINISHED
        ================================================= */

        if (currentPlayerGame.status === "FINISHED") {
            playerGameplayOpen = false;
            stopPlayerGameplayStatusPolling();

            if (typeof openWinnerScreen === "function") {
                await openWinnerScreen();
            } else if (typeof openResults === "function") {
                await openResults();
            } else if (typeof showScreen === "function") {
                showScreen("winnerScreen");
            }

            return;
        }

    } catch (error) {
        console.error(
            "PLAYER GAMEPLAY: Status poll failed:",
            error
        );
    } finally {
        playerGameplayStatusPolling = false;
    }
}


/* =========================================================
   START STATUS POLLING
========================================================= */

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
            gameCode:
                game && (game.gameCode || game.GameCode),
            playerId:
                player && (player.playerId || player.PlayerID)
        }
    );

    if (!game || !player) {
        console.error(
            "PLAYER GAMEPLAY: Cannot open game - missing game/player.",
            { game: game, player: player }
        );
        return;
    }

    if (typeof normalisePlayerGame === "function") {
        currentPlayerGame = normalisePlayerGame(game);
    } else {
        currentPlayerGame = game;
    }

    if (typeof normalisePlayer === "function") {
        currentPlayer = normalisePlayer(player);
    } else {
        currentPlayer = player;
    }

    if (
        !currentPlayerGame ||
        !currentPlayerGame.gameCode ||
        !currentPlayer ||
        !currentPlayer.playerId
    ) {
        console.error(
            "PLAYER GAMEPLAY: Cannot open game - invalid normalised state.",
            {
                game: currentPlayerGame,
                player: currentPlayer
            }
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

    /*
       Open the collection screen through the existing player.js
       loader. This is the path that requests getPlayers,
       getGameCategories and player progress, then renders cards.
    */
    if (currentPlayerGame.status === "PLAYING") {
        if (typeof openPlayerCollectionScreen !== "function") {
            throw new Error(
                "openPlayerCollectionScreen() is unavailable."
            );
        }

        playerGameplayOpen = true;

        await openPlayerCollectionScreen(
            currentPlayerGame,
            currentPlayer
        );
    }

    startPlayerGameplayStatusPolling();

    console.log(
        "PLAYER GAMEPLAY: Gameplay initialised."
    );
}


/* =========================================================
   GLOBAL EXPORT

   host-gameplay.js intentionally calls this public entry.
========================================================= */

window.openPlayerGame = openPlayerGameplay;
window.playerGameplayStatusPoll = playerGameplayStatusPoll;
window.startPlayerGameplayStatusPolling =
    startPlayerGameplayStatusPolling;
window.stopPlayerGameplayStatusPolling =
    stopPlayerGameplayStatusPolling;

console.log(
    "PLAYER GAMEPLAY: window.openPlayerGame exported:",
    typeof window.openPlayerGame
);
