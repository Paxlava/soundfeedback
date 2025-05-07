export interface NewsFormData {
  title: string;
  text: string;
  images: FileList;
}

export interface News {
  id?: string;
  title: string;
  text: string;
  imageUrls: string[];
  authorId: string;
  createdAt: string;
}
