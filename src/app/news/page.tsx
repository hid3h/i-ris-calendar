import * as cheerio from 'cheerio';

interface NewsItem {
  title: string;
  link: string;
  content: string;
  date?: string;
}

async function fetchNewsContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Try to extract main content from common selectors
    let content = '';
    const selectors = [
      'article',
      '.article-content',
      '.post-content',
      '.entry-content',
      'main',
      '.content',
      '#content'
    ];
    
    for (const selector of selectors) {
      const element = $(selector);
      if (element.length > 0) {
        content = element.text().trim();
        break;
      }
    }
    
    // If no specific content area found, get all text from body
    if (!content) {
      content = $('body').text().trim();
    }
    
    // Clean up the content
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .substring(0, 1000); // Limit content length
    
    return content || 'コンテンツを取得できませんでした';
  } catch (error) {
    console.error('Error fetching content:', error);
    return 'コンテンツの取得中にエラーが発生しました';
  }
}

async function fetchNewsData(): Promise<NewsItem[]> {
  try {
    const response = await fetch('https://iris.dive2ent.com/news/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      next: { revalidate: 1800 } // Cache for 30 minutes
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    const newsItems: NewsItem[] = [];
    
    // Try to find news links - common patterns
    const linkSelectors = [
      'a[href*="/news/"]',
      '.news-item a',
      '.article-title a',
      '.post-title a',
      'h2 a',
      'h3 a'
    ];
    
    let foundLinks = false;
    
    for (const selector of linkSelectors) {
      const links = $(selector);
      if (links.length > 0) {
        foundLinks = true;
        
        // Limit to first 5 news items to avoid overwhelming the page
        const limitedLinks = links.slice(0, 5);
        
        for (let i = 0; i < limitedLinks.length; i++) {
          const link = $(limitedLinks[i]);
          const href = link.attr('href');
          const title = link.text().trim();
          
          if (href && title) {
            let fullUrl = href;
            if (href.startsWith('/')) {
              fullUrl = `https://iris.dive2ent.com${href}`;
            }
            
            const content = await fetchNewsContent(fullUrl);
            
            newsItems.push({
              title,
              link: fullUrl,
              content,
              date: new Date().toLocaleDateString('ja-JP')
            });
          }
        }
        break;
      }
    }
    
    if (!foundLinks) {
      // Fallback: try to get any links that might be news
      $('a').each((i, element) => {
        if (i >= 5) return false; // Limit to first 5
        
        const link = $(element);
        const href = link.attr('href');
        const title = link.text().trim();
        
        if (href && title && title.length > 10) {
          let fullUrl = href;
          if (href.startsWith('/')) {
            fullUrl = `https://iris.dive2ent.com${href}`;
          }
          
          newsItems.push({
            title,
            link: fullUrl,
            content: 'コンテンツを取得中...',
            date: new Date().toLocaleDateString('ja-JP')
          });
        }
      });
    }
    
    return newsItems;
  } catch (error) {
    console.error('Error fetching news:', error);
    return [{
      title: 'エラー',
      link: '',
      content: 'ニュースの取得中にエラーが発生しました。ネットワーク接続を確認してください。',
      date: new Date().toLocaleDateString('ja-JP')
    }];
  }
}

export default async function NewsPage() {
  const newsData = await fetchNewsData();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">
        IRIS News Content
      </h1>
      
      <div className="space-y-8">
        {newsData.map((item, index) => (
          <article key={index} className="bg-white shadow-lg rounded-lg p-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-2">
              <a 
                href={item.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                {item.title}
              </a>
            </h2>
            
            {item.date && (
              <p className="text-sm text-gray-500 mb-4">
                取得日: {item.date}
              </p>
            )}
            
            <div className="prose max-w-none">
              <p className="text-gray-700 leading-relaxed">
                {item.content}
              </p>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-100">
              <a 
                href={item.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700 text-sm"
              >
                元記事を読む →
              </a>
            </div>
          </article>
        ))}
      </div>
      
      {newsData.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">ニュースが見つかりませんでした</p>
        </div>
      )}
      
      <div className="mt-12 text-center">
        <a 
          href="/"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          ホームに戻る
        </a>
      </div>
    </div>
  );
}