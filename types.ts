
export interface GeneratedImage {
  id: string;
  url: string;
  scenario: string;
  base64: string;
}

export enum AppState {
  IDLE = 'IDLE',
  KEY_SELECTION = 'KEY_SELECTION',
  UPLOADING = 'UPLOADING',
  GENERATING = 'GENERATING',
  EDITING = 'EDITING',
  VIEWING = 'VIEWING'
}

export enum ProductCategory {
  JEWELRY = 'JEWELRY',
  RESTAURANT = 'RESTAURANT',
  FASHION = 'FASHION'
}
