/* =========================================================
   FIND IT!
   player.js

   PLAYER GAMEPLAY

   IMPORTANT:
   - Host is also a real player
   - Gameplay screen is #collectionScreen
   - Categories come from getGameCategories()
   - No hard-coded category count
   - Host is identified by hostPlayerId
   - Submitted OR passed counts as complete
   - Host controls appear only when everyone is complete
   - SCORING -> HOST gets START VOTING control
   - SCORING -> NON-HOST gets scoring screen
   - VOTING -> existing voting flow
   - No hostControlScreen exists
   - Challenge is passed safely to photos.js
   - Challenge is retained in playerCurrentCategory
   - Stale server status cannot move the game backwards
========================================================= */


/* =========================================================
   STATE
========================================================= */

let currentPlayerGame = null;
let currentPlayer = null;

let playerCategories = [];
let playerCurrentCategory = null;

let playerGameStatusTimer = null;
let playerGameStatusPolling = false;

let playerGameOpen = false;

let playerCompletedCategoryIds = new Set();
let playerCompletedCategoryNumbers = new Set();


/* =========================================================
   STATUS ORDER
========================================================= */

const PLAYER_GAME_STATUS_ORDER = {
    WAITING: 0,
    PLAYING: 1,
    SCORING: 2,
    VOTING: 3,
    FINISHED: 4
};


function shouldAcceptPlayerGameStatus(
    oldStatus,
    newStatus
) {

    const oldValue =
        PLAYER_GAME_STATUS_ORDER[
            String(oldStatus || "").toUpperCase()
        ];

    const newValue =
        PLAYER_GAME_STATUS_ORDER[
            String(newStatus || "").toUpperCase()
        ];


    if (
        oldValue === undefined ||
        newValue === undefined
    ) {

        return true;
    }


    if (
        newValue < oldValue
    ) {

        console.warn(
            "PLAYER: Ignoring stale game status:",
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

function normalisePlayerGame(game) {

    game =
        game || {};


    return {

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
                ""
            )
            .trim()
            .toUpperCase(),

        startTime:
            game.startTime ||
            game.StartTime ||
            "",

        endTime:
            game.endTime ||
            game.EndTime ||
            "",

        currentCategory:
            Number(
                game.currentCategory ??
                game.CurrentCategory ??
                0
            ),

        created:
            game.created ||
            game.Created ||
            "",

        players:
            Array.isArray(game.players)
                ? game.players
                : []
    };
}


/* =========================================================
   NORMALISE PLAYER
========================================================= */

function normalisePlayer(player) {

    player =
        player || {};


    return {

        playerId:
            String(
                player.playerId ||
                player.PlayerID ||
                ""
            )
            .trim(),

        gameCode:
            String(
                player.gameCode ||
                player.GameCode ||
                ""
            )
            .trim()
            .toUpperCase(),

        playerName:
            String(
                player.playerName ||
                player.PlayerName ||
                ""
            )
            .trim(),

        isHost:
            player.isHost === true ||
            player.IsHost === true ||
            String(
                player.isHost ||
                player.IsHost ||
                ""
            ).toLowerCase() === "true",

        joined:
            player.joined ??
            player.Joined ??
            "",

        completed:
            player.completed === true ||
            player.Completed === true ||
            String(
                player.completed ||
                player.Completed ||
                ""
            ).toLowerCase() === "true",

        passed:
            player.passed === true ||
            player.Passed === true ||
            String(
                player.passed ||
                player.Passed ||
                ""
            ).toLowerCase() === "true",

        score:
            Number(
                player.score ||
                player.Score ||
                0
            )
    };
}


/* =========================================================
   NORMALISE CATEGORY
========================================================= */

function normalisePlayerCategory(category) {

    category =
        category || {};


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
            )
            .trim()
            .toUpperCase()
    };
}


/* =========================================================
   HOST CHECK
========================================================= */

function isCurrentPlayerHost(
    game,
    player
) {

    game =
        game ||
        currentPlayerGame ||
        {};


    player =
        player ||
        currentPlayer ||
        {};


    const playerId =
        String(
            player.playerId ||
            ""
        )
        .trim();


    const hostPlayerId =
        String(
            game.hostPlayerId ||
            ""
        )
        .trim();


    if (
        player.isHost === true
    ) {

        return true;
    }


    if (
        playerId &&
        hostPlayerId &&
        playerId === hostPlayerId
    ) {

        return true;
    }


    return false;
}


/* =========================================================
   SAVE SESSION
========================================================= */

function savePlayerSession() {

    try {

        if (currentPlayer) {

            localStorage.setItem(
                "findItCurrentPlayer",
                JSON.stringify(
                    currentPlayer
                )
            );

            localStorage.setItem(
                "findItPlayer",
                JSON.stringify(
                    currentPlayer
                )
            );
        }


        if (currentPlayerGame) {

            localStorage.setItem(
                "findItGame",
                JSON.stringify(
                    currentPlayerGame
                )
            );
        }


        if (playerCurrentCategory) {

            localStorage.setItem(
                "findItCurrentCategory",
                JSON.stringify(
                    playerCurrentCategory
                )
            );
        }

    } catch (error) {

        console.error(
            "PLAYER: Could not save session:",
            error
        );
    }
}


