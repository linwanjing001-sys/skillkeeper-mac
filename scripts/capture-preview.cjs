const { app, BrowserWindow } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const previewUrl =
  process.env.SKILLKEEPER_PREVIEW_URL || pathToFileURL(path.join(__dirname, '..', 'dist', 'index.html')).toString();
const outputPath = path.join(__dirname, '..', 'skillkeeper-preview.png');
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
  await new Promise((resolve) => setTimeout(resolve, 2600));
  await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const startedAt = Date.now();
      const waitForReady = () => {
        if (document.querySelector('.skill-card') || document.querySelector('.empty') || Date.now() - startedAt > 7000) {
          resolve();
          return;
        }
        setTimeout(waitForReady, 120);
      };
      waitForReady();
    })
  `);

  const image = await win.capturePage();
  await fs.writeFile(outputPath, image.toPNG());

  await app.quit();
});
