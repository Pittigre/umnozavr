'use strict';
/* ── хранилище ── */
var mem = {};
var store = {
  get:function(k,d){ try{ var v=localStorage.getItem(k); return v===null?d:JSON.parse(v); }catch(e){ return (k in mem)?mem[k]:d; } },
  set:function(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){ mem[k]=v; } }
};
/* перенос старых ключей в своё пространство имён */
(function migrate(){
  if (store.get('umn:moved')) return;
  ['cfg','facts'].forEach(function(k){
    var old = store.get(k, null);
    if (old !== null && store.get('umn:'+k, null) === null) store.set('umn:'+k, old);
  });
  store.set('umn:moved', 1);
})();

var $ = function(id){ return document.getElementById(id); };

var cfg  = store.get('umn:cfg',  {mode:'mul', tables:[2,3,4,5,6,7,8,9], len:10, input:'type'});
var cfg2 = store.get('umn:cfg2', {lvl:1, len:8});
var facts = store.get('umn:facts', {});   // "3x7" -> {c,w}
var ord   = store.get('umn:ord', {});     // шаблон -> {c,w,rc,rw}
var ach = store.get('umn:ach', {c:0, o:0, g:0, best:0, days:[], sess:0, got:[], season:1, cap:{d:'',n:0}});
if(ach.o===undefined) ach.o=0;
if(ach.g===undefined) ach.g=0;
if(!ach.cap) ach.cap={d:'',n:0};
var DAY_CAP = 100;
var S = null;
var saveAch = function(){ store.set('umn:ach', ach); };
var today = function(){ var d=new Date(); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); };
function known(){ var n=0,a,b; for(a=2;a<=9;a++) for(b=2;b<=9;b++){ if(mastered(stat(a,b))) n++; } return n; }

/* ── звук ── */
var actx=null, snd = store.get('umn:snd', 1);
function beep(f,dur,type){
  if(!snd) return;
  try{
    actx = actx || new (window.AudioContext||window.webkitAudioContext)();
    var o=actx.createOscillator(), g=actx.createGain();
    o.type=type||'sine'; o.frequency.value=f;
    g.gain.setValueAtTime(0.0001,actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.18,actx.currentTime+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001,actx.currentTime+dur);
    o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime+dur+0.02);
  }catch(e){}
}
var sndOk=function(){ beep(880,.09); setTimeout(function(){beep(1320,.12);},70); };
var sndNo=function(){ beep(190,.22,'triangle'); };
var sndWin=function(){ [523,659,784,1047].forEach(function(f,i){ setTimeout(function(){beep(f,.14);}, i*110); }); };
/* ── стикеры ── */
/* ── награды ── */
var DIRS={
  rechnen:['table','zehner','teiler','rest','double'],
  sach:['geld','laenge','gewicht','zeit'],
  geo:['geo'],
  struktur:['order']
};
function dirOf(topic){
  for(var k in DIRS) if(DIRS[k].indexOf(topic)>-1) return k;
  return null;
}
function dirBalls(k){ return (ach.dir&&ach.dir[k])||0; }

/* ── сезоны ── */
var SEASONS={
 1:{title:'Первый сезон', path:function(i){ return 'stickers/'+(i+1<10?'0':'')+(i+1)+'.png'; },
    lock:'stickers/locked.png',
    list:[{n:'Дебют',b:25},{n:'Первый мяч',b:60},{n:'В основе',b:110},{n:'Полузащита',b:170},
          {n:'Плеймейкер',b:240},{n:'Бомбардир',b:310,o:60},{n:'Диспетчер',b:380,o:100},
          {n:'Лидер атаки',b:440,o:120},{n:'Мастер поля',b:800,m:56,o:260,g:60},
          {n:'Капитан',b:1300,m:64,o:380,g:140}]},
 2:{title:'Второй сезон', path:function(i){ return 'stickers/Season2/2_'+(10-i)+'.png'; },
    lock:'stickers/Season2/2_0.png',
    list:[{b:60},
          {b:160,  d:{rechnen:45}},
          {b:300,  d:{rechnen:85,  sach:65}},
          {b:470,  d:{rechnen:130, sach:105,             struktur:45}},
          {b:660,  d:{rechnen:185, sach:145, geo:55,     struktur:65}},
          {b:880,  d:{rechnen:245, sach:195, geo:70,     struktur:90}},
          {b:1120, d:{rechnen:315, sach:245, geo:90,     struktur:110}},
          {b:1390, d:{rechnen:390, sach:305, geo:110,    struktur:140}},
          {b:1680, d:{rechnen:470, sach:370, geo:135,    struktur:170}},
          {b:2000, d:{rechnen:560, sach:440, geo:160,    struktur:200}}]}
};
var DIRNAME={rechnen:'Rechnen', sach:'Sachrechnen', geo:'Geometrie', struktur:'Punkt vor Strich'};
function season(){ return ach.season||1; }
function SC(){ return SEASONS[season()]; }
var SEASON = 1;
function stickList(){ return SC().list; }
/* прогресс к стикеру: доля по самому отстающему условию */
function stParts(st){
  var out=[{lab:'мячи', a:Math.min(ach.c,st.b), b:st.b}], k;
  if(st.m) out.push({lab:'карта', a:Math.min(known(),st.m), b:st.m});
  if(st.o) out.push({lab:'порядок действий', a:Math.min(ach.o,st.o), b:st.o});
  if(st.g) out.push({lab:'геометрия', a:Math.min(ach.g,st.g), b:st.g});
  if(st.d) for(k in st.d) out.push({lab:DIRNAME[k], a:Math.min(dirBalls(k),st.d[k]), b:st.d[k]});
  return out;
}
function stReady(st){
  var p=stParts(st),i;
  for(i=0;i<p.length;i++) if(p[i].a<p[i].b) return false;
  return true;
}
function stPct(st){
  var p=stParts(st), min=1, i;
  for(i=0;i<p.length;i++) min=Math.min(min, p[i].a/p[i].b);
  return Math.round(min*100);
}
function stNeed(st){
  return stParts(st).map(function(x){ return x.lab+' '+x.b; }).join(' · ');
}
function stFile(i){ return SC().path(i); }
function stImg(i, got){
  return '<img src="'+(got?stFile(i):SC().lock)+'" alt="" onerror="this.style.display=\'none\'">';
}
function checkStickers(){
  var fresh=[],i;
  for(i=0;i<stickList().length;i++){
    if(ach.got.indexOf(i)>-1) continue;
    if(stReady(stickList()[i])){ ach.got.push(i); fresh.push(i); }
  }
  if(fresh.length) saveAch();
  return fresh;
}
function award(list){
  if(!list.length) return false;
  var i=list.shift(), st=stickList()[i];
  $('wPic').innerHTML = stImg(i,true)+'<span>'+(i+1)+'</span>';
  $('wName').textContent = st.n || ('Награда '+(i+1));
  $('wNeed').textContent = stNeed(st);
  $('wrap').classList.remove('hidden');
  sndWin();
  $('wOk').onclick=function(){
    $('wrap').classList.add('hidden');
    if(!award(list)) show('result');
  };
  return true;
}
var viewSeason=null;
function paintStickers(){
  var html='',i,next='';
  var cur=season(), shown=viewSeason||cur, past=(shown!==cur);
  var tabs='';
  for(i=1;i<=cur;i++)
    tabs+='<button class="chip wide" data-s="'+i+'" aria-pressed="'+(i===shown)+'">'+SEASONS[i].title+'</button>';
  $('seasonTabs').innerHTML=tabs;
  if(past){                                   // архив прошлого сезона
    var A=ach.arch&&ach.arch[shown];
    var L=SEASONS[shown].list, P=SEASONS[shown].path;
    for(i=0;i<L.length;i++){
      var was=A&&A.got.indexOf(i)>-1;
      html+='<div class="st'+(was?' got':' lock')+'">'
          + '<div class="pic"><img src="'+(was?P(i):SEASONS[shown].lock)+'" alt="" onerror="this.style.display=\'none\'"><span>'+(i+1)+'</span></div>'
          + '<b>'+(L[i].n||('Награда '+(i+1)))+'</b><small>'+(was?'Открыт':'Не открыт')+'</small></div>';
    }
    $('stGrid').innerHTML=html;
    $('stTitle').textContent=SEASONS[shown].title;
    $('stNext').textContent = A ? 'Итог сезона: '+A.c+' мячей, наград '+A.got.length+' из '+L.length+'.' : '';
    var old=document.getElementById('captBox'); if(old) old.remove();
    return;
  }
  for(i=0;i<stickList().length;i++){
    var st=stickList()[i], got=ach.got.indexOf(i)>-1;
    html += '<div class="st'+(got?' got':' lock')+'" data-i="'+i+'">'
          + '<div class="pic">'+stImg(i,got)+'<span>'+(i+1)+'</span></div>'
          + '<b>'+(got?(st.n||('Награда '+(i+1))):'Награда '+(i+1))+'</b>'
          + '<small>'+(got?'Открыт':stNeed(st))+'</small>'
          + (got?'':'<div class="track"><i style="width:'+stPct(st)+'%"></i></div>')
          + '</div>';
    if(!got && !next){
      next = stParts(st).map(function(x){ return x.lab+' '+x.a+'/'+x.b; }).join(' · ');
    }
  }
  $('stGrid').innerHTML=html;
  $('stTitle').textContent=SC().title+' — '+ach.got.length+' из '+stickList().length;
  $('stNext').textContent = seasonDone() ? 'Все награды сезона собраны!' : 'Следующая: '+next;
}

