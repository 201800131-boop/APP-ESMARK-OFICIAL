import './LoginSplash.css';

interface LoginSplashProps {
  message?: string;
}

export default function LoginSplash({ message = 'Preparando tu panel...' }: LoginSplashProps) {
  return (
    <div className="login-splash" role="status" aria-live="polite" aria-label={message}>
      <div className="login-splash__glow login-splash__glow--blue" />
      <div className="login-splash__glow login-splash__glow--green" />

      <div className="login-splash__content">
        <img className="login-splash__logo" src="/logo.png" alt="Esmark System" draggable={false} />

        <div className="login-splash__loader" aria-hidden="true">
          <span className="login-splash__track login-splash__track--one" />
          <span className="login-splash__track login-splash__track--two" />
          <span className="login-splash__bubble login-splash__bubble--red" />
          <span className="login-splash__bubble login-splash__bubble--blue" />
          <span className="login-splash__bubble login-splash__bubble--yellow" />
          <span className="login-splash__bubble login-splash__bubble--green" />
        </div>

        <h1>Iniciando sesión</h1>
        <p>{message}</p>
        <div className="login-splash__progress" aria-hidden="true">
          <span />
        </div>
      </div>
    </div>
  );
}
