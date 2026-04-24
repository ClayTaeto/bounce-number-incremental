function renderArena(ctx, state, game) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.save();

  // Screen shake
  if (state._shakeEnabled !== false && state._shakeIntensity > 0.5) {
    const dx = (Math.random() - 0.5) * state._shakeIntensity;
    const dy = (Math.random() - 0.5) * state._shakeIntensity;
    ctx.translate(dx, dy);
  }
  if (state._shakeIntensity > 0) {
    state._shakeIntensity *= 0.85;
    if (state._shakeIntensity < 0.1) state._shakeIntensity = 0;
  }

  ctx.fillStyle = '#0a0a10';
  ctx.fillRect(0, 0, w, h);

  // Subtle grid
  ctx.strokeStyle = 'rgba(35, 35, 65, 0.5)';
  ctx.lineWidth = 1;
  for (let x = 60; x < w; x += 60) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 60; y < h; y += 60) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  renderWalls(ctx, state, game, w, h);
  if (state._particlesEnabled !== false && state._particles) renderParticles(ctx, state._particles);
  const threshold = game.getLightspeedThreshold();
  renderTrails(ctx, state.balls);
  for (const ball of state.balls) renderBall(ctx, ball, threshold);
  if (state._popups) renderPopups(ctx, state._popups);

  ctx.restore();
}

function renderWalls(ctx, state, game, w, h) {
  const lm = game.getWallMult('left');
  const rm = game.getWallMult('right');

  // Left wall glow
  const lAlpha = Math.min(0.9, 0.2 + lm * 0.12);
  const lg = ctx.createLinearGradient(0, 0, 16, 0);
  lg.addColorStop(0, `rgba(80, 160, 255, ${lAlpha})`);
  lg.addColorStop(1, 'rgba(80, 160, 255, 0)');
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, 16, h);

  // Right wall glow
  const rAlpha = Math.min(0.9, 0.2 + rm * 0.12);
  const rg = ctx.createLinearGradient(w, 0, w - 16, 0);
  rg.addColorStop(0, `rgba(80, 160, 255, ${rAlpha})`);
  rg.addColorStop(1, 'rgba(80, 160, 255, 0)');
  ctx.fillStyle = rg;
  ctx.fillRect(w - 16, 0, 16, h);

  // Solid wall lines
  ctx.fillStyle = `rgba(80, 160, 255, ${Math.min(1, lAlpha + 0.3)})`;
  ctx.fillRect(0, 0, 3, h);
  ctx.fillStyle = `rgba(80, 160, 255, ${Math.min(1, rAlpha + 0.3)})`;
  ctx.fillRect(w - 3, 0, 3, h);

  // Neutral top/bottom
  ctx.fillStyle = 'rgba(60, 60, 100, 0.5)';
  ctx.fillRect(0, 0, w, 2);
  ctx.fillRect(0, h - 2, w, 2);

  // Multiplier labels on walls
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = 'rgba(120, 190, 255, 0.8)';
  ctx.textAlign = 'center';
  ctx.save();
  ctx.translate(10, h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`x${lm.toFixed(1)}`, 0, 0);
  ctx.restore();
  ctx.save();
  ctx.translate(w - 10, h / 2);
  ctx.rotate(Math.PI / 2);
  ctx.fillText(`x${rm.toFixed(1)}`, 0, 0);
  ctx.restore();
}

function renderTrails(ctx, balls) {
  for (const ball of balls) {
    if (!ball._trail || ball._trail.length === 0) continue;
    const info = getTierInfo(ball.tier);
    const len = ball._trail.length;
    for (let i = 0; i < len; i++) {
      const pt = ball._trail[i];
      ctx.globalAlpha = (i + 1) / (len + 1) * 0.5;
      ctx.fillStyle = info.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, Math.max(1.5, ball.radius * 0.3 * ((i + 1) / len)), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function renderBall(ctx, ball, threshold) {
  const info = getTierInfo(ball.tier);
  const r = ball.radius * (ball.popScale || 1);
  const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  const sr = Math.min(speed / threshold, 1);

  ctx.save();

  // Outer glow for tier >= 6 or near lightspeed
  if (ball.tier >= 6 || sr > 0.55) {
    const glowR = r + 6 + sr * 10;
    const grd = ctx.createRadialGradient(ball.x, ball.y, r * 0.4, ball.x, ball.y, glowR);
    const gc = sr > 0.8 ? '#ffffff' : info.color;
    grd.addColorStop(0, gc + '55');
    grd.addColorStop(1, gc + '00');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, glowR, 0, Math.PI * 2);
    ctx.fill();
  }

  // Speed trail
  if (sr > 0.45) {
    const trailLen = sr * 24;
    const spd = Math.max(speed, 1);
    const nx = -ball.vx / spd;
    const ny = -ball.vy / spd;
    ctx.globalAlpha = sr * 0.35;
    ctx.fillStyle = info.color;
    ctx.beginPath();
    ctx.ellipse(
      ball.x + nx * trailLen * 0.5,
      ball.y + ny * trailLen * 0.5,
      r * 0.75, r * 0.35,
      Math.atan2(ball.vy, ball.vx),
      0, Math.PI * 2
    );
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Hit flash
  if (ball.hitFlash > 0) {
    ctx.globalAlpha = ball.hitFlash / 0.15;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, r + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Merge flash ring
  if (ball.mergeFlash > 0) {
    ctx.globalAlpha = ball.mergeFlash / 0.3;
    ctx.strokeStyle = info.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, r + 6 + (1 - ball.mergeFlash / 0.3) * 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Ball body gradient
  const bg = ctx.createRadialGradient(ball.x - r * 0.35, ball.y - r * 0.35, r * 0.05, ball.x, ball.y, r);
  bg.addColorStop(0, '#ffffff');
  bg.addColorStop(0.25, info.color);
  bg.addColorStop(1, info.color + '99');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, r, 0, Math.PI * 2);
  ctx.fill();

  // Lightspeed warning ring
  if (sr > 0.7) {
    ctx.strokeStyle = `rgba(255,255,255,${(sr - 0.7) * 3.3})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, r + 1, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Trait visuals
  if (ball.trait === 'golden') {
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ffd700';
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, r + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else if (ball.trait === 'hot') {
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#ff4400';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (ball.trait === 'heavy') {
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#333355';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#888899';
    ctx.font = `${Math.max(8, r * 0.5)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('▪', ball.x, ball.y + r * 0.3);
    ctx.restore();
  }

  if (ball.trait === 'lucky') {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#ffe000';
    ctx.font = `${Math.max(8, r * 0.55)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('★', ball.x, ball.y - r - 2);
    ctx.restore();
  }

  // Number label
  const fontSize = Math.max(9, Math.min(r * 0.85, 16));
  ctx.fillStyle = ball.tier <= 2 ? '#1a1a2e' : '#0a0a14';
  ctx.font = `bold ${fontSize}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(info.label, ball.x, ball.y);

  ctx.restore();
}

function renderParticles(ctx, particles) {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color || '#ffffff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function renderPopups(ctx, popups) {
  for (const p of popups) {
    if (p.life <= 0) continue;
    ctx.globalAlpha = Math.min(1, p.life * 2);
    if (p.isLight) {
      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚡' + p.text, p.x, p.y);
    } else if (p.isCrit) {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 15px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('✦ ' + p.text, p.x, p.y);
    } else {
      ctx.fillStyle = '#aaccff';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(p.text, p.x, p.y);
    }
  }
  ctx.globalAlpha = 1;
}
