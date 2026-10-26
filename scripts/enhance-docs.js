const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2] || path.join(__dirname, '../.github/docs/_book');

if (!fs.existsSync(targetDir)) {
  console.error(`Target directory does not exist: ${targetDir}`);
  process.exit(1);
}

const SERVICES = [
  { id: "peak", name: "Peak", emoji: "🏔️", group: "CAPTCHA Solvers" },
  { id: "yescaptcha", name: "YesCaptcha", emoji: "🧩", group: "CAPTCHA Solvers" },
  { id: "chaojiying", name: "Chaojiying", emoji: "🦅", group: "CAPTCHA Solvers" },
  { id: "solvecaptcha", name: "SolveCaptcha", emoji: "🤖", group: "CAPTCHA Solvers" },
  { id: "twocaptcha", name: "2Captcha", emoji: "⚡", group: "CAPTCHA Solvers" },
  { id: "capguru", name: "CapGuru", emoji: "🧠", group: "CAPTCHA Solvers" },
  { id: "grizzly-sms", name: "Grizzly SMS", emoji: "🐻", group: "SMS Verification" },
  { id: "sv-number", name: "SV Number", emoji: "📱", group: "SMS Verification" },
  { id: "smsbulk", name: "SMSBulk", emoji: "📬", group: "SMS Verification" },
  { id: "smsbower", name: "SMSBower", emoji: "💌", group: "SMS Verification" },
  { id: "vak-sms", name: "VAK-SMS", emoji: "📲", group: "SMS Verification" },
  { id: "give-sms", name: "Give-SMS", emoji: "✉️", group: "SMS Verification" },
  { id: "onlinesim", name: "OnlineSIM", emoji: "📱", group: "SMS Verification" },
  { id: "sms-man", name: "SMS-MAN", emoji: "📲", group: "SMS Verification" },
  { id: "bitcoinvn", name: "BitcoinVN", emoji: "₿", group: "Crypto Swaps" },
  { id: "swapzone", name: "Swapzone", emoji: "🔄", group: "Crypto Swaps" },
  { id: "simpleswap", name: "SimpleSwap", emoji: "⚡", group: "Crypto Swaps" },
  { id: "stealthex", name: "StealthEX", emoji: "🛡️", group: "Crypto Swaps" },
  { id: "sideshift", name: "SideShift", emoji: "🔄", group: "Crypto Swaps" }
];

// 1. Ensure styles directory in output
const stylesSrc = path.join(__dirname, '../.github/docs/styles');
const stylesDest = path.join(targetDir, 'styles');
fs.mkdirSync(stylesDest, { recursive: true });

if (fs.existsSync(path.join(stylesSrc, 'website.css'))) {
  fs.copyFileSync(path.join(stylesSrc, 'website.css'), path.join(stylesDest, 'website.css'));
}
if (fs.existsSync(path.join(stylesSrc, 'website.js'))) {
  fs.copyFileSync(path.join(stylesSrc, 'website.js'), path.join(stylesDest, 'website.js'));
}

function getServiceFromPath(filePath) {
  const rel = path.relative(targetDir, filePath);
  const parts = rel.split(path.sep);
  if (parts.length > 1) {
    return SERVICES.find(s => s.id === parts[0]) || null;
  }
  return null;
}

function buildHeaderHtml(activeService, prefix) {
  const groups = {};
  SERVICES.forEach(s => {
    if (!groups[s.group]) groups[s.group] = [];
    groups[s.group].push(s);
  });

  let selectHtml = `<select id="service-switcher" class="service-select">`;
  selectHtml += `<option value="${prefix}index.html">🧭 Catalog Overview</option>`;
  for (const [groupName, items] of Object.entries(groups)) {
    selectHtml += `<optgroup label="${groupName}">`;
    items.forEach(item => {
      const isSelected = activeService && activeService.id === item.id ? 'selected' : '';
      selectHtml += `<option value="${prefix}${item.id}/index.html" ${isSelected}>${item.emoji} ${item.name}</option>`;
    });
    selectHtml += `</optgroup>`;
  }
  selectHtml += `</select>`;

  return `
<header class="custom-header">
  <div class="header-left">
    <a href="${prefix}index.html" class="brand-link">
      <span class="brand-badge">⚡</span>
      <span class="brand-text">api-kit</span>
    </a>
    <span class="header-divider">/</span>
    ${selectHtml}
  </div>
  <div class="header-right">
    <a href="https://github.com/TysikGG/api-kit" target="_blank" rel="noopener noreferrer" class="header-github">
      <svg height="18" width="18" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg>
      <span>GitHub</span>
    </a>
    <button id="theme-toggle" class="theme-btn" title="Toggle dark/light mode">☀️</button>
  </div>
</header>
`;
}

