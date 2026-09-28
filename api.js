/* ==================================================
   FIND IT!
   api.js
   API + SCREEN NAVIGATION

   CURRENT VERSION

   IMPORTANT:
   - GET action is sent in URL
   - POST action is sent only in the JSON body
   - POST body remains JSON
   - Content-Type remains text/plain to avoid preflight
   - Redirect handling is explicit
   - No duplicate retry logic
   - No GET fallback from POST
================================================== */

console.log("=================================");
console.log("Find it! api.js loaded");
console.log("=================================");

function showScreen(screenId) {
    console.log("Showing screen:", screenId);
    const screens = document.querySelectorAll(".screen");
    screens.forEach(function(screen) {
        screen.classList.remove("active");
        screen.style.display = "none";
    });
    const target = document.getElementById(screenId);
    if (!target) {
        console.error("Screen not found:", screenId);
        return;
    }
    target.classList.add("active");
    target.style.display = "";
    window.scrollTo(0, 0);
}

function getApiUrl() {
    if (typeof API_URL === "undefined" || !API_URL) {
        throw new Error("API_URL is not configured.");
    }
    return String(API_URL).trim();
}

function cleanGameCode(gameCode) {
    if (gameCode === undefined || gameCode === null) return "";
    return String(gameCode).trim().toUpperCase();
}

function validateApiAction(action) {
    if (action === undefined || action === null || String(action).trim() === "") {
        throw new Error("API action is missing.");
    }
    return String(action).trim();
}

function createApiRequestId() {
    return Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 8);
}

function parseApiResponse(raw, method) {
    const text = String(raw || "").trim();
    if (!text) throw new Error(method + " returned an empty response.");
    if (text.startsWith("<!DOCTYPE html") || text.startsWith("<html") || text.startsWith("<HTML")) {
        console.error(method + " returned HTML:");
        console.error(text.substring(0, 2000));
        throw new Error("Google Apps Script returned HTML instead of JSON.");
    }
    try {
        return JSON.parse(text);
    } catch (error) {
        console.error(method + " JSON PARSE ERROR:", error);
        console.error(method + " RAW RESPONSE:", text);
        throw new Error("API did not return valid JSON.");
    }
}

function validateApiResult(result) {
    if (result && result.success === false) {
        throw new Error(result.error || result.message || "API request failed.");
    }
    return result;
}

async function apiGet(action, params = {}) {
    const requestId = createApiRequestId();
    console.log("=================================");
    console.log("API GET:", action);
    console.log("GET REQUEST ID:", requestId);
    console.log("Params:", params);
    try {
        action = validateApiAction(action);
        const apiUrl = getApiUrl();
        const url = new URL(apiUrl);
        url.searchParams.set("action", action);
        Object.keys(params).forEach(function(key) {
            const value = params[key];
            if (value !== undefined && value !== null && String(value).trim() !== "") {
                url.searchParams.set(key, String(value).trim());
            }
        });
        console.log("GET URL:", url.toString());
        const response = await fetch(url.toString(), {
            method: "GET",
            redirect: "follow",
            cache: "no-store"
        });
        console.log("GET REQUEST COMPLETE:", requestId);
        console.log("GET STATUS:", response.status);
        console.log("GET FINAL URL:", response.url);
        const raw = await response.text();
        console.log("GET RAW RESPONSE:", raw);
        if (!response.ok) {
            throw new Error("HTTP " + response.status + ": " + raw.substring(0, 500));
        }
        const result = parseApiResponse(raw, "GET");
        console.log("GET PARSED RESPONSE:", result);
        return validateApiResult(result);
    } catch (error) {
        console.error("API GET FAILED:", action);
        console.error("GET REQUEST ID:", requestId);
        console.error(error);
        throw error;
    }
}

/* ==================================================
   API POST

   IMPORTANT:
   - POST action is carried only in the JSON body.
   - The Apps Script doPost() router reads body.action.
   - POST actions are not added to the URL because they
     are not valid doGet() routes.
================================================== */
async function apiPost(action, data = {}) {
    const requestId = createApiRequestId();
    console.log("=================================");
    console.log("API POST:", action);
    console.log("POST REQUEST ID:", requestId);
    console.log("POST DATA:", data);
    console.log("=================================");
    try {
        action = validateApiAction(action);
        const apiUrl = getApiUrl();

        /* --------------------------------------------------
           BUILD POST URL

           POST action is deliberately NOT added to the URL.
           doPost() reads the action from the JSON body.
        -------------------------------------------------- */
        const url = new URL(apiUrl);

        const payload = JSON.stringify({
            action: action,
            data: data || {}
        });

        console.log("POST URL:", url.toString());
        console.log("POST BODY:", payload);
        console.log("POST BODY LENGTH:", payload.length);

        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: payload,
            redirect: "follow",
            cache: "no-store"
        });

        console.log("POST REQUEST COMPLETE:", requestId);
        console.log("POST STATUS:", response.status);
        console.log("POST OK:", response.ok);
        console.log("POST FINAL URL:", response.url);
        console.log("POST RESPONSE TYPE:", response.type);

        const raw = await response.text();
        console.log("POST RAW RESPONSE:", raw);
        const trimmed = String(raw || "").trim();
        if (!trimmed) throw new Error("POST returned an empty response.");
        if (trimmed.startsWith("<!DOCTYPE html") || trimmed.startsWith("<html") || trimmed.startsWith("<HTML")) {
            console.error("POST RECEIVED GOOGLE HTML PAGE");
            console.error("POST REQUEST ID:", requestId);
            console.error("POST FINAL URL:", response.url);
            console.error("POST HTML:", trimmed.substring(0, 2000));
            throw new Error("Google Apps Script returned HTML instead of JSON.");
        }

        let result;
        try {
            result = JSON.parse(trimmed);
        } catch (parseError) {
            console.error("POST JSON PARSE ERROR:", parseError);
            console.error("POST RAW RESPONSE:", trimmed);
            throw new Error("POST did not return valid JSON.");
        }

        console.log("POST PARSED RESPONSE:", result);
        if (!response.ok) {
            throw new Error(result.error || result.message || ("HTTP " + response.status));
        }
        return validateApiResult(result);
    } catch (error) {
        console.error("API POST FAILED:", action);
        console.error("POST REQUEST ID:", requestId);
        console.error(error);
        throw error;
    }
}

