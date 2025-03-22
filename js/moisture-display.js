
const SENSOR_HISTORY_API_URL = '../api/sensor_data/history';
const UPDATE_INTERVAL = 60000;
const PLANTS = [
    {
        id: 'spotted_begonia',
        name: 'Spotted Begonia',
        dataUrl: '../data/json_data/moisture_spotted_begonia.json',
        storageKey: 'lastWatered_begonia'
    },
    {
        id: 'snake_plant',
        name: 'Snake Plant',
        dataUrl: '../data/json_data/moisture_snake_plant.json',
        storageKey: 'lastWatered_snake_plant'
    }
];

// formate date as YYYY-MM-DD HH:MM:SS
function formatDateTime(date) {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

// format date as MM/DD, HH:MM
function formatShortDateTime(date) {
    return date.toLocaleString(undefined, {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

async function fetchSensorData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching data from ${url}:`, error);
        return null;
    }
}

async function fetchPlantData(plant) {
    try {
        const data = await fetchSensorData(plant.dataUrl);
        if (data && data.moisture !== undefined) {
            document.getElementById(plant.id).textContent = data.moisture.toFixed(1);
            document.getElementById(`last-updated-${plant.id}`).textContent = 
                `Last updated: ${formatShortDateTime(new Date(data.timestamp))}`;
        } else {
            document.getElementById(plant.id).textContent = 'Err';
        }
    } catch (error) {
        console.error(`Error fetching data for ${plant.name}:`, error);
        document.getElementById(plant.id).textContent = 'Err';
    }
}

function handleWatering(plant) {
    const now = new Date();
    localStorage.setItem(plant.storageKey, now.toISOString());
    displayLastWatered(plant);
}

function displayLastWatered(plant) {
    const lastWateredElement = document.getElementById(`last-watered-${plant.id}`);
    const lastWateredTime = localStorage.getItem(plant.storageKey);

    const date = new Date(lastWateredTime);
    // Create a wrapper div to hold the two lines
    lastWateredElement.innerHTML = '';
    
    // Create label line
    const labelElement = document.createElement('div');
    labelElement.textContent = 'Last Watered:';
    
    // Create date line
    const dateElement = document.createElement('div');
    
    if (lastWateredTime) {
        dateElement.textContent = formatShortDateTime(date);
    } else {
        dateElement.textContent = 'Never';
    }
    // Append both to the container
    lastWateredElement.appendChild(labelElement);
    lastWateredElement.appendChild(dateElement);
}

async function fetchMoistureHistory(plantId) {
    try {
        // Always request 7-day data
        const response = await fetch(`${SENSOR_HISTORY_API_URL}?sensor_type=moisture&location=${plantId}&range=7d`);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status}`);
        }
        const data = await response.json();
        return processHistoricalData(data);
    } catch (error) {
        console.error(`Error fetching historical data for ${plantId}:`, error);
        return null;
    }
}

function processHistoricalData(data) {
    const dataByTimestamp = new Map();

    data.forEach(record => {
        const timestamp = record.timestamp;
        if (!dataByTimestamp.has(timestamp)) {
            dataByTimestamp.set(timestamp, {
                moisturePlant: null
            });
        }

        const entry = dataByTimestamp.get(timestamp);
        entry.moisturePlant = record.value;
    });

    const sortedTimestamps = Array.from(dataByTimestamp.keys()).sort();

    const processedData = {
        timestamps: sortedTimestamps,
        moisture: []
    };

    sortedTimestamps.forEach(timestamp => {
        const entry = dataByTimestamp.get(timestamp);
        processedData.moisture.push(entry.moisturePlant);
    });

    return processedData;
}

// Function to ensure the canvas is properly sized for high-DPI displays
function setupCanvas(canvas) {
    if (!canvas) return null;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Set the canvas dimensions to match its CSS size multiplied by device pixel ratio
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    
    return { width: rect.width, height: rect.height, ctx };
}

