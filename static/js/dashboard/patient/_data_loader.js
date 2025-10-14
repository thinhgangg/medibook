// static/js/patient/_data_loader.js

import {
    API_BASE_URL,
    fetchWithAuth,
    setAllAppointments,
    setAllDoctors,
    setDoctorsMap,
    allAppointments,
    doctorsMap,
    setMockNotifications,
    mockNotifications,
    allDoctors,
    setPatientProfile, // Import setter mới
} from "./_config.js";

import {
    renderPatientProfile,
    renderOverviewAppointments,
    renderOverviewStats,
    renderAllAppointments,
    generateMockNotifications,
    renderNotifications,
} from "./patient-dashboard.js";

/* -------------------------
    API Data Fetchers
   ------------------------- */

// Hàm cập nhật hồ sơ (đã đúng, giữ nguyên)
// Nó sẽ gửi dữ liệu đến /accounts/me/
export async function updatePatientProfile(payload) {
    try {
        const res = await fetchWithAuth(`${API_BASE_URL}/accounts/me/`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            const errorMessage = Object.values(errorData).flat().join('\n');
            throw new Error(errorMessage || `Lỗi cập nhật hồ sơ: ${res.status}`);
        }

        // Sau khi cập nhật thành công, gọi hàm fetchPatientProfile để tải lại dữ liệu mới
        await fetchPatientProfile();
    } catch (err) {
        console.error("updatePatientProfile error:", err);
        throw err;
    }
}


// *** SỬA LỖI Ở ĐÂY ***
// Hàm này dùng để LẤY dữ liệu hồ sơ, phải gọi đến API /patients/me/
export async function fetchPatientProfile() {
    try {
        // Đổi URL ở dòng dưới đây từ /accounts/me/ thành /patients/me/
        const res = await fetchWithAuth(`${API_BASE_URL}/patients/me/`);
        if (!res.ok) throw new Error(`HTTP ${res.status}: Không thể lấy hồ sơ bệnh nhân`);
        const data = await res.json();
        setPatientProfile(data); // Lưu profile vào biến toàn cục
        renderPatientProfile(data); // Hiển thị dữ liệu ra giao diện
    } catch (err) {
        console.error("Profile fetch error:", err);
        document.getElementById("profile-error")?.classList.remove("hidden");
        document.getElementById("profile-error").innerHTML = `<p>Lỗi khi tải hồ sơ: ${err.message}</p>`;
        document.getElementById("profile-error-overview")?.classList.remove("hidden");
        document.getElementById("profile-error-overview").innerHTML = `<p>Lỗi khi tải hồ sơ: ${err.message}</p>`;
        document.getElementById("profile-summary").classList.remove("skeleton-bars");
        document.getElementById("profile-summary").innerHTML = `<div class="no-data">Không thể tải thông tin hồ sơ.</div>`;
    }
}


export async function fetchAppointmentsAndDoctors(forPanel = false) {
    const aptLoading = document.getElementById(forPanel ? "all-appointments-loading" : "appointments-loading");
    const aptContent = document.getElementById(forPanel ? "all-appointments-content" : "appointments-content");
    const aptError = document.getElementById(forPanel ? "all-appointments-error" : "appointments-error");

    if (aptLoading) aptLoading.classList.remove("hidden");
    if (aptContent) aptContent.classList.add("hidden");
    if (aptError) aptError.classList.add("hidden");

    if (!forPanel) {
        const statsOverview = document.getElementById("stats-overview");
        if (statsOverview) {
            statsOverview.innerHTML = `<div class="bar w-75 shimmer"></div><div class="bar w-60 shimmer"></div>`;
        }
    }

    if (!forPanel && allAppointments.length > 0 && Object.keys(doctorsMap).length > 0) {
        renderOverviewAppointments(allAppointments);
        renderOverviewStats();
        return;
    }

    try {
        const appointmentsPromise = fetchWithAuth(`${API_BASE_URL}/appointments/`);
        const doctorsPromise = Object.keys(doctorsMap).length === 0 ? fetchWithAuth(`${API_BASE_URL}/doctors/`) : Promise.resolve(null);
        
        const [appointmentsRes, doctorsRes] = await Promise.all([appointmentsPromise, doctorsPromise]);

        if (!appointmentsRes.ok) throw new Error(`HTTP ${appointmentsRes.status}: Không thể lấy lịch hẹn`);
        let appointmentsData = await appointmentsRes.json();
        setAllAppointments(Array.isArray(appointmentsData.results) ? appointmentsData.results : appointmentsData);

        if (doctorsRes) {
            if (!doctorsRes.ok) throw new Error(`HTTP ${doctorsRes.status}: Không thể lấy danh sách bác sĩ`);
            const doctorsData = await doctorsRes.json();
            setAllDoctors(doctorsData.results || doctorsData);
            setDoctorsMap(
                allDoctors.reduce((map, doc) => {
                    map[doc.id] = doc;
                    return map;
                }, {})
            );
        }

        if (forPanel) {
            renderAllAppointments(allAppointments);
        } else {
            renderOverviewAppointments(allAppointments);
            renderOverviewStats();
        }
    } catch (err) {
        console.error("Appointments/Doctors fetch error:", err);
        if (aptLoading) aptLoading.classList.add("hidden");
        if (aptError) {
            aptError.classList.remove("hidden");
            aptError.innerHTML = `<p>Lỗi tải lịch hẹn: ${err.message}</p>`;
        }
        const statsErr = document.getElementById("stats-error-overview");
        if (statsErr) {
            statsErr.classList.remove("hidden");
            statsErr.innerHTML = `<p>Lỗi tải thống kê: ${err.message}</p>`;
        }
    }
}

export function loadNotificationsData() {
    if (mockNotifications.length === 0) generateMockNotifications();
}