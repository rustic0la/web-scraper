import { existsSync, mkdirSync } from "fs";
import { ElementHandle, Page } from "puppeteer";
import { read } from "clipboardy";

const getScreenshot = async (
  page: Page,
  el: ElementHandle<Element>,
  directory: string
) => {
  const path = `${directory}/images`;
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }

  const name = Math.random();
  const box = await el.boundingBox();
  const x = box["x"];
  const y = box["y"];
  const w = box["width"];
  const h = box["height"];
  await page.waitForTimeout(5000)
  await page.screenshot({
    path: `${path}/${name}.png`,
    clip: { x: x, y: y, width: w, height: h },
  });
  await page.waitForTimeout(5000)


  return `![${name}](./images/${name}.png)`;
};

export const parseSvg = async (
  page: Page,
  paragraph: ElementHandle<Element>,
  directory: string
): Promise<string> => {

  try {
    const canvas = await paragraph.$(
      "div.styles__CanvasAnimationViewer-sc-8tvqhb-5.eRcmnA"
    );

    if (canvas) {
      const svg = await canvas.$("svg");
      return await getScreenshot(page, svg, directory);
    }
  } catch (e) {
    console.log(e);
  }
};

export const parseImg = async (
  page: Page,
  paragraph: ElementHandle<Element>,
  directory: string
) => {

  try {
    const img = await paragraph.$("img");

    if (img) {
      return await getScreenshot(page, img, directory);
    }
  } catch (e) {
    console.log(e);
  }
};

export const parseCode = async (
  paragraph: ElementHandle<Element>
): Promise<string> => {
  const codeEditor = await paragraph.$(
    "div.styles__CodeEditorStyled-sc-2pjuhh-0"
  );

  if (codeEditor) {
    const copyCodeBtn = await paragraph.$('[aria-label="copy-code-button"]');
    const btn = await copyCodeBtn.$("svg");

    await btn.click();

    const code = await read();

    return `<pre>~~~python\n${code}\n~~~</pre>`;
  }
};