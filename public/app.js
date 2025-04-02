// Grid dimensions
const GRID_SIZE = 2;
const NUM_GRIDS = 1;
const MAX_TOTAL_COINS = 1;

// Noise parameters
const NOISE_OFFSET = 0.5;

// Track total coins and points
let totalCoins = 0;
let topCoins = 0;
let sidePoints = 0;
let topPoints = 0;
let matchCount = 0; // Add match counter

// Track highlight mode
let highlightMode = 'columns'; // 'rows' or 'columns'
let aiGrid = null;
let equilibria = null;

// Create cells for each grid
async function createGrid(gridId, noiseData, aiNoiseData) {
    const grid = document.getElementById(gridId);
    grid.style.width = '200px';
    grid.style.height = '200px';
    
    for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
            const cell = document.createElement('div');
            cell.className = gridId === 'grid2' ? 'cell2' : 'cell';
            cell.dataset.index = i * GRID_SIZE + j;
            cell.dataset.row = i;
            cell.dataset.col = j;
            
            // Get noise value from the data
            const noiseValue = noiseData[i][j];
            cell.dataset.value = Math.floor(5*(noiseValue + 1));
            const aiNoiseValue = aiNoiseData[i][j];
            cell.dataset.aiValue = Math.floor(5*(aiNoiseValue + 1));
            
            // Convert noise value to color (using HSL for smooth transitions)
            const hue = (noiseValue + 1) * 180; // Map from [-1,1] to [0,360]
            cell.style.backgroundColor = `hsl(${hue}, 70%, 50%)`;
            
            if (gridId === 'grid2') {
                // Add click event for color adjustment
                cell.addEventListener('click', () => {
                    // Remove selection from other cells
                    document.querySelectorAll('.cell2.selected').forEach(c => c.classList.remove('selected'));
                    cell.classList.add('selected');
                    
                    // Show color controls
                    const colorControls = document.getElementById('color-controls');
                    colorControls.classList.add('active');
                    
                    // Set initial hue value based on current cell color
                    const currentColor = cell.style.backgroundColor;
                    const hueMatch = currentColor.match(/hsl\((\d+)/);
                    if (hueMatch) {
                        document.getElementById('hue-slider').value = hueMatch[1];
                    }
                });
            } else {
                // Add original grid event listeners
                cell.addEventListener('mouseenter', () => {
                    highlightColumn(grid, j);
                });
                cell.addEventListener('mouseleave', () => {
                    unhighlightColumn(grid, j);
                });
                cell.addEventListener('click', () => {
                    addCoinToColumn(j);
                });
                cell.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    addCoinToColumn(j);
                });
            }
            
            grid.appendChild(cell);
        }
    }
}

// Create coins
function createCoins() {
    // Create top coins container
    const coinsTopContainer = document.getElementById('coins-top');
    
    // Add top coin counter
    const topCounter = document.createElement('div');
    topCounter.id = 'top-coin-counter';
    topCounter.textContent = `Top Coins: ${topCoins}/${MAX_TOTAL_COINS}`;
    topCounter.style.cursor = 'pointer';
    topCounter.addEventListener('click', resetTopCoins);
    coinsTopContainer.appendChild(topCounter);
    
    // Add top points counter
    const topPointsCounter = document.createElement('div');
    topPointsCounter.id = 'top-points';
    topPointsCounter.textContent = `Top Points: ${topPoints}`;
    document.body.appendChild(topPointsCounter);
    
    // Create column stacks
    for (let i = 0; i < GRID_SIZE; i++) {
        const columnStack = document.createElement('div');
        columnStack.className = 'column-stack';
        columnStack.dataset.col = i;
        coinsTopContainer.appendChild(columnStack);
    }
    
    // Create side coins container
    const coinsContainer = document.getElementById('coins');
    const counter = document.createElement('div');
    counter.id = 'coin-counter';
    counter.textContent = `Side Coins: ${totalCoins}/${MAX_TOTAL_COINS}`;
    counter.style.cursor = 'pointer';
    counter.addEventListener('click', resetSideCoins);
    coinsContainer.appendChild(counter);
    
    // Add side points counter
    const sidePointsCounter = document.createElement('div');
    sidePointsCounter.id = 'side-points';
    sidePointsCounter.textContent = `Side Points: ${sidePoints}`;
    document.body.appendChild(sidePointsCounter);
    
    for (let i = 0; i < GRID_SIZE; i++) {
        // Create a container for each row's coins
        const coinStack = document.createElement('div');
        coinStack.className = 'coin-stack';
        coinStack.dataset.row = i;
        coinsContainer.appendChild(coinStack);
    }

    // Add match coins button functionality
    const matchButton = document.getElementById('match-coins-button');
    matchButton.addEventListener('click', matchCoins);

    // Add reset button functionality
    const resetButton = document.getElementById('reset-button');
    resetButton.addEventListener('click', () => {
        resetCoinsOnly();
        updateCoinCounter();
        updateTopCoinCounter();
    });
}

