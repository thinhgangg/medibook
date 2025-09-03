document.addEventListener('DOMContentLoaded', function () {
  // ready
});

/* ====== HERO search ====== */
const form = document.getElementById('searchForm');
const input = document.getElementById('searchInput');
if (form && input) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) { input.focus(); return; }
    alert(`Tìm kiếm: ${q}`); // TODO: điều hướng thật
  });
}

/* ===== Mock data (Doctors) ===== */
const DOCTORS = [
  { id:1, initials:"LMH", title:"BS. CK2", full_name:"Lê Thị Minh Hồng", specialties:["Nhi khoa"], hospital:"Bệnh viện Nhi Đồng 2", avatar_url:"/static/img/doctors/doctor1.jpg" },
  { id:2, initials:"LVT", title:"PGS. TS.", full_name:"Lâm Việt Trung", specialties:["Tiêu hoá","Ngoại tiết niệu"], hospital:"Bệnh viện Chợ Rẫy", avatar_url:"/static/img/doctors/doctor2.webp" },
  { id:3, initials:"NTH", title:"BS. CK2", full_name:"Nguyễn Thị Thu Hà", specialties:["Nhi khoa"], hospital:"BV Nhi Đồng TP.HCM", avatar_url:"/static/img/doctors/doctor3.webp" },
  { id:4, initials:"VDH", title:"BS. CK2", full_name:"Võ Đức Hiếu", specialties:["Ung bướu"], hospital:"BV Ung Bướu TP.HCM", avatar_url:"/static/img/doctors/doctor4.webp" }
];

/* ===== Render doctors ===== */
function renderDoctors(list) {
  const rail = document.getElementById('doctorRail');
  if (!rail) return;

  rail.innerHTML = list.map(d => {
    const tags = (d.specialties || []).map(t => `<span class="dm-tag">${t}</span>`).join("");
    return `
      <article class="dm-card" role="option" tabindex="0" data-doctor-id="${d.id}">
        <div class="dm-card__avatar">
          <img src="${d.avatar_url}" alt="Ảnh của ${d.full_name}" />
        </div>
        <h3 class="dm-card__name">${d.title} ${d.full_name}</h3>
        <div class="dm-card__tags">${tags}</div>
        <div class="dm-card__org">${d.hospital}</div>
        <a href="#" class="dm-btn dm-btn--ghost" data-book="${d.id}">Đặt lịch khám</a>
      </article>`;
  }).join("");

  rail.querySelectorAll('[data-book]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      alert(`(Demo) Đặt lịch bác sĩ ID: ${btn.dataset.book}`);
    });
  });
}

/* ===== Generic rail controls (dùng cho doctor) ===== */
function setupRail(railId, progressId) {
  const rail = document.getElementById(railId);
  const bar = document.getElementById(progressId);
  if (!rail || !bar) return;
  const prev = document.querySelector(`.dm-nav--prev[data-for="${railId}"]`);
  const next = document.querySelector(`.dm-nav--next[data-for="${railId}"]`);
  const step = () => Math.min(rail.clientWidth * 0.9, 600);

  function update() {
    const max = rail.scrollWidth - rail.clientWidth;
    const x = rail.scrollLeft;
    if (prev) prev.disabled = x <= 2;
    if (next) next.disabled = x >= max - 2;
    bar.style.width = `${(x / Math.max(1, max)) * 100}%`;
  }
  prev?.addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: 'smooth' }));
  next?.addEventListener('click', () => rail.scrollBy({ left: step(), behavior: 'smooth' }));
  rail.addEventListener('scroll', update);
  window.addEventListener('resize', update);
  update();

  // drag to scroll
  let down = false, sx = 0, sl = 0;
  rail.addEventListener('pointerdown', e => { down = true; sx = e.clientX; sl = rail.scrollLeft; rail.setPointerCapture(e.pointerId); });
  rail.addEventListener('pointermove', e => { if (!down) return; rail.scrollLeft = sl - (e.clientX - sx); });
  rail.addEventListener('pointerup', () => down = false);
  rail.addEventListener('pointercancel', () => down = false);

  // vertical wheel -> horizontal
  rail.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
      rail.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }, { passive: false });
}

