// =============================
// トップページ UI（スライドショー / ヒーロー / ナビ）
// ※アカウント/ログイン機能は廃止（Firebase依存も削除）
// =============================

// =============================
// top.js（Firebase Firestore + UI統合版・完全版）
// =============================

// ---------- ユーティリティ ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ---------- DOM取得（存在しない要素は後で補完） ----------
let hero = document.getElementById("hero") || $(".background-slideshow");
let captionBox = document.getElementById("caption");
let nextBtn = document.getElementById("nextBtn");
let prevBtn = document.getElementById("prevBtn");

// 背景スライド用の画像群
const bgImages = $$(".background-slideshow img").filter((img) =>
  img.getAttribute("src")
);
const slideContainerImgs = $$(".slide-container img").filter((img) =>
  img.getAttribute("src")
);
const allImages = (bgImages.length ? bgImages : []).concat(
  slideContainerImgs.filter((img) => !bgImages.includes(img))
);

let currentIndex = 0;

// ---------- 足りないUIを自動補完 ----------
(function ensureUI() {
  if (!hero) {
    const wrap = document.createElement("div");
    wrap.id = "hero";
    const bs = $(".background-slideshow");
    if (bs && bs.parentNode) {
      bs.parentNode.insertBefore(wrap, bs);
      wrap.appendChild(bs);
      hero = wrap;
    }
  }

  if (!captionBox) {
    captionBox = document.createElement("div");
    captionBox.id = "caption";
    captionBox.setAttribute("aria-live", "polite");
    (hero || document.body).appendChild(captionBox);
  }

  const makeBtn = (id, className, label, html) => {
    const b = document.createElement("button");
    b.id = id;
    b.className = `nav-btn ${className}`;
    b.setAttribute("aria-label", label);
    b.innerHTML = html;
    (hero || document.body).appendChild(b);
    return b;
  };
})();

// ---------- スライド表示制御 ----------
function applyActiveState(index) {
  allImages.forEach((img, i) => img.classList.toggle("active", i === index));
}

function showSlide(index) {
  if (!allImages.length) return;

  // 現在の画像と次の画像を特定
  const prevImage = allImages[currentIndex];
  currentIndex = (index + allImages.length) % allImages.length;
  const nextImage = allImages[currentIndex];

  // すべてのクラスをリセット
  allImages.forEach((img) => img.classList.remove("active", "previous"));

  // 🔹 1枚前にあたる画像に previous クラスを付与
  if (prevImage) prevImage.classList.add("previous");

  // 🔹 新しい画像に active クラスを付与
  if (nextImage) nextImage.classList.add("active");
  captionBox.classList.remove("show");
  if (hero) hero.classList.remove("focused");

  const currentImage = allImages[currentIndex];
  const floatingTitle = document.getElementById("floatingTitle");
  if (!floatingTitle) return;

  const rawCaption = currentImage?.getAttribute("data-caption") || "";
  const isInvalid = ["作品タイトル", "", " "].includes(rawCaption.trim());
  if (floatingTitle) {
    floatingTitle.textContent = "";
    floatingTitle.style.visibility = "hidden";
  }
  if (captionBox) {
    captionBox.textContent = "";
    captionBox.style.visibility = "hidden";
  }

  if (isInvalid) {
    floatingTitle.textContent = "";
    floatingTitle.style.opacity = 0;
    floatingTitle.style.visibility = "hidden";
    return;
  }

  if (document.body.classList.contains("focused")) {
    floatingTitle.textContent = rawCaption;
    floatingTitle.style.opacity = 0;
    floatingTitle.style.transform = "translateY(20px)";
    setTimeout(() => {
      floatingTitle.style.opacity = 1;
      floatingTitle.style.transform = "translateY(0)";
    }, 100);
  } else {
    floatingTitle.textContent = "";
    floatingTitle.style.opacity = 0;
    floatingTitle.style.visibility = "hidden";
  }
}

showSlide(0);

const floatingTitleInit = document.getElementById("floatingTitle");
if (floatingTitleInit) {
  floatingTitleInit.textContent = "";
  floatingTitleInit.style.opacity = 0;
  floatingTitleInit.style.visibility = "hidden";
}

let autoTimer = null;
function startAuto() {
  stopAuto();
  autoTimer = setInterval(() => showSlide(currentIndex + 1), 8000);
}
function stopAuto() {
  if (autoTimer) clearInterval(autoTimer);
}
startAuto();

// ボタンイベント
nextBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  showSlide(currentIndex + 1);
  startAuto();
});
prevBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  showSlide(currentIndex - 1);
  startAuto();
});