// Update point counters
function updatePointCounters() {
    const sidePointsCounter = document.getElementById('side-points');
    const topPointsCounter = document.getElementById('top-points');
    if (sidePointsCounter) {
        sidePointsCounter.textContent = `Side Points: ${sidePoints}`;
    }
    if (topPointsCounter) {
        topPointsCounter.textContent = `Top Points: ${topPoints}`;
    }
}

// Match coins with their corresponding grid cells
function matchCoins() {
    resetSideCoins();
    // Get all grid cells
    const gridCells = document.querySelectorAll('.cell');
    // Create a map of cell indices to their elements
    const cellMap = new Map();
    gridCells.forEach(cell => {
        const index = parseInt(cell.dataset.index);
        cellMap.set(index, cell);
    });

    const topCoins = document.getElementById('coins-top').querySelectorAll('.coin');
    for (let i = 0; i < MAX_TOTAL_COINS; i++) {
        let random = Math.random();
        if ( random <= equilibria[0][1] ) {
            addCoinToRow(0);
        } else {
            addCoinToRow(1);
        }
    }

    // Get all coins
    const allCoins = document.querySelectorAll('.coin');
    
    // Create maps of coin numbers to their elements and positions
    const coinMap = [];
    allCoins.forEach(coin => {
        const number = parseInt(coin.querySelector('.coin-number').textContent);
        const row = coin.dataset.row !== "null" ? parseInt(coin.dataset.row) : null;
        const col = coin.dataset.col !== "null" ? parseInt(coin.dataset.col) : null;
        coinMap.push({ coin, row, col, number });
    });
    
    // Clear previous highlights
    gridCells.forEach(cell => {
        cell.classList.remove('intersection', 'intersection-row', 'intersection-col');
    });
    
    let hasMatches = false; // Track if any matches were found
    
    // Match coins with cells and find intersections
    coinMap.forEach((data) => {
        const { coin, row, col, number } = data;
        
        // Find matching coins (same number)
        const matchingCoins = coinMap
            .filter((d) => d.number === number && d !== data);
        
        if (matchingCoins.length > 0) {
            hasMatches = true; // Set flag if matches were found
            // Add matching style to the coin
            coin.classList.add('matching');
            
            // Find intersection points
            matchingCoins.forEach((matchData) => {
                const matchRow = matchData.row;
                const matchCol = matchData.col;
                
                // If one coin is from a row and one from a column
                if ((row !== null && matchCol !== null) || (col !== null && matchRow !== null)) {
                    // Find the intersection cell
                    const intersectionRow = row !== null ? row : matchRow;
                    const intersectionCol = col !== null ? col : matchCol;
                    const intersectionIndex = intersectionRow * GRID_SIZE + intersectionCol;
                    const intersectionCell = cellMap.get(intersectionIndex);
                    
                    if (intersectionCell) {
                        // Add intersection highlight
                        intersectionCell.classList.add('intersection');
                        
                        // Highlight the entire row and column
                        const grid = document.getElementById('grid');
                        const rowCells = grid.querySelectorAll(`.cell[data-row="${intersectionRow}"]`);
                        const colCells = grid.querySelectorAll(`.cell[data-col="${intersectionCol}"]`);
                        
                        rowCells.forEach(cell => {
                            if (!cell.classList.contains('intersection')) {
                                cell.classList.add('intersection-row');
                            }
                        });
                        
                        colCells.forEach(cell => {
                            if (!cell.classList.contains('intersection')) {
                                cell.classList.add('intersection-col');
                            }
                        });

                        // Award points
                        if (row !== null) {
                            sidePoints += parseInt(intersectionCell.dataset.aiValue);
                        } else {
                            topPoints += parseInt(intersectionCell.dataset.value);
                        }
                    }
                }
            });
        }
    });

    // Update match counter if matches were found
    if (hasMatches) {
        matchCount++;
        updateMatchCounter();
    }

    // Update point counters
    updatePointCounters();
}

