/**
 * GOOGLE APPS SCRIPT - BACKEND RSVP & RECORDATORIOS AUTOMÁTICOS POR EMAIL
 * Boda Lucia y Emilio - 20 de Noviembre de 2026
 *
 * Instrucciones de instalación:
 * 1. Ve a https://script.google.com/ e inicia sesión con tu cuenta de Google.
 * 2. Abre el proyecto vinculado a la Planilla de Confirmación de Asistencia (RSVP).
 * 3. Reemplaza todo el código del archivo Code.gs con este archivo.
 * 4. Para implementar el servicio web (recepción de formularios y cancelación impersonal):
 *    - Clic en "Implementar" -> "Administrar implementaciones" (o "Nueva implementación")
 *    - Editar (ícono de lápiz) -> Seleccionar "Nueva versión" -> Clic en "Implementar".
 *    - Asegúrate de que:
 *      * Ejecutar como: "Yo"
 *      * Quién tiene acceso: "Cualquier persona"
 * 5. Para los recordatorios automáticos:
 *    - Ve al ícono del reloj ⏰ ("Activadores / Disparadores") a la izquierda.
 *    - Clic en "+ Añadir activador".
 *    - Función a ejecutar: `sendReminders`
 *    - Tipo de activador: `Temporizador por día` (Day timer)
 *    - Horario: `De 9:00 a 10:00` (o el que prefieras).
 */

// URL de respaldo de la Web App en caso de que ScriptApp no la detecte en ejecución offline
const WEB_APP_URL_FALLBACK = 'https://script.google.com/macros/s/AKfycbxETZkHMbjrW6wNxN8-56Oxp9hp3bfAn_d6V7NlTEXM5dqkUf0samNLDmSZcZfPXEHB/exec';

function testSendEmail() {
  const miEmail = "emicanonica@gmail.com"; // 👈 PONÉ TU EMAIL ACÁ
  const cancelUrl = getWebAppUrl() + '?action=cancelar&email=' + encodeURIComponent(miEmail);

  const introHtml = "¡Ya entramos en la cuenta regresiva oficial! Faltan exactamente <strong>50 días</strong> para nuestro casamiento.<br><br>" +
    "Estamos ultimando todos los detalles para disfrutar de una fiesta inolvidable en Quinta Pepe Reina. ¡Los esperamos con muchas ganas de celebrar!";

  const htmlBody = buildEmailHtml("Emilio (Prueba)", introHtml, cancelUrl);

  MailApp.sendEmail({
    to: miEmail,
    subject: "[PRUEBA] ¡Faltan 50 días para la gran noche! 🥂 - Boda Lucia y Emilio",
    body: "Prueba de recordatorio. Si no podés venir: " + cancelUrl,
    htmlBody: htmlBody
  });

  Logger.log("Mail de prueba enviado a " + miEmail);
}

function getWebAppUrl() {
  try {
    const url = ScriptApp.getService().getUrl();
    if (url && url.indexOf('/exec') !== -1) return url;
  } catch (e) { }
  return WEB_APP_URL_FALLBACK;
}

// === 1. CANCELACIÓN IMPERSONAL VÍA NAVEGADOR (doGet) ===
// Cuando el invitado hace clic en "No podré asistir" desde su mail,
// se abre esta pantalla web para registrar la baja automáticamente sin que tenga que hablar con nadie.
function doGet(e) {
  const params = (e && e.parameter) || {};
  const action = params.action;
  const email = params.email ? decodeURIComponent(params.email).trim() : '';
  const confirm = params.confirm === '1';

  if (action === 'cancelar' && email) {
    if (confirm) {
      // 1. Modificar en la planilla la asistencia a 'No'
      cancelarAsistencia(email);
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Asistencia cancelada' }))
        .setMimeType(ContentService.MimeType.JSON);
    } else {
      // 2. Pantalla de confirmación previa (con setXFrameOptionsMode para evitar bloqueos del navegador)
      return HtmlService.createHtmlOutput(renderPaginaCancelacion(email))
        .setTitle("Confirmar Asistencia - Boda Lucia y Emilio")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
  }

  return HtmlService.createHtmlOutput("<h3 style='font-family:sans-serif; text-align:center; margin-top:50px;'>Servicio RSVP Boda Lucia & Emilio activo.</h3>")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Busca en la planilla la fila (o filas) del invitado y cambia la columna Asistencia a 'No'
function cancelarAsistencia(email) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const targetEmail = String(email || '').trim().toLowerCase();

  for (let i = 1; i < data.length; i++) {
    const rowEmail = String(data[i][1] || '').trim().toLowerCase();
    if (rowEmail === targetEmail) {
      // Columna 5 en Sheets es 'Asistencia' (Columna E)
      sheet.getRange(i + 1, 5).setValue('No');
    }
  }
}

// === 2. RECEPCIÓN DE CONFIRMACIONES (RSVP) DESDE LA WEB (doPost) ===
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = e.parameter;

  // Guardamos los datos en la planilla
  // Estructura: [Nombre y Apellido, Email, DNI, Restricción Alimenticia, Asistencia, Fecha de Registro]
  sheet.appendRow([
    data.nombre_apellido,
    data.email,
    data.dni,
    data.restriccion_alimenticia,
    data.asistencia,
    new Date()
  ]);

  // Si la persona confirmó que "Sí" asiste, le enviamos el mail de agradecimiento
  var asiste = String(data.asistencia || '').trim().toLowerCase();
  var confirmaAsistencia = (asiste === 'si' || asiste === 'sí');

  if (confirmaAsistencia && data.email) {
    try {
      var email = data.email.trim();
      var cancelUrl = getWebAppUrl() + '?action=cancelar&email=' + encodeURIComponent(email);
      var subject = "¡Gracias por confirmar! - Boda Lucia y Emilio";

      var plainBody = "Hola " + data.nombre_apellido + ",\n\n" +
        "¡Muchas gracias por confirmar tu asistencia! Estamos muy felices de que nos acompañes en este día tan especial.\n\n" +
        "Te recordamos los datos del gran día:\n" +
        "📅 Fecha y hora: Viernes 20/11/2026 a las 18:00 hs\n" +
        "📍 Lugar: Espacio El Banquete (Quinta Pepe Reina)\n" +
        "🗺️ Ubicación en Google Maps: https://maps.app.goo.gl/KBcdRvzkon3bT3Uq5\n\n" +
        "Los esperamos para compartir lo que estamos seguros será una noche increíble y muy divertida.\n\n" +
        "¿CAMBIO DE PLANES?\n" +
        "Si más adelante te surge algún imprevisto y finalmente no podés venir, nadie se va a ofender. Podés avisarnos con un clic acá:\n" +
        cancelUrl + "\n\n" +
        "Con mucho cariño,\n" +
        "Lucia y Emilio";

      var htmlBody = buildEmailHtml(
        data.nombre_apellido,
        "¡Muchas gracias por confirmar tu asistencia! Estamos muy felices de que nos acompañes en este día tan especial.<br><br>Los esperamos para compartir lo que estamos seguros será una noche increíble y súper divertida.",
        cancelUrl
      );

      MailApp.sendEmail({
        to: email,
        subject: subject,
        body: plainBody,
        htmlBody: htmlBody
      });
    } catch (error) {
      Logger.log("Error enviando mail inicial a " + data.email + ": " + error.toString());
    }
  }

  return ContentService.createTextOutput("Success");
}

