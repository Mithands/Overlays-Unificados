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
  3. **Posibles mejoras a explorar:**
     - Comandos de chat interactivos para consultar el Top 3 / Top 5 en vivo (`!top`, `!topxp`, `!toplurk`).
     - Nuevos criterios de ranking (Top First Hackers de la temporada, Top Rachas activas, etc.).
     - Reset de temporadas o rankings mensuales sin perder el progreso histórico.

---

### 🌐 Fase 4: Unificación y Sincronización del Ecosistema del Stream
* **Objetivo:** Integrar todos los proyectos, herramientas y widgets satélite relacionados con el stream en un único repositorio/carpeta centralizado (Monorepo o Suite Unificada), garantizando que todos los elementos operen en perfecta armonía y compartan datos en tiempo real.
* **Pilares de la unificación:**
  1. **Estructura Centralizada de Archivos:**
     - Agrupar los diferentes módulos bajo un mismo árbol organizado (ej. `/overlays/chat`, `/overlays/achievements`, `/overlays/alerts`, `/shared/assets`, `/shared/services`).
     - Compartir recursos globales (paleta CSS común, fuentes, sonidos `sounds/`, iconos `img/`).
  2. **Núcleo de Datos y Estado Compartido:**
     - Crear un **Core / Event Bus Compartido** (`BroadcastChannel` + sincronización Gist unificada) para que cualquier evento en el chat (nivel, First Hack, suscripción, donación o comando) sea reconocido instantáneamente por los demás widgets sin duplicar conexiones a Twitch.
  3. **Panel de Control Maestro (Master Hub):**
     - Desarrollar un panel de control unificado donde el streamer pueda previsualizar, calibrar y gestionar todos sus widgets (chat, logros, tops, alertas) desde una sola interfaz.

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

---

*Última actualización: Agosto 2026 - Versión 2.6 beta*
