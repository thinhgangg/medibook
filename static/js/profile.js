document.addEventListener('DOMContentLoaded', () => {
    const $ = (s, p=document) => p.querySelector(s);

    const panel = $('#editPanel');
    const btnEditProfile = $('#btnEditProfile');
    const btnClose = $('#btnClose');
    const btnCancel = $('#btnCancel');
    const btnSave = $('#profileForm');

    panel.style.display = 'none';

    btnEditProfile.addEventListener('click', () => {
        panel.style.display = 'flex'; // Hiển thị panel
    });

    btnClose.addEventListener('click', () => {
        panel.style.display = 'none';
    });

    btnCancel.addEventListener('click', () => {
        panel.style.display = 'none';
    });

    $('#inpAvatar').addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        $('#avatarPreview').src = url;
    });

    // Lưu các thay đổi khi người dùng nhấn "Lưu thay đổi"
    $('#profileForm').addEventListener('submit', (e) => {
        e.preventDefault();

        $('#viewNameValue').textContent = $('#inpName').value.trim(); // Cập nhật Họ và tên
        $('#viewTitleValue').textContent = $('#inpTitle').value.trim(); // Cập nhật Chức vụ
        $('#viewEmail').textContent = $('#inpEmail').value.trim();
        $('#viewEmail').href = 'mailto:' + $('#inpEmail').value.trim();
        $('#viewPhone').textContent = $('#inpPhone').value.trim();
        $('#viewPhone').href = 'tel:' + $('#inpPhone').value.trim();
        $('#viewAddress').textContent = $('#inpAddress').value.trim();
        $('#viewBio').textContent = $('#inpBio').value.trim();

        const skills = $('#inpSkills').value.split(',')
            .map(s => s.trim()).filter(Boolean)
            .map(s => `<li>${s}</li>`).join('');
        $('#viewSkills').innerHTML = skills || '<li>Đang cập nhật</li>';

        panel.style.display = 'none'; // Ẩn panel sau khi lưu thay đổi
    });
});
