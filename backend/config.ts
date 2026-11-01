export function publicBaseUrl(): string {
  const configured = process.env.RENDER_EXTERNAL_URL || process.env.BASE_URL;
  return (
    configured?.startsWith('https://') ? configured : 'https://luma-taklifnoma.onrender.com'
  ).replace(/\/$/, '');
}