/* просмотр награды на весь экран */
var viewIdx=-1;

/* карточка для сохранения и отправки */
function makeCard(i, cb){
  var W=800,H=1000, cv=document.createElement('canvas');
  cv.width=W; cv.height=H;
  var x=cv.getContext('2d');
  x.fillStyle='#F4F8FC'; x.fillRect(0,0,W,H);
  x.strokeStyle='#CFE2F3'; x.lineWidth=2;
  for(var g=40;g<W;g+=40){ x.beginPath(); x.moveTo(g,0); x.lineTo(g,H); x.stroke(); }
  for(g=40;g<H;g+=40){ x.beginPath(); x.moveTo(0,g); x.lineTo(W,g); x.stroke(); }
  var img=new Image();
  img.onload=img.onerror=function(){
    if(img.width){
      var box=560, k=Math.min(box/img.width, box/img.height);
      var mw=img.width*k, mh=img.height*k;
      x.drawImage(img,(W-mw)/2, 80+(box-mh)/2, mw, mh);
    }
    x.textAlign='center';
    x.fillStyle='#2C4CC8'; x.font='800 62px Segoe UI, sans-serif';
    x.fillText(stickList()[i].n||('Награда '+(i+1)), W/2, 760);
    x.fillStyle='#1B2A3A'; x.font='700 34px Segoe UI, sans-serif';
    x.fillText('Награда открыта!', W/2, 815);
    x.fillStyle='#5A6E85'; x.font='400 28px Segoe UI, sans-serif';
    x.fillText(stNeed(stickList()[i]), W/2, 866);
    x.fillText('Умножарий · сезон '+season(), W/2, 930);
    cv.toBlob(function(bl){ cb(bl); }, 'image/png');
  };
  img.src=stFile(i);
}


/* ── экраны ── */
var SCREENS=['topics','setupTable','setupOrder','setupNew','game','result','progress','stickers','geo','lesson','parent','league','lgSetup'];
function show(id){
  SCREENS.forEach(function(s){ $(s).classList.toggle('hidden', s!==id); });
  window.scrollTo(0,0);
}

