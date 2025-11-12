const pathParts = window.location.pathname.split("/");
const slug = pathParts[pathParts.length - 2];
const doctorProfile = document.getElementById("doc-profile");
const ctaBtn = document.getElementById("cta-booking");

async function fetchDoctorProfile() {
    try {
        const res = await fetch(`/api/doctors/${slug}/`);
        if (!res.ok) throw new Error("Không lấy được dữ liệu bác sĩ");
        const data = await res.json();
        renderDoctorProfile(data);
        enableAvatarPopup();
    } catch (error) {
        console.error(error);
        doctorProfile.innerHTML = "<p>Không thể tải thông tin bác sĩ.</p>";
    }
}

function formatTextWithBreaks(text) {
    return text ? text.replace(/\n/g, "<br>") : "";
}

function renderDoctorProfile(doctor) {
    document.title = `Bác sĩ ${doctor.user.full_name} - MediBook`;

    const genderMap = {
        MALE: "Nam",
        FEMALE: "Nữ",
    };
    const gender = genderMap[doctor.user.gender] || "Chưa cập nhật";
    const dobYear = doctor.user?.dob ? new Date(doctor.user.dob).getFullYear() : "Chưa cập nhật";
    const avgRating = doctor.average_rating ? `⭐ ${doctor.average_rating}` : "⭐ Chưa có đánh giá";
    const bioText = formatTextWithBreaks(doctor.bio) || "Bác sĩ chưa cập nhật tiểu sử";
    const expDetail = formatTextWithBreaks(doctor.experience_detail) || "Bác sĩ chưa cập nhật thông tin chi tiết về kinh nghiệm.";

    doctorProfile.innerHTML = `
        <nav class="ym-breadcrumb">
            <a href="/">Trang chủ</a>
            <span>/</span>
            <a href="/appointments/">Bác sĩ</a>
            <span>/</span>
            <span class="name">${doctor.user.full_name}</span>
        </nav>

        <div class="card doc-header">
            <div class="doc-avatar">
                <img src="${doctor.profile_picture || "/static/img/doctors/default.jpg"}" 
                     alt="${doctor.user.full_name}" />
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
                    <span><strong>Đánh giá:</strong></span><span class="rating"> ${avgRating}</span>
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
            <div id="slots">
                <p class="muted">Đang tải lịch khám...</p>
            </div>
        </div>

        <div class="card reviews">
            <h3 class="section-title">Đánh giá của bệnh nhân</h3>
            <div id="reviews">
                <p class="muted">Đang tải đánh giá...</p>
            </div>
        </div>
    `;

    if (ctaBtn) {
        ctaBtn.dataset.doctorSlug = doctor.slug;
    }

    fetchDoctorSlots(slug);
    fetchDoctorReviews(slug);
}

if (ctaBtn) {
    ctaBtn.addEventListener("click", function (event) {
        event.preventDefault();

        const doctorSlug = this.dataset.doctorSlug;
        if (isAuthenticated) {
            window.location.href = `/appointments/new/?doctor=${doctorSlug}`;
        } else {
            const nextUrl = encodeURIComponent(`/appointments/new/?doctor=${doctorSlug}`);
            window.location.href = `/accounts/login/?next=${nextUrl}`;
        }
    });
}

async function fetchDoctorSlots(slug) {
    const slotsContainer = document.getElementById("slots");
    try {
        const res = await fetch(`/api/doctors/${slug}/slots/`);
        const slots = res.ok ? await res.json() : [];
        if (slots.length > 0) {
            slotsContainer.innerHTML = slots.map((slot) => `<button class="slot">${slot}</button>`).join("");
        } else {
            slotsContainer.innerHTML = "<p class='muted'>Hiện chưa có lịch khám. Vui lòng quay lại sau.</p>";
        }
    } catch {
        slotsContainer.innerHTML = "<p class='muted'>Không thể tải lịch khám.</p>";
    }
}

async function fetchDoctorReviews(slug) {
    const reviewsContainer = document.getElementById("reviews");
    try {
        const res = await fetch(`/api/doctors/${slug}/reviews/`);
        const reviews = res.ok ? await res.json() : [];
        if (reviews.length > 0) {
            reviewsContainer.innerHTML = `
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
                        </li>
                    `
                        )
                        .join("")}
                </ul>
            `;
        } else {
            reviewsContainer.innerHTML = "<p class='muted'>Chưa có đánh giá nào.</p>";
        }
    } catch {
        reviewsContainer.innerHTML = "<p class='muted'>Không thể tải đánh giá.</p>";
    }
}

function enableAvatarPopup() {
    const avatar = document.querySelector(".doc-avatar img");
    const modal = document.getElementById("imgModal");
    const modalImg = document.getElementById("modalImg");
    const closeBtn = document.querySelector(".img-modal .close");

    if (avatar) {
        avatar.addEventListener("click", () => {
            modal.style.display = "flex";
            modalImg.src = avatar.src;
            modalImg.alt = avatar.alt;
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            modal.style.display = "none";
        });
    }

    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.style.display = "none";
        }
    });
}

fetchDoctorProfile();
