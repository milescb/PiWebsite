async function loadMarkdown() {
    const markdownContainer = document.getElementById("markdown-content");
    const file = markdownContainer.getAttribute("data-markdown") || "info.md"; // Default to info.md

    try {
        const response = await fetch(file);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const text = await response.text();
        const converter = new showdown.Converter();
        markdownContainer.innerHTML = converter.makeHtml(text);
    } catch (error) {
        console.error("Error loading Markdown file:", error);
        markdownContainer.innerHTML = "<p>Failed to load content.</p>";
    }
}

// Automatically load the specified Markdown file when the page is ready
document.addEventListener("DOMContentLoaded", loadMarkdown);
