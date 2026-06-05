const brightnessWidgets = document.querySelectorAll('.brightness-widget');
const totalTicks = 8;

brightnessWidgets.forEach(widget => {
  const ticksContainer = widget.querySelector('.brightness-ticks');
  const brightnessRange = widget.querySelector('.brightness-range');
  const brightnessDisplay = widget.querySelector('.brightness-display');
  const knob = widget.querySelector('.knob');

  for (let i = 0; i < totalTicks; i++) {
  const tick = document.createElement('div');
  tick.classList.add('tick');

  const angle = (360 / totalTicks) * i;

  tick.style.transform =
    `translate(-50%, -50%) rotate(${angle}deg) translateY(-50px)`;

  ticksContainer.appendChild(tick);
}
/* UPDATE VISUALS */
function update(value) {
  const ticks = widget.querySelectorAll('.tick');

  const active = Math.round((value / 100) * totalTicks);

  ticks.forEach((tick, i) => {
    if (i < active) {
      tick.style.opacity = 1;
      tick.style.boxShadow = "0 0 18px rgba(255, 180, 0, 0.9)";
    } else {
      tick.style.opacity = 0.15;
      tick.style.boxShadow = "0 0 6px rgba(255, 120, 0, 0.2)";
    }
  });

  const glow = value / 100;

  brightnessDisplay.textContent = value;

  knob.style.boxShadow = `
    0 0 ${15 + glow * 40}px rgba(255, 150, 0, ${0.3 + glow})
    , inset 0 0 10px rgba(0,0,0,0.6)
  `;
}

/* EVENT */
brightnessRange.addEventListener('input', (e) => {
  const value = Number(e.target.value);
  update(value);
  if (typeof sendBrightness === 'function') {
    sendBrightness(value);
  }
});

/* INIT */
update(Number(brightnessRange.value));
});