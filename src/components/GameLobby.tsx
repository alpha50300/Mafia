import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface GameLobbyProps {
  userId: Id<"users">;
  onJoinGame: (gameId: string) => void;
}

export function GameLobby({ userId, onJoinGame }: GameLobbyProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [mafiaCount, setMafiaCount] = useState(2);
  const [hasDoctor, setHasDoctor] = useState(true);
  const [hasDetective, setHasDetective] = useState(true);

  const createGame = useMutation(api.games.createGame);
  const joinGame = useMutation(api.games.joinGame);

  const handleCreateGame = async () => {
    try {
      const result = await createGame({
        userId,
        maxPlayers,
        mafiaCount,
        hasDoctor,
        hasDetective,
      });
      toast.success(`تم إنشاء الغرفة! الكود: ${result.code}`);
      onJoinGame(result.gameId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "خطأ في إنشاء الغرفة");
    }
  };

  const handleJoinGame = async () => {
    if (!joinCode.trim()) {
      toast.error("يرجى إدخال كود الغرفة");
      return;
    }
    
    try {
      const gameId = await joinGame({ 
        code: joinCode.trim(),
        userId 
      });
      toast.success("تم الانضمام للغرفة بنجاح!");
      onJoinGame(gameId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "خطأ في الانضمام للغرفة");
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold text-red-400 mb-4">🕵️ لعبة المافيا</h1>
        <p className="text-xl text-gray-300">اختر طريقة اللعب</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Join Game Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-red-800/30 rounded-xl p-6 shadow-xl">
          <h2 className="text-2xl font-bold text-red-400 mb-4 text-center">الانضمام لغرفة</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 mb-2">كود الغرفة</label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="أدخل كود الغرفة"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-red-400 focus:ring-1 focus:ring-red-400 outline-none transition-all text-center font-mono text-lg"
                maxLength={6}
                onKeyPress={(e) => e.key === 'Enter' && handleJoinGame()}
              />
            </div>
            <button
              onClick={handleJoinGame}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg"
            >
              انضمام للغرفة
            </button>
          </div>
        </div>

        {/* Create Game Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-red-800/30 rounded-xl p-6 shadow-xl">
          <h2 className="text-2xl font-bold text-red-400 mb-4 text-center">إنشاء غرفة جديدة</h2>
          
          {!showCreateForm ? (
            <div className="space-y-4">
              <div className="text-center text-gray-300 mb-4">
                <p>أنشئ غرفة جديدة وادع أصدقائك للعب</p>
              </div>
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg"
              >
                إنشاء غرفة
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">الحد الأقصى للاعبين</label>
                <select
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-red-400 focus:ring-1 focus:ring-red-400 outline-none"
                >
                  {[4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map(num => (
                    <option key={num} value={num}>{num} لاعب</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-300 mb-2">عدد المافيا</label>
                <select
                  value={mafiaCount}
                  onChange={(e) => setMafiaCount(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-red-400 focus:ring-1 focus:ring-red-400 outline-none"
                >
                  {Array.from({ length: Math.floor(maxPlayers / 3) }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-3 text-gray-300">
                  <input
                    type="checkbox"
                    checked={hasDoctor}
                    onChange={(e) => setHasDoctor(e.target.checked)}
                    className="w-5 h-5 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
                  />
                  إضافة طبيب
                </label>
                <label className="flex items-center gap-3 text-gray-300">
                  <input
                    type="checkbox"
                    checked={hasDetective}
                    onChange={(e) => setHasDetective(e.target.checked)}
                    className="w-5 h-5 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
                  />
                  إضافة محقق
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleCreateGame}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg"
                >
                  إنشاء
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Game Rules */}
      <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-red-400 mb-4">قواعد اللعبة</h3>
        <div className="grid md:grid-cols-2 gap-4 text-gray-300 text-sm">
          <div>
            <h4 className="font-bold text-red-300 mb-2">الأدوار:</h4>
            <ul className="space-y-1">
              <li>🔴 <strong>المافيا:</strong> يقتلون في الليل</li>
              <li>🔵 <strong>المواطن:</strong> يصوت في النهار</li>
              <li>💚 <strong>الطبيب:</strong> يحمي لاعب في الليل</li>
              <li>🕵️ <strong>المحقق:</strong> يحقق مع لاعب في الليل</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-red-300 mb-2">الهدف:</h4>
            <ul className="space-y-1">
              <li>• المافيا: القضاء على جميع المواطنين</li>
              <li>• المواطنون: القضاء على جميع المافيا</li>
              <li>• النقاش والتصويت في النهار</li>
              <li>• الأعمال السرية في الليل</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
