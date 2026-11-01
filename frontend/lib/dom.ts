interface PageElements {
  sender: HTMLInputElement;
  recipient: HTMLInputElement;
  title: HTMLInputElement;
  message: HTMLTextAreaElement;
  date: HTMLInputElement;
  place: HTMLInputElement;
  timezone: HTMLSelectElement;
  form: HTMLFormElement;
  'share-url': HTMLInputElement;
  'open-invite': HTMLAnchorElement;
  'download-paper': HTMLAnchorElement;
  'creator-bot': HTMLAnchorElement;
  telegram: HTMLAnchorElement;
  'map-link': HTMLAnchorElement;
  'map-query': HTMLInputElement;
  'map-search': HTMLButtonElement;
  heart: HTMLCanvasElement;
  'butterfly-toggle': HTMLButtonElement;
}
export function element<K extends keyof PageElements>(id: K): PageElements[K];
export function element(id: string): HTMLElement;
export function element(id: string): HTMLElement {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Element not found: ${id}`);
  return node;
}
export function query<T extends HTMLElement = HTMLElement>(
  selector: string,
  root: ParentNode = document,
): T {
  const node = root.querySelector<T>(selector);
  if (!node) throw new Error(`Element not found: ${selector}`);
  return node;
}
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Xatolik yuz berdi';
}
