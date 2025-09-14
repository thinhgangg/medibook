class FormValidator {
    constructor() {
        this.rules = {
            name: {
                minLength: 2,
                pattern: /^[a-zA-ZÀ-ỹ\s]+$/,
                message: "Tên không hợp lệ",
            },
            email: {
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: "Vui lòng nhập email hợp lệ",
            },
            password: {
                minLength: 8,
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                message: "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt",
            },
            confirm_password: {
                message: "Mật khẩu xác nhận không khớp",
            },
            phone: {
                pattern: /^(0[3|5|7|8|9])+([0-9]{8})$/,
                message: "Số điện thoại không hợp lệ",
            },
            id: {
                pattern: /^[0-9]{9,12}$/,
                message: "CMND/CCCD phải có 9-12 chữ số",
            },
            otp: {
                pattern: /^[0-9]{6}$/,
                message: "Mã OTP phải có 6 chữ số",
            },
            insurance_no: {
                pattern: /^[0-9]{10,15}$/,
                message: "Mã thẻ BHYT phải có 10-15 chữ số",
            },
            ethnicity: {
                minLength: 2,
                pattern: /^[a-zA-ZÀ-ỹ\s]+$/,
                message: "Dân tộc không hợp lệ",
            },
            address_detail: {
                minLength: 2,
                pattern: /^[a-zA-ZÀ-ỹ0-9\s]+$/,
                message: "Địa chỉ không hợp lệ",
            },
            occupation: {
                minLength: 2,
                pattern: /^[a-zA-ZÀ-ỹ\s]+$/,
                message: "Nghề nghiệp không hợp lệ",
            },
        };

        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        document.addEventListener("input", (e) => {
            if (e.target.hasAttribute("data-validate")) {
                this.validateField(e.target);

                if (e.target.getAttribute("data-validate") === "password") {
                    const confirmField = document.querySelector('input[data-validate="confirm-password"]');
                    if (confirmField && confirmField.value.trim() !== "") {
                        this.validateField(confirmField);
                    }
                }

                if (e.target.getAttribute("data-validate") === "confirm-password") {
                    this.validateField(e.target);
                }
            }
        });

        document.addEventListener("submit", (e) => {
            if (e.target.hasAttribute("data-validate-form")) {
                e.preventDefault();
                this.validateForm(e.target);
            }
        });
    }

    validateField(field) {
        const validateType = field.getAttribute("data-validate");
        const value = field.value.trim();
        const errorElement = document.getElementById(this.getErrorId(field));

        let isValid = true;
        let errorMessage = "";

        if (validateType === "confirm-password") {
            const passwordField = document.querySelector('input[data-validate="password"]');
            if (!value) {
                isValid = false;
                errorMessage = "Trường này là bắt buộc";
            } else if (passwordField && value !== passwordField.value) {
                isValid = false;
                errorMessage = this.rules.confirm_password.message;
            }
        } else if (validateType === "password") {
            if (!value) {
                isValid = false;
                errorMessage = "Trường này là bắt buộc";
            } else if (!this.rules.password.pattern.test(value)) {
                isValid = false;
                errorMessage = this.rules.password.message;
            }
        } else if (validateType === "select") {
            if (!value) {
                isValid = false;
                errorMessage = "Vui lòng chọn một tùy chọn";
            }
        } else if (validateType === "date") {
            const age = this.calculateAge(new Date(value));
            if (!value) {
                isValid = false;
                errorMessage = "Vui lòng chọn ngày sinh";
            } else if (age < 16) {
                isValid = false;
                errorMessage = "Bạn phải từ 16 tuổi trở lên";
            } else if (age > 100) {
                isValid = false;
                errorMessage = "Ngày sinh không hợp lệ";
            }
        } else {
            const rule = this.rules[validateType];
            if (rule && field.required && !value) {
                isValid = false;
                errorMessage = "Trường này là bắt buộc";
            } else if (rule && value) {
                if (rule.maxLength && value.length > rule.maxLength) {
                    isValid = false;
                    errorMessage = rule.message;
                } else if (rule.minLength && value.length < rule.minLength) {
                    isValid = false;
                    errorMessage = rule.message;
                } else if (rule.pattern && !rule.pattern.test(value)) {
                    isValid = false;
                    errorMessage = rule.message;
                }
            }
        }

        // Update UI
        this.updateFieldValidation(field, errorElement, isValid, errorMessage);
        return isValid;
    }

    updateFieldValidation(field, errorElement, isValid, errorMessage) {
        if (isValid) {
            field.style.borderColor = "#10b981";
            if (errorElement) {
                errorElement.style.display = "none";
                errorElement.textContent = "";
            }
        } else {
            field.style.borderColor = "#ef4444";
            if (errorElement) {
                errorElement.style.display = "block";
                errorElement.textContent = errorMessage;
            }
        }
    }

    getErrorId(field) {
        const name = field.name;
        const errorMap = {
            email: field.closest("#register") ? "reg-email-error" : "email-error",
            password: field.closest("#password-section") ? "pass-error" : "password-error",
            confirm_password: "confirm-pass-error",
            otp: "otp-error",
            full_name: "full-name-error",
            phone_number: "phone-error",
            dob: "dob-error",
            id_number: "id-error",
            ethnicity: "ethnicity-error",
            insurance_no: "insurance-error",
            city: "city-error",
            district: "district-error",
            ward: "ward-error",
            address_detail: "address-error",
            occupation: "occupation-error",
        };
        return errorMap[name] || `${name}-error`;
    }

    calculateAge(birthDate) {
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }

    validateForm(form) {
        const fields = form.querySelectorAll("[data-validate]");
        let isValid = true;

        fields.forEach((field) => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        return isValid;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    new FormValidator();
});
