var token = "TU TOKEN BOT"; 
var sheetId = "ID DE LA HOJA DE CALCULO";      
var webAppUrl = "LINK QUE TE DA AL HACER LA IMPLEMENTACION";

// ✨ CONFIGURACIÓN DE CATEGORÍAS
var CATEGORIAS = {
  "Gasto": {
    "🍔 Comida": "🍔",
    "🚗 Transporte": "🚗",
    "🏠 Hogar": "🏠",
    "💊 Salud": "💊",
    "🎮 Entretenimiento": "🎮",
    "👕 Ropa": "👕",
    "📚 Educación": "📚",
    "➕ Otro": "➕"
  },
  "Ingreso": {
    "💼 Salario": "💼",
    "🎁 Regalo": "🎁",
    "📈 Inversión": "📈",
    "💰 Venta": "💰",
    "➕ Otro": "➕"
  }
};

// --- LÓGICA PRINCIPAL ---
function doPost(e) {
  try {
    var update = JSON.parse(e.postData.contents);
    
    // Manejar callback queries (botones inline)
    if (update.callback_query) {
      manejarCallback(update.callback_query);
      return;
    }
    
    if (! update.message) return;

    var mensaje = update.message.text;
    var chatId = update.message.chat.id;
    var nombre = update.message.from.first_name;
    
    // ✨ ASEGURAR QUE EL USUARIO EXISTE
    crearUsuario(chatId);
    
    // 1.  GESTIÓN DE COMANDOS GLOBALES
    if (mensaje && mensaje.startsWith("/")) {
      manejarComandos(chatId, nombre, mensaje);
      return;
    }
    
    // 2. MÁQUINA DE ESTADOS
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
        
      case "SELECCION_CATEGORIA":
        manejarSeleccionCategoria(chatId, mensaje);
        break;
        
      case "SELECCION_CUENTA": 
        manejarSeleccionCuenta(chatId, mensaje);
        break;

      case "ESPERANDO_MONTO":
        procesarTransaccion(chatId, nombre, mensaje);
        break;
        
      case "ESPERANDO_BUSQUEDA":
        buscarTransacciones(chatId, mensaje);
        break;
        
      case "ESPERANDO_PRESUPUESTO":
        configurarPresupuesto(chatId, mensaje);
        break;
        
      case "TRANSFERENCIA_ORIGEN":
        manejarTransferenciaOrigen(chatId, mensaje);
        break;
        
      case "TRANSFERENCIA_DESTINO": 
        manejarTransferenciaDestino(chatId, mensaje);
        break;
        
      case "TRANSFERENCIA_MONTO":
        procesarTransferencia(chatId, mensaje);
        break;
        
      default:
        reiniciarFlujo(chatId, nombre);
        break;
    }
  } catch(error) {
    Logger.log("Error en doPost: " + error);
  }
}

// --- MANEJADOR DE CALLBACKS (BOTONES INLINE) ---
function manejarCallback(callbackQuery) {
  var chatId = callbackQuery.message. chat.id;
  var messageId = callbackQuery.message. message_id;
  var data = callbackQuery.data;
  var nombre = callbackQuery.from.first_name;
  
  // Responder al callback para quitar el "loading"
  UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/answerCallbackQuery", {
    "method": "post",
    "payload": {"callback_query_id": callbackQuery.id}
  });
  
  // Manejar diferentes acciones
  if (data == "deshacer") {
    deshacerUltimaTransaccion(chatId);
  }
  else if (data == "editar") {
    editarUltimaTransaccion(chatId, messageId);
  }
  else if (data. startsWith("reporte_")) {
    var periodo = data.replace("reporte_", "");
    generarReportePeriodo(chatId, periodo);
  }
  else if (data. startsWith("confirmar_eliminar_")) {
    var fila = parseInt(data.replace("confirmar_eliminar_", ""));
    eliminarTransaccion(chatId, fila);
  }
  else if (data == "cancelar") {
    editarMensaje(chatId, messageId, "❌ Operación cancelada");
    reiniciarFlujo(chatId, nombre);
  }
}

// --- MANEJADORES DE ESTADO ---

