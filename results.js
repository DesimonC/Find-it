/* =========================================================
   FIND IT!
   results.js

   WINNER REVEAL
   CATEGORY WINNERS
   OVERALL WINNER
   SPLASH PHOTO

   IMPORTANT:
   - The splash stores ONE winning photo reference only.
   - NEVER stores the full Base64 image as photoId.
   - NEVER sends a Base64 string to getPhoto.
   - Old broken Base64 splash data is automatically removed.
========================================================= */

console.log(
    "Find It! results.js loaded"
);


/* =========================================================
   SPLASH STORAGE KEY
========================================================= */

const FIND_IT_SPLASH_KEY =
    "findItSplashPhoto";


/* =========================================================
   WINNER BUTTON SETUP
========================================================= */

function setupHostWinnerButtons() {

    const showButton =
        document.getElementById(
            "showWinnersButton"
        );

    if (showButton) {

        showButton.onclick =
            showHostWinners;

    }


    const nextButton =
        document.getElementById(
            "nextWinnerButton"
        );

    if (nextButton) {

        nextButton.onclick =
            showNextHostWinnerStage;

    }

}


/* =========================================================
   OPEN HOST WINNERS CONTROL SCREEN
========================================================= */

function openHostWinnersControlScreen(
    results
) {

    console.log(
        "================================="
    );

    console.log(
        "OPEN HOST WINNERS CONTROL SCREEN"
    );

    console.log(
        "Supplied results:",
        results
    );

    console.log(
        "================================="
    );


    const finalResults =
        results ||
        window.findItFinalVotingResults ||
        null;


    if (!finalResults) {

        console.error(
            "NO FINAL VOTING RESULTS AVAILABLE"
        );

        alert(
            "The voting results could not be loaded."
        );

        return;

    }


    /* =====================================================
       SAVE RESULTS GLOBALLY
    ===================================================== */

    hostFinalVotingResults =
        finalResults;

    window.findItFinalVotingResults =
        finalResults;


    window.findItOverallWinner =
        finalResults.overallWinner ||
        finalResults.overallWinningPlayer ||
        null;


    window.findItWinningEntries =
        finalResults.winningEntries ||
        finalResults.winnerEntries ||
        finalResults.winners ||
        [];


    window.findItOverallWinningPhoto =
        finalResults.overallWinningPhoto ||
        finalResults.overallPhoto ||
        null;


    /* =====================================================
       GET CATEGORY WINNERS
    ===================================================== */

    const winningEntries =
        finalResults.winningEntries ||
        finalResults.winnerEntries ||
        finalResults.winners ||
        [];


    hostWinners =
        Array.isArray(
            winningEntries
        )
            ? [...winningEntries]
            : [];


    /* =====================================================
       SORT BY CATEGORY
    ===================================================== */

    hostWinners.sort(
        function(a, b) {

            return (
                Number(
                    a.categoryNumber ||
                    a.CategoryNumber ||
                    0
                ) -
                Number(
                    b.categoryNumber ||
                    b.CategoryNumber ||
                    0
                )
            );

        }
    );


    hostWinnerStage =
        1;


    /* =====================================================
       FIND SCREEN
    ===================================================== */

    const screen =
        document.getElementById(
            "hostWinnersControlScreen"
        );


    if (!screen) {

        console.error(
            "HOST WINNERS CONTROL SCREEN NOT FOUND!"
        );

        return;

    }


    /* =====================================================
       HIDE ALL OTHER SCREENS
    ===================================================== */

    document
        .querySelectorAll(
            ".screen"
        )
        .forEach(
            function(otherScreen) {

                otherScreen.style.display =
                    "none";

                otherScreen.style.visibility =
                    "hidden";

                otherScreen.style.opacity =
                    "0";

                otherScreen.classList.remove(
                    "active"
                );

            }
        );


    /* =====================================================
       SHOW WINNERS SCREEN
    ===================================================== */

    screen.classList.remove(
        "hidden"
    );

    screen.classList.add(
        "active"
    );

    screen.removeAttribute(
        "hidden"
    );

    screen.style.display =
        "block";

    screen.style.visibility =
        "visible";

    screen.style.opacity =
        "1";


    console.log(
        "FINAL WINNER DATA READY:",
        finalResults
    );

    console.log(
        "OVERALL WINNER:",
        finalResults.overallWinner
    );

    console.log(
        "WINNING ENTRIES:",
        hostWinners
    );


    renderHostWinnerStage();

}


