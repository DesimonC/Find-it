/* =========================================================
   FIND IT!
   entries-submit.gs

   ENTRY SUBMISSION STATUS / DIAGNOSTIC MODULE

   This is the first stage of splitting the oversized entries.gs.
   Code.gs can route submitEntry through submitEntryWithDiagnostics().
   The existing submitEntry() remains in entries.gs until its full
   photo-storage body is moved safely, so there are no duplicate
   global function names during the transition.
========================================================= */

/**
 * Read the exact Games-sheet row/status used for an entry submission.
 * This deliberately reads the sheet directly so we can compare it with
 * getGame(gameCode) and identify deployment/sheet mismatches.
 */
function getSubmitEntryGameStatusDebug(gameCode) {
  gameCode = String(gameCode || "").trim().toUpperCase();

  const result = {
    gameCode: gameCode,
    matchedRow: -1,
    rawStatus: "",
    normalizedStatus: "",
    getGameStatus: ""
  };

  if (!gameCode) {
    return result;
  }

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
    const values = sheet
      .getRange(2, 1, lastRow - 1, headers.length)
      .getValues();

    for (let i = 0; i < values.length; i++) {
      const rowGameCode = String(
        values[i][gameCodeColumn] || ""
      ).trim().toUpperCase();

      if (rowGameCode === gameCode) {
        result.matchedRow = i + 2;
        result.rawStatus = values[i][statusColumn];
        result.normalizedStatus = String(
          result.rawStatus || ""
        ).trim().toUpperCase();
        break;
      }
    }
  }

  try {
    const game = getGame(gameCode);
    result.getGameStatus = String(
      game && game.status || ""
    ).trim().toUpperCase();
  } catch (error) {
    result.getGameError = error.message || String(error);
  }

  return result;
}


/**
 * Temporary diagnostic wrapper for the existing submitEntry().
 * It preserves the existing upload/storage behavior while enriching
 * failed status responses with the exact Games-sheet values requested.
 */
function submitEntryWithDiagnostics(data) {
  data = data || {};

  const gameCode = String(
    data.gameCode || ""
  ).trim().toUpperCase();

  const debug = getSubmitEntryGameStatusDebug(gameCode);

  console.log(
    "SUBMIT ENTRY STATUS DEBUG:",
    JSON.stringify(debug)
  );

  /*
     If the Games row itself is not PLAYING, return immediately with
     exact diagnostics. This is the same status gate as submitEntry(),
     but now exposes the raw sheet value and matched row.
  */
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

  /* Existing photo upload / Entries write remains authoritative. */
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