/* ── клавиатура ── */
function padKeys(){
  var money = !!(S.q && S.q.comma && !S.step2 ? S.q.comma : (S.q && S.q.comma2 && S.step2));
  var want = money ? '1,2,3,4,5,6,7,8,9,⌫,0|,✓'.split(',').join(',') : '';
  var keys = money ? ['1','2','3','4','5','6','7','8','9',',','0','⌫','✓']
                   : ['1','2','3','4','5','6','7','8','9','⌫','0','✓'];
  var pad=$('pad');
  if(pad.dataset.set===keys.join('')) return;
  pad.dataset.set=keys.join('');
  pad.innerHTML=keys.map(function(l){
    return '<button class="key'+(l==='✓'?' go':l==='⌫'?' del':'')+'" data-k="'+l+'">'+l+'</button>'; }).join('');
  pad.style.gridTemplateColumns = keys.length===13 ? 'repeat(3,1fr)' : 'repeat(3,1fr)';
}
function typeIn(d){
  if(S.locked) return;
  if(d===',' ){ if(S.typed && S.typed.indexOf(',')===-1) S.typed+=','; paintAnswer(); return; }
  if(d===null) S.typed=S.typed.slice(0,-1);
  else if(S.typed.length < (S.q && S.q.maxLen || 3)) S.typed+=d;
  paintAnswer();
}
/* ввод в центах, если в задании есть запятая */
function readTyped(){
  if(S.typed==='') return null;
  var isMoney = S.q && ((S.step2 && S.q.comma2) || (!S.step2 && S.q.comma));
  if(!isMoney) return +S.typed;
  var p=S.typed.split(',');
  var eur=+(p[0]||0), ct=p.length>1 ? +( (p[1]+'00').slice(0,2) ) : 0;
  return eur*100+ct;
}
function paintAnswer(){
  var blank=document.querySelector('#task .blank');
  if(blank){ blank.textContent=S.typed; return; }
  var a=$('answer');
  if(S.typed===''){ a.className='answer empty'; a.textContent=''; }
  else { a.className='answer'; a.innerHTML=S.typed+'<span class="caret"></span>'; }
}

/* ── сессия ── */
function startSession(topic, queue){
  if(ach.days.indexOf(today())===-1){ ach.days.push(today()); saveAch(); }
  S={topic:topic, i:0, right:0, streak:0, best:0, typed:'', locked:false, phase:'calc',
     count:(topic!=='table' || cfg.input==='type'),
     mistakes:[], t0:Date.now(), queue:queue||null,
     total: queue ? queue.length : (topic==='table'?cfg.len:topic==='order'?cfg2.len:
            topic==='geo'?cfg3.len:topic==='match'?LG_MATCH:nCfg(topic).len)};
  show('game'); nextQuestion();
}
function nextQuestion(){
  if(S.i>=S.total) return finish();
  S.q = S.queue ? S.queue[S.i] :
        (S.topic==='table' ? buildTable() : S.topic==='order' ? buildOrder() :
         S.topic==='geo' ? buildGeo() : S.topic==='zehner' ? buildZehner() :
         S.topic==='teiler' ? buildTeiler() : S.topic==='rest' ? buildRest() :
         S.topic==='double' ? buildDouble() : S.topic==='geld' ? buildGeld() :
         S.topic==='match' ? lgBuild() :
         S.topic==='laenge' ? buildLaenge() : S.topic==='gewicht' ? buildGewicht() : buildZeit());
  S.typed=''; S.locked=false; S.qt=Date.now();
  S.phase = S.q.kind==='order' ? 'pick' : 'calc';
  S.step2 = false;
  if(S.q.kind==='geo') geoPic(S.q);
  else if(S.q.clock){ $('gPic').classList.remove('hidden'); $('gPic').innerHTML=clock(S.q.clock); }
  else $('gPic').classList.add('hidden');
  $('task').innerHTML = S.q.text;
  $('task').classList.remove('pop'); void $('task').offsetWidth; $('task').classList.add('pop');
  $('step0').textContent = S.q.given || '';
  $('verdict').textContent=''; $('verdict').className='verdict';
  $('stage').className='stage';
  $('pbar').style.width=(S.i/S.total*100)+'%';
  paintDay();
  if(S.topic==='match') startTick();
  paintAnswer();
  padKeys();
  layout();
}
var tickT=null;
function stopTick(){ if(tickT){ clearInterval(tickT); tickT=null; } $('timer').classList.add('hidden'); }
function startTick(){
  stopTick();
  $('timer').classList.remove('hidden');
  var left=LG_SEC*10;
  $('tbar').style.width='100%';
  tickT=setInterval(function(){
    left--;
    $('tbar').style.width=Math.max(0,left/(LG_SEC*10)*100)+'%';
    if(left<=0){ stopTick(); if(!S.locked) submit(-1); }
  }, 100);
}
function paintDay(){
  if(!S.count){ $('streak').innerHTML='<span style="color:var(--ink-soft);font-size:12px">без зачёта</span>'; return; }
  if(ach.cap.d!==today()) ach.cap={d:today(), n:0};
  var left=DAY_CAP-ach.cap.n;
  $('streak').innerHTML = left<=0 ? '<span style="color:var(--ok);font-size:12px">норма ✓</span>'
    : (S.streak>=3 ? '🔥 '+S.streak+' ' : '') + '<span style="font-size:12px;color:var(--ink-soft)">⚽ '+ach.cap.n+'/'+DAY_CAP+'</span>';
}
function layout(){
  var pick = S.phase==='pick';
  var typing = S.q.opts ? false : (S.topic==='table' ? cfg.input==='type' : true);
  $('ask').textContent = pick ? 'Какое действие считаем первым?' : (S.q.ask || '');
  $('pad').classList.toggle('hidden', pick || !typing);
  $('options').classList.toggle('hidden', pick || typing);
  var inBlank = !!document.querySelector('#task .blank');
  $('answer').style.display = (!pick && typing && !inBlank) ? 'flex' : 'none';
  if(!pick && !typing) paintOptions(S.q.ans);
}
function paintOptions(ans){
  if(S.q.opts){
    $('options').innerHTML=S.q.opts.map(function(o){
      return '<button class="opt" data-v="'+o[1]+'">'+o[0]+'</button>'; }).join('');
    return;
  }
  var set=[ans], guard=0;
  while(set.length<4 && guard++<200){
    var d = S.q.op==='mul' ? ans+R(-5,5) : R(2,9);
    if(d>0 && set.indexOf(d)===-1) set.push(d);
  }
  set.sort(function(){ return Math.random()-.5; });
  $('options').innerHTML = set.map(function(v){ return '<button class="opt" data-v="'+v+'">'+v+'</button>'; }).join('');
}

/* шаг 1: выбор действия */
function pickOp(i, btn){
  if(i===S.q.first){
    markOrd(S.q.id, S.picked ? 'rw' : 'rc');
    btn.classList.add('done');
    beep(760,.08);
    S.locked=true;
    setTimeout(function(){
      var e=S.q.e, f=S.q.first;
      $('step0').textContent = exprText(e);
      $('task').innerHTML = S.q.rest.n[0]+' <em>'+S.q.rest.o+'</em> '+S.q.rest.n[1];
      $('task').classList.remove('pop'); void $('task').offsetWidth; $('task').classList.add('pop');
      $('verdict').textContent='';
      S.phase='calc'; S.locked=false; S.typed=''; paintAnswer(); layout();
    }, 420);
  } else {
    if(!S.picked){ S.picked=true; }
    $('verdict').className='verdict no';
    $('verdict').textContent = S.q.e.br!==null ? 'Сначала то, что в скобках' : 'Умножение и деление — раньше сложения и вычитания';
    sndNo();
  }
}

