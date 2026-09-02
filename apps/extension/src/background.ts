// Background Service Worker for Manifest V3 Extension
(() => {
  const BACKEND_URL = 'http://localhost:3001';

  // Setup Context Menus upon installation
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: 'add_page_to_wishlist',
      title: 'Add to Everything Wishlist',
      contexts: ['page', 'selection', 'image', 'link']
    });
  });

  // Context Menu Click Listener
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'add_page_to_wishlist' && tab?.id) {
      await processAndSaveTab(tab.id, {
        selectedText: info.selectionText,
        imageUrl: info.mediaType === 'image' ? info.srcUrl : undefined,
        linkUrl: info.linkUrl
      });
    }
  });

  // Keyboard Shortcut Listener
  chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'add_to_wishlist') {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await processAndSaveTab(tab.id);
      }
    }
  });

  // Core helper to process page and send to backend
  async function processAndSaveTab(tabId: number, overrides: { selectedText?: string; imageUrl?: string; linkUrl?: string } = {}) {
    try {
      // 1. Send message to content script to extract page details
      let response: any = null;
      try {
        response = await Promise.race([
          chrome.tabs.sendMessage(tabId, { action: 'extract_page_info' }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1200))
        ]);
      } catch {
        try {
          if (chrome.scripting) {
            await chrome.scripting.executeScript({
              target: { tabId },
              files: ['dist/content.js']
            });
            await new Promise((resolve) => setTimeout(resolve, 100));
            response = await chrome.tabs.sendMessage(tabId, { action: 'extract_page_info' });
          }
        } catch (injectErr) {
          console.warn('Script injection failed in background:', injectErr);
        }
      }
      const pageData = response?.data || {};

      const payload = {
        url: overrides.linkUrl || pageData.url,
        title: pageData.productName || pageData.title,
        website: pageData.website,
        selectedText: overrides.selectedText || pageData.selectedText,
        imageUrl: overrides.imageUrl || pageData.image,
        price: pageData.price,
        ogData: pageData.ogData,
        jsonLd: pageData.jsonLd,
        userPrompt: overrides.selectedText ? `Context: "${overrides.selectedText}"` : undefined
      };

      // 2. Call backend analyze-web endpoint
      const analyzeRes = await fetch(`${BACKEND_URL}/api/analyze-web`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const analyzeJson = await analyzeRes.json();
      if (!analyzeJson.success) {
        throw new Error(analyzeJson.error || 'Failed to analyze webpage');
      }

      const item = analyzeJson.data;

      // 3. Save to database
      await fetch(`${BACKEND_URL}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.title,
          description: item.description,
          category: item.category,
          subcategory: item.subcategory,
          intent: item.intent,
          price: item.price,
          image_url: payload.imageUrl,
          source_url: payload.url,
          source_website: payload.website,
          user_prompt: payload.userPrompt,
          metadata: item.metadata
        })
      });

      // 4. Show badge confirmation
      chrome.action.setBadgeText({ tabId, text: 'SAVED' });
      chrome.action.setBadgeBackgroundColor({ tabId, color: '#10b981' });
      setTimeout(() => {
        chrome.action.setBadgeText({ tabId, text: '' });
      }, 3000);
    } catch (err: any) {
      console.error('Error processing and saving tab:', err);
      chrome.action.setBadgeText({ tabId, text: 'ERR' });
      chrome.action.setBadgeBackgroundColor({ tabId, color: '#ef4444' });
      setTimeout(() => {
        chrome.action.setBadgeText({ tabId, text: '' });
      }, 3000);
    }
  }
})();
