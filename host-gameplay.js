/* =========================================================
   FIND IT!
   host-gameplay.js

   HOST -> PLAYER GAMEPLAY BRIDGE

   Load this file AFTER player.js.

   Purpose:
   - Host is a real player.
   - Never open collectionScreen directly.
   - Recover the host player if Host.js runtime state is missing.
   - Always enter gameplay through player.js so categories,
     progress, photo state and challenge cards are initialised.
========================================================= */

console.log("=================================");
console.log("Find It! host-gameplay.js loaded");
console.log("=================================");


/* =========================================================
   RECOVER HOST PLAYER
========================================================= */

function recoverHostGameplayPlayer() {

    /* First use Host.js runtime state when available. */
    if (
        typeof hostPlayer !== "undefined" &&
        hostPlayer &&
        hostPlayer.playerId
    ) {
        return hostPlayer;
    }

    /* Then use player.js runtime state when available. */
    if (
        typeof currentPlayer !== "undefined" &&
        currentPlayer &&
        currentPlayer.playerId
    ) {
        return currentPlayer;
    }

    /* Finally recover the saved host/player session. */
    const keys = [
        "findItCurrentPlayer",
        "findItPlayer"
    ];

    for (const key of keys) {

        try {

            const raw =
                localStorage.getItem(key);

            if (!raw) {
                continue;
            }

            const saved =
                JSON.parse(raw);

            if (
                saved &&
                (
                    saved.playerId ||
                    saved.PlayerID
                )
            ) {
                return saved;
            }

        } catch (error) {

            console.warn(
                "HOST GAMEPLAY: Could not recover player from",
                key,
                error
            );
        }
    }

    return null;
}


/* =========================================================
   RECOVER HOST GAME
========================================================= */

function recoverHostGameplayGame() {

    if (
        typeof hostGame !== "undefined" &&
        hostGame &&
        hostGame.gameCode
    ) {
        return hostGame;
    }

    if (
        typeof currentPlayerGame !== "undefined" &&
        currentPlayerGame &&
        currentPlayerGame.gameCode
    ) {
        return currentPlayerGame;
    }

    const keys = [
        "findItHostGame",
        "findItGame"
    ];

    for (const key of keys) {

        try {

            const raw =
                localStorage.getItem(key);

            if (!raw) {
                continue;
            }

            const saved =
                JSON.parse(raw);

            if (
                saved &&
                (
                    saved.gameCode ||
                    saved.GameCode
                )
            ) {
                return saved;
            }

        } catch (error) {

            console.warn(
                "HOST GAMEPLAY: Could not recover game from",
                key,
                error
            );
        }
    }

    return null;
}


/* =========================================================
   CORRECTED HOST PLAYING ENTRY

   This intentionally replaces Host.js openHostPlaying().
   Because this file loads after player.js, openPlayerGame()
   is guaranteed to have had the opportunity to initialise.
========================================================= */

async function openHostPlaying() {

    console.log(
        "HOST GAMEPLAY: Opening host through player gameplay."
    );

    const game =
        recoverHostGameplayGame();

    const player =
        recoverHostGameplayPlayer();

    if (!game || !game.gameCode) {

        console.error(
            "HOST GAMEPLAY: Cannot open game - no valid host game.",
            game
        );

        return;
    }

    if (!player || !player.playerId) {

        console.error(
            "HOST GAMEPLAY: Cannot open game - no valid host player.",
            player
        );

        return;
    }

    /* Keep Host.js runtime state repaired where possible. */
    try {
        hostGame = game;
        hostPlayer = player;
    } catch (error) {
        console.warn(
            "HOST GAMEPLAY: Could not repair Host.js runtime state.",
            error
        );
    }

    if (
        typeof window.openPlayerGame !== "function"
    ) {

        console.error(
            "HOST GAMEPLAY: openPlayerGame() is unavailable. " +
            "Make sure host-gameplay.js is loaded after player.js."
        );

        return;
    }

    console.log(
        "HOST GAMEPLAY: Handing host to openPlayerGame:",
        {
            gameCode: game.gameCode,
            playerId: player.playerId,
            playerName: player.playerName || "",
            isHost: true
        }
    );

    try {

        await window.openPlayerGame(
            game,
            {
                ...player,
                gameCode:
                    player.gameCode ||
                    game.gameCode,
                isHost: true
            }
        );

        console.log(
            "HOST GAMEPLAY: Player gameplay initialisation complete."
        );

    } catch (error) {

        console.error(
            "HOST GAMEPLAY: openPlayerGame failed:",
            error
        );
    }
}


/* Explicitly expose the corrected function. */
window.openHostPlaying =
    openHostPlaying;
