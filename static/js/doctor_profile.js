const pathParts = window.location.pathname.split("/").filter((p) => p);
let slug = pathParts[pathParts.length - 1];
if (!slug || slug === "") {
    slug = pathParts[pathParts.length - 2];
}

const doctorProfile = document.getElementById("doc-profile");
const ctaBtn = document.getElementById("cta-booking");
const isAuthenticated = window.isAuthenticated || false;

let dateList = null;
let slotGrid = null;
let state = { days: [], activeDateIndex: 0 };

const pad2 = (n) => String(n).padStart(2, "0");
const makeSlotLabel = (start, end) => {
    const s = new Date(start),
        e = new Date(end);
    return `${pad2(s.getHours())}:${pad2(s.getMinutes())}–${pad2(e.getHours())}:${pad2(e.getMinutes())}`;
};
const formatDateTitle = (dateString) => {
    const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dateString + "T00:00:00");
    date.setHours(0, 0, 0, 0);
    const day = pad2(date.getDate()),
        month = pad2(date.getMonth() + 1);
    const dayName = days[date.getDay()];
    return date.getTime() === today.getTime() ? { top: "Hôm nay", sub: `${day}/${month}` } : { top: dayName, sub: `${day}/${month}` };
};

async function fetchDoctorProfile() {
    try {
        if (!slug) throw new Error("Không tìm thấy bác sĩ");

        const res = await fetch(`/api/doctors/${slug}/`);
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Lỗi ${res.status}: ${text.substring(0, 100)}`);
        }
        const data = await res.json();
        renderDoctorProfile(data);
        enableAvatarPopup();
    } catch (error) {
        console.error(error);
        doctorProfile.innerHTML = `
            <div class="card" style="text-align:center; padding:40px; margin:40px auto; max-width:600px;">
                <h3>Không thể tải thông tin bác sĩ</h3>
                <p style="color:#dc2626; margin:16px 0;">${error.message}</p>
                <button onclick="window.location.reload()" class="btn btn-primary">
                    Thử lại
                </button>
            </div>
        `;
    }
}

function renderDoctorProfile(doctor) {
    document.title = `Bác sĩ ${doctor.user.full_name} - MediBook`;

    const genderMap = { MALE: "Nam", FEMALE: "Nữ" };
    const gender = genderMap[doctor.user.gender] || "Chưa cập nhật";
    const dobYear = doctor.user?.dob ? new Date(doctor.user.dob).getFullYear() : "Chưa cập nhật";
    const avgRating = doctor.average_rating ? `⭐ ${doctor.average_rating}` : "⭐ Chưa có đánh giá";
    const bioText = doctor.bio ? doctor.bio.replace(/\n/g, "<br>") : "Bác sĩ chưa cập nhật tiểu sử";
    const expDetail = doctor.experience_detail
        ? doctor.experience_detail.replace(/\n/g, "<br>")
        : "Bác sĩ chưa cập nhật thông tin chi tiết về kinh nghiệm.";

    doctorProfile.innerHTML = `
        <nav class="ym-breadcrumb">
            <a href="/">Trang chủ</a> <span>/</span>
            <a href="/appointments/">Bác sĩ</a> <span>/</span>
            <span class="name">${doctor.user.full_name}</span>
        </nav>

        <div class="card doc-header">
            <div class="doc-avatar">
                <img src="${doctor.profile_picture || "/static/img/doctors/default.jpg"}" alt="${doctor.user.full_name}" />
            </div>
            <div class="doc-meta">
                <h1 class="doc-name">BS. ${doctor.user.full_name}</h1>
                <div class="doc-row">
                    <span class="chip">Bác sĩ</span>
                    <span class="muted"><strong>${doctor.experience_years || 0}</strong> năm kinh nghiệm</span>
                </div>
                <div class="doc-row">
                    <span><strong>Giới tính:</strong> ${gender}</span>
                    <span><strong>Năm sinh:</strong> ${dobYear}</span>
                </div>
                <div class="doc-row">
                    <span><strong>Chuyên khoa:</strong> ${doctor.specialty?.name || "Chưa cập nhật"}</span>
                </div>
                <div class="doc-row">
                    <span><strong>Đánh giá:</strong> ${avgRating}</span>
                </div>
            </div>
        </div>

        <div class="card">
            <h3 class="section-title">Giới thiệu</h3>
            <p>${bioText}</p>
        </div>

        <div class="card">
            <h3 class="section-title">Kinh nghiệm</h3>
            <p>${expDetail}</p>
        </div>

        <div class="card">
            <h3 class="section-title">Thông tin liên hệ</h3>
            <p><strong>Điện thoại:</strong> ${doctor.user.phone_number || "Chưa cập nhật"}</p>
            <p><strong>Email:</strong> ${doctor.user.email || "Chưa cập nhật"}</p>
            <p><strong>Phòng khám:</strong> ${doctor.room_number || "Chưa cập nhật"}</p>
        </div>

        <div class="card quick">
            <h3 class="section-title">Đặt khám</h3>
            <div class="abk-schedule-section">
                <div class="abk-date-nav">
                    <div id="abkDateList" class="abk-date-list"></div>
                </div>
                <div class="abk-session-container">
                    <div id="abkSlotGrid" class="abk-slots"></div>
                </div>
            </div>
        </div>

        <div class="card reviews">
            <h3 class="section-title">Đánh giá của bệnh nhân</h3>
            <div id="reviews"><p class="muted">Đang tải đánh giá...</p></div>
        </div>
    `;

    dateList = document.getElementById("abkDateList");
    slotGrid = document.getElementById("abkSlotGrid");

    if (ctaBtn) ctaBtn.dataset.doctorSlug = doctor.slug;

    loadDoctorSlots(doctor.slug);
    fetchDoctorReviews(doctor.slug);

    attachScheduleEvents();
}

function attachScheduleEvents() {
    if (!dateList || !slotGrid) return;

    dateList.addEventListener("click", (e) => {
        const btn = e.target.closest(".abk-date-item");
        if (btn && !btn.classList.contains("full")) {
            state.activeDateIndex = parseInt(btn.dataset.index);
            renderDates();
            renderSlots();
        }
    });

    slotGrid.addEventListener("click", (e) => {
        const btn = e.target.closest(".abk-slot");
        if (btn && !btn.classList.contains("disabled")) {
            const start = btn.dataset.start;
            const end = btn.dataset.end;
            const doctorSlug = ctaBtn.dataset.doctorSlug;
            window.location.href = `/appointments/new/?doctor=${doctorSlug}&start_at=${encodeURIComponent(start)}&end_at=${encodeURIComponent(end)}`;
        }
    });
}

async function loadDoctorSlots(slug) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;
    const endObj = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const end = `${endObj.getFullYear()}-${pad2(endObj.getMonth() + 1)}-${pad2(endObj.getDate())}`;

    if (!dateList) return;

    try {
        dateList.innerHTML = `<p class="abk-empty">Đang tải lịch khám...</p>`;
        const res = await fetch(`/api/doctors/${slug}/slots/?start=${start}&end=${end}`);
        if (!res.ok) throw new Error();
        const data = await res.json();

        state.days = data
            .map((day) => ({
                id: day.date,
                slots: day.slots
                    .filter((s) => new Date(s.start_at) >= new Date())
                    .map((s) => ({
                        label: makeSlotLabel(s.start_at, s.end_at),
                        start_at: s.start_at,
                        end_at: s.end_at,
                        is_booked: s.is_booked,
                    })),
                formatted: formatDateTitle(day.date),
            }))
            .filter((d) => new Date(d.id + "T00:00:00") >= today);

        renderDates();
        if (state.days.length > 0) renderSlots();
    } catch {
        dateList.innerHTML = `<p class="abk-empty">Không thể tải lịch khám.</p>`;
    }
}

function renderDates() {
    if (!dateList) return;
    if (state.days.length === 0) {
        dateList.innerHTML = `<p class="abk-empty">Hiện chưa có lịch khám. Vui lòng quay lại sau.</p>`;
        return;
    }
    dateList.innerHTML = state.days
        .map(
            (day, i) => `
        <button type="button" class="abk-date-item ${i === state.activeDateIndex ? "active" : ""} ${
                day.slots.every((s) => s.is_booked) ? "full" : ""
            }"
            data-index="${i}">
            <div class="abk-date-top">${day.formatted.top}</div>
            <div class="abk-date-sub">${day.formatted.sub}</div>
        </button>
    `
        )
        .join("");
}

function renderSlots() {
    if (!slotGrid) return;
    const day = state.days[state.activeDateIndex];
    if (!day || day.slots.length === 0) {
        slotGrid.innerHTML = `<div class="abk-empty">Không có khung giờ phù hợp</div>`;
        return;
    }
    slotGrid.innerHTML = day.slots
        .map(
            (slot) => `
        <button type="button" class="abk-slot ${slot.is_booked ? "disabled" : ""}"
            data-start="${slot.start_at}" data-end="${slot.end_at}" ${slot.is_booked ? "disabled" : ""}>
            ${slot.label}
        </button>
    `
        )
        .join("");
}

if (ctaBtn) {
    ctaBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const next = `/appointments/new/?doctor=${ctaBtn.dataset.doctorSlug}`;
        if (isAuthenticated) {
            window.location.href = next;
        } else {
            window.location.href = `/accounts/login/?next=${encodeURIComponent(next)}`;
        }
    });
}

async function fetchDoctorReviews(slug) {
    const container = document.getElementById("reviews");
    if (!container) return;
    try {
        const res = await fetch(`/api/doctors/${slug}/reviews/`);
        let reviews = res.ok ? await res.json() : [];
        reviews = reviews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const topReviews = reviews.slice(0, 3);
        container.innerHTML =
            topReviews.length > 0
                ? `
            <ul class="review-list">
                ${topReviews
                    .map(
                        (r) => `
                        <li class="review-item">
                            <div class="review-header"><strong>${r.patient_name}</strong> <span class="rating">⭐ ${r.stars}</span></div>
                            <p>${r.comment || ""}</p>
                            <span class="muted">${new Date(r.created_at).toLocaleDateString("vi-VN")}</span>
                        </li>`
                    )
                    .join("")}
            </ul>

            ${
                reviews.length > 3
                    ? `<div class="reviews-footer">
                        <button id="viewMoreReviews" class="btn btn-secondary btn-small">Xem thêm (${reviews.length - 3})</button>
                        </div>`
                    : ""
            }
        `
                : `<p class="muted">Chưa có đánh giá nào.</p>`;
        if (reviews.length > 3) {
            document.getElementById("viewMoreReviews").onclick = () => showAllReviews(reviews);
        }
    } catch {
        container.innerHTML = `<p class="muted">Không thể tải đánh giá.</p>`;
    }
}

function enableAvatarPopup() {
    const avatar = document.querySelector(".doc-avatar img");
    const modal = document.getElementById("imgModal");
    const modalImg = document.getElementById("modalImg");
    const closeBtn = document.querySelector(".img-modal .close");

    if (avatar)
        avatar.onclick = () => {
            modal.style.display = "flex";
            modalImg.src = avatar.src;
        };
    if (closeBtn) closeBtn.onclick = () => (modal.style.display = "none");
    if (modal)
        modal.onclick = (e) => {
            if (e.target === modal) modal.style.display = "none";
        };
}

function showAllReviews(reviews) {
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.style.display = "flex";

    modal.innerHTML = `
        <div class="modal-content review-modal">
            <div class="modal-header">
                <h2>Tất cả đánh giá</h2>
                <span class="modal-close-btn">✕</span>
            </div>

            <div class="modal-body">
                <ul class="review-list">
                    ${reviews
                        .map(
                            (r) => `
                    <li class="review-item">
                        <div class="review-header">
                            <strong>${r.patient_name}</strong>
                            <span class="rating">⭐ ${r.stars}</span>
                        </div>
                        <p>${r.comment || ""}</p>
                        <span class="muted">${new Date(r.created_at).toLocaleDateString("vi-VN")}</span>
                    </li>`
                        )
                        .join("")}
                </ul>
            </div>

            <div class="modal-footer">
                <button class="btn btn-close" id="closeReviewModal">Đóng</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector(".modal-close-btn").onclick = () => modal.remove();
    document.getElementById("closeReviewModal").onclick = () => modal.remove();

    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
}

fetchDoctorProfile();
