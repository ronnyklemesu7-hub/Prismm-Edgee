export function initAurora() {
  const canvas = document.getElementById('prism-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let w, h;
  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const prisms = [];
  const count = window.innerWidth < 768 ? 8 : 16;
  for (let i = 0; i < count; i++) {
    prisms.push({
      x: Math.random() * w,
      y: Math.random() * h,
      size: 20 + Math.random() * 40,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.005,
      color: Math.random() > 0.5 ? 'rgba(124,58,237,' : 'rgba(0,212,255,',
    });
  }

  let mouseX = 0, mouseY = 0;
  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / w - 0.5) * 20;
    mouseY = (e.clientY / h - 0.5) * 20;
  });

  let scrollOffset = 0;
  window.addEventListener('scroll', () => {
    scrollOffset = window.scrollY * 0.05;
  });

  function draw() {
    ctx.clearRect(0, 0, w, h);
    prisms.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      if (p.x < -100) p.x = w + 100;
      if (p.x > w + 100) p.x = -100;
      if (p.y < -100) p.y = h + 100;
      if (p.y > h + 100) p.y = -100;

      const dx = p.x + mouseX;
      const dy = p.y + mouseY - scrollOffset;

      ctx.save();
      ctx.translate(dx, dy);
      ctx.rotate(p.rot);
      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.lineTo(p.size * 0.87, p.size * 0.5);
      ctx.lineTo(-p.size * 0.87, p.size * 0.5);
      ctx.closePath();
      ctx.strokeStyle = p.color + '0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = p.color + '0.04)';
      ctx.fill();
      ctx.restore();
    });
    requestAnimationFrame(draw);
  }
  draw();
}
