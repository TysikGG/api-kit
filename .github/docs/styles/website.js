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
    { id: "give-sms", name: "Give-SMS", emoji: "✉️", group: "SMS Verification" },
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
    // Default to dark mode for modern high-tech developer aesthetic
    const isDark = saved === 'light' ? false : true;
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark-mode');
    }
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = isDark ? '☀️' : '🌙';
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

  function setupHeaderEvents() {
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
    setupHeaderEvents();
    setupCopyButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