/* =========================================================
   SHOW HOST WINNERS
========================================================= */

async function showHostWinners() {

    console.log(
        "================================="
    );

    console.log(
        "SHOW HOST WINNERS"
    );

    console.log(
        "================================="
    );


    let results =
        hostFinalVotingResults ||
        window.findItFinalVotingResults ||
        null;


    if (!results) {

        const code =
            typeof getHostGameCode ===
            "function"
                ? getHostGameCode()
                : "";


        if (!code) {

            console.error(
                "No game code available."
            );

            alert(
                "No game code is available."
            );

            return;

        }


        try {

            results =
                await apiGet(
                    "getVotingResults",
                    {
                        gameCode:
                            code
                    }
                );

        }
        catch (error) {

            console.error(
                "Unable to load voting results:",
                error
            );

            alert(
                "Unable to load the winners."
            );

            return;

        }

    }


    openHostWinnersControlScreen(
        results
    );

}


/* =========================================================
   RENDER CURRENT WINNER STAGE
========================================================= */

function renderHostWinnerStage() {

    const screen =
        document.getElementById(
            "hostWinnersControlScreen"
        );


    if (!screen) {

        console.error(
            "hostWinnersControlScreen not found."
        );

        return;

    }


    let container =
        document.getElementById(
            "hostWinnersControlContent"
        );


    if (!container) {

        container =
            document.createElement(
                "div"
            );

        container.id =
            "hostWinnersControlContent";

        screen.appendChild(
            container
        );

    }


    container.innerHTML =
        "";


    if (
        hostWinnerStage === 1
    ) {

        renderHostWinnerStageOne(
            container
        );

    }
    else {

        renderHostWinnerStageTwo(
            container
        );

    }

}


/* =========================================================
   STAGE 1
   CATEGORY WINNERS
========================================================= */

function renderHostWinnerStageOne(
    container
) {

    console.log(
        "RENDERING CATEGORY WINNERS"
    );


    const title =
        document.createElement(
            "h2"
        );

    title.textContent =
        "🏆 Winning Photos";

    container.appendChild(
        title
    );


    const subtitle =
        document.createElement(
            "p"
        );

    subtitle.textContent =
        "The winning photo from each category.";

    container.appendChild(
        subtitle
    );


    const entries =
        Array.isArray(
            hostWinners
        )
            ? hostWinners
            : [];


    if (!entries.length) {

        const empty =
            document.createElement(
                "p"
            );

        empty.textContent =
            "No winning photos found.";

        container.appendChild(
            empty
        );

        return;

    }


    entries.forEach(
        function(entry, index) {

            createHostWinningCard(
                container,
                entry,
                index
            );

        }
    );


    const nextButton =
        document.createElement(
            "button"
        );

    nextButton.id =
        "nextWinnerButton";

    nextButton.type =
        "button";

    nextButton.textContent =
        "SHOW OVERALL WINNER";

    nextButton.onclick =
        showNextHostWinnerStage;

    container.appendChild(
        nextButton
    );

}


/* =========================================================
   CREATE CATEGORY WINNING CARD
========================================================= */

