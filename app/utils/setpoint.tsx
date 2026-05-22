
export type SetpointsData = {
  targets: Setpoint[];
};

export type Setpoint = {
  north_m: number;
  east_m: number;
  down_m: number;
  hover_time_ms?: number;
  yaw_deg?: number;
};

export function jsonToSetpointsData(text: string): SetpointsData {
  const data = JSON.parse(text);
  return data as SetpointsData;
}

export function setpointsDataToJson(data: SetpointsData): string {
  return JSON.stringify(data, null, 2);
}