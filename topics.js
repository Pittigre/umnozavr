/* ── тема 1: таблица ── */
function key(a,b){ return Math.min(a,b)+'x'+Math.max(a,b); }
function stat(a,b){ return facts[key(a,b)] || {c:0,w:0}; }
function markFact(a,b,good){
  var k=key(a,b), f=facts[k]||{c:0,w:0};
  if(good) f.c++; else f.w++;
  f.h = ((f.h||'')+(good?'1':'0')).slice(-5);
  f.d = f.d || [];
  if(good){
    var t=today();
    if(f.d.indexOf(t)===-1) f.d.push(t);        // засчитываем день
  } else {
    var t=today(), ix=f.d.indexOf(t);            // ошибка снимает только сегодняшний зачёт
    if(ix>-1) f.d.splice(ix,1);
  }
  facts[k]=f; store.set('umn:facts',facts);
}
/* освоено: верные ответы в три разных дня и не больше одной ошибки из последних пяти */
function mastered(f){
  if(!f.d || f.d.length<3) return false;
  var h=f.h||'', w=0, i;
  for(i=0;i<h.length;i++) if(h[i]==='0') w++;
  return w<=1;
}
/* пары, которым не хватает дня — подмешиваем их в каждый четвёртый пример */
function needDay(){
  var out=[],a,b;
  for(a=2;a<=9;a++) for(b=a;b<=9;b++){
    if(cfg.tables.indexOf(a)===-1 && cfg.tables.indexOf(b)===-1) continue;
    var f=stat(a,b);
    if(!mastered(f) && f.d && f.d.length && f.d.indexOf(today())===-1) out.push([a,b]);
  }
  return out;
}
function buildTable(){
  var pool=[], i, b;
  for(i=0;i<cfg.tables.length;i++){
    var a=cfg.tables[i];
    for(b=2;b<=9;b++){
      var f=stat(a,b);
      /* a×a попадает в набор один раз, a×b — дважды: выравниваем вес */
      pool.push([a,b,Math.max(.15, 1+f.w*4-Math.min(f.c,6)*.14) * (a===b?2:1)]);
    }
  }
  var total=0,j; for(j=0;j<pool.length;j++) total+=pool[j][2];
  var r=Math.random()*total, pick=pool[0];
  for(j=0;j<pool.length;j++){ r-=pool[j][2]; if(r<=0){ pick=pool[j]; break; } }
  var a=pick[0]; b=pick[1];
  if(Math.random()<.25){
    var nd=needDay();
    if(nd.length){ var q=nd[Math.floor(Math.random()*nd.length)]; a=q[0]; b=q[1]; }
  }
  var op = cfg.mode==='mix' ? (Math.random()<.5?'mul':'div') : cfg.mode;
  if(op==='mul'){
    if(Math.random()<.5){ var t=a; a=b; b=t; }
    return {kind:'num',topic:'table',a:a,b:b,op:'mul',ans:a*b,text:a+' <em>×</em> '+b,plain:a+' × '+b+' = '+(a*b)};
  }
  if(op==='find')
    return {kind:'num',topic:'table',a:a,b:b,op:'find',ans:b,
            text:(a*b)+' <em>:</em> <span class="blank"></span> <em>=</em> '+a,
            plain:(a*b)+' : '+b+' = '+a};
  return {kind:'num',topic:'table',a:a,b:b,op:'div',ans:b,text:(a*b)+' <em>:</em> '+a,plain:(a*b)+' : '+a+' = '+b};
}