function reiniciarFlujo(chatId, nombre) {
  setEstado(chatId, "MENU_PRINCIPAL");
  limpiarTemp(chatId);
  
  var lista = obtenerListaActiva(chatId) || "Registro";
  var balance = obtenerBalanceRapido(chatId, lista);
  
  var teclado = {
    "keyboard": [
      [{"text": "💸 Gasto"}, {"text": "💰 Ingreso"}],
      [{"text": "🔄 Transferir"}, {"text": "📊 Reportes"}],
      [{"text":  "🔍 Buscar"}, {"text": "⚙️ Configurar"}]
    ],
    "resize_keyboard": true
  };
  
  var texto = "📂 *Lista:  " + lista + "*\n" +
              "━━━━━━━━━━━━━━━\n" +
              "💰 Balance: $" + balance. toFixed(2) + "\n\n" +
              "¿Qué quieres hacer?";
  
  enviarMensaje(chatId, texto, teclado);
}

function manejarMenuPrincipal(chatId, mensaje) {
  if (mensaje == "💸 Gasto") {
    guardarTemp(chatId, "TIPO", "Gasto");
    setEstado(chatId, "SELECCION_CATEGORIA");
    mostrarCategorias(chatId, "Gasto");
  } 
  else if (mensaje == "💰 Ingreso") {
    guardarTemp(chatId, "TIPO", "Ingreso");
    setEstado(chatId, "SELECCION_CATEGORIA");
    mostrarCategorias(chatId, "Ingreso");
  }
  else if (mensaje == "📊 Reportes") {
    mostrarMenuReportes(chatId);
  }
  else if (mensaje == "🔍 Buscar") {
    setEstado(chatId, "ESPERANDO_BUSQUEDA");
    enviarMensaje(chatId, "🔍 Escribe lo que quieres buscar:\nEjemplo: tacos, netflix, gasolina", {"remove_keyboard": true});
  }
  else if (mensaje == "🔄 Transferir") {
    iniciarTransferencia(chatId);
  }
  else if (mensaje == "⚙️ Configurar") {
    mostrarMenuConfiguracion(chatId);
  }
  else {
    enviarMensaje(chatId, "⚠️ Usa los botones del menú 👇");
  }
}

function mostrarCategorias(chatId, tipo) {
  var categorias = CATEGORIAS[tipo];
  var botones = [];
  var fila = [];
  var contador = 0;
  
  for (var cat in categorias) {
    fila.push({"text": cat});
    contador++;
    if (contador % 2 == 0) {
      botones.push(fila);
      fila = [];
    }
  }
  if (fila.length > 0) botones.push(fila);
  botones.push([{"text": "🏠 Inicio"}]);
  
  var teclado = {"keyboard": botones, "resize_keyboard": true};
  enviarMensaje(chatId, "📁 Selecciona una categoría:", teclado);
}

function manejarSeleccionCategoria(chatId, mensaje) {
  var tipo = obtenerTemp(chatId, "TIPO");
  var categorias = CATEGORIAS[tipo];
  
  if (! categorias[mensaje]) {
    enviarMensaje(chatId, "⚠️ Por favor selecciona una categoría válida usando los botones.");
    return;
  }
  
  guardarTemp(chatId, "CATEGORIA", mensaje);
  setEstado(chatId, "SELECCION_CUENTA");
  mostrarCuentas(chatId);
}

function mostrarCuentas(chatId) {
  var teclado = {
    "keyboard": [
      [{"text": "💵 Efectivo"}, {"text": "💳 Débito"}],
      [{"text": "🏦 Crédito"}, {"text": "🏠 Inicio"}]
    ],
    "resize_keyboard": true
  };
  enviarMensaje(chatId, "💳 ¿De qué cuenta? ", teclado);
}

function manejarSeleccionCuenta(chatId, mensaje) {
  var cuentasValidas = ["💵 Efectivo", "💳 Débito", "🏦 Crédito"];
  if (cuentasValidas.indexOf(mensaje) === -1) {
    enviarMensaje(chatId, "⚠️ Por favor selecciona una cuenta válida.");
    return;
  }
  
  guardarTemp(chatId, "CUENTA", mensaje);
  setEstado(chatId, "ESPERANDO_MONTO");
  
  var tipo = obtenerTemp(chatId, "TIPO");
  var categoria = obtenerTemp(chatId, "CATEGORIA");
  
  var texto = "✅ " + tipo + " → " + categoria + " → " + mensaje + "\n\n" +
              "✍️ Escribe el MONTO y CONCEPTO\n" +
              "Ejemplo: 150 Tacos al pastor";
  
  enviarMensaje(chatId, texto, {"remove_keyboard": true});
}

