/* =========================================================
   FIND IT!
   host-gameplay.js

   HOST -> PLAYER GAMEPLAY BRIDGE

   Load this file AFTER player.js.

   Purpose:
   - Host is a real player.
   - Never leave the host trapped in Host.js PLAYING polling.
   - Detect PLAYING independently of Host.js.
   - Recover the host player when needed.
   - Enter gameplay through player.js so categories,
     progress, photo state and challenge cards are initialised.
========================================================= */

console.log("=================================");
console.log("Find It! host-gameplay.js loaded");
console.log("=================================");

let hostGameplayBridgeTimer = null;
let hostGameplayBridgeBusy = false;
let hostGameplayEntered = false;


/* =========================================================
   NORMALISE HELPERS
========================================================= */

function hostGameplayGameCode(game) {
    return String(
        game &&
        (game.gameCode || game.GameCode) ||
        ""
    ).trim().toUpperCase();
}

function hostGameplayPlayerId(player) {
    return String(
        player &&
        (player.playerId || player.PlayerID) ||
        ""
    ).trim();
}


/* =========================================================
   RECOVER HOST GAME
========================================================= */

function recoverHostGameplayGame() {

    if (
        typeof hostGame !== "undefined" &&
        hostGame &&
        hostGameplayGameCode(hostGame)
    ) {
        return hostGame;
    }

    if (
        typeof currentPlayerGame !== "undefined" &&
        currentPlayerGame &&
        hostGameplayGameCode(currentPlayerGame)
    ) {
        return currentPlayerGame;
    }

    const keys = [
        "findItHostGame",
        "findItGame"
    ];

    for (const key of keys) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) continue;

            const saved = JSON.parse(raw);
            if (hostGameplayGameCode(saved)) {
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
   RECOVER HOST PLAYER
========================================================= */

function recoverHostGameplayPlayer(game) {

    const expectedHostId = String(
        game &&
        (game.hostPlayerId || game.HostPlayerID) ||
        ""
    ).trim();

    const candidates = [];

    if (
        typeof hostPlayer !== "undefined" &&
        hostPlayer
    ) {
        candidates.push(hostPlayer);
    }

    if (
        typeof currentPlayer !== "undefined" &&
        currentPlayer
    ) {
        candidates.push(currentPlayer);
    }

    for (const key of [
        "findItCurrentPlayer",
        "findItPlayer"
    ]) {
        try {
            const raw = localStorage.getItem(key);
            if (raw) candidates.push(JSON.parse(raw));
        } catch (error) {
            console.warn(
                "HOST GAMEPLAY: Could not recover player from",
                key,
                error
            );
        }
    }

    if (expectedHostId) {
        const exact = candidates.find(function(candidate) {
            return hostGameplayPlayerId(candidate) === expectedHostId;
        });
        if (exact) return exact;
    }

    return candidates.find(function(candidate) {
        return !!hostGameplayPlayerId(candidate);
    }) || null;
}


/* =========================================================
   FETCH HOST PLAYER IF RUNTIME STATE IS MISSING
========================================================= */

async function fetchHostGameplayPlayer(game) {

    const gameCode = hostGameplayGameCode(game);
    const hostId = String(
        game &&
        (game.hostPlayerId || game.HostPlayerID) ||
        ""
    ).trim();

    if (!gameCode || typeof window.apiGet !== "function") {
        return null;
    }

    try {
        const result = await window.apiGet(
            "getPlayers",
            { gameCode: gameCode }
        );

        const players = Array.isArray(result)
            ? result
            : (
                result && Array.isArray(result.players)
                    ? result.players
                    : []
            );

        if (hostId) {
            const host = players.find(function(player) {
                return hostGameplayPlayerId(player) === hostId;
            });
            if (host) return host;
        }

        return players.find(function(player) {
            return !!(
                player &&
                (player.isHost === true || player.IsHost === true)
            );
        }) || null;

    } catch (error) {
        console.error(
            "HOST GAMEPLAY: Could not fetch host player:",
            error
        );
        return null;
    }
}


/* =========================================================
   ENTER PLAYER GAMEPLAY
========================================================= */

async function enterHostPlayerGameplay(game) {

    if (hostGameplayBridgeBusy || hostGameplayEntered) {
        return;
    }

    hostGameplayBridgeBusy = true;

    try {
        const gameCode = hostGameplayGameCode(game);

        if (!gameCode) {
            console.error(
                "HOST GAMEPLAY: Cannot enter gameplay - no game code.",
                game
            );
            return;
        }

        let player = recoverHostGameplayPlayer(game);

        if (!player || !hostGameplayPlayerId(player)) {
            console.log(
                "HOST GAMEPLAY: Host player missing locally; fetching players."
            );
            player = await fetchHostGameplayPlayer(game);
        }

        if (!player || !hostGameplayPlayerId(player)) {
            console.error(
                "HOST GAMEPLAY: Cannot enter gameplay - host player not found."
            );
            return;
        }

        if (typeof window.openPlayerGame !== "function") {
            console.error(
                "HOST GAMEPLAY: openPlayerGame() unavailable. " +
                "Load host-gameplay.js after player.js."
            );
            return;
        }

        /* Stop Host.js status polling before player gameplay takes over. */
        try {
            if (typeof stopHostStatusPolling === "function") {
                stopHostStatusPolling();
            }
            if (typeof stopHostLobbyPolling === "function") {
                stopHostLobbyPolling();
            }
        } catch (error) {
            console.warn(
                "HOST GAMEPLAY: Could not stop old host polling:",
                error
            );
        }

        const normalisedGame = {
            ...game,
            gameCode: gameCode
        };

        const normalisedPlayer = {
            ...player,
            playerId: hostGameplayPlayerId(player),
            gameCode: gameCode,
            isHost: true
        };

        try {
            hostGame = normalisedGame;
            hostPlayer = normalisedPlayer;
        } catch (error) {
            console.warn(
                "HOST GAMEPLAY: Could not repair Host.js state:",
                error
            );
        }

        console.log(
            "HOST GAMEPLAY: PLAYING detected - entering player gameplay:",
            {
                gameCode: gameCode,
                playerId: normalisedPlayer.playerId
            }
        );

        hostGameplayEntered = true;

        await window.openPlayerGame(
            normalisedGame,
            normalisedPlayer
        );

        console.log(
            "HOST GAMEPLAY: Player gameplay initialisation complete."
        );

    } catch (error) {
        hostGameplayEntered = false;
        console.error(
            "HOST GAMEPLAY: Player gameplay entry failed:",
            error
        );
    } finally {
        hostGameplayBridgeBusy = false;
    }
}


/* =========================================================
   CORRECTED openHostPlaying
========================================================= */

async function correctedOpenHostPlaying() {

    console.log(
        "HOST GAMEPLAY: openHostPlaying bridge invoked."
    );

    const game = recoverHostGameplayGame();

    if (!game) {
        console.error(
            "HOST GAMEPLAY: openHostPlaying has no host game."
        );
        return;
    }

    await enterHostPlayerGameplay(game);
}

window.openHostPlaying = correctedOpenHostPlaying;


/* =========================================================
   INDEPENDENT PLAYING WATCH

   Host.js is currently capable of remaining in its own
   getGame polling loop. This watcher deliberately observes
   hostGame and takes over as soon as PLAYING is visible.
   It does NOT make another getGame request.
========================================================= */

function hostGameplayBridgeTick() {

    if (hostGameplayEntered || hostGameplayBridgeBusy) {
        return;
    }

    const game = recoverHostGameplayGame();

    if (!game) {
        return;
    }

    const status = String(
        game.status || game.Status || ""
    ).trim().toUpperCase();

    if (status !== "PLAYING") {
        return;
    }

    console.log(
        "HOST GAMEPLAY: Watcher detected PLAYING."
    );

    enterHostPlayerGameplay(game);
}

hostGameplayBridgeTimer = window.setInterval(
    hostGameplayBridgeTick,
    250
);

/* Also check immediately in case this file loads after PLAYING. */
hostGameplayBridgeTick();
