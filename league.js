/* ══ Чемпионат: 16 команд, 30 туров, один матч в день ══ */
var MY_TEAMS = ['Barcelona','Real M.','Liverpool','Borussia D.'];
var BOT_TEAMS = ['FC Nordwind','SV Eichenfeld','Blau-Weiß Talheim','SC Rabenstein','FC Sonnenhof',
                 'TSV Moorbach','FC Drachenfels','SV Silbersee','FC Wolkenstein','SC Lindental',
                 'FC Bärenbach','SV Rotental','FC Meerwind','TSV Steinhagen','SC Falkenau'];
var LG_ROUNDS = 30, LG_MATCH = 15, LG_SEC = 20, LG_BALLS = 20;
var MIN_TOPICS = 5;                       /* чемпионат доступен от пяти открытых тем */

/* счёт матча по числу верных ответов */
function lgScore(c){
  if(c===15) return {p:3, g:[3,0], t:'Sieg'};
  if(c>=13)  return {p:3, g:[2,1], t:'Sieg'};
  if(c===12) return {p:3, g:[1,0], t:'Sieg'};
  if(c>=10)  return {p:1, g:[1,1], t:'Unentschieden'};
  if(c>=8)   return {p:0, g:[1,2], t:'Niederlage'};
  return {p:0, g:[0,3], t:'Niederlage'};
}
function lg(){ return store.get('umn:lg', null); }
function lgSave(L){ store.set('umn:lg', L); }

