/* =========================================================
   FIND IT! - voting-winners.js

   FINAL VOTING / WINNER REVEAL

   Load AFTER voting.js.

   - Overrides the old post-voting "preparing winners" path.
   - When all votes are in, every player sees a clean reveal screen.
   - Results are requested only when "AND THE WINNERS ARE" is pressed.
   - Category winners are rendered as cards with photo + player name.
   - Also injects compact voting-photo sizing.
========================================================= */

console.log("Find It! voting-winners.js loaded");

(function () {
    "use strict";

    let revealBusy = false;
    const winnerPhotoCache = {};

    function addVotingWinnerStyles() {
        if (document.getElementById("findItVotingWinnerStyles")) return;

        const style = document.createElement("style");
        style.id = "findItVotingWinnerStyles";
        style.textContent = `
            /* Smaller voting cards/photos */
            #votingCards .findit-photo-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 12px;
                align-items: start;
            }

            #votingCards .voting-entry-card {
                width: 100%;
                max-width: 240px;
                margin: 0 auto;
            }

            #votingCards .findit-photo-wrapper {
                width: 100%;
                aspect-ratio: 1 / 1;
                overflow: hidden;
                border-radius: 14px;
            }

            #votingCards .findit-photo {
                width: 100% !important;
                height: 100% !important;
                object-fit: cover;
                display: block;
            }

            #votingCards .findit-photo-details {
                padding: 8px 6px;
            }

            #votingCards .voting-entry-vote {
                width: 100%;
                min-height: 42px;
            }

            /* Final reveal stage */
            #findItWinnerStage {
                min-height: 70vh;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: flex-start;
                text-align: center;
                padding: 24px 12px 40px;
            }

            #findItWinnerStage .winner-stage-logo {
                font-size: 52px;
                line-height: 1;
                margin: 12px 0 8px;
            }

            #findItWinnerStage .winner-stage-title {
                margin: 0 0 24px;
                font-size: clamp(28px, 8vw, 46px);
            }

            #findItRevealWinnersButton {
                width: min(92%, 520px);
                min-height: 86px;
                padding: 18px 24px;
                border: 0;
                border-radius: 22px;
                font-size: clamp(24px, 7vw, 38px);
                font-weight: 900;
                cursor: pointer;
                margin: 30px auto;
            }

            #findItWinnerCards {
                width: 100%;
                max-width: 900px;
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                gap: 18px;
                margin-top: 18px;
            }

            .findit-winner-card {
                padding: 14px;
                border-radius: 18px;
                background: rgba(255,255,255,0.10);
                overflow: hidden;
            }

            .findit-winner-card img {
                width: 100%;
                aspect-ratio: 1 / 1;
                object-fit: cover;
                border-radius: 14px;
                display: block;
            }

            .findit-winner-challenge {
                font-weight: 800;
                margin: 12px 0 5px;
            }

            .findit-winner-player {
                font-size: 1.2rem;
                font-weight: 900;
                margin: 4px 0;
            }

            .findit-winner-votes {
                opacity: .8;
                margin-top: 4px;
            }

            @media (min-width: 720px) {
                #votingCards .findit-photo-grid {
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                }
            }
        `;
        document.head.appendChild(style);
    }

    function votingContainer() {
        return document.getElementById("votingSection") ||
               document.getElementById("votingScreen");
    }

    function clearVotingForWinnerStage() {
        const screen = votingContainer();
        if (!screen) return null;

        /* Clear the old voting UI completely. */
        Array.from(screen.children).forEach(function (child) {
            child.style.display = "none";
        });

        let stage = document.getElementById("findItWinnerStage");
        if (!stage) {
            stage = document.createElement("div");
            stage.id = "findItWinnerStage";
            screen.appendChild(stage);
        }

        stage.style.display = "flex";
        stage.innerHTML = `
            <div class="winner-stage-logo">🏆</div>
            <h1 class="winner-stage-title">Find it!</h1>
            <button id="findItRevealWinnersButton" type="button">AND THE WINNERS ARE</button>
            <div id="findItWinnerStatus" aria-live="polite"></div>
            <div id="findItWinnerCards"></div>
        `;

        const button = document.getElementById("findItRevealWinnersButton");
        if (button) button.addEventListener("click", revealVotingWinners);

        return stage;
    }

    function extractWinningEntries(result) {
        if (!result) return [];
        if (Array.isArray(result.winningEntries)) return result.winningEntries;
        if (Array.isArray(result.winners)) return result.winners;
        if (result.data && Array.isArray(result.data.winningEntries)) return result.data.winningEntries;
        if (result.data && Array.isArray(result.data.winners)) return result.data.winners;
        return [];
    }

    function cleanPhotoId(value) {
        return String(value || "")
            .replace(/^["']+/, "")
            .replace(/["']+$/, "")
            .trim();
    }

    async function setWinnerPhoto(image, winner) {
        const directUrl = String(winner.photoUrl || winner.PhotoURL || "").trim();
        if (directUrl) {
            image.src = directUrl;
            return;
        }

        const photoId = cleanPhotoId(winner.photoId || winner.PhotoID || "");
        if (!photoId) {
            image.style.display = "none";
            return;
        }

        if (winnerPhotoCache[photoId]) {
            image.src = winnerPhotoCache[photoId];
            return;
        }

        try {
            const photo = await window.apiGet("getPhoto", { photoId: photoId });
            if (!photo || photo.success === false || !photo.base64) {
                throw new Error(photo && (photo.error || photo.message) || "Photo unavailable");
            }

            const dataUrl = "data:" + (photo.mimeType || photo.mime || "image/jpeg") +
                ";base64," + photo.base64;
            winnerPhotoCache[photoId] = dataUrl;
            if (image.isConnected) image.src = dataUrl;
        } catch (error) {
            console.error("WINNERS: photo load failed", photoId, error);
            if (image.isConnected) image.style.display = "none";
        }
    }

    function makeWinnerCard(winner, index) {
        const card = document.createElement("article");
        card.className = "findit-winner-card";

        const image = document.createElement("img");
        image.alt = "Winning photo by " + String(winner.playerName || "Player");
        card.appendChild(image);
        setWinnerPhoto(image, winner);

        const challenge = document.createElement("div");
        challenge.className = "findit-winner-challenge";
        const number = Number(winner.categoryNumber || 0);
        const name = String(winner.categoryName || "").trim();
        challenge.textContent = number
            ? "Challenge " + number + (name ? " • " + name : "")
            : (name || "Winning challenge " + (index + 1));
        card.appendChild(challenge);

        const player = document.createElement("div");
        player.className = "findit-winner-player";
        player.textContent = String(winner.playerName || "Player");
        card.appendChild(player);

        const votes = document.createElement("div");
        votes.className = "findit-winner-votes";
        const voteCount = Number(winner.voteCount || winner.points || 0);
        votes.textContent = voteCount + (voteCount === 1 ? " vote" : " votes");
        card.appendChild(votes);

        return card;
    }

    async function revealVotingWinners() {
        if (revealBusy) return;
        revealBusy = true;

        const button = document.getElementById("findItRevealWinnersButton");
        const status = document.getElementById("findItWinnerStatus");
        const cards = document.getElementById("findItWinnerCards");

        if (button) {
            button.disabled = true;
            button.textContent = "CALCULATING WINNERS…";
        }
        if (status) status.textContent = "Counting the votes…";

        try {
            const gameCode = typeof window.getVotingGameCode === "function"
                ? window.getVotingGameCode()
                : "";

            if (!gameCode) throw new Error("Game code is missing.");

            /* Calculate/fetch final results only when the reveal button is pressed. */
            const response = await window.apiGet("getVotingResults", { gameCode: gameCode });
            if (!response || response.success === false) {
                throw new Error(response && (response.error || response.message) || "Could not calculate winners.");
            }

            const results = response.data && typeof response.data === "object"
                ? response.data
                : response;
            const winners = extractWinningEntries(results);

            window.findItFinalVotingResults = results;
            window.findItWinningEntries = winners;

            if (!winners.length) {
                throw new Error("No winning photos were returned.");
            }

            if (button) button.style.display = "none";
            if (status) status.textContent = "🏆 The winners are…";
            if (cards) {
                cards.innerHTML = "";
                winners.forEach(function (winner, index) {
                    cards.appendChild(makeWinnerCard(winner, index));
                });
            }

            console.log("WINNERS: revealed", winners);
        } catch (error) {
            console.error("WINNERS: reveal failed", error);
            if (status) status.textContent = error.message || "Could not load the winners.";
            if (button) {
                button.disabled = false;
                button.textContent = "AND THE WINNERS ARE";
            }
        } finally {
            revealBusy = false;
        }
    }

    /*
       Replace voting.js's old completion function.
       All clients reach this through the authoritative all-votes-in check.
    */
    window.handleVotingComplete = function () {
        try {
            if (typeof window.stopVotingPolling === "function") {
                window.stopVotingPolling();
            }
        } catch (_) {}

        /* voting.js uses globals; set them when accessible. */
        try { votingFinished = true; } catch (_) {}
        try { votingCompleting = false; } catch (_) {}
        try { votingScreenOpen = false; } catch (_) {}

        clearVotingForWinnerStage();
        console.log("VOTING: all votes received - winner reveal ready.");
    };

    /* Classic-script global function calls resolve through this binding too. */
    try {
        handleVotingComplete = window.handleVotingComplete;
    } catch (_) {}

    window.revealVotingWinners = revealVotingWinners;
    window.openVotingWinnerStage = clearVotingForWinnerStage;

    addVotingWinnerStyles();
    console.log("Find It! voting-winners.js ready.");
})();