/* ── тема 2: порядок действий ── */
var R = function(lo,hi){ return lo+Math.floor(Math.random()*(hi-lo+1)); };
var PAT = {
  mul_add:{lvl:1, lab:'a × b + c', make:function(){ var a=R(2,9),b=R(2,9),c=R(2,Math.min(40,100-a*b)); return c<2?null:{n:[a,b,c],o:['×','+'],br:null}; }},
  mul_sub:{lvl:1, lab:'a × b − c', make:function(){ var a=R(2,9),b=R(2,9); return a*b<4?null:{n:[a,b,R(2,a*b-1)],o:['×','−'],br:null}; }},
  add_mul:{lvl:1, lab:'c + a × b', make:function(){ var a=R(2,9),b=R(2,9),c=R(2,Math.min(40,100-a*b)); return c<2?null:{n:[c,a,b],o:['+','×'],br:null}; }},
  sub_mul:{lvl:1, lab:'c − a × b', make:function(){ var a=R(2,9),b=R(2,9),p=a*b; return p>60?null:{n:[R(p+1,Math.min(100,p+40)),a,b],o:['−','×'],br:null}; }},
  div_add:{lvl:1, lab:'q : d + c', make:function(){ var d=R(2,9),k=R(2,9); return {n:[d*k,d,R(2,Math.min(40,90-k))],o:[':','+'],br:null}; }},
  sub_div:{lvl:1, lab:'c − q : d', make:function(){ var d=R(2,9),k=R(2,9); return {n:[R(k+1,Math.min(90,k+40)),d*k,d],o:['−',':'],br:null}; }},
  br_add_mul:{lvl:2, lab:'(a + b) × c', make:function(){ var a=R(2,9),b=R(2,9),c=R(2,9); return (a+b)*c>100?null:{n:[a,b,c],o:['+','×'],br:0}; }},
  br_sub_mul:{lvl:2, lab:'(a − b) × c', make:function(){ var a=R(4,9),b=R(2,a-1),c=R(2,9); return (a-b)*c>100?null:{n:[a,b,c],o:['−','×'],br:0}; }},
  mul_br_add:{lvl:2, lab:'c × (a + b)', make:function(){ var a=R(2,9),b=R(2,9),c=R(2,9); return (a+b)*c>100?null:{n:[c,a,b],o:['×','+'],br:1}; }},
  br_add_div:{lvl:2, lab:'(a + b) : c', make:function(){ var c=R(2,9),k=R(2,9),s=c*k; if(s>72||s<6) return null; var a=R(Math.max(2,Math.floor(s*0.25)),Math.floor(s*0.75)); return {n:[a,s-a,c],o:['+',':'],br:0}; }}
};
var prec = function(o){ return (o==='×'||o===':') ? 2 : 1; };
function firstOp(e){ return e.br !== null ? e.br : (prec(e.o[0]) >= prec(e.o[1]) ? 0 : 1); }
function apply(x,o,y){ return o==='×'?x*y : o===':'?x/y : o==='+'?x+y : x-y; }
function exprText(e){
  var n=e.n,o=e.o;
  if(e.br===0) return '('+n[0]+' '+o[0]+' '+n[1]+') '+o[1]+' '+n[2];
  if(e.br===1) return n[0]+' '+o[0]+' ('+n[1]+' '+o[1]+' '+n[2]+')';
  return n[0]+' '+o[0]+' '+n[1]+' '+o[1]+' '+n[2];
}
function exprHTML(e){
  var n=e.n,o=e.o;
  var b=function(i){ return '<button class="op" data-i="'+i+'">'+o[i]+'</button>'; };
  if(e.br===0) return '<span class="grp">('+n[0]+b(0)+n[1]+')</span>'+b(1)+n[2];
  if(e.br===1) return n[0]+b(0)+'<span class="grp">('+n[1]+b(1)+n[2]+')</span>';
  return n[0]+b(0)+n[1]+b(1)+n[2];
}
function buildOrder(){
  var ids=[], id;
  for(id in PAT) if(cfg2.lvl===3 || PAT[id].lvl===cfg2.lvl) ids.push(id);
  /* чаще подкидываем шаблоны с ошибками */
  var pool=[],t=0,i;
  for(i=0;i<ids.length;i++){
    var s=ord[ids[i]]||{c:0,w:0,rc:0,rw:0};
    var w=1+(s.w+s.rw)*2.5-Math.min(s.c,6)*.1;
    pool.push(Math.max(.2,w)); t+=pool[i];
  }
  var r=Math.random()*t, chosen=ids[0];
  for(i=0;i<ids.length;i++){ r-=pool[i]; if(r<=0){ chosen=ids[i]; break; } }

  var e=null, guard=0;
  while(!e && guard++<80) e=PAT[chosen].make();
  if(!e) e={n:[R(2,9),R(2,9),R(2,20)],o:['×','+'],br:null};

  var f=firstOp(e), mid=apply(e.n[f], e.o[f], e.n[f+1]);
  var rest = f===0 ? {n:[mid,e.n[2]],o:e.o[1]} : {n:[e.n[0],mid],o:e.o[0]};
  var ans = apply(rest.n[0], rest.o, rest.n[1]);
  return {kind:'order', topic:'order', id:chosen, e:e, first:f, mid:mid, rest:rest, ans:ans,
          text:exprHTML(e), plain:exprText(e)+' = '+ans};
}
function markOrd(id, field){
  var s = ord[id] || {c:0,w:0,rc:0,rw:0};
  s[field]++; ord[id]=s; store.set('umn:ord',ord);
}

