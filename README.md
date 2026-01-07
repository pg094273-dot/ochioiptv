# 📺 IPTV Web Player - Versión Completa con VOD

Reproductor IPTV profesional con separación automática de canales en vivo, películas y series.

## ✨ Características Principales

### 🎯 Detección Automática de Contenido
- **TV en Vivo**: Canales de televisión en directo
- **Películas VOD**: Detecta automáticamente contenido de películas
- **Series VOD**: Identifica series y episodios

### 🔧 Características Técnicas
- ✅ Streaming HLS con HLS.js
- ✅ Soporte para playlists M3U/M3U8
- ✅ Interfaz con pestañas (Live/Movies/Series)
- ✅ Consola de depuración integrada
- ✅ Logging detallado de errores
- ✅ Diseño responsive
- ✅ Almacenamiento local de preferencias

## 🚀 Instalación y Uso

### Método 1: Ejecución Local
1. Descarga y extrae el archivo ZIP
2. Abre `index.html` en tu navegador (Chrome, Firefox o Edge recomendados)
3. ¡Listo para usar!

### Método 2: GitHub Pages
1. Crea un repositorio en GitHub
2. Sube todos los archivos
3. Ve a Settings → Pages
4. Selecciona rama "main" y carpeta root
5. Accede a: `https://tu-usuario.github.io/nombre-repo`

### Método 3: Servidor Local
```bash
# Con Python 3
python -m http.server 8000

# Con Node.js
npx serve

# Luego abre: http://localhost:8000
```

## 📖 Cómo Usar

### 1. Cargar una Playlist

**Desde URL:**
- La app viene con una URL de ejemplo precargada
- Haz clic en "Cargar Playlist"
- O ingresa tu propia URL M3U/M3U8

**Desde Archivo:**
- Haz clic en "📁 Archivo"
- Selecciona tu archivo .m3u o .m3u8 local

### 2. Navegar por el Contenido

**Pestañas:**
- **📺 TV en Vivo**: Canales de televisión en directo
- **🎬 Películas**: Contenido VOD de películas
- **📺 Series**: Series y episodios

La aplicación **detecta automáticamente** el tipo de contenido basándose en:
- Nombres de los items
- Grupos/categorías
- Palabras clave (movie, película, serie, episode, etc.)

### 3. Reproducir Contenido

- Haz clic en cualquier item de la lista
- El reproductor cargará automáticamente
- Si el navegador bloquea autoplay, haz clic en "▶️ Reproducir"

### 4. Depuración

La **Consola de Depuración** muestra:
- ✅ Mensajes de éxito (verde)
- ℹ️ Información general (azul)
- ⚠️ Advertencias (amarillo)
- ❌ Errores (rojo)

Úsala para diagnosticar problemas de reproducción.

## 🔍 Solución de Problemas

### El contenido no se reproduce

**Posibles causas:**

1. **URL inválida o servidor offline**
   - Verifica que la URL sea correcta
   - Prueba abrir la URL directamente en el navegador
   - Consulta la consola de depuración

2. **Problemas de CORS**
   - Algunos servidores bloquean peticiones desde navegadores
   - Solución: Usar un proxy CORS o servidor con CORS habilitado

3. **Formato no soportado**
   - La app soporta mejor streams HLS (.m3u8)
   - Algunos formatos pueden no funcionar en ciertos navegadores

4. **Autoplay bloqueado**
   - Los navegadores modernos bloquean autoplay
   - Simplemente haz clic en el botón de reproducir

### Cómo diagnosticar:

1. Abre la **Consola de Depuración** (ya visible por defecto)
2. Busca mensajes de error en rojo
3. Abre la Consola del Navegador (F12 → Console)
4. Prueba con otro canal/película de la lista

### Playlist no carga

- Verifica que la URL sea accesible
- Comprueba tu conexión a internet
- Intenta con una playlist de ejemplo:
  - `https://iptv-org.github.io/iptv/countries/es.m3u`

## 🎭 Configurar TMDB (Opcional)

Para enriquecer metadatos de películas/series:

1. Crea cuenta en: https://www.themoviedb.org/signup
2. Solicita API Key en: https://www.themoviedb.org/settings/api
3. Edita `js/config.js`:
   ```javascript
   TMDB_API_KEY: 'tu_api_key_aqui'
   ```

**Nota:** La app funciona sin TMDB, solo mejora la información visual.

## 🛠️ Tecnologías

- **HTML5 + CSS3**: Interfaz moderna
- **JavaScript Vanilla**: Sin dependencias adicionales
- **HLS.js**: Streaming adaptativo
- **Local Storage**: Persistencia de datos
- **TMDB API**: Metadatos (opcional)

## 📂 Estructura del Proyecto

```
iptv-player/
├── index.html          # Interfaz principal
├── css/
│   └── style.css       # Estilos
├── js/
│   ├── config.js       # Configuración
│   ├── logger.js       # Sistema de logs
│   ├── parser.js       # Parser M3U con detección VOD
│   ├── player.js       # Reproductor HLS
│   └── app.js          # Lógica principal
└── README.md           # Este archivo
```

## ⚠️ Aviso Legal

**IMPORTANTE:** Esta aplicación es un reproductor de video y **NO proporciona contenido IPTV**.

- ✅ Es una herramienta para reproducir fuentes legales
- ✅ El usuario es responsable del contenido que reproduce
- ❌ No se incluyen ni se proporcionan listas de canales
- ❌ No se respaldan suscripciones IPTV ilegales

El uso indebido puede resultar en acciones legales. Usa solo contenido al que tengas derechos de acceso.

## 🐛 Reportar Problemas

Si encuentras un bug:
1. Abre la Consola de Depuración
2. Copia los logs relevantes
3. Abre un issue en GitHub con:
   - Descripción del problema
   - Pasos para reproducirlo
   - Logs de la consola
   - Navegador y versión

## 📄 Licencia

Proyecto de código abierto bajo licencia MIT.

## 🙏 Créditos

- **HLS.js**: https://github.com/video-dev/hls.js/
- **TMDB API**: https://www.themoviedb.org/
- **IPTV-org**: https://github.com/iptv-org/iptv
- Inspirado en **Zen IPTV Player**

---

Desarrollado con ❤️ | Versión 2.0 | Enero 2026
