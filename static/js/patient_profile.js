// patient_profile.js - Logic frontend cho trang profile bệnh nhân
console.log("Trang profile bệnh nhân đã tải.");

// Xử lý form cập nhật thông tin (giả lập, sẽ tích hợp backend sau)
document.getElementById("update-form").addEventListener("submit", function (event) {
    event.preventDefault();
    const phone = document.getElementById("update-phone").value;
    const address = document.getElementById("update-address").value;

    // Cập nhật giao diện giả lập
    document.getElementById("phone").textContent = phone;
    document.getElementById("address").textContent = address;
    alert("Thông tin đã được cập nhật thành công! (Giả lập)");
});
