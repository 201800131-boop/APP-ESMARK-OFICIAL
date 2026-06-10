import { useState } from "react";
import { motion } from "motion/react";
import { User, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import Aurora from "./Aurora";
import { Alert, AlertDescription } from "./ui/alert";

interface LoginViewProps {
  onLogin: (username: string, password: string) => Promise<void>;
}

export default function LoginView({ onLogin }: LoginViewProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username || !password) {
      setError("Por favor completa todos los campos");
      return;
    }
    setLoading(true);
    try {
      await onLogin(username, password);
    } catch (err: any) {
      setError(err?.message || "Usuario o contraseña incorrecta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#0a0a0a] overflow-hidden">
      <div className="absolute inset-0">
        <Aurora
          colorStops={["#002255", "#004488", "#0066aa"]}
          amplitude={1.8}
          blend={0.4}
          speed={0.8}
        />
      </div>

      <GlassLoginCard>
        <div className="px-0 py-0 w-full">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="flex justify-center mb-3"
            >
              <img src="/logo.png" alt="Logo Esmark" className="w-[180px] h-auto object-contain bg-transparent shadow-none border-none mx-auto mb-2" draggable={false} />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-center text-xl font-semibold mb-4"
              style={{ color: "#fff" }}
            >
              Esmark System
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-center text-white/70 text-[13.5px] leading-relaxed mb-8"
            >
              Ingresa tus credenciales
              <br />
              para acceder a tu panel.
            </motion.p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
              >
                <GlassPillField
                  icon={<User className="w-4 h-4" />} 
                  placeholder="Ingresa tu nombre de usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  type="text"
                  disabled={loading}
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
              >
                <GlassPillField
                  icon={<Lock className="w-4 h-4" />} 
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  disabled={loading}
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="mr-1.5 text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      {showPassword ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </button>
                  }
                />
              </motion.div>
              {error && (
                <Alert className="bg-red-500/10 border-red-500/40">
                  <AlertCircle className="h-4 w-4 text-red-300" />
                  <AlertDescription className="text-red-100">{error}</AlertDescription>
                </Alert>
              )}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.6 }}
                className="pt-7"
              >
                <SparkleBlueButton text={loading ? "Iniciando sesión..." : "Iniciar sesión"} />
              </motion.div>
            </form>
          </div>
        </GlassLoginCard>
    </div>
  );
}

function GlassLoginCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      style={{
        width: "400px",
        minWidth: "400px",
        maxWidth: "400px",
        minHeight: "480px",
        borderRadius: "22px",
        background: "rgba(18, 32, 54, 0.38)", // Más transparente
        boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.22)",
        border: "1.5px solid rgba(255,255,255,0.10)",
        padding: "0px"
      }}
      className="relative flex flex-col items-center justify-center overflow-hidden"
    >
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
        style={{ overflow: "hidden", borderRadius: "22px" }}
      >
        <defs>
          <linearGradient id="borderGlow1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0)" />
            <stop offset="5%" stopColor="rgba(255, 255, 255, 0)" />
            <stop offset="10%" stopColor="rgba(255, 255, 255, 0.05)" />
            <stop offset="20%" stopColor="rgba(255, 255, 255, 0.2)" />
            <stop offset="30%" stopColor="rgba(255, 255, 255, 0.5)" />
            <stop offset="40%" stopColor="rgba(255, 255, 255, 0.8)" />
            <stop offset="50%" stopColor="rgba(255, 255, 255, 1)" />
            <stop offset="60%" stopColor="rgba(255, 255, 255, 0.8)" />
            <stop offset="70%" stopColor="rgba(255, 255, 255, 0.5)" />
            <stop offset="80%" stopColor="rgba(255, 255, 255, 0.2)" />
            <stop offset="90%" stopColor="rgba(255, 255, 255, 0.05)" />
            <stop offset="95%" stopColor="rgba(255, 255, 255, 0)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
          </linearGradient>
          <linearGradient id="borderGlow2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0)" />
            <stop offset="5%" stopColor="rgba(255, 255, 255, 0)" />
            <stop offset="10%" stopColor="rgba(255, 255, 255, 0.05)" />
            <stop offset="20%" stopColor="rgba(255, 255, 255, 0.2)" />
            <stop offset="30%" stopColor="rgba(255, 255, 255, 0.5)" />
            <stop offset="40%" stopColor="rgba(255, 255, 255, 0.8)" />
            <stop offset="50%" stopColor="rgba(255, 255, 255, 1)" />
            <stop offset="60%" stopColor="rgba(255, 255, 255, 0.8)" />
            <stop offset="70%" stopColor="rgba(255, 255, 255, 0.5)" />
            <stop offset="80%" stopColor="rgba(255, 255, 255, 0.2)" />
            <stop offset="90%" stopColor="rgba(255, 255, 255, 0.05)" />
            <stop offset="95%" stopColor="rgba(255, 255, 255, 0)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="12" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <motion.rect
          x="1.5"
          y="1.5"
          width="calc(100% - 3px)"
          height="calc(100% - 3px)"
          rx="22"
          ry="22"
          fill="none"
          stroke="url(#borderGlow1)"
          strokeWidth="3"
          filter="url(#glow)"
          pathLength="100"
          strokeDasharray="15 85"
          strokeLinecap="round"
          initial={{ strokeDashoffset: 0 }}
          animate={{ strokeDashoffset: -100 }}
          transition={{
            duration: 45,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <motion.rect
          x="1.5"
          y="1.5"
          width="calc(100% - 3px)"
          height="calc(100% - 3px)"
          rx="22"
          ry="22"
          fill="none"
          stroke="url(#borderGlow2)"
          strokeWidth="3"
          filter="url(#glow)"
          pathLength="100"
          strokeDasharray="15 85"
          strokeLinecap="round"
          initial={{ strokeDashoffset: -50 }}
          animate={{ strokeDashoffset: -150 }}
          transition={{
            duration: 45,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </svg>
      <div className="relative z-20 w-full flex flex-col items-center justify-center" style={{padding: "32px 24px 24px 24px"}}>
        {children}
      </div>
    </motion.div>
  );
}



interface GlassPillFieldProps {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type: string;
  trailing?: React.ReactNode;
  disabled?: boolean;
}

function GlassPillField({
  icon,
  placeholder,
  value,
  onChange,
  type,
  trailing,
  disabled,
}: GlassPillFieldProps) {
  return (
    <div
      className="h-12 rounded-full flex items-center px-4 gap-2"
      style={{
        backdropFilter: "blur(15px)",
        WebkitBackdropFilter: "blur(15px)",
        background: "rgba(0, 0, 0, 0.165)",
        border: "2px solid rgba(45, 123, 255, 0.35)",
        boxShadow: "0 6px 12px rgba(0, 0, 0, 0.125)",
      }}
    >
      <div className="text-white/55 shrink-0 mr-3 ml-1 flex items-center">{icon}</div>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 bg-transparent border-none outline-none text-white text-[13px] font-medium placeholder:text-white/55 placeholder:font-medium disabled:opacity-60 px-1"
      />
      {trailing && (
        <div className="flex items-center ml-2 mr-1">{trailing}</div>
      )}
    </div>
  );
}

function SparkleBlueButton({ text }: { text: string }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const active = isHovered || isPressed ? 1 : 0;

  return (
    <motion.button
      type="submit"
      className="relative w-full h-12 overflow-visible rounded-full border-2 border-cyan-400 bg-transparent"
      style={{borderRadius: '9999px', boxShadow: 'none', background: 'rgba(18,32,54,0.38)', borderColor: 'rgba(45,123,255,0.35)'}}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      animate={{
        scale: isPressed ? 1.0 : isHovered ? 1.04 : 1.0,
      }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: active }}
        transition={{ duration: 0.22 }}
      >
        <SparkleParticles />
      </motion.div>

      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        animate={{
          background: [
            `conic-gradient(from 0deg at 50% 50%, transparent, rgba(97, 210, 255, ${
              active * 0.7
            }) 25%, rgba(97, 210, 255, ${active * 0.2}) 40%, transparent)`,
            `conic-gradient(from 360deg at 50% 50%, transparent, rgba(97, 210, 255, ${
              active * 0.7
            }) 25%, rgba(97, 210, 255, ${active * 0.2}) 40%, transparent)`,
          ],
        }}
        transition={{
          duration: 1.4,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      <motion.div
        className="relative w-full h-full rounded-full flex items-center justify-center px-4"
        style={{
          background: `linear-gradient(135deg, 
            rgba(${active ? "97, 210, 255" : "58, 58, 58"}, ${active ? "1" : "0.3"}), 
            rgba(${active ? "31, 120, 255" : "31, 31, 31"}, ${active ? "1" : "0.3"}))`,
          border: `1.2px solid rgba(${active ? "43, 124, 255" : "100, 100, 100"}, ${active ? "1" : "0.4"})`,
          boxShadow: active
            ? `0 ${5 - active * 5}px ${12 + active * 10}px rgba(71, 184, 255, 0.3), 0 ${
                5 - active * 5
              }px ${3 + active * 2}px rgba(0, 0, 0, 0.5)`
            : "0 5px 12px rgba(0, 0, 0, 0.5)",
        }}
        animate={{
          background: isHovered
            ? "linear-gradient(135deg, rgba(97, 210, 255, 1), rgba(31, 120, 255, 1))"
            : "linear-gradient(135deg, rgba(58, 58, 58, 0.3), rgba(31, 31, 31, 0.3))",
        }}
        transition={{ duration: 0.22 }}
      >
        <motion.span
          className="text-[15px] font-semibold"
          animate={{
            color: isHovered ? "rgba(255, 255, 255, 1)" : "rgba(189, 189, 189, 1)",
          }}
          transition={{ duration: 0.22 }}
        >
          {text}
        </motion.span>
      </motion.div>
    </motion.button>
  );
}

function SparkleParticles() {
  const particles = [
    { phase: 0.1, r: 0.4, alpha: 1.0, reverse: false },
    { phase: 0.22, r: 0.6, alpha: 0.7, reverse: false },
    { phase: 0.4, r: 0.75, alpha: 0.8, reverse: true },
    { phase: 0.58, r: 0.5, alpha: 0.6, reverse: false },
    { phase: 0.78, r: 0.7, alpha: 0.75, reverse: false },
  ];

  return (
    <svg className="w-full h-full">
      {particles.map((p, i) => (
        <motion.circle
          key={i}
          r={1.8 + p.r * 3}
          fill={`rgba(255, 255, 255, ${0.18 * p.alpha})`}
          animate={{
            cx: [
              `${50 + Math.cos(p.phase * Math.PI * 2 * (p.reverse ? -1 : 1)) * 42}%`,
              `${50 + Math.cos((p.phase + 1) * Math.PI * 2 * (p.reverse ? -1 : 1)) * 42}%`,
            ],
            cy: [
              `${50 + Math.sin(p.phase * Math.PI * 2 * (p.reverse ? -1 : 1)) * 42}%`,
              `${50 + Math.sin((p.phase + 1) * Math.PI * 2 * (p.reverse ? -1 : 1)) * 42}%`,
            ],
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </svg>
  );
}
