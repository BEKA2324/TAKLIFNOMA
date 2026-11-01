export interface AnalyticsSummary {
  persistent?: boolean;
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
