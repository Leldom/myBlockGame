const BOARD_SIZE = 8;
const boardEl = document.getElementById('game-board');
const spawnEl = document.getElementById('spawn-area');
const scoreEl = document.getElementById('score-board');
const comboEl = document.getElementById('combo-display');

let grid = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(0));
let score = 0;

function initBoard() {
    boardEl.innerHTML = '';
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            let cell = document.createElement('div');
            cell.classList.add('cell');
            cell.id = `cell-${r}-${c}`;
            boardEl.appendChild(cell);
        }
    }
}

const SHAPES = [
    [[1]], 
    [[1,1]], [[1],[1]], 
    [[1,1,1]], [[1],[1],[1]], 
    [[1,1,1,1]], [[1],[1],[1],[1]], 
    [[1,1,1,1,1]], [[1],[1],[1],[1],[1]], 
    [[1,1],[1,1]], 
    [[1,1,1],[1,1,1],[1,1,1]], 
    [[1,0],[1,0],[1,1]], [[0,1],[0,1],[1,1]], 
    [[1,1],[1,0],[1,0]], [[1,1],[0,1],[0,1]], 
    [[1,0,0],[1,1,1]], [[0,0,1],[1,1,1]], 
    [[1,1,1],[0,1,0]], [[0,1,0],[1,1,1]], 
    [[0,1],[1,1],[0,1]], [[1,0],[1,1],[1,0]], 
    [[1,1,0],[0,1,1]], [[0,1,1],[1,1,0]], 
    [[0,1],[1,1],[1,0]], [[1,0],[1,1],[0,1]], 
];

function createShapeElement(matrix, colorId) {
    const shapeDiv = document.createElement('div');
    shapeDiv.classList.add('shape');
    shapeDiv.style.gridTemplateColumns = `repeat(${matrix[0].length}, 20px)`;
    
    shapeDiv.dataset.colorId = colorId;
    shapeDiv.dataset.matrix = JSON.stringify(matrix);

    matrix.forEach((row) => {
        row.forEach((val) => {
            const block = document.createElement('div');
            if (val === 1) {
                block.classList.add('shape-block');
                block.classList.add(`c-${colorId}`);
            }
            shapeDiv.appendChild(block);
        });
    });
    return shapeDiv;
}

function spawnShapes() {
    spawnEl.innerHTML = '';
    for(let i=0; i<3; i++) {
        const container = document.createElement('div');
        container.classList.add('shape-container');
        
        const randomShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        const randomColor = Math.floor(Math.random() * 7) + 1; 
        
        const shapeEl = createShapeElement(randomShape, randomColor);
        addDragLogic(shapeEl);
        container.appendChild(shapeEl);
        spawnEl.appendChild(container);
    }
}

function clearPreview() {
    document.querySelectorAll('.cell.preview').forEach(el => {
        el.classList.remove('preview');
        // Klassen zurücksetzen (entfernt c-1, c-2 etc. von der Preview)
        el.className = 'cell';
        
        // Wenn Zelle gefüllt ist, Farbe wiederherstellen
        const [_, r, c] = el.id.split('-');
        const val = grid[r][c];
        if(val > 0) el.classList.add(`c-${val}`);
        else if (document.querySelector('.clearing') && el.classList.contains('clearing')) {
                el.classList.add('clearing'); // Animation beibehalten
        }
    });
}

function showPreview(matrix, r, c, colorId) {
    clearPreview();
    if (!canPlace(matrix, r, c)) return;

    for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < matrix[i].length; j++) {
            if (matrix[i][j] === 1) {
                const cell = document.getElementById(`cell-${r+i}-${c+j}`);
                if (cell) {
                    cell.classList.add('preview');
                    cell.classList.add(`c-${colorId}`);
                }
            }
        }
    }
}

const DRAG_OFFSET_Y = 100; 

