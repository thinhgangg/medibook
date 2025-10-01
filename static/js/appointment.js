const filterData = {
    gender: ["Nam", "Nữ"],
    experience: ["Dưới 5 năm", "5-10 năm", "10-15 năm", "Trên 15 năm"],
    rating: ["4.5+ sao", "4.0+ sao", "3.5+ sao", "3.0+ sao"],
};

const modal = document.getElementById("filter-modal");
const modalTitle = document.getElementById("modal-title");
const modalOptions = document.getElementById("modal-options");
const modalSearch = document.getElementById("modal-search");
const closeBtn = document.querySelector(".close");
const applyBtn = document.getElementById("apply-filter");
const clearBtn = document.getElementById("clear-filter");

const doctorList = document.getElementById("doctor-list");
const resultCount = document.querySelector(".result-count");

let currentFilter = "";
let doctorsCache = [];
let specialtiesCache = [];
let activeFilters = {};

function getFilterTitle(filter) {
    const titles = {
        specialty: "Chuyên khoa",
        gender: "Giới tính",
        experience: "Kinh nghiệm",
        rating: "Đánh giá",
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

// Map experience label sang số năm
function mapExperienceToRange(label) {
    switch (label) {
        case "Dưới 5 năm":
            return { min: 0, max: 4 };
        case "5-10 năm":
            return { min: 5, max: 10 };
        case "10-15 năm":
            return { min: 10, max: 15 };
        case "Trên 15 năm":
            return { min: 16, max: null };
        default:
            return { min: null, max: null };
    }
}

// Map rating label sang giá trị số
function mapRatingToValue(label) {
    if (!label) return "";
    return parseFloat(label.split("+")[0]);
}

// Populate modal options
function populateOptions(options) {
    modalOptions.innerHTML = "";
    options.forEach((opt) => {
        const div = document.createElement("div");
        div.className = "option-item";

        if (typeof opt === "string") {
            div.textContent = opt;
            div.dataset.value = opt;
        } else {
            div.textContent = opt.name;
            div.dataset.value = opt.slug;
        }

        div.addEventListener("click", () => {
            modalOptions.querySelectorAll(".option-item").forEach((o) => o.classList.remove("selected"));
            div.classList.add("selected");
        });
        modalOptions.appendChild(div);
    });
}

// Update filter button text
function updateFilterButton(filter) {
    const filterBtn = document.querySelector(`[data-filter="${filter}"]`);
    if (!filterBtn) return;

    let isActive = false;
    if (filter === "specialty" && activeFilters.specialty) isActive = true;
    if (filter === "gender" && activeFilters.gender) isActive = true;
    if (filter === "experience" && activeFilters.experience) isActive = true;
    if (filter === "rating" && activeFilters.min_rating) isActive = true;

    if (isActive) filterBtn.classList.add("active");
    else filterBtn.classList.remove("active");

    filterBtn.innerHTML = `<i class="${getFilterIcon(filter)}"></i> ${getFilterTitle(filter)}`;
}

async function fetchSpecialties() {
    if (specialtiesCache.length) return specialtiesCache;
    try {
        const res = await fetch("http://localhost:8000/api/specialties/");
        if (!res.ok) throw new Error("Failed to fetch specialties");
        specialtiesCache = await res.json();
        return specialtiesCache;
    } catch (error) {
        console.error(error);
        return [];
    }
}

let currentPage = 1;
let totalPages = 1;

async function fetchDoctorsPage(filters = {}, page = 1) {
    const url = new URL("http://localhost:8000/api/doctors/");
    const params = prepareAPIParams(filters);

    url.searchParams.append("page", page);

    Object.keys(params).forEach((key) => {
        if (params[key] !== undefined && params[key] !== "") {
            url.searchParams.set(key, params[key]);
        }
    });

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch doctors");
        const data = await res.json();
        doctorsCache = data.results;
        renderDoctors(doctorsCache, page === 1);

        const queryString = url.searchParams.toString();
        window.history.replaceState({}, "", `?${queryString}`);
        currentPage = page;
        totalPages = Math.ceil(data.count / 10);
        renderPaginationControls();
    } catch (err) {
        console.error(err);
    }
}

// Render doctor cards
function renderDoctors(doctors, replace = true) {
    if (replace) doctorList.innerHTML = "";

    doctors.forEach((d) => {
        const avgRating = d.average_rating ? `${d.average_rating}` : "Chưa có đánh giá";
        const expYears = d.experience_years || 0;
        const card = document.createElement("div");
        card.className = "doctor-card";
        card.innerHTML = `
            <img src="${d.profile_picture}" alt="${d.user.full_name}" class="doctor-avatar" />
            <div class="doctor-info">
                <h3 class="doctor-name">BS. ${d.user.full_name}</h3>
                <div class="doctor-specialty">${d.specialty?.name || "Chưa cập nhật"}</div>
                <div class="doctor-address"><i class="fas fa-map-marker-alt"></i> ${d.user.full_address || "Chưa cập nhật"}</div>
                <div class="doctor-stats">
                    <div class="stat-item"><i class="fas fa-star rating"></i> <span>${avgRating}</span></div>
                    <div class="stat-item"><i class="fas fa-clock"></i> <span>${expYears} năm kinh nghiệm</span></div>
                </div>
            </div>
            <a href="/doctors/${d.slug}/" class="book-btn"><i class="fas fa-calendar-plus"></i> Đặt khám</a>
        `;
        doctorList.appendChild(card);
    });

    resultCount.innerHTML = `<div class="result-icon"><i class="fas fa-search"></i></div>Tìm thấy ${doctorsCache.length} bác sĩ`;
}

// Render pagination
function renderPaginationControls() {
    const paginationContainer = document.getElementById("pagination");
    if (!paginationContainer) return;

    paginationContainer.innerHTML = "";
    if (currentPage > 1) {
        const prev = document.createElement("button");
        prev.textContent = "« Trước";
        prev.addEventListener("click", () => fetchDoctorsPage(currentPage - 1));
        paginationContainer.appendChild(prev);
    }

    if (currentPage < totalPages) {
        const next = document.createElement("button");
        next.textContent = "Tiếp »";
        next.addEventListener("click", () => fetchDoctorsPage(currentPage + 1));
        paginationContainer.appendChild(next);
    }
}

// Modal & Filters
document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
        currentFilter = btn.dataset.filter;
        modalTitle.textContent = getFilterTitle(currentFilter);

        let options = [];
        if (currentFilter === "specialty") {
            const specs = await fetchSpecialties();
            options = specs.map((s) => ({ name: s.name, slug: s.slug }));
        } else {
            options = filterData[currentFilter];
        }

        populateOptions(options);

        const selectedValues = activeFilters[currentFilter] || [];
        modalOptions.querySelectorAll(".option-item").forEach((opt) => {
            if (currentFilter === "rating") {
                const selectedValue = activeFilters.min_rating;
                modalOptions.querySelectorAll(".option-item").forEach((opt) => {
                    if (selectedValue && parseFloat(opt.dataset.value) === selectedValue) {
                        opt.classList.add("selected");
                    }
                });
            } else {
                const selectedValues = activeFilters[currentFilter] || [];
                modalOptions.querySelectorAll(".option-item").forEach((opt) => {
                    if (selectedValues.includes(opt.dataset.value)) {
                        opt.classList.add("selected");
                    }
                });
            }
        });

        modal.style.display = "block";
    });
});

