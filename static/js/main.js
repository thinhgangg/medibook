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
  {
    id: 1,
    initials: "LMH",
    title: "BS. CK2",
    full_name: "Lê Thị Minh Hồng",
    specialties: ["Nhi khoa"],
    hospital: "Bệnh viện Nhi Đồng 2",
    avatar_url: "/static/img/doctors/doctor1.jpg"  // Đường dẫn ảnh bác sĩ 1
  },
  {
    id: 2,
    initials: "LVT",
    title: "PGS. TS.",
    full_name: "Lâm Việt Trung",
    specialties: ["Tiêu hoá", "Ngoại tiết niệu"],
    hospital: "Bệnh viện Chợ Rẫy",
    avatar_url: "/static/img/doctors/doctor2.webp"  // Đường dẫn ảnh bác sĩ 2
  },
  {
    id: 3,
    initials: "NTH",
    title: "BS. CK2",
    full_name: "Nguyễn Thị Thu Hà",
    specialties: ["Nhi khoa"],
    hospital: "BV Nhi Đồng TP.HCM",
    avatar_url: "/static/img/doctors/doctor3.webp"  // Đường dẫn ảnh bác sĩ 3
  },
  {
    id: 4,
    initials: "VDH",
    title: "BS. CK2",
    full_name: "Võ Đức Hiếu",
    specialties: ["Ung bướu"],
    hospital: "BV Ung Bướu TP.HCM",
    avatar_url: "/static/img/doctors/doctor4.webp"  // Đường dẫn ảnh bác sĩ 4
  }
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
          <img src="${d.avatar_url}" alt="Ảnh của ${d.full_name}" />  <!-- Hiển thị ảnh bác sĩ -->
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

/* ===== Generic rail controls ===== */
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

  // vertical wheel -> horizontal scroll
  rail.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
      rail.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }, { passive: false });
}

/* ===== Khởi tạo khi trang tải xong ===== */
document.addEventListener('DOMContentLoaded', () => {
  renderDoctors(DOCTORS);  // render danh sách bác sĩ
  setupRail('doctorRail', 'doctorProgress');  // setup control cho rail
});
/* ===== Mock data (Hospitals) ===== */
const HOSPITALS = [
  {
    id: 'ub',
    name: 'Bệnh viện Ung Bướu TPHCM',
    address: '47 Nguyễn Huy Lượng, Phường Bình Thạnh, TP. Hồ Chí Minh',
    cover: '/static/img/hospitals/ub-cover.webp',
    logo: '/static/img/hospitals/ub-logo.webp',
    hours: ['Thứ 2 - Thứ 6: 7h30 - 16h30', 'Thứ 7 - CN: 7h30 - 11h30']
  },
  {
    id: '175',
    name: 'Bệnh viện Quân Y 175',
    address: '786 Nguyễn Kiệm, P.3, Gò Vấp, TP. Hồ Chí Minh',
    cover: '/static/img/hospitals/175-cover.webp',
    logo: '/static/img/hospitals/175-logo.webp',
    hours: ['Thứ 2 - Thứ 6: 7h - 16h30', 'Thứ 7: 7h - 16h']
  },
  {
    id: 'yhct',
    name: 'Bệnh viện Y Học Cổ Truyền TP.HCM',
    address: '179-187 Nam Kỳ Khởi Nghĩa, Q.3, TP. Hồ Chí Minh',
    cover: '/static/img/hospitals/yhct-cover.webp',
    logo: '/static/img/hospitals/yhct-logo.webp',
    hours: ['Thứ 2 - Thứ 7: 7h - 19h', 'Chủ nhật: 7h - 11h30']
  },
  {
    id: 'td',
    name: 'Bệnh viện Đa Khoa Thủ Đức',
    address: '29 Phú Châu, TP. Thủ Đức, TP. Hồ Chí Minh',
    cover: '/static/img/hospitals/td-cover.webp',
    logo: '/static/img/hospitals/td-logo.png',
    hours: ['Thứ 2 - Thứ 6: 7h - 16h30']
  }
];