// Update match counter
function updateMatchCounter() {
    const matchCounter = document.getElementById('match-counter');
    if (matchCounter) {
        matchCounter.textContent = `Matches: ${matchCount}`;
    }
}

// Reset coins and intersections only (preserve points)
function resetCoinsOnly() {
    // Reset side coins
    const coinStacks = document.querySelectorAll('.coin-stack');
    coinStacks.forEach(stack => {
        const coins = stack.querySelectorAll('.coin');
        coins.forEach(coin => {
            coin.classList.remove('placed', 'matching');
            setTimeout(() => coin.remove(), 200);
        });
    });
    totalCoins = 0;
    updateCoinCounter();

    // Reset top coins
    const columnStacks = document.querySelectorAll('.column-stack');
    columnStacks.forEach(stack => {
        const coins = stack.querySelectorAll('.coin');
        coins.forEach(coin => {
            coin.classList.remove('placed', 'matching');
            setTimeout(() => coin.remove(), 200);
        });
    });
    topCoins = 0;
    updateTopCoinCounter();

    // Clear all grid highlights
    const gridCells = document.querySelectorAll('.cell');
    gridCells.forEach(cell => {
        cell.classList.remove('intersection', 'intersection-row', 'intersection-col', 'highlighted');
    });
}

// Reset grid with new noise data
async function resetGrid() {
    try {
        const response = await fetch('http://localhost:3000/api/noise');
        const noiseData = await response.json();
        while (aiGrid === null) {
            const aiResponse = await fetch('http://localhost:3000/api/noise');
            const aiNoiseData = await aiResponse.json();
            aiGrid = aiNoiseData.grid;
            if (find2x2NashEquilibria(noiseData.grid, aiGrid) === Infinity) {
                aiGrid = null;
            }
        }
        equilibria = find2x2NashEquilibria(noiseData.grid, aiGrid);
        console.log(equilibria);
        if (equilibria === Infinity) {
            resetGrid();
            return;
        }

        // Clear the existing grid
        const grid = document.getElementById('grid');
        grid.innerHTML = '';

        // Create new grid with new noise data
        createGrid('grid', noiseData.grid, aiGrid);
        
    } catch (error) {
        console.error('Error resetting grid:', error);
    }
}

// Reset side coins
function resetSideCoins() {
    const coinStacks = document.querySelectorAll('.coin-stack');
    coinStacks.forEach(stack => {
        const coins = stack.querySelectorAll('.coin');
        coins.forEach(coin => {
            coin.classList.remove('placed');
            setTimeout(() => coin.remove(), 200);
        });
    });
    totalCoins = 0;
    updateCoinCounter();
}

// Reset top coins
function resetTopCoins() {
    const columnStacks = document.querySelectorAll('.column-stack');
    columnStacks.forEach(stack => {
        const coins = stack.querySelectorAll('.coin');
        coins.forEach(coin => {
            coin.classList.remove('placed');
            setTimeout(() => coin.remove(), 200);
        });
    });
    topCoins = 0;
    updateTopCoinCounter();
}