function createHostWinningCard(
    container,
    entry,
    index
) {

    console.log(
        "CREATING WINNING PHOTO CARD:",
        entry
    );


    const card =
        document.createElement(
            "div"
        );

    card.className =
        "host-winning-card";


    const categoryNumber =
        Number(
            entry.categoryNumber ||
            entry.CategoryNumber ||
            index + 1
        );


    const category =
        entry.categoryName ||
        entry.CategoryName ||
        (
            "Category " +
            categoryNumber
        );


    const categoryHeading =
        document.createElement(
            "h3"
        );

    categoryHeading.textContent =
        "🏆 " + category;

    card.appendChild(
        categoryHeading
    );


    const photoWrapper =
        document.createElement(
            "div"
        );

    photoWrapper.className =
        "host-winning-photo-wrapper";


    const image =
        document.createElement(
            "img"
        );

    image.className =
        "host-winning-photo";

    image.alt =
        category +
        " winning photo";

    image.loading =
        "lazy";

    image.style.display =
        "block";

    image.style.width =
        "80%";

    image.style.height =
        "auto";

    image.style.maxWidth =
        "80%";

    image.style.borderRadius =
        "12px";

    image.style.objectFit =
        "cover";


    photoWrapper.appendChild(
        image
    );

    card.appendChild(
        photoWrapper
    );


    const player =
        entry.playerName ||
        entry.PlayerName ||
        "Unknown player";


    const playerInfo =
        document.createElement(
            "div"
        );

    playerInfo.className =
        "host-winning-player";

    playerInfo.textContent =
        player;

    card.appendChild(
        playerInfo
    );


    const votes =
        Number(
            entry.voteCount ||
            entry.votes ||
            entry.Votes ||
            entry.points ||
            0
        );


    const voteInfo =
        document.createElement(
            "div"
        );

    voteInfo.className =
        "host-winning-votes";

    voteInfo.textContent =
        votes +
        " vote" +
        (
            votes === 1
                ? ""
                : "s"
        );

    card.appendChild(
        voteInfo
    );


    const winnerLabel =
        document.createElement(
            "div"
        );

    winnerLabel.className =
        "host-winning-label";

    winnerLabel.textContent =
        "🏆 CATEGORY WINNER";

    card.appendChild(
        winnerLabel
    );


    container.appendChild(
        card
    );


    loadHostPhoto(
        entry
    )
    .then(
        function(src) {

            if (!src) {

                image.alt =
                    "Unable to load winning photo.";

                image.style.display =
                    "none";

                return;

            }


            image.src =
                src;


            image.onload =
                function() {

                    console.log(
                        "WINNING PHOTO LOADED:",
                        category
                    );

                };


            image.onerror =
                function() {

                    console.error(
                        "WINNING PHOTO FAILED:",
                        entry
                    );

                    image.style.display =
                        "none";

                };

        }
    )
    .catch(
        function(error) {

            console.error(
                "WINNING PHOTO LOAD FAILED:",
                error
            );

            image.style.display =
                "none";

        }
    );

}


/* =========================================================
   GET GAME CODE FOR WINNER ACTIONS
========================================================= */

function getWinnerGameCode() {

    let code =
        hostFinalVotingResults?.gameCode ||
        hostFinalVotingResults?.GameCode ||
        window.findItFinalVotingResults?.gameCode ||
        window.findItFinalVotingResults?.GameCode ||
        hostGame?.gameCode ||
        hostGame?.GameCode ||
        localStorage.getItem(
            "gameCode"
        ) ||
        localStorage.getItem(
            "GameCode"
        ) ||
        "";


    return String(
        code
    )
    .trim()
    .toUpperCase();

}


/* =========================================================
   NEXT WINNER STAGE
========================================================= */

function showNextHostWinnerStage() {

    console.log(
        "================================="
    );

    console.log(
        "MOVING TO OVERALL WINNER"
    );

    console.log(
        "================================="
    );


    hostWinnerStage =
        2;

    renderHostWinnerStage();

}


/* =========================================================
   STAGE 2
   OVERALL WINNER
========================================================= */

