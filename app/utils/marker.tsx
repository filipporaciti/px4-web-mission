
export type MarkersData = {
    position: Record<number, Marker>;
    marker_length: number;
}

export type Marker = {
    x: number;
    y: number;
    z: number;
}

export function jsonToMarkersData(text: string): MarkersData {
  const data = JSON.parse(text);
  return data as MarkersData;
}