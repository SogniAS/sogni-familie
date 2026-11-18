const R = window.SOGNI_RECIPES || [];
const MONTHS=['januar','februar','mars','april','mai','juni','juli','august','september','oktober','november','desember'];
const DAYS=['mandag','tirsdag','onsdag','torsdag','fredag','lørdag','søndag'];
const COLORS=['#9c8775','#c4877f','#8a9a7b','#c9a46a','#7d8fa3','#a8879b','#6f8f8a','#b5856a'];
/* Pricing (example): base price covers 2 people, each extra person costs a little more per month. */
const PRICE={base:49,incl:2,extra:10,max:10};
const priceFor=n=>PRICE.base+Math.max(0,n-PRICE.incl)*PRICE.extra;
const extraNote=n=>n>=PRICE.incl?`Person nummer ${n+1} koster ${PRICE.extra} kr ekstra i måneden. Ny pris for familien: ${priceFor(n+1)} kr/mnd (nå ${priceFor(n)} kr).`:`${PRICE.base} kr/mnd dekker ${PRICE.incl} personer, så denne personen er inkludert.`;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-5);
const ls={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};

/* ---------- dates ---------- */
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parseYmd=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
function weekDays(offset){const t=new Date();t.setHours(12,0,0,0);const dow=(t.getDay()+6)%7;const mon=new Date(t);mon.setDate(t.getDate()-dow+offset*7);return [...Array(7)].map((_,i)=>{const d=new Date(mon);d.setDate(mon.getDate()+i);return d})}
function isoWeek(d){const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));const n=(t.getUTCDay()+6)%7;t.setUTCDate(t.getUTCDate()-n+3);const f=new Date(Date.UTC(t.getUTCFullYear(),0,4));return 1+Math.round(((t-f)/864e5-3+((f.getUTCDay()+6)%7))/7)}
const dayName=s=>DAYS[(parseYmd(s).getDay()+6)%7];
function easter(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1;return new Date(y,mo-1,da)}
const HOLI={};function holidays(y){if(HOLI[y])return HOLI[y];const o={},e=easter(y),add=(d,n)=>o[ymd(d)]=n,rel=(n,off)=>{const d=new Date(e);d.setDate(e.getDate()+off);add(d,n)};
  add(new Date(y,0,1),'Første nyttårsdag');rel('Skjærtorsdag',-3);rel('Langfredag',-2);rel('Første påskedag',0);rel('Andre påskedag',1);add(new Date(y,4,1),'Arbeidernes dag');add(new Date(y,4,17),'Grunnlovsdag');rel('Kristi himmelfartsdag',39);rel('Første pinsedag',49);rel('Andre pinsedag',50);add(new Date(y,11,25),'Første juledag');add(new Date(y,11,26),'Andre juledag');return HOLI[y]=o}
const longDate=k=>{const d=parseYmd(k);return dayName(k)+' '+d.getDate()+'. '+MONTHS[d.getMonth()]+(d.getFullYear()!==new Date().getFullYear()?' '+d.getFullYear():'')};
function weekOffsetOf(k){const mon=weekDays(0)[0];mon.setHours(0,0,0,0);const d=parseYmd(k);const dm=new Date(d);dm.setDate(d.getDate()-((d.getDay()+6)%7));return Math.round((dm-mon)/(7*864e5))}
/* ---------- skoleruta ---------- */
const SR=window.SOGNI_SKOLERUTE||{};
const schoolCfg=()=>{const x=S.items.find(i=>i.type==='school');return x&&x.kommune?x:null};
const addDays=(k,n)=>{const d=parseYmd(k);d.setDate(d.getDate()+n);return ymd(d)};
// Navnet på fridagen (eller første/siste skoledag) for dato k, ellers null
function schoolDay(k){const c=schoolCfg();if(!c)return null;const dow=(parseYmd(k).getDay()+6)%7;
  for(const e of c.extra||[])if(k>=e.from&&k<=e.to)return dow<5?{name:e.name,off:true}:null;
  const kd=SR[c.kommune];if(!kd)return null;
  for(const y of kd.years)for(const o of y.off)if(k>=o[0]&&k<=o[1]&&!(c.hide||[]).includes(o[0]))return dow<5?{name:o[2],off:true}:null;
  for(const y of kd.years){if(k===y.start)return {name:'Første skoledag',off:false};if(k===y.end)return {name:'Siste skoledag',off:false};
    if(k>y.end&&k<=y.end.slice(0,4)+'-07-31')return dow<5?{name:'Sommerferie',off:true}:null}
  return null}
// Fri-perioder som starter i en gitt måned (for årsoversikten)
function schoolPeriods(y,m){const c=schoolCfg();if(!c)return [];const pre=y+'-'+pad(m+1),out=[];
  const kd=SR[c.kommune];if(kd)kd.years.forEach(yr=>{yr.off.forEach(o=>{if(o[0].startsWith(pre)&&!(c.hide||[]).includes(o[0]))out.push(o)});
    if(yr.start.startsWith(pre))out.push([yr.start,yr.start,'Første skoledag']);if(yr.end.startsWith(pre))out.push([yr.end,yr.end,'Siste skoledag'])});
  (c.extra||[]).forEach(e=>{if(e.from.startsWith(pre))out.push([e.from,e.to,e.name])});
  return out.sort((a,b)=>a[0].localeCompare(b[0]))}
const rangeTxt=(a,b)=>{const A=parseYmd(a),B=parseYmd(b);return a===b?A.getDate()+'.':A.getMonth()===B.getMonth()?A.getDate()+'.–'+B.getDate()+'.':A.getDate()+'. '+MONTHS[A.getMonth()].slice(0,3)+'–'+B.getDate()+'. '+MONTHS[B.getMonth()].slice(0,3)};
const REPEAT={'':'Gjentas ikke',daily:'Hver dag',weekdays:'Hver ukedag (man–fre)',weekly:'Hver uke',biweekly:'Annenhver uke'};
const REMIND={0:'Ingen påminnelse',15:'15 min før',30:'30 min før',60:'1 time før',120:'2 timer før',1440:'Dagen før'};
function occurs(x,k){if(x.skip&&x.skip.includes(k))return false;if(!x.repeat)return x.date===k;if(k<x.date)return false;
  const diff=Math.round((parseYmd(k)-parseYmd(x.date))/864e5),dow=(parseYmd(k).getDay()+6)%7;
  return x.repeat==='daily'||(x.repeat==='weekdays'&&dow<5)||(x.repeat==='weekly'&&diff%7===0)||(x.repeat==='biweekly'&&diff%14===0)}
const repeatLabel=x=>x.repeat==='weekly'?'hver '+dayName(x.date):x.repeat==='biweekly'?'annenhver '+dayName(x.date):x.repeat==='daily'?'hver dag':x.repeat==='weekdays'?'hver ukedag':'';
const shortDate=d=>d.getDate()+'. '+MONTHS[d.getMonth()].slice(0,3);
function ago(t){const s=(Date.now()-t)/1000;if(s<60)return 'nå nettopp';if(s<3600)return Math.floor(s/60)+' min siden';const d=new Date(t);const hm=pad(d.getHours())+':'+pad(d.getMinutes());if(ymd(d)===ymd(new Date()))return 'i dag '+hm;const y=new Date();y.setDate(y.getDate()-1);if(ymd(d)===ymd(y))return 'i går '+hm;return d.getDate()+'. '+MONTHS[d.getMonth()]+' '+hm}

/* ---------- storage: Supabase (database + realtime) ---------- */
let SB=null,USER=null,SAMPLE=null,IMGOK=false;const DB=true,UID=true;
const q=async p=>{const {data,error}=await p;if(error)throw error;return data};
const RELOAD=new Set();
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')RELOAD.forEach(f=>f())});
function live(table,filter,load,onChange){let alive=true;const run=()=>alive&&load();
  const ch=SB.channel(table+'-'+uid()).on('postgres_changes',{event:'*',schema:'public',table,filter},p=>alive&&onChange(p)).subscribe(st=>{if(st==='SUBSCRIBED')run()});
  RELOAD.add(run);run();return()=>{alive=false;RELOAD.delete(run);SB.removeChannel(ch)}}
const Back={
  watchFamily(f,cb,err){const load=async()=>{try{const [fam,mem]=await Promise.all([q(SB.from('families').select('id,name,code,owner_user').eq('id',f).maybeSingle()),q(SB.from('members').select('id,name,color,user_id').eq('family_id',f).order('created_at'))]);
      cb(fam?{name:fam.name,code:fam.code,owner:fam.owner_user,members:mem}:null,{fromCache:false})}catch(e){err&&err(e)}};
    const a=live('members','family_id=eq.'+f,load,load),b=live('families','id=eq.'+f,()=>{},load);return()=>{a();b()}},
  watchItems(f,cb,err){const map=new Map(),emit=()=>cb([...map.values()],{fromCache:false});
    const row=r=>Object.assign({},r.data,{id:r.id,private:r.private});
    return live('items','family_id=eq.'+f,async()=>{try{const rows=await q(SB.from('items').select('id,private,data').eq('family_id',f));map.clear();rows.forEach(r=>map.set(r.id,row(r)));emit()}catch(e){err&&err(e)}},
      p=>{if(p.eventType==='DELETE')map.delete(p.old.id);else map.set(p.new.id,row(p.new));emit()})},
  watchRecipes(f,cb,err){const map=new Map(),emit=()=>cb([...map.values()]);
    return live('recipes','family_id=eq.'+f,async()=>{try{const rows=await q(SB.from('recipes').select('id,data').eq('family_id',f));map.clear();rows.forEach(r=>map.set(r.id,Object.assign({},r.data,{id:r.id})));emit()}catch(e){err&&err(e)}},
      p=>{if(p.eventType==='DELETE')map.delete(p.old.id);else map.set(p.new.id,Object.assign({},p.new.data,{id:p.new.id}));emit()})},
  watchActs(f,cb,err){let list=[];const conv=r=>({id:String(r.id),by:r.by_member,text:r.text,at:+r.at});
    return live('activity','family_id=eq.'+f,async()=>{try{list=(await q(SB.from('activity').select('id,by_member,text,at').eq('family_id',f).order('at',{ascending:false}).limit(40))).map(conv);cb(list,{fromCache:false})}catch(e){err&&err(e)}},
      p=>{if(p.eventType==='INSERT'){list=[conv(p.new)].concat(list).slice(0,40);cb(list,{fromCache:false})}})},
  watchPrivate(f,cb){cb([]);return()=>{}},
  async putItem(f,id,data){const d=Object.assign({},data);delete d.id;return q(SB.from('items').upsert({family_id:f,id,type:d.type,private:!!d.private,owner_user:d.private?USER.id:null,data:d,updated_at:new Date().toISOString()}))},
  async delItem(f,id){return q(SB.from('items').delete().eq('family_id',f).eq('id',id))},
  async putRecipe(f,id,data){return q(SB.from('recipes').upsert({family_id:f,id,data}))},
  async delRecipe(f,id){return q(SB.from('recipes').delete().eq('family_id',f).eq('id',id))},
  async addAct(f,data){return q(SB.from('activity').insert({family_id:f,by_member:data.by,text:data.text.slice(0,200),at:data.at}))},
  async addMember(f,m){return q(SB.from('members').insert({family_id:f,name:m.name,color:m.color}))},
  async removeMember(id){return q(SB.from('members').delete().eq('id',id))},
  async renameFamily(f,name){return q(SB.from('families').update({name}).eq('id',f))},
  async putItems(f,rows){if(!rows.length)return;return q(SB.from('items').upsert(rows.map(r=>({family_id:f,id:r.id,type:r.data.type,private:!!r.data.private,owner_user:r.data.private?USER.id:null,data:r.data,updated_at:new Date().toISOString()}))))},
  async delItems(f,ids){if(!ids.length)return;return q(SB.from('items').delete().eq('family_id',f).in('id',ids))},
  async listFeeds(f){return q(SB.from('feeds').select('id,member_id,name,url,private,last_sync,last_status').eq('family_id',f).order('created_at'))},
  async addFeed(f,d){return q(SB.from('feeds').insert(Object.assign({family_id:f},d)))},
  async delFeed(id){return q(SB.from('feeds').delete().eq('id',id))},
  async touchFeed(id,status){return q(SB.from('feeds').update({last_sync:new Date().toISOString(),last_status:status}).eq('id',id))}
};

