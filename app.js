// ============================================
// CONFIGURACIÓN - ACTUALIZA ESTA URL DESPUÉS DE PUBLICAR EL APPS SCRIPT
// ============================================
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxmx6BV4cu86qpM38okTgbBZSCk7eSxLYVzPsJhSvxifLXiwxeKvU_8q0vnO-L9pdFqkQ/exec';

// Umbral para aplicar retenciones
const UMBRAL_RETENCION = 524000;

// ============================================
// ELEMENTOS DEL DOM
// ============================================
const form = document.getElementById('facturaForm');
const nitInput = document.getElementById('nit');
const nombreInput = document.getElementById('nombre');
const fechaFactInput = document.getElementById('fechaFact');
const numFacturaInput = document.getElementById('numFactura');
const valorNetoInput = document.getElementById('valorNeto');
const valorIvaInput = document.getElementById('valorIva');
const aplicaRfteInput = document.getElementById('aplicaRfte');
const tarifaInput = document.getElementById('tarifa');
const rfteInput = document.getElementById('rfte');
const ricaInput = document.getElementById('rica');
const valorNcInput = document.getElementById('valorNc');
const valorPpInput = document.getElementById('valorPp');
const subtotalDisplay = document.getElementById('subtotal');
const nitLoader = document.getElementById('nitLoader');
const nitStatus = document.getElementById('nitStatus');
const btnEnviar = document.getElementById('btnEnviar');
const btnEnviarText = document.getElementById('btnEnviarText');
const btnLimpiar = document.getElementById('btnLimpiar');
const modalExito = document.getElementById('modalExito');
const btnDescargarRecibo = document.getElementById('btnDescargarRecibo');
const btnCerrarModal = document.getElementById('btnCerrarModal');
const elaboradoPorInput = document.getElementById('elaboradoPor');

// ============================================
// ESTADO
// ============================================
let datosDescuento = {
    retencionFte: '',       // "Supera Base", "No Aplica", "Autoretenedor", "Permanente"
    tarifaRetencion: 0,     // Porcentaje para R/FTE (ej: 2.5)
    tarifaIca: 0,           // Valor para R/ICA (ej: 4.14)
    nombreContable: '',
    plazo: 30
};

// Lista de todos los proveedores
let listaProveedores = [];
let proveedorSeleccionado = null;

// Elementos del selector personalizado
let selectContainer, selectTrigger, selectedText, searchInput, optionsList;

// ============================================
// UTILIDADES
// ============================================

// Formatear número a moneda colombiana (COP) - Soporta millones
function formatCurrency(value) {
    const num = parseFloat(value) || 0;
    return new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        useGrouping: true
    }).format(num);
}

// Parsear valor de moneda a número (soporta formato colombiano con puntos como separador de miles)
function parseCurrency(value) {
    if (!value) return 0;
    // En formato colombiano: 1.234.567 (puntos para miles)
    // Remover puntos de miles y reemplazar coma decimal si existe
    const cleaned = value.toString()
        .replace(/\./g, '')      // Quitar puntos de miles
        .replace(/,/g, '.')      // Convertir coma decimal a punto
        .replace(/[^\d.-]/g, ''); // Quitar cualquier otro caracter
    return parseFloat(cleaned) || 0;
}

// Obtener valor numérico de un input de moneda
function getNumericValue(input) {
    return parseCurrency(input.value);
}

// Establecer valor formateado en input
function setFormattedValue(input, value) {
    input.value = formatCurrency(value);
}

// ============================================
// FORMATEO DE INPUTS DE MONEDA
// ============================================
function setupCurrencyInputs() {
    const currencyInputs = document.querySelectorAll('[data-currency="true"]');
    
    currencyInputs.forEach(input => {
        // Formatear al escribir
        input.addEventListener('input', function(e) {
            // Guardar posición del cursor
            const cursorPos = this.selectionStart;
            const oldLength = this.value.length;
            
            // Obtener solo números
            const numValue = parseCurrency(this.value);
            
            // Formatear con separadores de miles
            this.value = formatCurrency(numValue);
            
            // Ajustar posición del cursor
            const newLength = this.value.length;
            const newPos = Math.max(0, cursorPos + (newLength - oldLength));
            this.setSelectionRange(newPos, newPos);
        });

        // Al perder foco, asegurar formato
        input.addEventListener('blur', function() {
            if (!this.value || this.value === '') {
                this.value = '0';
            } else {
                const numValue = parseCurrency(this.value);
                this.value = formatCurrency(numValue);
            }
        });

        // Al ganar foco, seleccionar todo para fácil edición
        input.addEventListener('focus', function() {
            this.select();
        });

        // Prevenir entrada de caracteres no numéricos
        input.addEventListener('keypress', function(e) {
            // Permitir: números, backspace, delete, tab, escape, enter
            if (!/[\d]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
            }
        });
    });
}