function isolateSidebarHtml(html, activeService, prefix) {
  if (!activeService) return html;

  const navMatch = html.match(/(<nav role="navigation">)[\s\S]*?(<\/nav>)/);
  if (!navMatch) return html;

  const fullNav = navMatch[0];
  const headerMarker = `<li class="header">${activeService.name}</li>`;
  const startIdx = fullNav.indexOf(headerMarker);
  if (startIdx === -1) return html;

  let nextHeaderIdx = fullNav.indexOf('<li class="header">', startIdx + headerMarker.length);
  if (nextHeaderIdx === -1) {
    nextHeaderIdx = fullNav.lastIndexOf('</ul>');
  }

  const serviceGroup = fullNav.substring(startIdx, nextHeaderIdx);

  const bannerHtml = `
    <li class="service-sidebar-banner">
      <a href="${prefix}index.html" class="all-services-link">← All Services</a>
      <div class="service-badge-title">
        <span>${activeService.emoji}</span>
        <span>${activeService.name}</span>
      </div>
    </li>
  `;

  const newNav = `<nav role="navigation">\n<ul class="summary">\n${bannerHtml}\n${serviceGroup}\n</ul>\n</nav>`;
  return html.replace(/<nav role="navigation">[\s\S]*?<\/nav>/, newNav);
}

function walk(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'gitbook') {
        walk(fullPath, callback);
      }
    } else if (file.endsWith('.html')) {
      callback(fullPath);
    }
  }
}

let patchedCount = 0;

walk(targetDir, (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  const relToRoot = path.relative(path.dirname(filePath), targetDir);
  const prefix = relToRoot ? relToRoot.replace(/\\/g, '/') + '/' : './';
  const activeService = getServiceFromPath(filePath);

  // Fix .md links
  content = content.replace(/href="([^":#]+)\.md(#?[^"]*)"/g, (match, p1, p2) => {
    if (p1.endsWith('README')) {
      return `href="${p1.slice(0, -6)}index.html${p2}"`;
    }
    return `href="${p1}.html${p2}"`;
  });

  // Isolate sidebar to ONLY current service
  content = isolateSidebarHtml(content, activeService, prefix);

  // Inject header & body classes
  const bodyClass = activeService ? 'dark-mode service-active' : 'dark-mode';
  content = content.replace(/<body([^>]*)>/, `<body$1 class="${bodyClass}">\n${buildHeaderHtml(activeService, prefix)}`);
  content = content.replace('<html lang="en">', '<html lang="en" class="dark">');

  // Inject CSS
  if (!content.includes('styles/website.css')) {
    const cssTag = `    <link rel="stylesheet" href="${prefix}styles/website.css">\n`;
    content = content.replace('</head>', cssTag + '</head>');
  }

  // Inject JS
  if (!content.includes('styles/website.js')) {
    const jsTag = `    <script src="${prefix}styles/website.js" defer></script>\n`;
    content = content.replace('</body>', jsTag + '</body>');
  }

  fs.writeFileSync(filePath, content, 'utf8');
  patchedCount++;
});

// Create 404.html
const indexFile = path.join(targetDir, 'index.html');
const notFoundFile = path.join(targetDir, '404.html');
if (fs.existsSync(indexFile)) {
  fs.copyFileSync(indexFile, notFoundFile);
}

console.log(`Enhanced ${patchedCount} HTML documentation files in ${targetDir}`);
