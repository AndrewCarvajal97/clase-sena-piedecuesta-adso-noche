/* Visor interactivo del tutorial paso a paso (se incrusta en index.html al generar). */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // ---------- resaltado de sintaxis mínimo (TypeScript/JavaScript) ----------
  const KW = "import|export|from|const|let|var|function|async|await|return|if|else|for|of|in|while|new|class|extends|implements|interface|type|private|readonly|public|static|throw|try|catch|finally|switch|case|default|break|continue|as|typeof|void|null|undefined|true|false|this";
  const TOK = new RegExp(
    "(\\/\\*[\\s\\S]*?\\*\\/|\\/\\/[^\\n]*)" + // 1: comentarios
      "|(\"(?:[^\"\\\\\\n]|\\\\.)*\"|'(?:[^'\\\\\\n]|\\\\.)*'|`(?:[^`\\\\]|\\\\[\\s\\S])*`)" + // 2: strings
      "|\\b(" + KW + ")\\b" + // 3: palabras clave
      "|(\\b\\d+(?:\\.\\d+)?\\b)", // 4: números
    "g",
  );
  const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  function resaltar(t) {
    let out = "", i = 0, m;
    TOK.lastIndex = 0;
    while ((m = TOK.exec(t))) {
      out += esc(t.slice(i, m.index));
      const x = esc(m[0]);
      out += m[1] ? `<span class="c">${x}</span>` : m[2] ? `<span class="s">${x}</span>` : m[3] ? `<span class="k">${x}</span>` : `<span class="nm">${x}</span>`;
      i = m.index + m[0].length;
    }
    return out + esc(t.slice(i));
  }
  $$('code[data-lang]').forEach((c) => {
    c.dataset.raw = c.textContent;
    if (c.dataset.lang === "ts") c.innerHTML = resaltar(c.textContent);
  });

  // ---------- botón copiar ----------
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".copiar");
    if (!b) return;
    const c = document.getElementById(b.dataset.t);
    const raw = c.dataset.raw || c.textContent;
    const ok = () => { b.textContent = "¡Copiado!"; setTimeout(() => (b.textContent = "Copiar"), 1400); };
    const respaldo = () => {
      const r = document.createRange(); r.selectNodeContents(c);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      b.textContent = "Selecciona y Ctrl+C";
    };
    if (navigator.clipboard) navigator.clipboard.writeText(raw).then(ok).catch(respaldo); else respaldo();
  });

  // ---------- progreso (se recuerda en el navegador de cada persona) ----------
  const total = $$("section.paso[data-paso]").length;
  let hechos = new Set();
  try { hechos = new Set(JSON.parse(localStorage.getItem("pasos-hechos") || "[]")); } catch (e) { /* sin almacenamiento */ }
  const guardar = () => { try { localStorage.setItem("pasos-hechos", JSON.stringify([...hechos])); } catch (e) { /* ignorar */ } };
  function pintar() {
    $$("nav a[data-paso]").forEach((a) => a.classList.toggle("hecho", hechos.has(a.dataset.paso)));
    $(".prog i").style.width = (hechos.size / total) * 100 + "%";
    $(".progt").textContent = `${hechos.size} de ${total} pasos completados`;
    $$(".marcar").forEach((c) => (c.checked = hechos.has(c.dataset.paso)));
  }

  // ---------- navegación ----------
  function ir(id) {
    id = id || "inicio";
    if (!document.getElementById(id)) id = "inicio";
    $$("section.paso, section#inicio").forEach((s) => s.classList.toggle("on", s.id === id));
    $$("nav a").forEach((a) => a.classList.toggle("on", a.dataset.ir === id));
    scrollTo(0, 0);
    try { if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id); } catch (err) { /* vista previa sin historial */ }
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-ir]");
    if (a) { e.preventDefault(); ir(a.dataset.ir); }
  });
  document.addEventListener("change", (e) => {
    if (!e.target.classList.contains("marcar")) return;
    e.target.checked ? hechos.add(e.target.dataset.paso) : hechos.delete(e.target.dataset.paso);
    guardar(); pintar();
  });
  addEventListener("hashchange", () => ir(location.hash.slice(1)));
  document.addEventListener("keydown", (e) => {
    if (e.target.matches && e.target.matches("input,textarea")) return;
    const ids = ["inicio", ...$$("section.paso[data-paso]").map((s) => s.id)];
    const i = ids.indexOf(($("section.on") || {}).id);
    if (e.key === "ArrowRight" && i < ids.length - 1) ir(ids[i + 1]);
    if (e.key === "ArrowLeft" && i > 0) ir(ids[i - 1]);
  });

  pintar();
  ir(location.hash.slice(1));
})();
