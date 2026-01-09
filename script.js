var token = "TU TOKEN DE BOT"; 
var sheetId = "EL ID DE TU HOJA DE SHEETS";      
var webAppUrl = "LINK GENERADO DESPUES DE HACER LA IMPLEMENTACIÓN";

// --- LÓGICA PRINCIPAL ---
function doPost(e) {
  var update = JSON.parse(e.postData.contents);
  if (!update.message) return;

  var mensaje = update. message.text;
  var chatId = update.message.chat. id;
  var nombre = update.message.from.first_name;
  
  // ✨ ASEGURAR QUE EL USUARIO EXISTE ANTES DE CUALQUIER OPERACIÓN
  crearUsuario(chatId);
  
  // 1. GESTIÓN DE COMANDOS GLOBALES
  if (mensaje. startsWith("/")) {
    manejarComandos(chatId, nombre, mensaje);
    return;
  }
  
  // 2. MÁQUINA DE ESTADOS (Para los menús)
  var estado = obtenerEstado(chatId);
  
  // Botón de escape siempre disponible
  if (mensaje == "🏠 Inicio") {
    reiniciarFlujo(chatId, nombre);
    return;
  }

  switch (estado) {
    case "MENU_PRINCIPAL":
      manejarMenuPrincipal(chatId, mensaje);
      break;
      
    case "SELECCION_CUENTA":
      // ✨ VALIDAR QUE SEA UNA OPCIÓN VÁLIDA
      var cuentasValidas = ["💵 Efectivo", "💳 Débito", "🏦 Crédito"];
      if (cuentasValidas.indexOf(mensaje) === -1) {
        enviarMensaje(chatId, "⚠️ Por favor selecciona una cuenta usando los botones.");
        return;
      }
      
      // El usuario eligió la cuenta (Efectivo/Debito), ahora pedimos monto
      guardarTemp(chatId, "CUENTA", mensaje); // Guardamos la cuenta
      setEstado(chatId, "ESPERANDO_MONTO");
      
      var texto = "✅ Usando:  " + mensaje + "\n\n✍️ Escribe el MONTO y CONCEPTO.\nEjemplo: 150 Tacos Pastor";
      enviarMensaje(chatId, texto, {"remove_keyboard":  true});
      break;

    case "ESPERANDO_MONTO":
      procesarTransaccion(chatId, nombre, mensaje);
      break;
      
    default:
      reiniciarFlujo(chatId, nombre);
      break;
  }
}

// --- MANEJADORES DE ESTADO ---

function reiniciarFlujo(chatId, nombre) {
  setEstado(chatId, "MENU_PRINCIPAL");
  limpiarTemp(chatId); // ✨ Limpiar datos temporales
  
  var teclado = {
    "keyboard": [
      [{"text": "💸 Gasto"}, {"text": "💰 Ingreso"}],
      [{"text": "📊 Ver Reporte"}]
    ],
    "resize_keyboard": true
  };
  var lista = obtenerListaActiva(chatId) || "Registro";
  enviarMensaje(chatId, "📂 Lista actual: *" + lista + "*\n¿Qué quieres hacer?", teclado);
}

function manejarMenuPrincipal(chatId, mensaje) {
  if (mensaje == "💸 Gasto") {
    guardarTemp(chatId, "TIPO", "Gasto");
    setEstado(chatId, "SELECCION_CUENTA");
    mostrarCuentas(chatId);
  } 
  else if (mensaje == "💰 Ingreso") {
    guardarTemp(chatId, "TIPO", "Ingreso");
    setEstado(chatId, "SELECCION_CUENTA");
    mostrarCuentas(chatId);
  }
  else if (mensaje == "📊 Ver Reporte") {
    generarReporte(chatId);
  }
  else {
    enviarMensaje(chatId, "⚠️ Usa los botones del menú 👇");
  }
}

function mostrarCuentas(chatId) {
  var teclado = {
    "keyboard": [
      [{"text": "💵 Efectivo"}, {"text": "💳 Débito"}],
      [{"text": "🏦 Crédito"}, {"text": "🏠 Inicio"}]
    ],
    "resize_keyboard": true
  };
  enviarMensaje(chatId, "¿De dónde sale/entra el dinero?", teclado);
}

