import type { StoredInvitation } from '../shared/types.ts';
import type { SKRSContext2D } from '@napi-rs/canvas';
import { createCanvas } from '@napi-rs/canvas';
import { formatDate } from '../shared/time.ts';
import { invitationContent, creatorCredit } from '../shared/invitation-content.ts';
function wrap(ctx: SKRSContext2D, text: string, width: number) {
  const lines = [];
  for (const paragraph of String(text).split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      if (ctx.measureText(line + (line ? ' ' : '') + word).width <= width) {
        line += (line ? ' ' : '') + word;
        continue;
      }
      if (line) lines.push(line);
      line = '';
      for (const ch of word) {
        if (ctx.measureText(line + ch).width > width) {
          lines.push(line);
          line = '';
        }
        line += ch;
      }
    }
    lines.push(line);
  }
  return lines;
}
export async function renderPaper(item: StoredInvitation) {
  const width = 1200,
    measure = createCanvas(width, 100).getContext('2d');
  measure.font = 'italic 66px Georgia, serif';
  const title = wrap(measure, item.title, 890);
  measure.font = 'italic 37px Georgia, serif';
  const message = wrap(measure, item.message, 850);
  measure.font = '28px Georgia, serif';
  const place = wrap(measure, item.place || '', 850);
  measure.font = 'italic 35px Georgia, serif';
  const recipient = wrap(measure, `${item.recipient} uchun`, 850),
    signature = wrap(measure, `Mehr bilan, ${item.sender}`, 850);
  const height = Math.max(
    1600,
    900 +
      title.length * 82 +
      message.length * 57 +
      place.length * 42 +
      (recipient.length + signature.length) * 48,
  );
  const canvas = createCanvas(width, height),
    ctx = canvas.getContext('2d');
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#fff8ea');
  bg.addColorStop(0.5, '#f5ebdb');
  bg.addColorStop(1, '#eadbca');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  let seed = 42;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 20000; i++) {
    ctx.fillStyle = `rgba(111,78,54,${rnd() * 0.04})`;
    ctx.fillRect(rnd() * width, rnd() * height, 1 + rnd() * 2, 1);
  }
  ctx.strokeStyle = '#b9977860';
  ctx.lineWidth = 2;
  ctx.strokeRect(62, 62, width - 124, height - 124);
  ctx.strokeStyle = '#b9977830';
  ctx.strokeRect(75, 75, width - 150, height - 150);
  ctx.fillStyle = '#a26774';
  ctx.textAlign = 'center';
  ctx.font = 'italic 50px Georgia, serif';
  ctx.fillText('luma', width / 2, 155);
  ctx.font = '23px Georgia, serif';
  ctx.fillText(invitationContent[item.type].heading, width / 2, 205);
  let y = 300;
  ctx.fillStyle = '#875b65';
  ctx.font = 'italic 35px Georgia, serif';
  for (const line of recipient) {
    ctx.fillText(line, width / 2, y);
    y += 48;
  }
  y += 45;
  ctx.fillStyle = '#633a48';
  ctx.font = 'italic 66px Georgia, serif';
  for (const line of title) {
    ctx.fillText(line, width / 2, y);
    y += 82;
  }
  y += 25;
  ctx.strokeStyle = '#b68a7960';
  ctx.beginPath();
  ctx.moveTo(420, y);
  ctx.lineTo(780, y);
  ctx.stroke();
  y += 70;
  ctx.fillStyle = '#725959';
  ctx.font = 'italic 37px Georgia, serif';
  for (const line of message) {
    ctx.fillText(line, width / 2, y);
    y += 57;
  }
  y += 55;
  ctx.fillStyle = '#815b64';
  ctx.font = '28px Georgia, serif';
  if (item.date) {
    ctx.fillText(formatDate(item.date, item.timezone || 'Asia/Tashkent'), width / 2, y);
    y += 43;
    ctx.font = '23px Georgia, serif';
    ctx.fillText(item.timezone || 'Asia/Tashkent', width / 2, y);
    y += 50;
  }
  ctx.font = '28px Georgia, serif';
  for (const line of place) {
    ctx.fillText(line, width / 2, y);
    y += 42;
  }
  y += 70;
  ctx.fillStyle = '#875b65';
  ctx.font = 'italic 35px Georgia, serif';
  for (const line of signature) {
    ctx.fillText(line, width / 2, y);
    y += 48;
  }
  const sealY = Math.max(y + 70, height - 165);
  ctx.fillStyle = '#993c56';
  ctx.beginPath();
  ctx.arc(width / 2, sealY, 43, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#edc4b580';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(width / 2, sealY, 35, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffe4d4';
  ctx.font = '32px Georgia, serif';
  ctx.fillText('L', width / 2, sealY + 12);
  ctx.fillStyle = '#926f76';
  ctx.font = '20px Georgia, serif';
  ctx.fillText(creatorCredit, width / 2, height - 96);
  return canvas.encode('png');
}
