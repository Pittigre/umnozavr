/* ── урок: Umfang und Flächeninhalt ── */
var L = {i:0, a:6, b:4, timer:null};
var LSTEP = [
 {t:'Das Rechteck',
  x:'Das ist ein Fußballfeld. Es hat vier Ecken — es ist ein <b>Rechteck</b>. Die lange Seite heißt <b>a</b>, die kurze Seite heißt <b>b</b>. Mach das Feld größer oder kleiner.',
  ctrl:true},
 {t:'Der Umfang',
  x:'Du läufst einmal ganz um das Feld herum. Dieser Weg heißt <b>Umfang</b>. Wir schreiben dafür ein <b>U</b>. Lauf mit und zähl die Schritte!',
  act:'Einmal herumlaufen'},
 {t:'Die Formel für U',
  x:'Beim Rechteck sind die Seiten gegenüber gleich lang. Du brauchst also nicht alle vier Seiten einzeln zu addieren — zwei reichen.',
  act:'Seiten paarweise zeigen'},
 {t:'Der Flächeninhalt',
  x:'Jetzt legst du Rasen auf das Feld. Wie viele Quadrate brauchst du? Das ist der <b>Flächeninhalt</b>. Wir schreiben dafür ein <b>A</b>.',
  act:'Rasen Stück für Stück legen'},
 {t:'Reihe für Reihe',
  x:'Einzeln zählen dauert lange. Schneller geht es mit Reihen — und dafür kennst du schon das Einmaleins!',
  act:'Reihe für Reihe legen'},
 {t:'cm und cm²',
  x:'Der Umfang ist ein <b>Weg</b> — man misst ihn in <b>cm</b>. Der Flächeninhalt sind <b>Quadrate</b> — man misst ihn in <b>cm²</b>. Hier ist die Zahl sogar gleich, aber gemeint ist etwas ganz anderes.'},
 {t:'Aufgepasst!',
  x:'Beide Felder haben den <b>gleichen Umfang</b>: 16 cm. Aber der Rasen ist ganz verschieden! Gleicher Zaun — anderes Feld.'}
];

function cellPx(cols, rows, maxH){
  var w = Math.min(360, (window.innerWidth||380) - 60);
  var byW = w/(cols+2.4);
  var byH = (maxH||400)/(rows+1.2);
  return Math.max(9, Math.min(32, Math.floor(Math.min(byW, byH))));
}
/* рисуем поле; opt: {edge:n сторон подсвечено, cells:n клеток, rows:n рядов, pair:bool} */
function field(a, b, opt, ox, cp){
  opt = opt||{}; ox = ox||0;
  var g='', i, j;
  var x0=ox+90, y0=26;
  for(i=0;i<a;i++) for(j=0;j<b;j++){
    var fill='#fff';
    if(opt.cells!==undefined && j*a+i < opt.cells) fill='#B7E4CD';
    if(opt.rows!==undefined && j < opt.rows) fill='#B7E4CD';
    g += '<rect x="'+(x0+i*cp)+'" y="'+(y0+j*cp)+'" width="'+cp+'" height="'+cp+'" fill="'+fill+'" stroke="#CFE2F3"/>';
  }
  var W=a*cp, H=b*cp;
  var sides=[[x0,y0,x0+W,y0],[x0+W,y0,x0+W,y0+H],[x0+W,y0+H,x0,y0+H],[x0,y0+H,x0,y0]];
  for(i=0;i<4;i++){
    var col='#1B2A3A', wd=3;
    if(opt.edge!==undefined) col = i<opt.edge ? '#E0A32E' : '#1B2A3A';
    if(opt.pair) { col = (i%2===0) ? '#2C4CC8' : '#C4372B'; wd=4; }
    g += '<line x1="'+sides[i][0]+'" y1="'+sides[i][1]+'" x2="'+sides[i][2]+'" y2="'+sides[i][3]+'" stroke="'+col+'" stroke-width="'+wd+'" stroke-linecap="square"/>';
  }
  g += '<text x="'+(x0+W/2)+'" y="'+(y0-8)+'" text-anchor="middle" font-size="15" font-weight="700" fill="'+(opt.pair?'#2C4CC8':'#5A6E85')+'">a = '+a+' cm</text>';
  g += '<text x="'+(x0-8)+'" y="'+(y0+H/2)+'" text-anchor="end" dominant-baseline="middle" font-size="15" font-weight="700" fill="'+(opt.pair?'#C4372B':'#5A6E85')+'">b = '+b+' cm</text>';
  return g;
}
function draw(inner, w, h){
  $('lPic').innerHTML = '<svg viewBox="0 0 '+w+' '+h+'" style="width:100%;height:auto;display:block">'+inner+'</svg>';
}
function stopAnim(){ if(L.timer){ clearInterval(L.timer); L.timer=null; } }

