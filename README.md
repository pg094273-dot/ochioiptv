# 📺 IPTV Web Player

Un reproductor IPTV moderno y elegante con interfaz estilo Netflix, desarrollado con HTML5, CSS3 y JavaScript vanilla. Inspirado en la aplicación Zen IPTV Player.

![IPTV Web Player](https://via.placeholder.com/1200x630?text=IPTV+Web+Player)

## ✨ Características

- 🎬 **Interfaz moderna** estilo Netflix/plataformas de streaming
- 📺 **Soporte completo IPTV** para playlists M3U/M3U8
- 🎥 **Streaming HLS** con HLS.js
- 🔍 **Búsqueda de canales** en tiempo real
- 📱 **Diseño responsive** (móvil, tablet, desktop)
- 🎭 **Integración con TMDB** para información de películas y series
- 💾 **Almacenamiento local** de preferencias
- 🌐 **Sin dependencias de backend** (100% frontend)
- 🎨 **Interfaz limpia y pulida**
- ⚡ **Carga rápida** y optimizada

## 🚀 Inicio Rápido

### Opción 1: Usar localmente

1. Descarga todos los archivos del proyecto
2. Abre `index.html` en tu navegador
3. Ingresa una URL de playlist M3U/M3U8 o carga un archivo
4. ¡Disfruta!

### Opción 2: Desplegar en GitHub Pages

1. Crea un repositorio en GitHub
2. Sube todos los archivos del proyecto
3. Ve a Settings → Pages
4. Selecciona la rama `main` y carpeta `/ (root)`
5. Guarda y espera unos minutos
6. Tu app estará en: `https://tu-usuario.github.io/nombre-repo`

### Opción 3: Otros servicios de hosting

Puedes desplegar en:
- **Netlify**: Arrastra la carpeta del proyecto
- **Vercel**: Conecta tu repositorio de GitHub
- **Cloudflare Pages**: Deploy desde Git
- **Firebase Hosting**: `firebase deploy`

## 📋 Requisitos

- Navegador moderno (Chrome, Firefox, Safari, Edge)
- Conexión a Internet (para cargar playlists remotas)
- (Opcional) API Key de TMDB para contenido de películas/series

## 🔧 Configuración

### API de TMDB (Opcional)

Para mostrar películas y series populares:

1. Registrate gratis en [The Movie Database (TMDB)](https://www.themoviedb.org/signup)
2. Ve a [Configuración de API](https://www.themoviedb.org/settings/api)
3. Solicita una API Key (es instantánea y gratuita)
4. Abre `js/config.js`
5. Reemplaza `TU_API_KEY_AQUI` con tu API key:

```javascript
TMDB_API_KEY: 'tu_api_key_real_aqui',
```

**Nota:** Si no configuras la API key, la aplicación seguirá funcionando pero mostrará contenido de ejemplo.

## 📁 Estructura del Proyecto

```
iptv-web-player/
├── index.html          # Página principal
├── css/
│   └── style.css       # Estilos de la aplicación
├── js/
│   ├── config.js       # Configuración global
│   ├── app.js          # Lógica principal
│   ├── player.js       # Reproductor de video
│   ├── parser.js       # Parser de M3U/M3U8
│   └── tmdb.js         # Integración con TMDB API
└── README.md           # Este archivo
```

## 🎮 Uso

### Cargar una Playlist

**Desde URL:**
1. Pega la URL de tu playlist M3U/M3U8 en el campo de entrada
2. Haz clic en "Cargar Playlist"
3. Los canales aparecerán en la barra lateral

**Desde archivo:**
1. Haz clic en "Cargar Archivo"
2. Selecciona tu archivo .m3u o .m3u8
3. Los canales se cargarán automáticamente

### Playlists de Ejemplo

Prueba con estas playlists públicas y legales:

- **Canales españoles:** `https://iptv-org.github.io/iptv/countries/es.m3u`
- **Canales de noticias:** `https://iptv-org.github.io/iptv/categories/news.m3u`
- **Canales de música:** `https://iptv-org.github.io/iptv/categories/music.m3u`

### Buscar Canales

Usa el campo de búsqueda en la barra lateral para filtrar canales por nombre o categoría.

### Reproducir Contenido

Haz clic en cualquier canal de la lista para comenzar la reproducción.

## 🛠️ Tecnologías Utilizadas

- **HTML5** - Estructura
- **CSS3** - Estilos y animaciones
- **JavaScript (Vanilla)** - Lógica de la aplicación
- **HLS.js** - Streaming de video HLS
- **TMDB API** - Base de datos de películas y series
- **Local Storage** - Persistencia de datos

## 📱 Responsive Design

La aplicación está optimizada para:
- 📱 Móviles (320px - 767px)
- 📱 Tablets (768px - 1023px)
- 💻 Desktop (1024px+)
- 🖥️ Pantallas grandes (1920px+)

## ⚠️ Aviso Legal

**IMPORTANTE:** Esta aplicación es un reproductor de video que NO proporciona contenido IPTV. 

- ✅ La aplicación permite reproducir fuentes de video legales
- ✅ Es responsabilidad del usuario asegurar que tiene derechos sobre el contenido
- ❌ No se proporcionan ni se proporcionarán listas de canales
- ❌ No se respaldan suscripciones IPTV ilegales

El uso indebido de esta aplicación para acceder a contenido sin los derechos correspondientes puede resultar en acciones legales por parte de los titulares de derechos.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Para cambios importantes:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 🐛 Reportar Problemas

Si encuentras un bug o tienes una sugerencia:
- Abre un [Issue en GitHub](https://github.com/tu-usuario/iptv-web-player/issues)
- Describe el problema detalladamente
- Incluye capturas de pantalla si es posible

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## 🙏 Agradecimientos

- [HLS.js](https://github.com/video-dev/hls.js/) por el excelente reproductor HLS
- [TMDB](https://www.themoviedb.org/) por su API de películas y series
- [IPTV-org](https://github.com/iptv-org/iptv) por las playlists de ejemplo
- Inspirado en [Zen IPTV Player](https://apps.apple.com/app/zen-iptv-player/id6458223193)

## 📞 Soporte

¿Necesitas ayuda? 
- 📖 Lee la [documentación completa](https://github.com/tu-usuario/iptv-web-player/wiki)
- 💬 Únete a las [discusiones](https://github.com/tu-usuario/iptv-web-player/discussions)
- 📧 Contacta al desarrollador

---

⭐ Si te gusta este proyecto, dale una estrella en GitHub!

Desarrollado con ❤️ para la comunidad de código abierto