// ============================================
// CÁLCULOS
// ============================================
function calcularRetenciones() {
    const valorNeto = getNumericValue(valorNetoInput);
    const valorNc = getNumericValue(valorNcInput);
    const tarifaRetencion = parseFloat(datosDescuento.tarifaRetencion) || 0;
    const tarifaIca = parseFloat(datosDescuento.tarifaIca) || 0;
    
    let rfte = 0;
    let rica = 0;
    
    // Verificar si aplica retención
    // Solo aplica si el tipo de retención es "Supera Base" o "Permanente" Y valor neto > 524000
    const aplicaRetencion = (datosDescuento.retencionFte === 'Supera Base' || 
                            datosDescuento.retencionFte === 'Permanente') && 
                            valorNeto > UMBRAL_RETENCION;
    
    // Para Autoretenedor no se aplica retención en la fuente
    const esAutoretenedor = datosDescuento.retencionFte === 'Autoretenedor';
    
    if (aplicaRetencion && !esAutoretenedor) {
        // R/FTE = (VALOR NETO - VALOR N.C) * Tarifa Retención / 100
        rfte = (valorNeto - valorNc) * tarifaRetencion / 100;
        
        // R/ICA = (VALOR NETO - VALOR N.C) * Tarifa ICA / 1000
        rica = (valorNeto - valorNc) * tarifaIca / 1000;
    }
    
    setFormattedValue(rfteInput, Math.round(rfte));
    setFormattedValue(ricaInput, Math.round(rica));
    
    return { rfte: Math.round(rfte), rica: Math.round(rica) };
}

function calcularSubtotal() {
    const valorNeto = getNumericValue(valorNetoInput);
    const valorIva = getNumericValue(valorIvaInput);
    const valorNc = getNumericValue(valorNcInput);
    const valorPp = getNumericValue(valorPpInput);
    
    const { rfte, rica } = calcularRetenciones();
    
    // SUBTOTAL = VALOR NETO + VALOR DE IVA - R/FTE - R/ICA - VALOR N.C - VALOR P.P
    const subtotal = valorNeto + valorIva - rfte - rica - valorNc - valorPp;
    
    // Mostrar en formato COP con separadores de miles
    subtotalDisplay.textContent = '$ ' + formatCurrency(Math.round(subtotal));
    
    return subtotal;
}

// ============================================
// SELECTOR DE PROVEEDORES
// ============================================

// Cargar todos los proveedores desde Google Sheets
async function cargarProveedores() {
    try {
        nitLoader.classList.remove('hidden');
        
        const response = await fetch(`${APPS_SCRIPT_URL}?action=listarProveedores`);
        const data = await response.json();
        
        if (data.success && data.proveedores) {
            listaProveedores = data.proveedores;
            renderizarOpciones(listaProveedores);
            console.log(`✓ ${listaProveedores.length} proveedores cargados`);
        } else {
            optionsList.innerHTML = '<div class="custom-select-empty">No se pudieron cargar los proveedores</div>';
        }
    } catch (error) {
        console.error('Error al cargar proveedores:', error);
        optionsList.innerHTML = '<div class="custom-select-empty">Error de conexión</div>';
    } finally {
        nitLoader.classList.add('hidden');
    }
}

// Renderizar las opciones del selector
function renderizarOpciones(proveedores) {
    if (proveedores.length === 0) {
        optionsList.innerHTML = '<div class="custom-select-empty">No se encontraron resultados</div>';
        return;
    }
    
    optionsList.innerHTML = proveedores.map(p => `
        <div class="custom-select-option" data-nit="${p.nit}" data-nombre="${p.nombre}">
            <div class="option-nit">${p.nit}</div>
            <div class="option-name">${p.nombre}</div>
        </div>
    `).join('');
    
    // Agregar event listeners a las opciones
    optionsList.querySelectorAll('.custom-select-option').forEach(option => {
        option.addEventListener('click', () => seleccionarProveedor(option));
    });
}

// Filtrar proveedores por búsqueda
function filtrarProveedores(termino) {
    const term = termino.toLowerCase().trim();
    if (!term) {
        renderizarOpciones(listaProveedores);
        return;
    }
    
    const filtrados = listaProveedores.filter(p => 
        p.nit.toString().toLowerCase().includes(term) || 
        p.nombre.toLowerCase().includes(term)
    );
    
    renderizarOpciones(filtrados);
}