function renderLesson(){
  stopAnim();
  var st=LSTEP[L.i], a=L.a, b=L.b;
  $('lTitle').textContent=st.t;
  $('lText').innerHTML=st.x;
  $('lNum').textContent=(L.i+1)+'/7';
  $('lBar').style.width=((L.i+1)/7*100)+'%';
  $('lCtrlBox').classList.toggle('hidden', !st.ctrl);
  $('lAct').classList.toggle('hidden', !st.act);
  if(st.act) $('lAct').textContent=st.act;
  $('lPrev').style.visibility = L.i? 'visible':'hidden';
  $('lNext').textContent = L.i===6 ? 'Fertig!' : 'Weiter';
  $('lRead').innerHTML='';

  var cp, w, h;
  if(L.i===6){
    cp=cellPx(12,4,320);
    w=(7+4)*cp+280; h=4*cp+70;
    draw(field(7,1,{cells:7},0,cp) + field(4,4,{cells:16},(7*cp+130),cp), w, h);
    $('lRead').innerHTML='U = 16 cm · A = 7 cm²&nbsp;&nbsp;|&nbsp;&nbsp;U = 16 cm · A = 16 cm²';
    return;
  }
  if(L.i===5){
    cp=cellPx(6,3,320);
    w=6*cp+122; h=3*cp+50;
    draw(field(6,3,{cells:18},0,cp), w, h);
    $('lRead').innerHTML='U = 18 <b>cm</b> &nbsp;·&nbsp; A = 18 <b>cm²</b>';
    return;
  }
  cp=cellPx(a,b,320); w=a*cp+122; h=b*cp+50;
  if(L.i===2){
    draw(field(a,b,{pair:true},0,cp), w, h);
    $('lRead').innerHTML='U = 2 · (a + b) = 2 · '+(a+b)+' = <b>'+(2*(a+b))+' cm</b>';
  } else if(L.i===4){
    draw(field(a,b,{rows:0},0,cp), w, h);
    $('lRead').innerHTML='A = a · b = '+a+' · '+b+' = <b>'+(a*b)+' cm²</b>';
  } else {
    draw(field(a,b,{},0,cp), w, h);
    if(L.i===1) $('lRead').innerHTML='U = ?';
    if(L.i===3) $('lRead').innerHTML='A = ?';
  }
}
/* анимации по кнопке */


