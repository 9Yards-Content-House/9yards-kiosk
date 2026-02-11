import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogIn, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";

export default function Login() {
  const navigate = useNavigate();
  const { signIn, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already logged in
  if (user) {
    navigate("/", { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signIn(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center mx-auto mb-4 shadow-card border border-gray-100 p-2">
            <img
              src="/images/logo/9Yards-Food-White-Logo-colored.png"
              alt="9Yards Food"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-primary">Kitchen Dashboard</h1>
          <p className="text-muted-foreground mt-1">Sign in to manage orders</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card p-6 rounded-xl border shadow-sm space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@9yards.co.ug"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <LogIn className="w-4 h-4 mr-2" />
            )}
            Sign In
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
