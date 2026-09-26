/* =========================================================
   FIND IT!
   voting.js
   PHOTO VOTING

   FIXED:
   - Removes "Loading entries..." correctly
   - Prevents duplicate votes
   - Prevents duplicate category votes
   - Prevents overlapping voting loads
   - Stops polling immediately when voting completes
   - Does not reload voting cards unnecessarily
   - Loads photos from getPhoto base64 response
   - Caches loaded voting photos
   - Allows self-voting
   - Handles "already voted" safely
   - Safely loads final voting results
   - ALWAYS carries valid game code into final results
   - Retries temporary Apps Script failures
   - Opens hostWinnersControlScreen only after valid results
========================================================= */

console.log("Find It! voting.js loaded");


/* =========================================================
   VOTING STATE
========================================================= */

let activeVotingGameCode = "";
let votingScreenOpen = false;
let votingPollTimer = null;
let votingBusy = false;
let votingFinished = false;
let votingLoading = false;
let votingCompleting = false;

let submittedVoteCategories = {};

let finalVotingResults = null;


/* =========================================================
   PHOTO CACHE
========================================================= */

const votingPhotoCache = {};


/* =========================================================
   GET CURRENT PLAYER
========================================================= */

function getVotingCurrentPlayer() {

    if (
        typeof currentPlayer !== "undefined" &&
        currentPlayer
    ) {
        return currentPlayer;
    }

    try {

        const saved =
            localStorage.getItem(
                "findItCurrentPlayer"
            );

        if (saved) {
            return JSON.parse(saved);
        }

    }
    catch (error) {

        console.error(
            "Unable to read saved player:",
            error
        );

    }

    try {

        const saved =
            localStorage.getItem(
                "findItPlayer"
            );

        if (saved) {
            return JSON.parse(saved);
        }

    }
    catch (error) {

        console.error(
            "Unable to read findItPlayer:",
            error
        );

    }

    return null;
}


/* =========================================================
   GET GAME CODE
========================================================= */

function getVotingGameCode() {

    if (activeVotingGameCode) {

        return String(
            activeVotingGameCode
        )
            .trim()
            .toUpperCase();

    }

    const player =
        getVotingCurrentPlayer();

    let gameCode =
        player &&
        (
            player.gameCode ||
            player.GameCode
        );


    if (!gameCode) {

        try {

            const saved =
                localStorage.getItem(
                    "findItCurrentPlayer"
                );

            if (saved) {

                const parsed =
                    JSON.parse(saved);

                gameCode =
                    parsed.gameCode ||
                    parsed.GameCode;

            }

        }
        catch (error) {

            console.error(
                "Unable to read current player game code:",
                error
            );

        }

    }


    if (!gameCode) {

        try {

            const saved =
                localStorage.getItem(
                    "findItPlayer"
                );

            if (saved) {

                const parsed =
                    JSON.parse(saved);

                gameCode =
                    parsed.gameCode ||
                    parsed.GameCode;

            }

        }
        catch (error) {

            console.error(
                "Unable to read saved game code:",
                error
            );

        }

    }


    if (!gameCode) {

        try {

            gameCode =
                localStorage.getItem(
                    "findItGameCode"
                ) ||
                localStorage.getItem(
                    "gameCode"
                ) ||
                localStorage.getItem(
                    "GameCode"
                );

        }
        catch (error) {

            console.warn(
                "Unable to read stored game code:",
                error
            );

        }

    }


    gameCode =
        String(
            gameCode || ""
        )
            .trim()
            .toUpperCase();


    if (gameCode) {

        activeVotingGameCode =
            gameCode;

    }


    console.log(
        "VOTING GAME CODE:",
        gameCode
    );


    return gameCode;
}


/* =========================================================
   REQUIRE GAME CODE
========================================================= */

function requireVotingGameCode() {

    const gameCode =
        getVotingGameCode();


    if (!gameCode) {

        console.error(
            "VOTING GAME CODE MISSING"
        );

        throw new Error(
            "Game code is missing. Unable to continue voting."
        );

    }


    return gameCode;
}


/* =========================================================
   GET PLAYER ID
========================================================= */

function getVotingPlayerId() {

    const player =
        getVotingCurrentPlayer();

    return String(
        player &&
        (
            player.playerId ||
            player.PlayerID ||
            player.id ||
            ""
        )
        || ""
    )
        .trim();
}


/* =========================================================
   GET PLAYER NAME
========================================================= */

function getVotingPlayerName() {

    const player =
        getVotingCurrentPlayer();

    return String(
        player &&
        (
            player.playerName ||
            player.PlayerName ||
            player.name ||
            ""
        )
        || ""
    )
        .trim();
}


/* =========================================================
   HIDE OPEN VOTING BUTTON
========================================================= */

function hideOpenVotingButton() {

    const ids = [
        "openVotingButton",
        "openVotingBtn",
        "hostOpenVotingButton",
        "hostOpenVotingBtn"
    ];


    ids.forEach(
        function(id) {

            const element =
                document.getElementById(id);

            if (element) {

                element.style.display =
                    "none";

            }

        }
    );


    document.querySelectorAll("button")
        .forEach(
            function(button) {

                const text =
                    String(
                        button.textContent || ""
                    )
                        .trim()
                        .toLowerCase();

                if (
                    text.includes("open voting")
                ) {

                    button.style.display =
                        "none";

                }

            }
        );

}