/* =========================================================
   LOAD SAVED PLAYER
========================================================= */

function loadSavedPlayer() {

    try {

        const saved =
            localStorage.getItem(
                "findItCurrentPlayer"
            ) ||
            localStorage.getItem(
                "findItPlayer"
            );


        if (!saved) {

            return null;
        }


        const player =
            normalisePlayer(
                JSON.parse(saved)
            );


        if (!player.playerId) {

            return null;
        }


        return player;

    } catch (error) {

        console.error(
            "PLAYER: Could not restore player:",
            error
        );

        return null;
    }
}


/* =========================================================
   LOAD SAVED GAME
========================================================= */

function loadSavedPlayerGame() {

    try {

        const saved =
            localStorage.getItem(
                "findItGame"
            );


        if (!saved) {

            return null;
        }


        const game =
            normalisePlayerGame(
                JSON.parse(saved)
            );


        if (!game.gameCode) {

            return null;
        }


        return game;

    } catch (error) {

        console.error(
            "PLAYER: Could not restore game:",
            error
        );

        return null;
    }
}


/* =========================================================
   LOAD SAVED CATEGORY
========================================================= */

function loadSavedPlayerCategory() {

    try {

        const saved =
            localStorage.getItem(
                "findItCurrentCategory"
            );


        if (!saved) {

            return null;
        }


        const category =
            normalisePlayerCategory(
                JSON.parse(saved)
            );


        if (
            !category.categoryId &&
            !category.categoryNumber
        ) {

            return null;
        }


        return category;

    } catch (error) {

        console.error(
            "PLAYER: Could not restore category:",
            error
        );

        return null;
    }
}


/* =========================================================
   LOAD PLAYERS
========================================================= */

async function loadPlayerGamePlayers(
    game,
    player
) {

    game =
        normalisePlayerGame(game);


    player =
        normalisePlayer(player);


    if (!game.gameCode) {

        return [];
    }


    let serverPlayers = [];


    try {

        const result =
            await apiGet(
                "getPlayers",
                {
                    gameCode:
                        game.gameCode
                }
            );


        if (Array.isArray(result)) {

            serverPlayers =
                result.map(
                    normalisePlayer
                );

        } else if (
            result &&
            Array.isArray(result.players)
        ) {

            serverPlayers =
                result.players.map(
                    normalisePlayer
                );
        }

    } catch (error) {

        console.error(
            "PLAYER: Could not get players:",
            error
        );
    }


    const mergedPlayers = [];
    const seen = new Set();


    function addPlayer(item) {

        if (!item) {

            return;
        }


        const normalised =
            normalisePlayer(item);


        if (!normalised.playerId) {

            return;
        }


        if (
            seen.has(
                normalised.playerId
            )
        ) {

            return;
        }


        seen.add(
            normalised.playerId
        );


        mergedPlayers.push(
            normalised
        );
    }


    serverPlayers.forEach(
        addPlayer
    );


    /* -----------------------------------------------------
       ENSURE HOST EXISTS
    ----------------------------------------------------- */

    if (
        game.hostPlayerId &&
        !seen.has(
            game.hostPlayerId
        )
    ) {

        addPlayer({

            playerId:
                game.hostPlayerId,

            gameCode:
                game.gameCode,

            playerName:
                game.hostName ||
                "Host",

            isHost:
                true
        });
    }


    /* -----------------------------------------------------
       ENSURE CURRENT PLAYER EXISTS
    ----------------------------------------------------- */

    if (
        player.playerId &&
        !seen.has(
            player.playerId
        )
    ) {

        addPlayer(player);
    }


    /* -----------------------------------------------------
       FORCE HOST FLAG
    ----------------------------------------------------- */

    mergedPlayers.forEach(
        function(item) {

            if (
                game.hostPlayerId &&
                String(
                    item.playerId
                ).trim() ===
                String(
                    game.hostPlayerId
                ).trim()
            ) {

                item.isHost =
                    true;
            }
        }
    );


    if (
        player.playerId &&
        game.hostPlayerId &&
        player.playerId ===
        game.hostPlayerId
    ) {

        currentPlayer.isHost =
            true;
    }


    game.players =
        mergedPlayers;


    currentPlayerGame =
        game;


    return mergedPlayers;
}


/* =========================================================
   LOAD CATEGORIES
========================================================= */

