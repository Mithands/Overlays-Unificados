# 🎙️ Twitch TTS Bot para OBS Studio

Bot de **Text-to-Speech (TTS)** en JavaScript con **Micro Interfaz** diseñada específicamente para ser integrada como un **Panel Acoplable (Custom Browser Dock)** en **OBS Studio**.

---

## 🌟 Características

- **Micro Interfaz Compacta**: Diseñada con estilo Dark/Cyberpunk para adaptarse a anchos reducidos de OBS (280px - 400px).
- **Múltiples Motores TTS**:
  - **Nativo**: Utiliza todas las voces instaladas en tu sistema/navegador (gratis y sin configuración).
  - **Google Translate TTS**: Voces online claras y en múltiples idiomas sin necesidad de API Key.
- **Control Total en Vivo**:
  - Reproductor con indicador de quién está hablando.
  - Botones para **Saltar (Skip)** mensaje actual y **Vaciar Cola**.
  - Botón de **Mute rápido (Silenciar)**.
  - Test rápido de voz directo desde el panel.
- **Configuración de Audio**:
  - Sliders para **Volumen**, **Velocidad (Speed)** y **Tono (Pitch)**.
  - Opción para leer o no el nombre del usuario y plantilla personalizable (`{user} dice: `).
- **Filtros y Anti-Spam de Twitch**:
  - Modo comando (ej: `!tts <mensaje>`) o lectura de todos los mensajes.
  - Filtro por roles: Todos, Suscriptores, VIPs, Moderadores.
  - Cooldown por usuario configurable en segundos.
  - Límite máximo de caracteres.
  - Omitir enlaces web (URLs) automáticamente.
  - Lista negra de palabras prohibidas (*blacklist*).
- **Overlay para Stream (Browser Source)**:
  - Subtítulos flotantes con el avatar/rol del usuario y animación de ondas de audio en directo sincronizadas.

---

## 🚀 Cómo Iniciar el Bot

### Opción 1: Directo (Sin Instalar Nada - Recomendado)

1. Haz doble clic en el archivo **`Abrir_Panel.bat`** (o abre directamente el archivo [index.html](file:///c:/Users/David/OneDrive/Desktop/Bot-TTS2/index.html) en tu navegador).
2. ¡Listo! El bot funciona directamente en tu navegador o integrado en OBS.

---

### Opción 2: Con Servidor Local Node.js (Opcional)

Si tienes Node.js instalado en tu sistema:
1. Abre una terminal en esta carpeta.
2. Ejecuta:
   ```bash
   npm install
   npm start
   ```
3. Podrás acceder mediante `http://localhost:3030`.

---

## 📺 Integración en OBS Studio Paso a Paso

### 1. Agregar el Panel de Control como Panel Acoplable (Dock)

1. En OBS Studio, ve al menú superior: **Paneles (Docks) ➔ Paneles de navegador personalizados (Custom Browser Docks)**.
2. En **Nombre del panel**, escribe: `Twitch TTS`.
3. En **URL**, pega la ruta absoluta a tu archivo:
   - `C:/Users/David/OneDrive/Desktop/Bot-TTS2/index.html` (o `http://localhost:3030`)
4. Haz clic en **Aplicar**.
5. ¡Listo! Se abrirá la ventana con el panel. Puedes arrastrarla y **acoplarla en OBS** donde prefieras.

---

### 2. (Opcional) Agregar el Overlay de Subtítulos en el Stream

Si quieres que tus espectadores vean quién envió el mensaje y qué dice en pantalla:

1. En tu escena de OBS, ve a la sección **Fuentes ➔ Agregar (+) ➔ Navegador (Browser Source)**.
2. Nómbrala `TTS Overlay`.
3. En **URL**, pon: `http://localhost:3030/overlay.html`.
4. Configura el tamaño:
   - **Ancho**: `1920` (o el ancho de tu lienzo)
   - **Alto**: `1080` (o el alto de tu lienzo)
5. Marca la casilla **"Actualizar el navegador cuando la escena se active"** si lo deseas.
6. Haz clic en **Aceptar**.

---

## ⚙️ Uso y Configuración Rápida

1. Abre el panel en OBS.
2. Ve a la pestaña **🟣 Twitch & Filtros**:
   - Escribe el nombre de tu canal y haz clic en **Conectar**.
   - Ajusta los permisos (por ejemplo, si solo quieres que lo usen Suscriptores o VIPs).
   - Define el cooldown y el comando (por defecto `!tts`).
3. Ve a la pestaña **🎙️ Voz**:
   - Elige el motor de voz y tu voz favorita.
   - Ajusta velocidad, tono y volumen a tu gusto.
4. Ve a la pestaña **🎮 Control**:
   - ¡Escribe un texto en "Test Rápido" y presiona **Probar** para verificar que todo funciona a la perfección!