/* =========================================================
   HIDE HOST VOTING MESSAGE
========================================================= */

function hideHostVotingMessage() {

    const message =
        document.getElementById(
            "hostVotingMessage"
        );

    if (message) {

        message.style.display =
            "none";

    }

}


/* =========================================================
   REMOVE LOADING ENTRIES MESSAGE
========================================================= */

function hideVotingLoadingMessage() {

    /*
     * Handle common loading element IDs.
     */

    const ids = [
        "votingLoading",
        "votingLoadingMessage",
        "votingEntriesLoading",
        "loadingEntries",
        "loadingVoting"
    ];


    ids.forEach(
        function(id) {

            const element =
                document.getElementById(id);

            if (element) {

                element.style.display =
                    "none";

                element.style.visibility =
                    "hidden";

            }

        }
    );


    /*
     * Also remove any element whose visible text
     * is exactly "Loading entries..."
     */

    document.querySelectorAll("*")
        .forEach(
            function(element) {

                if (
                    element.children.length === 0 &&
                    String(
                        element.textContent || ""
                    )
                        .trim()
                        .toLowerCase() ===
                    "loading entries..."
                ) {

                    element.style.display =
                        "none";

                }

            }
        );

}


/* =========================================================
   HIDE ALL SCREENS
========================================================= */

function hideAllVotingScreens() {

    document.querySelectorAll(".screen")
        .forEach(
            function(screen) {

                screen.classList.remove("active");

                screen.style.display =
                    "none";

            }
        );

}


/* =========================================================
   FORCE VOTING SCREEN VISIBLE
========================================================= */

function forceVotingScreenVisible() {

    console.log(
        "FORCING VOTING SCREEN VISIBLE"
    );


    hideAllVotingScreens();


    const section =
        document.getElementById(
            "votingSection"
        );


    if (!section) {

        console.error(
            "ERROR: #votingSection NOT FOUND"
        );

        return false;

    }


    section.style.display =
        "block";

    section.style.visibility =
        "visible";

    section.style.opacity =
        "1";

    section.classList.add("active");


    const cards =
        document.getElementById(
            "votingCards"
        );


    if (cards) {

        cards.style.display =
            "block";

        cards.style.visibility =
            "visible";

        cards.style.opacity =
            "1";

    }


    hideVotingLoadingMessage();


    console.log(
        "VOTING SCREEN IS NOW VISIBLE"
    );


    return true;
}


/* =========================================================
   OPEN VOTING
========================================================= */

async function openVoting() {

    console.log(
        "================================="
    );

    console.log(
        "OPEN VOTING"
    );

    console.log(
        "================================="
    );


    if (votingFinished) {

        console.log(
            "Voting already finished."
        );

        return;

    }


    let gameCode;


    try {

        gameCode =
            requireVotingGameCode();

    }
    catch (error) {

        console.error(error);

        alert(error.message);

        return;

    }


    if (
        activeVotingGameCode !==
        gameCode
    ) {

        submittedVoteCategories = {};

        votingFinished = false;

        finalVotingResults = null;

    }


    activeVotingGameCode =
        gameCode;

    votingScreenOpen =
        true;

    votingCompleting =
        false;


    hideOpenVotingButton();

    hideHostVotingMessage();


    const screenShown =
        forceVotingScreenVisible();


    if (!screenShown) {

        votingScreenOpen =
            false;

        return;

    }


    try {

        await loadVotingData();

    }
    catch (error) {

        console.error(
            "Initial voting load failed:",
            error
        );

    }


    if (
        !votingFinished &&
        !votingCompleting
    ) {

        startVotingPolling();

    }


    console.log(
        "VOTING SCREEN OPEN"
    );
}


/* =========================================================
   EXTRACT ENTRIES
========================================================= */

function extractVotingEntries(result) {

    if (Array.isArray(result)) {

        return result;

    }

    if (
        result &&
        Array.isArray(result.entries)
    ) {

        return result.entries;

    }

    if (
        result &&
        Array.isArray(result.data)
    ) {

        return result.data;

    }

    if (
        result &&
        result.data &&
        Array.isArray(result.data.entries)
    ) {

        return result.data.entries;

    }

    if (
        result &&
        result.result &&
        Array.isArray(result.result.entries)
    ) {

        return result.result.entries;

    }

    return [];
}


/* =========================================================
   LOAD VOTING DATA
========================================================= */

