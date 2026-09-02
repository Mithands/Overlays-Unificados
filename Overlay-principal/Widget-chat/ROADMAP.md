# 🗺️ ROADMAP - Twitch Chat Overlay (Cyberpunk 2077)

Documento oficial de seguimiento para las próximas fases de desarrollo, mejoras de arquitectura y nuevas funcionalidades del overlay de chat de Twitch.

---

## 📌 Fases Planificadas

### 🎯 Fase 1: Transición Definitiva de Logros a `Achievements-view.html`
* **Objetivo:** Una vez validado el funcionamiento de `Achievements-view.html` en directos reales, desacoplar y retirar las alertas de logros del interior de la tarjeta de chat principal (`index.html`).
* **Acciones técnicas:**
  - Desactivar o limpiar el contenedor `#achievement-notifications` en `index.html`.
  - Configurar `NotificationManager.js` para que el chat principal no reproduzca banners de logro en su layout, delegando toda la visualización en el nuevo overlay independiente `Achievements-view.html`.
  - Mantener la sincronización de audio y el desbloqueo de estadísticas en segundo plano sin alterar la experiencia de chat.

---

### 🏆 Fase 2: Auditoría y Evolución del Sistema de Logros
* **Objetivo:** Revisar la biblioteca actual de logros (`data/AchievementsData.js`) para depurar los obsoletos y diseñar nuevos desafíos y recompensas para la comunidad.
* **Puntos a auditar:**
  - **Identificar logros obsoletos:** Revisar categorías o juegos antiguos que ya no se jueguen en el canal (juegos específicos, eventos pasados, reglas redundantes).
  - **Categorización y balance:**
    - Stream / Asistencia (*First Hack, Racha diaria, Horas de lurk, etc.*).
    - Participación en Chat (*Comandos, Emotes, Conversación*).
    - Juegos Activos (*Cyberpunk 2077, The Witcher 3, etc.*).
    - Secretos / Easter Eggs.
  - **Optimización de imágenes:** Asegurar que cada nuevo logro cuente con su icono temático en la carpeta `img/logros/` con la estética perk Cyberpunk neón.

---

### 📊 Fase 3: Análisis y Rediseño del Sistema de Tops / Leaderboards
* **Objetivo:** Evaluar a fondo cómo se guardan los datos, de dónde proceden y cómo se calculan y proyectan los rankings para preparar futuras mejoras.
* **Radiografía del sistema actual:**
  1. **¿Dónde se guardan los datos?**
     - En la nube mediante **GitHub Gist** a través de `GistPersistenceService.js`.
     - Se guardan los perfiles de usuario (`usersXP`) con su nivel, experiencia acumulada, estadísticas (`achievementStats`), racha y logros desbloqueados.
  2. **¿Cómo funcionan y de dónde se extrae la información?**
     - **Tops Dinámicos (XP / Nivel):** `ExperienceService.getXPLeaderboard()` ordena en tiempo real la lista de usuarios por nivel y XP (excluyendo automáticamente bots y usuarios de prueba).
     - **Tops Externos (Rangos F1 / Clanes / Roles):** `RankingSystem.js` descarga y parsea un archivo de texto tabulado desde un Gist configurado en `config.js` (`GIST_ID`).
   3. **Mejoras implementadas:**
      - ✅ **Filtro y Exclusión Global de Tops:** Exclusión automática de streamer (`mithands`), cuentas secundarias (`playmithttv`) y bots de todos los tops y estadísticas rotativas.
      - ✅ **Filtro Exclusivo de Seguidores para Tops Públicos:** Comprobación automática contra la API de Twitch de forma que solo los seguidores del canal compiten y aparecen en los podios de `!top`, `!topmes`, `!topxp`, `!topracha` y `!toplurk`.
      - ✅ **Sistema de Liga Mensual (`!topmes`):** Doble bolsa de experiencia (Histórica + Mensual) con reset automático cada 30 días sin perder el nivel global de por vida.
      - ✅ **Calibración de XP Balanceada (Anti-Spam & Lealtad):** Check-in diario (+50 XP), Watch Time ponderado (2 XP/min) y límite anti-spam de 1 XP por mensaje a partir del mensaje 16 del día.
      - ✅ **Comandos Interactivos de Chat:** `!top` / `!topxp` (Nivel/XP), `!topmes` (Liga Mensual), `!toplurk` / `!toptiempo` (Watch Time acumulado), `!topracha` (Rachas activas) y `!nivel @user` (Nivel Global + Posición Mensual).
   4. **Posibles mejoras a explorar:**
      - **Ajustar pantallas de Top en el Widget inactivo:** Proyectar el Top XP, Top Mes y Top Lurk en la rotación del overlay.

---