/* ---------- state ---------- */
const S={cal:'uke',year:new Date().getFullYear(),fid:null,mid:null,fam:null,items:[],priv:[],fr:[],acts:[],feeds:[],tab:'uke',week:0,todoWho:'alle',dinMonth:new Date().getMonth()+1,seen:null,unsubs:[],loaded:{fam:false,items:false,acts:false}};
const me=()=>S.fam&&S.fam.members.find(m=>m.id===S.mid);
const member=id=>S.fam&&S.fam.members.find(m=>m.id===id);
const mname=id=>{const m=member(id);return m?m.name:'Noen'};
const initials=n=>(n||'?').trim().slice(0,1).toUpperCase();
const chip=id=>{if(!id||id==='alle')return '<span class="chip all">Alle</span>';const m=member(id);if(!m)return '';return `<span class="chip"><i style="background:${m.color}"></i>${esc(m.name)}</span>`};
const visible=()=>S.items.filter(i=>!i.private||i.owner===S.mid).concat(S.priv.filter(i=>i.owner===S.mid));
const items=t=>visible().filter(i=>i.type===t);
const findItem=id=>visible().find(i=>i.id===id);
const canPrivate=()=>true;
function saveItem(id,data){const d=Object.assign({},data);delete d.id;return Back.putItem(S.fid,id,d)}
function removeItem(id){return Back.delItem(S.fid,id)}
const privChip='<span class="chip all" title="Bare du ser denne">🔒 Privat</span>';
const privBox=id=>canPrivate()?`<label class="row small" style="gap:8px;font-weight:600;color:var(--head)"><input type="checkbox" class="check" id="${id}" style="width:22px;height:22px"> Privat, bare jeg ser dette</label>`:'';
async function act(text){try{await Back.addAct(S.fid,{by:S.mid,text,at:Date.now()})}catch(e){}}
async function safe(p){try{await p}catch(e){toast('Det ble ikke lagret. Sjekk nettet og prøv igjen.')}}

/* ---------- ui helpers ---------- */
let toastT;
function toast(html,color){const t=$('#toast');t.innerHTML=(color?`<span class="dot" style="background:${color};width:12px;height:12px"></span>`:'')+`<span>${html}</span>`;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,4200);try{navigator.vibrate&&navigator.vibrate(30)}catch(e){}}
function sheet(html,onMount){$('#sheetBody').innerHTML=html;$('#sheetWrap').hidden=false;onMount&&onMount($('#sheetBody'))}
function closeSheet(){$('#sheetWrap').hidden=true;$('#sheetBody').innerHTML=''}
$('#backdrop').onclick=closeSheet;
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet()});
function banner(text){$('#banner').hidden=!text;$('#bannerText').textContent=text||''}

/* ---------- login ---------- */
function logoBlock(){return `<div class="stack" style="gap:6px;margin-bottom:28px"><div class="logo">SOGNI</div><div class="tagline">dream it, plan it, live it</div><div class="eyebrow" style="margin-top:14px">Familieplanlegger</div></div>`}
function showAuth(html){$('#app').hidden=true;const a=$('#auth');a.hidden=false;a.innerHTML=`<div class="auth">${logoBlock()}${html}</div>`;return a}
const inviteCode=()=>{try{return (new URLSearchParams(location.search).get('kode')||'').toUpperCase().slice(0,6)}catch(e){return ''}};
function welcome(){
  showAuth(`<form class="stack" id="f">
    <p style="margin:0 0 4px;max-width:34ch">Hele familiens uke på ett sted. Kalender, handleliste, gjøremål og middager, og alle ser endringene med en gang.</p>
    ${inviteCode()?`<div class="box small">Du er invitert til en familie. Logg inn først, så blir du med.</div>`:''}
    <div class="field"><label for="em">Din e-post</label><input class="input" id="em" type="email" inputmode="email" autocomplete="email" required placeholder="navn@epost.no"></div>
    <div id="err" class="err" hidden></div>
    <button class="btn block" id="go">Send meg innloggingslenke</button>
    <p class="muted small" style="margin:0">Vi sender en e-post med en lenke du trykker på. Du trenger ikke passord.</p></form>`);
  const le=linkError();if(le){$('#err').hidden=false;$('#err').textContent=le}
  $('#f').onsubmit=async e=>{e.preventDefault();const email=$('#em').value.trim();const b=$('#go');b.disabled=true;b.textContent='Sender …';
    try{await q(SB.auth.signInWithOtp({email,options:{shouldCreateUser:true,emailRedirectTo:location.origin+'/'+(inviteCode()?'?kode='+encodeURIComponent(inviteCode()):'')}}));codeScreen(email)}
    catch(er){b.disabled=false;b.textContent='Send meg innloggingslenke';$('#err').hidden=false;$('#err').textContent=/rate|seconds/i.test(er.message||'')?'Vent litt før du ber om en ny kode.':'Klarte ikke å sende koden. Sjekk e-postadressen og prøv igjen.'}};
}
function codeScreen(email){
  showAuth(`<form class="stack" id="f">
    <h2 style="font-size:30px">Sjekk e-posten</h2>
    <p style="margin:0">Vi har sendt en e-post til <b>${esc(email)}</b>. Åpne den på denne telefonen eller PC-en og trykk på lenken <b>«Sign in»</b>. Da er du logget inn.</p>
    <p class="muted small" style="margin:0">Finner du den ikke? Se i søppelpost. E-posten kommer fra Supabase.</p>
    <details class="help"><summary>Fikk du en kode i stedet?</summary><div class="field" style="margin-top:8px"><label for="cd">Koden fra e-posten</label><input class="input code" id="cd" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="123456"></div></details>
    <div id="err" class="err" hidden></div>
    <button class="btn block" id="go">Logg inn</button><button type="button" class="link" id="back">Bruk en annen e-post</button></form>`);
  $('#back').onclick=welcome;
  $('#f').onsubmit=async e=>{e.preventDefault();const b=$('#go');if(!$('#cd').value.trim()){$('#err').hidden=false;$('#err').textContent='Trykk på lenken i e-posten. Har du fått en kode, skriv den inn under «Fikk du en kode i stedet?».';return}b.disabled=true;
    try{await q(SB.auth.verifyOtp({email,token:$('#cd').value.trim(),type:'email'}));await loginOnce()}
    catch(er){b.disabled=false;$('#err').hidden=false;$('#err').textContent='Koden stemmer ikke, eller den er for gammel. Prøv igjen eller be om en ny.'}};
}
// Feil fra en utløpt eller brukt innloggingslenke (står i adressen etter #)
function linkError(){const h=new URLSearchParams(location.hash.slice(1));const code=h.get('error_code')||h.get('error');if(!code)return '';
  try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}
  return /expired|otp/i.test(code)?'Lenken er for gammel eller allerede brukt. Be om en ny.':'Innloggingen virket ikke. Be om en ny lenke.'}
let started=false;async function loginOnce(){if(started)return;started=true;await afterLogin()}
async function afterLogin(){
  USER=(await SB.auth.getUser()).data.user;if(!USER){welcome();return}
  let mine=[];try{mine=await q(SB.from('members').select('id,family_id').eq('user_id',USER.id).limit(1))}catch(e){}
  const inv=inviteCode();
  if(mine.length&&!inv){enter(mine[0].family_id,mine[0].id);return}
  if(inv&&mine.length){try{const r=await q(SB.rpc('join_family',{fcode:inv,myname:'-'}));if(r.family_id===mine[0].family_id){clearInvite();enter(r.family_id,r.member_id);return}}catch(e){}}
  onboarding()}
function clearInvite(){try{history.replaceState(null,'',location.pathname)}catch(e){}}
function onboarding(){const inv=inviteCode();
  showAuth(`<div class="stack">
    <div class="field"><label for="nm">Hva heter du?</label><input class="input" id="nm" required maxlength="24" placeholder="Fornavn" autocomplete="given-name"></div>
    <div id="err" class="err" hidden></div>
    ${inv?`<button class="btn block" id="join">Bli med i familien</button>`:`
    <form class="stack box" id="cf"><b>Start en ny familie</b><div class="field"><label for="fn2">Navn på familien</label><input class="input" id="fn2" maxlength="40" placeholder="Familien Berg"></div><button class="btn block">Start familien</button></form>
    <form class="stack box" id="jf"><b>Bli med i en familie</b><div class="field"><label for="jc">Familiekode</label><input class="input code" id="jc" maxlength="6" autocapitalize="characters" autocomplete="off" placeholder="ABC123"></div><button class="btn ghost block">Bli med</button></form>`}
    <button class="link" id="lo">Logg ut</button></div>`);
  const err=t=>{$('#err').hidden=false;$('#err').textContent=t};
  const name=()=>{const v=$('#nm').value.trim();if(!v){err('Skriv navnet ditt først.');$('#nm').focus()}return v};
  const join=async code=>{const n=name();if(!n)return;try{const r=await q(SB.rpc('join_family',{fcode:code,myname:n}));clearInvite();S.mid=r.member_id;S.fid=r.family_id;await act('ble med i familien');enter(r.family_id,r.member_id)}
    catch(e){err(/full/.test(e.message)?'Familien er full (maks '+PRICE.max+' personer).':/not_found/.test(e.message)?'Fant ingen familie med den koden. Sjekk at den er riktig.':'Det gikk ikke. Prøv igjen.')}};
  $('#lo').onclick=logout;
  if(inv){$('#join').onclick=()=>join(inv);return}
  $('#cf').onsubmit=async e=>{e.preventDefault();const n=name();if(!n)return;const fn=$('#fn2').value.trim()||('Familien '+n);
    try{const r=await q(SB.rpc('create_family',{fname:fn,myname:n}));S.fid=r.family_id;S.mid=r.member_id;await act('startet familien');enter(r.family_id,r.member_id)}catch(e){err('Klarte ikke å lage familien. Prøv igjen.')}};
  $('#jf').onsubmit=e=>{e.preventDefault();const c=$('#jc').value.trim().toUpperCase();if(c.length<6){err('Familiekoden har 6 tegn.');return}join(c)};
}