// === 3. RECORDATORIOS PROGRAMADOS A INVITADOS CONFIRMADOS ===
// Fechas de envío:
// - 1° de Octubre de 2026: Faltan 50 días
// - 10 de Noviembre de 2026: Faltan 10 días
// - 19 de Noviembre de 2026: Falta 1 día (el día anterior)
function sendReminders() {
  const weddingDate = new Date(2026, 10, 20); // 20 de Noviembre de 2026
  const today = new Date();

  // Normalizar a medianoche local para comparar días enteros exactos
  weddingDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffInMs = weddingDate - today;
  const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));

  // Detectar fechas clave:
  const isOctoberFirst = (today.getFullYear() === 2026 && today.getMonth() === 9 && today.getDate() === 1);
  const is50Days = (diffInDays === 50 || isOctoberFirst);
  const is10Days = (diffInDays === 10);
  const is1Day = (diffInDays === 1);

  Logger.log("Fecha actual: " + today.toLocaleDateString() + " | Días restantes para la boda: " + diffInDays);

  if (is50Days || is10Days || is1Day) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const rows = sheet.getDataRange().getValues();
    const emailsEnviados = new Set();

    for (let i = 1; i < rows.length; i++) {
      let nombre = String(rows[i][0] || '').trim();
      let email = String(rows[i][1] || '').trim();
      let asistencia = String(rows[i][4] || '').trim().toLowerCase();

      if (!email || !nombre) continue;

      // Se envía ÚNICAMENTE a los que siguen confirmados como 'Si'
      const asiste = (asistencia === 'si' || asistencia === 'sí');
      if (!asiste) continue;

      if (emailsEnviados.has(email.toLowerCase())) continue;

      let subject = "";
      let introHtml = "";
      let introPlain = "";

      // CASO 1: 1° de Octubre (Faltan 50 días)
      if (is50Days) {
        subject = "¡Faltan 50 días para la gran noche! 🥂 - Boda Lucia y Emilio";
        introPlain = "¡Ya entramos en la cuenta regresiva oficial! Faltan exactamente 50 días para nuestro casamiento.\n\n" +
          "Estamos ultimando todos los detalles para disfrutar nuestra fiesta en Espacio El Banquete (Quinta Pepe Reina).\n\n";
        introHtml = "¡Ya entramos en la cuenta regresiva oficial! Faltan exactamente <strong>50 días</strong> para nuestro casamiento.<br><br>" +
          "Estamos ultimando todos los detalles para disfrutar de una fiesta inolvidable en Espacio El Banquete (Quinta Pepe Reina). ¡Los esperamos con muchas ganas de celebrar!";
      }
      // CASO 2: 10 días antes (10 de Noviembre)
      else if (is10Days) {
        subject = "¡Solo faltan 10 días! 📅 - Boda Lucia y Emilio";
        introPlain = "¡Ya no falta nada! Estamos a solo 10 días de nuestro gran momento y estamos muy felices de compartirlo con vos.\n\n" +
          "¡Nos vemos muy pronto para celebrar juntos!";
        introHtml = "¡Ya no falta nada! Estamos a solo <strong>10 días</strong> de nuestro gran momento y estamos muy felices de compartirlo con vos.<br><br>";
      }
      // CASO 3: 1 día antes (19 de Noviembre)
      else if (is1Day) {
        subject = "¡Mañana es el gran día! ✨ - Boda Lucia y Emilio";
        introPlain = "¡Llegó el momento! Mañana celebramos nuestro casamiento y te esperamos con mucha alegría para compartir una noche inolvidable.\n\n" +
          "A descansar hoy para prepararse para una fiesta increíble.";
        introHtml = "¡Llegó el momento! Mañana celebramos nuestro casamiento y te esperamos con mucha alegría para compartir una noche inolvidable.<br><br>" +
          "A descansar hoy para prepararse para una gran fiesta. ¡Los queremos mucho!";
      }

      if (subject && introHtml) {
        const cancelUrl = getWebAppUrl() + '?action=cancelar&email=' + encodeURIComponent(email);

        const fullPlainMessage = "Hola " + nombre + ",\n\n" +
          introPlain + "\n\n" +
          "Te recordamos los datos del evento:\n" +
          "📅 Fecha y hora: Viernes 20/11/2026 a las 18:00 hs\n" +
          "📍 Lugar: Espacio El Banquete (Quinta Pepe Reina)\n" +
          "🗺️ Ubicación en Google Maps: https://maps.app.goo.gl/KBcdRvzkon3bT3Uq5\n\n" +
          "¿CAMBIO DE PLANES?\n" +
          "Si te surgió algún imprevisto o finalmente no vas a poder venir, nadie se va a ofender para nada y nos ayuda un montón a organizar el salón y el catering. Podés avisarnos con un clic en este enlace:\n" +
          cancelUrl + "\n\n" +
          "Con mucho cariño,\n" +
          "Lucia y Emilio\n";

        const fullHtmlMessage = buildEmailHtml(nombre, introHtml, cancelUrl);

        try {
          MailApp.sendEmail({
            to: email,
            subject: subject,
            body: fullPlainMessage,
            htmlBody: fullHtmlMessage
          });
          emailsEnviados.add(email.toLowerCase());
          Logger.log("Recordatorio enviado con éxito a: " + email);
        } catch (err) {
          Logger.log("Fallo al enviar recordatorio a " + email + ": " + err.toString());
        }
      }
    }
  } else {
    Logger.log("Hoy no coincide con ninguna fecha de recordatorio programada.");
  }
}

