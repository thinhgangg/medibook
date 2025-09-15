# dashboard/decorators.py

from django.core.exceptions import PermissionDenied

def role_required(role):
    """
    Decorator để yêu cầu người dùng có vai trò cụ thể (DOCTOR, PATIENT, v.v.)
    mới có thể truy cập view.
    """
    def decorator(view_func):
        def wrapper(request, *args, **kwargs):
            # Kiểm tra xem người dùng đã đăng nhập chưa
            if not request.user.is_authenticated:
                raise PermissionDenied("Bạn cần đăng nhập để truy cập.")

            # Kiểm tra vai trò người dùng
            if request.user.role != role:
                raise PermissionDenied(f"Chỉ có vai trò {role} mới được truy cập.")
            
            return view_func(request, *args, **kwargs)
        
        return wrapper
    return decorator