function getGridCoords(x, y, shapeEl) {
    const boardRect = boardEl.getBoundingClientRect();
    const targetX = x;
    const targetY = y - DRAG_OFFSET_Y;

    if (targetX > boardRect.left && targetX < boardRect.right && 
        targetY > boardRect.top && targetY < boardRect.bottom) {
        
        const cellSize = boardRect.width / BOARD_SIZE;
        const cols = parseInt(shapeEl.dataset.cols || 1);
        const rows = parseInt(shapeEl.dataset.rows || 1);

        const col = Math.floor((targetX - boardRect.left) / cellSize - (cols - 1) / 2); 
        const row = Math.floor((targetY - boardRect.top) / cellSize - (rows - 1) / 2);
        
        return { r: row, c: col, valid: true };
    }
    return { r: 0, c: 0, valid: false };
}

function addDragLogic(el) {
    let clone;
    const matrix = JSON.parse(el.dataset.matrix);
    const colorId = el.dataset.colorId;
    
    el.dataset.rows = matrix.length;
    el.dataset.cols = matrix[0].length;

    const touchStart = (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const boardRect = boardEl.getBoundingClientRect();
        const gridCellSize = boardRect.width / BOARD_SIZE;
        const scaleFactor = gridCellSize / 20;

        clone = el.cloneNode(true);
        clone.classList.add('dragging');
        clone.style.width = el.offsetWidth + 'px'; 
        document.body.appendChild(clone);
        
        const moveAt = (pageX, pageY) => {
            clone.style.left = (pageX - el.offsetWidth / 2) + 'px';
            clone.style.top = (pageY - el.offsetHeight / 2 - DRAG_OFFSET_Y) + 'px';
            clone.style.transform = `scale(${scaleFactor})`;
        };
        
        moveAt(touch.pageX, touch.pageY);
        el.style.opacity = '0';

        const touchMove = (e) => {
            const t = e.touches[0];
            moveAt(t.pageX, t.pageY);
            const coords = getGridCoords(t.clientX, t.clientY, clone);
            if (coords.valid) {
                showPreview(matrix, coords.r, coords.c, colorId);
            } else {
                clearPreview();
            }
        };

        const touchEnd = (e) => {
            document.removeEventListener('touchmove', touchMove);
            document.removeEventListener('touchend', touchEnd);
            clearPreview();
            
            const t = e.changedTouches[0];
            const coords = getGridCoords(t.clientX, t.clientY, clone);

            if (coords.valid && canPlace(matrix, coords.r, coords.c)) {
                placeShape(matrix, coords.r, coords.c, colorId);
                clone.remove();
                el.parentNode.innerHTML = ''; 
                updateBoardVisuals(); 
                setTimeout(() => checkLinesAndSpawn(), 50);
            } else {
                clone.remove();
                el.style.opacity = '1';
            }
        };
        document.addEventListener('touchmove', touchMove, {passive: false});
        document.addEventListener('touchend', touchEnd);
    };
    el.addEventListener('touchstart', touchStart, {passive: false});
}

function canPlace(matrix, r, c) {
    for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < matrix[i].length; j++) {
            if (matrix[i][j] === 1) {
                let targetR = r + i;
                let targetC = c + j;
                if (targetR < 0 || targetR >= BOARD_SIZE || targetC < 0 || targetC >= BOARD_SIZE) return false;
                if (grid[targetR][targetC] !== 0) return false;
            }
        }
    }
    return true;
}

function placeShape(matrix, r, c, colorId) {
    score += 10;
    for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < matrix[i].length; j++) {
            if (matrix[i][j] === 1) {
                grid[r + i][c + j] = parseInt(colorId);
            }
        }
    }
}

