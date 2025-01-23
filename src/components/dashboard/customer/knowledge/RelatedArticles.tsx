import Link from 'next/link';

interface Article {
  article_id: string;
  title: string;
  read_time: number;
}

interface RelatedArticlesProps {
  articles: Article[];
}

export default function RelatedArticles({ articles }: RelatedArticlesProps) {
  if (articles.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Related Articles</h3>
      <div className="space-y-4">
        {articles.map((article) => (
          <Link
            key={article.article_id}
            href={`/dashboard/customer/knowledge/articles/${article.article_id}`}
            className="block hover:bg-gray-700 p-3 rounded-lg transition-colors"
          >
            <h4 className="text-white font-medium mb-1">{article.title}</h4>
            <p className="text-sm text-gray-400">{article.read_time} min read</p>
          </Link>
        ))}
      </div>
    </div>
  );
} 