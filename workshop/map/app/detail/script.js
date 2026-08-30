/* =========================================================
   対象区域の選定：ハザードマップ（OSS版 / Leaflet + 国土地理院タイル）
   - ArcGIS 非依存。GSIオープンタイルのみで動作。
   - 各ハザードに「何を示すか」の説明を凡例と一体表示。
   ========================================================= */

/* ===== ベースマップ ===== */
const bases = {
  white: L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png", {maxZoom:18, attribution:"地理院タイル（淡色地図）"}),
  sat:   L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg", {maxZoom:18, attribution:"地理院タイル（写真）"})
};

/* ===== 災害レイヤー定義（説明＋凡例つき） ===== */
const HZ = "https://disaportaldata.gsi.go.jp/raster/";
const hazards = {
  flood_l2: {
    layer: L.tileLayer(HZ+"01_flood_l2_shinsuishin_data/{z}/{x}/{y}.png", {maxZoom:17, opacity:.7, attribution:"重ねるハザードマップ（国土地理院）"}),
    name: "洪水（外水氾濫）",
    desc: "川（河川）の水が、想定し得る最大規模の大雨であふれ、堤防を越えたり壊れたりして街に流れ込む浸水です（外水氾濫）。「想定最大規模」の降雨をもとにした“もっとも深く浸かる場合”を示します。色が濃いほど深く浸かります。",
    legend: "shinsui"
  },
  tsunami: {
    layer: L.tileLayer(HZ+"04_tsunami_newlegend_data/{z}/{x}/{y}.png", {maxZoom:17, opacity:.7, attribution:"重ねるハザードマップ（国土地理院）"}),
    name: "津波",
    desc: "海底で起きる地震などの地殻変動によって海水が持ち上げられ、大きな波となって陸へ押し寄せる浸水です。原因は「海の地震」で、高潮とは原因が異なります。色が濃いほど深く浸かります。",
    legend: "shinsui"
  },
  hightide: {
    layer: L.tileLayer(HZ+"03_hightide_l2_shinsuishin_data/{z}/{x}/{y}.png", {maxZoom:17, opacity:.7, attribution:"重ねるハザードマップ（国土地理院）"}),
    name: "高潮",
    desc: "台風や発達した低気圧が近づくとき、気圧が低いことで海面が持ち上がる“吸い上げ効果”と、強い風で海水が海岸へ吹き寄せられる“吹き寄せ効果”によって潮位が大きく上昇し、海水があふれる浸水です（気象庁）。原因は「台風・気象」で、地震が原因の津波とは別物です。",
    legend: "shinsui"
  },
  kyukei: {
    layer: L.tileLayer(HZ+"05_kyukeishakeikaikuiki/{z}/{x}/{y}.png", {maxZoom:17, opacity:.7, attribution:"重ねるハザードマップ（国土地理院）"}),
    name: "土砂災害（急傾斜地の崩壊）",
    desc: "傾斜度30度以上・高さ5m以上の急な斜面（がけ）が、大雨や地震などで崩れ落ちる“がけ崩れ”の危険がある区域です。黄色＝土砂災害警戒区域（生命・身体に危害のおそれ）、赤＝土砂災害特別警戒区域（建物の損壊など著しい危害のおそれ／より危険）。",
    legend: "dosha"
  },
  swale: {
    layer: L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/swale/{z}/{x}/{y}.png", {maxZoom:17, maxNativeZoom:16, opacity:.65, attribution:"地理院タイル（明治期の低湿地）"}),
    name: "液状化に関わる低地（明治期の低湿地）",
    desc: "明治時代に、川沿いの湿地・水田・旧河道・砂礫地などだった土地を色分けした地図です。こうした低湿地は、現在の液状化等との関連性が深いとされます。地図上の色は「土地の種類」を表し、種類ごとに色が違います（黄色などもそのひとつ）。※正式な液状化予測ではなく、古い地図をもとにした参考データで、位置に最大100m程度の誤差があります。",
    legend: "swale"
  }
};

/* ===== 地図：港北区・綱島周辺 ===== */
const map = L.map("viewDiv", {center:[35.5385, 139.6335], zoom:14, zoomControl:true, layers:[bases.white]});
L.control.scale({imperial:false}).addTo(map);
let curBase = bases.white;

document.getElementById("bm-white").onclick = () => setBase("white");
document.getElementById("bm-sat").onclick   = () => setBase("sat");
function setBase(k){
  map.removeLayer(curBase);
  curBase = (k === "sat") ? bases.sat : bases.white;
  curBase.addTo(map); curBase.bringToBack();
  document.getElementById("bm-white").classList.toggle("active", k === "white");
  document.getElementById("bm-sat").classList.toggle("active", k === "sat");
}

/* ===== チェック連動 ===== */
Object.keys(hazards).forEach(k => {
  const el = document.getElementById("chk-" + k);
  if (!el) return;
  el.onchange = e => {
    if (e.target.checked) hazards[k].layer.addTo(map); else map.removeLayer(hazards[k].layer);
    refreshLegend();
  };
});

/* ===== 「?」で説明を表示（未チェックでも見られる） ===== */
document.querySelectorAll(".info-btn").forEach(b => {
  b.onclick = () => {
    const k = b.dataset.k, el = document.getElementById("chk-" + k);
    if (el && !el.checked) { el.checked = true; hazards[k].layer.addTo(map); }
    refreshLegend();
    const box = document.getElementById("legend-box");
    box.scrollIntoView({behavior:"smooth", block:"nearest"});
    const card = document.getElementById("lg-" + k);
    if (card) { card.style.outline = "2px solid var(--sub-color)"; setTimeout(() => card.style.outline = "none", 1200); }
  };
});

