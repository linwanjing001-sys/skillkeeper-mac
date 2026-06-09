const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const previewUrl =
  process.env.SKILLKEEPER_PREVIEW_URL || pathToFileURL(path.join(__dirname, '..', 'dist', 'index.html')).toString();
const preloadPath = path.join(__dirname, '..', 'dist-electron', 'preload.js');

process.env.SKILLKEEPER_CAPTURE = '1';
require('../dist-electron/main.js');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1120,
    height: 760,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      offscreen: true,
      preload: preloadPath
    }
  });

  await win.loadURL(previewUrl);
  await new Promise((resolve) => setTimeout(resolve, 1600));

  const results = await win.webContents.executeJavaScript(`
    (async () => {
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const audit = [];
      const waitFor = async (condition, timeout = 6000) => {
        const start = Date.now();
        while (Date.now() - start < timeout) {
          if (condition()) return true;
          await sleep(100);
        }
        return false;
      };

      const text = (selector) => document.querySelector(selector)?.textContent?.trim() || '';
      const countCards = () => document.querySelectorAll('.skill-card').length;
      const cardPaths = () => [...document.querySelectorAll('.skill-info small')].map((node) => node.textContent || '');
      const clickTestId = (id) => document.querySelector('[data-testid="' + id + '"]')?.click();
      const setInputValue = (input, value) => {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        setter?.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      };
      localStorage.removeItem('skillkeeper.themePreference');
      localStorage.removeItem('skillkeeper.favoriteSkillIds');

      await waitFor(() => [...document.querySelectorAll('button')].some((button) =>
        button.textContent?.includes('重新扫描')
      ));

      const scanButtons = [...document.querySelectorAll('button')].filter((button) =>
        button.textContent?.includes('重新扫描')
      );
      audit.push({
        name: '单一扫描入口',
        found: scanButtons.length > 0,
        changed: scanButtons.length === 1
      });

      const codexFilter = document.querySelector('[data-testid="source-filter-codex"]');
      codexFilter?.click();
      await sleep(180);
      const codexCount = countCards();
      const codexMetric = text('[data-testid="metric-total"]');
      audit.push({
        name: 'Codex 父级筛选',
        found: Boolean(codexFilter),
        changed: codexCount > 0 && codexMetric === String(codexCount)
      });

      const codexUserFilter = document.querySelector('[data-testid="source-filter-codex-user"]');
      codexUserFilter?.click();
      await sleep(180);
      const userPaths = cardPaths();
      audit.push({
        name: 'Codex 用户筛选',
        found: Boolean(codexUserFilter),
        changed: userPaths.length > 0 && userPaths.every((value) => !value.includes('/.system'))
      });

      const codexBuiltinFilter = document.querySelector('[data-testid="source-filter-codex-builtin"]');
      codexBuiltinFilter?.click();
      await sleep(180);
      const builtinPaths = cardPaths();
      const builtinMetric = text('[data-testid="metric-total"]');
      audit.push({
        name: 'Codex 内置筛选',
        found: Boolean(codexBuiltinFilter),
        changed: builtinPaths.length > 0 && builtinPaths.every((value) => value.includes('/.system')) && builtinMetric === String(builtinPaths.length)
      });

      const beforeToast = document.querySelector('.toast')?.textContent || '';
      const skillCard = document.querySelector('.skill-card');
      skillCard?.click();
      await sleep(180);
      audit.push({
        name: 'Skill 点击展示详情',
        found: Boolean(skillCard) && Boolean(document.querySelector('[data-testid="skill-inspector"]')),
        changed: Boolean(document.querySelector('[data-testid="skill-detail-description"]')) &&
          beforeToast === (document.querySelector('.toast')?.textContent || '')
      });

      clickTestId('open-skill-folder');
      await sleep(180);
      audit.push({
        name: '详情按钮打开文件夹',
        found: Boolean(document.querySelector('[data-testid="open-skill-folder"]')),
        changed: Boolean(document.querySelector('.toast'))
      });

      const beforeCopyToast = document.querySelector('.toast')?.textContent || '';
      clickTestId('copy-skill-name');
      await sleep(180);
      const afterCopyToast = document.querySelector('.toast')?.textContent || '';
      audit.push({
        name: '复制 Skill 名称',
        found: Boolean(document.querySelector('[data-testid="copy-skill-name"]')),
        changed: afterCopyToast.includes('已复制') && afterCopyToast !== beforeCopyToast
      });

      audit.push({
        name: '详情显示调用次数',
        found: Boolean(document.querySelector('[data-testid="skill-usage-count"]')),
        changed: Boolean(document.querySelector('[data-testid="skill-last-used"]'))
      });

      const queryInput = document.querySelector('.search input');
      const selectedTitle = document.querySelector('.skill-card.active .skill-title strong')?.textContent?.trim() || '';
      setInputValue(queryInput, selectedTitle.slice(0, Math.min(6, selectedTitle.length)) || 'skill');
      await sleep(120);
      const persistedFilterBeforeTheme = document.querySelector('[data-testid="source-filter-codex-builtin"]')?.classList.contains('active');
      const selectedBeforeTheme = document.querySelector('.skill-card.active')?.textContent || '';
      const searchBeforeTheme = queryInput.value;

      clickTestId('theme-dark');
      await sleep(180);
      audit.push({
        name: '暗黑主题切换',
        found: Boolean(document.querySelector('[data-testid="theme-switcher"]')) && Boolean(document.querySelector('[data-testid="theme-dark"]')),
        changed: document.documentElement.dataset.theme === 'dark' &&
          localStorage.getItem('skillkeeper.themePreference') === 'dark' &&
          persistedFilterBeforeTheme === document.querySelector('[data-testid="source-filter-codex-builtin"]')?.classList.contains('active') &&
          selectedBeforeTheme === (document.querySelector('.skill-card.active')?.textContent || '') &&
          searchBeforeTheme === queryInput.value
      });

      clickTestId('theme-light');
      await sleep(180);
      audit.push({
        name: '浅色主题切换',
        found: Boolean(document.querySelector('[data-testid="theme-light"]')),
        changed: document.documentElement.dataset.theme === 'light' &&
          localStorage.getItem('skillkeeper.themePreference') === 'light'
      });

      clickTestId('theme-system');
      await sleep(180);
      audit.push({
        name: '跟随系统主题切换',
        found: Boolean(document.querySelector('[data-testid="theme-system"]')),
        changed: localStorage.getItem('skillkeeper.themePreference') === 'system' &&
          ['light', 'dark'].includes(document.documentElement.dataset.theme || '')
      });

      const firstFavorite = document.querySelector('[data-testid="favorite-skill"]');
      const favoriteName = firstFavorite?.closest('.skill-card')?.querySelector('.skill-title strong')?.textContent || '';
      firstFavorite?.click();
      await sleep(180);
      const favoriteFilter = document.querySelector('[data-testid="source-filter-favorites"]');
      favoriteFilter?.click();
      await sleep(180);
      const favoriteTitles = [...document.querySelectorAll('.skill-card .skill-title strong')].map((node) => node.textContent || '');
      audit.push({
        name: '收藏筛选',
        found: Boolean(firstFavorite) && Boolean(favoriteFilter),
        changed: favoriteTitles.length > 0 && favoriteTitles.includes(favoriteName)
      });

      clickTestId('source-filter-all');
      await sleep(180);
      clickTestId('delete-mode-toggle');
      await sleep(180);
      const checkboxesVisible = document.querySelectorAll('[data-testid="delete-skill-checkbox"]').length;
      clickTestId('select-all-visible');
      await sleep(180);
      const checkedCount = [...document.querySelectorAll('[data-testid="delete-skill-checkbox"]')].filter((input) => input.checked).length;
      audit.push({
        name: '删除模式全选',
        found: Boolean(document.querySelector('[data-testid="delete-mode-toggle"]')) && Boolean(document.querySelector('[data-testid="select-all-visible"]')),
        changed: checkboxesVisible > 0 && checkedCount === checkboxesVisible
      });

      clickTestId('trash-selected-skills');
      await sleep(180);
      const confirmDialog = document.querySelector('[data-testid="trash-confirmation"]');
      clickTestId('confirm-trash-skills');
      await sleep(600);
      audit.push({
        name: '删除确认与废纸篓',
        found: Boolean(confirmDialog) && Boolean(document.querySelector('[data-testid="confirm-trash-skills"]')),
        changed: (document.querySelector('.toast')?.textContent || '').includes('废纸篓')
      });

      clickTestId('delete-mode-toggle');
      await sleep(180);
      clickTestId('cancel-delete-mode');
      await sleep(180);
      audit.push({
        name: '删除模式取消收起',
        found: Boolean(document.querySelector('[data-testid="cancel-delete-mode"]')) || checkboxesVisible > 0,
        changed: document.querySelectorAll('[data-testid="delete-skill-checkbox"]').length === 0
      });

      return audit;
    })()
  `);

  console.table(results);
  const failed = results.filter((result) => !result.found || !result.changed);
  if (failed.length > 0) {
    console.log('FAILED:', failed.map((result) => result.name).join(', '));
    await app.quit();
    process.exit(1);
  }

  await app.quit();
});
