/* =========================================================
   FIND IT! - voting.js
   VOTING SCREEN

   FLOW
   - All submitted entries remain visible as cards.
   - One vote per player per challenge.
   - One self-vote per player across the whole game.
   - After a self-vote is used, later own photos remain visible
     but their vote buttons are disabled.
   - A player who has voted in every challenge stays on the
     voting screen and waits for everybody else.
   - The backend submitVote response is authoritative for
     votingComplete. We also poll final vote totals so players
     who finish early can observe global completion.
========================================================= */

console.log("Find It! voting.js loaded");

let activeVotingGameCode = "";
let votingScreenOpen = false;
let votingPollTimer = null;
let votingBusy = false;
let votingFinished = false;
let votingLoading = false;
let votingCompleting = false;
let submittedVoteCategories = {};
let selfVoteUsed = false;
let finalVotingResults = null;
let votingRequiredTotal = 0;
const votingPhotoCache = {};

function getVotingCurrentPlayer() {
    if (typeof currentPlayer !== "undefined" && currentPlayer) return currentPlayer;
    for (const key of ["findItCurrentPlayer", "findItPlayer"]) {
        try {
            const raw = localStorage.getItem(key);
            if (raw) return JSON.parse(raw);
        } catch (error) {
            console.warn("VOTING: unable to read player", key, error);
        }
    }
    return null;
}

function getVotingGameCode() {
    if (activeVotingGameCode) return String(activeVotingGameCode).trim().toUpperCase();
    const player = getVotingCurrentPlayer();
    let code = player && (player.gameCode || player.GameCode);
    if (!code) {
        try {
            code = localStorage.getItem("findItGameCode") || localStorage.getItem("gameCode") || localStorage.getItem("GameCode");
        } catch (_) {}
    }
    code = String(code || "").trim().toUpperCase();
    if (code) activeVotingGameCode = code;
    return code;
}

function requireVotingGameCode() {
    const code = getVotingGameCode();
    if (!code) throw new Error("Game code is missing. Unable to continue voting.");
    return code;
}

function getVotingPlayerId() {
    const player = getVotingCurrentPlayer();
    return String(player && (player.playerId || player.PlayerID || player.id) || "").trim();
}

function getVotingPlayerName() {
    const player = getVotingCurrentPlayer();
    return String(player && (player.playerName || player.PlayerName || player.name) || "").trim();
}

function voteStateKey() {
    return "findItVotingState:" + getVotingGameCode() + ":" + getVotingPlayerId();
}

function loadLocalVoteState() {
    submittedVoteCategories = {};
    selfVoteUsed = false;
    try {
        const raw = localStorage.getItem(voteStateKey());
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (saved && saved.categories && typeof saved.categories === "object") {
            submittedVoteCategories = saved.categories;
        }
        selfVoteUsed = !!(saved && saved.selfVoteUsed);
    } catch (error) {
        console.warn("VOTING: could not restore local vote state", error);
    }
}

function saveLocalVoteState() {
    try {
        localStorage.setItem(voteStateKey(), JSON.stringify({
            categories: submittedVoteCategories,
            selfVoteUsed: selfVoteUsed
        }));
    } catch (_) {}
}

function markSelfVoteUsed() {
    selfVoteUsed = true;
    saveLocalVoteState();
}

function hideVotingLoadingMessage() {
    ["votingLoading", "votingLoadingMessage", "votingEntriesLoading", "loadingEntries", "loadingVoting"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
    });
}

function hideAllVotingScreens() {
    document.querySelectorAll(".screen").forEach(screen => {
        screen.classList.remove("active");
        screen.style.display = "none";
    });
}

function forceVotingScreenVisible() {
    hideAllVotingScreens();
    const section = document.getElementById("votingSection") || document.getElementById("votingScreen");
    if (!section) {
        console.error("VOTING: voting screen not found.");
        return false;
    }
    section.style.display = "block";
    section.style.visibility = "visible";
    section.style.opacity = "1";
    section.classList.add("active");
    const cards = document.getElementById("votingCards");
    if (cards) cards.style.display = "block";
    hideVotingLoadingMessage();
    return true;
}

