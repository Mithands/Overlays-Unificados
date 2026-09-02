# 🎮 Guía Maestra de Configuración para Nuevo Canal de Twitch

Esta guía explica paso a paso cómo configurar el ecosistema completo de overlays interactivos (**Chat & XP**, **Bot TTS**, **Barra de Metas**, **Últimos Seguidores**, **Votaciones de Juegos** y **Master Control Dock**) para que funcione en cualquier canal de Twitch con su propio chat, base de datos de XP en la nube y panel de control en OBS.

---

## 📋 Resumen Rápido de Configuración (5 minutos)
1. **Asignar el nombre del canal** en los 4 módulos correspondientes.
2. **Crear una base de datos en la nube (GitHub Gist)** para guardar la XP y rankings gratis.
3. **Activar el inicio automático y oculto del servidor** (`Activar_Inicio_Automatico.bat`).
4. **Añadir el Lienzo Unificado** a OBS (`http://localhost:3000/Overlay-principal/index.html`).
5. **Añadir el Master Control Dock** como panel integrado en OBS (`http://localhost:3000/Panel-control/master-dock.html`).

---

## 🛠️ Paso 1: Configurar el Canal en los Módulos del Sistema

Para que todos los widgets escuchen los eventos de tu canal de Twitch, edita el nombre de tu canal en estos 4 archivos:

### 1.1 Chat & Sistema de Niveles XP
- **Ruta:** `Overlay-principal/Widget-chat/js/config.js`
- *(Si no existe, copia `config.example.js` y renómbralo a `config.js`)*
```javascript
CHANNEL_NAME: 'tu_canal_aqui', // En minúsculas
```

### 1.2 Bot de Voz TTS (Audio en Vivo)
- **Ruta:** `Overlay-principal/Bot-tts/js/overlay.js` (Línea 20)
```javascript
const CHANNEL_NAME = 'tu_canal_aqui';
```

### 1.3 Barra de Metas de Seguidores
- **Ruta:** `Overlay-principal/Widget-meta/config.js` (Línea 6)
```javascript
CHANNEL: 'tu_canal_aqui',
```

### 1.4 Widget de Últimos Seguidores
- **Ruta:** `Overlay-principal/Widget-seguidores/app.js` (Línea 7)
```javascript
TWITCH_CHANNEL: 'tu_canal_aqui',
```

---

## ☁️ Paso 2: Base de Datos en la Nube (GitHub Gist)

Para que los niveles, la experiencia, los logros y las rachas se guarden de forma automática e independiente sin depender de servidores de terceros:

### 2.1 Crear el Gist (Tu Base de Datos Gratuita)
1. Inicia sesión en [GitHub](https://github.com/) y entra en **[gist.github.com](https://gist.github.com/)**.
2. En **Gist description** escribe: `Twitch Overlay XP Database`.
3. En **Filename including extension** escribe exactamente: `xp_data.json`.
4. En el contenido del archivo, pega esta plantilla inicial:
   ```json
   {
     "users": {},
     "metadata": {
       "version": "2.0.0",
       "created": "2026-09-03"
     }
   }
   ```
5. Pulsa en **"Create secret gist"** (o "Create public gist").
6. **Copia tu Gist ID:** 
   - Mira la URL en la barra de direcciones de tu navegador:  
     `https://gist.github.com/tu-usuario/7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d`
   - El código largo del final (`7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d`) es tu **`GIST_ID`**.

### 2.2 Crear el Token de Acceso Personal
1. En GitHub, haz clic en tu foto de perfil ➔ **Settings**.
2. En el menú de la izquierda, baja y haz clic en **Developer settings**.
3. Haz clic en **Personal access tokens** ➔ **Tokens (classic)**.
4. Pulsa en **Generate new token** ➔ **Generate new token (classic)**.
5. Rellena los datos:
   - **Note:** `Twitch Overlay Token`
   - **Expiration:** Elige `No expiration`.
   - **Select scopes:** Marca **únicamente** la casilla **`gist`** (Create gists).
6. Pulsa en **Generate token** al final de la página.
7. **Copia el token generado** (empieza por `ghp_...`).

### 2.3 Pegar tus Credenciales en `config.js`
Abre `Overlay-principal/Widget-chat/js/config.js` y completa:
```javascript
GIST_STORAGE: {
    ENABLED: true,
    GIST_ID: 'PEGA_AQUI_TU_GIST_ID',
    GITHUB_TOKEN: 'PEGA_AQUI_TU_TOKEN_GHP',
    FILENAME: 'xp_data.json',
    SYNC_INTERVAL: 30000,
    AUTO_BACKUP: true
},

// Excluye a ti mismo y a tus bots de los podios de rankings
EXCLUDED_TOP_USERS: [
    'tu_canal_aqui',
    'streamlabs',
    'streamelements',
    'nightbot'
],
```

---

## 🚀 Paso 3: Iniciar el Servidor con Inicio Automático y Oculto

Para que no tengas que acordarte de abrir el servidor manualmente cada vez que vayas a transmitir y para que **se ejecute de forma invisible en segundo plano (sin ventanas de consola abiertas)**:

1. Haz doble clic en **`Activar_Inicio_Automatico.bat`** (ubicado en la raíz del proyecto).
2. Este archivo realiza dos acciones de forma automática:
   - Inicia el servidor de inmediato de forma 100% oculta en `http://localhost:3000`.
   - Registra el inicio automático con Windows para que cada vez que enciendas tu PC el servidor ya esté funcionando en el puerto 3000 antes de abrir OBS.
3. *(Opcional)* Si en algún momento deseas detener el servidor o quitarlo del inicio de Windows, cuentas con:
   - **`Detener_Servidor.bat`** (para apagar el proceso en segundo plano).
   - **`Desactivar_Inicio_Automatico.bat`** (para desinstalar el inicio automático con Windows).

---

## 🎬 Paso 4: Configurar OBS Studio

### 4.1 Añadir el Lienzo Unificado (Overlay en Pantalla)
No necesitas añadir múltiples fuentes separadas para cada widget. Todo el stream corre sobre un único lienzo sincronizado:

1. En **OBS Studio**, en tu Escena de Directo, pulsa en **`+`** (Añadir Fuente).
2. Selecciona **Navegador** (*Browser Source*) y nómbrala `Lienzo Overlays Mithands`.
3. Configuración de la fuente:
   - **URL:** `http://localhost:3000/Overlay-principal/index.html`
   - **Ancho (*Width*):** `1920`
   - **Alto (*Height*):** `1080`
   - ✅ Marca la casilla **"Controlar audio a través de OBS"** (para escuchar y mezclar las alertas y el TTS).
   - ✅ Marca la casilla **"Actualizar el navegador cuando la escena se active"**.
4. Pulsa en **Aceptar**.

### 4.2 Añadir el Master Control Dock (Panel Integrado en OBS)
Controla las posiciones, visibilidad, metas, votaciones y sonido en directo sin salir de OBS:

1. En la barra superior de OBS Studio, haz clic en **Paneles** (*Docks*) ➔ **Paneles de navegador personalizados...**
2. Añade una nueva fila:
   - **Nombre del panel:** `Master Dock`
   - **URL:** `http://localhost:3000/Panel-control/master-dock.html`
3. Haz clic en **Aplicar**.
4. Aparecerá una ventana que puedes arrastrar y anclar en cualquier lateral de OBS.

---

## 🎮 Paso 5: Comandos de Chat Disponibles

| Comando | Función |
| :--- | :--- |
| `!nivel` / `!nivel @user` | Muestra la tarjeta de nivel cyberpunk, progreso de XP y liga mensual. |
| `!top` / `!topxp` | Muestra el podio histórico Top 3 de nivel y experiencia acumulada. |
| `!topmes` | Muestra el ranking exclusivo de la Liga del Mes actual. |
| `!topracha` | Muestra los espectadores con mayor racha de días consecutivos. |
| `!racha` | Consulta tus días seguidos en directo y tu multiplicador (hasta x3.0). |
| `!tts <mensaje>` | Reproduce el mensaje en voz alta en directo por el Bot TTS. |
| `!ayuda` | Lista en el chat todos los comandos interactivos disponibles. |

---

## 💡 Consejos y Buenas Prácticas
- **Presets Rápidos:** En el Master Dock puedes usar `⚡ P1`, `⚡ P2` y `⚡ P3` para guardar distribuciones de pantalla (por ejemplo: una para "Just Chatting", otra para "Gaming" y otra para "Pausa").
- **Votaciones en Vivo:** Al abrir las votaciones desde el Dock, el widget pasará a pantalla completa con fondo atenuado al 92% y prioridad máxima sobre los demás elementos.
- **Mute Rápido de TTS:** Haz clic sobre el emote `🔊` en la cabecera del Master Dock para mutear o desmutear la voz al instante si hay spam.
