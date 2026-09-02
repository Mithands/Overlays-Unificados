# 🎮 Guía de Configuración para Nuevo Canal de Twitch

Esta guía explica paso a paso cómo configurar este paquete de overlays interactivos para que funcione en cualquier otro canal de Twitch de forma 100% independiente (con su propio chat, su propia base de datos de XP y sus propios rankings).

---

## 📋 Resumen de lo que se necesita (5 minutos)
1. **Nombre del canal de Twitch**.
2. **Una cuenta de GitHub** (gratuita) para guardar los niveles y la XP en la nube.
3. **Un Token de GitHub** y un **Gist ID**.
4. **Editar 3 líneas** en el archivo `config.js`.

---

## 🛠️ Paso 1: Configurar el Canal de Twitch

1. Abre la carpeta del overlay: `Overlay-principal/Widget-chat/js/`.
2. Si no existe el archivo `config.js`, copia `config.example.js` y renómbralo a `config.js`.
3. Abre `config.js` con el Bloc de notas o cualquier editor de código y cambia el canal:
   ```javascript
   CHANNEL_NAME: 'nombre_del_nuevo_canal', // Escribe aquí el usuario de Twitch en minúsculas
   ```

---

## ☁️ Paso 2: Crear la Base de Datos en la Nube (GitHub Gist)

Para que los niveles, la experiencia, los logros y las rachas se guarden solos mientras estás en stream:

### 2.1 Crear el Gist (Tu Base de Datos)
1. Inicia sesión en [GitHub](https://github.com/) y entra en **[gist.github.com](https://gist.github.com/)**.
2. En **Gist description** escribe: `Twitch Overlay XP Database`.
3. En **Filename including extension** escribe exactamente: `xp_data.json`.
4. En el contenido del archivo, pega exactamente esto:
   ```json
   {
     "users": {},
     "metadata": {
       "version": "2.0.0",
       "created": "2026-09-02"
     }
   }
   ```
5. Abajo a la derecha, haz clic en **"Create secret gist"** (o "Create public gist").
6. **Copiar el Gist ID:** 
   - Mira la barra de direcciones de tu navegador. La URL será algo como:  
     `https://gist.github.com/tu-usuario/7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d`
   - El código alfanumérico largo del final (`7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d`) es tu **`GIST_ID`**. Cópialo.

---

### 2.2 Crear el Token de Acceso (Tu Llave Secreta)
1. En GitHub, haz clic en tu foto de perfil (arriba a la derecha) -> **Settings** (Configuración).
2. En el menú de la izquierda, baja hasta el final y haz clic en **Developer settings**.
3. Haz clic en **Personal access tokens** -> **Tokens (classic)**.
4. Haz clic en **Generate new token** -> **Generate new token (classic)**.
5. Rellena los campos:
   - **Note:** `Twitch Overlay Token`
   - **Expiration:** Elige `No expiration` (o la duración que prefieras).
   - **Select scopes:** Marca únicamente la casilla **`gist`** (Create gists).
6. Baja al final y pulsa el botón verde **Generate token**.
7. **Copia el token generado** (empieza por `ghp_...`). *Guárdalo bien porque GitHub solo te lo muestra una vez.*

---

## ⚙️ Paso 3: Pegar los Datos en `config.js`

Abre tu archivo `Overlay-principal/Widget-chat/js/config.js` y coloca tus credenciales:

```javascript
// Gist Storage Config (Persistencia en la nube)
GIST_STORAGE: {
    ENABLED: true,
    GIST_ID: 'PEGA_AQUI_TU_GIST_ID', // El código largo de la URL de tu Gist
    GITHUB_TOKEN: 'PEGA_AQUI_TU_TOKEN_GHP', // Tu token ghp_...
    FILENAME: 'xp_data.json',
    SYNC_INTERVAL: 30000,
    AUTO_BACKUP: true
},
```

---

## 🎨 Paso 4: Personalizar Exclusiones y Filtros

En el mismo `config.js`, asegúrate de excluir tu propio nombre de usuario y tus bots de los rankings públicos para que no compitan contra los espectadores:

```javascript
// Excluir a ti mismo y a tus bots de los podios de !top
EXCLUDED_TOP_USERS: [
    'nombre_del_nuevo_canal', // Tu canal
    'streamlabs',
    'streamelements',
    'nightbot'
],
```

---

## 🖥️ Paso 5: Poner el Overlay en OBS Studio

1. Abre **OBS Studio**.
2. En tu escena de streaming, haz clic en el botón **`+`** (Añadir Fuente) en el panel de Fuentes.
3. Selecciona **Navegador** (*Browser Source*).
4. Ponle de nombre `Chat & XP Overlay`.
5. En la ventana de configuración:
   - ✅ Marca la casilla **Archivo local** (*Local file*).
   - Haz clic en **Examinar** y busca el archivo `index.html` (dentro de `Overlay-principal/Widget-chat/index.html`).
   - **Ancho (*Width*):** `1920` (o `450` si solo quieres la columna del chat).
   - **Alto (*Height*):** `1080` (o `800` para solo chat).
   - ✅ Marca la casilla **"Controlar audio a través de OBS"** (si quieres que los sonidos pasen por el mezclador de OBS).
6. Haz clic en **Aceptar**.

---

## 🧪 Paso 6: Comprobación Rápida

1. Abre tu chat de Twitch (o el archivo de pruebas `Overlay-principal/Widget-chat/test-panel.html` en el navegador).
2. Escribe en el chat:
   - `!nivel` -> Verás tu tarjeta de nivel en el overlay.
   - `!top` -> Mostrará el ranking de XP.
   - `!topmes` -> Mostrará la Liga del Mes actual.
   - `!ayuda` -> Lista de comandos disponibles.

¡Todo listo! A partir de ese momento, el sistema sumará experiencia automáticamente a tus espectadores y la guardará en tu Gist en la nube.
