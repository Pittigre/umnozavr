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
var DAY_CAP = 80;
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
var SEASON = 1;
var STICK = [
  {n:'Дебют',       b:25},
  {n:'Первый мяч',  b:60},
  {n:'В основе',    b:110},
  {n:'Полузащита',  b:170},
  {n:'Плеймейкер',  b:240},
  {n:'Бомбардир',   b:310, o:60},
  {n:'Диспетчер',   b:380, o:100},
  {n:'Лидер атаки', b:440, o:120},
  {n:'Мастер поля', b:800,  m:56, o:260, g:60},
  {n:'Капитан',     b:1300, m:64, o:380, g:140}
];
/* прогресс к стикеру: доля по самому отстающему условию */
function stParts(st){
  var out=[{lab:'мячи', a:Math.min(ach.c,st.b), b:st.b}];
  if(st.m) out.push({lab:'карта', a:Math.min(known(),st.m), b:st.m});
  if(st.o) out.push({lab:'порядок действий', a:Math.min(ach.o,st.o), b:st.o});
  if(st.g) out.push({lab:'геометрия', a:Math.min(ach.g,st.g), b:st.g});
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
function stFile(i){ return 'stickers/'+(i+1<10?'0':'')+(i+1)+'.png'; }
function stImg(i, got){
  return '<img src="'+(got?stFile(i):'stickers/locked.png')+'" alt="" onerror="this.style.display=\'none\'">';
}
function checkStickers(){
  var fresh=[],i;
  for(i=0;i<STICK.length;i++){
    if(ach.got.indexOf(i)>-1) continue;
    if(stReady(STICK[i])){ ach.got.push(i); fresh.push(i); }
  }
  if(fresh.length) saveAch();
  return fresh;
}
function award(list){
  if(!list.length) return false;
  var i=list.shift();
  $('wPic').innerHTML = stImg(i,true)+'<span>'+(i+1)+'</span>';
  $('wName').textContent = STICK[i].n;
  $('wNeed').textContent = stNeed(STICK[i]);
  $('wrap').classList.remove('hidden');
  sndWin();
  $('wOk').onclick=function(){
    $('wrap').classList.add('hidden');
    if(!award(list)) show('result');
  };
  return true;
}
function paintStickers(){
  var html='',i,next='';
  for(i=0;i<STICK.length;i++){
    var st=STICK[i], got=ach.got.indexOf(i)>-1;
    html += '<div class="st'+(got?' got':' lock')+'" data-i="'+i+'">'
          + '<div class="pic">'+stImg(i,got)+'<span>'+(i+1)+'</span></div>'
          + '<b>'+(got?st.n:'Стикер '+(i+1))+'</b>'
          + '<small>'+(got?'Открыт':stNeed(st))+'</small>'
          + (got?'':'<div class="track"><i style="width:'+stPct(st)+'%"></i></div>')
          + '</div>';
    if(!got && !next){
      next = stParts(st).map(function(x){ return x.lab+' '+x.a+'/'+x.b; }).join(' · ');
    }
  }
  $('stGrid').innerHTML=html;
  $('stTitle').textContent='Награды — '+ach.got.length+' из 10';
  $('stNext').textContent = ach.got.length===10 ? 'Все награды сезона собраны!' : 'Следующая: '+next;
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
    x.fillText(STICK[i].n, W/2, 760);
    x.fillStyle='#1B2A3A'; x.font='700 34px Segoe UI, sans-serif';
    x.fillText('Награда открыта!', W/2, 815);
    x.fillStyle='#5A6E85'; x.font='400 28px Segoe UI, sans-serif';
    x.fillText(stNeed(STICK[i]), W/2, 866);
    x.fillText('Умножарий · сезон '+SEASON, W/2, 930);
    cv.toBlob(function(bl){ cb(bl); }, 'image/png');
  };
  img.src=stFile(i);
}


/* ── экраны ── */
var SCREENS=['topics','setupTable','setupOrder','setupNew','game','result','progress','stickers','geo','lesson','parent'];
function show(id){
  SCREENS.forEach(function(s){ $(s).classList.toggle('hidden', s!==id); });
  window.scrollTo(0,0);
}

