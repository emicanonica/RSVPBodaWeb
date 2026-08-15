/**
 * GOOGLE APPS SCRIPT - BACKEND GALERÍA DE BODA
 * 
 * Instrucciones de instalación:
 * 1. Ve a https://script.google.com/ e inicia sesión con tu cuenta de Google.
 * 2. Crea un nuevo proyecto llamado "Boda Fotos Backend".
 * 3. En la raíz de tu Google Drive, crea una carpeta llamada "Fotos Boda Lucia y Emilio".
 * 4. Copia el ID de esa carpeta (lo que está en la URL de Drive después de /folders/...) 
 *    y pégalo en la variable FOLDER_ID abajo.
 * 5. Reemplaza todo el contenido del archivo Code.gs con este código.
 * 6. Haz clic en "Implementar" -> "Nueva implementación" -> Selecciona "Aplicación web".
 * 7. Ejecutar como: "Yo" | Quién tiene acceso: "Cualquier persona".
 * 8. Copia la URL de la aplicación web generada y pégala en fotos.js en SCRIPT_URL.
 */

// === CONFIGURACIÓN DE TU DRIVE Y MODERACIÓN ===
const FOLDER_ID = "1WePiFQSCDeNrRX47Mgv06Li8gF6QO-kv";
const SECRET_KEY = "boda2026"; // Clave secreta para moderar fotos

function doGet(e) {
  const params = e.parameter || {};
  const key = params.key;
  const isAdmin = (key === SECRET_KEY);

  try {
    const sheet = getOrCreateSheet();
    const data = sheet.getDataRange().getValues();
    const photos = [];

    // Saltar la fila 0 (encabezados)
    for (let i = 1; i < data.length; i++) {
      const [id, url, name, comment, date, status, mimeType] = data[i];

      // Si es admin muestra todas, si es público solo las aprobadas
      if (isAdmin || status === 'aprobada') {
        photos.push({
          row: i + 1,
          id: id,
          url: url,
          mimeType: mimeType || '',
          name: name,
          comment: comment,
          date: date,
          status: status
        });
      }
    }

    // Ordenar de más reciente a más antigua
    photos.reverse();

    return createJsonResponse({ success: true, photos: photos, isAdmin: isAdmin });
  } catch (error) {
    return createJsonResponse({ success: false, error: error.message });
  }
}

function doPost(e) {
  try {
    const contents = JSON.parse(e.postData.contents);
    const action = contents.action;

    if (action === 'upload') {
      return handleUpload(contents);
    } else if (action === 'moderate') {
      return handleModerate(contents);
    } else if (action === 'delete') {
      return handleDelete(contents);
    }

    return createJsonResponse({ success: false, error: 'Acción no válida' });
  } catch (error) {
    return createJsonResponse({ success: false, error: error.message });
  }
}

function handleUpload(contents) {
  const { public_id, secure_url, mimeType, name, comment } = contents;

  if (!name || !name.trim()) {
    return createJsonResponse({ success: false, error: 'El nombre es obligatorio' });
  }

  if (!public_id || !secure_url) {
    return createJsonResponse({ success: false, error: 'Datos de archivo incompletos' });
  }

  // Registrar metadatos en la planilla Google Sheet
  const sheet = getOrCreateSheet();
  const timestamp = new Date().toISOString();
  
  // Guardamos: [ID Archivo (public_id), URL Directa (secure_url), Nombre, Comentario, Fecha, Estado, MimeType]
  sheet.appendRow([public_id, secure_url, name.trim(), comment || '', timestamp, 'pendiente', mimeType || '']);

  return createJsonResponse({
    success: true,
    message: 'Foto enviada con éxito. Estará visible tras la aprobación.'
  });
}

function handleModerate(contents) {
  const { key, row, moderateAction } = contents; // moderateAction para evitar colisión con la propiedad action del router

  if (key !== SECRET_KEY) {
    return createJsonResponse({ success: false, error: 'Clave secreta incorrecta' });
  }

  if (!moderateAction || !row) {
    return createJsonResponse({ success: false, error: 'Faltan parámetros: moderateAction o row' });
  }

  const sheet = getOrCreateSheet();
  const newStatus = (moderateAction === 'approve') ? 'aprobada' : 'rechazada';

  // Fila en la planilla (Columna 6 es Estado)
  sheet.getRange(row, 6).setValue(newStatus);

  // Ya no eliminamos el archivo en Drive porque ahora está en Cloudinary.
  // Simplemente quedará con estado 'rechazada' en la planilla y no se mostrará.

  return createJsonResponse({ success: true, newStatus: newStatus });
}

function getOrCreateSheet() {
  const props = PropertiesService.getScriptProperties();
  let ssId = props.getProperty('SPREADSHEET_ID');
  let ss;

  if (ssId) {
    try {
      ss = SpreadsheetApp.openById(ssId);
    } catch (e) {
      // El ID guardado ya no es válido, crear uno nuevo
      ss = null;
    }
  }

  if (!ss) {
    ss = SpreadsheetApp.create("Metadatos Fotos Boda - Lucia y Emilio");
    props.setProperty('SPREADSHEET_ID', ss.getId());
    Logger.log("Nueva planilla creada con ID: " + ss.getId());
  }

  let sheet = ss.getSheetByName("Fotos");
  if (!sheet) {
    sheet = ss.insertSheet("Fotos");
    sheet.appendRow(["ID Archivo", "URL Directa", "Nombre Invitado", "Comentario", "Fecha", "Estado", "MimeType"]);
    // Congelar la fila de encabezados
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
