import type { InvitationType } from './types.ts';

export const creatorCredit = 'BEKA tomonidan yaratilgan';
export const invitationContent: Record<
  InvitationType,
  {
    label: string;
    heading: string;
    icon: string;
    mapLabel: string;
    menu: string;
  }
> = {
  date: {
    label: 'Uchrashuv taklifnomasi',
    heading: 'UCHRASHUVGA TAKLIF',
    icon: '♡',
    mapLabel: 'Uchrashuv joyi',
    menu: '♡ Uchrashuv',
  },
  proposal: {
    label: 'Turmush taklifi',
    heading: 'BIR UMRLIK TAKLIF',
    icon: '💍',
    mapLabel: 'Taklif manzili',
    menu: '💍 Turmush taklifi',
  },
  apology: {
    label: 'Kechirim maktubi',
    heading: 'YURAKDAN KECHIRIM',
    icon: '🌿',
    mapLabel: 'Suhbat manzili',
    menu: '🌿 Kechirim maktubi',
  },
  custom: {
    label: 'Maxsus taklifnoma',
    heading: 'SIZ UCHUN MAXSUS TAKLIF',
    icon: '✦',
    mapLabel: 'Tadbir manzili',
    menu: '✦ Boshqa taklifnoma',
  },
};
