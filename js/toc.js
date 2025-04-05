
function createTableOfContents() {
    // Select elements only once and cache them
    const nav = document.querySelector('nav');
    const headerContent = document.querySelector('.header-content');
    const headers = document.querySelectorAll('h2, h3');
    
    // Exit early if there are no headers or navigation
    if (!headers.length || !nav || !headerContent) return;

    if (nav && !nav.parentElement.classList.contains('primary-nav')) {
        const primaryNav = document.createElement('div');
        primaryNav.className = 'primary-nav';
        nav.parentNode.insertBefore(primaryNav, nav);
        primaryNav.appendChild(nav);
    }
    
    // Create DOM elements with document fragments for better performance
    const fragment = document.createDocumentFragment();
    const dropdown = document.createElement('div');
    const button = document.createElement('button');
    const dropdownContent = document.createElement('div');
    const tocList = document.createElement('ul');
    
    // Set attributes and content
    dropdown.className = 'dropdown toc-dropdown';
    button.className = 'dropdown-button';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', 'toc-dropdown');
    button.innerHTML = '<svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">' +
    '<circle cx="4" cy="8" r="1.5" fill="currentColor" />' +
    '<line x1="8" y1="8" x2="20" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round" />' +
    '<circle cx="4" cy="14" r="1.5" fill="currentColor" />' +
    '<line x1="8" y1="14" x2="20" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />' +
    '<circle cx="4" cy="20" r="1.5" fill="currentColor" />' +
    '<line x1="8" y1="20" x2="20" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round" />' +
    '</svg>';
    
    dropdownContent.className = 'dropdown-content';
    dropdownContent.id = 'toc-dropdown';
    tocList.className = 'toc-list';
    
    headers.forEach((header, index) => {
        // Create ID if none exists
        if (!header.id) {
            const slug = header.textContent
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-');
            header.id = `section-${slug}-${index}`;
        }
        
        // Create a flat list item for each header
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#${header.id}`;
        a.textContent = header.textContent;
        
        // Add class based on header level for styling
        if (header.tagName === 'H2') {
            li.className = 'toc-item toc-h2';
        } else {
            li.className = 'toc-item toc-h3';
        }
        
        li.appendChild(a);
        tocList.appendChild(li);
    });
    
    // Append elements to DOM in an efficient way
    dropdownContent.appendChild(tocList);
    dropdown.appendChild(button);
    dropdown.appendChild(dropdownContent);
    fragment.appendChild(dropdown);

    headerContent.appendChild(fragment);
    
    // Event handling with debouncing for better performance
    let timeout;
    button.addEventListener('click', (e) => {
        e.stopPropagation();
        const isExpanded = dropdownContent.classList.contains('show');
        dropdownContent.classList.toggle('show');
        button.setAttribute('aria-expanded', !isExpanded);
    });
    
    // Close dropdown on outside click
    document.addEventListener('click', () => {
        dropdownContent.classList.remove('show');
        button.setAttribute('aria-expanded', 'false');
    });
    
    // Close dropdown on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && dropdownContent.classList.contains('show')) {
            dropdownContent.classList.remove('show');
            button.setAttribute('aria-expanded', 'false');
            button.focus();
        }
    });
    
    // Scroll spy with Intersection Observer
    const observerOptions = {
        rootMargin: '-100px 0px -66%',
        threshold: 0
    };
    
    // Debounced function to update active links
    function updateActiveLinks(id) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            const links = dropdownContent.querySelectorAll('a');
            links.forEach(a => a.classList.remove('active'));
            
            const activeLink = dropdownContent.querySelector(`a[href="#${id}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }
        }, 100);
    }
    
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                updateActiveLinks(entry.target.id);
            }
        });
    }, observerOptions);
    
    headers.forEach(header => observer.observe(header));
    
    // Update active link on scroll
    window.addEventListener('scroll', () => {
        // Find which section is currently visible
        let currentSection = null;
        let maxVisibility = 0;
        
        headers.forEach(header => {
            const rect = header.getBoundingClientRect();
            const visibility = 
            Math.min(rect.bottom, window.innerHeight) - 
            Math.max(rect.top, 0);
            
            if (visibility > maxVisibility) {
            maxVisibility = visibility;
            currentSection = header.id;
            }
        });
        
        if (currentSection) {
            updateActiveLinks(currentSection);
        }
    }, { passive: true });
}
  
// Initialize TOC based on content type
function initializeTableOfContents() {
    // Check if we're on a page with markdown content
    const markdownContainer = document.getElementById("markdown-content");
    
    if (markdownContainer) {
        // If markdown content exists, wait for it to be loaded
        document.addEventListener('markdownLoaded', createTableOfContents);
        
        // Fallback in case the markdownLoaded event never fires
        setTimeout(function() {
            if (!document.querySelector('.dropdown')) {
                createTableOfContents();
            }
        }, 100); // 1 second timeout as fallback
    } else {
        // No markdown content, create TOC immediately
        createTableOfContents();
    }
}

// Call the initialization function when the DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTableOfContents);
} else {
    initializeTableOfContents();
}