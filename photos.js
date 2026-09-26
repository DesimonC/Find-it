/* =========================================================
   FIND IT!
   photos.js

   PHOTO CAPTURE / UPLOAD

   IMPORTANT:
   - Works with the current photoUploadScreen HTML
   - Keeps Take Photo working
   - Keeps Choose Photo working
   - Keeps Retake working
   - Keeps Submit Photo working
   - Keeps Pass This Challenge working
   - Receives the challenge from player.js
   - Recovers game/player information safely
   - Processes photos before submission
   - Maximum dimension: 1200px
   - JPEG output
   - Target size: approximately 350KB
========================================================= */


/* =========================================================
   PHOTO STATE
========================================================= */

let photoStream = null;

let processedPhotoData = null;

let selectedPhotoCategory = null;


/* =========================================================
   ELEMENT HELPERS
========================================================= */

function photoElement(id) {

    return document.getElementById(id);
}


function photoShowElement(id) {

    const element = photoElement(id);

    if (!element) {
        return;
    }

    element.classList.remove("hidden");

    element.style.display = "";
}


function photoHideElement(id) {

    const element = photoElement(id);

    if (!element) {
        return;
    }

    element.classList.add("hidden");

    element.style.display = "none";
}


/* =========================================================
   MESSAGE
========================================================= */

function setPhotoMessage(message) {

    const element =
        photoElement("uploadMessage");

    if (!element) {
        return;
    }

    element.textContent =
        message || "";
}


/* =========================================================
   GET STORED PLAYER GAME
========================================================= */

function getStoredPlayerGame() {

    let game = null;

    try {

        const raw =
            localStorage.getItem(
                "findItGame"
            );

        if (raw) {
            game = JSON.parse(raw);
        }

    } catch (error) {

        console.warn(
            "PHOTOS: Could not read findItGame:",
            error
        );
    }

    if (
        game &&
        (
            game.gameCode ||
            game.GameCode ||
            game.code
        )
    ) {

        return game;
    }


    try {

        const raw =
            localStorage.getItem(
                "findItPlayerGame"
            );

        if (raw) {
            game = JSON.parse(raw);
        }

    } catch (error) {

        console.warn(
            "PHOTOS: Could not read findItPlayerGame:",
            error
        );
    }

    return game || null;
}


/* =========================================================
   GET STORED PLAYER
========================================================= */

function getStoredPlayer() {

    let player = null;

    try {

        const raw =
            localStorage.getItem(
                "findItCurrentPlayer"
            );

        if (raw) {
            player = JSON.parse(raw);
        }

    } catch (error) {

        console.warn(
            "PHOTOS: Could not read findItCurrentPlayer:",
            error
        );
    }

    if (
        player &&
        (
            player.playerId ||
            player.PlayerID ||
            player.id
        )
    ) {

        return player;
    }


    try {

        const raw =
            localStorage.getItem(
                "findItPlayer"
            );

        if (raw) {
            player = JSON.parse(raw);
        }

    } catch (error) {

        console.warn(
            "PHOTOS: Could not read findItPlayer:",
            error
        );
    }

    return player || null;
}


/* =========================================================
   GET GAME FOR PHOTO SUBMISSION
========================================================= */

function getPhotoGame() {

    let game = null;


    /* -----------------------------------------------------
       1. Ask player.js
    ----------------------------------------------------- */

    if (
        typeof window.getPlayerGame ===
        "function"
    ) {

        try {

            game =
                window.getPlayerGame();

        } catch (error) {

            console.warn(
                "PHOTOS: getPlayerGame failed:",
                error
            );
        }
    }


    if (
        game &&
        (
            game.gameCode ||
            game.GameCode ||
            game.code
        )
    ) {

        return game;
    }


    /* -----------------------------------------------------
       2. Local storage
    ----------------------------------------------------- */

    game =
        getStoredPlayerGame();

    if (game) {

        return game;
    }


    /* -----------------------------------------------------
       3. Try current player game code
    ----------------------------------------------------- */

    const player =
        getPhotoPlayer();

    if (
        player &&
        (
            player.gameCode ||
            player.GameCode
        )
    ) {

        return {
            gameCode:
                player.gameCode ||
                player.GameCode
        };
    }


    /* -----------------------------------------------------
       4. Try category game code
    ----------------------------------------------------- */

    if (
        selectedPhotoCategory &&
        (
            selectedPhotoCategory.gameCode ||
            selectedPhotoCategory.GameCode
        )
    ) {

        return {
            gameCode:
                selectedPhotoCategory.gameCode ||
                selectedPhotoCategory.GameCode
        };
    }


    return null;
}


