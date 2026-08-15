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
  } else if(f.d.length){
    f.d.pop();                                   // ошибка снимает последний день
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
      pool.push([a,b,Math.max(.15, 1+f.w*4-Math.min(f.c,6)*.14)]);
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
 {id:'order',  de:'Punkt vor Strich',      ru:'Порядок действий', open:true},
 {id:'geo',    de:'Umfang und Fläche',     ru:'Периметр и площадь', open:true}
];
function tp(id){
  if(!ach.tp) ach.tp={};
  if(!ach.tp[id]) ach.tp[id]={c:0, h:'', days:[], lesson:0};
  return ach.tp[id];
}
function tpMark(id, good){
  var t=tp(id);
  if(good){ t.c++; if(t.days.indexOf(today())===-1) t.days.push(today()); }
  t.h=((t.h||'')+(good?'1':'0')).slice(-10);
  saveAch();
}
/* ступень освоена: урок пройден, 60 верных ответов, 8 из последних 10, три разных дня */
function hasLesson(id){ return typeof LESSONS!=='undefined' && !!LESSONS[id]; }
function tpDone(id){
  var t=tp(id), h=t.h||'', ok=0, i;
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
  var t=tp(id), h=t.h||'', ok=0, i, out=[];
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
