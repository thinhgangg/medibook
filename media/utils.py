# media/utils.py
def cloud_thumb(file_field, w=200, h=200, crop="fill", gravity="face", radius=None):
    """
    Trả 1 URL thumbnail Cloudinary cho file_field (CloudinaryField hoặc ImageField dùng Cloudinary storage).
    Fallback về .url nếu không có cloudinary hoặc public_id.
    """
    if not file_field:
        return None

    try:
        from cloudinary.utils import cloudinary_url
    except Exception:
        return getattr(file_field, "url", None)

    public_id = getattr(file_field, "public_id", None) or getattr(file_field, "name", None)
    if not public_id:
        return getattr(file_field, "url", None)

    options = {
        "width": w, "height": h,
        "crop": crop, "gravity": gravity,
        "secure": True,
        "fetch_format": "auto",
        "quality": "auto",
    }
    if radius is not None:
        options["radius"] = radius

    url, _ = cloudinary_url(public_id, **options)
    return url


def cloud_thumbs(file_field, sizes=None):
    """
    Trả dict nhiều size: {"small": url, "large": url, ...}
    sizes: dict tên -> (w, h). Mặc định: small=64, large=400.
    """
    if not sizes:
        sizes = {"small": (64, 64), "large": (400, 400)}

    out = {}
    for name, (w, h) in sizes.items():
        out[name] = cloud_thumb(file_field, w=w, h=h, crop="fill", gravity="face")
    return out
