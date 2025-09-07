from django.core.exceptions import PermissionDenied
from functools import wraps

def role_required(role):
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                raise PermissionDenied("Bạn cần đăng nhập để truy cập.")
            if request.user.role != role:
                raise PermissionDenied(f"Chỉ có vai trò {role} mới được truy cập.")
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator