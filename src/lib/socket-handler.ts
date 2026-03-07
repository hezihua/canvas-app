export interface Room {
  users: Set<string>;
  canvasHistory: any[];
}

export const rooms = new Map<string, Room>();