/* ===== Render hospitals ===== */
function renderHospitals(list) {
  const rail = document.getElementById('hospitalRail');
  if (!rail) return;

  rail.innerHTML = list.map(h => {
    const cover = h.cover
      ? `<img class="hv-cover" src="${h.cover}" alt="${h.name}">`
      : `<div class="hv-cover"></div>`;

    const logo = h.logo
      ? `<img src="${h.logo}" alt="${h.name} logo">`
      : `<span style="font-weight:800;color:#1040C5">${(h.name || '').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}</span>`;

    const hours = (h.hours || []).map(line => `<div>${line}</div>`).join('');

    return `
      <article class="hv-card" role="option" tabindex="0" data-hospital-id="${h.id}">
        ${cover}
        <div class="hv-body">
          <div class="hv-logo">${logo}</div>
          <h3 class="hv-title">${h.name}</h3>
          <div class="hv-addr">${h.address || ''}</div>
          <div class="hv-hours">${hours}</div>
          <div class="hv-actions">
            <a href="#" class="dm-btn dm-btn--ghost" data-book-hospital="${h.id}">Đặt lịch khám</a>
          </div>
        </div>
      </article>
    `;
  }).join('');

  rail.querySelectorAll('[data-book-hospital]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      alert(`(Demo) Đặt lịch bệnh viện ID: ${btn.dataset.bookHospital}`);
    });
  });

  window.dispatchEvent(new Event('resize'));
}

/* ===== Khởi tạo khi trang tải xong ===== */
document.addEventListener('DOMContentLoaded', () => {
  renderHospitals(HOSPITALS);
});

/* ===== Clinics (mock) ===== */
const CLINICS = [
  {
    id:'pk13', name:'Phòng khám Sản Phụ Khoa 13 Cao Thắng',
    address:'13 Cao Thắng, Phường Bàn Cờ',
    cover:'/static/img/clinics/13ct-cover.jpg',
    logo:'/static/img/clinics/13ct-logo.png'
  },
  {
    id:'mymy', name:'Phòng khám Nhi Mỹ Mỹ',
    address:'105/10 Nguyễn Thị Tú, Bình Tân, TP.HCM',
    cover:'/static/img/clinics/mymy-cover.jpg',
    logo:'/static/img/clinics/mymy-logo.png'
  },
  {
    id:'chac', name:'Trung Tâm Chăm Sóc Sức Khoẻ Cộng Đồng - CHAC',
    address:'110A Ngô Quyền, P.8, Q.5, TP.HCM',
    cover:'/static/img/clinics/chac-cover.jpg',
    logo:'/static/img/clinics/chac-logo.png'
  },
  {
    id:'shine', name:'Shine Clinic By TS.BS Trần Ngọc Ánh since 1987',
    address:'06 Trương Quyền, P.6, Q.3, TP.HCM',
    cover:'/static/img/clinics/shine-cover.jpg',
    logo:'/static/img/clinics/shine-logo.png'
  }
];

function renderClinics(list){
  const rail = document.getElementById('clinicRail');
  if(!rail) return;
  rail.innerHTML = list.map(c=>{
    const cover = c.cover ? `<img class="cl-cover" src="${c.cover}" alt="${c.name}">` : `<div class="cl-cover"></div>`;
    const logo  = c.logo  ? `<img src="${c.logo}" alt="${c.name} logo">`
                          : `<span style="font-weight:800;color:#1040C5">${(c.name||'').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()}</span>`;
    return `
      <article class="cl-card" role="option" tabindex="0" data-clinic-id="${c.id}">
        ${cover}
        <div class="cl-body">
          <div class="cl-logo">${logo}</div>
          <h3 class="cl-title">${c.name}</h3>
          <div class="cl-addr">${c.address||''}</div>
          <div class="cl-actions">
            <a href="#" class="dm-btn dm-btn--ghost" data-book-clinic="${c.id}">Đặt lịch khám</a>
          </div>
        </div>
      </article>
    `;
  }).join('');

  rail.querySelectorAll('[data-book-clinic]').forEach(btn=>{
    btn.addEventListener('click', e=>{
      e.preventDefault();
      alert(`(Demo) Đặt lịch phòng khám ID: ${btn.dataset.bookClinic}`);
    });
  });

  window.dispatchEvent(new Event('resize'));
}
/* ===== Mock data (Specialties with logos) ===== */
const SPECIALTIES = [
  { id: 'yhct', name: 'Y học cổ truyền', icon: '/static/img/specs/yhct-logo.webp' },
  { id: 'truyen', name: 'Truyền nhiễm', icon: '/static/img/specs/tn-logo.webp' },
  { id: 'tim', name: 'Tim mạch', icon: '/static/img/specs/tim-mach.webp' },
  { id: 'lao', name: 'Lão khoa', icon: '/static/img/specs/laokhoa-nobg.png' },
  { id: 'chan', name: 'Chấn thương chỉnh hình', icon: '/static/img/specs/chanthuong-nobg.png' },
  { id: 'hoisuc', name: 'Hồi sức - cấp cứu', icon: '/static/img/specs/hsuc-nobg.png' }
];