function lgNew(team, player){
  var i, bots=[];
  for(i=0;i<BOT_TEAMS.length;i++)
    bots.push({n:BOT_TEAMS[i], s:0.9+Math.random(), pts:0, gf:0, ga:0, pen:0});
  lgSave({team:team, player:player, round:0, pts:0, gf:0, ga:0, form:[], bots:bots,
          hist:[], done:false, rest:null, no:( (lg()&&lg().no)||0 )+1 });
}
/* очки бота за тур: матожидание равно его силе */
function botRound(s){
  var DRAW=0.26, w=Math.max(0, Math.min(0.74, (s-DRAW)/3)), r=Math.random();
  var base=1.1+0.45*s, hi, k, g;
  if(r<w){ hi=Math.max(1, Math.min(5, Math.floor(-Math.log(1-Math.random())*base)+1));
           return {p:3, gf:hi, ga:Math.floor(Math.random()*hi)}; }
  if(r<w+DRAW){ k=Math.floor(Math.random()*3); return {p:1, gf:k, ga:k}; }
  g=Math.floor(Math.random()*3);
  return {p:0, gf:g, ga:g+1+Math.floor(Math.random()*2)};
}
function lgTable(L){
  var rows=L.bots.map(function(b){ return {n:b.n, pts:b.pts, gf:b.gf, ga:b.ga, me:false}; });
  rows.push({n:L.team, pts:L.pts, gf:L.gf, ga:L.ga, me:true});
  rows.sort(function(a,b){
    return (b.pts-a.pts) || ((b.gf-b.ga)-(a.gf-a.ga)) || (b.gf-a.gf) || (a.n<b.n?-1:1);
  });
  return rows;
}
function lgPos(L){
  var t=lgTable(L), i;
  for(i=0;i<t.length;i++) if(t[i].me) return i+1;
  return 16;
}
/* тур: результат игрока + результаты соперников + резинка */
function lgPlayRound(L, correct){
  var sc=lgScore(correct), i, avg=0, b;
  L.round++; L.pts+=sc.p; L.gf+=sc.g[0]; L.ga+=sc.g[1];
  L.form.push(sc.p); if(L.form.length>5) L.form.shift();
  L.hist.push({r:L.round, c:correct, p:sc.p, g:sc.g});
  if(L.hist.length>30) L.hist.shift();

  for(i=0;i<L.bots.length;i++){
    b=L.bots[i];
    var r=botRound(Math.max(0.05, b.s-(b.pen>0?b.pen:0)));
    b.pts+=r.p; b.gf+=r.gf; b.ga+=r.ga;
    if(b.pen>0) b.pen--;
  }
  if(L.round%3===0){                       /* резинка: соперники подстраиваются под форму */
    for(i=0;i<L.form.length;i++) avg+=L.form[i];
    avg = L.form.length ? avg/L.form.length : 1.3;
    for(i=0;i<L.bots.length;i++){
      var g1=Math.random(), g2=Math.random();
      var norm=Math.sqrt(-2*Math.log(g1||1e-9))*Math.cos(2*Math.PI*g2);
      L.bots[i].s = Math.max(0.05, Math.min(2.8, avg + norm*0.30));
    }
  }
  var pos=lgPos(L);                        /* помощь, если ниже третьего */
  if(pos>3){
    var t=lgTable(L), k;
    for(k=0;k<pos-1;k++){
      if(t[k].me) continue;
      for(i=0;i<L.bots.length;i++) if(L.bots[i].n===t[k].n) L.bots[i].pen = (pos>8?1.2:0.8);
    }
  }
  if(L.round>=LG_ROUNDS){ L.done=true; L.rest=today(); }
  lgSave(L);
  return {sc:sc, pos:pos};
}
/* сколько дней до нового чемпионата (неделя отдыха) */
function lgRestLeft(L){
  if(!L || !L.done || !L.rest) return 0;
  var p=L.rest.split('-'), a=new Date(+p[0],+p[1]-1,+p[2]);
  var t=today().split('-'), b=new Date(+t[0],+t[1]-1,+t[2]);
  var gone=Math.round((b-a)/86400000);
  return Math.max(0, 7-gone);
}
function lgPlayedToday(L){
  return !!(L && L.last===today());
}
function lgOpenTopics(){
  var n=0,i;
  for(i=0;i<TOPICS.length;i++) if(tpOpen(TOPICS[i].id)) n++;
  return n;
}
/* примеры для матча: из открытых тем, чаще там где слабее */
function lgBuild(){
  var pool=[], i, id, st;
  for(i=0;i<TOPICS.length;i++){
    id=TOPICS[i].id;
    if(!tpOpen(id)) continue;
    st=tpStats(id);
    var weight = 1 + (st.total ? (100-st.acc)/25 : 1);
    pool.push([id, weight]);
  }
  var tot=0; for(i=0;i<pool.length;i++) tot+=pool[i][1];
  var r=Math.random()*tot, pick=pool[0][0];
  for(i=0;i<pool.length;i++){ r-=pool[i][1]; if(r<=0){ pick=pool[i][0]; break; } }
  return pick==='table' ? buildTable() : pick==='order' ? buildOrder() : pick==='geo' ? buildGeo() :
         pick==='zehner' ? buildZehner() : pick==='teiler' ? buildTeiler() : pick==='rest' ? buildRest() :
         pick==='double' ? buildDouble() : pick==='geld' ? buildGeld() :
         pick==='laenge' ? buildLaenge() : pick==='gewicht' ? buildGewicht() : buildZeit();
}

