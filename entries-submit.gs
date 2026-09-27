/* =========================================================
   FIND IT!
   entries-submit.gs

   PHOTO SUBMISSION / STATUS DIAGNOSTICS
========================================================= */

function getSubmitEntryGameStatusDebug(gameCode) {
  gameCode = String(gameCode || "").trim().toUpperCase();

  const result = {
    gameCode: gameCode,
    matchedRow: -1,
    rawStatus: "",
    normalizedStatus: "",
    getGameStatus: ""
  };

  if (!gameCode) return result;

  const sheet = getSheet(GAMES_SHEET);
  if (!sheet) {
    result.error = "Games sheet not found.";
    return result;
  }

  const headers = getHeaders(sheet);
  const gameCodeColumn = findColumn(headers, "GameCode");
  const statusColumn = findColumn(headers, "Status");

  if (gameCodeColumn === -1) {
    result.error = "Games sheet is missing GameCode column.";
    return result;
  }

  if (statusColumn === -1) {
    result.error = "Games sheet is missing Status column.";
    return result;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();

    for (let i = 0; i < values.length; i++) {
      const rowGameCode = String(values[i][gameCodeColumn] || "").trim().toUpperCase();
      if (rowGameCode === gameCode) {
        result.matchedRow = i + 2;
        result.rawStatus = values[i][statusColumn];
        result.normalizedStatus = String(result.rawStatus || "").trim().toUpperCase();
        break;
      }
    }
  }

  try {
    const game = getGame(gameCode);
    result.getGameStatus = String(game && game.status || "").trim().toUpperCase();
  } catch (error) {
    result.getGameError = error.message || String(error);
  }

  return result;
}

function submitEntryWithDiagnostics(data) {
  data = data || {};

  const gameCode = String(data.gameCode || "").trim().toUpperCase();
  const debug = getSubmitEntryGameStatusDebug(gameCode);

  console.log("SUBMIT ENTRY STATUS DEBUG:", JSON.stringify(debug));

  if (debug.normalizedStatus !== "PLAYING") {
    return {
      success: false,
      error: "The game is not currently playing.",
      debugGameCode: debug.gameCode,
      debugMatchedRow: debug.matchedRow,
      debugRawStatus: String(debug.rawStatus),
      debugNormalizedStatus: debug.normalizedStatus,
      debugGetGameStatus: debug.getGameStatus,
      debugError: debug.error || debug.getGameError || ""
    };
  }

  const response = submitEntry(data);

  if (response && response.success === false) {
    response.debugGameCode = debug.gameCode;
    response.debugMatchedRow = debug.matchedRow;
    response.debugRawStatus = String(debug.rawStatus);
    response.debugNormalizedStatus = debug.normalizedStatus;
    response.debugGetGameStatus = debug.getGameStatus;
  }

  return response;
}

/* =========================================================
   SUBMIT ENTRY
========================================================= */