/* ---------- enter the app ---------- */
function enter(fid,mid){
  S.unsubs.forEach(u=>{try{u()}catch(e){}});S.unsubs=[];
  S.fid=fid;S.mid=mid;S.seen=null;S.mounted=null;S.fam=null;S.loaded={fam:false,items:false,acts:false};
  $('#auth').hidden=true;$('#auth').innerHTML='';$('#app').hidden=false;
  $('#view').innerHTML='<p class="muted">Henter familien …</p>';
  const slow=setTimeout(()=>{if(!S.loaded.items)banner('Får ikke kontakt med lagringen akkurat nå. Det du ser kan være utdatert.')},10000);
  const fail=()=>banner('Mistet kontakten med lagringen. Last inn siden på nytt.');
  S.unsubs.push(Back.watchFamily(fid,(fam,meta)=>{
    if(!fam){onboarding();toast('Du er ikke lenger med i familien.');return}
    S.fam=fam;S.loaded.fam=true;
    if(!me()){onboarding();toast('Du er ikke lenger med i familien.');return}
    header();if(S.mounted!==S.tab)setTab(S.tab);else paint();
  },fail));
  S.unsubs.push(Back.watchItems(fid,(arr,meta)=>{S.items=arr;setTimeout(checkReminders,1500);if(!meta.fromCache){S.loaded.items=true;clearTimeout(slow);banner('')}paint()},fail));
  S.unsubs.push(Back.watchRecipes(fid,arr=>{S.fr=arr.sort((a,b)=>b.at-a.at);paint()},()=>{}));
  S.unsubs.push(Back.watchPrivate(fid,arr=>{S.priv=arr;paint()},()=>{}));
  S.unsubs.push(Back.watchActs(fid,(arr,meta)=>{
    if(S.seen===null){S.seen=new Set(arr.map(a=>a.id))}
    else arr.forEach(a=>{if(!S.seen.has(a.id)){S.seen.add(a.id);if(a.by!==S.mid&&Date.now()-a.at<120000){const m=member(a.by);toast(`<b>${esc(mname(a.by))}</b> ${esc(a.text)}`,m&&m.color)}}});
    S.acts=arr;S.loaded.acts=true;badge();
  },fail));
  S.feeds=[];setTimeout(()=>loadFeeds(true),2500);
  setTab(S.tab);
}
function header(){const m=me();$('#famName').textContent=S.fam.name;const b=$('#meBtn');b.textContent=initials(m.name);b.style.background=m.color;b.setAttribute('aria-label','Du er '+m.name)}
const seenKey=()=>'sogni_seen_'+S.fid+'_'+S.mid;
function badge(){const last=ls.get(seenKey(),0);const n=S.acts.filter(a=>a.by!==S.mid&&a.at>last).length;const b=$('#badge');b.hidden=!n;b.textContent=n>9?'9+':n}
$('#bell').onclick=()=>{const last=ls.get(seenKey(),0);
  sheet(`<h2>Varsler</h2><p class="muted small" style="margin:0 0 8px">Her ser du hva familien har lagt til og endret.</p>
  ${S.acts.length?S.acts.map(a=>{const m=member(a.by);return `<div class="actrow ${a.by!==S.mid&&a.at>last?'new':''}"><span class="avatar av-sm" style="background:${m?m.color:'var(--soft)'}">${esc(initials(mname(a.by)))}</span><div style="min-width:0"><div><b>${a.by===S.mid?'Du':esc(mname(a.by))}</b> ${esc(a.text)}</div><div class="muted small">${ago(a.at)}</div></div></div>`}).join(''):'<p class="empty">Ingen varsler ennå.</p>'}`);
  ls.set(seenKey(),Date.now());badge()};
$('#meBtn').onclick=()=>{const m=me();sheet(`<h2>${esc(m.name)}</h2><p class="muted" style="margin:0 0 14px">Du er logget inn i ${esc(S.fam.name)}.</p>
  <p class="muted small" style="margin:-8px 0 14px">${esc(USER&&USER.email||'')}</p><div class="stack"><button class="btn line block" id="lo">Logg ut</button></div>`,()=>{$('#lo').onclick=logout})};
async function logout(){closeSheet();S.unsubs.forEach(u=>{try{u()}catch(e){}});S.unsubs=[];S.fam=null;try{await SB.auth.signOut()}catch(e){}welcome()}

/* ---------- tabs ---------- */
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
function setTab(t){S.tab=t;document.querySelectorAll('.tab').forEach(b=>b.toggleAttribute('aria-current',b.dataset.tab===t)||b.dataset.tab===t&&b.setAttribute('aria-current','page'));
  document.querySelectorAll('.tab').forEach(b=>{if(b.dataset.tab===t)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
  if(!S.fam){S.mounted=null;return}VIEWS[t].mount($('#view'));S.mounted=t;paint();window.scrollTo(0,0)}
function paint(){if(!S.fam||$('#app').hidden||S.mounted!==S.tab)return;const v=VIEWS[S.tab];v.paint&&v.paint()}
const whoOptions=(sel,withAll)=>(withAll?`<option value="alle"${sel==='alle'?' selected':''}>Alle</option>`:'')+S.fam.members.map(m=>`<option value="${m.id}"${sel===m.id?' selected':''}>${esc(m.name)}</option>`).join('');
function weekNav(){const w=weekDays(S.week);const a=w[0],b=w[6];
  return `<div class="sechead"><div><div class="eyebrow">Uke ${isoWeek(a)} · ${a.getFullYear()}</div><h2>${a.getDate()}.${a.getMonth()!==b.getMonth()?' '+MONTHS[a.getMonth()].slice(0,3)+'.':''}–${b.getDate()}. ${MONTHS[b.getMonth()]}</h2></div>
  <div class="weeknav"><button class="navbtn" id="wp" aria-label="Forrige uke">‹</button>${S.week?'<button class="btn sm ghost" id="w0">I dag</button>':''}<button class="navbtn" id="wn" aria-label="Neste uke">›</button></div></div>`}
function bindWeekNav(){$('#wp').onclick=()=>{S.week--;setTab(S.tab)};$('#wn').onclick=()=>{S.week++;setTab(S.tab)};const z=$('#w0');if(z)z.onclick=()=>{S.week=0;setTab(S.tab)}}
const rec=k=>typeof k==='number'?R[k]:S.fr.find(r=>'f:'+r.id===k);
const keyOf=d=>d.recipe!=null?d.recipe:(d.fr?'f:'+d.fr:null);
const parseKey=s=>/^\d+$/.test(s)?+s:s;
const hostOf=u=>{try{return new URL(u).hostname.replace(/^www\./,'')}catch(e){return ''}};
const recMeta=(r,k)=>typeof k==='number'?`${r.t} min · ${esc(r.o)}`:[r.t?r.t+' min':'',r.src?esc(hostOf(r.src)):'Familiens egen'].filter(Boolean).join(' · ');
const dinnerTitle=d=>{const k=keyOf(d),r=k!=null&&rec(k);return r?r.n:(d.text||(k!=null?'Oppskrift':''))};

const VIEWS={
uke:{
  mount(el){const seg=`<div class="seg" role="tablist"><button data-cal="uke" aria-pressed="${S.cal==='uke'}">Uke</button><button data-cal="ar" aria-pressed="${S.cal==='ar'}">År</button></div>`;
    if(S.cal==='ar'){el.innerHTML=seg+`<div class="sechead"><div><div class="eyebrow">Hele året</div><h2>${S.year}</h2></div><div class="weeknav"><button class="navbtn" id="yp" aria-label="Forrige år">‹</button>${S.year!==new Date().getFullYear()?'<button class="btn sm ghost" id="y0">I år</button>':''}<button class="navbtn" id="yn" aria-label="Neste år">›</button></div></div>
      <p class="muted small" style="margin:-4px 0 12px">Trykk på en dato for å skrive inn noe. Prikk betyr at noe skjer den dagen. Røde datoer er søndager og helligdager. Grønne dager er fri fra skolen. Tallet til venstre er ukenummeret.</p><div class="months" id="months"></div>`;
      $('#yp').onclick=()=>{S.year--;setTab('uke')};$('#yn').onclick=()=>{S.year++;setTab('uke')};const y0=$('#y0');if(y0)y0.onclick=()=>{S.year=new Date().getFullYear();setTab('uke')};}
    else{el.innerHTML=seg+weekNav()+`<button class="btn block" id="addEv" style="margin-bottom:14px">+ Legg til avtale</button><div class="stack" id="days"></div>`;bindWeekNav();$('#addEv').onclick=()=>eventSheet()}
    el.querySelectorAll('[data-cal]').forEach(b=>b.onclick=()=>{S.cal=b.dataset.cal;setTab('uke')})},
  paint(){if(S.cal==='ar')return paintYear();const today=ymd(new Date());const ev=items('event'),td=items('todo'),dn=items('dinner');
    $('#days').innerHTML=weekDays(S.week).map((d,i)=>{const k=ymd(d);const e=ev.filter(x=>occurs(x,k)).sort((a,b)=>(a.time||'99').localeCompare(b.time||'99'));const t=td.filter(x=>x.date===k);const din=dn.find(x=>x.date===k);
      return `<section class="day ${k===today?'today':''}"><button class="dayhead" data-add="${k}" aria-label="Legg til på ${DAYS[i]} ${d.getDate()}."><span><h3 style="${holidays(d.getFullYear())[k]?'color:var(--rose)':''}">${DAYS[i]}</h3>${holidays(d.getFullYear())[k]?`<span class="small" style="color:var(--rose);font-weight:700">${holidays(d.getFullYear())[k]}</span>`:''}${(()=>{const sd=schoolDay(k);return sd&&!holidays(d.getFullYear())[k]?`<span class="small sklabel">🎒 ${esc(sd.name)}</span>`:''})()}</span><span class="row" style="gap:10px"><span class="daydate ${i===6||holidays(d.getFullYear())[k]?'red':''}">${k===today?'I dag · ':''}${shortDate(d)}</span><span class="plus" aria-hidden="true">+</span></span></button><div class="daybody">
      ${din?`<div class="dinnerline">Middag <b>${esc(dinnerTitle(din))}</b></div>`:''}
      ${e.map(x=>`<div class="ev"><span class="time">${esc(x.time||'')}</span><span class="txt">${esc(x.text)}${x.repeat||x.remind||x.src?`<span class="muted small" style="display:block">${[x.src?'⇣ '+esc(x.srcName||'Kalender'):'',x.place?esc(x.place):'',x.repeat?'↻ '+repeatLabel(x):'',x.remind?'🔔 '+REMIND[x.remind]:''].filter(Boolean).join(' · ')}</span>`:''}</span>${x.private?privChip:chip(x.who)}<button class="x" data-ev="${x.id}" data-k="${k}" aria-label="Endre ${esc(x.text)}">⋯</button></div>`).join('')}
      ${t.map(x=>`<div class="ev ${x.done?'done':''}"><input type="checkbox" class="check" data-todo="${x.id}" ${x.done?'checked':''} aria-label="${esc(x.text)}" style="width:22px;height:22px"><span class="txt" style="${x.done?'text-decoration:line-through;color:var(--soft)':''}">${esc(x.text)}</span>${x.private?privChip:chip(x.who)}</div>`).join('')}
      <button class="addday" data-add="${k}">+ Legg til</button></div></section>`}).join('');
    $('#days').querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>eventSheet(b.dataset.add));
    $('#days').querySelectorAll('[data-ev]').forEach(b=>b.onclick=()=>eventActions(b.dataset.ev,b.dataset.k));
    $('#days').querySelectorAll('[data-todo]').forEach(c=>c.onchange=()=>toggleTodo(c.dataset.todo,c.checked));
  }},
handle:{
  mount(el){el.innerHTML=`<div class="sechead"><div><div class="eyebrow">Felles for hele familien</div><h2>Handleliste</h2></div></div>
    <form class="addrow" id="sf" style="margin-bottom:14px"><input class="input" id="si" placeholder="Hva trenger vi?" maxlength="60" aria-label="Ny vare" autocomplete="off"><button class="btn">Legg til</button></form>
    <div class="box" style="padding:4px 14px"><div class="list" id="slist"></div></div><div id="sfoot" style="margin-top:12px"></div>`;
    $('#sf').onsubmit=e=>{e.preventDefault();const v=$('#si').value.trim();if(!v)return;$('#si').value='';safe(saveItem(uid(),{type:'shop',text:v,done:false,by:S.mid,at:Date.now()}));act(`la til «${v}» i handlelisten`)}},
  paint(){const all=items('shop').sort((a,b)=>(a.done-b.done)||(b.at-a.at));const done=all.filter(x=>x.done);
    $('#slist').innerHTML=all.length?all.map(x=>{const m=member(x.by);return `<div class="item ${x.done?'done':''}"><input type="checkbox" class="check" data-id="${x.id}" ${x.done?'checked':''} aria-label="${esc(x.text)}"><div class="txt"><div class="main">${esc(x.text)}</div><div class="meta"><span class="dot" style="background:${m?m.color:'var(--soft)'};width:7px;height:7px"></span> ${esc(mname(x.by))}</div></div><button class="x" data-del="${x.id}" aria-label="Slett ${esc(x.text)}">×</button></div>`}).join(''):'<p class="empty" style="padding:12px 0">Listen er tom. Skriv inn det dere trenger over.</p>';
    $('#sfoot').innerHTML=done.length?`<button class="btn line block" id="clr">Fjern avkryssede (${done.length})</button>`:'';
    $('#slist').querySelectorAll('[data-id]').forEach(c=>c.onchange=()=>{const x=findItem(c.dataset.id);safe(saveItem(x.id,Object.assign({},x,{done:c.checked,doneBy:S.mid})));if(c.checked)act(`har kjøpt «${x.text}»`)});
    $('#slist').querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{const x=findItem(b.dataset.del);safe(removeItem(x.id))});
    const c=$('#clr');if(c)c.onclick=()=>{done.forEach(x=>safe(removeItem(x.id)));act(`ryddet ${done.length} ${done.length===1?'vare':'varer'} fra handlelisten`)};
  }},
gjore:{
  mount(el){const w=weekDays(0);
    el.innerHTML=`<div class="sechead"><div><div class="eyebrow">Hver sin liste</div><h2>Gjøremål</h2></div></div>
    <div class="chips" id="tchips" style="margin-bottom:12px"></div>
    <form class="box stack" id="tf" style="margin-bottom:14px"><div class="field"><label for="tt">Nytt gjøremål</label><input class="input" id="tt" placeholder="F.eks. Rydde rommet" maxlength="80" autocomplete="off"></div>
    <div class="grid2"><div class="field"><label for="tw">For hvem</label><select class="select" id="tw">${whoOptions(S.todoWho==='alle'?S.mid:S.todoWho)}</select></div>
    <div class="field"><label for="td">Når</label><select class="select" id="td"><option value="">Ingen dag</option>${w.map(d=>`<option value="${ymd(d)}">${DAYS[(d.getDay()+6)%7]} ${d.getDate()}.</option>`).join('')}</select></div></div>
    ${privBox('tp')}<button class="btn">Legg til</button></form>
    <div class="box" style="padding:4px 14px"><div class="list" id="tlist"></div></div>`;
    $('#tf').onsubmit=e=>{e.preventDefault();const v=$('#tt').value.trim();if(!v)return;const pv=!!($('#tp')&&$('#tp').checked),who=pv?S.mid:$('#tw').value,date=$('#td').value;$('#tt').value='';if($('#tp'))$('#tp').checked=false;
      safe(saveItem(uid(),{type:'todo',text:v,who,date,done:false,by:S.mid,at:Date.now(),private:pv,owner:S.mid}));if(!pv)act(who===S.mid?`la til gjøremål: «${v}»`:`ga ${mname(who)} et gjøremål: «${v}»`)}},
  paint(){$('#tchips').innerHTML=[['alle','Alle']].concat(S.fam.members.map(m=>[m.id,m.name])).map(([id,n])=>{const m=member(id);return `<button class="fchip" data-w="${id}" aria-pressed="${S.todoWho===id}">${m?`<span class="dot" style="background:${m.color}"></span>`:''}${esc(n)}</button>`}).join('');
    $('#tchips').querySelectorAll('[data-w]').forEach(b=>b.onclick=()=>{S.todoWho=b.dataset.w;if(b.dataset.w!=='alle')$('#tw').value=b.dataset.w;VIEWS.gjore.paint()});
    const all=items('todo').filter(x=>S.todoWho==='alle'||x.who===S.todoWho).sort((a,b)=>(a.done-b.done)||((a.date||'9')).localeCompare(b.date||'9')||(b.at-a.at));
    $('#tlist').innerHTML=all.length?all.map(x=>`<div class="item ${x.done?'done':''}"><input type="checkbox" class="check" data-id="${x.id}" ${x.done?'checked':''} aria-label="${esc(x.text)}"><div class="txt"><div class="main">${esc(x.text)}</div><div class="meta">${x.private?'🔒 Privat · ':''}${S.todoWho==='alle'?esc(mname(x.who))+(x.date?' · ':''):''}${x.date?dayName(x.date)+' '+parseYmd(x.date).getDate()+'.':''}</div></div><button class="x" data-del="${x.id}" aria-label="Slett ${esc(x.text)}">×</button></div>`).join(''):'<p class="empty" style="padding:12px 0">Ingen gjøremål her ennå.</p>';
    $('#tlist').querySelectorAll('[data-id]').forEach(c=>c.onchange=()=>toggleTodo(c.dataset.id,c.checked));
    $('#tlist').querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>safe(removeItem(b.dataset.del)));
  }},
