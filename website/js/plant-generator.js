/**
 * Plant page generator - Creates plant cards dynamically from configuration
 */

async function generatePlantCards() {
    try {
        // Load configuration
        const response = await fetch('../config/plants-config.json');
        if (!response.ok) {
            throw new Error(`Failed to load config: ${response.status}`);
        }
        const config = await response.json();
        
        // Find the main element where plant cards should be inserted
        const main = document.querySelector('main');
        if (!main) {
            throw new Error('Main element not found');
        }
        
        // Group plants by location
        const plantsByLocation = {};
        config.plants.forEach(plant => {
            if (!plantsByLocation[plant.location]) {
                plantsByLocation[plant.location] = [];
            }
            plantsByLocation[plant.location].push(plant);
        });
        
        // Clear existing content after the introduction paragraph
        const intro = main.querySelector('p');
        if (intro) {
            // Remove everything after the intro paragraph
            let nextElement = intro.nextElementSibling;
            while (nextElement) {
                const toRemove = nextElement;
                nextElement = nextElement.nextElementSibling;
                toRemove.remove();
            }
        }
        
        // Generate HTML for each location
        Object.entries(plantsByLocation).forEach(([location, plants]) => {
            // Add location header
            const locationHeader = document.createElement('h2');
            locationHeader.textContent = location;
            main.appendChild(locationHeader);
            
            // Add plant cards for this location
            plants.forEach(plant => {
                const plantCard = createPlantCard(plant);
                main.appendChild(plantCard);
            });
        });
        
        // Add footer
        const footer = document.createElement('footer');
        footer.innerHTML = '<p>&copy; <span id="copyright-year"></span> Miles Cochran-Branson</p>';
        main.parentElement.appendChild(footer);
        
        return config;
    } catch (error) {
        console.error('Error generating plant cards:', error);
        throw error;
    }
}

function createPlantCard(plant) {
    // Create the main card container
    const card = document.createElement('div');
    card.className = 'card';
    
    // Create hidden heading for accessibility
    const heading = document.createElement('h3');
    heading.id = plant.id.replace('_', '-');
    heading.className = 'visually-hidden';
    heading.textContent = plant.commonName;
    
    // Create card HTML
    card.innerHTML = `
        <!-- Left Section: Image with Subtitle -->
        <div class="section image-section">
            <div class="image-container">
                <img src="${plant.image}" alt="${plant.commonName}">
            </div>
            <div class="common-name">${plant.commonName}</div>
            <div class="scientific-name">${plant.scientificName}</div>
        </div>
        <!-- Middle Section: Button and Text -->
        <div class="moisture-card">
            <div class="range-reading">
                <span class="range-label">Water below:</span>
                <span class="range-value">${plant.waterThreshold}</span>
                <span class="sensor-unit">%</span>
            </div>
            <div class="sensor-reading">
                <span class="sensor-label">Moisture:</span>
                <span id="${plant.id}" class="sensor-value">--</span>
                <span class="sensor-unit">%</span>
            </div>
            <div id="last-updated-${plant.id}" class="last-updated">Last updated: --</div>
        </div>
        <!-- Right Section: Plot -->
        <div class="section plot-section">
            <div id="plot-${plant.id}" class="plot"></div>
        </div>
    `;
    
    // Create a container div that includes both the heading and card
    const container = document.createElement('div');
    container.appendChild(heading);
    container.appendChild(card);
    
    return container;
}

// Function to be called if you want to use dynamic generation
async function initializeDynamicPlants() {
    try {
        // Generate plant cards from config
        const config = await generatePlantCards();
        
        // Update global variables for moisture-display.js
        if (window.loadPlantsConfig) {
            await window.loadPlantsConfig();
        }
        
        console.log(`Generated ${config.plants.length} plant cards from configuration`);
    } catch (error) {
        console.error('Failed to initialize dynamic plants:', error);
    }
}

// Export functions for use in other modules
window.generatePlantCards = generatePlantCards;
window.initializeDynamicPlants = initializeDynamicPlants;
