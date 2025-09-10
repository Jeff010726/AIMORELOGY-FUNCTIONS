(function () {
  const defaults = {
    siteName: '爱谋科技 - 深圳专业软硬件研发与智能制造服务商',
    siteUrl: 'https://aimorelogy.com',
    description: '深圳爱谋科技专注软硬件研发7年，提供PCB设计、嵌入式开发、量产制造、网站建设等一站式服务，已为50+企业提供技术解决方案。',
    image: 'https://aimorelogy.com/images/og-image.jpg',
    themeColor: '#00ff88',
    twitterCard: 'summary_large_image',
    locale: 'zh_CN'
  };

  const page = window.PAGE_SEO || {};
  const title = page.title || defaults.siteName;
  const description = page.description || defaults.description;
  const image = page.image || defaults.image;
  const url = page.url || (defaults.siteUrl + location.pathname);

  document.title = title;

  function applyMeta(attr, name, content) {
    if (!content) return;
    let selector = `[${attr}="${name}"]`;
    let tag = document.head.querySelector(selector);
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute(attr, name);
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
  }

  applyMeta('name', 'description', description);
  applyMeta('name', 'theme-color', defaults.themeColor);
  applyMeta('property', 'og:title', title);
  applyMeta('property', 'og:description', description);
  applyMeta('property', 'og:type', 'website');
  applyMeta('property', 'og:url', url);
  applyMeta('property', 'og:image', image);
  applyMeta('name', 'twitter:card', defaults.twitterCard);
  applyMeta('name', 'twitter:title', title);
  applyMeta('name', 'twitter:description', description);
  applyMeta('name', 'twitter:image', image);
})(); 