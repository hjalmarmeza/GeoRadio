/*
 * GOOGLE APPS SCRIPT CODE (BACKEND)
 * Copy this content into your Google Apps Script project (Code.gs)
 */

function doGet(e) {
    return handleRequest(e);
}

function doPost(e) {
    return handleRequest(e);
}

function handleRequest(e) {
    // CORS Layout
    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);

    // CORS Headers hack not needed for ContentService JSONP/JSON return usually, 
    // but let's handle the logic first.

    try {
        const action = e.parameter.action;

        // IMPORTANT: Change this to your Sheet ID
        const SHEET_ID = "YOUR_SHEET_ID_HERE";
        const ss = SpreadsheetApp.openById(SHEET_ID);
        const sheet = ss.getSheetByName("Users");

        if (!sheet) {
            // First run setup
            const newSheet = ss.insertSheet("Users");
            newSheet.appendRow(["Timestamp", "ID", "Name", "Email", "Password", "LastLogin"]);
            return jsonResponse({ status: "error", message: "Users sheet created. Please retry." });
        }

        if (action === "register") {
            const email = e.parameter.email;
            const pass = e.parameter.password;
            const name = e.parameter.name;

            // Check duplicate
            const data = sheet.getDataRange().getValues();
            for (let i = 1; i < data.length; i++) {
                if (data[i][3] === email) {
                    return jsonResponse({ status: "error", message: "El email ya está registrado." });
                }
            }

            const id = Utilities.getUuid();
            sheet.appendRow([new Date(), id, name, email, pass, new Date()]); // Pass should be hashed in real prod!

            return jsonResponse({ status: "success", user: { name: name, email: email, id: id } });

        } else if (action === "login") {
            const email = e.parameter.email;
            const pass = e.parameter.password;

            const data = sheet.getDataRange().getValues();
            for (let i = 1; i < data.length; i++) {
                if (data[i][3] === email && data[i][4] === pass) {
                    // Update Last Login
                    sheet.getRange(i + 1, 6).setValue(new Date());

                    return jsonResponse({
                        status: "success",
                        user: {
                            name: data[i][2],
                            email: data[i][3],
                            id: data[i][1]
                        }
                    });
                }
            }
            return jsonResponse({ status: "error", message: "Credenciales incorrectas." });

        } else if (action === "forgot") {
            const email = e.parameter.email;
            const data = sheet.getDataRange().getValues();
            for (let i = 1; i < data.length; i++) {
                if (data[i][3] === email) {
                    // Generate temp pass
                    const tempPass = Math.random().toString(36).slice(-8);
                    sheet.getRange(i + 1, 5).setValue(tempPass);

                    // Send Email
                    MailApp.sendEmail({
                        to: email,
                        subject: "GeoRadio - Recuperación de contraseña",
                        body: "Hola " + data[i][2] + ",\n\nTu nueva contraseña provisional es: " + tempPass + "\n\nPor favor inicia sesión y cámbiala lo antes posible.\n\nSaludos,\nEquipo GeoRadio"
                    });

                    return jsonResponse({ status: "success", message: "Se ha enviado una nueva contraseña a tu correo." });
                }
            }
            return jsonResponse({ status: "error", message: "Email no encontrado." });
        }

        return jsonResponse({ status: "error", message: "Acción desconocida" });

    } catch (err) {
        return jsonResponse({ status: "error", message: err.toString() });
    }
}

function jsonResponse(data) {
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function setup() {
    // Helper to init sheet manually if needed
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("Users");
    if (!sheet) {
        sheet = ss.insertSheet("Users");
        sheet.appendRow(["Timestamp", "ID", "Name", "Email", "Password", "LastLogin"]);
    }
}