// === 4. PLANTILLAS HTML PARA CORREO Y NAVEGADOR ===

// Plantilla elegante para los correos electrónicos
function buildEmailHtml(nombre, cuerpoHtml, cancelUrl) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
  </head>
  <body style="margin: 0; padding: 20px; background-color: #faf8f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2d3748;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 12px; border: 1px solid #eae5dc; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.04);">
      <!-- Encabezado -->
      <tr>
        <td style="padding: 32px 30px 20px; text-align: center; border-bottom: 1px solid #f0ede8;">
          <p style="margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #a48354; font-weight: 600;">Nuestra Boda</p>
          <h1 style="margin: 0; font-size: 26px; color: #1a202c; font-weight: 700; font-family: Georgia, serif;">Lucia &amp; Emilio</h1>
        </td>
      </tr>
      
      <!-- Contenido Principal -->
      <tr>
        <td style="padding: 28px 30px 20px; font-size: 15px; line-height: 1.6; color: #4a5568;">
          <p style="margin: 0 0 16px; font-size: 17px; color: #1a202c;"><strong>Hola ${nombre},</strong></p>
          <p style="margin: 0 0 20px;">${cuerpoHtml}</p>
          
          <!-- Tarjeta de Coordenadas -->
          <div style="background-color: #faf8f5; border: 1px solid #e8e2d8; border-radius: 8px; padding: 18px; margin-bottom: 22px;">
            <p style="margin: 0 0 8px; font-size: 15px; color: #1a202c;">
              📅 <strong>Cuándo:</strong> Viernes 20/11/2026 a las 18:00 hs
            </p>
            <p style="margin: 0 0 12px; font-size: 15px; color: #1a202c;">
              📍 <strong>Dónde:</strong> Espacio El Banquete (Quinta Pepe Reina)
            </p>
            <div style="text-align: left;">
              <a href="https://maps.app.goo.gl/KBcdRvzkon3bT3Uq5" target="_blank" style="display: inline-block; font-size: 13px; color: #8c6d3b; text-decoration: none; font-weight: 600; border-bottom: 1px dashed #8c6d3b;">
                🗺️ Abrir ubicación en Google Maps &rarr;
              </a>
            </div>
          </div>

          <!-- Recuadro Destacado: Cambio de Planes -->
          <div style="background-color: #ffffff; border: 2px solid #cbd5e0; border-radius: 10px; padding: 20px; margin-bottom: 24px; text-align: center; box-shadow: 0 3px 10px rgba(0,0,0,0.05);">
            <p style="margin: 0 0 10px; font-size: 16px; font-weight: 800; color: #1a202c; text-transform: uppercase; letter-spacing: 0.5px;">
              ⚠️ ¿Cambio de planes?
            </p>
            <p style="margin: 0 0 16px; font-size: 14px; color: #2d3748; line-height: 1.5;">
              Si por cualquier motivo te surgió algún imprevisto y finalmente <strong>no vas a poder venir</strong>, te pedimos de corazón que nos avises. <strong>¡De verdad que nadie se va a ofender!</strong> Nos ayuda muchísimo para organizar las mesas y el catering.
            </p>
            <a href="${cancelUrl}" target="_blank" style="display: inline-block; background-color: #1a202c; color: #ffffff !important; text-decoration: none; padding: 13px 26px; font-size: 14px; font-weight: 700; border-radius: 8px; letter-spacing: 0.3px; box-shadow: 0 4px 12px rgba(0,0,0,0.18);">
              👉 Avisar que no podré asistir
            </a>
          </div>

          <!-- Firma Final -->
          <p style="margin: 0; font-size: 15px; color: #4a5568; text-align: center;">
            Con mucho cariño,<br>
            <strong style="color: #a48354; font-size: 18px; font-family: Georgia, serif;">Lucia &amp; Emilio</strong>
          </p>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}

