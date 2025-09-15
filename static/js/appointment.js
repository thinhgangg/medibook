const filterData = {
    specialty: [
        "Nội thận",
        "Ngoại tiết niệu",
        "Nội tiết",
        "Tim mạch",
        "Thần kinh",
        "Tiêu hóa",
        "Hô hấp",
        "Da liễu",
        "Mắt",
        "Tai mũi họng",
        "Răng hàm mặt",
        "Sản phụ khoa",
    ],
    gender: ["Nam", "Nữ"],
    experience: ["Dưới 5 năm", "5-10 năm", "10-15 năm", "Trên 15 năm"],
    rating: ["4.5+ sao", "4.0+ sao", "3.5+ sao", "3.0+ sao"],
};

// Modal functionality
const modal = document.getElementById("filter-modal");
const modalTitle = document.getElementById("modal-title");
const modalOptions = document.getElementById("modal-options");
const modalSearch = document.getElementById("modal-search");
const closeBtn = document.querySelector(".close");
const applyBtn = document.getElementById("apply-filter");
const clearBtn = document.getElementById("clear-filter");

let currentFilter = "";
let selectedOptions = [];

// Open modal
document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        currentFilter = btn.dataset.filter;
        modalTitle.textContent = getFilterTitle(currentFilter);
        populateOptions(filterData[currentFilter]);
        modal.style.display = "block";
    });
});

// Close modal
closeBtn.addEventListener("click", () => {
    modal.style.display = "none";
});

window.addEventListener("click", (e) => {
    if (e.target === modal) {
        modal.style.display = "none";
    }
});

// Search in modal
modalSearch.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const options = modalOptions.querySelectorAll(".option-item");

    options.forEach((option) => {
        const text = option.textContent.toLowerCase();
        option.style.display = text.includes(searchTerm) ? "block" : "none";
    });
});

// Apply filter
applyBtn.addEventListener("click", () => {
    const selectedItems = document.querySelectorAll(".option-item.selected");
    const filterBtn = document.querySelector(`[data-filter="${currentFilter}"]`);

    if (selectedItems.length > 0) {
        filterBtn.classList.add("active");
        filterBtn.innerHTML = `<i class="${getFilterIcon(currentFilter)}"></i> ${selectedItems.length} đã chọn`;
    }

    modal.style.display = "none";
});

// Clear filter
clearBtn.addEventListener("click", () => {
    selectedOptions = [];
    const options = modalOptions.querySelectorAll(".option-item");
    options.forEach((option) => option.classList.remove("selected"));

    const filterBtn = document.querySelector(`[data-filter="${currentFilter}"]`);
    filterBtn.classList.remove("active");
    filterBtn.innerHTML = `<i class="${getFilterIcon(currentFilter)}"></i> ${getFilterTitle(currentFilter)}`;

    modal.style.display = "none";
});

function populateOptions(options) {
    modalOptions.innerHTML = "";
    options.forEach((option) => {
        const div = document.createElement("div");
        div.className = "option-item";
        div.textContent = option;
        div.addEventListener("click", () => {
            div.classList.toggle("selected");
        });
        modalOptions.appendChild(div);
    });
}

function getFilterTitle(filter) {
    const titles = {
        specialty: "Chọn chuyên khoa",
        gender: "Chọn giới tính",
        experience: "Số năm kinh nghiệm",
        rating: "Đánh giá tối thiểu",
    };
    return titles[filter];
}

function getFilterIcon(filter) {
    const icons = {
        specialty: "fas fa-user-md",
        gender: "fas fa-venus-mars",
        experience: "fas fa-award",
        rating: "fas fa-star",
    };
    return icons[filter];
}

// Book appointment buttons
document.querySelectorAll(".book-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        // Add booking animation
        btn.style.transform = "scale(0.95)";
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';

        setTimeout(() => {
            btn.style.transform = "scale(1)";
            btn.innerHTML = '<i class="fas fa-check"></i> Đã đặt lịch';
            btn.style.background = "linear-gradient(135deg, #48bb78, #38a169)";
        }, 1500);
    });
});

// Search functionality
document.querySelector(".search-input").addEventListener("focus", function () {
    this.parentElement.style.transform = "translateY(-4px)";
});

document.querySelector(".search-input").addEventListener("blur", function () {
    this.parentElement.style.transform = "translateY(0)";
});
