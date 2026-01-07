# IPTV Player - Xtream Codes API

## 🎯 Solución Definitiva

Esta versión soluciona el problema de "formato no soportado" usando **Xtream Codes API** correctamente.

## ✨ Características

✅ **3 métodos de carga:**
   1. **Xtream Codes API** (Servidor + Usuario + Contraseña) ⭐ RECOMENDADO
   2. URL M3U directa
   3. Archivo local

✅ **Las credenciales se aplican automáticamente a todos los streams**
✅ **No más problemas con username/password en URLs**
✅ **Proxy CORS opcional (desactivado por defecto)**

## 🚀 Uso con Xtream Codes

### Método 1: Xtream Codes API (RECOMENDADO)

1. **Abre** `index.html`

2. **Selecciona** la pestaña "🔑 Xtream Codes API" (ya está seleccionada por defecto)

3. **Completa los campos:**
   ```
   Servidor: http://palanganas.dnsalias.net:8080
   Usuario: alexpeluquero
   Contraseña: vE9SeD34L8Hj
   ```

4. **Haz clic** en "🚀 Conectar con Xtream Codes"

5. **Espera** a que cargue la lista de canales

6. **Selecciona** un canal de la lista

7. **Haz clic** en ▶️ REPRODUCIR

### ¿Por qué funciona ahora?

**ANTES (método antiguo):**
```
URL: http://servidor:puerto/get.php?username=XXX&password=YYY&type=m3u
Problema: Cada stream necesitaba las credenciales y el proxy las rompía
```

**AHORA (Xtream Codes API):**
```
La app construye las URLs correctamente:
• Live: http://servidor/live/usuario/contraseña/streamID.ts
• Movies: http://servidor/movie/usuario/contraseña/streamID.mp4
• Series: http://servidor/series/usuario/contraseña/streamID.mp4

Las credenciales se mantienen en TODAS las URLs automáticamente
```

## 📋 Otros Métodos

### Método 2: URL M3U Directa
- Para playlists públicas o con autenticación en la URL
- Ejemplo: `https://iptv-org.github.io/iptv/countries/es.m3u`

### Método 3: Archivo Local
- Carga un archivo .m3u desde tu computadora
- Útil para playlists descargadas

## 🔧 Configuración Proxy

**Por defecto:** DESACTIVADO (recomendado)

Solo actívalo si:
- No puedes cargar la playlist
- Aparecen errores CORS
- El servidor lo requiere

## 💾 Datos Guardados

La app guarda automáticamente:
- ✅ Servidor Xtream Codes
- ✅ Usuario
- ✅ Contraseña
- ✅ Último método usado

Al recargar la página, tus credenciales estarán ahí.

## ❓ Solución de Problemas

### "Error de autenticación"
✅ Verifica usuario y contraseña
✅ Asegúrate de que el servidor sea correcto

### "Servidor no encontrado"
✅ Verifica la URL del servidor
✅ Asegúrate de incluir http:// o https://
✅ Verifica que el puerto sea correcto

### "No se pudo cargar la playlist"
✅ Verifica que el servidor esté online
✅ Prueba activar el proxy CORS
✅ Verifica tu conexión a internet

### "Formato no soportado" al reproducir
✅ El stream puede estar offline
✅ Prueba con otro canal
✅ Verifica que las credenciales sean correctas

## 🎬 Formatos Soportados

- ✅ HLS (m3u8)
- ✅ MPEG-TS (.ts)
- ✅ MP4
- ✅ Streams en vivo
- ✅ VOD (películas y series)

## ⚠️ Aviso Legal

Esta aplicación NO proporciona contenido IPTV.
Solo reproduce fuentes legales a las que el usuario tenga acceso autorizado.

---
Versión Xtream Codes API | 2026
