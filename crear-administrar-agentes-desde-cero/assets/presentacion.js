/* ============================================================
   Motor de diapositivas del curso (compartido)
   Navegación: flechas ← →, barra espaciadora, clic, o botones.
   Presiona "F" para pantalla completa.
   ============================================================ */
(function () {
  const slides = Array.from(document.querySelectorAll(".slide"));
  let i = 0;

  const progreso = document.querySelector(".progreso");
  const contador = document.querySelector(".contador");
  const total = slides.length;

  function mostrar(n) {
    i = Math.max(0, Math.min(n, total - 1));
    slides.forEach((s, k) => s.classList.toggle("activa", k === i));
    if (progreso) progreso.style.width = ((i + 1) / total) * 100 + "%";
    if (contador) contador.textContent = (i + 1) + " / " + total;
    location.hash = i + 1;
  }
  function sig() { mostrar(i + 1); }
  function ant() { mostrar(i - 1); }

  document.addEventListener("keydown", (e) => {
    if (["ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); sig(); }
    else if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); ant(); }
    else if (e.key === "Home") mostrar(0);
    else if (e.key === "End") mostrar(total - 1);
    else if (e.key.toLowerCase() === "f") {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen();
      else document.exitFullscreen();
    }
  });

  // Clic para avanzar (ignora clics en enlaces, botones o bloques de código)
  document.addEventListener("click", (e) => {
    if (e.target.closest("a, button, pre, .nav-btn")) return;
    sig();
  });

  const btnPrev = document.getElementById("prev");
  const btnNext = document.getElementById("next");
  if (btnPrev) btnPrev.addEventListener("click", (e) => { e.stopPropagation(); ant(); });
  if (btnNext) btnNext.addEventListener("click", (e) => { e.stopPropagation(); sig(); });

  const inicio = parseInt(location.hash.replace("#", ""), 10);
  mostrar(Number.isFinite(inicio) && inicio > 0 ? inicio - 1 : 0);
})();
