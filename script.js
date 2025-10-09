(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const startOverlay = document.getElementById('startOverlay');
    const startBtn = document.getElementById('startBtn');
    const introVideoWrap = document.getElementById('introVideoWrap');
    const introVideo = document.getElementById('introVideo');
    const unmuteBtn = document.getElementById('unmuteBtn');
    const app = document.getElementById('app');

    // Start: button click -> play video immediately
    startBtn.addEventListener('click', async () => {
      startOverlay.style.display = 'none';
      introVideoWrap.classList.remove('hidden');
      introVideoWrap.setAttribute('aria-hidden','false');

      try {
        // Try with audio first (user gesture should allow)
        introVideo.muted = false;
        await introVideo.play();
      } catch {
        // Fall back to muted + unmute button
        try {
          introVideo.muted = true;
          await introVideo.play();
          unmuteBtn.classList.remove('hidden');
          unmuteBtn.addEventListener('click', () => {
            introVideo.muted = false;
            unmuteBtn.classList.add('hidden');
            introVideo.play().catch(()=>{});
          });
        } catch {
          // If video still fails, skip straight to app
          revealApp();
        }
      }

      // When video ends, reveal game
      introVideo.addEventListener('ended', () => revealApp(), { once: true });

      // Safety fallback: if nothing happens after 12s, reveal app
      setTimeout(() => {
        if (app.classList.contains('hidden')) revealApp();
      }, 12000);
    });

    function revealApp() {
      introVideo.pause();
      introVideoWrap.classList.add('fade-out');
      setTimeout(() => {
        introVideoWrap.style.display = 'none';
        app.classList.remove('hidden');
        app.classList.add('show');
        app.setAttribute('aria-hidden','false');
        setTimeout(initGame, 50);
      }, 500);
    }
  });

  /* ------------- Game logic (unchanged rules) ------------- */
  function initGame() {
    const PLAYER = '🎃';
    const DRACULA = '🦇';
    const CELLS = [...document.querySelectorAll('.cell')];
    const turnText = document.getElementById('turnText');
    const resultDlg = document.getElementById('resultDlg');
    const resultTitle = document.getElementById('resultTitle');
    const resultMsg = document.getElementById('resultMsg');
    const againBtn = document.getElementById('againBtn');

    const pWins = document.getElementById('wins');
    const pTies = document.getElementById('ties');
    const pLosses = document.getElementById('losses');
    const pDrawStreak = document.getElementById('drawStreak');
    const pbar = document.getElementById('pbar');

    const passDlg = document.getElementById('passDlg');
    const copyBtn = document.getElementById('copyBtn');
    const closePass = document.getElementById('closePass');
    const PASS = 'DRACULASDEBT';

    let board = Array(9).fill(null);
    let humanTurn = false;
    let gameOver = false;

    const DRAW_STREAK_MAX = 3;
    let drawStreak = 0;
    let playerStartsNextOnce = false;

    function resetBoard() {
      board = Array(9).fill(null);
      CELLS.forEach(c => { c.textContent=''; c.classList.remove('win'); c.disabled=false; });
      gameOver = false;

      if (playerStartsNextOnce) {
        humanTurn = true;
        playerStartsNextOnce = false;
        turnText.textContent = 'Your turn (🎃)';
      } else {
        humanTurn = false;
        turnText.textContent = 'Dracula thinking…';
        setTimeout(draculaMove, 300);
      }
    }

    const winningLines = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6]
    ];

    function checkWinner(b = board) {
      for (const [a,b2,c] of winningLines) {
        if (b[a] && b[a]===b[b2] && b[a]===b[c]) return { winner: b[a], line: [a,b2,c] };
      }
      if (b.every(x => x)) return { winner: 'tie' };
      return null;
    }

    function available(b) { return b.map((v,i)=>v?null:i).filter(i=>i!==null); }

    function minimax(b, isDracula, alpha=-Infinity, beta=Infinity, depth=0) {
      const res = checkWinner(b);
      if (res) {
        if (res.winner === DRACULA) return { score: 10 - depth, moves: [] };
        if (res.winner === PLAYER) return { score: depth - 10, moves: [] };
        return { score: 0, moves: [] };
      }
      let bestScore = isDracula ? -Infinity : Infinity;
      let bestMoves = [];
      for (const i of available(b)) {
        b[i] = isDracula ? DRACULA : PLAYER;
        const out = minimax(b, !isDracula, alpha, beta, depth+1);
        b[i] = null;
        const score = out.score;
        if (isDracula) {
          if (score > bestScore) { bestScore = score; bestMoves = [i]; }
          else if (score === bestScore) bestMoves.push(i);
          alpha = Math.max(alpha, score);
        } else {
          if (score < bestScore) { bestScore = score; bestMoves = [i]; }
          else if (score === bestScore) bestMoves.push(i);
          beta = Math.min(beta, score);
        }
        if (beta <= alpha) break;
      }
      return { score: bestScore, moves: bestMoves };
    }

    function draculaMove() {
      if (gameOver) return;
      if (board.every(x => x === null)) {
        const firstChoices = [0,2,4,6,8];
        const m = firstChoices[Math.floor(Math.random()*firstChoices.length)];
        place(m, DRACULA);
        return;
      }
      const { moves } = minimax([...board], true);
      const move = moves[Math.floor(Math.random()*moves.length)];
      if (move != null) place(move, DRACULA);
    }

    function place(idx, who) {
      if (board[idx] || gameOver) return;
      board[idx] = who;
      CELLS[idx].textContent = who;
      CELLS[idx].disabled = true;

      const result = checkWinner();
      if (result) endGame(result);
      else {
        humanTurn = !humanTurn;
        turnText.textContent = humanTurn ? 'Your turn (🎃)' : 'Dracula thinking…';
        if (!humanTurn) setTimeout(draculaMove, 300);
      }
    }

    function endGame(result) {
      gameOver = true;
      if (result.winner === 'tie') {
        pTies.textContent = (+pTies.textContent)+1;
        drawStreak += 1;
        pDrawStreak.textContent = drawStreak;
        pbar.style.width = Math.min(100, (drawStreak/DRAW_STREAK_MAX)*100) + '%';

        if (drawStreak >= DRAW_STREAK_MAX) {
          playerStartsNextOnce = true;
          drawStreak = 0;
          pDrawStreak.textContent = drawStreak;
          pbar.style.width = '0%';
          showResult('It\'s a draw.', 'Three stalemates! Dracula yields the first move next round.');
        } else {
          showResult('It\'s a draw.', 'Another stalemate. Keep going…');
        }
      } else if (result.winner === PLAYER) {
        pWins.textContent = (+pWins.textContent)+1;
        highlight(result.line);
        document.getElementById('code').textContent = PASS;
        passDlg.showModal();
        showResult('You win! 🎃', 'You bested Dracula!');
      } else {
        pLosses.textContent = (+pLosses.textContent)+1;
        highlight(result.line);
        drawStreak = 0;
        pDrawStreak.textContent = drawStreak;
        pbar.style.width = '0%';
        showResult('Defeated…', 'Dracula claims this one. Try again!');
      }
    }

    function highlight(line) { if (!line) return; for (const i of line) CELLS[i].classList.add('win'); }
    function showResult(title, msg) { resultTitle.textContent = title; resultMsg.textContent = msg; resultDlg.showModal(); }

    againBtn.addEventListener('click', () => { resultDlg.close(); resetBoard(); });

    CELLS.forEach(btn => btn.addEventListener('click', () => {
      if (!humanTurn) return;
      place(+btn.dataset.idx, PLAYER);
    }));

    copyBtn.addEventListener('click', async () => {
      try{ await navigator.clipboard.writeText(PASS); copyBtn.textContent='Copied!'; setTimeout(()=>copyBtn.textContent='Copy code',1000);}catch{}
    });
    closePass.addEventListener('click', ()=> passDlg.close());

    resetBoard();
  }
})();