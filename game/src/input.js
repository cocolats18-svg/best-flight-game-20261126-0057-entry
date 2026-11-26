// Keyboard and mouse: arrows/WASD for pitch, roll and throttle, mouse position steers,
// Enter/Space/click starts and restarts, M mutes.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouseX = 0;
    this.mouseActive = false;
    this.pressed = new Set();
    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
      if (!event.repeat) this.pressed.add(event.key.toLowerCase());
      this.keys.add(event.key.toLowerCase());
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.key.toLowerCase()));
    canvas.addEventListener('mousemove', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseX = (event.clientX - rect.left) / rect.width - 0.5;
      this.mouseActive = true;
    });
    canvas.addEventListener('mousedown', () => {
      this.pressed.add('click');
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseActive = false;
    });
  }

  /** True once for a key/click pressed since the last call. */
  consume(key) {
    const hit = this.pressed.has(key);
    if (hit) this.pressed.delete(key);
    return hit;
  }

  /** Steering, climb and throttle deltas for this frame. */
  control() {
    const k = this.keys;
    let steer = 0;
    if (k.has('arrowleft') || k.has('a')) steer -= 1;
    if (k.has('arrowright') || k.has('d')) steer += 1;
    if (this.mouseActive) steer += this.mouseX * 2.4;
    let climb = 0;
    if (k.has('arrowup') || k.has('w')) climb += 1;
    if (k.has('arrowdown') || k.has('s')) climb -= 1;
    let throttle = 0;
    if (k.has('shift')) throttle += 1;
    if (k.has('control')) throttle -= 1;
    return { steer, climb, throttle };
  }
}