async function loadVotingData() {

    if (
        votingFinished ||
        votingCompleting
    ) {

        return;

    }


    if (votingLoading) {

        console.log(
            "LOAD VOTING DATA IGNORED - already loading."
        );

        return;

    }


    if (!activeVotingGameCode) {

        activeVotingGameCode =
            getVotingGameCode();

    }


    if (!activeVotingGameCode) {

        console.error(
            "No active voting game."
        );

        return;

    }


    votingLoading =
        true;


    try {

        const result =
            await apiGet(
                "getEntries",
                {
                    gameCode:
                        activeVotingGameCode
                }
            );


        if (
            votingFinished ||
            votingCompleting
        ) {

            return;

        }


        console.log(
            "VOTING RAW RESULT:",
            result
        );


        const entries =
            extractVotingEntries(
                result
            );


        const normalisedEntries =
            entries
                .map(
                    function(entry) {

                        return normaliseVotingEntry(
                            entry
                        );

                    }
                )
                .filter(
                    function(entry) {

                        return (
                            entry &&
                            entry.status !==
                                "REJECTED"
                        );

                    }
                );


        /*
         * IMPORTANT:
         *
         * The API tells us whether all required
         * votes have been received.
         */

        if (
            result &&
            result.votingComplete === true
        ) {

            console.log(
                "ALL REQUIRED VOTES ARE COMPLETE."
            );

            await handleVotingComplete();

            return;

        }


        /*
         * We have successfully received the
         * entries, so remove ALL loading messages.
         */

        hideVotingLoadingMessage();


        if (
            !votingFinished &&
            !votingCompleting
        ) {

            renderVoting(
                normalisedEntries
            );

        }


        if (
            result &&
            result.votesReceived !==
                undefined
        ) {

            console.log(
                "VOTING PROGRESS:",
                result.votesReceived +
                "/" +
                result.votesRequired
            );

        }

    }
    catch (error) {

        if (
            votingFinished ||
            votingCompleting
        ) {

            return;

        }


        console.error(
            "LOAD VOTING DATA ERROR:",
            error
        );


        const container =
            document.getElementById(
                "votingCards"
            );


        if (container) {

            container.innerHTML =
                `
                <div style="
                    text-align:center;
                    padding:20px;
                ">
                    Unable to load voting photos.
                    <br><br>
                    ${escapeVotingHtml(
                        error.message ||
                        "Unknown error"
                    )}
                </div>
                `;

        }

    }
    finally {

        votingLoading =
            false;

    }
}


/* =========================================================
   NORMALISE VOTING ENTRY
========================================================= */

function normaliseVotingEntry(entry) {

    if (!entry) {

        return null;

    }


    const normalised = {

        entryId:
            entry.entryId ||
            entry.EntryID ||
            entry.id ||
            "",

        gameCode:
            entry.gameCode ||
            entry.GameCode ||
            "",

        playerId:
            entry.playerId ||
            entry.PlayerID ||
            "",

        playerName:
            entry.playerName ||
            entry.PlayerName ||
            entry.name ||
            "Player",

        categoryId:
            entry.categoryId ||
            entry.CategoryID ||
            "",

        categoryNumber:
            entry.categoryNumber ||
            entry.CategoryNumber ||
            "",

        categoryName:
            entry.categoryName ||
            entry.CategoryName ||
            entry.description ||
            entry.Description ||
            "",

        status:
            String(
                entry.status ||
                entry.Status ||
                ""
            )
                .trim()
                .toUpperCase(),

        photoId:
            cleanVotingPhotoId(
                entry.photoId ||
                entry.PhotoID ||
                ""
            ),

        photoUrl:
            entry.photoUrl ||
            entry.PhotoURL ||
            "",

        submitted:
            entry.submitted ||
            entry.Submitted ||
            ""

    };


    normalised.displayPhotoUrl =
        "";


    return normalised;
}


/* =========================================================
   CLEAN PHOTO ID
========================================================= */

