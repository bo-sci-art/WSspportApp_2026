/**
 * Final Submit Page Script - Version 3.0 (Serverless / GitHub直接登録)
 *
 * Purpose: 入力内容と作品画像を Cloudflare Worker 経由で GitHub の
 *          artworks.geojson に直接登録する（Survey123は使わない）
 *
 * Field Mappings (Worker側 properties):
 * - Used hazard maps → field_24
 * - Marbling description → Mabling
 * - Collage description → collage
 * - Message (artwork title) → Message
 * - Creator name → field_25
 * - Target location → lat / lon
 * - 作品画像 → localStorage.artworkImage（コラージュページの保存操作で自動生成）
 */

// =====================================
// Configuration
// =====================================
const CONFIG = {
    // Cloudflare Worker のURL（作品投稿の受付窓口）
    WORKER_URL: 'https://wsapp-submit.kazuki131214.workers.dev',
    // Workerの環境変数 SUBMIT_SECRET と同じ値にしてください
    SUBMIT_SECRET: 'ws2026',

    // Page URLs - 実際のプロジェクト構成に合わせて修正してください
    PAGES: {
        hazard: '../../map/Log/log_hazard_map.html',        // ← 対象地点/ハザードマップ選択ページ
        marbling: '../../marbling/Log/log_marbling.html',      // ← マーブリング体験ページ
        collage: '../../collage/Log/log_collage.html',         // ← コラージュ体験ページ
        artwork: '../../message/artwork/artwork_submit.html',   // ← 作品情報入力ページ
        next: '../../present/index.html',     // ← 次の防災行動ページ（仮）
        map: '../../present/index.html',      // ← 作品集マップ
        home: '../index.html'                        // ← トップページ
    }
};

// =====================================
// State Management
// =====================================
let appData = {
    hazardMap: {
        hazards: [],
        location: { lat: null, lon: null }
    },
    marbling: {
        description: ''
    },
    collage: {
        description: ''
    },
    artwork: {
        title: '',
        creatorName: '',
        creationDate: ''
    }
};

let previewMap = null;
let previewMarker = null;
let isSubmitting = false;

// =====================================
// Initialize Page
// =====================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('Final Submit Page v3.0 (Serverless) - Initializing...');

    loadAllData();
    displayDataSummary();
    checkMissingData();
    checkArtworkImage();
    displayArtworkPreview();
    checkPendingSubmission();

    console.log('Final Submit Page - Ready');
});

// =====================================
// Load Data from localStorage
// =====================================
function loadAllData() {
    try {
        const hazardMapData = localStorage.getItem('hazardMapLog');
        if (hazardMapData) {
            const parsed = JSON.parse(hazardMapData);
            appData.hazardMap = parsed.hazardMap ?? parsed;
            console.log('Loaded hazard map data:', appData.hazardMap);
        }

        const marblingData = localStorage.getItem('marblingLog');
        if (marblingData) {
            const parsed = JSON.parse(marblingData);
            appData.marbling = parsed.marbling ?? parsed;
            console.log('Loaded marbling data:', appData.marbling);
        }

        const collageData = localStorage.getItem('collageLog');
        if (collageData) {
            const parsed = JSON.parse(collageData);
            appData.collage = parsed.collage ?? parsed;
            console.log('Loaded collage data:', appData.collage);
        }

        const artworkData = localStorage.getItem('artworkSubmit');
        if (artworkData) {
            const parsed = JSON.parse(artworkData);
            appData.artwork.title = parsed.title ?? '';
            appData.artwork.creatorName = parsed.creatorName ?? '';
            appData.artwork.creationDate = parsed.creationDate ?? '';
            console.log('Loaded artwork data:', appData.artwork);
        }
    } catch (error) {
        console.error('Error loading data from localStorage:', error);
        alert('データの読み込みに失敗しました。前のページに戻ってやり直してください。');
    }
}