function procesarTransaccion(chatId, nombre, mensaje) {
  var tipo = obtenerTemp(chatId, "TIPO");
  var categoria = obtenerTemp(chatId, "CATEGORIA");
  var cuenta = obtenerTemp(chatId, "CUENTA");
  var listaActiva = obtenerListaActiva(chatId) || "Registro";

  if (! tipo || !cuenta || !categoria) {
    enviarMensaje(chatId, "❌ Ocurrió un error.  Comencemos de nuevo.");
    reiniciarFlujo(chatId, nombre);
    return;
  }

  var regex = /(\d+(?:[.,]\d+)?)/;
  var coincidencia = mensaje.match(regex);
  
  if (coincidencia) {
    var monto = parseFloat(coincidencia[0]. replace(',', '.'));
    var concepto = mensaje.replace(coincidencia[0], "").trim();
    if (concepto == "") concepto = categoria. replace(/[^\w\s]/gi, '').trim();
    var fecha = Utilities.formatDate(new Date(), "GMT-6", "yyyy-MM-dd HH:mm:ss");

    // GUARDAR EN SHEETS
    var ss = SpreadsheetApp.openById(sheetId);
    var hoja = ss.getSheetByName(listaActiva);
    if (!hoja) {
      hoja = ss.insertSheet(listaActiva);
      hoja.appendRow(["Fecha", "Usuario", "Tipo", "Categoria", "Cuenta", "Monto", "Concepto"]);
    }
    
    if (hoja.getLastRow() == 0) {
      hoja.appendRow(["Fecha", "Usuario", "Tipo", "Categoria", "Cuenta", "Monto", "Concepto"]);
    }
    
    hoja.appendRow([fecha, nombre, tipo, categoria, cuenta, monto, concepto]);
    
    var emoji = tipo == "Gasto" ? "💸" : "💰";
    var texto = "✅ *Guardado exitosamente*\n\n" +
                emoji + " " + tipo + ": $" + monto.toFixed(2) + "\n" +
                "📁 " + categoria + "\n" +
                "💳 " + cuenta + "\n" +
                "📝 " + concepto;
    
    // Botones inline para deshacer/editar
    var inlineKeyboard = {
      "inline_keyboard": [
        [
          {"text": "❌ Deshacer", "callback_data": "deshacer"},
          {"text": "✏️ Editar", "callback_data": "editar"}
        ]
      ]
    };
    
    enviarMensajeInline(chatId, texto, inlineKeyboard);
    
    // Verificar presupuestos
    verificarPresupuesto(chatId, categoria, tipo);
    
    // Volver al inicio después de 2 segundos
    Utilities.sleep(2000);
    reiniciarFlujo(chatId, nombre);
  } else {
    enviarMensaje(chatId, "⚠️ No encontré un monto numérico.  Intenta de nuevo:\nEjemplo: '100 Pan' o '50.5 Café'");
  }
}

// --- DESHACER Y EDITAR ---

function deshacerUltimaTransaccion(chatId) {
  var lista = obtenerListaActiva(chatId);
  var ss = SpreadsheetApp.openById(sheetId);
  var hoja = ss.getSheetByName(lista);
  
  if (! hoja || hoja.getLastRow() < 2) {
    enviarMensaje(chatId, "❌ No hay transacciones para deshacer.");
    return;
  }
  
  var ultimaFila = hoja.getLastRow();
  var datos = hoja.getRange(ultimaFila, 1, 1, 7).getValues()[0];
  
  hoja.deleteRow(ultimaFila);
  
  var texto = "✅ *Transacción eliminada: *\n\n" +
              datos[2] + ": $" + datos[5] + "\n" +
              "📁 " + datos[3] + "\n" +
              "📝 " + datos[6];
  
  enviarMensaje(chatId, texto);
}

function editarUltimaTransaccion(chatId, messageId) {
  editarMensaje(chatId, messageId, "✏️ Función de edición en desarrollo.. .\nPor ahora usa 'Deshacer' y crea una nueva transacción.");
}

// --- BÚSQUEDA ---

