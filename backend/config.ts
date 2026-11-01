export function publicBaseUrl(): string {
  return (
    process.env.RENDER_EXTERNAL_URL ||
    process.env.BASE_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}
