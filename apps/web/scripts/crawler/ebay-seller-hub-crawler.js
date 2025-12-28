/**
 * eBay Seller Hub Research Products Crawler
 * 
 * 爬取 eBay Seller Hub Research products 页面的成交记录
 * 
 * 使用方法:
 *   const crawler = require('./ebay-seller-hub-crawler');
 *   const results = await crawler.crawl('Pokemon');
 */

const { chromium } = require('playwright');

/**
 * 配置选项
 */
const CONFIG = {
  // eBay Seller Hub URL
  sellerHubUrl: 'https://www.ebay.com/sh/research',
  
  // 请求延迟（毫秒）- 避免被限制
  delayBetweenPages: 2000,
  delayBetweenRequests: 1000,
  
  // 超时设置
  pageLoadTimeout: 30000,
  navigationTimeout: 120000, // 增加到 120 秒
  
  // 重试设置
  maxRetries: 3,
  retryDelay: 5000,
};

/**
 * 等待页面加载完成
 */
async function waitForPageLoad(page) {
  // 等待页面基本加载（更宽松的策略）
  await page.waitForTimeout(3000);
  
  // 尝试等待搜索框出现 - 使用实际的选择器
  const searchInputSelectors = [
    'input.textbox_control', // 实际的 class
    'input[placeholder*="Enter keywords"]', // 通过 placeholder
    'input[placeholder*="keywords"]',
    'input[type="text"][placeholder*="keywords"]',
    'input[placeholder*="Search"]',
    'input[type="search"]',
    'input[name*="search"]',
  ];
  
  let found = false;
  for (const selector of searchInputSelectors) {
    try {
      await page.waitForSelector(selector, {
        timeout: 10000,
      });
      console.log(`  ✓ Search input found with selector: ${selector}`);
      found = true;
      break;
    } catch (e) {
      continue;
    }
  }
  
  if (!found) {
    console.log('  ⚠️  Search input not found immediately');
    console.log('  💡 If you see a login page, please login in the browser window');
    console.log('  ⏳ Waiting 15 seconds for you to complete login...');
    
    // 等待更长时间，让用户有时间登录
    await page.waitForTimeout(15000);
    
    // 再次尝试查找搜索框
    console.log('  🔍 Searching for search input again...');
    for (const selector of searchInputSelectors) {
      try {
        await page.waitForSelector(selector, {
          timeout: 15000,
        });
        console.log(`  ✓ Search input found after waiting: ${selector}`);
        found = true;
        break;
      } catch (e) {
        continue;
      }
    }
    
    if (!found) {
      console.log('  ⚠️  Still cannot find search input');
      console.log('  💡 Please ensure you are logged in and on the Research page');
      console.log('  ⏳ Waiting another 10 seconds...');
      await page.waitForTimeout(10000);
      
      // 最后一次尝试
      for (const selector of searchInputSelectors) {
        try {
          const element = await page.$(selector);
          if (element && await element.isVisible()) {
            console.log(`  ✓ Search input found on final attempt: ${selector}`);
            found = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }
    }
  }
  
  // 额外等待确保页面稳定
  await page.waitForTimeout(2000);
}

/**
 * 执行搜索
 */
async function performSearch(page, keywords) {
  console.log(`  🔍 Searching for: "${keywords}"`);
  
  // 等待页面稳定
  await page.waitForTimeout(2000);
  
  // 查找搜索框 - 使用实际的选择器（优先级从高到低）
  const searchSelectors = [
    'input.textbox_control', // 实际的 class（优先级最高）
    'input[placeholder*="Enter keywords"]', // 通过 placeholder
    'input[placeholder*="keywords"]',
    'input[type="text"][placeholder*="keywords"]',
    'input[placeholder*="Search"]',
    'input[placeholder*="search"]',
    'input[type="search"]',
    'input[name*="search"]',
    'input[aria-label*="Search"]',
    'input[aria-label*="search"]',
    '#search-input',
    '.search-input',
    'input[class*="search"]',
    'input[id*="search"]',
  ];
  
  let searchInput = null;
  for (const selector of searchSelectors) {
    try {
      searchInput = await page.$(selector);
      if (searchInput) {
        const isVisible = await searchInput.isVisible();
        if (isVisible) {
          console.log(`  ✓ Found search input with selector: ${selector}`);
          break;
        }
      }
    } catch (e) {
      continue;
    }
  }
  
  if (!searchInput) {
    // 如果找不到，尝试通过标签文本查找
    try {
      const searchLabel = await page.$('label:has-text("Search"), label:has-text("关键词")');
      if (searchLabel) {
        const labelFor = await searchLabel.getAttribute('for');
        if (labelFor) {
          searchInput = await page.$(`#${labelFor}`);
        }
      }
    } catch (e) {
      // 忽略错误
    }
  }
  
  if (!searchInput) {
    console.log('  ⚠️  Could not find search input automatically');
    console.log('  💡 Trying alternative approach...');
    
    // 尝试通过更通用的方式查找
    const allInputs = await page.$$('input[type="text"]');
    console.log(`  📋 Found ${allInputs.length} text inputs on page`);
    
    // 查找包含 placeholder 的输入框
    for (const input of allInputs) {
      try {
        const placeholder = await input.getAttribute('placeholder');
        if (placeholder && (placeholder.toLowerCase().includes('keyword') || placeholder.toLowerCase().includes('search'))) {
          searchInput = input;
          console.log(`  ✓ Found search input by placeholder: "${placeholder}"`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!searchInput) {
      console.log('  ❌ Could not find search input field after multiple attempts');
      console.log('  💡 Please ensure:');
      console.log('     1. You are logged in to eBay');
      console.log('     2. You are on the Research page');
      console.log('     3. The page has fully loaded');
      console.log('  ⏳ Waiting 10 more seconds for manual intervention...');
      await page.waitForTimeout(10000);
      
      // 最后一次尝试
      const finalInputs = await page.$$('input[type="text"]');
      for (const input of finalInputs) {
        try {
          const placeholder = await input.getAttribute('placeholder');
          if (placeholder) {
            searchInput = input;
            console.log(`  ✓ Found input with placeholder: "${placeholder}"`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!searchInput) {
        throw new Error('Could not find search input field after multiple attempts. Please check if you are logged in and on the correct page.');
      }
    }
  }
  
  // 清空并输入搜索关键词
  await searchInput.click({ clickCount: 3 });
  await searchInput.fill(keywords);
  await page.waitForTimeout(500);
  
  // 点击搜索按钮或按回车
  const searchButtonSelectors = [
    'button[type="submit"]',
    'button:has-text("Research")',
    'button:has-text("Search")',
    'button:has-text("搜索")',
    '.search-button',
    'button[class*="search"]',
  ];
  
  let searchButton = null;
  for (const selector of searchButtonSelectors) {
    try {
      searchButton = await page.$(selector);
      if (searchButton) {
        await searchButton.click();
        break;
      }
    } catch (e) {
      continue;
    }
  }
  
  if (!searchButton) {
    // 如果没有找到按钮，按回车
    await searchInput.press('Enter');
  }
  
  // 等待结果加载
  await page.waitForTimeout(3000);
  await waitForResults(page);
}

/**
 * 等待搜索结果加载
 */
async function waitForResults(page) {
  // 等待成交记录表格出现
  try {
    await page.waitForSelector('tr.research-table-row', { 
      timeout: CONFIG.pageLoadTimeout 
    });
    // 额外等待数据完全加载
    await page.waitForTimeout(2000);
  } catch (error) {
    console.warn('  ⚠️  Results table not found, waiting longer...');
    await page.waitForTimeout(3000);
  }
}

/**
 * 提取当前页面的成交记录
 */
async function extractTransactionsFromPage(page) {
  const transactions = [];
  
  try {
    // 等待表格加载
    await page.waitForSelector('tr.research-table-row', { timeout: 10000 });
    
    // 获取所有成交记录行
    const rows = await page.$$('tr.research-table-row');
    
    console.log(`  📋 Found ${rows.length} rows on current page`);
    
    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        
        // 提取商品ID - 从 span[data-item-id] 属性提取（如：<span data-item-id="116949771640">）
        let itemId = null;
        
        // 方法1: 直接从 span[data-item-id] 属性提取（优先级最高）
        try {
          const itemIdElement = await row.$('span[data-item-id]');
          if (itemIdElement) {
            itemId = await itemIdElement.getAttribute('data-item-id');
            if (itemId) {
              itemId = String(itemId).trim();
            }
          }
        } catch (e) {
          // 继续尝试其他方法
        }
        
        // 方法2: 如果还没找到，尝试其他选择器
        if (!itemId) {
          try {
            const itemIdElement = await row.$('[data-item-id]');
            if (itemIdElement) {
              itemId = await itemIdElement.getAttribute('data-item-id');
              if (itemId) {
                itemId = String(itemId).trim();
              }
            }
          } catch (e) {
            // 继续尝试
          }
        }
        
        // 方法3: 如果还没找到，尝试从链接中提取
        if (!itemId) {
          try {
            const linkElement = await row.$('.research-table-row__link-row-anchor, .research-table-row_link-row-anchor, a[href*="/itm/"]');
            if (linkElement) {
              const link = await linkElement.getAttribute('href');
              if (link) {
                const match = link.match(/\/itm\/(\d+)/);
                if (match && match[1]) {
                  itemId = String(match[1]).trim();
                }
              }
            }
          } catch (e) {
            // 忽略错误
          }
        }
        
        if (!itemId) {
          console.warn(`  ⚠️  Row ${i + 1}: No item ID found, skipping`);
          continue;
        }
        
        // 提取产品名称
        const titleElement = await row.$('.research-table-row__product-info-name, .research-table-row_product-info-name');
        const title = titleElement 
          ? (await titleElement.textContent() || '').trim()
          : '';
        
        // 提取链接
        const linkElement = await row.$('.research-table-row__link-row-anchor, .research-table-row_link-row-anchor, a[href*="/itm/"]');
        const link = linkElement 
          ? await linkElement.getAttribute('href')
          : '';
        
        // 提取图片URL - Large 和 Small 图片
        let imageUrl = null;
        let imageLarge = null;
        let imageSmall = null;
        
        // 提取 Large 图片
        try {
          const largeImg = await row.$('img.large, img[class*="large"]');
          if (largeImg) {
            imageLarge = await largeImg.getAttribute('src') 
              || await largeImg.getAttribute('data-src')
              || await largeImg.getAttribute('data-lazy-src');
          }
        } catch (e) {
          // 忽略错误
        }
        
        // 提取 Small 图片
        try {
          const smallImg = await row.$('img.small, img[class*="small"]');
          if (smallImg) {
            imageSmall = await smallImg.getAttribute('src') 
              || await smallImg.getAttribute('data-src')
              || await smallImg.getAttribute('data-lazy-src');
          }
        } catch (e) {
          // 忽略错误
        }
        
        // 如果没有找到 Large/Small，尝试通用选择器作为备选
        if (!imageLarge && !imageSmall) {
          const thumbnailSelectors = [
            '.research-table-row__thumbnail',
            '.research-table-row_thumbnail',
            'img.research-table-row__thumbnail',
            'img.research-table-row_thumbnail',
            '.research-table-row_product-info img',
            '.research-table-row__product-info img',
            'img',
          ];
          
          for (const selector of thumbnailSelectors) {
            try {
              const thumbnailElement = await row.$(selector);
              if (thumbnailElement) {
                imageUrl = await thumbnailElement.getAttribute('src') 
                  || await thumbnailElement.getAttribute('data-src')
                  || await thumbnailElement.getAttribute('data-lazy-src');
                if (imageUrl) break;
              }
            } catch (e) {
              continue;
            }
          }
        }
        
        // 如果找到了 Large 或 Small，优先使用它们
        if (imageLarge || imageSmall) {
          imageUrl = imageLarge || imageSmall; // 作为默认图片
        }
        
        // 提取售出价格
        const priceElement = await row.$('.research-table-row_avgSoldPrice, .research-table-row__avgSoldPrice');
        const priceText = priceElement 
          ? (await priceElement.textContent() || '').trim()
          : '';
        const price = parsePrice(priceText);
        
        // 提取售出日期
        const dateElement = await row.$('.research-table-row_dateLastSold, .research-table-row__dateLastSold');
        const dateText = dateElement 
          ? (await dateElement.textContent() || '').trim()
          : '';
        const soldDate = parseDate(dateText);
        
        // 如果从链接中提取不到商品ID，尝试从URL提取
        const finalItemId = itemId || extractItemIdFromUrl(link);
        
        if (!title) {
          console.warn(`  ⚠️  Row ${i + 1} (ID: ${finalItemId}): No title found`);
        }
        
        if (price <= 0) {
          console.warn(`  ⚠️  Row ${i + 1} (ID: ${finalItemId}): Invalid price: "${priceText}"`);
        }
        
        // 提取评级信息
        const { company: gradingCompany, grade } = extractGradingFromTitle(title);
        
        transactions.push({
          itemId: finalItemId,
          title: title,
          price: price,
          currency: 'USD', // eBay Seller Hub 通常显示 USD
          soldDate: soldDate,
          link: link || (itemId ? `https://www.ebay.com/itm/${itemId}` : null),
          imageUrl: imageUrl, // 默认图片（向后兼容）
          imageLarge: imageLarge, // Large 图片链接
          imageSmall: imageSmall, // Small 图片链接
          condition: extractCondition(title),
          grading_company: gradingCompany,
          grade: grade,
        });
        
      } catch (error) {
        console.warn(`  ⚠️  Error extracting transaction ${i + 1}: ${error.message}`);
        continue;
      }
    }
    
    console.log(`  ✓ Successfully extracted ${transactions.length} transactions`);
    
  } catch (error) {
    console.error(`  ❌ Error extracting transactions: ${error.message}`);
    // 如果选择器找不到，尝试等待更长时间
    if (error.message.includes('waiting for selector')) {
      console.log('  ⏳ Waiting for page to load...');
      await page.waitForTimeout(5000);
      // 重试一次
      return await extractTransactionsFromPage(page);
    }
  }
  
  return transactions;
}

/**
 * 检查是否有下一页
 */
async function hasNextPage(page) {
  // 查找"下一页"按钮或链接 - 优先使用实际的选择器
  const nextPageSelectors = [
    'button.pagination_next',  // 实际的选择器（优先级最高）
    'button[aria-label="Go to next page"]',  // 通过 aria-label
    'button[aria-label*="next page"]',  // 部分匹配
    'button:has-text("Next")',
    'a:has-text("Next")',
    'button[aria-label*="Next"]',
    'button[aria-label*="next"]',
    '.pagination .next',
    '.pagination-next',
    '[data-testid="next-page"]',
    'button[class*="next"]',
    'a[class*="next"]',
  ];
  
  for (const selector of nextPageSelectors) {
    try {
      const nextButton = await page.$(selector);
      if (nextButton) {
        const isDisabled = await nextButton.getAttribute('disabled');
        const ariaDisabled = await nextButton.getAttribute('aria-disabled');
        const isVisible = await nextButton.isVisible();
        
        if (isVisible && !isDisabled && ariaDisabled !== 'true') {
          return true;
        }
      }
    } catch (e) {
      continue;
    }
  }
  
  // 也可以检查分页数字，看是否有下一页的页码
  try {
    const currentPageElement = await page.$('.pagination .active, .pagination .current');
    const allPageNumbers = await page.$$('.pagination a, .pagination button');
    
    if (currentPageElement && allPageNumbers.length > 0) {
      // 简单检查：如果有多个页码按钮，可能还有下一页
      return allPageNumbers.length > 1;
    }
  } catch (e) {
    // 忽略错误
  }
  
  return false;
}

/**
 * 点击下一页
 */
async function goToNextPage(page) {
  const nextPageSelectors = [
    'button.pagination_next',  // 实际的选择器（优先级最高）
    'button[aria-label="Go to next page"]',  // 通过 aria-label
    'button[aria-label*="next page"]',  // 部分匹配
    'button:has-text("Next")',
    'a:has-text("Next")',
    'button[aria-label*="Next"]',
    'button[aria-label*="next"]',
    '.pagination .next',
    '.pagination-next',
    '[data-testid="next-page"]',
    'button[class*="next"]',
    'a[class*="next"]',
  ];
  
  for (const selector of nextPageSelectors) {
    try {
      const nextButton = await page.$(selector);
      if (nextButton) {
        const isDisabled = await nextButton.getAttribute('disabled');
        const ariaDisabled = await nextButton.getAttribute('aria-disabled');
        const isVisible = await nextButton.isVisible();
        
        if (isVisible && !isDisabled && ariaDisabled !== 'true') {
          console.log(`  ➡️  Clicking next page button (selector: ${selector})`);
          
          // 滚动到按钮位置，确保可见
          await nextButton.scrollIntoViewIfNeeded();
          await page.waitForTimeout(500);
          
          // 点击按钮
          await nextButton.click();
          
          // 等待页面加载
          await page.waitForTimeout(CONFIG.delayBetweenPages);
          await waitForResults(page);
          
          return true;
        }
      }
    } catch (e) {
      continue;
    }
  }
  
  console.log('  ⚠️  Next page button not found or disabled');
  return false;
}

/**
 * 解析价格文本
 */
function parsePrice(priceText) {
  if (!priceText) return 0;
  
  // 移除货币符号和空格，提取数字
  const match = priceText.match(/[\d,]+\.?\d*/);
  if (match) {
    return parseFloat(match[0].replace(/,/g, ''));
  }
  
  return 0;
}

/**
 * 解析日期文本
 */
function parseDate(dateText) {
  if (!dateText) return new Date().toISOString();
  
  // 尝试解析各种日期格式
  const date = new Date(dateText);
  if (!isNaN(date.getTime())) {
    return date.toISOString();
  }
  
  // 如果解析失败，返回当前时间
  return new Date().toISOString();
}

/**
 * 从 URL 提取商品ID
 */
function extractItemIdFromUrl(url) {
  if (!url) return null;
  
  // eBay URL 格式: https://www.ebay.com/itm/123456789
  const match = url.match(/\/itm\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * 从标题提取评级信息（公司 + 等级）
 */
function extractGradingFromTitle(title) {
  if (!title) return { company: null, grade: 'raw' };
  
  // 匹配 PSA 10, PSA 9 等
  const psaMatch = title.match(/PSA\s*(\d+(?:\.\d+)?)/i);
  if (psaMatch) {
    return {
      company: 'PSA',
      grade: `psa${psaMatch[1].replace('.', '_')}`,
    };
  }
  
  // 匹配 BGS 9.5 等
  const bgsMatch = title.match(/BGS\s*(\d+(?:\.\d+)?)/i);
  if (bgsMatch) {
    return {
      company: 'BGS',
      grade: `bgs${bgsMatch[1].replace('.', '_')}`,
    };
  }
  
  // 匹配 CGC 9.5 等
  const cgcMatch = title.match(/CGC\s*(\d+(?:\.\d+)?)/i);
  if (cgcMatch) {
    return {
      company: 'CGC',
      grade: `cgc${cgcMatch[1].replace('.', '_')}`,
    };
  }
  
  return { company: null, grade: 'raw' };
}

/**
 * 从标题提取评级公司（保持向后兼容）
 */
function extractGradingCompany(title) {
  return extractGradingFromTitle(title).company;
}

/**
 * 从标题提取评级（保持向后兼容）
 */
function extractGrade(title) {
  return extractGradingFromTitle(title).grade;
}

/**
 * 从标题提取商品状态
 */
function extractCondition(title) {
  if (!title) return 'New';
  
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('new') || lowerTitle.includes('mint')) return 'New';
  if (lowerTitle.includes('used')) return 'Used';
  if (lowerTitle.includes('parts')) return 'For parts or not working';
  
  return 'New';
}

/**
 * 主爬取函数
 */
async function crawl(keywords, options = {}) {
  const {
    maxPages = Infinity, // 最大爬取页数
    headless = true, // 是否无头模式
    browserContext = null, // 可选的浏览器上下文（用于保持登录状态）
    waitForManualReady = false, // 是否等待用户手动准备
    onPageCrawled = null, // 每页爬取完成后的回调函数
  } = options;
  
  console.log(`\n🚀 Starting eBay Seller Hub crawler for: "${keywords}"`);
  console.log(`   Max pages: ${maxPages === Infinity ? 'All' : maxPages}`);
  console.log(`   Headless: ${headless}\n`);
  
  let browser;
  let context;
  let page;
  const allTransactions = [];
  
  try {
    // 启动浏览器
    if (browserContext) {
      context = browserContext;
      page = await context.newPage();
    } else {
      browser = await chromium.launch({
        headless: headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled', // 隐藏自动化特征
          '--disable-dev-shm-usage',
        ],
      });
      context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        javaScriptEnabled: true, // 确保启用 JavaScript
        locale: 'en-US',
        timezoneId: 'America/New_York',
      });
      
      // 隐藏 webdriver 特征
      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => false,
        });
      });
      page = await context.newPage();
    }
    
    // 导航到 Seller Hub Research 页面
    console.log('  📍 Navigating to eBay Seller Hub...');
    
    if (waitForManualReady) {
      console.log('  💡 PREPARATION MODE: Please login and navigate to the Research page');
      console.log('  💡 URL: https://www.ebay.com/sh/research');
      console.log('  ⏳ Step 1: Login and navigate to Research page');
      console.log('  💡 Press ENTER when you are on the Research page\n');
      
      // 先导航到登录页面或主页
      try {
        await page.goto('https://www.ebay.com', {
          waitUntil: 'domcontentloaded',
          timeout: CONFIG.navigationTimeout,
        });
      } catch (error) {
        if (error.message.includes('Timeout')) {
          console.log('  ⚠️  Page load timeout, but continuing...');
        }
      }
      
      // 等待用户按回车键
      await new Promise((resolve) => {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        
        console.log('  ⏸️  Waiting for ENTER key (after login and navigation)...');
        
        process.stdin.on('data', (key) => {
          if (key === '\r' || key === '\n' || key === '\u0003') {
            process.stdin.setRawMode(false);
            process.stdin.pause();
            console.log('\n  ✅ Browser ready. Now please search in the browser.\n');
            resolve();
          }
        });
      });
      
      console.log('  🔍 Checking if you are on the Research page...');
      
      // 检查是否已经在 Research 页面
      const currentUrl = page.url();
      if (!currentUrl.includes('/sh/research')) {
        console.log('  ⚠️  Not on Research page yet. Navigating...');
        try {
          await page.goto(CONFIG.sellerHubUrl, {
            waitUntil: 'domcontentloaded',
            timeout: CONFIG.navigationTimeout,
          });
          await page.waitForTimeout(5000);
        } catch (error) {
          console.log('  ⚠️  Navigation may have failed, but continuing...');
        }
      } else {
        console.log('  ✓ Already on Research page');
      }
      
      // 再等待一下确保页面稳定
      await page.waitForTimeout(3000);
    } else {
      console.log('  💡 If login is required, please login in the browser window');
      
      try {
        await page.goto(CONFIG.sellerHubUrl, {
          waitUntil: 'domcontentloaded',
          timeout: CONFIG.navigationTimeout,
        });
      } catch (error) {
        if (error.message.includes('Timeout')) {
          console.log('  ⚠️  Page load timeout, but continuing...');
        } else {
          throw error;
        }
      }
      
      // 等待页面基本加载完成
      await page.waitForTimeout(5000);
    }
    
    // 等待页面加载
    if (!waitForManualReady) {
      await waitForPageLoad(page);
      
      // 执行搜索（仅在非手动模式下）
      await performSearch(page, keywords);
    } else {
      // 手动模式：等待用户在浏览器中准备好搜索结果
      console.log('  💡 Please search for your keywords in the browser');
      console.log('  💡 Make sure the search results are displayed');
      console.log('  ⏸️  Press ENTER in terminal when results are ready...\n');
      
      // 等待用户按回车键
      await new Promise((resolve) => {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        
        process.stdin.on('data', (key) => {
          if (key === '\r' || key === '\n' || key === '\u0003') {
            process.stdin.setRawMode(false);
            process.stdin.pause();
            console.log('  ✅ Starting to crawl from current page...\n');
            resolve();
          }
        });
      });
      
      // 等待页面稳定
      await page.waitForTimeout(3000);
    }
    
    // 爬取所有页面
    let currentPage = 1;
    let hasMore = true;
    
    while (hasMore && currentPage <= maxPages) {
      console.log(`  📄 Extracting page ${currentPage}...`);
      
      // 提取当前页面的数据
      const transactions = await extractTransactionsFromPage(page);
      
      // 如果提供了回调函数，立即处理这一页的数据（实时插入模式）
      if (onPageCrawled && typeof onPageCrawled === 'function') {
        await onPageCrawled(transactions, currentPage);
      } else {
        // 否则累积到数组中（批量插入模式）
        allTransactions.push(...transactions);
      }
      
      console.log(`  ✓ Found ${transactions.length} transactions on page ${currentPage}`);
      if (!onPageCrawled) {
        console.log(`  📊 Total so far: ${allTransactions.length} transactions\n`);
      }
      
      // 检查是否有下一页
      if (currentPage < maxPages) {
        hasMore = await hasNextPage(page);
        
        if (hasMore) {
          const success = await goToNextPage(page);
          if (!success) {
            console.log('  ℹ️  No more pages available');
            hasMore = false;
          } else {
            currentPage++;
            await page.waitForTimeout(CONFIG.delayBetweenPages);
          }
        } else {
          console.log('  ℹ️  Reached last page');
        }
      } else {
        hasMore = false;
      }
    }
    
    console.log(`\n✅ Crawling complete!`);
    console.log(`   Total pages: ${currentPage}`);
    console.log(`   Total transactions: ${allTransactions.length}\n`);
    
    console.log('📌 Browser will remain open.');
    console.log('   Close the browser window manually to stop the crawler.');
    console.log('   Or press Ctrl+C in the terminal to stop the script.\n');
    
    // 等待用户手动关闭浏览器
    if (browser && browser.isConnected()) {
      console.log('⏳ Waiting for browser to be closed manually...');
      try {
        // 监听浏览器断开连接
        await new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            if (!browser.isConnected()) {
              clearInterval(checkInterval);
              console.log('\n✅ Browser closed by user.');
              resolve();
            }
          }, 1000);
          
          // 监听进程信号
          const stopHandler = () => {
            clearInterval(checkInterval);
            console.log('\n⚠️  Received stop signal. Stopping crawler...');
            resolve();
          };
          
          process.on('SIGINT', stopHandler);
          process.on('SIGTERM', stopHandler);
        });
      } catch (e) {
        // 忽略错误
      }
    }
    
    return allTransactions;
    
  } catch (error) {
    console.error(`\n❌ Crawler error: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    console.error('\n💡 Troubleshooting tips:');
    console.error('   1. Make sure you are logged in to eBay');
    console.error('   2. Check if the browser window is still open');
    console.error('   3. Verify you are on the Research page');
    console.error('   4. Try running with --headless=false to see what\'s happening');
    
    console.error('\n⚠️  Browser will remain open. Close it manually to stop the crawler.');
    
    // 不关闭浏览器，让用户手动关闭
    // 等待浏览器关闭信号（通过监听页面关闭事件）
    if (page) {
      page.on('close', () => {
        console.log('\n✅ Browser closed by user. Crawler stopped.');
      });
    }
    
    // 等待用户手动关闭浏览器
    console.log('\n⏳ Waiting for browser to be closed manually...');
    if (browser && browser.isConnected()) {
      try {
        await new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            if (!browser.isConnected()) {
              clearInterval(checkInterval);
              console.log('\n✅ Browser closed by user.');
              resolve();
            }
          }, 1000);
          
          // 监听进程信号
          const stopHandler = () => {
            clearInterval(checkInterval);
            console.log('\n⚠️  Received stop signal. Stopping crawler...');
            resolve();
          };
          
          process.on('SIGINT', stopHandler);
          process.on('SIGTERM', stopHandler);
        });
      } catch (e) {
        // 忽略错误
      }
    }
    
    throw error;
  } finally {
    // 不自动关闭浏览器，让用户手动关闭
    console.log('\n📌 Browser will remain open.');
    console.log('   To stop the crawler, close the browser window manually.');
    console.log('   Or press Ctrl+C in the terminal to stop the script.');
    
    // 只有在浏览器已经关闭的情况下才清理资源
    // 否则保持浏览器打开
    if (browser && browser.isConnected()) {
      console.log('   Browser is still open. Close it manually to stop.');
      // 不关闭浏览器，等待用户操作
    } else {
      // 浏览器已经关闭，清理资源
      if (page) {
        try {
          await page.close();
        } catch (e) {
          // 忽略关闭错误
        }
      }
      if (browserContext && context) {
        // 不关闭共享的上下文
      } else if (context) {
        try {
          await context.close();
        } catch (e) {
          // 忽略关闭错误
        }
      }
    }
  }
}

/**
 * 创建带登录状态的浏览器上下文
 * 用于保持 eBay 登录状态
 */
async function createAuthenticatedContext(headless = true) {
  const browser = await chromium.launch({
    headless: headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    viewport: { width: 1920, height: 1080 },
  });
  
  // 导航到登录页面，让用户手动登录
  const page = await context.newPage();
  await page.goto('https://www.ebay.com/signin/');
  
  console.log('\n🔐 Please log in to eBay in the browser window...');
  console.log('   Press Enter after you have logged in...\n');
  
  // 等待用户登录（这里可以改为自动检测登录状态）
  await new Promise((resolve) => {
    process.stdin.once('data', () => resolve());
  });
  
  // 保存 cookies 以便后续使用
  const cookies = await context.cookies();
  console.log(`✓ Saved ${cookies.length} cookies\n`);
  
  return { browser, context, cookies };
}

module.exports = {
  crawl,
  createAuthenticatedContext,
  CONFIG,
};