function wire_lessons(){
  $('lAct').onclick=function(){
    stopAnim();
    var a=L.a, b=L.b, cp=cellPx(a,b,320), w=a*cp+122, h=b*cp+50;
    if(L.i===1){
      var k=0, sum=0, len=[a,b,a,b], parts=[];
      L.timer=setInterval(function(){
        k++; sum+=len[k-1]; parts.push(len[k-1]);
        draw(field(a,b,{edge:k},0,cp), w, h);
        $('lRead').innerHTML = parts.join(' + ')+' = <b>'+sum+' cm</b>';
        beep(560+k*90,.07);
        if(k>=4) stopAnim();
      }, 620);
    } else if(L.i===2){
      draw(field(a,b,{pair:true},0,cp), w, h);
      $('lRead').innerHTML='U = 2 · '+a+' + 2 · '+b+' = 2 · (a + b) = <b>'+(2*(a+b))+' cm</b>';
      beep(880,.1);
    } else if(L.i===3){
      var c=0, tot=a*b;
      L.timer=setInterval(function(){
        c++;
        draw(field(a,b,{cells:c},0,cp), w, h);
        $('lRead').innerHTML='A = <b>'+c+'</b>';
        if(c%4===0) beep(700,.04);
        if(c>=tot){ stopAnim(); $('lRead').innerHTML='A = <b>'+tot+' cm²</b>'; beep(1040,.12); }
      }, Math.max(70, 900/tot));
    } else if(L.i===4){
      var r=0;
      L.timer=setInterval(function(){
        r++;
        draw(field(a,b,{rows:r},0,cp), w, h);
        $('lRead').innerHTML=r+' · '+a+' = <b>'+(r*a)+'</b>';
        beep(620+r*70,.08);
        if(r>=b){ stopAnim(); $('lRead').innerHTML='A = a · b = '+a+' · '+b+' = <b>'+(a*b)+' cm²</b>'; }
      }, 640);
    }
  };
  $('lCtrlBox').addEventListener('click',function(e){
    var b=e.target.closest('.ghost'); if(!b) return;
    var d=b.dataset.d;
    if(d==='a+') L.a=Math.min(9,L.a+1);
    if(d==='a-') L.a=Math.max(3,L.a-1);
    if(d==='b+') L.b=Math.min(6,L.b+1);
    if(d==='b-') L.b=Math.max(2,L.b-1);
    renderLesson();
  });
  $('lNext').onclick=function(){
    if(L2.id){
      var arr=LESSONS[L2.id];
      if(L2.i===arr.length-1){ tp(L2.id).lesson=1; saveAch(); sndWin(); L2.id=null; paintTopics(); openTopic(curNew); return; }
      L2.i++; renderLesson2(); window.scrollTo(0,0); return;
    }
    if(L.i===6){ stopAnim(); sndWin(); show('geo'); return; }
    L.i++; renderLesson(); window.scrollTo(0,0);
  };
  $('lPrev').onclick=function(){ if(L2.id){ if(L2.i){ L2.i--; renderLesson2(); } return; } if(L.i){ L.i--; renderLesson(); } };
  $('lQuit').onclick=function(){ stopAnim(); if(L2.id){ L2.id=null; openTopic(curNew); return; } show('geo'); };
  $('toLesson').onclick=function(){ L2.id=null; L.i=0; show('lesson'); renderLesson(); };
}