// =====================================
// Display Data Summary
// =====================================
function displayDataSummary() {
    // Location
    const loc = appData.hazardMap.location;
    const locationEl = document.getElementById('summary-location');
    if (loc?.lat && loc?.lon) {
        locationEl.textContent = `緯度: ${loc.lat.toFixed(6)}, 経度: ${loc.lon.toFixed(6)}`;
        locationEl.classList.remove('empty');
        renderSummaryMap(loc.lat, loc.lon);
    } else {
        locationEl.textContent = '（未選択）';
        locationEl.classList.add('empty');
    }

    // Hazards
    const hazardsEl = document.getElementById('summary-hazards');
    if (appData.hazardMap.hazards && appData.hazardMap.hazards.length > 0) {
        hazardsEl.innerHTML = appData.hazardMap.hazards
            .map(h => `<span class="tag">${h}</span>`)
            .join(' ');
        hazardsEl.classList.remove('empty');
    } else {
        hazardsEl.textContent = '（未選択）';
        hazardsEl.classList.add('empty');
    }

    // Marbling
    const marblingEl = document.getElementById('summary-marbling');
    if (appData.marbling.description) {
        marblingEl.textContent = appData.marbling.description;
        marblingEl.classList.remove('empty');
    } else {
        marblingEl.textContent = '（未入力）';
        marblingEl.classList.add('empty');
    }

    // Collage
    const collageEl = document.getElementById('summary-collage');
    if (appData.collage.description) {
        collageEl.textContent = appData.collage.description;
        collageEl.classList.remove('empty');
    } else {
        collageEl.textContent = '（未入力）';
        collageEl.classList.add('empty');
    }

    // Title
    const titleEl = document.getElementById('summary-title');
    if (appData.artwork.title) {
        titleEl.textContent = appData.artwork.title;
        titleEl.classList.remove('empty');
    } else {
        titleEl.textContent = '（未入力）';
        titleEl.classList.add('empty');
    }

    // Creator
    const creatorEl = document.getElementById('summary-creator');
    if (appData.artwork.creatorName) {
        creatorEl.textContent = appData.artwork.creatorName;
        creatorEl.classList.remove('empty');
    } else {
        creatorEl.textContent = '（未入力）';
        creatorEl.classList.add('empty');
    }
}

// =====================================
// Check Missing Data & Show Badges
// =====================================
function checkMissingData() {
    const missing = [];
    const badges = {
        hazard: false,
        marbling: false,
        collage: false,
        artwork: false
    };

    if (!appData.hazardMap.hazards || appData.hazardMap.hazards.length === 0) {
        missing.push('ハザードマップが選択されていません');
        badges.hazard = true;
    }
    if (!appData.hazardMap.location?.lat || !appData.hazardMap.location?.lon) {
        missing.push('対象地点が選択されていません');
        badges.hazard = true;
    }

    if (!appData.marbling.description || appData.marbling.description.trim() === '') {
        missing.push('マーブリング作品の説明が入力されていません');
        badges.marbling = true;
    }

    if (!appData.collage.description || appData.collage.description.trim() === '') {
        missing.push('コラージュ作品の説明が入力されていません');
        badges.collage = true;
    }

    if (!appData.artwork.title || appData.artwork.title.trim() === '') {
        missing.push('作品タイトルが入力されていません');
        badges.artwork = true;
    }
    if (!appData.artwork.creatorName || appData.artwork.creatorName.trim() === '') {
        missing.push('制作者名が入力されていません');
        badges.artwork = true;
    }

    Object.keys(badges).forEach(key => {
        const badge = document.getElementById(`badge-${key}`);
        if (badge) {
            badge.style.display = badges[key] ? 'flex' : 'none';
        }
    });

    const alertEl = document.getElementById('alert-missing');
    const listEl = document.getElementById('missing-items-list');

    if (missing.length > 0) {
        if (alertEl) alertEl.style.display = 'flex';
        if (listEl) listEl.innerHTML = missing.map(item => `<li>${item}</li>`).join('');
    } else {
        if (alertEl) alertEl.style.display = 'none';
    }
}

// =====================================
// 作品画像（localStorage.artworkImage）の有無をチェック
// =====================================
function checkArtworkImage() {
    const alertEl = document.getElementById('image-missing-alert');
    const btn = document.getElementById('btn-submit-artwork');
    const hasImage = !!localStorage.getItem('artworkImage');

    if (alertEl) alertEl.style.display = hasImage ? 'none' : 'flex';
    if (btn) btn.disabled = !hasImage;
}

