// Separate horizontal corridors prevent crossing paths and wing collisions.
export interface FlightState {
  x: number;
  y: number;
  lane: number;
  baseY: number;
  direction: number;
  progress: number;
  vx: number;
  vy: number;
  radius: number;
  phase: number;
  speed: number;
  angle: number;
  turn: number;
}
export function createFlightStates(
  count: number,
  halfWidth: number,
  mobile: boolean,
): FlightState[] {
  const lanes = Math.min(count, 4),
    edge = Math.max(1, halfWidth) + 1.4;
  return Array.from({ length: count }, (_, i) => {
    const lane = i % lanes,
      perLane = Math.ceil((count - lane) / lanes);
    const direction = lane % 2 === 0 ? 1 : -1;
    const progress = (Math.floor(i / lanes) + 0.15) / perLane;
    return {
      x: direction * ((progress * 2 - 1) * edge),
      y: -4.2 + lane * (8.4 / Math.max(1, lanes - 1)),
      lane,
      baseY: -4.2 + lane * (8.4 / Math.max(1, lanes - 1)),
      direction,
      progress,
      vx: direction * (1.9 + lane * 0.16),
      vy: 0,
      radius: mobile ? 0.64 : 0.86,
      phase: lane * 1.7,
      speed: 1.9 + lane * 0.16,
      angle: (direction * Math.PI) / 2,
      turn: 0,
    };
  });
}
export function stepFlights(birds: FlightState[], time: number, dt: number, halfWidth: number) {
  const edge = Math.max(1, halfWidth) + 1.4,
    span = edge * 2;
  for (const b of birds) {
    // Partners in one corridor keep identical speed and a half-screen gap.
    const speed = b.speed * (1 + 0.1 * Math.sin(time * 0.8 + b.phase));
    b.progress = (b.progress + (speed * dt) / span) % 1;
    b.x = b.direction * (b.progress * span - edge);
    b.y = b.baseY + 0.17 * Math.sin(time * 1.3 + b.phase) + 0.04 * Math.sin(time * 2.1 + b.phase);
    b.vx = b.direction * speed;
    b.vy = 0.221 * Math.cos(time * 1.3 + b.phase) + 0.084 * Math.cos(time * 2.1 + b.phase);
    const target = Math.atan2(b.vy, b.vx) + Math.PI / 2;
    const turn = Math.atan2(Math.sin(target - b.angle), Math.cos(target - b.angle));
    b.angle += turn * Math.min(dt * 6, 1);
    b.turn = turn;
  }
}
