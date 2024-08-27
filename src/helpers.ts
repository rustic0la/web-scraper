import {  writeFileSync } from "fs";
import {Cookie, ElementHandle} from "puppeteer";
import { read } from "clipboardy";
import {getBrowser, sleep} from "./login";
import {JSDOM} from "jsdom";
import * as jsdom from "jsdom";
import {BASE_URL} from "./globals";
import {GoogleGenerativeAI} from "@google/generative-ai";
import * as fs from "node:fs";
import * as path from "node:path";

export const parseImg = async (
  paragraph: ElementHandle<Element>,
  paragraphIndex: string,
  directory: string,
  links
) => {
  let res = ''

  try {
    let html = await paragraph.evaluate((p) => p.outerHTML)
    let dom = new JSDOM(html);

    const text = dom.window.document.querySelector('div > div.text-center.block > div:nth-child(1) > div > div.w-full.pr-4.text-right > span')
    const num = text ? text.textContent.split(' of ')[1] : '0'

    if (num === '0') {
      const img = await paragraph.$('div > div > div > span > img')
      const { alt = 'no_alt', src} = await img.evaluate((e) => ({ alt: e.alt, src: e.src }))
      console.log("=>(helpers.ts:27) src", src);
      const browser = await getBrowser();
      const anotherPage = await browser.newPage();
      const viewSource = await anotherPage.goto(src, {waitUntil: 'networkidle2'})
      const buffer = await viewSource.buffer();

      const path = `${paragraphIndex}_${alt}.svg`
      writeFileSync(`${directory}/${path}`, buffer)
      console.log('saved', src)
      res += `![${alt}](./${path})\n\n`;
      links.push(src)

      await anotherPage.close();

      return res
    }

      if (parseInt(num) > 5) {
        for (let i = 0; i < parseInt(num); i++) {
          html = await paragraph.evaluate((p) => p.outerHTML)
          dom = new JSDOM(html);

          const node =  dom.window.document.querySelector('div > div.text-center.block')
          const img = node.querySelector('div:nth-child(1) > div > div.mt-4.px-2 > div:nth-child(1) > div > span > img') as HTMLImageElement
          const {src, alt = 'no_alt'} = img

          if (!links.includes(src)) {
            const browser = await getBrowser();
            const anotherPage = await browser.newPage();
            const viewSource = await anotherPage.goto(BASE_URL + src, {waitUntil: 'networkidle2'})
            const buffer = await viewSource.buffer();

            const path = `${paragraphIndex}_${i}_${alt}.svg`
            writeFileSync(`${directory}/${path}`, buffer)
            console.log('saved', src)
            res += `![${alt}](./${path})\n\n`;
            links.push(src)

            await anotherPage.close();
          }

          const button = await paragraph.$("div > div.text-center.block > div.text-center > div > button:nth-child(2)")
          if (button) {
            await button.click();
            await sleep(200)
          }
        }
      } else {
        const images = Array.from(await paragraph.$$('img'))

        for (const imageIdx in images) {
          const ttt = await images[imageIdx].evaluate((t) => !!t.alt ? [t.alt, t.src] : undefined)
          const alt = ttt?.[0]
          const src = ttt?.[1]
          if (alt && src && !links.includes(src)) {
            const browser = await getBrowser();
            const anotherPage = await browser.newPage();
            const viewSource = await anotherPage.goto(src, {waitUntil: 'networkidle2'})
            const buffer = await viewSource.buffer();

            const path = `${paragraphIndex}_${imageIdx}_${alt}.svg`
            writeFileSync(`${directory}/${path}`, buffer)
            console.log('saved', src)

            res += `![${alt}](./${path})\n\n`;
            links.push(src)
            await anotherPage.close();
          }
        }
      }
    return res
  } catch (e) {
    console.log(e);
  }
};

