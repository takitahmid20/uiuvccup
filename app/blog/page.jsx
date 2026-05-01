import Image from 'next/image';
import Link from 'next/link';
import Navbar from '../../components/Navbar';

export default function Blog() {
  const blogPosts = [
    {
      id: 1,
      title: 'UIU VC Cup 2024: Tournament Kicks Off with Record Participation',
      excerpt: 'The most anticipated football tournament of the year begins with 136 players across 8 teams competing for the championship.',
      date: 'October 10, 2024',
      category: 'Tournament News',
      readTime: '3 min read',
      featured: true
    },
    {
      id: 2,
      title: 'Auction Strategy Guide: Building Your Dream Team',
      excerpt: 'Expert tips on how to strategically bid for players and create a balanced squad within your budget constraints.',
      date: 'October 8, 2024',
      category: 'Strategy',
      readTime: '5 min read',
      featured: false
    },
    {
      id: 3,
      title: 'Player Spotlight: Top Forwards to Watch This Season',
      excerpt: 'Meet the star forwards who are expected to dominate the tournament with their goal-scoring abilities.',
      date: 'October 5, 2024',
      category: 'Player Analysis',
      readTime: '4 min read',
      featured: false
    },
    {
      id: 4,
      title: 'Live Auction Recap: Record-Breaking Bids and Surprises',
      excerpt: 'A detailed breakdown of the most exciting moments from the recent player auction session.',
      date: 'October 3, 2024',
      category: 'Auction News',
      readTime: '6 min read',
      featured: false
    },
    {
      id: 5,
      title: 'Team Analysis: Fire Cats vs Thunder - Match Preview',
      excerpt: 'In-depth analysis of the upcoming clash between two of the tournament\'s strongest teams.',
      date: 'October 1, 2024',
      category: 'Match Preview',
      readTime: '4 min read',
      featured: false
    },
    {
      id: 6,
      title: 'Technology Behind UIU VC Cup: Real-Time Updates',
      excerpt: 'How cutting-edge technology powers our live auction system and real-time match statistics.',
      date: 'September 28, 2024',
      category: 'Technology',
      readTime: '3 min read',
      featured: false
    }
  ];

  const categories = ['All', 'Tournament News', 'Strategy', 'Player Analysis', 'Auction News', 'Match Preview', 'Technology'];

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#0A0D13' }}>
      <Navbar />

      {/* Header */}
      <section className="pt-32 pb-16" style={{ backgroundColor: '#0A0D13' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Tournament <span className="text-[#D0620D]">Blog</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Stay updated with the latest news, insights, and analysis from the UIU VC Cup Football Tournament.
            </p>
          </div>
        </div>
      </section>

      {/* Categories Filter */}
      <section className="py-8" style={{ backgroundColor: '#0A0D13' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-4">
            {categories.map((category, index) => (
              <button
                key={index}
                className={`px-6 py-2 rounded-full font-medium transition-colors ${
                  index === 0 
                    ? 'bg-[#D0620D] text-white' 
                    : 'border border-gray-600 text-gray-300 hover:border-[#D0620D] hover:text-[#D0620D]'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Post */}
      <section className="py-16" style={{ backgroundColor: '#0A0D13' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-white mb-8">Featured Article</h2>
            {blogPosts.filter(post => post.featured).map((post) => (
              <div key={post.id} className="border border-gray-700 rounded-2xl overflow-hidden hover:border-[#D0620D] transition-colors">
                <div className="grid lg:grid-cols-2 gap-8 p-8">
                  <div>
                    <div className="flex items-center space-x-4 mb-4">
                      <span className="bg-[#D0620D] text-white px-3 py-1 rounded-full text-sm font-medium">
                        {post.category}
                      </span>
                      <span className="text-gray-400 text-sm">{post.date}</span>
                      <span className="text-gray-400 text-sm">{post.readTime}</span>
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-4">{post.title}</h3>
                    <p className="text-gray-300 mb-6 text-lg leading-relaxed">{post.excerpt}</p>
                    <Link href={`/blog/${post.id}`} className="inline-flex items-center space-x-2 text-[#D0620D] font-semibold hover:underline">
                      <span>Read Full Article</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="w-full h-64 bg-gray-800 rounded-xl flex items-center justify-center border border-gray-700">
                      <div className="text-6xl">📰</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Posts */}
      <section className="py-16" style={{ backgroundColor: '#0A0D13' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-8">Recent Articles</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.filter(post => !post.featured).map((post) => (
              <Link key={post.id} href={`/blog/${post.id}`} className="block">
                <div className="border border-gray-700 rounded-xl p-6 hover:border-[#D0620D] transition-all duration-300 hover:scale-105 cursor-pointer" style={{ backgroundColor: '#0A0D13' }}>
                  <div className="w-full h-48 bg-gray-800 rounded-lg flex items-center justify-center mb-6 border border-gray-700">
                    <div className="text-4xl">📝</div>
                  </div>
                  
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded text-xs font-medium">
                      {post.category}
                    </span>
                    <span className="text-gray-400 text-xs">{post.readTime}</span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-3 line-clamp-2">{post.title}</h3>
                  <p className="text-gray-300 mb-4 line-clamp-3">{post.excerpt}</p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">{post.date}</span>
                    <span className="text-[#D0620D] font-semibold text-sm">Read More →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="py-16" style={{ backgroundColor: '#0A0D13' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="border border-gray-700 rounded-2xl p-12" style={{ backgroundColor: '#0A0D13' }}>
            <h2 className="text-3xl font-bold text-white mb-4">Stay Updated</h2>
            <p className="text-xl text-gray-300 mb-8">
              Subscribe to our newsletter for the latest tournament updates, match results, and exclusive insights.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-[#D0620D]"
              />
              <button className="bg-[#D0620D] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#B8540B] transition-colors">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-800" style={{ backgroundColor: '#0A0D13' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <Image
                src="/assets/uiuvccuplogo.png"
                alt="UIU VC Cup Logo"
                width={32}
                height={32}
                className="rounded-full"
              />
              <span className="text-lg font-bold text-[#D0620D]">
                UIU VC Cup Football Tournament
              </span>
            </div>
            <div className="text-gray-400 text-center md:text-right">
              <p>&copy; 2024 UIU VC Cup. All rights reserved.</p>
              <p className="text-sm mt-1">Built with Next.js & Firebase</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
