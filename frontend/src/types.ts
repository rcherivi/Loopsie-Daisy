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
  explanation?: {
    keyword_matches?: string[];
    shared_dimensions?: {
      dim: number;
      score: number;
      words: string[];
    }[];
    top_dimension?: {
      dim: number;
      words: string[];
    };
  };
  user_vote?: "up" | "down" | null;
}
