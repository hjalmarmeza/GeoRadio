/* =========================================
   GEORADIO BACKEND V4 - MAINTENANCE MODE
   ========================================= */

const SHEET_ID = "1fNzUEvyYpPPOR0_PjyW9G2rfe0XuUQDpvmCkIC_z0SA";

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
            for (let k = 1; k < configData.length; k++) {
                if (configData[k][0] === "MAINTENANCE_MODE") {
                    isDown = (String(configData[k][1]).toUpperCase() === "TRUE");
                    break;
                }
            }
            return jsonResponse({ status: "success", maintenance: isDown });
        }

        // --- ACCIÓN: SET MAINTENANCE (Only Admin should call this, backend assumes frontend checked auth) ---
        else if (action === "set_maintenance") {
            const newVal = e.parameter.value; // "TRUE" or "FALSE"
            const configData = configSheet.getDataRange().getValues();
            let found = false;
            for (let k = 1; k < configData.length; k++) {
                if (configData[k][0] === "MAINTENANCE_MODE") {
                    configSheet.getRange(k + 1, 2).setValue(newVal.toUpperCase());
                    found = true;
                    break;
                }
            }
            if (!found) {
                configSheet.appendRow(["MAINTENANCE_MODE", newVal.toUpperCase()]);
            }
            return jsonResponse({ status: "success", maintenance: (newVal.toUpperCase() === "TRUE") });
        }

        const data = usersSheet.getDataRange().getValues();

        // --- ACCIÓN: REGISTRO ---
        if (action === "register") {
            const email = e.parameter.email.trim().toLowerCase();
            const pass = e.parameter.password.trim();
            const name = e.parameter.name;

            if (!email || !pass) return jsonResponse({ status: "error", message: "Faltan datos." });

            for (let i = 1; i < data.length; i++) {
                if (String(data[i][3]).trim().toLowerCase() == email) return jsonResponse({ status: "error", message: "Este email ya existe." });
            }

            const id = Utilities.getUuid();
            const timestamp = new Date();
            usersSheet.appendRow([timestamp, id, name, email, pass, timestamp, "", ""]);

            return jsonResponse({ status: "success", user: { name, email, id } });

            // --- ACCIÓN: LOGIN ---
        } else if (action === "login") {
            const email = e.parameter.email.trim().toLowerCase();
            const pass = e.parameter.password.trim();

            for (let i = 1; i < data.length; i++) {
                const dbEmail = String(data[i][3]).trim().toLowerCase();
                const dbPass = String(data[i][4]).trim();

                if (dbEmail === email && dbPass === pass) {

                    // Verificar ForceReset (Columna H / Indice 7)
                    const forceResetRaw = String(data[i][7]).trim().toUpperCase();
                    const forceReset = (forceResetRaw === "TRUE");

                    return jsonResponse({
                        status: "success",
                        user: {
                            name: data[i][2],
                            email: data[i][3],
                            id: data[i][1],
                            mustChangePassword: forceReset
                        }
                    });
                }
            }
            return jsonResponse({ status: "error", message: "Credenciales inválidas." });

            // --- ACCIÓN: OLVIDÉ CONTRASEÑA ---
        } else if (action === "forgot") {
            const email = e.parameter.email.trim().toLowerCase();
            let found = false;
            for (let i = 1; i < data.length; i++) {
                if (String(data[i][3]).trim().toLowerCase() == email) {
                    found = true;
                    const userName = data[i][2];
                    const tempPass = Math.random().toString(36).slice(-8).toUpperCase();

                    usersSheet.getRange(i + 1, 5).setValue(tempPass);
                    usersSheet.getRange(i + 1, 8).setValue("TRUE");

                    try {
                        MailApp.sendEmail({
                            to: email,
                            subject: "🔐 Recuperación de Acceso - GeoRadio",
                            name: "Soporte GeoRadio",
                            body: `Hola ${userName},\n\nHemos recibido una solicitud para restablecer tu contraseña.\n\nTu contraseña temporal es: ${tempPass}\n\n⚠️ Por seguridad, deberás cambiarla al ingresar.\n\nAtte,\nEquipo GeoRadio\n(No responder)`
                        });
                        return jsonResponse({ status: "success", message: "Correo de recuperación enviado." });
                    } catch (e) {
                        return jsonResponse({ status: "error", message: "Error enviando correo." });
                    }
                }
            }
            if (!found) return jsonResponse({ status: "error", message: "Email no encontrado." });

            // --- ACCIÓN: CAMBIAR CONTRASEÑA ---
        } else if (action === "change_password") {
            const email = e.parameter.email.trim().toLowerCase();
            const newPass = e.parameter.new_password.trim();

            for (let i = 1; i < data.length; i++) {
                if (String(data[i][3]).trim().toLowerCase() == email) {
                    usersSheet.getRange(i + 1, 5).setValue(newPass);
                    usersSheet.getRange(i + 1, 8).setValue("");
                    return jsonResponse({ status: "success", message: "Contraseña actualizada." });
                }
            }
            return jsonResponse({ status: "error", message: "Usuario no encontrado." });
        }

        return jsonResponse({ status: "error", message: "Acción desconocida" });

    } catch (err) {
        return jsonResponse({ status: "error", message: "Error Servidor: " + err.toString() });
    }
}

function jsonResponse(data) {
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
