(() => {
  const PLAYER = '🎃';
  const CPU = '🦇';
  const cells = [...document.querySelectorAll('.cell')];
  const newGameBtn = document.getElementById('newGame');
  const turnText = document.getElementById('turnText');
  const resultDlg = document.getElementById('resultDlg');
  const resultTitle = document.getElementById('resultTitle');
  const resultMsg = document.getElementById('resultMsg');
  const againBtn = document.getElementById('againBtn');

  const pWins = document.getElementById('wins');
  const pTies = document.getElementById('ties');
  const pLosses = document.getElementById('losses');
  const pStreak = document.getElementById('streak');
  const pbar = document.getElementById('pbar');

  const passDlg = document.getElementById('passDlg');
  const copyBtn = document.getElementById('copyBtn');
  const closePass = document.getElementById('closePass');
  const PASS = 'DRACULASDEBT';
  const NEED_STREAK = 3;

  let board = Array(9).fill(null);
  let humanTurn = false; // CPU goes first
  let gameOver = false;

  function resetBoard() {
    board = Array(9).fill(null);
    cells.forEach(c => { c.textContent=''; c.classList.remove('win'); c.disabled=false; });
    gameOver = false;
    humanTurn = false; // CPU starts every game
    turnText.textContent = 'CPU thinking…';
    setTimeout(cpuMove, 300);
  }

  function lines() {
    return [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6]
    ];
  }

  function checkWinner(b = board) {
    for (const [a,b2,c] of lines()) {
      if (b[a] && b[a]===b[b2] && b[a]===b[c]) return { winner: b[a], line: [a,b2,c] };
    }
    if (b.every(x => x)) return { winner: 'tie' };
    return null;
  }

  function available(b) {
    const arr = [];
    for (let i=0;i<9;i++) if (!b[i]) arr.push(i);
    return arr;
  }

  // Perfect CPU: minimax + alpha-beta
  function minimax(b, isCpu, alpha=-Infinity, beta=Infinity, depth=0) {
    const res = checkWinner(b);
    if (res) {
      if (res.winner === CPU) return { score: 10 - depth };
      if (res.winner === PLAYER) return { score: depth - 10 };
      return { score: 0 };
    }
    let bestMove = -1;
    if (isCpu) {
      let bestScore = -Infinity;
      for (const i of available(b)) {
        b[i] = CPU;
        const { score } = minimax(b, false, alpha, beta, depth+1);
        b[i] = null;
        if (score > bestScore) { bestScore = score; bestMove = i; }
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break;
      }
      return { score: bestScore, move: bestMove };
    } else {
      let bestScore = Infinity;
      for (const i of available(b)) {
        b[i] = PLAYER;
        const { score } = minimax(b, true, alpha, beta, depth+1);
        b[i] = null;
        if (score < bestScore) { bestScore = score; bestMove = i; }
        beta = Math.min(beta, score);
        if (beta <= alpha) break;
      }
      return { score: bestScore, move: bestMove };
    }
  }

  function cpuMove() {
    if (gameOver) return;
    const { move } = minimax([...board], true);
    if (move != null) place(move, CPU);
  }

  function place(idx, who) {
    if (board[idx] || gameOver) return;
    board[idx] = who;
    cells[idx].textContent = who;
    cells[idx].disabled = true;

    const result = checkWinner();
    if (result) endGame(result);
    else {
      humanTurn = !humanTurn;
      turnText.textContent = humanTurn ? 'Your turn (🎃)' : 'CPU thinking…';
      if (!humanTurn) setTimeout(cpuMove, 250);
    }
  }

  function endGame(result) {
    gameOver = true;
    if (result.winner === 'tie') {
      pTies.textContent = (+pTies.textContent)+1;
      incrementStreak();
      showResult('It\'s a draw.', 'You held off the 🦇! Draws count toward your streak.');
    } else if (result.winner === PLAYER) {
      pWins.textContent = (+pWins.textContent)+1;
      highlight(result.line);
      incrementStreak();
      showResult('You win! 🎃', 'Well played. The 🦇 started first and still fell.');
    } else {
      pLosses.textContent = (+pLosses.textContent)+1;
      highlight(result.line);
      resetStreak();
      showResult('You lost…', 'This CPU is ruthless. Try again!');
    }
  }

  function highlight(line) { if (!line) return; for (const i of line) cells[i].classList.add('win'); }

  function showResult(title, msg) {
    resultTitle.textContent = title;
    resultMsg.textContent = msg;
    resultDlg.showModal();
  }

  againBtn.addEventListener('click', () => { resultDlg.close(); resetBoard(); });
  newGameBtn.addEventListener('click', resetBoard);

  cells.forEach(btn => {
    btn.addEventListener('click', () => {
      if (!humanTurn) return;
      place(+btn.dataset.idx, PLAYER);
    });
  });

  function incrementStreak() {
    const s = (+pStreak.textContent)+1;
    pStreak.textContent = s;
    pbar.style.width = Math.min(100, (s/NEED_STREAK)*100) + '%';
    if (s >= NEED_STREAK) {
      document.getElementById('code').textContent = PASS;
      passDlg.showModal();
    }
  }
  function resetStreak() { pStreak.textContent = 0; pbar.style.width = '0%'; }

  copyBtn.addEventListener('click', async () => {
    try{ await navigator.clipboard.writeText(PASS); copyBtn.textContent='Copied!'; setTimeout(()=>copyBtn.textContent='Copy code',1000);}catch{}
  });
  closePass.addEventListener('click', ()=> passDlg.close());

  // init (CPU opens)
  resetBoard();
})();