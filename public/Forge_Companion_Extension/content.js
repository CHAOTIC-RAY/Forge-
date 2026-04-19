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
    window.postMessage({ type: "FORGE_GET_CALENDAR", workspaceId: request.workspaceId }, "*");
    
    const listener = (event) => {
      if (event.source !== window) return;
      if (event.data && event.data.type === "FORGE_CALENDAR_DATA") {
        sendResponse({ posts: event.data.data });
        window.removeEventListener("message", listener);
      }
    };
    
    window.addEventListener("message", listener);
    
    setTimeout(() => {
        window.removeEventListener("message", listener);
        sendResponse({ error: "Timeout fetching calendar" });
    }, 5000);
    
    return true;
  }

  if (request.action === "requestUserState") {
    console.log("[Forge Extension] Requesting user state from page...");
    window.postMessage({ type: "FORGE_GET_USER_STATE" }, "*");
    
    const listener = (event) => {
      // Remove sensitive source check that might fail on some subdomains
      if (event.data && event.data.type === "FORGE_USER_STATE_DATA") {
        console.log("[Forge Extension] Received user state:", event.data.data);
        sendResponse(event.data.data);
        window.removeEventListener("message", listener);
      }
    };
    
    window.addEventListener("message", listener);
    
    setTimeout(() => {
        window.removeEventListener("message", listener);
        // If we timeout, we send at least an empty object so popup doesn't hang
        sendResponse({ error: "Timeout fetching user state. Please refresh the Forge App tab." });
    }, 4000);
    
    return true;
  }
});