// ✅ 一度だけ focused にする
const heroCenter = document.getElementById("heroCenter");
const projectText = document.getElementById("projectText");
const tapHint = document.getElementById("tapHint");
const floatingTitle = document.getElementById("floatingTitle");

let focused = false;

document
  .querySelector(".background-slideshow")
  ?.addEventListener("click", (e) => {
    if (
      e.target.closest(".login-box") ||
      e.target.closest(".popup") ||
      e.target.classList.contains("nav-btn")
    )
      return;

    focused = !focused;
    document.body.classList.toggle("focused", focused);

    if (focused) {
      if (projectText) {
        projectText.style.opacity = "0";
        projectText.style.pointerEvents = "none";
      }
      if (tapHint) tapHint.textContent = "";

      const currentImage = allImages[currentIndex];
      const titleText = currentImage?.dataset?.title || "";
      const captionText = currentImage?.dataset?.caption || "";

      const invalid = ["", " ", "作品タイトル"];
      const displayTitle = invalid.includes(titleText.trim()) ? "" : titleText;

      if (floatingTitle) {
        floatingTitle.textContent = displayTitle;
        floatingTitle.classList.toggle("show", !!displayTitle);
        floatingTitle.style.visibility = displayTitle ? "visible" : "hidden";
      }

      captionBox.innerHTML = `<div class="caption-text">${captionText}</div>`;
      captionBox.classList.add("show");
    } else {
      if (projectText) {
        projectText.style.opacity = "1";
        projectText.style.pointerEvents = "auto";
      }
      if (tapHint) tapHint.textContent = "クリックして作品を前面で鑑賞";
      if (floatingTitle) {
        floatingTitle.textContent = "";
        floatingTitle.classList.remove("show");
        floatingTitle.style.visibility = "hidden";
      }
      captionBox.classList.remove("show");
    }
  });

// =============================
// ナビゲーション（アカウント確認なしで直接遷移）
// =============================
const CREATE_URL = "workshop/intro/index.html";

// 「作品を制作してみる」(.start-create) と ヘッダー「作品制作」(#createBtn) → 制作フローへ直行
document.querySelectorAll(".start-create").forEach((btn) => {
  btn.addEventListener("click", () => { window.location.href = CREATE_URL; });
});
document.getElementById("createBtn")?.addEventListener("click", () => {
  window.location.href = CREATE_URL;
});

// ヘッダー「防災行動マップ」ボタン
document.querySelector(".header-btn.map")?.addEventListener("click", () => {
  window.location.href = "workshop/present/index.html";
});

// 「ツール体験に進む」(#guestBtn) → 体験ページ
document.getElementById("guestBtn")?.addEventListener("click", () => {
  window.location.href = "taiken/index.html";
});

// =============================
// スクロールに応じたヘッダー表示
// =============================
const mainHeader = document.getElementById("mainHeader");
const projectTextEl = document.getElementById("projectText");

if (projectTextEl) {
  const headerObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          mainHeader.classList.add("header-visible");
        } else {
          mainHeader.classList.remove("header-visible");
        }
      });
    },
    { rootMargin: "-20% 0px 0px 0px" }
  );
  headerObserver.observe(projectTextEl);
}

// // =============================
// // ヘッダーボタンの動作
// // =============================
// document.querySelector(".header-btn.map")?.addEventListener("click", () => {
//   window.location.href = ".mapindex.html";
// });

// =============================
// 中央タイトル → 左上移動時に同期してヘッダー表示
// =============================
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        mainHeader.classList.add("header-visible");
      } else {
        mainHeader.classList.remove("header-visible");
      }
    });
  },
  { threshold: 0.1 }
);
if (heroCenter) observer.observe(heroCenter);

// =============================
// ご近所アートチャット ポップアップ
// =============================
const chatBox = document.getElementById("chatBox");
const chatPopup = document.getElementById("chatPopup");
const closeChatPopup = document.getElementById("closeChatPopup");
const goChatBtn = document.getElementById("goChatBtn");

// ボックスクリック → ポップアップ表示
if (chatBox) {
  chatBox.addEventListener("click", () => {
    chatPopup?.classList.remove("hidden");
    chatPopup?.classList.add("show");
  });
}

// 閉じるボタン
if (closeChatPopup) {
  closeChatPopup.addEventListener("click", () => {
    chatPopup?.classList.remove("show");
    chatPopup?.classList.add("hidden");
  });
}

// 「使ってみる」ボタン → ご近所アートページに遷移
if (goChatBtn) {
  goChatBtn.addEventListener("click", () => {
    window.location.href = "gp/index.html";
  });
}
