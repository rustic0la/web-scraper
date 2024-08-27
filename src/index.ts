import { readFileSync} from "node:fs";
import TurndownService = require('turndown');
import { writeFile} from "fs";
import { Page} from "puppeteer";
import { login, getBrowser } from "./login";
import {fixSvgs, modifySvgs, parseImg, parseScript, parseSvg, translate, translateFilesInDirectory} from "./helpers";
import * as fs from "node:fs";
import * as path from "node:path";

TurndownService.prototype.escape = (str): string => str;

const grabContent = async (page: Page, directory: string, href: string, title1: string, text: string): Promise<[string, string]> => {
    await autoScroll(page);
    await page.waitForNetworkIdle();

  await page.waitForSelector("h1", { timeout: 10000 });
  let links = []
    const savedSVGs = new Set();
  let result = "";
  let res2 = '';
  const title = await page.$eval("h1", (h) => h.innerHTML);
  result += title ? `<h1>${title}</h1>` : '';
    res2 += title ? `<h1>${await translate(title)}</h1>` : '';

    const paragraphs = await page.$$("#handleArticleScroll > div > div > div.relative.mx-auto.min-h-full.w-full.shrink-0.grow.basis-auto.px-10.mb-24.transition.duration-200 > div.block > div");
    for (let index in paragraphs) {
        const isImg  = await paragraphs[index].evaluate((mainEl) => Array.from(mainEl.querySelectorAll('img')).length > 0);
        const isSvg = await paragraphs[index].evaluate((mainEl) => Array.from(mainEl.querySelectorAll('svg')).length > 0);

        if (isImg || isSvg) {
            if (isImg) {
                const parsedImg = await parseImg(paragraphs[index], index, directory, links);
                if (parsedImg) {
                    console.log("=>(index.ts:31) parsedImg", parsedImg);
                    result += parsedImg;
                    res2 += parsedImg;
                }
            } else {
                if (isSvg) {
                    const parsedSvg = await parseSvg(paragraphs[index], index, directory, savedSVGs);
                    if (parsedSvg) {
                        console.log("=>(index.ts:38) parsedSvg", parsedSvg);
                        result += parsedSvg;
                        res2 += parsedSvg;
                    }
                }
            }
        } else {
            const tt = await paragraphs[index].evaluate((p) => {
                const katexElements = p.querySelectorAll('.katex');
                katexElements.forEach(element => {
                    element.replaceWith(  document.createTextNode('$' + element.querySelector('annotation').textContent  + '$'))
                });
                return p.innerHTML
            });
            result += tt
            res2 += await translate(tt)
        }
    }
    const rtrt =  await parseScript(href,  await page.cookies(), title1, text) || '';
    result += rtrt
    res2 += rtrt

    return [result, res2];
};

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100; // Adjust the scroll distance as needed
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100); // Adjust the delay as needed
        });
    });
}

const savePage = async (
    link: { text: string, href: string },
    filename: string,
    directory: string,
    title: string
): Promise<void> => {
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
        await page.goto(link.href, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForNetworkIdle({ timeout: 60000 });
        console.log("opened the page: ", link.href);
    } catch (error) {
        console.log(error);
        console.log("failed to open the page: ", link.href);
    }

    const [eng, trans] = await grabContent(page, directory, link.href, title, link.text);

    const turndownService = new TurndownService();

    writeFile(`${filename}.md`, turndownService.turndown(eng), (err) => {
        if (err) {
            console.log(err);
        }
    });
    writeFile(`${filename}_TRANSLATED.md`, turndownService.turndown(trans), (err) => {
        if (err) {
            console.log(err);
        }
    });
    await page.close()
};