async function loadPlayerCategories(
    game
) {

    game =
        normalisePlayerGame(game);


    if (!game.gameCode) {

        playerCategories =
            [];

        return [];
    }


    try {

        const result =
            await apiGet(
                "getGameCategories",
                {
                    gameCode:
                        game.gameCode
                }
            );


        let categories = [];


        if (
            result &&
            Array.isArray(
                result.categories
            )
        ) {

            categories =
                result.categories;

        } else if (
            Array.isArray(result)
        ) {

            categories =
                result;
        }


        playerCategories =
            categories
                .map(
                    normalisePlayerCategory
                )
                .filter(
                    function(category) {

                        return (
                            category.categoryId !==
                            "" ||
                            category.categoryNumber
                        );
                    }
                )
                .sort(
                    function(a, b) {

                        return (
                            a.categoryNumber -
                            b.categoryNumber
                        );
                    }
                );


        console.log(
            "PLAYER: Categories loaded:",
            playerCategories
        );


        return playerCategories;

    } catch (error) {

        console.error(
            "PLAYER: Could not load categories:",
            error
        );

        playerCategories =
            [];

        return [];
    }
}


/* =========================================================
   LOAD PLAYER PROGRESS
========================================================= */

async function loadPlayerProgress(
    game,
    player
) {

    game =
        normalisePlayerGame(game);


    player =
        normalisePlayer(player);


    playerCompletedCategoryIds =
        new Set();


    playerCompletedCategoryNumbers =
        new Set();


    if (
        !game.gameCode ||
        !player.playerId
    ) {

        return;
    }


    /* -----------------------------------------------------
       ENTRIES
    ----------------------------------------------------- */

    try {

        const result =
            await apiGet(
                "getEntries",
                {
                    gameCode:
                        game.gameCode
                }
            );


        let entries = [];


        if (
            result &&
            Array.isArray(
                result.entries
            )
        ) {

            entries =
                result.entries;

        } else if (
            Array.isArray(result)
        ) {

            entries =
                result;
        }


        entries.forEach(
            function(entry) {

                const entryPlayerId =
                    String(
                        entry.playerId ||
                        entry.PlayerID ||
                        ""
                    )
                    .trim();


                if (
                    entryPlayerId !==
                    player.playerId
                ) {

                    return;
                }


                const categoryId =
                    entry.categoryId ??
                    entry.CategoryID ??
                    "";


                const categoryNumber =
                    Number(
                        entry.categoryNumber ??
                        entry.CategoryNumber ??
                        0
                    );


                if (
                    categoryId !== ""
                ) {

                    playerCompletedCategoryIds.add(
                        String(categoryId)
                    );
                }


                if (
                    categoryNumber
                ) {

                    playerCompletedCategoryNumbers.add(
                        categoryNumber
                    );
                }
            }
        );

    } catch (error) {

        console.error(
            "PLAYER: Could not load entries:",
            error
        );
    }


    /* -----------------------------------------------------
       PASSES
    ----------------------------------------------------- */

    try {

        const result =
            await apiGet(
                "getPasses",
                {
                    gameCode:
                        game.gameCode
                }
            );


        let passes = [];


        if (
            result &&
            Array.isArray(
                result.passes
            )
        ) {

            passes =
                result.passes;

        } else if (
            Array.isArray(result)
        ) {

            passes =
                result;
        }


        passes.forEach(
            function(pass) {

                const passPlayerId =
                    String(
                        pass.playerId ||
                        pass.PlayerID ||
                        ""
                    )
                    .trim();


                if (
                    passPlayerId !==
                    player.playerId
                ) {

                    return;
                }


                const categoryId =
                    pass.categoryId ??
                    pass.CategoryID ??
                    "";


                const categoryNumber =
                    Number(
                        pass.categoryNumber ??
                        pass.CategoryNumber ??
                        0
                    );


                if (
                    categoryId !== ""
                ) {

                    playerCompletedCategoryIds.add(
                        String(categoryId)
                    );
                }


                if (
                    categoryNumber
                ) {

                    playerCompletedCategoryNumbers.add(
                        categoryNumber
                    );
                }
            }
        );

    } catch (error) {

        console.error(
            "PLAYER: Could not get passes:",
            error
        );
    }
}


/* =========================================================
   CATEGORY COMPLETE
========================================================= */

