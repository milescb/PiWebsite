// Configuration will be loaded from JSON file
let SENSOR_HISTORY_API_URL = '../api/sensor_data/history';
let UPDATE_INTERVAL = 60000;
let PLANTS = [];

// Load configuration from JSON file
async function loadPlantsConfig() {
    try {
        const response = await fetch('../config/plants-config.json');
        if (!response.ok) {
            throw new Error(`Failed to load config: ${response.status}`);
        }
        const config = await response.json();
        
        // Update global variables from config
        SENSOR_HISTORY_API_URL = config.apiConfig.sensorHistoryUrl;
        UPDATE_INTERVAL = config.apiConfig.updateInterval;
        PLANTS = config.plants;
        
        return config;
    } catch (error) {
        console.error('Error loading plants configuration:', error);
        // Fallback to empty array if config fails to load
        PLANTS = [];
        throw error;
    }
}

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
            document.getElementById(plant.id).textContent = Math.round(data.moisture);
            console.log(`Fetched data for ${plant.name}: ${data.moisture} at ${formatDateTime(new Date(data.timestamp))}`);
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
    
    // Refresh the chart to show the new watering marker
    const plotContainer = document.getElementById(`plot-${plant.id}`);
    if (plotContainer) {
        fetchMoistureHistory(plant.id).then(data => {
            if (data) {
                data.plantId = plant.id;
                drawMoistureChart(plotContainer, data, plant.name);
            }
        });
    }
}