/* ══ экраны ══ */
var lgSel={team:null, player:0};
function lgFormRow(L){
  var out='', i, h=L.hist.slice(-5);
  for(i=0;i<h.length;i++){
    var p=h[i].p, c=p===3?'var(--ok)':p===1?'#E0A32E':'var(--no)';
    out+='<i style="background:'+c+'">'+(p===3?'S':p===1?'U':'N')+'</i>';
  }
  return out;
}
function paintLeague(){
  var L=lg();
  if(!L || (L.done && lgRestLeft(L)===0)){
    $('lgTitle').textContent = L ? 'Neue Saison' : 'Liga';
    $('lgSub').textContent = L ? 'Прошлый чемпионат завершён. Можно начинать новый.'
                               : '16 команд, 30 туров, один матч в день.';
    $('lgPlay').textContent='Saison starten';
    $('lgTable').innerHTML = L ? lgTableHTML(L) : '<p class="hint" style="margin:0">Таблица появится после старта.</p>';
    return;
  }
  var pos=lgPos(L), rest=lgRestLeft(L);
  $('lgTitle').textContent = L.team+' · '+(L.done?'Saison beendet':'Spieltag '+(L.round+1)+' / '+LG_ROUNDS);
  if(L.done){
    $('lgSub').innerHTML = (pos===1?'<b>Meister!</b> ':'Итог: '+pos+'-е место. ')
      + (rest? 'Новый чемпионат через '+rest+' дн.' : 'Можно начинать новый.');
    $('lgPlay').textContent = rest ? 'Пауза · '+rest+' дн.' : 'Neue Saison';
    $('lgPlay').disabled = rest>0;
  } else {
    $('lgSub').innerHTML = pos+'-е место · '+L.pts+' Punkte · '+L.gf+':'+L.ga+' &nbsp; <span class="form">'+lgFormRow(L)+'</span>';
    var played = L.last===today();
    $('lgPlay').textContent = played ? 'Heute schon gespielt' : 'Matchtag';
    $('lgPlay').disabled = played;
  }
  $('lgPlay').style.opacity = $('lgPlay').disabled ? .5 : 1;
  $('lgTable').innerHTML = lgTableHTML(L);
}
function lgTableHTML(L){
  var t=lgTable(L), out='<table class="tbl"><tr><th>#</th><th>Team</th><th>Sp</th><th>Tore</th><th>Diff</th><th>Pkt</th></tr>', i;
  for(i=0;i<t.length;i++){
    var r=t[i], diff=r.gf-r.ga;
    out+='<tr class="'+(r.me?'me':'')+(i<3?' top':'')+'"><td>'+(i+1)+'</td><td>'+r.n+'</td><td>'+L.round+'</td>'
       + '<td>'+r.gf+':'+r.ga+'</td><td>'+(diff>0?'+':'')+diff+'</td><td>'+r.pts+'</td></tr>';
  }
  return out+'</table>';
}
function paintLgSetup(){
  var i, html='';
  for(i=0;i<MY_TEAMS.length;i++)
    html+='<button class="chip wide" data-t="'+i+'" aria-pressed="'+(lgSel.team===i)+'">'+MY_TEAMS[i]+'</button>';
  $('lgTeams').innerHTML=html;
  html='';
  for(i=0;i<3;i++){
    var idx=[9,7,5][i];                        /* три игрока из первого сезона */
    html+='<div class="st'+(lgSel.player===i?' got':'')+'" data-p="'+i+'" style="cursor:pointer">'
        + '<div class="pic"><img src="'+SEASONS[1].path(idx)+'" alt=""><span>'+(idx+1)+'</span></div></div>';
  }
  $('lgPlayers').innerHTML=html;
  $('lgStart').disabled = lgSel.team===null;
  $('lgStart').style.opacity = lgSel.team===null ? .5 : 1;
}
function wire_league(){
  $('toLeague').onclick=function(){
    if(lgOpenTopics()<MIN_TOPICS){
      alert('Чемпионат откроется, когда будет освоено не меньше '+MIN_TOPICS+' тем — иначе примеры в матче будут повторяться.');
      return;
    }
    paintLeague(); show('league');
  };
  $('lgPlay').onclick=function(){
    var L=lg();
    if(!L || (L.done && lgRestLeft(L)===0)){ lgSel={team:null,player:0}; paintLgSetup(); show('lgSetup'); return; }
    if(L.done || L.last===today()) return;
    startSession('match', null);
  };
  $('lgTeams').addEventListener('click',function(e){
    var b=e.target.closest('[data-t]'); if(!b) return;
    lgSel.team=+b.dataset.t; paintLgSetup();
  });
  $('lgPlayers').addEventListener('click',function(e){
    var b=e.target.closest('[data-p]'); if(!b) return;
    lgSel.player=+b.dataset.p; paintLgSetup();
  });
  $('lgStart').onclick=function(){
    if(lgSel.team===null) return;
    lgNew(MY_TEAMS[lgSel.team], lgSel.player);
    paintLeague(); show('league');
  };
}
