/* SEASTRONG hero: "A living seascape".
   Plain script, no dependencies, no network requests. On DOMContentLoaded it
   mounts an inline SVG cross-section (mangroves, seagrass, coral reef) into
   every [data-ss-hero] element, plus a pause/play button and a caption.
   All motion is CSS (hero.css). Animal routes below are turned into CSS
   keyframes once per page, so each animal always swims head first along
   its own path. API: window.SSHero = { mount(el), pause(), play() }. */
(function () {
  'use strict';
  if (window.SSHero) return;

  var SEA = 210; /* water line, viewBox units (viewBox is 1600 x 640) */

  /* ---------------- tweakables ---------------- */
  /* Waves: n crests, len apart, crossing the frame right to left in dur seconds.
     ENV gives crest height (scale) by x: shoaling at the reef crest, breaking,
     then losing energy over the lagoon, seagrass and mangroves. */
  var WAVE = { n: 9, len: 200, dur: 40, amp: 14 };
  /* [x, crest height scale, forward lean in degrees (steep shoreward face while breaking)] */
  var ENV = [[1700, 2, 0], [1560, 2.08, 0], [1440, 2.22, 2], [1350, 2.48, 7], [1300, 2.74, 14], [1268, 2.86, 20],
    [1238, 1.6, 24], [1205, 1.04, 10], [1150, .82, 3], [1080, .66, 0], [980, .52, 0], [860, .4, 0], [740, .3, 0],
    [620, .2, 0], [500, .1, 0], [380, .05, 0], [260, .035, 0], [-100, .03, 0]];
  var FOAM = [[1700, 0], [1336, 0], [1294, .95], [1222, 1], [1168, .78], [1110, .4], [1040, 0], [-100, 0]];

  /* Animal routes: waypoints (Catmull-Rom spline) in viewBox units, seconds.
     fi/fo = fraction of the loop spent fading in/out behind cover. */
  var ROUTES = {
    school: { heading: 'right', dur: 32, delay: -12, fi: .09, fo: .08, tilt: 16,
      pts: [[352, 250], [480, 240], [610, 236], [740, 244], [870, 266], [985, 318], [1076, 404]] },
    gruntA: { heading: 'left', dur: 38, delay: -9, fi: .08, fo: .08, tilt: 14,
      pts: [[1070, 444], [960, 450], [840, 446], [720, 422], [620, 380], [530, 326], [440, 270]] },
    gruntB: { heading: 'left', dur: 44, delay: -31, fi: .08, fo: .08, tilt: 14,
      pts: [[1104, 378], [1010, 362], [880, 346], [740, 332], [620, 314], [530, 284], [478, 256]] },
    snapper: { heading: 'left', dur: 30, delay: -14, fi: .05, fo: .09, tilt: 12,
      pts: [[1700, 452], [1580, 440], [1470, 420], [1370, 404], [1260, 400], [1150, 418], [1068, 446]] },
    parrotL: { heading: 'left', dur: 26, delay: -11.5, fi: .05, fo: .1, tilt: 12,
      pts: [[1700, 304], [1600, 308], [1500, 302], [1420, 298], [1362, 292], [1320, 282], [1284, 272]] },
    parrotR: { heading: 'right', dur: 34, delay: -4, fi: .09, fo: .03, tilt: 16,
      pts: [[1060, 450], [1120, 430], [1190, 398], [1262, 366], [1332, 340], [1420, 334], [1540, 345], [1700, 356]] },
    turtle: { heading: 'left', dur: 42, delay: -14, fi: .09, fo: .09, tilt: 22,
      pts: [[1074, 470], [990, 494], [900, 506], [800, 496], [700, 450], [610, 380], [530, 312], [452, 256]] }
  };

  /* Seabed (mud, then lagoon sand) and reef mound profiles. */
  var GROUND = [[-20, 194], [40, 196], [90, 200], [124, 208], [150, 234], [200, 274], [260, 308], [330, 334],
    [400, 352], [460, 364], [500, 378], [530, 400], [560, 440], [595, 498], [630, 538], [680, 560], [760, 570],
    [850, 573], [960, 576], [1050, 578], [1150, 580], [1250, 582], [1350, 586], [1420, 594],
    [1470, 608], [1510, 630], [1545, 660], [1570, 700]];
  var REEF = [[930, 610], [962, 586], [992, 560], [1020, 526], [1048, 486], [1076, 428], [1104, 366],
    [1136, 328], [1178, 308], [1218, 292], [1250, 270], [1290, 263], [1318, 277], [1345, 312], [1378, 368],
    [1415, 438], [1450, 505], [1478, 560], [1500, 615], [1512, 670]];

  /* ---------------- helpers ---------------- */
  function rnd(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = Math.imul(s ^ (s >>> 15), s | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function n(v) { return Math.round(v * 10) / 10; }
  function P(x, y) { return n(x) + ' ' + n(y); }
  function crSegs(p, closed) {
    var out = [], L = p.length, m = closed ? L : L - 1;
    for (var i = 0; i < m; i++) {
      var p0 = p[closed ? (i - 1 + L) % L : Math.max(i - 1, 0)], p1 = p[i], p2 = p[(i + 1) % L],
        p3 = p[closed ? (i + 2) % L : Math.min(i + 2, L - 1)];
      out.push([p1, [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6],
        [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6], p2]);
    }
    return out;
  }
  function smooth(p, closed) {
    var s = crSegs(p, closed), d = 'M' + P(p[0][0], p[0][1]);
    for (var i = 0; i < s.length; i++) {
      d += 'C' + P(s[i][1][0], s[i][1][1]) + ' ' + P(s[i][2][0], s[i][2][1]) + ' ' + P(s[i][3][0], s[i][3][1]);
    }
    return d + (closed ? 'Z' : '');
  }
  function bz(s, t) {
    var u = 1 - t;
    return [u * u * u * s[0][0] + 3 * u * u * t * s[1][0] + 3 * u * t * t * s[2][0] + t * t * t * s[3][0],
      u * u * u * s[0][1] + 3 * u * u * t * s[1][1] + 3 * u * t * t * s[2][1] + t * t * t * s[3][1]];
  }
  function dense(p, closed, k) {
    var s = crSegs(p, closed), out = [p[0]];
    for (var i = 0; i < s.length; i++) for (var j = 1; j <= k; j++) out.push(bz(s[i], j / k));
    return out;
  }
  function cub(a, b, c, d, k) {
    var s = [a, b, c, d], out = [];
    for (var j = 0; j <= k; j++) out.push(bz(s, j / k));
    return out;
  }
  /* Filled, tapered ribbon along a centerline (roots, trunks, branches, necks). */
  function taper(c, w0, w1) {
    var A = [], B = [], k = c.length;
    for (var i = 0; i < k; i++) {
      var a = c[Math.max(i - 1, 0)], b = c[Math.min(i + 1, k - 1)], dx = b[0] - a[0], dy = b[1] - a[1],
        len = Math.sqrt(dx * dx + dy * dy) || 1, w = (w0 + (w1 - w0) * i / (k - 1)) / 2;
      A.push([c[i][0] - dy / len * w, c[i][1] + dx / len * w]);
      B.push([c[i][0] + dy / len * w, c[i][1] - dx / len * w]);
    }
    return smooth(A.concat(B.reverse()), true);
  }
  /* Leafy, scalloped blob (foliage clusters, clouds, sponges). */
  function scallop(cx, cy, rx, ry, k, r, wob) {
    var pts = [], off = r() * 6.283, i;
    for (i = 0; i < k; i++) {
      var a = off + i / k * 6.283, m = 1 + (r() - .5) * wob;
      pts.push([cx + Math.cos(a) * rx * m, cy + Math.sin(a) * ry * m]);
    }
    var d = 'M' + P(pts[0][0], pts[0][1]);
    for (i = 1; i <= k; i++) {
      var q = pts[i % k], pr = pts[i - 1], ch = Math.sqrt((q[0] - pr[0]) * (q[0] - pr[0]) + (q[1] - pr[1]) * (q[1] - pr[1]));
      var rad = n(ch * (.56 + r() * .16));
      d += 'A' + rad + ' ' + rad + ' 0 0 1 ' + P(q[0], q[1]);
    }
    return d + 'Z';
  }
  /* Slightly irregular closed shape around an ellipse. */
  function wobble(cx, cy, rx, ry, k, r, wob) {
    var pts = [];
    for (var i = 0; i < k; i++) {
      var a = i / k * 6.283, m = 1 + (r() - .5) * wob;
      pts.push([cx + Math.cos(a) * rx * m, cy + Math.sin(a) * ry * m]);
    }
    return smooth(pts, true);
  }
  function leaf(x, y, len, wid, ang) {
    var c = Math.cos(ang), s = Math.sin(ang), tx = x + c * len, ty = y + s * len,
      mx = x + c * len * .5, my = y + s * len * .5, nx = -s * wid, ny = c * wid;
    return 'M' + P(x, y) + 'Q' + P(mx + nx, my + ny) + ' ' + P(tx, ty) + 'Q' + P(mx - nx, my - ny) + ' ' + P(x, y) + 'Z';
  }
  function profileY(dn) {
    return function (x) {
      for (var i = 1; i < dn.length; i++) {
        if (dn[i][0] >= x) {
          var a = dn[i - 1], b = dn[i];
          return a[1] + (b[1] - a[1]) * (x - a[0]) / ((b[0] - a[0]) || 1);
        }
      }
      return 700;
    };
  }
  var gy = profileY(dense(GROUND, false, 10));
  var ry = profileY(dense(REEF, false, 10));
  function attrs(o) {
    var s = '';
    for (var k in o) if (o[k] !== null && o[k] !== undefined) s += ' ' + k + '="' + o[k] + '"';
    return s;
  }
  function path(d, o) { o = o || {}; o.d = d; return '<path' + attrs(o) + '/>'; }
  function g(inner, o) { return '<g' + attrs(o || {}) + '>' + inner + '</g>'; }

  /* ---------------- defs ---------------- */
  function lin(id, x2, y2, stops, user, extra) {
    var s = '<linearGradient id="' + id + '" x1="0" y1="0" x2="' + x2 + '" y2="' + y2 + '"' +
      (user ? ' gradientUnits="userSpaceOnUse"' : '') + (extra || '') + '>';
    for (var i = 0; i < stops.length; i++) {
      s += '<stop offset="' + stops[i][0] + '" stop-color="' + stops[i][1] + '"' +
        (stops[i][2] !== undefined ? ' stop-opacity="' + stops[i][2] + '"' : '') + '/>';
    }
    return s + '</linearGradient>';
  }
  function rad(id, cx, cy, r, stops) {
    var s = '<radialGradient id="' + id + '" cx="' + cx + '" cy="' + cy + '" r="' + r + '" gradientUnits="userSpaceOnUse">';
    for (var i = 0; i < stops.length; i++) {
      s += '<stop offset="' + stops[i][0] + '" stop-color="' + stops[i][1] + '" stop-opacity="' + stops[i][2] + '"/>';
    }
    return s + '</radialGradient>';
  }
  function defs(id) {
    var r = rnd(7), hatch = '', i;
    for (i = 0; i < 30; i++) {
      var x = r() * 40, y = r() * 40, l = 1.5 + r() * 4, a = -0.62 + (r() - .5) * 1.1, light = i % 4 === 0;
      hatch += path('M' + P(x, y) + 'l' + P(Math.cos(a) * l, Math.sin(a) * l), {
        stroke: light ? '#ffffff' : '#3b2f1e', 'stroke-opacity': light ? n(.1 + r() * .08) : n(.05 + r() * .05),
        'stroke-width': n(.6 + r() * .6), 'stroke-linecap': 'round' });
    }
    var dots = '';
    for (i = 0; i < 7; i++) dots += 'M' + P(r() * 14, r() * 14) + 'm-.8 0a.8 .8 0 1 0 1.6 0a.8 .8 0 1 0 -1.6 0';
    return '<defs>' +
      lin(id + 'sky', 0, 1, [[0, '#c4dfe8'], [.5, '#e2ece6'], [.86, '#f6e7cc'], [1, '#f8e2bf']]) +
      rad(id + 'glow', 1440, 158, 330, [[0, '#fff4d8', .95], [.25, '#fde9bd', .55], [1, '#fde9bd', 0]]) +
      lin(id + 'water', 0, 640, [[0, '#8fd6cf'], [.1, '#7ccdc8'], [.45, '#4fb1b4'], [1, '#2a8796']], true, ' y1="210"') +
      rad(id + 'deep', 1720, 780, 760, [[0, '#0c3557', 1], [.42, '#16557d', .9], [.72, '#22719a', .35], [1, '#22719a', 0]]) +
      rad(id + 'shade', 330, 262, 240, [[0, '#2e5b45', .34], [.6, '#3d6b50', .14], [1, '#3d6b50', 0]]) +
      lin(id + 'veil', 0, 640, [[0, '#3b9aa6', .16], [.08, '#2a8c9c', .12], [.3, '#2a8c9c', .12], [1, '#1e6f86', .32]], true, ' y1="210"') +
      lin(id + 'shaft', 0, 1, [[0, '#ffffff', .5], [.55, '#ffffff', .14], [1, '#ffffff', 0]]) +
      lin(id + 'gnd', 1600, 0, [[0, '#b3a690'], [.26, '#b7a88f'], [.37, '#d2c4a4'], [.46, '#e9dcbb'],
        [.7, '#ecdfbf'], [1, '#e4d5b2']], true) +
      lin(id + 'gdk', 0, 640, [[0, '#f6efe0', 0], [.5, '#f6efe0', 0], [1, '#f6efe0', .35]], true, ' y1="180"') +
      lin(id + 'gsurf', 1600, 0, [[0, '#8f7354'], [.3, '#96795a'], [.4, '#c8a873'], [.47, '#e4c78d'], [.8, '#e9d098'], [1, '#dcc18b']], true) +
      lin(id + 'reefg', 0, 640, [[0, '#a48f6e'], [.5, '#8f8270'], [1, '#6f7a72']], true, ' y1="260"') +
      lin(id + 'hillf', 0, 1, [[0, '#b2c9bf'], [1, '#cfdcd2']]) +
      lin(id + 'hilln', 0, 1, [[0, '#8fae9c'], [1, '#b4c8b8']]) +
      lin(id + 'blade1', 0, 1, [[0, '#62b06b'], [1, '#3b8049']], false, '') +
      lin(id + 'blade2', 0, 1, [[0, '#7bbd70'], [.5, '#4c9a5b'], [1, '#3a7c48']]) +
      lin(id + 'blade3', 0, 1, [[0, '#a59a4f'], [.22, '#6aa762'], [1, '#3d8049']]) +
      lin(id + 'blade4', 0, 1, [[0, '#4f9e5c'], [1, '#2f6e3e']]) +
      lin(id + 'prop', 0, 1, [[0, '#7d9038'], [.7, '#6f7f33'], [1, '#6b4a2b']]) +
      lin(id + 'elk', 0, 1, [[0, '#d9b36d'], [1, '#b98440']]) +
      lin(id + 'brain', 0, 1, [[0, '#cbb66b'], [1, '#9c8848']]) +
      lin(id + 'boulder', 0, 1, [[0, '#b7a46a'], [1, '#8c7c4c']]) +
      lin(id + 'sun', 0, 1, [[0, '#fadb8c'], [1, '#f2b85a']]) +
      '<pattern id="' + id + 'hatch" width="40" height="40" patternUnits="userSpaceOnUse">' + hatch + '</pattern>' +
      '<pattern id="' + id + 'polyp" width="14" height="14" patternUnits="userSpaceOnUse">' +
        path(dots, { fill: '#5e5130', 'fill-opacity': .32 }) + '</pattern>' +
      '<pattern id="' + id + 'mesh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
        path('M0 0H7M0 0V7', { stroke: '#6d3a7e', 'stroke-width': .9, 'stroke-opacity': .75, fill: 'none' }) + '</pattern>' +
      '<pattern id="' + id + 'scale" width="5" height="4" patternUnits="userSpaceOnUse">' +
        path('M0 4a2.5 2.5 0 0 1 5 0M-2.5 2a2.5 2.5 0 0 1 5 0M2.5 2a2.5 2.5 0 0 1 5 0',
          { fill: 'none', stroke: '#0b2a3c', 'stroke-opacity': .14, 'stroke-width': .6 }) + '</pattern>' +
      '<clipPath id="' + id + 'wclip"><rect x="124" y="120" width="1480" height="130"/></clipPath>' +
      '</defs>';
  }

  /* ---------------- sky, hills ---------------- */
  function cloud(cx, cy, w, h, r) {
    var top = '', base = '', k = 4 + Math.floor(r() * 2), i;
    for (i = 0; i < k; i++) {
      var t = (i + .5) / k, bx = cx - w / 2 + t * w, bh = h * (.55 + Math.sin(t * Math.PI) * .6) * (.85 + r() * .3);
      top += wobble(bx, cy - bh * .35, w / k * .78, bh * .62, 10, r, .08);
    }
    base = wobble(cx, cy + h * .08, w * .55, h * .3, 12, r, .05);
    return path(top + base, { fill: '#fffaf1' }) +
      path(wobble(cx + w * .04, cy + h * .2, w * .48, h * .16, 12, r, .06), { fill: '#efe1ca', opacity: .75 });
  }
  function sky(id) {
    var r = rnd(3);
    var sun = path(wobble(1440, 156, 36, 36, 16, r, .025), { fill: 'url(#' + id + 'sun)' }) +
      path(wobble(1434, 150, 24, 23, 12, r, .04), { fill: '#fde6a6', opacity: .55 });
    var clouds = g(cloud(660, 92, 170, 40, r), { 'class': 'ss-hero__cloud', style: '--t:40s;--d:-6s' }) +
      g(cloud(1110, 64, 120, 30, r), { 'class': 'ss-hero__cloud', style: '--t:34s;--d:-19s' }) +
      g(cloud(250, 46, 112, 26, r), { 'class': 'ss-hero__cloud', style: '--t:38s;--d:-27s' });
    return '<rect width="1600" height="' + (SEA + 20) + '" fill="url(#' + id + 'sky)"/>' +
      '<rect width="1600" height="' + (SEA + 20) + '" fill="url(#' + id + 'glow)"/>' + sun + clouds;
  }
  function hills(id) {
    var far = smooth([[-20, 214], [-20, 122], [40, 104], [110, 112], [190, 94], [262, 112], [330, 138],
      [410, 156], [480, 178], [560, 200], [620, 214]], false) + 'Z';
    var near = smooth([[-20, 214], [-20, 150], [50, 136], [120, 146], [190, 158], [250, 176], [310, 198], [350, 214]], false) + 'Z';
    return path(far, { fill: 'url(#' + id + 'hillf)' }) + path(near, { fill: 'url(#' + id + 'hilln)' });
  }

  /* ---------------- water and light ---------------- */
  function water(id) {
    return '<rect y="' + (SEA - 2) + '" width="1600" height="' + (642 - SEA) + '" fill="url(#' + id + 'water)"/>' +
      '<rect y="' + SEA + '" width="1600" height="' + (640 - SEA) + '" fill="url(#' + id + 'deep)"/>' +
      '<rect y="' + SEA + '" width="700" height="200" fill="url(#' + id + 'shade)"/>';
  }
  function shafts(id) {
    var list = [[560, 46, 270, 11, -2], [720, 78, 330, 14, -7], [905, 40, 300, 12, -4], [1060, 70, 290, 15, -10],
      [1400, 92, 340, 13, -1]], s = '';
    for (var i = 0; i < list.length; i++) {
      var x = list[i][0], w = list[i][1], len = list[i][2], sl = -.36 * len, w2 = w * 1.7;
      s += path('M' + P(x - w / 2, SEA) + 'L' + P(x + w / 2, SEA) + 'L' + P(x + sl + w2 / 2, SEA + len) +
        'L' + P(x + sl - w2 / 2, SEA + len) + 'Z', { fill: 'url(#' + id + 'shaft)', 'class': 'ss-hero__shaft',
        style: '--t:' + list[i][3] + 's;--d:' + list[i][4] + 's' });
    }
    return s;
  }

  /* ---------------- seabed ---------------- */
  function ground(id) {
    var r = rnd(19), pts = GROUND.slice(), i, deco = '';
    var top = smooth(pts, false);
    var shape = top + 'L1570 700L-20 700Z';
    var under = [];
    for (i = GROUND.length - 1; i >= 0; i--) under.push([GROUND[i][0], GROUND[i][1] + 13 + Math.sin(i * 2.3) * 3]);
    var skin = top + 'L' + P(under[0][0], under[0][1]) + smooth(under, false).slice(1).replace(/^[^C]*/, '') + 'Z';
    /* blue carbon: dark organic peat under the mangroves, thinner layer under seagrass */
    var peat = [], peat2 = [];
    for (i = 130; i <= 540; i += 30) peat.push([i, gy(i) + 12 + Math.sin(i / 40) * 3]);
    for (i = 540; i >= 130; i -= 30) peat.push([i, gy(i) + 14 + 40 * Math.sin(Math.PI * (i - 130) / 410) + Math.sin(i / 23) * 3]);
    for (i = 720; i <= 1060; i += 40) peat2.push([i, gy(i) + 8]);
    for (i = 1060; i >= 720; i -= 40) peat2.push([i, gy(i) + 18 + Math.sin(i / 31) * 2]);
    deco += path(smooth(peat, true), { fill: '#7a5f43', opacity: .42 });
    /* faint sediment strata parallel to the seabed */
    var strata = '';
    for (var lay = 1; lay <= 4; lay++) {
      var sp = [];
      for (i = -20; i <= 1560; i += 40) sp.push([i, Math.min(gy(i) + 30 + lay * 34 + Math.sin(i / 70 + lay) * 4, 700)]);
      strata += smooth(sp, false);
    }
    deco += path(strata, { fill: 'none', stroke: '#8f7a5c', 'stroke-opacity': .16, 'stroke-width': 1.2, 'stroke-dasharray': '26 9 4 9' });
    deco += path(smooth(peat2, true), { fill: '#b39867', opacity: .35 });
    /* fine roots in the mud */
    var fr = '';
    for (i = 0; i < 34; i++) {
      var x = 160 + r() * 380, y = gy(x) + 6, l = 16 + r() * 34, a = 1.2 + r() * .7;
      fr += 'M' + P(x, y) + 'q' + P(Math.cos(a) * l * .5 + 3, l * .5) + ' ' + P(Math.cos(a) * l, l);
    }
    deco += path(fr, { fill: 'none', stroke: '#4d3a28', 'stroke-opacity': .3, 'stroke-width': 1, 'stroke-linecap': 'round' });
    /* shell grit in the sand */
    var grit = '';
    for (i = 0; i < 60; i++) {
      var gx = 560 + r() * 1000, gyy = gy(gx) + 10 + r() * (640 - gy(gx));
      if (gyy > 632) continue;
      grit += 'M' + P(gx, gyy) + 'm-1.4 0a1.4 .9 0 1 0 2.8 0a1.4 .9 0 1 0 -2.8 0';
    }
    deco += path(grit, { fill: '#fbf1d6', opacity: .55 });
    /* sand ripples on the lagoon floor */
    var rip = '';
    for (i = 760; i < 1420; i += 26 + r() * 14) rip += 'M' + P(i, gy(i) + 6) + 'q' + P(6, -3) + ' ' + P(12, 0);
    deco += path(rip, { fill: 'none', stroke: '#c5a96d', 'stroke-width': 1.2, opacity: .6, 'stroke-linecap': 'round' });
    /* black mangrove pneumatophores on the landward mud */
    var pn = '';
    for (i = 0; i < 16; i++) { var px = 56 + r() * 66; pn += 'M' + P(px, gy(px) + 2) + 'l' + P(r() - .5, -(4 + r() * 7)); }
    deco += path(pn, { stroke: '#6a5440', 'stroke-width': 1.6, 'stroke-linecap': 'round', fill: 'none' });
    var gr = '';
    for (i = 0; i < 40; i++) {
      var tx = -10 + r() * 112, ty = gy(tx) + 1, th = 6 + r() * 10, tl = (r() - .35) * 8;
      gr += 'M' + P(tx, ty) + 'q' + P(tl * .3, -th * .6) + ' ' + P(tl, -th);
    }
    deco += path(gr, { stroke: '#7d8a45', 'stroke-width': 1.5, 'stroke-linecap': 'round', fill: 'none' });
    return path(shape, { fill: 'url(#' + id + 'gnd)' }) + path(shape, { fill: 'url(#' + id + 'gdk)' }) + path(shape, { fill: 'url(#' + id + 'hatch)' }) +
      path(skin, { fill: 'url(#' + id + 'gsurf)' }) +
      deco + path(top, { fill: 'none', stroke: '#8b7150', 'stroke-width': 2, 'stroke-opacity': .55, 'stroke-linecap': 'round' });
  }

  /* ---------------- mangroves ---------------- */
  var TREES = [
    { x: 266, top: 190, crown: [270, 102, 98, 44], spread: 92, roots: 8, seed: 11 },
    { x: 372, top: 186, crown: [376, 86, 112, 54], spread: 112, roots: 9, seed: 23 },
    { x: 460, top: 192, crown: [470, 106, 90, 44], spread: 70, roots: 9, seed: 37 }
  ];
  function mangroves(id) {
    var back = '', front = '', epi = '', above = '', props = '';
    var shadow = '', base = '', mid = '', light = '', leavesD = '', leavesL = '', hatchD = '';
    for (var t = 0; t < TREES.length; t++) {
      var T = TREES[t], r = rnd(T.seed), i, c = T.crown;
      /* prop roots: arch out from the trunk, then drop vertically into the mud */
      for (i = 0; i < T.roots; i++) {
        var side = i % 2 ? 1 : -1, reach = T.spread * (.32 + .72 * ((i + r()) / T.roots));
        var sx = T.x + side * (2 + r() * 3), sy = T.top - 2 - r() * 34;
        var ex = T.x + side * reach, ey = gy(ex) + 10;
        var line = cub([sx, sy], [sx + side * reach * .44, sy - 16 - r() * 12], [ex - side * reach * .12, sy + (ey - sy) * .22], [ex, ey], 20);
        var root = path(taper(line, 6.6 + r() * 1.6, 3.6), { fill: '#6c5141' });
        var hi = path(smooth(line.slice(1, 12), false), { fill: 'none', stroke: '#9b7b5f', 'stroke-width': 1.1, 'stroke-opacity': .55 });
        var isFront = (t > 0 && side > 0 && r() < .6) || (t === 2 && r() < .5);
        if (isFront) front += root + hi; else back += root + hi;
        if (r() < .55) {
          var bp = line[8 + Math.floor(r() * 3)], ex2 = ex + side * (14 + r() * 26);
          var br = cub(bp, [bp[0] + side * 16, bp[1] - 4], [ex2 - side * 6, bp[1] + (gy(ex2) - bp[1]) * .3], [ex2, gy(ex2) + 10], 12);
          var b2 = path(taper(br, 3.8, 2.6), { fill: '#6c5141' });
          if (isFront) front += b2; else back += b2;
        }
        /* sponges, oysters and algae growing on submerged roots */
        if (t > 0 && r() < .45) {
          var q = line[13 + Math.floor(r() * 4)];
          if (q[1] > SEA + 10 && q[1] < gy(q[0]) - 4) {
            var kind = r(), col = kind < .3 ? '#e0823e' : kind < .55 ? '#8c5aa2' : kind < .75 ? '#d8b13c' : '#d9d2c0';
            epi += path(wobble(q[0] + side * 1.5, q[1], 2.4 + r() * 1.8, 2 + r() * 1.4, 8, r, .25),
              { fill: col, opacity: .8 });
          }
        }
      }
      /* aerial drop roots from the lower branches */
      for (i = 0; i < 2; i++) {
        var sd = i ? 1 : -1, dx = c[0] + sd * c[2] * (.42 + r() * .12), dy = c[1] + c[3] * .66, ddx = dx + sd * (14 + r() * 16);
        var dl = cub([dx, dy], [dx + sd * 10, dy + 6], [ddx, dy + 30], [ddx, gy(ddx) + 10], 16);
        back += path(taper(dl, 3, 2.4), { fill: '#715646' });
      }
      /* trunk and branches */
      above += path(taper(cub([T.x, T.top + 8], [T.x + 1, T.top - 14], [T.x + 5, c[1] + 30], [T.x + 6, c[1] + 4], 12), 12, 6.5), { fill: '#634b3b' });
      for (i = 0; i < 3; i++) {
        var a0 = [T.x + 4, T.top - 18 - i * 10], tx = c[0] + (i - 1) * c[2] * .55, ty = c[1] + 6 - r() * 16;
        above += path(taper(cub(a0, [a0[0] + (tx - a0[0]) * .4, a0[1] - 8], [tx, ty + 14], [tx, ty], 10), 5.2, 2), { fill: '#5d4637' });
      }
      /* crown: overlapping scalloped leaf clusters in four tones, lit from the right (sun) */
      var cl = [], tries = 0;
      while (cl.length < 18 && tries < 300) {
        tries++;
        var ux = r() * 2 - 1, uy = r() * 2 - 1;
        if (ux * ux + uy * uy > 1) continue;
        cl.push([c[0] + ux * c[2] * .76, c[1] + uy * c[3] * .62 - 2, 17 + r() * 11]);
      }
      cl.push([c[0] - c[2] * .84, c[1] + c[3] * .22, 18], [c[0] + c[2] * .86, c[1] + c[3] * .18, 18], [c[0], c[1] - c[3] * .72, 22]);
      for (i = 0; i < cl.length; i++) {
        var C = cl[i], rr = C[2];
        shadow += scallop(C[0] - 3, C[1] + 6, rr, rr * .86, 9, r, .3);
        base += scallop(C[0], C[1], rr * .96, rr * .82, 9, r, .3);
        hatchD += scallop(C[0], C[1], rr * .96, rr * .82, 7, r, .2);
        if (C[1] < c[1] + c[3] * .25) mid += scallop(C[0] + 3, C[1] - 4, rr * .74, rr * .6, 8, r, .3);
        if (C[0] > c[0] - c[2] * .3 && C[1] < c[1]) light += scallop(C[0] + 6, C[1] - 8, rr * .42, rr * .32, 7, r, .3);
      }
      /* leaf fringe along the lower edge and sides */
      for (i = 0; i < 26; i++) {
        var ang = Math.PI * (-.1 + r() * 1.2), lx = c[0] + Math.cos(ang) * c[2] * (.86 + r() * .12),
          ly = c[1] + Math.sin(ang) * c[3] * (.9 + r() * .14) + 2;
        var dir = ang + (r() - .5) * .9;
        var lf = leaf(lx, ly, 8 + r() * 5, 2.6 + r() * 1.2, dir);
        if (r() < .55) leavesD += lf; else leavesL += lf;
      }
      for (i = 0; i < 14; i++) {
        var hx = c[0] + (r() * .9 - .1) * c[2] * .8, hy = c[1] - r() * c[3] * .7;
        leavesL += leaf(hx, hy, 7 + r() * 4, 2.4, -1.2 + r() * 1.6);
      }
      /* propagules: long pencil-like seedlings hanging below the canopy */
      for (i = 0; i < 2 + (t === 1 ? 1 : 0); i++) {
        var pxx = c[0] + (r() - .5) * c[2] * 1.1, pyy = c[1] + c[3] * .78 + r() * 6, pl = 32 + r() * 14;
        var shape = 'M' + P(pxx - 1.1, pyy) + 'C' + P(pxx - 2.4, pyy + pl * .4) + ' ' + P(pxx - 2.6, pyy + pl * .8) + ' ' + P(pxx, pyy + pl) +
          'C' + P(pxx + 2.6, pyy + pl * .8) + ' ' + P(pxx + 2.4, pyy + pl * .4) + ' ' + P(pxx + 1.1, pyy) + 'Z';
        props += g(path(shape, { fill: 'url(#' + id + 'prop)', stroke: '#4f5a25', 'stroke-width': .6, 'stroke-opacity': .5 }) +
          path(wobble(pxx, pyy, 2.6, 2.2, 7, r, .2), { fill: '#4d5b26' }),
          {});
      }
    }
    var crown = path(shadow, { fill: '#3e4c24' }) + path(base, { fill: '#56682e', id: id + 'cb' }) +
      path(hatchD, { fill: 'url(#' + id + 'hatch)' }) +
      path(mid, { fill: '#6b7b3a' }) + path(light, { fill: '#8b9a49', opacity: .9 }) +
      path(leavesD, { fill: '#48592a' }) + path(leavesL, { fill: '#7f8f40' });
    return { back: back, front: front + epi, above: above, crown: crown + props };
  }

  /* Great egret standing in the landward shallows, facing the water. */
  function egret() {
    var x = 128, y = gy(128) + 3;
    var neck = cub([x + 2, y - 33], [x + 10, y - 40], [x + 1, y - 48], [x + 7, y - 55], 12);
    return g(
      path('M' + P(x - 1, y) + 'L' + P(x - 2, y - 14) + 'L' + P(x - 4, y - 26) + 'M' + P(x + 4, y) + 'L' + P(x + 3, y - 13) + 'L' + P(x + 1, y - 26),
        { stroke: '#2a2a26', 'stroke-width': 1.5, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }) +
      path('M' + P(x - 20, y - 22) + 'C' + P(x - 14, y - 26) + ' ' + P(x - 6, y - 36) + ' ' + P(x + 4, y - 35) +
        'C' + P(x + 9, y - 34) + ' ' + P(x + 9, y - 27) + ' ' + P(x + 3, y - 24) + 'C' + P(x - 4, y - 21) + ' ' + P(x - 12, y - 20) + ' ' + P(x - 20, y - 22) + 'Z',
        { fill: '#fdfcf7', stroke: '#9aa5a6', 'stroke-width': .9 }) +
      path(taper(neck, 5.4, 3.4), { fill: '#fdfcf7', stroke: '#9aa5a6', 'stroke-width': .8 }) +
      path(wobble(x + 9, y - 56, 4.6, 3.2, 9, rnd(5), .05), { fill: '#fdfcf7', stroke: '#9aa5a6', 'stroke-width': .8 }) +
      path('M' + P(x + 12, y - 57.6) + 'L' + P(x + 26, y - 55.2) + 'L' + P(x + 12, y - 54.4) + 'Z', { fill: '#e2b23c', stroke: '#b98b26', 'stroke-width': .5 }) +
      '<circle cx="' + (x + 10.4) + '" cy="' + (y - 56.8) + '" r=".9" fill="#2a2a26"/>' +
      path('M' + P(x - 14, y - 24) + 'C' + P(x - 8, y - 27) + ' ' + P(x - 2, y - 29) + ' ' + P(x + 3, y - 28), { fill: 'none', stroke: '#c9d0cf', 'stroke-width': 1.2 })
    );
  }

  /* ---------------- seagrass (turtle grass) ---------------- */
  function shoot(id, x, y, h, k, r) {
    var s = '';
    for (var i = 0; i < k; i++) {
      var a = (i - (k - 1) / 2) * (.12 + r() * .06) + (r() - .5) * .1, bh = h * (.62 + r() * .45);
      var bend = (r() - .5) * 12 + a * 30, tx = Math.sin(a) * bh + bend * .4, ty = -Math.cos(a) * bh;
      var gidx = 1 + Math.floor(r() * 4);
      s += path('M' + P((i - (k - 1) / 2) * 1.6, 0) + 'Q' + P(tx * .3 + bend, ty * .55) + ' ' + P(tx, ty), {
        fill: 'none', stroke: 'url(#' + id + 'blade' + gidx + ')', 'stroke-width': n(4.4 + r() * 1.8), 'stroke-linecap': 'round' });
    }
    return s;
  }
  function seagrass(id) {
    var r = rnd(41), main = '', fore = '', backD = '', x = 582;
    /* far, static, paler blades for density */
    for (var i = 0; i < 80; i++) {
      var bx = 560 + r() * 500, by = gy(bx) + 3, bh = 20 + r() * 40 * (bx > 700 ? 1 : .7);
      backD += 'M' + P(bx, by) + 'q' + P((r() - .5) * 10, -bh * .6) + ' ' + P((r() - .5) * 8, -bh);
    }
    while (x < 1052) {
      var y = gy(x) + 5, mid = Math.sin(Math.PI * Math.min(1, Math.max(0, (x - 560) / 500)));
      var h = (x < 650 ? 40 : 46) + 22 * mid + r() * 12, k = 2 + Math.floor(r() * 3);
      var d = -((x - 560) / 110 + r() * .7), x2 = x + 10 + r() * 6, y2 = gy(x2) + 5;
      /* a pair of shoots on one short rhizome sways together; pairs are staggered */
      var pair = shoot(id, 0, 0, h, k, r) + g(shoot(id, 0, 0, h * (.75 + r() * .3), 2 + Math.floor(r() * 2), r), { transform: 'translate(' + n(x2 - x) + ' ' + n(y2 - y) + ')' });
      main += g(g(pair, { 'class': 'ss-hero__blade', style: '--t:' + n(3 + r() * .8) + 's;--d:' + n(d) + 's' }),
        { transform: 'translate(' + n(x) + ' ' + n(y) + ')' });
      x = x2 + 14 + r() * 10;
    }
    var fx = [612, 760, 905, 990, 1040];
    for (i = 0; i < fx.length; i++) {
      var fy = gy(fx[i]) + 6;
      fore += g(g(shoot(id, fx[i], fy, 60 + r() * 18, 3, r), { 'class': 'ss-hero__blade', style: '--t:' + n(3.2 + r() * .6) + 's;--d:' + n(-(fx[i] - 560) / 110) + 's' }),
        { transform: 'translate(' + fx[i] + ' ' + n(fy) + ')' });
    }
    /* a queen conch resting in the meadow */
    var cx = 838, cy = gy(838) - 1;
    var conch = path('M' + P(cx - 12, cy) + 'C' + P(cx - 10, cy - 10) + ' ' + P(cx + 2, cy - 15) + ' ' + P(cx + 12, cy - 9) +
      'L' + P(cx + 6, cy - 6) + 'C' + P(cx + 9, cy - 3) + ' ' + P(cx + 8, cy) + ' ' + P(cx + 4, cy) + 'Z', { fill: '#e9c9a0', stroke: '#a9805a', 'stroke-width': .9 }) +
      path('M' + P(cx - 4, cy) + 'C' + P(cx - 2, cy - 5) + ' ' + P(cx + 3, cy - 6) + ' ' + P(cx + 6, cy - 4), { fill: 'none', stroke: '#e79a83', 'stroke-width': 1.6, 'stroke-linecap': 'round' });
    return {
      back: path(backD, { fill: 'none', stroke: '#6ea779', 'stroke-opacity': .6, 'stroke-width': 3.6, 'stroke-linecap': 'round' }),
      main: main + conch, fore: fore
    };
  }

  /* ---------------- coral reef ---------------- */
  function outlined(shapes, fill, line, sw) {
    return path(shapes, { fill: line, stroke: line, 'stroke-width': sw, 'stroke-linejoin': 'round' }) + path(shapes, { fill: fill });
  }
  /* Elkhorn: thick base, broad flattened branches that fan toward the waves; pale growing tips. */
  function elkhorn(id, x, y, s, r) {
    var shapes = '', tips = '', i;
    shapes += taper(cub([x, y + 8], [x, y - 6 * s], [x + 2 * s, y - 12 * s], [x + 3 * s, y - 20 * s], 8), 22 * s, 17 * s);
    var angs = [-1.32, -.82, -.28, .3, .86, 1.3];
    for (i = 0; i < angs.length; i++) {
      var a = angs[i] + (r() - .5) * .16, len = (34 + r() * 14) * s * (1 - Math.abs(angs[i]) * .12), b0 = [x + 3 * s, y - 18 * s];
      var e = [b0[0] + Math.sin(a) * len, b0[1] - Math.cos(a) * len * .62 - 6 * s];
      var line = cub(b0, [b0[0] + Math.sin(a) * len * .35, b0[1] - len * .32], [e[0] - Math.sin(a) * 8 * s, e[1] + 3 * s], e, 12);
      shapes += taper(line, 16 * s, 12.5 * s);
      for (var j = -1; j <= 1; j += 2) {
        var ta = a + j * (.32 + r() * .12), tl = (13 + r() * 7) * s, te = [e[0] + Math.sin(ta) * tl, e[1] - Math.cos(ta) * tl * .7];
        var tline = cub(e, [e[0] + Math.sin(ta) * tl * .45, e[1] - tl * .3], te, te, 8);
        shapes += taper(tline, 11 * s, 8.6 * s);
        tips += path(wobble(te[0], te[1], 4.6 * s, 4 * s, 8, r, .15), {});
      }
    }
    return outlined(shapes, 'url(#' + id + 'elk)', '#8a5f2e', 2.4) + tips.replace(/<path /g, '<path fill="#f1e0b2" fill-opacity=".9" ');
  }
  function staghorn(x, y, h, r) {
    var lines = '', tips = '';
    function br(x0, y0, a, len, depth) {
      var x1 = x0 + Math.sin(a) * len, y1 = y0 - Math.cos(a) * len, mx = x0 + Math.sin(a) * len * .5 + (r() - .5) * 4;
      lines += 'M' + P(x0, y0) + 'Q' + P(mx, y0 - Math.cos(a) * len * .5) + ' ' + P(x1, y1);
      if (depth > 0) {
        br(x1, y1, a - .32 - r() * .2, len * (.62 + r() * .15), depth - 1);
        br(x1, y1, a + .3 + r() * .2, len * (.62 + r() * .15), depth - 1);
      } else tips += 'M' + P(x1, y1) + 'l' + P(Math.sin(a) * 2.5, -Math.cos(a) * 2.5);
    }
    for (var i = 0; i < 4; i++) br(x + (i - 1.5) * 8, y, (i - 1.5) * .32, h * (.36 + r() * .1), 2);
    return path(lines, { fill: 'none', stroke: '#8f6a36', 'stroke-width': 8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }) +
      path(lines, { fill: 'none', stroke: '#c99c58', 'stroke-width': 5.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }) +
      path(tips, { fill: 'none', stroke: '#f0dfb0', 'stroke-width': 4.6, 'stroke-linecap': 'round' });
  }
  /* Brain coral: dome with meandering grooves that follow its curvature. */
  function brain(id, x, y, w, h, r) {
    var dome = 'M' + P(x - w / 2, y + 4) + 'C' + P(x - w / 2, y - h * .7) + ' ' + P(x - w * .3, y - h) + ' ' + P(x, y - h) +
      'C' + P(x + w * .32, y - h) + ' ' + P(x + w / 2, y - h * .68) + ' ' + P(x + w / 2, y + 4) + 'Z';
    var gr = '';
    for (var k = 1; k <= 5; k++) {
      var sc = k / 5.6, pts = [];
      for (var i = 0; i <= 22; i++) {
        var th = Math.PI * (1 - i / 22), wig = Math.sin(i * 1.9 + k * 2.1) * 2.2;
        pts.push([x + Math.cos(th) * (w / 2) * sc * .96 + wig * .4, y + 2 - Math.sin(th) * h * sc * .98 + wig]);
      }
      gr += smooth(pts, false);
    }
    return path(dome, { fill: 'url(#' + id + 'brain)', stroke: '#7d6b34', 'stroke-width': 1.6 }) +
      path(gr, { fill: 'none', stroke: '#7f6d36', 'stroke-width': 1.5, 'stroke-opacity': .75, 'stroke-linecap': 'round' }) +
      path(gr, { fill: 'none', stroke: '#e3cf86', 'stroke-width': .9, 'stroke-opacity': .5, transform: 'translate(1.6 -1.8)' }) +
      path('M' + P(x + w * .12, y - h * .9) + 'C' + P(x + w * .3, y - h * .84) + ' ' + P(x + w * .4, y - h * .6) + ' ' + P(x + w * .42, y - h * .4),
        { fill: 'none', stroke: '#f2e3a6', 'stroke-width': 2.4, 'stroke-opacity': .55, 'stroke-linecap': 'round' });
  }
  /* Boulder star coral: lobed mound dotted with polyps. */
  function boulder(id, x, y, w, h, r) {
    var lobes = '', k = 4;
    for (var i = 0; i < k; i++) {
      var lx = x - w / 2 + (i + .5) * w / k, lh = h * (.6 + r() * .45);
      lobes += 'M' + P(lx - w / k * .62, y + 6) + 'C' + P(lx - w / k * .64, y - lh) + ' ' + P(lx + w / k * .64, y - lh) + ' ' + P(lx + w / k * .62, y + 6) + 'Z';
    }
    return outlined(lobes, 'url(#' + id + 'boulder)', '#6e6136', 2.4) + path(lobes, { fill: 'url(#' + id + 'polyp)' });
  }
  /* Sea fan (gorgonian): flat lattice facing the viewer, swaying slightly. */
  function seafan(id, x, y, h, w, r, t, d) {
    var o = [[x - 3, y], [x - w * .38, y - h * .36], [x - w * .5, y - h * .7], [x - w * .3, y - h * .96], [x + w * .05, y - h],
      [x + w * .38, y - h * .88], [x + w * .5, y - h * .56], [x + w * .3, y - h * .22], [x + 3, y]];
    var out = smooth(o, true), veins = '';
    for (var i = 0; i < 9; i++) {
      var tp = o[1 + Math.min(7, Math.floor(i * 7 / 8))], tq = o[1 + Math.min(7, Math.ceil(i * 7 / 8))], f = (i * 7 / 8) % 1;
      var ex = tp[0] + (tq[0] - tp[0]) * f, ey = tp[1] + (tq[1] - tp[1]) * f;
      veins += 'M' + P(x, y - 4) + 'Q' + P(x + (ex - x) * .35, y - h * .45) + ' ' + P(ex * .92 + x * .08, ey * .92 + y * .08);
    }
    return g(path(out, { fill: '#9a55a8', 'fill-opacity': .4 }) + path(out, { fill: 'url(#' + id + 'mesh)' }) +
      path(veins, { fill: 'none', stroke: '#7a3c8a', 'stroke-width': 1.4, 'stroke-linecap': 'round' }) +
      path(out, { fill: 'none', stroke: '#8a4799', 'stroke-width': 2.2 }) +
      path('M' + P(x, y + 6) + 'L' + P(x, y - 6), { stroke: '#6d3478', 'stroke-width': 4, 'stroke-linecap': 'round' }),
      { 'class': 'ss-hero__fan', style: '--t:' + t + 's;--d:' + d + 's' });
  }
  function tubes(x, y, cols, r) {
    var s = '';
    for (var i = 0; i < cols.length; i++) {
      var tx = x + (i - (cols.length - 1) / 2) * 12, th = 30 + r() * 26, lean = (i - (cols.length - 1) / 2) * 4, w = 10 + r() * 3;
      var body = 'M' + P(tx - w / 2, y + 4) + 'C' + P(tx - w / 2 - 1, y - th * .5) + ' ' + P(tx + lean - w / 2 - 1, y - th * .8) + ' ' + P(tx + lean - w / 2, y - th) +
        'L' + P(tx + lean + w / 2, y - th) + 'C' + P(tx + lean + w / 2 + 1, y - th * .8) + ' ' + P(tx + w / 2 + 1, y - th * .5) + ' ' + P(tx + w / 2, y + 4) + 'Z';
      s += path(body, { fill: cols[i][0], stroke: cols[i][1], 'stroke-width': 1.4 }) +
        '<ellipse cx="' + n(tx + lean) + '" cy="' + n(y - th) + '" rx="' + n(w / 2) + '" ry="2.6" fill="' + cols[i][1] + '"/>' +
        path('M' + P(tx - w * .15, y - 4) + 'L' + P(tx + lean - w * .15, y - th + 5), { stroke: '#ffffff', 'stroke-opacity': .25, 'stroke-width': 2, 'stroke-linecap': 'round' });
    }
    return s;
  }
  function barrel(x, y, w, h) {
    var L = [[x - w * .3, y + 4], [x - w * .44, y - h * .25], [x - w * .52, y - h * .6], [x - w * .5, y - h * .92]];
    var Rr = [[x + w * .5, y - h * .92], [x + w * .53, y - h * .6], [x + w * .45, y - h * .25], [x + w * .3, y + 4]];
    var b = smooth(L, false) + 'Q' + P(x, y - h * 1.04) + ' ' + P(Rr[0][0], Rr[0][1]) + smooth(Rr, false).replace(/^M[^C]*/, '') + 'Z';
    var tiers = '', i;
    for (i = 1; i < 5; i++) {
      var ty = y - h * i / 5, hw = w * (.32 + i * .045);
      tiers += 'M' + P(x - hw, ty) + 'Q' + P(x, ty + 5) + ' ' + P(x + hw, ty);
    }
    return path(b, { fill: '#a4563f', stroke: '#6b3426', 'stroke-width': 1.8 }) +
      path(tiers, { fill: 'none', stroke: '#c9805f', 'stroke-width': 1.8, 'stroke-opacity': .6, 'stroke-linecap': 'round' }) +
      path(tiers, { fill: 'none', stroke: '#6e3527', 'stroke-width': 1.2, 'stroke-opacity': .55, transform: 'translate(0 2)' }) +
      '<ellipse cx="' + x + '" cy="' + n(y - h * .93) + '" rx="' + n(w * .44) + '" ry="' + n(h * .08) + '" fill="#4a2119"/>';
  }
  function plates(x, y, r) {
    var s = '';
    for (var i = 0; i < 3; i++) {
      var px = x + i * 9, py = y + i * 24, w = 34 - i * 4;
      s += path('M' + P(px - w * .2, py) + 'C' + P(px, py - 9) + ' ' + P(px + w * .7, py - 8) + ' ' + P(px + w, py - 2) +
        'C' + P(px + w * .7, py + 1) + ' ' + P(px + w * .2, py + 3) + ' ' + P(px - w * .2, py) + 'Z', { fill: '#a88655', stroke: '#6f5636', 'stroke-width': 1.2 }) +
        path('M' + P(px + w * .1, py - 4) + 'C' + P(px + w * .4, py - 7) + ' ' + P(px + w * .7, py - 6) + ' ' + P(px + w * .95, py - 2), { fill: 'none', stroke: '#e6cf9a', 'stroke-width': 1.1 });
    }
    return s;
  }
  function rods(x, y, h, r) {
    var d = '';
    for (var i = 0; i < 4; i++) {
      var a = (i - 1.5) * .22, x1 = x + Math.sin(a) * h, y1 = y - Math.cos(a) * h * (.8 + r() * .3);
      d += 'M' + P(x, y) + 'Q' + P(x + (x1 - x) * .2 + (r() - .5) * 8, y - h * .5) + ' ' + P(x1, y1);
      d += 'M' + P(x + (x1 - x) * .6, y + (y1 - y) * .6) + 'l' + P((r() - .5) * 18, -h * .25);
    }
    return path(d, { fill: 'none', stroke: '#7d4a6a', 'stroke-width': 3.2, 'stroke-linecap': 'round' }) +
      path(d, { fill: 'none', stroke: '#b07a96', 'stroke-width': 1.4, 'stroke-linecap': 'round', 'stroke-dasharray': '1.5 2.5' });
  }
  function reef(id) {
    var r = rnd(53), i;
    var mound = smooth(REEF, false) + 'L1512 700L930 700Z';
    /* reef face seen from the lagoon: framework with crevices, covered by massive colonies,
       finger corals and encrusting sponges, sparser and darker with depth */
    var items = [], holes = '', cca = '', polyps = '';
    for (i = 0; i < 190; i++) {
      var lx = 1004 + r() * 500, top = ry(lx);
      if (top > 590) continue;
      var dep = Math.pow(r(), 1.35), ly = top + 10 + dep * (574 - top);
      if (ly > 574 || ly < top + 8) continue;
      items.push([ly, lx, r(), dep]);
    }
    items.sort(function (u, v) { return u[0] - v[0]; });
    var DOMES = ['#b59a5c', '#a39660', '#b48d63', '#99966a', '#bda36a', '#a98a70'], cols = '';
    var domeD = DOMES.map(function () { return ''; }), hiD = '', fing = { '#bf9f62': '', '#a28fae': '' }, spong = {};
    for (i = 0; i < items.length; i++) {
      var it = items[i], x = it[1], y = it[0], kind = it[2], sz = 1 - it[3] * .35;
      holes += wobble(x - 4, y + 3, 16 * sz, 6 * sz, 8, r, .4);
      if (kind < .72) {
        var w = (30 + r() * 28) * sz, h = (12 + r() * 13) * sz, dc = DOMES[Math.floor(r() * DOMES.length)], dd = '';
        if (kind < .3) {
          var sk = (r() - .5) * .5;
          dd = 'M' + P(x - w / 2, y + 3) + 'C' + P(x - w * (.5 - sk * .3), y - h * 1.2) + ' ' + P(x + w * (.42 + sk), y - h * 1.3) + ' ' + P(x + w / 2, y + 3) + 'Z';
        } else {
          var nb = 2 + Math.floor(r() * 2);
          for (var bI = 0; bI < nb; bI++) {
            var bx = x - w / 2 + (bI + .5) * w / nb, bh = h * (.75 + r() * .5), bw = w / nb * .62;
            dd += 'M' + P(bx - bw, y + 3) + 'C' + P(bx - bw, y - bh * 1.25) + ' ' + P(bx + bw, y - bh * 1.25) + ' ' + P(bx + bw, y + 3) + 'Z';
          }
        }
        domeD[DOMES.indexOf(dc)] += dd;
        hiD += 'M' + P(x - w * .05, y - h * .85) + 'Q' + P(x + w * .25, y - h * .86) + ' ' + P(x + w * .32, y - h * .35);
        polyps += dd;
      } else if (kind < .86) {
        var fc = r() < .6 ? '#bf9f62' : '#a28fae', fd = '';
        for (var k = 0; k < 6; k++) {
          var fx = x + (k - 2.5) * 4.2 * sz, fl = (8 + r() * 9) * sz, fa = (k - 2.5) * .16;
          fd += 'M' + P(fx, y + 2) + 'l' + P(Math.sin(fa) * fl, -Math.cos(fa) * fl);
        }
        fing[fc] += fd;
      } else {
        var sc = ['#d9853f', '#8d5aa5', '#b9503f', '#c2407e'][Math.floor(r() * 4)];
        spong[sc] = (spong[sc] || '') + scallop(x, y - 2, (6 + r() * 6) * sz, (3.6 + r() * 3) * sz, 7, r, .35);
      }
    }
    for (i = 0; i < DOMES.length; i++) cols += path(domeD[i], { fill: DOMES[i], stroke: '#5c5034', 'stroke-width': .9, 'stroke-opacity': .35 });
    cols += path(hiD, { fill: 'none', stroke: '#f0dfac', 'stroke-width': 1.3, 'stroke-opacity': .4, 'stroke-linecap': 'round' });
    for (var fk in fing) cols += path(fing[fk], { stroke: '#6e5a32', 'stroke-opacity': .7, 'stroke-width': 5.6, 'stroke-linecap': 'round', fill: 'none' }) +
      path(fing[fk], { stroke: fk, 'stroke-width': 4.2, 'stroke-linecap': 'round', fill: 'none' });
    for (var sk2 in spong) cols += path(spong[sk2], { fill: sk2, opacity: .9 });
    for (i = 0; i < 12; i++) { var cx = 1215 + r() * 120; cca += wobble(cx, ry(cx) + 3 + r() * 8, 6 + r() * 6, 2.4 + r() * 1.6, 8, r, .3); }
    var face = path(mound, { fill: 'url(#' + id + 'reefg)' }) + path(mound, { fill: 'url(#' + id + 'hatch)' }) +
      path(holes, { fill: '#2f3d40', opacity: .45 }) + cols + path(polyps, { fill: 'url(#' + id + 'polyp)' }) +
      path(smooth(REEF, false), { fill: 'none', stroke: '#6f6248', 'stroke-width': 1.8, 'stroke-opacity': .45 }) +
      path(cca, { fill: '#d98aa8', opacity: .85 });
    var back = face +
      boulder(id, 1020, ry(1020) + 10, 50, 26, r) +
      staghorn(1170, ry(1170) + 8, 70, r) +
      seafan(id, 1138, ry(1138) + 6, 72, 56, r, 7.5, -2) +
      elkhorn(id, 1230, ry(1230) + 8, 1, r) +
      staghorn(1336, ry(1336) + 10, 60, r) +
      boulder(id, 1372, ry(1372) + 12, 74, 44, r) +
      seafan(id, 1406, ry(1406) + 8, 86, 66, r, 8.5, -5) +
      tubes(1388, ry(1388) + 10, [['#d6b33f', '#8f7420'], ['#8d58a4', '#563066']], r) +
      rods(1464, ry(1464) + 8, 56, r) +
      plates(1474, ry(1474) + 4, r) +
      tubes(1206, ry(1206) + 8, [['#c2407e', '#7c2650'], ['#d9823e', '#8a4a1f']], r);
    var fore = tubes(1110, ry(1110) + 34, [['#8d58a4', '#563066'], ['#d6b33f', '#8f7420'], ['#8d58a4', '#563066']], r) +
      brain(id, 1060, ry(1060) + 30, 108, 62, r) +
      elkhorn(id, 1288, ry(1288) + 10, .92, r) +
      barrel(1440, ry(1440) + 30, 54, 62);
    /* surf zone: bubbles and whitewater over the crest */
    var surfA = '', surfB = '';
    for (i = 0; i < 26; i++) {
      var sx = 1150 + r() * 160, sy = SEA + 4 + r() * 22 * (1 - Math.abs(sx - 1240) / 140), sr = .9 + r() * 1.9;
      var dot = 'M' + P(sx - sr, sy) + 'a' + sr + ' ' + sr + ' 0 1 0 ' + n(sr * 2) + ' 0a' + sr + ' ' + sr + ' 0 1 0 ' + n(-sr * 2) + ' 0';
      if (i % 2) surfA += dot; else surfB += dot;
    }
    var surf = g(path(surfA, { fill: '#ffffff', opacity: .85 }), { 'class': 'ss-hero__surf', style: '--t:3.6s;--d:0s' }) +
      g(path(surfB, { fill: '#ffffff', opacity: .85 }), { 'class': 'ss-hero__surf', style: '--t:4.4s;--d:-2.2s' });
    return { back: back, fore: fore, surf: surf };
  }

  /* ---------------- animals ---------------- */
  var FISH = {
    grunt: { L: 54, D: 21, body: ['#d9a13a', '#f6dc8c'], fin: '#caa64e', tail: '#a69559', line: '#7a5a1e', stripe: '#3d6c9e', iris: '#efe3b8' },
    snapper: { L: 62, D: 23, body: ['#868e78', '#e4e0cc'], fin: '#e2b23a', tail: '#d6a842', line: '#565c4a', bar: '#f1eedf', iris: '#dba54a' },
    juv: { L: 24, D: 8.2, body: ['#c3bc9e', '#f6efdc'], fin: '#ead99a', tail: '#e4d39a', line: '#7b7459', stripe: '#3f4a44', iris: '#e8e2cc' },
    stoplight: { L: 62, D: 25, body: ['#17806b', '#68c4a2'], fin: '#2a9a7e', tail: '#2a9a7e', line: '#0f5546', accent: '#ee916e', spot: '#f3c94a', iris: '#f0c36a' },
    queen: { L: 52, D: 21, body: ['#2a8698', '#77cbc0'], fin: '#3a9fb0', tail: '#3aa0ae', line: '#1a5c6a', accent: '#e88ba6', spot: '#c2407e', iris: '#f0b76a' }
  };
  function fishDefs(id) {
    var s = '';
    for (var k in FISH) {
      var f = FISH[k];
      s += lin(id + 'fb-' + k, 0, 1, [[0, f.body[0]], [.62, f.body[1]], [1, f.body[1]]]);
      s += '<clipPath id="' + id + 'fc-' + k + '"><path d="' + fishParts(k).body + '"/></clipPath>';
    }
    return s;
  }
  function fishParts(k) {
    var f = FISH[k], L = f.L, D = f.D, parrot = k === 'stoplight' || k === 'queen';
    function q(a, b) { return n(a * L) + ' ' + n(b * D); }
    var o = {};
    o.body = parrot
      ? 'M' + q(.5, .06) + 'C' + q(.51, -.24) + ' ' + q(.38, -.53) + ' ' + q(.14, -.53) + 'C' + q(-.08, -.53) + ' ' + q(-.22, -.32) + ' ' + q(-.31, -.15) +
        'L' + q(-.31, .15) + 'C' + q(-.2, .34) + ' ' + q(-.02, .5) + ' ' + q(.16, .48) + 'C' + q(.34, .46) + ' ' + q(.48, .32) + ' ' + q(.5, .06) + 'Z'
      : 'M' + q(.5, .02) + 'C' + q(.45, -.3) + ' ' + q(.27, -.52) + ' ' + q(.04, -.5) + 'C' + q(-.14, -.48) + ' ' + q(-.24, -.24) + ' ' + q(-.31, -.13) +
        'L' + q(-.31, .13) + 'C' + q(-.24, .22) + ' ' + q(-.1, .47) + ' ' + q(.08, .46) + 'C' + q(.27, .44) + ' ' + q(.43, .26) + ' ' + q(.5, .02) + 'Z';
    o.tail = parrot
      ? 'M' + q(-.28, -.15) + 'C' + q(-.36, -.22) + ' ' + q(-.44, -.42) + ' ' + q(-.53, -.55) + 'C' + q(-.5, -.24) + ' ' + q(-.48, -.1) + ' ' + q(-.48, 0) +
        'C' + q(-.48, .1) + ' ' + q(-.5, .24) + ' ' + q(-.53, .55) + 'C' + q(-.44, .42) + ' ' + q(-.36, .22) + ' ' + q(-.28, .15) + 'Z'
      : 'M' + q(-.28, -.13) + 'C' + q(-.36, -.2) + ' ' + q(-.45, -.42) + ' ' + q(-.54, -.58) + 'C' + q(-.49, -.26) + ' ' + q(-.46, -.08) + ' ' + q(-.44, 0) +
        'C' + q(-.46, .08) + ' ' + q(-.49, .26) + ' ' + q(-.54, .58) + 'C' + q(-.45, .42) + ' ' + q(-.36, .2) + ' ' + q(-.28, .13) + 'Z';
    o.dorsal = parrot
      ? 'M' + q(.2, -.5) + 'C' + q(.1, -.7) + ' ' + q(-.16, -.68) + ' ' + q(-.28, -.42) + 'L' + q(-.26, -.26) + 'Z'
      : 'M' + q(.22, -.47) + 'C' + q(.17, -.82) + ' ' + q(.02, -.84) + ' ' + q(-.08, -.72) + 'C' + q(-.14, -.66) + ' ' + q(-.2, -.67) + ' ' + q(-.24, -.62) +
        'C' + q(-.27, -.5) + ' ' + q(-.27, -.38) + ' ' + q(-.25, -.3) + 'Z';
    o.spines = parrot ? '' : 'M' + q(.17, -.5) + 'L' + q(.15, -.74) + 'M' + q(.1, -.5) + 'L' + q(.07, -.78) + 'M' + q(.02, -.5) + 'L' + q(-.01, -.76) + 'M' + q(-.06, -.47) + 'L' + q(-.08, -.7);
    o.anal = 'M' + q(-.04, .44) + 'C' + q(-.1, .62) + ' ' + q(-.18, .7) + ' ' + q(-.24, .6) + 'C' + q(-.26, .46) + ' ' + q(-.27, .34) + ' ' + q(-.25, .26) + 'Z';
    o.pelvic = 'M' + q(.2, .42) + 'C' + q(.16, .62) + ' ' + q(.1, .72) + ' ' + q(.06, .66) + 'C' + q(.08, .56) + ' ' + q(.1, .48) + ' ' + q(.12, .44) + 'Z';
    o.pec = 'M' + q(.25, .06) + 'C' + q(.16, -.1) + ' ' + q(.03, -.07) + ' ' + q(-.05, .08) + 'C' + q(.04, .2) + ' ' + q(.16, .22) + ' ' + q(.25, .13) + 'Z';
    o.gill = 'M' + q(.29, -.36) + 'C' + q(.23, -.14) + ' ' + q(.22, .16) + ' ' + q(.27, .36);
    o.eye = [n(.36 * L), n((parrot ? -.16 : -.12) * D), Math.max(n(.042 * L), 1.1)];
    o.mouth = parrot ? '' : 'M' + q(.5, .03) + 'Q' + q(.46, .12) + ' ' + q(.41, .12);
    o.beak = parrot ? 'M' + q(.46, -.06) + 'C' + q(.52, -.04) + ' ' + q(.53, .14) + ' ' + q(.48, .2) + 'C' + q(.45, .15) + ' ' + q(.45, .02) + ' ' + q(.46, -.06) + 'Z' : '';
    o.q = q;
    return o;
  }
  function fish(id, k, r, flip) {
    var f = FISH[k], o = fishParts(k), q = o.q, L = f.L, parrot = k === 'stoplight' || k === 'queen', sw = L < 30 ? .5 : .9;
    var deco = '';
    if (k === 'grunt') {
      for (var i = 0; i < 6; i++) {
        var yy = -.38 + i * .15;
        deco += 'M' + q(.49, yy * .55) + 'C' + q(.24, yy - .04) + ' ' + q(-.08, yy * .92) + ' ' + q(-.34, yy * .42);
      }
      deco = path(deco, { fill: 'none', stroke: f.stripe, 'stroke-width': 1.25, 'stroke-opacity': .85, 'clip-path': 'url(#' + id + 'fc-' + k + ')' });
    } else if (k === 'snapper') {
      for (i = 0; i < 6; i++) { var xx = .2 - i * .085; deco += 'M' + q(xx + .03, -.6) + 'L' + q(xx - .03, .6); }
      deco = path(deco, { fill: 'none', stroke: f.bar, 'stroke-width': 2.6, 'stroke-opacity': .55, 'clip-path': 'url(#' + id + 'fc-' + k + ')' }) +
        path('M' + q(.42, -.02) + 'L' + q(.29, .04), { stroke: '#7fa8c8', 'stroke-width': 1.2, 'stroke-linecap': 'round', opacity: .8 });
    } else if (k === 'juv') {
      deco = path('M' + q(.5, -.02) + 'L' + q(-.34, 0), { stroke: f.stripe, 'stroke-width': 1.1, 'clip-path': 'url(#' + id + 'fc-' + k + ')' }) +
        '<circle cx="' + n(-.29 * L) + '" cy="0" r="1.2" fill="' + f.stripe + '"/>';
    } else {
      deco = path(o.body, { fill: 'url(#' + id + 'scale)' }) +
        path('M' + q(.5, -.02) + 'C' + q(.42, -.18) + ' ' + q(.34, -.32) + ' ' + q(.22, -.42) + 'M' + q(.48, .14) + 'C' + q(.4, .14) + ' ' + q(.32, .12) + ' ' + q(.24, .2),
          { fill: 'none', stroke: f.accent, 'stroke-width': 2.2, 'stroke-linecap': 'round', 'clip-path': 'url(#' + id + 'fc-' + k + ')' }) +
        (k === 'stoplight' ? '<circle cx="' + n(.24 * L) + '" cy="' + n(-.3 * f.D) + '" r="2.6" fill="' + f.spot + '"/>' : '');
    }
    var tailInner = path(o.tail, { fill: f.tail, stroke: f.line, 'stroke-width': sw, 'stroke-opacity': .7 });
    if (parrot) tailInner += path('M' + q(-.5, -.5) + 'C' + q(-.47, -.2) + ' ' + q(-.47, .2) + ' ' + q(-.5, .5), { fill: 'none', stroke: k === 'stoplight' ? '#e9a23e' : f.accent, 'stroke-width': 2.4, 'stroke-linecap': 'round' });
    var tailT = parrot ? 2.2 : (L < 30 ? .7 : 1.1 + r() * .3);
    var fins = path(o.dorsal + o.anal + o.pelvic, { fill: f.fin, 'fill-opacity': parrot ? 1 : .9, stroke: f.line, 'stroke-width': sw, 'stroke-opacity': .6 }) +
      (o.spines ? path(o.spines, { stroke: f.line, 'stroke-width': .6, 'stroke-opacity': .5 }) : '');
    var pec = path(o.pec, { fill: parrot ? f.fin : f.fin, 'fill-opacity': .85, stroke: f.line, 'stroke-width': sw * .8, 'stroke-opacity': .5 });
    if (parrot) pec = g(pec, { 'class': 'ss-hero__pec', style: '--t:' + n(1.4 + r() * .4) + 's;--d:-' + n(r()) + 's' });
    var e = o.eye;
    var art = g(tailInner, { 'class': 'ss-hero__tail', style: '--t:' + n(tailT) + 's;--d:-' + n(r() * 1.2) + 's' }) + fins +
      path(o.body, { fill: 'url(#' + id + 'fb-' + k + ')', stroke: f.line, 'stroke-width': sw, 'stroke-opacity': .75 }) + deco +
      path(o.gill, { fill: 'none', stroke: f.line, 'stroke-width': sw * .9, 'stroke-opacity': .5 }) + pec +
      (o.beak ? path(o.beak, { fill: '#e3ead3', stroke: f.line, 'stroke-width': .7 }) : '') +
      (o.mouth ? path(o.mouth, { fill: 'none', stroke: f.line, 'stroke-width': sw * .8, 'stroke-opacity': .7, 'stroke-linecap': 'round' }) : '') +
      '<circle class="ss-hero__eye" cx="' + e[0] + '" cy="' + e[1] + '" r="' + e[2] + '" fill="' + f.iris + '" stroke="' + f.line + '" stroke-width=".5"/>' +
      '<circle cx="' + n(e[0] + e[2] * .12) + '" cy="' + e[1] + '" r="' + n(e[2] * .58) + '" fill="#0b2a3c"/>' +
      '<circle cx="' + n(e[0] + e[2] * .35) + '" cy="' + n(e[1] - e[2] * .3) + '" r="' + n(Math.max(e[2] * .22, .35)) + '" fill="#ffffff"/>';
    if (flip) art = g(art, { transform: 'scale(-1 1)' });
    return g(art, { 'class': 'ss-hero__fish' });
  }
  /* Juvenile green turtle, side view, facing +x. Front flippers row slowly. */
  function turtle(r, flip) {
    var carapace = 'M44 -3C40 -19 22 -27 0 -27C-22 -27 -40 -18 -47 -3C-40 3 -20 5 0 5C20 5 34 3 44 -3Z';
    var scutes = 'M30 -17C26 -10 24 -4 25 3M10 -25C8 -16 7 -7 8 4M-12 -25C-12 -16 -12 -7 -12 4M-31 -19C-30 -12 -30 -5 -31 3' +
      'M38 -10C20 -14 -10 -15 -42 -9';
    var streaks = '';
    for (var i = 0; i < 14; i++) {
      var sx = -38 + r() * 76, sy = -20 + r() * 18;
      streaks += 'M' + P(sx, sy) + 'l' + P((r() - .5) * 6, 4 + r() * 5);
    }
    var rim = '';
    for (i = 0; i < 9; i++) { var rx = -42 + i * 10.4; rim += 'M' + P(rx, 2.5 + Math.sin(i) * .6) + 'q' + P(5, 2.6) + ' ' + P(10, 0); }
    var flipper = 'M36 0C24 6 8 16 -10 28C-20 34 -26 32 -22 26C-12 14 6 4 22 -4C28 -6 34 -4 36 0Z';
    var rear = 'M-38 1C-46 4 -56 10 -60 9C-62 6 -56 0 -46 -3C-42 -4 -39 -2 -38 1Z';
    var head = 'M38 -8C46 -15 60 -14 66 -7C70 -2 69 5 62 8C54 11 44 9 38 5Z';
    var hscale = 'M54 -12L62 -11L64 -6L57 -6ZM47 -11L54 -12L57 -6L50 -5ZM58 -1C62 0 65 1 68 1';
    return g(
      g(path(flipper, { fill: '#6f6540', stroke: '#4e4529', 'stroke-width': .9 }), { 'class': 'ss-hero__flipper', style: '--t:5.4s;--d:-1.4s', transform: 'translate(-4 -4)' }) +
      g(path(rear, { fill: '#8f8452', stroke: '#5d5432', 'stroke-width': .9 }), { 'class': 'ss-hero__rear', style: '--t:5.4s;--d:-2s' }) +
      path('M-46 -1L-55 2L-46 3Z', { fill: '#8f8452' }) +
      path(head, { fill: '#a99c62', stroke: '#625a35', 'stroke-width': 1 }) +
      path(hscale, { fill: 'none', stroke: '#625a35', 'stroke-width': .8, 'stroke-opacity': .7 }) +
      path('M36 -2C40 1 41 4 38 6', { fill: 'none', stroke: '#7a6f44', 'stroke-width': .9 }) +
      '<circle class="ss-hero__eye" cx="57" cy="-5.5" r="2.4" fill="#2b2418"/><circle cx="57.8" cy="-6.3" r=".7" fill="#ffffff"/>' +
      path('M38 0C30 7 10 10 -10 10C-28 10 -40 6 -46 0', { fill: '#e6d49c', stroke: '#9c8a55', 'stroke-width': .9 }) +
      path(carapace, { fill: '#87713f', stroke: '#4f3f22', 'stroke-width': 1.2 }) +
      path(streaks, { fill: 'none', stroke: '#5b4626', 'stroke-width': 1.4, 'stroke-opacity': .55, 'stroke-linecap': 'round' }) +
      path(scutes, { fill: 'none', stroke: '#c7ad6c', 'stroke-width': 1.3, 'stroke-opacity': .8 }) +
      path(rim, { fill: 'none', stroke: '#c7ad6c', 'stroke-width': 1, 'stroke-opacity': .8 }) +
      path('M20 -24C8 -27 -10 -27 -24 -22', { fill: 'none', stroke: '#e1cb8c', 'stroke-width': 2.2, 'stroke-opacity': .5, 'stroke-linecap': 'round' }) +
      g(path(flipper, { fill: '#9c9058', stroke: '#5d5432', 'stroke-width': 1 }) +
        path('M30 -1C20 4 6 12 -8 21', { fill: 'none', stroke: '#c9bd84', 'stroke-width': 1.2, 'stroke-opacity': .7 }),
        { 'class': 'ss-hero__flipper', style: '--t:5.4s;--d:-1.4s' }),
      { 'class': 'ss-hero__fish', transform: flip ? 'scale(-1 1)' : null });
  }

  /* ---------------- motion: generated keyframes ---------------- */
  function routeKeyframes(name, R) {
    var pts = dense(R.pts, false, 24), cum = [0], i;
    for (i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.sqrt(Math.pow(pts[i][0] - pts[i - 1][0], 2) + Math.pow(pts[i][1] - pts[i - 1][1], 2)));
    var total = cum[cum.length - 1], N = 96, css = '@keyframes ' + name + '{', j = 0;
    var bobs = Math.max(1, Math.round(R.dur / (R.bob || 4.2)));
    for (var k = 0; k <= N; k++) {
      var target = total * k / N;
      while (j < pts.length - 2 && cum[j + 1] < target) j++;
      var f = (target - cum[j]) / ((cum[j + 1] - cum[j]) || 1);
      var x = pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f, y = pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f;
      var a0 = pts[Math.max(j - 3, 0)], a1 = pts[Math.min(j + 4, pts.length - 1)];
      var ang = Math.atan2(a1[1] - a0[1], a1[0] - a0[0]) * 180 / Math.PI;
      if (R.heading === 'left') ang -= 180;
      while (ang > 180) ang -= 360;
      while (ang < -180) ang += 360;
      ang = Math.max(-R.tilt, Math.min(R.tilt, ang));
      var p = k / N, op = p < R.fi ? p / R.fi : p > 1 - R.fo ? (1 - p) / R.fo : 1;
      y += Math.sin(p * bobs * 2 * Math.PI) * 2.6;
      css += (Math.round(p * 1e4) / 100) + '%{transform:translate(' + n(x) + 'px,' + n(y) + 'px) rotate(' + n(ang) + 'deg);opacity:' + Math.round(op * 100) / 100 + '}';
    }
    return css + '}';
  }
  function waveKeyframes() {
    var x0 = 1700, D = WAVE.n * WAVE.len, css = '@keyframes ss-hero-wave{', i;
    for (i = 0; i < ENV.length; i++) {
      css += (Math.round((x0 - ENV[i][0]) / D * 1e5) / 1e3) + '%{transform:translateX(' + ENV[i][0] + 'px) skewX(' + ENV[i][2] + 'deg) scaleY(' + ENV[i][1] + ')}';
    }
    css += '}@keyframes ss-hero-foam{';
    for (i = 0; i < FOAM.length; i++) css += (Math.round((x0 - FOAM[i][0]) / D * 1e5) / 1e3) + '%{opacity:' + FOAM[i][1] + '}';
    return css + '}';
  }
  function injectKeyframes() {
    if (document.getElementById('ss-hero-motion')) return;
    var css = waveKeyframes();
    for (var k in ROUTES) css += routeKeyframes('ss-hero-r-' + k, ROUTES[k]);
    var st = document.createElement('style');
    st.id = 'ss-hero-motion';
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  }

  /* ---------------- waves ---------------- */
  function waves(id) {
    var A = WAVE.amp, half = WAVE.len / 2, pts = [], i, s = '';
    pts.push([-half - 14, 0]); /* flat lead-in keeps the spline tangent level at the troughs */
    for (i = 0; i <= 24; i++) {
      var x = -half + i / 24 * WAVE.len;
      pts.push([x, -A * Math.pow((1 + Math.cos(2 * Math.PI * x / WAVE.len)) / 2, 1.7)]);
    }
    pts.push([half + 14, 0]);
    /* neighbouring crests overlap in their flat troughs; opaque strokes make the overlap seamless */
    var top = smooth(pts, false), fill = top + 'L' + (half + 14) + ' 2L' + (-half - 14) + ' 2Z';
    var foam = 'M-52 ' + n(-A * .22) + 'C-40 ' + n(-A * .62) + ' -18 ' + n(-A * 1.14) + ' 4 ' + n(-A * 1.08) + 'C16 ' + n(-A * 1.04) + ' 22 ' + n(-A * .88) + ' 16 ' + n(-A * .76) +
      'C9 ' + n(-A * .66) + ' 2 ' + n(-A * .58) + ' -4 ' + n(-A * .48) + 'C-9 ' + n(-A * .5) + ' -14 ' + n(-A * .38) + ' -20 ' + n(-A * .32) +
      'C-30 ' + n(-A * .36) + ' -40 ' + n(-A * .2) + ' -52 ' + n(-A * .22) + 'Z' +
      'M-62 ' + n(-A * .1) + 'a2.4 1.6 0 1 0 4.8 0a2.4 1.6 0 1 0 -4.8 0M-50 ' + n(-A * .06) + 'a1.8 1.2 0 1 0 3.6 0a1.8 1.2 0 1 0 -3.6 0' +
      'M-72 ' + n(-A * .04) + 'a1.4 1 0 1 0 2.8 0a1.4 1 0 1 0 -2.8 0';
    for (i = 0; i < WAVE.n; i++) {
      var d = n(-i * WAVE.dur / WAVE.n);
      s += g(path(fill, { fill: '#8fd6cf' }) +
        path(top, { fill: 'none', stroke: '#dcf3ef', 'stroke-width': 5, 'vector-effect': 'non-scaling-stroke' }) +
        path(top, { fill: 'none', stroke: '#3f9ea4', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke' }) +
        path(foam, { fill: '#ffffff', 'class': 'ss-hero__foam', style: 'animation-delay:' + d + 's' }),
        { 'class': 'ss-hero__wave', style: 'animation-delay:' + d + 's' });
    }
    return g(g(s, { transform: 'translate(0 ' + SEA + ')' }), { 'clip-path': 'url(#' + id + 'wclip)' });
  }

  /* ---------------- connections ---------------- */
  function arrowAt(pts, at, size, stroke, w, op) {
    var i = Math.floor(pts.length * at), a = pts[i - 2], b = pts[i];
    var ang = Math.atan2(b[1] - a[1], b[0] - a[0]), s = size;
    var p1 = [b[0] - Math.cos(ang - .5) * s, b[1] - Math.sin(ang - .5) * s], p2 = [b[0] - Math.cos(ang + .5) * s, b[1] - Math.sin(ang + .5) * s];
    return path('M' + P(p1[0], p1[1]) + 'L' + P(b[0], b[1]) + 'L' + P(p2[0], p2[1]), { fill: 'none', stroke: stroke, 'stroke-width': w,
      'stroke-opacity': op, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  }
  var NUTRIENTS = [[300, 336], [420, 322], [600, 328], [780, 350], [940, 368], [1040, 384], [1112, 408]];
  function flows() {
    var arc = ROUTES.school.pts, arcD = smooth(arc, false), nut = smooth(NUTRIENTS, false);
    var nut2 = smooth(NUTRIENTS.map(function (p, i) { return [p[0] + 6, p[1] + 9 + Math.sin(i * 1.7) * 3]; }), false);
    return path(nut, { fill: 'none', stroke: '#6f5f26', 'stroke-width': 5.2, 'stroke-linecap': 'round', 'stroke-dasharray': '0 15', 'stroke-opacity': .8,
      'class': 'ss-hero__flow', style: '--t:24s' }) +
      path(nut2, { fill: 'none', stroke: '#9b8740', 'stroke-width': 3.4, 'stroke-linecap': 'round', 'stroke-dasharray': '0 24', 'stroke-opacity': .7,
        'class': 'ss-hero__flow', style: '--t:31s;--d:-7s' }) +
      arrowAt(dense(NUTRIENTS, false, 10), .86, 10, '#6f5f26', 2.4, .8) +
      path(arcD, { fill: 'none', stroke: '#0b2a3c', 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-dasharray': '9 9', 'stroke-opacity': .5,
        'class': 'ss-hero__flow', style: '--t:22s' }) +
      arrowAt(dense(arc, false, 10), .9, 11, '#0b2a3c', 2.4, .55);
  }
  function notes() {
    var wl = [];
    for (var x = 1120; x >= 600; x -= 25) wl.push([x, 186 + Math.sin(x / 60) * 1.5]);
    return g(
      path(taper(wl, 4.2, 1), { fill: '#0b2a3c', opacity: .5 }) +
      path('M612 179L596 186.6L612 193', { fill: 'none', stroke: '#0b2a3c', 'stroke-opacity': .5, 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
      { 'class': 'ss-hero__notemark' }) +
      '<text class="ss-hero__note" x="866" y="166" text-anchor="middle">waves lose energy across the reef and seagrass</text>' +
      '<text class="ss-hero__note" x="716" y="296" text-anchor="middle">young fish move between habitats</text>' +
      '<text class="ss-hero__note" x="908" y="399" text-anchor="middle">nutrients and carbon flow seaward</text>';
  }
  var HABITATS = [['Mangrove forest', 300, '#6b7b3a'], ['Seagrass meadow', 822, '#4c9a5b'], ['Coral reef', 1262, '#c2407e']];
  function labels() {
    var s = '';
    for (var i = 0; i < HABITATS.length; i++) {
      var h = HABITATS[i], w = h[0].length * 12.6 + 46;
      s += g('<rect x="' + n(h[1] - w / 2) + '" y="599" width="' + n(w) + '" height="34" rx="17" fill="#fbf8f2" fill-opacity=".94" stroke="#0b2a3c" stroke-opacity=".14"/>' +
        '<circle cx="' + n(h[1] - w / 2 + 20) + '" cy="616" r="6" fill="' + h[2] + '"/>' +
        '<text x="' + n(h[1] - w / 2 + 34) + '" y="624">' + h[0] + '</text>', { 'class': 'ss-hero__label', 'data-cx': h[1] });
    }
    return s;
  }
  /* After fonts settle, size each label pill to its text. */
  function fitLabels(svg) {
    var gs = svg.querySelectorAll('.ss-hero__label');
    for (var i = 0; i < gs.length; i++) {
      var t = gs[i].querySelector('text'), rc = gs[i].querySelector('rect'), c = gs[i].querySelector('circle');
      var tw;
      try { tw = t.getComputedTextLength(); } catch (e) { tw = 0; }
      if (!tw) continue;
      var w = tw + 56, cx = +gs[i].getAttribute('data-cx'), x0 = cx - w / 2;
      rc.setAttribute('x', n(x0)); rc.setAttribute('width', n(w));
      c.setAttribute('cx', n(x0 + 21)); t.setAttribute('x', n(x0 + 36));
    }
  }

  /* ---------------- assembly ---------------- */
  function animal(id, key, inner, cls) {
    var R = ROUTES[key];
    return g(inner, { 'class': 'ss-hero__travel' + (cls ? ' ' + cls : ''), 'data-heading': R.heading, 'data-animal': key,
      style: 'animation-name:ss-hero-r-' + key + ';animation-duration:' + R.dur + 's;animation-delay:' + R.delay + 's' });
  }
  function animals(id) {
    var r = rnd(97), school = '', offs = [[0, 0, 1], [-30, -11, .92], [-26, 12, 1.04], [-56, 1, .9], [-60, -17, .96], [-14, 23, .88], [-84, 10, .94]];
    for (var i = 0; i < offs.length; i++) {
      school += g(fish(id, 'juv', r, ROUTES.school.heading === 'left'),
        { transform: 'translate(' + offs[i][0] + ' ' + offs[i][1] + ') scale(' + offs[i][2] + ')' });
    }
    /* Art is drawn facing right; it is mirrored only when its route heads left,
       so the drawing and the direction of travel share one source of truth. */
    function left(key) { return ROUTES[key].heading === 'left'; }
    return animal(id, 'turtle', turtle(r, left('turtle'))) +
      animal(id, 'gruntA', fish(id, 'grunt', r, left('gruntA'))) +
      animal(id, 'gruntB', fish(id, 'grunt', r, left('gruntB'))) +
      animal(id, 'snapper', fish(id, 'snapper', r, left('snapper'))) +
      animal(id, 'parrotR', fish(id, 'queen', r, left('parrotR'))) +
      animal(id, 'parrotL', fish(id, 'stoplight', r, left('parrotL'))) +
      animal(id, 'school', school);
  }
  function svgMarkup(id) {
    var m = mangroves(id), sg = seagrass(id), rf = reef(id);
    return '<svg class="ss-hero__svg" viewBox="0 0 1600 640" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="' + id + 't ' + id + 'd" focusable="false" xmlns="http://www.w3.org/2000/svg">' +
      '<title id="' + id + 't">A living seascape</title>' +
      '<desc id="' + id + 'd">Cross-section of a tropical coast. From left to right: a mangrove forest at the shore, a seagrass meadow in the shallow lagoon, and a coral reef at the edge of deeper water. Young fish move from the mangroves to the reef, nutrients and carbon drift seaward, and waves shrink as the reef and seagrass absorb their energy.</desc>' +
      defs(id).replace('</defs>', fishDefs(id) + '</defs>') +
      sky(id) + hills(id) + water(id) + shafts(id) +
      rf.back + sg.back + sg.main + m.back + flows() +
      animals(id) +
      m.front + sg.fore + rf.fore +
      '<rect y="' + SEA + '" width="1600" height="' + (640 - SEA) + '" fill="url(#' + id + 'veil)"/>' +
      ground(id) +
      m.above + m.crown + egret() +
      rf.surf + waves(id) + notes() + labels() +
      '</svg>';
  }

  var ICONS = '<svg class="ss-hero__icon-pause" viewBox="0 0 18 18" aria-hidden="true" focusable="false"><rect x="3.5" y="2.5" width="4" height="13" rx="1.3" fill="currentColor"/><rect x="10.5" y="2.5" width="4" height="13" rx="1.3" fill="currentColor"/></svg>' +
    '<svg class="ss-hero__icon-play" viewBox="0 0 18 18" aria-hidden="true" focusable="false"><path d="M5 2.8v12.4a1 1 0 0 0 1.5.86l10-6.2a1 1 0 0 0 0-1.72l-10-6.2A1 1 0 0 0 5 2.8z" fill="currentColor"/></svg>';
  function swatch(c) { return '<span class="ss-hero__sw" style="background:' + c + '" aria-hidden="true"></span>'; }
  function key(kind) {
    var inner = kind === 'dots' ? '<path d="M3 5H28" stroke="#6f5f26" stroke-width="4" stroke-linecap="round" stroke-dasharray="0 8"/>'
      : kind === 'dash' ? '<path d="M2 5H28" stroke="#0b2a3c" stroke-opacity=".6" stroke-width="2" stroke-linecap="round" stroke-dasharray="6 5"/>'
      : '<path d="M1 6Q4 1 7 6T13 6Q15 3.5 17 6T21 6Q22.5 4.5 24 6T27 6" fill="none" stroke="#0e7c86" stroke-width="1.8" stroke-linecap="round"/>';
    return '<svg class="ss-hero__key" viewBox="0 0 30 10" aria-hidden="true" focusable="false">' + inner + '</svg>';
  }
  var LEGEND = '<ul class="ss-hero__legend" aria-label="Key to the illustration">' +
    '<li class="ss-hero__habitats"><span>' + swatch('#6b7b3a') + 'Mangrove forest</span><span>' + swatch('#4c9a5b') + 'Seagrass meadow</span><span>' + swatch('#c2407e') + 'Coral reef</span></li>' +
    '<li>' + key('dots') + 'Nutrients and carbon flow seaward</li>' +
    '<li>' + key('dash') + 'Young fish move between habitats</li>' +
    '<li>' + key('wave') + 'Waves lose energy across the reef and seagrass</li></ul>';
  var CAPTION = 'Illustrative. Mangroves, seagrass meadows and coral reefs are linked by flows of water, nutrients, carbon and animals. SEASTRONG studies these connections.';

  /* ---------------- state ---------------- */
  var instances = [], uid = 0;
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function motionOff() {
    return !!(mq && mq.matches) || document.documentElement.classList.contains('ss-motion-off');
  }
  function update(inst) {
    var want = inst.choice ? inst.choice === 'play' : !motionOff();
    var run = want && inst.inView && !document.hidden;
    inst.root.classList.toggle('is-paused', !run);
    inst.root.classList.toggle('is-playing', run);
    inst.btn.setAttribute('aria-pressed', want ? 'false' : 'true');
    inst.btn.setAttribute('aria-label', want ? 'Pause animation' : 'Play animation');
  }
  function updateAll() { for (var i = 0; i < instances.length; i++) update(instances[i]); }
  function resetChoices() { for (var i = 0; i < instances.length; i++) instances[i].choice = null; updateAll(); }

  function mount(el) {
    if (!el || el.getAttribute('data-ss-hero-mounted')) return null;
    injectKeyframes();
    var id = 'ssh' + (++uid) + '-';
    var root = document.createElement('figure');
    root.className = 'ss-hero';
    root.innerHTML = '<div class="ss-hero__art">' + svgMarkup(id) +
      '<button type="button" class="ss-hero__toggle" aria-pressed="false" aria-label="Pause animation">' + ICONS + '</button></div>' +
      LEGEND + '<p class="ss-hero__caption">' + CAPTION + '</p>';
    var inst = { el: el, root: root, btn: root.querySelector('.ss-hero__toggle'), choice: null, inView: true };
    update(inst);
    inst.btn.addEventListener('click', function () {
      var want = inst.choice ? inst.choice === 'play' : !motionOff();
      inst.choice = want ? 'pause' : 'play';
      update(inst);
    });
    el.innerHTML = '';
    el.appendChild(root);
    el.setAttribute('data-ss-hero-mounted', '');
    instances.push(inst);
    var svg = root.querySelector('svg');
    fitLabels(svg);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fitLabels(svg); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        inst.inView = es[es.length - 1].isIntersecting;
        update(inst);
      }).observe(root);
    }
    return { el: el, pause: function () { inst.choice = 'pause'; update(inst); }, play: function () { inst.choice = 'play'; update(inst); } };
  }

  document.addEventListener('visibilitychange', updateAll);
  if (mq) {
    if (mq.addEventListener) mq.addEventListener('change', resetChoices);
    else if (mq.addListener) mq.addListener(resetChoices);
  }
  if ('MutationObserver' in window) {
    var lastOff = document.documentElement.classList.contains('ss-motion-off');
    new MutationObserver(function () {
      var off = document.documentElement.classList.contains('ss-motion-off');
      if (off !== lastOff) { lastOff = off; resetChoices(); }
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }

  function mountAll() {
    var els = document.querySelectorAll('[data-ss-hero]');
    for (var i = 0; i < els.length; i++) mount(els[i]);
  }
  window.SSHero = {
    mount: mount,
    pause: function () { for (var i = 0; i < instances.length; i++) instances[i].choice = 'pause'; updateAll(); },
    play: function () { for (var i = 0; i < instances.length; i++) instances[i].choice = 'play'; updateAll(); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll);
  else mountAll();
})();
