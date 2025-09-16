const pathParts = window.location.pathname.split("/");
const slug = pathParts[pathParts.length - 2];
const doctorProfile = document.getElementById("doc-profile");

async function fetchDoctorProfile() {
    try {
        const res = await fetch(`/api/doctors/${slug}/`);
        if (!res.ok) throw new Error("Không lấy được dữ liệu bác sĩ");
        const data = await res.json();
        renderDoctorProfile(data);
    } catch (error) {
        console.error(error);
        doctorProfile.innerHTML = "<p>Không thể tải thông tin bác sĩ.</p>";
    }
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
    const expDetail = doctor.experience_detail
        ? doctor.experience_detail.replace(/\n/g, "<br>")
        : "Bác sĩ chưa cập nhật thông tin chi tiết về kinh nghiệm.";

    doctorProfile.innerHTML = `
        <nav class="ym-breadcrumb">
            <a href="/">Trang chủ</a>
            <span>/</span>
            <a href="/appointments/">Bác sĩ</a>
            <span>/</span>
            <span class="name">${doctor.user.full_name}</span>
        </nav>

        <!-- Header bác sĩ -->
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
                    <span class="rating">${avgRating}</span>
                </div>
            </div>
        </div>

        <!-- Giới thiệu -->
        <div class="card">
            <h3 class="section-title">Giới thiệu</h3>
            <p>${doctor.bio || "Bác sĩ chưa cập nhật tiểu sử"}</p>
        </div>

        <!-- Kinh nghiệm chi tiết -->
        <div class="card">
            <h3 class="section-title">Kinh nghiệm</h3>
            <p>${expDetail}</p>
        </div>

        <!-- Liên hệ -->
        <div class="card">
            <h3 class="section-title">Thông tin liên hệ</h3>
            <p><strong>Điện thoại:</strong> ${doctor.user.phone_number || "Chưa cập nhật"}</p>
            <p><strong>Email:</strong> ${doctor.user.email || "Chưa cập nhật"}</p>
        </div>

        <!-- Đặt khám -->
        <div class="card quick">
            <h3 class="section-title">Đặt khám</h3>
            <div id="slots">
                <p class="muted">Đang tải lịch khám...</p>
            </div>
        </div>

        <!-- Đánh giá -->
        <div class="card reviews">
            <h3 class="section-title">Đánh giá của bệnh nhân</h3>
            <div id="reviews">
                <p class="muted">Đang tải đánh giá...</p>
            </div>
        </div>
    `;

    fetchDoctorSlots(slug);
    fetchDoctorReviews(slug);
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

fetchDoctorProfile();