/* ══ уроки новых тем (немецкий) ══ */
var L2={id:null, i:0};
function svg(w,h,inner){ return '<svg viewBox="0 0 '+w+' '+h+'" style="width:100%;height:auto;max-height:24vh;display:block">'+inner+'</svg>'; }
function bar(x,y,cells,cp,fill){          // полоска из клеток
  var g='',i;
  for(i=0;i<cells;i++) g+='<rect x="'+(x+i*cp)+'" y="'+y+'" width="'+cp+'" height="'+cp+'" fill="'+(fill||'#B7E4CD')+'" stroke="#2C4CC8" stroke-width="1"/>';
  return g;
}
function tens(rows,cols){                  // rows·cols десятков
  var cp=9, g='', r,c;
  for(r=0;r<rows;r++) for(c=0;c<cols;c++) g+=bar(20+c*(10*cp+10), 16+r*(cp+9), 10, cp);
  return svg(20+cols*(10*cp+10), 20+rows*(cp+9), g);
}
function numline(step, upto, mark){
  var W=560, x0=30, dx=(W-60)/upto, g='', i;
  g+='<line x1="'+x0+'" y1="60" x2="'+(W-20)+'" y2="60" stroke="#1B2A3A" stroke-width="2"/>';
  for(i=0;i<=upto;i++){
    var x=x0+i*dx, isM=(i%step===0);
    g+='<line x1="'+x+'" y1="'+(isM?50:56)+'" x2="'+x+'" y2="'+(isM?70:64)+'" stroke="'+(isM?'#2C4CC8':'#B9CBE0')+'" stroke-width="'+(isM?3:1)+'"/>';
    if(isM && i>0) g+='<text x="'+x+'" y="88" text-anchor="middle" font-size="13" font-weight="700" fill="'+(i<=mark?'#2C4CC8':'#B9CBE0')+'">'+i+'</text>';
    if(isM && i>0 && i<=mark){
      var px=x0+(i-step)*dx;
      g+='<path d="M'+px+' 50 Q'+((px+x)/2)+' 18 '+x+' 50" fill="none" stroke="#E0A32E" stroke-width="2.5"/>';
    }
  }
  return svg(W,100,g);
}
function arrays(n, pairs){
  var g='', cp=13, y=10, w=0;
  pairs.forEach(function(p){
    var r,c;
    for(r=0;r<p[1];r++) for(c=0;c<p[0];c++)
      g+='<rect x="'+(30+c*cp)+'" y="'+(y+r*cp)+'" width="'+(cp-2)+'" height="'+(cp-2)+'" rx="2" fill="#B7E4CD" stroke="#2C4CC8" stroke-width="1"/>';
    g+='<text x="'+(30+p[0]*cp+14)+'" y="'+(y+p[1]*cp/2+4)+'" font-size="14" font-weight="700" fill="#1B2A3A">'+p[0]+' · '+p[1]+' = '+n+'</text>';
    w=Math.max(w, 30+p[0]*cp+150); y+=p[1]*cp+14;
  });
  return svg(w, y+6, g);
}

var LESSONS={
 zehner:[
  {t:'Zehnerstangen', x:'Eine <b>Zehnerstange</b> hat 10 Felder. Hier siehst du <b>3 · 4</b> Stangen. Das sind 12 Stangen — also <b>120</b> Felder.',
   pic:function(){ return tens(3,4); }, read:'3 · 4 = 12  →  3 · 40 = 120'},
  {t:'Die Null wandert mit', x:'Rechne zuerst wie im kleinen Einmaleins. Dann hängst du die <b>Null</b> wieder an. Das ist der ganze Trick.',
   pic:function(){ return tens(2,6); }, read:'6 · 2 = 12  →  60 · 2 = 120'},
  {t:'Teilen mit Zehnern', x:'Beim Teilen geht es rückwärts: rechne ohne die Null und hänge sie danach an.',
   pic:function(){ return tens(4,3); }, read:'120 : 3 = 40      120 : 40 = 3'},
  {t:'Wortspeicher', x:'<b>der Zehner</b> — десяток · <b>die Zehnerstange</b> — десятичная полоска · <b>mal</b> — умножить · <b>geteilt durch</b> — разделить на',
   pic:function(){ return tens(1,5); }, read:'5 · 10 = 50'}
 ],
 teiler:[
  {t:'Vielfache', x:'Wenn du immer <b>6</b> weiterspringst, bekommst du die <b>Vielfachen von 6</b>: 6, 12, 18, 24 … Sie hören nie auf.',
   pic:function(){ return numline(6,36,24); }, read:'Vielfache von 6: 6, 12, 18, 24, 30, 36'},
  {t:'Teiler', x:'<b>12 Plättchen</b> kannst du zu ordentlichen Rechtecken legen. Die Seitenlängen sind die <b>Teiler von 12</b>.',
   pic:function(){ return arrays(12, [[6,2],[4,3],[12,1]]); }, read:'Teiler von 12: 1, 2, 3, 4, 6, 12'},
  {t:'Vielfaches oder Teiler?', x:'<b>24 ist ein Vielfaches von 6.</b> Und <b>6 ist ein Teiler von 24.</b> Zwei Wörter für dieselbe Aufgabe — nur von der anderen Seite.',
   pic:function(){ return numline(6,36,24); }, read:'24 : 6 = 4 — es bleibt nichts übrig'},
  {t:'Schnell erkennen', x:'Durch <b>2</b> teilbar: die Zahl ist gerade. Durch <b>5</b>: sie endet auf 0 oder 5. Durch <b>10</b>: sie endet auf 0.',
   pic:function(){ return numline(5,50,50); }, read:'20, 35, 50 — alle durch 5 teilbar'},
  {t:'Wortspeicher', x:'<b>das Vielfache</b> — кратное · <b>der Teiler</b> — делитель · <b>teilbar durch</b> — делится на · <b>es bleibt ein Rest</b> — остаётся остаток',
   pic:function(){ return arrays(12, [[3,4]]); }, read:'3 · 4 = 12'}
 ]
};
function renderLesson2(){
  var arr=LESSONS[L2.id], st=arr[L2.i];
  $('lTitle').textContent=st.t;
  $('lText').innerHTML=st.x;
  $('lPic').innerHTML=st.pic();
  $('lRead').innerHTML=st.read||'';
  $('lNum').textContent=(L2.i+1)+'/'+arr.length;
  $('lBar').style.width=((L2.i+1)/arr.length*100)+'%';
  $('lCtrlBox').classList.add('hidden');
  $('lAct').classList.add('hidden');
  $('lPrev').style.visibility=L2.i?'visible':'hidden';
  $('lNext').textContent=L2.i===arr.length-1?'Fertig!':'Weiter';
}

