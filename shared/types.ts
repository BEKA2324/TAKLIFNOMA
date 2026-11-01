export type InvitationType = 'date' | 'proposal' | 'apology' | 'custom';
export type ResponseChoice = 'yes' | 'no';
export interface InvitationInput {
  type: InvitationType;
  sender: string;
  recipient: string;
  title: string;
  message: string;
  date: string;
  place: string;
  timezone: string;
  latitude: number | null;
  longitude: number | null;
}
export interface Invitation extends InvitationInput {
  id: string;
  response: ResponseChoice | 'pending';
}
export interface StoredInvitation extends Invitation {
  secret: string;
}
export interface LocationSelection {
  lat: number;
  lng: number;
  name?: string;
}
export interface PlaceResult extends LocationSelection {
  name: string;
}
export interface BotConfig {
  botName: string;
}
export interface CreatedInvitation {
  id: string;
  secret: string;
}