function isPlayerCategoryComplete(
    category
) {

    if (!category) {

        return false;
    }


    const categoryId =
        String(
            category.categoryId ||
            ""
        )
        .trim();


    const categoryNumber =
        Number(
            category.categoryNumber ||
            0
        );


    if (
        categoryId &&
        playerCompletedCategoryIds.has(
            categoryId
        )
    ) {

        return true;
    }


    if (
        categoryNumber &&
        playerCompletedCategoryNumbers.has(
            categoryNumber
        )
    ) {

        return true;
    }


    return false;
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapePlayerHtml(
    value
) {

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
   RENDER CATEGORY CARDS
========================================================= */

function renderPlayerCategoryCards(
    categories
) {

    const container =
        document.getElementById(
            "categoryCards"
        );


    if (!container) {

        console.error(
            "PLAYER: categoryCards not found."
        );

        return;
    }


    categories =
        Array.isArray(categories)
            ? categories
            : playerCategories;


    container.innerHTML =
        "";


    if (!categories.length) {

        container.innerHTML =
            '<div class="category-empty">Loading challenges...</div>';

        return;
    }


    let completedCount =
        0;


    categories.forEach(
        function(category, index) {

            const complete =
                isPlayerCategoryComplete(
                    category
                );


            if (complete) {

                completedCount++;
            }


            const card =
                document.createElement(
                    "button"
                );


            card.type =
                "button";


            card.className =
                "category-card";


            if (complete) {

                card.classList.add(
                    "completed"
                );

                card.disabled =
                    true;
            }


            const number =
                category.categoryNumber ||
                index + 1;


            const name =
                category.categoryName ||
                "Find It!";


            card.innerHTML =
                `
                <div class="category-number">
                    ${number}
                </div>

                <div class="category-name">
                    ${escapePlayerHtml(name)}
                </div>

                <div class="category-action">
                    ${
                        complete
                            ? "✓ Complete"
                            : "FIND IT →"
                    }
                </div>
                `;


            if (!complete) {

                card.addEventListener(
                    "click",
                    function(event) {

                        event.preventDefault();

                        console.log(
                            "PLAYER: FIND IT clicked:",
                            category
                        );

                        openPlayerCategory(
                            category
                        );
                    }
                );
            }


            container.appendChild(
                card
            );
        }
    );


    const total =
        categories.length;


    const progressText =
        document.getElementById(
            "collectionProgressText"
        );


    if (progressText) {

        progressText.textContent =
            completedCount +
            " / " +
            total;
    }


    const progressBar =
        document.getElementById(
            "collectionProgressBar"
        );


    if (progressBar) {

        const percent =
            total > 0
                ? Math.round(
                    (
                        completedCount /
                        total
                    ) *
                    100
                )
                : 0;


        progressBar.style.width =
            percent +
            "%";
    }
}


/* =========================================================
   REFRESH COLLECTION
========================================================= */

async function refreshPlayerCategories() {

    if (!currentPlayerGame) {

        return;
    }


    if (!currentPlayer) {

        return;
    }


    await loadPlayerCategories(
        currentPlayerGame
    );


    await loadPlayerProgress(
        currentPlayerGame,
        currentPlayer
    );


    renderPlayerCategoryCards(
        playerCategories
    );
}


/* =========================================================
   SET CURRENT CHALLENGE
========================================================= */

function setPlayerCurrentCategory(
    category
) {

    if (!category) {

        playerCurrentCategory =
            null;


        try {

            localStorage.removeItem(
                "findItCurrentCategory"
            );

        } catch (error) {}


        return;
    }


    playerCurrentCategory =
        normalisePlayerCategory(
            category
        );


    if (
        !playerCurrentCategory.gameCode &&
        currentPlayerGame
    ) {

        playerCurrentCategory.gameCode =
            currentPlayerGame.gameCode;
    }


    try {

        localStorage.setItem(
            "findItCurrentCategory",
            JSON.stringify(
                playerCurrentCategory
            )
        );

    } catch (error) {

        console.error(
            "PLAYER: Could not save current category:",
            error
        );
    }


    console.log(
        "PLAYER: Current challenge set:",
        playerCurrentCategory
    );
}


/* =========================================================
   UPDATE PHOTO SCREEN CHALLENGE INFO
========================================================= */

function updatePlayerPhotoChallenge(
    category
) {

    if (!category) {

        return;
    }


    const title =
        document.getElementById(
            "uploadCategoryTitle"
        );


    const number =
        document.getElementById(
            "uploadCategoryNumber"
        );


    const name =
        document.getElementById(
            "uploadCategoryName"
        );


    const description =
        document.getElementById(
            "uploadCategoryDescription"
        );


    if (title) {

        title.textContent =
            "Find it!";
    }


    if (number) {

        number.textContent =
            category.categoryNumber ||
            "";
    }


    if (name) {

        name.textContent =
            category.categoryName ||
            "";
    }


    if (description) {

        description.textContent =
            category.description ||
            "";
    }
}


/* =========================================================
   OPEN CATEGORY

   IMPORTANT:
   player.js selects the challenge.

   photos.js owns:
   - camera
   - choose photo
   - capture
   - preview
   - submit
   - pass

   We therefore DO NOT call openPhotoUpload() here.
========================================================= */

function openPlayerCategory(
    category
) {

    if (!category) {

        console.error(
            "PLAYER: No category supplied."
        );

        return;
    }


    category =
        normalisePlayerCategory(
            category
        );


    if (
        isPlayerCategoryComplete(
            category
        )
    ) {

        console.log(
            "PLAYER: Category already complete."
        );

        return;
    }


    console.log(
        "PLAYER: Opening challenge:",
        category
    );


    /* -----------------------------------------------------
       1. Save challenge in player.js
    ----------------------------------------------------- */

    setPlayerCurrentCategory(
        category
    );


    /* -----------------------------------------------------
       2. Reset photos.js FIRST
    ----------------------------------------------------- */

    if (
        typeof window.resetPhotoUpload ===
        "function"
    ) {

        window.resetPhotoUpload();

    } else if (
        typeof window.resetPhotoUI ===
        "function"
    ) {

        window.resetPhotoUI();
    }


    /* -----------------------------------------------------
       3. Give the challenge to photos.js
    ----------------------------------------------------- */

    if (
        typeof window.setPhotoCategory ===
        "function"
    ) {

        window.setPhotoCategory(
            category
        );

    } else {

        console.warn(
            "PLAYER: setPhotoCategory() not found."
        );
    }


    /* -----------------------------------------------------
       4. Update challenge information
    ----------------------------------------------------- */

    updatePlayerPhotoChallenge(
        category
    );


    /* -----------------------------------------------------
       5. Let photos.js own the photo-upload transition
    ----------------------------------------------------- */

    if (
        typeof window.openPhotoUpload ===
        "function"
    ) {

        window.openPhotoUpload(
            category
        );

    } else if (
        typeof window.showScreen ===
        "function"
    ) {

        /* Fallback if photos.js is unavailable. */
        window.showScreen(
            "photoUploadScreen"
        );

    } else {

        console.error(
            "PLAYER: Photo upload screen controller is unavailable."
        );

        return;
    }


    console.log(
        "PLAYER: Photo challenge screen ready."
    );
}


/* =========================================================
   OPEN COLLECTION
========================================================= */

async function openPlayerCollectionScreen(
    game,
    player
) {

    currentPlayerGame =
        normalisePlayerGame(
            game
        );


    currentPlayer =
        normalisePlayer(
            player
        );


    if (
        currentPlayerGame.hostPlayerId &&
        currentPlayer.playerId ===
        currentPlayerGame.hostPlayerId
    ) {

        currentPlayer.isHost =
            true;
    }


    await loadPlayerGamePlayers(
        currentPlayerGame,
        currentPlayer
    );


    if (
        currentPlayerGame.hostPlayerId &&
        currentPlayer.playerId ===
        currentPlayerGame.hostPlayerId
    ) {

        currentPlayer.isHost =
            true;
    }


    savePlayerSession();


    const nameElement =
        document.getElementById(
            "collectionPlayerName"
        );


    if (nameElement) {

        nameElement.textContent =
            currentPlayer.playerName ||
            "";
    }


    await loadPlayerCategories(
        currentPlayerGame
    );


    await loadPlayerProgress(
        currentPlayerGame,
        currentPlayer
    );


    renderPlayerCategoryCards(
        playerCategories
    );


    showScreen(
        "collectionScreen"
    );


    setupHostCollectionControls();


    await checkAndUpdateHostControls();
}


/* =========================================================
   CHECK EVERYONE COMPLETE
========================================================= */

async function checkPlayerGameCompletion() {

    if (!currentPlayerGame) {

        return false;
    }


    const game =
        normalisePlayerGame(
            currentPlayerGame
        );


    if (
        !playerCategories.length
    ) {

        await loadPlayerCategories(
            game
        );
    }


    await loadPlayerGamePlayers(
        game,
        currentPlayer
    );


    let entries = [];
    let passes = [];


    /* -----------------------------------------------------
       ENTRIES
    ----------------------------------------------------- */

    try {

        const result =
            await apiGet(
                "getEntries",
                {
                    gameCode:
                        game.gameCode
                }
            );


        if (
            result &&
            Array.isArray(
                result.entries
            )
        ) {

            entries =
                result.entries;

        } else if (
            Array.isArray(result)
        ) {

            entries =
                result;
        }

    } catch (error) {

        console.error(
            "PLAYER: Could not get entries:",
            error
        );
    }


    /* -----------------------------------------------------
       PASSES
    ----------------------------------------------------- */

    try {

        const result =
            await apiGet(
                "getPasses",
                {
                    gameCode:
                        game.gameCode
                }
            );


        if (
            result &&
            Array.isArray(
                result.passes
            )
        ) {

            passes =
                result.passes;

        } else if (
            Array.isArray(result)
        ) {

            passes =
                result;
        }

    } catch (error) {

        console.error(
            "PLAYER: Could not get passes:",
            error
        );
    }


    const players =
        Array.isArray(game.players)
            ? game.players
            : [];


    const categoryCount =
        playerCategories.length ||
        Number(
            game.categoryCount ||
            1
        );


    let everyoneComplete =
        true;


    players.forEach(
        function(player) {

            const playerId =
                String(
                    player.playerId ||
                    player.PlayerID ||
                    ""
                )
                .trim();


            if (!playerId) {

                return;
            }


            const completedIds =
                new Set();


            const completedNumbers =
                new Set();


            entries.forEach(
                function(entry) {

                    const entryPlayerId =
                        String(
                            entry.playerId ||
                            entry.PlayerID ||
                            ""
                        )
                        .trim();


                    if (
                        entryPlayerId !==
                        playerId
                    ) {

                        return;
                    }


                    const id =
                        entry.categoryId ??
                        entry.CategoryID ??
                        "";


                    const number =
                        Number(
                            entry.categoryNumber ??
                            entry.CategoryNumber ??
                            0
                        );


                    if (id !== "") {

                        completedIds.add(
                            String(id)
                        );
                    }


                    if (number) {

                        completedNumbers.add(
                            number
                        );
                    }
                }
            );


            passes.forEach(
                function(pass) {

                    const passPlayerId =
                        String(
                            pass.playerId ||
                            pass.PlayerID ||
                            ""
                        )
                        .trim();


                    if (
                        passPlayerId !==
                        playerId
                    ) {

                        return;
                    }


                    const id =
                        pass.categoryId ??
                        pass.CategoryID ??
                        "";


                    const number =
                        Number(
                            pass.categoryNumber ??
                            pass.CategoryNumber ??
                            0
                        );


                    if (id !== "") {

                        completedIds.add(
                            String(id)
                        );
                    }


                    if (number) {

                        completedNumbers.add(
                            number
                        );
                    }
                }
            );


            let completed =
                0;


            playerCategories.forEach(
                function(category) {

                    const id =
                        String(
                            category.categoryId ||
                            ""
                        )
                        .trim();


                    const number =
                        Number(
                            category.categoryNumber ||
                            0
                        );


                    if (
                        (
                            id &&
                            completedIds.has(id)
                        ) ||
                        (
                            number &&
                            completedNumbers.has(number)
                        )
                    ) {

                        completed++;
                    }
                }
            );


            if (
                completed <
                categoryCount
            ) {

                everyoneComplete =
                    false;
            }
        }
    );


    console.log(
        "PLAYER: EVERYONE COMPLETE:",
        everyoneComplete
    );


    return everyoneComplete;
}


/* =========================================================
   HOST COLLECTION CONTROLS
========================================================= */

function updateHostCollectionControls(
    everyoneComplete
) {

    const controls =
        document.getElementById(
            "hostCollectionControls"
        );


    if (!controls) {

        return;
    }


    const host =
        isCurrentPlayerHost(
            currentPlayerGame,
            currentPlayer
        );


    if (
        !host ||
        !everyoneComplete
    ) {

        controls.classList.add(
            "hidden"
        );

        return;
    }


    controls.classList.remove(
        "hidden"
    );
}


/* =========================================================
   UPDATE HOST CONTROLS
========================================================= */

async function updatePlayerHostControls() {

    if (!currentPlayerGame) {

        return;
    }


    if (
        currentPlayerGame.status !==
        "PLAYING"
    ) {

        return;
    }


    if (
        !isCurrentPlayerHost(
            currentPlayerGame,
            currentPlayer
        )
    ) {

        updateHostCollectionControls(
            false
        );

        return;
    }


    const everyoneComplete =
        await checkPlayerGameCompletion();


    updateHostCollectionControls(
        everyoneComplete
    );
}


/* =========================================================
   CHECK HOST CONTROLS
========================================================= */

async function checkAndUpdateHostControls() {

    try {

        await updatePlayerHostControls();

    } catch (error) {

        console.error(
            "PLAYER: Host control update failed:",
            error
        );
    }
}


/* =========================================================
   HOST START SCORING
========================================================= */

async function playerHostStartScoring() {

    if (!currentPlayerGame) {

        return;
    }


    if (
        !isCurrentPlayerHost(
            currentPlayerGame,
            currentPlayer
        )
    ) {

        return;
    }


    try {

        const result =
            await apiPost(
                "startScoring",
                {
                    gameCode:
                        currentPlayerGame.gameCode
                }
            );


        console.log(
            "HOST: startScoring response:",
            result
        );


        let updatedGame =
            null;


        if (
            result &&
            result.game
        ) {

            updatedGame =
                normalisePlayerGame(
                    result.game
                );

        } else if (
            result &&
            result.gameCode
        ) {

            updatedGame =
                normalisePlayerGame(
                    result
                );
        }


        if (
            updatedGame &&
            shouldAcceptPlayerGameStatus(
                currentPlayerGame.status,
                updatedGame.status
            )
        ) {

            currentPlayerGame =
                updatedGame;

            savePlayerSession();
        }


        await playerGameStatusPoll();

    } catch (error) {

        console.error(
            "HOST: Could not start scoring:",
            error
        );
    }
}


/* =========================================================
   SETUP HOST COLLECTION CONTROLS
========================================================= */

function setupHostCollectionControls() {

    const button =
        document.getElementById(
            "scoreGameButton"
        );


    if (!button) {

        return;
    }


    if (
        button.dataset.playerHandlerAttached ===
        "true"
    ) {

        return;
    }


    button.dataset.playerHandlerAttached =
        "true";


    button.addEventListener(
        "click",
        async function() {

            if (
                button.disabled
            ) {

                return;
            }


            button.disabled =
                true;


            try {

                await playerHostStartScoring();

            } finally {

                if (
                    currentPlayerGame &&
                    currentPlayerGame.status ===
                    "PLAYING"
                ) {

                    button.disabled =
                        false;
                }
            }
        }
    );
}


/* =========================================================
   GAME STATUS POLLING
========================================================= */

async function playerGameStatusPoll() {

    if (
        playerGameStatusPolling
    ) {

        return;
    }


    if (!currentPlayerGame) {

        return;
    }


    playerGameStatusPolling =
        true;


    try {

        const previousStatus =
            currentPlayerGame.status;


        const result =
            await apiGet(
                "getGame",
                {
                    gameCode:
                        currentPlayerGame.gameCode
                }
            );


        const game =
            normalisePlayerGame(
                result
            );


        if (!game.gameCode) {

            return;
        }


        if (
            !shouldAcceptPlayerGameStatus(
                previousStatus,
                game.status
            )
        ) {

            return;
        }


        currentPlayerGame =
            game;


        savePlayerSession();


        console.log(
            "PLAYER: Game status:",
            game.status
        );


        /* -------------------------------------------------
           PLAYING
        ------------------------------------------------- */

        if (
            game.status ===
            "PLAYING"
        ) {

            if (!playerGameOpen) {

                playerGameOpen =
                    true;


                await openPlayerCollectionScreen(
                    game,
                    currentPlayer
                );

            } else {

                await refreshPlayerCategories();

                await checkAndUpdateHostControls();
            }


            return;
        }


        /* -------------------------------------------------
           SCORING
        ------------------------------------------------- */

        if (
            game.status ===
            "SCORING"
        ) {

            console.log(
                "PLAYER: Game status: SCORING"
            );


            if (
                isCurrentPlayerHost(
                    game,
                    currentPlayer
                )
            ) {

                if (
                    typeof window.showHostVotingButton ===
                    "function"
                ) {

                    window.showHostVotingButton();
                }

            } else {

                showScreen(
                    "scoringIntroScreen"
                );
            }


            return;
        }


        /* -------------------------------------------------
           VOTING
        ------------------------------------------------- */

        if (
            game.status ===
            "VOTING"
        ) {

            console.log(
                "PLAYER: Game status: VOTING"
            );


            if (
                isCurrentPlayerHost(
                    game,
                    currentPlayer
                )
            ) {

                if (
                    typeof window.showHostVotingButton ===
                    "function"
                ) {

                    window.showHostVotingButton(
                        true
                    );
                }

            } else {

                if (
                    typeof window.openVoting ===
                    "function"
                ) {

                    window.openVoting(
                        game
                    );

                } else {

                    showScreen(
                        "votingSection"
                    );
                }
            }


            return;
        }


        /* -------------------------------------------------
           FINISHED
        ------------------------------------------------- */

        if (
            game.status ===
            "FINISHED"
        ) {

            stopPlayerGamePolling();


            if (
                typeof window.showFinalResults ===
                "function"
            ) {

                window.showFinalResults(
                    game
                );

            } else {

                showScreen(
                    "finalResultsScreen"
                );
            }
        }

    } catch (error) {

        console.error(
            "PLAYER: Game status poll failed:",
            error
        );

    } finally {

        playerGameStatusPolling =
            false;
    }
}


/* =========================================================
   START POLLING
========================================================= */

function startPlayerGamePolling() {

    stopPlayerGamePolling();


    playerGameStatusTimer =
        setInterval(
            function() {

                playerGameStatusPoll();

            },
            3000
        );
}


/* =========================================================
   STOP POLLING
========================================================= */

function stopPlayerGamePolling() {

    if (
        playerGameStatusTimer
    ) {

        clearInterval(
            playerGameStatusTimer
        );

        playerGameStatusTimer =
            null;
    }
}


/* =========================================================
   OPEN PLAYER GAME
========================================================= */

async function openPlayerGame(
    game,
    player
) {

    if (!game || !player) {

        console.error(
            "PLAYER: Game or player missing."
        );

        return;
    }


    currentPlayerGame =
        normalisePlayerGame(
            game
        );


    currentPlayer =
        normalisePlayer(
            player
        );


    if (!currentPlayer.playerId) {

        console.error(
            "PLAYER: Player has no playerId."
        );

        return;
    }


    if (
        currentPlayerGame.hostPlayerId &&
        currentPlayer.playerId ===
        currentPlayerGame.hostPlayerId
    ) {

        currentPlayer.isHost =
            true;
    }


    await loadPlayerGamePlayers(
        currentPlayerGame,
        currentPlayer
    );


    const savedCategory =
        loadSavedPlayerCategory();


    if (
        savedCategory &&
        (
            !savedCategory.gameCode ||
            savedCategory.gameCode ===
            currentPlayerGame.gameCode
        )
    ) {

        playerCurrentCategory =
            savedCategory;
    }


    savePlayerSession();


    console.log(
        "PLAYER: Opening game:",
        currentPlayerGame
    );


    console.log(
        "PLAYER: Current player:",
        currentPlayer
    );


    playerGameOpen =
        false;


    if (
        currentPlayerGame.status ===
        "PLAYING"
    ) {

        playerGameOpen =
            true;


        await openPlayerCollectionScreen(
            currentPlayerGame,
            currentPlayer
        );

    } else {

        await playerGameStatusPoll();
    }


    startPlayerGamePolling();
}


/* =========================================================
   COMPATIBILITY SUBMIT ENTRY
========================================================= */

async function playerSubmitEntry(
    photoData
) {

    const category =
        playerCurrentCategory ||
        loadSavedPlayerCategory();


    if (
        !currentPlayerGame ||
        !currentPlayer ||
        !category
    ) {

        throw new Error(
            "Player game/category information is missing."
        );
    }


    playerCurrentCategory =
        normalisePlayerCategory(
            category
        );


    return apiPost(
        "submitEntry",
        {
            gameCode:
                currentPlayerGame.gameCode,

            playerId:
                currentPlayer.playerId,

            playerName:
                currentPlayer.playerName,

            categoryId:
                playerCurrentCategory.categoryId,

            categoryNumber:
                playerCurrentCategory.categoryNumber,

            photoData:
                photoData
        }
    );
}


/* =========================================================
   COMPATIBILITY SUBMIT PASS
========================================================= */

async function playerSubmitPass() {

    const category =
        playerCurrentCategory ||
        loadSavedPlayerCategory();


    if (
        !currentPlayerGame ||
        !currentPlayer ||
        !category
    ) {

        throw new Error(
            "Player game/category information is missing."
        );
    }


    playerCurrentCategory =
        normalisePlayerCategory(
            category
        );


    return apiPost(
        "submitPass",
        {
            gameCode:
                currentPlayerGame.gameCode,

            playerId:
                currentPlayer.playerId,

            playerName:
                currentPlayer.playerName,

            categoryId:
                playerCurrentCategory.categoryId,

            categoryNumber:
                playerCurrentCategory.categoryNumber
        }
    );
}


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        console.log(
            "PLAYER: DOM ready"
        );


        const savedPlayer =
            loadSavedPlayer();


        const savedGame =
            loadSavedPlayerGame();


        const savedCategory =
            loadSavedPlayerCategory();


        if (savedPlayer) {

            currentPlayer =
                savedPlayer;


            console.log(
                "PLAYER: Restored player:",
                currentPlayer
            );
        }


        if (savedGame) {

            currentPlayerGame =
                savedGame;


            console.log(
                "PLAYER: Restored game:",
                currentPlayerGame
            );
        }


        if (savedCategory) {

            playerCurrentCategory =
                savedCategory;


            console.log(
                "PLAYER: Restored challenge:",
                playerCurrentCategory
            );
        }


        setupHostCollectionControls();
    }
);