### 🌐 Fase 4: Unificación del Ecosistema y Panel Maestro de Control OBS (Master Control Dock)
* **Objetivo:** Desarrollar una interfaz de control centralizada (Dock acoplable en OBS Studio) y unificar los widgets satélite (Chat, Meta, Seguidores, Votaciones, TTS, Logros) para controlarlos, posicionarlos y calibrarlos al vuelo desde una sola pantalla.
* **Pilares de la unificación implementados:**
  1. **📍 Control de Posicionamiento y Transformación en Vivo:** ✅
     - Modificación dinámica de coordenadas (X, Y), escala/zoom y opacidad de cualquier widget.
     - Presets de pantalla instantáneos (*"Modo Gaming"*, *"Modo Just Chatting"*, *"Modo Torneo"*).
     - Botones de alineación rápida (Top-Right, Bottom-Left, Centrado).
     - Persistencia automática de coordenadas y estados en `localStorage`.
  2. **👁️ Conmutadores de Visibilidad & Modo Cinemático:** ✅
     - Toggle ON/OFF individual por widget con animaciones glitch Cyberpunk.
     - Botón de limpieza total de pantalla (*Modo Cinemático*) para momentos clave en el stream.
  3. **🎯 Control Dinámico de Parámetros y Metas:** ✅
     - Cambiar la meta de seguidores o títulos en vivo sin editar código.
  4. **🧪 Centro de Pruebas y Emulación Rápida (Test Hub):** ✅
     - Disparadores manuales para simular Followers, Subs, Cheers, Level Up y Logros.
  5. **Núcleo de Datos y Comunicación de Ultra-Baja Latencia:** ✅
     - Event Bus mediante **`BroadcastChannel` API** + **LocalStorage Events** para comunicación 0 ms entre el Dock de OBS y las Browser Sources.
  6. **🖼️ Lienzo Unificado 1920x1080 (Single Browser Source Canvas):** ✅
     - Archivo central `Overlay-principal/index.html` que agrupa Chat & XP, Metas, Seguidores, Votaciones y TTS en una única fuente de OBS gobernada por el Master Dock.
  7. **🔊 Consola Unificada de TTS & Audio:** ✅
     - Control de volumen maestro, botón Mute All, salto de mensaje actual y prueba de voz sintetizada desde el Dock.
  8. **🗳️ Gestor de Votaciones Dinámicas:** ✅
     - Edición en vivo de los títulos de las 3 opciones de juego, botones de +1 voto manual, reinicio a 0 y comando de chat `!voto 1|2|3` con recompensa de XP.

---

### 🖥️ Fase 5: Plataforma Web de la Comunidad (Tops, Perfiles y Estadísticas)
* **Objetivo:** Desarrollar un portal web público e interactivo con estética Cyberpunk 2077 para que los espectadores de Twitch puedan consultar en cualquier momento los rankings, sus estadísticas individuales, logros desbloqueados y el compendio general del canal.
* **Módulos principales de la Web:**
  1. **Leaderboards y Rankings en Vivo:**
     - Tablas dinámicas con filtros de búsqueda: Top Nivel / XP, Top Rachas activas, Top Horas de Lurk y Top First Hackers de la temporada.
  2. **Buscador de Perfiles / Merc Dossier:**
     - Ficha personalizada por espectador que muestra su nivel actual, barra de progreso hacia el siguiente rango, títulos honoríficos, estadísticas de asistencia y vitrina de logros conseguidos.
  3. **Compendio de Logros (Achievement Showcase):**
     - Galería completa de logros del canal clasificados por categorías y rarezas, mostrando los requisitos para desbloquearlos y el porcentaje global de chatters que lo han conseguido.
  4. **Panel de Temporadas y Eventos:**
     - Histórico de ganadores de temporadas anteriores, torneos de la comunidad y eventos especiales del canal.
  5. **Integración Directa y Actualización Automática:**
      - La web leerá directamente la base de datos sincronizada en GitHub Gist / API, reflejando los progresos que ocurran en directo sin necesidad de despliegues manuales.
  6. **🛠️ Visor y Telemetría de Errores en Vivo (Error Logger HUD):**
      - Monitor en tiempo real de fallos de JavaScript, desconexiones de Twitch WebSocket, errores de Gist y fallos de recursos multimedia para diagnóstico rápido.
   7. **💬 Historial y Registro de Mensajes del Chat (Chat Message History & Replay):**
       - Búsqueda y visualización de mensajes pasados, comandos ejecutados y eventos interactivos en la interfaz.
   8. **🎨 Sistema de Temas Dinámicos & Identidad Visual Multi-Streamer:**
       - Soporte para múltiples paletas de colores (Cyberpunk Neón, Vaporwave, Crimson, Emerald, Gold) y logo personalizado configurable por streamer desde `config.js`.

---

### 🔮 Fase 6: Posibles Cambios Futuros (Alertas Cyberpunk, Subs & Eventos)
* **Estado:** *Propuestas de expansión futura (No computan para el progreso actual de desarrollo)*
* **Objetivo:** Diseñar e integrar un sistema completo de alertas animadas con estética Cyberpunk para eventos de Twitch (Subs, Bits, Raids, Follows) sincronizado con recompensas de XP y logros.
* **Puntos planificados:**
  1. **🚨 Sistema de Alertas Cyberpunk en Vivo:**
     - Widget independiente o HUD holográfico integrado en el chat con efectos glitch, avatar del usuario y sonidos Sci-Fi.
  2. **⭐ Recompensas automáticas por Suscripciones & Resubs:**
     - Detección nativa por Twitch IRC y bonificación de `+500 XP` al suscriptor.
  3. **🎁 Regalo de Suscripciones (Subgifts):**
     - Detección de subs de regalo con bonificación de `+250 XP` por sub regalada.
  4. **💎 Donaciones de Bits / Cheers:**
     - Conversión automática de 1 Bit = 1 XP y animación especial según la cantidad de bits.
  5. **🚀 Incursiones y Raids:**
     - Bono de bienvenida `+200 XP` al streamer y `+50 XP` a los espectadores raiders.
  6. **👤 Detección de Nuevos Seguidores (Follows):**
     - Conexión vía EventSub / API y bono de bienvenida `+100 XP`.

---

*Última actualización: Septiembre 2026 - Versión 2.9*
