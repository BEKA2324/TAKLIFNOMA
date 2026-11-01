import type { InvitationInput, InvitationType } from '../shared/types.ts';
import { validZone } from '../shared/time.ts';
import { ApiError, record } from './http.ts';
export function validateInvitation(value: unknown): InvitationInput {
  const input = record(value);
  const text = (name: string, max: number) => {
    const value = input[name];
    if (typeof value !== 'string' || value.length > max)
      throw new ApiError('Ma’lumotlar noto‘g‘ri');
    return value.trim();
  };
  const sender = text('sender', 80),
    recipient = text('recipient', 80),
    title = text('title', 150),
    message = text('message', 1500),
    place = text('place', 200),
    date = text('date', 50),
    type = text('type', 20);
  if (!['date', 'proposal', 'apology', 'custom'].includes(type) || !sender || !recipient || !title)
    throw new ApiError('Ismlar va sarlavhani kiriting');
  if (
    (!date && type !== 'apology') ||
    (date && (!Number.isFinite(Date.parse(date)) || Date.parse(date) <= Date.now()))
  )
    throw new ApiError('Kelajakdagi sanani kiriting');
  const timezone = input.timezone ?? 'Asia/Tashkent';
  if (typeof timezone !== 'string' || !validZone(timezone))
    throw new ApiError('Vaqt mintaqasi noto‘g‘ri');
  const latitude = input.latitude ?? null,
    longitude = input.longitude ?? null;
  if (latitude !== null || longitude !== null)
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 ||
      Math.abs(longitude) > 180
    )
      throw new ApiError('Xarita koordinatalari noto‘g‘ri');
  return {
    sender,
    recipient,
    title,
    message,
    place,
    date,
    type: type as InvitationType,
    timezone,
    latitude: latitude as number | null,
    longitude: longitude as number | null,
  };
}
