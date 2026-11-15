(() => {
  const DURATION = 900;   // thời gian lật (ms)
  const STAGGER  = 170;   // độ trễ giữa các bước khi nhảy từ mục lục (ms)

  document.documentElement.style.setProperty('--flip-time', DURATION + 'ms');

  const frame     = document.getElementById('bookFrame');
  const sheets    = [...document.querySelectorAll('.sheet')];
  const btnPrev   = document.getElementById('btnPrev');
  const btnNext   = document.getElementById('btnNext');
  const indicator = document.getElementById('indicator');
  const N = sheets.length;

  const mq = window.matchMedia('(max-width: 760px)');   // true = điện thoại

  let current = 0;          // số tờ đã lật (dùng cho cả 2 chế độ)
  let page = 0;             // điện thoại: trang đang xem, 0 .. 2N-1
  let autoFlipping = false;
  const timers = new Map();
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  const restZ = (i) => sheets[i].classList.contains('flipped') ? i + 1 : N - i;

  function init() {
    sheets.forEach((s, i) => (s.style.zIndex = N - i));
    updateUI();
  }

  // Lật 1 tờ giấy (dir = 1: lật sang trái, -1: lật về phải)
  function flip(dir) {
    if (dir > 0 && current >= N) return;
    if (dir < 0 && current <= 0) return;

    const i = dir > 0 ? current : current - 1;
    const sheet = sheets[i];

    clearTimeout(timers.get(i));
    sheet.style.zIndex = N + 1 + (dir > 0 ? i : N - i);
    sheet.classList.add('turning');
    sheet.classList.toggle('flipped', dir > 0);
    current += dir;
    updateUI();

    timers.set(i, setTimeout(() => {
      sheet.classList.remove('turning');
      sheet.style.zIndex = restZ(i);
    }, DURATION));
  }

  // Điện thoại: mỗi bước = 1 trang. Trang chẵn (mặt trước) -> lẻ (mặt sau) thì lật tờ giấy,
  // còn lẻ -> chẵn chỉ trượt khung nhìn sang trang kế
  function step(dir) {
    if (dir > 0) {
      if (page >= 2 * N - 1) return;
      if (page % 2 === 0) flip(1);
      page++;
    } else {
      if (page <= 0) return;
      if (page % 2 === 1) flip(-1);
      page--;
    }
    updateUI();
  }

  function go(dir) {
    if (autoFlipping) return;
    mq.matches ? step(dir) : flip(dir);
  }

  async function flipTo(target) {            // máy tính: nhảy tới spread
    if (autoFlipping || target === current) return;
    autoFlipping = true;
    const dir = target > current ? 1 : -1;
    while (current !== target) { flip(dir); await wait(STAGGER); }
    await wait(DURATION - STAGGER);
    autoFlipping = false;
  }

  async function pageTo(target) {            // điện thoại: nhảy tới trang
    if (autoFlipping || target === page) return;
    autoFlipping = true;
    const dir = target > page ? 1 : -1;
    while (page !== target) { step(dir); await wait(STAGGER); }
    await wait(DURATION - STAGGER);
    autoFlipping = false;
  }

  function updateUI() {
    const mobile = mq.matches;
    frame.dataset.state = current === 0 ? 'start' : current === N ? 'end' : 'open';
    frame.dataset.side  = page % 2 === 1 ? 'left' : 'right';
    btnPrev.disabled = mobile ? page === 0 : current === 0;
    btnNext.disabled = mobile ? page === 2 * N - 1 : current === N;

    if (mobile) {
      indicator.textContent = page === 0 ? 'BÌA TRƯỚC'
                            : page === 2 * N - 1 ? 'BÌA SAU'
                            : `TRANG ${page}`;
    } else {
      indicator.textContent = current === 0 ? 'BÌA TRƯỚC'
                            : current === N ? 'BÌA SAU'
                            : `TRANG ${current * 2 - 1} – ${current * 2}`;
    }
  }

  // ===== Sự kiện =====
  btnNext.addEventListener('click', () => go(1));
  btnPrev.addEventListener('click', () => go(-1));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') go(1);
    if (e.key === 'ArrowLeft')  go(-1);
  });

  // Vuốt ngang để lật trang (điện thoại / màn hình cảm ứng)
  let startX = null;
  frame.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
  frame.addEventListener('touchend', (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    startX = null;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  });

  // Mục lục. Điện thoại: "Lời giới thiệu" nằm ở trang phải (trang 2), các mục còn lại ở trang trái (2k-1)
  document.querySelectorAll('[data-goto]').forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const k = Number(a.dataset.goto);
      mq.matches ? pageTo(k === 1 ? 2 : 2 * k - 1) : flipTo(k);
    })
  );

  // Xoay màn hình / đổi kích thước: đồng bộ lại trang đang xem
  mq.addEventListener('change', () => {
    page = current === 0 ? 0 : 2 * current - 1;
    updateUI();
  });
    // Nút "Mục lục": lật về trang mục lục
  document.getElementById('btnToc').addEventListener('click', () => {
    mq.matches ? pageTo(1) : flipTo(1);
  });
    // ===== Bút dạ quang: người đọc tự tô chữ =====
  const hlTools = document.getElementById('hlTools');
  let hlOn = false, hlColor = 'c1';

  function setHl(on) {
    hlOn = on;
    document.body.classList.toggle('hl-mode', on);
    hlTools.classList.toggle('on', on);
    if (!on) getSelection().removeAllRanges();
  }
  document.getElementById('hlToggle').addEventListener('click', () => setHl(!hlOn));
  hlTools.querySelectorAll('.sw').forEach(b => {
    if (b.dataset.c === hlColor) b.classList.add('active');
    b.addEventListener('click', () => {
      hlColor = b.dataset.c;
      hlTools.querySelectorAll('.sw').forEach(x => x.classList.toggle('active', x === b));
    });
  });

  function unwrap(m) {
    const p = m.parentNode;
    while (m.firstChild) p.insertBefore(m.firstChild, m);
    p.removeChild(m); p.normalize();
  }
  document.getElementById('hlClear').addEventListener('click', () =>
    document.querySelectorAll('mark.hl').forEach(unwrap));

  function highlightSelection() {
    const sel = getSelection();
    if (!hlOn || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const root = range.commonAncestorContainer;
    const walker = document.createTreeWalker(root.nodeType === 1 ? root : root.parentNode, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) if (range.intersectsNode(walker.currentNode)) nodes.push(walker.currentNode);
    nodes.forEach(n => {
      const par = n.parentElement;
      if (!par || !par.closest('.face') || par.closest('.pno, .toc, mark.hl')) return;
      const start = n === range.startContainer ? range.startOffset : 0;
      const end = n === range.endContainer ? range.endOffset : n.length;
      if (start >= end || !n.data.slice(start, end).trim()) return;
      const r = document.createRange();
      r.setStart(n, start); r.setEnd(n, end);
      const m = document.createElement('mark');
      m.className = 'hl ' + hlColor;
      r.surroundContents(m);
    });
    sel.removeAllRanges();
  }

  // Thả chuột / nhấc ngón tay: tô vùng vừa chọn. Đang bật bút thì không cho vuốt lật trang.
  ['mouseup', 'touchend'].forEach(ev =>
    document.addEventListener(ev, (e) => {
      if (!hlOn) return;
      setTimeout(highlightSelection, 0);
      if (ev === 'touchend' && e.target.closest('#bookFrame')) e.stopPropagation();
    }, true));

  // Bấm vào chữ đã tô: xóa vết tô đó
  document.addEventListener('click', (e) => {
    const m = e.target.closest('mark.hl');
    if (hlOn && m && getSelection().isCollapsed) unwrap(m);
  });

  init();

  // Máy tính: tự mở sách. Điện thoại: giữ bìa, người đọc vuốt/bấm để mở
  if (!mq.matches) setTimeout(() => flip(1), 700);
  
})();