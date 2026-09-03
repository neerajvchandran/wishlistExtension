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
    isOutOfStock?: boolean;
    stockReason?: string;
    genre?: string;
    breadcrumbs?: string[];
    keywords?: string[];
    snippet?: string;
    screenText?: string;
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

    // 6. Out of Stock / Availability Detection
    let isOutOfStock = false;
    let stockReason: string | undefined = undefined;

    // Check schema.org availability
    const jsonLdAvailability = jsonLdData?.offers?.availability || jsonLdData?.availability;
    if (typeof jsonLdAvailability === 'string' && jsonLdAvailability.toLowerCase().includes('outofstock')) {
      isOutOfStock = true;
      stockReason = 'Schema.org indicates out of stock';
    }

    // Check meta tags
    if (!isOutOfStock) {
      const oosMeta = document.querySelector(
        'meta[property="product:availability"][content*="out of stock" i], ' +
        'meta[property="og:availability"][content*="out of stock" i], ' +
        'meta[property="product:availability"][content*="oos" i], ' +
        'meta[name="availability"][content*="out of stock" i]'
      );
      if (oosMeta) {
        isOutOfStock = true;
        stockReason = 'Availability meta tag indicates out of stock';
      }
    }

    // Check Amazon / eCommerce specific elements
    if (!isOutOfStock) {
      const availabilityEl = document.querySelector('#availability, #outOfStock, #deliveryMessageMirId');
      if (availabilityEl) {
        const text = availabilityEl.textContent?.toLowerCase() || '';
        if (
          text.includes('currently unavailable') ||
          text.includes('out of stock') ||
          text.includes('temporarily out of stock') ||
          text.includes('back in stock soon')
        ) {
          isOutOfStock = true;
          stockReason = availabilityEl.textContent?.trim() || 'Currently unavailable';
        }
      }
    }

    // Check generic ecommerce classes & disabled buttons
    if (!isOutOfStock) {
      const oosBadge = document.querySelector(
        '.out-of-stock, .sold-out, [class*="sold-out" i], [class*="out-of-stock" i], [data-availability*="out" i], .soldout'
      );
      if (oosBadge && oosBadge.textContent && /sold out|out of stock|unavailable/i.test(oosBadge.textContent)) {
        isOutOfStock = true;
        stockReason = oosBadge.textContent.trim();
      }
    }

    if (!isOutOfStock) {
      const disabledCartBtn = document.querySelector(
        'button[disabled][name="add"], button[disabled][id*="AddToCart" i], button[disabled][class*="cart" i]'
      );
      if (disabledCartBtn && /sold out|out of stock|unavailable/i.test(disabledCartBtn.textContent || '')) {
        isOutOfStock = true;
        stockReason = 'Add to Cart button disabled as sold out';
      }
    }

    // 7. Breadcrumbs Extraction
    const breadcrumbs: string[] = [];
    const breadcrumbEls = document.querySelectorAll(
      'nav[aria-label*="breadcrumb" i] a, .breadcrumb a, .breadcrumbs a, .a-breadcrumb a, [class*="breadcrumb" i] li'
    );
    breadcrumbEls.forEach((el) => {
      const text = el.textContent?.trim();
      if (text && !breadcrumbs.includes(text) && text.length < 50) {
        breadcrumbs.push(text);
      }
    });

    // 8. Meta Keywords & Article Tags
    const keywords: string[] = [];
    const metaKeywords = document.querySelector('meta[name="keywords"]')?.getAttribute('content');
    if (metaKeywords) {
      metaKeywords.split(',').forEach((k) => {
        const trimmed = k.trim();
        if (trimmed && !keywords.includes(trimmed)) keywords.push(trimmed);
      });
    }
    document.querySelectorAll('meta[property="article:tag"], meta[property="article:section"]').forEach((el) => {
      const c = el.getAttribute('content');
      if (c && !keywords.includes(c.trim())) keywords.push(c.trim());
    });

    // 9. Entire Visible Screen Contents (reads all text on screen, avoiding fragile web scraping)
    const rawBodyText = document.body ? document.body.innerText : '';
    const screenText = rawBodyText.replace(/\s+/g, ' ').trim().substring(0, 10000);

    // Check visible screen text for Out of Stock
    if (!isOutOfStock && screenText) {
      const lowerScreen = screenText.toLowerCase();
      if (
        lowerScreen.includes('currently unavailable') ||
        lowerScreen.includes('temporarily out of stock') ||
        lowerScreen.includes('out of stock') ||
        lowerScreen.includes('sold out') ||
        lowerScreen.includes('back in stock soon') ||
        lowerScreen.includes('item is unavailable') ||
        lowerScreen.includes("we don't know when or if this item will be back in stock")
      ) {
        if (!lowerScreen.includes('not out of stock')) {
          isOutOfStock = true;
          stockReason = 'Visible screen text indicates item is currently out of stock / unavailable';
        }
      }
    }

    // 10. Site Genre / Category Heuristic from Visible Screen Content
    const combinedForGenre = `${title} ${url} ${screenText} ${keywords.join(' ')} ${breadcrumbs.join(' ')}`.toLowerCase();
    let genre = 'article';

    if (combinedForGenre.includes('movie review') || combinedForGenre.includes('film review') || combinedForGenre.includes('tv review')) {
      genre = 'movie review';
    } else if (
      combinedForGenre.includes('crime') ||
      combinedForGenre.includes('true crime') ||
      combinedForGenre.includes('murder') ||
      combinedForGenre.includes('detective') ||
      combinedForGenre.includes('investigation') ||
      combinedForGenre.includes('mystery')
    ) {
      genre = 'crime story';
    } else if (
      combinedForGenre.includes('education') ||
      combinedForGenre.includes('tutorial') ||
      combinedForGenre.includes('course') ||
      combinedForGenre.includes('how to ') ||
      combinedForGenre.includes('guide to') ||
      window.location.hostname.endsWith('.edu')
    ) {
      genre = 'educational guide';
    } else if (combinedForGenre.includes('book review') || combinedForGenre.includes('novel review')) {
      genre = 'book review';
    } else if (combinedForGenre.includes('recipe') || combinedForGenre.includes('ingredients') || combinedForGenre.includes('cook time')) {
      genre = 'recipe';
    } else if (
      combinedForGenre.includes('programming') ||
      combinedForGenre.includes('coding') ||
      combinedForGenre.includes('developer') ||
      combinedForGenre.includes('software') ||
      combinedForGenre.includes('javascript') ||
      combinedForGenre.includes('python') ||
      combinedForGenre.includes('github')
    ) {
      genre = 'tech article';
    } else if (combinedForGenre.includes('research') || combinedForGenre.includes('arxiv') || combinedForGenre.includes('journal') || combinedForGenre.includes('paper')) {
      genre = 'research paper';
    } else if (combinedForGenre.includes('news') || combinedForGenre.includes('breaking news') || combinedForGenre.includes('editorial')) {
      genre = 'news report';
    } else if (combinedForGenre.includes('travel') || combinedForGenre.includes('itinerary') || combinedForGenre.includes('destination')) {
      genre = 'travel guide';
    }

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
      jsonLd: jsonLdData,
      isOutOfStock,
      stockReason,
      genre,
      breadcrumbs,
      keywords,
      snippet: screenText.substring(0, 1000),
      screenText
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