middag:{
  mount(el){const mo=new Date().getMonth();
    el.innerHTML=weekNav()+`<div class="box" style="padding:0" id="dlist"></div>
    <div style="margin-top:22px" class="sechead"><div><div class="eyebrow">Lagret av dere</div><h2 style="font-size:24px">Familiens oppskrifter</h2></div></div>
    <button class="btn ghost block" id="imp" style="margin-bottom:10px">+ Hent oppskrift fra en nettside</button>
    <div class="rgrid" id="frec"></div>
    <div style="margin-top:22px" class="sechead"><div><div class="eyebrow">Fra SOGNI-planleggeren</div><h2 style="font-size:24px">Månedens middager · ${MONTHS[mo]}</h2></div></div>
    <div class="rgrid" id="mrec"></div><button class="link" id="allrec" style="margin-top:10px">Se alle 48 middager</button>`;
    bindWeekNav();
    $('#mrec').innerHTML=R.map((r,i)=>[r,i]).filter(([r])=>r.m===mo+1).map(([r,i])=>recCard(r,i)).join('');
    $('#mrec').querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>recipeSheet(parseKey(b.dataset.r)));
    $('#imp').onclick=()=>importSheet();
    $('#allrec').onclick=()=>pickDinner(null)},
  paint(){const dn=items('dinner');const today=ymd(new Date());
    $('#dlist').innerHTML=weekDays(S.week).map((d,i)=>{const k=ymd(d),x=dn.find(y=>y.date===k);const rk=x?keyOf(x):null,r=rk!=null&&rec(rk);return `<button class="dinrow" data-k="${k}"><span class="d"><b>${DAYS[i]}</b><span>${k===today?'i dag':shortDate(d)}</span></span><span class="t">${x?`<b>${esc(dinnerTitle(x))}</b>${r?`<div class="muted small">${recMeta(r,rk)}</div>`:''}`:'<span class="none">+ Velg middag</span>'}</span></button>`}).join('');
    $('#dlist').querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{const x=items('dinner').find(y=>y.date===b.dataset.k);const rk=x?keyOf(x):null;if(rk!=null&&rec(rk))recipeSheet(rk,b.dataset.k);else if(x)customDinnerSheet(x);else pickDinner(b.dataset.k)});
    $('#frec').innerHTML=S.fr.length?S.fr.map(r=>recCard(r,'f:'+r.id)).join(''):'<p class="empty" style="margin:0">Ingen egne oppskrifter ennå. Hent en fra en nettside du liker.</p>';
    $('#frec').querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>recipeSheet(parseKey(b.dataset.r)))}
  },
familie:{
  mount(el){el.innerHTML=`<div class="sechead"><div><div class="eyebrow">Konto og personer</div><h2 id="fn"></h2></div></div><div class="stack" id="fam"></div>`},
  paint(){const n=S.fam.members.length,ex=Math.max(0,n-PRICE.incl);$('#fn').textContent=S.fam.name;
    $('#fam').innerHTML=`
    <div class="box stack" style="gap:8px"><div class="eyebrow">Familiekode</div><div class="row between"><span class="code">${esc(S.fam.code)}</span><button class="btn sm ghost" id="cp">Kopier</button></div>
      <p class="muted small" style="margin:0">Send invitasjonslenken til de andre. De logger inn med e-posten sin og blir med i familien.</p><button class="btn block" id="inv">Kopier invitasjonslenke</button></div>
    <div class="box stack" style="gap:10px"><div class="row between"><div><div class="eyebrow">Abonnement</div><span class="price">${priceFor(n)} kr</span> <span class="muted">/ mnd</span></div><button class="btn sm ghost" id="up">Se prisen</button></div>
      <div class="small">${PRICE.base} kr for ${PRICE.incl} personer${ex?` + ${ex} ${ex===1?'ekstra person':'ekstra personer'} à ${PRICE.extra} kr`:''} · ${n} ${n===1?'person':'personer'} i familien</div></div>
    <div class="box" style="padding:4px 14px"><div class="list">${S.fam.members.map(m=>`<div class="item"><span class="avatar" style="background:${m.color};width:36px;height:36px">${esc(initials(m.name))}</span><div class="txt"><div><b>${esc(m.name)}</b>${m.id===S.mid?' <span class="muted small">(deg)</span>':''}${m.user_id?'':' <span class="muted small">· uten egen innlogging</span>'}</div><div class="meta">${items('todo').filter(t=>t.who===m.id&&!t.done).length} åpne gjøremål</div></div>${m.id!==S.mid&&S.fam.owner===(USER&&USER.id)?`<button class="x" data-rm="${m.id}" aria-label="Fjern ${esc(m.name)}">×</button>`:''}</div>`).join('')}</div></div>
    <button class="btn ghost block" id="addm">+ Legg til barn eller person uten mobil</button>
    ${schoolBox()}
    ${feedsBox()}
    <div class="box stack" style="gap:8px"><div class="eyebrow">Kalenderkobling</div><b>Google, Samsung og iPhone</b>
      <p class="small" style="margin:0">Hent avtaler fra en kalenderfil, for eksempel fra skolen eller idrettslaget. For å sende en avtale til din egen kalender, trykker du ⋯ på avtalen og velger «Legg i Google-kalenderen».</p>
      <button class="btn line block" id="ics">Hent avtaler fra kalenderfil</button>
      </div>
    <button class="btn line block" id="lo">Logg ut</button>`;
    $('#cp').onclick=async()=>{try{await navigator.clipboard.writeText(S.fam.code);toast('Koden er kopiert')}catch(e){toast('Koden er '+esc(S.fam.code))}};
    $('#up').onclick=()=>upgradeSheet();$('#ics').onclick=importCalSheet;bindSchool();bindFeeds();$('#addm').onclick=addMemberSheet;
    $('#fam').querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>removeMemberSheet(b.dataset.rm));
    $('#lo').onclick=logout;
    $('#inv').onclick=async()=>{const link=location.origin+'/?kode='+S.fam.code;try{await navigator.clipboard.writeText(link);toast('Lenken er kopiert. Send den på SMS eller Messenger.')}catch(e){toast('Lenken er '+esc(link))}};
  }}
};

