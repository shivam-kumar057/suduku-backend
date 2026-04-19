const GRID_SIZE = 9;
const BOX_SIZE = 3;
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const DIFFICULTY_BLANKS = {
  easy: 38,
  medium: 46,
  hard: 54,
};

function cloneGrid(grid) {
  return grid.map(row => [...row]);
}

function isValidPlacement(grid, row, col, value) {
  for (let i = 0; i < GRID_SIZE; i += 1) {
    if (grid[row][i] === value && i !== col) return false;
    if (grid[i][col] === value && i !== row) return false;
  }

  const boxRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
  const boxCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;

  for (let r = boxRow; r < boxRow + BOX_SIZE; r += 1) {
    for (let c = boxCol; c < boxCol + BOX_SIZE; c += 1) {
      if (grid[r][c] === value && (r !== row || c !== col)) return false;
    }
  }

  return true;
}

function findEmpty(grid) {
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      if (grid[row][col] === 0) return { row, col };
    }
  }
  return null;
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function solveGrid(grid) {
  const empty = findEmpty(grid);
  if (!empty) return true;

  const { row, col } = empty;
  const trial = shuffle(DIGITS);
  for (const val of trial) {
    if (!isValidPlacement(grid, row, col, val)) continue;
    grid[row][col] = val;
    if (solveGrid(grid)) return true;
    grid[row][col] = 0;
  }
  return false;
}

function countSolutions(grid, limit = 2) {
  const board = cloneGrid(grid);
  let solutions = 0;

  function search() {
    if (solutions >= limit) return;
    const empty = findEmpty(board);
    if (!empty) {
      solutions += 1;
      return;
    }
    const { row, col } = empty;
    for (const val of DIGITS) {
      if (!isValidPlacement(board, row, col, val)) continue;
      board[row][col] = val;
      search();
      board[row][col] = 0;
    }
  }

  search();
  return solutions;
}

function generateSolvedGrid() {
  const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
  solveGrid(grid);
  return grid;
}

function removeClues(solution, difficulty) {
  const puzzle = cloneGrid(solution);
  const blanks = DIFFICULTY_BLANKS[difficulty] ?? DIFFICULTY_BLANKS.medium;
  const positions = shuffle(Array.from({ length: 81 }, (_, i) => i));
  let removed = 0;

  for (const pos of positions) {
    if (removed >= blanks) break;
    const row = Math.floor(pos / 9);
    const col = pos % 9;
    const old = puzzle[row][col];
    if (!old) continue;
    puzzle[row][col] = 0;

    if (countSolutions(puzzle, 2) !== 1) {
      puzzle[row][col] = old;
      continue;
    }
    removed += 1;
  }

  return puzzle;
}

function generateSudoku(difficulty = 'medium') {
  const solution = generateSolvedGrid();
  const puzzle = removeClues(solution, difficulty);
  return { puzzle, solution };
}

function isValidSubmittedGrid(submittedGrid, solutionGrid) {
  if (!Array.isArray(submittedGrid) || submittedGrid.length !== 9) return false;
  for (let row = 0; row < 9; row += 1) {
    if (!Array.isArray(submittedGrid[row]) || submittedGrid[row].length !== 9) return false;
    for (let col = 0; col < 9; col += 1) {
      if (submittedGrid[row][col] !== solutionGrid[row][col]) return false;
    }
  }
  return true;
}

module.exports = {
  generateSudoku,
  isValidSubmittedGrid,
};

