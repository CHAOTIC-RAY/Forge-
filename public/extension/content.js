// Forge Web Clipper - Content Script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrape") {
    const data = {
      title: document.title,
      url: window.location.href,
      content: document.body.innerText.substring(0, 5000), // Limit content
      html: document.documentElement.outerHTML.substring(0, 10000)
    };
    sendResponse(data);
  }

  if (request.action === "addNote") {
    // Pass message to the Forge web page
    window.postMessage({ type: "FORGE_ADD_NOTE", data: request.data }, "*");
  }
});