function cleanVotingPhotoId(photoId) {

    return String(
        photoId || ""
    )
        .replace(
            /^["']+/,
            ""
        )
        .replace(
            /["']+$/,
            ""
        )
        .trim();
}


/* =========================================================
   CATEGORY KEY
========================================================= */

function getVotingCategoryKey(entry) {

    if (!entry) {

        return "";

    }


    const categoryId =
        String(
            entry.categoryId ||
            entry.CategoryID ||
            ""
        )
            .trim();


    if (categoryId) {

        return categoryId;

    }


    return String(
        entry.categoryNumber ||
        entry.CategoryNumber ||
        ""
    )
        .trim();
}


/* =========================================================
   CATEGORY ALREADY VOTED
========================================================= */

function hasVotedCategory(categoryKey) {

    categoryKey =
        String(
            categoryKey || ""
        )
            .trim();


    if (!categoryKey) {

        return false;

    }


    return (
        submittedVoteCategories[
            categoryKey
        ] === true
    );
}


/* =========================================================
   MARK CATEGORY VOTED
========================================================= */

function markCategoryVoted(categoryKey) {

    categoryKey =
        String(
            categoryKey || ""
        )
            .trim();


    if (!categoryKey) {

        return;

    }


    submittedVoteCategories[
        categoryKey
    ] = true;


    console.log(
        "CATEGORY MARKED AS VOTED:",
        categoryKey
    );
}


/* =========================================================
   DISABLE ALL VOTE BUTTONS
========================================================= */

function disableAllVotingButtons(text) {

    document.querySelectorAll(
        "#votingCards button"
    )
        .forEach(
            function(button) {

                button.disabled =
                    true;

                if (text) {

                    button.textContent =
                        text;

                }

                button.style.pointerEvents =
                    "none";

                button.style.opacity =
                    "0.6";

            }
        );

}


/* =========================================================
   LOAD VOTING PHOTO
========================================================= */

async function loadVotingPhoto(
    imageElement,
    photoId
) {

    if (!imageElement) {

        throw new Error(
            "Voting image element was not supplied."
        );

    }


    photoId =
        cleanVotingPhotoId(
            photoId
        );


    if (!photoId) {

        throw new Error(
            "No PhotoID was supplied."
        );

    }


    /*
     * If this photo has already been loaded,
     * use the cached data immediately.
     */

    if (
        votingPhotoCache[photoId]
    ) {

        if (
            imageElement.isConnected
        ) {

            imageElement.src =
                votingPhotoCache[photoId];

            imageElement.style.display =
                "block";

            imageElement.style.opacity =
                "1";

        }

        return true;

    }


    try {

        console.log(
            "LOADING VOTING PHOTO:",
            photoId
        );


        const result =
            await apiGet(
                "getPhoto",
                {
                    photoId:
                        photoId
                }
            );


        if (
            !imageElement.isConnected
        ) {

            return false;

        }


        if (!result) {

            throw new Error(
                "getPhoto returned no response."
            );

        }


        if (
            result.success === false
        ) {

            throw new Error(
                result.error ||
                result.message ||
                "Unable to load photo."
            );

        }


        if (!result.base64) {

            throw new Error(
                "getPhoto returned no image data."
            );

        }


        const mimeType =
            result.mimeType ||
            result.mime ||
            "image/jpeg";


        const dataUrl =
            "data:" +
            mimeType +
            ";base64," +
            result.base64;


        /*
         * Cache the complete image.
         */

        votingPhotoCache[photoId] =
            dataUrl;


        imageElement.src =
            dataUrl;

        imageElement.style.display =
            "block";

        imageElement.style.opacity =
            "1";


        console.log(
            "VOTING PHOTO LOADED:",
            photoId
        );


        return true;

    }
    catch (error) {

        if (
            !imageElement.isConnected
        ) {

            return false;

        }


        imageElement.style.display =
            "none";


        const wrapper =
            imageElement.parentElement;


        if (
            wrapper &&
            !wrapper.querySelector(
                ".voting-photo-missing"
            )
        ) {

            const missing =
                document.createElement(
                    "div"
                );


            missing.className =
                "voting-photo-missing";


            missing.textContent =
                "📷 Photo unavailable";


            wrapper.appendChild(
                missing
            );

        }


        console.error(
            "VOTING PHOTO LOAD FAILED:",
            photoId,
            error
        );


        return false;

    }
}


/* =========================================================
   RENDER VOTING
========================================================= */

function renderVoting(entries) {

    if (
        votingFinished ||
        votingCompleting
    ) {

        return;

    }


    const container =
        document.getElementById(
            "votingCards"
        );


    if (!container) {

        console.error(
            "votingCards not found."
        );

        return;

    }


    /*
     * The API has successfully returned.
     * Remove any loading message.
     */

    hideVotingLoadingMessage();


    container.innerHTML =
        "";


    if (
        !entries ||
        !entries.length
    ) {

        container.innerHTML =
            `
            <div style="
                text-align:center;
                padding:20px;
            ">
                <strong>
                    No photos have been submitted yet.
                </strong>
            </div>
            `;

        return;

    }


    const categories =
        {};


    entries.forEach(
        function(entry) {

            const key =
                String(
                    entry.categoryId ||
                    entry.categoryNumber ||
                    "unknown"
                );


            if (!categories[key]) {

                categories[key] =
                    [];

            }


            categories[key].push(
                entry
            );

        }
    );


    Object.keys(categories)
        .sort(
            function(a, b) {

                const na =
                    Number(a);

                const nb =
                    Number(b);


                if (
                    !Number.isNaN(na) &&
                    !Number.isNaN(nb)
                ) {

                    return na - nb;

                }


                return String(a)
                    .localeCompare(
                        String(b)
                    );

            }
        )
        .forEach(
            function(categoryKey) {

                const categoryEntries =
                    categories[
                        categoryKey
                    ];


                const firstEntry =
                    categoryEntries[0];


                const title =
                    document.createElement(
                        "div"
                    );


                title.className =
                    "voting-category-title";


                const categoryNumber =
                    firstEntry.categoryNumber;


                const categoryName =
                    firstEntry.categoryName ||
                    "";


                title.textContent =
                    categoryNumber
                        ? "Challenge " +
                          categoryNumber +
                          (
                              categoryName
                                  ? " • " +
                                    categoryName
                                  : ""
                          )
                        : (
                            categoryName ||
                            "Challenge"
                        );


                container.appendChild(
                    title
                );


                const grid =
                    document.createElement(
                        "div"
                    );


                grid.className =
                    "findit-photo-grid";


                categoryEntries.forEach(
                    function(entry) {

                        const card =
                            createVotingPhotoCard(
                                entry,
                                getVotingPlayerId()
                            );


                        if (card) {

                            grid.appendChild(
                                card
                            );

                        }

                    }
                );


                container.appendChild(
                    grid
                );

            }
        );

}


/* =========================================================
   CREATE VOTING PHOTO CARD
========================================================= */

function createVotingPhotoCard(
    entry,
    currentPlayerId
) {

    const card =
        document.createElement(
            "div"
        );


    card.className =
        "findit-photo-card";


    const playerId =
        String(
            entry.playerId || ""
        )
            .trim();


    const playerName =
        entry.playerName ||
        "Player";


    const photoId =
        cleanVotingPhotoId(
            entry.photoId ||
            entry.PhotoID ||
            ""
        );


    const categoryKey =
        getVotingCategoryKey(
            entry
        );


    const photoWrapper =
        document.createElement(
            "div"
        );


    photoWrapper.className =
        "findit-photo-wrapper";


    if (photoId) {

        const image =
            document.createElement(
                "img"
            );


        image.className =
            "findit-photo";


        image.alt =
            "Photo by " +
            playerName;


        image.loading =
            "eager";

        image.decoding =
            "async";


        image.style.display =
            "block";

        image.style.width =
            "100%";

        image.style.height =
            "auto";

        image.style.minHeight =
            "120px";


        /*
         * Add the image first so loadVotingPhoto()
         * can safely update it.
         */

        photoWrapper.appendChild(
            image
        );


        loadVotingPhoto(
            image,
            photoId
        );

    }
    else {

        const missing =
            document.createElement(
                "div"
            );


        missing.className =
            "voting-photo-missing";


        missing.textContent =
            "📷 Photo unavailable";


        photoWrapper.appendChild(
            missing
        );

    }


    card.appendChild(
        photoWrapper
    );


    const details =
        document.createElement(
            "div"
        );


    details.className =
        "findit-photo-details";


    const player =
        document.createElement(
            "div"
        );


    player.className =
        "findit-photo-player";


    player.textContent =
        playerName;


    details.appendChild(
        player
    );


    const challenge =
        document.createElement(
            "div"
        );


    challenge.className =
        "findit-photo-challenge";


    const categoryNumber =
        entry.categoryNumber ||
        "";


    const categoryName =
        entry.categoryName ||
        "";


    challenge.textContent =
        categoryNumber
            ? "Challenge " +
              categoryNumber +
              (
                  categoryName
                      ? " • " +
                        categoryName
                      : ""
              )
            : (
                categoryName ||
                "Challenge"
            );


    details.appendChild(
        challenge
    );


    const isOwnPhoto =
        playerId ===
        String(
            currentPlayerId || ""
        )
            .trim();


    if (isOwnPhoto) {

        const ownPhoto =
            document.createElement(
                "div"
            );


        ownPhoto.className =
            "findit-own-photo";


        ownPhoto.textContent =
            "Your photo";


        details.appendChild(
            ownPhoto
        );

    }


    card.appendChild(
        details
    );


    const voteButton =
        document.createElement(
            "button"
        );


    voteButton.type =
        "button";


    voteButton.className =
        "findit-photo-action";


    if (
        hasVotedCategory(
            categoryKey
        )
    ) {

        voteButton.disabled =
            true;

        voteButton.textContent =
            "✓ Vote recorded";

        voteButton.style.opacity =
            "0.6";

        voteButton.style.pointerEvents =
            "none";

    }
    else {

        voteButton.textContent =
            "🏆 VOTE";


        voteButton.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                event.stopPropagation();


                if (
                    votingBusy ||
                    votingFinished ||
                    votingCompleting ||
                    hasVotedCategory(
                        categoryKey
                    )
                ) {

                    return;

                }


                castVote(
                    entry,
                    voteButton
                );

            }
        );

    }


    card.appendChild(
        voteButton
    );


    return card;
}


