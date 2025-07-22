async function loadMarkdown() {
    const markdownContainer = document.getElementById("markdown-content");
    const file = markdownContainer.getAttribute("data-markdown") || "info.md"; // Default to info.md
    try {
        const response = await fetch(file);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const text = await response.text();
        
        // Configure showdown with GitHub flavored markdown
        const converter = new showdown.Converter({
            ghCodeBlocks: true,
            tables: true,
            tasklists: true,
            strikethrough: true,
            emoji: true
        });
        
        // Set GitHub flavor explicitly
        converter.setFlavor('github');
        
        // Convert markdown to HTML
        markdownContainer.innerHTML = converter.makeHtml(text);
        
        // Process code blocks to ensure proper language classes
        document.querySelectorAll('pre code').forEach((block) => {
            // Check if there's a class indicating language
            const classes = Array.from(block.classList);
            const languageClass = classes.find(c => c.startsWith('language-'));
            
            if (!languageClass) {
                // Try to identify language from content if no class is present
                const content = block.textContent.toLowerCase();
                
                if (content.includes('import ') || 
                   content.includes('def ') || 
                   content.includes('print(') || 
                   content.includes('python')) {
                    block.classList.add('language-python');
                } else if (content.includes('function') || 
                          content.includes('const ') || 
                          content.includes('var ') || 
                          content.includes('let ')) {
                    block.classList.add('language-javascript');
                } else if (content.includes('<div') || 
                          content.includes('</div>') || 
                          content.includes('<html')) {
                    block.classList.add('language-html');
                } else if (content.includes('select ') || 
                          content.includes('from ') || 
                          content.includes('where ')) {
                    block.classList.add('language-sql');
                } else {
                    block.classList.add('language-plaintext');
                }
            }
            
            // Add a line to help with Prism detection
            if (!block.parentElement.classList.contains('language-marked')) {
                block.parentElement.classList.add('language-marked');
            }
        });
        
        // Apply Prism highlighting
        if (typeof Prism !== 'undefined') {
            Prism.highlightAll();
        }
        
        addCopyButtons();
        addHeaderIds();
    } catch (error) {
        console.error("Error loading Markdown file:", error);
        markdownContainer.innerHTML = "<p>Failed to load content.</p>";
    }
}

// Add IDs to all headers for TOC navigation
function addHeaderIds() {
    const headers = document.querySelectorAll("#markdown-content h2, #markdown-content h3");
    
    headers.forEach((header, index) => {
        // Create a slug-friendly ID from the header text
        const id = header.textContent
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^\w\-]+/g, "") // Remove non-word chars
            .replace(/\-\-+/g, "-"); // Replace multiple hyphens with single hyphen
        
        header.id = id;
    });
}

// Add copy buttons to code blocks that match GitHub's style
function addCopyButtons() {
    document.querySelectorAll("pre code").forEach((codeBlock) => {
        const pre = codeBlock.parentElement;
        const button = document.createElement("button");
        button.innerText = "Copy";
        button.className = "copy-button";
        
        // Make sure the pre element has proper positioning
        pre.style.position = "relative";
        
        // Ensure GitHub-like background color using the theme variable
        pre.style.backgroundColor = "var(--code-bg)";
        
        button.addEventListener("click", () => {
            navigator.clipboard.writeText(codeBlock.textContent)
                .then(() => {
                    button.innerText = "Copied!";
                    setTimeout(() => (button.innerText = "Copy"), 2000);
                })
                .catch(err => {
                    console.error('Failed to copy: ', err);
                    button.innerText = "Error!";
                    setTimeout(() => (button.innerText = "Copy"), 2000);
                });
        });
        
        pre.appendChild(button);
    });
}

// Automatically load markdown on page load
document.addEventListener("DOMContentLoaded", loadMarkdown);