function buscarTransacciones(chatId, termino) {
  var lista = obtenerListaActiva(chatId);
  var ss = SpreadsheetApp.openById(sheetId);
  var hoja = ss.getSheetByName(lista);
  
  if (!hoja || hoja.getLastRow() < 2) {
    enviarMensaje(chatId, "❌ No hay transacciones en esta lista.");
    reiniciarFlujo(chatId, "");
    return;
  }
  
  var datos = hoja.getDataRange().getValues();
  var resultados = [];
  var terminoLower = termino.toLowerCase();
  
  for (var i = 1; i < datos.length; i++) {
    var concepto = datos[i][6]. toString().toLowerCase();
    var categoria = datos[i][3].toString().toLowerCase();
    
    if (concepto.indexOf(terminoLower) > -1 || categoria.indexOf(terminoLower) > -1) {
      resultados.push({
        fecha: datos[i][0],
        tipo: datos[i][2],
        categoria: datos[i][3],
        cuenta: datos[i][4],
        monto: datos[i][5],
        concepto: datos[i][6],
        fila: i + 1
      });
    }
  }
  
  if (resultados.length == 0) {
    enviarMensaje(chatId, "🔍 No se encontraron resultados para:  *" + termino + "*");
  } else {
    var texto = "🔍 *Resultados (" + resultados.length + "):*\n\n";
    
    for (var j = 0; j < Math.min(resultados.length, 10); j++) {
      var r = resultados[j];
      var emoji = r.tipo == "Gasto" ? "💸" :  "💰";
      texto += emoji + " $" + r.monto + " - " + r.concepto + "\n";
      texto += "   📁 " + r.categoria + " | 💳 " + r.cuenta + "\n";
      texto += "   📅 " + formatearFecha(r.fecha) + "\n\n";
    }
    
    if (resultados.length > 10) {
      texto += "_(Mostrando 10 de " + resultados.length + " resultados)_";
    }
    
    enviarMensaje(chatId, texto);
  }
  
  reiniciarFlujo(chatId, "");
}

// --- REPORTES AVANZADOS ---

function mostrarMenuReportes(chatId) {
  var inlineKeyboard = {
    "inline_keyboard": [
      [
        {"text": "📅 Hoy", "callback_data": "reporte_hoy"},
        {"text": "📆 Semana", "callback_data": "reporte_semana"}
      ],
      [
        {"text": "📊 Mes", "callback_data": "reporte_mes"},
        {"text": "📈 Todo", "callback_data": "reporte_todo"}
      ],
      [
        {"text": "❌ Cancelar", "callback_data": "cancelar"}
      ]
    ]
  };
  
  enviarMensajeInline(chatId, "📊 ¿Qué período quieres ver?", inlineKeyboard);
}

