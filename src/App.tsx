import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import Vodex from "./pages/Vodex.tsx";
import Battleground from "./pages/Battleground.tsx";
import Virtual from "./pages/Virtual.tsx";
import Blockworld from "./pages/Blockworld.tsx";
import Leaderboard from "./pages/Leaderboard.tsx";
import MultiplayerLobby from "./pages/MultiplayerLobby.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/lobby" element={<ProtectedRoute><MultiplayerLobby /></ProtectedRoute>} />
            <Route path="/play/vodex" element={<ProtectedRoute><Vodex /></ProtectedRoute>} />
            <Route path="/play/battleground" element={<ProtectedRoute><Battleground /></ProtectedRoute>} />
            <Route path="/play/virtual" element={<ProtectedRoute><Virtual /></ProtectedRoute>} />
            <Route path="/play/blockworld" element={<ProtectedRoute><Blockworld /></ProtectedRoute>} />
            <Route path="/play/aether" element={<Navigate to="/play/battleground" replace />} />
            <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