/* ── картинки для деления с остатком и удвоения ── */
function dots(total, per, groups){          // кружки, разложенные по группам
  var cp=17, g='', i, gx=24, gy=18, col=0, row=0, placed=0;
  for(i=0;i<groups;i++){
    var x=24+i*(per*cp+18);
    g+='<rect x="'+(x-6)+'" y="12" width="'+(per*cp+4)+'" height="'+(cp+14)+'" rx="7" fill="none" stroke="#2C4CC8" stroke-width="1.5" stroke-dasharray="4 3"/>';
    for(col=0;col<per && placed<total;col++,placed++)
      g+='<circle cx="'+(x+col*cp+7)+'" cy="'+(12+cp/2+7)+'" r="6.5" fill="#B7E4CD" stroke="#2C4CC8" stroke-width="1.2"/>';
  }
  var restX=24+groups*(per*cp+18);
  for(i=0;placed<total;placed++,i++)
    g+='<circle cx="'+(restX+i*cp+7)+'" cy="'+(12+cp/2+7)+'" r="6.5" fill="#F7E0A8" stroke="#C4372B" stroke-width="1.5"/>';
  if(total>groups*per) g+='<text x="'+(restX)+'" y="'+(cp+40)+'" font-size="12" font-weight="700" fill="#C4372B">Rest</text>';
  return svg(restX+(total-groups*per)*cp+30, cp+52, g);
}
function twoBars(n, split){                  // полоска и её удвоение или половина
  var cp=Math.max(7, Math.min(16, Math.floor(360/Math.max(n,2)))), g='';
  g+=bar(20,14,n,cp,'#B7E4CD');
  g+='<text x="'+(24+n*cp)+'" y="'+(14+cp-2)+'" font-size="13" font-weight="700" fill="#1B2A3A">'+n+'</text>';
  if(split){
    g+=bar(20,16+cp+10,Math.floor(n/2),cp,'#B7E4CD');
    g+=bar(20+Math.floor(n/2)*cp,16+cp+10,n-Math.floor(n/2),cp,'#EDF2F7');
    g+='<text x="'+(24+n*cp)+'" y="'+(16+2*cp+8)+'" font-size="13" font-weight="700" fill="#2C4CC8">'+Math.floor(n/2)+'</text>';
  } else {
    g+=bar(20,16+cp+10,n,cp,'#B7E4CD'); g+=bar(20+n*cp,16+cp+10,n,cp,'#B7E4CD');
    g+='<text x="'+(24+2*n*cp)+'" y="'+(16+2*cp+8)+'" font-size="13" font-weight="700" fill="#2C4CC8">'+(2*n)+'</text>';
  }
  return svg(60+(split?n:2*n)*cp, 2*cp+34, g);
}

