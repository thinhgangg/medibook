# doctors/validators.py
from django.core.exceptions import ValidationError

def validate_avatar(file_obj, max_mb=5, allowed_exts=("jpg","jpeg","png","webp")):
    size_mb = file_obj.size / (1024 * 1024)
    if size_mb > max_mb:
        raise ValidationError(f"Ảnh tối đa {max_mb}MB.")
    ext = (file_obj.name.rsplit(".", 1)[-1] or "").lower()
    if ext not in allowed_exts:
        raise ValidationError(f"Định dạng không hỗ trợ: .{ext}")