function renderHostWinnerStageTwo(
    container
) {

    container.innerHTML =
        "";


    const results =
        hostFinalVotingResults ||
        {};


    const overallWinner =
        results.overallWinner ||
        results.overall ||
        window.findItOverallWinner ||
        {};


    const winningPhoto =
        window.findItOverallWinningPhoto ||
        results.overallWinningPhoto ||
        {};


    const playerName =
        overallWinner.playerName ||
        overallWinner.PlayerName ||
        winningPhoto.playerName ||
        winningPhoto.PlayerName ||
        "Overall Winner";


    const totalVotes =
        overallWinner.totalVotes ??
        overallWinner.votes ??
        winningPhoto.totalVotes ??
        winningPhoto.votes ??
        0;


    /* =====================================================
       TITLE
    ===================================================== */

    const title =
        document.createElement(
            "h2"
        );

    title.textContent =
        "🏆 OVERALL WINNER";

    container.appendChild(
        title
    );


    /* =====================================================
       SUBTITLE
    ===================================================== */

    const subtitle =
        document.createElement(
            "p"
        );

    subtitle.textContent =
        "This is the winning photo that will become the splash screen.";

    subtitle.className =
        "overall-winner-subtitle";

    container.appendChild(
        subtitle
    );


    /* =====================================================
       OVERALL WINNER CARD
    ===================================================== */

    const card =
        document.createElement(
            "div"
        );

    card.className =
        "host-winning-card overall-winning-card";


    const category =
        document.createElement(
            "h3"
        );

    category.textContent =
        winningPhoto.categoryName ||
        winningPhoto.category ||
        overallWinner.categoryName ||
        "Overall Winning Photo";

    card.appendChild(
        category
    );


    /* =====================================================
       PHOTO
    ===================================================== */

    const photoWrapper =
        document.createElement(
            "div"
        );

    photoWrapper.className =
        "host-winning-photo-wrapper";


    const img =
        document.createElement(
            "img"
        );

    img.className =
        "host-winning-photo overall-winning-photo";

    img.alt =
        "Overall winning photo";

    img.style.display =
        "none";


    photoWrapper.appendChild(
        img
    );

    card.appendChild(
        photoWrapper
    );


    /* =====================================================
       PLAYER
    ===================================================== */

    const player =
        document.createElement(
            "div"
        );

    player.className =
        "host-winning-player";

    player.textContent =
        "👤 " + playerName;

    card.appendChild(
        player
    );


    /* =====================================================
       VOTES
    ===================================================== */

    const votes =
        document.createElement(
            "div"
        );

    votes.className =
        "host-winning-votes";

    votes.textContent =
        "🗳️ " +
        totalVotes +
        " vote" +
        (
            Number(totalVotes) === 1
                ? ""
                : "s"
        );

    card.appendChild(
        votes
    );


    /* =====================================================
       SPLASH LABEL
    ===================================================== */

    const splashLabel =
        document.createElement(
            "div"
        );

    splashLabel.className =
        "overall-splash-label";

    splashLabel.textContent =
        "🌟 THIS PHOTO WILL BE THE NEW SPLASH BACKGROUND";

    card.appendChild(
        splashLabel
    );


    /* =====================================================
       FINISH BUTTON
    ===================================================== */

    const finishButton =
        document.createElement(
            "button"
        );

    finishButton.type =
        "button";

    finishButton.id =
        "finishGameButton";

    finishButton.className =
        "finish-game-button";

    finishButton.textContent =
        "🏁 FINISH / END GAME";


    finishButton.onclick =
        async function() {

            const splashPhoto =
                getOverallWinningPhoto();


            if (
                !splashPhoto ||
                !getPhotoId(
                    splashPhoto
                )
            ) {

                alert(
                    "The overall winning photo could not be found."
                );

                return;

            }


            const confirmed =
                confirm(
                    "Finish this game?\n\n" +
                    "All game photos and game data will be deleted.\n\n" +
                    "The selected overall winning photo will become the new splash background."
                );


            if (!confirmed) {

                return;

            }


            finishButton.disabled =
                true;

            finishButton.textContent =
                "⏳ FINISHING GAME...";


            try {

                await finishHostWinnerReveal();

            }
            catch (error) {

                console.error(
                    "Finish game button error:",
                    error
                );

                finishButton.disabled =
                    false;

                finishButton.textContent =
                    "🏁 FINISH / END GAME";

            }

        };


    card.appendChild(
        finishButton
    );


    container.appendChild(
        card
    );


    /* =====================================================
       LOAD OVERALL PHOTO
    ===================================================== */

    loadHostPhoto(
        winningPhoto
    )
    .then(
        function(src) {

            if (!src) {

                console.error(
                    "No image returned for overall winner"
                );

                return;

            }


            img.src =
                src;

            img.style.display =
                "block";

        }
    )
    .catch(
        function(error) {

            console.error(
                "Failed to load overall winning photo:",
                error
            );

        }
    );

}


/* =========================================================
   GET PHOTO ID
========================================================= */

function getPhotoId(
    entry
) {

    if (!entry) {

        return "";

    }


    const possibleId =
        entry.photoId ||
        entry.PhotoID ||
        entry.photoID ||
        "";


    const photoId =
        String(
            possibleId
        )
        .trim();


    /*
       NEVER accept a Base64 data URL
       as a PhotoID.
    */

    if (
        photoId.indexOf(
            "data:image/"
        ) === 0
    ) {

        console.warn(
            "Ignoring Base64 data URL as PhotoID."
        );

        return "";

    }


    return photoId;

}


