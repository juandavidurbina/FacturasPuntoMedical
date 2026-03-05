

// Configuración
const CONFIG = {
  HOJA_FACTURAS: 'LISTA DE FACTURAS',
  HOJA_DESCUENTOS: 'Descuentos',
  HOJA_RECIBO: 'Recibo',
  // Columnas en la hoja de Descuentos (según tu estructura real)
  COL_NIT_DESCUENTOS: 1,        // Columna A: Nit Proveedor
  COL_NOMBRE_DESCUENTOS: 2,     // Columna B: Nombre Contable
  COL_RETENCION_FTE: 3,         // Columna C: Retención Fte (No Aplica, Supera Base, etc.)
  COL_TARIFA_RETENCION: 4,      // Columna D: Tarifa Retención (%)
  COL_TARIFA_ICA: 5,            // Columna E: Tarifa ICA
  COL_PLAZO: 6                  // Columna F: Plazo
};

/**
 * Maneja las solicitudes GET (búsqueda de descuentos y listar proveedores)
 */
function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'buscarDescuento') {
    const nit = e.parameter.nit;
    const resultado = buscarDescuentoPorNit(nit);
    return crearRespuesta(resultado);
  }
  
  if (action === 'listarProveedores') {
    const resultado = listarTodosProveedores();
    return crearRespuesta(resultado);
  }
  
  return crearRespuesta({ success: false, error: 'Acción no válida' });
}

/**
 * Maneja las solicitudes POST (registro de facturas)
 */
function doPost(e) {
  try {
    const datos = JSON.parse(e.postData.contents);
    
    if (datos.action === 'registrarFactura') {
      const resultado = registrarFactura(datos);
      return crearRespuesta(resultado);
    }
    
    return crearRespuesta({ success: false, error: 'Acción no válida' });
  } catch (error) {
    return crearRespuesta({ success: false, error: error.toString() });
  }
}

/**
 * Crea una respuesta JSON con CORS habilitado
 */