/* =========================================================
   CAST VOTE
========================================================= */

async function castVote(
    entry,
    voteButton
) {

    if (
        votingBusy ||
        votingFinished ||
        votingCompleting
    ) {

        return;

    }


    let gameCode;


    try {

        gameCode =
            requireVotingGameCode();

    }
    catch (error) {

        alert(
            error.message
        );

        return;

    }


    const playerId =
        getVotingPlayerId();


    const entryId =
        String(
            entry &&
            (
                entry.entryId ||
                entry.EntryID ||
                entry.id ||
                ""
            )
        )
            .trim();


    const categoryId =
        String(
            entry &&
            (
                entry.categoryId ||
                entry.CategoryID ||
                ""
            )
        )
            .trim();


    const categoryNumber =
        Number(
            entry &&
            (
                entry.categoryNumber ||
                entry.CategoryNumber ||
                0
            )
        );


    const categoryKey =
        getVotingCategoryKey(
            entry
        );


    if (
        hasVotedCategory(
            categoryKey
        )
    ) {

        return;

    }


    if (!playerId) {

        alert(
            "Player not found."
        );

        return;

    }


    if (!entryId) {

        alert(
            "Photo entry not found."
        );

        return;

    }


    if (!categoryId) {

        alert(
            "Category not found."
        );

        return;

    }


    votingBusy =
        true;


    markCategoryVoted(
        categoryKey
    );


    disableAllVotingButtons(
        "Voting..."
    );


    try {

        console.log(
            "SUBMITTING VOTE:",
            {
                gameCode,
                playerId,
                entryId,
                categoryId,
                categoryNumber
            }
        );


        const result =
            await apiPost(
                "submitVote",
                {
                    gameCode,
                    playerId,
                    entryId,
                    categoryId,
                    categoryNumber
                }
            );


        console.log(
            "VOTE RESULT:",
            result
        );


        if (
            !result ||
            result.success !== true
        ) {

            const message =
                String(
                    result &&
                    (
                        result.message ||
                        result.error ||
                        ""
                    )
                );


            if (
                message
                    .toLowerCase()
                    .includes(
                        "already voted"
                    )
            ) {

                markCategoryVoted(
                    categoryKey
                );

                await checkVotingCompletionAfterVote();

                return;

            }


            throw new Error(
                message ||
                "Vote could not be submitted."
            );

        }


        markCategoryVoted(
            categoryKey
        );


        if (voteButton) {

            voteButton.textContent =
                "✓ Vote recorded";

        }


        if (
            result.votingComplete === true
        ) {

            console.log(
                "FINAL VOTE ACCEPTED."
            );


            await handleVotingComplete();

            return;

        }


        await checkVotingCompletionAfterVote();

    }
    catch (error) {

        console.error(
            "CAST VOTE ERROR:",
            error
        );


        const message =
            String(
                error &&
                error.message ||
                ""
            );


        if (
            !message
                .toLowerCase()
                .includes(
                    "already voted"
                )
        ) {

            delete submittedVoteCategories[
                categoryKey
            ];

        }


        if (
            !votingFinished &&
            !votingCompleting
        ) {

            restoreVotingButtons();

        }


        alert(
            error.message ||
            "Unable to submit vote."
        );

    }
    finally {

        votingBusy =
            false;

    }
}