function procesarTransaccion(chatId, nombre, mensaje) {
  // Recuperar datos guardados en pasos anteriores
  var tipo = obtenerTemp(chatId, "TIPO");
  var cuenta = obtenerTemp(chatId, "CUENTA");
  var listaActiva = obtenerListaActiva(chatId) || "Registro";

  // ✨ VALIDAR QUE EXISTAN LOS DATOS TEMPORALES
  if (!tipo || ! cuenta) {
    enviarMensaje(chatId, "❌ Ocurrió un error.  Comencemos de nuevo.");
    reiniciarFlujo(chatId, nombre);
    return;
  }

  // Extraer números (acepta decimales)
  var regex = /(\d+(?:[.,]\d+)?)/;
  var coincidencia = mensaje.match(regex);
  
  if (coincidencia) {
    var monto = parseFloat(coincidencia[0]. replace(',', '.')); // Convertir coma a punto
    var concepto = mensaje.replace(coincidencia[0], "").trim();
    if (concepto == "") concepto = "General";
    var fecha = Utilities.formatDate(new Date(), "GMT-6", "yyyy-MM-dd HH:mm:ss");

    // GUARDAR EN SHEETS
    var ss = SpreadsheetApp.openById(sheetId);
    var hoja = ss.getSheetByName(listaActiva);
    if (!hoja) {
      hoja = ss.insertSheet(listaActiva);
      hoja.appendRow(["Fecha", "Usuario", "Tipo", "Cuenta", "Monto", "Concepto"]);
    }
    
    // Si la hoja está vacía, poner cabeceras
    if (hoja.getLastRow() == 0) {
      hoja.appendRow(["Fecha", "Usuario", "Tipo", "Cuenta", "Monto", "Concepto"]);
    }
    
    hoja.appendRow([fecha, nombre, tipo, cuenta, monto, concepto]);
    
    var emoji = tipo == "Gasto" ? "💸" : "💰";
    enviarMensaje(chatId, "✅ Guardado en [" + listaActiva + "]:\n" + emoji + " " + tipo + ": $" + monto + "\n📝 " + concepto + "\n💳 " + cuenta);
    reiniciarFlujo(chatId, nombre); // Volver al inicio
  } else {
    enviarMensaje(chatId, "⚠️ No encontré un monto numérico.  Intenta de nuevo:\nEjemplo: '100 Pan' o '50. 5 Café'");
  }
}

// --- COMANDOS ESPECIALES (/start, /nueva, /usar) ---

function manejarComandos(chatId, nombre, mensaje) {
  var partes = mensaje.split(" ");
  var comando = partes[0]. toLowerCase();
  var arg = partes. slice(1).join(" ");

  if (comando == "/start") {
    crearUsuario(chatId);
    enviarMensaje(chatId, "👋 ¡Hola " + nombre + "!\n\n🤖 Bot de Finanzas Personal activado.\n\n📝 Comandos disponibles:\n/nueva [nombre] - Crear nueva lista\n/usar [nombre] - Cambiar de lista\n/reporte - Ver estadísticas");
    reiniciarFlujo(chatId, nombre);
  } 
  else if (comando == "/nueva") {
    if (!arg) { 
      enviarMensaje(chatId, "❌ Necesitas especificar un nombre.\n\nEjemplo: /nueva Casa"); 
      return; 
    }
    cambiarLista(chatId, arg);
    enviarMensaje(chatId, "✅ Nueva lista creada y seleccionada:  *" + arg + "*");
    reiniciarFlujo(chatId, nombre);
  }
  else if (comando == "/usar") {
     if (!arg) { 
       enviarMensaje(chatId, "❌ Necesitas especificar un nombre.\n\nEjemplo: /usar Personal"); 
       return; 
     }
     cambiarLista(chatId, arg);
     enviarMensaje(chatId, "🔄 Cambiaste a la lista: *" + arg + "*");
     reiniciarFlujo(chatId, nombre);
  }
  else if (comando == "/reporte") {
    generarReporte(chatId);
  }
  else if (comando == "/ayuda" || comando == "/help") {
    enviarMensaje(chatId, "🆘 *Ayuda del Bot*\n\n📝 *Comandos: *\n/start - Iniciar el bot\n/nueva [nombre] - Crear lista\n/usar [nombre] - Cambiar lista\n/reporte - Ver estadísticas\n/ayuda - Este mensaje\n\n💡 *Uso rápido:*\n1️⃣ Presiona 💸 o 💰\n2️⃣ Selecciona cuenta\n3️⃣ Escribe:  monto + concepto\nEjemplo: 150 Tacos");
  }
  else {
    enviarMensaje(chatId, "❓ Comando desconocido. Usa /ayuda para ver los comandos disponibles.");
  }
}

// --- REPORTES Y GRÁFICOS ---

