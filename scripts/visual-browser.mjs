import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
export const labUrl = process.env.LAB_URL || 'http://127.0.0.1:4357';
export function launchVisualBrowser() {
  const executablePath = process.env.CHROME_PATH;
  return chromium.launch({
    ...(executablePath ? { executablePath } : existsSync('/Applications/Google Chrome.app') ? { channel: 'chrome' } : {}),
    headless: process.env.HEADED !== '1',
  });
}
