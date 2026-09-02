# Reglas del Proyecto Overlays-Mithands

## Commits
- Siempre que el usuario pida hacer un commit, el mensaje debe nombrarse estrictamente:
  `Overlays-Mithands Version <x>`
  (reemplazando `<x>` por la versión que indique el usuario, por ejemplo: `Overlays-Mithands Version 2.0`).

## Arquitectura y Servidor
- El servidor oficial y único se ejecuta en el **puerto 3000** (`http://localhost:3000`).
- No crear servidores ni paneles secundarios en otros puertos.
- Mantener siempre sincronizados los pares en espejo:
  - `Panel-control/master-dock.html` <-> `Overlay-principal/master-dock.html`
  - `Panel-control/css/master-dock.css` <-> `Overlay-principal/css/master-dock.css`
  - `Panel-control/js/master-dock.js` <-> `Overlay-principal/js/master-dock.js`
- El canal de comunicación es `stream_master_dock_bus`.
- Al realizar cambios de diseño o layout, **NUNCA** modificar ni eliminar IDs de elementos DOM existentes ni alterar la lógica funcional.
