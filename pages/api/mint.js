
// Using require for CommonJS compatibility
const { fetchAndProcessMintFeed } = require('../../lib/fetchMintFeed');

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const articles = await fetchAndProcessMintFeed();
      res.status(200).json(articles);
    } catch (error) {
      console.error('[API /api/mint] Error fetching Mint feed:', error);
      res.status(500).json({ error: 'Failed to fetch Mint news feed' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
