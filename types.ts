
export interface GeneratedImage {
  id: string;
  url: string;
  scenario: string;
  base64: string;
  backgroundUrl?: string;
}

export enum AppState {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  EDITING = 'EDITING',
  VIEWING = 'VIEWING'
}

export enum ProductCategory {
  JEWELRY = 'JEWELRY',
  RESTAURANT = 'RESTAURANT',
  FASHION = 'FASHION'
}