/* ── клавиатура ── */
function typeIn(d){
  if(S.locked) return;
  if(d===null) S.typed=S.typed.slice(0,-1);
  else if(S.typed.length<3) S.typed+=d;
  paintAnswer();
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
            topic==='geo'?cfg3.len:nCfg(topic).len)};
  show('game'); nextQuestion();
}
function nextQuestion(){
  if(S.i>=S.total) return finish();
  S.q = S.queue ? S.queue[S.i] :
        (S.topic==='table' ? buildTable() : S.topic==='order' ? buildOrder() :
         S.topic==='geo' ? buildGeo() : S.topic==='zehner' ? buildZehner() : buildTeiler());
  S.typed=''; S.locked=false;
  S.phase = S.q.kind==='order' ? 'pick' : 'calc';
  if(S.q.kind==='geo') geoPic(S.q); else $('gPic').classList.add('hidden');
  $('task').innerHTML = S.q.text;
  $('task').classList.remove('pop'); void $('task').offsetWidth; $('task').classList.add('pop');
  $('step0').textContent = S.q.given || '';
  $('verdict').textContent=''; $('verdict').className='verdict';
  $('stage').className='stage';
  $('pbar').style.width=(S.i/S.total*100)+'%';
  $('streak').textContent = S.streak>=3 ? '🔥 '+S.streak : '';
  paintAnswer();
  layout();
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
  S.locked=true;
  var good = val===S.q.ans;
  if(S.q.kind==='num') markFact(S.q.a,S.q.b,good); else if(S.q.kind==='order') markOrd(S.q.id, good?'c':'w');
  if(S.q.topic) tpMark(S.q.topic, good);

  if(good){
    S.right++; S.streak++; S.best=Math.max(S.best,S.streak);
    if(S.count){
      var pts = S.topic==='table' ? 1 : 2;
      if(ach.cap.d!==today()) ach.cap={d:today(), n:0};
      var left = DAY_CAP - ach.cap.n;
      var give = Math.max(0, Math.min(pts, left));
      if(give){
        ach.cap.n += give; ach.c += give;
        if(S.topic==='order') ach.o += give;
        if(S.topic==='geo')   ach.g += give;
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
    var shown=S.q.ans;
    if(S.q.opts){ S.q.opts.forEach(function(o){ if(o[1]===S.q.ans) shown=o[0]; }); }
    else if(S.q.kind==='geo') shown=S.q.ans+' '+S.q.unit;
    $('verdict').innerHTML='Правильный ответ — <b>'+shown+'</b>';
    if($('answer').style.display!=='none'){ $('answer').className='answer'; $('answer').textContent=val; }
    sndNo();
  }
  S.picked=false;
  S.i++; $('pbar').style.width=(S.i/S.total*100)+'%';
  setTimeout(nextQuestion, good?550:1600);
}

function finish(){
  var sec=Math.round((Date.now()-S.t0)/1000);
  var pct=S.total?S.right/S.total:0;
  var n=pct>=.95?3:pct>=.8?2:pct>=.6?1:0;
  $('stars').textContent='★★★'.slice(0,n)+'☆☆☆'.slice(0,3-n);
  $('rScore').textContent=S.right+'/'+S.total;
  $('rTime').textContent='за '+Math.floor(sec/60)+' мин '+(sec%60)+' с'+(S.best>=3?' · лучшая серия '+S.best:'');
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
  paintUnlock();
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
  paintChips(); paintOrderChips(); paintGeoChips(); paintTopics();
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
    $('vName').textContent = got ? STICK[i].n : 'Ещё не открыт';
    $('vNeed').textContent = got ? stNeed(STICK[i]) : stParts(STICK[i]).map(function(x){ return x.lab+' '+x.a+'/'+x.b; }).join(' · ');
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
    if(k==='⌫') typeIn(null); else if(k==='✓') submit(S.typed===''?null:+S.typed); else typeIn(k);
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
    else if(e.key==='Enter') submit(S.typed===''?null:+S.typed);
  });
  $('playTable').onclick=function(){ startSession('table',null); };
  $('playOrder').onclick=function(){ startSession('order',null); };
  $('again').onclick=function(){ startSession(S.topic,null); };
  $('repeatErr').onclick=function(){ startSession(S.topic, S.mistakes.slice()); };
  $('quit').onclick=function(){ show('topics'); };
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
  $('toStickers').onclick=function(){ paintStickers(); show('stickers'); };
  $('reset').onclick=function(){
    if(!confirm('Стереть весь прогресс? Копия останется, откатить можно кнопкой выше.')) return;
    backup();
    facts={}; ord={}; ach={c:0,o:0,g:0,best:0,days:[],sess:0,got:[],season:1,cap:{d:'',n:0}};
    store.set('umn:facts',facts); store.set('umn:ord',ord); saveAch(); pStat();
  };
}

/* ══ список тем на главном экране ══ */
var NEW={zehner:{cfg:null, lvls:[['1','Mal · 6 · 40'],['2','Geteilt · 240 : 6'],['3','Vermischt']]},
         teiler:{cfg:null, lvls:[['1','Vielfache'],['2','Teiler'],['3','Vermischt']]}};
function nCfg(id){ return id==='zehner'?cfg4:cfg5; }
function nSave(id){ store.set(id==='zehner'?'umn:cfg4':'umn:cfg5', nCfg(id)); }
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