/* ===== 凡例・説明 ===== */
const LEGEND_GRAPHIC = {
  shinsui: '<img src="https://disaportal.gsi.go.jp/hazardmap/copyright/img/shinsui_legend3.png" alt="浸水深凡例" onerror="this.replaceWith(document.createTextNode(\'（公式凡例画像を読み込めませんでした）\'))">',
  dosha: '<div class="lg-css-row"><span class="lg-swatch" style="background:#ffe600"></span>警戒区域（イエロー）</div><div class="lg-css-row"><span class="lg-swatch" style="background:#ff5a3c"></span>特別警戒区域（レッド）</div>',
  swale: '<div class="lg-desc" style="margin-bottom:6px">色分け＝明治期の土地の種類（砂礫地・湿地・水田・旧河道 など）。低湿地ほど、現在の液状化等との関連性が深いとされます。色ごとの意味は下の公式凡例で確認できます。</div><a href="https://cyberjapandata.gsi.go.jp/legend/lw_legend.pdf" target="_blank" rel="noopener" style="font-size:.74em;color:var(--sub-color);font-weight:bold">▶ 国土地理院の公式凡例（色の一覧）を見る</a>'
};
function refreshLegend(){
  const box = document.getElementById("legend-box");
  const active = Object.keys(hazards).filter(k => map.hasLayer(hazards[k].layer));
  if (!active.length){ box.innerHTML = '<div class="legend-empty">災害を選ぶと、説明と凡例が表示されます</div>'; return; }
  box.innerHTML = active.map(k => {
    const h = hazards[k];
    return '<div class="legend-item" id="lg-' + k + '">' +
             '<div class="lg-name">' + h.name + '</div>' +
             '<div class="lg-desc">' + h.desc + '</div>' +
             LEGEND_GRAPHIC[h.legend] +
           '</div>';
  }).join("");
}

/* ===== 災害種チップ ===== */
document.querySelectorAll(".chip").forEach(c => {
  c.onclick = () => {
    document.querySelectorAll(".chip").forEach(x => x.classList.remove("active"));
    c.classList.add("active");
    const cat = c.dataset.cat;
    document.querySelectorAll(".hazard-group").forEach(g => {
      g.style.display = (cat === "all" || g.dataset.cat === cat) ? "" : "none";
    });
  };
});

/* ===== 周辺の防災資源（避難場所・拠点・給水所）※既定は非表示・トグルで表示 ===== */
const RES_DATA_BASE = "https://raw.githubusercontent.com/bo-sci-art/WSspportApp_2026/main/data";
const RES_DEFS = {
  shelters: { file:"bousai_shelters.geojson", color:"#2e9e5b", label:"指定緊急避難場所" },
  bases:    { file:"bousai_bases.geojson",    color:"#2f6fb0", label:"地域防災拠点" },
  water:    { file:"bousai_water.geojson",    color:"#0f9bb5", label:"災害時給水所" }
};
const resLayers = { shelters:null, bases:null, water:null };

(function initResources(){
  const keys = Object.keys(RES_DEFS);
  Promise.all(keys.map(function(k){
    return fetch(RES_DATA_BASE + "/" + RES_DEFS[k].file)
      .then(function(r){ if(!r.ok) throw new Error(RES_DEFS[k].file + " " + r.status); return r.json(); })
      .then(function(gj){ return { k:k, features:(gj.features||[]) }; });
  })).then(function(results){
    const counts = {};
    results.forEach(function(res){
      const def = RES_DEFS[res.k];
      const grp = L.layerGroup();
      res.features.forEach(function(f){
        const c = f.geometry && f.geometry.coordinates;
        if (!c) return;
        const p = f.properties || {};
        const extra = (res.k === "water" && p.kind) ? "<br>種別: " + p.kind : "";
        L.circleMarker([c[1], c[0]], { radius:5, color:"#fff", weight:1.5, fillColor:def.color, fillOpacity:.9 })
          .bindPopup("<b>" + def.label + "</b><br>" + (p.name||"") + extra + (p.address ? "<br>" + p.address : ""))
          .addTo(grp);
      });
      resLayers[res.k] = grp;   // 既定は地図に載せない
      counts[res.k] = res.features.length;
    });
    renderResourceToggles(counts);
  }).catch(function(err){
    console.error("防災資源の読込に失敗", err);
    const el = document.getElementById("resource-toggles");
    if (el) el.innerHTML = '<div style="font-size:.78em;color:#999">防災資源データを読み込めませんでした（データ公開後に表示されます）。</div>';
  });
})();

function renderResourceToggles(counts){
  const el = document.getElementById("resource-toggles");
  if (!el) return;
  el.innerHTML = Object.keys(RES_DEFS).map(function(k){
    const def = RES_DEFS[k];
    return '<label class="res-toggle"><input type="checkbox" data-res="'+k+'">'
      + '<span class="res-dot" style="background:'+def.color+'"></span>'
      + def.label + '（' + (counts[k]||0) + '）</label>';
  }).join("");
  el.querySelectorAll('input[data-res]').forEach(function(cb){
    cb.addEventListener('change', function(e){
      const k = e.target.getAttribute('data-res');
      if (!resLayers[k]) return;
      if (e.target.checked) resLayers[k].addTo(map);
      else map.removeLayer(resLayers[k]);
    });
  });
}