/* =========================================================
   CHECK COMPLETION AFTER VOTE
========================================================= */

async function checkVotingCompletionAfterVote() {

    if (
        votingFinished ||
        votingCompleting
    ) {

        return;

    }


    const gameCode =
        activeVotingGameCode ||
        getVotingGameCode();


    if (!gameCode) {

        console.error(
            "POST-VOTE CHECK: NO GAME CODE"
        );

        return;

    }


    try {

        const result =
            await apiGet(
                "getEntries",
                {
                    gameCode:
                        gameCode
                }
            );


        console.log(
            "POST-VOTE COMPLETION RESULT:",
            result
        );


        if (
            result &&
            result.votingComplete === true
        ) {

            await handleVotingComplete();

            return;

        }


        if (
            !votingFinished &&
            !votingCompleting
        ) {

            const entries =
                extractVotingEntries(
                    result
                );


            const normalisedEntries =
                entries
                    .map(
                        normaliseVotingEntry
                    )
                    .filter(
                        function(entry) {

                            return (
                                entry &&
                                entry.status !==
                                    "REJECTED"
                            );

                        }
                    );


            hideVotingLoadingMessage();

            renderVoting(
                normalisedEntries
            );

        }

    }
    catch (error) {

        console.error(
            "POST-VOTE COMPLETION CHECK FAILED:",
            error
        );


        if (
            !votingFinished &&
            !votingCompleting
        ) {

            restoreVotingButtons();

        }

    }
}


/* =========================================================
   RESTORE VOTING BUTTONS
========================================================= */

function restoreVotingButtons() {

    if (
        votingFinished ||
        votingCompleting
    ) {

        return;

    }


    document.querySelectorAll(
        "#votingCards button"
    )
        .forEach(
            function(button) {

                /*
                 * Don't re-enable a button which has
                 * already been recorded.
                 */

                if (
                    String(
                        button.textContent || ""
                    )
                        .includes(
                            "Vote recorded"
                        )
                ) {

                    return;

                }


                button.disabled =
                    false;

                button.style.pointerEvents =
                    "auto";

                button.style.opacity =
                    "1";


                if (
                    String(
                        button.textContent || ""
                    )
                        .toLowerCase()
                        .includes(
                            "voting..."
                        )
                ) {

                    button.textContent =
                        "🏆 VOTE";

                }

            }
        );
}


/* =========================================================
   FINAL RESULTS REQUEST
========================================================= */

