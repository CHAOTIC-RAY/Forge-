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

  if (request.action === "quickNote") {
    window.postMessage({ type: "FORGE_QUICK_NOTE", data: request.data }, "*");
  }

  if (request.action === "requestCalendar") {
    window.postMessage({ type: "FORGE_GET_CALENDAR" }, "*");
    
    const listener = (event) => {
      if (event.source !== window) return;
      if (event.data && event.data.type === "FORGE_CALENDAR_DATA") {
        sendResponse({ posts: event.data.data });
        window.removeEventListener("message", listener);
      }
    };
    
    window.addEventListener("message", listener);
    
    // Timeout after 5 seconds to prevent hanging
    setTimeout(() => {
        window.removeEventListener("message", listener);
        sendResponse({ error: "Timeout fetching calendar" });
    }, 5000);
    
    return true; // asynchronous response
  }
});
