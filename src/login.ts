import { launch, Browser, Page } from "puppeteer";

import {
  BASE_URL,
  EMAIL,
  HTTP_REQUEST_TIMEOUT,
  PASSWORD,
  ROOT_PATH,
} from "./globals";

let browser: Browser;
export const sleep = ms => new Promise(res => setTimeout(res, ms));

async function launchBrowser(args?) {

  let configuration = {
    headless: true,
    defaultViewport: null,
    args: ["--window-size=1920,1080", '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-setuid-sandbox',
      '--no-first-run',
      '--no-sandbox',
      '--no-zygote',
      '--deterministic-fetch',
      '--disable-features=IsolateOrigins',
      '--disable-site-isolation-trials', '--disable-features=site-per-process'],
    browserContext: "default",
    timeout: 60000
  };

  if (args) {
    configuration = {
      ...configuration,
      ...args,
    };
  }

  browser = await launch(configuration);
}

export async function getBrowser() {
  if (!browser) {
    await launchBrowser();
  }

  return browser;
}

export async function getPage(): Promise<Page> {
  if (!browser) {
    throw new Error("No browser initialed yet");
  }

  let [page] = await browser.pages();
  if (!page) {
    page = await browser.newPage();
  }

  return page;
}

export async function clickButton(page, className, buttonLabel) {
  const isClicked = await page.evaluate(
    ({ className, buttonLabel }) => {
      const elements = document.getElementsByTagName(className) as unknown as HTMLElement[];

      for (let i = 0; i < elements.length; i++) {
        // @ts-ignore
        if (elements[i].innerHTML === buttonLabel || elements[i].value === buttonLabel || elements[i].textContent === buttonLabel) {
          elements[i].click();
          return true;
        }
      }

      return false;
    },
    { className, buttonLabel }
  );

  return isClicked;
}

export async function login() {
  const page = await getPage();
  page.on('console', async (msg) => {
    const msgArgs = msg.args();
    for (let i = 0; i < msgArgs.length; ++i) {
      console.log(await msgArgs[i].jsonValue());
    }
  });

  await page.goto(BASE_URL, { waitUntil: "networkidle2", timeout: 120000});

  const btn = await page.waitForSelector('#__next > div > nav.sticky.top-0.h-14.w-full.sm\\:h-16.hide-enterprise-nav.border-transparent.bg-transparent.mx-auto.transition.duration-300.ease-in-out.lg\\:px-6 > div.flex.h-full.flex-auto.items-center.justify-end > div.logged-out.h-full > div > button.m-0.h-full.rounded-none.p-4.bg-transparent.font-bold.text-black.dark\\:text-gray-D100.headerAnimations_indigo-200-gradient__72VFI.headerAnimations_login-underline-color__MzbVZ.headerAnimations_hover-underline-animation__Omvjs.headerAnimations_hover-underline-animation-short__urpPN')

  await btn.click()
  const button = await page.waitForSelector('#NEW_MODAL > div > div > div > div.bg-white.lg\\:.dark\\:bg-gray-D1400.self-start.rounded.fixed.sm\\:static.inset-0.w-full.overflow-y-auto.sm\\:w-screen.h-screen.sm\\:h-auto.max-w-none.sm\\:max-w-\\[416px\\].items-center.justify-start.sm\\:overflow-auto.flex.flex-col.sm\\:max-h-screen.mx-auto.sm\\:min-h-\\[721px\\] > div.mt-6.flex.w-full.justify-center.space-x-3.px-6 > button:nth-child(2)', { timeout: 120000 })
  await button.click();
  await sleep(5000);

  await page
    .waitForSelector("#login_field", { timeout: 5000 })
    .then(() => page.type("#login_field", EMAIL, { delay: 200 }));

  await page
    .waitForSelector("#password", { timeout: 5000 })
    .then(() => page.type("#password", PASSWORD, { delay: 200 }));

  await clickButton(page, 'input', 'Sign in')
  await sleep(10000)
  // let label = await page.evaluate((el) => el.innerText, element);
  //
  // if (label === "Logging in...") {
  //   try {
  //     await page.waitForNavigation({ waitUntil: "networkidle0" });
  //     await page.close();
  //     return;
  //   } catch (error) {
  //     console.log("Could not log in");
  //     label = await page.$eval(
  //       ".b-status-control span",
  //       (node) => node.innerHTML
  //     );
  //   }
  // }
  //
  // if (!label) {
  //   label = "Unknown error occurred";
  // }
  //
  // throw new Error(label);
}

export async function browserClose() {
    await browser.close();
}