const downloadCourse = async (courseUrl: string): Promise<void> => {
    console.log(courseUrl, "is downloading...");

    // const browser = await getBrowser();
    // const page = await browser.newPage();

    let dataFromFile = JSON.parse(readFileSync(`${__dirname}/downloads/${courseUrl}/content.json`, 'utf8'));
    //await page.goto(BASE_URL + '/courses/' + courseUrl, { waitUntil: "networkidle2", timeout: 100000 });

    // turndownService.addRule('', {
    //   filter: ['pre'],
    //   replacement: function (content) {
    //     return '```js' + content + '```'
    //   }
    // })

    // let document1 = '';
    //
    // const header = await page.waitForSelector('#data-panel-id-left-column > div > div.relative.grow > div > div:nth-child(1) > div > div > div > div.flex.flex-col.gap-y-6 > section')
    // document1  += await header.evaluate((t) => t.innerHTML.toString())
    //
    // const content = await page.waitForSelector('#data-panel-id-left-column > div > div.relative.grow > div > div:nth-child(1) > div > div > div > div.flex.flex-col.gap-y-8 > div.prose')
    // document1  += await content.evaluate((t) => t.innerHTML.toString())
    //
    // await page.select('select[aria-label="Question Language"]', 'ts')
    //
    // const code = await page.waitForSelector('div.view-lines.monaco-mouse-cursor-text');
    // document1 += '<h2>Code</h2>' + '\n' + '<pre>' + await code.evaluate((t) => t.innerHTML.toString()) + '</pre>';
    //
    // const isClicked = await clickButton(page, 'button', 'Test cases');
    // console.log("=>(index.ts:102) isClicked", isClicked);
    // const testCases = await page.waitForSelector('#data-panel-id-right-top > div > div.relative.grow > div > div:nth-child(2) > div > div > div.size-full > section > div > div > div.overflow-guard > div.monaco-scrollable-element.editor-scrollable.vs-dark.mac > div.lines-content.monaco-editor-background > div.view-lines.monaco-mouse-cursor-text');
    // document1 += '<h2>Test Cases</h2>' + '\n' + '<pre>' + await testCases.evaluate((t) => t.innerHTML.toString()) + '</pre>';
    //
    // const isClicked2 = await clickButton(page, 'button', 'View submission tests');
    // console.log("=>(index.ts:106) isClicked2", isClicked2);
    // const testCases1 = await page.waitForSelector('#data-panel-id-right-top > div > div.relative.grow > div > div.absolute.inset-0.flex.overflow-y-auto > div > div > div > div > div.prose > div > div > div > pre');
    // document1 += '<h2>Submission Tests</h2>' + '\n' + '<pre>' + await testCases1.evaluate((t) => t.innerHTML.toString()) + '</pre>' + '\n';
    //
    // const isClicked3 = await clickButton(page, 'button', 'Solution');
    // console.log("=>(index.ts:113) isClicked3", isClicked3);
    //
    // const data1 = await page.waitForSelector('#data-panel-id-left-column > div > div.relative.grow > div > div:nth-child(2) > div > div > div > div')
    // const childNodes = await page.evaluate(async (element) => {
    //   function findButtonByLabel(parentNode, label) {
    //     const childNodes = parentNode.childNodes;
    //
    //     for (let i = 0; i < childNodes.length; i++) {
    //       const child = childNodes[i];
    //       if (child.nodeName.toLowerCase() === 'button' && child.textContent.trim() === label) {
    //         return child;
    //       }
    //       if (child.childNodes.length > 0) {
    //         const foundButton = findButtonByLabel(child, label);
    //         if (foundButton) {
    //           return foundButton;
    //         }
    //       }
    //     }
    //
    //     return null;
    //   }
    //
    //   await Array.from(element.children).forEach(async (child) => {
    //     const buttonNode = findButtonByLabel(child, 'TypeScript')
    //     if (buttonNode) {
    //       await buttonNode.click()
    //     }
    //   });
    //
    //   return Array.from(element.children).map(t => t.innerHTML).join('\n\n');
    // }, data1);
    //
    // document1 += '<h2>Solution</h2>' + '\n' + childNodes
    //
    //     writeFile(__dirname + '/exercises/' + `${courseName}.md`,  turndownService.turndown(document1), (err) => {
    //   if (err) {
    //     console.log(err);
    //   }
    // });

    // 1739

//     console.log('1')
//     await sleep(3000)
//       await clickButton(page, 'p', 'Expand All')
//     console.log('2')
//
//     const data = await page.$("#course-homepage-main-div > div.flex.w-full.flex-col > div.flex.flex-col.mt-6 > div.order-5.mb-12.flex.flex-col > div.mt-8.flex.flex-col");
//     console.log('3')
//
//     const res1 = await data.evaluate((d) => {
//         const res = []
//       const children = Array.from(d.children);
//       for (let i = 0; i + 2 < children.length; i++) {
//         // @ts-ignore
//         const [num, title, desc] = children[i].innerText.split('\n\n');
//         const links = Array.from(children[i + 1].childNodes).reduce((acc, el) => {
//           // @ts-ignore
//           const href = el.href;
//           console.log("=>(index.ts:217) href", href);
//           const text = el.textContent
//             console.log("=>(index.ts:219) text", text);
//           return [...acc, { href, text }]
//         }, [])
//         res.push({ title, desc, links })
//         i += 2
//           console.log('i', i)
//
//       }
//       return res
// })
//
//     console.log('4')
//     //
//     const directory = `${__dirname}/downloads/${courseUrl}/content.json`;
    //
    // if (!existsSync(`${__dirname}/downloads/${courseUrl}`)) {
    //   mkdirSync(`${__dirname}/downloads/${courseUrl}`, { recursive: true });
    // }
    //
    // access(directory, constants.F_OK, async (err) => {
    //   console.log(`${directory} ${err ? "does not exist" : "exists"}`);
    //
    //   if (err) {
    //     fs.writeFile(directory, JSON.stringify(res1), 'utf8', (err) => {
    //       if (err) {
    //         console.error(`Unable to write file: ${err.message}`);
    //       } else {
    //         console.log(`File has been modified.`);
    //       }
    //     });
    //   }
    // });


    // for (let chapter of data) {
    //   const {links, title} = chapter;
    //   const directory = `${__dirname}/downloads/${courseUrl}/${title}`;
    //   if (!existsSync(directory)) {
    //     mkdirSync(directory, {recursive: true});
    //   }
    //
    //   for (let link of links) {
    //     const fileName = `${directory}/${links.map(({text}) => text).indexOf(
    //         link.text
    //     )}. ${link.text}.md`;
    //
    //     access(fileName, constants.F_OK, async (err) => {
    //       console.log(`${fileName} ${err ? "does not exist" : "exists"}`);
    //
    //       if (err) {
    //         await savePage(page, link, fileName, directory)
    //             .then(() => console.log(`${link.text} saved`))
    //             .catch((e) => console.log(e));
    //       }
    //
    //     });
    //   }
    // }


    // headers = await content.$$eval("h5", (hs) =>
    //   hs.map((h) => h.textContent)
    // );
    // console.log("=>(index.ts:174) headers", headers);
    // menus = await courseContent.$$("menu");
    // console.log("=>(index.ts:176) menus", menus);
    //
    //
    // let chapters = [];
    // for (let menuIdx in menus) {
    //   const topics = await menus[menuIdx].$$eval("a", (links) =>
    //     links.map((link) => ({
    //       title: link.textContent,
    //       link: link.getAttribute("href"),
    //     }))
    //   );
    //
    //   chapters.push({ chapter: headers[menuIdx], topics });
    // }


    for (let chapter of dataFromFile) {
    // const chapter = dataFromFile[1]
              for (let topic of chapter.links) {
                const { href, text } = topic

                const directory = `${__dirname}/downloads/${courseUrl}/${dataFromFile.map(({title}) => title).indexOf(chapter.title)}. ${chapter.title}/${chapter.links.map(({text}) => text).indexOf(text)}. ${text}`;

                if (!fs.existsSync(directory)) {
                    fs.mkdirSync(directory, { recursive: true });
                }

                const fileName = path.join(directory, 'text');

                try {
                    if (!fs.existsSync(fileName + '.md')) {
                        await savePage({ text, href }, fileName, directory, chapter.title);
                        console.log(`${text} saved`);
                    }
                    else {
                        console.log(`${text} exists`)
                    }
                } catch (e) {
                    console.error(e);
                }

                // if (!existsSync(directory)) {
                //     mkdirSync(directory, {recursive: true});
                // }
                //
                //
                // promises.push(savePage({text, href}, fileName, directory)
                //     .then(() => console.log(`${text} saved`))
                //     .catch((e) => console.log(e)));
                  }

            //
            // access(fileName, constants.F_OK, async (err) => {
            //     console.log(`${fileName} ${err ? "does not exist" : "exists"}`);
            //
            //         await savePage({text, href}, fileName, directory)
            //             .then(() => console.log(`${text} saved`))
            //             .catch((e) => console.log(e));
            //
            // });
    }
};