async function createGame(hostName, categoryCount) {
    return await apiPost("createGame", {
        hostName: String(hostName || "").trim(),
        categoryCount: Number(categoryCount)
    });
}

async function joinGame(gameCode, playerName) {
    return await apiPost("joinGame", {
        gameCode: cleanGameCode(gameCode),
        playerName: String(playerName || "").trim()
    });
}

async function rejoinGame(gameCode, playerName) {
    console.log("Attempting to rejoin existing game...");
    const result = await apiPost("rejoinGame", {
        gameCode: cleanGameCode(gameCode),
        playerName: String(playerName || "").trim()
    });
    console.log("REJOIN API RESULT:", result);
    return result;
}

async function startGame(gameCode) {
    const cleanCode = cleanGameCode(gameCode);
    console.log("START GAME API CALL:", cleanCode);
    if (!cleanCode) throw new Error("Cannot start game: game code is missing.");
    return await apiPost("startGame", { gameCode: cleanCode });
}

async function getGame(gameCode) {
    const cleanCode = cleanGameCode(gameCode);
    console.log("GET GAME API CALL:", cleanCode);
    if (!cleanCode) throw new Error("Cannot get game: game code is missing.");
    return await apiGet("getGame", { gameCode: cleanCode });
}

async function restoreHost(gameCode, hostName) {
    return await apiPost("restoreHost", {
        gameCode: cleanGameCode(gameCode),
        hostName: String(hostName || "").trim()
    });
}

async function getPlayers(gameCode) {
    const cleanCode = cleanGameCode(gameCode);
    console.log("GET PLAYERS API CALL:", cleanCode);
    if (!cleanCode) throw new Error("Cannot get players: game code is missing.");
    const result = await apiGet("getPlayers", { gameCode: cleanCode });
    console.log("GET PLAYERS RAW RESULT:", result);
    if (Array.isArray(result)) return { success: true, players: result };
    if (result && Array.isArray(result.players)) {
        return { ...result, success: result.success !== false, players: result.players };
    }
    if (result && Array.isArray(result.data)) return { success: true, players: result.data };
    if (result && result.data && Array.isArray(result.data.players)) {
        return { success: true, players: result.data.players };
    }
    console.error("GET PLAYERS: INVALID RESPONSE:", result);
    return { success: false, players: [], error: "Server returned an invalid player list." };
}

async function getPlayer(playerId, gameCode) {
    return await apiGet("getPlayer", {
        playerId: String(playerId || "").trim(),
        gameCode: cleanGameCode(gameCode)
    });
}

async function getGameCategories(gameCode) {
    const cleanCode = cleanGameCode(gameCode);
    if (!cleanCode) throw new Error("Cannot get game categories: game code is missing.");
    return await apiGet("getGameCategories", { gameCode: cleanCode });
}

async function getCategories() {
    console.log("GET CATEGORIES API CALL");
    return await apiGet("getCategories");
}

async function submitEntry(data) {
    return await apiPost("submitEntry", data || {});
}

async function submitPass(data) {
    return await apiPost("submitPass", data || {});
}

async function startScoring(data) {
    return await apiPost("startScoring", data || {});
}

async function startVoting(data) {
    return await apiPost("startVoting", data || {});
}

async function submitVote(data) {
    return await apiPost("submitVote", data || {});
}

async function cleanupGamePhotos(data) {
    return await apiPost("cleanupGamePhotos", data || {});
}

async function finishGame(data) {
    return await apiPost("finishGame", data || {});
}

window.showScreen = showScreen;
window.apiGet = apiGet;
window.apiPost = apiPost;
window.getApiUrl = getApiUrl;
window.cleanGameCode = cleanGameCode;
window.getGame = getGame;
window.getPlayers = getPlayers;
window.getPlayer = getPlayer;
window.getGameCategories = getGameCategories;
window.getCategories = getCategories;
window.createGame = createGame;
window.joinGame = joinGame;
window.rejoinGame = rejoinGame;
window.startGame = startGame;
window.restoreHost = restoreHost;
window.submitEntry = submitEntry;
window.submitPass = submitPass;
window.startScoring = startScoring;
window.startVoting = startVoting;
window.submitVote = submitVote;
window.cleanupGamePhotos = cleanupGamePhotos;
window.finishGame = finishGame;

console.log("=================================");
console.log("Find it! api.js ready");
console.log("=================================");