function extractVotingEntries(result) {
    if (Array.isArray(result)) return result;
    if (result && Array.isArray(result.entries)) return result.entries;
    if (result && Array.isArray(result.data)) return result.data;
    if (result && result.data && Array.isArray(result.data.entries)) return result.data.entries;
    if (result && result.result && Array.isArray(result.result.entries)) return result.result.entries;
    return [];
}

function normaliseVotingEntry(entry) {
    if (!entry) return null;
    return {
        entryId: entry.entryId || entry.EntryID || entry.id || "",
        gameCode: entry.gameCode || entry.GameCode || "",
        playerId: entry.playerId || entry.PlayerID || "",
        playerName: entry.playerName || entry.PlayerName || entry.name || "Player",
        categoryId: entry.categoryId || entry.CategoryID || "",
        categoryNumber: Number(entry.categoryNumber || entry.CategoryNumber || 0),
        categoryName: entry.categoryName || entry.CategoryName || entry.description || entry.Description || "",
        status: String(entry.status || entry.Status || "").trim().toUpperCase(),
        photoId: cleanVotingPhotoId(entry.photoId || entry.PhotoID || ""),
        photoUrl: entry.photoUrl || entry.PhotoURL || "",
        submitted: entry.submitted || entry.Submitted || ""
    };
}

function cleanVotingPhotoId(photoId) {
    return String(photoId || "").replace(/^["']+/, "").replace(/["']+$/, "").trim();
}

function getVotingCategoryKey(entry) {
    if (!entry) return "";
    return String(entry.categoryId || entry.CategoryID || entry.categoryNumber || entry.CategoryNumber || "").trim();
}

function hasVotedCategory(categoryKey) {
    return submittedVoteCategories[String(categoryKey || "").trim()] === true;
}

function markCategoryVoted(categoryKey) {
    categoryKey = String(categoryKey || "").trim();
    if (categoryKey) submittedVoteCategories[categoryKey] = true;
    saveLocalVoteState();
}

async function loadVotingPhoto(imageElement, entry) {
    if (!imageElement || !entry) return false;
    const directUrl = String(entry.photoUrl || "").trim();
    if (directUrl) {
        imageElement.src = directUrl;
        return true;
    }
    const photoId = cleanVotingPhotoId(entry.photoId);
    if (!photoId) return false;
    if (votingPhotoCache[photoId]) {
        imageElement.src = votingPhotoCache[photoId];
        return true;
    }
    try {
        const result = await apiGet("getPhoto", { photoId });
        if (!result || result.success === false || !result.base64) {
            throw new Error(result && (result.error || result.message) || "Photo unavailable");
        }
        const dataUrl = "data:" + (result.mimeType || result.mime || "image/jpeg") + ";base64," + result.base64;
        votingPhotoCache[photoId] = dataUrl;
        if (imageElement.isConnected) imageElement.src = dataUrl;
        return true;
    } catch (error) {
        console.error("VOTING PHOTO LOAD FAILED:", photoId, error);
        if (imageElement.isConnected) imageElement.style.display = "none";
        return false;
    }
}

function createVotingPhotoCard(entry, currentPlayerId) {
    const card = document.createElement("div");
    card.className = "findit-photo-card voting-entry-card";

    const playerId = String(entry.playerId || "").trim();
    const playerName = entry.playerName || "Player";
    const categoryKey = getVotingCategoryKey(entry);
    const isOwnPhoto = playerId === String(currentPlayerId || "").trim();

    const wrapper = document.createElement("div");
    wrapper.className = "findit-photo-wrapper";
    const image = document.createElement("img");
    image.className = "findit-photo";
    image.alt = "Entry by " + playerName;
    image.loading = "eager";
    image.style.width = "100%";
    image.style.height = "auto";
    wrapper.appendChild(image);
    card.appendChild(wrapper);
    loadVotingPhoto(image, entry);

    const details = document.createElement("div");
    details.className = "findit-photo-details";

    const player = document.createElement("div");
    player.className = "findit-photo-player";
    player.textContent = playerName;
    details.appendChild(player);

    if (isOwnPhoto) {
        const own = document.createElement("div");
        own.className = "findit-own-photo";
        own.textContent = selfVoteUsed
            ? "Your photo • self-vote already used"
            : "Your photo • self-vote available";
        details.appendChild(own);
    }
    card.appendChild(details);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "findit-photo-action voting-entry-vote";

    if (hasVotedCategory(categoryKey)) {
        button.disabled = true;
        button.textContent = "✓ Vote cast for this challenge";
    } else if (isOwnPhoto && selfVoteUsed) {
        button.disabled = true;
        button.textContent = "Self-vote already used";
        button.classList.add("self-vote-disabled");
    } else {
        button.textContent = isOwnPhoto ? "VOTE FOR YOUR PHOTO" : "VOTE";
        button.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            if (votingBusy || votingFinished || votingCompleting) return;
            if (hasVotedCategory(categoryKey)) return;
            if (isOwnPhoto && selfVoteUsed) return;
            castVote(entry, button);
        });
    }

    if (button.disabled) {
        button.style.opacity = "0.55";
        button.style.pointerEvents = "none";
    }
    card.appendChild(button);
    return card;
}

