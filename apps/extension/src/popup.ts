export {};

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
}

let currentData: ExtractedData | null = null;
let currentIntent = 'buy';

document.addEventListener('DOMContentLoaded', async () => {
  const itemTitleEl = document.getElementById('itemTitle') as HTMLElement;
  const domainTagEl = document.getElementById('domainTag') as HTMLElement;
  const itemImageEl = document.getElementById('itemImage') as HTMLImageElement;
  const imagePlaceholderEl = document.getElementById('imagePlaceholder') as HTMLElement;
  const itemPriceEl = document.getElementById('itemPrice') as HTMLElement;
  const userPromptEl = document.getElementById('userPrompt') as HTMLTextAreaElement;
  const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
  const btnText = document.getElementById('btnText') as HTMLElement;
  const statusMsg = document.getElementById('statusMessage') as HTMLElement;
  const intentChips = document.querySelectorAll('.chip');

  // Intent chip listeners
  intentChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      intentChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      currentIntent = chip.getAttribute('data-intent') || 'buy';
    });
  });

  // Extract from current tab
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('No active tab');

    let response: any = null;
    try {
      response = await chrome.tabs.sendMessage(tab.id, { action: 'extract_page_info' });
    } catch {
      // If content script was not injected, fallback to basic tab info
      response = {
        data: {
          url: tab.url || '',
          title: tab.title || '',
          website: tab.url ? new URL(tab.url).hostname.replace(/^www\./, '') : ''
        }
      };
    }

    currentData = response?.data || {
      url: tab.url || '',
      title: tab.title || '',
      website: ''
    };

    // Update UI
    itemTitleEl.textContent = currentData?.productName || currentData?.title || 'Unknown Webpage';
    domainTagEl.textContent = currentData?.website || 'Web';

    if (currentData?.image) {
      itemImageEl.src = currentData.image;
      itemImageEl.style.display = 'block';
      imagePlaceholderEl.style.display = 'none';
    }

    if (currentData?.price) {
      itemPriceEl.textContent = currentData.price;
      itemPriceEl.style.display = 'inline-block';
    }

    if (currentData?.selectedText) {
      userPromptEl.value = currentData.selectedText;
    }
  } catch (err: any) {
    console.error('Extraction error:', err);
    itemTitleEl.textContent = 'Unable to extract page';
    domainTagEl.textContent = 'Error';
  }

  // Save button action
  saveBtn.addEventListener('click', async () => {
    if (!currentData) return;

    saveBtn.disabled = true;
    btnText.textContent = 'Analyzing & Saving...';
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
        userPrompt: userPromptEl.value.trim() || undefined
      };

      // 1. Analyze with AI
      const analyzeRes = await fetch(`${BACKEND_URL}/api/analyze-web`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const analyzeJson = await analyzeRes.json();
      const aiResult = analyzeJson.data || {};

      // 2. Save Item
      await fetch(`${BACKEND_URL}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: aiResult.title || payload.title,
          description: aiResult.description || '',
          category: aiResult.category || 'Other',
          subcategory: aiResult.subcategory || '',
          intent: currentIntent,
          price: aiResult.price || payload.price,
          image_url: payload.imageUrl,
          source_url: payload.url,
          source_website: payload.website,
          user_prompt: payload.userPrompt,
          metadata: aiResult.metadata
        })
      });

      statusMsg.textContent = `✓ Saved to ${aiResult.category || 'Wishlist'}!`;
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
});
