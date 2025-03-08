async function loadMarkdown() {
    const markdownContainer = document.getElementById("markdown-content");
    const file = markdownContainer.getAttribute("data-markdown") || "info.md"; // Default to info.md

    try {
        const response = await fetch(file);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const text = await response.text();
        const converter = new showdown.Converter();
        markdownContainer.innerHTML = converter.makeHtml(text);

        addCopyButtons();
        generateTableOfContents();
    } catch (error) {
        console.error("Error loading Markdown file:", error);
        markdownContainer.innerHTML = "<p>Failed to load content.</p>";
    }
}

// Add copy buttons to code blocks
function addCopyButtons() {
    document.querySelectorAll("pre code").forEach((codeBlock) => {
        const pre = codeBlock.parentElement;
        const button = document.createElement("button");
        button.innerText = "Copy";
        button.className = "copy-button";

        button.addEventListener("click", () => {
            navigator.clipboard.writeText(codeBlock.innerText).then(() => {
                button.innerText = "Copied!";
                setTimeout(() => (button.innerText = "Copy"), 2000);
            });
        });

        pre.style.position = "relative";  // Ensure button is positioned correctly
        pre.appendChild(button);
    });
}

// Generate Table of Contents (ToC)
function generateTableOfContents() {
    const tocContainer = document.getElementById("table-of-contents");
    if (!tocContainer) return;

    const headers = document.querySelectorAll("#markdown-content h2, #markdown-content h3");
    if (headers.length === 0) return;

    const ul = document.createElement("ul");
    headers.forEach((header) => {
        const id = header.innerText.toLowerCase().replace(/\s+/g, "-");
        header.id = id;

        const li = document.createElement("li");
        li.innerHTML = `<a href="#${id}">${header.innerText}</a>`;
        ul.appendChild(li);
    });

    tocContainer.appendChild(ul);
}

// Automatically load markdown on page load
document.addEventListener("DOMContentLoaded", loadMarkdown);
