(function () {
  const SERVICES = [
    { id: "peak", name: "Peak", emoji: "🏔️", group: "CAPTCHA Solvers" },
    { id: "yescaptcha", name: "YesCaptcha", emoji: "🧩", group: "CAPTCHA Solvers" },
    { id: "chaojiying", name: "Chaojiying", emoji: "🦅", group: "CAPTCHA Solvers" },
    { id: "solvecaptcha", name: "SolveCaptcha", emoji: "🤖", group: "CAPTCHA Solvers" },
    { id: "grizzly-sms", name: "Grizzly SMS", emoji: "🐻", group: "SMS Verification" },
    { id: "sv-number", name: "SV Number", emoji: "📱", group: "SMS Verification" },
    { id: "smsbulk", name: "SMSBulk", emoji: "📬", group: "SMS Verification" },
    { id: "smsbower", name: "SMSBower", emoji: "💌", group: "SMS Verification" },
    { id: "vak-sms", name: "VAK-SMS", emoji: "📲", group: "SMS Verification" },
    { id: "bitcoinvn", name: "BitcoinVN", emoji: "₿", group: "Crypto Swaps" },
    { id: "swapzone", name: "Swapzone", emoji: "🔄", group: "Crypto Swaps" },
    { id: "simpleswap", name: "SimpleSwap", emoji: "⚡", group: "Crypto Swaps" },
    { id: "stealthex", name: "StealthEX", emoji: "🛡️", group: "Crypto Swaps" }
  ];

  function getBasePath() {
    return window.location.pathname.startsWith('/api-kit/') ? '/api-kit/' : '/';
  }

  function getActiveService() {
    const path = window.location.pathname;
    for (const s of SERVICES) {
      if (path.includes('/' + s.id + '/') || path.endsWith('/' + s.id) || path.includes('/' + s.id + '.html')) {
        return s;
      }
    }
    return null;
  }

  function initTheme() {
    const saved = localStorage.getItem('api-kit-theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = saved === 'dark' || (!saved && prefersDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark-mode');
    }
  }

  function toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark-mode');
      localStorage.setItem('api-kit-theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark-mode');
      localStorage.setItem('api-kit-theme', 'dark');
    }
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = isDark ? '🌙' : '☀️';
  }

  function buildHeader(activeService) {
    if (document.querySelector('.custom-header')) return;
    const base = getBasePath();
    const isDark = document.documentElement.classList.contains('dark');

    const header = document.createElement('header');
    header.className = 'custom-header';

    const groups = {};
    SERVICES.forEach(s => {
      if (!groups[s.group]) groups[s.group] = [];
      groups[s.group].push(s);
    });

    let selectHtml = `<select id="service-switcher" class="service-select">`;
    selectHtml += `<option value="${base}">🧭 Catalog Overview</option>`;
    for (const [groupName, items] of Object.entries(groups)) {
      selectHtml += `<optgroup label="${groupName}">`;
      items.forEach(item => {
        const isSelected = activeService && activeService.id === item.id ? 'selected' : '';
        selectHtml += `<option value="${base}${item.id}/index.html" ${isSelected}>${item.emoji} ${item.name}</option>`;
      });
      selectHtml += `</optgroup>`;
    }
    selectHtml += `</select>`;

    header.innerHTML = `
      <div class="header-left">
        <a href="${base}" class="brand-link">
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
        <button id="theme-toggle" class="theme-btn" title="Toggle dark/light mode">${isDark ? '☀️' : '🌙'}</button>
      </div>
    `;

    document.body.prepend(header);

    const switcher = document.getElementById('service-switcher');
    if (switcher) {
      switcher.addEventListener('change', function () {
        if (this.value) window.location.href = this.value;
      });
    }

    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', toggleTheme);
    }
  }

  function isolateSidebar(activeService) {
    const summary = document.querySelector('.book-summary ul.summary');
    if (!summary) return;
    const base = getBasePath();

    if (!activeService) {
      // On homepage: show intro and service headers
      return;
    }

    document.body.classList.add('service-active');

    // Find and tag items belonging to this service
    const items = Array.from(summary.children);
    let isCurrentGroup = false;

    items.forEach(li => {
      if (li.classList.contains('header')) {
        const text = li.textContent.trim().toLowerCase();
        isCurrentGroup = text.includes(activeService.name.toLowerCase());
        if (isCurrentGroup) li.classList.add('current-service-item');
      } else if (isCurrentGroup) {
        li.classList.add('current-service-item');
      }
    });

    // Insert banner above current service items
    const banner = document.createElement('li');
    banner.className = 'current-service-item service-sidebar-banner';
    banner.innerHTML = `
      <a href="${base}" class="all-services-link">← All Services</a>
      <div class="service-badge-title">
        <span>${activeService.emoji}</span>
        <span>${activeService.name}</span>
      </div>
    `;
    summary.prepend(banner);
  }

  function setupCopyButtons() {
    document.querySelectorAll('.markdown-section pre').forEach(pre => {
      if (pre.querySelector('.copy-code-btn')) return;
      const btn = document.createElement('button');
      btn.className = 'copy-code-btn';
      btn.textContent = 'Copy';
      btn.title = 'Copy to clipboard';

      btn.addEventListener('click', () => {
        const code = pre.querySelector('code');
        const text = code ? code.innerText : pre.innerText;
        navigator.clipboard.writeText(text).then(() => {
          btn.textContent = 'Copied! ✓';
          setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
        });
      });

      pre.appendChild(btn);
    });
  }

  function run() {
    initTheme();
    const activeService = getActiveService();
    buildHeader(activeService);
    isolateSidebar(activeService);
    setupCopyButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