function crearRespuesta(datos) {
  const output = ContentService.createTextOutput(JSON.stringify(datos));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Lista todos los proveedores de la hoja "Descuentos"
 */
function listarTodosProveedores() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = ss.getSheetByName(CONFIG.HOJA_DESCUENTOS);
    
    if (!hoja) {
      return { success: false, error: 'No se encontró la hoja de Descuentos' };
    }
    
    const datos = hoja.getDataRange().getValues();
    const proveedores = [];
    
    // Recorrer desde la fila 1 para saltar encabezados
    for (let i = 1; i < datos.length; i++) {
      const nit = datos[i][CONFIG.COL_NIT_DESCUENTOS - 1];
      const nombre = datos[i][CONFIG.COL_NOMBRE_DESCUENTOS - 1];
      
      // Solo agregar si tiene NIT
      if (nit && nit.toString().trim() !== '') {
        const retencionFte = datos[i][CONFIG.COL_RETENCION_FTE - 1] || 'No Aplica';
        let tarifaRetencion = datos[i][CONFIG.COL_TARIFA_RETENCION - 1] || 0;
        const tarifaIca = datos[i][CONFIG.COL_TARIFA_ICA - 1] || 0;
        const plazo = datos[i][CONFIG.COL_PLAZO - 1] || 30;
        
        // Convertir tarifa retención
        if (typeof tarifaRetencion === 'string') {
          tarifaRetencion = parseFloat(tarifaRetencion.replace(',', '.').replace('%', '')) || 0;
        } else if (typeof tarifaRetencion === 'number' && tarifaRetencion < 1) {
          tarifaRetencion = tarifaRetencion * 100;
        }
        
        proveedores.push({
          nit: nit.toString().trim(),
          nombre: nombre || '',
          retencionFte: retencionFte,
          tarifaRetencion: tarifaRetencion,
          tarifaIca: tarifaIca,
          plazo: plazo
        });
      }
    }
    
    return { success: true, proveedores: proveedores };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Busca los datos de descuento por NIT en la hoja "Descuentos"
 */
function buscarDescuentoPorNit(nit) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = ss.getSheetByName(CONFIG.HOJA_DESCUENTOS);
    
    if (!hoja) {
      return { success: false, error: 'No se encontró la hoja de Descuentos' };
    }
    
    const datos = hoja.getDataRange().getValues();
    
    // Buscar NIT (empezamos desde la fila 1 para saltar encabezados)
    for (let i = 1; i < datos.length; i++) {
      const nitFila = datos[i][CONFIG.COL_NIT_DESCUENTOS - 1];
      
      // Comparar como string para evitar problemas con formatos
      if (nitFila && nitFila.toString().trim() === nit.toString().trim()) {
        // Obtener los valores de retención
        const retencionFte = datos[i][CONFIG.COL_RETENCION_FTE - 1] || 'No Aplica';
        const tarifaRetencion = datos[i][CONFIG.COL_TARIFA_RETENCION - 1] || 0;
        const tarifaIca = datos[i][CONFIG.COL_TARIFA_ICA - 1] || 0;
        const nombreContable = datos[i][CONFIG.COL_NOMBRE_DESCUENTOS - 1] || '';
        const plazo = datos[i][CONFIG.COL_PLAZO - 1] || 30;
        
        // Convertir tarifa retención de porcentaje a número (ej: "2,50%" -> 2.5)
        let tarifaRetencionNum = tarifaRetencion;
        if (typeof tarifaRetencion === 'string') {
          tarifaRetencionNum = parseFloat(tarifaRetencion.replace(',', '.').replace('%', '')) || 0;
        } else if (typeof tarifaRetencion === 'number') {
          // Si es número decimal como 0.025, convertir a porcentaje
          tarifaRetencionNum = tarifaRetencion < 1 ? tarifaRetencion * 100 : tarifaRetencion;
        }
        
        return {
          success: true,
          datos: {
            nombreContable: nombreContable,
            retencionFte: retencionFte,           // "Supera Base", "No Aplica", "Autoretenedor", "Permanente"
            tarifaRetencion: tarifaRetencionNum,  // Porcentaje para R/FTE (ej: 2.5)
            tarifaIca: tarifaIca,                 // Valor para R/ICA (ej: 4.14)
            plazo: plazo
          }
        };
      }
    }
    
    // NIT no encontrado
    return { success: false, datos: null, mensaje: 'NIT no encontrado' };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Registra una nueva factura en la hoja "LISTA DE FACTURAS"
 */
function registrarFactura(datos) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaFacturas = ss.getSheetByName(CONFIG.HOJA_FACTURAS);
    
    if (!hojaFacturas) {
      return { success: false, error: 'No se encontró la hoja de LISTA DE FACTURAS' };
    }
    
    // Preparar la fila de datos según el orden de columnas de tu hoja (A-M, 13 columnas)
    // A:NIT, B:NOMBRE, C:FECHA FACT, D:NUM FACTURA, E:VALOR NETO, F:VALOR DE IVA, 
    // G:Aplica R/FTE, H:TARIFA, I:R/FTE, J:R/ICA, K:VALOR N.C, L:VALOR P.P, M:SUBTOTAL
    const nuevaFila = [
      datos.nit,
      datos.nombre,
      datos.fechaFact,
      datos.numFactura,
      datos.valorNeto,
      datos.valorIva,
      datos.aplicaRfteTexto || '',    // Porcentaje R/FTE como texto ("2,50%")
      datos.tarifa || 0,              // Tarifa ICA (ej: 4.14)
      datos.rfte,
      datos.rica,
      datos.valorNc,
      datos.valorPp,
      datos.subtotal
    ];
    
    // Agregar la fila al final
    hojaFacturas.appendRow(nuevaFila);
    
    // Actualizar el recibo con los datos
    const resultadoRecibo = actualizarRecibo(datos);
    
    // Obtener el GID de la hoja de recibo para el PDF
    const hojaRecibo = ss.getSheetByName(CONFIG.HOJA_RECIBO);
    const gidRecibo = hojaRecibo ? hojaRecibo.getSheetId() : null;
    
    return { 
      success: true, 
      mensaje: 'Factura registrada correctamente',
      gidRecibo: gidRecibo
    };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Actualiza la hoja de Recibo con los datos de la factura
 * Estructura del Recibo (actualizada):
 * - Fila 5: Datos de identificación (NIT, NOMBRE, FECHA FACT, NUM FACTURA)
 * - Fila 7: Valores (VALOR NETO, VALOR DE IVA, APLICA R/FTE, TARIFA, R/FTE, R/ICA, VALOR N.C, VALOR P.P, SUBTOTAL)
 * - Fila 9: TOTAL (A9:G9) | REALIZADO (H9:J9)
 */
function actualizarRecibo(datos) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaRecibo = ss.getSheetByName(CONFIG.HOJA_RECIBO);
    
    if (!hojaRecibo) {
      return { success: false, error: 'No se encontró la hoja de Recibo' };
    }
    
    // Limpiar solo los valores, NO los títulos de la fila 8
    hojaRecibo.getRange('A5:J5').clearContent();  // Limpia fila 5
    hojaRecibo.getRange('A7:J7').clearContent();  // Limpia fila 7
    hojaRecibo.getRange('B8').clearContent();     // Limpia solo el valor de PLAZO
    hojaRecibo.getRange('D8').clearContent();     // Limpia solo el valor de TOTAL
    hojaRecibo.getRange('I8').clearContent();     // Limpia solo el valor de REALIZADO

    // Fila 4: Escribir los títulos (para asegurar que siempre estén)
    hojaRecibo.getRange('A4').setValue('NIT');                    // NIT (A4:B4)
    hojaRecibo.getRange('C4').setValue('NOMBRE PROVEEDOR');       // NOMBRE PROVEEDOR (C4:D4)
    hojaRecibo.getRange('E4').setValue('FECHA FACTURA');          // FECHA FACTURA (E4:G4)
    hojaRecibo.getRange('H4').setValue('NUM FACTURA');            // NUM FACTURA (H4:J4)

    // Fila 5: Datos de identificación de la factura
    hojaRecibo.getRange('A5').setValue(datos.nit);              // NIT (A5:B5)
    hojaRecibo.getRange('C5').setValue(datos.nombre);           // NOMBRE (C5:D5)
    hojaRecibo.getRange('E5').setValue(datos.fechaFact);        // FECHA FACT (E5:G5)
    hojaRecibo.getRange('H5').setValue(datos.numFactura);       // NUM FACTURA (H5:J5)

    // Fila 7: Valores de la factura
    hojaRecibo.getRange('A7').setValue(datos.valorNeto);              // VALOR NETO
    hojaRecibo.getRange('B7').setValue(datos.valorIva);               // VALOR DE IVA
    hojaRecibo.getRange('C7').setValue(datos.aplicaRfteTexto || '');  // APLICA R/FTE
    hojaRecibo.getRange('D7').setValue(datos.tarifa || 0);            // TARIFA
    hojaRecibo.getRange('E7').setValue(datos.rfte);                   // R/FTE
    hojaRecibo.getRange('F7').setValue(datos.rica);                   // R/ICA
    hojaRecibo.getRange('G7').setValue(datos.valorNc);                // VALOR N.C
    hojaRecibo.getRange('H7').setValue(datos.valorPp);                // VALOR P.P
    hojaRecibo.getRange('I7').setValue(datos.subtotal);               // SUBTOTAL (I7:J7)

    // Fila 8: Títulos y valores (asegurar que los títulos siempre estén)
    hojaRecibo.getRange('A8').setValue('PLAZO:');                     // Título PLAZO
    hojaRecibo.getRange('C8').setValue('TOTAL:');                     // Título TOTAL
    hojaRecibo.getRange('H8').setValue('REALIZADO:');                 // Título REALIZADO
    hojaRecibo.getRange('B8').setValue(datos.plazo || '');            // Valor PLAZO
    hojaRecibo.getRange('E8').setValue(datos.subtotal);               // Valor TOTAL (E8)
    hojaRecibo.getRange('I8').setValue(datos.elaboradoPor || '');     // Valor REALIZADO

    return { success: true };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Función auxiliar para pruebas - Genera un PDF del recibo
 * Puedes llamarla manualmente desde el editor de Apps Script
 */
function generarPDFRecibo() {
    // Asegura que todos los cambios en la hoja estén guardados antes de exportar
    SpreadsheetApp.flush();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaRecibo = ss.getSheetByName(CONFIG.HOJA_RECIBO);
  
  if (!hojaRecibo) {
    Logger.log('No se encontró la hoja de Recibo');
    return null;
  }
  
  const ssId = ss.getId();
  const gid = hojaRecibo.getSheetId();

  // Construir URL del PDF exportando solo el rango A1:J10 en horizontal (landscape), con scale=4 para ajustar a ancho
  const url = `https://docs.google.com/spreadsheets/d/${ssId}/export?format=pdf&gid=${gid}&landscape=true&size=letter&range=A1:L10&scale=4&top_margin=0.00&bottom_margin=0.00&left_margin=0.00&right_margin=0.00`;

  Logger.log('URL del PDF: ' + url);
  return url;
}

/**
 * Función de prueba para verificar la conexión
 */
function testConexion() {
  Logger.log('Conexión exitosa');
  Logger.log('Hojas disponibles:');
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojas = ss.getSheets();
  
  hojas.forEach(hoja => {
    Logger.log(' - ' + hoja.getName() + ' (GID: ' + hoja.getSheetId() + ')');
  });
  
  return { success: true, mensaje: 'Conexión exitosa' };
}
