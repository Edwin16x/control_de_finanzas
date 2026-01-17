# Bot de Finanzas Personal - Telegram

Bot avanzado para control de finanzas personales usando Telegram y Google Sheets.

## 🌟 Características
- 📊 Reportes por período (día/semana/mes)
- 🗂️ 12 categorías predefinidas
- 💳 Múltiples cuentas (Efectivo/Débito/Crédito)
- 🔄 Transferencias entre cuentas
- 💰 Presupuestos con alertas
- 🔍 Búsqueda de transacciones
- 📈 Gráficos visuales

## 🚀 Instalación

1. Crea un bot en Telegram con [@BotFather](https://t.me/botfather)
2. Copia el token
3. Crea una Google Sheet con las hojas: 
   - **Config:** `ChatID | Estado | TempData | ListaActiva | Presupuestos`
   - **Registro:** `Fecha | Usuario | Tipo | Categoria | Cuenta | Monto | Concepto`
4. Abre Google Apps Script
5. Pega el código de `Code.gs`
6. Configura tus variables:
   ```javascript
   var token = "TU_TOKEN_AQUI";
   var sheetId = "TU_SHEET_ID";
   ```
7. Despliega como Web App
8. Copia la URL y actualiza `webAppUrl`
9. Ejecuta `configurarWebhook()`

## 📝 Comandos
- `/start` - Iniciar bot
- `/nueva [nombre]` - Crear lista
- `/usar [nombre]` - Cambiar lista
- `/buscar [texto]` - Buscar transacciones
- `/presupuesto [categoría] [monto]` - Configurar presupuesto
- `/reporte` - Ver estadísticas
- `/ayuda` - Ayuda completa
