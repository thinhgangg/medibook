const pathParts = window.location.pathname.split("/");
const slug = pathParts[pathParts.length - 2];

const doctorDetail = document.getElementById("doctor-detail");

async function fetchDoctorDetail() {
    try {
        const res = await fetch(`/api/doctors/${slug}/`);
        if (!res.ok) throw new Error("Không lấy được dữ liệu bác sĩ");
        const doctor = await res.json();
        renderDoctorDetail(doctor);
    } catch (error) {
        console.error(error);
        doctorDetail.innerHTML = "<p>Không thể tải thông tin bác sĩ.</p>";
    }
}

function renderDoctorDetail(doctor) {
    doctorDetail.innerHTML = `
        <div class="doctor-profile">
            <img src="${doctor.profile_picture}" alt="${doctor.user.full_name}" class="doctor-avatar-lg" />
            <div class="doctor-info">
                <h2>${doctor.user.full_name}</h2>
                <p><strong>Chuyên khoa:</strong> ${doctor.specialty?.name || "Chưa cập nhật"}</p>
                <p><strong>Kinh nghiệm:</strong> ${doctor.experience_years} năm</p>
                <p><strong>Địa chỉ:</strong> ${doctor.user.full_address || "Chưa cập nhật"}</p>
                <p><strong>Tiểu sử:</strong> ${doctor.bio || "Chưa có thông tin"}</p>
            </div>
        </div>
        <div class="doctor-actions">
            <a href="/appointments/new/?doctor=${doctor.slug}" class="book-btn">
                <i class="fas fa-calendar-plus"></i> Đặt lịch khám
            </a>
        </div>
    `;
}

fetchDoctorDetail();
