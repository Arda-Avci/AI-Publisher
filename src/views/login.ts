/**
 * Login view builder.
 * Pure function — returns the HTML for the login page based on language and theme.
 */

// Giriş Sayfası HTML — dil parametreye göre dinamik
export const buildLoginHTML = (t: Record<string, string>, themeStyles: string, lang: 'tr' | 'en' = 'tr') => `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <title>${t.signInButton} - AI Publisher</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,300..900,0..100&family=Geist:wght@300..700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
      ${themeStyles}
      :root {
        --font-display: 'Fraunces', Georgia, serif;
        --font-body: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
        --font-mono: 'JetBrains Mono', 'SF Mono', Menlo, monospace;
        --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
        --duration-hover: 180ms;
        --radius-md: 8px;
        --radius-xl: 16px;
        --radius-2xl: 24px;
        --shadow-md: 0 4px 12px -2px hsla(0 0% 0% / 0.08), 0 2px 4px -2px hsla(0 0% 0% / 0.04);
        --shadow-lg: 0 12px 24px -4px hsla(0 0% 0% / 0.12), 0 4px 8px -4px hsla(0 0% 0% / 0.06);
        --inner-shadow: inset 0 1px 0 0 hsla(0 0% 100% / 0.06), inset 0 0 0 1px hsla(0 0% 100% / 0.04);
      }
      /* Theme-aware backgrounds using CSS variables */
      body {
        margin: 0;
        padding: 0;
        background-color: hsl(var(--background));
        color: hsl(var(--foreground));
        font-family: var(--font-body);
        font-size: 0.9375rem;
        letter-spacing: -0.011em;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        overflow: hidden;
        transition: background-color 0.3s ease, color 0.3s ease;
        position: relative;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      body::before {
        content: '';
        position: fixed;
        inset: 0;
        background:
          radial-gradient(at 0% 0%, hsl(var() / ) 0%, transparent 50%),
          radial-gradient(at 100% 100%, hsl(var() / ) 0%, transparent 50%);
        pointer-events: none;
        z-index: 0;
      }
      body::after {
        content: '';
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 1;
        opacity: 0.025;
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        mix-blend-mode: overlay;
      }
      .container {
        position: relative;
        z-index: 2;
        background: hsl(var() / );
        backdrop-filter: blur(24px) saturate(180%);
        -webkit-backdrop-filter: blur(24px) saturate(180%);
        border: 1px solid hsl(var() / );
        padding: 40px;
        border-radius: var(--radius-2xl);
        width: 360px;
        box-shadow: var(--shadow-lg), var(--inner-shadow);
        text-align: center;
        transition: all 0.3s var(--ease-out-expo);
        animation: loginReveal 600ms var(--ease-out-expo) both;
      }
      @keyframes loginReveal {
        from { opacity: 0; transform: translateY(8px) scale(0.99); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .container:hover {
        box-shadow: 0 12px 32px -8px hsla(0 0% 0% / 0.18);
        border-color: hsl(var() / );
      }
      h1 {
        font-family: var(--font-display);
        font-variation-settings: "opsz" 144, "SOFT" 0;
        color: hsl(var(--foreground));
        font-weight: 500;
        font-size: 2rem;
        margin-bottom: 30px;
        letter-spacing: -0.04em;
      }
      h1 span {
        font-style: italic;
        font-variation-settings: "opsz" 144, "SOFT" 100;
        color: hsl(var(--primary));
      }
      .input-group {
        margin-bottom: 20px;
        text-align: left;
      }
      label {
        display: block;
        margin-bottom: 8px;
        font-family: var(--font-mono);
        font-size: 0.6875rem;
        font-weight: 500;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: hsl(var(--muted-foreground));
      }
      input {
        width: 100%;
        padding: 12px 14px;
        border-radius: var(--radius-md);
        border: 1px solid hsl(var() / );
        background: hsl(var() / );
        color: hsl(var(--foreground));
        font-family: var(--font-body);
        font-size: 0.875rem;
        letter-spacing: -0.011em;
        box-sizing: border-box;
        outline: none;
        transition: all var(--duration-hover) var(--ease-out-expo);
      }
      input:focus {
        border-color: hsl(var(--primary));
        background: hsl(var() / );
        box-shadow: 0 0 0 3px hsl(var() / );
      }
      input::placeholder {
        color: hsl(var(--muted-foreground));
        font-style: italic;
        opacity: 0.7;
      }
      .btn {
        width: 100%;
        padding: 12px 16px;
        border: 1px solid hsla(0 0% 0% / 0.08);
        border-radius: var(--radius-md);
        background: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
        font-family: var(--font-body);
        font-weight: 500;
        font-size: 0.875rem;
        letter-spacing: -0.011em;
        cursor: pointer;
        box-shadow: var(--shadow-md), inset 0 1px 0 hsla(0 0% 100% / 0.12);
        transition: all var(--duration-hover) var(--ease-out-expo);
        position: relative;
        overflow: hidden;
      }
      .btn::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, hsla(0 0% 100% / 0.08) 0%, transparent 100%);
        pointer-events: none;
      }
      .btn:hover {
        transform: translateY(-1px);
        box-shadow: var(--shadow-lg), inset 0 1px 0 hsla(0 0% 100% / 0.15);
      }
      .btn:active {
        transform: translateY(0);
      }
      .error {
        color: hsl(var(--destructive));
        margin-bottom: 15px;
        font-size: 14px;
      }
    </style>
</head>
<body>
  <div class="container">
    <h1>AI <span>Publisher</span></h1>
    <form action="/login" method="POST">
      <div class="input-group">
        <label>${t.usernameLabel}</label>
        <input type="text" name="username" required placeholder="admin">
      </div>
      <div class="input-group">
        <label>${t.passwordLabel}</label>
        <input type="password" name="password" required placeholder="••••••••">
      </div>
      <button type="submit" class="btn">${t.signInButton}</button>
    </form>
  </div>
</body>
</html>
`;
