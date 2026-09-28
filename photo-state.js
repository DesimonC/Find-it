/* =========================================================
   FIND IT! - photo-state.js
   SINGLE SHARED STATE OWNER
========================================================= */
(function () {
    "use strict";

    const STAGE = Object.freeze({
        OPTIONS: "OPTIONS",
        CAMERA: "CAMERA",
        PROCESSING: "PROCESSING",
        PREVIEW: "PREVIEW",
        SUBMITTING: "SUBMITTING"
    });

    const state = {
        selectedCategory: null,
        stage: STAGE.OPTIONS,
        originalPhoto: null,
        processedPhotoData: null,
        photoStream: null,
        submissionBusy: false
    };

    const api = window.FindItPhoto || {};

    api.STAGE = STAGE;
    api.getStage = function () { return state.stage; };
    api.setStage = function (stage) {
        state.stage = Object.prototype.hasOwnProperty.call(STAGE, stage) ? STAGE[stage] : (Object.values(STAGE).includes(stage) ? stage : STAGE.OPTIONS);
    };
    api.isPhotoFlowActive = function () {
        return [STAGE.CAMERA, STAGE.PROCESSING, STAGE.PREVIEW, STAGE.SUBMITTING].includes(state.stage);
    };

    api.getCategory = function () { return state.selectedCategory; };
    api.setCategory = function (category) { state.selectedCategory = category || null; };

    api.getOriginalPhoto = function () { return state.originalPhoto; };
    api.setOriginalPhoto = function (data) { state.originalPhoto = data || null; };
    api.clearOriginalPhoto = function () { state.originalPhoto = null; };

    api.getProcessedPhoto = function () { return state.processedPhotoData; };
    api.setProcessedPhoto = function (data) { state.processedPhotoData = data || null; };
    api.clearPhoto = function () {
        state.originalPhoto = null;
        state.processedPhotoData = null;
    };

    api.getStream = function () { return state.photoStream; };
    api.setStream = function (stream) { state.photoStream = stream || null; };

    api.getSubmissionBusy = function () { return state.submissionBusy; };
    api.setSubmissionBusy = function (busy) { state.submissionBusy = !!busy; };

    api.resetImage = function () {
        state.originalPhoto = null;
        state.processedPhotoData = null;
        state.submissionBusy = false;
        state.stage = STAGE.OPTIONS;
    };

    api.reset = function () {
        state.selectedCategory = null;
        state.stage = STAGE.OPTIONS;
        state.originalPhoto = null;
        state.processedPhotoData = null;
        state.photoStream = null;
        state.submissionBusy = false;
    };

    window.FindItPhoto = api;
    window.isPlayerPhotoFlowActive = function () {
        return !!(window.FindItPhoto && window.FindItPhoto.isPhotoFlowActive());
    };
    console.log("Find It! photo-state.js ready");
})();