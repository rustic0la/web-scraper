import { launch, Browser, Page } from "puppeteer";

import {
  BASE_URL,
  EMAIL,
  HTTP_REQUEST_TIMEOUT,
  PASSWORD,
  ROOT_PATH,
} from "./globals";

let browser: Browser;

async function launchBrowser(args?) {

  let configuration = {
    userDataDir: ROOT_PATH + "data",
    headless: true,
    executablePath: "/Applications/Chromium.app/Contents/MacOS/Chromium",
    defaultViewport: null,
    args: ["--window-size=1920,1080"],
  };

  if (args) {
    configuration = {
      ...configuration,
      ...args,
    };
  }

  browser = await launch(configuration);
}

async function getBrowser() {
  if (!browser) {
    await launchBrowser();
  }

  return browser;
}

export async function getPage(): Promise<Page> {
  if (!browser) {
    throw new Error("No browser initialted yet");
  }

  let [page] = await browser.pages();
  if (!page) {
    page = await browser.newPage();
  }

  return page;
}

export async function isLoggedIn() {
  console.log("Checking if already logged in");

  await getBrowser();

  const page = await getPage();

  await page.goto(BASE_URL, {
    timeout: HTTP_REQUEST_TIMEOUT,
    waitUntil: "networkidle2",
  });

  await page.waitForTimeout(5000)
  if (page.url() === `${BASE_URL}/learn`) {
    return true;
  }

  return false;
}

async function clickButton(page, className, buttonLabel) {
  const isClicked = await page.evaluate(
    ({ className, buttonLabel }) => {
      const elements = document.getElementsByClassName(className) as unknown as HTMLElement[];

      for (let i = 0; i < elements.length; i++) {
        if (elements[i].innerHTML === buttonLabel) {
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
  await page.goto(BASE_URL, {
    timeout: HTTP_REQUEST_TIMEOUT,
    waitUntil: "networkidle2",
  });

  const isLoginButtonClicked = await clickButton(
    page,
    "m-0 rounded-none p-4 h-full  text-default",
    "Log in"
  );

  if (!isLoginButtonClicked) {
    throw new Error("Could not find login button (open login form)");
  }

  await page
    .waitForSelector("#email-field", { timeout: 5000 })
    .then(() => page.type("#email-field", EMAIL, { delay: 200 }));

  await page
    .waitForSelector("#email-field", { timeout: 5000 })
    .then(() => page.type("#password-field", PASSWORD, { delay: 200 }));

  const clickLoginBtn = await clickButton(
    page,
    "contained-primary w-full mt-6 leading-6 p-2",
    "Log In"
  );

  if (!clickLoginBtn) {
    throw new Error("Could not find login button (login form submit)");
  }

  const element = await page.waitForSelector(".b-status-control span", {
    timeout: 10000,
  });
  let label = await page.evaluate((el) => el.innerText, element);

  if (label === "Logging in...") {
    try {
      await page.waitForNavigation({ waitUntil: "networkidle0" });
      await page.close();
      return;
    } catch (error) {
      console.log("Could not log in");
      label = await page.$eval(
        ".b-status-control span",
        (node) => node.innerHTML
      );
    }
  }

  if (!label) {
    label = "Unknown error occured";
  }

  throw new Error(label);
}

export async function browserClose() {
    await browser.close();
}