function submit(val){
  if(S.locked || S.phase==='pick' || val===null || isNaN(val)) return;
  if(S.topic==='match') stopTick();
  /* деление с остатком: первый ответ — частное, затем спрашиваем остаток */
  if(S.q.two && !S.step2){
    if(val!==S.q.ans){
      S.locked=true; S.streak=0; S.mistakes.push(S.q);
      if(S.topic==='match' && S.q.topic){ S.dirs=S.dirs||{}; var dm=dirOf(S.q.topic); if(dm) S.dirs[dm]=1; }
  if(S.q.topic) tpMark(S.q.topic, false, Date.now()-(S.qt||Date.now()), S.q.plain);
      $('stage').className='stage no'; $('verdict').className='verdict no';
      $('verdict').innerHTML = S.topic==='match' ? 'Falsch' : ('Richtig wäre <b>'+S.q.full+'</b>');
      if(S.topic==='match'){ S.wrong=S.wrong||[]; S.wrong.push(S.q.plain); }
      sndNo(); S.i++; $('pbar').style.width=(S.i/S.total*100)+'%';
      setTimeout(nextQuestion, 1600); return;
    }
    S.step2=true; S.typed=''; S.locked=false;
    $('ask').textContent=S.q.ask2;
    $('task').innerHTML=S.q.text2;
    paintAnswer(); beep(760,.08); return;
  }
  S.locked=true;
  var good = S.q.two ? (val===S.q.ans2) : (val===S.q.ans);
  if(S.q.kind==='num') markFact(S.q.a,S.q.b,good); else if(S.q.kind==='order') markOrd(S.q.id, good?'c':'w');
  if(S.topic==='match' && S.q.topic){ S.dirs=S.dirs||{}; var dm=dirOf(S.q.topic); if(dm) S.dirs[dm]=1; }
  if(S.q.topic) tpMark(S.q.topic, good, Date.now()-(S.qt||Date.now()), S.q.plain);

  if(good){
    S.right++; S.streak++; S.best=Math.max(S.best,S.streak);
    if(S.count && S.topic!=='match'){
      var pts = S.topic==='table' ? 1 : 2;
      if(ach.cap.d!==today()) ach.cap={d:today(), n:0};
      var left = DAY_CAP - ach.cap.n;
      var give = Math.max(0, Math.min(pts, left));
      if(give){
        ach.cap.n += give; ach.c += give;
        if(S.topic==='order') ach.o += give;
        if(S.topic==='geo')   ach.g += give;
        var dk=dirOf(S.topic);
        if(dk){ ach.dir=ach.dir||{}; ach.dir[dk]=(ach.dir[dk]||0)+give; }
      }
      S.capped = (left<=0);
      if(S.streak>ach.best) ach.best=S.streak;
      saveAch();
    }
    $('stage').className='stage ok';
    $('verdict').className='verdict ok';
    $('verdict').textContent = S.capped ? 'Tagesziel erfüllt — норма выполнена'
      : (S.streak>=5 ? 'Подряд '+S.streak+'!' : 'Верно');
    sndOk();
  } else {
    S.streak=0; S.mistakes.push(S.q);
    $('stage').className='stage no';
    $('verdict').className='verdict no';
    if(S.topic==='match'){
      $('verdict').innerHTML='Falsch';
      S.wrong=S.wrong||[]; S.wrong.push(S.q.plain);
    }
    var shown=S.q.ans;
    if(S.q.opts){ S.q.opts.forEach(function(o){ if(o[1]===S.q.ans) shown=o[0]; }); }
    else if(S.q.two) shown=S.q.full;
    else if(S.q.comma) shown=eu(S.q.ans);
    else if(S.q.kind==='geo') shown=S.q.ans+' '+S.q.unit;
    if(S.topic!=='match') $('verdict').innerHTML='Правильный ответ — <b>'+shown+'</b>';
    if($('answer').style.display!=='none'){ $('answer').className='answer'; $('answer').textContent=val; }
    sndNo();
  }
  S.picked=false; paintDay();
  S.i++; $('pbar').style.width=(S.i/S.total*100)+'%';
  setTimeout(nextQuestion, S.topic==='match' ? (good?450:800) : (good?550:1600));
}

function finish(){
  stopTick();
  if(S.finished && S.topic!=='match') return;
  if(S.topic==='match') return finishMatch();
  var sec=Math.round((Date.now()-S.t0)/1000);
  var pct=S.total?S.right/S.total:0;
  var n=pct>=.95?3:pct>=.8?2:pct>=.6?1:0;
  var capOut = S.count && ach.cap.d===today() && ach.cap.n>=DAY_CAP;
  $('stars').textContent='★★★'.slice(0,n)+'☆☆☆'.slice(0,3-n);
  $('rScore').textContent=S.right+'/'+S.total;
  $('rTime').innerHTML='за '+Math.floor(sec/60)+' мин '+(sec%60)+' с'+(S.best>=3?' · лучшая серия '+S.best:'')
    + (!S.count ? '<br><b style="color:var(--no)">Этот режим не идёт в зачёт мячей</b>' : '')
    + (capOut ? '<br><b style="color:var(--ok)">Tagesziel erfüllt — норма на сегодня выполнена</b>' : '');
  var box=$('missBox');
  if(S.mistakes.length){
    box.classList.remove('hidden');
    $('missList').innerHTML=S.mistakes.map(function(q){ return '<span class="miss">'+q.plain+'</span>'; }).join('');
  } else box.classList.add('hidden');
  $('repeatErr').classList.toggle('hidden', S.mistakes.length===0);
  ach.sess++; saveAch(); backup();
  var fresh = S.count ? checkStickers() : [];
  if(fresh.length){ show('result'); award(fresh); return; }
  if(n===3) sndWin(); else beep(660,.15);
  show('result');
}

