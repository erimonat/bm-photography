/* Hero v4: the client's 25-frame camera sequence (media/seq/NN.webp) played on a canvas, scrubbed by scroll with eased catch-up.
   Frames 1-25: camera in the dark, push-in, cap off, lens, diaphragm opens, Istanbul skyline. Then the canvas zooms and dissolves into the first
   photograph, the headline arrives and the photographs fly in. Frame blending and easing are in app.js; everything else is CSS scroll timelines. */
const P = 600; // svh of pinned scroll
const FRAMES = 30, T0 = 30, STEP = 14; // frame k is centred at T0 + STEP * k svh
const S = { seqEnd: [T0 + STEP * (FRAMES - 1), 398], heroIn: [394, 428], copyIn: [470, 495], shrink: [515, 555], wallA: 505, wallB: 580 };
const pc = s => ((s / P) * 100).toFixed(2) + '%';
const base = id => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb`;

const sats = [
  ['15297911', 'P', 's1'], ['18349761', 'L', 's2'], ['15207754', 'P', 's3'], ['15518194', 'P', 's4'],
  ['15297914', 'L', 's5'], ['15069348', 'P', 's6'], ['15194875', 'P', 's7'], ['15518200', 'P', 's8']
];
const wallHtml = `<div class="wall">
          ${sats.map(([id, o, cls], i) => `<figure class="wi ${cls}" style="--s:${S.wallA + i * 6};--e:${S.wallB - (7 - i) * 3}"><img src="${base(id)}&w=${o === 'L' ? 1100 : 800}" srcset="${(o === 'L' ? [700, 1100, 1500] : [500, 800, 1100]).map(w => base(id) + '&w=' + w + ' ' + w + 'w').join(', ')}" sizes="(min-width:900px) 30vw, 46vw" width="${o === 'L' ? 1100 : 800}" height="${o === 'L' ? 733 : 1200}" alt="" loading="lazy" decoding="async"></figure>`).join('\n          ')}
        </div>`;

/* the first photograph after the opening is picked at random on every visit (see the script below); the markup carries no src until then */
const heroPicture = `<figure class="wi hero"><picture data-pick="hero"><source media="(orientation:portrait)" sizes="100vw"><img sizes="100vw" width="1600" height="1067" alt="" decoding="async"></picture></figure>`;

const platePic = `<div class="seq-plate" aria-hidden="true"><picture data-pick="plate"><source media="(orientation:portrait)" sizes="100vw"><img sizes="100vw" width="1600" height="1067" alt="" decoding="async"></picture></div>`;

const I18 = require('./i18n.cjs');
const cap3 = ids => JSON.stringify(ids.map(id => [id, I18.CAP[id][0], I18.CAP[id][1]]));
const pickScript = String.raw`<script>
(function(){
  var L=${cap3(["15518197","15297914","18349761","15194859","15194877","15297913","16638283"])};
  var P=${cap3(["15297912","15297911","15069348","15207900","15069347","15069349","15069351","15194878","15207754","15194860"])};
  var lg=(location.search.match(/[?&]lang=(tr|en)/)||[])[1];if(!lg){try{lg=localStorage.getItem('bm-lang')}catch(e){}}if(lg!=='en')lg='tr';var li=lg==='en'?2:1;
  function pick(pool,key){
    var last='';try{last=localStorage.getItem(key)||''}catch(e){}
    var opts=pool.filter(function(p){return p[0]!==last});
    var p=opts[Math.floor(Math.random()*opts.length)];
    try{localStorage.setItem(key,p[0])}catch(e){}
    return p;
  }
  var lp=pick(L,'bm-hero-l'),pp=pick(P,'bm-hero-p');
  function u(id,w){return 'https://images.pexels.com/photos/'+id+'/pexels-photo-'+id+'.jpeg?auto=compress&cs=tinysrgb&w='+w}
  function set(pic,wp,wl,alt){
    var s=pic.querySelector('source'),i=pic.querySelector('img');
    s.srcset=wp.map(function(w){return u(pp[0],w)+' '+w+'w'}).join(', ');
    i.srcset=wl.map(function(w){return u(lp[0],w)+' '+w+'w'}).join(', ');
    i.src=u(lp[0],wl[1]);
    if(alt)i.alt=matchMedia('(orientation:portrait)').matches?pp[li]:lp[li];
  }
  set(document.querySelector('[data-pick=plate]'),[1100,1600],[900,1600,2200],false);
  set(document.querySelector('[data-pick=hero]'),[700,1100,1600],[900,1600,2200],true);
  window.__heroCap={l:[lp[1],lp[2]],p:[pp[1],pp[2]]};
  /* the wall around it must not repeat the chosen photograph */
  var dL='15518197',dP='15297912';
  [].forEach.call(document.querySelectorAll('.wall .wi:not(.hero) img'),function(im){
    var m=/photos\/(\d+)\//.exec(im.getAttribute('src')||'');
    if(!m)return;
    if(m[1]===lp[0])im.src=im.src.split(m[1]).join(dL);
    else if(m[1]===pp[0])im.src=im.src.split(m[1]).join(dP);
  });
})();
</script>`;

const reelHtml = `${platePic}
      <div class="seq" aria-hidden="true">
        <img class="seq-poster" src="media/seq/01.webp" srcset="media/seq/01-m.webp 960w, media/seq/01.webp 1672w" sizes="100vw" width="1672" height="941" alt="" fetchpriority="high" decoding="async">
        <canvas class="seq-cv" data-frames="${FRAMES}" data-t0="${T0}" data-step="${STEP}" data-end="${S.seqEnd[0]}"></canvas>
      </div>
      ${wallHtml.replace('</div>', '')}
      ${heroPicture}
      ${pickScript}
      </div>`;

const css = `
/* ===== hero: the camera sequence, driven by scroll ===== */
.hero{position:relative;height:${P + 100}svh;background:#03060d}
.stage{position:sticky;top:0;height:100svh;overflow:clip;isolation:isolate;background:#03060d}
.seq{position:absolute;inset:0;transform-origin:50% 50%}
.seq-plate{position:absolute;inset:0;overflow:hidden;background:#03060d}
.seq-plate img{width:100%;height:100%;object-fit:cover;object-position:46% 55%;display:block;transform-origin:50% 50%}
.seq-poster,.seq-cv{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
@media (orientation:portrait){.seq-poster{object-position:60% 50%}}
.seq-cv{opacity:0;transition:opacity 400ms ease}
.seq.ready .seq-cv{opacity:1}
.seq.ready .seq-poster{visibility:hidden}
.wall{position:absolute;inset:0;perspective:1600px;perspective-origin:50% 42%;overflow:hidden;pointer-events:none}
.wi{position:absolute;left:var(--l);top:var(--t);width:var(--w);aspect-ratio:var(--ar);margin:0;overflow:hidden;background:var(--panel);transform:rotateY(var(--ry,0deg));box-shadow:0 2vmin 5vmin rgba(0,0,0,.6);opacity:0}
.wi img{width:100%;height:100%;object-fit:cover}
.wi.hero{left:0;top:0;width:100vw;height:100svh;aspect-ratio:auto;box-shadow:none;transform:none;z-index:3;opacity:0;--hl:27vw;--ht:calc((100svh - 30.7vw) / 2 - 8svh);--hw:46vw;--hh:30.7vw;--hs:1;contain:layout paint}
@media (orientation:portrait){.wi.hero{--hl:12vw;--ht:30svh;--hw:76vw;--hh:52vw;--hs:1}}
.wi.hero img{object-position:46% 55%;transform-origin:50% 50%}
.s1{--l:5vw;--t:12svh;--w:15vw;--ar:.667;--ry:20deg}
.s2{--l:2vw;--t:50svh;--w:21vw;--ar:1.5;--ry:20deg}
.s3{--l:22vw;--t:9svh;--w:12.5vw;--ar:.667;--ry:12deg}
.s4{--l:38vw;--t:7svh;--w:11vw;--ar:.667;--ry:6deg}
.s5{--l:77vw;--t:48svh;--w:21vw;--ar:1.5;--ry:-20deg}
.s6{--l:80vw;--t:12svh;--w:15vw;--ar:.667;--ry:-20deg}
.s7{--l:62vw;--t:9svh;--w:12vw;--ar:.667;--ry:-10deg}
.s8{display:none}
@media (orientation:portrait){
  .s1{--l:-4vw;--t:6svh;--w:27vw;--ry:16deg}.s2{--l:-6vw;--t:52svh;--w:38vw;--ry:16deg}
  .s3{--l:26vw;--t:-2svh;--w:23vw;--ry:6deg}.s4{--l:60vw;--t:3svh;--w:22vw;--ry:-6deg}
  .s5{--l:68vw;--t:52svh;--w:38vw;--ry:-16deg}.s6{--l:80vw;--t:20svh;--w:26vw;--ry:-16deg}
  .s7{--l:50vw;--t:-4svh;--w:20vw;--ry:-8deg}.s8{display:block;--l:62vw;--t:66svh;--w:24vw;--ry:-12deg}
}
.shade{position:absolute;inset:0;pointer-events:none;opacity:0;background:linear-gradient(to top,rgba(8,8,10,.92) 0,rgba(8,8,10,.55) 34%,rgba(8,8,10,0) 62%);z-index:4}
.hud{position:absolute;inset:0;pointer-events:none;z-index:5;font:500 .8rem/1 var(--mono);letter-spacing:.06em;font-variant-numeric:tabular-nums;opacity:0}
.bk{position:absolute;width:22px;height:22px;border:1px solid rgba(238,234,226,.55)}
.bk.tl{left:var(--edge);top:calc(var(--nav-h) + 20px);border-width:1px 0 0 1px}
.bk.tr{right:var(--edge);top:calc(var(--nav-h) + 20px);border-width:1px 1px 0 0}
.bk.bl{left:var(--edge);bottom:20px;border-width:0 0 1px 1px}
.bk.br{right:var(--edge);bottom:20px;border-width:0 1px 1px 0}
.hud-bar{position:absolute;left:calc(var(--edge) + 36px);right:calc(var(--edge) + 36px);bottom:26px;display:flex;align-items:center;color:rgba(238,234,226,.85)}
.fstop{position:relative;display:inline-block;min-width:5ch;color:var(--accent);font-size:1rem}
.fstop span{position:absolute;left:0;top:50%;translate:0 -50%;opacity:0;white-space:nowrap}
.fstop span:last-child{position:static;translate:none;visibility:hidden}
/* the opening name: big at the top left, then it travels up into the nav brand as you scroll */
.hn{position:fixed;left:var(--edge);top:calc(var(--nav-h) + 8svh);z-index:61;pointer-events:none;transform-origin:0 0;--k:.12;--dx:0px;--dy:-9svh}
.hn-name{display:block;font:800 min(6.4vw,7.6rem)/1 var(--sans);font-stretch:118%;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;color:var(--text);text-shadow:0 2px 30px rgba(3,6,14,.55)}
.hn-sub{display:flex;align-items:center;gap:.9em;margin-top:clamp(10px,1.6vw,22px);font:600 clamp(.9rem,1.9vw,1.75rem)/1 var(--mono);letter-spacing:.38em;text-transform:uppercase;color:var(--accent)}
.hn-sub::before{content:"";width:clamp(36px,5vw,84px);height:2px;background:currentColor;flex:none}
/* scroll cue: the same viewfinder language as the HUD (mono caps, hairline, accent dot); it leaves as soon as you scroll */
.cue{position:fixed;left:50%;bottom:clamp(22px,4.2svh,40px);translate:-50% 0;z-index:59;pointer-events:none}
.cue-in{display:grid;justify-items:center;gap:14px;animation:cueIn .9s var(--ease-out) 1.5s both}
.cue-t{font:500 .72rem/1 var(--mono);letter-spacing:.34em;text-transform:uppercase;color:rgba(238,234,226,.78);padding-left:.34em;text-shadow:0 1px 14px rgba(3,6,14,.9)}
.cue-l{position:relative;width:1px;height:clamp(34px,6svh,52px);background:rgba(238,234,226,.28);overflow:hidden}
.cue-l::after{content:"";position:absolute;left:-1px;top:0;width:3px;height:3px;border-radius:50%;background:var(--accent);box-shadow:0 0 10px 1px rgba(255,90,31,.75);animation:cueDot 2.1s cubic-bezier(.65,0,.35,1) 2s infinite}
.cue-l::before{content:"";position:absolute;inset:0;background:linear-gradient(to bottom,transparent,rgba(238,234,226,.55));transform-origin:top;animation:cueLine 2.1s cubic-bezier(.65,0,.35,1) 2s infinite}
@keyframes cueIn{from{opacity:0;translate:0 10px}to{opacity:1;translate:0 0}}
@keyframes cueDot{0%{top:-4px;opacity:0}15%{opacity:1}85%{opacity:1}100%{top:calc(100% + 1px);opacity:0}}
@keyframes cueLine{0%{transform:scaleY(0)}60%{transform:scaleY(1);opacity:1}100%{transform:scaleY(1);opacity:0}}
@media (max-height:520px) and (orientation:landscape){.cue{display:none}}
/* page progress: a hairline at the bottom edge that opens from the centre, where the scroll cue left off */
.prog{display:none;position:fixed;inset:auto 0 env(safe-area-inset-bottom,0px) 0;height:2px;z-index:58;pointer-events:none;background:rgba(238,234,226,.1)}
.prog i{position:absolute;inset:0;background:var(--accent);transform:scaleX(0);transform-origin:50% 50%;box-shadow:0 0 12px rgba(255,90,31,.55)}
html.lb-open .prog{opacity:0!important}
.hero-copy{position:absolute;inset:auto 0 0 0;z-index:6;display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:24px var(--gap);align-items:end;padding:0 var(--edge) 84px;opacity:0;visibility:hidden}
.hl{grid-column:1/9;font:700 clamp(2.5rem,6.6vw,6rem)/.94 var(--sans);font-stretch:112%;letter-spacing:-.025em;text-wrap:balance}
.hero-side{grid-column:9/13;display:grid;gap:20px;justify-items:start;padding-bottom:.4rem}
.hero-side p{color:rgba(238,234,226,.9);font-size:1.1rem;max-width:30ch;text-wrap:pretty}
@media (max-width:1100px){.hl,.hero-side{grid-column:1/-1}.hero-side p{max-width:40ch}}
@media (max-width:820px){.hero-copy{gap:18px;padding-bottom:76px}.hl{font-size:clamp(2.5rem,13vw,4.4rem)}}
@media (max-height:520px) and (orientation:landscape){.hero-copy{padding-bottom:58px;gap:10px}.hl{font-size:clamp(1.8rem,9vh,3rem)}.hero-side p{font-size:.95rem}.hn-sub,.bk{display:none}}

/* hero motion: tied to scroll, no scripts here. Windows are in svh of the ${P}svh pin. The frames themselves are blended in app.js. */
@supports (animation-timeline:scroll()){
  .prog{display:block;animation:progIn linear both;animation-timeline:scroll(root);animation-range:9svh 15svh}
  .prog i{animation:progFill linear both;animation-timeline:scroll(root);animation-range:9svh 100%}
  @keyframes progIn{from{opacity:0}to{opacity:1}}
  @keyframes progFill{from{transform:scaleX(0)}to{transform:scaleX(1)}}
  @media (prefers-reduced-motion:no-preference){
    .seq{animation:aSeq linear both;animation-timeline:scroll(root);animation-range:0 ${P}svh}
    .seq-plate img{animation:aPlate linear both;animation-timeline:scroll(root);animation-range:0 ${P}svh}
    .wi.hero{animation:aHero linear both;animation-timeline:scroll(root);animation-range:0 ${P}svh}
    .wi.hero img{animation:aHeroImg linear both;animation-timeline:scroll(root);animation-range:0 ${P}svh}
    .wi:not(.hero){animation:wallIn linear both;animation-timeline:scroll(root);animation-range:calc(var(--s) * 1svh) calc(var(--e) * 1svh)}
    .shade{animation:shadeWin linear both;animation-timeline:scroll(root);animation-range:0 ${P}svh}
    .hero-copy{animation:copyWin linear both;animation-timeline:scroll(root);animation-range:0 ${P}svh}
    .hud{animation:hudWin linear both;animation-timeline:scroll(root);animation-range:0 ${P}svh}
    .hn{animation:hnMove linear both;animation-timeline:scroll(root);animation-range:0 58svh}
    .hn-sub{animation:hnSub linear both;animation-timeline:scroll(root);animation-range:0 26svh}
    .brand{animation:brandIn linear both;animation-timeline:scroll(root);animation-range:0 58svh}
    .cue{animation:cueOut linear both;animation-timeline:scroll(root);animation-range:0 9svh}
    .seq-poster{animation:posterBoot 2.2s var(--ease-out) both}
    .fstop span:not(:last-child){animation:stopShow linear;animation-timeline:scroll(root)}
    .fstop span:nth-child(1){animation-range:218svh 250svh}
    .fstop span:nth-child(2){animation-range:250svh 275svh}
    .fstop span:nth-child(3){animation-range:275svh 295svh}
    .fstop span:nth-child(4){animation-range:295svh 315svh}
    .fstop span:nth-child(5){animation-range:315svh 335svh}
    .fstop span:nth-child(6){animation-range:335svh 348svh}
    .fstop span:nth-child(7){animation-range:348svh 358svh}
    .fstop span:nth-child(8){animation-range:358svh ${P}svh;animation-name:stopLast;animation-fill-mode:forwards}
  }
  @keyframes posterBoot{from{scale:1.06;opacity:0}to{scale:1;opacity:1}}
  @keyframes aPlate{0%,${pc(240)}{transform:scale(1.4)}${pc(S.seqEnd[0])},100%{transform:scale(1)}}
  @keyframes aSeq{0%,${pc(S.seqEnd[0])}{opacity:1}${pc(S.seqEnd[0] + 10)},100%{opacity:0}}
  @keyframes aHero{0%,${pc(S.heroIn[0])}{opacity:0;left:0;top:0;width:100vw;height:100svh}${pc(S.heroIn[1])}{opacity:1;left:0;top:0;width:100vw;height:100svh}${pc(S.shrink[0])}{left:0;top:0;width:100vw;height:100svh}${pc(S.shrink[1])},100%{opacity:1;left:var(--hl);top:var(--ht);width:var(--hw);height:var(--hh)}}
  @keyframes aHeroImg{0%,${pc(S.heroIn[0])}{transform:scale(var(--hs))}${pc(S.copyIn[0])},100%{transform:scale(1)}}
  @keyframes wallIn{
    from{opacity:0;transform:translate3d(calc(50vw - var(--l) - var(--w) / 2),calc(50svh - var(--t)),-700px) scale(.2) rotateY(0deg)}
    to{opacity:1;transform:rotateY(var(--ry,0deg))}}
  @keyframes shadeWin{0%,${pc(S.copyIn[0] - 30)}{opacity:0}${pc(S.copyIn[1])},100%{opacity:1}}
  @keyframes copyWin{
    0%,${pc(S.copyIn[0] - 4)}{opacity:0;visibility:hidden;translate:0 24px}
    ${pc(S.copyIn[0] - 3)}{visibility:visible}
    ${pc(S.copyIn[1])},100%{opacity:1;visibility:visible;translate:0 0}}
  @keyframes hudWin{0%,${pc(195)}{opacity:0}${pc(220)},100%{opacity:1}}
  @keyframes hnMove{0%{translate:0 0;scale:1;opacity:1}6%{translate:0 0;scale:1;opacity:1}90%{opacity:1}100%{translate:var(--dx) var(--dy);scale:var(--k);opacity:0}}
  @keyframes hnSub{0%,8%{opacity:1;translate:0 0}100%{opacity:0;translate:0 -14px}}
  @keyframes brandIn{0%,90%{opacity:0}100%{opacity:1}}
  @keyframes cueOut{from{opacity:1;translate:-50% 0}to{opacity:0;translate:-50% 12px}}
  @keyframes stopShow{0%,100%{opacity:1}}
  @keyframes stopLast{0%,100%{opacity:1}}
}
/* no scroll timelines, or reduced motion: a static, already-open frame with the first photograph */
@supports not (animation-timeline:scroll()){
  .hero{height:100svh}.seq,.seq-plate,.hud,.hn,.cue,.wi:not(.hero){display:none}.wall{position:absolute;inset:0;perspective:none}.wi.hero{opacity:1}.wi.hero img{transform:none}.hero-copy{opacity:1;visibility:visible}.shade{opacity:1}
}
@media (prefers-reduced-motion:reduce){
  .hero{height:100svh}.seq,.seq-plate,.hud,.hn,.cue,.wi:not(.hero){display:none}.wall{position:absolute;inset:0;perspective:none}.wi.hero{opacity:1}.wi.hero img{transform:none}.hero-copy{opacity:1;visibility:visible}.shade{opacity:1}
}

/* outro photo */
.outro .fr{position:absolute;inset:0;overflow:hidden;background:var(--panel)}
.outro .fr img{width:100%;height:100%;object-fit:cover}

`;

module.exports = { css, reelHtml, P, S, base };