/* =========================================================
   GET PLAYER FOR PHOTO SUBMISSION
========================================================= */

function getPhotoPlayer() {

    let player = null;


    /* -----------------------------------------------------
       1. Ask player.js
    ----------------------------------------------------- */

    if (
        typeof window.getCurrentPlayer ===
        "function"
    ) {

        try {

            player =
                window.getCurrentPlayer();

        } catch (error) {

            console.warn(
                "PHOTOS: getCurrentPlayer failed:",
                error
            );
        }
    }


    if (
        player &&
        (
            player.playerId ||
            player.PlayerID ||
            player.id
        )
    ) {

        return player;
    }


    /* -----------------------------------------------------
       2. Local storage
    ----------------------------------------------------- */

    player =
        getStoredPlayer();

    return player;
}


/* =========================================================
   GET CURRENT PHOTO CATEGORY
========================================================= */

function getPhotoCategory() {

    /* -----------------------------------------------------
       Local photos.js state
    ----------------------------------------------------- */

    if (selectedPhotoCategory) {

        return selectedPhotoCategory;
    }


    /* -----------------------------------------------------
       Ask player.js
    ----------------------------------------------------- */

    if (
        typeof window.getPlayerCurrentCategory ===
        "function"
    ) {

        try {

            const category =
                window.getPlayerCurrentCategory();

            if (category) {

                selectedPhotoCategory =
                    category;

                return category;
            }

        } catch (error) {

            console.warn(
                "PHOTOS: getPlayerCurrentCategory failed:",
                error
            );
        }
    }


    /* -----------------------------------------------------
       Direct player.js variable fallback
    ----------------------------------------------------- */

    if (
        window.playerCurrentCategory
    ) {

        selectedPhotoCategory =
            window.playerCurrentCategory;

        return selectedPhotoCategory;
    }


    return null;
}


/* =========================================================
   STOP CAMERA
========================================================= */

function stopPhotoCamera() {

    if (!photoStream) {
        return;
    }


    try {

        photoStream
            .getTracks()
            .forEach(function(track) {

                track.stop();

            });

    } catch (error) {

        console.warn(
            "PHOTOS: Could not stop camera:",
            error
        );
    }


    photoStream = null;


    const video =
        photoElement("cameraPreview");

    if (video) {

        video.srcObject =
            null;
    }
}


/* =========================================================
   RESET PHOTO UI
========================================================= */

function resetPhotoUI() {

    stopPhotoCamera();

    processedPhotoData =
        null;


    const input =
        photoElement("photoInput");

    if (input) {

        input.value =
            "";
    }


    const video =
        photoElement("cameraPreview");

    if (video) {

        video.srcObject =
            null;
    }


    const preview =
        photoElement("photoPreview");

    if (preview) {

        preview.src =
            "";
    }


    photoHideElement(
        "cameraContainer"
    );

    photoHideElement(
        "photoPreviewContainer"
    );


    photoShowElement(
        "takePhotoButton"
    );

    photoShowElement(
        "choosePhotoButton"
    );

    photoHideElement(
        "capturePhotoButton"
    );

    photoHideElement(
        "closeCameraButton"
    );

    photoHideElement(
        "submitPhotoButton"
    );


    const passButton =
        photoElement(
            "passCategoryButton"
        );

    if (passButton) {

        passButton.disabled =
            false;

        passButton.textContent =
            "Pass This Challenge";
    }


    setPhotoMessage("");
}


/* =========================================================
   RESET PHOTO UPLOAD
========================================================= */