/* ── родительский раздел ── */
var PIN = {buf:'', mode:'ask'};
function snapshot(){ return {ach:ach, facts:facts, ord:ord, t:Date.now()}; }
function backup(){ store.set('umn:bak', snapshot()); }
function applySnap(d){
  if(!d || !d.ach) return false;
  ach=d.ach; facts=d.facts||{}; ord=d.ord||{};
  if(ach.g===undefined) ach.g=0;
  if(!ach.cap) ach.cap={d:'',n:0};
  store.set('umn:ach',ach); store.set('umn:facts',facts); store.set('umn:ord',ord);
  return true;
}
function pinPaint(){
  $('pinDots').textContent = PIN.buf.replace(/./g,'•');
  var set = store.get('umn:pin', null);
  $('pinTitle').textContent = PIN.mode==='set' ? 'Придумайте код' : 'Родительский код';
  $('pinHint').textContent = PIN.mode==='set'
    ? 'Четыре цифры. Понадобится, чтобы попасть сюда снова.'
    : (set===null ? 'Кода ещё нет — задайте его.' : 'Введите четыре цифры.');
}
function openParent(){
  paintUnlock(); paintReport();
  $('pinBox').classList.add('hidden');
  $('pBody').classList.remove('hidden');
  var b=store.get('umn:bak', null);
  $('bakInfo').textContent = b ? 'Последняя копия: '+new Date(b.t).toLocaleString('ru-RU')+' — '+b.ach.c+' мячей, наград '+b.ach.got.length+'.'
                               : 'Копий пока нет. Она создаётся после каждой тренировки.';
  pStat();
}
function pStat(){
  $('pStat').textContent='Сейчас: '+ach.c+' мячей (порядок '+ach.o+', геометрия '+ach.g+'), наград '+ach.got.length+'.';
}

/* ── успехи ── */
function paintProgress(){
  var html='<div class="hd">×</div>', a,b,known=0;
  for(b=2;b<=9;b++) html+='<div class="hd">'+b+'</div>';
  for(a=2;a<=9;a++){
    html+='<div class="hd">'+a+'</div>';
    for(b=2;b<=9;b++){
      var f=stat(a,b), n=f.c+f.w, bg='#EDF2F7', fg='var(--ink)';
      if(n>0){
        if(mastered(f)){ bg='#128C5A'; fg='#fff'; known++; }
        else if(f.c>f.w) bg='#B7E4CD'; else bg='#F7E0A8';
      }
      html+='<div style="background:'+bg+';color:'+fg+'">'+(a*b)+'</div>';
    }
  }
  $('mapGrid').innerHTML=html;
  $('ballStats').textContent = 'Всего '+ach.c+' мячей, из них '+ach.o+' за порядок действий. '
    + 'Тренировок: '+ach.sess+', дней: '+ach.days.length+', лучшая серия: '+ach.best+'.';
  $('mapTotal').textContent='Освоено '+known+' из 64 примеров. Клетка зеленеет, когда из последних пяти ответов по ней не больше одной ошибки.';

  var rows='', id, any=false;
  for(id in PAT){
    var s=ord[id]; if(!s) continue;
    any=true;
    var rt=s.rc+s.rw, ct=s.c+s.w;
    var pr=rt?Math.round(s.rc/rt*100):0, pc=ct?Math.round(s.c/ct*100):0;
    rows+='<div class="prow"><div class="lab"><span>'+PAT[id].lab+'</span>'
        + '<span>правило '+pr+'% · счёт '+pc+'%</span></div>'
        + '<div class="track"><i style="width:'+Math.round((pr+pc)/2)+'%"></i></div></div>';
  }
  $('ordStats').innerHTML = any ? rows
    : '<p class="hint" style="margin:0">Пока пусто. «Правило» — как часто верно выбрано первое действие, «счёт» — верен ли ответ.</p>';
}

function boot(){
  paintChips(); paintOrderChips(); paintGeoChips(); paintTopics(); paintSeasonBtn();
  if('serviceWorker' in navigator && location.protocol==='https:'){
    window.addEventListener('load',function(){ navigator.serviceWorker.register('sw.js').catch(function(){}); });
  }
}


