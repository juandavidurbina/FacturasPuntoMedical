# Sistema de Registro de Facturas

Sistema web para registrar facturas, calcular retenciones automáticamente y generar recibos en PDF.

## 📁 Archivos del Proyecto

| Archivo | Descripción |
|---------|-------------|
| `index.html` | Formulario web principal |
| `app.js` | Lógica de cálculos y conexión con Google |
| `google-apps-script.js` | Código para pegar en Google Apps Script |

---

## 🔧 Configuración Paso a Paso

### Paso 1: Configurar Google Sheets

Tu hoja de cálculo debe tener estas pestañas:

#### Pestaña: `LISTA DE FACTURAS`
Columnas en este orden (fila 1 = encabezados):
| A | B | C | D | E | F | G | H | I | J | K | L | M |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| NIT | NOMBRE | FECHA FACT | NUM FACTURA | VALOR NETO | VALOR IVA | APLICA R/FTE | TARIFA | R/FTE | R/ICA | VALOR N.C | VALOR P.P | SUBTOTAL |

#### Pestaña: `Descuentos`
Columnas mínimas necesarias:
| A | B | C |
|---|---|---|
| NIT | APLICA R/FTE | TARIFA |

- **APLICA R/FTE**: Debe contener "SI" o "NO"
- **TARIFA**: Valor numérico (ej: 4.14 para 4.14‰)

#### Pestaña: `Recibo`
Diseña tu plantilla de recibo. Los datos se llenarán en las celdas configuradas en el Apps Script.

---

### Paso 2: Instalar Google Apps Script

1. Abre tu hoja de cálculo: `https://docs.google.com/spreadsheets/d/16_xcRKCPS7FSF_AYHp9lHsMXSBZMSxijyaN5dIYTK7A/edit`

2. Ve a **Extensiones → Apps Script**

3. Borra todo el código existente

4. Copia y pega el contenido de `google-apps-script.js`

5. **IMPORTANTE**: Ajusta las celdas de la plantilla de recibo en la función `actualizarRecibo()` según tu diseño

6. Guarda el proyecto (Ctrl+S)

7. Haz clic en **Implementar → Nueva implementación**

8. Configura:
   - Tipo: **Aplicación web**
   - Descripción: "API Facturas"
   - Ejecutar como: **Yo (tu email)**
   - Quién tiene acceso: **Cualquier persona**

9. Haz clic en **Implementar**

10. **Copia la URL** que aparece (la necesitarás en el siguiente paso)

---

### Paso 3: Conectar el Formulario

1. Abre `app.js`

2. Busca la línea:
   ```javascript
   const APPS_SCRIPT_URL = 'TU_URL_DE_APPS_SCRIPT_AQUI';
   ```

3. Reemplaza `'TU_URL_DE_APPS_SCRIPT_AQUI'` con la URL copiada:
   ```javascript
   const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx.../exec';
   ```

4. Guarda el archivo

---

### Paso 4: Probar Localmente

Simplemente abre `index.html` en tu navegador (doble clic en el archivo).

---

### Paso 5: Subir a Internet (Opcional)

#### Opción A: Netlify (Recomendado)
1. Ve a [netlify.com](https://netlify.com) y crea una cuenta
2. Arrastra la carpeta `formfacturas` al área de deploy
3. ¡Listo! Obtendrás una URL pública

#### Opción B: GitHub Pages
1. Sube el proyecto a un repositorio de GitHub
2. Ve a Settings → Pages
3. Selecciona la rama principal
4. Obtendrás una URL como `https://tuusuario.github.io/formfacturas`

#### Opción C: Vercel
1. Ve a [vercel.com](https://vercel.com)
2. Conecta tu repositorio de GitHub
3. Deploy automático

---

## 📋 Lógica de Cálculos

### Retenciones (se aplican si VALOR NETO > $524,000)

| Campo | Fórmula |
|-------|---------|
| **R/FTE** | `SI Aplica R/FTE = "SI" Y VALOR NETO > 524000 → VALOR NETO - VALOR N.C, sino 0` |
| **R/ICA** | `SI VALOR NETO > 524000 → (VALOR NETO - VALOR N.C) × TARIFA ÷ 1000, sino 0` |

### Subtotal
```
SUBTOTAL = VALOR NETO + VALOR IVA - R/FTE - R/ICA - VALOR N.C - VALOR P.P
```

---

## 🔍 Solución de Problemas

### El NIT no carga los datos de descuento
- Verifica que el NIT exista en la pestaña "Descuentos"
- Asegúrate de que el Apps Script esté desplegado correctamente
- Revisa la consola del navegador (F12) para ver errores

### Error al enviar la factura
- Verifica que la URL del Apps Script esté correctamente configurada en `app.js`
- Asegúrate de haber autorizado el script cuando lo desplegaste

### El PDF no se genera
- Verifica que la pestaña "Recibo" exista
- Las celdas del recibo deben coincidir con las configuradas en `actualizarRecibo()`

---

## 📞 Notas Técnicas

- **ID de Sheet**: `16_xcRKCPS7FSF_AYHp9lHsMXSBZMSxijyaN5dIYTK7A`
- **Pestaña Facturas**: LISTA DE FACTURAS
- **Pestaña Descuentos**: Descuentos  
- **Pestaña Recibo**: Recibo
- **Umbral de retención**: $524,000

---

## ✅ Checklist de Verificación

- [ ] Pestaña "LISTA DE FACTURAS" creada con columnas correctas
- [ ] Pestaña "Descuentos" tiene datos de NIT, APLICA R/FTE y TARIFA
- [ ] Pestaña "Recibo" tiene diseño de plantilla
- [ ] Apps Script instalado y desplegado
- [ ] URL del Apps Script configurada en app.js
- [ ] Prueba de registro exitosa