function generarReportePeriodo(chatId, periodo) {
  var lista = obtenerListaActiva(chatId);
  var ss = SpreadsheetApp.openById(sheetId);
  var hoja = ss.getSheetByName(lista);
  
  if (!hoja || hoja.getLastRow() < 2) {
    enviarMensaje(chatId, "📉 No hay datos en la lista '" + lista + "'");
    return;
  }

  var datos = hoja.getDataRange().getValues();
  var ahora = new Date();
  var fechaInicio;
  
  // Calcular fecha de inicio según período
  switch(periodo) {
    case "hoy":
      fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
      break;
    case "semana":
      fechaInicio = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "mes":
      fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      break;
    default:
      fechaInicio = new Date(2000, 0, 1);
  }
  
  var ing = 0, gas = 0;
  var efectivo = 0, debito = 0, credito = 0;
  var categorias = {};
  var transacciones = 0;
  
  // Procesar datos
  for (var i = 1; i < datos. length; i++) {
    var fecha = new Date(datos[i][0]);
    if (fecha < fechaInicio) continue;
    
    transacciones++;
    var tipo = datos[i][2];
    var categoria = datos[i][3];
    var cuenta = datos[i][4];
    var monto = parseFloat(datos[i][5]) || 0;
    
    if (tipo == "Ingreso") ing += monto;
    if (tipo == "Gasto") gas += monto;
    
    // Por cuenta
    if (cuenta. indexOf("Efectivo") > -1) efectivo += (tipo == "Ingreso" ? monto : -monto);
    if (cuenta.indexOf("Débito") > -1) debito += (tipo == "Ingreso" ? monto : -monto);
    if (cuenta.indexOf("Crédito") > -1) credito += (tipo == "Ingreso" ? monto : -monto);
    
    // Por categoría
    if (tipo == "Gasto") {
      if (!categorias[categoria]) categorias[categoria] = 0;
      categorias[categoria] += monto;
    }
  }

  if (transacciones == 0) {
    enviarMensaje(chatId, "📉 No hay transacciones en este período.");
    return;
  }

  var balance = ing - gas;
  var emoji = balance >= 0 ? "✅" : "⚠️";
  
  var nombrePeriodo = {
    "hoy": "Hoy",
    "semana": "Esta Semana",
    "mes":  "Este Mes",
    "todo": "Historial Completo"
  }[periodo] || periodo;
  
  var texto = "📊 *Reporte:  " + nombrePeriodo + "*\n" +
              "📂 Lista: " + lista + "\n" +
              "━━━━━━━━━━━━━━━\n\n" +
              "💰 Ingresos: $" + ing. toFixed(2) + "\n" +
              "💸 Gastos: $" + gas.toFixed(2) + "\n" +
              "━━━━━━━━━━━━━━━\n" +
              emoji + " *Balance: $" + balance.toFixed(2) + "*\n\n" +
              "📁 *Por cuenta: *\n" +
              "💵 Efectivo: $" + efectivo.toFixed(2) + "\n" +
              "💳 Débito: $" + debito.toFixed(2) + "\n" +
              "🏦 Crédito:  $" + credito.toFixed(2) + "\n";
  
  // Top 3 categorías
  var topCategorias = Object.keys(categorias).sort(function(a, b) {
    return categorias[b] - categorias[a];
  }).slice(0, 3);
  
  if (topCategorias.length > 0) {
    texto += "\n🔝 *Top Gastos:*\n";
    for (var j = 0; j < topCategorias.length; j++) {
      var cat = topCategorias[j];
      var porcentaje = (categorias[cat] / gas * 100).toFixed(1);
      texto += (j + 1) + "️⃣ " + cat + ": $" + categorias[cat].toFixed(2) + " (" + porcentaje + "%)\n";
    }
  }
  
  texto += "\n📊 Total de transacciones: " + transacciones;
  
  enviarMensaje(chatId, texto);
  
  // Generar gráfico
  if (ing > 0 || gas > 0) {
    generarGrafico(chatId, ing, gas, nombrePeriodo);
  }
}

function generarGrafico(chatId, ingresos, gastos, titulo) {
  try {
    var chartUrl = "https://quickchart.io/chart?w=500&h=300&c=" + encodeURIComponent(JSON.stringify({
      type: 'doughnut',
      data: {
        labels: ['Ingresos', 'Gastos'],
        datasets: [{ 
          data: [ingresos, gastos], 
          backgroundColor: ['#2ecc71', '#e74c3c'] 
        }]
      },
      options: {
        title: {
          display: true,
          text: 'Balance:  ' + titulo,
          fontSize: 16
        },
        legend: {
          position: 'bottom'
        }
      }
    }));
    
    UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/sendPhoto", {
      "method": "post",
      "payload": { 
        "chat_id": chatId, 
        "photo": chartUrl, 
        "caption": "📊 Visualización de " + titulo 
      }
    });
  } catch(e) {
    Logger.log("Error generando gráfico: " + e);
  }
}

// --- TRANSFERENCIAS ---

function iniciarTransferencia(chatId) {
  setEstado(chatId, "TRANSFERENCIA_ORIGEN");
  var teclado = {
    "keyboard": [
      [{"text": "💵 Efectivo"}, {"text": "💳 Débito"}],
      [{"text": "🏦 Crédito"}, {"text": "🏠 Inicio"}]
    ],
    "resize_keyboard": true
  };
  enviarMensaje(chatId, "🔄 *Transferencia*\n\n¿De qué cuenta sale el dinero?", teclado);
}

function manejarTransferenciaOrigen(chatId, mensaje) {
  var cuentasValidas = ["💵 Efectivo", "💳 Débito", "🏦 Crédito"];
  if (cuentasValidas.indexOf(mensaje) === -1) {
    enviarMensaje(chatId, "⚠️ Selecciona una cuenta válida.");
    return;
  }
  
  guardarTemp(chatId, "TRANSFER_ORIGEN", mensaje);
  setEstado(chatId, "TRANSFERENCIA_DESTINO");
  
  var teclado = {
    "keyboard": [
      [{"text": "💵 Efectivo"}, {"text": "💳 Débito"}],
      [{"text":  "🏦 Crédito"}, {"text": "🏠 Inicio"}]
    ],
    "resize_keyboard": true
  };
  enviarMensaje(chatId, "✅ Origen: " + mensaje + "\n\n¿A qué cuenta va? ", teclado);
}