function wire_core(){
  $('stGrid').addEventListener('click',function(e){
    var c=e.target.closest('.st'); if(!c) return;
    var i=+c.dataset.i, got=ach.got.indexOf(i)>-1;
    viewIdx=i;
    $('vPic').innerHTML = stImg(i,got)+'<span>'+(i+1)+'</span>';
    $('vName').textContent = got ? (stickList()[i].n||('Награда '+(i+1))) : 'Ещё не открыт';
    $('vNeed').textContent = got ? stNeed(stickList()[i]) : stParts(stickList()[i]).map(function(x){ return x.lab+' '+x.a+'/'+x.b; }).join(' · ');
    $('vActs').classList.toggle('hidden', !got);
    $('view').classList.remove('hidden');
  });
  $('vClose').onclick=function(){ $('view').classList.add('hidden'); };
  $('vSave').onclick=function(){
    makeCard(viewIdx,function(bl){
      var u=URL.createObjectURL(bl), a=document.createElement('a');
      a.href=u; a.download='umnozhariy-'+(viewIdx+1)+'.png'; a.click();
      setTimeout(function(){ URL.revokeObjectURL(u); },4000);
    });
  };
  $('vShare').onclick=function(){
    makeCard(viewIdx,function(bl){
      var f=new File([bl],'umnozhariy-'+(viewIdx+1)+'.png',{type:'image/png'});
      if(navigator.canShare && navigator.canShare({files:[f]}))
        navigator.share({files:[f], text:'Открыта награда «'+STICK[viewIdx].n+'»'}).catch(function(){});
      else $('vSave').click();
    });
  };
  document.querySelectorAll('.back').forEach(function(b){ b.onclick=function(){ show('topics'); }; });
  document.querySelectorAll('.topic').forEach(function(b){
    b.onclick=function(){
      var t=b.dataset.topic;
      if(t==='table'){ paintChips(); show('setupTable'); }
      else if(t==='geo'){ paintGeoChips(); show('geo'); }
      else { paintOrderChips(); show('setupOrder'); }
    };
  });
  (function(){ var pad=$('pad');
    ['1','2','3','4','5','6','7','8','9','⌫','0','✓'].forEach(function(l){
      var b=document.createElement('button');
      b.className='key'+(l==='✓'?' go':l==='⌫'?' del':'');
      b.textContent=l; b.dataset.k=l; pad.appendChild(b);
    });
  })();
  $('pad').addEventListener('click',function(e){
    var b=e.target.closest('.key'); if(!b) return;
    var k=b.dataset.k;
    if(k==='⌫') typeIn(null);
  else if(k==='✓') submit(readTyped());
  else typeIn(k);
  });
  $('options').addEventListener('click',function(e){
    var b=e.target.closest('.opt'); if(!b) return; submit(+b.dataset.v);
  });
  $('task').addEventListener('click',function(e){
    var b=e.target.closest('.op'); if(!b || !S || S.phase!=='pick' || S.locked) return;
    pickOp(+b.dataset.i, b);
  });
  document.addEventListener('keydown',function(e){
    if($('game').classList.contains('hidden') || S.phase==='pick' || cfg.input!=='type') return;
    if(e.key>='0'&&e.key<='9') typeIn(e.key);
    else if(e.key==='Backspace') typeIn(null);
    else if(e.key===',' || e.key==='.') typeIn(',');
  else if(e.key==='Enter') submit(readTyped());
  });
  $('playTable').onclick=function(){ startSession('table',null); };
  $('playOrder').onclick=function(){ startSession('order',null); };
  $('again').onclick=function(){
  if(S.topic==='match'){ $('again').textContent='Ещё раз'; paintLeague(); show('league'); return; }
  startSession(S.topic,null);
};
  $('repeatErr').onclick=function(){ startSession(S.topic, S.mistakes.slice()); };
  $('quit').onclick=function(){ stopTick(); if(S&&S.topic==='match'){ paintLeague(); show('league'); return; } show('topics'); };
  (function initPin(){
    var pad=$('pinPad');
    ['1','2','3','4','5','6','7','8','9','⌫','0','✓'].forEach(function(l){
      var b=document.createElement('button');
      b.className='key'+(l==='✓'?' go':l==='⌫'?' del':'');
      b.textContent=l; b.dataset.k=l; pad.appendChild(b);
    });
  })();
  $('pinPad').addEventListener('click',function(e){
    var b=e.target.closest('.key'); if(!b) return;
    var k=b.dataset.k;
    if(k==='⌫') PIN.buf=PIN.buf.slice(0,-1);
    else if(k==='✓'){
      if(PIN.buf.length!==4){ beep(200,.15,'triangle'); return; }
      var set=store.get('umn:pin', null);
      if(PIN.mode==='set' || set===null){
        store.set('umn:pin', PIN.buf); PIN.mode='ask'; PIN.buf=''; openParent(); beep(880,.1); return;
      }
      if(PIN.buf===set){ PIN.buf=''; openParent(); beep(880,.1); }
      else { PIN.buf=''; beep(190,.25,'triangle'); $('pinHint').textContent='Неверный код.'; }
    }
    else if(PIN.buf.length<4) PIN.buf+=k;
    pinPaint();
  });
  $('toParent').onclick=function(){
    PIN.buf=''; PIN.mode = store.get('umn:pin',null)===null ? 'set' : 'ask';
    $('pinBox').classList.remove('hidden'); $('pBody').classList.add('hidden');
    pinPaint(); show('parent');
  };
  $('pinChange').onclick=function(){ store.set('umn:pin',null); PIN.mode='set'; PIN.buf='';
    $('pinBox').classList.remove('hidden'); $('pBody').classList.add('hidden'); pinPaint(); };
  $('bakRestore').onclick=function(){
    var b=store.get('umn:bak',null);
    if(!b){ alert('Копий пока нет.'); return; }
    if(!confirm('Откатить прогресс к копии от '+new Date(b.t).toLocaleString('ru-RU')+'?')) return;
    applySnap(b); pStat(); alert('Готово.');
  };
  $('bakSave').onclick=function(){
    var bl=new Blob([JSON.stringify(snapshot())],{type:'application/json'});
    var u=URL.createObjectURL(bl), a=document.createElement('a');
    a.href=u; a.download='umnozhariy-progress.json'; a.click();
    setTimeout(function(){ URL.revokeObjectURL(u); },4000);
  };
  $('bakLoad').onclick=function(){ $('bakFile').click(); };
  $('bakFile').addEventListener('change',function(e){
    var f=e.target.files[0]; if(!f) return;
    var r=new FileReader();
    r.onload=function(){
      try{ if(applySnap(JSON.parse(r.result))){ pStat(); alert('Прогресс загружен.'); } else alert('Файл не подходит.'); }
      catch(err){ alert('Не удалось прочитать файл.'); }
    };
    r.readAsText(f); e.target.value='';
  });
  $('pBody').addEventListener('click',function(e){
    var b=e.target.closest('[data-p]'); if(!b) return;
    var k=b.dataset.p, d=k.slice(-1)==='+'?10:-10;
    if(k[0]==='c') ach.c=Math.max(0,ach.c+d);
    if(k[0]==='o') ach.o=Math.max(0,ach.o+d);
    if(k[0]==='g') ach.g=Math.max(0,ach.g+d);
    if(k[0]==='s'){
      if(d>0){ for(var i=0;i<STICK.length;i++) if(ach.got.indexOf(i)===-1){ ach.got.push(i); break; } }
      else ach.got.pop();
    }
    saveAch(); pStat();
  });
  $('toProgress').onclick=function(){ paintProgress(); show('progress'); };
  $('toStickers').onclick=function(){ viewSeason=null; paintSeasonBtn(); paintStickers(); show('stickers'); };
  $('reset').onclick=function(){
    if(!confirm('Стереть весь прогресс? Копия останется, откатить можно кнопкой выше.')) return;
    backup();
    facts={}; ord={}; ach={c:0,o:0,g:0,best:0,days:[],sess:0,got:[],season:1,cap:{d:'',n:0}};
    store.set('umn:facts',facts); store.set('umn:ord',ord); saveAch(); pStat();
  };
}