// Seleccionar un proveedor
function seleccionarProveedor(option) {
    const nit = option.dataset.nit;
    const nombre = option.dataset.nombre;
    
    // Actualizar UI
    selectedText.textContent = `${nit} - ${nombre}`;
    selectedText.classList.remove('text-gray-400');
    selectedText.classList.add('text-gray-700');
    
    // Marcar como seleccionado
    optionsList.querySelectorAll('.custom-select-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    option.classList.add('selected');
    
    // Cerrar dropdown
    selectContainer.classList.remove('open');
    
    // Guardar en inputs hidden
    nitInput.value = nit;
    nombreInput.value = nombre;
    
    // Buscar datos completos del proveedor
    proveedorSeleccionado = listaProveedores.find(p => p.nit.toString() === nit.toString());
    
    if (proveedorSeleccionado) {
        cargarDatosProveedor(proveedorSeleccionado);
    }
}

// Cargar los datos del proveedor seleccionado
function cargarDatosProveedor(proveedor) {
    datosDescuento = {
        retencionFte: proveedor.retencionFte || 'No Aplica',
        tarifaRetencion: proveedor.tarifaRetencion || 0,
        tarifaIca: proveedor.tarifaIca || 0,
        nombreContable: proveedor.nombre || '',
        plazo: proveedor.plazo || 30
    };
    
    // Mostrar el tipo de retención y las tarifas
    aplicaRfteInput.value = datosDescuento.retencionFte;
    tarifaInput.value = `${datosDescuento.tarifaRetencion}% / ${datosDescuento.tarifaIca}‰`;
    
    // Actualizar estado
    nitStatus.textContent = `✓ ${datosDescuento.retencionFte} - Plazo: ${datosDescuento.plazo} días`;
    nitStatus.classList.remove('hidden', 'text-red-500');
    nitStatus.classList.add('text-green-500');
    
    // Recalcular
    calcularSubtotal();
}

// Configurar el selector personalizado
function setupProveedorSelector() {
    selectContainer = document.getElementById('proveedorSelect');
    selectTrigger = document.getElementById('selectTrigger');
    selectedText = document.getElementById('selectedText');
    searchInput = document.getElementById('searchProveedor');
    optionsList = document.getElementById('optionsList');
    
    // Toggle dropdown
    selectTrigger.addEventListener('click', () => {
        selectContainer.classList.toggle('open');
        if (selectContainer.classList.contains('open')) {
            searchInput.focus();
            searchInput.value = '';
            renderizarOpciones(listaProveedores);
        }
    });
    
    // Búsqueda
    searchInput.addEventListener('input', (e) => {
        filtrarProveedores(e.target.value);
    });
    
    // Cerrar al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!selectContainer.contains(e.target)) {
            selectContainer.classList.remove('open');
        }
    });
    
    // Cargar proveedores
    cargarProveedores();
}

// ============================================
// ENVÍO DEL FORMULARIO
// ============================================
async function enviarFormulario(e) {
    e.preventDefault();
    
    // Validar URL configurada
    if (APPS_SCRIPT_URL === 'TU_URL_DE_APPS_SCRIPT_AQUI') {
        alert('⚠️ Debes configurar la URL del Apps Script en app.js');
        return;
    }
    
    // Deshabilitar botón
    btnEnviar.disabled = true;
    btnEnviarText.textContent = 'Enviando...';
    
    // Preparar datos - asegurar que los valores numéricos sean válidos
    const tarifaRetencion = parseFloat(datosDescuento.tarifaRetencion) || 0;
    // Asegurar que tarifaIca sea número plano (sin formato de moneda)
    let tarifaIcaNum = datosDescuento.tarifaIca;
    if (typeof tarifaIcaNum === 'string') {
        tarifaIcaNum = parseFloat(tarifaIcaNum.toString().replace(/[^\d.,\-]/g, '').replace(',', '.')) || 0;
    } else {
        tarifaIcaNum = parseFloat(tarifaIcaNum) || 0;
    }
    
    const datos = {
        action: 'registrarFactura',
        nit: nitInput.value,
        nombre: nombreInput.value,
        fechaFact: fechaFactInput.value,
        numFactura: numFacturaInput.value,
        valorNeto: getNumericValue(valorNetoInput),
        valorIva: getNumericValue(valorIvaInput),
        aplicaRfte: tarifaRetencion / 100,  // Porcentaje como decimal (2.5% -> 0.025)
        aplicaRfteTexto: tarifaRetencion.toFixed(2).replace('.', ',') + '%',  // Formato texto "2,50%" o "0,00%"
        tarifa: tarifaIcaNum,                // Tarifa ICA como número plano (ej: 4.14)
        rfte: getNumericValue(rfteInput),
        rica: getNumericValue(ricaInput),
        valorNc: getNumericValue(valorNcInput),
        valorPp: getNumericValue(valorPpInput),
        subtotal: parseCurrency(subtotalDisplay.textContent.replace('$', '')),
        elaboradoPor: elaboradoPorInput.value  // Responsable del registro
    };
    
    console.log('Datos a enviar:', datos); // Para debugging
    
    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Necesario para Apps Script
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(datos)
        });
        
        // Con no-cors no podemos leer la respuesta, asumimos éxito
        // Mostrar modal de éxito
        const pdfUrl = `https://script.google.com/macros/s/AKfycbxim2_7a4yMn23PSQ53RIhYcOJgaHk2pPjd10ohcauAjoiZtfJ_OPWhBMiWO6sI787nDw/exec`;
        btnDescargarRecibo.href = pdfUrl;
        
        modalExito.classList.remove('hidden');
        modalExito.classList.add('flex');
        
    } catch (error) {
        console.error('Error al enviar:', error);
        alert('Error al enviar los datos. Verifica la conexión.');
    } finally {
        btnEnviar.disabled = false;
        btnEnviarText.textContent = 'Registrar Factura';
    }
}

