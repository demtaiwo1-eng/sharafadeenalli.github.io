(() => {
const API=(window.CAMPTECH_CONFIG?.API_BASE_URL||"").replace(/\/$/,"");
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const date=s=>{if(!s)return "Date not supplied";const d=new Date(s);return Number.isNaN(d.getTime())?esc(s):d.toLocaleString()};
let updates=[],projects=[];
let monitorTimer=null;
async function request(path){if(!API)throw new Error("API not configured");const r=await fetch(API+path,{headers:{Accept:"application/json"}});if(!r.ok)throw new Error("Service returned "+r.status);return r.json()}
function setStatus(ok,msg){const label=$("#connection-label"),dot=$(".status-dot"),status=$("#api-status"),detail=$("#api-detail");if(label)label.textContent=ok?"API connected":"API not connected";if(dot)dot.classList.toggle("online",ok);if(status)status.textContent=ok?"Connected":"Not connected";if(detail)detail.textContent=msg}
function updateCards(list,target){target.innerHTML=list.length?list.map(x=>'<article class="record"><div class="record-meta">'+esc(x.topic||x.category||"Public update")+' · '+esc(date(x.publishedAt||x.createdAt))+'</div><h3>'+esc(x.title||"Untitled update")+'</h3><p>'+esc(x.summary||"No summary supplied.")+'</p><span class="badge">'+esc(x.verificationStatus||"unreviewed")+'</span>'+(x.sourceUrl?'<p><a href="'+esc(x.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Open original source ↗</a></p>':"")+'</article>').join(""):'<div class="empty-state">No matching records were returned. No sample data is being substituted for live records.</div>'}
function projectCards(list){$("#projects-list").innerHTML=list.length?list.map(x=>'<article class="record"><div class="record-meta">PROJECT · '+esc(x.status||"status not set")+'</div><h3>'+esc(x.name||"Untitled project")+'</h3><p>'+esc(x.description||"No description supplied.")+'</p><small class="muted">Last updated: '+esc(date(x.updatedAt))+'</small></article>').join(""):'<div class="empty-state">No project records available from the connected service.</div>'}
async function loadAll(){try{const [u,p]=await Promise.all([request("/v1/public/updates?limit=30"),request("/v1/operations/projects")]);updates=Array.isArray(u)?u:(u.items||[]);projects=Array.isArray(p)?p:(p.items||[]);setStatus(true,"API responded successfully");if($("#updates-count"))$("#updates-count").textContent=updates.length;if($("#projects-count"))$("#projects-count").textContent=projects.length;updateCards(updates,$("#updates-list"));projectCards(projects)}catch(e){setStatus(false,e.message);if($("#updates-count"))$("#updates-count").textContent="—";if($("#projects-count"))$("#projects-count").textContent="—";$("#updates-list").innerHTML='<div class="empty-state">Public updates are not connected yet. Configure the API service to load real, sourced records.</div>';$("#projects-list").innerHTML='<div class="empty-state">Project records are not connected yet. No demonstration projects are being presented as real.</div>'}}

async function loadOyoScope(){
 const coverage=$("#oyo-coverage"), modules=$("#analysis-modules");
 try{
  const result=await request("/v1/monitoring/scope");
  const scope=result.scope||{};
  const geo=scope.geography||{};
  coverage.innerHTML='<div class="oyo-schematic" role="list" aria-label="Oyo State monitoring coverage areas">'+(geo.coverage||[]).map((area,i)=>'<div class="oyo-region region-'+(i+1)+'" role="listitem"><span class="region-pin"></span><b>'+esc(area)+'</b></div>').join("")+'</div><div class="coverage-caption"><span class="coverage-key"></span>'+esc(geo.primary||"Oyo State, Nigeria")+'</div>';
  modules.innerHTML=(scope.analysis||[]).map((name,i)=>'<div class="analysis-module"><span class="analysis-number">'+String(i+1).padStart(2,"0")+'</span><span>'+esc(name.replaceAll("_"," "))+'</span><span class="module-state">IN SCOPE</span></div>').join("");
 }catch(error){
  coverage.innerHTML='<div class="empty-state">Oyo monitoring scope is unavailable: '+esc(error.message)+'.</div>';
  modules.innerHTML='<div class="empty-state">Analysis framework could not be loaded.</div>';
 }
}
async function loadDiscourseAnalytics(type="issue_map"){
 const target=$("#analytics-report-content"); if(!target)return;
 target.innerHTML='<div class="empty-state">Loading '+esc(type.replace("_"," "))+' analysis…</div>';
 try{
  const data=await request("/v1/monitoring/analytics?type="+encodeURIComponent(type)+"&days=30");
  const f=data.findings||{}, sample=Number(f.sampleSize||0);
  $("#analytics-period").textContent="Last "+Number(f.periodDays||30)+" days · "+sample.toLocaleString()+" records";
  let body="";
  if(type==="issue_map"||type==="trend"){
   const rows=type==="trend"?(f.dailyTrend||[]).slice(-14).map(x=>({label:x.date,value:x.posts})): (f.issueMap||[]).slice(0,10).map(x=>({label:x.label,value:x.posts}));
   body=rows.length?'<div class="analytics-bars">'+rows.map(x=>'<div class="analytics-bar-row"><span>'+esc(x.label)+'</span><div class="analytics-bar-track"><i style="width:'+Math.max(3,Math.round(x.value/Math.max(1,...rows.map(y=>y.value))*100))+'%"></i></div><b>'+Number(x.value).toLocaleString()+'</b></div>').join("")+'</div>':'<div class="empty-state">No collected records in this period yet.</div>';
  }else if(type==="sentiment"){
   const s=f.sentimentLanguageCounts||{};
   body='<div class="analytics-kpis"><div><b>'+Number(s.positive_language||0)+'</b><span>Positive-language signals</span></div><div><b>'+Number(s.negative_language||0)+'</b><span>Negative-language signals</span></div><div><b>'+Number(s.mixed_or_unclear||0)+'</b><span>Mixed / unclear</span></div></div>';
  }else if(type==="swot"){
   const sw=f.swot||{}; body=['strengths','weaknesses','opportunities','threats'].map(k=>'<div class="analytics-report-block"><h3>'+k.toUpperCase()+'</h3><ul>'+((sw[k]||[]).map(x=>'<li>'+esc(x)+'</li>').join("")||'<li>No findings.</li>')+'</ul></div>').join("");
  }else if(type==="pestle"){
   body=(f.pestle||[]).map(x=>'<div class="analytics-report-block"><h3>'+esc(x.dimension)+'</h3><p>'+esc(x.signal)+'</p><small>'+((x.issues||[]).map(i=>esc(i.label)).join(" · ")||"No issue signals detected")+'</small></div>').join("");
  }else if(type==="risk"){
   body=(f.risks||[]).map(x=>'<div class="analytics-report-block"><h3>'+esc(x.risk)+' <small>('+esc(x.level)+')</small></h3><p>'+esc(x.basis)+'</p></div>').join("");
  }else{
   body='<div class="empty-state">Evidence review is available through the API report response.</div>';
  }
  target.innerHTML=body;
  document.querySelectorAll("[data-report]").forEach(b=>b.classList.toggle("primary",b.dataset.report===type));
 }catch(error){target.innerHTML='<div class="empty-state">Analytics unavailable: '+esc(error.message)+'</div>';}
}
async function loadProviderCoverage(){
 const target=$("#provider-coverage-grid"); if(!target)return;
 try{
  const data=await request("/v1/monitoring/coverage");
  const providers=data.providers||[];
  target.innerHTML=providers.length?providers.map(p=>{
   const status=String(p.status||"unknown"), cls=status==="succeeded"?"good":status==="partial"?"warn":status==="rate_limited"?"warn":"bad";
   const date=p.lastFinishedAt?new Date(p.lastFinishedAt).toLocaleString():"Run pending";
   return '<article class="coverage-card"><div class="coverage-card-head"><strong>'+esc(p.platform)+'</strong><span class="coverage-status '+cls+'">'+esc(status.replace("_"," "))+'</span></div><div class="coverage-stats"><span>'+Number(p.postsSeen||0)+' posts</span><span>'+Number(p.repliesSeen||0)+' replies</span><span>'+Number(p.errors||0)+' errors</span></div><small>Last checked: '+esc(date)+'</small></article>';
  }).join(""):'<div class="empty-state">No provider runs have been recorded yet. The first scheduled collection will populate this view.</div>';
 }catch(error){target.innerHTML='<div class="empty-state">Coverage status unavailable: '+esc(error.message)+'</div>';}
}
async function loadKeywordInsights(){
 const status=$("#keyword-status"), tags=$("#discovered-hashtags"), words=$("#discovered-keywords");
 if(!status||!tags||!words)return;
 try{
  const data=await request("/v1/monitoring/keywords?limit=24");
  const hashtags=data.hashtags||[], keywords=(data.keywords||[]).filter(x=>x.term_type!=="hashtag");
  status.textContent=Number((data.indexedPostsByPlatform||[]).reduce((n,x)=>n+Number(x.indexed_records||0),0)).toLocaleString()+" indexed term records";
  tags.innerHTML=hashtags.length?hashtags.map(x=>'<span class="keyword-chip">'+esc(x.hashtag)+' <b>'+Number(x.records||0)+'</b></span>').join(""):'<div class="empty-state">No discovered hashtags yet.</div>';
  words.innerHTML=keywords.length?keywords.slice(0,16).map(x=>'<div class="keyword-row"><span>'+esc(x.keyword)+'</span><b>'+Number(x.records||0)+'</b></div>').join(""):'<div class="empty-state">No extracted words or phrases yet.</div>';
 }catch(error){status.textContent="Keyword index unavailable";tags.innerHTML='<div class="empty-state">'+esc(error.message)+'</div>';words.innerHTML='<div class="empty-state">No keyword data available.</div>';}
}
async function loadHashtag(){
 const state=$("#monitor-state"), feed=$("#hashtag-feed");
 try{
  const data=await request("/v1/monitoring/hashtag?tag=Sarafadeen");
  $("#metric-total").textContent=Number(data.total||0).toLocaleString();
  $("#metric-day").textContent=Number(data.last24h||0).toLocaleString();
  $("#metric-hour").textContent=Number(data.lastHour||0).toLocaleString();
  $("#metric-sources").textContent=Number((data.platforms||[]).length).toLocaleString();
  $("#monitor-updated").textContent=new Date(data.generatedAt||Date.now()).toLocaleTimeString();
  state.textContent="Monitor connected";$("#monitor-dot").classList.add("online");
  const platforms=data.platforms||[];
  $("#platform-breakdown").innerHTML=platforms.length?platforms.map(x=>'<div class="platform-row"><span>'+esc(x.platform)+'</span><b>'+Number(x.count).toLocaleString()+'</b></div>').join(""):'<div class="empty-state">No qualifying posts have been ingested yet.</div>';
  const hours=data.hourly||[], max=Math.max(1,...hours.map(x=>Number(x.count||0)));
  $("#activity-chart").innerHTML=hours.length?'<div class="chart-bars">'+hours.map(x=>'<div class="chart-column" title="'+esc(date(x.bucket))+': '+Number(x.count)+' posts"><span class="chart-value">'+Number(x.count||0)+'</span><div class="chart-bar" style="height:'+Math.max(3,Number(x.count||0)/max*100)+'%"></div><small>'+new Date(x.bucket).toLocaleTimeString([], {hour:"2-digit"})+'</small></div>').join("")+'</div>':'<div class="empty-state">No activity in the selected period.</div>';
  const posts=data.posts||[];
  feed.innerHTML=posts.length?posts.map(x=>'<article class="feed-post"><div class="feed-meta"><span>'+esc(x.platform)+'</span><span>'+esc(date(x.publishedAt))+'</span></div><p>'+esc(x.postText)+'</p><div class="feed-bottom"><span>'+esc(x.authorHandle||"Public account")+'</span><a href="'+esc(x.postUrl)+'" target="_blank" rel="noopener noreferrer">Open original post ↗</a></div></article>').join(""):'<div class="empty-state">No qualifying posts recorded yet. The count remains at zero until a real public post containing #Sarafadeen is ingested.</div>';
  $("#monitor-footnote").textContent="Last successful API check: "+new Date(data.generatedAt||Date.now()).toLocaleString()+". Counts exclude duplicates and posts that fail the exact hashtag check.";
 }catch(e){state.textContent="Monitor unavailable";$("#monitor-dot").classList.remove("online");$("#monitor-updated").textContent="Unavailable";feed.innerHTML='<div class="empty-state">The live monitor could not be reached: '+esc(e.message)+'. Existing counts are not being fabricated.</div>';}
}


async function enableNotifications(){
 const button=$("#enable-notifications"), status=$("#notification-status");
 if(!("serviceWorker" in navigator)||!("PushManager" in window)||!("Notification" in window)){if(status)status.textContent="Push notifications are not supported in this browser.";return}
 if(Notification.permission==="denied"){if(status)status.textContent="Notifications are blocked in browser settings. Allow them there, then try again.";return}
 try{
  if(status)status.textContent="Requesting notification permission…";
  const permission=await Notification.requestPermission();
  if(permission!=="granted"){if(status)status.textContent="Notification permission was not granted.";return}
  const registration=await navigator.serviceWorker.register("./sw.js");
  const keyData=await request("/v1/notifications/public-key");
  const decode=value=>Uint8Array.from(atob(value.replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0));
  let subscription=await registration.pushManager.getSubscription();
  if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decode(keyData.publicKey)});
  const response=await fetch(API+"/v1/notifications/subscribe",{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify({subscription:subscription.toJSON()})});
  if(!response.ok)throw new Error("Notification service returned "+response.status);
  if(status)status.textContent="Notifications enabled on this device.";
  if(button)button.textContent="Disable notifications";
 }catch(error){if(status)status.textContent="Could not enable notifications: "+error.message}
}
async function disableNotifications(){
 const status=$("#notification-status"),button=$("#enable-notifications");
 try{
  const registration=await navigator.serviceWorker.getRegistration("./");
  const subscription=await registration?.pushManager.getSubscription();
  if(subscription){await fetch(API+"/v1/notifications/unsubscribe",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({endpoint:subscription.endpoint})});await subscription.unsubscribe()}
  if(status)status.textContent="Notifications disabled on this device.";
  if(button)button.textContent="Enable notifications";
 }catch(error){if(status)status.textContent="Could not disable notifications: "+error.message}
}

const INTEGRATION_SELECTION_KEY="sarafadeen.integrationSelection.v1";
let integrationCatalog=[];
function selectedIntegrations(){try{return JSON.parse(localStorage.getItem(INTEGRATION_SELECTION_KEY)||"[]")}catch{return []}}
function saveIntegrationSelection(ids){try{localStorage.setItem(INTEGRATION_SELECTION_KEY,JSON.stringify(ids))}catch{}}
function renderIntegrations(){
 const groups=$("#integration-groups");
 if(!groups)return;
 if(!integrationCatalog.length){groups.innerHTML='<div class="empty-state">No integration catalogue was returned by the API.</div>';return}
 const selected=new Set(selectedIntegrations());
 const names={social:"Social platforms",video:"Video and livestream platforms",community:"Community platforms",publisher:"News and publisher feeds",public_data:"Government and public datasets",aggregator:"Unified API providers"};
 const ordered=["social","video","community","publisher","public_data","aggregator"];
 groups.innerHTML=ordered.map(kind=>{
  const items=integrationCatalog.filter(x=>x.kind===kind);
  if(!items.length)return "";
  return '<section class="integration-group"><h2>'+esc(names[kind]||kind)+'</h2><div class="integration-grid">'+items.map(item=>{
   const status=item.configured?"configured_not_tested":"not_configured";
   const label=item.connectionStatus==="public_access_unverified"?"Public API · connection test pending":(item.configured?"Credentials present · not tested":"Not configured");
   const env=(item.requiredEnvironment||[]).join(" · ");
   return '<article class="integration-card"><div class="integration-card-head"><div><h3>'+esc(item.name)+'</h3><span class="integration-status '+status+'">'+label+'</span></div><label class="integration-select"><input type="checkbox" data-integration="'+esc(item.id)+'" '+(selected.has(item.id)?"checked":"")+'> Include</label></div><p>'+esc(item.access||"See provider documentation for access requirements.")+'</p><div class="integration-capabilities">Capabilities: '+esc((item.capabilities||[]).join(", "))+'</div><p class="integration-env">Server variables: '+esc(env||"None required")+'</p><a href="'+esc(item.docs)+'" target="_blank" rel="noopener noreferrer">Developer documentation ↗</a></article>';
  }).join("")+'</div></section>';
 }).join("");
 const count=$("#integration-count");
 if(count)count.textContent=integrationCatalog.length+" integrations assessed · "+selected.size+" selected";
 groups.querySelectorAll("[data-integration]").forEach(input=>input.addEventListener("change",()=>{
  const ids=new Set(selectedIntegrations());
  if(input.checked)ids.add(input.dataset.integration);else ids.delete(input.dataset.integration);
  saveIntegrationSelection([...ids]);renderIntegrations();
 }));
}
async function loadIntegrations(){
 const target=$("#integration-groups");
 if(target)target.innerHTML='<div class="empty-state">Loading the latest API connection catalogue…</div>';
 try{
  const data=await request("/v1/integrations/catalog");
  integrationCatalog=Array.isArray(data.integrations)?data.integrations:[];
  renderIntegrations();
 }catch(error){
  if(target)target.innerHTML='<div class="empty-state">Could not load the API catalogue: '+esc(error.message)+'. Check that the backend deployment includes the integration catalogue update.</div>';
  const count=$("#integration-count");if(count)count.textContent="Catalogue unavailable";
 }
}
function setAllIntegrations(enabled){
 const ids=enabled?integrationCatalog.map(item=>item.id):[];
 saveIntegrationSelection(ids);renderIntegrations();
}
$("#select-all-integrations")?.addEventListener("click",()=>setAllIntegrations(true));
$("#clear-integrations")?.addEventListener("click",()=>setAllIntegrations(false));
$("#refresh-integrations")?.addEventListener("click",loadIntegrations);


// Secure social-account OAuth controls. The administrator token is memory-only.
let oauthAdminToken="";
const oauthLabels={x:"X",reddit:"Reddit",youtube:"YouTube / Google",facebook:"Facebook",instagram:"Instagram",threads:"Threads",tiktok:"TikTok",linkedin:"LinkedIn",mastodon:"Mastodon"};
async function oauthRequest(path,options={}){
 if(!oauthAdminToken)throw new Error("Unlock account connections first.");
 const headers={Accept:"application/json",Authorization:"Bearer "+oauthAdminToken,...(options.body?{"Content-Type":"application/json"}:{})};
 const response=await fetch(API+path,{...options,headers,credentials:"omit"});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data.error||"Authorization service returned "+response.status);
 return data;
}
function renderOAuthProviders(providers){
 const target=$("#oauth-provider-grid");if(!target)return;
 target.innerHTML=providers.map(p=>{
  const state=p.connected?'<span class="oauth-state connected">Connected</span>':p.configured?'<span class="oauth-state ready">Ready to sign in</span>':'<span class="oauth-state setup">Setup required</span>';
  const action=p.connected?'<button class="btn secondary" data-oauth-disconnect="'+esc(p.id)+'" type="button">Disconnect</button>':
   '<button class="btn primary" data-oauth-connect="'+esc(p.id)+'" type="button" '+(!p.configured?'disabled':'')+'>Connect account</button>';
  return '<article class="oauth-provider-card"><div class="oauth-provider-top"><strong>'+esc(p.label)+'</strong>'+state+'</div><p>'+esc(p.note||"Official provider authorization")+'</p><small>Requested: '+esc((p.scopes||[]).join(", "))+'</small><div class="oauth-provider-action">'+action+'</div></article>';
 }).join("");
 target.querySelectorAll("[data-oauth-connect]").forEach(button=>button.addEventListener("click",async()=>{
  button.disabled=true;button.textContent="Opening sign-in…";
  const authWindow=window.open("about:blank","_blank");
  try{
   const result=await oauthRequest("/v1/auth/connect/"+encodeURIComponent(button.dataset.oauthConnect),{method:"POST"});
   if(authWindow&&!authWindow.closed)authWindow.location.replace(result.authorizationUrl);
   else window.location.assign(result.authorizationUrl);
  }catch(error){
   if(authWindow&&!authWindow.closed)authWindow.close();
   $("#oauth-status").textContent=error.message;button.disabled=false;button.textContent="Connect account";
  }
 }));
 target.querySelectorAll("[data-oauth-disconnect]").forEach(button=>button.addEventListener("click",async()=>{
  if(!confirm("Disconnect "+(oauthLabels[button.dataset.oauthDisconnect]||button.dataset.oauthDisconnect)+" from this monitoring service?"))return;
  button.disabled=true;
  try{await oauthRequest("/v1/auth/connections/"+encodeURIComponent(button.dataset.oauthDisconnect),{method:"DELETE"});await loadOAuthConnections();}
  catch(error){$("#oauth-status").textContent=error.message;button.disabled=false;}
 }));
}
async function loadOAuthConnections(){
 const target=$("#oauth-provider-grid");if(target)target.innerHTML='<div class="empty-state">Checking secure account connections…</div>';
 try{
  const data=await oauthRequest("/v1/auth/connections");
  renderOAuthProviders(data.providers||[]);
  $("#oauth-status").textContent="Connection manager unlocked. "+(data.providers||[]).filter(x=>x.connected).length+" account connections currently stored.";
 }catch(error){if(target)target.innerHTML='<div class="empty-state">'+esc(error.message)+'</div>';$("#oauth-status").textContent=error.message;}
}
$("#oauth-unlock")?.addEventListener("click",async()=>{
 const value=$("#oauth-admin-token")?.value||"";
 if(!value.trim()){ $("#oauth-status").textContent="Enter your administrator token to continue.";return;}
 oauthAdminToken=value.trim();$("#oauth-admin-token").value="";
 await loadOAuthConnections();
});
window.addEventListener("message",event=>{
 if(event.origin!==location.origin||event.data?.type!=="sarafadeen-oauth-complete")return;
 const provider=oauthLabels[event.data.provider]||event.data.provider||"platform";
 $("#oauth-status").textContent=event.data.status==="connected"?"Authorization completed for "+provider+".": "Authorization did not complete for "+provider+".";
 if(oauthAdminToken)loadOAuthConnections();
});
const oauthResult=new URLSearchParams(location.search);
if(oauthResult.get("oauth")){
 const provider=oauthLabels[oauthResult.get("provider")]||oauthResult.get("provider")||"platform";
 const status=oauthResult.get("oauth")==="connected"?"Authorization completed for "+provider+". Unlock the connection centre to confirm the saved connection.":"Authorization did not complete: "+(oauthResult.get("reason")||"provider declined or access expired")+".";
 sessionStorage.setItem("sarafadeen.oauth.notice",status);
 try{if(window.opener&&!window.opener.closed)window.opener.postMessage({type:"sarafadeen-oauth-complete",status:oauthResult.get("oauth"),provider:oauthResult.get("provider")},location.origin);}catch{}
 history.replaceState(null,"",location.pathname+"#integrations");
}
try{const notice=sessionStorage.getItem("sarafadeen.oauth.notice");if(notice){const status=$("#oauth-status");if(status)status.textContent=notice;sessionStorage.removeItem("sarafadeen.oauth.notice");}}catch{}

// Theme: light is the default; users can switch to dark and the choice persists on this device.
const themeToggle=$("#theme-toggle");
function applyTheme(theme){
 const selected=theme==="dark"?"dark":"light";
 document.documentElement.setAttribute("data-ephinta-theme",selected);
 if(themeToggle){
  const next=selected==="dark"?"light":"dark";
  themeToggle.setAttribute("aria-label","Switch to "+next+" mode");
  themeToggle.setAttribute("title","Switch to "+next+" mode");
  themeToggle.setAttribute("aria-pressed",String(selected==="dark"));
 }
 try{localStorage.setItem("sarafadeen.theme",selected)}catch{}
}
let savedTheme="light";
try{savedTheme=localStorage.getItem("sarafadeen.theme")||"light"}catch{}
applyTheme(savedTheme);
themeToggle?.addEventListener("click",()=>applyTheme(document.documentElement.getAttribute("data-ephinta-theme")==="dark"?"light":"dark"));
function navigate(view){document.querySelectorAll(".view").forEach(x=>x.classList.toggle("active",x.id==="view-"+view));document.querySelectorAll(".nav-link").forEach(x=>x.classList.toggle("active",x.dataset.view===view));$("#crumb-current").textContent=view.toUpperCase();history.replaceState(null,"","#"+view);$("#sidebar").classList.remove("open");$("#scrim").classList.remove("show");if(view==="field")renderLocal();if(view==="integrations")loadIntegrations()}
document.querySelectorAll("[data-report]").forEach(b=>b.addEventListener("click",()=>loadDiscourseAnalytics(b.dataset.report)));
$("#refresh-coverage")?.addEventListener("click",loadProviderCoverage);
$("#enable-notifications")?.addEventListener("click",()=>("Notification" in window && Notification.permission==="granted")?disableNotifications():enableNotifications());
document.querySelectorAll("[data-view]").forEach(a=>a.addEventListener("click",e=>{e.preventDefault();navigate(a.dataset.view)}));document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.go)));
$("#menu-btn").addEventListener("click",()=>{$("#sidebar").classList.add("open");$("#scrim").classList.add("show")});$("#scrim").addEventListener("click",()=>{$("#sidebar").classList.remove("open");$("#scrim").classList.remove("show")});
$("#refresh-updates").addEventListener("click",loadAll);
$("#refresh-monitor").addEventListener("click",loadHashtag);$("#updates-search").addEventListener("input",e=>{const q=e.target.value.toLowerCase();updateCards(updates.filter(x=>[x.title,x.summary,x.topic,x.sourceName].join(" ").toLowerCase().includes(q)),$("#updates-list"))});
$("#monitor-form").addEventListener("submit",async e=>{e.preventDefault();const q=$("#monitor-query").value.trim();$("#monitor-results").innerHTML='<div class="empty-state">Searching connected public records…</div>';try{const r=await request("/v1/public/updates?limit=50&q="+encodeURIComponent(q));const rows=Array.isArray(r)?r:(r.items||[]);updateCards(rows,$("#monitor-results"))}catch(err){$("#monitor-results").innerHTML='<div class="empty-state">'+esc(err.message)+'. Connect the API and ingest permitted public-source records before monitoring can return results.</div>'}});
const KEY="camptech.fieldReports.v1";function localRows(){try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch{return []}}
function renderLocal(){const rows=localRows();$("#local-reports").innerHTML=rows.length?rows.map(x=>'<article class="record"><div class="record-meta">'+esc(x.category)+' · '+esc(date(x.createdAt))+'</div><h3>'+esc(x.lga)+(x.ward?" · "+esc(x.ward):"")+'</h3><p>'+esc(x.description)+'</p>'+(x.sourceUrl?'<a href="'+esc(x.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Supporting source ↗</a>':"")+'<p><span class="badge">LOCAL DRAFT · NOT SUBMITTED</span></p></article>').join(""):'<div class="empty-state">No local drafts saved on this device.</div>'}
$("#field-form").addEventListener("submit",e=>{e.preventDefault();const f=new FormData(e.currentTarget);const rows=localRows();rows.unshift({category:f.get("category"),lga:f.get("lga"),ward:f.get("ward"),description:f.get("description"),sourceUrl:f.get("sourceUrl"),createdAt:new Date().toISOString()});try{localStorage.setItem(KEY,JSON.stringify(rows.slice(0,100)));e.currentTarget.reset();$("#field-feedback").textContent="Draft saved in this browser only. It has NOT been sent to the team or server.";renderLocal()}catch{$("#field-feedback").textContent="Could not save locally. Check browser storage availability."}});
$("#clear-reports").addEventListener("click",()=>{if(confirm("Delete all field-report drafts saved on this device?")){localStorage.removeItem(KEY);renderLocal()}});
const hash=location.hash.replace("#","");if(["updates","monitoring","operations","field","integrations"].includes(hash))navigate(hash);loadAll();renderLocal();loadHashtag();loadKeywordInsights();loadDiscourseAnalytics();loadProviderCoverage();loadIntegrations();loadOyoScope();monitorTimer=setInterval(loadHashtag,5000);
})();