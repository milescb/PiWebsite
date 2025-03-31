// Configuration
const TEMPERATURE_LIVINGROOM_URL = 'data/json_data/temperature_livingroom.json';
const TEMPERATURE_BEDROOM_URL = 'data/json_data/temperature_bedroom.json';
const HUMIDITY_LIVINGROOM_URL = 'data/json_data/humidity_livingroom.json';
const HUMIDITY_BEDROOM_URL = 'data/json_data/humidity_bedroom.json';
const SENSOR_HISTORY_API_URL = 'api/sensor_data/history';
const UPDATE_INTERVAL = 60000; // Update every 60 seconds

// DOM elements
const tempLivingRoomElement = document.getElementById('temperature-livingroom-value');
const tempBedroomElement = document.getElementById('temperature-bedroom-value');
const humidityLivingRoomElement = document.getElementById('humidity-livingroom-value');
const humidityBedroomElement = document.getElementById('humidity-bedroom-value');
const lastUpdatedBedroomElement = document.getElementById('last-updated-bedroom');
const lastUpdatedLivingRoomElement = document.getElementById('last-updated-livingroom');
const plotlyChartDiv = document.getElementById('history-chart'); // Changed from canvas to div for Plotly

let currentTimeRange = '24h';

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

        lastUpdatedBedroomElement.textContent = `Last updated: ${formatDateTime(new Date(tempBedroom.timestamp))}`;
        lastUpdatedLivingRoomElement.textContent = `Last updated: ${formatDateTime(new Date(tempLivingRoom.timestamp))}`;
        
    } catch (error) {
        console.error('Error fetching sensor data:', error);
        displayError();
    }
}

