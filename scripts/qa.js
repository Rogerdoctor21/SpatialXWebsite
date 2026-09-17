const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const pub=path.join(root,'public');
const reportDir=path.join(root,'reports');
fs.mkdirSync(reportDir,{recursive:true});
function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);}
const htmlFiles=walk(pub).filter(f=>f.endsWith('.html'));
const indexable=htmlFiles.filter(f=>!['404.html','privacy.html'].includes(path.basename(f)));
const issues=[]; const warnings=[];
const checks={htmlPages:htmlFiles.length,indexablePages:indexable.length,canonical:0,metaDescription:0,openGraph:0,twitter:0,jsonLd:0,oneH1:0,phoneVisible:0};
const canonicalUrls=[];
for(const f of htmlFiles){
  const rel=path.relative(pub,f).replaceAll('\\','/');
  const s=fs.readFileSync(f,'utf8');
  const title=(s.match(/<title>([\s\S]*?)<\/title>/i)||[])[1]||'';
  if(!title.trim()) issues.push(`${rel}: missing title`);
  const desc=(s.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)||s.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)||[])[1];
  if(desc) checks.metaDescription++; else issues.push(`${rel}: missing meta description`);
  const canonical=(s.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)||s.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)||[])[1];
  if(canonical){checks.canonical++; canonicalUrls.push(canonical);} else issues.push(`${rel}: missing canonical`);
  if(/property=["']og:title["']/.test(s)&&/property=["']og:description["']/.test(s)&&/property=["']og:image["']/.test(s)) checks.openGraph++; else issues.push(`${rel}: incomplete Open Graph`);
  if(/name=["']twitter:card["']/.test(s)) checks.twitter++; else issues.push(`${rel}: missing Twitter card`);
  const h1=(s.match(/<h1\b/gi)||[]).length; if(h1===1) checks.oneH1++; else issues.push(`${rel}: expected 1 H1, found ${h1}`);
  const schemas=[...s.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  if(!['404.html','privacy.html'].includes(path.basename(f))){
    if(schemas.length){ checks.jsonLd++; schemas.forEach(m=>{try{JSON.parse(m[1]);}catch(e){issues.push(`${rel}: invalid JSON-LD`);}}); }
    else issues.push(`${rel}: missing JSON-LD`);
  }
  if(s.includes('416-477-7414')) checks.phoneVisible++;
  const hasNoindex=/name=["']robots["'][^>]*content=["']noindex,follow["']/.test(s)||/content=["']noindex,follow["'][^>]*name=["']robots["']/.test(s);
  if(rel==='404.html' && !hasNoindex) warnings.push('404.html should be noindex,follow');
  if(rel==='privacy.html' && !hasNoindex) warnings.push('privacy.html should be noindex,follow');
}
if(new Set(canonicalUrls).size!==canonicalUrls.length) issues.push('Duplicate canonical URLs detected');
const robots=fs.readFileSync(path.join(pub,'robots.txt'),'utf8');
if(!robots.includes('User-agent: OAI-SearchBot')||!robots.includes('https://spatialx.ca/sitemap.xml')) issues.push('robots.txt missing OAI-SearchBot allowance or canonical sitemap');
const sitemap=fs.readFileSync(path.join(pub,'sitemap.xml'),'utf8');
const sitemapUrls=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
for(const c of canonicalUrls.filter(u=>!u.endsWith('/404')&&!u.endsWith('/privacy'))){if(!sitemapUrls.includes(c)) issues.push(`Sitemap missing ${c}`);}
if(!fs.existsSync(path.join(pub,'assets','spatialx-social-card.png'))) issues.push('Missing social preview image');
const js=fs.readFileSync(path.join(root,'server.js'),'utf8');
if(!js.includes("spatialxsolutions.com")||!js.includes("https://spatialx.ca")) issues.push('Server missing legacy-domain canonical redirect');
if(!js.includes("'.png':'image/png'")) issues.push('Server missing PNG MIME type');
const result={generatedAt:new Date().toISOString(),status:issues.length?'FAIL':'PASS',checks, sitemapUrlCount:sitemapUrls.length, issues,warnings};
fs.writeFileSync(path.join(reportDir,'SEO_QA_RESULTS.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
process.exit(issues.length?1:0);
