// Configuration
const TEMPERATURE_LIVINGROOM_URL = 'data/temperature_livingroom.json';
const TEMPERATURE_BEDROOM_URL = 'data/temperature_bedroom.json';
const HUMIDITY_LIVINGROOM_URL = 'data/humidity_livingroom.json';
const HUMIDITY_BEDROOM_URL = 'data/humidity_bedroom.json';
const SENSOR_HISTORY_API_URL = 'api/sensor_data/history';
const UPDATE_INTERVAL = 60000; // Update every 60 seconds

// DOM elements
const tempLivingRoomElement = document.getElementById('temperature-livingroom-value');
const tempBedroomElement = document.getElementById('temperature-bedroom-value');
const humidityLivingRoomElement = document.getElementById('humidity-livingroom-value');
const humidityBedroomElement = document.getElementById('humidity-bedroom-value');
const lastUpdatedElement = document.getElementById('last-updated');
const canvas = document.getElementById('history-chart');

// Function to format date and time
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

// Function for shorter date/time format for chart
function formatShortDateTime(date) {
    return date.toLocaleString(undefined, {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

// Function to fetch sensor data from JSON file
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

// Function to fetch all current sensor data from JSON files
async function fetchAllCurrentSensorData() {
    try {
        const [tempLivingRoom, tempBedroom, humidityLivingRoom, humidityBedroom] = await Promise.all([
            fetchSensorData(TEMPERATURE_LIVINGROOM_URL),
            fetchSensorData(TEMPERATURE_BEDROOM_URL),
            fetchSensorData(HUMIDITY_LIVINGROOM_URL),
            fetchSensorData(HUMIDITY_BEDROOM_URL)
        ]);
        
        displayCurrentData(tempLivingRoom, tempBedroom, humidityLivingRoom, humidityBedroom);
        
        // Use the newest timestamp for the "last updated" display
        const timestamps = [
            tempLivingRoom?.timestamp, 
            tempBedroom?.timestamp, 
            humidityLivingRoom?.timestamp, 
            humidityBedroom?.timestamp
        ].filter(t => t);
        
        if (timestamps.length > 0) {
            const newestTimestamp = new Date(Math.max(...timestamps.map(t => new Date(t).getTime())));
            lastUpdatedElement.textContent = `Last updated: ${formatDateTime(newestTimestamp)}`;
        }
        
    } catch (error) {
        console.error('Error fetching sensor data:', error);
        displayError();
    }
}

// Function to fetch historical sensor data from SQLite database via API
async function fetchHistoricalSensorData(timeRange = '24h') {
    try {
        const response = await fetch(`${SENSOR_HISTORY_API_URL}?range=${timeRange}`);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching historical sensor data:', error);
        return null;
    }
}

// Function to display current data from JSON files
function displayCurrentData(tempLivingRoom, tempBedroom, humidityLivingRoom, humidityBedroom) {
    if (tempLivingRoom && tempLivingRoom.temperature !== undefined) {
        tempLivingRoomElement.textContent = tempLivingRoom.temperature.toFixed(1);
    } else {
        tempLivingRoomElement.textContent = 'Err';
    }
    
    if (tempBedroom && tempBedroom.temperature !== undefined) {
        tempBedroomElement.textContent = tempBedroom.temperature.toFixed(1);
    } else {
        tempBedroomElement.textContent = 'Err';
    }
    
    if (humidityLivingRoom && humidityLivingRoom.humidity !== undefined) {
        humidityLivingRoomElement.textContent = humidityLivingRoom.humidity.toFixed(0);
    } else {
        humidityLivingRoomElement.textContent = 'Err';
    }
    
    if (humidityBedroom && humidityBedroom.humidity !== undefined) {
        humidityBedroomElement.textContent = humidityBedroom.humidity.toFixed(0);
    } else {
        humidityBedroomElement.textContent = 'Err';
    }
}

// Function to display error state
function displayError() {
    tempLivingRoomElement.textContent = 'Err';
    tempBedroomElement.textContent = 'Err';
    humidityLivingRoomElement.textContent = 'Err';
    humidityBedroomElement.textContent = 'Err';
    lastUpdatedElement.textContent = 'Unable to fetch sensor data';
}

// Initialize data refresh
async function initDataRefresh() {
    // Fetch current data from JSON files
    await fetchAllCurrentSensorData();
    
    // Fetch historical data from SQLite database via API
    const historicalData = await fetchHistoricalSensorData();
    if (historicalData) {
        prepareAndDrawHistoricalData(historicalData);
    }
    
    // Set up periodic refresh
    setInterval(async () => {
        await fetchAllCurrentSensorData();
        const historicalData = await fetchHistoricalSensorData();
        if (historicalData) {
            prepareAndDrawHistoricalData(historicalData);
        }
    }, UPDATE_INTERVAL);
}

// Function to prepare and draw historical data
function prepareAndDrawHistoricalData(historicalData) {
    if (!canvas) {
        console.error('History chart element not found in DOM');
        return;
    }
    
    // Reset canvas
    setupCanvas();
    
    // Process the historical data
    const processedData = processHistoricalData(historicalData);
    
    // Draw the chart using the historical data
    drawHistoryChart(canvas, processedData);
}

// Function to process historical data from SQLite for the chart
function processHistoricalData(data) {
    // Create a map to store processed data by timestamp
    const dataByTimestamp = new Map();
    
    // Process each record from the database
    data.forEach(record => {
        const timestamp = record.timestamp;
        if (!dataByTimestamp.has(timestamp)) {
            dataByTimestamp.set(timestamp, {
                tempLivingRoom: null,
                tempBedroom: null,
                humidityLivingRoom: null,
                humidityBedroom: null
            });
        }
        
        const entry = dataByTimestamp.get(timestamp);
        
        // Map the record to the appropriate property based on sensor type and location
        if (record.sensor_type === 'temperature') {
            if (record.location === 'livingroom') {
                entry.tempLivingRoom = record.value;
            } else if (record.location === 'bedroom') {
                entry.tempBedroom = record.value;
            }
        } else if (record.sensor_type === 'humidity') {
            if (record.location === 'livingroom') {
                entry.humidityLivingRoom = record.value;
            } else if (record.location === 'bedroom') {
                entry.humidityBedroom = record.value;
            }
        }
    });
    
    // Sort timestamps and convert map to arrays for the chart
    const sortedTimestamps = Array.from(dataByTimestamp.keys()).sort();
    
    const processedData = {
        timestamps: sortedTimestamps,
        tempLivingRoom: [],
        tempBedroom: [],
        humidityLivingRoom: [],
        humidityBedroom: []
    };
    
    sortedTimestamps.forEach(timestamp => {
        const entry = dataByTimestamp.get(timestamp);
        processedData.tempLivingRoom.push(entry.tempLivingRoom);
        processedData.tempBedroom.push(entry.tempBedroom);
        processedData.humidityLivingRoom.push(entry.humidityLivingRoom);
        processedData.humidityBedroom.push(entry.humidityBedroom);
    });
    
    return processedData;
}

// Function to ensure the canvas is properly sized for high-DPI displays
function setupCanvas() {
    if (!canvas) return;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
}

// Function to draw history chart
function drawHistoryChart(canvas, data) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 50; // Increased space for labels
    
    ctx.clearRect(0, 0, width, height);
    
    const pointCount = data.timestamps.length;
    
    if (pointCount === 0) return;
    
    // Filter out null values and find min/max values for scaling
    const allTemps = [...data.tempLivingRoom, ...data.tempBedroom].filter(v => v !== null);
    const allHumidities = [...data.humidityLivingRoom, ...data.humidityBedroom].filter(v => v !== null);
    
    if (allTemps.length === 0 || allHumidities.length === 0) return;
    
    let minTemp = Math.min(...allTemps);
    let maxTemp = Math.max(...allTemps);
    let minHumidity = Math.min(...allHumidities);
    let maxHumidity = Math.max(...allHumidities);
    
    // Add padding to min/max
    const tempPadding = Math.max(2, (maxTemp - minTemp) * 0.1);
    const humidityPadding = Math.max(5, (maxHumidity - minHumidity) * 0.1);
    
    minTemp = Math.max(0, minTemp - tempPadding);
    maxTemp += tempPadding;
    minHumidity = Math.max(0, minHumidity - humidityPadding);
    maxHumidity = Math.min(100, maxHumidity + humidityPadding);
    
    // Draw grid lines and labels
    ctx.strokeStyle = '#DDD';
    ctx.lineWidth = 1;
    ctx.font = '12px Arial';
    ctx.fillStyle = '#666';
    
    // Y-axis temperature (left)
    ctx.save();
    ctx.translate(20, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Temperature (°F)', 0, 0);
    ctx.restore();

    ctx.fillStyle = '#FF6B6B'; // Red for temperature
    for (let i = 0; i <= 5; i++) {
        const y = height - padding - (i / 5) * (height - 2 * padding);
        const tempValue = minTemp + (i / 5) * (maxTemp - minTemp);
        ctx.fillText(`${tempValue.toFixed(0)}`, 30, y + 4);
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }
    
    // Y-axis humidity (right)
    ctx.fillStyle = '#666';
    ctx.save();
    ctx.translate(width - 10, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Humidity (%)', 20, 0);
    ctx.restore();
    
    ctx.fillStyle = '#4ECDC4'; // Teal for humidity
    for (let i = 0; i <= 5; i++) {
        const y = height - padding - (i / 5) * (height - 2 * padding);
        const humidityValue = minHumidity + (i / 5) * (maxHumidity - minHumidity);
        ctx.fillText(`${humidityValue.toFixed(0)}`, width - 45, y + 4);
    }
    
    // X-axis time
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    
    // Display a subset of timestamps to avoid overcrowding
    const timestampInterval = Math.max(1, Math.floor(pointCount / 6));
    for (let i = 0; i < pointCount; i += timestampInterval) {
        const x = padding + (i / (pointCount - 1 || 1)) * (width - 2 * padding);
        ctx.fillText(formatShortDateTime(new Date(data.timestamps[i])), x, height - 5);
    }
    
    // Draw living room temperature line (darker red)
    drawLine(ctx, data.timestamps, data.tempLivingRoom, '#FF3333', width, height, padding, minTemp, maxTemp);
    
    // Draw bedroom temperature line (lighter red)
    drawLine(ctx, data.timestamps, data.tempBedroom, '#FF9999', width, height, padding, minTemp, maxTemp);
    
    // Draw living room humidity line (darker blue)
    drawLine(ctx, data.timestamps, data.humidityLivingRoom, '#3399FF', width, height, padding, minHumidity, maxHumidity);
    
    // Draw bedroom humidity line (lighter blue)
    drawLine(ctx, data.timestamps, data.humidityBedroom, '#99CCFF', width, height, padding, minHumidity, maxHumidity);
    
    // Add legend
    drawLegend(ctx, width, height);
}

// Helper function to draw a line on the chart, handling null values
function drawLine(ctx, timestamps, values, color, width, height, padding, min, max) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    
    const pointCount = timestamps.length;
    let pathStarted = false;
    
    values.forEach((value, index) => {
        if (value === null) {
            if (pathStarted) {
                ctx.stroke();
                pathStarted = false;
            }
            return;
        }
        
        const x = padding + (index / (pointCount - 1 || 1)) * (width - 2 * padding);
        const y = height - padding - ((value - min) / (max - min) * (height - 2 * padding));
        
        if (!pathStarted) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            pathStarted = true;
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    if (pathStarted) {
        ctx.stroke();
    }
}

// Function to draw the chart legend
function drawLegend(ctx, width, height) {
    const legendX = width / 2 - 150;
    const legendY = 20;
    const itemHeight = 20;
    
    // Living Room Temp
    ctx.fillStyle = '#FF3333';
    ctx.fillRect(legendX, legendY, 15, 15);
    ctx.fillStyle = '#333';
    ctx.textAlign = 'left';
    ctx.fillText('Living Room Temp', legendX + 20, legendY + 12);
    
    // Bedroom Temp
    ctx.fillStyle = '#FF9999';
    ctx.fillRect(legendX, legendY + itemHeight, 15, 15);
    ctx.fillStyle = '#333';
    ctx.fillText('Bedroom Temp', legendX + 20, legendY + itemHeight + 12);
    
    // Living Room Humidity
    ctx.fillStyle = '#3399FF';
    ctx.fillRect(legendX + 150, legendY, 15, 15);
    ctx.fillStyle = '#333';
    ctx.fillText('Living Room Humidity', legendX + 170, legendY + 12);
    
    // Bedroom Humidity
    ctx.fillStyle = '#99CCFF';
    ctx.fillRect(legendX + 150, legendY + itemHeight, 15, 15);
    ctx.fillStyle = '#333';
    ctx.fillText('Bedroom Humidity', legendX + 170, legendY + itemHeight + 12);
}

// Time range selector setup
function setupTimeRangeSelector() {
    const timeRangeSelect = document.getElementById('time-range-selector');
    if (!timeRangeSelect) return;
    
    timeRangeSelect.addEventListener('change', async () => {
        const selectedRange = timeRangeSelect.value;
        const historicalData = await fetchHistoricalSensorData(selectedRange);
        if (historicalData) {
            prepareAndDrawHistoricalData(historicalData);
        }
    });
}

// Start the application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    initDataRefresh();
    setupTimeRangeSelector();
});