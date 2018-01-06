"use strict";

const fs = require("fs");
const https = require("https");
const mkdirp = require("mkdirp");
const puppeteer = require("puppeteer");

const user = process.argv[3];
const pass = process.argv[4];
const course = process.argv[2];
const pathDirectory = process.argv[5] || "DownLoads/";
const url = "https://frontendmasters.com";

if (!course || !user || !pass) {
  process.stderr.write("you must provide course, username and your password");
  return;
}

const directory = pathDirectory + course;

mkdirp(directory, function(err) {
  if (err) console.error(err);
});

(async () => {
  /* TODO: the default mode is headless: true but, it simply don't work
   * Need to understand why
   */
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(url + "/login");

  const username = await page.$("#username");
  await username.type(user);
  const password = await page.$("#password");
  await password.type(pass);
  const button = await page.$("button");
  await button.click();
  let selector = ".title a";
  await page.waitForSelector(selector);
  const obj = {
    selector,
    course
  };
  let link = await page.evaluate(obj => {
    const anchors = Array.from(document.querySelectorAll(obj.selector));
    return anchors
      .map(anchor => {
        return `${anchor.href}`;
      })
      .filter(text => text.includes(obj.course))
      .pop();
  }, obj);

  await page.goto(link);
  selector = ".LessonListItem a";
  await page.waitForSelector(selector);
  const links = await page.evaluate(selector => {
    const anchors = Array.from(document.querySelectorAll(selector));
    return anchors.map(anchor => {
      return `${anchor.href}`;
    });
  }, selector);

  console.log(links);
  for (link of links) {
    await page.goto(link);
    selector = "video";
    await page.waitForSelector(selector);
    await page.waitFor(4000);
    const videoLink = await page.evaluate(selector => {
      const video = Array.from(document.querySelectorAll(selector)).pop();
      return video.src;
    }, selector);
    console.log("Video", link);
    const fileName =
      link
        .split("/")
        .filter(str => str.length)
        .pop() + ".mp4";
    https.get(videoLink, req =>
      req.pipe(fs.createWriteStream(directory + "/" + fileName))
    );
  }
})();