/* ===== Specialties ===== */
const SPECIALTIES = [
  { id: 'yhct', name: 'Y học cổ truyền', icon: '/static/img/specs/yhct-logo.webp' },
  { id: 'truyen', name: 'Truyền nhiễm', icon: '/static/img/specs/tn-logo.webp' },
  { id: 'tim', name: 'Tim mạch', icon: '/static/img/specs/tim-mach.webp' },
  { id: 'lao', name: 'Lão khoa', icon: '/static/img/specs/laokhoa-nobg.png' },
  { id: 'chan', name: 'Chấn thương chỉnh hình', icon: '/static/img/specs/chanthuong-nobg.png' },
  { id: 'hoisuc', name: 'Hồi sức - cấp cứu', icon: '/static/img/specs/hsuc-nobg.png' }
];

function renderSpecialties(list) {
  const ul = document.getElementById('specList');
  if (!ul) return;
  ul.innerHTML = list.map(s => `
    <li class="spec-item">
      <a href="#" class="spec-link" data-spec="${s.id}" aria-label="${s.name}">
        <div class="spec-thumb">${s.icon ? `<img src="${s.icon}" alt="${s.name}">` : ''}</div>
        <div class="spec-name">${s.name}</div>
      </a>
    </li>
  `).join('');

  ul.querySelectorAll('[data-spec]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      alert('(Demo) Chuyên khoa: ' + a.dataset.spec);
    });
  });
}

/* ===== News cards interactions ===== */
document.addEventListener("DOMContentLoaded", () => {
  const OPEN_IN_NEW_TAB = true;
  const cards = document.querySelectorAll(".news-card, .news-main, .news-item");
  cards.forEach(el => (el.style.cursor = "pointer"));
  const isAnchor = (el) => !!(el && (el.tagName === "A" || el.closest("a")));

  document.addEventListener("click", (e) => {
    const card = e.target.closest(".news-card, .news-main, .news-item");
    if (!card) return;
    if (isAnchor(e.target)) return;
    const url = card.getAttribute("data-url");
    if (!url) return;
    const openInNewTab = e.metaKey || e.ctrlKey || OPEN_IN_NEW_TAB;
    if (openInNewTab) window.open(url, "_blank", "noopener");
    else window.location.href = url;
  });

  document.addEventListener("auxclick", (e) => {
    if (e.button !== 1) return;
    const card = e.target.closest(".news-card, .news-main, .news-item");
    if (!card) return;
    const url = card.getAttribute("data-url");
    if (!url) return;
    e.preventDefault();
    window.open(url, "_blank", "noopener");
  });

  cards.forEach((card) => {
    card.setAttribute("role", "link");
    card.setAttribute("tabindex", "0");
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const url = card.getAttribute("data-url");
        if (!url) return;
        if (OPEN_IN_NEW_TAB) window.open(url, "_blank", "noopener");
        else window.location.href = url;
      }
    });
  });

  document.querySelectorAll(".news-card__img, .news-main__image, .news-item__image")
    .forEach((img) => img.setAttribute("loading", "lazy"));

  // Nút "Xem thêm" tin
  const ctn = document.querySelector('.news-container');
  if (ctn) {
    const btn = document.createElement('button');
    btn.textContent = 'Xem thêm';
    btn.style.marginTop = '20px';
    btn.style.padding = '10px 20px';
    btn.style.fontSize = '16px';
    btn.style.cursor = 'pointer';
    btn.style.backgroundColor = '#1f5fd9';
    btn.style.color = 'white';
    btn.style.border = 'none';
    btn.style.borderRadius = '5px';
    ctn.appendChild(btn);
    btn.addEventListener('click', () => alert('Load more articles...'));
  }
});

/* ===== Hover QR ===== */
document.querySelectorAll(".cb-right .qr-code img").forEach(img=>{
  img.addEventListener("mouseenter", ()=> img.style.transform="scale(1.1)");
  img.addEventListener("mouseleave", ()=> img.style.transform="scale(1)");
});

/* ===== Init ===== */
document.addEventListener('DOMContentLoaded', () => {
  renderDoctors(DOCTORS);
  setupRail('doctorRail', 'doctorProgress');
  renderSpecialties(SPECIALTIES);
});