function manejarTransferenciaDestino(chatId, mensaje) {
  var cuentasValidas = ["💵 Efectivo", "💳 Débito", "🏦 Crédito"];
  if (cuentasValidas.indexOf(mensaje) === -1) {
    enviarMensaje(chatId, "⚠️ Selecciona una cuenta válida.");
    return;
  }
  
  var origen = obtenerTemp(chatId, "TRANSFER_ORIGEN");
  if (origen == mensaje) {
    enviarMensaje(chatId, "❌ No puedes transferir a la misma cuenta.\nSelecciona una cuenta diferente.");
    return;
  }
  
  guardarTemp(chatId, "TRANSFER_DESTINO", mensaje);
  setEstado(chatId, "TRANSFERENCIA_MONTO");
  
  enviarMensaje(chatId, "✅ " + origen + " → " + mensaje + "\n\n💵 ¿Cuánto quieres transferir?\nEjemplo: 500", {"remove_keyboard": true});
}

function procesarTransferencia(chatId, mensaje) {
  var regex = /(\d+(? :[.,]\d+)?)/;
  var coincidencia = mensaje.match(regex);
  
  if (!coincidencia) {
    enviarMensaje(chatId, "⚠️ Escribe solo el monto.  Ejemplo: 500");
    return;
  }
  
  var monto = parseFloat(coincidencia[0].replace(',', '.'));
  var origen = obtenerTemp(chatId, "TRANSFER_ORIGEN");
  var destino = obtenerTemp(chatId, "TRANSFER_DESTINO");
  var lista = obtenerListaActiva(chatId);
  
  // Registrar como dos movimientos (salida y entrada)
  var ss = SpreadsheetApp.openById(sheetId);
  var hoja = ss.getSheetByName(lista);
  if (!hoja) {
    hoja = ss.insertSheet(lista);
    hoja.appendRow(["Fecha", "Usuario", "Tipo", "Categoria", "Cuenta", "Monto", "Concepto"]);
  }
  
  var fecha = Utilities.formatDate(new Date(), "GMT-6", "yyyy-MM-dd HH:mm: ss");
  var concepto = "Transferencia:  " + origen + " → " + destino;
  
  // No afecta ingresos/gastos, solo movimiento entre cuentas
  hoja.appendRow([fecha, "Sistema", "Transferencia", "🔄 Movimiento", origen, -monto, concepto]);
  hoja.appendRow([fecha, "Sistema", "Transferencia", "🔄 Movimiento", destino, monto, concepto]);
  
  var texto = "✅ *Transferencia completada*\n\n" +
              "💵 Monto: $" + monto.toFixed(2) + "\n" +
              "📤 De: " + origen + "\n" +
              "📥 A: " + destino;
  
  enviarMensaje(chatId, texto);
  
  Utilities.sleep(2000);
  reiniciarFlujo(chatId, "");
}

// --- PRESUPUESTOS ---

function mostrarMenuConfiguracion(chatId) {
  var inlineKeyboard = {
    "inline_keyboard": [
      [{"text": "💰 Configurar Presupuesto", "callback_data": "config_presupuesto"}],
      [{"text": "📋 Ver Presupuestos", "callback_data": "ver_presupuestos"}],
      [{"text": "❌ Cancelar", "callback_data": "cancelar"}]
    ]
  };
  
  enviarMensajeInline(chatId, "⚙️ *Configuración*\n\n¿Qué quieres hacer?", inlineKeyboard);
}

function verificarPresupuesto(chatId, categoria, tipo) {
  if (tipo != "Gasto") return;
  
  var presupuestos = obtenerPresupuestos(chatId);
  if (! presupuestos[categoria]) return;
  
  var limite = presupuestos[categoria];
  var gastado = calcularGastadoCategoria(chatId, categoria);
  var porcentaje = (gastado / limite * 100).toFixed(1);
  
  if (porcentaje >= 90) {
    var texto = "⚠️ *ALERTA DE PRESUPUESTO*\n\n" +
                "📁 " + categoria + "\n" +
                "💸 Gastado: $" + gastado.toFixed(2) + " de $" + limite.toFixed(2) + "\n" +
                "📊 " + porcentaje + "% usado";
    enviarMensaje(chatId, texto);
  }
}

