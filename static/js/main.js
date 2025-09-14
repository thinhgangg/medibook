document.addEventListener("DOMContentLoaded", function () {
    // ready
});

/* ====== HERO search ====== */
const form = document.getElementById("searchForm");
const input = document.getElementById("searchInput");
if (form && input) {
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const q = input.value.trim();
        if (!q) {
            input.focus();
            return;
        }
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
        avatar_url: "/static/img/doctors/doctor1.jpg",
    },
    {
        id: 2,
        initials: "LVT",
        title: "PGS. TS.",
        full_name: "Lâm Việt Trung",
        specialties: ["Tiêu hoá", "Ngoại tiết niệu"],
        hospital: "Bệnh viện Chợ Rẫy",
        avatar_url: "/static/img/doctors/doctor2.webp",
    },
    {
        id: 3,
        initials: "NTH",
        title: "BS.",
        full_name: "Nguyễn Thị Thu Hà",
        specialties: ["Nhi khoa"],
        hospital: "BV Nhi Đồng TP.HCM",
        avatar_url: "/static/img/doctors/doctor3.webp",
    },
    {
        id: 4,
        initials: "VDH",
        title: "BS. CK2",
        full_name: "Võ Đức Hiếu",
        specialties: ["Ung bướu"],
        hospital: "BV Ung Bướu TP.HCM",
        avatar_url: "/static/img/doctors/doctor4.webp",
    },
    {
        id: 5,
        initials: "LMH",
        title: "BS. CK2",
        full_name: "Lê Thị Minh Hồng",
        specialties: ["Nhi khoa"],
        hospital: "Bệnh viện Nhi Đồng 2",
        avatar_url: "/static/img/doctors/doctor1.jpg",
    },
];

/* ===== Render doctors ===== */
function renderDoctors(list) {
    const rail = document.getElementById("doctorRail");
    if (!rail) return;

    rail.innerHTML = list
        .map((d) => {
            const tags = (d.specialties || []).map((t) => `<span class="dm-tag">${t}</span>`).join("");
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
        })
        .join("");

    rail.querySelectorAll("[data-book]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
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
    prev?.addEventListener("click", () => rail.scrollBy({ left: -step(), behavior: "smooth" }));
    next?.addEventListener("click", () => rail.scrollBy({ left: step(), behavior: "smooth" }));
    rail.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    update();

    // drag to scroll
    let down = false,
        sx = 0,
        sl = 0;
    rail.addEventListener("pointerdown", (e) => {
        down = true;
        sx = e.clientX;
        sl = rail.scrollLeft;
        rail.setPointerCapture(e.pointerId);
    });
    rail.addEventListener("pointermove", (e) => {
        if (!down) return;
        rail.scrollLeft = sl - (e.clientX - sx);
    });
    rail.addEventListener("pointerup", () => (down = false));
    rail.addEventListener("pointercancel", () => (down = false));

    // vertical wheel -> horizontal
    rail.addEventListener(
        "wheel",
        (e) => {
            if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
                rail.scrollLeft += e.deltaY;
                e.preventDefault();
            }
        },
        { passive: false }
    );
}

/* ===== Specialties ===== */
const SPECIALTIES = [
    { id: "yhct", name: "Y học cổ truyền", icon: "/static/img/specs/yhct-logo.webp" },
    { id: "truyen", name: "Truyền nhiễm", icon: "/static/img/specs/tn-logo.webp" },
    { id: "tim", name: "Tim mạch", icon: "/static/img/specs/tim-mach.webp" },
    { id: "lao", name: "Lão khoa", icon: "/static/img/specs/laokhoa-nobg.png" },
    { id: "chan", name: "Chấn thương chỉnh hình", icon: "/static/img/specs/chanthuong-nobg.png" },
    { id: "hoisuc", name: "Hồi sức - cấp cứu", icon: "/static/img/specs/hsuc-nobg.png" },
];

function renderSpecialties(list) {
    const ul = document.getElementById("specList");
    if (!ul) return;
    ul.innerHTML = list
        .map(
            (s) => `
    <li class="spec-item">
      <a href="#" class="spec-link" data-spec="${s.id}" aria-label="${s.name}">
        <div class="spec-thumb">${s.icon ? `<img src="${s.icon}" alt="${s.name}">` : ""}</div>
        <div class="spec-name">${s.name}</div>
      </a>
    </li>
  `
        )
        .join("");

    ul.querySelectorAll("[data-spec]").forEach((a) => {
        a.addEventListener("click", (e) => {
            e.preventDefault();
            alert("(Demo) Chuyên khoa: " + a.dataset.spec);
        });
    });
}

/* ===== Init ===== */
document.addEventListener("DOMContentLoaded", () => {
    renderDoctors(DOCTORS);
    setupRail("doctorRail", "doctorProgress");
    renderSpecialties(SPECIALTIES);
});