function groupVotingEntries(entries) {
    const categories = {};
    entries.forEach(entry => {
        const key = getVotingCategoryKey(entry) || "unknown";
        if (!categories[key]) categories[key] = [];
        categories[key].push(entry);
    });
    return Object.keys(categories)
        .sort((a, b) => Number(categories[a][0].categoryNumber || 0) - Number(categories[b][0].categoryNumber || 0))
        .map(key => ({ key, entries: categories[key] }));
}

function ensureVotingWaitingMessage() {
    let message = document.getElementById("votingWaitingMessage");
    if (message) return message;
    message = document.createElement("div");
    message.id = "votingWaitingMessage";
    message.className = "voting-waiting-message";
    message.style.display = "none";
    message.style.textAlign = "center";
    message.style.padding = "18px";
    message.style.fontWeight = "700";
    const cards = document.getElementById("votingCards");
    if (cards && cards.parentNode) cards.parentNode.insertBefore(message, cards.nextSibling);
    return message;
}

function updateVotingPlayerProgress(categoryGroups) {
    const total = categoryGroups.length;
    const voted = categoryGroups.filter(group => hasVotedCategory(group.key)).length;
    const progress = document.getElementById("votingProgress") || document.getElementById("votingProgressText");
    if (progress) progress.textContent = voted + " / " + total;

    const waiting = ensureVotingWaitingMessage();
    if (waiting) {
        if (total > 0 && voted >= total && !votingFinished) {
            waiting.textContent = "Your votes are complete. Waiting for the other players…";
            waiting.style.display = "block";
        } else {
            waiting.style.display = "none";
        }
    }
}

function renderVoting(entries) {
    if (votingFinished || votingCompleting) return;
    const container = document.getElementById("votingCards");
    if (!container) return console.error("VOTING: votingCards not found.");
    hideVotingLoadingMessage();
    container.innerHTML = "";

    if (!entries || !entries.length) {
        container.innerHTML = '<div style="text-align:center;padding:20px"><strong>No photos have been submitted yet.</strong></div>';
        return;
    }

    const groups = groupVotingEntries(entries);
    updateVotingPlayerProgress(groups);

    groups.forEach(group => {
        const first = group.entries[0];
        const section = document.createElement("section");
        section.className = "voting-category-section";

        const title = document.createElement("div");
        title.className = "voting-category-title";
        title.textContent = "Challenge " + (first.categoryNumber || "") + (first.categoryName ? " • " + first.categoryName : "");
        section.appendChild(title);

        if (hasVotedCategory(group.key)) {
            const done = document.createElement("div");
            done.className = "voting-category-complete";
            done.textContent = "✓ Your vote has been cast for this challenge";
            section.appendChild(done);
        }

        const grid = document.createElement("div");
        grid.className = "findit-photo-grid";
        group.entries.forEach(entry => grid.appendChild(createVotingPhotoCard(entry, getVotingPlayerId())));
        section.appendChild(grid);
        container.appendChild(section);
    });
}