/* ── тема 3: периметр и площадь ── */
var cfg3 = store.get('umn:cfg3', {lvl:1, len:8});
function paintGeoChips(){
  var i,els;
  els=document.querySelectorAll('#glev .chip'); for(i=0;i<els.length;i++) els[i].setAttribute('aria-pressed', +els[i].dataset.g===cfg3.lvl);
  els=document.querySelectorAll('#glen .chip'); for(i=0;i<els.length;i++) els[i].setAttribute('aria-pressed', +els[i].dataset.len===cfg3.len);
  $('gHint').innerHTML = cfg3.lvl===1 ? 'Wie groß ist der Umfang? — считаем путь вокруг поля.'
    : cfg3.lvl===2 ? 'Wie groß ist der Flächeninhalt? — считаем квадраты внутри.'
    : cfg3.lvl===3 ? 'Оба вопроса вперемешку — главное не перепутать.'
    : 'A = 24 cm², a = 6 cm. Wie lang ist b? — снова нужно деление.';
}

var BLANK = '<span class="blank"></span>';
function buildGeo(){
  var a=R(2,12), b=R(2,12);
  if(b>a){ var t=a; a=b; b=t; }               // a — длинная сторона, как в тетради
  var kind = cfg3.lvl===3 ? (Math.random()<.5?'u':'a') : cfg3.lvl===1 ? 'u' : cfg3.lvl===2 ? 'a' : 'back';
  if(kind==='back'){
    var byA = Math.random()<.5;               // известна a — ищем b, и наоборот
    return {kind:'geo', topic:'geo', a:a, b:b, show:false, unit:'cm', ans:(byA?b:a),
      given:'A = '+(a*b)+' cm²,  '+(byA?'a = '+a:'b = '+b)+' cm',
      text:(byA?'b':'a')+' = '+BLANK+' cm',
      ask:(byA?'Wie lang ist b?':'Wie lang ist a?'),
      plain:'A = '+(a*b)+' cm² : '+(byA?a:b)+' = '+(byA?b:a)+' cm'};
  }
  if(kind==='u') return {kind:'geo', topic:'geo', a:a, b:b, show:true, unit:'cm', ans:2*(a+b),
    text:'U = '+BLANK+' cm',
    ask:'Wie groß ist der Umfang?', plain:'U = 2 · ('+a+' + '+b+') = '+(2*(a+b))+' cm'};
  return {kind:'geo', topic:'geo', a:a, b:b, show:true, unit:'cm²', ans:a*b,
    text:'A = '+BLANK+' cm²',
    ask:'Wie groß ist der Flächeninhalt?', plain:'A = '+a+' · '+b+' = '+(a*b)+' cm²'};
}
function geoPic(q){
  if(!q.show){ $('gPic').innerHTML=''; $('gPic').classList.add('hidden'); return; }
  $('gPic').classList.remove('hidden');
  var budget = Math.max(110, Math.round((window.innerHeight||760)*0.24));
  var cp=cellPx(q.a,q.b,budget), w=q.a*cp+122, h=q.b*cp+50;
  $('gPic').innerHTML='<svg viewBox="0 0 '+w+' '+h+'" style="width:100%;height:auto;display:block">'+field(q.a,q.b,{},0,cp)+'</svg>';
}

/* ── настройки таблицы ── */
function paintChips(){
  var i,els;
  els=document.querySelectorAll('#modes .chip'); for(i=0;i<els.length;i++) els[i].setAttribute('aria-pressed', els[i].dataset.mode===cfg.mode);
  els=document.querySelectorAll('#lengths .chip'); for(i=0;i<els.length;i++) els[i].setAttribute('aria-pressed', +els[i].dataset.len===cfg.len);
  els=document.querySelectorAll('#inputs .chip'); for(i=0;i<els.length;i++) els[i].setAttribute('aria-pressed', els[i].dataset.input===cfg.input);
  els=document.querySelectorAll('#tables .chip'); for(i=0;i<els.length;i++) els[i].setAttribute('aria-pressed', cfg.tables.indexOf(+els[i].dataset.t)>-1);
  var n=cfg.tables.length?cfg.tables[0]:7;
  $('tablesTitle').textContent = cfg.mode==='div'?'Делим на эти числа':cfg.mode==='mul'?'Умножаем на эти числа':cfg.mode==='find'?'В ответе примера стоят эти числа':'Какие числа';
  $('modeHint').innerHTML = cfg.mode==='mul'?'Например: '+n+' × 6 = <b>'+(n*6)+'</b>'
    : cfg.mode==='div'?'Например: '+(n*6)+' : '+n+' = <b>6</b> — выбранное число стоит делителем.'
    : cfg.mode==='find'?'Например: '+(n*6)+' : <b>6</b> = '+n+' — делитель спрятан, его и надо найти.'
    : 'Умножение и деление вперемешку.';
  $('playTable').disabled = !cfg.tables.length;
  $('playTable').style.opacity = cfg.tables.length?1:.45;
}

