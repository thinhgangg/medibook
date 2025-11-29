// static/js/patient/_data_loader.js

import {
    API_BASE_URL,
    fetchWithAuth,
    setAllAppointments,
    setAllDoctors,
    setDoctorsMap,
    allAppointments,
    doctorsMap,
    showToast,
    setMockNotifications,
    mockNotifications,
    allDoctors,
} from "./_config.js";

import {
    renderPatientProfile,
    renderOverviewAppointments,
    renderOverviewStats,
    renderAllAppointments,
    generateMockNotifications,
    renderNotifications,
} from "./patient-dashboard.js"; 

export async function fetchPatientProfile() {
    try {
        const res = await fetchWithAuth(`${API_BASE_URL}/patients/me/`);
        if (!res.ok) throw new Error(`HTTP ${res.status}: Không thể lấy hồ sơ bệnh nhân`);
        const data = await res.json();
        renderPatientProfile(data);
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

    aptLoading.classList.remove("hidden");
    aptContent.classList.add("hidden");
    aptError.classList.add("hidden");

    if (!forPanel) {
        const statsOverview = document.getElementById("stats-overview");
        if (statsOverview) {
            statsOverview.innerHTML = `
                <div class="bar w-75 shimmer"></div>
                <div class="bar w-60 shimmer"></div>
            `;
        }
    }

    // Only load if we don't have enough data, or we are explicitly asking for a panel refresh
    if (!forPanel && allAppointments.length > 0 && Object.keys(doctorsMap).length > 0) {
        renderOverviewAppointments(allAppointments);
        renderOverviewStats();
        return;
    }

    try {
        const requests = [fetchWithAuth(`${API_BASE_URL}/appointments/`)];
        if (Object.keys(doctorsMap).length === 0) {
            requests.push(fetchWithAuth(`${API_BASE_URL}/doctors/`));
        }
        const responses = await Promise.all(requests);

        const appointmentsRes = responses[0];
        if (!appointmentsRes.ok) throw new Error(`HTTP ${appointmentsRes.status}: Không thể lấy lịch hẹn`);
        setAllAppointments(await appointmentsRes.json());
        if (Array.isArray(allAppointments.results)) setAllAppointments(allAppointments.results);

        if (responses[1]) {
            const doctorsRes = responses[1];
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
            const statusFilter = document.getElementById("status-filter")?.value || "all";
            const startDate = document.getElementById("start-date-filter")?.value || null;
            const endDate = document.getElementById("end-date-filter")?.value || null;
            renderAllAppointments(allAppointments, statusFilter, startDate, endDate);
        } else {
            renderOverviewAppointments(allAppointments);
            renderOverviewStats();
        }
    } catch (err) {
        console.error("Appointments/Doctors fetch error:", err);
        aptLoading.classList.add("hidden");
        aptError.classList.remove("hidden");
        aptError.innerHTML = `<p>Lỗi tải lịch hẹn: ${err.message}</p>`;

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
