import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, Loader2, AlertCircle, Key, Mail, Delete } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@shared/components/ui/tabs";
import { cn } from "@shared/lib/utils";

const PIN_LENGTH = 4;

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signInWithPin, user } = useAuth();
  
  // Email login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // PIN login state
  const [pin, setPin] = useState<string[]>([]);
  
  // Shared state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pin" | "email">("pin");

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
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

  const handlePinInput = async (digit: string) => {
    if (loading) return;
    if (pin.length >= PIN_LENGTH) return;
    
    const newPin = [...pin, digit];
    setPin(newPin);
    setError(null);

    // Auto-submit when PIN is complete
    if (newPin.length === PIN_LENGTH) {
      setLoading(true);
      try {
        await signInWithPin(newPin.join(""));
        navigate("/", { replace: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Invalid PIN");
        setPin([]);
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePinDelete = () => {
    if (loading) return;
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handlePinClear = () => {
    if (loading) return;
    setPin([]);
    setError(null);
  };

  // If already logged in during render, don't show login
  if (user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
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

        {/* Login Card */}
        <div className="bg-card p-6 rounded-xl border shadow-sm">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "pin" | "email")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="pin" className="gap-2">
                <Key className="w-4 h-4" />
                PIN
              </TabsTrigger>
              <TabsTrigger value="email" className="gap-2">
                <Mail className="w-4 h-4" />
                Email
              </TabsTrigger>
            </TabsList>

            {/* Error message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4"
                >
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* PIN Login */}
            <TabsContent value="pin" className="space-y-6">
              {/* PIN dots display */}
              <div className="flex justify-center gap-3 mb-4">
                {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={false}
                    animate={{
                      scale: pin[i] ? 1.1 : 1,
                      backgroundColor: pin[i] ? "hsl(var(--primary))" : "transparent",
                    }}
                    className={cn(
                      "w-4 h-4 rounded-full border-2 border-primary transition-colors",
                      pin[i] && "border-primary"
                    )}
                  />
                ))}
              </div>

              {/* Loading indicator */}
              {loading && (
                <div className="flex justify-center py-2">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-3">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "delete"].map(
                  (key) => {
                    if (key === "clear") {
                      return (
                        <Button
                          key={key}
                          variant="ghost"
                          onClick={handlePinClear}
                          disabled={loading || pin.length === 0}
                          className="h-16 text-lg font-medium text-muted-foreground"
                        >
                          Clear
                        </Button>
                      );
                    }
                    if (key === "delete") {
                      return (
                        <Button
                          key={key}
                          variant="ghost"
                          onClick={handlePinDelete}
                          disabled={loading || pin.length === 0}
                          className="h-16"
                        >
                          <Delete className="w-6 h-6" />
                        </Button>
                      );
                    }
                    return (
                      <Button
                        key={key}
                        variant="outline"
                        onClick={() => handlePinInput(key)}
                        disabled={loading}
                        className="h-16 text-2xl font-semibold hover:bg-primary/10"
                      >
                        {key}
                      </Button>
                    );
                  }
                )}
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Enter your 4-digit staff PIN
              </p>
            </TabsContent>

            {/* Email Login */}
            <TabsContent value="email">
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@9yards.co.ug"
                    required
                    autoFocus={activeTab === "email"}
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
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Contact admin if you need login credentials
        </p>
      </motion.div>
    </div>
  );
}
