
export interface ClickableItem {
  id: string;
  title: string;
  image: string;
}

export interface HandData {
  cursor: {
    x: number;
    y: number;
  };
  isPinching: boolean;
}
