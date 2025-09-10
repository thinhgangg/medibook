// doctor-profile.js

document.addEventListener("DOMContentLoaded", function () {
    const form = document.querySelector("form");

    // Function to handle form submission for updating profile
    form.addEventListener("submit", function (event) {
        event.preventDefault();

        const formData = new FormData(form);

        // You can send the form data to the server for processing (AJAX or form POST)
        fetch(form.action, {
            method: "POST",
            body: formData,
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    alert("Cập nhật hồ sơ thành công!");
                } else {
                    alert("Cập nhật hồ sơ thất bại!");
                }
            })
            .catch((error) => {
                console.error("Error:", error);
            });
    });
});