/* =========================================================
   GET OVERALL WINNING PHOTO
========================================================= */

function getOverallWinningPhoto() {

    const photo =
        window.findItOverallWinningPhoto ||
        (
            hostFinalVotingResults &&
            hostFinalVotingResults.overallWinningPhoto
        ) ||
        null;


    return photo;

}


/* =========================================================
   LOAD HOST PHOTO
========================================================= */

async function loadHostPhoto(
    entry
) {

    if (!entry) {

        return null;

    }


    const photoId =
        getPhotoId(
            entry
        );


    /*
       IMPORTANT:
       A Base64 string is NEVER passed to getPhoto.
    */

    if (!photoId) {

        const directUrl =
            entry.photoUrl ||
            entry.PhotoURL ||
            entry.url ||
            entry.photoURL ||
            "";


        if (
            directUrl &&
            String(
                directUrl
            ).indexOf(
                "data:image/"
            ) !== 0
        ) {

            return directUrl;

        }


        console.warn(
            "No valid PhotoID or photo URL found:",
            entry
        );

        return null;

    }


    console.log(
        "LOADING WINNING PHOTO:",
        photoId
    );


    try {

        const result =
            await apiGet(
                "getPhoto",
                {
                    photoId:
                        photoId
                }
            );


        console.log(
            "WINNING PHOTO API RESULT:",
            result
        );


        if (
            !result ||
            result.success === false
        ) {

            throw new Error(
                result &&
                result.error
                    ? result.error
                    : "getPhoto failed"
            );

        }


        const mime =
            result.mimeType ||
            result.mime ||
            "image/jpeg";


        const base64 =
            result.base64 ||
            result.data ||
            result.photoData;


        if (base64) {

            return (
                "data:" +
                mime +
                ";base64," +
                base64
            );

        }


        return (
            result.photoUrl ||
            result.url ||
            entry.photoUrl ||
            entry.PhotoURL ||
            null
        );

    }
    catch (error) {

        console.error(
            "Unable to load winning photo:",
            error
        );

        return null;

    }

}


/* =========================================================
   SAVE SPLASH PHOTO REFERENCE
========================================================= */

function saveSplashPhotoReference(
    winningPhoto,
    gameCode
) {

    if (!winningPhoto) {

        console.error(
            "Cannot save splash photo: no photo."
        );

        return false;

    }


    const photoId =
        getPhotoId(
            winningPhoto
        );


    if (!photoId) {

        console.error(
            "Cannot save splash photo: invalid PhotoID.",
            winningPhoto
        );

        return false;

    }


    const photoUrl =
        winningPhoto.photoUrl ||
        winningPhoto.PhotoURL ||
        winningPhoto.photoURL ||
        winningPhoto.url ||
        "";


    /*
       Store ONLY the reference.

       This is deliberately NOT the Base64 image.
    */

    const splashData = {

        photoId:
            photoId,

        photoUrl:
            photoUrl,

        gameCode:
            String(
                gameCode ||
                ""
            )
            .trim()
            .toUpperCase(),

        playerName:
            winningPhoto.playerName ||
            winningPhoto.PlayerName ||
            "",

        categoryName:
            winningPhoto.categoryName ||
            winningPhoto.CategoryName ||
            winningPhoto.category ||
            "",

        savedAt:
            Date.now()

    };


    try {

        localStorage.setItem(
            FIND_IT_SPLASH_KEY,
            JSON.stringify(
                splashData
            )
        );


        /*
           Remove any old alternative splash
           storage that may contain Base64.
        */

        localStorage.removeItem(
            "findItWinningPhoto"
        );

        localStorage.removeItem(
            "findItOverallWinningPhoto"
        );


        console.log(
            "SPLASH: Saved winning photo reference:",
            splashData
        );


        return true;

    }
    catch (error) {

        console.error(
            "SPLASH: Could not save winning photo reference:",
            error
        );

        return false;

    }

}


/* =========================================================
   REMOVE OLD/BROKEN SPLASH DATA
========================================================= */