// Update coin counter
function updateCoinCounter() {
    const coinCounter = document.getElementById('coin-counter');
    if (coinCounter) {
        coinCounter.textContent = `Coins: ${totalCoins}/${MAX_TOTAL_COINS}`;
        if (totalCoins >= MAX_TOTAL_COINS) {
            coinCounter.classList.add('limit-reached');
        } else {
            coinCounter.classList.remove('limit-reached');
        }
    }
}

// Update top coin counter
function updateTopCoinCounter() {
    const topCoinCounter = document.getElementById('top-coin-counter');
    if (topCoinCounter) {
        topCoinCounter.textContent = `Top Coins: ${topCoins}/${MAX_TOTAL_COINS}`;
        if (topCoins >= MAX_TOTAL_COINS) {
            topCoinCounter.classList.add('limit-reached');
        } else {
            topCoinCounter.classList.remove('limit-reached');
        }
    }
}

// Create a new coin
function createCoin(rowIndex, colIndex = null) {
    const coin = document.createElement('div');
    coin.className = 'coin';
    coin.dataset.row = rowIndex;
    coin.dataset.col = colIndex;
    
    // Add number to coin
    const number = document.createElement('div');
    number.className = 'coin-number';
    number.textContent = (rowIndex !== null ? totalCoins : topCoins) + 1;
    coin.appendChild(number);
    
    // Add click event to remove the coin
    coin.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event from bubbling up
        removeCoin(coin);
    });
    
    return coin;
}

// Add a coin to a row
function addCoinToRow(rowIndex) {
    if (totalCoins >= MAX_TOTAL_COINS) {
        // Visual feedback when limit is reached
        const counter = document.getElementById('coin-counter');
        if (counter) {
            counter.classList.add('shake');
            setTimeout(() => counter.classList.remove('shake'), 500);
        }
        return;
    }
    
    const coinStack = document.querySelector(`.coin-stack[data-row="${rowIndex}"]`);
    if (coinStack) {
        const newCoin = createCoin(rowIndex, null);
        coinStack.appendChild(newCoin);
        // Trigger animation
        setTimeout(() => newCoin.classList.add('placed'), 10);
        totalCoins++;
        updateCoinCounter();
    }
}

// Add a coin to a column (top container)
function addCoinToColumn(colIndex) {
    if (topCoins >= MAX_TOTAL_COINS) {
        // Visual feedback when limit is reached
        const counter = document.getElementById('top-coin-counter');
        if (counter) {
            counter.classList.add('shake');
            setTimeout(() => counter.classList.remove('shake'), 500);
        }
        return;
    }
    
    const columnStack = document.querySelector(`.column-stack[data-col="${colIndex}"]`);
    if (columnStack) {
        const newCoin = createCoin(null, colIndex);
        columnStack.appendChild(newCoin);
        // Trigger animation
        setTimeout(() => newCoin.classList.add('placed'), 10);
        topCoins++;
        updateTopCoinCounter();
    }
}

// Remove a coin
function removeCoin(coin) {
    coin.classList.remove('placed');
    // Remove the coin after animation
    setTimeout(() => {
        coin.remove();
        if (coin.dataset.col !== undefined) {
            topCoins--;
            updateTopCoinCounter();
        } else {
            totalCoins--;
            updateCoinCounter();
        }
    }, 200);
}

// Highlight a column
function highlightColumn(grid, colIndex) {
    const cells = grid.querySelectorAll(`.cell[data-col="${colIndex}"]`);
    cells.forEach(cell => {
        cell.classList.add('highlighted');
    });
}

// Unhighlight a column
function unhighlightColumn(grid, colIndex) {
    const cells = grid.querySelectorAll(`.cell[data-col="${colIndex}"]`);
    cells.forEach(cell => {
        cell.classList.remove('highlighted');
    });
}