function resetPhotoUpload() {

    resetPhotoUI();

    console.log(
        "PHOTOS: Photo upload reset."
    );
}


/* =========================================================
   SET PHOTO CATEGORY
========================================================= */

function setPhotoCategory(category) {

    if (!category) {

        console.error(
            "PHOTOS: No category supplied."
        );

        return;
    }


    selectedPhotoCategory =
        category;


    console.log(
        "PHOTOS: Challenge selected:",
        selectedPhotoCategory
    );


    updatePhotoChallengeInfo(
        category
    );
}


/* =========================================================
   UPDATE CHALLENGE INFORMATION
========================================================= */

function updatePhotoChallengeInfo(
    category
) {

    if (!category) {
        return;
    }


    const number =
        category.categoryNumber ||
        category.CategoryNumber ||
        category.number ||
        "";


    const name =
        category.categoryName ||
        category.CategoryName ||
        category.name ||
        "";


    const description =
        category.description ||
        category.Description ||
        "";


    const title =
        photoElement(
            "uploadCategoryTitle"
        );

    const numberElement =
        photoElement(
            "uploadCategoryNumber"
        );

    const nameElement =
        photoElement(
            "uploadCategoryName"
        );

    const descriptionElement =
        photoElement(
            "uploadCategoryDescription"
        );


    if (title) {

        title.textContent =
            "Find it!";
    }


    if (numberElement) {

        numberElement.textContent =
            number;
    }


    if (nameElement) {

        nameElement.textContent =
            name;
    }


    if (descriptionElement) {

        descriptionElement.textContent =
            description;
    }


    console.log(
        "PHOTOS: Challenge information updated:",
        {
            number: number,
            name: name,
            description: description
        }
    );
}


/* =========================================================
   OPEN PHOTO UPLOAD
========================================================= */

function openPhotoUpload(
    category
) {

    console.log(
        "PHOTOS: Opening photo upload:",
        category
    );


    /* -----------------------------------------------------
       1. Receive the selected challenge from player.js.
       photos.js becomes the single owner of the upload UI.
    ----------------------------------------------------- */

    if (category) {

        selectedPhotoCategory =
            category;
    }


    const currentCategory =
        getPhotoCategory();


    if (!currentCategory) {

        console.error(
            "PHOTOS: Challenge information missing."
        );

        setPhotoMessage(
            "Challenge information is missing."
        );

        return;
    }


    /* -----------------------------------------------------
       2. Reset only the photo controls.
       Do this here, after the challenge has been received,
       so resetPhotoUI cannot accidentally clear the
       selected challenge.
    ----------------------------------------------------- */

    resetPhotoUI();


    selectedPhotoCategory =
        currentCategory;


    /* -----------------------------------------------------
       3. Put the selected challenge into the upload UI.
    ----------------------------------------------------- */

    updatePhotoChallengeInfo(
        currentCategory
    );


    /* -----------------------------------------------------
       4. photos.js owns the screen transition.
    ----------------------------------------------------- */

    if (
        typeof window.showScreen ===
        "function"
    ) {

        window.showScreen(
            "photoUploadScreen"
        );

    } else {

        const screen =
            photoElement(
                "photoUploadScreen"
            );

        if (screen) {

            screen.classList.remove(
                "hidden"
            );

            screen.style.display =
                "";
        }
    }


    console.log(
        "PHOTOS: Photo upload screen ready for challenge:",
        currentCategory
    );
}

/* =========================================================
   CLOSE PHOTO UPLOAD
========================================================= */

function closePhotoUpload() {

    stopPhotoCamera();

    resetPhotoUI();


    if (
        typeof window.showScreen ===
        "function"
    ) {

        window.showScreen(
            "collectionScreen"
        );

    }


    if (
        typeof window.refreshPlayerCategories ===
        "function"
    ) {

        window.refreshPlayerCategories();

    }
}


/* =========================================================
   START CAMERA
========================================================= */