function removeBrokenSplashData() {

    try {

        const raw =
            localStorage.getItem(
                FIND_IT_SPLASH_KEY
            );


        if (
            raw &&
            (
                raw.indexOf(
                    "data:image/"
                ) === 0 ||
                raw.length > 50000
            )
        ) {

            console.warn(
                "SPLASH: Removing old Base64 splash data."
            );

            localStorage.removeItem(
                FIND_IT_SPLASH_KEY
            );

        }


        const oldKeys = [

            "findItWinningPhoto",
            "findItOverallWinningPhoto"

        ];


        oldKeys.forEach(
            function(key) {

                const value =
                    localStorage.getItem(
                        key
                    );


                if (
                    value &&
                    (
                        value.indexOf(
                            "data:image/"
                        ) === 0 ||
                        value.length > 50000
                    )
                ) {

                    console.warn(
                        "SPLASH: Removing old Base64 data:",
                        key
                    );

                    localStorage.removeItem(
                        key
                    );

                }

            }
        );

    }
    catch (error) {

        console.warn(
            "SPLASH: Could not inspect old splash data:",
            error
        );

    }

}


/* =========================================================
   LOAD SAVED SPLASH PHOTO
========================================================= */

async function loadSavedSplashPhoto() {

    console.log(
        "================================="
    );

    console.log(
        "SPLASH: Loading saved winning photo"
    );

    console.log(
        "================================="
    );


    removeBrokenSplashData();


    let raw =
        null;


    try {

        raw =
            localStorage.getItem(
                FIND_IT_SPLASH_KEY
            );

    }
    catch (error) {

        console.error(
            "SPLASH: Unable to read storage:",
            error
        );

        return;

    }


    if (!raw) {

        console.log(
            "SPLASH: No saved winning photo."
        );

        return;

    }


    /*
       Compatibility:
       If something has somehow saved a direct
       URL string, use it only if it is not Base64.
    */

    let splashData;


    try {

        splashData =
            JSON.parse(
                raw
            );

    }
    catch (error) {

        /*
           Old plain-string storage.

           NEVER send Base64 to getPhoto.
        */

        if (
            raw.indexOf(
                "data:image/"
            ) === 0
        ) {

            console.warn(
                "SPLASH: Removing old Base64 image."
            );

            localStorage.removeItem(
                FIND_IT_SPLASH_KEY
            );

            return;

        }


        splashData = {

            photoId:
                raw

        };

    }


    if (!splashData) {

        return;

    }


    const photoId =
        getPhotoId(
            splashData
        );


    const photoUrl =
        splashData.photoUrl ||
        splashData.PhotoURL ||
        "";


    console.log(
        "SPLASH: Saved photo reference:",
        {
            photoId:
                photoId,
            photoUrl:
                photoUrl
        }
    );


    /*
       First preference:
       use the saved PhotoID.
    */

    if (photoId) {

        try {

            const src =
                await loadHostPhoto(
                    splashData
                );


            if (src) {

                applySplashBackground(
                    src
                );

                console.log(
                    "SPLASH: Winning photo loaded successfully."
                );

                return;

            }

        }
        catch (error) {

            console.error(
                "SPLASH: Failed to load saved photo:",
                error
            );

        }

    }


    /*
       Fallback to saved PhotoURL.
    */

    if (
        photoUrl &&
        String(
            photoUrl
        ).indexOf(
            "data:image/"
        ) !== 0
    ) {

        applySplashBackground(
            photoUrl
        );

        console.log(
            "SPLASH: Used saved winning photo URL."
        );

        return;

    }


    console.warn(
        "SPLASH: Saved winning photo could not be loaded."
    );

}


/* =========================================================
   APPLY SPLASH BACKGROUND
========================================================= */

function applySplashBackground(
    src
) {

    if (!src) {

        return;

    }


    const splash =
        document.getElementById(
            "splash"
        );


    if (!splash) {

        console.warn(
            "SPLASH: splash element not found."
        );

        return;

    }


    /*
       Only ONE background image is applied.
    */

    splash.style.backgroundImage =
        "url('" +
        String(
            src
        )
        .replace(
            /'/g,
            "\\'"
        ) +
        "')";


    splash.style.backgroundSize =
        "cover";

    splash.style.backgroundPosition =
        "center";

    splash.style.backgroundRepeat =
        "no-repeat";


    console.log(
        "SPLASH: Background applied."
    );

}