function drawMoistureChart(canvas, data, plantName) {
    // Get properly sized canvas and context
    const { width, height, ctx } = setupCanvas(canvas) || {};
    if (!ctx) return;
    
    // Padding for chart
    const padding = {
        left: 50,
        right: 25,
        top: 30,
        bottom: 40
    };
    
    ctx.clearRect(0, 0, width, height);
    
    if (!data || !data.timestamps || data.timestamps.length === 0) {
        // Draw "No data available" message
        ctx.font = '14px Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('No moisture data available', width/2, height/2);
        return;
    }
    
    // Process data for chart
    const timestamps = data.timestamps.map(ts => new Date(ts));
    const moisture = data.moisture;
    
    // Find min and max values for scaling
    const validMoisture = moisture.filter(v => v !== null);
    if (validMoisture.length === 0) {
        ctx.font = '14px Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('No valid moisture data', width/2, height/2);
        return;
    }
    
    let minMoisture = Math.min(...validMoisture);
    let maxMoisture = Math.max(...validMoisture);
    
    // Add padding to values
    const moisturePadding = Math.max(5, (maxMoisture - minMoisture) * 0.1);
    minMoisture = Math.max(0, minMoisture - moisturePadding);
    maxMoisture = Math.min(100, maxMoisture + moisturePadding);
    
    // Calculate chart area
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Draw grid lines and labels
    ctx.strokeStyle = '#DDD';
    ctx.lineWidth = 1;
    ctx.font = '12px Arial';
    
    // Y-axis moisture
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    ctx.fillText('Moisture (%)', 0, 0);
    ctx.restore();
    
    // Y-axis grid lines
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + chartHeight - (i / 5) * chartHeight;
        const value = minMoisture + (i / 5) * (maxMoisture - minMoisture);
        
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();
        
        ctx.fillStyle = '#666';
        ctx.fillText(value.toFixed(0), padding.left - 5, y + 4);
    }
    
    // X-axis time labels
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    
    // Draw time labels (3 evenly spaced)
    const numLabels = 3;
    for (let i = 0; i < numLabels; i++) {
        const index = Math.floor(i * (timestamps.length - 1) / (numLabels - 1));
        if (index < 0 || index >= timestamps.length) continue;
        
        const x = padding.left + (i / (numLabels - 1)) * chartWidth;
        const date = timestamps[index];
        
        ctx.save();
        ctx.translate(x, height - padding.bottom + 15);
        ctx.fillText(formatShortDateTime(date), -7, 0);
        ctx.restore();
        
        // X-axis tick
        ctx.beginPath();
        ctx.moveTo(x, height - padding.bottom);
        ctx.lineTo(x, height - padding.bottom + 5);
        ctx.stroke();
    }
    
    // Draw moisture line
    ctx.strokeStyle = '#72a178';  // Green color
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    let firstPointDrawn = false;
    
    for (let i = 0; i < timestamps.length; i++) {
        if (moisture[i] === null) continue;
        
        const x = padding.left + (i / (timestamps.length - 1)) * chartWidth;
        const y = padding.top + chartHeight - ((moisture[i] - minMoisture) / (maxMoisture - minMoisture)) * chartHeight;
        
        if (!firstPointDrawn) {
            ctx.moveTo(x, y);
            firstPointDrawn = true;
        } else {
            ctx.lineTo(x, y);
        }
    }
    
    ctx.stroke();
    
    // Draw watering markers
    const lastWateredTime = localStorage.getItem(`lastWatered_${data.plantId}`);
    if (lastWateredTime) {
        const waterDate = new Date(lastWateredTime);
        const startDate = timestamps[0];
        const endDate = timestamps[timestamps.length - 1];
        
        // Check if water date is within the chart time range
        if (waterDate >= startDate && waterDate <= endDate) {
            // Calculate x position for watering marker
            const timeRange = endDate - startDate;
            const timeSinceStart = waterDate - startDate;
            const xPos = padding.left + (timeSinceStart / timeRange) * chartWidth;
            
            // Draw watering marker
            ctx.beginPath();
            ctx.strokeStyle = '#d56097';  // Pink color
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 3]);
            ctx.moveTo(xPos, padding.top);
            ctx.lineTo(xPos, height - padding.bottom);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Add "Watered" label
            ctx.fillStyle = '#d56097';
            ctx.textAlign = 'center';
            ctx.font = '12px Arial';
            ctx.fillText('Watered', xPos, padding.top - 5);
        }
    }
}

// Initialize the UI for all plants
function initializePlants() {
    PLANTS.forEach(plant => {
        // Fetch initial current data
        fetchPlantData(plant);
        
        // Display last watered time from localStorage
        displayLastWatered(plant);
        
        // Add event listener for the Watered! button
        const waterButton = document.querySelector(`#water-btn-${plant.id}`);
        if (waterButton) {
            waterButton.addEventListener('click', () => handleWatering(plant));
        }
        
        // Fetch and draw historical data
        const plotCanvas = document.getElementById(`plot-${plant.id}`);
        if (plotCanvas) {
            fetchMoistureHistory(plant.id).then(data => {
                if (data) {
                    data.plantId = plant.id;
                    drawMoistureChart(plotCanvas, data, plant.name);
                }
            });
        }
    });
    
    // Set up periodic refresh for all plants
    setInterval(() => {
        PLANTS.forEach(plant => {
            // Update current data
            fetchPlantData(plant);
            
            // Update historical chart
            const plotCanvas = document.getElementById(`plot-${plant.id}`);
            if (plotCanvas) {
                fetchMoistureHistory(plant.id).then(data => {
                    if (data) {
                        data.plantId = plant.id;
                        drawMoistureChart(plotCanvas, data, plant.name);
                    }
                });
            }
        });
    }, UPDATE_INTERVAL);
}

document.addEventListener('DOMContentLoaded', initializePlants);