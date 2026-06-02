/* ============================================================
   anim.js — tiny, dependency-free controller for the .anim widgets.
   JS only manages STATE (which step, playing/paused, in-view); every
   visual change is CSS transitions keyed off [data-step] on the figure.
   Mirrors the page's existing CSS-only lifecycle stepper, but JS-driven.
   ============================================================ */
(function () {
  "use strict";

  var STEP_MS = 2200;      // dwell time per step while playing
  var LOOP_HOLD_MS = 1400; // extra pause on the final step before looping
  var reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function setup(fig) {
    var steps = parseInt(fig.getAttribute("data-steps"), 10) || 1;
    var caps = fig.querySelectorAll(".anim-caption");
    var toggleBtn = fig.querySelector('[data-act="toggle"]');
    var state = { step: 0, playing: false, timer: null };

    function render() {
      fig.setAttribute("data-step", String(state.step));
      for (var i = 0; i < caps.length; i++) {
        var c = caps[i];
        var on = parseInt(c.getAttribute("data-cap"), 10) === state.step;
        c.classList.toggle("is-active", on);
      }
      if (toggleBtn) {
        toggleBtn.textContent = state.playing ? "⏸ Pause" : "▶ Play";
        toggleBtn.setAttribute("aria-pressed", String(state.playing));
      }
    }

    function clearTimer() {
      if (state.timer) {
        clearTimeout(state.timer);
        state.timer = null;
      }
    }

    function schedule() {
      clearTimer();
      if (!state.playing) return;
      var last = state.step >= steps - 1;
      state.timer = setTimeout(advance, last ? LOOP_HOLD_MS : STEP_MS);
    }

    function advance() {
      state.step = (state.step + 1) % steps; // loops back to 0
      render();
      schedule();
    }

    function play() {
      if (state.playing) return;
      state.playing = true;
      render();
      schedule();
    }

    function pause() {
      state.playing = false;
      clearTimer();
      render();
    }

    function stepOnce() {
      pause();
      state.step = (state.step + 1) % steps;
      render();
    }

    function replay() {
      state.step = 0;
      render();
      play();
    }

    // ---- controls ----
    fig.addEventListener("click", function (e) {
      var btn = e.target.closest && e.target.closest("[data-act]");
      if (!btn || !fig.contains(btn)) return;
      var act = btn.getAttribute("data-act");
      if (act === "toggle") state.playing ? pause() : play();
      else if (act === "step") stepOnce();
      else if (act === "replay") replay();
      else if (act === "goto") {
        pause();
        var to = parseInt(btn.getAttribute("data-to"), 10);
        if (!isNaN(to)) { state.step = ((to % steps) + steps) % steps; render(); }
      }
    });

    // ---- autoplay on view (skipped when reduced motion is requested) ----
    if (!reduceMotion && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) play();
            else pause();
          });
        },
        { threshold: 0.2 }
      );
      io.observe(fig);
    }

    // Reduced motion: land on the final, most informative frame.
    if (reduceMotion) state.step = steps - 1;

    render();
  }

  function init() {
    var figs = document.querySelectorAll(".anim");
    for (var i = 0; i < figs.length; i++) setup(figs[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