/* =========================================================
   FINISH HOST WINNER REVEAL
========================================================= */

async function finishHostWinnerReveal() {

    if (finishingHostGame) {

        console.log(
            "FINISH GAME already running"
        );

        return;

    }


    finishingHostGame =
        true;


    console.log(
        "===================================="
    );

    console.log(
        "FINISHING FIND IT GAME"
    );

    console.log(
        "===================================="
    );


    try {

        const gameCode =
            getWinnerGameCode();


        if (!gameCode) {

            throw new Error(
                "No game code found."
            );

        }


        console.log(
            "FINISH GAME CODE:",
            gameCode
        );


        /* =================================================
           GET WINNING PHOTO
        ================================================= */

        const winningPhoto =
            getOverallWinningPhoto();


        if (!winningPhoto) {

            throw new Error(
                "No overall winning photo found."
            );

        }


        const winningPhotoId =
            getPhotoId(
                winningPhoto
            );


        if (!winningPhotoId) {

            console.error(
                "Overall winning photo has no valid PhotoID:",
                winningPhoto
            );

            throw new Error(
                "The overall winning photo could not be found."
            );

        }


        /* =================================================
           SAVE REFERENCE BEFORE CLEANUP
        ================================================= */

        console.log(
            "Saving overall winner as splash photo reference:",
            winningPhotoId
        );


        const splashSaved =
            saveSplashPhotoReference(
                winningPhoto,
                gameCode
            );


        if (!splashSaved) {

            throw new Error(
                "Could not save the overall winning photo."
            );

        }


        /* =================================================
           FINISH GAME ON SERVER
        ================================================= */

        console.log(
            "Calling finishGame..."
        );


        const result =
            await apiPost(
                "finishGame",
                {
                    gameCode:
                        gameCode,

                    winningPhotoId:
                        winningPhotoId
                }
            );


        console.log(
            "FINISH GAME RESULT:",
            result
        );


        if (
            !result ||
            result.success !== true
        ) {

            throw new Error(
                result &&
                result.error
                    ? result.error
                    : "Finish game failed."
            );

        }


        /* =================================================
           STOP HOST POLLING
        ================================================= */

        if (
            typeof hostPollTimer !==
            "undefined" &&
            hostPollTimer
        ) {

            clearInterval(
                hostPollTimer
            );

            hostPollTimer =
                null;

        }


        if (
            typeof hostGameStatusTimer !==
            "undefined" &&
            hostGameStatusTimer
        ) {

            clearInterval(
                hostGameStatusTimer
            );

            hostGameStatusTimer =
                null;

        }


        /* =================================================
           CLEAR GAME SESSION
        ================================================= */

        if (
            typeof clearHostSessionStorage ===
            "function"
        ) {

            clearHostSessionStorage();

        }


        /* =================================================
           CLEAR PLAYER SESSION
        ================================================= */

        try {

            localStorage.removeItem(
                "findItCurrentPlayer"
            );

            localStorage.removeItem(
                "findItPlayer"
            );

            localStorage.removeItem(
                "findItGame"
            );

            localStorage.removeItem(
                "findItHostGame"
            );

            localStorage.removeItem(
                "findItGameCode"
            );

            localStorage.removeItem(
                "gameCode"
            );

            localStorage.removeItem(
                "GameCode"
            );

        }
        catch (storageError) {

            console.warn(
                "Could not clear some session storage:",
                storageError
            );

        }


        /* =================================================
           CLEAR JAVASCRIPT GAME STATE
        ================================================= */

        hostGame =
            null;

        hostGameCode =
            "";

        hostWinners =
            [];

        hostFinalVotingResults =
            null;

        hostWinnerStage =
            1;


        /* =================================================
           RETURN TO SPLASH
        ================================================= */

        console.log(
            "Game finished successfully."
        );


        const splashScreen =
            document.getElementById(
                "splash"
            );


        if (!splashScreen) {

            console.error(
                "splashScreen NOT FOUND"
            );

        }
        else {

            document
                .querySelectorAll(
                    ".screen"
                )
                .forEach(
                    function(screen) {

                        screen.classList.remove(
                            "active"
                        );

                        screen.style.display =
                            "none";

                        screen.style.visibility =
                            "hidden";

                        screen.style.opacity =
                            "0";

                    }
                );


            splashScreen.classList.remove(
                "hidden"
            );

            splashScreen.classList.add(
                "active"
            );

            splashScreen.removeAttribute(
                "hidden"
            );

            splashScreen.style.display =
                "flex";

            splashScreen.style.visibility =
                "visible";

            splashScreen.style.opacity =
                "1";


            console.log(
                "RETURNED TO SPLASH SCREEN"
            );

        }


        /* =================================================
           LOAD THE ONE SAVED SPLASH PHOTO
        ================================================= */

        setTimeout(
            function() {

                loadSavedSplashPhoto();

            },
            100
        );


        console.log(
            "===================================="
        );

        console.log(
            "FIND IT GAME FINISHED"
        );

        console.log(
            "PHOTOS DELETED:",
            result.photosDeleted
        );

        console.log(
            "===================================="
        );

    }
    catch (error) {

        console.error(
            "FINISH GAME ERROR:",
            error
        );

        alert(
            "The game could not be finished.\n\n" +
            error.message
        );

    }
    finally {

        finishingHostGame =
            false;

    }

}


