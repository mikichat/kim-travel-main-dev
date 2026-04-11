// Image types for client-side components
// Used by ImageGrid, useImages hook, and GalleryPage

export type ImageCategory =
  | 'tour'
  | 'hotel'
  | 'destination'
  | 'activity'
  | 'food'
  | 'transport';

export interface ImageAsset {
  id: string;
  filename: string;
  url: string;
  thumbnailUrl?: string;
  altText: string;
  fileSize: number;
  width?: number;
  height?: number;
  tags: string[];
  category: ImageCategory;
  mimeType?: string;
  createdAt?: string;
  uploadedAt?: string;
}
