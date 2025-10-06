document.addEventListener('DOMContentLoaded', () => {

    const BASE_URL = 'http://127.0.0.1:8000/api';

    // --- HÀM FETCH API CHUNG ---
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

    // --- API ENDPOINTS ĐÃ CẬP NHẬT ---
    const api = {
        getOverview: () => fetchAPI('/dashboard/overview/'),
        getProfile: () => fetchAPI('/doctors/me/'),
        getAppointments: (year, month) => fetchAPI(`/appointments/?year=${year}&month=${month}`),
        getPatients: (search = '') => fetchAPI(`/patients/?search=${search}`),
        updateProfile: (profileData) => fetchAPI('/accounts/me/', {
            method: 'PATCH',
            body: JSON.stringify(profileData)
        }),
        addAvailability: (scheduleData) => fetchAPI('/doctors/availability/', {
            method: 'POST',
            body: JSON.stringify(scheduleData)
        }),
        getDaysOff: () => fetchAPI('/doctors/days-off/'),
        addDayOff: (dayOffData) => fetchAPI('/doctors/days-off/', {
            method: 'POST',
            body: JSON.stringify(dayOffData)
        }),
        // API HÀNH ĐỘNG LỊCH KHÁM
        confirmAppointment: (id) => fetchAPI(`/appointments/${id}/confirm/`, { method: 'POST' }),
        completeAppointment: (id) => fetchAPI(`/appointments/${id}/complete/`, { method: 'POST' }),
        cancelAppointment: (id) => fetchAPI(`/appointments/${id}/cancel/`, { method: 'POST' })
    };
    
    const render = {
        overview: (data) => {
             document.getElementById('doctor-greeting').textContent = `Hello, ${data.doctor_name}`;
            const appointmentsList = document.getElementById('overview-appointments-list');
            appointmentsList.innerHTML = data.upcoming_appointments.length > 0 ? data.upcoming_appointments.map(app =>                 `<div class="py-3 grid grid-cols-3 gap-4 items-center">
                    <div>${new Date(app.date).toLocaleDateString('vi-VN')}</div>
                    <div>${app.time.slice(0, 5)}</div>
                    <div>${app.patient.full_name}</div>
                </div>`).join('') : '<p class="p-3 text-gray-500">No upcoming appointments.</p>';            document.getElementById('overview-profile-summary').innerHTML =                 `<p><strong>Specialty:</strong> ${data.profile_summary.specialty}</p>
                <p><strong>Phone:</strong> ${data.profile_summary.phone}</p>
                <p><strong>Email:</strong> ${data.profile_summary.email}</p>`;            const recentPatientsList = document.getElementById('overview-recent-patients');
            recentPatientsList.innerHTML = data.recent_patients.length > 0 ? data.recent_patients.map(p =>                 `<li class="flex items-center gap-3">
                    <img src="${p.avatar_url || 'https://i.pravatar.cc/40'}" class="w-10 h-10 rounded-full" alt="avatar">
                    <div>
                        <div class="font-semibold">${p.full_name}</div>
                        <div class="text-sm text-gray-500">Last visit: ${new Date(p.last_visit).toLocaleDateString('vi-VN')}</div>
                    </div>
                </li>`).join('') : '<p>No recent patients.</p>';            const messagesPreview = document.getElementById('overview-messages-preview');
            if (messagesPreview) {
                 messagesPreview.innerHTML = data.unread_messages_preview.length > 0 ? data.unread_messages_preview.map(msg =>                     `<div class="p-3 bg-gray-50 rounded-lg">
                        <p class="font-semibold">${msg.sender_name}</p>
                        <p class="text-gray-600 text-sm truncate">${msg.message_snippet}</p>
                    </div>`).join('') : '<p class="text-gray-500 p-3">No new messages.</p>';            }
        },
        patients: (data) => {
            const tableBody = document.getElementById('patients-table-body');
            tableBody.innerHTML = data.results.length > 0 ? data.results.map(p =>                 `<tr>
                    <td class="px-6 py-4 whitespace-nowrap">${p.full_name}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${new Date(p.date_of_birth).toLocaleDateString('vi-VN')}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${p.contact}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${new Date(p.last_visit).toLocaleDateString('vi-VN')}</td>
                    <td class="px-6 py-4 whitespace-nowrap"><a href="#patient-detail/${p.id}" class="text-blue-600 hover:underline">View Profile</a></td>
                </tr>`).join('') : '<tr><td colspan="5" class="text-center p-4">No patients found.</td></tr>';        },
        appointments: (year, month, appointmentsData) => {
            const calendarGrid = document.getElementById('appointments-calendar-grid');
            if (!calendarGrid) return;
            calendarGrid.innerHTML = '';
            const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            daysOfWeek.forEach(day => {
                calendarGrid.innerHTML += `<div class="day-header">${day}</div>`;
            });
            const firstDay = new Date(year, month - 1, 1).getDay();
            const daysInMonth = new Date(year, month, 0).getDate();
            for (let i = 0; i < firstDay; i++) {
                calendarGrid.innerHTML += `<div class="day-cell is-other-month"></div>`;
            }
            for (let day = 1; day <= daysInMonth; day++) {
                const appointmentsForDay = appointmentsData.filter(app => 
                    new Date(app.date).getDate() === day && 
                    new Date(app.date).getMonth() === month - 1 && 
                    new Date(app.date).getFullYear() === year
                );
                
                let appointmentsHTML = appointmentsForDay.map(app =>                     `<div class="appointment-item status-${app.status || 'pending'}">
                        <div>${app.time.slice(0, 5)} - ${app.patient.full_name}</div>
                        <div class="mt-1 flex gap-2">
                            ${app.status === 'pending' ?                                 `<button class="btn-confirm btn-small" data-id="${app.id}">Xác nhận</button>`
                             : ''}                            ${app.status === 'confirmed' ?                                 `<button class="btn-complete btn-small" data-id="${app.id}">Hoàn tất</button>`
                             : ''}                            <button class="btn-cancel btn-small" data-id="${app.id}">Hủy</button>
                        </div>
                    </div>`).join('');                const today = new Date();
                const isTodayClass = (year === today.getFullYear() && month - 1 === today.getMonth() && day === today.getDate()) ? 'is-today' : '';
                calendarGrid.innerHTML +=                     `<div class="day-cell ${isTodayClass}">
                        <div class="day-number">${day}</div>
                        ${appointmentsHTML}
                    </div>`;            }

            // --- Thêm sự kiện cho các nút hành động ---
            document.querySelectorAll('.btn-confirm').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.getAttribute('data-id');
                    try {
                        await api.confirmAppointment(id);
                        loadPanelData('appointments');
                    } catch (error) {
                        alert(`Lỗi xác nhận: ${error.message}`);
                    }
                });
            });

            document.querySelectorAll('.btn-complete').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.getAttribute('data-id');
                    try {
                        await api.completeAppointment(id);
                        loadPanelData('appointments');
                    } catch (error) {
                        alert(`Lỗi hoàn tất: ${error.message}`);
                    }
                });
            });

            document.querySelectorAll('.btn-cancel').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.getAttribute('data-id');
                    if (confirm('Bạn có chắc muốn hủy lịch khám này?')) {
                        try {
                            await api.cancelAppointment(id);
                            loadPanelData('appointments');
                        } catch (error) {
                            alert(`Lỗi hủy: ${error.message}`);
                        }
                    }
                });
            });
        },
        
        profile: (data) => {
            const panel = document.getElementById('panel-profile');
            const user = data.user || {};
            const specialty = data.specialty || {};

            panel.innerHTML =                 `<div class="bg-white shadow-xl rounded-xl p-6 md:p-8 max-w-7xl mx-auto">
                    <div class="flex flex-col md:flex-row items-center gap-8 border-b pb-6">
                        <img src="${data.profile_picture || 'https://i.pravatar.cc/160'}" alt="Ảnh hồ sơ" class="w-40 h-40 rounded-full object-cover border-4 border-gray-200 shadow-md">
                        <div class="flex-1 text-center md:text-left">
                            <h1 class="text-3xl font-bold text-gray-800">${user.full_name ?? 'Tên bác sĩ'}</h1>
                            <p class="text-xl text-blue-600 font-semibold mt-1">${specialty.name ?? 'Chưa cập nhật chuyên khoa'}</p>
                            <p class="text-gray-500 italic mt-2">${specialty.description ?? 'Bác sĩ chuyên khoa...'}</p>
                        </div>
                    </div>

                    <div id="display-profile-info" class="mt-6">
                        <h2 class="text-2xl font-semibold text-gray-700">Thông tin cá nhân</h2>
                        <p class="text-gray-500 mt-1">Hồ sơ của bạn được cập nhật với các thông tin cơ bản.</p>
                        <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="bg-gray-50 p-6 rounded-lg text-center md:text-left">
                                <h3 class="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Thông tin cơ bản</h3>
                                <ul class="space-y-3 text-gray-700">
                                    <li><strong>Họ và tên:</strong> ${user.full_name ?? "Chưa có thông tin"}</li>
                                    <li><strong>Số điện thoại:</strong> ${user.phone_number ?? "Chưa có thông tin"}</li>
                                    <li><strong>Ngày sinh:</strong> ${user.dob ? new Date(user.dob).toLocaleDateString('vi-VN') : "Chưa có thông tin"}</li>
                                    <li><strong>Giới tính:</strong> ${user.gender ?? "Chưa có thông tin"}</li>
                                    <li><strong>Địa chỉ:</strong> ${user.full_address ?? "Chưa có thông tin"}</li>
                                </ul>
                            </div>
                            <div class="bg-gray-50 p-6 rounded-lg text-center md:text-left">
                                <h3 class="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Thông tin bổ sung</h3>
                                <ul class="space-y-3 text-gray-700">
                                    <li><strong>Email:</strong> ${user.email ?? "Chưa có thông tin"}</li>
                                    <li><strong>Số CMND/CCCD:</strong> ${user.id_number ?? "Chưa có thông tin"}</li>
                                    <li><strong>Dân tộc:</strong> ${user.ethnicity ?? "Chưa có thông tin"}</li>
                                    <li><strong>Tiểu sử:</strong> ${data.bio || "Chưa cập nhật tiểu sử"}</li>
                                </ul>
                            </div>
                        </div>
                        <div class="mt-8 text-right">
                            <button id="btn-edit-doctor" class="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-300 inline-block">Chỉnh sửa hồ sơ</button>
                        </div>
                    </div>

                    <div id="edit-profile-form-container" class="mt-6 hidden">
                        <h2 class="text-2xl font-semibold text-gray-700 mb-4">Chỉnh sửa thông tin</h2>
                        <form id="edit-profile-form" class="space-y-4">
                            <div>
                                <label for="edit_full_name" class="block text-sm font-medium text-gray-700">Họ và tên</label>
                                <input type="text" id="edit_full_name" name="full_name" value="${user.full_name ?? ''}" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                            </div>
                            <div>
                                <label for="edit_phone_number" class="block text-sm font-medium text-gray-700">Số điện thoại</label>
                                <input type="text" id="edit_phone_number" name="phone_number" value="${user.phone_number ?? ''}" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                            </div>
                            <div>
                                <label for="edit_bio" class="block text-sm font-medium text-gray-700">Tiểu sử (Bio)</label>
                                <textarea id="edit_bio" name="bio" rows="3" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">${data.bio || ''}</textarea>
                            </div>
                            <div class="flex justify-end gap-3">
                                <button type="button" id="btn-cancel-edit" class="px-6 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors duration-300">Hủy</button>
                                <button type="submit" id="btn-save-profile" class="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors duration-300">Lưu thay đổi</button>
                            </div>
                            <p id="profile-message" class="mt-2 text-sm"></p>
                        </form>
                    </div>
                </div>`;            
            const displayPanel = document.getElementById('display-profile-info');
            const editContainer = document.getElementById('edit-profile-form-container');
            const btnEdit = document.getElementById('btn-edit-doctor');
            const btnCancel = document.getElementById('btn-cancel-edit');
            const form = document.getElementById('edit-profile-form');
            const messageElement = document.getElementById('profile-message');

            const toggleEditMode = (isEditing) => {
                displayPanel.classList.toggle('hidden', isEditing);
                editContainer.classList.toggle('hidden', !isEditing);
                document.getElementById('profile-message').textContent = ''; 
            };

            if (btnEdit) btnEdit.addEventListener('click', () => toggleEditMode(true));
            if (btnCancel) btnCancel.addEventListener('click', () => toggleEditMode(false));
            
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    messageElement.textContent = 'Đang lưu...';
                    messageElement.className = 'mt-2 text-sm text-blue-500';

                    const formData = new FormData(form);
                    const profileData = Object.fromEntries(formData.entries());
                    
                    const dataToPatch = Object.keys(profileData).reduce((acc, key) => {
                        const currentValue = user[key] || data[key] || '';
                        if (profileData[key] !== '' && profileData[key] !== currentValue) {
                            acc[key] = profileData[key];
                        }
                        return acc;
                    }, {});

                    if (Object.keys(dataToPatch).length === 0) {
                        messageElement.textContent = 'Không có thay đổi nào để lưu.';
                        messageElement.className = 'mt-2 text-sm text-yellow-600';
                        setTimeout(() => toggleEditMode(false), 1500);
                        return;
                    }
                    
                    try {
                        await api.updateProfile(dataToPatch);
                        messageElement.textContent = 'Cập nhật hồ sơ thành công! Đang tải lại...';
                        messageElement.className = 'mt-2 text-sm text-green-600';
                        
                        setTimeout(() => {
                            toggleEditMode(false); 
                            loadPanelData('profile'); 
                        }, 1500);

                    } catch (error) {
                        messageElement.textContent = `Lỗi: ${error.message}`;
                        messageElement.className = 'mt-2 text-sm text-red-600';
                    }
                });
            }
        },
        
        daysOff: (data) => {
            const panel = document.getElementById('panel-days-off');
            panel.innerHTML =                 `<div class="bg-white rounded-2xl shadow-md p-6 md:p-8">
                    <div class="flex flex-col md:flex-row items-center justify-between mb-6">
                        <h1 class="text-2xl font-bold">Ngày nghỉ</h1>
                        <button id="btn-add-day-off" class="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-300">Thêm ngày nghỉ</button>
                    </div>
                    <div id="days-off-list" class="space-y-4">
                        ${data.length > 0 ? data.map(day =>                             `<div class="p-4 bg-gray-50 rounded-lg flex flex-col md:flex-row justify-between items-center">
                                <div>
                                    <p><strong>Ngày:</strong> ${new Date(day.date).toLocaleDateString('vi-VN')}</p>
                                    ${day.start_time && day.end_time ?                                         `<p><strong>Thời gian:</strong> ${day.start_time.slice(0, 5)} - ${day.end_time.slice(0, 5)}</p>`
                                     : '<p><strong>Thời gian:</strong> Cả ngày</p>'}                                    <p><strong>Lý do:</strong> ${day.reason}</p>
                                </div>
                            </div>`
                        ).join('') : '<p class="text-gray-500">Không có ngày nghỉ nào.</p>'}                    </div>

                    <div id="add-day-off-form-container" class="mt-6 hidden">
                        <h2 class="text-2xl font-semibold text-gray-700 mb-4">Thêm ngày nghỉ</h2>
                        <form id="add-day-off-form" class="space-y-4">
                            <div>
                                <label for="day_off_date" class="block text-sm font-medium text-gray-700">Ngày</label>
                                <input type="date" id="day_off_date" name="date" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label for="day_off_start_time" class="block text-sm font-medium text-gray-700">Giờ bắt đầu</label>
                                    <input type="time" id="day_off_start_time" name="start_time" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                </div>
                                <div>
                                    <label for="day_off_end_time" class="block text-sm font-medium text-gray-700">Giờ kết thúc</label>
                                    <input type="time" id="day_off_end_time" name="end_time" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                </div>
                            </div>
                            <div>
                                <label for="day_off_reason" class="block text-sm font-medium text-gray-700">Lý do</label>
                                <input type="text" id="day_off_reason" name="reason" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required>
                            </div>
                            <div class="flex justify-end gap-3">
                                <button type="button" id="btn-cancel-day-off" class="px-6 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors duration-300">Hủy</button>
                                <button type="submit" id="btn-save-day-off" class="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors duration-300">Lưu</button>
                            </div>
                            <p id="day-off-message" class="mt-2 text-sm"></p>
                        </form>
                    </div>
                </div>`;
            const addFormContainer = document.getElementById('add-day-off-form-container');
            const btnAdd = document.getElementById('btn-add-day-off');
            const btnCancel = document.getElementById('btn-cancel-day-off');
            const form = document.getElementById('add-day-off-form');
            const messageElement = document.getElementById('day-off-message');

            const toggleAddMode = (isAdding) => {
                addFormContainer.classList.toggle('hidden', !isAdding);
                if (!isAdding) {
                    form.reset();
                    messageElement.textContent = '';
                }
            };

            if (btnAdd) btnAdd.addEventListener('click', () => toggleAddMode(true));
            if (btnCancel) btnCancel.addEventListener('click', () => toggleAddMode(false));

            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    messageElement.textContent = 'Đang lưu...';
                    messageElement.className = 'mt-2 text-sm text-blue-500';

                    const formData = new FormData(form);
                    const dayOffData = Object.fromEntries(formData.entries());
                    if (!dayOffData.start_time) delete dayOffData.start_time;
                    if (!dayOffData.end_time) delete dayOffData.end_time;

                    try {
                        await api.addDayOff(dayOffData);
                        messageElement.textContent = 'Thêm ngày nghỉ thành công! Đang tải lại...';
                        messageElement.className = 'mt-2 text-sm text-green-600';
                        setTimeout(() => {
                            toggleAddMode(false);
                            loadPanelData('days-off');
                        }, 1500);
                    } catch (error) {
                        messageElement.textContent = `Lỗi: ${error.message}`;
                        messageElement.className = 'mt-2 text-sm text-red-600';
                    }
                });
            }
        },
        
        availability: () => {
            const form = document.getElementById('availability-form');
            const messageElement = document.getElementById('availability-message');
            
            if (!form) return;

            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                messageElement.textContent = 'Đang đăng ký lịch làm việc...';
                messageElement.className = 'mt-2 text-sm text-blue-500';

                const formData = new FormData(form);
            
                const scheduleData = {
                    weekday: parseInt(formData.get('weekday')),
                    start_time: formData.get('start_time') + ':00', 
                    end_time: formData.get('end_time') + ':00', 
                    slot_minutes: parseInt(formData.get('slot_minutes')),
                    is_active: formData.get('is_active') === 'on' 
                };
                
                try {
                    const result = await api.addAvailability(scheduleData);
                    messageElement.textContent = `Đăng ký lịch làm việc thành công! (${result.weekday_display} ${result.start_time.slice(0,5)} - ${result.end_time.slice(0,5)})`;
                    messageElement.className = 'mt-2 text-sm text-green-600';

                } catch (error) {
                    messageElement.textContent = `Lỗi đăng ký: ${error.message}`;
                    messageElement.className = 'mt-2 text-sm text-red-600';
                }
            });
        }
    };
    const panels = [
        { name: 'overview',    navId: 'nav-overview',    panelId: 'panel-overview' },
        { name: 'profile',     navId: 'nav-profile',     panelId: 'panel-profile' },
        { name: 'appointments', navId: 'nav-appointments', panelId: 'panel-appointments' },
        { name: 'patients',    navId: 'nav-patients',    panelId: 'panel-patients' },
        { name: 'messages',    navId: 'nav-messages',    panelId: 'panel-messages' },
        { name: 'availability', navId: 'nav-availability', panelId: 'panel-availability' },
        { name: 'days-off',    navId: 'nav-days-off',    panelId: 'panel-days-off' }
    ];

    const showError = (panelId, message) => {
        const panel = document.getElementById(panelId);
        if(panel) panel.innerHTML = `<div class="text-center p-10 text-red-500">Error: ${message}</div>`;
    };

    const originalPanelHTML = {};
    panels.forEach(p => {
        const el = document.getElementById(p.panelId);
        if (el) originalPanelHTML[p.name] = el.innerHTML;
    });

    const loadPanelData = async (name) => {
        const panelId = `panel-${name}`;
        const panelElement = document.getElementById(panelId);

        if (name !== 'profile' && name !== 'days-off' && originalPanelHTML[name]) { 
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
                const monthPicker = document.getElementById('appointment-month-picker');
                if (!monthPicker.value) {
                    const today = new Date();
                    const year = today.getFullYear();
                    const month = (today.getMonth() + 1).toString().padStart(2, '0');
                    monthPicker.value = `${year}-${month}`;
                }
                
                const [year, month] = monthPicker.value.split('-').map(Number);
                const data = await api.getAppointments(year, month);
                render.appointments(year, month, data);
            } else if (name === 'profile') {
                const data = await api.getProfile();
                render.profile(data);
            } else if (name === 'availability') { 
                render.availability();
            } else if (name === 'days-off') {
                const data = await api.getDaysOff();
                render.daysOff(data);
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
                navElement.classList.toggle('is-active', isActive);
                if (isActive) {
                    if (name === 'availability' && originalPanelHTML[name]) {
                         panelElement.innerHTML = originalPanelHTML[name];
                    }
                    loadPanelData(name);
                }
            }
        });
    }
    
    const applyHash = () => {
        const hash = window.location.hash.substring(1).split('/')[0] || 'overview';
        showPanel(hash);
    };

    document.querySelectorAll('.nav-item, .nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPanel = link.getAttribute('href').substring(1);
            history.pushState(null, '', `#${targetPanel}`);
            showPanel(targetPanel);
        });
    });

    window.addEventListener('popstate', applyHash);
    
    const patientSearchBtn = document.getElementById('patient-search-btn');
    const patientSearchInput = document.getElementById('patient-search-input');
    if (patientSearchBtn) {
        const searchPatients = async () => {
            const query = patientSearchInput.value;
            try {
                document.getElementById('patients-table-body').innerHTML = '<tr><td colspan="5" class="text-center p-4">Searching...</td></tr>';
                const data = await api.getPatients(query);
                render.patients(data);
            } catch (error) {
                document.getElementById('patients-table-body').innerHTML = `<tr><td colspan="5" class="text-center p-4 text-red-500">Error: ${error.message}</td></tr>`;
            }
        };
        patientSearchBtn.addEventListener('click', searchPatients);
        patientSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchPatients();
        });
    }
    
    const monthPicker = document.getElementById('appointment-month-picker');
    if(monthPicker) {
        const today = new Date();
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        // Đặt giá trị ban đầu cho monthPicker
        monthPicker.value = `${year}-${month}`;
        monthPicker.addEventListener('change', () => loadPanelData('appointments'));
    }

    applyHash();
});