async function startPhotoCamera() {

    console.log(
        "PHOTOS: Starting camera."
    );


    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        setPhotoMessage(
            "Camera is not available. Please choose a photo instead."
        );

        return;
    }


    try {

        stopPhotoCamera();


        photoStream =
            await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: {
                        ideal: "environment"
                    }
                },
                audio: false
            });


        const video =
            photoElement(
                "cameraPreview"
            );


        if (!video) {

            throw new Error(
                "Camera preview element not found."
            );
        }


        video.srcObject =
            photoStream;


        video.setAttribute(
            "playsinline",
            ""
        );


        video.muted =
            true;


        await video.play();


        photoHideElement(
            "takePhotoButton"
        );

        photoHideElement(
            "choosePhotoButton"
        );


        photoShowElement(
            "cameraContainer"
        );

        photoShowElement(
            "capturePhotoButton"
        );

        photoShowElement(
            "closeCameraButton"
        );


        setPhotoMessage(
            "Camera ready."
        );


        console.log(
            "PHOTOS: Camera ready."
        );

    } catch (error) {

        console.error(
            "PHOTOS: Camera error:",
            error
        );


        stopPhotoCamera();


        setPhotoMessage(
            "Could not open the camera. Please choose a photo instead."
        );
    }
}


/* =========================================================
   CAPTURE PHOTO
========================================================= */

function capturePhoto() {

    const video =
        photoElement(
            "cameraPreview"
        );


    if (!video) {

        setPhotoMessage(
            "Camera preview not found."
        );

        return;
    }


    if (
        !video.videoWidth ||
        !video.videoHeight
    ) {

        setPhotoMessage(
            "Camera is not ready yet."
        );

        return;
    }


    const canvas =
        document.createElement(
            "canvas"
        );


    canvas.width =
        video.videoWidth;

    canvas.height =
        video.videoHeight;


    const context =
        canvas.getContext(
            "2d"
        );


    context.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
    );


    stopPhotoCamera();


    processPhotoData(
        canvas.toDataURL(
            "image/jpeg",
            0.9
        )
    );
}


/* =========================================================
   OPEN FILE PICKER
========================================================= */

function openPhotoFilePicker() {

    const input =
        photoElement(
            "photoInput"
        );


    if (!input) {

        console.error(
            "PHOTOS: photoInput not found."
        );

        return;
    }


    input.value =
        "";


    input.click();
}


/* =========================================================
   HANDLE PHOTO FILE
========================================================= */

function handlePhotoFile(
    event
) {

    const input =
        event &&
        event.target
            ? event.target
            : photoElement(
                "photoInput"
            );


    if (
        !input ||
        !input.files ||
        !input.files.length
    ) {

        return;
    }


    const file =
        input.files[0];


    if (!file) {
        return;
    }


    if (
        !file.type ||
        !file.type.startsWith(
            "image/"
        )
    ) {

        setPhotoMessage(
            "Please choose an image."
        );

        return;
    }


    console.log(
        "PHOTOS: File selected:",
        file.name,
        file.type,
        file.size
    );


    const reader =
        new FileReader();


    reader.onload =
        function(event) {

            processPhotoData(
                event.target.result
            );

        };


    reader.onerror =
        function(error) {

            console.error(
                "PHOTOS: File read error:",
                error
            );

            setPhotoMessage(
                "Could not read that photo."
            );
        };


    reader.readAsDataURL(
        file
    );
}


/* =========================================================
   LOAD IMAGE
========================================================= */

function loadPhotoImage(
    source
) {

    return new Promise(
        function(resolve, reject) {

            const image =
                new Image();


            image.onload =
                function() {

                    resolve(
                        image
                    );

                };


            image.onerror =
                function(error) {

                    reject(
                        error
                    );

                };


            image.src =
                source;
        }
    );
}


/* =========================================================
   CALCULATE DIMENSIONS
========================================================= */

function calculatePhotoDimensions(
    width,
    height,
    maxDimension
) {

    if (
        width <= maxDimension &&
        height <= maxDimension
    ) {

        return {
            width: width,
            height: height
        };
    }


    const scale =
        Math.min(
            maxDimension / width,
            maxDimension / height
        );


    return {
        width:
            Math.round(
                width * scale
            ),

        height:
            Math.round(
                height * scale
            )
    };
}


