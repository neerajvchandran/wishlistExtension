(() => {
  const BACKEND_URL = 'http://localhost:3001';

  interface ExtractedData {
    url: string;
    title: string;
    website: string;
    productName?: string;
    image?: string;
    price?: string;
    description?: string;
    selectedText?: string;
    ogData?: any;
    jsonLd?: any;
    isOutOfStock?: boolean;
    stockReason?: string;
    genre?: string;
    breadcrumbs?: string[];
    keywords?: string[];
    snippet?: string;
    screenText?: string;
  }

  let currentData: ExtractedData | null = null;

  function predictSmartComment(data: ExtractedData): string {
    const rawTitle = data.productName || data.title || '';
    const cleanTitle = rawTitle.replace(/\s*[-|–]\s*.*$/, '').trim();

    // 1. Explicit out of stock from DOM, meta, or screen text
    if (
      data.isOutOfStock ||
      (data.stockReason && /out of stock|sold out|unavailable/i.test(data.stockReason))
    ) {
      return 'Wait till stock is back or look up at local store';
    }

    const combined = `${data.title || ''} ${data.url || ''} ${data.website || ''} ${data.genre || ''} ${data.selectedText || ''} ${data.snippet || ''} ${data.screenText || ''} ${(data.breadcrumbs || []).join(' ')}`.toLowerCase();

    if (
      combined.includes('out of stock') ||
      combined.includes('sold out') ||
      combined.includes('currently unavailable') ||
      combined.includes('back in stock soon') ||
      combined.includes('item is unavailable')
    ) {
      return 'Wait till stock is back or look up at local store';
    }

    // 2. Specific website genres
    if (data.genre === 'movie review' || combined.includes('movie review') || combined.includes('film review')) {
      return cleanTitle ? `Read this movie review: "${cleanTitle}"` : 'Read this movie review';
    }

    if (data.genre === 'crime story' || combined.includes('crime story') || combined.includes('true crime')) {
      return cleanTitle ? `Read this crime story: "${cleanTitle}"` : 'Read this crime story';
    }

    if (data.genre === 'educational guide' || combined.includes('educational') || combined.includes('tutorial') || combined.includes('course')) {
      return cleanTitle ? `Read this educational guide: "${cleanTitle}"` : 'Read this educational guide';
    }

    if (data.genre === 'tech article' || combined.includes('tech article') || combined.includes('programming')) {
      return cleanTitle ? `Read this tech article: "${cleanTitle}"` : 'Read this tech article';
    }

    if (data.genre === 'research paper' || combined.includes('research paper') || combined.includes('arxiv')) {
      return cleanTitle ? `Read this research paper: "${cleanTitle}"` : 'Read this research paper';
    }

    if (data.genre === 'recipe' || combined.includes('recipe')) {
      return cleanTitle ? `Try this recipe: "${cleanTitle}"` : 'Try this recipe';
    }

    if (data.genre === 'book review' || combined.includes('book review')) {
      return cleanTitle ? `Read this book review: "${cleanTitle}"` : 'Read this book review';
    }

    if (data.genre === 'news report' || combined.includes('news report') || combined.includes('breaking news')) {
      return cleanTitle ? `Read this news report: "${cleanTitle}"` : 'Read this news report';
    }

    if (data.genre === 'travel guide' || combined.includes('travel guide')) {
      return cleanTitle ? `Explore this travel guide: "${cleanTitle}"` : 'Explore this travel guide';
    }

    // 3. Movies / Video Streaming
    if (
      combined.includes('prime video') ||
      combined.includes('primevideo') ||
      combined.includes('amazon prime') ||
      combined.includes('netflix') ||
      combined.includes('imdb.com') ||
      combined.includes('hulu') ||
      combined.includes('disney') ||
      combined.includes('/video/') ||
      combined.includes('streaming')
    ) {
      return cleanTitle ? `Watch this: "${cleanTitle}"` : 'Watch this';
    }

    // 4. Books / Literature
    if (
      combined.includes('goodreads') ||
      combined.includes('kindle') ||
      combined.includes('audiobook')
    ) {
      return cleanTitle ? `Read this: "${cleanTitle}"` : 'Read this';
    }

    // 5. Food & Dining
    if (
      combined.includes('restaurant') ||
      combined.includes('cafe') ||
      combined.includes('yelp')
    ) {
      return cleanTitle ? `Visit and try this: "${cleanTitle}"` : 'Visit and try this';
    }

    // 6. E-commerce / Product in stock
    if (data.price || data.jsonLd?.['@type'] === 'Product' || combined.includes('cart') || combined.includes('shop') || combined.includes('store')) {
      return cleanTitle ? `Buy this ${cleanTitle} on ${data.website}` : `Buy this on ${data.website}`;
    }

    // 7. General article / webpage fallback with domain context
    return cleanTitle ? `Read this on ${data.website}: "${cleanTitle}"` : `Read this on ${data.website}`;
  }

  async function initPopup() {
    const itemTitleEl = document.getElementById('itemTitle') as HTMLElement;
    const domainTagEl = document.getElementById('domainTag') as HTMLElement;
    const itemImageEl = document.getElementById('itemImage') as HTMLImageElement;
    const imagePlaceholderEl = document.getElementById('imagePlaceholder') as HTMLElement;
    const itemPriceEl = document.getElementById('itemPrice') as HTMLElement;
    const userPromptEl = document.getElementById('userPrompt') as HTMLTextAreaElement;
    const clearPromptBtn = document.getElementById('clearPromptBtn') as HTMLButtonElement;
    const aiSuggestionNotice = document.getElementById('aiSuggestionNotice') as HTMLElement;
    const aiSuggestedText = document.getElementById('aiSuggestedText') as HTMLElement;
    const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
    const btnText = document.getElementById('btnText') as HTMLElement;
    const statusMsg = document.getElementById('statusMessage') as HTMLElement;

    // Clear prompt button listener
    if (clearPromptBtn) {
      clearPromptBtn.addEventListener('click', () => {
        userPromptEl.value = '';
        clearPromptBtn.style.display = 'none';
        if (aiSuggestionNotice) aiSuggestionNotice.style.display = 'none';
        userPromptEl.focus();
      });
    }

    userPromptEl.addEventListener('input', () => {
      if (clearPromptBtn) {
        clearPromptBtn.style.display = userPromptEl.value.trim() ? 'inline-block' : 'none';
      }
    });

    // Extract from current tab
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('No active tab found');

      const tabUrl = tab.url || '';
      const tabHostname = tabUrl.startsWith('http') ? new URL(tabUrl).hostname.replace(/^www\./, '') : 'Web';

      let response: any = null;

      // Helper to send message with a hard 1.2s timeout so it NEVER hangs
      const sendExtractMessage = (tabId: number) =>
        Promise.race([
          chrome.tabs.sendMessage(tabId, { action: 'extract_page_info' }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1200))
        ]);

      try {
        response = await sendExtractMessage(tab.id);
      } catch {
        // Content script may not be injected yet
        try {
          if (chrome.scripting && tab.id && tabUrl.startsWith('http')) {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['dist/content.js']
            });
            await new Promise((resolve) => setTimeout(resolve, 100));
            response = await sendExtractMessage(tab.id);
          }
        } catch (injectErr) {
          console.warn('Script injection fallback failed:', injectErr);
        }
      }

      currentData = response?.data || {
        url: tabUrl,
        title: tab.title || 'Unknown Webpage',
        website: tabHostname
      };

      // Update UI immediately
      itemTitleEl.textContent = currentData?.productName || currentData?.title || 'Unknown Webpage';
      domainTagEl.textContent = currentData?.website || tabHostname || 'Web';

      if (currentData?.image) {
        itemImageEl.src = currentData.image;
        itemImageEl.style.display = 'block';
        imagePlaceholderEl.style.display = 'none';
      } else {
        itemImageEl.style.display = 'none';
        imagePlaceholderEl.style.display = 'flex';
      }

      if (currentData?.price) {
        itemPriceEl.textContent = currentData.price;
        itemPriceEl.style.display = 'inline-block';
      }

      // Pre-populate with smart predicted default comment if no selected text
      if (currentData?.selectedText) {
        userPromptEl.value = currentData.selectedText;
      } else if (currentData) {
        const smartComment = predictSmartComment(currentData);
        userPromptEl.value = smartComment;
        if (aiSuggestedText && aiSuggestionNotice) {
          aiSuggestedText.textContent = `"${smartComment}"`;
          aiSuggestionNotice.style.display = 'block';
        }
      }

      if (clearPromptBtn && userPromptEl.value) {
        clearPromptBtn.style.display = 'inline-block';
      }

      // Save button action
      saveBtn.addEventListener('click', async () => {
        if (!currentData) return;

        saveBtn.disabled = true;
        btnText.textContent = 'AI Analyzing & Saving...';
        statusMsg.style.display = 'none';

        try {
          const payload = {
            url: currentData.url,
            title: currentData.productName || currentData.title,
            website: currentData.website,
            selectedText: currentData.selectedText,
            imageUrl: currentData.image,
            price: currentData.price,
            ogData: currentData.ogData,
            jsonLd: currentData.jsonLd,
            userPrompt: userPromptEl.value.trim() || undefined,
            isOutOfStock: currentData.isOutOfStock,
            stockReason: currentData.stockReason,
            genre: currentData.genre,
            breadcrumbs: currentData.breadcrumbs,
            keywords: currentData.keywords,
            snippet: currentData.snippet,
            screenText: currentData.screenText
          };

          // 1. Analyze with AI (AI deduces intent, suggests comments, and creates bullet summaries)
          const analyzeRes = await fetch(`${BACKEND_URL}/api/analyze-web`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const analyzeJson = await analyzeRes.json();
          const aiResult = analyzeJson.data || {};

          // 2. Save Item with AI Deduced Intent and Bullet Points
          await fetch(`${BACKEND_URL}/api/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: aiResult.title || payload.title,
              description: aiResult.description || '',
              category: aiResult.category || 'Other',
              subcategory: aiResult.subcategory || '',
              intent: aiResult.intent || 'buy',
              intent_reasoning: aiResult.intent_reasoning,
              suggested_comment: aiResult.suggested_comment,
              bullet_points: aiResult.bullet_points,
              price: aiResult.price || payload.price,
              image_url: payload.imageUrl,
              source_url: payload.url,
              source_website: payload.website,
              user_prompt: payload.userPrompt,
              metadata: {
                ...(aiResult.metadata || {}),
                intent_reasoning: aiResult.intent_reasoning,
                bullet_points: aiResult.bullet_points
              }
            })
          });

          const intentLabel = aiResult.intent ? ` (${aiResult.intent.toUpperCase()})` : '';
          statusMsg.textContent = `✓ Saved to ${aiResult.category || 'Wishlist'}${intentLabel}!`;
          statusMsg.className = 'status-msg success';
          statusMsg.style.display = 'block';
          btnText.textContent = 'Saved!';

          setTimeout(() => {
            window.close();
          }, 1500);
        } catch (err: any) {
          console.error('Save failed:', err);
          statusMsg.textContent = 'Failed to save item. Make sure backend is running.';
          statusMsg.className = 'status-msg error';
          statusMsg.style.display = 'block';
          saveBtn.disabled = false;
          btnText.textContent = 'Save to Wishlist';
        }
      });
    } catch (err: any) {
      console.error('Extraction error:', err);
      if (itemTitleEl) itemTitleEl.textContent = 'Current Webpage';
      if (domainTagEl) domainTagEl.textContent = 'Web';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPopup);
  } else {
    initPopup();
  }
})();