/* ---------- actions & sheets ---------- */
function toggleTodo(id,on){const x=findItem(id);if(!x)return;const d=Object.assign({},x);delete d.id;d.done=on;safe(saveItem(id,d));if(on&&!x.private)act(`fullførte «${x.text}»`)}
function paintYear(){const y=S.year,today=ymd(new Date()),hol=holidays(y),ev=items('event');
  const busy={},sk={};const start=new Date(y,0,1);for(let d=new Date(start);d.getFullYear()===y;d.setDate(d.getDate()+1)){const k=ymd(d);if(ev.some(x=>(!x.repeat||x.repeat==='weekly'||x.repeat==='biweekly'?occurs(x,k):false)))busy[k]=1;const sd=schoolDay(k);if(sd&&sd.off)sk[k]=sd.name}
  $('#months').innerHTML=MONTHS.map((mn,m)=>{const first=new Date(y,m,1),lead=(first.getDay()+6)%7,n=new Date(y,m+1,0).getDate();
    let cells='<span class="wd wk">uke</span><span class="wd">M</span><span class="wd">T</span><span class="wd">O</span><span class="wd">T</span><span class="wd">F</span><span class="wd">L</span><span class="wd red">S</span>'+`<span class="wk">${isoWeek(first)}</span>`+'<span></span>'.repeat(lead);
    for(let i=1;i<=n;i++){const k=y+'-'+pad(m+1)+'-'+pad(i),dow=(lead+i-1)%7;if(dow===0&&i>1)cells+=`<span class="wk">${isoWeek(new Date(y,m,i))}</span>`;cells+=`<button class="dd${k===today?' today':''}${hol[k]||dow===6?' red':''}${busy[k]?' busy':''}${sk[k]?' ferie':''}" data-d="${k}" aria-label="${longDate(k)}${hol[k]?', '+hol[k]:''}${sk[k]?', '+sk[k]:''}${busy[k]?', har avtaler':''}">${i}</button>`}
    const hs=Object.keys(hol).filter(k=>+k.slice(5,7)===m+1).map(k=>[k,`<li><b>${+k.slice(8)}.</b> ${hol[k]}</li>`]).concat(schoolPeriods(y,m).map(o=>[o[0],`<li class="sk"><b>${rangeTxt(o[0],o[1])}</b> ${esc(o[2])}</li>`])).sort((a,b)=>a[0].localeCompare(b[0]));
    return `<section class="mon"><h3>${mn}</h3><div class="mgrid">${cells}</div>${hs.length?`<ul class="hlist">${hs.map(h=>h[1]).join('')}</ul>`:''}</section>`}).join('');
  $('#months').querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>daySheet(b.dataset.d))}
function daySheet(k){const e=items('event').filter(x=>occurs(x,k)).sort((a,b)=>(a.time||'99').localeCompare(b.time||'99'));const h=holidays(parseYmd(k).getFullYear())[k],sd=schoolDay(k);
  if(!e.length&&!h&&!sd){eventSheet(k);return}
  sheet(`<div class="eyebrow">${parseYmd(k).getFullYear()}</div><h2 style="text-transform:capitalize">${longDate(k)}</h2>${h?`<p class="small" style="margin:4px 0 0;color:var(--rose);font-weight:700">${h}</p>`:''}${sd?`<p class="small sklabel" style="margin:4px 0 0">🎒 ${esc(sd.name)}</p>`:''}
  <div class="stack" style="margin-top:12px">${e.length?`<div class="box" style="padding:4px 14px">${e.map(x=>`<div class="ev" style="padding:8px 0"><span class="time">${esc(x.time||'')}</span><span class="txt">${esc(x.text)}</span>${x.private?privChip:chip(x.who)}</div>`).join('')}</div>`:''}
  <button class="btn block" id="dnew">+ Ny avtale denne dagen</button><button class="btn line block" id="dweek">Vis uka</button></div>`,()=>{
    $('#dnew').onclick=()=>eventSheet(k);$('#dweek').onclick=()=>{closeSheet();S.cal='uke';S.week=weekOffsetOf(k);setTab('uke')}})}
function eventSheet(pre){const w=weekDays(S.week);const sel=pre||ymd(new Date());
  sheet(`<h2>Ny avtale</h2>${pre?`<p class="muted" style="margin:2px 0 0;text-transform:capitalize">${longDate(pre)}</p>`:''}<form class="stack" id="ef" style="margin-top:10px">
  <div class="field"><label for="et">Hva skjer?</label><input class="input" id="et" required maxlength="60" placeholder="F.eks. Fotballtrening"></div>
  <div class="grid2"><div class="field"><label for="ed">Dato</label><input class="input" type="date" id="ed" required value="${sel}"></div>
  <div class="field"><label for="eh">Klokka</label><input class="input" type="time" id="eh"></div></div>
  <div class="field"><label for="ew">Hvem gjelder det?</label><select class="select" id="ew">${whoOptions('alle',true)}</select></div>
  <div class="grid2"><div class="field"><label for="er">Gjentas</label><select class="select" id="er">${Object.entries(REPEAT).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></div>
  <div class="field"><label for="em">Påminnelse</label><select class="select" id="em">${Object.entries(REMIND).map(([k,v])=>`<option value="${k}" ${k==='60'?'selected':''}>${v}</option>`).join('')}</select></div></div>
  ${privBox('ep')}<p class="muted small" style="margin:-4px 0 0">Uten kryss ser hele familien avtalen og får varsel.</p>
  <button class="btn block">Lagre</button></form>`,()=>{$('#et').focus();
  $('#ef').onsubmit=e=>{e.preventDefault();const pv=!!($('#ep')&&$('#ep').checked);const d={type:'event',text:$('#et').value.trim(),date:$('#ed').value,time:$('#eh').value,who:pv?S.mid:$('#ew').value,by:S.mid,at:Date.now(),done:false,private:pv,owner:S.mid,repeat:$('#er').value,remind:+$('#em').value,skip:[]};
    safe(saveItem(uid(),d));if(!pv)act(`la til «${d.text}» ${d.repeat?repeatLabel(d):longDate(d.date)}${d.time?' kl. '+d.time:''}`);closeSheet()}})}
function eventActions(id,k){const x=findItem(id);if(!x)return;
  sheet(`<div class="eyebrow">${dayName(k)} ${parseYmd(k).getDate()}. ${MONTHS[parseYmd(k).getMonth()]}${x.time?' · kl. '+esc(x.time):''}</div><h2>${esc(x.text)}</h2>
  <p class="muted small" style="margin:4px 0 14px">${x.place?'📍 '+esc(x.place)+'. ':''}${x.repeat?'↻ Gjentas '+repeatLabel(x)+'. ':''}${x.remind?'🔔 Påminnelse '+REMIND[x.remind]+'. ':''}${x.src?`Hentet fra ${esc(x.srcName||'en kalenderlenke')}. Endringer gjøres der og kommer hit av seg selv.`:'Lagt inn av '+esc(mname(x.by))+'.'}</p>
  <div class="field" style="margin-bottom:12px"><label for="am">Påminnelse</label><select class="select" id="am">${Object.entries(REMIND).map(([v,t])=>`<option value="${v}" ${+v===(x.remind||0)?'selected':''}>${t}</option>`).join('')}</select></div>
  <a class="btn ghost block" href="${esc(googleLink(x,k))}" target="_blank" rel="noopener" style="display:block;text-align:center;text-decoration:none;margin-bottom:8px">Legg i Google-kalenderen</a>
  <p class="muted small" style="margin:0 0 12px">Virker for Google-kalender og Samsung-kalender som er koblet til Google-kontoen.</p>
  <div class="stack" style="gap:8px">${x.src?`<button class="btn line block" id="d1">Skjul denne gangen</button>`:x.repeat?`<button class="btn line block" id="d1">Fjern bare denne gangen</button><button class="btn line block" id="da">Fjern alle gangene</button>`:`<button class="btn line block" id="da">Fjern avtalen</button>`}</div>`,()=>{
    $('#am').onchange=()=>{safe(saveItem(id,Object.assign({},x,{remind:+$('#am').value})));toast('Påminnelsen er endret')};
    const one=$('#d1');if(one)one.onclick=()=>{safe(saveItem(id,Object.assign({},x,{skip:(x.skip||[]).concat(k)})));if(!x.private&&!x.src)act(`avlyste «${x.text}» ${dayName(k)} ${parseYmd(k).getDate()}.`);closeSheet()};
    const all=$('#da');if(all)all.onclick=()=>{safe(removeItem(id));if(!x.private)act(`fjernet «${x.text}»${x.repeat?' (alle gangene)':''}`);closeSheet()}})}

/* ---------- calendar: Google link + import from .ics ---------- */
function googleLink(x,k){const d=k.replace(/-/g,'');let dates;
  if(x.time){const [h,m]=x.time.split(':').map(Number);const st=parseYmd(k);st.setHours(h,m,0,0);const en=new Date(st.getTime()+3600e3);const f=t=>ymd(t).replace(/-/g,'')+'T'+pad(t.getHours())+pad(t.getMinutes())+'00';dates=f(st)+'/'+f(en)}
  else{const n=parseYmd(k);n.setDate(n.getDate()+1);dates=d+'/'+ymd(n).replace(/-/g,'')}
  const rr={daily:'RRULE:FREQ=DAILY',weekdays:'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',weekly:'RRULE:FREQ=WEEKLY',biweekly:'RRULE:FREQ=WEEKLY;INTERVAL=2'}[x.repeat||''];
  const q=new URLSearchParams({action:'TEMPLATE',text:x.text,dates,ctz:'Europe/Oslo',details:'Fra SOGNI familieplanlegger'});if(rr)q.set('recur',rr);
  return 'https://calendar.google.com/calendar/render?'+q.toString()}