/* =========================================================
   BASE64 SIZE
========================================================= */

function approximateBase64Bytes(
    base64
) {

    if (!base64) {
        return 0;
    }


    const comma =
        base64.indexOf(",");


    const data =
        comma >= 0
            ? base64.substring(
                comma + 1
            )
            : base64;


    return Math.floor(
        data.length * 0.75
    );
}


/* =========================================================
   PROCESS PHOTO
========================================================= */

async function processPhotoData(
    source
) {

    if (!source) {

        setPhotoMessage(
            "No photo selected."
        );

        return;
    }


    try {

        setPhotoMessage(
            "Processing photo..."
        );


        const image =
            await loadPhotoImage(
                source
            );


        const dimensions =
            calculatePhotoDimensions(
                image.naturalWidth ||
                    image.width,

                image.naturalHeight ||
                    image.height,

                1200
            );


        const canvas =
            document.createElement(
                "canvas"
            );


        canvas.width =
            dimensions.width;

        canvas.height =
            dimensions.height;


        const context =
            canvas.getContext(
                "2d"
            );


        context.drawImage(
            image,
            0,
            0,
            dimensions.width,
            dimensions.height
        );


        let quality =
            0.78;

        let output =
            canvas.toDataURL(
                "image/jpeg",
                quality
            );


        const targetBytes =
            350 * 1024;


        /* -------------------------------------------------
           Reduce quality until close to target
        ------------------------------------------------- */

        while (
            approximateBase64Bytes(
                output
            ) > targetBytes &&
            quality > 0.45
        ) {

            quality -=
                0.05;


            output =
                canvas.toDataURL(
                    "image/jpeg",
                    quality
                );
        }


        processedPhotoData =
            output;


        showProcessedPhoto(
            output
        );


        setPhotoMessage(
            "Photo ready."
        );


        console.log(
            "PHOTOS: Photo processed:",
            {
                width:
                    dimensions.width,

                height:
                    dimensions.height,

                quality:
                    quality,

                bytes:
                    approximateBase64Bytes(
                        output
                    )
            }
        );

    } catch (error) {

        console.error(
            "PHOTOS: Photo processing failed:",
            error
        );


        processedPhotoData =
            null;


        setPhotoMessage(
            "Could not process that photo."
        );
    }
}


/* =========================================================
   SHOW PROCESSED PHOTO
========================================================= */

function showProcessedPhoto(
    data
) {

    const preview =
        photoElement(
            "photoPreview"
        );


    if (!preview) {

        console.error(
            "PHOTOS: photoPreview not found."
        );

        return;
    }


    preview.src =
        data;


    photoHideElement(
        "cameraContainer"
    );


    photoShowElement(
        "photoPreviewContainer"
    );


    photoHideElement(
        "capturePhotoButton"
    );

    photoHideElement(
        "closeCameraButton"
    );


    photoShowElement(
        "submitPhotoButton"
    );


    photoShowElement(
        "takePhotoButton"
    );


    photoShowElement(
        "choosePhotoButton"
    );
}


/* =========================================================
   RETAKE PHOTO
========================================================= */

function retakePhoto() {

    processedPhotoData =
        null;


    const input =
        photoElement(
            "photoInput"
        );


    if (input) {

        input.value =
            "";
    }


    photoHideElement(
        "photoPreviewContainer"
    );


    photoHideElement(
        "submitPhotoButton"
    );


    setPhotoMessage(
        ""
    );


    console.log(
        "PHOTOS: Retaking photo."
    );
}


/* =========================================================
   SUBMIT PHOTO
========================================================= */