(async () => {
    // await getBrowser();

    // const loggedIn = await isLoggedIn(page);

    // if (!loggedIn) {
    console.log('login')
    // await login().then(() => console.log('login success'));
    // } else {
    //   console.log("Already logged in");
    // }

    const links = [
        // 'introduction-microservice-principles-concepts',
        // 'grokking-modern-system-design-interview-for-engineers-managers',
        // 'grokking-the-principles-and-practices-of-advanced-system-design',
        'grokking-coding-interview-patterns-javascript',
        // 'microservice-architecture-practical-implementation',
        // 'data-structures-coding-interviews-javascript',
        // 'software-architecture-in-applications',
        // 'decode-coding-interview-js'
    ]

    await modifySvgs(`${__dirname}/downloads/${links[0]}`)

  // for (let url of links) {
  //   await downloadCourse(url);
  // }
  console.log('END')

  // await browserClose();


    // fs.readdir(__dirname + '/exercises/', (err, files) => {
    //   if (err) {
    //     console.error(`Unable to read directory: ${err.message}`);
    //     return;
    //   }
    //
    //   files.forEach(file => {
    //     const filePath = path.join(__dirname + '/exercises/', file);
    //
    //     // Read each file's content
    //     fs.readFile(filePath, 'utf8', (err, content) => {
    //       if (err) {
    //         console.error(`Unable to read file ${file}: ${err.message}`);
    //         return;
    //       }
    //       console.log(file, content.split('\n'))
    //
    //       const newContent = content.split('\n').filter((_, idx) => idx > 13 || idx === 6 || idx === 10).join('\n')
    //
    //       fs.writeFile(filePath, newContent, 'utf8', (err) => {
    //         if (err) {
    //           console.error(`Unable to write file ${file}: ${err.message}`);
    //         } else {
    //           console.log(`File ${file} has been modified.`);
    //         }
    //       });
    //     });
    //   });
    // });
})();
