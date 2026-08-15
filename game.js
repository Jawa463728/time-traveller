(() => {
  const rounds = window.TIME_TRAVELLER_ROUNDS || [];
  const app = document.getElementById('app');
  const homeBtn = document.getElementById('homeBtn');
  const statsBtn = document.getElementById('statsBtn');
  const toast = document.getElementById('toast');
  const canvas = document.getElementById('confettiCanvas');
  const ctx = canvas.getContext('2d');

  const scoreTable = [10000, 8200, 6700, 5400, 4300, 3400, 2600, 1900, 1200, 600];
  const eraLabels = {
    'medieval': 'Medieval',
    'early-modern': 'Early Modern',
    'industrial': 'Industrial & Imperial',
    'twentieth': '20th Century',
    'modern': 'Modern'
  };

  const state = {
    mode: 'random',
    era: null,
    round: null,
    clueIndex: 0,
    guesses: [],
    startedAt: 0,
    completed: false
  };

  function getStats() {
    return JSON.parse(localStorage.getItem('tt_stats') || '{"played":0,"won":0,"best":0,"totalClues":0,"exact":0}');
  }
  function saveStats(stats) { localStorage.setItem('tt_stats', JSON.stringify(stats)); }
  function getSeen() { return JSON.parse(localStorage.getItem('tt_seen') || '[]'); }
  function saveSeen(ids) { localStorage.setItem('tt_seen', JSON.stringify(ids.slice(-100))); }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(showToast.t);
    showToast.t = setTimeout(() => toast.classList.remove('show'), 1800);
  }

  function decadeOf(year) { return Math.floor(year / 10) * 10; }
  function decadeLabel(year) { return `${decadeOf(year)}s`; }
  function isCorrectDecade(guess, target) { return decadeOf(guess) === decadeOf(target); }

  function feedbackFor(guess, target) {
    const d = Math.abs(decadeOf(guess) - decadeOf(target)) / 10;
    if (d <= 1) return { label: 'VERY HOT', cls: 'hot' };
    if (d <= 3) return { label: 'WARM', cls: 'warm' };
    return { label: 'COLD', cls: 'cold' };
  }

  function pickRound(filterEra = null) {
    let pool = rounds.filter(r => !filterEra || r.era === filterEra);
    const seen = new Set(getSeen());
    const unseen = pool.filter(r => !seen.has(r.id));
    if (unseen.length) pool = unseen;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function renderHome() {
    homeBtn.classList.add('hidden');
    statsBtn.classList.remove('hidden');
    app.innerHTML = `
      <section class="screen">
        <div class="hero">
          <div class="kicker">PINPOINT THE DECADE</div>
          <div class="hero-title">When are you?</div>
          <p class="hero-copy">You have ten clues. Guess a year after each one. Land anywhere in the correct decade and you've found your place in history.</p>
        </div>

        <div class="primary-card">
          <div class="mode-label">MAIN MODE</div>
          <div class="big-mode">Unlimited Journey</div>
          <p class="subtle">A random destination from medieval history to the modern day.</p>
          <div class="button-row"><button class="btn btn-primary" data-action="play-random">Play now</button></div>
        </div>

        <div class="mode-grid">
          ${Object.entries(eraLabels).map(([k,v]) => `<button class="mode-tile" data-era="${k}"><strong>${v}</strong><span>${eraDescription(k)}</span></button>`).join('')}
        </div>
      </section>`;

    app.querySelector('[data-action="play-random"]').onclick = () => startGame();
    app.querySelectorAll('[data-era]').forEach(btn => btn.onclick = () => startGame(btn.dataset.era));
  }

  function eraDescription(era) {
    return {
      'medieval': 'Kingdoms, crusades, plague and conquest.',
      'early-modern': 'Reformation, exploration and civil war.',
      'industrial': 'Revolution, empire and invention.',
      'twentieth': 'Wars, culture, politics and technology.',
      'modern': 'The internet age and recent history.'
    }[era];
  }

  function startGame(era = null) {
    state.era = era;
    state.round = pickRound(era);
    state.clueIndex = 0;
    state.guesses = [];
    state.startedAt = Date.now();
    state.completed = false;
    homeBtn.classList.remove('hidden');
    renderGame();
  }

  function renderGame() {
    const r = state.round;
    const currentScore = scoreTable[state.clueIndex];
    app.innerHTML = `
      <section class="screen">
        <div class="game-meta">
          <span>${state.era ? eraLabels[state.era] : 'Unlimited Journey'}</span>
          <span>Clue ${state.clueIndex + 1} of 10</span>
        </div>
        <div class="progress"><span style="width:${((state.clueIndex + 1)/10)*100}%"></span></div>

        <div class="clue-stack">
          ${r.clues.slice(0, state.clueIndex + 1).map((clue, i) => `
            <article class="clue-card ${i === state.clueIndex ? 'current' : ''}">
              <div class="clue-index">CLUE ${i + 1}</div>
              <div class="clue-text">${clue}</div>
            </article>`).join('')}
        </div>

        <section class="panel guess-panel">
          <div class="guess-heading">
            <h2>What year is it?</h2>
            <span class="score-chip">Up to ${currentScore.toLocaleString()} pts</span>
          </div>
          <div class="year-input-wrap">
            <input id="yearInput" class="year-input" inputmode="numeric" pattern="[0-9]*" maxlength="4" placeholder="e.g. 1458" aria-label="Guess a year" />
            <button id="submitGuess" class="btn btn-accent submit-btn">Guess</button>
          </div>
          ${state.guesses.length ? `<div class="guesses">${state.guesses.map(g => `<div class="guess-row"><span>${g.year}</span><span class="feedback ${g.feedback.cls}">${g.feedback.label}</span></div>`).join('')}</div>` : ''}
        </section>
      </section>`;

    const input = document.getElementById('yearInput');
    const submit = document.getElementById('submitGuess');
    setTimeout(() => input.focus({preventScroll:true}), 50);
    submit.onclick = () => handleGuess(input.value);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') handleGuess(input.value); });
  }

  function handleGuess(raw) {
    const guess = Number(String(raw).trim());
    if (!Number.isInteger(guess) || guess < 1000 || guess > 2029) {
      showToast('Enter a year between 1000 and 2029');
      return;
    }

    if (isCorrectDecade(guess, state.round.year)) {
      finishGame(true, guess);
      return;
    }

    const fb = feedbackFor(guess, state.round.year);
    state.guesses.push({ year: guess, feedback: fb });

    if (state.clueIndex >= 9) {
      finishGame(false, guess);
    } else {
      state.clueIndex += 1;
      renderGame();
      showToast(`${fb.label} — next clue revealed`);
    }
  }

  function finishGame(won, lastGuess) {
    state.completed = true;
    const elapsed = Math.max(1, Math.round((Date.now() - state.startedAt) / 1000));
    const base = scoreTable[state.clueIndex];
    const exactBonus = won && lastGuess === state.round.year ? 750 : 0;
    const speedBonus = won ? Math.max(0, 600 - elapsed * 4) : 0;
    const score = won ? base + exactBonus + speedBonus : 0;

    const stats = getStats();
    stats.played += 1;
    if (won) {
      stats.won += 1;
      stats.totalClues += state.clueIndex + 1;
      stats.best = Math.max(stats.best, score);
      if (lastGuess === state.round.year) stats.exact += 1;
    }
    saveStats(stats);

    const seen = getSeen();
    seen.push(state.round.id);
    saveSeen(seen);

    renderResult(won, lastGuess, score, elapsed, exactBonus > 0);
    if (won) launchConfetti(state.clueIndex <= 1 ? 170 : 110);
  }

  function renderResult(won, guess, score, elapsed, exact) {
    const r = state.round;
    app.innerHTML = `
      <section class="screen">
        <div class="panel result-card">
          <div class="result-badge">${won ? 'TEMPORAL LOCK' : 'OUT OF TIME'}</div>
          <div class="result-decade">${decadeLabel(r.year)}</div>
          <div class="result-title">${won ? 'You found the decade.' : 'The correct decade was missed.'}</div>
          <p class="subtle">Target year: <strong>${r.year}</strong>${exact ? ' · Exact year bonus!' : ''}</p>

          <div class="result-grid">
            <div class="stat-box"><strong>${won ? score.toLocaleString() : '0'}</strong><span>score</span></div>
            <div class="stat-box"><strong>${state.clueIndex + 1}/10</strong><span>clues</span></div>
            <div class="stat-box"><strong>${elapsed}s</strong><span>time</span></div>
          </div>

          <div class="explainer">
            <h3>${r.title}</h3>
            <p>${r.summary}</p>
          </div>

          <div class="button-row">
            <button id="playAgain" class="btn btn-primary">Travel again</button>
            <button id="goHome" class="btn btn-secondary">Back to home</button>
          </div>
        </div>
      </section>`;

    document.getElementById('playAgain').onclick = () => startGame(state.era);
    document.getElementById('goHome').onclick = renderHome;
  }

  function renderStats() {
    const s = getStats();
    const avg = s.won ? (s.totalClues / s.won).toFixed(1) : '—';
    homeBtn.classList.remove('hidden');
    app.innerHTML = `
      <section class="screen">
        <div class="hero">
          <div class="kicker">YOUR RECORD</div>
          <div class="hero-title">Stats</div>
          <p class="hero-copy">Stored only on this device for now.</p>
        </div>
        <div class="stats-grid">
          <div class="panel stats-card"><strong>${s.played}</strong><span>journeys played</span></div>
          <div class="panel stats-card"><strong>${s.won}</strong><span>decades found</span></div>
          <div class="panel stats-card"><strong>${avg}</strong><span>average clues</span></div>
          <div class="panel stats-card"><strong>${s.best.toLocaleString()}</strong><span>best score</span></div>
          <div class="panel stats-card"><strong>${s.exact}</strong><span>exact years</span></div>
          <div class="panel stats-card"><strong>${s.played ? Math.round((s.won/s.played)*100) : 0}%</strong><span>success rate</span></div>
        </div>
      </section>`;
  }

  function launchConfetti(count = 120) {
    resizeCanvas();
    const pieces = Array.from({ length: count }, () => ({
      x: canvas.width * (0.25 + Math.random() * 0.5),
      y: canvas.height * 0.18,
      vx: (Math.random() - 0.5) * 10,
      vy: -4 - Math.random() * 7,
      g: 0.18 + Math.random() * 0.12,
      s: 5 + Math.random() * 7,
      r: Math.random() * Math.PI,
      vr: (Math.random() - .5) * .28,
      life: 90 + Math.random() * 50,
      hue: Math.floor(Math.random() * 360)
    }));

    let frame = 0;
    function tick() {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      pieces.forEach(p => {
        p.x += p.vx; p.vy += p.g; p.y += p.vy; p.r += p.vr; p.life -= 1;
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.r);
        ctx.fillStyle = `hsl(${p.hue} 70% 52%)`;
        ctx.fillRect(-p.s/2,-p.s/2,p.s,p.s*.6);
        ctx.restore();
      });
      frame++;
      if (frame < 150 && pieces.some(p => p.life > 0 && p.y < canvas.height + 40)) requestAnimationFrame(tick);
      else ctx.clearRect(0,0,canvas.width,canvas.height);
    }
    requestAnimationFrame(tick);
  }

  function resizeCanvas() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    canvas.width = innerWidth;
    canvas.height = innerHeight;
  }

  homeBtn.onclick = renderHome;
  statsBtn.onclick = renderStats;
  window.addEventListener('resize', resizeCanvas);

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(()=>{});
  renderHome();
})();
