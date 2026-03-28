/* =========================================
   GEORADIO BACKEND V4 - MAINTENANCE MODE
   ========================================= */








const SHEET_ID = Utilities.newBlob(Utilities.base64Decode("MWZOelVFdnlZcFBQT1IwX1BqeVc5RzJyZmUwWHVVUURwdm1Da0lDX3owU0E=")).getDataAsString();Utilities.newBlob(Utilities.base64Decode("MWZOelVFdnlZcFBQT1IwX1BqeVc5RzJyZmUwWHVVUURwdm1Da0lDX3owU0E=")).getDataAsString().getDataAsString();








function doGet(e) { return handleRequest(e); }
function doPost(e) { return handleRequest(e); }








function handleRequest(e) {
    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);








    try {
        const action = e.parameter.action;
        const ss = SpreadsheetApp.openById(SHEET_ID);








        // Config Sheet for Maintenance Mode
        let configSheet = ss.getSheetByName("Config");
        if (!configSheet) {
            configSheet = ss.insertSheet("Config");
            configSheet.appendRow(["Key", "Value"]);
            configSheet.appendRow(["MAINTENANCE_MODE", "FALSE"]);
        }








        let usersSheet = ss.getSheetByName("Users");
        if (!usersSheet) {
            usersSheet = ss.insertSheet("Users");
            usersSheet.appendRow(["Timestamp", "ID", "Name", "Email", "Password", "LastLogin", "RecoveryCode", "ForceReset"]);
        }








        // --- ACCIÓN: CHECK MAINTENANCE ---
        if (action === "check_status") {
            const configData = configSheet.getDataRange().getValues();
            let isDown = false;
            // Find the Row for MAINTENANCE_MODE