function generarReporte(chatId) {
  var lista = obtenerListaActiva(chatId) || "Registro";
  var ss = SpreadsheetApp.openById(sheetId);
  var hoja = ss.getSheetByName(lista);
  
  if (!hoja || hoja.getLastRow() < 2) {
    enviarMensaje(chatId, "📉 No hay datos en la lista '" + lista + "'\n\nComienza registrando movimientos usando los botones.");
    return;
  }

  var datos = hoja.getDataRange().getValues();
  var ing = 0, gas = 0;
  var efectivo = 0, debito = 0, credito = 0;
  
  // Sumar todo
  for (var i = 1; i < datos.length; i++) {
    var filaTipo = datos[i][2]; // Columna C (Tipo)
    var filaCuenta = datos[i][3]; // Columna D (Cuenta)
    var filaMonto = parseFloat(datos[i][4]) || 0; // Columna E (Monto)
    
    if (filaTipo == "Ingreso") ing += filaMonto;
    if (filaTipo == "Gasto") gas += filaMonto;
    
    // Sumar por cuenta
    if (filaCuenta. indexOf("Efectivo") > -1) efectivo += filaMonto;
    if (filaCuenta.indexOf("Débito") > -1) debito += filaMonto;
    if (filaCuenta.indexOf("Crédito") > -1) credito += filaMonto;
  }

  var balance = ing - gas;
  var emoji = balance >= 0 ? "✅" : "⚠️";
  
  var texto = "📊 *Reporte:  " + lista + "*\n\n" +
              "💰 Ingresos: $" + ing. toFixed(2) + "\n" +
              "💸 Gastos: $" + gas.toFixed(2) + "\n" +
              "━━━━━━━━━━━━━━━\n" +
              emoji + " Balance: $" + balance.toFixed(2) + "\n\n" +
              "📁 *Por cuenta:*\n" +
              "💵 Efectivo: $" + efectivo.toFixed(2) + "\n" +
              "💳 Débito: $" + debito.toFixed(2) + "\n" +
              "🏦 Crédito: $" + credito. toFixed(2);
  
  enviarMensaje(chatId, texto);
  
  // Gráfico solo si hay datos relevantes
  if (ing > 0 || gas > 0) {
    try {
      var chartUrl = "https://quickchart.io/chart?c=" + encodeURIComponent(JSON.stringify({
        type: 'doughnut',
        data: {
          labels: ['Ingresos', 'Gastos'],
          datasets: [{ 
            data: [ing, gas], 
            backgroundColor: ['#2ecc71', '#e74c3c'] 
          }]
        },
        options: {
          title: {
            display: true,
            text: 'Balance Visual'
          }
        }
      }));
      
      UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/sendPhoto", {
        "method": "post",
        "payload": { 
          "chat_id": chatId, 
          "photo": chartUrl, 
          "caption": "📊 Balance visual de:  " + lista 
        }
      });
    } catch(e) {
      Logger.log("Error generando gráfico: " + e);
    }
  }
}

// --- BASE DE DATOS (Config) ---

function crearUsuario(chatId) {
  var ss = SpreadsheetApp. openById(sheetId);
  var hoja = ss.getSheetByName("Config");
  
  // Crear hoja Config si no existe
  if (!hoja) { 
    hoja = ss. insertSheet("Config"); 
    hoja.appendRow(["ChatID", "Estado", "TempData", "ListaActiva"]); 
  }
  
  // Verificar si el usuario ya existe
  var data = hoja.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) { 
    if (data[i][0] == chatId) return; // Ya existe
  }
  
  // Crear nuevo usuario
  hoja.appendRow([chatId, "MENU_PRINCIPAL", "{}", "Registro"]);
}

function obtenerEstado(chatId) { 
  return leerConfig(chatId, 1) || "MENU_PRINCIPAL"; 
}

function setEstado(chatId, estado) { 
  escribirConfig(chatId, 1, estado); 
}

function guardarTemp(chatId, key, val) {
  var actual = JSON.parse(leerConfig(chatId, 2) || "{}");
  actual[key] = val;
  escribirConfig(chatId, 2, JSON.stringify(actual));
}

function obtenerTemp(chatId, key) {
  var actual = JSON. parse(leerConfig(chatId, 2) || "{}");
  return actual[key];
}

function limpiarTemp(chatId) {
  escribirConfig(chatId, 2, "{}");
}

function cambiarLista(chatId, lista) { 
  escribirConfig(chatId, 3, lista); 
}

function obtenerListaActiva(chatId) { 
  return leerConfig(chatId, 3) || "Registro"; 
}

// Helpers de lectura/escritura en Config
function leerConfig(chatId, colIndex) {
  var hoja = SpreadsheetApp. openById(sheetId).getSheetByName("Config");
  if (!hoja) return null;
  
  var data = hoja.getDataRange().getValues();
  for (var i = 1; i < data. length; i++) { 
    if (data[i][0] == chatId) return data[i][colIndex]; 
  }
  return null;
}

function escribirConfig(chatId, colIndex, valor) {
  var hoja = SpreadsheetApp.openById(sheetId).getSheetByName("Config");
  if (!hoja) {
    crearUsuario(chatId);
    hoja = SpreadsheetApp. openById(sheetId).getSheetByName("Config");
  }
  
  var data = hoja.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == chatId) {
      hoja.getRange(i + 1, colIndex + 1).setValue(valor);
      return;
    }
  }
  
  // Si no existe el usuario, crearlo
  Logger.log("Usuario " + chatId + " no encontrado, creándolo...");
  crearUsuario(chatId);
  escribirConfig(chatId, colIndex, valor);
}

// --- COMUNICACIÓN TELEGRAM ---
function enviarMensaje(chatId, texto, teclado) {
  var payload = { 
    "chat_id": chatId, 
    "text": texto, 
    "parse_mode":  "Markdown" 
  };
  
  if (teclado) payload.reply_markup = teclado;
  
  try {
    UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
      "method": "post", 
      "contentType": "application/json", 
      "payload": JSON.stringify(payload)
    });
  } catch(e) {
    Logger.log("Error enviando mensaje: " + e);
  }
}

function configurarWebhook() {
  var url = "https://api.telegram.org/bot" + token + "/setWebhook?url=" + webAppUrl;
  var response = UrlFetchApp.fetch(url);
  Logger.log("Webhook configurado: " + response.getContentText());
}
