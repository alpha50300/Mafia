import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import { toast } from "sonner";

interface GameRoomProps {
  gameId: string;
  userId: Id<"users">;
  onLeaveGame: () => void;
}

export function GameRoom({ gameId, userId, onLeaveGame }: GameRoomProps) {
  const game = useQuery(api.games.getGame, { 
    gameId: gameId as Id<"games">,
    userId 
  });
  const messages = useQuery(api.games.getGameMessages, { 
    gameId: gameId as Id<"games">,
    userId 
  });
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const startGame = useMutation(api.games.startGame);
  const vote = useMutation(api.games.vote);
  const investigate = useMutation(api.games.investigate);

  if (!game) {
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-400 mx-auto mb-4"></div>
        <p className="text-gray-300">جاري تحميل الغرفة...</p>
      </div>
    );
  }

  const handleStartGame = async () => {
    try {
      await startGame({ 
        gameId: gameId as Id<"games">,
        userId 
      });
      toast.success("بدأت اللعبة!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "خطأ في بدء اللعبة");
    }
  };

  const handleVote = async () => {
    if (!selectedPlayer) {
      toast.error("اختر لاعب للتصويت عليه");
      return;
    }
    
    try {
      await vote({ 
        gameId: gameId as Id<"games">, 
        targetId: selectedPlayer as Id<"players">,
        userId
      });
      toast.success("تم التصويت!");
      setSelectedPlayer(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "خطأ في التصويت");
    }
  };

  const handleInvestigate = async () => {
    if (!selectedPlayer) {
      toast.error("اختر لاعب للتحقيق معه");
      return;
    }
    
    try {
      await investigate({ 
        gameId: gameId as Id<"games">, 
        targetId: selectedPlayer as Id<"players">,
        userId
      });
      toast.success("تم التحقيق!");
      setSelectedPlayer(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "خطأ في التحقيق");
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "mafia": return "🔴";
      case "doctor": return "💚";
      case "detective": return "🕵️";
      default: return "🔵";
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case "mafia": return "مافيا";
      case "doctor": return "طبيب";
      case "detective": return "محقق";
      default: return "مواطن";
    }
  };

  const getPhaseText = (phase: string) => {
    switch (phase) {
      case "day": return "النهار - وقت النقاش والتصويت";
      case "night": return "الليل - وقت الأعمال السرية";
      case "voting": return "التصويت";
      case "investigation": return "التحقيق";
      default: return phase;
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Game Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-red-800/30 rounded-xl p-6 mb-6 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-red-400">غرفة اللعبة</h2>
            <p className="text-gray-300">الكود: <span className="font-mono text-xl text-yellow-400">{game.code}</span></p>
          </div>
          <button
            onClick={onLeaveGame}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            مغادرة الغرفة
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-gray-700/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-400">{game.playerCount}</div>
            <div className="text-sm text-gray-300">اللاعبون</div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-400">{game.maxPlayers}</div>
            <div className="text-sm text-gray-300">الحد الأقصى</div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-3">
            <div className="text-xl font-bold text-yellow-400">{game.status === "waiting" ? "انتظار" : game.status === "playing" ? "جارية" : "انتهت"}</div>
            <div className="text-sm text-gray-300">الحالة</div>
          </div>
          {game.status === "playing" && (
            <div className="bg-gray-700/50 rounded-lg p-3">
              <div className="text-lg font-bold text-purple-400">{getPhaseText(game.phase)}</div>
              <div className="text-sm text-gray-300">اليوم {game.currentDay}</div>
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Players List */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-red-800/30 rounded-xl p-6 shadow-xl">
            <h3 className="text-xl font-bold text-red-400 mb-4">اللاعبون ({game.playerCount}/{game.maxPlayers})</h3>
            <div className="space-y-3">
              {game.players.map((player) => (
                <div
                  key={player._id}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    selectedPlayer === player._id
                      ? "border-red-400 bg-red-900/30"
                      : player.isAlive
                      ? "border-gray-600 bg-gray-700/30 hover:border-gray-500"
                      : "border-gray-700 bg-gray-800/30 opacity-50"
                  }`}
                  onClick={() => {
                    if (player.isAlive && player._id !== game.currentPlayer?._id) {
                      setSelectedPlayer(selectedPlayer === player._id ? null : player._id);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {game.currentPlayer?._id === player._id ? "👤" : player.isAlive ? "✅" : "💀"}
                      </span>
                      <span className="text-white font-medium">
                        {player.user?.name || "لاعب"}
                      </span>
                      {game.hostId === player.userId && (
                        <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded">مضيف</span>
                      )}
                      {player.user?.isOnline && (
                        <span className="text-green-400 text-xs">●</span>
                      )}
                    </div>
                    {game.status === "playing" && game.currentPlayer?._id === player._id && (
                      <div className="flex items-center gap-1">
                        <span className="text-lg">{getRoleIcon(player.role)}</span>
                        <span className="text-sm text-gray-300">{getRoleName(player.role)}</span>
                      </div>
                    )}
                  </div>
                  {player.votedFor && game.status === "playing" && (
                    <div className="text-xs text-gray-400 mt-1">صوت لـ: {game.players.find(p => p._id === player.votedFor)?.user?.name}</div>
                  )}
                </div>
              ))}
            </div>

            {/* Game Actions */}
            {game.status === "waiting" && game.hostId === game.currentPlayer?.userId && (
              <div className="mt-4 space-y-2">
                <div className="text-center text-gray-300 text-sm mb-2">
                  {game.playerCount < 4 ? 
                    `نحتاج ${4 - game.playerCount} لاعبين إضافيين للبدء` : 
                    "جميع اللاعبين جاهزون! يمكنك بدء اللعبة"
                  }
                </div>
                <button
                  onClick={handleStartGame}
                  disabled={game.playerCount < 4}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  {game.playerCount < 4 ? "انتظار المزيد من اللاعبين" : "🚀 بدء اللعبة"}
                </button>
              </div>
            )}

            {game.status === "playing" && game.currentPlayer?.isAlive && (
              <div className="mt-4 space-y-2">
                {game.phase === "day" && (
                  <button
                    onClick={handleVote}
                    disabled={!selectedPlayer}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                    تصويت للإعدام
                  </button>
                )}
                
                {game.phase === "night" && game.currentPlayer?.role === "detective" && (
                  <button
                    onClick={handleInvestigate}
                    disabled={!selectedPlayer}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                    تحقيق مع اللاعب
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Game Messages */}
        <div className="lg:col-span-2">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-red-800/30 rounded-xl p-6 shadow-xl">
            <h3 className="text-xl font-bold text-red-400 mb-4">رسائل اللعبة</h3>
            <div className="h-96 overflow-y-auto space-y-3 bg-gray-900/30 rounded-lg p-4">
              {messages?.map((message, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg ${
                    message.type === "system"
                      ? "bg-blue-900/30 border-l-4 border-blue-400"
                      : message.type === "mafia"
                      ? "bg-red-900/30 border-l-4 border-red-400"
                      : "bg-gray-700/30 border-l-4 border-gray-400"
                  }`}
                >
                  <div className="text-white">{message.message}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {message.type === "system" ? "النظام" : message.type === "mafia" ? "المافيا" : "لاعب"} - 
                    اليوم {message.day} ({message.phase === "day" ? "نهار" : "ليل"})
                  </div>
                </div>
              ))}
              {(!messages || messages.length === 0) && (
                <div className="text-center text-gray-400 py-8">
                  لا توجد رسائل بعد...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