/* ===== Render Specialties with Logo ===== */
function renderSpecialties(list) {
  const ul = document.getElementById('specList');
  if (!ul) return;

  ul.innerHTML = list.map(s => `
    <li class="spec-item">
      <a href="#" class="spec-link" data-spec="${s.id}" aria-label="${s.name}">
        <div class="spec-thumb">
          ${s.icon ? `<img src="${s.icon}" alt="${s.name}">` : ''}
        </div>
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

/* ===== Init  ===== */
document.addEventListener('DOMContentLoaded', () => {
  renderSpecialties(SPECIALTIES);
});


/* ===== Init 2 phần mới ===== */
document.addEventListener('DOMContentLoaded', ()=>{
  renderClinics(CLINICS);
  setupRail('clinicRail','clinicProgress');

  renderSpecialties(SPECIALTIES);
});
document.addEventListener('DOMContentLoaded', function () {
  const loadMoreButton = document.createElement('button');
  loadMoreButton.textContent = 'Xem thêm';
  loadMoreButton.style.marginTop = '20px';
  loadMoreButton.style.padding = '10px 20px';
  loadMoreButton.style.fontSize = '16px';
  loadMoreButton.style.cursor = 'pointer';
  loadMoreButton.style.backgroundColor = '#1f5fd9';
  loadMoreButton.style.color = 'white';
  loadMoreButton.style.border = 'none';
  loadMoreButton.style.borderRadius = '5px';

  document.querySelector('.news-container').appendChild(loadMoreButton);

  loadMoreButton.addEventListener('click', function () {
    alert('Load more articles...');
    // Implement loading more articles here dynamically
  });
});
// ====== SELECTORS ======
const clinicSelection = document.getElementById("clinicSelection");
const appointmentSelection = document.getElementById("appointmentSelection");
const appointmentDate = document.getElementById("appointmentDate");
const timeSelect = document.getElementById("timeSelect");
const bookBtn = document.getElementById("bookBtn");

let selectedClinic = null;

// ====== DATA PHÒNG KHÁM (giữ như cũ, có thể đổi ảnh/tên) ======
const clinics = [
  { id: 1, name: "Phòng khám Nha Khoa Sài Gòn ", img: "/static/img/phong-kham/nha-khoa-sg.jpg" },
  { id: 2, name: "Phòng khám đa khoa Loukas ", img: "/static/img/phong-kham/phong-kham-da-khoa-loukas.webp" },
  { id: 3, name: "Phòng khám Khang Thịnh ", img: "/static/img/phong-kham/thiet-ke-phong-kham-nha-khoa-khang-thinh-8.webp" },
  { id: 4, name: "Phòng khám Tâm Đức", img: "/static/img/phong-kham/thiet-ke-phong-kham-nha-khoa-tam-duc-3.webp" },
  { id: 5, name: "Phòng khám Tâm Anh ", img: "/static/img/phong-kham/tieu-chi-lua-chon-phong-kham-da-khoa.webp" },
];

// ====== RENDER LIST (layout card như ảnh 2) ======
function renderClinics() {
  clinicSelection.innerHTML = "";
  clinics.forEach(c => {
    const card = document.createElement("article");
    card.className = "clinic-card";
    card.setAttribute("tabindex", "0"); // hỗ trợ keyboard

    // markup card: ảnh lớn + tên + nút
    card.innerHTML = `
      <div class="cc-media">
        <img src="${c.img}" alt="${c.name}">
      </div>
      <div class="cc-body">
        <h4>${c.name}</h4>
        <p class="cc-sub"></p>
        <div class="cc-actions">
          <button class="cc-btn" type="button">Đặt khám ngay</button>
        </div>
      </div>
    `;

    // chọn khi click card
    const choose = () => selectClinic(c.id, card);

    card.addEventListener("click", choose);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        choose();
      }
    });

    // nút "Đặt khám ngay" cũng chọn + cuộn xuống đặt lịch
    card.querySelector(".cc-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      choose();
      appointmentSelection?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    clinicSelection.appendChild(card);
  });
}

// ====== CHỌN PHÒNG KHÁM (giữ logic cũ, chỉ thêm cuộn mượt) ======
function selectClinic(id, element) {
  selectedClinic = clinics.find(c => c.id === id);

  // Xóa chọn các card khác
  document.querySelectorAll(".clinic-card").forEach(card => card.classList.remove("selected"));
  if (element) element.classList.add("selected");

  // Hiện phần đặt lịch
  appointmentSelection.style.display = "block";

  // Reset ngày giờ
  appointmentDate.value = "";
  timeSelect.innerHTML = `
    <option value="">Chọn giờ</option>
    <option value="08:00">08:00</option>
    <option value="09:00">09:00</option>
    <option value="10:00">10:00</option>
    <option value="14:00">14:00</option>
    <option value="15:00">15:00</option>
  `;

  // cuộn mượt tới phần đặt lịch (nếu click card)
  appointmentSelection.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ====== ĐẶT LỊCH (giữ nguyên) ======
bookBtn.addEventListener("click", () => {
  if (!selectedClinic) return alert("Vui lòng chọn phòng khám");
  if (!appointmentDate.value) return alert("Vui lòng chọn ngày");
  if (!timeSelect.value) return alert("Vui lòng chọn giờ");

  alert(
    `Đặt lịch thành công!\n` +
    `Phòng khám: ${selectedClinic.name}\n` +
    `Ngày: ${appointmentDate.value}\n` +
    `Giờ: ${timeSelect.value}`
  );
});
/// JS cho phần tin tức (ổn định, khớp .news-card)
document.addEventListener("DOMContentLoaded", () => {
  // === Tùy chọn: mở ở tab mới hay tab hiện tại ===
  const OPEN_IN_NEW_TAB = true; // đổi false nếu muốn mở cùng tab

  // Hỗ trợ cả class mới (.news-card) lẫn class cũ (.news-main/.news-item)
  const cards = document.querySelectorAll(".news-card, .news-main, .news-item");

  // Nếu dùng .news-card, set con trỏ pointer
  cards.forEach(el => (el.style.cursor = "pointer"));

  const isAnchor = (el) => !!(el && (el.tagName === "A" || el.closest("a")));

  // Event delegation cho toàn trang (ổn định hơn)
  document.addEventListener("click", (e) => {
    const card = e.target.closest(".news-card, .news-main, .news-item");
    if (!card) return;

    // Nếu click vào link con thì để mặc định
    if (isAnchor(e.target)) return;

    const url = card.getAttribute("data-url");
    if (!url) return;

    // Ctrl/Cmd-click mở tab mới
    const openInNewTab = e.metaKey || e.ctrlKey || OPEN_IN_NEW_TAB;
    if (openInNewTab) {
      window.open(url, "_blank", "noopener");
    } else {
      window.location.href = url;
    }
  });

  // Middle click mở tab mới
  document.addEventListener("auxclick", (e) => {
    if (e.button !== 1) return;
    const card = e.target.closest(".news-card, .news-main, .news-item");
    if (!card) return;
    const url = card.getAttribute("data-url");
    if (!url) return;
    e.preventDefault();
    window.open(url, "_blank", "noopener");
  });

  // Hỗ trợ bàn phím (Enter/Space)
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

  // Lazy load ảnh
  document
    .querySelectorAll(".news-card__img, .news-main__image, .news-item__image")
    .forEach((img) => img.setAttribute("loading", "lazy"));
});

// ❗️GỠ dòng dưới nếu trước đây có (gây lỗi khi không có hàm):
// renderClinics();

// THONG TIN LIEN HE 
document.querySelectorAll(".cb-right .qr-code img").forEach(img=>{
  img.addEventListener("mouseenter", ()=> img.style.transform="scale(1.1)");
  img.addEventListener("mouseleave", ()=> img.style.transform="scale(1)");
});