async function submitPhoto() {

    console.log(
        "PHOTOS: Submit photo requested."
    );


    if (!processedPhotoData) {

        setPhotoMessage(
            "Please take or choose a photo first."
        );

        return;
    }


    const game =
        getPhotoGame();


    const player =
        getPhotoPlayer();


    const category =
        getPhotoCategory();


    console.log(
        "PHOTOS: Submission data:",
        {
            game: game,
            player: player,
            category: category
        }
    );


    /* -----------------------------------------------------
       Resolve game code
    ----------------------------------------------------- */

    const gameCode =
        (
            game &&
            (
                game.gameCode ||
                game.GameCode ||
                game.code
            )
        ) ||

        (
            player &&
            (
                player.gameCode ||
                player.GameCode
            )
        ) ||

        (
            category &&
            (
                category.gameCode ||
                category.GameCode
            )
        ) ||

        "";


    /* -----------------------------------------------------
       Resolve player ID
    ----------------------------------------------------- */

    const playerId =
        (
            player &&
            (
                player.playerId ||
                player.PlayerID ||
                player.id
            )
        ) ||

        "";


    /* -----------------------------------------------------
       Resolve player name
    ----------------------------------------------------- */

    const playerName =
        (
            player &&
            (
                player.playerName ||
                player.PlayerName ||
                player.name
            )
        ) ||

        "";


    /* -----------------------------------------------------
       Resolve category ID
    ----------------------------------------------------- */

    const categoryId =
        (
            category &&
            (
                category.categoryId ||
                category.CategoryID ||
                category.id
            )
        ) ||

        "";


    /* -----------------------------------------------------
       Resolve category number
    ----------------------------------------------------- */

    const categoryNumber =
        (
            category &&
            (
                category.categoryNumber ||
                category.CategoryNumber ||
                category.number
            )
        ) ||

        "";


    /* -----------------------------------------------------
       Validate
    ----------------------------------------------------- */

    if (!gameCode) {

        console.error(
            "PHOTOS: Missing game code."
        );

        setPhotoMessage(
            "Game information is missing."
        );

        return;
    }


    if (!playerId) {

        console.error(
            "PHOTOS: Missing player ID."
        );

        setPhotoMessage(
            "Player information is missing."
        );

        return;
    }


    if (!categoryId) {

        console.error(
            "PHOTOS: Missing category ID.",
            category
        );

        setPhotoMessage(
            "Challenge information is missing."
        );

        return;
    }


    /* -----------------------------------------------------
       Disable buttons
    ----------------------------------------------------- */

    const submitButton =
        photoElement(
            "submitPhotoButton"
        );


    if (submitButton) {

        submitButton.disabled =
            true;

        submitButton.textContent =
            "Submitting...";
    }


    const passButton =
        photoElement(
            "passCategoryButton"
        );


    if (passButton) {

        passButton.disabled =
            true;
    }


    setPhotoMessage(
        "Submitting photo..."
    );


    try {

        const payload = {

            gameCode:
                gameCode,

            playerId:
                playerId,

            playerName:
                playerName,

            categoryId:
                categoryId,

            categoryNumber:
                categoryNumber,

            photoData:
                processedPhotoData
        };


        console.log(
            "PHOTOS: Sending submitEntry:",
            {
                gameCode:
                    payload.gameCode,

                playerId:
                    payload.playerId,

                categoryId:
                    payload.categoryId,

                categoryNumber:
                    payload.categoryNumber,

                photoBytes:
                    approximateBase64Bytes(
                        payload.photoData
                    )
            }
        );


        const result =
            await apiPost(
                "submitEntry",
                payload
            );


        console.log(
            "PHOTOS: submitEntry result:",
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
                    : "Photo submission failed."
            );
        }


        setPhotoMessage(
            "Challenge complete!"
        );


        processedPhotoData =
            null;


        stopPhotoCamera();


        /* -------------------------------------------------
           Return to collection screen
        ------------------------------------------------- */

        if (
            typeof window.showScreen ===
            "function"
        ) {

            window.showScreen(
                "collectionScreen"
            );
        }


        /* -------------------------------------------------
           Refresh collection
        ------------------------------------------------- */

        if (
            typeof window.refreshPlayerCategories ===
            "function"
        ) {

            setTimeout(
                function() {

                    window.refreshPlayerCategories();

                },
                100
            );
        }


        console.log(
            "PHOTOS: Photo submitted successfully."
        );

    } catch (error) {

        console.error(
            "PHOTOS: Submit failed:",
            error
        );


        setPhotoMessage(
            error.message ||
            "Could not submit photo."
        );


        if (submitButton) {

            submitButton.disabled =
                false;

            submitButton.textContent =
                "Submit Photo";
        }


        if (passButton) {

            passButton.disabled =
                false;
        }
    }
}


