document.getElementById('clipBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const status = document.getElementById('status');
  status.innerText = "Clipping...";

  chrome.tabs.sendMessage(tab.id, { action: "scrape" }, (response) => {
    if (response) {
      // Send to Forge App
      // We look for a Forge tab
      chrome.tabs.query({ url: "https://ais-dev-lkdab6rylgfzl4qvouhnor-22311204047.asia-southeast1.run.app/*" }, (tabs) => {
        if (tabs.length > 0) {
          chrome.tabs.sendMessage(tabs[0].id, { action: "addNote", data: response });
          status.innerText = "Added to Forge!";
        } else {
          status.innerText = "Forge app not open. Please open it first.";
        }
      });
    }
  });
});