closeBtn.addEventListener("click", () => (modal.style.display = "none"));
window.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
});

function normalize(str) {
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

// Modal search
modalSearch.addEventListener("input", (e) => {
    const searchTerm = normalize(e.target.value);

    const optionItems = Array.from(modalOptions.querySelectorAll(".option-item"));

    const data = optionItems.map((opt) => ({
        text: normalize(opt.textContent),
        element: opt,
    }));

    const fuse = new Fuse(data, {
        keys: ["text"],
        threshold: 0.1,
        ignoreLocation: true,
    });

    const results = searchTerm ? fuse.search(searchTerm).map((r) => r.item) : data;

    optionItems.forEach((opt) => (opt.style.display = "none"));

    results.forEach((r) => (r.element.style.display = "block"));
});

// Apply filter
applyBtn.addEventListener("click", () => {
    const selectedItems = modalOptions.querySelectorAll(".option-item.selected");
    const values = Array.from(selectedItems).map((i) => i.dataset.value);

    if (currentFilter === "specialty") activeFilters.specialty = values[0] || "";
    if (currentFilter === "gender") activeFilters.gender = values[0] || "";
    if (currentFilter === "experience") {
        const range = mapExperienceToRange(values[0]);
        activeFilters.experience = values[0] || "";
        activeFilters.min_experience = range.min;
        activeFilters.max_experience = range.max;
    }
    if (currentFilter === "rating") activeFilters.min_rating = mapRatingToValue(values[0]);

    updateFilterButton(currentFilter);
    fetchDoctorsPage(prepareAPIParams());
    modal.style.display = "none";
});

// Clear filter
clearBtn.addEventListener("click", () => {
    const options = modalOptions.querySelectorAll(".option-item");
    options.forEach((opt) => opt.classList.remove("selected"));

    if (currentFilter === "specialty") delete activeFilters.specialty;
    if (currentFilter === "gender") delete activeFilters.gender;
    if (currentFilter === "experience") {
        delete activeFilters.experience;
        delete activeFilters.min_experience;
        delete activeFilters.max_experience;
    }
    if (currentFilter === "rating") delete activeFilters.min_rating;

    updateFilterButton(currentFilter);
    fetchDoctorsPage(prepareAPIParams());
    modal.style.display = "none";
});

// Prepare API params from activeFilters
function prepareAPIParams() {
    const params = {};
    if (activeFilters.specialty) params.specialty = activeFilters.specialty;

    if (activeFilters.gender) params.gender = activeFilters.gender === "Nam" ? "MALE" : "FEMALE";

    if (activeFilters.min_experience !== undefined && activeFilters.min_experience !== null) {
        params.min_experience = activeFilters.min_experience;
    }

    if (activeFilters.max_experience !== undefined && activeFilters.max_experience !== null) {
        params.max_experience = activeFilters.max_experience;
    }

    if (activeFilters.min_rating !== undefined) params.min_rating = activeFilters.min_rating;

    return params;
}

window.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.get("specialty")) activeFilters.specialty = urlParams.get("specialty");
    if (urlParams.get("gender")) activeFilters.gender = urlParams.get("gender") === "MALE" ? "Nam" : "Nữ";
    if (urlParams.get("min_experience")) activeFilters.min_experience = parseInt(urlParams.get("min_experience"));
    if (urlParams.get("max_experience")) activeFilters.max_experience = parseInt(urlParams.get("max_experience"));
    if (urlParams.get("min_rating")) activeFilters.min_rating = parseFloat(urlParams.get("min_rating"));

    Object.keys(activeFilters).forEach(updateFilterButton);

    fetchDoctorsPage(prepareAPIParams());
});
