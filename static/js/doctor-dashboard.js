document.addEventListener('DOMContentLoaded', () => {

    const BASE_URL = 'http://127.0.0.1:8000/api';

    const cancelModal = document.getElementById('cancelModal');
    const cancelConfirmBtn = document.getElementById('cancelConfirmBtn');
    const cancelCloseBtn = document.getElementById('cancelCloseBtn');
    const errorModal = document.getElementById('errorModal');
    const errorModalMessage = document.getElementById('errorModalMessage');
    const errorModalCloseBtn = document.getElementById('errorModalCloseBtn');

    let currentAppointmentIdToCancel = null;

    function showModal(modalElement) {
        modalElement.style.display = 'flex';
        modalElement.setAttribute('aria-hidden', 'false');
    }

    function hideModal(modalElement) {
        modalElement.style.display = 'none';
        modalElement.setAttribute('aria-hidden', 'true');
    }

    function showCustomError(message) {
        errorModalMessage.textContent = message;
        showModal(errorModal);
    }

    errorModalCloseBtn.onclick = () => hideModal(errorModal);
    cancelCloseBtn.onclick = () => hideModal(cancelModal);

    async function fetchAPI(endpoint, options = {}) {
        const token = localStorage.getItem('access');
        if (!token) {
            console.error('No access token found.');
            throw new Error('Access token not found. Please log in again.');
        }
        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers };
        const finalOptions = { method: 'GET', ...options, headers }; 
        
        const response = await fetch(`${BASE_URL}${endpoint}`, finalOptions);
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`HTTP Error: 404 Not Found for endpoint: ${endpoint}`);
            }
            const errorData = await response.json().catch(() => ({ detail: `HTTP Error: ${response.status}` }));
            console.error(`API Error on ${endpoint}:`, errorData);
            throw new Error(errorData.detail || 'Failed to fetch data');
        }
        return response.status === 204 ? null : response.json();
    }

    const api = {
        
        getProfile: () => fetchAPI('/doctors/me/'),
        getAppointments: (year, month) => fetchAPI(`/appointments/?year=${year}&month=${month}`),
        getPatients: (search = '') => fetchAPI(`/patients/?search=${search}`),
        getDaysOff: () => fetchAPI('/doctors/days-off/'),
        
        getOverview: async () => {
            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth() + 1;

            const [profileData, appointmentsData] = await Promise.all([
                api.getProfile(), 
                api.getAppointments(year, month), 
            ]);

            const doctorName = profileData.user.full_name ?? 'Bác sĩ';
            const upcomingAppointments = appointmentsData
                .filter(app => new Date(app.date).getTime() >= today.setHours(0, 0, 0, 0)) 
                .sort((a, b) => new Date(a.date).getTime() + a.time.localeCompare(b.time))
                .slice(0, 5); 

            return {
                doctor_name: doctorName,
                profile_summary: {
                    specialty: profileData.specialty?.name ?? 'Chưa cập nhật',
                    phone: profileData.user.phone_number ?? 'N/A',
                    email: profileData.user.email ?? 'N/A',
                },
                upcoming_appointments: upcomingAppointments,
                recent_patients: [], 
                unread_messages_preview: []
            };
        },
        
        updateProfile: (profileData) => fetchAPI('/accounts/me/', {
            method: 'PATCH',
            body: JSON.stringify(profileData)
        }),
        addAvailability: (scheduleData) => fetchAPI('/doctors/availability/', {
            method: 'POST',
            body: JSON.stringify(scheduleData)
        }),
        addDayOff: (dayOffData) => fetchAPI('/doctors/days-off/', {
            method: 'POST',
            body: JSON.stringify(dayOffData)
        }),
        
        confirmAppointment: (id) => fetchAPI(`/appointments/${id}/confirm/`, { method: 'POST' }),
        completeAppointment: (id) => fetchAPI(`/appointments/${id}/complete/`, { method: 'POST' }),
        cancelAppointment: (id) => fetchAPI(`/appointments/${id}/cancel/`, { method: 'POST' })
    };
    
    const render = {
        overview: (data) => {
            const panel = document.getElementById('panel-overview');
            panel.innerHTML = `<div class="card">
                <h1>Xin chào, Bác sĩ ${data.doctor_name}</h1>
                <div class="card-section">
                    <div class="section-header">
                        <h2>Lịch hẹn sắp tới</h2>
                        <a href="#appointments" class="btn-primary btn-small">Xem tất cả</a>
                    </div>
                    <div class="table">
                        <div class="row header">
                            <div>Ngày</div>
                            <div>Giờ</div>
                            <div>Bệnh nhân</div>
                            <div>Trạng thái</div>
                        </div>
                        <div id="appointments-content-overview">
                            ${data.upcoming_appointments.length > 0 ? data.upcoming_appointments.map(app => 
                                `<div class="row">
                                    <div>${new Date(app.date).toLocaleDateString('vi-VN')}</div>
                                    <div>${app.time.slice(0, 5)}</div>
                                    <div>${app.patient.full_name}</div>
                                    <div><span class="status status-${app.status.toLowerCase()}">${app.status}</span></div>
                                </div>`).join('') : '<div class="no-data">Không có lịch hẹn sắp tới.</div>'}
                        </div>
                    </div>
                </div>
                <div class="card-section">
                    <h2>Thông tin hồ sơ tóm tắt</h2>
                    <ul class="profile-summary-list">
                        <li><strong>Chuyên khoa:</strong> <span>${data.profile_summary.specialty}</span></li>
                        <li><strong>Điện thoại:</strong> <span>${data.profile_summary.phone}</span></li>
                        <li><strong>Email:</strong> <span>${data.profile_summary.email}</span></li>
                    </ul>
                    <a href="#profile" class="btn-secondary btn-small" style="margin-top: ${1}rem">Xem chi tiết</a>
                </div>
            </div>`;
        },
        
        profile: (data) => {
            const panel = document.getElementById('panel-profile');
            const user = data.user || {};
            const specialty = data.specialty || {};
            
            panel.innerHTML = `<div class="card">
                <div class="profile-header">
                    <div class="profile-pic">
                        <img src="${data.profile_picture || 'https://i.pravatar.cc/160'}" alt="Ảnh hồ sơ">
                    </div>
                    <div class="profile-info">
                        <h1 class="profile-name">${user.full_name ?? 'Tên bác sĩ'}</h1>
                        <p class="specialty-name">${specialty.name ?? 'Chưa cập nhật chuyên khoa'}</p>
                        <p class="description">${specialty.description ?? 'Bác sĩ chuyên khoa...'}</p>
                    </div>
                </div>

                <div class="profile-details">
                    <div>
                        <h2>Thông tin cơ bản</h2>
                        <ul>
                            <li><strong>Họ và tên:</strong> <span>${user.full_name ?? "Chưa có thông tin"}</span></li>
                            <li><strong>Ngày sinh:</strong> <span>${user.dob ? new Date(user.dob).toLocaleDateString('vi-VN') : "Chưa có thông tin"}</span></li>
                            <li><strong>Giới tính:</strong> <span>${user.gender ?? "Chưa có thông tin"}</span></li>
                            <li><strong>SĐT:</strong> <span>${user.phone_number ?? "Chưa có thông tin"}</span></li>
                            <li><strong>Địa chỉ:</strong> <span>${user.full_address ?? "Chưa có thông tin"}</span></li>
                        </ul>
                    </div>
                    <div>
                        <h2>Thông tin bổ sung</h2>
                        <ul>
                            <li><strong>Email:</strong> <span>${user.email ?? "Chưa có thông tin"}</span></li>
                            <li><strong>Số CMND/CCCD:</strong> <span>${user.id_number ?? "Chưa có thông tin"}</span></li>
                            <li><strong>Dân tộc:</strong> <span>${user.ethnicity ?? "Chưa có thông tin"}</span></li>
                            <li><strong>Tiểu sử:</strong> <span>${data.bio || "Chưa cập nhật tiểu sử"}</span></li>
                        </ul>
                    </div>
                    <div style="grid-column: 1 / -1; text-align: right; margin-top: ${1.5}rem;">
                         <button id="btn-edit-doctor" class="btn-primary">Chỉnh sửa hồ sơ</button>
                    </div>
                </div>
                <div id="edit-profile-form-container" class="card-section hidden">
                    <p>Chức năng chỉnh sửa đang được xây dựng...</p>
                </div>
            </div>`;
            
            document.getElementById('btn-edit-doctor')?.addEventListener('click', () => {
                 alert('Kích hoạt chế độ chỉnh sửa hồ sơ...');
            });
        },
        
        patients: (data) => {
            const panel = document.getElementById('panel-patients');
             panel.innerHTML = `<div class="card">
                <div class="section-header">
                    <h1>Danh sách Bệnh nhân</h1>
                    <button class="btn-primary btn-small" id="patient-search-btn">Tìm kiếm</button>
                </div>
                <input type="text" id="patient-search-input" placeholder="Tìm kiếm theo tên/SĐT..." style="padding: ${0.5}rem; margin-bottom: ${1}rem; width: 100%;">
                <div class="table">
                    <div class="row header">
                        <div>Họ tên</div>
                        <div>Ngày sinh</div>
                        <div>Liên hệ</div>
                        <div>Lần cuối khám</div>
                        <div>Thao tác</div>
                    </div>
                    <div class="table-body" id="patients-table-body">
                         ${data.results.length > 0 ? data.results.map(p => 
                            `<div class="row">
                                <div>${p.full_name}</div>
                                <div>${new Date(p.date_of_birth).toLocaleDateString('vi-VN')}</div>
                                <div>${p.contact}</div>
                                <div>${new Date(p.last_visit).toLocaleDateString('vi-VN')}</div>
                                <div><a href="#patient-detail/${p.id}" class="btn-secondary btn-small">Xem</a></div>
                            </div>`).join('') : '<div class="no-data">Không có bệnh nhân nào.</div>'}
                    </div>
                </div>
            </div>`;
            
            document.getElementById('patient-search-btn')?.addEventListener('click', () => {
                 alert('Thực hiện tìm kiếm bệnh nhân...');
            });
        },
        
        appointments: (year, month, appointmentsData) => {
            const panel = document.getElementById('panel-appointments');
            panel.innerHTML = `<div class="card">
                <h1>Lịch khám chi tiết</h1>
                <p>Nội dung lịch khám sẽ hiển thị ở đây. (Chưa có calendar view)</p>
            </div>`;
        },
        
        daysOff: (data) => {
            const panel = document.getElementById('panel-days-off');
            panel.innerHTML = `<div class="card">
                <div class="section-header">
                    <h1>Ngày nghỉ</h1>
                    <button id="btn-add-day-off" class="btn-primary">Thêm ngày nghỉ</button>
                </div>
                <div class="card-section" id="days-off-list">
                    ${data.length > 0 ? data.map(day => `
                        <p><strong>Ngày:</strong> ${new Date(day.date).toLocaleDateString('vi-VN')} - <strong>Lý do:</strong> ${day.reason}</p>
                    `).join('') : '<p class="no-data">Không có ngày nghỉ nào được đăng ký.</p>'}
                </div>
            </div>`;
            document.getElementById('btn-add-day-off')?.addEventListener('click', () => alert('Mở form thêm ngày nghỉ...'));
        },
        
        availability: () => {
             const panel = document.getElementById('panel-availability');
             panel.innerHTML = `<div class="card">
                 <h1>Lịch làm việc</h1>
                 <div class="card-section">
                    <p>Form thiết lập lịch làm việc...</p>
                 </div>
             </div>`;
        },
        
        notifications: () => { document.getElementById('panel-notifications').innerHTML = `<div class="card"><h1>Thông báo</h1><p class="no-data">Không có thông báo mới.</p></div>`; },
        stats: () => { document.getElementById('panel-stats').innerHTML = `<div class="card"><h1>Thống kê</h1><p class="no-data">Dữ liệu thống kê đang được xử lý.</p></div>`; },
        messages: () => { document.getElementById('panel-messages').innerHTML = `<div class="card"><h1>Tin nhắn</h1><p class="no-data">Chức năng đang được phát triển...</p></div>`; }
    };
    
    const panels = [
        { name: 'overview',    navId: 'nav-overview',    panelId: 'panel-overview' },
        { name: 'profile',     navId: 'nav-profile',     panelId: 'panel-profile' },
        { name: 'appointments', navId: 'nav-appointments', panelId: 'panel-appointments' },
        { name: 'patients',    navId: 'nav-patients',    panelId: 'panel-patients' },
        { name: 'availability', navId: 'nav-availability', panelId: 'panel-availability' },
        { name: 'days-off',    navId: 'nav-days-off',    panelId: 'panel-days-off' },
        { name: 'notifications', navId: 'nav-notifications', panelId: 'panel-notifications' },
        { name: 'stats',       navId: 'nav-stats',       panelId: 'panel-stats' },
        { name: 'messages',    navId: 'nav-messages',    panelId: 'panel-messages' }
    ];

    const showError = (panelId, message) => {
        const panel = document.getElementById(panelId);
        if(panel) panel.innerHTML = `<div class="card"><div class="error-message">Lỗi: ${message}</div></div>`;
    };

    const originalPanelHTML = {};
    panels.forEach(p => {
        const el = document.getElementById(p.panelId);
        if (el) originalPanelHTML[p.name] = el.innerHTML;
    });

    const loadPanelData = async (name) => {
        const panelId = `panel-${name}`;
        const panelElement = document.getElementById(panelId);

        if (name !== 'profile' && name !== 'days-off' && name !== 'availability') { 
             panelElement.innerHTML = originalPanelHTML[name];
        }

        try {
            if (name === 'overview') {
                const data = await api.getOverview(); 
                render.overview(data);
            } else if (name === 'patients') {
                const data = await api.getPatients();
                render.patients(data);
            } else if (name === 'appointments') {
                const data = await api.getAppointments(new Date().getFullYear(), new Date().getMonth() + 1);
                render.appointments(new Date().getFullYear(), new Date().getMonth() + 1, data);
            } else if (name === 'profile') {
                const data = await api.getProfile();
                render.profile(data);
            } else if (name === 'availability') { 
                render.availability();
            } else if (name === 'days-off') {
                const data = await api.getDaysOff();
                render.daysOff(data);
            } else if (name === 'notifications') {
                 render.notifications();
            } else if (name === 'stats') {
                 render.stats();
            } else if (name === 'messages') {
                 render.messages();
            }
        } catch (error) {
            showError(panelId, error.message);
        }
    };

    function showPanel(name) {
        panels.forEach(p => {
            const navElement = document.getElementById(p.navId);
            const panelElement = document.getElementById(p.panelId);
            if (navElement && panelElement) {
                const isActive = p.name === name;
                panelElement.classList.toggle('hidden', !isActive);
                navElement.classList.toggle('active', isActive);
                if (isActive) {
                    loadPanelData(name);
                }
            }
        });
    }
    
    const applyHash = () => {
        const hash = window.location.hash.substring(1).split('/')[0] || 'overview';
        showPanel(hash);
    };

    document.querySelectorAll('.sidebar-nav-item').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPanel = link.getAttribute('href').substring(1);
            history.pushState(null, '', `#${targetPanel}`);
            showPanel(targetPanel);
        });
    });

    window.addEventListener('popstate', applyHash);
    
    cancelConfirmBtn.addEventListener('click', async () => {
        if (!currentAppointmentIdToCancel) return;
        try {
            await api.cancelAppointment(currentAppointmentIdToCancel);
            hideModal(cancelModal);
            loadPanelData('appointments');
        } catch (error) {
            hideModal(cancelModal);
            showCustomError(`Lỗi hủy lịch: ${error.message}`);
        } finally {
            currentAppointmentIdToCancel = null;
        }
    });

    applyHash();
});