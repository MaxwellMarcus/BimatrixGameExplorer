const express = require('express');
const cors = require('cors');
const path = require('path');
const { createNoise2D } = require('simplex-noise');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

let noise2D = createNoise2D();
// Generate noise data for a grid
function generateNoiseData(gridSize, offsetX = 0, offsetY = 0, scale = 0.02) {
    const data = [];
    for (let i = 0; i < gridSize; i++) {
        const row = [];
        for (let j = 0; j < gridSize; j++) {
            const value = noise2D((i + offsetX) * scale, (j + offsetY) * scale);
            row.push(value);
        }
        data.push(row);
    }
    return data;
}

// API endpoint to get noise data for all grids
app.get('/api/noise', (req, res) => {
    const gridSize = 10;
    // Create noise function
    noise2D = createNoise2D();
    const noiseData = {
        grid: generateNoiseData(gridSize, 0, 0, 0.5),
    };
    res.json(noiseData);
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 