/* =========================================================
   PASS CATEGORY
========================================================= */

async function passPhotoCategory() {

    console.log(
        "PHOTOS: Pass requested."
    );


    const game =
        getPhotoGame();


    const player =
        getPhotoPlayer();


    const category =
        getPhotoCategory();


    console.log(
        "PHOTOS: Pass data:",
        {
            game: game,
            player: player,
            category: category
        }
    );


    /* -----------------------------------------------------
       Resolve fields
    ----------------------------------------------------- */

    const gameCode =
        (
            game &&
            (
                game.gameCode ||
                game.GameCode ||
                game.code
            )
        ) ||

        (
            player &&
            (
                player.gameCode ||
                player.GameCode
            )
        ) ||

        (
            category &&
            (
                category.gameCode ||
                category.GameCode
            )
        ) ||

        "";


    const playerId =
        (
            player &&
            (
                player.playerId ||
                player.PlayerID ||
                player.id
            )
        ) ||

        "";


    const playerName =
        (
            player &&
            (
                player.playerName ||
                player.PlayerName ||
                player.name
            )
        ) ||

        "";


    const categoryId =
        (
            category &&
            (
                category.categoryId ||
                category.CategoryID ||
                category.id
            )
        ) ||

        "";


    const categoryNumber =
        (
            category &&
            (
                category.categoryNumber ||
                category.CategoryNumber ||
                category.number
            )
        ) ||

        "";


    /* -----------------------------------------------------
       Validate
    ----------------------------------------------------- */

    if (!gameCode) {

        setPhotoMessage(
            "Game information is missing."
        );

        return;
    }


    if (!playerId) {

        setPhotoMessage(
            "Player information is missing."
        );

        return;
    }


    if (!categoryId) {

        setPhotoMessage(
            "Challenge information is missing."
        );

        return;
    }


    /* -----------------------------------------------------
       Confirm pass
    ----------------------------------------------------- */

    const confirmed =
        window.confirm(
            "Pass this challenge?"
        );


    if (!confirmed) {

        return;
    }


    const passButton =
        photoElement(
            "passCategoryButton"
        );


    const submitButton =
        photoElement(
            "submitPhotoButton"
        );


    if (passButton) {

        passButton.disabled =
            true;

        passButton.textContent =
            "Passing...";
    }


    if (submitButton) {

        submitButton.disabled =
            true;
    }


    setPhotoMessage(
        "Passing challenge..."
    );


    try {

        const payload = {

            gameCode:
                gameCode,

            playerId:
                playerId,

            playerName:
                playerName,

            categoryId:
                categoryId,

            categoryNumber:
                categoryNumber
        };


        console.log(
            "PHOTOS: Sending submitPass:",
            payload
        );


        const result =
            await apiPost(
                "submitPass",
                payload
            );


        console.log(
            "PHOTOS: submitPass result:",
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
                    : "Pass failed."
            );
        }


        processedPhotoData =
            null;


        stopPhotoCamera();


        setPhotoMessage(
            "Challenge passed."
        );


        /* -------------------------------------------------
           Return to collection
        ------------------------------------------------- */

        if (
            typeof window.showScreen ===
            "function"
        ) {

            window.showScreen(
                "collectionScreen"
            );
        }


        /* -------------------------------------------------
           Refresh collection
        ------------------------------------------------- */

        if (
            typeof window.refreshPlayerCategories ===
            "function"
        ) {

            setTimeout(
                function() {

                    window.refreshPlayerCategories();

                },
                100
            );
        }


        console.log(
            "PHOTOS: Challenge passed successfully."
        );

    } catch (error) {

        console.error(
            "PHOTOS: Pass failed:",
            error
        );


        setPhotoMessage(
            error.message ||
            "Could not pass challenge."
        );


        if (passButton) {

            passButton.disabled =
                false;

            passButton.textContent =
                "Pass This Challenge";
        }


        if (submitButton) {

            submitButton.disabled =
                false;
        }
    }
}