// Fetch noise data and initialize grids
async function initializeGrids() {
    try {
        const response = await fetch('http://localhost:3000/api/noise');
        const noiseData = await response.json();
        while (aiGrid === null) {
            const aiResponse = await fetch('http://localhost:3000/api/noise');
            const aiNoiseData = await aiResponse.json();
            aiGrid = aiNoiseData.grid;
            if (find2x2NashEquilibria(noiseData.grid, aiGrid) === Infinity) {
                aiGrid = null;
            }
        }

        equilibria = find2x2NashEquilibria(noiseData.grid, aiGrid);
        console.log(equilibria);
        if (equilibria === Infinity) {
            initializeGrids();
            return;
        }
        // Create both grids with the same noise data
        createGrid('grid', noiseData.grid, aiGrid);
        createGrid('grid2', noiseData.grid, aiGrid);
        
        // Initialize color controls
        initializeColorControls();
        
        // Create coins
        createCoins();
        
    } catch (error) {
        console.error('Error fetching noise data:', error);
    }
}

// Initialize color controls
function initializeColorControls() {
    const colorControls = document.getElementById('color-controls');
    const hueSlider = document.getElementById('hue-slider');
    const applyButton = document.getElementById('apply-color');
    
    // Update preview color when slider changes
    hueSlider.addEventListener('input', () => {
        const selectedCell = document.querySelector('.cell2.selected');
        if (selectedCell) {
            selectedCell.style.backgroundColor = `hsl(${hueSlider.value}, 70%, 50%)`;
            // Update the cell's value based on the hue
            const value = Math.floor((hueSlider.value / 360) * 5);
            selectedCell.dataset.value = value;
        }
    });
    
    // Apply color when button is clicked
    applyButton.addEventListener('click', () => {
        const selectedCell = document.querySelector('.cell2.selected');
        if (selectedCell) {
            selectedCell.style.backgroundColor = `hsl(${hueSlider.value}, 70%, 50%)`;
            colorControls.classList.remove('active');
            selectedCell.classList.remove('selected');
        }
    });
    
    // Close color controls when clicking outside
    document.addEventListener('click', (e) => {
        if (!colorControls.contains(e.target) && !e.target.classList.contains('cell2')) {
            colorControls.classList.remove('active');
            document.querySelectorAll('.cell2.selected').forEach(c => c.classList.remove('selected'));
        }
    });
}

// Calculate similarity between grids
function calculateGridSimilarity() {
    const grid2Cells = document.querySelectorAll('.cell2');
    let totalDifference = 0;
    let maxPossibleDifference = 0;
    
    grid2Cells.forEach(cell => {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        const grid2Value = parseInt(cell.dataset.value);
        const aiValue = parseInt(cell.dataset.aiValue);
        
        // Calculate absolute difference
        const difference = Math.abs(grid2Value - aiValue);
        totalDifference += difference;
        maxPossibleDifference += 5; // Maximum possible difference is 5 (0 to 5)
    });
    
    // Calculate similarity percentage (0% = completely different, 100% = identical)
    const similarity = 100 - (totalDifference / maxPossibleDifference) * 100;
    return similarity;
}

// Show similarity score
function showSimilarityScore() {
    const similarity = calculateGridSimilarity();
    const scoreElement = document.getElementById('similarity-score');
    
    // Set color based on similarity
    let color;
    if (similarity >= 80) {
        color = '#4CAF50'; // Green for high similarity
    } else if (similarity >= 50) {
        color = '#FFA500'; // Orange for medium similarity
    } else {
        color = '#FF4444'; // Red for low similarity
    }
    
    scoreElement.style.backgroundColor = color;
    scoreElement.textContent = `Grid Similarity: ${similarity.toFixed(1)}%`;
    scoreElement.classList.add('active');
    
    // Hide score after 3 seconds
    setTimeout(() => {
        scoreElement.classList.remove('active');
    }, 3000);
}