LESSONS.rest=[
 {t:'Verteilen', x:'<b>13 Bonbons</b> für <b>4 Kinder</b>. Jedes Kind bekommt gleich viele. Schau: jeder bekommt 3 — und eines bleibt <b>übrig</b>.',
  pic:function(){ return dots(13,3,4); }, read:'4 Kinder · je 3 Bonbons · 1 bleibt übrig'},
 {t:'Wir schreiben es auf', x:'Das Übriggebliebene heißt <b>Rest</b>. Wir schreiben ein <b>R</b> dahinter.',
  pic:function(){ return dots(13,3,4); }, read:'13 : 4 = 3 R 1'},
 {t:'Der Rest ist klein', x:'Der Rest ist <b>immer kleiner als der Divisor</b>. Beim Teilen durch 4 kann der Rest nur 0, 1, 2 oder 3 sein — <b>niemals 4</b>. Sonst passt noch ein Kind dazu!',
  pic:function(){ return dots(15,3,5); }, read:'Teilen durch 4 → Rest: 0, 1, 2 oder 3'},
 {t:'Die Probe', x:'Du kannst nachprüfen: rechne <b>Ergebnis mal Divisor</b> und zähle den Rest dazu. Kommt die Zahl vom Anfang heraus, stimmt alles.',
  pic:function(){ return dots(13,3,4); }, read:'3 · 4 = 12,  12 + 1 = 13 ✓'},
 {t:'Wortspeicher', x:'<b>der Rest</b> — остаток · <b>übrig bleiben</b> — оставаться · <b>verteilen</b> — раздать поровну · <b>die Probe</b> — проверка',
  pic:function(){ return dots(11,2,5); }, read:'11 : 5 = 2 R 1'}
];
LESSONS.double=[
 {t:'Verdoppeln', x:'<b>Verdoppeln</b> heißt: noch einmal so viel. Nimm die Zahl <b>zweimal</b>.',
  pic:function(){ return twoBars(6,false); }, read:'das Doppelte von 6 = 12'},
 {t:'Halbieren', x:'<b>Halbieren</b> heißt: gerecht in <b>zwei gleiche Teile</b> teilen. Das ist der Rückweg zum Verdoppeln.',
  pic:function(){ return twoBars(12,true); }, read:'die Hälfte von 12 = 6'},
 {t:'Große Zahlen', x:'Bei großen Zahlen nimm <b>Zehner und Einer getrennt</b>. 24 sind 20 und 4. Verdopple beides und zähle zusammen.',
  pic:function(){ return twoBars(24,false); }, read:'20 → 40,  4 → 8,  40 + 8 = 48'},
 {t:'Gerade und ungerade', x:'Nur <b>gerade</b> Zahlen kann man ohne Rest halbieren. 13 ist <b>ungerade</b> — da bleibt etwas übrig.',
  pic:function(){ return twoBars(13,true); }, read:'13 : 2 = 6 R 1'},
 {t:'Wortspeicher', x:'<b>das Doppelte</b> — двойное · <b>die Hälfte</b> — половина · <b>gerade</b> — чётное · <b>ungerade</b> — нечётное',
  pic:function(){ return twoBars(9,false); }, read:'das Doppelte von 9 = 18'}
];
