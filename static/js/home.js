// ===== Fetch doctors from API =====
async function fetchDoctors() {
    try {
        const res = await fetch("http://127.0.0.1:8000/api/doctors/");
        if (!res.ok) throw new Error("Failed to fetch doctors");
        const data = await res.json();
        return data.results.slice(0, 10);
    } catch (err) {
        console.error("Error fetching doctors:", err);
        doctorList.innerHTML = "<p>Không thể tải danh sách bác sĩ.</p>";
        return [];
    }
}

// ===== Render doctors =====
function renderDoctors(doctors) {
    const rail = document.getElementById("doctorRail");
    if (!rail) return;

    rail.innerHTML = doctors
        .map((d) => {
            const specialties = d.specialty ? [d.specialty.name] : ["Chưa xác định"];
            const tags = specialties.map((t) => `<span class="dm-tag">${t}</span>`).join("");
            const fullName = d.user.full_name || "Bác sĩ chưa cập nhật";
            const avatarUrl = d.profile_picture || "/static/img/doctors/default-avatar.jpg";
            const title = d.user.role === "DOCTOR" ? "BS." : "";

            return `
      <article class="dm-card" role="option" tabindex="0" data-doctor-id="${d.id}">
        <div class="dm-card__avatar">
          <img src="${avatarUrl}" alt="Ảnh của ${fullName}" />
        </div>
        <h3 class="dm-card__name">${title} ${fullName}</h3>
        <div class="dm-card__tags">${tags}</div>
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

// ===== Generic rail controls (dùng cho doctor) =====
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

// ===== Fetch specialties from API =====
async function fetchSpecialties() {
    try {
        const response = await fetch("http://127.0.0.1:8000/api/specialties/", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) throw new Error("Failed to fetch specialties");
        return await response.json();
    } catch (error) {
        console.error("Error fetching specialties:", error);
        return [];
    }
}

function renderSpecialties(list) {
    const ul = document.getElementById("specList");
    if (!ul) return;

    ul.innerHTML = list
        .map(
            (s) => `
        <li class="spec-item">
          <a href="#" class="spec-link" data-spec="${s.id}" aria-label="${s.name}">
            <div class="spec-thumb">
              <img src="${s.specialty_picture}" alt="${s.name}">
            </div>
            <div class="spec-name">${s.name}</div>
          </a>
        </li>
      `
        )
        .join("");

    ul.querySelectorAll("[data-spec]").forEach((a) => {
        a.addEventListener("click", (e) => {
            e.preventDefault();
            alert("(Demo) Chuyên khoa ID: " + a.dataset.spec);
        });
    });

    const toggleBtn = document.getElementById("toggleSpecsBtn");
    const specsMore = document.querySelector(".specs__more");

    if (list.length > 6) {
        ul.classList.add("collapsed");
        specsMore.style.display = "block";
        toggleBtn.textContent = "Xem thêm";

        toggleBtn.onclick = () => {
            ul.classList.toggle("collapsed");
            toggleBtn.textContent = ul.classList.contains("collapsed") ? "Xem thêm" : "Thu gọn";
        };
    } else {
        ul.classList.remove("collapsed");
        specsMore.style.display = "none";
    }
}

/* ===== Init ===== */
document.addEventListener("DOMContentLoaded", async () => {
    const doctors = await fetchDoctors();
    renderDoctors(doctors);
    setupRail("doctorRail", "doctorProgress");

    const specialties = await fetchSpecialties();
    renderSpecialties(specialties);
});
