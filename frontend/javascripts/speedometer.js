document.addEventListener("DOMContentLoaded", function () {
  const speedWidgets = document.querySelectorAll(".speed-widget");
  const totalTicks = 16;

  speedWidgets.forEach((widget) => {
    const ticksContainer = widget.querySelector(".speed-ticks");
    const range = widget.querySelector(".speed-range");
    const display = widget.querySelector(".speed-display");

    /* CREATE TICKS (TOP HALF) */
    for (let i = 0; i < totalTicks; i++) {
      const tick = document.createElement("div");
      tick.classList.add("tick");

      const angle = -90 + (180 / (totalTicks - 1)) * i;

      tick.style.transform = `translate(-50%, -50%) rotate(${angle}deg) translateY(-50px)`;

      ticksContainer.appendChild(tick);
    }

    /* NEW COLOR: red → yellow → green */
    function getColor(i) {
      const ratio = i / (totalTicks - 1);

      if (ratio < 0.5) {
        // red → yellow
        const r = 255;
        const g = Math.round(255 * (ratio * 2));
        return `rgb(${r}, ${g}, 0)`;
      } else {
        // yellow → green
        const r = Math.round(255 * (1 - (ratio - 0.5) * 2));
        const g = 255;
        return `rgb(${r}, ${g}, 0)`;
      }
    }

    /* UPDATE */
    function update(value) {
      const ticks = widget.querySelectorAll(".tick");

      // value is 1–100
      const active = Math.round((value / 50) * totalTicks);

      ticks.forEach((tick, i) => {
        tick.style.background = getColor(i);

        if (i < active) {
          tick.style.opacity = 1;
          tick.style.boxShadow = `0 0 8px ${getColor(i)}`;
        } else {
          tick.style.opacity = 0.15;
          tick.style.boxShadow = "none";
        }
      });

      // display format: x{value}ms → actually represents value * 10 ms
      display.textContent = `${value}0ms`;
    }

    /* EVENT */
    range.addEventListener("input", (e) => {
      const value = parseInt(e.target.value, 10);
      update(value);
      if (typeof window.sendSpeed === "function") {
        window.sendSpeed(value);
      }
    });

    /* INIT */
    update(Number(range.value));
  });
});
