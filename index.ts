import * as TurndownService from "turndown";
import { access, constants, existsSync, mkdirSync, writeFile } from "fs";
import { Page } from "puppeteer";
import { isLoggedIn, login, getPage, browserClose } from "./login";
import { parseImg, parseCode, parseSvg } from "./helpers";
import { ElementHandle } from "puppeteer";
import { COURSE_URLS, BASE_URL } from "./globals";
import { Chapter, CourseUrl } from "./interfaces";

const turndownService = new TurndownService();
TurndownService.prototype.escape = (str): string => str;

const grabContent = async (page: Page, directory: string): Promise<string> => {
  await page.waitForSelector("h1", { timeout: 10000 });
  let result = "";
  const title = await page.$eval("h1", (h) => h.innerHTML);
  result += `<h1>${title}</h1>`;

  const pageBlock = await page.$("div.block");
  const paragraphs = await pageBlock.$$("div.mt-8.relative");

  for (let paragraph of paragraphs) {
    const parsedSvg = await parseSvg(page, paragraph, directory);
    if (parsedSvg) {
      result += parsedSvg;
    }

    const parsedImg = await parseImg(page, paragraph, directory);
    if (parsedImg) {
      result += parsedImg;
    }

    const parsedCode = await parseCode(paragraph);
    if (parsedCode) {
      result += parsedCode;
      continue;
    }
    result += await paragraph.evaluate((p) => p.innerHTML);
  }

  return result;
};

const savePage = async (
  link: string,
  dir: string,
  directory: string
): Promise<void> => {
  const page = await getPage();

  try {
    await page.goto(BASE_URL + link);
    console.log("opened the page: ", link);
  } catch (error) {
    console.log(error);
    console.log("failed to open the page: ", link);
  }

  await page.waitForTimeout(8000).then(async () => {
    const pageContent = await grabContent(page, directory);
    const pageContentMarkdown = turndownService.turndown(pageContent);

    writeFile(dir, pageContentMarkdown, (err) => {
      if (err) {
        console.log(err);
      }
    });
  });
};

const downloadCourse = async (courseUrl: CourseUrl): Promise<void> => {
  console.log(courseUrl.url, "is downloading...");
  const page = await getPage();

  await page.goto(courseUrl.url, { timeout: 10000, waitUntil: "networkidle0" });

  const t = courseUrl.url.split("/");
  const courseName = t[t.length - 1];

  let headers: string[], menus: ElementHandle<Element>[];

  if (courseUrl.isSpec) {
    const courseContent = await page.$("div.w-full.mx-0.mt-0.flex.flex-col");

    headers = await courseContent.$$eval("h6", (hs) =>
      hs.map((h) => h.textContent)
    );

    menus = await courseContent.$$("div.w-full.-ml-2");
  } else {
    await page.waitForSelector("div.flex.flex-col.mb-14", { timeout: 10000 });
    const [, , courseContent] = await page.$$("div.flex.flex-col.mb-14");

    headers = await courseContent.$$eval("h5", (hs) =>
      hs.map((h) => h.textContent)
    );
    menus = await courseContent.$$("menu");
  }

  let chapters: Chapter[] = [];
  for (let menuIdx in menus) {
    const topics = await menus[menuIdx].$$eval("a", (links) =>
      links.map((link) => ({
        title: link.textContent,
        link: link.getAttribute("href"),
      }))
    );

    chapters.push({ chapter: headers[menuIdx], topics });
  }

  for (let chapter of chapters) {
    for (let topic of chapter.topics) {
      const { link, title } = topic;
      const directory = `${__dirname}/downloads/${courseName}/${chapter.chapter}`;
      if (!existsSync(directory)) {
        mkdirSync(directory, { recursive: true });
      }

      const fileName = `${directory}/${chapter.topics.indexOf(
        topic
      )} ${title}.md`;

      access(fileName, constants.F_OK, async (err) => {
        console.log(`${fileName} ${err ? "does not exist" : "exists"}`);

        if (err) {
          await savePage(link, fileName, directory)
            .then(() => console.log(`${title} saved`))
            .catch((e) => console.log(e));
        }
      });
    }
  }
};

(async () => {
  const loggedIn = await isLoggedIn();

  if (!loggedIn) {
    await login();
  } else {
    console.log("Already logged in");
  }

  for (let url of COURSE_URLS) {
    await downloadCourse(url);
  }

  await browserClose();
})();