function submitEntry(data) {
  data = data || {};

  const gameCode = String(data.gameCode || "").trim().toUpperCase();
  const playerId = String(data.playerId || "").trim();
  const playerName = String(data.playerName || "").trim();
  const categoryId = String(data.categoryId || "").trim();
  const categoryNumber = Number(data.categoryNumber || 0);
  const photoData = String(data.photoData || "").trim();

  console.log("=================================================");
  console.log("SUBMIT ENTRY START");
  console.log("Game:", gameCode);
  console.log("Player:", playerId, playerName);
  console.log("Category:", categoryId, categoryNumber);
  console.log("Photo data length:", photoData.length);

  if (!gameCode) return { success: false, error: "Game code is required." };
  if (!playerId) return { success: false, error: "Player ID is required." };
  if (!playerName) return { success: false, error: "Player name is required." };
  if (!categoryId) return { success: false, error: "Category ID is required." };
  if (!photoData) return { success: false, error: "Photo data is required." };

  const game = getGame(gameCode);
  if (!game) return { success: false, error: "Game not found." };

  const gameStatus = String(game.status || "").trim().toUpperCase();
  console.log("GAME STATUS:", gameStatus);

  if (gameStatus !== "PLAYING") {
    return { success: false, error: "The game is not currently playing." };
  }

  const player = findPlayer(gameCode, playerId);
  if (!player) {
    return { success: false, error: "Player not found in this game." };
  }

  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    const sheet = getSheet(ENTRIES_SHEET);
    if (!sheet) {
      console.log("ERROR: Entries sheet not found.");
      return { success: false, error: "Entries sheet not found." };
    }

    const spreadsheet = sheet.getParent();
    console.log("SPREADSHEET NAME:", spreadsheet.getName());
    console.log("SPREADSHEET ID:", spreadsheet.getId());
    console.log("ENTRIES SHEET NAME:", sheet.getName());

    const headers = getHeaders(sheet);
    console.log("ENTRIES HEADERS:", headers);

    const requiredColumns = [
      "EntryID", "GameCode", "PlayerID", "PlayerName", "CategoryID",
      "CategoryNumber", "Status", "PhotoID", "PhotoURL", "Submitted"
    ];

    for (let i = 0; i < requiredColumns.length; i++) {
      if (findColumn(headers, requiredColumns[i]) === -1) {
        return {
          success: false,
          error: "Entries sheet is missing column: " + requiredColumns[i]
        };
      }
    }

    const lastRowBeforeDuplicateCheck = sheet.getLastRow();
    if (lastRowBeforeDuplicateCheck >= 2) {
      const values = sheet
        .getRange(2, 1, lastRowBeforeDuplicateCheck - 1, headers.length)
        .getValues();

      const gameCodeColumn = findColumn(headers, "GameCode");
      const playerIdColumn = findColumn(headers, "PlayerID");
      const categoryIdColumn = findColumn(headers, "CategoryID");

      for (let i = 0; i < values.length; i++) {
        const row = values[i];
        const rowGameCode = String(row[gameCodeColumn] || "").trim().toUpperCase();
        const rowPlayerId = String(row[playerIdColumn] || "").trim();
        const rowCategoryId = String(row[categoryIdColumn] || "").trim();

        if (
          rowGameCode === gameCode &&
          rowPlayerId === playerId &&
          rowCategoryId === categoryId
        ) {
          console.log("DUPLICATE ENTRY FOUND.");
          return {
            success: false,
            error: "You have already completed this category."
          };
        }
      }
    }

    let folder;
    const folders = DriveApp.getFoldersByName("Find It Photos");

    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder("Find It Photos");
    }

    try {
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (error) {
      console.log("Folder sharing warning:", error.message);
    }

    const match = photoData.match(/^data:(image\/[^;]+);base64,(.+)$/);
    if (!match) {
      console.log("ERROR: Invalid photo data.");
      return { success: false, error: "Invalid photo data." };
    }

    const mimeType = match[1];
    const base64Data = match[2];

    let bytes;
    try {
      bytes = Utilities.base64Decode(base64Data);
    } catch (error) {
      console.log("BASE64 ERROR:", error.message);
      return { success: false, error: "Unable to decode photo." };
    }

    const blob = Utilities.newBlob(bytes, mimeType);

    let extension = "jpg";
    if (mimeType === "image/png") extension = "png";
    else if (mimeType === "image/webp") extension = "webp";
    else if (mimeType === "image/heic") extension = "heic";

    const timestamp = Date.now();
    const fileName =
      gameCode + "_" + playerId + "_" + categoryId + "_" + timestamp + "." + extension;

    blob.setName(fileName);

    let file;
    try {
      file = folder.createFile(blob);
      file.setDescription(
        "Find It! GameCode: " + gameCode + " | PlayerID: " + playerId
      );
      console.log("DRIVE FILE CREATED:", file.getId());
    } catch (error) {
      console.log("DRIVE CREATE ERROR:", error.message);
      return { success: false, error: "Unable to save photo: " + error.message };
    }

    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (error) {
      console.log("FILE SHARING ERROR:", error.message);
      try { file.setTrashed(true); } catch (trashError) {}
      return {
        success: false,
        error: "Unable to make photo accessible: " + error.message
      };
    }

    const photoId = file.getId();
    let resourceKey = "";

    try {
      if (typeof file.getResourceKey === "function") {
        resourceKey = String(file.getResourceKey() || "").trim();
      }
    } catch (error) {
      resourceKey = "";
    }

    const photoUrl = buildDrivePhotoUrl(photoId, resourceKey);
    console.log("PHOTO ID:", photoId);
    console.log("PHOTO URL:", photoUrl);

    const entryId = Utilities.getUuid();
    const row = new Array(headers.length).fill("");

    setIfColumnExists(row, headers, "EntryID", entryId);
    setIfColumnExists(row, headers, "GameCode", gameCode);
    setIfColumnExists(row, headers, "PlayerID", playerId);
    setIfColumnExists(row, headers, "PlayerName", playerName);
    setIfColumnExists(row, headers, "CategoryID", categoryId);
    setIfColumnExists(row, headers, "CategoryNumber", categoryNumber);
    setIfColumnExists(row, headers, "Status", "Submitted");
    setIfColumnExists(row, headers, "PhotoID", photoId);
    setIfColumnExists(row, headers, "PhotoURL", photoUrl);
    setIfColumnExists(row, headers, "Submitted", new Date());

    console.log("ENTRY ROW TO WRITE:", JSON.stringify(row));

    const rowBeforeWrite = sheet.getLastRow();
    const writeRow = Math.max(2, rowBeforeWrite + 1);

    console.log("ENTRIES LAST ROW BEFORE:", rowBeforeWrite);
    console.log("EXACT ROW TO WRITE:", writeRow);

    try {
      sheet.getRange(writeRow, 1, 1, headers.length).setValues([row]);
      SpreadsheetApp.flush();
      console.log("ENTRY SETVALUES COMPLETE.");
    } catch (writeError) {
      console.log("ENTRY WRITE ERROR:", writeError.message);
      try { file.setTrashed(true); } catch (trashError) {}

      return {
        success: false,
        error: "Photo uploaded but Entries row could not be written: " + writeError.message,
        spreadsheetId: spreadsheet.getId(),
        spreadsheetName: spreadsheet.getName(),
        sheetName: sheet.getName()
      };
    }

    SpreadsheetApp.flush();

    const verifyValues = sheet
      .getRange(writeRow, 1, 1, headers.length)
      .getValues()[0];

    console.log("EXACT ROW READ BACK:", JSON.stringify(verifyValues));

    const verifyEntryId = String(
      getValueFromRow(headers, verifyValues, "EntryID") || ""
    ).trim();

    const verifyGameCode = String(
      getValueFromRow(headers, verifyValues, "GameCode") || ""
    ).trim().toUpperCase();

    const verifyPlayerId = String(
      getValueFromRow(headers, verifyValues, "PlayerID") || ""
    ).trim();

    const verifyPhotoId = String(
      getValueFromRow(headers, verifyValues, "PhotoID") || ""
    ).trim();

    const verifyCategoryId = String(
      getValueFromRow(headers, verifyValues, "CategoryID") || ""
    ).trim();

    console.log("ENTRY VERIFICATION:", JSON.stringify({
      expectedEntryId: entryId,
      actualEntryId: verifyEntryId,
      expectedGameCode: gameCode,
      actualGameCode: verifyGameCode,
      expectedPlayerId: playerId,
      actualPlayerId: verifyPlayerId,
      expectedCategoryId: categoryId,
      actualCategoryId: verifyCategoryId,
      expectedPhotoId: photoId,
      actualPhotoId: verifyPhotoId,
      writeRow: writeRow
    }));

    const entryVerified =
      verifyEntryId === entryId &&
      verifyGameCode === gameCode &&
      verifyPlayerId === playerId &&
      verifyCategoryId === categoryId &&
      verifyPhotoId === photoId;

    if (!entryVerified) {
      console.log("ERROR: ENTRY WAS NOT VERIFIED.");

      try { file.setTrashed(true); }
      catch (trashError) {
        console.log("Unable to trash orphan photo:", trashError.message);
      }

      return {
        success: false,
        error: "Photo was uploaded but the Entries spreadsheet row could not be verified.",
        spreadsheetId: spreadsheet.getId(),
        spreadsheetName: spreadsheet.getName(),
        sheetName: sheet.getName(),
        attemptedRow: writeRow
      };
    }

    console.log("ENTRY SUCCESSFULLY STORED:", entryId);

    let playerCompleted = false;
    try {
      playerCompleted = updatePlayerProgress(gameCode, playerId, "Completed");
      SpreadsheetApp.flush();
    } catch (error) {
      console.log("PLAYER UPDATE WARNING:", error.message);
    }

    let completion = {
      gameStatus: gameStatus,
      currentCategory: categoryNumber
    };

    let completionWarning = "";

    try {
      completion = checkGameCompletion(gameCode);
      console.log("GAME COMPLETION CHECK:", completion);
    } catch (error) {
      completionWarning = error.message || String(error);
      console.log("GAME COMPLETION WARNING:", completionWarning);
    }

    console.log("PHOTO SUBMISSION COMPLETE:", JSON.stringify({
      entryId: entryId,
      photoId: photoId,
      gameCode: gameCode,
      playerId: playerId,
      categoryId: categoryId,
      spreadsheetId: spreadsheet.getId(),
      spreadsheetName: spreadsheet.getName(),
      sheetName: sheet.getName(),
      writtenRow: writeRow,
      gameStatus: completion.gameStatus
    }));

    return {
      success: true,
      entryId: entryId,
      photoId: photoId,
      photoUrl: photoUrl,
      resourceKey: resourceKey,
      playerCompleted: playerCompleted,
      gameStatus: completion.gameStatus,
      currentCategory: completion.currentCategory,
      completionWarning: completionWarning,
      spreadsheetId: spreadsheet.getId(),
      spreadsheetName: spreadsheet.getName(),
      sheetName: sheet.getName(),
      writtenRow: writeRow
    };

  } finally {
    try { lock.releaseLock(); } catch (error) {}
  }
}