/* ── настройки порядка действий ── */
function paintOrderChips(){
  var i,els;
  els=document.querySelectorAll('#levels .chip'); for(i=0;i<els.length;i++) els[i].setAttribute('aria-pressed', +els[i].dataset.lvl===cfg2.lvl);
  els=document.querySelectorAll('#lengths2 .chip'); for(i=0;i<els.length;i++) els[i].setAttribute('aria-pressed', +els[i].dataset.len===cfg2.len);
  $('lvlHint').innerHTML = cfg2.lvl===1 ? 'Например: 18 − 2 × 6. Правило одно: умножение и деление раньше сложения и вычитания.'
    : cfg2.lvl===2 ? 'Например: (4 + 3) × 5. Скобки главнее всего.'
    : 'Со скобками и без — вперемешку.';
}


function wire_topics(){
  $('glev').addEventListener('click',function(e){ var b=e.target.closest('.chip'); if(!b) return;
    cfg3.lvl=+b.dataset.g; store.set('umn:cfg3',cfg3); paintGeoChips(); });
  $('glen').addEventListener('click',function(e){ var b=e.target.closest('.chip'); if(!b) return;
    cfg3.len=+b.dataset.len; store.set('umn:cfg3',cfg3); paintGeoChips(); });
  $('playGeo').onclick=function(){ startSession('geo',null); };
  (function(){ var box=$('tables');
    for(var n=2;n<=9;n++){ var b=document.createElement('button'); b.className='chip'; b.dataset.t=n; b.textContent=n; box.appendChild(b); }
  })();
  $('tables').addEventListener('click',function(e){
    var b=e.target.closest('.chip'); if(!b) return;
    var n=+b.dataset.t, i=cfg.tables.indexOf(n);
    if(i>-1) cfg.tables.splice(i,1); else cfg.tables.push(n);
    cfg.tables.sort(function(x,y){return x-y;}); store.set('umn:cfg',cfg); paintChips();
  });
  $('allTables').onclick=function(){ cfg.tables=[2,3,4,5,6,7,8,9]; store.set('umn:cfg',cfg); paintChips(); };
  $('hardTables').onclick=function(){
    var sc={},n,b;
    for(n=2;n<=9;n++){ sc[n]=0; for(b=2;b<=9;b++){ var f=stat(n,b); sc[n]+=f.w*2-Math.min(f.c,4)*.2; } }
    var order=[2,3,4,5,6,7,8,9].sort(function(x,y){return sc[y]-sc[x];});
    var hard=order.slice(0,4).sort(function(x,y){return x-y;});
    var any=hard.some(function(k){return sc[k]>0;});
    cfg.tables = any?hard:[6,7,8,9];
    $('hardHint').textContent = any ? 'Взяли числа с наибольшим числом ошибок: '+cfg.tables.join(', ')+'.'
                                    : 'Ошибок пока не записано — взяли самые каверзные: 6, 7, 8, 9.';
    store.set('umn:cfg',cfg); paintChips();
  };
  ['modes','lengths','inputs'].forEach(function(box){
    $(box).addEventListener('click',function(e){
      var b=e.target.closest('.chip'); if(!b) return;
      if(box==='modes') cfg.mode=b.dataset.mode;
      if(box==='lengths') cfg.len=+b.dataset.len;
      if(box==='inputs') cfg.input=b.dataset.input;
      store.set('umn:cfg',cfg); paintChips();
    });
  });
  $('levels').addEventListener('click',function(e){
    var b=e.target.closest('.chip'); if(!b) return;
    cfg2.lvl=+b.dataset.lvl; store.set('umn:cfg2',cfg2); paintOrderChips();
  });
  $('lengths2').addEventListener('click',function(e){
    var b=e.target.closest('.chip'); if(!b) return;
    cfg2.len=+b.dataset.len; store.set('umn:cfg2',cfg2); paintOrderChips();
  });
}

