document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "mithands_game_votes_v2";
  const CHANNEL_NAME = "stream_master_dock_bus";

  // Estado por defecto
  let state = {
    title: "VOTACIÓN DE JUEGOS",
    options: {
      mafia: { name: "Mafia", votes: 0, barColor: "bg-brand-primary" },
      mafia2: { name: "Mafia 2", votes: 0, barColor: "bg-brand-secondary" },
      uncharted: { name: "Uncharted", votes: 0, barColor: "bg-brand-primary" }
    }
  };

  // Cargar estado guardado si existe
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.options) state = { ...state, ...parsed };
    }
  } catch (e) {
    console.error("Error al cargar votos:", e);
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function updateUI() {
    const vMafia = state.options.mafia.votes || 0;
    const vMafia2 = state.options.mafia2.votes || 0;
    const vUncharted = state.options.uncharted.votes || 0;
    
    const total = vMafia + vMafia2 + vUncharted;

    let pMafia = 0;
    let pMafia2 = 0;
    let pUncharted = 0;

    if (total > 0) {
      pMafia = Math.round((vMafia / total) * 100);
      pMafia2 = Math.round((vMafia2 / total) * 100);
      pUncharted = Math.max(0, 100 - pMafia - pMafia2);
    }

    // Actualizar Títulos de juegos
    const hMafia = document.querySelector("#card-mafia h3");
    const hMafia2 = document.querySelector("#card-mafia2 h3");
    const hUncharted = document.querySelector("#card-uncharted h3");
    if (hMafia) hMafia.textContent = state.options.mafia.name;
    if (hMafia2) hMafia2.textContent = state.options.mafia2.name;
    if (hUncharted) hUncharted.textContent = state.options.uncharted.name;

    // Actualizar barras
    updateDisplay('mafia', pMafia, vMafia);
    updateDisplay('mafia2', pMafia2, vMafia2);
    updateDisplay('uncharted', pUncharted, vUncharted);
  }

  function updateDisplay(gameKey, percentage, voteCount) {
    const bar = document.getElementById(`bar-${gameKey}`);
    const text = document.getElementById(`txt-${gameKey}`);
    if (bar && text) {
      bar.style.width = `${percentage}%`;
      text.innerText = `${percentage}% (${voteCount} votos)`;
    }
  }

  function addVote(gameKey) {
    if (state.options[gameKey]) {
      state.options[gameKey].votes += 1;
      saveState();
      updateUI();

      // Animación de impacto en la tarjeta
      const card = document.getElementById(`card-${gameKey}`);
      if (card) {
        card.classList.add("scale-105");
        setTimeout(() => card.classList.remove("scale-105"), 300);
      }
    }
  }

  function resetVotes() {
    Object.keys(state.options).forEach(k => {
      state.options[k].votes = 0;
    });
    saveState();
    updateUI();
  }

  // 1. Conectar con el Master Control Dock de OBS (0 ms)
  const handleDockMessage = (msg) => {
    if (!msg || !msg.type) return;

    if (msg.type === "dock:voteAdd" && msg.data) {
      addVote(msg.data.gameKey);
    } else if (msg.type === "dock:voteReset") {
      resetVotes();
    } else if (msg.type === "dock:voteUpdate" && msg.data) {
      if (msg.data.options) {
        Object.keys(msg.data.options).forEach(k => {
          if (state.options[k] && msg.data.options[k].name) {
            state.options[k].name = msg.data.options[k].name;
          }
        });
      }
      saveState();
      updateUI();
    }
  };

  if (typeof BroadcastChannel !== "undefined") {
    try {
      const bus = new BroadcastChannel(CHANNEL_NAME);
      bus.onmessage = (e) => handleDockMessage(e.data);
    } catch (e) {}
  }

  window.addEventListener("storage", (e) => {
    if (e.key === "mithands_dock_event" && e.newValue) {
      try {
        handleDockMessage(JSON.parse(e.newValue));
      } catch (err) {}
    }
  });

  window.addEventListener("message", (e) => {
    if (e.data && e.data.type) {
      handleDockMessage(e.data);
    }
  });

  // Botón Reset en pantalla
  const resetButton = document.getElementById("reset-votes");
  if (resetButton) {
    resetButton.addEventListener("click", () => {
      resetVotes();
    });
  }

  // Inicializar UI
  updateUI();
});