/* ══ список тем на главном экране ══ */
var NEW={zehner:{lvls:[['1','Mal · 6 · 40'],['2','Geteilt · 240 : 6'],['3','Vermischt']]},
         teiler:{lvls:[['1','Vielfache'],['2','Teiler'],['3','Vermischt']]},
         rest:  {lvls:[['1','Ergebnis und Rest'],['2','Nur der Rest'],['3','Rückwärts']]},
         double:{lvls:[['1','Verdoppeln'],['2','Halbieren'],['3','Vermischt']]},
         geld:  {lvls:[['1','ct in Euro'],['2','Zusammenrechnen'],['3','Rückgeld']]},
         laenge:{lvls:[['1','Einfach umwandeln'],['2','Gemischte Längen'],['3','Vergleichen']]},
         gewicht:{lvls:[['1','Einfach umwandeln'],['2','Gemischte Gewichte'],['3','Vergleichen']]},
         zeit:  {lvls:[['1','Umwandeln'],['2','Uhr lesen'],['3','Zeitspannen']]}};
var NCFG={zehner:'umn:cfg4', teiler:'umn:cfg5', rest:'umn:cfg6', double:'umn:cfg7', geld:'umn:cfg8', laenge:'umn:cfg9', gewicht:'umn:cfg10', zeit:'umn:cfg11'};
function nCfg(id){ return id==='zehner'?cfg4:id==='teiler'?cfg5:id==='rest'?cfg6:id==='double'?cfg7:id==='geld'?cfg8:id==='laenge'?cfg9:id==='gewicht'?cfg10:cfg11; }
function nSave(id){ store.set(NCFG[id], nCfg(id)); }
var curNew=null;

function paintTopics(){
  var html='', i;
  for(i=0;i<TOPICS.length;i++){
    var T=TOPICS[i], open=tpOpen(T.id);
    var sub = open ? T.ru : tpNeed(TOPICS[i-1].id).map(function(x){ return x.lab+' '+x.a+'/'+x.b; }).join(' · ');
    html+='<button class="topic'+(open?'':' soon')+'" data-t="'+T.id+'"'+(open?'':' disabled')+'>'
        + '<span class="ic">'+(open?'▸':'🔒')+'</span>'
        + '<span><b>'+T.de+'</b><small>'+(open?sub:'Откроется после темы «'+TOPICS[i-1].de+'»: '+sub)+'</small></span></button>';
  }
  $('topicList').innerHTML=html;
}
function openTopic(id){
  if(id==='table'){ paintChips(); show('setupTable'); return; }
  if(id==='order'){ paintOrderChips(); show('setupOrder'); return; }
  if(id==='geo'){ paintGeoChips(); show('geo'); return; }
  curNew=id; paintNew(); show('setupNew');
}
function paintNew(){
  var id=curNew, T, i;
  for(i=0;i<TOPICS.length;i++) if(TOPICS[i].id===id) T=TOPICS[i];
  var c=nCfg(id), L=NEW[id].lvls;
  $('nTitle').textContent=T.de;
  $('nSub').textContent=T.ru;
  $('nlev').innerHTML=L.map(function(x){
    return '<button class="chip wide" data-l="'+x[0]+'" aria-pressed="'+(+x[0]===c.lvl)+'">'+x[1]+'</button>'; }).join('');
  var els=document.querySelectorAll('#nlen .chip');
  for(i=0;i<els.length;i++) els[i].setAttribute('aria-pressed', +els[i].dataset.len===c.len);
  var n=tpNeed(id);
  $('nHint').textContent = tpDone(id) ? 'Ступень освоена — следующая тема открыта.'
    : 'До следующей темы: '+n.map(function(x){ return x.lab+' '+x.a+'/'+x.b; }).join(' · ');
}
function paintUnlock(){
  var html='', i;
  for(i=0;i<TOPICS.length;i++){
    var T=TOPICS[i];
    if(T.open){ html+='<div class="prow"><div class="lab"><span>'+T.de+'</span><span>всегда открыта</span></div></div>'; continue; }
    var on=!!(ach.unlock&&ach.unlock[T.id]), done=tpDone(T.id);
    html+='<div class="row" style="margin-top:8px"><button class="ghost" data-u="'+T.id+'" style="margin:0">'
        + (on?'✓ ':'')+T.de+(done?' (освоена)':'')+'</button></div>';
  }
  $('unlockList').innerHTML=html;
}
function wire_new(){
  $('topicList').addEventListener('click',function(e){
    var b=e.target.closest('.topic'); if(!b||b.disabled) return; openTopic(b.dataset.t); });
  $('nlev').addEventListener('click',function(e){
    var b=e.target.closest('.chip'); if(!b) return;
    nCfg(curNew).lvl=+b.dataset.l; nSave(curNew); paintNew(); });
  $('nlen').addEventListener('click',function(e){
    var b=e.target.closest('.chip'); if(!b) return;
    nCfg(curNew).len=+b.dataset.len; nSave(curNew); paintNew(); });
  $('nPlay').onclick=function(){ startSession(curNew,null); };
  $('nLesson').onclick=function(){ L2={id:curNew,i:0}; show('lesson'); renderLesson2(); };
  $('unlockList').addEventListener('click',function(e){
    var b=e.target.closest('[data-u]'); if(!b) return;
    if(!ach.unlock) ach.unlock={};
    ach.unlock[b.dataset.u]=!ach.unlock[b.dataset.u];
    saveAch(); paintUnlock(); paintTopics(); });
}

/* ══ итоги матча ══ */
function finishMatch(){
  if(S.finished) return; S.finished=true;
  var L=lg(), res=lgPlayRound(L, S.right);
  L.last=today(); lgSave(L);
  /* мячи за матч — в пределах дневной нормы, поровну по затронутым направлениям */
  if(ach.cap.d!==today()) ach.cap={d:today(), n:0};
  var give=Math.max(0, Math.min(LG_BALLS, DAY_CAP-ach.cap.n));
  if(give){
    ach.cap.n+=give; ach.c+=give;
    var ds=Object.keys(S.dirs||{}), share=Math.floor(give/Math.max(1,ds.length)), i;
    ach.dir=ach.dir||{};
    for(i=0;i<ds.length;i++) ach.dir[ds[i]]=(ach.dir[ds[i]]||0)+share;
  }
  ach.sess++; saveAch(); backup();
  var pos=lgPos(L);
  $('stars').textContent = res.sc.p===3 ? '⚽' : res.sc.p===1 ? '🤝' : '💤';
  $('rScore').textContent = res.sc.g[0]+' : '+res.sc.g[1];
  $('rTime').innerHTML = '<b>'+res.sc.t+'</b> · '+S.right+' von '+S.total+' richtig<br>'
    + L.team+' — '+pos+'-е место, '+L.pts+' Punkte'
    + (give<LG_BALLS ? '<br>Норма дня выбрана, мячей начислено '+give : '<br>+'+give+' мячей');
  var box=$('missBox');
  if(S.wrong && S.wrong.length){
    box.classList.remove('hidden');
    $('missList').innerHTML=S.wrong.map(function(x){ return '<span class="miss">'+x+'</span>'; }).join('');
  } else box.classList.add('hidden');
  $('repeatErr').classList.add('hidden');
  $('again').textContent='К таблице';
  if(res.sc.p===3) sndWin(); else beep(660,.15);
  show('result');
}

