export function transformCloudinary(url, opts = {}) {
  try {
    if (!url || typeof url !== 'string') return url;
    if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
    const { w, h, c = 'fill', q = 'auto', f = 'auto' } = opts;
    const trans = [f && `f_${f}`, q && `q_${q}`, w && `w_${w}`, h && `h_${h}`, c && `c_${c}`]
      .filter(Boolean)
      .join(',');
    return url.replace('/upload/', `/upload/${trans}/`);
  } catch { return url; }
}