export const parseSvg = async (
    paragraph: ElementHandle<Element>,
    paragraphIndex: string,
    directory: string,
    savedSVGs
) => {
  let res = ''

  try {
    let html = await paragraph.evaluate((p) => p.outerHTML)
    let dom = new JSDOM(html);

    const text = dom.window.document.querySelector('div > div.text-center.block > div:nth-child(1) > div > div.w-full.pr-4.text-right > span')
    const num = text ? text.textContent.split(' of ')[1] : '0'

    if (num === '0') {
      const svg = await paragraph.$('svg')

      let current = await svg.evaluate((e) => e.outerHTML)

      if (current && !savedSVGs.has(current)) {
        if (current.includes('Created with Fabric')) {

          const dom = new JSDOM();
          const svg = dom.window.document.createElement('svg')
          svg.innerHTML = current
          const hrefs = Array.from(svg.querySelectorAll('image')).map(i => i.getAttribute('xlink:href'))
          for (const k in hrefs) {
            const browser = await getBrowser();
            const anotherPage = await browser.newPage();
            const viewSource = await anotherPage.goto(hrefs[k], {waitUntil: 'networkidle2'})
            const buffer = await viewSource.buffer();

            const path = `${paragraphIndex}_href=${k}.svg`
            writeFileSync(`${directory}/${path}`, buffer)

            html = html.replace(hrefs[k], `./${path}`)
            current.replace(hrefs[k], `./${path}`)
            await anotherPage.close();
          }
          const path = `${paragraphIndex}.svg`

          writeFileSync(`${directory}/${path}`, current)

          console.log(paragraphIndex, 'saved svg')

          res += `![${path}](./${path})\n\n`;

          savedSVGs.add(current)

          return res
        }

      }
    }

      if (parseInt(num) > 5) {
          let current = ''
          for (let i = 0; i < parseInt(num); i++) {
            html = await paragraph.evaluate((p) => p.outerHTML)
            dom = new JSDOM(html);

            const node =  dom.window.document.querySelector('div > div.text-center.block')
            const data = node.querySelector('div:nth-child(1) > div > div.text-center > div > div > svg')
            current = data.outerHTML

            if (!savedSVGs.has(current)) {
              if (current.includes('Created with Fabric')) {

                const dom = new JSDOM();
                const svg = dom.window.document.createElement('svg')
                svg.innerHTML = current
                const hrefs = Array.from(svg.querySelectorAll('image')).map(i => i.getAttribute('xlink:href'))

                for (const k in hrefs) {
                  const browser = await getBrowser();
                  const anotherPage = await browser.newPage();
                  const viewSource = await anotherPage.goto(hrefs[k], {waitUntil: 'networkidle2'})
                  const buffer = await viewSource.buffer();

                  const path = `${paragraphIndex}_${i}_${k}.svg`
                  writeFileSync(`${directory}/${path}`, buffer)

                  html = html.replace(hrefs[k], `./${path}`)
                  current.replace(hrefs[k], `./${path}`)
                  await anotherPage.close();
                }


                const path = `${paragraphIndex}_${i}.svg`

                writeFileSync(`${directory}/${path}`, current)

                console.log(i, 'saved svg')

                res += `![${path}](./${path})\n\n`;

                savedSVGs.add(current)
              }
            }

            const button = await paragraph.$("div > div.text-center.block > div.text-center > div > button:nth-child(2)")
            if (button) {
              await button.click();
              await sleep(200)
            }
          }

      } else {

    const data = await paragraph.evaluate(el => Array.from(el.querySelectorAll('svg')).map(el => el.outerHTML))

    for (const idx in data) {
      let html = data[idx]
      if (html.includes('Created with Fabric')) {
        const dom = new JSDOM();
        const svg = dom.window.document.createElement('svg')
        svg.innerHTML = html
        const hrefs = Array.from(svg.querySelectorAll('image')).map(i => i.getAttribute('xlink:href'))

        for (const i in hrefs) {
          const browser = await getBrowser();
          const anotherPage = await browser.newPage();
          const viewSource = await anotherPage.goto(hrefs[i], {waitUntil: 'networkidle2'})
          const buffer = await viewSource.buffer();

          const path = `${paragraphIndex}_${idx}_${i}.svg`
          writeFileSync(`${directory}/${path}`, buffer)

          html = html.replace(hrefs[i], `./${path}`)
          await anotherPage.close();
        }

        const path = `${paragraphIndex}_${idx}.svg`
        writeFileSync(`${directory}/${path}`, html)

        res += `![${path}](./${path})\n\n`;
      }
    }
      }

    return  res


  } catch (e) {
    console.log(e);
  }
};

export const parseCode = async (
  paragraph: ElementHandle<Element>,
): Promise<string> => {
  const codeEditor = await paragraph.$(
    "div.code-container"
  );

  if (codeEditor) {
    const copyCodeBtn = await paragraph.$('[aria-label="copy-code-button"]');
    const btn = await copyCodeBtn.$("svg");

    await btn.click();

    const code = await read();

    return code ? `<pre>~~~js\n${code}\n~~~</pre>` : undefined;
  }
};

