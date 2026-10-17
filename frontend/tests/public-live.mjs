import assert from "node:assert/strict";
import { chromium } from "playwright";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const base=process.env.APP_URL || "http://127.0.0.1:5174";
const video=process.env.PUBLIC_VIDEO_TEST === "true";
const out=path.resolve(import.meta.dirname,"qa/public");await mkdir(out,{recursive:true});
const options={headless:true,args:["--no-sandbox"]};
if(process.env.CHROMIUM_MODULE){const portable=(await import(process.env.CHROMIUM_MODULE)).default;options.executablePath=await portable.executablePath();options.args=[...portable.args,"--enable-unsafe-swiftshader"];}
const browser=await chromium.launch(options);const context=await browser.newContext({viewport:{width:1440,height:1050},reducedMotion:"reduce"});const page=await context.newPage();
const errors=[],passes=[],mediaRequests=[];let writes=0;
page.on("pageerror",e=>errors.push(e.message));page.on("request",r=>{if(r.url().includes("youtube") || r.url().includes("ytimg"))mediaRequests.push(r.url());});
await context.route("**/api/**",route=>{
 if(route.request().method()!=="GET")writes++;
 const session={authenticated:false,githubConfigured:true,googleConfigured:true,workspaceMode:"NONE",profile:null};
 return route.fulfill({json:route.request().url().endsWith("/session")?session:{headerName:"X-CSRF-TOKEN",token:"public-ui-fixture"}});
});
await context.route("https://www.youtube-nocookie.com/**",route=>route.fulfill({contentType:"text/html",body:"<!doctype html><html lang='en'><title>Local player fixture</title><p>Local player fixture, not a real YouTube playback test.</p></html>"}));
const pass=name=>{passes.push(name);console.log("PASS "+name);};
const navigate=async route=>{await page.goto(base+route);await page.locator(route==="/about"?".about-hero":".landing-hero").waitFor();await page.evaluate(()=>document.fonts.ready);};
try{
 await navigate("/");
 assert.equal(await page.locator(".builders-preview .builder-card").count(),2);
 const expected=[{id:"om",name:"Om Singh Jadon",github:"https://github.com/OM2412",linkedin:"https://www.linkedin.com/in/om-singh-jadon-b92679314/"},{id:"ajeet",name:"Ajeet Gadekar",github:"https://github.com/AjeetGadekar",linkedin:"https://www.linkedin.com/in/ajeet-gadekar-1b5692363/"}];
 for(const p of expected){const card=page.locator(`.builders-preview .builder-${p.id}`);await card.scrollIntoViewIfNeeded();await card.getByRole("img",{name:`Portrait of ${p.name}`}).waitFor();await page.waitForFunction(id=>{const image=document.querySelector(`.builders-preview .builder-${id} img`);return image?.complete && image.naturalWidth>0;},p.id);for(const brand of ["GitHub","LinkedIn"]){const link=card.getByRole("link",{name:`${p.name} on ${brand}`,exact:true});assert.equal(await link.getAttribute("href"),p[brand.toLowerCase()]);assert.match(await link.getAttribute("rel"),/noopener/);assert.equal(await link.locator("svg").count(),2);}}
 assert.equal(await page.getByRole("navigation",{name:"Landing navigation"}).getByRole("link",{name:"Source code",exact:false}).locator("svg").count(),2);
 pass("Landing shows both real supplied portraits and correctly labeled GitHub/LinkedIn destination links with icons; repo link also has its GitHub mark");
 await page.getByRole("link",{name:"Meet the builders & the idea",exact:false}).click();await page.locator(".about-hero").waitFor();assert.match(page.url(),/\/about$/);await page.reload();await page.locator(".about-hero").waitFor();assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"),"index, follow");
 const faq=page.locator(".faq-list details").first();await faq.locator("summary").focus();await page.keyboard.press("Enter");await faq.locator("p").waitFor();assert.match(await faq.innerText(),/fictional practice cases/);assert.equal(await page.getByRole("link",{name:"Read the source code",exact:false}).getAttribute("href"),"https://github.com/OM2412/ReturnTrail");
 pass("About is a separate reloadable public route; native FAQ opens by keyboard and explains the synthetic-data boundary");
 if(video){
  assert.equal(await page.locator("iframe").count(),0);assert.equal(mediaRequests.length,0);
  await page.getByRole("button",{name:"Load the ReturnTrail demo video from YouTube"}).click();const frame=page.getByTitle("ReturnTrail project demo");await frame.waitFor();assert.equal(await frame.getAttribute("src"),"https://www.youtube-nocookie.com/embed/AbC_123-xYz?rel=0");assert.equal(mediaRequests.length,1);assert.equal(await page.getByRole("link",{name:"Watch on YouTube",exact:false}).getAttribute("href"),"https://www.youtube.com/watch?v=AbC_123-xYz");
  pass("Configured fixture video makes no third-party request before explicit load; the player uses the allowlisted privacy-enhanced origin without autoplay (player network mocked)");
  await navigate("/");assert.equal(await page.getByRole("link",{name:"Watch the demo",exact:false}).getAttribute("href"),"#walkthrough");assert.equal(await page.getByRole("navigation",{name:"Project links"}).getByRole("link",{name:"Demo video",exact:false}).count(),1);
  pass("A configured video appears in the hero, walkthrough and footer; its settings are public and contain no credentials");
 }else{
  assert.equal(await page.locator(".video-guide, iframe").count(),0);assert.equal(await page.getByRole("navigation",{name:"Project links"}).getByRole("link",{name:"Demo video",exact:false}).count(),0);assert.equal(mediaRequests.length,0);
  pass("An absent video URL hides the entire video feature without a blank card, dead link or YouTube request");
 }
 if(!video){
  for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:1050});for(const route of ["/","/about"]){await navigate(route);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`${route} overflows at ${width}`);if(route==="/about" && [390,1440].includes(width))await page.screenshot({path:`${out}/about-${width}.png`,fullPage:true});}}
  pass("Landing and About fit 320/390/768/1024/1440px with reduced motion; photos reserve dimensions and profile links stay reachable");
  const axe=createRequire(import.meta.url).resolve("axe-core/axe.min.js");const accessibility=[];await page.setViewportSize({width:1440,height:1050});
  for(const route of ["/","/about"]){await navigate(route);await page.addScriptTag({path:axe});const violations=await page.evaluate(async()=> (await window.axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21a","wcag21aa"]}})).violations);accessibility.push({route,violations:violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});}
  await writeFile(out+"/accessibility.json",JSON.stringify(accessibility,null,2));assert.deepEqual(accessibility.flatMap(r=>r.violations.filter(v=>["serious","critical"].includes(v.impact)).map(v=>({route:r.route,...v}))),[],"See qa/public/accessibility.json");
  pass("Landing and About have no serious/critical axe WCAG A/AA findings in the scanned desktop state; not a full accessibility certification");
  await context.route("**/team/ajeet.webp",route=>route.abort());await navigate("/about");await page.locator(".builder-ajeet").scrollIntoViewIfNeeded();await page.getByLabel("Ajeet Gadekar portrait unavailable").waitFor();assert.equal(await page.getByRole("link",{name:"Ajeet Gadekar on LinkedIn",exact:true}).count(),1);
  pass("A missing portrait falls back to the member initials while name, role and profile links remain usable");
 }
 assert.equal(writes,0);assert.deepEqual(errors,[]);pass("Public browsing does not create a guest workspace or send a write; no uncaught browser errors");
 await writeFile(`${out}/results-${video?"video":"default"}.json`,JSON.stringify({count:passes.length,passed:passes,errors,videoConfigured:video,network:"Auth mocked; configured YouTube player uses a local response fixture, not actual video playback"},null,2));
}catch(error){await page.screenshot({path:`${out}/failure-${video?"video":"default"}.png`,fullPage:true});throw error;}finally{await browser.close();}
