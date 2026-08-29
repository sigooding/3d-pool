import { useEffect, useRef, useState, useCallback } from 'react';
import { PoolGame } from './game/PoolGame';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<PoolGame | null>(null);
  const [gameState, setGameState] = useState({
    currentPlayer: 1,
    player1Group: null as 'red' | 'yellow' | null,
    player2Group: null as 'red' | 'yellow' | null,
    player1Score: 0,
    player2Score: 0,
    isBreak: true,
    message: 'Break shot - Click and drag to aim, release to shoot',
    foulMessage: '',
    gameOver: false,
    winner: null as number | null,
    isAiming: true,
    power: 0,
    cueAngle: 0,
    showRules: false,
    ballInHand: false,
    tableOpen: true,
    shotStrength: 'Tap',
    pocketedReds: [] as number[],
    pocketedYellows: [] as number[],
    eightBallPocketed: false,
    showTutorial: true,
  });

  const updateGameState = useCallback((newState: Partial<typeof gameState>) => {
    setGameState(prev => ({ ...prev, ...newState }));
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const game = new PoolGame(canvasRef.current, updateGameState);
    gameRef.current = game;
    game.init();

    return () => {
      game.dispose();
    };
  }, [updateGameState]);

  const handleResetGame = () => {
    if (gameRef.current) {
      gameRef.current.resetGame();
      setGameState({
        currentPlayer: 1,
        player1Group: null,
        player2Group: null,
        player1Score: 0,
        player2Score: 0,
        isBreak: true,
        message: 'Break shot - Click and drag to aim, release to shoot',
        foulMessage: '',
        gameOver: false,
        winner: null,
        isAiming: true,
        power: 0,
        cueAngle: 0,
        showRules: false,
        ballInHand: false,
        tableOpen: true,
        shotStrength: 'Tap',
        pocketedReds: [],
        pocketedYellows: [],
        eightBallPocketed: false,
        showTutorial: false,
      });
    }
  };

  const handleToggleRules = () => {
    setGameState(prev => ({ ...prev, showRules: !prev.showRules }));
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full" />

      {/* HUD Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none">
        <div className="flex justify-between items-start">
          {/* Player 1 Info */}
          <div className={`bg-black/70 backdrop-blur-sm rounded-lg p-4 border-2 transition-all duration-300 ${
            gameState.currentPlayer === 1 
              ? 'border-yellow-400 shadow-lg shadow-yellow-400/20' 
              : 'border-gray-600'
          }`}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                gameState.currentPlayer === 1 ? 'bg-yellow-400 animate-pulse' : 'bg-gray-600'
              }`} />
              <div className="text-yellow-400 font-bold text-lg">Player 1</div>
            </div>
            <div className="text-white text-sm mt-1">
              {gameState.player1Group ? (
                <span className="flex items-center gap-2">
                  <span className={`inline-block w-4 h-4 rounded-full ${
                    gameState.player1Group === 'red' ? 'bg-red-500' : 'bg-yellow-400'
                  }`} />
                  <span className="capitalize font-medium">{gameState.player1Group}</span>
                </span>
              ) : (
                <span className="text-gray-400">Open Table</span>
              )}
            </div>
            <div className="mt-2">
              <div className="flex items-center gap-1">
                {[...Array(7)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full ${
                      i < gameState.player1Score
                        ? gameState.player1Group === 'red' ? 'bg-red-500' : 'bg-yellow-400'
                        : 'bg-gray-700'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Game Title */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white drop-shadow-lg tracking-wider">
              ULTIMATE POOL
            </h1>
            <div className="flex items-center justify-center gap-2 mt-1">
              <div className="h-px w-12 bg-yellow-400" />
              <p className="text-yellow-400 text-sm font-medium">3D</p>
              <div className="h-px w-12 bg-yellow-400" />
            </div>
            <p className="text-gray-400 text-xs mt-1">UK International Rules</p>
          </div>

          {/* Player 2 Info */}
          <div className={`bg-black/70 backdrop-blur-sm rounded-lg p-4 border-2 transition-all duration-300 ${
            gameState.currentPlayer === 2 
              ? 'border-yellow-400 shadow-lg shadow-yellow-400/20' 
              : 'border-gray-600'
          }`}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                gameState.currentPlayer === 2 ? 'bg-yellow-400 animate-pulse' : 'bg-gray-600'
              }`} />
              <div className="text-yellow-400 font-bold text-lg">Player 2</div>
            </div>
            <div className="text-white text-sm mt-1">
              {gameState.player2Group ? (
                <span className="flex items-center gap-2">
                  <span className={`inline-block w-4 h-4 rounded-full ${
                    gameState.player2Group === 'red' ? 'bg-red-500' : 'bg-yellow-400'
                  }`} />
                  <span className="capitalize font-medium">{gameState.player2Group}</span>
                </span>
              ) : (
                <span className="text-gray-400">Open Table</span>
              )}
            </div>
            <div className="mt-2">
              <div className="flex items-center gap-1">
                {[...Array(7)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full ${
                      i < gameState.player2Score
                        ? gameState.player2Group === 'red' ? 'bg-red-500' : 'bg-yellow-400'
                        : 'bg-gray-700'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Message Bar */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="bg-black/80 backdrop-blur-sm rounded-lg px-6 py-3 text-center min-w-[300px]">
          <p className="text-white font-medium">{gameState.message}</p>
          {gameState.foulMessage && (
            <p className="text-red-400 text-sm mt-1 animate-pulse">{gameState.foulMessage}</p>
          )}
          {gameState.ballInHand && (
            <p className="text-green-400 text-sm mt-1 animate-pulse">
              Ball in Hand - Click in baulk to place cue ball
            </p>
          )}
          {gameState.tableOpen && !gameState.isBreak && (
            <p className="text-blue-400 text-xs mt-1">Table Open - Pot any ball to claim group</p>
          )}
        </div>
      </div>

      {/* Pocketed Balls Tracker */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="flex items-center gap-4 bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2">
          {/* Red balls pocketed */}
          <div className="flex items-center gap-1">
            <span className="text-red-400 text-xs font-medium mr-1">Red:</span>
            {[...Array(7)].map((_, i) => (
              <div
                key={`red-${i}`}
                className={`w-4 h-4 rounded-full border ${
                  i < gameState.player1Score && gameState.player1Group === 'red' ||
                  i < gameState.player2Score && gameState.player2Group === 'red'
                    ? 'bg-red-500 border-red-400'
                    : 'bg-gray-800 border-gray-600'
                }`}
              />
            ))}
          </div>
          
          {/* Eight ball */}
          <div className={`w-5 h-5 rounded-full border-2 ${
            gameState.eightBallPocketed 
              ? 'bg-black border-yellow-400' 
              : 'bg-gray-800 border-gray-600'
          }`}>
            <span className="text-[8px] text-white flex items-center justify-center h-full">8</span>
          </div>
          
          {/* Yellow balls pocketed */}
          <div className="flex items-center gap-1">
            <span className="text-yellow-400 text-xs font-medium mr-1">Yellow:</span>
            {[...Array(7)].map((_, i) => (
              <div
                key={`yellow-${i}`}
                className={`w-4 h-4 rounded-full border ${
                  i < gameState.player1Score && gameState.player1Group === 'yellow' ||
                  i < gameState.player2Score && gameState.player2Group === 'yellow'
                    ? 'bg-yellow-400 border-yellow-300'
                    : 'bg-gray-800 border-gray-600'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Power Meter */}
      {gameState.isAiming && !gameState.ballInHand && (
        <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none">
          <div className="bg-black/70 rounded-lg p-3 w-12 h-64">
            <div className="relative h-full bg-gray-700 rounded-full overflow-hidden">
              <div
                className="absolute bottom-0 left-0 right-0 transition-all duration-100"
                style={{
                  height: `${gameState.power}%`,
                  background: `linear-gradient(to top, #22c55e, #eab308, #ef4444)`,
                }}
              />
            </div>
            <div className="text-white text-xs text-center mt-2 font-bold">
              {gameState.shotStrength}
            </div>
          </div>
        </div>
      )}

      {/* Controls Help */}
      <div className="absolute bottom-4 left-4 pointer-events-none">
        <div className="bg-black/70 backdrop-blur-sm rounded-lg p-3 text-xs text-gray-300">
          <p className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 bg-gray-600 rounded text-center text-[10px]">🖱</span>
            Aim cue
          </p>
          <p className="flex items-center gap-2 mt-1">
            <span className="inline-block w-4 h-4 bg-gray-600 rounded text-center text-[10px]">⬆</span>
            Hold & Release: Shoot
          </p>
          <p className="flex items-center gap-2 mt-1">
            <span className="inline-block w-4 h-4 bg-gray-600 rounded text-center text-[10px]">📷</span>
            Right Click: Camera
          </p>
          <p className="flex items-center gap-2 mt-1">
            <span className="inline-block w-4 h-4 bg-gray-600 rounded text-center text-[10px]">🔍</span>
            Scroll: Zoom
          </p>
        </div>
      </div>

      {/* Buttons */}
      <div className="absolute bottom-4 right-4 flex gap-2 pointer-events-auto">
        <button
          onClick={() => setGameState(prev => ({ ...prev, showTutorial: true }))}
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <span>❓</span> Help
        </button>
        <button
          onClick={handleToggleRules}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <span>📖</span> Rules
        </button>
        <button
          onClick={handleResetGame}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <span>🔄</span> New Game
        </button>
      </div>

      {/* Game Over Modal */}
      {gameState.gameOver && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center pointer-events-auto">
          <div className="bg-gradient-to-b from-gray-900 to-gray-800 rounded-2xl p-8 text-center border-2 border-yellow-400 max-w-md">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-4xl font-bold text-yellow-400 mb-2">Game Over!</h2>
            <div className="h-px w-32 bg-yellow-400/50 mx-auto my-4" />
            <p className="text-2xl text-white mb-2">
              Player {gameState.winner} Wins!
            </p>
            <p className="text-gray-400 mb-6">
              {gameState.foulMessage || 'Congratulations!'}
            </p>
            <button
              onClick={handleResetGame}
              className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black px-8 py-3 rounded-lg text-lg font-bold transition-all transform hover:scale-105"
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* Rules Modal */}
      {gameState.showRules && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center pointer-events-auto">
          <div className="bg-gray-900 rounded-2xl p-8 max-w-2xl max-h-[80vh] overflow-y-auto border border-gray-600">
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">UK International Pool Rules</h2>
            <div className="text-gray-300 space-y-3 text-sm">
              <p><strong className="text-white">Objective:</strong> Pot all 7 balls of your group (red or yellow), then legally pot the 8-ball (black).</p>
              <p><strong className="text-white">Break:</strong> Legal if you pot a ball or drive at least 3 object balls to a cushion. Anything less is a foul.</p>
              <p><strong className="text-white">Groups:</strong> Not decided on the break. First legally potted ball after break determines groups.</p>
              <p><strong className="text-white">Legal Shot:</strong> Cue ball must first contact a ball of your own group (or any ball if table is open).</p>
              <p><strong className="text-white">Fouls:</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Potting the cue ball (in-off)</li>
                <li>Hitting opponent's ball first</li>
                <li>No ball hitting a cushion after contact</li>
                <li>Illegal break (nothing potted and fewer than 3 balls to a cushion)</li>
                <li>Potting the 8-ball before clearing your group</li>
              </ul>
              <p><strong className="text-white">Ball in Hand:</strong> After a foul, opponent gets cue ball in hand (place anywhere behind the baulk line).</p>
              <p><strong className="text-white">8-Ball:</strong> Must be potted in a separate shot after clearing your group. Potting it early = loss.</p>
            </div>
            <button
              onClick={handleToggleRules}
              className="mt-6 bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Tutorial Modal */}
      {gameState.showTutorial && (
        <div className="absolute inset-0 bg-black/95 flex items-center justify-center pointer-events-auto">
          <div className="bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-8 max-w-lg border border-yellow-400/30 shadow-2xl shadow-yellow-400/10">
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">🎱</div>
              <h2 className="text-4xl font-bold text-yellow-400 mb-2 tracking-wider">ULTIMATE POOL</h2>
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="h-px w-20 bg-gradient-to-r from-transparent to-yellow-400/50" />
                <span className="text-yellow-400 text-lg font-light">3D</span>
                <div className="h-px w-20 bg-gradient-to-l from-transparent to-yellow-400/50" />
              </div>
              <p className="text-gray-400 text-sm">UK International Rules</p>
            </div>
            
            <div className="space-y-5 text-gray-300 mb-8">
              <div className="bg-gray-800/50 rounded-xl p-4 flex items-start gap-4">
                <div className="w-10 h-10 bg-yellow-400/20 rounded-lg flex items-center justify-center text-xl shrink-0">
                  🎯
                </div>
                <div>
                  <p className="font-semibold text-white text-lg">Aim Your Shot</p>
                  <p className="text-sm text-gray-400 mt-1">Move your mouse over the table to aim the cue stick</p>
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded-xl p-4 flex items-start gap-4">
                <div className="w-10 h-10 bg-yellow-400/20 rounded-lg flex items-center justify-center text-xl shrink-0">
                  💪
                </div>
                <div>
                  <p className="font-semibold text-white text-lg">Control Power</p>
                  <p className="text-sm text-gray-400 mt-1">Click and hold to charge - longer hold = more power. Release to shoot!</p>
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded-xl p-4 flex items-start gap-4">
                <div className="w-10 h-10 bg-yellow-400/20 rounded-lg flex items-center justify-center text-xl shrink-0">
                  📷
                </div>
                <div>
                  <p className="font-semibold text-white text-lg">Camera Controls</p>
                  <p className="text-sm text-gray-400 mt-1">Right-click + drag to orbit around the table. Scroll to zoom in/out.</p>
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded-xl p-4 flex items-start gap-4">
                <div className="w-10 h-10 bg-yellow-400/20 rounded-lg flex items-center justify-center text-xl shrink-0">
                  🏆
                </div>
                <div>
                  <p className="font-semibold text-white text-lg">How to Win</p>
                  <p className="text-sm text-gray-400 mt-1">Pot all 7 of your balls (red or yellow), then pot the black 8-ball to win!</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setGameState(prev => ({ ...prev, showTutorial: false }))}
              className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black px-6 py-4 rounded-xl transition-all font-bold text-lg shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50 transform hover:scale-[1.02]"
            >
              🎱 Break &amp; Play!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