function updateBoardVisuals() {
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const cell = document.getElementById(`cell-${r}-${c}`);
            const val = grid[r][c];
            
            // Sauberes Reset der Klassen
            // 1. Basis-Klasse
            let newClasses = 'cell';
            
            // 2. Clearing Status erhalten
            if(cell.classList.contains('clearing')) {
                newClasses += ' clearing';
            }

            // 3. Farbe hinzufügen, wenn gefüllt
            if (val > 0) {
                newClasses += ` c-${val}`;
            }
            
            cell.className = newClasses;
        }
    }
    scoreEl.innerText = `Score: ${score}`;
}

function checkLinesAndSpawn() {
    let cellsToClear = []; 
    let linesCleared = 0;

    for(let r=0; r<BOARD_SIZE; r++) {
        if(grid[r].every(val => val !== 0)) {
            linesCleared++;
            for(let c=0; c<BOARD_SIZE; c++) cellsToClear.push({r, c});
        }
    }
    for(let c=0; c<BOARD_SIZE; c++) {
        let full = true;
        for(let r=0; r<BOARD_SIZE; r++) if(grid[r][c] === 0) full = false;
        if(full) {
            linesCleared++;
            for(let r=0; r<BOARD_SIZE; r++) cellsToClear.push({r, c});
        }
    }

    if (cellsToClear.length > 0) {
        const uniqueCells = [];
        const map = new Map();
        for (const item of cellsToClear) {
            const key = `${item.r}-${item.c}`;
            if(!map.has(key)){
                map.set(key, true);
                uniqueCells.push(item);
            }
        }

        let points = 0;
        let isCombo = false;

        if (linesCleared === 1) points = 100;
        else if (linesCleared === 2) points = 300;
        else if (linesCleared >= 3) { 
            points = 600 * linesCleared; 
            isCombo = true; 
        }

        if (isCombo) {
            document.body.classList.add('combo-mode');
            comboEl.innerText = `${linesCleared}x COMBO!`;
            comboEl.style.opacity = '1';
            comboEl.style.transform = 'scale(1.5)';
        } else {
            document.body.classList.remove('combo-mode');
            comboEl.style.opacity = '0';
            comboEl.style.transform = 'scale(1)';
        }

        score += points;

        uniqueCells.forEach(obj => {
            const cell = document.getElementById(`cell-${obj.r}-${obj.c}`);
            cell.classList.add('clearing');
        });

        setTimeout(() => {
            uniqueCells.forEach(obj => {
                grid[obj.r][obj.c] = 0;
                const cell = document.getElementById(`cell-${obj.r}-${obj.c}`);
                cell.className = 'cell';
            });
            
            if(isCombo) {
                setTimeout(() => {
                    comboEl.style.opacity = '0';
                    comboEl.style.transform = 'scale(1)';
                    document.body.classList.remove('combo-mode');
                }, 1500);
            }

            updateBoardVisuals();
            checkSpawnRefill();
        }, 500); 

    } else {
        checkSpawnRefill();
    }
}

function checkSpawnRefill() {
    const shapes = Array.from(spawnEl.querySelectorAll('.shape'));
    if(shapes.length === 0) {
        spawnShapes();
    }
    setTimeout(() => {
        checkGameOver();
    }, 250);
}

function checkGameOver() {
    const shapes = Array.from(spawnEl.querySelectorAll('.shape'));
    if (shapes.length === 0) return;

    let movePossible = false;
    for (let s = 0; s < shapes.length; s++) {
        const shapeEl = shapes[s];
        const matrix = JSON.parse(shapeEl.dataset.matrix);
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (canPlace(matrix, r, c)) {
                    movePossible = true;
                    break; 
                }
            }
            if (movePossible) break;
        }
        if (movePossible) break;
    }

    if (!movePossible) {
        document.getElementById('final-score').innerText = 'Score: ' + score;
        document.getElementById('game-over-overlay').classList.remove('hidden');
    }
}

function resetGame() {
    score = 0;
    grid = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(0));
    updateBoardVisuals();
    document.getElementById('game-over-overlay').classList.add('hidden');
    spawnShapes();
}

initBoard();
spawnShapes();