async function requestFinalVotingResults(
    gameCode,
    attempt
) {

    gameCode =
        String(
            gameCode || ""
        )
            .trim()
            .toUpperCase();


    if (!gameCode) {

        throw new Error(
            "Cannot request final voting results - game code is missing."
        );

    }


    activeVotingGameCode =
        gameCode;


    attempt =
        Number(
            attempt || 1
        );


    const maxAttempts =
        4;


    console.log(
        "REQUEST FINAL VOTING RESULTS",
        gameCode,
        "ATTEMPT",
        attempt +
        "/" +
        maxAttempts
    );


    try {

        const result =
            await apiGet(
                "getVotingResults",
                {
                    gameCode:
                        gameCode
                }
            );


        console.log(
            "FINAL RESULTS API RESPONSE:",
            result
        );


        if (!result) {

            throw new Error(
                "No response returned from getVotingResults."
            );

        }


        if (
            result.success === false
        ) {

            throw new Error(
                result.message ||
                result.error ||
                "getVotingResults returned an error."
            );

        }


        let results =
            result;


        if (
            result.data &&
            typeof result.data === "object" &&
            !Array.isArray(result.data)
        ) {

            results =
                result.data;

        }
        else if (
            result.result &&
            typeof result.result === "object" &&
            !Array.isArray(result.result)
        ) {

            results =
                result.result;

        }


        const winningEntries =
            results.winningEntries ||
            results.winnerEntries ||
            results.categoryWinners ||
            [];


        const overallWinner =
            results.overallWinner ||
            results.overallWinningPlayer ||
            null;


        const overallWinningPhoto =
            results.overallWinningPhoto ||
            results.overallPhoto ||
            null;


        if (!overallWinner) {

            throw new Error(
                "Final results did not contain an overall winner."
            );

        }


        if (
            !Array.isArray(
                winningEntries
            )
        ) {

            throw new Error(
                "Final results did not contain winning photos."
            );

        }


        results.winningEntries =
            winningEntries;

        results.overallWinner =
            overallWinner;

        results.overallWinningPhoto =
            overallWinningPhoto;


        return results;

    }
    catch (error) {

        console.error(
            "FINAL RESULTS ATTEMPT " +
            attempt +
            " FAILED:",
            error
        );


        if (
            attempt >= maxAttempts
        ) {

            throw new Error(
                "Unable to load the final voting results after " +
                maxAttempts +
                " attempts.\n\n" +
                (
                    error.message ||
                    "Google Apps Script did not return valid results."
                )
            );

        }


        const delay =
            1000 *
            attempt;


        await new Promise(
            function(resolve) {

                setTimeout(
                    resolve,
                    delay
                );

            }
        );


        return requestFinalVotingResults(
            gameCode,
            attempt + 1
        );

    }
}


/* =========================================================
   GET FINAL VOTING RESULTS
========================================================= */

async function getFinalVotingResults() {

    let gameCode =
        activeVotingGameCode;


    if (!gameCode) {

        gameCode =
            getVotingGameCode();

    }


    gameCode =
        String(
            gameCode || ""
        )
            .trim()
            .toUpperCase();


    if (!gameCode) {

        throw new Error(
            "Game code not found while calculating winners."
        );

    }


    activeVotingGameCode =
        gameCode;


    const results =
        await requestFinalVotingResults(
            gameCode,
            1
        );


    finalVotingResults =
        results;


    return results;
}


/* =========================================================
   NORMALISE WINNING ENTRIES
========================================================= */

function normaliseWinningEntries(results) {

    if (!results) {

        return [];

    }


    let entries =
        results.winningEntries;


    if (!Array.isArray(entries)) {

        entries =
            results.winnerEntries;

    }


    if (!Array.isArray(entries)) {

        entries =
            results.entries;

    }


    if (!Array.isArray(entries)) {

        return [];

    }


    return entries
        .map(
            function(entry) {

                return normaliseVotingEntry(
                    entry
                );

            }
        )
        .filter(
            function(entry) {

                return !!entry;

            }
        );
}


/* =========================================================
   HANDLE VOTING COMPLETE
========================================================= */

