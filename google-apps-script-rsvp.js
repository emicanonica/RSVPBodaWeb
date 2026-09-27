/**
 * GOOGLE APPS SCRIPT - BACKEND RSVP & RECORDATORIOS AUTOMÁTICOS POR EMAIL
 * Boda Lucia y Emilio - 20 de Noviembre de 2026
 *
 * Instrucciones de instalación:
 * 1. Ve a https://script.google.com/ e inicia sesión con tu cuenta de Google.
 * 2. Abre el proyecto vinculado a la Planilla de Confirmación de Asistencia (RSVP)
 *    o crea uno nuevo asociado a tu Google Sheets.
 * 3. Pega este código en el editor (archivo Code.gs).
 * 4. Para recibir confirmaciones desde la web:
 *    - Clic en "Implementar" -> "Nueva implementación" -> "Aplicación web".
 *    - Ejecutar como: "Yo" | Quién tiene acceso: "Cualquier persona".
 *    - La URL resultante debe coincidir con `scriptURL` en `src/main.js`.
 * 5. Para activar los Recordatorios Automáticos por Email:
 *    - Ve al ícono del reloj ⏰ ("Activadores / Disparadores") en la barra lateral izquierda.
 *    - Clic en "+ Añadir activador".
 *    - Función a ejecutar: `sendReminders`
 *    - Despliegue: `Principal` (Head)
 *    - Fuente del evento: `Según tiempo` (Time-driven)
 *    - Tipo de activador: `Temporizador por día` (Day timer)
 *    - Franja horaria: `De 9:00 a 10:00` (o el horario de preferencia)
 *    - Clic en "Guardar" y autorizar permisos de envío de email.
 */

// === 1. RECEPCIÓN DE CONFIRMACIONES (RSVP) DESDE LA WEB ===
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
  
  // Si la persona confirmó que "Sí" asiste, le enviamos el mail de agradecimiento inmediato
  var asiste = String(data.asistencia || '').trim().toLowerCase();
  var confirmaAsistencia = (asiste === 'si' || asiste === 'sí');

  if (confirmaAsistencia && data.email) {
    try {
      var subject = "¡Gracias por confirmar! - Boda Lucia y Emilio";
      var body = "Hola " + data.nombre_apellido + ",\n\n" +
                 "¡Muchas gracias por confirmar tu asistencia! Estamos muy felices de que nos acompañes en este día tan especial.\n\n" +
                 "Los esperamos para compartir lo que estamos seguros será una noche increíble y muy divertida.\n\n" +
                 "Con mucho cariño,\n" +
                 "Lucia y Emilio";
      
      MailApp.sendEmail(data.email.trim(), subject, body);
    } catch (error) {
      Logger.log("Error enviando mail inicial a " + data.email + ": " + error.toString());
    }
  }
  
  return ContentService.createTextOutput("Success");
}

// === 2. RECORDATORIOS PROGRAMADOS A INVITADOS CONFIRMADOS ===
// Fechas de envío:
// - 1° de Octubre de 2026: Faltan 50 días
// - 10 de Noviembre de 2026: Faltan 10 días
// - 19 de Noviembre de 2026: Falta 1 día (el día anterior)
function sendReminders() {
  // Fecha de la boda: 20 de Noviembre de 2026 (mes 10 es Noviembre en JS)
  const weddingDate = new Date(2026, 10, 20);
  const today = new Date();
  
  // Normalizar ambas fechas a medianoche local para comparar días enteros exactos
  weddingDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  const diffInMs = weddingDate - today;
  const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));

  // Detectar fechas clave:
  // - 1° de Octubre de 2026 (mes 9 en JS) = exactamente 50 días antes
  const isOctoberFirst = (today.getFullYear() === 2026 && today.getMonth() === 9 && today.getDate() === 1);
  const is50Days = (diffInDays === 50 || isOctoberFirst);
  const is10Days = (diffInDays === 10);
  const is1Day   = (diffInDays === 1);

  Logger.log("Fecha actual: " + today.toLocaleDateString() + " | Días restantes para la boda: " + diffInDays);

  // Solo actuamos si hoy coincide con alguno de los 3 hitos de recordatorio
  if (is50Days || is10Days || is1Day) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const rows = sheet.getDataRange().getValues();
    
    // Set para evitar duplicados si un invitado se registró más de una vez con el mismo correo
    const emailsEnviados = new Set();

    // Columnas esperadas: 0:Nombre, 1:Email, 2:DNI, 3:Comida, 4:Asistencia
    for (let i = 1; i < rows.length; i++) {
      let nombre = String(rows[i][0] || '').trim();
      let email = String(rows[i][1] || '').trim();
      let asistencia = String(rows[i][4] || '').trim().toLowerCase();
       
      if (!email || !nombre) continue;

      // Se envía únicamente a los que confirmaron que SI asisten
      const asiste = (asistencia === 'si' || asistencia === 'sí');
      if (!asiste) continue;

      // Si ya enviamos correo a este email en la ejecución actual, omitirlo
      if (emailsEnviados.has(email.toLowerCase())) continue;

      let subject = "";
      let message = "";

      // CASO 1: 1° de Octubre (Faltan 50 días)
      if (is50Days) {
        subject = "¡Faltan 50 días para la gran noche! 🥂 - Boda Lucia y Emilio";
        message = "Hola " + nombre + ",\n\n" +
                  "¡Ya entramos en la cuenta regresiva oficial! Faltan exactamente 50 días para nuestro casamiento el 20 de Noviembre de 2026.\n\n" +
                  "Estamos ultimando todos los detalles para disfrutar de una fiesta inolvidable en Quinta Pepe Reina.\n\n" +
                  "¡Nos vemos muy pronto!\n\n" +
                  "Con mucho cariño,\n" +
                  "Lucia y Emilio";
      }
      // CASO 2: 10 días antes (10 de Noviembre)
      else if (is10Days) {
        subject = "¡Solo faltan 10 días! 📅 - Boda Lucia y Emilio";
        message = "Hola " + nombre + ",\n\n" +
                  "¡Ya no falta nada! Estamos a solo 10 días de nuestro gran momento y queríamos decirte lo felices que estamos de compartirlo con vos.\n\n" +
                  "Recordá que los esperamos en Quinta Pepe Reina a las 18:00 hs.\n\n" +
                  "¡Nos vemos muy pronto!\n\n" +
                  "Con mucho cariño,\n" +
                  "Lucia y Emilio";
      }
      // CASO 3: 1 día antes (19 de Noviembre)
      else if (is1Day) {
        subject = "¡Mañana es el gran día! ✨ - Boda Lucia y Emilio";
        message = "Hola " + nombre + ",\n\n" +
                  "¡Llegó el momento! Mañana celebramos nuestro casamiento y te esperamos con mucha alegría a las 18:00 hs.\n\n" +
                  "Te dejamos la ubicación de la Quinta Pepe Reina por si la necesitás: https://maps.app.goo.gl/KBcdRvzkon3bT3Uq5\n\n" +
                  "A descansar hoy para prepararse para una noche inolvidable. ¡Los queremos mucho!\n\n" +
                  "Lucia y Emilio";
      }

      // Enviar el correo con manejo de errores individual para no detener el lote completo
      if (subject && message) {
        try {
          MailApp.sendEmail(email, subject, message);
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
