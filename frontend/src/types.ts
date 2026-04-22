export interface Pattern {
  id?: number;
  title: string;
  description: string;
  skill_level: string;
  pattern_link: string;
  final_description: string;
  image_path: string;
  score: number;
  upvotes?: number;
  downvotes?: number;
  dimension_words?: string[];
}