/* ══ реестр тем и ступени ══ */
var TOPICS=[
 {id:'table',  de:'Einmaleins',            ru:'Таблица умножения и деления', open:true},
 {id:'zehner', de:'Zehnereinmaleins',      ru:'Умножение и деление на круглые десятки'},
 {id:'teiler', de:'Vielfache und Teiler',  ru:'Кратные и делители'},
 {id:'rest',   de:'Division mit Rest',    ru:'Деление с остатком'},
 {id:'double', de:'Verdoppeln und Halbieren', ru:'Удвоение и деление пополам'},
 {id:'order',  de:'Punkt vor Strich',      ru:'Порядок действий', open:true},
 {id:'geld',   de:'Geld',                 ru:'Деньги: евро, центы, запятая'},
 {id:'laenge', de:'Längen',               ru:'Длины: mm, cm, m, km'},
 {id:'gewicht',de:'Gewichte',             ru:'Вес: g, kg, t'},
 {id:'zeit',   de:'Zeit',                 ru:'Время: часы, минуты, промежутки'},
 {id:'geo',    de:'Umfang und Fläche',     ru:'Периметр и площадь', open:true}
];
function tp(id){
  if(!ach.tp) ach.tp={};
  if(!ach.tp[id]) ach.tp[id]={c:0, h:'', days:[], lesson:0};
  return ach.tp[id];
}
/* ms — время на ответ, label — текст задания для списка проблемных */
function tpMark(id, good, ms, label){
  var t=tp(id), d=today();
  if(good){ t.c++; if(t.days.indexOf(d)===-1) t.days.push(d); } else t.w=(t.w||0)+1;
  t.h=((t.h||'')+(good?'1':'0')).slice(-20);

  if(ms>0 && ms<180000){
    t.ms=(t.ms||0)+ms;                                  // суммарное время
    t.times=(t.times||[]); t.times.push(Math.round(ms/100)); // децисекунды, для медианы
    if(t.times.length>200) t.times=t.times.slice(-200);
    if(ms>10000) t.slow=(t.slow||0)+1;                  // ответов дольше 10 с
    if(!good){ if(ms<2500) t.wFast=(t.wFast||0)+1; else t.wSlow=(t.wSlow||0)+1; }
  }
  if(!good && label){                                    // проблемные задания
    t.bad=t.bad||{};
    t.bad[label]=(t.bad[label]||0)+1;
    var keys=Object.keys(t.bad);
    if(keys.length>30){
      keys.sort(function(a,b){ return t.bad[a]-t.bad[b]; });
      delete t.bad[keys[0]];
    }
  }
  t.log=t.log||{};                                       // динамика по дням
  var L=t.log[d]||[0,0]; L[0]++; if(good) L[1]++; t.log[d]=L;
  var ds=Object.keys(t.log).sort();
  while(ds.length>30){ delete t.log[ds.shift()]; }
  t.last=d;
  saveAch();
}
function median(arr){
  if(!arr||!arr.length) return 0;
  var a=arr.slice().sort(function(x,y){ return x-y; });
  var m=Math.floor(a.length/2);
  return (a.length%2 ? a[m] : (a[m-1]+a[m])/2)/10;       // секунды
}
function tpStats(id){
  var t=tp(id), h=t.h||'', ok=0, i;
  for(i=0;i<h.length;i++) if(h[i]==='1') ok++;
  var tot=t.c+(t.w||0);
  var bad=Object.keys(t.bad||{}).sort(function(a,b){ return t.bad[b]-t.bad[a]; }).slice(0,5);
  return {
    total:tot, right:t.c, wrong:t.w||0,
    acc: tot? Math.round(t.c/tot*100) : 0,
    accLast: h.length? Math.round(ok/h.length*100) : 0, lastN:h.length,
    days:t.days.length, last:t.last||'', lesson:t.lesson,
    time:Math.round((t.ms||0)/1000), med:median(t.times),
    slow:t.slow||0, wFast:t.wFast||0, wSlow:t.wSlow||0,
    bad:bad.map(function(k){ return {q:k, n:t.bad[k]}; }),
    log:t.log||{}
  };
}
/* ступень освоена: урок пройден, 60 верных ответов, 8 из последних 10, три разных дня */
function hasLesson(id){ return typeof LESSONS!=='undefined' && !!LESSONS[id]; }
function tpDone(id){
  var t=tp(id), h=(t.h||'').slice(-10), ok=0, i;
  for(i=0;i<h.length;i++) if(h[i]==='1') ok++;
  if(hasLesson(id) && t.lesson!==1) return false;
  return t.c>=60 && h.length>=10 && ok>=8 && t.days.length>=3;
}
function tpOpen(id){
  var i, T;
  for(i=0;i<TOPICS.length;i++) if(TOPICS[i].id===id) T=TOPICS[i], void 0;
  if(!T) return true;
  if(T.open) return true;
  if(ach.unlock && ach.unlock[id]) return true;
  for(i=0;i<TOPICS.length;i++) if(TOPICS[i].id===id) return i>0 ? tpDone(TOPICS[i-1].id) : true;
  return true;
}
function tpNeed(id){
  var t=tp(id), h=(t.h||'').slice(-10), ok=0, i, out=[];
  for(i=0;i<h.length;i++) if(h[i]==='1') ok++;
  if(hasLesson(id)) out.push({lab:'урок', a:t.lesson, b:1});
  out.push({lab:'верных ответов', a:Math.min(t.c,60), b:60});
  out.push({lab:'верных из последних 10', a:h.length>=10?ok:0, b:8});
  out.push({lab:'дней занятий', a:Math.min(t.days.length,3), b:3});
  return out;
}

