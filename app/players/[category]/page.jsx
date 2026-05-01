import Link from 'next/link';
import Navbar from '../../../components/Navbar';

export default function PlayerCategory({ params }) {
  // This would normally come from a database or API
  const categoryData = {
    'goalkeeper': {
      name: 'Goalkeepers',
      icon: '🥅',
      description: 'The last line of defense, responsible for preventing goals and organizing the defense.',
      totalPlayers: 16,
      basePrice: 15000,
      players: [
        { name: 'Alisson Becker', age: 30, nationality: 'Brazil', price: 28000, team: 'Fire Cats', saves: 45, cleanSheets: 8 },
        { name: 'Manuel Neuer', age: 37, nationality: 'Germany', price: 25000, team: 'Thunder', saves: 38, cleanSheets: 6 },
        { name: 'Thibaut Courtois', age: 31, nationality: 'Belgium', price: 26000, team: 'Storm', saves: 42, cleanSheets: 7 },
        { name: 'Ederson', age: 30, nationality: 'Brazil', price: 24000, team: 'Lions', saves: 35, cleanSheets: 5 },
        { name: 'Jan Oblak', age: 31, nationality: 'Slovenia', price: 27000, team: 'Eagles', saves: 48, cleanSheets: 9 },
        { name: 'Marc-André ter Stegen', age: 32, nationality: 'Germany', price: 23000, team: 'Tigers', saves: 40, cleanSheets: 6 },
        { name: 'Gianluigi Donnarumma', age: 25, nationality: 'Italy', price: 22000, team: 'Wolves', saves: 36, cleanSheets: 5 },
        { name: 'Keylor Navas', age: 37, nationality: 'Costa Rica', price: 20000, team: 'Phoenix', saves: 33, cleanSheets: 4 }
      ]
    },
    'defender': {
      name: 'Defenders',
      icon: '🛡️',
      description: 'The backbone of the team, responsible for stopping attacks and building play from the back.',
      totalPlayers: 40,
      basePrice: 12000,
      players: [
        { name: 'Virgil van Dijk', age: 32, nationality: 'Netherlands', price: 30000, team: 'Fire Cats', tackles: 65, interceptions: 45 },
        { name: 'Sergio Ramos', age: 38, nationality: 'Spain', price: 28000, team: 'Thunder', tackles: 58, interceptions: 38 },
        { name: 'Kalidou Koulibaly', age: 33, nationality: 'Senegal', price: 26000, team: 'Storm', tackles: 62, interceptions: 42 },
        { name: 'Ruben Dias', age: 27, nationality: 'Portugal', price: 29000, team: 'Lions', tackles: 60, interceptions: 48 },
        { name: 'Marquinhos', age: 30, nationality: 'Brazil', price: 27000, team: 'Eagles', tackles: 55, interceptions: 40 },
        { name: 'Antonio Rudiger', age: 31, nationality: 'Germany', price: 25000, team: 'Tigers', tackles: 58, interceptions: 35 },
        { name: 'Joao Cancelo', age: 30, nationality: 'Portugal', price: 24000, team: 'Wolves', tackles: 45, interceptions: 52 },
        { name: 'Andrew Robertson', age: 30, nationality: 'Scotland', price: 23000, team: 'Phoenix', tackles: 48, interceptions: 38 }
      ]
    },
    'midfielder': {
      name: 'Midfielders',
      icon: '⚽',
      description: 'The engine of the team, controlling the tempo and linking defense with attack.',
      totalPlayers: 48,
      basePrice: 18000,
      players: [
        { name: 'Kevin De Bruyne', age: 33, nationality: 'Belgium', price: 35000, team: 'Fire Cats', goals: 12, assists: 18 },
        { name: 'Luka Modric', age: 39, nationality: 'Croatia', price: 32000, team: 'Thunder', goals: 8, assists: 15 },
        { name: 'N\'Golo Kante', age: 33, nationality: 'France', price: 28000, team: 'Storm', goals: 4, assists: 8 },
        { name: 'Bruno Fernandes', age: 30, nationality: 'Portugal', price: 30000, team: 'Lions', goals: 15, assists: 12 },
        { name: 'Pedri', age: 21, nationality: 'Spain', price: 26000, team: 'Eagles', goals: 6, assists: 14 },
        { name: 'Casemiro', age: 32, nationality: 'Brazil', price: 25000, team: 'Tigers', goals: 5, assists: 6 },
        { name: 'Jude Bellingham', age: 21, nationality: 'England', price: 33000, team: 'Wolves', goals: 14, assists: 10 },
        { name: 'Frenkie de Jong', age: 27, nationality: 'Netherlands', price: 27000, team: 'Phoenix', goals: 7, assists: 11 }
      ]
    },
    'forward': {
      name: 'Forwards',
      icon: '🎯',
      description: 'The goal scorers and playmakers, responsible for creating and finishing scoring opportunities.',
      totalPlayers: 32,
      basePrice: 20000,
      players: [
        { name: 'Erling Haaland', age: 24, nationality: 'Norway', price: 45000, team: 'Fire Cats', goals: 28, assists: 8 },
        { name: 'Kylian Mbappe', age: 25, nationality: 'France', price: 43000, team: 'Thunder', goals: 26, assists: 12 },
        { name: 'Mohamed Salah', age: 32, nationality: 'Egypt', price: 38000, team: 'Storm', goals: 22, assists: 15 },
        { name: 'Robert Lewandowski', age: 35, nationality: 'Poland', price: 35000, team: 'Lions', goals: 24, assists: 6 },
        { name: 'Vinicius Jr', age: 24, nationality: 'Brazil', price: 40000, team: 'Eagles', goals: 20, assists: 14 },
        { name: 'Harry Kane', age: 31, nationality: 'England', price: 36000, team: 'Tigers', goals: 25, assists: 9 },
        { name: 'Sadio Mane', age: 32, nationality: 'Senegal', price: 32000, team: 'Wolves', goals: 18, assists: 11 },
        { name: 'Karim Benzema', age: 36, nationality: 'France', price: 34000, team: 'Phoenix', goals: 21, assists: 13 }
      ]
    }
  };

  const category = categoryData[params.category] || categoryData['goalkeeper'];

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#0A0D13' }}>
      <Navbar />

      {/* Header */}
      <section className="pt-32 pb-16" style={{ backgroundColor: '#0A0D13' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center mb-8">
            <Link href="/" className="text-gray-400 hover:text-white transition-colors mr-4">
              ← Back to Home
            </Link>
          </div>
          
          <div className="text-center">
            <div className="text-8xl mb-6">{category.icon}</div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
              {category.name}
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              {category.description}
            </p>
            
            <div className="flex justify-center space-x-8 text-center">
              <div>
                <div className="text-3xl font-bold text-[#D0620D]">{category.totalPlayers}</div>
                <div className="text-gray-300">Available Players</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-[#D0620D]">₹{category.basePrice.toLocaleString()}</div>
                <div className="text-gray-300">Base Price</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Players Grid */}
      <section className="py-16" style={{ backgroundColor: '#0A0D13' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {category.players.map((player, index) => (
              <div key={index} className="border border-gray-700 rounded-xl p-6 hover:border-[#D0620D] transition-all duration-300 hover:scale-105" style={{ backgroundColor: '#0A0D13' }}>
                <div className="text-center mb-4">
                  <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">⚽</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{player.name}</h3>
                  <div className="flex justify-center space-x-2 mb-3">
                    <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded text-xs">
                      Age: {player.age}
                    </span>
                    <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded text-xs">
                      {player.nationality}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Team:</span>
                    <span className="text-white font-semibold">{player.team}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Price:</span>
                    <span className="text-[#D0620D] font-bold">₹{player.price.toLocaleString()}</span>
                  </div>
                  
                  {/* Position-specific stats */}
                  {params.category === 'goalkeeper' && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Saves:</span>
                        <span className="text-white">{player.saves}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Clean Sheets:</span>
                        <span className="text-white">{player.cleanSheets}</span>
                      </div>
                    </>
                  )}
                  
                  {params.category === 'defender' && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Tackles:</span>
                        <span className="text-white">{player.tackles}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Interceptions:</span>
                        <span className="text-white">{player.interceptions}</span>
                      </div>
                    </>
                  )}
                  
                  {(params.category === 'midfielder' || params.category === 'forward') && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Goals:</span>
                        <span className="text-white">{player.goals}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Assists:</span>
                        <span className="text-white">{player.assists}</span>
                      </div>
                    </>
                  )}
                </div>
                
                <button className="w-full mt-4 bg-[#D0620D] text-white py-2 rounded-lg font-semibold hover:bg-[#B8540B] transition-colors">
                  View Details
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Category Navigation */}
      <section className="py-16" style={{ backgroundColor: '#0A0D13' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">Explore Other Positions</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { name: 'Goalkeepers', category: 'goalkeeper', icon: '🥅', count: 16 },
              { name: 'Defenders', category: 'defender', icon: '🛡️', count: 40 },
              { name: 'Midfielders', category: 'midfielder', icon: '⚽', count: 48 },
              { name: 'Forwards', category: 'forward', icon: '🎯', count: 32 }
            ].filter(pos => pos.category !== params.category).map((position, index) => (
              <Link key={index} href={`/players/${position.category}`} className="block">
                <div className="text-center p-6 border border-gray-700 rounded-xl hover:border-[#D0620D] transition-all duration-300 hover:scale-105 cursor-pointer" style={{ backgroundColor: '#0A0D13' }}>
                  <div className="text-4xl mb-4">{position.icon}</div>
                  <h3 className="text-xl font-bold text-white mb-2">{position.name}</h3>
                  <p className="text-gray-300">{position.count} Available</p>
                </div>
              </Link>
            ))}
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
