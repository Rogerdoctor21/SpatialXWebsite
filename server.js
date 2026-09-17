const http = require('http');
const fs = require('fs');
const path = require('path');
const tls = require('tls');
const { URL } = require('url');

const publicDir = path.join(__dirname, 'public');
const dataDir = path.join(__dirname, 'data');
const submissionsFile = path.join(dataDir, 'contact-submissions.jsonl');
const port = process.env.PORT || 3000;
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.svg':'image/svg+xml; charset=utf-8','.png':'image/png','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8','.json':'application/json; charset=utf-8'};
const rate = new Map();
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

function resolvePath(urlPath){
  let pathname = decodeURIComponent(urlPath.split('?')[0]);
  if (pathname === '/') return path.join(publicDir, 'index.html');
  if (!path.extname(pathname)) pathname += '.html';
  const filePath = path.normalize(path.join(publicDir, pathname));
  if (!filePath.startsWith(publicDir)) return null;
  return filePath;
}
function clean(value, max=4000){ return String(value || '').replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0,max); }
function validEmail(value){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function securityHeaders(){
  return {
    'X-Content-Type-Options':'nosniff',
    'X-Frame-Options':'DENY',
    'Referrer-Policy':'strict-origin-when-cross-origin',
    'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; form-action 'self' mailto:; frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
    'Strict-Transport-Security':'max-age=31536000; includeSubDomains'
  };
}
function json(res,status,payload){ res.writeHead(status, {...securityHeaders(),'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}); res.end(JSON.stringify(payload)); }
function getIp(req){ return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim(); }
function rateAllowed(ip){ const now=Date.now(), windowMs=15*60*1000, limit=5; const current=(rate.get(ip)||[]).filter(t=>now-t<windowMs); if(current.length>=limit){rate.set(ip,current); return false;} current.push(now); rate.set(ip,current); return true; }
function smtpConfigured(){ return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS); }
function smtpSend(submission){
  return new Promise((resolve,reject)=>{
    if(!smtpConfigured()) return resolve(false);
    const host=process.env.SMTP_HOST || 'smtp.hostinger.com';
    const port=Number(process.env.SMTP_PORT || 465);
    const user=process.env.SMTP_USER;
    const pass=process.env.SMTP_PASS;
    const to=process.env.CONTACT_TO || 'info@SpatialXSolutions.com';
    const subject=`SpatialX website inquiry — ${submission.organization || submission.name}`;
    const message=[
      `Name: ${submission.name}`,
      `Organization: ${submission.organization}`,
      `Email: ${submission.email}`,
      `Area of interest: ${submission.interest}`,
      `Timeline: ${submission.timeline}`,
      '', 'What they are trying to solve:', submission.message,
      '', `Received: ${submission.receivedAt}`
    ].join('\r\n');
    const encode=s=>Buffer.from(s,'utf8').toString('base64');
    const socket=tls.connect({host,port,servername:host,rejectUnauthorized:true});
    let buffer='', step=0;
    const send=line=>socket.write(line+'\r\n');
    const fail=e=>{ try{socket.destroy();}catch{} reject(e instanceof Error?e:new Error(String(e))); };
    socket.setTimeout(12000,()=>fail(new Error('SMTP timeout')));
    socket.on('error',fail);
    socket.on('data',chunk=>{
      buffer+=chunk.toString('utf8');
      if(!/\r\n$/.test(buffer)) return;
      const lines=buffer.trim().split(/\r\n/); const last=lines[lines.length-1];
      if(!/^\d{3} /.test(last)) return;
      const code=Number(last.slice(0,3)); buffer='';
      try{
        if(step===0 && code===220){step=1; send(`EHLO ${process.env.SMTP_HELO || 'spatialx.ca'}`);}
        else if(step===1 && code===250){step=2; send('AUTH LOGIN');}
        else if(step===2 && code===334){step=3; send(encode(user));}
        else if(step===3 && code===334){step=4; send(encode(pass));}
        else if(step===4 && code===235){step=5; send(`MAIL FROM:<${user}>`);}
        else if(step===5 && code===250){step=6; send(`RCPT TO:<${to}>`);}
        else if(step===6 && (code===250||code===251)){step=7; send('DATA');}
        else if(step===7 && code===354){
          step=8;
          const headers=[`From: SpatialX Website <${user}>`,`To: ${to}`,`Reply-To: ${submission.email}`,`Subject: ${subject}`,'MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','',''];
          socket.write(headers.join('\r\n')+message.replace(/^\./gm,'..')+'\r\n.\r\n');
        }
        else if(step===8 && code===250){step=9; send('QUIT');}
        else if(step===9 && code===221){socket.end(); resolve(true);}
        else if(code>=400){fail(new Error(`SMTP error ${code}`));}
      }catch(e){fail(e);}
    });
  });
}

const server = http.createServer((req,res)=>{
  const parsed = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const hostname = String(req.headers.host || '').toLowerCase().split(':')[0];
  const productionRedirectHosts = new Set(['spatialxsolutions.com','www.spatialxsolutions.com','www.spatialx.ca']);
  if (productionRedirectHosts.has(hostname)) {
    const canonicalPath = parsed.pathname.endsWith('.html') ? parsed.pathname.slice(0,-5) || '/' : parsed.pathname;
    res.writeHead(301, {...securityHeaders(),'Location':`https://spatialx.ca${canonicalPath}${parsed.search}`,'Cache-Control':'public, max-age=3600'});
    res.end();
    return;
  }
  if (hostname === 'spatialx.ca' && parsed.pathname.endsWith('.html')) {
    const canonicalPath = parsed.pathname.slice(0,-5) || '/';
    res.writeHead(301, {...securityHeaders(),'Location':`https://spatialx.ca${canonicalPath}${parsed.search}`,'Cache-Control':'public, max-age=3600'});
    res.end();
    return;
  }
  if (req.method === 'POST' && parsed.pathname === '/api/contact') {
    const ip=getIp(req);
    if(!rateAllowed(ip)) return json(res,429,{ok:false,message:'Too many submissions. Please try again later.'});
    let body='';
    req.on('data',chunk=>{ body+=chunk; if(body.length>100000){ req.destroy(); } });
    req.on('end', async ()=>{
      try{
        const contentType=String(req.headers['content-type']||'');
        let raw={};
        if(contentType.includes('application/json')) raw=JSON.parse(body||'{}');
        else raw=Object.fromEntries(new URLSearchParams(body));
        if(clean(raw.website,200)) return json(res,200,{ok:true,delivery:'filtered'});
        const submission={
          name:clean(raw.name,140), organization:clean(raw.organization,180), email:clean(raw.email,220),
          interest:clean(raw.interest,180), timeline:clean(raw.timeline,80), message:clean(raw.message,6000),
          receivedAt:new Date().toISOString()
        };
        if(!submission.name || !validEmail(submission.email) || !submission.message) return json(res,400,{ok:false,message:'Please provide your name, a valid email, and a short description of what you are trying to solve.'});
        fs.appendFileSync(submissionsFile, JSON.stringify(submission)+'\n', {encoding:'utf8',mode:0o600});
        let emailed=false;
        try{ emailed=await smtpSend(submission); }catch(err){ console.error('Contact email notification failed:',err.message); }
        console.log('Contact inquiry received', {organization:submission.organization,email:submission.email,emailed});
        return json(res,200,{ok:true,delivery:emailed?'email':'stored'});
      }catch(err){ console.error('Contact form error:',err); return json(res,500,{ok:false,message:'Unable to receive the inquiry right now.'}); }
    });
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, {...securityHeaders(),'Allow':'GET, HEAD, POST'}); res.end('Method Not Allowed'); return; }
  const filePath = resolvePath(parsed.pathname);
  if (!filePath) { res.writeHead(403, securityHeaders()); res.end('Forbidden'); return; }
  fs.readFile(filePath, (err,data)=>{
    if (err) {
      fs.readFile(path.join(publicDir,'404.html'), (e404,d404)=>{res.writeHead(404, {...securityHeaders(),'Content-Type':'text/html; charset=utf-8'}); res.end(e404 ? '<h1>404</h1>' : d404);});
      return;
    }
    const headers={...securityHeaders(),'Content-Type': types[path.extname(filePath)] || 'application/octet-stream'};
    if(path.extname(filePath)==='.html') headers['Cache-Control']='no-cache'; else headers['Cache-Control']='public, max-age=3600';
    res.writeHead(200, headers);
    if(req.method==='HEAD') res.end(); else res.end(data);
  });
});
server.listen(port, () => console.log(`SpatialX site running at http://localhost:${port}`));