/* ══ тема: Zehnereinmaleins ══ */
var cfg4 = store.get('umn:cfg4', {lvl:1, len:10});
function buildZehner(){
  var a=R(2,9), b=R(2,9), z=b*10, p=a*z;
  var kind = cfg4.lvl===1 ? 'mul' : cfg4.lvl===2 ? 'div' : (Math.random()<.5?'mul':'div');
  if(kind==='mul'){
    var flip=Math.random()<.5;
    return {kind:'plain', topic:'zehner', ans:p,
      text:(flip? z+' <em>·</em> '+a : a+' <em>·</em> '+z),
      plain:(flip? z+' · '+a : a+' · '+z)+' = '+p};
  }
  var byZ=Math.random()<.5;                       // делим на десятки или на однозначное
  return {kind:'plain', topic:'zehner', ans:(byZ?a:z),
    text:p+' <em>:</em> '+(byZ?z:a),
    plain:p+' : '+(byZ?z:a)+' = '+(byZ?a:z)};
}

/* ══ тема: Vielfache und Teiler ══ */
var cfg5 = store.get('umn:cfg5', {lvl:1, len:10});
function buildTeiler(){
  var kind = cfg5.lvl===1 ? 'reihe' : cfg5.lvl===2 ? 'teiler' : (Math.random()<.5?'reihe':'teiler');
  if(kind==='reihe'){                              // пропущенное кратное в ряду
    var n=R(2,9), pos=R(3,7), miss=n*pos, seq=[], i;
    for(i=1;i<=5;i++) seq.push(n*(pos-3+i));
    var idx=R(1,3);
    var shown=seq.map(function(v,k){ return k===idx ? BLANK : v; });
    return {kind:'plain', topic:'teiler', ans:seq[idx],
      ask:'Welches Vielfache fehlt?',
      text:shown.join(' <em>,</em> '),
      plain:'Vielfache von '+n+': '+seq.join(', ')};
  }
  var d=R(2,9), m=R(2,9), yes=Math.random()<.5;
  var num = yes ? d*m : d*m+R(1,d-1);
  return {kind:'plain', topic:'teiler', ans:(yes?1:0), opts:[['Ja',1],['Nein',0]],
    ask:'Ist '+d+' ein Teiler von '+num+'?',
    text:num+' <em>:</em> '+d+' <em>=</em> ?',
    plain:'Ist '+d+' ein Teiler von '+num+'? '+(yes?'Ja':'Nein')};
}

/* ══ тема: Division mit Rest ══ */
var cfg6 = store.get('umn:cfg6', {lvl:1, len:10});
function buildRest(){
  var d=R(2,9), q=R(2,9), r=R(1,d-1), n=d*q+r;
  var lvl = cfg6.lvl;
  if(lvl===2)                                   // спрашиваем только остаток
    return {kind:'plain', topic:'rest', ans:r, ask:'Wie groß ist der Rest?',
      text:n+' <em>:</em> '+d+' <em>=</em> '+q+' R '+BLANK,
      plain:n+' : '+d+' = '+q+' R '+r};
  if(lvl===3)                                   // обратная: найти делимое
    return {kind:'plain', topic:'rest', ans:n, ask:'Welche Zahl wurde geteilt?',
      text:BLANK+' <em>:</em> '+d+' <em>=</em> '+q+' R '+r,
      plain:n+' : '+d+' = '+q+' R '+r};
  return {kind:'rest', topic:'rest', two:true, d:d, q:q, r:r, ans:q, ans2:r,
    ask:'Wie oft passt die '+d+' hinein?',
    text:n+' <em>:</em> '+d+' <em>=</em> '+BLANK,
    ask2:'Was bleibt übrig?',
    text2:n+' <em>:</em> '+d+' <em>=</em> '+q+' R '+BLANK,
    full:q+' R '+r,
    plain:n+' : '+d+' = '+q+' R '+r};
}

/* ══ тема: Verdoppeln und Halbieren ══ */
var cfg7 = store.get('umn:cfg7', {lvl:1, len:10});
function buildDouble(){
  var lvl = cfg7.lvl===3 ? (Math.random()<.5?1:2) : cfg7.lvl;
  if(lvl===1){
    var n = Math.random()<.5 ? R(2,50) : R(2,9)*10 + R(0,9);
    return {kind:'plain', topic:'double', ans:2*n, ask:'Verdopple die Zahl.',
      text:'das Doppelte von '+n+' <em>=</em> '+BLANK, plain:'das Doppelte von '+n+' = '+(2*n)};
  }
  var h=R(2,100), m=2*h;
  return {kind:'plain', topic:'double', ans:h, ask:'Halbiere die Zahl.',
    text:'die Hälfte von '+m+' <em>=</em> '+BLANK, plain:'die Hälfte von '+m+' = '+h};
}