// =====================================
// 作品画像プレビューを表示
// =====================================
function displayArtworkPreview() {
    const img = document.getElementById('artwork-preview-img');
    const empty = document.getElementById('artwork-preview-empty');
    const data = localStorage.getItem('artworkImage');
    if (data) {
        if (img) { img.src = data; img.style.display = 'block'; }
        if (empty) empty.style.display = 'none';
    } else {
        if (img) img.style.display = 'none';
        if (empty) empty.style.display = 'block';
    }
}

// =====================================
// 送信ペイロードの作成
// =====================================
function buildSubmitPayload(imageDataURL) {
    const loc = appData.hazardMap.location;
    const hazards = (appData.hazardMap.hazards || []).join(', ');

    return {
        secret: CONFIG.SUBMIT_SECRET,
        lat: loc.lat,
        lon: loc.lon,
        properties: {
            field_23: null,
            field_24: hazards,
            field_25: appData.artwork.creatorName || '匿名',
            Message: appData.artwork.title || '',
            collage: appData.collage.description || '',
            Mabling: appData.marbling.description || '',
            creationDate: appData.artwork.creationDate || new Date().toISOString().slice(0, 10)
        },
        imageBase64: imageDataURL,
        imageExt: localStorage.getItem('artworkImageExt') || 'jpg'
    };
}

// =====================================
// 送信ボタンの押下（Survey123の代わり）
// =====================================
async function submitArtwork() {
    if (isSubmitting) return;

    const loc = appData.hazardMap.location;
    if (!loc || !loc.lat || !loc.lon) {
        alert('対象地点が選択されていません。「対象地点/ハザード」のページからやり直してください。');
        return;
    }

    const imageDataURL = localStorage.getItem('artworkImage');
    if (!imageDataURL) {
        alert('作品画像が見つかりません。コラージュのページに戻り、作品を保存してください。');
        return;
    }

    const payload = buildSubmitPayload(imageDataURL);
    await sendSubmitPayload(payload);
}

