const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1237, height: 900 });
  await page.goto('http://localhost:4173/index.html', { waitUntil: 'networkidle0' });

  const info = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll('.hero.hero-full .hero-actions .button').forEach(btn => {
      const cs = getComputedStyle(btn);
      const rect = btn.getBoundingClientRect();
      const span = btn.querySelector('span');
      const spanRect = span ? span.getBoundingClientRect() : null;
      results.push({
        text: btn.textContent.trim(),
        height: cs.height,
        lineHeight: cs.lineHeight,
        display: cs.display,
        alignItems: cs.alignItems,
        justifyContent: cs.justifyContent,
        padding: cs.padding,
        boxSizing: cs.boxSizing,
        rectHeight: rect.height,
        rectTop: rect.top,
        spanRectTop: spanRect ? spanRect.top : null,
        font: cs.font,
        flexWrap: cs.flexWrap,
      });
    });
    const actions = document.querySelector('.hero.hero-full .hero-actions');
    const acs = getComputedStyle(actions);
    const arect = actions.getBoundingClientRect();
    return {
      buttons: results,
      heroActions: {
        display: acs.display,
        alignItems: acs.alignItems,
        height: acs.height,
        flexDirection: acs.flexDirection,
        rectHeight: arect.height,
      }
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
