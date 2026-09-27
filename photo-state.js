/* =========================================================
   FIND IT! - photo-state.js
   SINGLE SHARED STATE OWNER
========================================================= */
(function () {
    "use strict";

    const state = {
        selectedCategory: null,
        processedPhotoData: null,
        photoStream: null,
        submissionBusy: false
    };

    const api = window.FindItPhoto || {};

    api.getCategory = function () { return state.selectedCategory; };
    api.setCategory = function (category) { state.selectedCategory = category || null; };
    api.getProcessedPhoto = function () { return state.processedPhotoData; };
    api.setProcessedPhoto = function (data) { state.processedPhotoData = data || null; };
    api.clearPhoto = function () { state.processedPhotoData = null; };
    api.getStream = function () { return state.photoStream; };
    api.setStream = function (stream) { state.photoStream = stream || null; };
    api.getSubmissionBusy = function () { return state.submissionBusy; };
    api.setSubmissionBusy = function (busy) { state.submissionBusy = !!busy; };
    api.reset = function () {
        state.selectedCategory = null;
        state.processedPhotoData = null;
        state.photoStream = null;
        state.submissionBusy = false;
    };

    window.FindItPhoto = api;
    console.log("Find It! photo-state.js ready");
})();