const parseICS=txt=>SogniICS.parse(txt,{max:300});
function importCalSheet(){
  sheet(`<h2>Hent fra kalender</h2><p class="muted small" style="margin:0 0 12px">Velg en kalenderfil (.ics). Den kan komme fra Google-kalenderen (Innstillinger, Eksporter), fra skolen eller fra idrettslaget. Bare avtaler fra i dag og fremover tas med.</p>
  <div class="stack"><input class="input" type="file" id="icsf" accept=".ics,text/calendar"><div id="icsres"></div></div>`,()=>{
    $('#icsf').onchange=async()=>{const f=$('#icsf').files[0];if(!f)return;let ev=[];try{ev=parseICS(await f.text())}catch(e){}
      const r=$('#icsres');if(!ev.length){r.innerHTML='<p class="err">Fant ingen kommende avtaler i filen. Sjekk at det er en kalenderfil (.ics).</p>';return}
      r.innerHTML=`<div class="box" style="padding:4px 14px;max-height:220px;overflow:auto">${ev.slice(0,50).map(e=>`<div class="ev" style="padding:7px 0"><span class="time" style="width:auto;min-width:70px">${parseYmd(e.date).getDate()}. ${MONTHS[parseYmd(e.date).getMonth()].slice(0,3)}${e.time?' '+e.time:''}</span><span class="txt">${esc(e.text)}${e.repeat?` <span class="muted small">↻</span>`:''}</span></div>`).join('')}${ev.length>50?`<p class="muted small">… og ${ev.length-50} til</p>`:''}</div>
      <div class="field"><label for="icsw">Hvem gjelder de?</label><select class="select" id="icsw">${whoOptions('alle',true)}</select></div>${privBox('icsp')}
      <button class="btn block" id="icsgo">Legg inn ${ev.length} avtaler</button>`;
      $('#icsgo').onclick=async()=>{const pv=!!($('#icsp')&&$('#icsp').checked),who=pv?S.mid:$('#icsw').value;$('#icsgo').disabled=true;
        for(const e of ev){await saveItem(uid(),{type:'event',text:e.text,date:e.date,time:e.time||'',who,by:S.mid,at:Date.now(),done:false,private:pv,owner:S.mid,repeat:e.repeat||'',remind:0,skip:[]}).catch(()=>{})}
        if(!pv)act(`hentet ${ev.length} avtaler fra en kalender`);closeSheet();toast(`${ev.length} avtaler er lagt inn`)}}})}

/* ---------- skoleruta i «Familien» ---------- */
function schoolBox(){const c=schoolCfg(),kd=c&&SR[c.kommune];
  const opts=Object.entries(SR).sort((a,b)=>a[1].name.localeCompare(b[1].name,'nb')).map(([k,v])=>`<option value="${k}"${c&&c.kommune===k?' selected':''}>${esc(v.name)}</option>`).join('');
  return `<div class="box stack" style="gap:8px"><div class="eyebrow">Skoleruta</div><b>Ferier og fridager fra skolen</b>
    <div class="field"><label for="skk">Kommune</label><select class="select" id="skk"><option value="">Ingen valgt</option>${opts}</select></div>
    ${kd?`<p class="small muted" style="margin:0">${kd.note?esc(kd.note)+' ':''}<a href="${esc(kd.src)}" target="_blank" rel="noopener">Se kommunens skolerute</a></p>`:`<p class="small muted" style="margin:0">Finner du ikke kommunen? Si fra, så legger vi den inn. Dere kan også legge inn fridagene selv.</p>`}
    ${(c&&c.extra||[]).length?`<div class="list">${c.extra.map((e,i)=>`<div class="feedrow"><div class="txt"><b>${esc(e.name)}</b><div class="muted small">${rangeTxt(e.from,e.to)} ${MONTHS[parseYmd(e.to).getMonth()]} ${parseYmd(e.to).getFullYear()}</div></div><button class="x" data-skx="${i}" aria-label="Fjern ${esc(e.name)}">×</button></div>`).join('')}</div>`:''}
    <button class="btn line block" id="skadd">+ Legg til fridag (f.eks. planleggingsdag)</button></div>`}
function saveSchool(c,msg){safe(saveItem('skole',Object.assign({type:'school',kommune:'',extra:[],hide:[],by:S.mid,at:Date.now()},c)));if(msg)act(msg)}
function bindSchool(){const c=schoolCfg()||S.items.find(i=>i.type==='school')||{};
  $('#skk').onchange=()=>{const k=$('#skk').value;saveSchool(Object.assign({},c,{kommune:k}),k?`valgte skoleruta for ${SR[k].name}`:'fjernet skoleruta')};
  document.querySelectorAll('[data-skx]').forEach(b=>b.onclick=()=>{const ex=(c.extra||[]).slice();ex.splice(+b.dataset.skx,1);saveSchool(Object.assign({},c,{extra:ex}))});
  $('#skadd').onclick=()=>sheet(`<h2>Ny fridag</h2><p class="muted small" style="margin:0 0 12px">For dager skolen har fri som ikke står i kommunens rute, for eksempel planleggingsdager.</p><form class="stack" id="skf">
    <div class="field"><label for="skn">Hva heter den?</label><input class="input" id="skn" required maxlength="40" value="Planleggingsdag"></div>
    <div class="grid2"><div class="field"><label for="skf1">Fra</label><input class="input" type="date" id="skf1" required></div><div class="field"><label for="skf2">Til og med</label><input class="input" type="date" id="skf2"></div></div>
    <button class="btn block">Lagre</button></form>`,()=>{$('#skf').onsubmit=e=>{e.preventDefault();const from=$('#skf1').value,to=$('#skf2').value&&$('#skf2').value>=from?$('#skf2').value:from;
      const cur=S.items.find(i=>i.type==='school')||{};saveSchool(Object.assign({},cur,{extra:(cur.extra||[]).concat({from,to,name:$('#skn').value.trim()||'Fridag'})}),`la til fri fra skolen ${longDate(from)}`);closeSheet()}})}

/* ---------- kalenderlenker: Spond, skole, jobb ---------- */
const SYNC_EVERY=60*60e3;
function feedsBox(){const mine=S.feeds,ids=new Set(mine.map(f=>f.id));
  const others={};S.items.forEach(x=>{if(x.src&&!ids.has(x.src)){const o=others[x.src]||(others[x.src]={name:x.srcName,who:x.who,n:0});o.n++}});
  const row=(name,who,meta,btns)=>`<div class="feedrow"><div class="txt"><b>${esc(name)}</b> ${chip(who)}<div class="muted small">${meta}</div></div>${btns||''}</div>`;
  const status=f=>f.last_status&&f.last_status!=='ok'?'<span class="err">Fikk ikke hentet sist. Sjekk lenken.</span>':f.last_sync?'Oppdatert '+ago(Date.parse(f.last_sync)):'Ikke hentet ennå';
  const count=id=>S.items.filter(x=>x.src===id).length;
  return `<div class="box stack" style="gap:8px"><div class="eyebrow">Spond og andre kalendere</div><b>Hent aktiviteter automatisk</b>
    <p class="small" style="margin:0">Lim inn en kalenderlenke én gang, så kommer treninger, kamper og avtaler inn av seg selv og oppdateres flere ganger om dagen.</p>
    ${mine.length||Object.keys(others).length?`<div class="list">${mine.map(f=>row(f.name,f.member_id,`${count(f.id)} avtaler · ${status(f)}${f.private?' · 🔒 privat':''}`,`<button class="btn sm ghost" data-fsync="${f.id}">Oppdater</button><button class="x" data-fdel="${f.id}" aria-label="Fjern ${esc(f.name)}">×</button>`)).join('')}
      ${Object.values(others).map(o=>row(o.name||'Kalender',o.who,`${o.n} avtaler · lagt inn av en annen i familien`)).join('')}</div>`:''}
    <button class="btn block" id="fadd">+ Koble til Spond eller annen kalender</button></div>`}
function bindFeeds(){$('#fadd').onclick=feedSheet;
  document.querySelectorAll('[data-fsync]').forEach(b=>b.onclick=async()=>{const f=S.feeds.find(x=>x.id===b.dataset.fsync);b.disabled=true;b.textContent='Henter …';const r=await syncFeed(f);toast(r.ok?`${f.name} er oppdatert`:'Fikk ikke hentet kalenderen. Sjekk at lenken fortsatt virker.');loadFeeds()});
  document.querySelectorAll('[data-fdel]').forEach(b=>b.onclick=()=>{const f=S.feeds.find(x=>x.id===b.dataset.fdel);
    sheet(`<h2>Fjerne ${esc(f.name)}?</h2><p class="muted">Kommende avtaler fra denne kalenderen blir borte fra SOGNI. Ingenting endres i ${esc(f.name)}.</p><div class="stack"><button class="btn block" id="fdy">Ja, fjern</button><button class="btn line block" id="fdn">Avbryt</button></div>`,()=>{
      $('#fdn').onclick=closeSheet;$('#fdy').onclick=async()=>{const today=ymd(new Date());const ids=S.items.filter(x=>x.src===f.id&&(x.repeat||x.date>=today)).map(x=>x.id);
        try{await Back.delItems(S.fid,ids);await Back.delFeed(f.id)}catch(e){toast('Det ble ikke fjernet. Prøv igjen.');return}
        if(!f.private)act(`koblet fra ${f.name} for ${mname(f.member_id)}`);closeSheet();loadFeeds()}})})}
async function fetchCal(url){const r=await fetch('/api/ical?url='+encodeURIComponent(url));if(!r.ok){let e='fetch_failed';try{e=(await r.json()).error||e}catch(_){}throw new Error(e)}return r.text()}
async function syncFeed(f,txt,first){try{txt=txt||await fetchCal(f.url)}catch(e){try{await Back.touchFeed(f.id,e.message)}catch(_){}return {ok:false}}
  const until=ymd(new Date(Date.now()+400*864e5));const ev=SogniICS.parse(txt,{until});
  const existing=S.items.filter(x=>x.src===f.id).map(x=>{const d=Object.assign({},x);delete d.id;return {id:x.id,data:d}});
  const p=SogniICS.plan(f,ev,existing);
  try{await Back.putItems(S.fid,p.upsert);await Back.delItems(S.fid,p.del);await Back.touchFeed(f.id,'ok')}catch(e){return {ok:false}}
  const parts=[p.added&&`${p.added} ${p.added===1?'ny':'nye'}`,p.changed&&`${p.changed} endret`,p.removed&&`${p.removed} fjernet`].filter(Boolean);
  if(!f.private&&(first||parts.length))act(first?`koblet til ${f.name} for ${mname(f.member_id)} (${ev.length} avtaler)`:`${f.name} ble oppdatert: ${parts.join(', ')}`);
  return {ok:true,count:ev.length}}
let feedBusy=false;
async function loadFeeds(autoSync){if(!S.fid)return;try{S.feeds=await Back.listFeeds(S.fid)}catch(e){S.feeds=[]}paint();
  if(!autoSync||feedBusy)return;feedBusy=true;
  try{for(const f of S.feeds)if(!f.last_sync||Date.now()-Date.parse(f.last_sync)>SYNC_EVERY)await syncFeed(f)}finally{feedBusy=false}
  try{S.feeds=await Back.listFeeds(S.fid)}catch(e){}paint()}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&S.fam)loadFeeds(true)});