/* =========================================================
   SETUP BUTTONS
========================================================= */

function setupPhotoButtons() {

    console.log(
        "PHOTOS: Setting up buttons."
    );


    const takePhotoButton =
        photoElement(
            "takePhotoButton"
        );


    if (takePhotoButton) {

        takePhotoButton.onclick =
            function(event) {

                event.preventDefault();

                startPhotoCamera();

            };
    }


    const choosePhotoButton =
        photoElement(
            "choosePhotoButton"
        );


    if (choosePhotoButton) {

        choosePhotoButton.onclick =
            function(event) {

                event.preventDefault();

                openPhotoFilePicker();

            };
    }


    const capturePhotoButton =
        photoElement(
            "capturePhotoButton"
        );


    if (capturePhotoButton) {

        capturePhotoButton.onclick =
            function(event) {

                event.preventDefault();

                capturePhoto();

            };
    }


    const closeCameraButton =
        photoElement(
            "closeCameraButton"
        );


    if (closeCameraButton) {

        closeCameraButton.onclick =
            function(event) {

                event.preventDefault();

                stopPhotoCamera();

                photoHideElement(
                    "cameraContainer"
                );

                photoShowElement(
                    "takePhotoButton"
                );

                photoShowElement(
                    "choosePhotoButton"
                );

                photoHideElement(
                    "capturePhotoButton"
                );

                photoHideElement(
                    "closeCameraButton"
                );

            };
    }


    const uploadBackButton =
        photoElement(
            "uploadBackButton"
        );


    if (uploadBackButton) {

        uploadBackButton.onclick =
            function(event) {

                event.preventDefault();

                closePhotoUpload();

            };
    }


    const photoInput =
        photoElement(
            "photoInput"
        );


    if (photoInput) {

        photoInput.onchange =
            handlePhotoFile;
    }


    const submitPhotoButton =
        photoElement(
            "submitPhotoButton"
        );


    if (submitPhotoButton) {

        submitPhotoButton.onclick =
            function(event) {

                event.preventDefault();

                submitPhoto();

            };
    }


    const passCategoryButton =
        photoElement(
            "passCategoryButton"
        );


    if (passCategoryButton) {

        passCategoryButton.onclick =
            function(event) {

                event.preventDefault();

                passPhotoCategory();

            };
    }


    const photoPreviewContainer =
        photoElement(
            "photoPreviewContainer"
        );


    if (photoPreviewContainer) {

        /*
         * Retake can be triggered by clicking
         * the preview area if no dedicated
         * retake button exists in the HTML.
         */
    }


    console.log(
        "PHOTOS: Buttons ready."
    );
}


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        console.log(
            "================================="
        );

        console.log(
            "Find It! photos.js ready"
        );

        console.log(
            "================================="
        );


        setupPhotoButtons();


        resetPhotoUI();

    }
);


/* =========================================================
   GLOBAL EXPORTS
========================================================= */

window.openPhotoUpload =
    openPhotoUpload;


window.closePhotoUpload =
    closePhotoUpload;


window.startPhotoCamera =
    startPhotoCamera;


window.capturePhoto =
    capturePhoto;


window.openPhotoFilePicker =
    openPhotoFilePicker;


window.handlePhotoFile =
    handlePhotoFile;


window.processPhotoData =
    processPhotoData;


window.showProcessedPhoto =
    showProcessedPhoto;


window.retakePhoto =
    retakePhoto;


window.submitPhoto =
    submitPhoto;


window.passPhotoCategory =
    passPhotoCategory;


window.resetPhotoUpload =
    resetPhotoUpload;


window.resetPhotoUI =
    resetPhotoUI;


window.setPhotoCategory =
    setPhotoCategory;


window.getPhotoCategory =
    getPhotoCategory;


window.getPhotoGame =
    getPhotoGame;


window.getPhotoPlayer =
    getPhotoPlayer;


/* =========================================================
   END PHOTOS.JS
========================================================= */