/* =========================================================
   CLEAR HOST SESSION STORAGE
========================================================= */

function clearHostSessionStorage() {

    const keysToRemove = [

        "findItGame",

        "findItHostGame",

        "findItGameCode",

        "findItCurrentPlayer",

        "findItPlayer",

        "currentPlayer",

        "gameCode",

        "GameCode",

        "playerId",

        "PlayerID",

        "playerName",

        "PlayerName",

        "findItFinalVotingResults",

        "findItOverallWinner",

        "findItWinningEntries",

        "findItOverallWinningPhoto"

    ];


    keysToRemove.forEach(
        function(key) {

            try {

                localStorage.removeItem(
                    key
                );

            }
            catch (error) {

                console.warn(
                    "Unable to remove:",
                    key,
                    error
                );

            }

        }
    );


    /*
       IMPORTANT:

       findItSplashPhoto is deliberately
       NOT removed.
    */

}


/* =========================================================
   COMPATIBILITY WINNER FUNCTION
========================================================= */

function showWinnerScreen(
    results
) {

    if (results) {

        hostFinalVotingResults =
            results;

        window.findItFinalVotingResults =
            results;

    }


    openHostWinnersControlScreen(
        hostFinalVotingResults
    );

}


/* =========================================================
   SPLASH HOST BUTTON
========================================================= */

function setupHostSplashButton() {

    const possibleIds = [

        "hostButton",
        "hostGameButton",
        "hostSetupButton",
        "hostButtonSplash"

    ];


    possibleIds.forEach(
        function(id) {

            const button =
                document.getElementById(
                    id
                );


            if (!button) {

                return;

            }


            button.onclick =
                function(event) {

                    if (event) {

                        event.preventDefault();

                    }


                    if (
                        typeof openHostSetup ===
                        "function"
                    ) {

                        openHostSetup();

                    }

                };

        }
    );

}


/* =========================================================
   DOM INITIALISATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        console.log(
            "HOST WINNER DOM INITIALISING"
        );


        setupHostWinnerButtons();


        if (
            typeof setupHostEarlyEndButton ===
            "function"
        ) {

            setupHostEarlyEndButton();

        }


        setupHostSplashButton();


        /*
           Check existing splash storage.

           This also removes the old broken Base64
           splash data from the previous version.
        */

        removeBrokenSplashData();


        /*
           Load the saved winner when the app starts.
        */

        setTimeout(
            function() {

                loadSavedSplashPhoto();

            },
            150
        );


        setTimeout(
            setupHostSplashButton,
            500
        );

    }
);


/* =========================================================
   EXPORTS
========================================================= */

window.openHostWinnersControlScreen =
    openHostWinnersControlScreen;

window.showHostWinners =
    showHostWinners;

window.showNextHostWinnerStage =
    showNextHostWinnerStage;

window.finishHostWinnerReveal =
    finishHostWinnerReveal;

window.showWinnerScreen =
    showWinnerScreen;

window.loadSavedSplashPhoto =
    loadSavedSplashPhoto;

window.saveSplashPhotoReference =
    saveSplashPhotoReference;