function feedSheet(){
  sheet(`<h2>Koble til en kalender</h2><p class="muted small" style="margin:0 0 10px">Aktivitetene hentes automatisk og vises i kalenderen med navnet og fargen til personen.</p>
  <details class="help"><summary>Slik får du lenken fra Spond</summary>
    <p class="small" style="margin:6px 0 0">Spond legger aktivitetene inn i kalenderen på telefonen. Den kalenderen har en lenke vi kan hente fra.</p>
    <p class="small" style="margin:8px 0 0"><b>Samsung og Android (Google-kalender)</b></p>
    <ol class="small"><li>I Spond: trykk på profilbildet, velg <b>Kalenderinnstillinger</b> og gi tilgang til kalenderen.</li><li>Velg Google-kalenderen din som kalender for Spond.</li><li>Åpne calendar.google.com på en PC eller i nettleseren, trykk tannhjulet og så <b>Innstillinger</b>.</li><li>Velg kalenderen til venstre og finn <b>Hemmelig adresse i iCal-format</b>. Kopier den og lim den inn her.</li></ol>
    <p class="small" style="margin:0"><b>iPhone</b></p>
    <ol class="small"><li>I Spond: trykk på profilbildet, velg <b>Kalenderinnstillinger</b> og gi full tilgang.</li><li>Åpne Kalender-appen, trykk <b>Kalendere</b> og ⓘ ved iCloud-kalenderen Spond bruker.</li><li>Slå på <b>Offentlig kalender</b>, trykk <b>Del lenke</b> og kopier. Lim den inn her.</li></ol>
    <p class="small muted" style="margin:0 0 8px">Tips: Lag gjerne en egen kalender som heter «Spond», så kommer bare Spond-aktivitetene med.</p></details>
  <details class="help"><summary>Skole, barnehage, jobb og andre</summary><p class="small" style="margin:6px 0 8px">Se etter «Abonner», «iCal», «webcal» eller «Legg til i kalender». Lenker som starter med webcal:// virker også.</p></details>
  <form class="stack" id="ff" style="margin-top:8px">
    <div class="field"><label for="fu">Lenken</label><input class="input" id="fu" required inputmode="url" autocomplete="off" placeholder="https://… eller webcal://…"></div>
    <div class="grid2"><div class="field"><label for="fn3">Navn</label><input class="input" id="fn3" maxlength="40" value="Spond"></div>
    <div class="field"><label for="fw">Hvem gjelder det?</label><select class="select" id="fw">${whoOptions(S.mid)}</select></div></div>
    ${privBox('fp')}<p id="ferr" class="err" hidden></p>
    <button class="btn block" id="fgo">Koble til</button></form>`,()=>{
    $('#ff').onsubmit=async e=>{e.preventDefault();const url=SogniICS.normUrl($('#fu').value),err=$('#ferr');err.hidden=true;
      if(!url){err.textContent='Det ser ikke ut som en lenke. Kopier hele lenken og prøv igjen.';err.hidden=false;return}
      const go=$('#fgo');go.disabled=true;go.textContent='Henter …';let txt;
      try{txt=await fetchCal(url)}catch(x){err.textContent=x.message==='not_calendar'?'Lenken virker, men det er ikke en kalender. Sjekk at du kopierte iCal-lenken.':'Fikk ikke hentet kalenderen. Sjekk at lenken er riktig og prøv igjen.';err.hidden=false;go.disabled=false;go.textContent='Koble til';return}
      const f={id:(crypto.randomUUID?crypto.randomUUID():uuid4()),member_id:($('#fp')&&$('#fp').checked)?S.mid:$('#fw').value,name:$('#fn3').value.trim()||'Kalender',url,private:!!($('#fp')&&$('#fp').checked)};
      try{await Back.addFeed(S.fid,f)}catch(x){err.textContent='Det ble ikke lagret. Prøv igjen.';err.hidden=false;go.disabled=false;go.textContent='Koble til';return}
      const r=await syncFeed(f,txt,true);closeSheet();toast(r.ok?`${esc(f.name)} er koblet til. ${r.count} avtaler hentet.`:'Lenken er lagret, men avtalene kom ikke inn ennå. Vi prøver igjen snart.');loadFeeds()}})}
const uuid4=()=>'10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(c^Math.random()*16>>c/4).toString(16));

/* ---------- reminders (while the app is open) ---------- */
function checkReminders(){if(!S.fam||!S.mid)return;const now=Date.now(),key='sogni_rem_'+S.fid+'_'+S.mid;const fired=ls.get(key,{});let changed=false;
  const days=[0,1].map(o=>{const d=new Date();d.setDate(d.getDate()+o);return ymd(d)});
  items('event').filter(x=>x.remind&&(x.who==='alle'||x.who===S.mid||x.owner===S.mid&&x.private)).forEach(x=>days.forEach(k=>{if(!occurs(x,k))return;
    const [h,m]=(x.time||'08:00').split(':').map(Number);const st=parseYmd(k);st.setHours(h,m,0,0);const fire=st.getTime()-x.remind*60000,id=x.id+'@'+k;
    if(now>=fire&&now<st.getTime()&&!fired[id]){fired[id]=now;changed=true;const mins=Math.round((st.getTime()-now)/60000);
      const when=mins>=120?(k===days[0]?'i dag':'i morgen')+(x.time?' kl. '+x.time:''):'om '+(mins>=60?Math.round(mins/60)+' time':mins+' min');
      toast(`🔔 <b>${esc(x.text)}</b> ${esc(when)}`)}}));
  if(changed){Object.keys(fired).forEach(k=>{if(now-fired[k]>3*864e5)delete fired[k]});ls.set(key,fired)}}
setInterval(checkReminders,20000);
const recCard=(r,k)=>`<button class="rcard" data-r="${k}"><b>${esc(r.n)}</b><span class="muted small">${recMeta(r,k)}</span></button>`;
function pickDinner(date,month){const mo=month!=null?month:S.dinMonth;
  const list=mo===0?S.fr.map(r=>recCard(r,'f:'+r.id)).join('')||'<p class="empty">Ingen egne oppskrifter ennå.</p>':R.map((r,i)=>[r,i]).filter(([r])=>r.m===mo).map(([r,i])=>recCard(r,i)).join('');
  sheet(`<h2>${date?'Middag '+dayName(date):'Alle middager'}</h2><p class="muted small" style="margin:0 0 10px">${mo===0?'Oppskrifter familien har lagret selv.':'48 familiemiddager fra SOGNI-planleggeren, fire per måned.'}</p>
  <div class="chips" style="margin-bottom:12px"><button class="fchip" data-m="0" aria-pressed="${mo===0}">Våre (${S.fr.length})</button>${MONTHS.map((m,i)=>`<button class="fchip" data-m="${i+1}" aria-pressed="${mo===i+1}">${m.slice(0,3)}</button>`).join('')}</div>
  <div class="stack" style="gap:8px">${list}</div>
  ${mo===0?'<button class="btn ghost block" id="pimp" style="margin-top:10px">+ Hent oppskrift fra en nettside</button>':''}
  ${date?`<form class="addrow" id="cf" style="margin-top:16px"><input class="input" id="ci" placeholder="Eller skriv selv, f.eks. Taco" maxlength="50" aria-label="Egen middag"><button class="btn">Lagre</button></form>`:''}`,b=>{
    b.querySelectorAll('[data-m]').forEach(x=>x.onclick=()=>{S.dinMonth=+x.dataset.m;pickDinner(date,+x.dataset.m)});
    b.querySelectorAll('[data-r]').forEach(x=>x.onclick=()=>{const k=parseKey(x.dataset.r);if(date){setDinner(date,typeof k==='number'?{recipe:k}:{fr:k.slice(2)});closeSheet()}else recipeSheet(k)});
    const pi=b.querySelector('#pimp');if(pi)pi.onclick=()=>importSheet();
    const f=b.querySelector('#cf');if(f)f.onsubmit=e=>{e.preventDefault();const v=$('#ci').value.trim();if(v){setDinner(date,{text:v});closeSheet()}}})}
function setDinner(date,d){const id='din-'+date,old=findItem(id);const data=Object.assign({type:'dinner',date,by:S.mid,at:Date.now(),done:false},d);
  safe(saveItem(id,data));act(`${old?'byttet':'satte'} middag ${dayName(date)}: ${dinnerTitle(data)}`)}
function recipeSheet(k,date){const r=rec(k);if(!r)return;const w=weekDays(S.week);const own=typeof k!=='number';
  sheet(`<div class="eyebrow">${own?'Familiens oppskrift'+(r.t?' · '+r.t+' min':''):`${MONTHS[r.m-1]} · ${r.t} min · 4 pers · ${esc(r.o)}`}</div><h2 style="margin-top:4px">${esc(r.n)}</h2>
  ${own&&r.src?`<p class="small" style="margin:4px 0 0">Kilde: <a href="${esc(r.src)}" target="_blank" rel="noopener" style="color:var(--head);font-weight:700">${esc(hostOf(r.src))}</a> · lagt inn av ${esc(mname(r.by))}</p>`:own?`<p class="muted small" style="margin:4px 0 0">Lagt inn av ${esc(mname(r.by))}</p>`:''}
  <div class="stack" style="margin-top:12px">
    <div class="box"><b style="display:block;margin-bottom:6px">Ingredienser</b><ul class="ing">${r.i.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
    <button class="btn ghost block" id="toShop">Legg ingrediensene i handlelisten</button>
    <div class="box"><b style="display:block;margin-bottom:6px">Slik gjør du</b><ol class="steps">${r.s.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></div>
    ${date?`<div class="row" style="gap:8px"><button class="btn line" id="chg" style="flex:1">Bytt middag</button><button class="btn line" id="rm" style="flex:1">Fjern fra ${dayName(date)}</button></div>`:
    `<div class="addrow"><select class="select" id="sd" aria-label="Velg dag">${w.map(d=>`<option value="${ymd(d)}">${DAYS[(d.getDay()+6)%7]} ${d.getDate()}.</option>`).join('')}</select><button class="btn" id="setd">Sett på dagen</button></div>`}
    ${own&&!date?'<button class="link" id="delr" style="color:var(--rose)">Slett oppskriften</button>':''}
  </div>`,()=>{
    $('#toShop').onclick=()=>{r.i.forEach((x,n)=>safe(saveItem(uid(),{type:'shop',text:x,done:false,by:S.mid,at:Date.now()-n})));act(`la ${r.i.length} varer fra «${r.n}» i handlelisten`);toast(`${r.i.length} varer er lagt i handlelisten`);closeSheet()};
    if(date){$('#chg').onclick=()=>pickDinner(date,own?0:r.m);$('#rm').onclick=()=>{safe(removeItem('din-'+date));act(`fjernet middagen ${dayName(date)}`);closeSheet()}}
    else $('#setd').onclick=()=>{setDinner($('#sd').value,own?{fr:k.slice(2)}:{recipe:k});toast('Middagen er lagt inn');closeSheet()};
    const dr=$('#delr');if(dr)dr.onclick=()=>{dr.outerHTML='<div class="row" style="gap:8px"><span class="small" style="flex:1">Slette oppskriften for hele familien?</span><button class="btn sm" id="delok">Slett</button></div>';$('#delok').onclick=()=>{safe(Back.delRecipe(S.fid,k.slice(2)));closeSheet();toast('Oppskriften er slettet')}}})}