function obtenerPresupuestos(chatId) {
  var presupuestosStr = leerConfig(chatId, 4) || "{}";
  return JSON.parse(presupuestosStr);
}

function guardarPresupuesto(chatId, categoria, monto) {
  var presupuestos = obtenerPresupuestos(chatId);
  presupuestos[categoria] = monto;
  escribirConfig(chatId, 4, JSON.stringify(presupuestos));
}

function calcularGastadoCategoria(chatId, categoria) {
  var lista = obtenerListaActiva(chatId);
  var ss = SpreadsheetApp.openById(sheetId);
  var hoja = ss.getSheetByName(lista);
  
  if (!hoja || hoja.getLastRow() < 2) return 0;
  
  var datos = hoja.getDataRange().getValues();
  var ahora = new Date();
  var inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  var total = 0;
  
  for (var i = 1; i < datos.length; i++) {
    var fecha = new Date(datos[i][0]);
    if (fecha < inicioMes) continue;
    
    if (datos[i][2] == "Gasto" && datos[i][3] == categoria) {
      total += parseFloat(datos[i][5]) || 0;
    }
  }
  
  return total;
}

// --- COMANDOS ESPECIALES ---

function manejarComandos(chatId, nombre, mensaje) {
  var partes = mensaje.split(" ");
  var comando = partes[0]. toLowerCase();
  var arg = partes. slice(1).join(" ");

  if (comando == "/start") {
    crearUsuario(chatId);
    enviarMensaje(chatId, "👋 *¡Bienvenido " + nombre + "!*\n\n🤖 Bot de Finanzas Personal\n\n📝 *Comandos: *\n/nueva [nombre] - Crear lista\n/usar [nombre] - Cambiar lista\n/buscar [texto] - Buscar transacciones\n/presupuesto [categoría] [monto]\n/ayuda - Ayuda completa");
    reiniciarFlujo(chatId, nombre);
  } 
  else if (comando == "/nueva") {
    if (! arg) { 
      enviarMensaje(chatId, "❌ Especifica un nombre.\n\nEjemplo: /nueva Casa"); 
      return; 
    }
    cambiarLista(chatId, arg);
    enviarMensaje(chatId, "✅ Nueva lista:  *" + arg + "*");
    reiniciarFlujo(chatId, nombre);
  }
  else if (comando == "/usar") {
     if (!arg) { 
       enviarMensaje(chatId, "❌ Especifica un nombre.\n\nEjemplo: /usar Personal"); 
       return; 
     }
     cambiarLista(chatId, arg);
     enviarMensaje(chatId, "🔄 Lista activa: *" + arg + "*");
     reiniciarFlujo(chatId, nombre);
  }
  else if (comando == "/reporte") {
    mostrarMenuReportes(chatId);
  }
  else if (comando == "/buscar") {
    if (!arg) {
      setEstado(chatId, "ESPERANDO_BUSQUEDA");
      enviarMensaje(chatId, "🔍 ¿Qué quieres buscar?");
      return;
    }
    buscarTransacciones(chatId, arg);
  }
  else if (comando == "/presupuesto") {
    var partes = arg.split(" ");
    if (partes.length < 2) {
      enviarMensaje(chatId, "❌ Formato:  /presupuesto categoría monto\n\nEjemplo:  /presupuesto 🍔 Comida 5000");
      return;
    }
    var monto = parseFloat(partes[partes.length - 1]);
    var cat = partes. slice(0, -1).join(" ");
    
    guardarPresupuesto(chatId, cat, monto);
    enviarMensaje(chatId, "✅ Presupuesto configurado:\n" + cat + " = $" + monto);
  }
  else if (comando == "/ayuda" || comando == "/help") {
    var texto = "🆘 *AYUDA COMPLETA*\n\n" +
                "📝 *COMANDOS:*\n" +
                "/start - Iniciar bot\n" +
                "/nueva [nombre] - Crear lista\n" +
                "/usar [nombre] - Cambiar lista\n" +
                "/buscar [texto] - Buscar\n" +
                "/presupuesto [cat] [monto]\n" +
                "/reporte - Ver estadísticas\n\n" +
                "💡 *USO RÁPIDO:*\n" +
                "1️⃣ Presiona 💸 Gasto o 💰 Ingreso\n" +
                "2️⃣ Elige categoría\n" +
                "3️⃣ Elige cuenta\n" +
                "4️⃣ Escribe:  monto + concepto\n" +
                "   Ejemplo: _150 Tacos_\n\n" +
                "🔄 *TRANSFERIR: *\n" +
                "Mueve dinero entre cuentas sin afectar balance\n\n" +
                "🔍 *BUSCAR:*\n" +
                "Encuentra transacciones por concepto\n\n" +
                "📊 *REPORTES:*\n" +
                "Ver por día, semana, mes o todo";
    enviarMensaje(chatId, texto);
  }
  else {
    enviarMensaje(chatId, "❓ Comando desconocido. Usa /ayuda");
  }
}