// =====================================
// Workerへ送信（失敗時はlocalStorageに退避して再送可能に）
// =====================================
async function sendSubmitPayload(payload) {
    isSubmitting = true;
    setSubmitUIState('sending');

    try {
        localStorage.setItem('pendingArtworkSubmitPayload', JSON.stringify(payload));

        const res = await fetch(CONFIG.WORKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        let json = null;
        try { json = await res.json(); } catch (e) { /* ignore */ }

        if (res.ok && json && json.ok) {
            localStorage.removeItem('pendingArtworkSubmitPayload');
            localStorage.removeItem('artworkImage');
            localStorage.removeItem('artworkImageExt');
            if (json.id) localStorage.setItem('lastSubmittedArtworkId', json.id);

            const banner = document.getElementById('pending-submit-banner');
            if (banner) banner.remove();

            setSubmitUIState('success');
            showCompletion();
        } else {
            const msg = (json && json.error) ? json.error : `送信に失敗しました（status: ${res.status}）`;
            setSubmitUIState('error', msg);
        }
    } catch (err) {
        console.error('送信エラー:', err);
        setSubmitUIState('error', '通信エラーが発生しました。ネットワーク接続を確認し、もう一度お試しください。');
    } finally {
        isSubmitting = false;
    }
}

// =====================================
// 送信ボタン・ステータス表示の切り替え
// =====================================
function setSubmitUIState(state, message) {
    const btn = document.getElementById('btn-submit-artwork');
    const statusEl = document.getElementById('submit-status');
    if (!btn || !statusEl) return;

    if (state === 'sending') {
        btn.disabled = true;
        btn.textContent = '送信中…';
        statusEl.style.display = 'block';
        statusEl.className = 'submit-status info';
        statusEl.textContent = '登録しています。しばらくお待ちください…';
    } else if (state === 'success') {
        btn.disabled = true;
        btn.textContent = '✅ 登録完了';
        statusEl.style.display = 'none';
    } else if (state === 'error') {
        btn.disabled = false;
        btn.textContent = '📤 もう一度送信する →';
        statusEl.style.display = 'block';
        statusEl.className = 'submit-status error';
        statusEl.textContent = '⚠ ' + message;
    }
}

// =====================================
// 完了画面を表示
// =====================================
function showCompletion() {
    const completeSection = document.getElementById('step-complete');
    if (completeSection) {
        completeSection.style.display = 'block';
        completeSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    celebrateCompletion();
}

function celebrateCompletion() {
    console.log('🎉 Completion celebrated!');
}

// =====================================
// 前回送信が完了していないデータが残っていれば再送を案内
// =====================================
function checkPendingSubmission() {
    const pending = localStorage.getItem('pendingArtworkSubmitPayload');
    if (!pending) return;

    const section = document.getElementById('step-survey');
    if (!section) return;

    const banner = document.createElement('div');
    banner.className = 'alert-card warning';
    banner.id = 'pending-submit-banner';
    banner.innerHTML = `
        <div class="alert-icon">⏳</div>
        <div class="alert-content">
            <h3 class="alert-title">前回の登録が完了していない可能性があります</h3>
            <p class="info-note">通信エラーなどで送信が完了していないデータが残っています。もう一度送信しますか？</p>
            <div class="action-section" style="margin-top:0.75rem;">
                <button class="btn btn-primary" id="btn-retry-pending" type="button">再送信する</button>
                <button class="btn btn-secondary" id="btn-discard-pending" type="button">破棄する</button>
            </div>
        </div>
    `;

    const header = section.querySelector('.step-header');
    if (header && header.nextSibling) {
        section.insertBefore(banner, header.nextSibling);
    } else {
        section.insertBefore(banner, section.firstChild);
    }

    const retryBtn = document.getElementById('btn-retry-pending');
    const discardBtn = document.getElementById('btn-discard-pending');

    if (retryBtn) {
        retryBtn.addEventListener('click', async () => {
            try {
                const payload = JSON.parse(pending);
                await sendSubmitPayload(payload);
            } catch (e) {
                console.error(e);
            }
        });
    }
    if (discardBtn) {
        discardBtn.addEventListener('click', () => {
            localStorage.removeItem('pendingArtworkSubmitPayload');
            banner.remove();
        });
    }
}

// =====================================
// Navigation Functions
// =====================================
function navigateToPage(page) {
    if (CONFIG.PAGES[page]) {
        if (confirm(`${getPageName(page)}ページに移動しますか？\n（入力した内容は保存されています）`)) {
            window.location.href = CONFIG.PAGES[page];
        }
    }
}

function getPageName(page) {
    const names = {
        hazard: '対象地点/ハザードマップ',
        marbling: 'マーブリング',
        collage: 'コラージュ',
        artwork: '作品情報'
    };
    return names[page] || '';
}

function goBack() {
    navigateToPage('artwork');
}

function goToNextAction() {
    window.location.href = CONFIG.PAGES.next;
}

function viewMap() {
    window.open(CONFIG.PAGES.map, '_blank');
}

function goHome() {
    if (confirm('トップページに戻りますか？')) {
        window.location.href = CONFIG.PAGES.home;
    }
}

// =====================================
// Map Preview (Leaflet)
// =====================================
function renderSummaryMap(lat, lon) {
    const mapEl = document.getElementById('summary-map');
    if (!mapEl) return;

    if (!lat || !lon) {
        mapEl.innerHTML = '<div style="padding:12px;color:#999;text-align:center;">地図を表示できません</div>';
        return;
    }

    if (!previewMap) {
        previewMap = L.map('summary-map', {
            zoomControl: true,
            scrollWheelZoom: false,
            dragging: true,
            touchZoom: true
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(previewMap);
    }

    previewMap.setView([lat, lon], 15);

    if (previewMarker) previewMarker.remove();
    previewMarker = L.marker([lat, lon]).addTo(previewMap);

    setTimeout(() => {
        if (previewMap) previewMap.invalidateSize();
    }, 100);
}

// =====================================
// Utility Functions
// =====================================
function logAppData() {
    console.log('=== App Data ===');
    console.log('Hazard Map:', appData.hazardMap);
    console.log('Marbling:', appData.marbling);
    console.log('Collage:', appData.collage);
    console.log('Artwork:', appData.artwork);
    console.log('================');
}

// Expose to global for debugging
window.logAppData = logAppData;