/* ══ тема: Geld ══ */
var cfg8 = store.get('umn:cfg8', {lvl:1, len:10});
function eu(c){ return (Math.floor(c/100))+','+('0'+(c%100)).slice(-2)+' €'; }
function buildGeld(){
  var lvl=cfg8.lvl;
  if(lvl===1){                                   // ct → € и ct, два поля
    var c=R(1,9)*100 + R(0,19)*5;
    return {kind:'plain', topic:'geld', two:true, ans:Math.floor(c/100), ans2:c%100,
      ask:'Wie viele Euro sind das?',
      text:c+' ct <em>=</em> '+BLANK+' €',
      ask2:'Und wie viele Cent bleiben?',
      text2:c+' ct <em>=</em> '+Math.floor(c/100)+' € '+BLANK+' ct',
      full:eu(c), plain:c+' ct = '+eu(c)};
  }
  if(lvl===2){                                   // сложение сумм, ввод с запятой
    var a=R(1,8)*100+R(0,19)*5, b=R(1,8)*100+R(0,19)*5;
    return {kind:'plain', topic:'geld', comma:true, maxLen:6, ans:a+b,
      ask:'Rechne zusammen.',
      text:eu(a)+' <em>+</em> '+eu(b)+' <em>=</em> '+BLANK,
      plain:eu(a)+' + '+eu(b)+' = '+eu(a+b)};
  }
  var pay=R(5,20)*100, cost=R(1,pay/100-1)*100+R(1,19)*5;   // сдача
  return {kind:'plain', topic:'geld', comma:true, maxLen:6, ans:pay-cost,
    ask:'Wie viel Rückgeld bekommst du?',
    text:eu(pay)+' <em>−</em> '+eu(cost)+' <em>=</em> '+BLANK,
    plain:eu(pay)+' − '+eu(cost)+' = '+eu(pay-cost)};
}

/* ══ тема: Längen ══ */
var cfg9 = store.get('umn:cfg9', {lvl:1, len:10});
function buildLaenge(){
  var lvl=cfg9.lvl;
  var U=[['cm','mm',10],['m','cm',100],['km','m',1000]];
  var u=U[R(0,2)];
  if(lvl===1){                                   // простой перевод
    var n=R(2,9);
    return {kind:'plain', topic:'laenge', ans:n*u[2],
      ask:'Wandle um.',
      text:n+' '+u[0]+' <em>=</em> '+BLANK+' '+u[1],
      plain:n+' '+u[0]+' = '+(n*u[2])+' '+u[1]};
  }
  if(lvl===2){                                   // смешанная запись, туда и обратно
    var a=R(1,9), b=R(1,u[2]-1);
    if(u[2]===1000) b=R(1,9)*100+R(0,9)*10;
    var tot=a*u[2]+b;
    if(Math.random()<.5)
      return {kind:'plain', topic:'laenge', ans:tot,
        ask:'Wandle um.',
        text:a+' '+u[0]+' '+b+' '+u[1]+' <em>=</em> '+BLANK+' '+u[1],
        plain:a+' '+u[0]+' '+b+' '+u[1]+' = '+tot+' '+u[1]};
    return {kind:'plain', topic:'laenge', two:true, ans:a, ans2:b,
      ask:'Wie viele '+u[0]+' sind das?',
      text:tot+' '+u[1]+' <em>=</em> '+BLANK+' '+u[0],
      ask2:'Und wie viele '+u[1]+' bleiben?',
      text2:tot+' '+u[1]+' <em>=</em> '+a+' '+u[0]+' '+BLANK+' '+u[1],
      full:a+' '+u[0]+' '+b+' '+u[1], plain:tot+' '+u[1]+' = '+a+' '+u[0]+' '+b+' '+u[1]};
  }
  var x=R(1,9)*u[2]+R(0,u[2]-1), y=Math.random()<.35 ? x : R(1,9)*u[2]+R(0,u[2]-1);
  var sign = x<y?0 : x===y?1 : 2;
  return {kind:'plain', topic:'laenge', ans:sign, opts:[['<',0],['=',1],['>',2]],
    ask:'Vergleiche.',
    text:x+' '+u[1]+' <em>?</em> '+Math.floor(y/u[2])+' '+u[0]+' '+(y%u[2])+' '+u[1],
    plain:x+' '+u[1]+' '+['<','=','>'][sign]+' '+Math.floor(y/u[2])+' '+u[0]+' '+(y%u[2])+' '+u[1]};
}