// --- UTILIDADES ---

function obtenerBalanceRapido(chatId, lista) {
  var ss = SpreadsheetApp.openById(sheetId);
  var hoja = ss.getSheetByName(lista);
  
  if (!hoja || hoja. getLastRow() < 2) return 0;
  
  var datos = hoja.getDataRange().getValues();
  var balance = 0;
  
  for (var i = 1; i < datos.length; i++) {
    var tipo = datos[i][2];
    var monto = parseFloat(datos[i][5]) || 0;
    
    if (tipo == "Ingreso") balance += monto;
    else if (tipo == "Gasto") balance -= monto;
  }
  
  return balance;
}

function formatearFecha(fecha) {
  if (typeof fecha === 'string') fecha = new Date(fecha);
  return Utilities.formatDate(fecha, "GMT-6", "dd/MM/yyyy HH:mm");
}

// --- BASE DE DATOS (Config) ---

function crearUsuario(chatId) {
  var ss = SpreadsheetApp.openById(sheetId);
  var hoja = ss.getSheetByName("Config");
  
  if (!hoja) { 
    hoja = ss. insertSheet("Config"); 
    hoja.appendRow(["ChatID", "Estado", "TempData", "ListaActiva", "Presupuestos"]); 
  }
  
  var data = hoja.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) { 
    if (data[i][0] == chatId) return;
  }
  
  hoja.appendRow([chatId, "MENU_PRINCIPAL", "{}", "Registro", "{}"]);
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
  var actual = JSON.parse(leerConfig(chatId, 2) || "{}");
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

function leerConfig(chatId, colIndex) {
  var hoja = SpreadsheetApp. openById(sheetId).getSheetByName("Config");
  if (!hoja) return null;
  
  var data = hoja.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) { 
    if (data[i][0] == chatId) return data[i][colIndex]; 
  }
  return null;
}

function escribirConfig(chatId, colIndex, valor) {
  var hoja = SpreadsheetApp.openById(sheetId).getSheetByName("Config");
  if (!hoja) {
    crearUsuario(chatId);
    hoja = SpreadsheetApp.openById(sheetId).getSheetByName("Config");
  }
  
  var data = hoja.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == chatId) {
      hoja.getRange(i + 1, colIndex + 1).setValue(valor);
      return;
    }
  }
  
  Logger.log("Usuario " + chatId + " no encontrado, creándolo.. .");
  crearUsuario(chatId);
  escribirConfig(chatId, colIndex, valor);
}

// --- COMUNICACIÓN TELEGRAM ---

function enviarMensaje(chatId, texto, teclado) {
  var payload = { 
    "chat_id": chatId, 
    "text": texto, 
    "parse_mode": "Markdown" 
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

function enviarMensajeInline(chatId, texto, inlineKeyboard) {
  var payload = { 
    "chat_id": chatId, 
    "text": texto, 
    "parse_mode": "Markdown",
    "reply_markup": inlineKeyboard
  };
  
  try {
    UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
      "method": "post", 
      "contentType": "application/json", 
      "payload": JSON.stringify(payload)
    });
  } catch(e) {
    Logger.log("Error enviando mensaje inline: " + e);
  }
}

function editarMensaje(chatId, messageId, texto) {
  var payload = {
    "chat_id": chatId,
    "message_id": messageId,
    "text": texto,
    "parse_mode": "Markdown"
  };
  
  try {
    UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/editMessageText", {
      "method": "post",
      "contentType": "application/json",
      "payload": JSON.stringify(payload)
    });
  } catch(e) {
    Logger.log("Error editando mensaje: " + e);
  }
}

function configurarWebhook() {
  var url = "https://api.telegram.org/bot" + token + "/setWebhook?url=" + webAppUrl;
  var response = UrlFetchApp.fetch(url);
  Logger.log("Webhook configurado:  " + response.getContentText());
}
