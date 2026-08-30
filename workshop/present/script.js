/* =========================================================
   防災行動マップ（present） Leaflet + 国土地理院版
   - ArcGIS / Survey123 を廃止し、data/artworks.geojson を読む
   - UI・挙動は既存のまま。地図エンジンとハザード重ねのみ差し替え
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {

  // Leaflet未読込ガード（診断用）
  if (typeof L === "undefined") {
    const v = document.getElementById("viewDiv");
    if (v) v.innerHTML = '<div style="padding:24px;color:#c0503a;font-weight:bold;">地図ライブラリ(Leaflet)を読み込めませんでした。leaflet.js が同じフォルダにあるか確認してください。</div>';
    return;
  }

  // 統合時はここを "../../data" に変えるだけ（present から見た data/ の相対パス）
  const DATA_BASE = "https://raw.githubusercontent.com/bo-sci-art/WSspportApp_2026/main/data";
  const HIDDEN_IDS = [];   // 非表示にしたい作品idを入れる（取り下げ用の安全弁）

  /* ---------- 1. 地図（国土地理院タイル） ---------- */
  const bases = {
    white: L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png", {maxZoom:18, attribution:"地理院タイル（淡色地図）"}),
    sat:   L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg", {maxZoom:18, attribution:"地理院タイル（写真）"})
  };
  const map = L.map("viewDiv", { center:[35.5385,139.6335], zoom:14, layers:[bases.white], zoomControl:true });
  L.control.scale({imperial:false}).addTo(map);
  let curBase = bases.white;
  function setBase(k){
    map.removeLayer(curBase);
    curBase = (k === "sat") ? bases.sat : bases.white;
    curBase.addTo(map); curBase.bringToBack();
    document.getElementById("white-map-btn").classList.toggle("active", k === "white");
    document.getElementById("satellite-btn").classList.toggle("active", k === "sat");
  }
  document.getElementById("white-map-btn").onclick = () => setBase("white");
  document.getElementById("satellite-btn").onclick = () => setBase("sat");

  /* ---------- 2. ハザードタイル（国土地理院／map/app/detail から流用） ---------- */
  const HZ = "https://disaportaldata.gsi.go.jp/raster/";
  const hazards = {
    flood_l2: { layer:L.tileLayer(HZ+"01_flood_l2_shinsuishin_data/{z}/{x}/{y}.png",{maxZoom:17,opacity:.7,attribution:"重ねるハザードマップ（国土地理院）"}),
      name:"洪水（外水氾濫）", legend:"shinsui",
      desc:"川の水が、想定し得る最大規模の大雨であふれ、堤防を越えたり壊れたりして街に流れ込む浸水です。色が濃いほど深く浸かります。" },
    tsunami: { layer:L.tileLayer(HZ+"04_tsunami_newlegend_data/{z}/{x}/{y}.png",{maxZoom:17,opacity:.7,attribution:"重ねるハザードマップ（国土地理院）"}),
      name:"津波", legend:"shinsui",
      desc:"海底の地震などで海水が持ち上げられ、大きな波となって陸へ押し寄せる浸水です。原因は「海の地震」で、高潮とは異なります。" },
    hightide: { layer:L.tileLayer(HZ+"03_hightide_l2_shinsuishin_data/{z}/{x}/{y}.png",{maxZoom:17,opacity:.7,attribution:"重ねるハザードマップ（国土地理院）"}),
      name:"高潮", legend:"shinsui",
      desc:"台風や低気圧による“吸い上げ”と“吹き寄せ”で潮位が大きく上昇し、海水があふれる浸水です。原因は「台風・気象」で、津波とは別物です。" },
    kyukei: { layer:L.tileLayer(HZ+"05_kyukeishakeikaikuiki/{z}/{x}/{y}.png",{maxZoom:17,opacity:.7,attribution:"重ねるハザードマップ（国土地理院）"}),
      name:"土砂災害（急傾斜地の崩壊）", legend:"dosha",
      desc:"急な斜面（がけ）が大雨や地震で崩れ落ちる“がけ崩れ”の危険がある区域です。黄＝警戒区域、赤＝特別警戒区域（より危険）。" },
    swale: { layer:L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/swale/{z}/{x}/{y}.png",{maxZoom:17,maxNativeZoom:16,opacity:.65,attribution:"地理院タイル（明治期の低湿地）"}),
      name:"液状化に関わる低地（明治期の低湿地・参考）", legend:"swale",
      desc:"明治期に湿地・水田・旧河道などだった土地の色分けです。低湿地ほど液状化等との関連が深いとされます。※正式な液状化予測ではなく参考データで、位置に最大100m程度の誤差があります。" }
  };
  const LEGEND_GRAPHIC = {
    shinsui: '<img src="https://disaportal.gsi.go.jp/hazardmap/copyright/img/shinsui_legend3.png" alt="浸水深凡例" onerror="this.replaceWith(document.createTextNode(\'（凡例画像を読み込めませんでした）\'))">',
    dosha: '<div class="lg-css-row"><span class="lg-swatch" style="background:#ffe600"></span>警戒区域（イエロー）</div><div class="lg-css-row"><span class="lg-swatch" style="background:#ff5a3c"></span>特別警戒区域（レッド）</div>',
    swale: '<div class="lg-desc" style="margin-bottom:6px">色分け＝明治期の土地の種類（砂礫地・湿地・水田・旧河道 など）。</div><a href="https://cyberjapandata.gsi.go.jp/legend/lw_legend.pdf" target="_blank" rel="noopener" style="font-size:.8em;color:#4f8b80;font-weight:bold">▶ 国土地理院の公式凡例（色の一覧）を見る</a>'
  };
  Object.keys(hazards).forEach(k => {
    const el = document.getElementById("haz-" + k);
    if (!el) return;
    el.onchange = e => {
      if (e.target.checked){ hazards[k].layer.addTo(map); hazards[k].layer.bringToFront(); }
      else map.removeLayer(hazards[k].layer);
      refreshLegend();
    };
  });
  document.querySelectorAll(".haz-info").forEach(b => {
    b.onclick = () => {
      const k = b.dataset.k, el = document.getElementById("haz-" + k);
      if (el && !el.checked) { el.checked = true; hazards[k].layer.addTo(map); hazards[k].layer.bringToFront(); }
      refreshLegend();
      const box = document.getElementById("legend-container");
      const card = document.getElementById("lg-" + k);
      if (card) { card.scrollIntoView({behavior:"smooth", block:"nearest"}); card.style.outline = "2px solid #6BAA9F"; setTimeout(() => card.style.outline = "none", 1200); }
    };
  });
  function refreshLegend(){
    const box = document.getElementById("legend-container");
    const active = Object.keys(hazards).filter(k => map.hasLayer(hazards[k].layer));
    if (!active.length){ box.innerHTML = '<div class="legend-empty">災害を選ぶと、説明と凡例が表示されます</div>'; return; }
    box.innerHTML = active.map(k => {
      const h = hazards[k];
      return '<div class="legend-item" id="lg-'+k+'"><div class="lg-name">'+h.name+'</div><div class="lg-desc">'+h.desc+'</div>'+LEGEND_GRAPHIC[h.legend]+'</div>';
    }).join("");
  }
  refreshLegend();

  /* ---------- 3. カテゴリ・状態 ---------- */
  function category(f24){
    const s = f24 || "";
    if (/震度|火災/.test(s)) return "jishin";
    if (/土砂|液状化/.test(s)) return "jiban";
    if (/洪水|高潮|津波/.test(s)) return "mizu";
    return "other";
  }
  const CATCOLOR = { mizu:"#2F80C4", jiban:"#B5793A", jishin:"#E0574A", other:"#888888" };
  const CATLABEL = { mizu:"水", jiban:"地盤", jishin:"地震" };

  // 作品ピン（ティアドロップ形）
  function makeIcon(color, big){
    const w = big ? 34 : 26, h = big ? 46 : 36;
    const svg = '<svg width="'+w+'" height="'+h+'" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">'
      + '<path d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 20 12 20s12-11.6 12-20C24 5.4 18.6 0 12 0z" fill="'+color+'" stroke="#ffffff" stroke-width="2.5"/>'
      + '<circle cx="12" cy="12" r="4.3" fill="#ffffff"/></svg>';
    return L.divIcon({ className:"art-pin"+(big?" sel":""), html:svg, iconSize:[w,h], iconAnchor:[w/2,h], tooltipAnchor:[0,-h+10] });
  }

  const phaseKeywords = {
    prior: ["備蓄","水","食料","ハザードマップ","訓練","家具","固定","ガラス","ブロック塀","散歩","確認","話し合い","家族","連絡","知","学","準備","日頃","靴","備え","アプリ","登録"],
    during: ["逃げ","避難","高台","走","垂直","2階","3階","浸水","揺れ","机の下","守","火","消火","煙","119","110","通報","助け","声かけ","安否","ライト","懐中電灯","停電","ブレーカー"],
    recovery: ["片付け","掃除","泥","ゴミ","ボランティア","助け合い","協力","炊き出し","避難所","トイレ","衛生","薬","病院","給水","復旧","再開","つながり","励まし","絆","相談","申請"]
  };

  let currentCategory = "all", currentPhase = "all";
  let isHeartFilterOn = false, isActionFilterOn = false;
  let ALL = [];                 // 全作品（features）
  const markerById = {};        // id -> circleMarker
  let selectedId = null;
  let isProgrammaticScroll = false;
  const artLayer = L.layerGroup().addTo(map);

  const ls = (k) => JSON.parse(localStorage.getItem(k) || "[]");
  const getHearts = () => ls("bousai_hearts");
  const getActions = () => ls("bousai_actions");
  const getViewed  = () => ls("bousai_viewed");

  /* ---------- 4. フィルタ判定 ---------- */
  function passFilter(p){
    if (HIDDEN_IDS.includes(p.id)) return false;
    if (currentCategory !== "all" && category(p.field_24) !== currentCategory) return false;
    if (currentPhase !== "all"){
      const text = (p.Message||"") + (p.collage||"") + (p.Mabling||"");
      if (!phaseKeywords[currentPhase].some(kw => text.includes(kw))) return false;
    }
    if (isHeartFilterOn || isActionFilterOn){
      const hearts = getHearts(), actions = getActions();
      let ok = false;
      if (isHeartFilterOn && hearts.includes(p.id)) ok = true;
      if (isActionFilterOn && actions.includes(p.id)) ok = true;
      if (!ok) return false;
    }
    return true;
  }

  /* ---------- 5. 宛名の抽出（旧ロジック踏襲） ---------- */
  function findPersonText(text){
    if (!text) return null;
    let t = text.replace(/[\r\n\s]+/g, "").split(/[、。.,．]/)[0].substring(0, 40);
    const m = t.match(/.*?(人|者|民|方|達|学生|慶應生|生徒|たち|家族|みんな|さん|ちゃん|友|自分|ママ|パパ)/);
    return m ? m[0] + "へ" : null;
  }
  function extractAddressee(p){
    return findPersonText(p.Message) || findPersonText(p.collage) || findPersonText(p.Mabling) || (p.target || "地域のみんなへ");
  }

  /* ---------- 6. 地図ピン ---------- */
  function renderMarkers(){
    artLayer.clearLayers();
    for (const k in markerById) delete markerById[k];
    ALL.forEach(f => {
      const p = f.properties;
      if (!passFilter(p)) return;
      const c = f.geometry && f.geometry.coordinates;
      if (!c) return;
      const cat = category(p.field_24);
      const color = CATCOLOR[cat];
      const m = L.marker([c[1], c[0]], { icon: makeIcon(color, false) });
      m._color = color;
      m.on("click", () => highlightCardInSidebar(p.id));
      m.addTo(artLayer);
      markerById[p.id] = m;
    });
  }

  function highlightMapPin(id){
    // 選択解除（通常サイズに戻す・ラベル消す）
    Object.values(markerById).forEach(m => {
      m.setIcon(makeIcon(m._color, false));
      m.setZIndexOffset(0);
      if (m.getTooltip()) m.unbindTooltip();
    });
    selectedId = id;
    const m = markerById[id];
    if (!m) return;
    m.setIcon(makeIcon(m._color, true));
    m.setZIndexOffset(1000);
    const f = ALL.find(x => x.properties.id === id);
    if (f){
      m.bindTooltip("✉️ " + extractAddressee(f.properties), { permanent:true, direction:"top", className:"addressee-tip" }).openTooltip();
    }
  }

  /* ---------- 7. サイドバーの作品リスト ---------- */
  function inView(f){
    const c = f.geometry && f.geometry.coordinates;
    return c && map.getBounds().contains([c[1], c[0]]);
  }
  function renderList(){
    const listContainer = document.getElementById("art-list-container");
    const viewed = getViewed(), hearts = getHearts(), actions = getActions();
    const items = ALL.filter(f => passFilter(f.properties) && inView(f));
    listContainer.innerHTML = "";
    if (items.length === 0){
      listContainer.innerHTML = '<div style="text-align:center; padding:30px; color:#888;"><p>このエリアに条件に合う作品はありません</p><p style="font-size:0.8em;">地図を動かして<br>「このエリアで再検索」を押してください</p></div>';
      return;
    }
    items.forEach(f => {
      const p = f.properties, id = p.id;
      let icons = "";
      if (hearts.includes(id))  icons += " <span style='color:#ff69b4;'>💖</span>";
      if (actions.includes(id)) icons += " <span style='color:#fbc02d;'>✨</span>";
      const ribbon = viewed.includes(id) ? '<div class="ribbon-wrapper"><div class="ribbon-text">鑑賞済</div></div>' : "";
      const imgUrl = (p.images && p.images[0]) ? DATA_BASE + "/" + p.images[0] : "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
      const card = document.createElement("div");
      card.className = "art-card";
      card.id = "card-" + id;
      card.innerHTML = ribbon +
        '<img src="'+imgUrl+'" class="art-card-img" id="img-'+id+'" onerror="this.style.visibility=\'hidden\'">' +
        '<div class="art-card-info"><div class="art-title">作者：'+(p.field_25||"作者不明")+
        '<span style="float:right; font-size:0.8em;">'+icons+'</span></div></div>';
      card.addEventListener("click", () => {
        highlightCardInSidebar(id);
        setTimeout(() => { window.location.href = "detail.html?id=" + id; }, 300);
      });
      listContainer.appendChild(card);
    });
    if (items.length === 1) setTimeout(() => highlightCardInSidebar(items[0].properties.id), 100);
  }

  function highlightCardInSidebar(id){
    isProgrammaticScroll = true;
    document.querySelectorAll(".art-card").forEach(c => c.classList.remove("active-card"));
    const target = document.getElementById("card-" + id);
    if (target){ target.classList.add("active-card"); target.scrollIntoView({ behavior:"smooth", block:"center" }); }
    highlightMapPin(id);
    setTimeout(() => { isProgrammaticScroll = false; }, 800);
  }

  function detectCenterCard(){
    const container = document.getElementById("art-list-container");
    const rect = container.getBoundingClientRect();
    const centerY = rect.top + rect.height/2;
    let best = null, min = Infinity;
    document.querySelectorAll(".art-card").forEach(card => {
      const r = card.getBoundingClientRect();
      const d = Math.abs((r.top + r.height/2) - centerY);
      if (d < min){ min = d; best = card; }
    });
    if (best){
      const id = best.id.replace("card-", "");
      if (id !== selectedId){
        document.querySelectorAll(".art-card").forEach(c => c.classList.remove("active-card"));
        best.classList.add("active-card");
        highlightMapPin(id);
      }
    }
  }
  document.getElementById("art-list-container").addEventListener("scroll", () => {
    if (!isProgrammaticScroll) detectCenterCard();
  });

  // 「このエリアで再検索」
  const searchBtn = document.getElementById("search-area-btn");
  map.on("moveend", () => { searchBtn.style.display = "block"; });
  searchBtn.onclick = () => { renderList(); searchBtn.style.display = "none"; };

  /* ---------- 8. フィルタ操作 ---------- */
  function applyFilters(){ renderMarkers(); renderList(); updateHeaderStats(); }

  document.querySelectorAll(".chip[data-cat]").forEach(chip => {
    chip.onclick = () => {
      document.querySelectorAll(".chip[data-cat]").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      currentCategory = chip.dataset.cat;
      applyFilters();
    };
  });
  document.querySelectorAll(".chip[data-phase]").forEach(chip => {
    chip.onclick = () => {
      document.querySelectorAll(".chip[data-phase]").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      currentPhase = chip.dataset.phase;
      applyFilters();
    };
  });
  const heartBtn = document.getElementById("filter-heart-btn");
  if (heartBtn) heartBtn.onclick = () => {
    isHeartFilterOn = !isHeartFilterOn;
    heartBtn.classList.toggle("active", isHeartFilterOn);
    heartBtn.innerHTML = isHeartFilterOn ? "💖 共感した" : "♡ 共感した";
    applyFilters();
  };
  const actionBtn = document.getElementById("filter-action-btn");
  if (actionBtn) actionBtn.onclick = () => {
    isActionFilterOn = !isActionFilterOn;
    actionBtn.classList.toggle("active", isActionFilterOn);
    actionBtn.innerHTML = isActionFilterOn ? "⭐ 実践したい" : "✨ 実践したい";
    applyFilters();
  };

  function updateHeaderStats(){
    document.getElementById("header-heart-count").textContent = getHearts().length;
    document.getElementById("header-action-count").textContent = getActions().length;
    const total = ALL.filter(f => !HIDDEN_IDS.includes(f.properties.id)).length;
    const viewed = getViewed().filter(id => !HIDDEN_IDS.includes(id)).length;
    const el = document.getElementById("view-count");
    if (el) el.textContent = viewed + "/" + total;
  }

  /* ---------- 9. 防災情報パネル・タブ・チュートリアル等 ---------- */
  const controlPanel = document.getElementById("control-panel");
  document.getElementById("menu-btn").onclick = () => { controlPanel.style.display = "flex"; };
  document.getElementById("close-panel-btn").onclick = () => { controlPanel.style.display = "none"; };
  document.getElementById("open-hazard-btn").onclick = () => {
    controlPanel.style.display = "flex";
    document.getElementById("hazard-tab").click();
    highlightHazardGroup(currentCategory);
  };
  ["hazard"].forEach(tab => {
    const b = document.getElementById(tab + "-tab");
    if (b) b.onclick = () => {
      document.getElementById(tab + "-content").style.display = "block";
    };
  });
  function highlightHazardGroup(cat){
    document.querySelectorAll(".hazard-group").forEach(g => g.classList.remove("highlight"));
    const id = cat === "mizu" ? "group-mizu" : cat === "jiban" ? "group-jiban" : cat === "jishin" ? "group-jishin" : "";
    if (id){
      const t = document.getElementById(id);
      if (t){ t.classList.add("highlight"); t.scrollIntoView({behavior:"smooth",block:"center"}); setTimeout(() => t.classList.remove("highlight"), 3000); }
    }
  }

  // 絞り込みの開閉
  const fHeader = document.querySelector(".filter-main-header");
  if (fHeader) fHeader.onclick = () => {
    document.querySelector(".filter-content").classList.toggle("closed");
    document.querySelector(".toggle-icon").classList.toggle("closed");
  };

  // 災害種チップに色ドットを付与
  function addCategoryDots(){
    document.querySelectorAll(".chip[data-cat]").forEach(chip => {
      const cat = chip.dataset.cat;
      if (cat === "all" || chip.querySelector(".cat-dot")) return;
      const dot = document.createElement("span");
      dot.className = "cat-dot"; dot.style.background = CATCOLOR[cat] || "#888";
      chip.prepend(dot);
    });
    ["mizu","jiban","jishin"].forEach(cat => {
      const head = document.querySelector("#group-"+cat+" .hazard-group-header");
      if (head && !head.querySelector(".cat-dot")){
        const dot = document.createElement("span");
        dot.className = "cat-dot"; dot.style.background = CATCOLOR[cat];
        head.prepend(dot);
      }
    });
  }

  // トップに戻る
  const backBtn = document.getElementById("back-to-top-btn");
  if (backBtn) backBtn.onclick = () => { window.location.href = "../../index.html"; };

  setupTutorial();

  /* ---------- 10. データ読み込み ---------- */
  const listContainer = document.getElementById("art-list-container");
  listContainer.innerHTML = '<div style="text-align:center;padding:30px;color:#888;">作品を読み込み中…</div>';
  fetch(DATA_BASE + "/artworks.geojson")
    .then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(gj => {
      ALL = gj.features.filter(f => f.properties && f.properties.id && !HIDDEN_IDS.includes(f.properties.id));
      addCategoryDots();
      applyFilters();
      try {
        const b = L.latLngBounds(ALL.map(f => [f.geometry.coordinates[1], f.geometry.coordinates[0]]));
        map.fitBounds(b.pad(0.15), { maxZoom:15 });
      } catch(e){}
      searchBtn.style.display = "none";
    })
    .catch(err => {
      console.error("作品データの読み込みに失敗", err);
      listContainer.innerHTML = '<div style="text-align:center;padding:30px;color:#c0503a;">作品データを読み込めませんでした。<br><span style="font-size:.8em;color:#888;">ブラウザで開いているか、data/artworks.geojson の場所をご確認ください。</span></div>';
    });

  /* ---------- チュートリアル（既存のまま） ---------- */
  function setupTutorial(){
    const overlay = document.getElementById("tutorial-overlay");
    const helpBtn = document.getElementById("header-help-btn");
    const skipBtn = document.getElementById("skip-btn");
    const nextBtn = document.getElementById("next-btn");
    const imgEl = document.getElementById("tutorial-img");
    const titleEl = document.getElementById("tutorial-title");
    const descEl = document.getElementById("tutorial-desc");
    const dots = document.querySelectorAll(".tutorial-dots .dot");
    if (!overlay) return;
    const steps = [
      { title:"防災行動マップについて", img:"tutorial_01.png",
        desc:"このマップでは地域の人が制作した作品を鑑賞します。<br><strong>作品には、「大切な誰かを守りたい」という作者のメッセージが込められています。</strong>" },
      { title:"自分宛ての作品を探す", img:"tutorial_05.png",
        desc:"<strong>ピンにはメッセージの宛名が書かれています</strong>。<br>「近隣住民へ」など、自分に近い宛名を探してみてください。" },
      { title:"作品を見つける", img:"tutorial_02.png",
        desc:"「災害の種類」や「防災行動のタイミング」で<br>見たい作品を絞り込めます。" },
      { title:"地図を重ねる", img:"tutorial_03.png",
        desc:"右上の「防災情報」ボタンを押すと、<br>ハザードマップを地図に重ねて確認できます。" },
      { title:"作品を鑑賞する", img:"tutorial_04.png",
        desc:"<strong>作品をタップすると鑑賞画面へ進みます。</strong><br>作者が込めたメッセージを確認しましょう。" }
    ];
    let page = 0;
    function update(){
      const s = steps[page];
      titleEl.textContent = s.title; descEl.innerHTML = s.desc;
      imgEl.src = s.img; imgEl.onerror = () => { imgEl.style.visibility = "hidden"; };
      imgEl.onload = () => { imgEl.style.visibility = "visible"; };
      dots.forEach((d,i) => d.classList.toggle("active", i === page));
      if (nextBtn) nextBtn.textContent = (page === steps.length-1) ? "完了" : "次へ ＞";
    }
    if (helpBtn) helpBtn.onclick = () => { page = 0; update(); overlay.style.display = "flex"; };
    if (skipBtn) skipBtn.onclick = () => { overlay.style.display = "none"; };
    if (nextBtn) nextBtn.onclick = () => { if (page < steps.length-1){ page++; update(); } else overlay.style.display = "none"; };
  }
});