// Initialize the application
function initializeApp() {
    // Initialize color controls
    initializeColorControls();
    
    // Add compare button functionality
    const compareButton = document.getElementById('compare-button');
    compareButton.addEventListener('click', showSimilarityScore);
    
    // Add AI grid popup functionality
    initializeAIGridPopup();
    
    // Add reset button functionality
    const resetButton = document.getElementById('reset-button');
    const resetGridButton = document.getElementById('reset-grid-button');
    
    resetButton.addEventListener('click', () => {
        resetCoinsOnly();
    });
    
    resetGridButton.addEventListener('click', () => {
        initializeGrids();
    });
    
    // Initialize grids
    initializeGrids();
}

// Initialize AI grid popup
function initializeAIGridPopup() {
    const showAIButton = document.getElementById('show-ai-button');
    const aiGridPopup = document.getElementById('ai-grid-popup');
    const closeButton = aiGridPopup.querySelector('.close-button');
    
    showAIButton.addEventListener('click', () => {
        if (aiGrid) {
            displayAIGrid();
            aiGridPopup.classList.add('active');
        }
    });
    
    closeButton.addEventListener('click', () => {
        aiGridPopup.classList.remove('active');
    });
    
    // Close popup when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target === aiGridPopup) {
            aiGridPopup.classList.remove('active');
        }
    });
}

// Display AI grid values in popup
function displayAIGrid() {
    const aiGridContainer = document.getElementById('ai-grid');
    aiGridContainer.innerHTML = ''; // Clear existing content
    
    for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
            const cell = document.createElement('div');
            cell.className = 'ai-cell';
            // Calculate the value and color from the AI grid data
            const value = Math.floor(5 * (aiGrid[i][j] + 1));
            const hue = (aiGrid[i][j] + 1) * 180; // Map from [-1,1] to [0,360]
            cell.style.backgroundColor = `hsl(${hue}, 70%, 50%)`;
            cell.textContent = value; // Keep the number for reference
            aiGridContainer.appendChild(cell);
        }
    }
}

function find2x2NashEquilibria(grid1, grid2) {
    grid1 = grid1.map(row => row.map(value => 5* (parseFloat(value) + 1)));
    grid2 = grid2.map(row => row.map(value => 5* (parseFloat(value) + 1)));
    const equilibria = [];
    const denomenator1 = grid1[0][0] + grid1[1][1] - grid1[0][1] - grid1[1][0];
    const denomenator2 = grid2[0][0] + grid2[1][1] - grid2[0][1] - grid2[1][0];

    if ( denomenator1 === 0 ) {
        return Infinity;
    }
    if (denomenator2 === 0 ) {
        return Infinity;
    }
    indiff1 = Math.min( 1, Math.max( 0, (grid2[1][1] - grid2[0][1] ) / denomenator2 ) );
    if ( (indiff1 === 0 || indiff1 === 1) & denomenator1 < 0) {
        indiff1 = 1 - indiff1;
    }
    indiff2 = Math.min( 1, Math.max( 0, (grid1[1][1] - grid1[1][0] ) / denomenator1 ) );
    if ( (indiff2 === 0 || indiff2 === 1) & denomenator2 < 0) {
        indiff2 = 1 - indiff2;
    }
    if ( indiff2 > 0 && indiff2 < 1 ) {
        if ( indiff1 === 0 ) {
            return [ [0, 1], denomenator1 > 0 ? [0, 1] : [1, 0] ]
        }
        if ( indiff1 === 1 ) {
            return [ [1, 0], denomenator1 > 0 ? [1, 0] : [0, 1] ]
        }
    }
    if ( indiff1 > 0 && indiff1 < 1 ) {
        if ( indiff2 === 0 ) {
            return [ denomenator2 > 0 ? [0, 1] : [1, 0], [0, 1] ]
        }
        if ( indiff2 === 1 ) {
            return [ denomenator2 > 0 ? [1, 0] : [0, 1], [1, 0] ]
        }
    }
    return [ [indiff1, 1 - indiff1], [indiff2, 1 - indiff2] ];
}
// Start the application
initializeApp(); 