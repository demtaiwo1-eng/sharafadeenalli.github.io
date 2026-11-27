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
document.querySelectorAll("[data-view]").forEach(a=>a.addEventListener("click",e=>{e.preventDefault();navigate(a.dataset.view)}));document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.go)));
$("#menu-btn").addEventListener("click",()=>{$("#sidebar").classList.add("open");$("#scrim").classList.add("show")});$("#scrim").addEventListener("click",()=>{$("#sidebar").classList.remove("open");$("#scrim").classList.remove("show")});
$("#refresh-updates").addEventListener("click",loadAll);
$("#refresh-monitor").addEventListener("click",loadHashtag);$("#updates-search").addEventListener("input",e=>{const q=e.target.value.toLowerCase();updateCards(updates.filter(x=>[x.title,x.summary,x.topic,x.sourceName].join(" ").toLowerCase().includes(q)),$("#updates-list"))});
$("#monitor-form").addEventListener("submit",async e=>{e.preventDefault();const q=$("#monitor-query").value.trim();$("#monitor-results").innerHTML='<div class="empty-state">Searching connected public records…</div>';try{const r=await request("/v1/public/updates?limit=50&q="+encodeURIComponent(q));const rows=Array.isArray(r)?r:(r.items||[]);updateCards(rows,$("#monitor-results"))}catch(err){$("#monitor-results").innerHTML='<div class="empty-state">'+esc(err.message)+'. Connect the API and ingest permitted public-source records before monitoring can return results.</div>'}});
const KEY="camptech.fieldReports.v1";function localRows(){try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch{return []}}
function renderLocal(){const rows=localRows();$("#local-reports").innerHTML=rows.length?rows.map(x=>'<article class="record"><div class="record-meta">'+esc(x.category)+' · '+esc(date(x.createdAt))+'</div><h3>'+esc(x.lga)+(x.ward?" · "+esc(x.ward):"")+'</h3><p>'+esc(x.description)+'</p>'+(x.sourceUrl?'<a href="'+esc(x.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Supporting source ↗</a>':"")+'<p><span class="badge">LOCAL DRAFT · NOT SUBMITTED</span></p></article>').join(""):'<div class="empty-state">No local drafts saved on this device.</div>'}
$("#field-form").addEventListener("submit",e=>{e.preventDefault();const f=new FormData(e.currentTarget);const rows=localRows();rows.unshift({category:f.get("category"),lga:f.get("lga"),ward:f.get("ward"),description:f.get("description"),sourceUrl:f.get("sourceUrl"),createdAt:new Date().toISOString()});try{localStorage.setItem(KEY,JSON.stringify(rows.slice(0,100)));e.currentTarget.reset();$("#field-feedback").textContent="Draft saved in this browser only. It has NOT been sent to the team or server.";renderLocal()}catch{$("#field-feedback").textContent="Could not save locally. Check browser storage availability."}});
$("#clear-reports").addEventListener("click",()=>{if(confirm("Delete all field-report drafts saved on this device?")){localStorage.removeItem(KEY);renderLocal()}});
const hash=location.hash.replace("#","");if(["updates","monitoring","operations","field","integrations"].includes(hash))navigate(hash);loadAll();renderLocal();loadHashtag();loadIntegrations();monitorTimer=setInterval(loadHashtag,5000);
})();