export const parseScript = async (href: string, cookies: Cookie[], title: string, text: string
) => {
    console.log('1')
    const headers = {
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
      "priority": "u=0, i",
      "sec-ch-ua": "\"Chromium\";v=\"127\", \"Not)A;Brand\";v=\"99\"",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"macOS\"",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "cross-site",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "cookie": cookies.reduce((acc, item) => `${acc} ${item.name}=${item.value};`, ''),
      "Referer": "https://www.educative.io/",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    }

    const ggg = await fetch(href, {
      "headers": headers,
      "body": null,
      "method": "GET"
    });
    console.log('2')


    const virtualConsole = new jsdom.VirtualConsole();
    virtualConsole.on("error", () => {
    });

    const htmlContent = await ggg.text();
    if (!htmlContent || htmlContent.trim() === "") {
      throw new Error("The HTML content is empty or undefined.");
    }
    const dom = new JSDOM(htmlContent, {
      resources: 'usable',
      runScripts: 'dangerously',
      virtualConsole
    });
    const struct = dom.window.document.querySelector('script#\\__NEXT_DATA__[type="application/json"]')?.innerHTML;
    console.log('3')
    let res = ''
    if (struct) {
      const tt = JSON.parse(struct).props.pageProps.collectionDetailsSSR.toc.categories.find(cat => cat.title === title)?.pages.find(p => p.title === text)
      console.log('4')
      if (tt) {
        const {author_id, collection_id, id} = tt
        const vvv = await fetch(`https://www.educative.io/api/collection/${author_id}/${collection_id}/page/${id}?work_type=collection`, {
          "headers": {
            "accept": "*/*",
            "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
            "priority": "u=1, i",
            "sec-ch-ua": "\"Chromium\";v=\"127\", \"Not)A;Brand\";v=\"99\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"macOS\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "no-cors",
            "sec-fetch-site": "same-origin",
            "cookie": cookies.reduce((acc, item) => `${acc} ${item.name}=${item.value};`, ''),
            "Referer": "https://www.educative.io/courses/grokking-coding-interview-patterns-javascript/solution-valid-palindrome",
            "Referrer-Policy": "strict-origin-when-cross-origin"
          },
          "body": null,
          "method": "GET"
        });
        const text = await vvv.text()
        console.log("=>(helpers.ts:338) text", text);
        const codes = JSON.parse(text).components.filter(c => c.type === 'TabbedCode' || c.type === 'CodeTest' || c.type === 'Quiz');
        console.log("=>(helpers.ts:337) codes.length", codes.length);
        codes.forEach((code) => {
          res += `\n${code.type}:\n${JSON.stringify(code.content)}\n`;
        })
      }

      return res ? `\n<pre>~~~js\n${res}\n~~~</pre>` : ''

      //   const lll = JSON.parse(struct)
      //   let res = '';
      //   const quiz = lll.props.pageProps.lessonContent.components.find(c => c.type === 'Quiz')?.content
      //   if (quiz) {
      //     console.log('has quiz')
      //     res += `____________\nQUIZ\n${JSON.stringify({title: quiz.title, questions: quiz.questions})}\n`
      //   }
      //
      //   const CodeTest = lll.props.pageProps.lessonContent.components.filter(c => c.type === 'CodeTest')?.map(e => e.content)
      //   if (CodeTest.length > 0) {
      //     for (const code of CodeTest) {
      //       console.log('has code1')
      //       res += `____________\nCodeTest\n${JSON.stringify(code)}\n`
      //     }
      //   }
      //
      //   const TabbedCode = lll.props.pageProps.lessonContent.components.filter(c => c.type === 'TabbedCode')?.map(e => e.content)
      //   if (TabbedCode.length > 0) {
      //     for (const code of TabbedCode) {
      //       console.log('has code2')
      //       res += `____________\nTabbedCode\n${JSON.stringify(code)}\n`
      //     }
      //   }
      //
      //   return res ? `\n\n<pre>~~~js\n${res}\n~~~</pre>` : undefined
    }
}

const Node = new JSDOM('').window.Node;
const genAI = new GoogleGenerativeAI('AIzaSyB-piIMhP9LqtBShjxa3Exvv18uRzkfDUA');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });


export async function translate(html: string) {
  function getTextContentArray(innerHTML: string) {
    const dom = new JSDOM('')
    let tempDiv = dom.window.document.createElement('div');
    tempDiv.innerHTML = innerHTML;

    function collectTextNodes(element, texts = {}) {
      for (let child of element.childNodes) {
        if (child.nodeType === Node.TEXT_NODE && child.textContent.trim().length > 0) {
          texts[child.textContent.trim()] = '';
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          collectTextNodes(child, texts);
        }
      }
      return texts;
    }

    return collectTextNodes(tempDiv);
  }

  const textNodes = getTextContentArray(html)
  const translationPrompt = 'Translate to Russian, use simple words, you are a coding mentor who explains to a developer with experience, do not use the word "слушай", the word "pattern" translate as "паттерн", the answer must contain only translations without any additional replicas. You must preserve all the markup as it was in the original and you must not add any additional punctuation or line breaks. Text:';
  if (Object.keys(textNodes).length > 0) {
    let translatedTexts
    const translationResponse = await model.generateContent([
      translationPrompt,
      {
        inlineData: {
          data: Buffer.from(Object.keys(textNodes).join('~~~')).toString("base64"),
          mimeType: "text/plain",
        },
      }
    ]);
    const responses = translationResponse.response.text().split('~~~').filter(Boolean);
    translatedTexts = Object.keys(textNodes).reduce((acc, item, idx) => ({
      ...acc,
      [item]: responses[idx]
    }), textNodes)

    let res = html
    for (let key in translatedTexts) {
      res = res.replace(key, translatedTexts[key]);
    }

    return res;
  }
}

export const translateFilesInDirectory = async (dir) => {
  try {
    const files = fs.readdirSync(dir, { encoding: 'utf8'});

    for (const fileIdx in files) {
      const fullPath = path.join(dir, files[fileIdx]);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        await translateFilesInDirectory(fullPath);
      } else if (files[fileIdx] === 'text.md') {
        const translatedFilePath = path.join(dir, 'text_translated.md');
        if (!fs.existsSync(translatedFilePath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          const [text, code = ''] = content.split('~~~js');

          const translated = await translate(text);

          fs.writeFileSync(translatedFilePath, translated + '\n~~~js\n' + code)
          console.log(`Translated file created: ${translatedFilePath}`);
        } else {
          console.log(`File already exists: ${translatedFilePath}`);
        }
      }
    }
  } catch (err) {
    console.error(`Error processing directory ${dir}:`, err);
  }
};


export const fixSvgs = async (dir) => {
  try {
    const files = fs.readdirSync(dir, { encoding: 'utf8'});

    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        await fixSvgs(fullPath);
      } else {
        const baseName = path.basename(file, '.svg');
        if (file.endsWith('.svg') && baseName.split('_').length === 2) {
          const matchingFiles = files.filter(f => f.startsWith(baseName + '_') && f !== file);
          if (matchingFiles.length > 0) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const dom = new JSDOM();
            const svg = dom.window.document.createElement('svg')
            svg.innerHTML = content
            const hrefs = Array.from(svg.querySelectorAll('image')).map(i => i.getAttribute('xlink:href'))
            let ttt = content
            for (const k in hrefs) {
              ttt = ttt.replace(hrefs[k], './' + matchingFiles[k])
            }
            fs.writeFileSync(fullPath, ttt)
          }
        }
      }
    }
  } catch (err) {
    console.error(`Error processing directory ${dir}:`, err);
  }
};

export const modifySvgs = async (dir) => {
  try {
    const files = fs.readdirSync(dir, { encoding: 'utf8'});

    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        await modifySvgs(fullPath);
      } else {
        if (file.endsWith('.svg')) {
          const dom = new JSDOM(fs.readFileSync(fullPath));
          const document = dom.window.document;
          const textElements = document.querySelectorAll('text');
          for (const element of textElements) {
            const originalText = element.textContent;
            if (originalText) {
              if (originalText.length > 1) {
                const text = await translate(originalText);
                console.log('path', fullPath, "=>(helpers.ts:515) text", originalText, "=>(helpers.ts:517) text", text, '\n\n');
                element.textContent = text
              }
            }
          }

          fs.writeFileSync(fullPath, dom.serialize(), 'utf-8');
          // console.log('dom.serialize()', dom)
          // const matchingFiles = files.filter(f => f.startsWith(baseName + '_') && f !== file);
          // if (matchingFiles.length > 0) {
          //   const content = fs.readFileSync(fullPath, 'utf8');
          //   const dom = new JSDOM();
          //   const svg = dom.window.document.createElement('svg')
          //   svg.innerHTML = content
          //   const hrefs = Array.from(svg.querySelectorAll('image')).map(i => i.getAttribute('xlink:href'))
          //   let ttt = content
          //   for (const k in hrefs) {
          //     ttt = ttt.replace(hrefs[k], './' + matchingFiles[k])
          //   }
          //   fs.writeFileSync(fullPath, ttt)
          // }
        }
      }
    }
  } catch (err) {
    console.error(`Error processing directory ${dir}:`, err);
  }
};

