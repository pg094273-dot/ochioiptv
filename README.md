# IPTV Player PRO - Compatible con Xtream Codes

## 🎯 Problema Solucionado

**Error:** "Formato no soportado o URL inválida" con playlists que usan autenticación (username/password)

**Causa:** El proxy CORS interfiere con la autenticación en las URLs de los streams

**Solución:** Doble configuración de proxy (playlist vs streams)

## ✨ Características

✅ **Compatible con Xtream Codes / get.php**
✅ **Doble configuración de proxy:**
   - Proxy para Playlist: Descarga la lista M3U
   - Proxy para Streams: Reproducción de videos (desactivar si hay autenticación)
✅ **Detección automática de autenticación en URLs**
✅ **Mensajes de error específicos con soluciones**
✅ **Logging detallado de todo el proceso**

## 🚀 Configuración Recomendada

### Para playlists CON autenticación (username/password):
```
✅ Proxy para Playlist: ACTIVADO
❌ Proxy para Streams: DESACTIVADO
```

### Para playlists SIN autenticación:
```
✅ Proxy para Playlist: ACTIVADO
✅ Proxy para Streams: ACTIVADO
```

## 📖 Cómo Usar

1. **Abre** `index.html`

2. **Configura los proxies** (barra superior):
   - Si tu URL tiene `username=` y `password=`:
     ✅ Activa "Proxy CORS para Playlist"
     ❌ Desactiva "Proxy CORS para Streams"

3. **Pega tu URL** completa en el campo de texto

4. **Haz clic** en "Cargar Playlist"

5. **Selecciona** un canal de la lista

6. **Haz clic** en el botón ▶️ REPRODUCIR

## 🔧 Solución de Problemas

### "Formato no soportado o URL inválida"
✅ DESACTIVA "Proxy CORS para Streams" en la configuración
✅ Tu playlist usa autenticación y el proxy la bloquea

### "manifestLoadError"
✅ ACTIVA "Proxy CORS para Playlist"
✅ Cambia el proxy en el selector
✅ Prueba con el botón "🧪 Test"

### "Error de red"
• Stream puede estar offline
• Verifica username/password correcto
• Prueba con otro canal

## 💡 URLs de Ejemplo

**Con autenticación (Xtream Codes):**
```
http://servidor:puerto/get.php?username=USUARIO&password=CLAVE&type=m3u
```

**Sin autenticación:**
```
https://iptv-org.github.io/iptv/countries/es.m3u
```

## ⚠️ Aviso Legal

Esta aplicación NO proporciona contenido IPTV.
Solo reproduce fuentes legales a las que el usuario tenga acceso autorizado.

---
Versión Xtream Codes Compatible | 2026
