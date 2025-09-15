// Dữ liệu giả định cho các options của từng filter
const filterData = {
    specialty: {
        title: 'Tìm theo chuyên khoa',
        options: [
            { label: 'Nhi khoa', icon: '👶', value: 'nhi-khoa' },
            { label: 'Da liễu', icon: '🧴', value: 'da-lieu' },
            { label: 'Ngoại lồng ngực - mạch máu', icon: '❤️', value: 'ngoai-long-nguc-mach-mau' },
            { label: 'Chẩn đoán hình ảnh', icon: '📷', value: 'chan-doan-hinh-anh' },
            // Thêm các chuyên khoa khác nếu cần
        ],
        type: 'single' // Chọn một, không dùng checkbox/radio
    },
    gender: {
        title: 'Giới tính',
        options: [
            { label: 'Nam', value: 'nam' },
            { label: 'Nữ', value: 'nu' },
        ],
        type: 'radio' // Chọn một
    },
    experience: {
        title: 'Số năm kinh nghiệm',
        options: [
            { label: 'Dưới 5 năm', value: '0-5' },
            { label: '5-10 năm', value: '5-10' },
            { label: '10-20 năm', value: '10-20' },
            { label: 'Trên 20 năm', value: '20+' },
        ],
        type: 'checkbox'
    },
    rating: {
        title: 'Đánh giá',
        options: [
            { label: '5 sao', value: '5' },
            { label: '4 sao', value: '4' },
            { label: '3 sao', value: '3' },
            { label: '2 sao', value: '2' },
            { label: '1 sao', value: '1' },
        ],
        type: 'checkbox'
    }
};

// Lấy elements
const modal = document.getElementById('filter-modal');
const modalTitle = document.getElementById('modal-title');
const modalOptions = document.getElementById('modal-options');
const modalSearch = document.getElementById('modal-search');
const closeBtn = document.querySelector('.close');
const clearBtn = document.getElementById('clear-filter');
const applyBtn = document.getElementById('apply-filter');

// Biến lưu filter hiện tại và selections
let currentFilter = null;
let selections = { specialty: null, gender: null, experience: [], rating: [] };

// Mở modal khi click filter button
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        currentFilter = btn.getAttribute('data-filter');
        const data = filterData[currentFilter];
        modalTitle.textContent = data.title;

        // Xóa options cũ
        modalOptions.innerHTML = '';

        // Thêm options
        data.options.forEach(opt => {
            const div = document.createElement('div');
            div.classList.add('option-item');
            div.setAttribute('data-value', opt.value);

            if (currentFilter === 'specialty') {
                div.textContent = `${opt.icon} ${opt.label}`;
            } else {
                div.textContent = opt.label;
            }

            // Khôi phục selection
            if (selections[currentFilter] === opt.value) {
                div.classList.add('selected');
            }

            div.addEventListener('click', () => {
                if (data.type === 'single') {
                    modalOptions.querySelectorAll('.option-item').forEach(item => item.classList.remove('selected'));
                    div.classList.add('selected');
                    selections[currentFilter] = opt.value;
                }
                updateButtonState(currentFilter);
            });

            modalOptions.appendChild(div);
        });

        // Hiển thị search nếu là chuyên khoa
        modalSearch.style.display = currentFilter === 'specialty' ? 'block' : 'none';

        modal.style.display = 'block';
    });
});

// Đóng modal
closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

// Xóa bộ lọc
clearBtn.addEventListener('click', () => {
    if (filterData[currentFilter].type === 'checkbox') {
        selections[currentFilter] = [];
    } else {
        selections[currentFilter] = null;
    }
    modalOptions.querySelectorAll('.option-item').forEach(item => item.classList.remove('selected'));
    updateButtonState(currentFilter);
    // Áp dụng filter (có thể gọi hàm filter doctors)
});

// Áp dụng
applyBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    // Áp dụng filter thực tế (có thể gọi API hoặc filter list)
});

// Cập nhật trạng thái button (active nếu có selection)
function updateButtonState(filter) {
    const btn = document.querySelector(`.filter-btn[data-filter="${filter}"]`);
    if ((filterData[filter].type === 'checkbox' && selections[filter].length > 0) ||
        (filterData[filter].type === 'single' && selections[filter] !== null) ||
        (filterData[filter].type === 'radio' && selections[filter] !== null)) {
        btn.classList.add('active');
    } else {
        btn.classList.remove('active');
    }
}

// Tìm kiếm trong options (cho chuyên khoa)
modalSearch.addEventListener('input', (e) => {
    const searchText = e.target.value.toLowerCase();
    document.querySelectorAll('.option-item').forEach(item => {
        const label = item.textContent.toLowerCase();
        item.style.display = label.includes(searchText) ? 'block' : 'none';
    });
});