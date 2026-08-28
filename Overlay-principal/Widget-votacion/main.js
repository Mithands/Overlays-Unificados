document.addEventListener("DOMContentLoaded", () => {
  const voteButtons = document.querySelectorAll(".vote-btn");
  const progressFills = document.querySelectorAll(".progress-fill");

  if (!localStorage.getItem("gameVotes")) {
    const initialVotes = {
      mafia: 0,
      mafia2: 0,
      uncharted: 0
    };
    localStorage.setItem("gameVotes", JSON.stringify(initialVotes));
  }

  function updateUI() {
    const votes = JSON.parse(localStorage.getItem("gameVotes"));
    const vMafia = votes.mafia || 0;
    const vMafia2 = votes.mafia2 || 0;
    const vUncharted = votes.uncharted || 0;
    
    const total = vMafia + vMafia2 + vUncharted;

    let pMafia = 0;
    let pMafia2 = 0;
    let pUncharted = 0;

    if (total > 0) {
      pMafia = Math.round((vMafia / total) * 100);
      pMafia2 = Math.round((vMafia2 / total) * 100);
      pUncharted = 100 - pMafia - pMafia2;
    }

    updateDisplay('mafia', pMafia);
    updateDisplay('mafia2', pMafia2);
    updateDisplay('uncharted', pUncharted);
  }

  function updateDisplay(game, percentage) {
    const bar = document.getElementById(`bar-${game}`);
    const text = document.getElementById(`txt-${game}`);
    if (bar && text) {
      bar.style.width = `${percentage}%`;
      text.innerText = `${percentage}%`;
    }
  }

  // 3. Handle Voting
  voteButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const game = button.getAttribute("data-game");
      const votes = JSON.parse(localStorage.getItem("gameVotes"));
      
      // Increment vote
      votes[game] = (votes[game] || 0) + 1;
      
      // Save back to local storage
      localStorage.setItem("gameVotes", JSON.stringify(votes));
      
      // Feedback to user
      const gameName = button.closest("article").querySelector("h3").innerText;
      
      // Trigger update
      updateUI();
      
      // Optional: Add a small bounce effect to the card
      button.closest("article").classList.add("scale-105");
      setTimeout(() => {
        button.closest("article").classList.remove("scale-105");
      }, 200);
    });
  });

  // 4. Handle Reset
  const resetButton = document.getElementById("reset-votes");
  if (resetButton) {
    resetButton.addEventListener("click", () => {
      if (confirm("¿Estás seguro de que quieres reiniciar todas las votaciones?")) {
        localStorage.removeItem("gameVotes");
        // Re-initialize and update
        const initialVotes = { mafia: 0, mafia2: 0, uncharted: 0 };
        localStorage.setItem("gameVotes", JSON.stringify(initialVotes));
        updateUI();
        alert("Votaciones reiniciadas.");
      }
    });
  }

  // Initial UI Update
  updateUI();

  // 4. Animate progress bars on load (using the new logic)
  function animateProgress() {
    progressFills.forEach((fill) => {
      const targetWidth = fill.style.width;
      fill.style.width = "0%";
      setTimeout(() => {
        fill.style.width = targetWidth;
      }, 100);
    });
  }
  
  // Call animateProgress after a short delay to ensure bars are rendered
  setTimeout(animateProgress, 500);

  // 5. Intersection Observer for scroll animations
  const observerOptions = {
    threshold: 0.1,
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("opacity-100", "translate-y-0");
        entry.target.classList.remove("opacity-0", "translate-y-10");
      }
    });
  }, observerOptions);

  document.querySelectorAll(".game-card, section").forEach((el) => {
    el.classList.add(
      "transition-all",
      "duration-700",
      "opacity-0",
      "translate-y-10",
    );
    observer.observe(el);
  });
});
