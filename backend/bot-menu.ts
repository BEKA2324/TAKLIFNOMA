import type { InvitationType } from '../shared/types.ts';
import { publicBaseUrl } from './config.ts';

// Verified animated custom emoji IDs supplied by Telegram's topic-icon API.
export const botIcons = {
  date: { emoji: '❤️', id: '5312138559556164615' },
  proposal: { emoji: '💎', id: '5309958691854754293' },
  apology: { emoji: '❤️', id: '5312138559556164615' },
  custom: { emoji: '🎉', id: '5310228579009699834' },
};
export function websiteButton(url = publicBaseUrl()) {
  return {
    text: 'Saytga kirish',
    icon_custom_emoji_id: '5350554349074391003',
    style: 'primary',
    url,
  };
}
export function navigation(mode: 'inline' | 'keyboard') {
  const labels: Record<InvitationType, string> = {
    date: 'Uchrashuv',
    proposal: 'Turmush taklifi',
    apology: 'Kechirim maktubi',
    custom: 'Boshqa taklifnoma',
  };
  const button = (type: InvitationType) => ({
    text: labels[type],
    icon_custom_emoji_id: botIcons[type].id,
    url: publicBaseUrl() + '/?type=' + type,
  });
  const rows = [
    [websiteButton()],
    [button('date'), button('proposal')],
    [button('apology'), button('custom')],
  ];
  if (mode === 'inline') return { inline_keyboard: rows };
  return {
    keyboard: rows.map((row) => row.map(({ url, ...rest }) => ({ ...rest, web_app: { url } }))),
    resize_keyboard: true,
    is_persistent: true,
  };
}