// ============================================
// LIMPIAR FORMULARIO
// ============================================
function limpiarFormulario() {
    form.reset();
    
    // Resetear selector de proveedor
    if (selectedText) {
        selectedText.textContent = 'Buscar por NIT o nombre...';
        selectedText.classList.add('text-gray-400');
        selectedText.classList.remove('text-gray-700');
    }
    nitInput.value = '';
    nombreInput.value = '';
    proveedorSeleccionado = null;
    
    // Quitar selección de opciones
    if (optionsList) {
        optionsList.querySelectorAll('.custom-select-option').forEach(opt => {
            opt.classList.remove('selected');
        });
    }
    
    // Resetear campos calculados
    aplicaRfteInput.value = '';
    tarifaInput.value = '';
    rfteInput.value = '0';
    ricaInput.value = '0';
    subtotalDisplay.textContent = '$ 0';
    
    // Resetear estado
    datosDescuento = { retencionFte: '', tarifaRetencion: 0, tarifaIca: 0, nombreContable: '', plazo: 30 };
    
    // Ocultar estado NIT
    nitStatus.classList.add('hidden');
    
    // Resetear campo Elaborado Por
    elaboradoPorInput.value = '';
    
    // Establecer fecha actual
    const hoy = new Date().toISOString().split('T')[0];
    fechaFactInput.value = hoy;
    
    // Establecer valores por defecto en campos de moneda
    valorNcInput.value = '0';
    valorPpInput.value = '0';
}

// ============================================
// CERRAR MODAL
// ============================================
function cerrarModal() {
    modalExito.classList.add('hidden');
    modalExito.classList.remove('flex');
    limpiarFormulario();
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
    // Recalcular al cambiar valores
    [valorNetoInput, valorIvaInput, valorNcInput, valorPpInput].forEach(input => {
        input.addEventListener('input', calcularSubtotal);
    });
    
    // Envío de formulario
    form.addEventListener('submit', enviarFormulario);
    
    // Botón limpiar
    btnLimpiar.addEventListener('click', limpiarFormulario);
    
    // Cerrar modal
    btnCerrarModal.addEventListener('click', cerrarModal);
    
    // Cerrar modal al hacer clic fuera
    modalExito.addEventListener('click', function(e) {
        if (e.target === modalExito) {
            cerrarModal();
        }
    });
}

// ============================================
// INICIALIZACIÓN
// ============================================
function init() {
    setupCurrencyInputs();
    setupEventListeners();
    setupProveedorSelector();  // Inicializar selector de proveedores
    
    // Establecer fecha actual
    const hoy = new Date().toISOString().split('T')[0];
    fechaFactInput.value = hoy;
    
    // Establecer valores iniciales
    valorNcInput.value = '0';
    valorPpInput.value = '0';
    
    console.log('📋 Formulario de Facturas inicializado');
    
    if (APPS_SCRIPT_URL === 'TU_URL_DE_APPS_SCRIPT_AQUI') {
        console.warn('⚠️ Recuerda configurar APPS_SCRIPT_URL con la URL de tu Web App');
    }
}

// Ejecutar al cargar la página
document.addEventListener('DOMContentLoaded', init);