async function handleVotingComplete() {

    if (
        votingFinished ||
        votingCompleting
    ) {

        console.log(
            "VOTING COMPLETE ALREADY BEING HANDLED."
        );

        return;

    }


    votingCompleting =
        true;

    votingFinished =
        true;

    votingScreenOpen =
        false;

    votingBusy =
        false;


    stopVotingPolling();


    disableAllVotingButtons(
        "✓ Voting complete"
    );


    try {

        const gameCode =
            requireVotingGameCode();


        const results =
            await requestFinalVotingResults(
                gameCode,
                1
            );


        finalVotingResults =
            results;


        const overallWinner =
            results.overallWinner;


        const winningEntries =
            normaliseWinningEntries(
                results
            );


        console.log(
            "OVERALL WINNER:",
            overallWinner
        );


        console.log(
            "CATEGORY WINNERS:",
            winningEntries
        );


        window.findItFinalVotingResults =
            results;


        window.findItOverallWinner =
            overallWinner;


        window.findItWinningEntries =
            winningEntries;


        window.findItOverallWinningPhoto =
            results.overallWinningPhoto ||
            null;


        const votingSection =
            document.getElementById(
                "votingSection"
            );


        if (votingSection) {

            votingSection.classList.remove(
                "active"
            );

            votingSection.style.display =
                "none";

        }


        if (
            typeof window.openHostWinnersControlScreen ===
            "function"
        ) {

            console.log(
                "OPENING HOST WINNERS CONTROL SCREEN"
            );


            window.openHostWinnersControlScreen(
                results
            );


            return;

        }


        const winnersScreen =
            document.getElementById(
                "hostWinnersControlScreen"
            );


        if (winnersScreen) {

            hideAllVotingScreens();


            winnersScreen.style.display =
                "block";

            winnersScreen.style.visibility =
                "visible";

            winnersScreen.style.opacity =
                "1";

            winnersScreen.classList.add(
                "active"
            );


            return;

        }


        throw new Error(
            "hostWinnersControlScreen was not found."
        );

    }
    catch (error) {

        console.error(
            "FINAL WINNER CALCULATION ERROR:",
            error
        );


        /*
         * Keep voting finished, but allow the host
         * to retry loading winners.
         */

        const votingCards =
            document.getElementById(
                "votingCards"
            );


        if (votingCards) {

            votingCards.innerHTML =
                `
                <div style="
                    text-align:center;
                    padding:25px;
                ">
                    <h2>🏆 Voting Complete</h2>

                    <p>
                        All votes have been recorded.
                    </p>

                    <p>
                        We are having trouble loading
                        the winners right now.
                    </p>

                    <button
                        type="button"
                        id="retryWinnerResultsButton"
                    >
                        SHOW WINNERS
                    </button>
                </div>
                `;


            const retryButton =
                document.getElementById(
                    "retryWinnerResultsButton"
                );


            if (retryButton) {

                retryButton.onclick =
                    async function() {

                        retryButton.disabled =
                            true;

                        retryButton.textContent =
                            "LOADING WINNERS...";


                        try {

                            const gameCode =
                                requireVotingGameCode();


                            votingCompleting =
                                true;


                            const results =
                                await requestFinalVotingResults(
                                    gameCode,
                                    1
                                );


                            finalVotingResults =
                                results;


                            window.findItFinalVotingResults =
                                results;

                            window.findItOverallWinner =
                                results.overallWinner;

                            window.findItWinningEntries =
                                normaliseWinningEntries(
                                    results
                                );

                            window.findItOverallWinningPhoto =
                                results.overallWinningPhoto ||
                                null;


                            const section =
                                document.getElementById(
                                    "votingSection"
                                );


                            if (section) {

                                section.style.display =
                                    "none";

                            }


                            if (
                                typeof window.openHostWinnersControlScreen ===
                                "function"
                            ) {

                                window.openHostWinnersControlScreen(
                                    results
                                );

                            }
                            else {

                                throw new Error(
                                    "Winner screen function is unavailable."
                                );

                            }

                        }
                        catch (retryError) {

                            console.error(
                                "RETRY WINNER LOAD FAILED:",
                                retryError
                            );


                            retryButton.disabled =
                                false;

                            retryButton.textContent =
                                "SHOW WINNERS";


                            alert(
                                retryError.message ||
                                "Unable to load winners."
                            );

                        }
                        finally {

                            votingCompleting =
                                false;

                        }

                    };

            }

        }
        else {

            alert(
                "Voting is complete, but the winners could not be loaded.\n\n" +
                (
                    error.message ||
                    "Unknown error"
                )
            );

        }

    }
    finally {

        votingCompleting =
            false;

    }
}


/* =========================================================
   START POLLING
========================================================= */

function startVotingPolling() {

    stopVotingPolling();


    if (
        votingFinished ||
        votingCompleting
    ) {

        return;

    }


    votingPollTimer =
        setInterval(
            function() {

                if (
                    votingScreenOpen &&
                    !votingBusy &&
                    !votingLoading &&
                    !votingFinished &&
                    !votingCompleting
                ) {

                    loadVotingData();

                }

            },
            5000
        );
}


/* =========================================================
   STOP POLLING
========================================================= */

function stopVotingPolling() {

    if (votingPollTimer) {

        clearInterval(
            votingPollTimer
        );

        votingPollTimer =
            null;

    }
}


/* =========================================================
   CLOSE VOTING
========================================================= */

function closeVoting() {

    votingScreenOpen =
        false;

    stopVotingPolling();
}


/* =========================================================
   RESET VOTING STATE
========================================================= */

function resetVotingState() {

    activeVotingGameCode =
        "";

    votingScreenOpen =
        false;

    votingBusy =
        false;

    votingLoading =
        false;

    votingFinished =
        false;

    votingCompleting =
        false;

    finalVotingResults =
        null;

    submittedVoteCategories =
        {};


    /*
     * Clear photo cache too when a completely
     * new game starts.
     */

    Object.keys(
        votingPhotoCache
    )
        .forEach(
            function(key) {

                delete votingPhotoCache[key];

            }
        );


    window.findItFinalVotingResults =
        null;

    window.findItOverallWinner =
        null;

    window.findItWinningEntries =
        null;

    window.findItOverallWinningPhoto =
        null;


    stopVotingPolling();
}


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeVotingHtml(value) {

    return String(
        value || ""
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
   WINDOW EXPORTS
========================================================= */

window.openVoting =
    openVoting;

window.loadVotingData =
    loadVotingData;

window.renderVoting =
    renderVoting;

window.createVotingPhotoCard =
    createVotingPhotoCard;

window.castVote =
    castVote;

window.getFinalVotingResults =
    getFinalVotingResults;

window.startVotingPolling =
    startVotingPolling;

window.stopVotingPolling =
    stopVotingPolling;

window.closeVoting =
    closeVoting;

window.resetVotingState =
    resetVotingState;

window.hideOpenVotingButton =
    hideOpenVotingButton;

window.hideHostVotingMessage =
    hideHostVotingMessage;

window.handleVotingComplete =
    handleVotingComplete;

window.loadVotingPhoto =
    loadVotingPhoto;


console.log(
    "Find It! voting.js ready"
);