// Pantalla interactiva en el navegador: confirmación y agradecimiento instantáneo
function renderPaginaCancelacion(email) {
  const webAppUrl = getWebAppUrl();
  const confirmUrl = webAppUrl + '?action=cancelar&confirm=1&email=' + encodeURIComponent(email);

  return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Boda Lucia & Emilio - Confirmar Asistencia</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #faf8f5; color: #2d3748; margin: 0; padding: 20px; display: flex; align-items: center; justify-content: center; min-height: 100vh; box-sizing: border-box; }
      .card { background: #ffffff; max-width: 460px; width: 100%; padding: 36px 28px; border-radius: 16px; box-shadow: 0 8px 30px rgba(0,0,0,0.06); text-align: center; border: 1px solid #eae5dc; }
      .tagline { font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #a48354; font-weight: 600; margin-bottom: 8px; }
      h1 { font-size: 22px; color: #1a202c; margin: 0 0 14px; font-weight: 700; font-family: Georgia, serif; }
      p { font-size: 15px; line-height: 1.6; color: #4a5568; margin: 0 0 24px; }
      .btn-cancel { display: block; width: 100%; box-sizing: border-box; background: #c53030; color: #ffffff !important; text-decoration: none; padding: 14px 20px; font-size: 15px; font-weight: 600; border-radius: 10px; margin-bottom: 16px; border: none; cursor: pointer; transition: background 0.2s; box-shadow: 0 4px 12px rgba(197,48,48,0.25); }
      .btn-cancel:hover { background: #9b2c2c; }
      .btn-cancel:disabled { background: #a0aec0; cursor: not-allowed; }
      .help-text { font-size: 13px; color: #718096; line-height: 1.4; margin: 0; }
      .icon { font-size: 46px; margin-bottom: 12px; }
      .signature { font-size: 16px; font-weight: 600; color: #a48354; margin-top: 24px; }
    </style>
  </head>
  <body>
    <!-- Paso 1: Preguntar confirmación previa -->
    <div id="step-confirm" class="card">
      <div class="tagline">Boda Lucia & Emilio</div>
      <h1>¿Confirmás que no podrás asistir?</h1>
      <p>Entendemos perfectamente que los planes pueden cambiar y <strong>de verdad que nadie se va a ofender</strong>.<br><br>Avisarnos nos ayuda muchísimo a reacomodar los lugares y el servicio de comida.</p>
      <button id="btn-submit" class="btn-cancel" onclick="realizarCancelacion()">Sí, confirmar que no podré asistir</button>
      <p class="help-text">Si tocaste el enlace por error, podés cerrar esta ventana con tranquilidad. Tu lugar sigue reservado.</p>
    </div>

    <!-- Paso 2: Agradecimiento y confirmación de baja inmediata (sin recargar página) -->
    <div id="step-success" class="card" style="display: none;">
      <div class="icon">💌</div>
      <h1>¡Muchas gracias por avisarnos!</h1>
      <p>Tu respuesta ha sido actualizada a <strong>"No podré asistir"</strong>.</p>
      <p>Lamentamos mucho no contar con tu presencia en esta ocasión, ¡pero te agradecemos de corazón habernos avisado! Ya no recibirás más recordatorios del evento.</p>
      <div class="signature">Lucia & Emilio</div>
    </div>

    <script>
      function realizarCancelacion() {
        var btn = document.getElementById('btn-submit');
        btn.disabled = true;
        btn.innerText = 'Actualizando...';

        // Enviar la actualización en segundo plano a Google Apps Script
        fetch('${confirmUrl}', { mode: 'no-cors' })
          .then(function() {
            document.getElementById('step-confirm').style.display = 'none';
            document.getElementById('step-success').style.display = 'block';
          })
          .catch(function() {
            // Aún si no-cors no da feedback detallado, mostramos éxito
            document.getElementById('step-confirm').style.display = 'none';
            document.getElementById('step-success').style.display = 'block';
          });
      }
    </script>
  </body>
  </html>
  `;
}

// === 5. FUNCIÓN DE PRUEBA RÁPIDA ===
// Ejecútala desde el editor de Apps Script para enviarte un mail de prueba a ti mismo
function testSendEmail() {
  const miEmail = Session.getActiveUser().getEmail() || "tu_email@gmail.com";
  const cancelUrl = getWebAppUrl() + '?action=cancelar&email=' + encodeURIComponent(miEmail);
  const horaActual = new Date().toLocaleTimeString();

  const introHtml = "¡Ya entramos en la cuenta regresiva oficial! Faltan exactamente <strong>50 días</strong> para nuestro casamiento.<br><br>" +
    "Estamos ultimando todos los detalles para disfrutar de una fiesta inolvidable en Espacio El Banquete (Quinta Pepe Reina). ¡Los esperamos con muchas ganas de celebrar!";

  const introPlain = "¡Ya entramos en la cuenta regresiva oficial! Faltan exactamente 50 días para nuestro casamiento.\n\n" +
    "Estamos ultimando todos los detalles para disfrutar nuestra fiesta en Espacio El Banquete (Quinta Pepe Reina).";

  const fullPlainMessage = "Hola Emilio (Prueba),\n\n" +
    introPlain + "\n\n" +
    "Te recordamos los datos del evento:\n" +
    "📅 Fecha y hora: Viernes 20/11/2026 a las 18:00 hs\n" +
    "📍 Lugar: Espacio El Banquete (Quinta Pepe Reina)\n" +
    "🗺️ Ubicación en Google Maps: https://maps.app.goo.gl/KBcdRvzkon3bT3Uq5\n\n" +
    "¿CAMBIO DE PLANES?\n" +
    "Si te surgió algún imprevisto o finalmente no vas a poder venir, nadie se va a ofender para nada y nos ayuda un montón a organizar el salón y el catering. Podés avisarnos con un clic en este enlace:\n" +
    cancelUrl + "\n\n" +
    "Con mucho cariño,\n" +
    "Lucia y Emilio\n";

  const fullHtmlMessage = buildEmailHtml("Emilio (Prueba)", introHtml, cancelUrl);

  MailApp.sendEmail({
    to: miEmail,
    subject: `[PRUEBA ${horaActual}] ¡Faltan 50 días para la gran noche! 🥂 - Boda Lucia y Emilio`,
    body: fullPlainMessage,
    htmlBody: fullHtmlMessage
  });

  Logger.log("Mail de prueba enviado a: " + miEmail);
}
