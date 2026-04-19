document.addEventListener('DOMContentLoaded', () => {
  // --- TABS LOGIC ---
  const tabBtns = document.querySelectorAll('.tab-btn');
  const views = document.querySelectorAll('.view');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      views.forEach(v => v.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(btn.getAttribute('data-target')).classList.add('active');
    });
  });

  // --- SETTINGS / URL ---
  const forgeUrlInput = document.getElementById('forgeUrl');
  const connectBtn = document.getElementById('connectBtn');
  const loginStatus = document.getElementById('loginStatus');

  chrome.storage.local.get(['forgeUrl'], (result) => {
    if (result.forgeUrl) {
      forgeUrlInput.value = result.forgeUrl;
    }
  });

  const setStatus = (element, text) => {
    if(!element) return;
    element.innerText = text;
    setTimeout(() => { element.innerText = ""; }, 4000);
  };

  connectBtn.addEventListener('click', () => {
    const url = forgeUrlInput.value.trim();
    if (!url) return setStatus(loginStatus, "Please enter a valid URL");
    chrome.storage.local.set({ forgeUrl: url }, () => {
      setStatus(loginStatus, "Configuration Saved!");
    });
  });

  const getForgePattern = async () => {
    return new Promise((resolve) => {
      chrome.storage.local.get(['forgeUrl'], (res) => {
        resolve(res.forgeUrl || "https://ais-dev-lkdab6rylgfzl4qvouhnor-22311204047.asia-southeast1.run.app/*");
      });
    });
  };

  // --- CAPTURE / SCRAPE ---
  const captureStatus = document.getElementById('captureStatus');
  const clipBasicBtn = document.getElementById('clipBasicBtn');
  const clipFirecrawlBtn = document.getElementById('clipFirecrawlBtn');
  const quickNoteBtn = document.getElementById('quickNoteBtn');
  const quickNoteText = document.getElementById('quickNoteText');

  const sendToForge = async (action, data, element) => {
    const urlPattern = await getForgePattern();
    chrome.tabs.query({ url: urlPattern }, (tabs) => {
      if (tabs && tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, { action: action, data: data });
        setStatus(element, "Sent to Forge Successfully!");
      } else {
        setStatus(element, "Forge app not open. Please open it first.");
      }
    });
  };

  clipBasicBtn.addEventListener('click', async () => {
    setStatus(captureStatus, "Clipping DOM...");
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return setStatus(captureStatus, "Cannot clip this tab");

    chrome.tabs.sendMessage(tab.id, { action: "scrape" }, (response) => {
      if (chrome.runtime.lastError) return setStatus(captureStatus, "Cannot clip this type of page");
      if (response) sendToForge("addNote", response, captureStatus);
    });
  });

  clipFirecrawlBtn.addEventListener('click', async () => {
    setStatus(captureStatus, "Sending via Firecrawl...");
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    try {
      const urlPattern = await getForgePattern();
      const baseUrl = urlPattern.replace('/*', '');
      const response = await fetch(`${baseUrl}/api/firecrawl-scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: tab.url, apiKey: "" })
      });
      const data = await response.json();
      if(data.success && data.data) {
        sendToForge("addNote", { title: `Firecrawl: ${tab.title}`, url: tab.url, content: data.data.markdown }, captureStatus);
      } else {
        setStatus(captureStatus, "Firecrawl failed.");
      }
    } catch(e) {
      setStatus(captureStatus, "Error contacting Forge API.");
    }
  });

  quickNoteBtn.addEventListener('click', () => {
    const text = quickNoteText.value.trim();
    if (!text) return setStatus(captureStatus, "Please enter a note");
    sendToForge("quickNote", text, captureStatus);
    quickNoteText.value = "";
  });

  // --- SCREENSHOTS ---
  const screenshotVisibleBtn = document.getElementById('screenshotVisibleBtn');
  const screenshotFullBtn = document.getElementById('screenshotFullBtn');

  // Used by chat
  let pendingImageBase64 = null;
  const chatImagePreview = document.getElementById('chatImagePreview');

  const grabVisibleTab = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return new Promise((resolve) => {
      chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' }, (dataUrl) => {
        resolve(dataUrl);
      });
    });
  };

  const grabFullPage = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return new Promise((resolve, reject) => {
      chrome.debugger.attach({tabId: tab.id}, "1.3", () => {
        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError.message);
        chrome.debugger.sendCommand({tabId: tab.id}, "Page.captureScreenshot", {
          format: "png",
          captureBeyondViewport: true
        }, (result) => {
          chrome.debugger.detach({tabId: tab.id});
          if (chrome.runtime.lastError) return reject(chrome.runtime.lastError.message);
          resolve("data:image/png;base64," + result.data);
        });
      });
    });
  };

  const handleScreenshot = async (grabFunc, btnText, btnElement) => {
    btnElement.innerText = "Capturing...";
    try {
      const b64 = await grabFunc();
      pendingImageBase64 = b64;
      chatImagePreview.src = b64;
      chatImagePreview.style.display = 'block';
      setStatus(captureStatus, "Screenshot queued for Chat!");
      // switch to chat tab
      document.querySelector('[data-target="chatView"]').click();
    } catch(e) {
      setStatus(captureStatus, "Screenshot failed: " + e);
    }
    btnElement.innerText = btnText;
  };

  screenshotVisibleBtn.addEventListener('click', () => handleScreenshot(grabVisibleTab, "Capture Visible Area", screenshotVisibleBtn));
  screenshotFullBtn.addEventListener('click', () => handleScreenshot(grabFullPage, "Capture Full Page (DevTools)", screenshotFullBtn));

  // --- CHAT LOGIC ---
  const chatInput = document.getElementById('chatInput');
  const chatAttachBtn = document.getElementById('chatAttachBtn');
  const chatSendBtn = document.getElementById('chatSendBtn');
  const chatHistory = document.getElementById('chatHistory');
  
  const appendMsg = (text, type) => {
    const div = document.createElement('div');
    div.className = `chat-msg ${type}`;
    div.innerText = text;
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  };

  chatAttachBtn.addEventListener('click', async () => {
    const prevBtnTxt = chatAttachBtn.innerText;
    chatAttachBtn.innerText = "Snapping...";
    try {
      const b64 = await grabVisibleTab();
      pendingImageBase64 = b64;
      chatImagePreview.src = b64;
      chatImagePreview.style.display = 'block';
    } catch(e) {}
    chatAttachBtn.innerText = prevBtnTxt;
  });

  chatSendBtn.addEventListener('click', async () => {
    const text = chatInput.value.trim();
    if(!text && !pendingImageBase64) return;
    
    appendMsg(text || "[Screenshot Attached]", "user");
    chatInput.value = "";
    
    chatSendBtn.innerText = "Thinking...";
    chatSendBtn.disabled = true;

    try {
      const urlPattern = await getForgePattern();
      const baseUrl = urlPattern.replace('/*', '');
      
      const contents = [{
        role: "user",
        parts: [{ text: text || "Analyze this image" }]
      }];

      if (pendingImageBase64) {
        contents[0].parts.unshift({
          inlineData: {
            mimeType: "image/png",
            data: pendingImageBase64.split(',')[1]
          }
        });
        // Clear pending image
        pendingImageBase64 = null;
        chatImagePreview.style.display = 'none';
        chatImagePreview.src = "";
      }

      const res = await fetch(`${baseUrl}/api/gemini/v1beta/models/gemini-2.5-flash:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      });
      
      const data = await res.json();
      if(data.error) throw new Error(data.error.message || data.error);
      
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
      appendMsg(reply, "ai");
    } catch(e) {
      appendMsg("Error: " + e.message, "ai");
    }

    chatSendBtn.innerText = "Send AI";
    chatSendBtn.disabled = false;
  });

  // --- CALENDAR LOGIC ---
  const refreshCalendarBtn = document.getElementById('refreshCalendarBtn');
  const calendarList = document.getElementById('calendarList');

  refreshCalendarBtn.addEventListener('click', async () => {
    refreshCalendarBtn.innerText = "Loading...";
    const urlPattern = await getForgePattern();
    
    chrome.tabs.query({ url: urlPattern }, (tabs) => {
      if (tabs && tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "requestCalendar" }, (response) => {
          if (response && response.posts) {
            calendarList.innerHTML = "";
            if (response.posts.length === 0) {
              calendarList.innerHTML = '<div class="status">No upcoming posts found.</div>';
            }
            response.posts.forEach(post => {
              const div = document.createElement('div');
              div.className = 'calendar-item';
              div.innerHTML = `
                <div class="calendar-item-title">${post.title || (post.content && post.content.substring(0,20)) || 'Empty Post'}</div>
                <div class="calendar-item-date">${new Date(post.date).toLocaleDateString()} - ${post.status}</div>
              `;
              calendarList.appendChild(div);
            });
          } else {
            calendarList.innerHTML = '<div class="status">Error fetching calendar data. Response empty or no posts array.</div>';
          }
          refreshCalendarBtn.innerText = "Refresh Calendar";
        });
      } else {
        calendarList.innerHTML = '<div class="status">Forge App is not open. Navigate to the Config tab to check your Forge URL.</div>';
        refreshCalendarBtn.innerText = "Refresh Calendar";
      }
    });
  });

});