/* ---------- import recipe from another website ---------- */
function importSheet(){
  sheet(`<h2>Hent oppskrift</h2><p class="muted small" style="margin:0 0 12px">Lim inn lenken til oppskriften. Virker det ikke på en side, kan du kopiere teksten fra oppskriften og lime den inn under.</p>
  <form class="stack" id="if">
    <div class="field"><label for="iu">Lenke til oppskriften</label><input class="input" id="iu" type="url" inputmode="url" placeholder="https://" autocomplete="off"></div>
    <div class="field"><label for="it">Eller lim inn teksten</label><textarea class="input" id="it" rows="7" placeholder="Lim inn ingredienser og fremgangsmåte her"></textarea></div>
    ${IMGOK?'<div class="field"><label for="ii">Eller last opp et skjermbilde eller bilde av en kokebok</label><input class="input" id="ii" type="file" accept="image/*"></div>':''}
    <div id="ierr" class="err" hidden></div>
    <button class="btn block" id="igo">Les oppskriften</button>
    <p class="muted small" style="margin:0">Oppskriften lagres bare for familien deres, med lenke til der den kom fra.</p>
  </form>`,()=>{$('#if').onsubmit=async e=>{e.preventDefault();
    const src=$('#iu').value.trim(),txt=$('#it').value.trim(),fi=$('#ii'),img=fi&&fi.files&&fi.files[0];const er=$('#ierr');er.hidden=true;
    if(!txt&&!img&&src){const btn=$('#igo');btn.disabled=true;btn.textContent='Henter oppskriften …';
      try{const r=await fetch('/api/recipe?url='+encodeURIComponent(src));const d=r.ok?await r.json():null;btn.disabled=false;btn.textContent='Les oppskriften';
        if(d&&d.i&&d.i.length){reviewSheet(d,src);return}}catch(e){btn.disabled=false;btn.textContent='Les oppskriften'}
      er.hidden=false;er.textContent='Fant ikke oppskriften på den siden. Kopier teksten fra oppskriften og lim den inn i feltet over.';return}
    if(!txt&&!img){er.hidden=false;er.textContent='Lim inn lenken eller teksten fra oppskriften først.';return}
    const btn=$('#igo');btn.disabled=true;btn.textContent='Leser oppskriften …';
    let data=null;
    if(SAMPLE){try{data=await SAMPLE.json(`Du får en matoppskrift som er kopiert fra en nettside${img?' eller vist på et bilde':''}. Hent ut oppskriften og svar KUN med JSON: {"n": navn på retten, "t": total tid i minutter som tall eller null, "i": [ingredienser, én per element, med mengde, f.eks. "400 g kjøttdeig"], "s": [fremgangsmåte som korte steg, ett per element, uten nummer]}. Skriv på norsk bokmål; oversett hvis oppskriften er på et annet språk. Ta bare med selve oppskriften, ikke reklame, kommentarer eller historier.${src?'\nKilde: '+src:''}\n\nOPPSKRIFT:\n${txt.slice(0,30000)}`,img?{images:[img]}:{})}catch(err){data=null}}
    if(!data||!Array.isArray(data.i)||!data.i.length){data=txt?roughParse(txt):null}
    btn.disabled=false;btn.textContent='Les oppskriften';
    if(!data||!data.i.length){er.hidden=false;er.textContent='Fant ingen ingredienser. Sjekk at du limte inn hele oppskriften, eller skriv den inn selv på neste side.';data=data||{n:'',t:null,i:[],s:[]}}
    reviewSheet(data,src)}})}
function roughParse(txt){const lines=txt.split(/\r?\n/).map(l=>l.replace(/^[\s•\-–*·▢□☐]+/,'').trim()).filter(Boolean);
  const iH=lines.findIndex(l=>/^(ingredienser|ingredients|du trenger|dette trenger du)\b/i.test(l));
  const sH=lines.findIndex(l=>/^(fremgangsm|framgangsm|slik gjør|slik lager|instruksjon|instructions|method|directions|steps|tilberedning)/i.test(l));
  let name=lines[0]||'',ing=[],st=[];
  if(iH>=0){ing=lines.slice(iH+1,sH>iH?sH:undefined);if(iH>0)name=lines[0]}
  if(sH>=0)st=lines.slice(sH+1,iH>sH?iH:undefined);
  if(iH<0&&sH<0){lines.slice(1).forEach(l=>(/^[\d½¼¾]/.test(l)&&l.length<60?ing:st).push(l))}
  st=st.map(l=>l.replace(/^(\d+[.)]|steg \d+:?)\s*/i,'')).filter(l=>l.length>2);
  const tm=txt.match(/(\d+)\s*(min|minutter)/i);
  return {n:name.slice(0,80),t:tm?+tm[1]:null,i:ing.slice(0,40),s:st.slice(0,30)}}
function reviewSheet(d,src){
  sheet(`<h2>Sjekk oppskriften</h2><p class="muted small" style="margin:0 0 12px">Rett opp hvis noe ble feil. Én ingrediens og ett steg per linje.</p>
  <form class="stack" id="rf">
    <div class="field"><label for="rn">Navn</label><input class="input" id="rn" required maxlength="80" value="${esc(d.n||'')}"></div>
    <div class="field"><label for="rt">Tid (minutter)</label><input class="input" id="rt" type="number" inputmode="numeric" min="0" max="600" value="${d.t?esc(d.t):''}"></div>
    <div class="field"><label for="ri">Ingredienser</label><textarea class="input" id="ri" rows="7" required>${esc((d.i||[]).join('\n'))}</textarea></div>
    <div class="field"><label for="rs">Slik gjør du</label><textarea class="input" id="rs" rows="7">${esc((d.s||[]).join('\n'))}</textarea></div>
    ${src?`<p class="small" style="margin:0">Kilde: <b>${esc(hostOf(src))}</b></p>`:''}
    <button class="btn block">Lagre i familiens oppskrifter</button>
  </form>`,()=>{$('#rf').onsubmit=e=>{e.preventDefault();const lines=id=>$(id).value.split('\n').map(x=>x.trim()).filter(Boolean);
    const r={n:$('#rn').value.trim(),t:+$('#rt').value||null,i:lines('#ri'),s:lines('#rs'),src:/^https?:\/\//.test(src)?src:'',by:S.mid,at:Date.now()};
    safe(Back.putRecipe(S.fid,uid(),r));act(`la til oppskriften «${r.n}»`);closeSheet();toast('Oppskriften er lagret under Familiens oppskrifter')}})}
function customDinnerSheet(x){sheet(`<div class="eyebrow">Middag ${dayName(x.date)}</div><h2>${esc(x.text)}</h2><div class="row" style="gap:8px;margin-top:14px"><button class="btn line" id="chg" style="flex:1">Bytt middag</button><button class="btn line" id="rm" style="flex:1">Fjern</button></div>`,()=>{
  $('#chg').onclick=()=>pickDinner(x.date);$('#rm').onclick=()=>{safe(removeItem(x.id));act(`fjernet middagen ${dayName(x.date)}`);closeSheet()}})}
function addMemberSheet(){const n=S.fam.members.length;if(n>=PRICE.max){upgradeSheet(true);return}
  sheet(`<h2>Legg til person</h2><p class="box small" style="margin:0 0 12px">${esc(extraNote(n))}</p><form class="stack" id="mf">
  <div class="field"><label for="mn">Navn</label><input class="input" id="mn" required maxlength="24" placeholder="F.eks. Emma"></div>
  <p class="muted small" style="margin:0">For barn og andre uten egen mobil. De som har mobil, får heller invitasjonslenken.</p>
  <button class="btn block">${n>=PRICE.incl?`Legg til (+${PRICE.extra} kr/mnd)`:'Legg til'}</button></form>`,()=>{$('#mn').focus();$('#mf').onsubmit=async e=>{e.preventDefault();
    const f=JSON.parse(JSON.stringify(S.fam));if(f.members.length>=PRICE.max){upgradeSheet(true);return}
    const used=f.members.map(m=>m.color);const color=COLORS.find(c=>!used.includes(c))||COLORS[f.members.length%COLORS.length];
    const name=$('#mn').value.trim();f.members.push({name,color});await safe(Back.addMember(S.fid,{name,color}));
    act(f.members.length>PRICE.incl?`la til ${name} i familien (ny pris ${priceFor(f.members.length)} kr/mnd)`:`la til ${name} i familien`);closeSheet()}})}
function removeMemberSheet(id){const m=member(id);if(!m)return;const n=S.fam.members.length;
  sheet(`<h2>Fjerne ${esc(m.name)}?</h2><p class="muted" style="margin:0 0 12px">${esc(m.name)} kan ikke lenger logge inn i familien. Det ${esc(m.name)} har lagt inn, blir liggende.${n>PRICE.incl?` Prisen går ned til ${priceFor(n-1)} kr/mnd.`:''}</p>
  <div class="row" style="gap:8px"><button class="btn line" id="no" style="flex:1">Avbryt</button><button class="btn" id="yes" style="flex:1">Fjern</button></div>`,()=>{
    $('#no').onclick=closeSheet;$('#yes').onclick=async()=>{await safe(Back.removeMember(id));act(`fjernet ${m.name} fra familien`);closeSheet()}})}
function upgradeSheet(full){const n=S.fam.members.length;
  const rows=[...Array(Math.min(PRICE.max,8))].map((_,i)=>i+1).filter(k=>k>=PRICE.incl);
  sheet(`<h2>${full?'Familien er full':'Slik er prisen'}</h2><p class="muted" style="margin:0 0 12px">${full?`En familie kan ha opptil ${PRICE.max} personer.`:`${PRICE.base} kr i måneden dekker ${PRICE.incl} personer. Hver person ekstra koster ${PRICE.extra} kr i måneden. Alle får alt: felles uke, handleliste, gjøremål, middager, oppskrifter og varsler.`}</p>
  <div class="box" style="padding:4px 14px"><div class="list">${rows.map(k=>`<div class="item" style="${k===n?'font-weight:700;color:var(--head)':''}"><span class="txt">${k} personer${k===n?' (dere nå)':''}</span><span style="font-variant-numeric:tabular-nums">${priceFor(k)} kr/mnd</span></div>`).join('')}</div></div>
  <p class="muted small" style="margin:12px 0 0">Betaling med kort og Vipps settes opp før lansering.</p>`)}

/* ---------- start ---------- */
(async function boot(){
  const cfg=window.SOGNI_CONFIG||{};
  if(!cfg.supabaseUrl||!cfg.supabaseAnonKey||!window.supabase){showAuth('<div class="box">Appen er ikke satt opp ennå. Legg inn Supabase-adressen og nøkkelen i <b>config.js</b>.</div>');return}
  // Innlogging med lenke i e-posten: implicit flow virker selv om lenken åpnes i en annen nettleser enn der den ble bestilt.
  SB=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'implicit'}});
  SB.auth.onAuthStateChange((ev,session)=>{if(ev==='SIGNED_OUT'){started=false;if(S.fam){S.unsubs.forEach(u=>{try{u()}catch(e){}});S.unsubs=[];S.fam=null;welcome()}}
    else if(ev==='SIGNED_IN'&&session&&!S.fam&&!$('#auth').hidden)setTimeout(loginOnce,0)});
  const {data}=await SB.auth.getSession();
  if(data&&data.session)await loginOnce();else welcome();
  if('serviceWorker' in navigator){try{navigator.serviceWorker.register('/sw.js')}catch(e){}}
})();