function disableAllVotingButtons(text) {
    document.querySelectorAll("#votingCards button").forEach(button => {
        button.disabled = true;
        if (text) button.textContent = text;
        button.style.pointerEvents = "none";
        button.style.opacity = "0.6";
    });
}

async function castVote(entry, voteButton) {
    if (votingBusy || votingFinished || votingCompleting) return;

    const gameCode = requireVotingGameCode();
    const playerId = getVotingPlayerId();
    const entryId = String(entry && entry.entryId || "").trim();
    const categoryId = String(entry && entry.categoryId || "").trim();
    const categoryNumber = Number(entry && entry.categoryNumber || 0);
    const categoryKey = getVotingCategoryKey(entry);
    const isSelfVote = String(entry && entry.playerId || "").trim() === playerId;

    if (hasVotedCategory(categoryKey)) return;
    if (isSelfVote && selfVoteUsed) {
        alert("You have already used your one self-vote. Please choose another player's photo.");
        return;
    }
    if (!playerId || !entryId || !categoryId) {
        alert("Voting information is incomplete.");
        return;
    }

    votingBusy = true;
    disableAllVotingButtons("Voting...");

    try {
        const result = await apiPost("submitVote", {
            gameCode,
            playerId,
            entryId,
            categoryId,
            categoryNumber
        });

        if (!result || result.success !== true) {
            throw new Error(result && (result.message || result.error) || "Vote could not be submitted.");
        }

        markCategoryVoted(categoryKey);
        if (isSelfVote) markSelfVoteUsed();

        votingRequiredTotal = Number(result.votesRequired || votingRequiredTotal || 0);

        console.log("VOTING: vote accepted", {
            categoryId,
            votesReceived: result.votesReceived,
            votesRequired: result.votesRequired,
            votingComplete: result.votingComplete
        });

        if (voteButton) voteButton.textContent = "✓ Vote recorded";

        /* Backend is authoritative for global completion. */
        if (result.votingComplete === true) {
            await handleVotingComplete();
            return;
        }

        await loadVotingData();
    } catch (error) {
        console.error("CAST VOTE ERROR:", error);
        alert(error.message || "Unable to submit vote.");
        await loadVotingData();
    } finally {
        votingBusy = false;
    }
}

async function getGlobalVotingCompletion(entries) {
    const gameCode = requireVotingGameCode();
    try {
        const [results, playersResult] = await Promise.all([
            apiGet("getVotingResults", { gameCode }),
            apiGet("getPlayers", { gameCode })
        ]);

        if (!results || results.success === false) return false;

        const players = Array.isArray(playersResult)
            ? playersResult
            : (playersResult && Array.isArray(playersResult.players) ? playersResult.players : []);

        const groups = groupVotingEntries(entries);
        const required = players.length * groups.length;
        const received = Number(results.totalVotes || 0);
        votingRequiredTotal = required;

        console.log("VOTING: global progress", {
            votesReceived: received,
            votesRequired: required
        });

        return required > 0 && received >= required;
    } catch (error) {
        console.warn("VOTING: global completion check failed", error);
        return false;
    }
}

async function loadVotingData() {
    if (votingFinished || votingCompleting || votingLoading) return;
    const gameCode = activeVotingGameCode || getVotingGameCode();
    if (!gameCode) return;

    votingLoading = true;
    try {
        const result = await apiGet("getEntries", { gameCode });
        const entries = extractVotingEntries(result)
            .map(normaliseVotingEntry)
            .filter(entry => entry && entry.status !== "REJECTED");

        renderVoting(entries);

        /*
           submitVote/getVotingProgress is the authoritative backend
           completion decision for the final vote. This polling check
           lets players who finished earlier observe the same completed
           total and move to the winners flow without refreshing.
        */
        if (entries.length && await getGlobalVotingCompletion(entries)) {
            await handleVotingComplete();
        }
    } catch (error) {
        console.error("LOAD VOTING DATA ERROR:", error);
        const container = document.getElementById("votingCards");
        if (container) container.innerHTML = '<div style="text-align:center;padding:20px">Unable to load voting photos.</div>';
    } finally {
        votingLoading = false;
    }
}

