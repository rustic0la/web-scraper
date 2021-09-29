export interface Chapter {
  chapter: string;
  topics: { title: string; link: string }[];
}

export interface CourseUrl {
  url: string;
  isSpec: boolean;
}
