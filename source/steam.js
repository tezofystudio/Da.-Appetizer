// One clean vapor pass: soft, continuous wisps rise and dissolve.
// No rotating puff sprites, grain, sparkles, bursts, or distortion layers.
export class Steam {
  constructor(canvas, {light = true, strength = 1, origin = null} = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.light = light;
    this.strength = Math.min(1.2, Math.max(0, strength));
    this.origin = origin || (() => ({x: this.w * .5, y: this.h * .52, spread: this.w * .17}));
    this.enabled = true;
    this.alive = true;
    this.opacity = 0;
    this.last = 0;
    this.time = 4;
    this.w = this.h = 0;
    this.buffer = document.createElement('canvas');
    this.buffer.width = 160;
    this.buffer.height = 144;
    this.bufferCtx = this.buffer.getContext('2d');
    this.image = this.bufferCtx.createImageData(this.buffer.width, this.buffer.height);
    this.density = new Float32Array(this.buffer.width * this.buffer.height);
    this.strands = [
      {offset: -.31, phase: .4, bend: -.8, speed: 1.04},
      {offset: -.02, phase: 2.8, bend: .45, speed: .93},
      {offset: .32, phase: 5.2, bend: .65, speed: 1.12},
    ];
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
    this.frame = this.frame.bind(this);
    this.id = requestAnimationFrame(this.frame);
    this.visibility = () => { this.last = 0; };
    document.addEventListener('visibilitychange', this.visibility);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.w = rect.width;
    this.h = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    this.canvas.width = Math.max(1, Math.round(this.w * dpr));
    this.canvas.height = Math.max(1, Math.round(this.h * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.last = 0;
  }

  // Keep the existing viewer API, without adding a second burst of smoke.
  seed() { this.last = 0; }
  reset() { this.opacity = 0; this.last = 0; }

  render(origin) {
    const {ctx, buffer, image, density} = this;
    const bw = buffer.width, bh = buffer.height;
    const spread = Math.max(28, Math.min(origin.spread || this.w * .2, this.w * .5));
    const rise = Math.max(36, Math.min(160, this.w * .40, this.h * .67, origin.y - 6));
    const width = Math.max(76, spread * 1.65);
    const sx = bw / width;
    density.fill(0);

    for (let row = 0; row < bh; row++) {
      // Age increases upwards: density travels away from the food, never spins.
      const height = 1 - row / (bh - 1);
      const age = height * 3.8;
      const bottomFade = Math.min(1, (1 - height) / .09);
      const topFade = Math.pow(1 - height, 1.45);
      const diffusion = 2.4 + height * 9.5;
      for (const strand of this.strands) {
        const emissionTime = this.time * strand.speed - age;
        const drift = Math.pow(height, .8) * (
          strand.bend * 7 + Math.sin(emissionTime * .64 + strand.phase) * 9
          + Math.sin(age * 1.75 - this.time * .23 + strand.phase) * 7
        );
        // Quiet, advected pockets break up the vapor; no solid parallel beams.
        const breath = Math.max(.025, .44 + .30 * Math.sin(emissionTime * 1.55 + strand.phase)
          + .26 * Math.sin(emissionTime * 2.63 + strand.phase * .7));
        const center = bw * .5 + (strand.offset * spread + drift) * sx;
        const sigma = diffusion * (.80 + .20 * Math.sin(emissionTime * .8 + strand.phase)) * sx;
        const amplitude = bottomFade * topFade * breath * .31;
        const start = Math.max(0, Math.floor(center - sigma * 5));
        const end = Math.min(bw - 1, Math.ceil(center + sigma * 5));
        for (let column = start; column <= end; column++) {
          const distance = (column - center) / sigma;
          // A diffuse outer veil, not a solid line or a circular cloud particle.
          const veil = Math.exp(-distance * distance * .5) * .78
            + Math.exp(-distance * distance * .09) * .12;
          density[row * bw + column] += veil * amplitude;
        }
      }
    }

    const rgba = image.data;
    const color = this.light ? [241, 245, 241] : [148, 150, 139];
    const alpha = this.opacity * this.strength * 255;
    for (let index = 0; index < density.length; index++) {
      const pixel = index * 4;
      rgba[pixel] = color[0];
      rgba[pixel + 1] = color[1];
      rgba[pixel + 2] = color[2];
      rgba[pixel + 3] = Math.min(38, density[index] * alpha);
    }
    this.bufferCtx.putImageData(image, 0, 0);
    ctx.drawImage(buffer, origin.x - width * .5, origin.y - rise, width, rise);
  }

  frame(timestamp) {
    if (!this.alive) return;
    this.id = requestAnimationFrame(this.frame);
    if (document.hidden) { this.last = 0; return; }
    // 30 fps is smooth for vapor and avoids unnecessary work on mobile.
    if (this.last && timestamp - this.last < 32) return;
    const dt = this.last ? Math.min((timestamp - this.last) / 1000, .08) : 1 / 30;
    this.last = timestamp;
    this.time += dt;
    const target = this.enabled ? 1 : 0;
    this.opacity += (target - this.opacity) * (1 - Math.exp(-dt * (this.enabled ? 4.8 : 11)));
    this.ctx.clearRect(0, 0, this.w, this.h);
    if (!this.w || !this.h || this.opacity < .005) return;
    const origin = this.origin();
    if (origin) this.render(origin);
  }

  setEnabled(value) { this.enabled = Boolean(value); }

  destroy() {
    this.alive = false;
    cancelAnimationFrame(this.id);
    this.resizeObserver.disconnect();
    document.removeEventListener('visibilitychange', this.visibility);
    this.ctx.clearRect(0, 0, this.w, this.h);
  }
}