// Function to fetch historical sensor data from SQLite database via API
async function fetchHistoricalSensorData(timeRange) {
    // if time range provided, update time range
    if (timeRange) {
        currentTimeRange = timeRange;
    }

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

function setupTimeRangeSelector() {
    // Find or create the time range selector element
    const timeRangeSelector = document.getElementById('time-range-selector');
    
    if (!timeRangeSelector) {
        console.error('Time range selector element not found in DOM');
        return;
    }

    timeRangeSelector.value = currentTimeRange;
    
    // Add event listener to the selector
    timeRangeSelector.addEventListener('change', async (event) => {
        const selectedRange = event.target.value; // e.g., '24h', '7d', '30d'
        
        // Fetch historical data with the selected time range
        const historicalData = await fetchHistoricalSensorData(selectedRange);
        
        if (historicalData) {
            // Update the chart with the new data
            const processedData = processHistoricalData(historicalData);
            createPlotlyChart(processedData);
        } else {
            console.error('Failed to fetch historical data for range:', selectedRange);
        }
    });
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
    lastUpdatedBedroomElement.textContent = 'Unable to fetch sensor data';
    lastUpdatedLivingRoomElement.textContent = 'Unable to fetch sensor data';
}

// Initialize data refresh
async function initDataRefresh() {
    // Fetch current data from JSON files
    await fetchAllCurrentSensorData();
    
    // Fetch historical data from SQLite database via API
    const historicalData = await fetchHistoricalSensorData(currentTimeRange);
    if (historicalData) {
        const processedData = processHistoricalData(historicalData);
        createPlotlyChart(processedData);
    }
    
    // Set up periodic refresh
    setInterval(async () => {
        await fetchAllCurrentSensorData();
        const historicalData = await fetchHistoricalSensorData(currentTimeRange);
        if (historicalData) {
            const processedData = processHistoricalData(historicalData);
            createPlotlyChart(processedData);
        }
    }, UPDATE_INTERVAL);
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
        timestamps: sortedTimestamps.map(ts => new Date(ts)),
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
    
    // Interpolate missing values to fill gaps
    interpolateMissingValues(processedData);
    
    return processedData;
}

// Function to interpolate missing values to prevent gaps in the chart
function interpolateMissingValues(data) {
    const sensorTypes = ['tempLivingRoom', 'tempBedroom', 'humidityLivingRoom', 'humidityBedroom'];
    
    sensorTypes.forEach(sensorType => {
        const values = data[sensorType];
        
        // Find segments with null values and interpolate them
        for (let i = 0; i < values.length; i++) {
            if (values[i] === null) {
                // Find the previous valid value
                let prevIndex = i - 1;
                while (prevIndex >= 0 && values[prevIndex] === null) {
                    prevIndex--;
                }
                
                // Find the next valid value
                let nextIndex = i + 1;
                while (nextIndex < values.length && values[nextIndex] === null) {
                    nextIndex++;
                }
                
                // If we have both a previous and next valid value, interpolate
                if (prevIndex >= 0 && nextIndex < values.length) {
                    const prevValue = values[prevIndex];
                    const nextValue = values[nextIndex];
                    const totalSteps = nextIndex - prevIndex;
                    const currentStep = i - prevIndex;
                    
                    // Linear interpolation
                    values[i] = prevValue + (nextValue - prevValue) * (currentStep / totalSteps);
                }
                // If we only have a previous value, use that
                else if (prevIndex >= 0) {
                    values[i] = values[prevIndex];
                }
                // If we only have a next value, use that
                else if (nextIndex < values.length) {
                    values[i] = values[nextIndex];
                }
                // If we have neither, leave as null (should be rare)
            }
        }
    });
}

function createPlotlyChart(data) {
    if (!plotlyChartDiv) {
        console.error('History chart element not found in DOM');
        return;
    }

    // Check if we have data
    if (data.timestamps.length === 0) {
        console.error('No data points to plot');
        return;
    }

    // Check if we're on mobile
    const isMobile = window.innerWidth < 768;

    const tempLivingRoomTrace = {
        x: data.timestamps,
        y: data.tempLivingRoom,
        name: 'Living Room Temp',
        type: 'scatter',
        line: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--plot-temp-1').trim(),
            width: 2
        },
        yaxis: 'y'
    };

    const tempBedroomTrace = {
        x: data.timestamps,
        y: data.tempBedroom,
        name: 'Bedroom Temp',
        type: 'scatter',
        line: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--plot-temp-2').trim(),
            width: 2
        },
        yaxis: 'y'
    };

    const humidityLivingRoomTrace = {
        x: data.timestamps,
        y: data.humidityLivingRoom,
        name: 'Living Room Humidity',
        type: 'scatter',
        line: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--plot-humid-1').trim(),
            width: 2
        },
        yaxis: 'y2'
    };

    const humidityBedroomTrace = {
        x: data.timestamps,
        y: data.humidityBedroom,
        name: 'Bedroom Humidity',
        type: 'scatter',
        line: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--plot-humid-2').trim(),
            width: 2
        },
        yaxis: 'y2'
    };
    
    // Calculate min/max for temperature and humidity
    const validTemps = [...data.tempLivingRoom, ...data.tempBedroom].filter(v => v !== null && v !== undefined);
    const validHumidities = [...data.humidityLivingRoom, ...data.humidityBedroom].filter(v => v !== null && v !== undefined);
    if (validTemps.length === 0 || validHumidities.length === 0) {
        console.error('Not enough valid data points to plot');
        return;
    }
    const minTemp = Math.max(0, Math.min(...validTemps) - 2);
    const maxTemp = Math.max(...validTemps) + 2;
    const minHumidity = Math.max(0, Math.min(...validHumidities) - 5);
    const maxHumidity = Math.min(100, Math.max(...validHumidities) + 5);
    
    // Create layout with dual y-axes
    const layout = {
        paper_bgcolor: getComputedStyle(document.documentElement).getPropertyValue('--plot-bg').trim(),
        plot_bgcolor: getComputedStyle(document.documentElement).getPropertyValue('--plot-bg').trim(),
        font: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--plot-text').trim()
        },
        xaxis: {
            title: 'Time',
            showgrid: true,
            gridcolor: getComputedStyle(document.documentElement).getPropertyValue('--plot-grid').trim(),
            tickcolor: getComputedStyle(document.documentElement).getPropertyValue('--plot-text').trim(),
            linecolor: getComputedStyle(document.documentElement).getPropertyValue('--plot-text').trim(),
            tickformat: '%H:%M'
        },
        yaxis: {
            title: {
                text: isMobile ? 'Temp (°F)' : 'Temperature (°F)',
                standoff: 10
            },
            showgrid: true,
            gridcolor: getComputedStyle(document.documentElement).getPropertyValue('--plot-grid').trim(),
            tickcolor: getComputedStyle(document.documentElement).getPropertyValue('--plot-text').trim(),
            linecolor: getComputedStyle(document.documentElement).getPropertyValue('--plot-text').trim(),
            side: 'left',
            range: [minTemp, maxTemp]
        },
        yaxis2: {
            title: {
                text: 'Humidity (%)',
                standoff: 10
            },
            showgrid: false,
            tickcolor: getComputedStyle(document.documentElement).getPropertyValue('--plot-text').trim(),
            linecolor: getComputedStyle(document.documentElement).getPropertyValue('--plot-text').trim(),
            side: 'right',
            overlaying: 'y',
            range: [minHumidity, maxHumidity]
        },
        legend: {
            // Move legend below chart on mobile
            orientation: isMobile ? 'h' : 'h',
            y: isMobile ? -0.2 : 1.12,
            x: 0.5,
            xanchor: 'center',
            itemsizing: 'constant',
            itemwidth: isMobile ? 1 : 20,
            symbolsize: isMobile ? 1 : 2,
            bgcolor: getComputedStyle(document.documentElement).getPropertyValue('--plot-bg').trim(),
            font: { 
                size: isMobile ? 10 : 12,
                color: getComputedStyle(document.documentElement).getPropertyValue('--plot-text').trim()
            }
        },
        margin: {
            l: isMobile ? 40 : 60,
            r: isMobile ? 40 : 60,
            t: isMobile ? 50 : 80,
            b: isMobile ? 80 : 60,
            pad: 4
        },
        showlegend: true,
        hovermode: 'closest',
        height: isMobile ? 300 : 400
    };
    
    // Create responsive config
    const config = {
        responsive: true,
        displayModeBar: !isMobile, // Hide mode bar on mobile to save space
        displaylogo: false,
        modeBarButtonsToRemove: ['lasso2d', 'select2d'],
        toImageButtonOptions: {
            format: 'png',
            filename: 'sensor_history',
            height: 500,
            width: 700,
            scale: 2
        }
    };
    
    // Update trace names for mobile
    if (isMobile) {
        tempLivingRoomTrace.name = 'LR Temp';
        tempBedroomTrace.name = 'BR Temp';
        humidityLivingRoomTrace.name = 'LR Humid';
        humidityBedroomTrace.name = 'BR Humid';
    }
    
    // Plot data
    Plotly.newPlot(
        plotlyChartDiv,
        [tempLivingRoomTrace, tempBedroomTrace, humidityLivingRoomTrace, humidityBedroomTrace],
        layout,
        config
    );

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        // Redraw the chart with current data to update colors
        const historicalData = await fetchHistoricalSensorData(currentTimeRange);
        if (historicalData) {
            const processedData = processHistoricalData(historicalData);
            createPlotlyChart(processedData);
        }
    });
    
    // Add a window resize handler to update the chart
    window.addEventListener('resize', function() {
        const newIsMobile = window.innerWidth < 768;
        // Only redraw if mobile state changed
        if (newIsMobile !== isMobile) {
            createPlotlyChart(data);
        }
    });
}

// Start the application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    initDataRefresh();
    setupTimeRangeSelector();
});