async function requestFinalVotingResults(gameCode) {
    const result = await apiGet("getVotingResults", { gameCode });
    if (!result || result.success === false) {
        throw new Error(result && (result.message || result.error) || "Unable to load voting results.");
    }
    return result.data && typeof result.data === "object" ? result.data : result;
}

async function handleVotingComplete() {
    if (votingFinished || votingCompleting) return;

    votingCompleting = true;
    votingFinished = true;
    votingScreenOpen = false;
    stopVotingPolling();
    disableAllVotingButtons("✓ Voting complete");

    const waiting = ensureVotingWaitingMessage();
    if (waiting) {
        waiting.textContent = "All votes are in. Preparing the winning photos…";
        waiting.style.display = "block";
    }

    try {
        const results = await requestFinalVotingResults(requireVotingGameCode());
        finalVotingResults = results;
        window.findItFinalVotingResults = results;
        window.findItOverallWinner = results.overallWinner || null;
        window.findItWinningEntries = results.winningEntries || results.winners || [];
        window.findItOverallWinningPhoto = results.overallWinningPhoto || null;

        if (typeof window.openHostWinnersControlScreen === "function") {
            window.openHostWinnersControlScreen(results);
        } else if (typeof window.openWinnerRevealScreen === "function") {
            window.openWinnerRevealScreen(results);
        } else if (typeof window.showWinnerReveal === "function") {
            window.showWinnerReveal(results);
        } else {
            console.log("VOTING: final results ready", results);
        }
    } catch (error) {
        console.error("FINAL WINNER CALCULATION ERROR:", error);
        votingFinished = false;
        votingScreenOpen = true;
        if (waiting) waiting.textContent = "Votes are complete. Waiting for the results screen…";
        startVotingPolling();
    } finally {
        votingCompleting = false;
    }
}

function startVotingPolling() {
    stopVotingPolling();
    votingPollTimer = window.setInterval(() => {
        if (votingScreenOpen && !votingBusy && !votingLoading && !votingFinished && !votingCompleting) {
            loadVotingData();
        }
    }, 4000);
}

function stopVotingPolling() {
    if (votingPollTimer) window.clearInterval(votingPollTimer);
    votingPollTimer = null;
}

function closeVoting() {
    votingScreenOpen = false;
    stopVotingPolling();
}

async function openVoting() {
    if (votingFinished) return;
    const gameCode = requireVotingGameCode();

    if (activeVotingGameCode && activeVotingGameCode !== gameCode) {
        submittedVoteCategories = {};
        selfVoteUsed = false;
    }

    activeVotingGameCode = gameCode;
    loadLocalVoteState();
    votingScreenOpen = true;
    votingCompleting = false;

    if (!forceVotingScreenVisible()) return;

    await loadVotingData();
    if (!votingFinished && !votingCompleting) startVotingPolling();
}

function resetVotingState() {
    activeVotingGameCode = "";
    votingScreenOpen = false;
    votingBusy = false;
    votingLoading = false;
    votingFinished = false;
    votingCompleting = false;
    submittedVoteCategories = {};
    selfVoteUsed = false;
    finalVotingResults = null;
    votingRequiredTotal = 0;
    Object.keys(votingPhotoCache).forEach(key => delete votingPhotoCache[key]);
    stopVotingPolling();
}

window.openVoting = openVoting;
window.openVotingScreen = openVoting;
window.loadVotingData = loadVotingData;
window.renderVoting = renderVoting;
window.createVotingPhotoCard = createVotingPhotoCard;
window.castVote = castVote;
window.closeVoting = closeVoting;
window.resetVotingState = resetVotingState;
window.getVotingGameCode = getVotingGameCode;
window.getVotingPlayerId = getVotingPlayerId;
window.getVotingPlayerName = getVotingPlayerName;
window.getFinalVotingResults = async function () {
    finalVotingResults = await requestFinalVotingResults(requireVotingGameCode());
    return finalVotingResults;
};

console.log("Find It! voting.js ready - card voting + global completion flow.");