/* =========================================================
   GLOBAL EXPORTS
========================================================= */

window.openPlayerGame =
    openPlayerGame;


window.openPlayerCollectionScreen =
    openPlayerCollectionScreen;


window.loadPlayerCategories =
    loadPlayerCategories;


window.refreshPlayerCategories =
    refreshPlayerCategories;


window.renderPlayerCategoryCards =
    renderPlayerCategoryCards;


window.openPlayerCategory =
    openPlayerCategory;


window.checkPlayerGameCompletion =
    checkPlayerGameCompletion;


window.checkAndUpdateHostControls =
    checkAndUpdateHostControls;


window.updatePlayerHostControls =
    updatePlayerHostControls;


window.playerHostStartScoring =
    playerHostStartScoring;


window.playerGameStatusPoll =
    playerGameStatusPoll;


window.startPlayerGamePolling =
    startPlayerGamePolling;


window.stopPlayerGamePolling =
    stopPlayerGamePolling;


window.playerSubmitEntry =
    playerSubmitEntry;


window.playerSubmitPass =
    playerSubmitPass;


/* =========================================================
   CURRENT PLAYER
========================================================= */

window.getCurrentPlayer =
    function() {

        return currentPlayer;
    };


/* =========================================================
   CURRENT GAME
========================================================= */

window.getPlayerGame =
    function() {

        return currentPlayerGame;
    };


window.getCurrentPlayerGame =
    function() {

        return currentPlayerGame;
    };


/* =========================================================
   CATEGORIES
========================================================= */

window.getPlayerCategories =
    function() {

        return playerCategories;
    };


/* =========================================================
   CURRENT CHALLENGE
========================================================= */

window.getPlayerCurrentCategory =
    function() {

        return playerCurrentCategory;
    };


/* =========================================================
   SET CURRENT CHALLENGE
========================================================= */

window.setPlayerCurrentCategory =
    function(category) {

        setPlayerCurrentCategory(
            category
        );
    };


/* =========================================================
   COMPATIBILITY ALIASES
========================================================= */

window.openGameScreen =
    openPlayerCollectionScreen;


window.openPlayerGameplayScreen =
    openPlayerCollectionScreen;


/* =========================================================
   READY
========================================================= */

console.log(
    "Find It! player.js ready"
);