// Content script to extract rich webpage metadata
(() => {
  interface ExtractedPageData {
    url: string;
    title: string;
    website: string;
    productName?: string;
    image?: string;
    price?: string;
    description?: string;
    selectedText?: string;
    ogData?: Record<string, string>;
    jsonLd?: any;
  }

  function extractPageInformation(): ExtractedPageData {
    const url = window.location.href;
    const website = window.location.hostname.replace(/^www\./, '');
    const title = document.title || '';
    const selectedText = window.getSelection()?.toString()?.trim() || undefined;

    // 1. OpenGraph Meta Tags
    const ogData: Record<string, string> = {};
    const metaTags = document.querySelectorAll('meta[property^="og:"], meta[name^="og:"], meta[name^="twitter:"]');
    metaTags.forEach((meta) => {
      const property = meta.getAttribute('property') || meta.getAttribute('name');
      const content = meta.getAttribute('content');
      if (property && content) {
        ogData[property] = content;
      }
    });

    // 2. Schema.org JSON-LD Extraction
    let jsonLdData: any = null;
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of Array.from(jsonLdScripts)) {
      try {
        const parsed = JSON.parse(script.textContent || '');
        const item = Array.isArray(parsed) ? parsed[0] : parsed;
        const type = item?.['@type'];
        if (
          type === 'Product' ||
          type === 'Book' ||
          type === 'Movie' ||
          type === 'Recipe' ||
          type === 'Restaurant' ||
          type === 'Hotel' ||
          type === 'Course'
        ) {
          jsonLdData = item;
          break;
        }
      } catch {}
    }

    // 3. Price Heuristic Extraction
    let price: string | undefined = undefined;
    if (ogData['og:price:amount']) {
      const currency = ogData['og:price:currency'] || '$';
      price = `${currency}${ogData['og:price:amount']}`;
    } else if (jsonLdData?.offers?.price) {
      const currency = jsonLdData?.offers?.priceCurrency || '$';
      price = `${currency}${jsonLdData.offers.price}`;
    } else {
      // Scan common price element selectors or text
      const priceEl = document.querySelector(
        '[data-price], .price, .a-price .a-offscreen, .product-price, .offer-price'
      );
      if (priceEl && priceEl.textContent) {
        const text = priceEl.textContent.trim();
        const match = text.match(/([$€£¥₹]\s?[\d,]+(?:\.\d{2})?)/);
        if (match) price = match[1];
      }
    }

    // 4. Image Extraction
    let image: string | undefined =
      ogData['og:image'] ||
      ogData['twitter:image'] ||
      jsonLdData?.image?.url ||
      (typeof jsonLdData?.image === 'string' ? jsonLdData?.image : undefined);

    if (!image) {
      // Scan main image on page
      const mainImg = document.querySelector(
        'meta[name="thumbnail"], [data-main-image], .product-image img, #main-image, img#landingImage'
      );
      if (mainImg) {
        const src = mainImg.getAttribute('content') || mainImg.getAttribute('src');
        if (src && !src.startsWith('data:')) {
          image = src.startsWith('http') ? src : new URL(src, window.location.origin).href;
        }
      }
    }

    // 5. Product/Item Name Heuristic
    const productName =
      document.querySelector('#productTitle')?.textContent?.trim() ||
      jsonLdData?.name ||
      ogData['og:title'] ||
      document.querySelector('h1')?.textContent?.trim() ||
      title;

    const description =
      jsonLdData?.description ||
      ogData['og:description'] ||
      ogData['twitter:description'] ||
      document.querySelector('meta[name="description"]')?.getAttribute('content') ||
      undefined;

    return {
      url,
      title,
      website,
      productName,
      image,
      price,
      description,
      selectedText,
      ogData,
      jsonLd: jsonLdData
    };
  }

  // Listen for messages from background script or popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extract_page_info') {
      try {
        const data = extractPageInformation();
        sendResponse({ success: true, data });
      } catch (err: any) {
        sendResponse({ success: false, error: err?.message || 'Extraction failed' });
      }
    }
    return false;
  });
})();
