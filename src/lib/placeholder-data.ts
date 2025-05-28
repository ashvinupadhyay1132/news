export interface Article {
  id: string;
  title: string;
  summary: string;
  date: string;
  source: string;
  category: string;
  imageUrl: string;
  link: string;
  content?: string; // Optional full content
}

export const categories: string[] = ["All", "Technology", "Business", "Sports", "Entertainment", "World News", "Science"];

const generateArticles = (category: string, count: number): Article[] => {
  const articles: Article[] = [];
  for (let i = 1; i <= count; i++) {
    articles.push({
      id: `${category.toLowerCase().replace(/\s+/g, '-')}-${i}`,
      title: `${category} Article Title ${i}: Catchy Headline Here`,
      summary: `This is a brief summary of the ${category.toLowerCase()} article number ${i}. It gives a glimpse into the main topic and entices the reader to learn more. We're talking about exciting developments and key insights.`,
      date: new Date(Date.now() - Math.random() * 10000000000).toISOString(), // Random date within last few months
      source: `Source ${String.fromCharCode(65 + (i % 5))}`, // Source A, B, C, D, E
      category: category,
      imageUrl: `https://placehold.co/600x400.png`,
      link: `/${category.toLowerCase().replace(/\s+/g, '-')}/${i}`,
      content: `This is the full content for ${category} Article ${i}. It delves deeper into the topic, providing detailed information, analysis, and perhaps some quotes or statistics. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`,
    });
  }
  return articles;
};


export const placeholderArticles: Article[] = [
  ...generateArticles("Technology", 8),
  ...generateArticles("Business", 6),
  ...generateArticles("Sports", 7),
  ...generateArticles("Entertainment", 5),
  ...generateArticles("World News", 9),
  ...generateArticles("Science", 4),
].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort by date descending

export const getArticleById = (id: string): Article | undefined => {
  return placeholderArticles.find(article => article.id === id);
};