async function fetchMoistureHistory(plantId) {
    try {
        // Always request 7-day data
        const response = await fetch(`${SENSOR_HISTORY_API_URL}?sensor_type=moisture&location=${plantId}&range=14d`);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status}`);
        }
        const data = await response.json();
        return processHistoricalData(data, plantId);
    } catch (error) {
        console.error(`Error fetching historical data for ${plantId}:`, error);
        return null;
    }
}

function processHistoricalData(data, plantId) {
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
        moisture: [],
        plantId: plantId
    };

    sortedTimestamps.forEach(timestamp => {
        const entry = dataByTimestamp.get(timestamp);
        processedData.moisture.push(entry.moisturePlant);
    });

    return processedData;
}

function drawMoistureChart(container, data, plantName) {
    // Clear any existing content
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    
    if (!data || !data.timestamps || data.timestamps.length === 0) {
        // Show no data message
        const noDataDiv = document.createElement('div');
        noDataDiv.style.display = 'flex';
        noDataDiv.style.justifyContent = 'center';
        noDataDiv.style.alignItems = 'center';
        noDataDiv.style.height = '100%';
        noDataDiv.style.color = '#666';
        noDataDiv.textContent = 'No moisture data available';
        container.appendChild(noDataDiv);
        return;
    }
    
    // Process data for chart
    const timestamps = data.timestamps.map(ts => new Date(ts));
    const moisture = data.moisture;
    
    // Filter out null values for min/max calculation
    const validMoisture = moisture.filter(v => v !== null);
    if (validMoisture.length === 0) {
        const noDataDiv = document.createElement('div');
        noDataDiv.style.display = 'flex';
        noDataDiv.style.justifyContent = 'center';
        noDataDiv.style.alignItems = 'center';
        noDataDiv.style.height = '100%';
        noDataDiv.style.color = '#666';
        noDataDiv.textContent = 'No valid moisture data';
        container.appendChild(noDataDiv);
        return;
    }
    
    // Find min and max values for scaling
    let minMoisture = Math.min(...validMoisture);
    let maxMoisture = Math.max(...validMoisture);
    
    // Add padding to values
    const moisturePadding = Math.max(5, (maxMoisture - minMoisture) * 0.1);
    minMoisture = Math.max(0, minMoisture - moisturePadding);
    maxMoisture = Math.min(100, maxMoisture + moisturePadding);
    
   // Get theme colors from CSS variables
    const style = getComputedStyle(document.documentElement);
    const plotBg = style.getPropertyValue('--chart-bg').trim();
    const textColor = style.getPropertyValue('--text-color').trim();
    const accentColor = style.getPropertyValue('--accent-color').trim();
    const gridColor = style.getPropertyValue('--border-color').trim();
    
    // Create main moisture trace
    const moistureTrace = {
        x: timestamps,
        y: moisture,
        type: 'scatter',
        mode: 'lines',
        name: 'Moisture',
        line: {
            color: accentColor,
            width: 2
        },
        connectgaps: true
    };
    
    // Create layout with theme-aware colors
    const layout = {
        paper_bgcolor: plotBg,
        plot_bgcolor: plotBg,
        font: {
            color: textColor
        },
        xaxis: {
            tickformat: '%m/%d',
            hoverformat: '%b %d, %Y %H:%M',
            gridcolor: gridColor,
            linecolor: gridColor,
            tickcolor: textColor,
            tickfont: {
                color: textColor
            }
        },
        yaxis: {
            title: {
                text: 'Moisture (%)',
                font: {
                    size: 14,
                    color: textColor
                },
                standoff: 15
            },
            range: [minMoisture, maxMoisture],
            gridcolor: gridColor,
            linecolor: gridColor,
            tickcolor: textColor,
            tickfont: {
                color: textColor
            }
        },
        margin: {
            l: 60,
            r: 30,
            t: 50,
            b: 50
        },
        shapes: [],
        annotations: []
    };
    
    // Define configuration with responsive behavior
    const config = {
        responsive: true,
        displayModeBar: false // Hide the modebar for cleaner look
    };
    
    // Create the plot
    Plotly.newPlot(container, [moistureTrace], layout, config);
}

function initializePlantsData() {
    PLANTS.forEach(plant => {
        // Fetch initial current data
        fetchPlantData(plant);

        // Add theme change listener
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            PLANTS.forEach(plant => {
                const plotElement = document.getElementById(`plot-${plant.id}`);
                if (plotElement) {
                    fetchMoistureHistory(plant.id).then(data => {
                        if (data) {
                            data.plantId = plant.id;
                            drawMoistureChart(plotElement, data, plant.name);
                        }
                    });
                }
            });
        });
        
        // Update canvas elements to divs for Plotly
        const plotCanvas = document.getElementById(`plot-${plant.id}`);
        if (plotCanvas) {
            // If it's still a canvas, replace it with a div
            if (plotCanvas.tagName === 'CANVAS') {
                const parentElement = plotCanvas.parentElement;
                const plotDiv = document.createElement('div');
                plotDiv.id = `plot-${plant.id}`;
                plotDiv.style.width = '100%';
                plotDiv.style.height = '300px'; // Set appropriate height
                parentElement.replaceChild(plotDiv, plotCanvas);
                
                // Fetch and draw historical data on the new div
                fetchMoistureHistory(plant.id).then(data => {
                    if (data) {
                        data.plantId = plant.id;
                        drawMoistureChart(plotDiv, data, plant.name);
                    }
                });
            } else {
                // It's already a div, just use it
                fetchMoistureHistory(plant.id).then(data => {
                    if (data) {
                        data.plantId = plant.id;
                        drawMoistureChart(plotCanvas, data, plant.name);
                    }
                });
            }
        }
    });
    
    // Set up periodic refresh for all plants
    setInterval(() => {
        PLANTS.forEach(plant => {
            // Update current data
            fetchPlantData(plant);
            
            // Update historical chart
            const plotElement = document.getElementById(`plot-${plant.id}`);
            if (plotElement) {
                fetchMoistureHistory(plant.id).then(data => {
                    if (data) {
                        data.plantId = plant.id;
                        drawMoistureChart(plotElement, data, plant.name);
                    }
                });
            }
        });
    }, UPDATE_INTERVAL);
}

async function initializeApp() {
    try {
        // Load configuration first (if not already loaded)
        if (PLANTS.length === 0) {
            await loadPlantsConfig();
            console.log(`Loaded ${PLANTS.length} plants from configuration`);
        }
        
        // Initialize plants data after config is loaded
        initializePlantsData();
    } catch (error) {
        console.error('Failed to initialize app:', error);
        // You could show an error message to the user here
    }
}

// Make functions available globally for dynamic loading
window.loadPlantsConfig = loadPlantsConfig;
window.initializeApp = initializeApp;

document.addEventListener('DOMContentLoaded', initializeApp);