/* ══ смена сезона ══ */
function startSeason(n){
  ach.arch=ach.arch||{};
  ach.arch[season()]={c:ach.c, o:ach.o, g:ach.g, dir:ach.dir||{}, got:ach.got.slice(), ended:today()};
  ach.season=n; ach.c=0; ach.o=0; ach.g=0; ach.dir={}; ach.got=[];
  saveAch(); backup();
}
function seasonDone(){ return ach.got.length>=stickList().length; }

/* ══ отчёт по успеваемости ══ */
var repOpen={};
function fmtDate(d){
  if(!d) return '—';
  var t=today();
  if(d===t) return 'сегодня';
  var p=d.split('-'), y=new Date(+p[0],+p[1]-1,+p[2]);
  var diff=Math.round((new Date(t.split('-')[0],t.split('-')[1]-1,t.split('-')[2])-y)/86400000);
  if(diff===1) return 'вчера';
  if(diff<7) return diff+' дн. назад';
  return p[2]+'.'+p[1];
}
function fmtTime(sec){
  if(sec<60) return sec+' с';
  var m=Math.round(sec/60);
  return m<60 ? m+' мин' : Math.floor(m/60)+' ч '+(m%60)+' мин';
}
function weekBars(log){
  var out='', i, max=1, days=[], d, k;
  for(i=6;i>=0;i--){
    d=new Date(); d.setDate(d.getDate()-i);
    k=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
    var L=log[k]||[0,0];
    days.push({k:k, n:L[0], ok:L[1], lab:['вс','пн','вт','ср','чт','пт','сб'][d.getDay()]});
    if(L[0]>max) max=L[0];
  }
  days.forEach(function(x){
    var h=Math.round(x.n/max*40);
    var acc=x.n?Math.round(x.ok/x.n*100):0;
    out+='<div title="'+x.n+' ответов, '+acc+'%"><i style="height:'+h+'px;background:'
       + (x.n===0?'#E8EFF6':acc>=85?'#128C5A':acc>=65?'#B7E4CD':'#F7E0A8')+'"></i><span>'+x.lab+'</span></div>';
  });
  return '<div class="week">'+out+'</div>';
}
function repRow(T){
  var s=tpStats(T.id), open=!!repOpen[T.id];
  var head=s.total ? s.acc+'% · '+s.total+' отв. · '+fmtDate(s.last) : 'ещё не начата';
  var html='<div class="rep"><button class="rh" data-r="'+T.id+'"><i>'+(open?'▾':'▸')+'</i>'
         + '<b>'+T.de+'</b><small>'+head+'</small></button>';
  if(open){
    html+='<div class="rb">';
    if(!s.total) html+='По этой теме ещё нет ответов.';
    else{
      var trend = s.lastN>=10 ? (s.accLast>s.acc+5?' ↗':s.accLast<s.acc-5?' ↘':'') : '';
      html+='<table>'
        + '<tr><td>Точность за всё время</td><td>'+s.acc+'%</td></tr>'
        + '<tr><td>За последние '+s.lastN+' ответов</td><td>'+s.accLast+'%'+trend+'</td></tr>'
        + '<tr><td>Ответов: верных / ошибок</td><td>'+s.right+' / '+s.wrong+'</td></tr>'
        + '<tr><td>Дней занятий</td><td>'+s.days+'</td></tr>'
        + '<tr><td>Время в теме</td><td>'+fmtTime(s.time)+'</td></tr>'
        + '<tr><td>Время на ответ (медиана)</td><td>'+(s.med?s.med.toFixed(1)+' с':'—')+'</td></tr>';
      if(s.slow) html+='<tr><td>Ответов дольше 10 с</td><td>'+s.slow+'</td></tr>';
      if(s.wFast+s.wSlow) html+='<tr><td>Ошибки: наспех / вдумчиво</td><td>'+s.wFast+' / '+s.wSlow+'</td></tr>';
      html+='</table>';
      if(s.med){
        html+='<p style="margin:8px 0 0">'+(s.med<=4?'Отвечает по памяти — тема автоматизирована.'
          : s.med<=8?'Считает, но уверенно. Автоматизации пока нет.'
          : 'Каждый пример пересчитывает заново — нужно больше повторений.')+'</p>';
      }
      if(s.wFast>s.wSlow && s.wFast>=3)
        html+='<p style="margin:6px 0 0; color:var(--no)">Много ошибок наспех — похоже, торопится или тычет наугад.</p>';
      if(s.bad.length){
        html+='<h4>Чаще всего ошибается</h4><div class="badq">'
            + s.bad.map(function(b){ return '<span>'+b.q+(b.n>1?' ×'+b.n:'')+'</span>'; }).join('')+'</div>';
      }
      html+='<h4>Неделя</h4>'+weekBars(s.log);
    }
    html+='</div>';
  }
  return html+'</div>';
}
function paintReport(){
  var html='', i;
  for(i=0;i<TOPICS.length;i++) html+=repRow(TOPICS[i]);
  $('report').innerHTML=html;
}
function wire_season(){
  $('seasonTabs').addEventListener('click',function(e){
    var b=e.target.closest('[data-s]'); if(!b) return;
    viewSeason=+b.dataset.s; paintStickers();
  });
  $('newSeason').onclick=function(){
    if(!confirm('Начать второй сезон? Мячи обнулятся, первый сезон уедет в архив, награды останутся.')) return;
    startSeason(2); viewSeason=null; paintStickers(); paintReport();
  };
}
function paintSeasonBtn(){
  $('newSeason').classList.toggle('hidden', !(season()===1 && seasonDone()));
}
function wire_report(){
  $('report').addEventListener('click',function(e){
    var b=e.target.closest('[data-r]'); if(!b) return;
    var k=b.dataset.r; repOpen[k]=!repOpen[k]; paintReport();
  });
}
