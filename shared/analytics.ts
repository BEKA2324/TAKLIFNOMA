export interface AnalyticsSummary {
  persistent?: boolean;
  previousSnapshot?: {
    visits: number;
    visitors: number;
    botUsers: number;
    invitations: number;
    subscribers: number;
  };
  site: {
    visits: number;
    visitors: number;
    todayVisits: number;
    todayVisitors: number;
    online: number;
  };
  bot: { users: number; today: number; recent: number; subscribers: number };
  invitations: number;
  generatedAt: string;
}