/* ══ тема: Gewichte ══ */
var cfg10 = store.get('umn:cfg10', {lvl:1, len:10});
function buildGewicht(){
  var lvl=cfg10.lvl, U=Math.random()<.65 ? ['kg','g',1000] : ['t','kg',1000];
  if(lvl===1){
    var n=R(2,9);
    return {kind:'plain', topic:'gewicht', ans:n*U[2], ask:'Wandle um.',
      text:n+' '+U[0]+' <em>=</em> '+BLANK+' '+U[1],
      plain:n+' '+U[0]+' = '+(n*U[2])+' '+U[1]};
  }
  if(lvl===2){
    var a=R(1,9), b=R(1,9)*100+R(0,9)*10, tot=a*U[2]+b;
    if(Math.random()<.5)
      return {kind:'plain', topic:'gewicht', ans:tot, ask:'Wandle um.',
        text:a+' '+U[0]+' '+b+' '+U[1]+' <em>=</em> '+BLANK+' '+U[1],
        plain:a+' '+U[0]+' '+b+' '+U[1]+' = '+tot+' '+U[1]};
    return {kind:'plain', topic:'gewicht', two:true, ans:a, ans2:b,
      ask:'Wie viele '+U[0]+' sind das?',
      text:tot+' '+U[1]+' <em>=</em> '+BLANK+' '+U[0],
      ask2:'Und wie viele '+U[1]+' bleiben?',
      text2:tot+' '+U[1]+' <em>=</em> '+a+' '+U[0]+' '+BLANK+' '+U[1],
      full:a+' '+U[0]+' '+b+' '+U[1], plain:tot+' '+U[1]+' = '+a+' '+U[0]+' '+b+' '+U[1]};
  }
  var x=R(1,9)*U[2]+R(0,999), y=Math.random()<.3 ? x : R(1,9)*U[2]+R(0,999);
  var sign = x<y?0 : x===y?1 : 2;
  return {kind:'plain', topic:'gewicht', ans:sign, opts:[['<',0],['=',1],['>',2]],
    ask:'Vergleiche.',
    text:x+' '+U[1]+' <em>?</em> '+Math.floor(y/U[2])+' '+U[0]+' '+(y%U[2])+' '+U[1],
    plain:x+' '+U[1]+' '+['<','=','>'][sign]+' '+Math.floor(y/U[2])+' '+U[0]+' '+(y%U[2])+' '+U[1]};
}

/* ══ тема: Zeit ══ */
var cfg11 = store.get('umn:cfg11', {lvl:1, len:10});
function hhmm(m){ return Math.floor(m/60)+':'+('0'+(m%60)).slice(-2); }
function buildZeit(){
  var lvl=cfg11.lvl;
  if(lvl===1){                                    // перевод через 60
    if(Math.random()<.5){
      var h=R(1,5), mm=R(0,3)*15;
      return {kind:'plain', topic:'zeit', ans:h*60+mm, ask:'Wandle um.',
        text:h+' h '+(mm?mm+' min ':'')+'<em>=</em> '+BLANK+' min',
        plain:h+' h '+(mm?mm+' min ':'')+'= '+(h*60+mm)+' min'};
    }
    var mn=R(2,9);
    return {kind:'plain', topic:'zeit', ans:mn*60, ask:'Wandle um.',
      text:mn+' min <em>=</em> '+BLANK+' s', plain:mn+' min = '+(mn*60)+' s'};
  }
  if(lvl===2){                                    // читаем циферблат
    var t=R(1,12)*60+R(0,11)*5;                   // включая 12 часов
    return {kind:'plain', topic:'zeit', two:true, clock:t, ans:Math.floor(t/60), ans2:t%60,
      ask:'Wie viel Uhr ist es? Erst die Stunden.',
      text:BLANK+' <em>:</em> <span class="dim">__</span>',
      ask2:'Und die Minuten?',
      text2:Math.floor(t/60)+' <em>:</em> '+BLANK,
      full:hhmm(t), plain:'Die Uhr zeigt '+hhmm(t)};
  }
  var from=R(6,10)*60+R(0,11)*5, dur=R(1,11)*5+R(0,1)*30;   // промежуток
  return {kind:'plain', topic:'zeit', ans:dur, ask:'Wie lange dauert das?',
    text:'von '+hhmm(from)+' bis '+hhmm(from+dur)+' <em>=</em> '+BLANK+' min',
    plain:'von '+hhmm(from)+' bis '+hhmm(from+dur)+' = '+dur+' min'};
}
