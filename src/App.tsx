import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { Toaster, toast } from "sonner";
import { GameLobby } from "./components/GameLobby";
import { GameRoom } from "./components/GameRoom";
import usePresence from "@convex-dev/presence/react";
import FacePile from "@convex-dev/presence/facepile";

export default function App() {
  const [currentUserId, setCurrentUserId] = useState<Id<"users"> | null>(null);
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const createUser = useMutation(api.users.createUser);
  const updateOnlineStatus = useMutation(api.users.updateOnlineStatus);
  const user = useQuery(api.users.getUserById, 
    currentUserId ? { userId: currentUserId } : "skip"
  );

  // Presence for lobby
  const presenceState = usePresence(
    { 
      heartbeat: api.presence.heartbeat,
      list: api.presence.list,
      disconnect: api.presence.disconnect
    },
    "lobby",
    currentUserId || "",
    10000
  );

  useEffect(() => {
    const savedUserId = localStorage.getItem("mafiaUserId");
    if (savedUserId) {
      setCurrentUserId(savedUserId as Id<"users">);
    }
  }, []);

  useEffect(() => {
    if (currentUserId) {
      localStorage.setItem("mafiaUserId", currentUserId);
      updateOnlineStatus({ userId: currentUserId, isOnline: true });
    }

    // Cleanup on unmount
    return () => {
      if (currentUserId) {
        updateOnlineStatus({ userId: currentUserId, isOnline: false });
      }
    };
  }, [currentUserId, updateOnlineStatus]);

  const handleCreateUser = async () => {
    if (!userName.trim()) {
      toast.error("يرجى إدخال اسم");
      return;
    }

    setIsCreatingUser(true);
    try {
      const userId = await createUser({ name: userName.trim() });
      setCurrentUserId(userId);
      toast.success("تم إنشاء الحساب بنجاح!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "خطأ في إنشاء الحساب");
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleLogout = () => {
    if (currentUserId) {
      updateOnlineStatus({ userId: currentUserId, isOnline: false });
    }
    localStorage.removeItem("mafiaUserId");
    setCurrentUserId(null);
    setCurrentGameId(null);
    setUserName("");
  };

  if (!currentUserId || !user) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-red-900 via-gray-900 to-black">
        <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm h-16 flex justify-center items-center border-b border-red-800 shadow-lg px-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">🕵️</span>
            </div>
            <h2 className="text-xl font-bold text-red-400">لعبة المافيا</h2>
          </div>
        </header>
        
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-6xl font-bold text-red-400 mb-4">🕵️ لعبة المافيا</h1>
              <p className="text-xl text-gray-300 mb-2">اللعبة الكلاسيكية للخداع والاستراتيجية</p>
              <p className="text-lg text-gray-400">أدخل اسمك للبدء في اللعب مع أصدقائك</p>
            </div>
            
            <div className="bg-gray-800/50 backdrop-blur-sm border border-red-800/30 rounded-xl p-6 shadow-xl">
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2 font-medium">اسمك في اللعبة</label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="أدخل اسمك (2-20 حرف)"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-red-400 focus:ring-1 focus:ring-red-400 outline-none transition-all"
                    maxLength={20}
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateUser()}
                  />
                </div>
                <button
                  onClick={handleCreateUser}
                  disabled={isCreatingUser || !userName.trim()}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg"
                >
                  {isCreatingUser ? "جاري الإنشاء..." : "دخول اللعبة"}
                </button>
              </div>
            </div>
          </div>
        </main>
        <Toaster />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-red-900 via-gray-900 to-black">
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm h-16 flex justify-between items-center border-b border-red-800 shadow-lg px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">🕵️</span>
          </div>
          <h2 className="text-xl font-bold text-red-400">لعبة المافيا</h2>
        </div>
        
        <div className="flex items-center gap-4">
          {!currentGameId && presenceState && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-300">متصل الآن:</span>
              <FacePile presenceState={presenceState} />
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <span className="text-green-400">●</span>
            <span className="text-white font-medium">{user.name}</span>
          </div>
          
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
          >
            تسجيل خروج
          </button>
        </div>
      </header>
      
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-6xl mx-auto">
          {currentGameId ? (
            <GameRoom 
              gameId={currentGameId} 
              userId={currentUserId}
              onLeaveGame={() => setCurrentGameId(null)} 
            />
          ) : (
            <GameLobby 
              userId={currentUserId}
              onJoinGame={setCurrentGameId} 
            />
          )}
        </div>
      </main>
      <Toaster />
    </div>
  );
}
