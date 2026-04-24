class Tutorial {
  constructor(game) {
    this.game = game;
    this.step = 0;
    this.active = false;
    this.completed = false;
    this._tooltip = null;
  }

  start() {
    if (localStorage.getItem('bounceNumbers_tutorialDone') === '1') {
      this.completed = true;
      return;
    }
    this.active = true;
    this._tooltip = document.getElementById('tutorial-tooltip');
    this._showStep(0);
  }

  _showStep(stepIdx) {
    this.step = stepIdx;
    const steps = this._getSteps();
    if (stepIdx >= steps.length) { this.complete(); return; }
    const s = steps[stepIdx];
    const tooltip = this._tooltip;
    tooltip.style.display = 'block';
    document.getElementById('tutorial-text').textContent = s.text;
    document.getElementById('tutorial-title').textContent = `Step ${stepIdx + 1}/${steps.length}: ${s.title}`;

    document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));

    const target = document.querySelector(s.target);
    if (target) {
      const rect = target.getBoundingClientRect();
      tooltip.style.top = (rect.bottom + 8) + 'px';
      tooltip.style.left = Math.max(8, rect.left - 20) + 'px';
      target.classList.add('tutorial-highlight');
    }
  }

  _getSteps() {
    return [
      { title: 'Add Your First Number', text: 'Click the Add 1 button (or press A) to spawn a bouncing number!', target: '#btn-add' },
      { title: 'Numbers Make Money', text: 'Watch! When numbers hit the walls, you earn money. The bigger the number, the more you earn!', target: '#money-display' },
      { title: 'Merge Numbers', text: 'Click Merge (or press M) to combine two matching numbers into a bigger one! Hold for rapid merging.', target: '#btn-merge' },
      { title: 'Chase Lightspeed', text: 'When numbers go too fast, they explode into Light Fragments ⚡ — a permanent currency for upgrades!', target: '#frags-display' },
      { title: 'Fill the Arena!', text: 'Fill the arena with numbers to unlock Prestige — reset for permanent bonuses and Prime Shards!', target: '#btn-prestige' },
    ];
  }

  check(state) {
    if (!this.active || this.completed) return;
    if (this.step === 0 && state.numbersAdded >= 1) this._advance();
    else if (this.step === 1 && state.lifetimeMoney && state.lifetimeMoney.gte(1)) this._advance();
    else if (this.step === 2 && state.highestTier >= 1) this._advance();
    else if (this.step === 3 && state.lightFragments && state.lightFragments.gte(1)) this._advance();
    else if (this.step === 4 && state.prestigeAvailable) this._advance();
  }

  _advance() {
    this._showStep(this.step + 1);
  }

  complete() {
    this.active = false;
    this.completed = true;
    localStorage.setItem('bounceNumbers_tutorialDone', '1');
    if (this._tooltip) this._tooltip.style.display = 'none';
    const notif = document.getElementById('tutorial-complete-notif');
    if (notif) {
      notif.style.display = 'block';
      setTimeout(() => notif.style.display = 'none', 3000);
    }
  }

  skip() {
    this.complete();
  }
}

window.Tutorial = Tutorial;
