export function getDashboardStyles(themeStyles: string): string {
  return `
    <style>
      /* ========================================
         THEME SYSTEM — CSS Variable Architecture
         ======================================== */
      ${themeStyles}
      /* ========================================
         DESIGN TOKENS — Editorial Precision
         ======================================== */
      :root {
        /* Spacing scale */
        --space-1: 4px;
        --space-2: 8px;
        --space-3: 12px;
        --space-4: 16px;
        --space-5: 24px;
        --space-6: 32px;
        --space-7: 48px;
        --space-8: 64px;
        --space-9: 96px;

        /* Typography */
        --font-display: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        --font-body: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
        --font-mono: 'JetBrains Mono', 'SF Mono', Menlo, monospace;

        /* Type scale */
        --text-xs: 0.6875rem;   /* 11px */
        --text-sm: 0.8125rem;   /* 13px */
        --text-base: 0.9375rem; /* 15px */
        --text-md: 1.0625rem;   /* 17px */
        --text-lg: 1.25rem;     /* 20px */
        --text-xl: 1.5rem;      /* 24px */
        --text-2xl: 2rem;       /* 32px */
        --text-3xl: 2.75rem;    /* 44px */
        --text-4xl: 3.75rem;    /* 60px */

        /* Radii */
        --radius-sm: 4px;
        --radius-md: 8px;
        --radius-lg: 12px;
        --radius-xl: 16px;
        --radius-2xl: 24px;
        --radius-full: 9999px;

        /* Shadows — refined, not generic */
        --shadow-xs: 0 1px 0 0 hsla(0 0% 0% / 0.04);
        --shadow-sm: 0 1px 2px 0 hsla(0 0% 0% / 0.05), 0 1px 0 0 hsla(0 0% 0% / 0.04);
        --shadow-md: 0 4px 12px -2px hsla(0 0% 0% / 0.08), 0 2px 4px -2px hsla(0 0% 0% / 0.04);
        --shadow-lg: 0 12px 24px -4px hsla(0 0% 0% / 0.12), 0 4px 8px -4px hsla(0 0% 0% / 0.06);
        --shadow-xl: 0 24px 48px -8px hsla(0 0% 0% / 0.16), 0 8px 16px -4px hsla(0 0% 0% / 0.08);
        --inner-shadow: inset 0 1px 0 0 hsla(0 0% 100% / 0.06), inset 0 0 0 1px hsla(0 0% 100% / 0.04);

        /* Motion */
        --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
        --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
        --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
        --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
        --duration-hover: 180ms;
        --duration-modal: 250ms;
        --duration-page: 500ms;
        --transition-speed: 0.25s;

        /* Border weights */
        --border-thin: 1px;
        --border-thick: 1.5px;

        /* Z-index scale */
        --z-base: 0;
        --z-elevated: 10;
        --z-modal: 100;
        --z-toast: 200;
        --z-tooltip: 300;
      }
      /* ========================================
         BASE STYLES
         ======================================== */
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html { font-size: 16px; }
      body {
        margin: 0; padding: 0;
        font-family: var(--font-body);
        font-size: var(--text-base);
        letter-spacing: -0.011em;
        background-color: hsl(var(--background));
        color: hsl(var(--foreground));
        min-height: 100vh;
        overflow-x: hidden;
        position: relative;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      /* Atmospheric gradient mesh */
      body::before {
        content: '';
        position: fixed;
        inset: 0;
        background:
          radial-gradient(at 0% 0%, hsla(var(--primary), 0.08) 0%, transparent 50%),
          radial-gradient(at 100% 0%, hsla(var(--primary), 0.04) 0%, transparent 50%),
          radial-gradient(at 50% 100%, hsla(var(--primary), 0.06) 0%, transparent 50%);
        pointer-events: none;
        z-index: 0;
      }
      /* Noise texture overlay (data URL SVG, no extra request) */
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
      /* ========================================
         TYPOGRAPHY — Display, Body, Mono
         ======================================== */
      .font-mono { font-family: var(--font-mono); }
      h1, h2, h3, h4, .section-title, .brand-mark, .modal-title {
        font-family: var(--font-display);
        font-variation-settings: "opsz" 144, "SOFT" 0;
        font-weight: 500;
        letter-spacing: -0.025em;
        color: hsl(var(--foreground));
      }
      .section-title {
        font-size: var(--text-md);
        font-weight: 500;
      }
      h1 { font-size: var(--text-3xl); }
      h2 { font-size: var(--text-2xl); }
      h3 { font-size: var(--text-xl); }
      .label-caps {
        font-family: var(--font-mono);
        font-size: var(--text-xs);
        font-weight: 500;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: hsl(var(--muted-foreground));
      }
      /* Tabular numerals globally for data consistency */
      .font-mono, .job-id, .progress-meta, .colab-badge, .status-badge, .btn-sm, .modal-tab {
        font-variant-numeric: tabular-nums;
      }
      /* ========================================
         LAYOUT
         ======================================== */
      .app-shell {
        position: relative;
        z-index: 1;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }
      /* HEADER */
      .app-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--space-4) var(--space-6);
        background: hsla(var(--background), 0.8);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        border-bottom: 1px solid hsla(var(--border), 0.6);
        position: sticky;
        top: 0;
        z-index: var(--z-elevated);
        height: auto;
        min-height: 64px;
        gap: 1rem;
        animation: revealUp var(--duration-page) var(--ease-out) both;
      }
      .header-brand {
        display: flex;
        align-items: center;
        gap: var(--space-3);
      }
      .brand-icon {
        width: 36px;
        height: 36px;
        background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)));
        border-radius: var(--radius-md);
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: var(--font-display);
        font-variation-settings: "opsz" 144, "SOFT" 0;
        font-weight: 600;
        font-size: 1rem;
        font-style: italic;
        color: hsl(var(--primary-foreground));
        box-shadow: 0 1px 2px hsla(0 0% 0% / 0.12), inset 0 1px 0 hsla(0 0% 100% / 0.18);
        position: relative;
        overflow: hidden;
      }
      .brand-icon::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, hsla(0 0% 100% / 0.12) 0%, transparent 100%);
        pointer-events: none;
      }
      .brand-text {
        display: flex;
        flex-direction: column;
        line-height: 1.1;
      }
      .brand-name {
        font-family: var(--font-display);
        font-variation-settings: "opsz" 144, "SOFT" 0;
        font-weight: 500;
        font-size: 1.25rem;
        letter-spacing: -0.04em;
        color: hsl(var(--foreground));
      }
      .brand-name span {
        font-style: italic;
        font-variation-settings: "opsz" 144, "SOFT" 100;
        color: hsl(var(--primary));
      }
      .brand-sub {
        font-family: var(--font-mono);
        font-size: 0.625rem;
        font-weight: 500;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: hsl(var(--muted-foreground));
        margin-top: 2px;
      }
      .header-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .header-divider {
        width: 1px;
        height: 24px;
        background: hsla(var(--border), 0.8);
        margin: 0 0.25rem;
      }
      /* Icon buttons */
      .icon-btn {
        width: 38px;
        height: 38px;
        border-radius: var(--radius-md);
        border: 1px solid hsla(var(--border), 0.7);
        background: hsla(var(--secondary), 0.4);
        color: hsl(var(--muted-foreground));
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 1rem;
        transition: border-color 160ms var(--ease-out), color 160ms var(--ease-out), box-shadow 160ms var(--ease-out), transform 160ms var(--ease-out);
        backdrop-filter: blur(10px);
        position: relative;
        overflow: hidden;
      }
      .icon-btn::before {
        content: '';
        position: absolute;
        inset: 0;
        background: hsla(var(--primary), 0);
        transition: background 160ms var(--ease-out);
      }
      .icon-btn:hover {
        border-color: hsl(var(--primary));
        color: hsl(var(--primary));
        box-shadow: var(--shadow-sm);
        transform: translateY(-1px);
      }
      .icon-btn:hover::before { background: hsla(var(--primary), 0.08); }
      .icon-btn:active { transform: scale(0.95); }
      .icon-btn-label {
        font-size: 0.7rem;
        font-weight: 600;
        letter-spacing: 0.05em;
      }
      .btn-logout {
        font-family: var(--font-mono);
        font-size: 0.7rem;
        font-weight: 500;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: hsl(var(--muted-foreground));
        text-decoration: none;
        padding: 0.4rem 0.75rem;
        border-radius: var(--radius-md);
        border: 1px solid transparent;
        transition: all var(--duration-hover) var(--ease-out-expo);
      }
      .btn-logout:hover {
        color: hsl(var(--destructive));
        border-color: hsla(var(--destructive), 0.4);
        background: hsla(var(--destructive), 0.08);
      }
      /* ========================================
         MAIN CONTENT
         ======================================== */
      .app-main {
        flex: 1;
        padding: var(--space-6);
        max-width: 1400px;
        width: 100%;
        margin: 0 auto;
        display: grid;
        grid-template-columns: 420px 1fr;
        gap: var(--space-5);
        align-items: start;
        position: relative;
        z-index: 2;
      }
      /* Staggered reveal animation */
      .app-main > * {
        animation: revealUp var(--duration-page) var(--ease-out) both;
      }
      .app-main > *:nth-child(1) { animation-delay: 60ms; }
      .app-main > *:nth-child(2) { animation-delay: 100ms; }
      .app-main > *:nth-child(3) { animation-delay: 140ms; }
      .app-main > *:nth-child(4) { animation-delay: 180ms; }
      @media (max-width: 1024px) {
        .app-main { grid-template-columns: 1fr; }
      }
      /* ========================================
         CARDS / GLASS SURFACES
         ======================================== */
      .glass-card, .modal-body, .app-modal {
        background: hsla(var(--background), 0.7);
        backdrop-filter: blur(24px) saturate(180%);
        -webkit-backdrop-filter: blur(24px) saturate(180%);
        border: 1px solid hsla(var(--border), 0.5);
        border-radius: var(--radius-xl);
        box-shadow: var(--shadow-md), var(--inner-shadow);
      }
      .glass-card {
        padding: var(--space-5);
        transition: border-color 200ms var(--ease-out), box-shadow 200ms var(--ease-out), transform 200ms var(--ease-out);
      }
      .glass-card:hover {
        border-color: hsla(var(--primary), 0.3);
        box-shadow: var(--shadow-lg);
      }
      /* Entrance animations */
      @keyframes revealUp {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes cardEntrance {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .animate-in { animation: cardEntrance var(--duration-page) var(--ease-out) both; }
      .animate-delay-1 { animation-delay: 0.1s; }
      .animate-delay-2 { animation-delay: 0.2s; }
      .animate-delay-3 { animation-delay: 0.3s; }
      .animate-delay-4 { animation-delay: 0.4s; }
      .animate-delay-5 { animation-delay: 0.5s; }
      /* ========================================
         FORM ELEMENTS
         ======================================== */
      .form-label {
        display: block;
        font-family: var(--font-mono);
        font-size: var(--text-xs);
        font-weight: 500;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: hsl(var(--muted-foreground));
        margin-bottom: var(--space-2);
      }
      .form-input, .form-textarea, .form-select {
        width: 100%;
        font-family: var(--font-body);
        font-size: var(--text-sm);
        padding: var(--space-3) var(--space-4);
        background: hsla(var(--background), 0.5);
        border: 1px solid hsla(var(--border), 0.6);
        border-radius: var(--radius-md);
        color: hsl(var(--foreground));
        outline: none;
        transition: border-color 160ms var(--ease-out), box-shadow 160ms var(--ease-out), background 160ms var(--ease-out);
      }
      .form-input:focus, .form-textarea:focus, .form-select:focus {
        border-color: hsl(var(--primary));
        background: hsla(var(--background), 0.8);
        box-shadow: 0 0 0 3px hsla(var(--primary), 0.12);
      }
      .form-input::placeholder, .form-textarea::placeholder {
        color: hsl(var(--muted-foreground));
        font-style: italic;
        opacity: 0.7;
      }
      .form-textarea { resize: vertical; min-height: 80px; }
      .form-select {
        cursor: pointer;
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='hsl(220,10%,55%)' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 0.75rem center;
        padding-right: 2rem;
      }
      .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
      .form-stack { display: flex; flex-direction: column; gap: var(--space-4); }
      /* ========================================
         CHECKBOXES
         ======================================== */
      .checkbox-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
      }
      .checkbox-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.75rem;
        border-radius: 0.5rem;
        border: 1px solid hsla(var(--border), 0.5);
        background: hsla(var(--input), 0.2);
        cursor: pointer;
        transition: all 0.2s;
        font-size: 0.8rem;
        font-weight: 500;
        color: hsl(var(--secondary-foreground));
      }
      .checkbox-item:hover {
        border-color: hsl(var(--primary));
        background: hsla(var(--primary), 0.06);
        color: hsl(var(--foreground));
      }
      .checkbox-item input[type="checkbox"] {
        width: 14px;
        height: 14px;
        accent-color: hsl(var(--primary));
        cursor: pointer;
        flex-shrink: 0;
      }
      /* ========================================
         BUTTONS
         ======================================== */
      .btn-primary, .btn-publish {
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-3) var(--space-5);
        font-family: var(--font-body);
        font-size: var(--text-sm);
        font-weight: 500;
        letter-spacing: -0.011em;
        border-radius: var(--radius-md);
        background: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
        border: 1px solid hsla(0 0% 0% / 0.08);
        box-shadow: var(--shadow-sm), inset 0 1px 0 hsla(0 0% 100% / 0.12);
        cursor: pointer;
        transition: all var(--duration-hover) var(--ease-out-expo);
        overflow: hidden;
      }
      .btn-primary::before, .btn-publish::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, hsla(0 0% 100% / 0.08) 0%, transparent 100%);
        pointer-events: none;
      }
      .btn-primary:hover, .btn-publish:hover {
        transform: translateY(-1px);
        box-shadow: var(--shadow-md), inset 0 1px 0 hsla(0 0% 100% / 0.15);
      }
      .btn-primary:active, .btn-publish:active {
        transform: scale(0.97);
        box-shadow: var(--shadow-xs), inset 0 1px 0 hsla(0 0% 100% / 0.08);
      }
      .btn-primary {
        width: 100%;
        justify-content: center;
      }
      .btn-publish {
        justify-content: center;
      }

      .retry-btn, .delete-btn, .save-btn, .pub-btn {
        font-family: var(--font-body);
        font-weight: 500;
        font-size: var(--text-sm);
        padding: var(--space-3) var(--space-4);
        border-radius: var(--radius-md);
        border: 1px solid transparent;
        cursor: pointer;
        transition: all var(--duration-hover) var(--ease-out-expo);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-2);
      }
      .retry-btn {
        background: hsla(var(--primary), 0.12);
        color: hsl(var(--primary));
        border-color: hsla(var(--primary), 0.25);
      }
      .retry-btn:hover {
        background: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
        box-shadow: var(--shadow-sm);
        transform: translateY(-1px);
      }
      .retry-btn:active {
        transform: scale(0.95);
      }
      .delete-btn {
        background: hsla(var(--destructive), 0.12);
        color: hsl(var(--destructive));
        border-color: hsla(var(--destructive), 0.25);
      }
      .delete-btn:hover {
        background: hsl(var(--destructive));
        color: hsl(var(--destructive-foreground));
        box-shadow: var(--shadow-sm);
        transform: translateY(-1px);
      }
      .delete-btn:active {
        transform: scale(0.95);
      }
      /* S6: Cancel button — red-tinted outlined style for active jobs */
      .cancel-btn {
        background: hsla(0, 72%, 50%, 0.1);
        color: hsl(0, 72%, 50%);
        border: 1px solid hsla(0, 72%, 50%, 0.3);
        padding: 0.4rem 0.875rem;
        border-radius: var(--radius-md);
        font-size: var(--text-sm);
        font-weight: 500;
        cursor: pointer;
        transition: all var(--duration-hover) var(--ease-out-expo);
        font-family: inherit;
      }
      .cancel-btn:hover {
        background: hsla(0, 72%, 50%, 0.2);
        border-color: hsl(0, 72%, 50%);
        transform: translateY(-1px);
      }
      .save-btn {
        background: hsla(var(--primary), 0.12);
        color: hsl(var(--primary));
        border-color: hsla(var(--primary), 0.25);
        width: 100%;
      }
      .save-btn:hover {
        background: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
        box-shadow: var(--shadow-sm);
        transform: translateY(-1px);
      }
      .pub-btn {
        background: hsla(var(--foreground), 0.04);
        color: hsl(var(--foreground));
        border-color: hsla(var(--border), 0.6);
        width: 100%;
        margin-top: 0.5rem;
      }
      .pub-btn:hover {
        background: hsla(var(--foreground), 0.08);
        border-color: hsla(var(--foreground), 0.3);
      }
      /* ========================================
         SECTION HEADERS
         ======================================== */
      .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1.25rem;
        padding-bottom: var(--space-3);
        border-bottom: 1px solid hsla(var(--border), 0.4);
      }
      .section-title {
        font-family: var(--font-mono);
        font-size: var(--text-xs);
        font-weight: 500;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: hsl(var(--muted-foreground));
        display: flex;
        align-items: center;
        gap: var(--space-2);
      }
      .section-title-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: hsl(var(--primary));
        box-shadow: 0 0 8px hsl(var(--primary));
        animation: pulse-glow 2s ease-in-out infinite;
      }
      @keyframes pulse-glow {
        0%, 100% { opacity: 1; box-shadow: 0 0 8px hsl(var(--primary)); }
        50% { opacity: 0.6; box-shadow: 0 0 16px hsl(var(--primary)); }
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(1.3); }
      }
      /* ========================================
         JOB CARDS
         ======================================== */
      .job-card {
        background: hsla(var(--card), 0.6);
        border: 1px solid hsla(var(--border), 0.5);
        border-radius: var(--radius-lg);
        padding: var(--space-4);
        margin-bottom: var(--space-3);
        transition: border-color 160ms var(--ease-out), box-shadow 160ms var(--ease-out), transform 160ms var(--ease-out);
        position: relative;
        overflow: hidden;
      }
      .job-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)), transparent);
        opacity: 0;
        transition: opacity 160ms var(--ease-out);
      }
      .job-card:hover {
        border-color: hsla(var(--primary), 0.3);
        box-shadow: var(--shadow-md);
        transform: translateY(-2px);
      }
      .job-card:hover::before { opacity: 1; }
      .job-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--space-3);
      }
      .job-id {
        font-family: var(--font-mono);
        font-size: var(--text-xs);
        font-weight: 500;
        color: hsl(var(--muted-foreground));
        letter-spacing: 0.05em;
      }
      .job-id span {
        color: hsl(var(--foreground));
        font-size: var(--text-sm);
      }
      .status-badge, .queue-status, .completion-badge {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-1) var(--space-3);
        font-family: var(--font-mono);
        font-size: var(--text-xs);
        font-weight: 500;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        border-radius: var(--radius-full);
        background: hsla(var(--muted), 0.5);
        border: 1px solid hsla(var(--border), 0.4);
        color: hsl(var(--foreground));
      }
      .status-badge.active::before, .queue-status.processing::before {
        content: '';
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: hsl(var(--primary));
        animation: pulse 2s ease-in-out infinite;
      }
      .status-pending { background: hsla(45, 80%, 50%, 0.15); color: hsl(45, 80%, 60%); border-color: hsla(45, 80%, 50%, 0.3); }
      .status-processing { background: hsla(var(--primary), 0.15); color: hsl(var(--primary)); border-color: hsla(var(--primary), 0.4); }
      .status-completed { background: hsla(142, 60%, 40%, 0.15); color: hsl(142, 60%, 55%); border-color: hsla(142, 60%, 40%, 0.3); }
      .status-failed { background: hsla(var(--destructive), 0.15); color: hsl(var(--destructive)); border-color: hsla(var(--destructive), 0.4); }
      .job-prompt {
        font-size: var(--text-sm);
        color: hsl(var(--secondary-foreground));
        line-height: 1.5;
        margin-bottom: var(--space-3);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .job-progress-wrap {
        margin: var(--space-3) 0;
      }
      .progress-track {
        width: 100%;
        height: 6px;
        background: hsla(var(--border), 0.5);
        border-radius: var(--radius-full);
        overflow: hidden;
        position: relative;
      }
      .progress-fill {
        height: 100%;
        border-radius: var(--radius-full);
        background: linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)));
        transition: width 0.5s var(--ease-out-expo);
        position: relative;
        overflow: hidden;
      }
      .progress-fill::after {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, hsla(0,0%,100%,0.3), transparent);
        animation: progress-shimmer 1.5s ease-in-out infinite;
      }
      @keyframes progress-shimmer {
        0% { left: -100%; }
        100% { left: 200%; }
      }
      .progress-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: var(--space-2);
        font-family: var(--font-mono);
        font-size: var(--text-xs);
        color: hsl(var(--muted-foreground));
      }
      .job-actions {
        display: flex;
        gap: var(--space-2);
        margin-top: var(--space-3);
      }
      .btn-sm {
        padding: 0.4rem 0.875rem;
        border-radius: var(--radius-sm);
        font-size: var(--text-xs);
        font-weight: 500;
        letter-spacing: 0.05em;
        cursor: pointer;
        transition: all var(--duration-hover) var(--ease-out-expo);
        font-family: var(--font-mono);
        border: 1px solid;
      }
      .btn-retry {
        background: transparent;
        border-color: hsla(var(--primary), 0.4);
        color: hsl(var(--primary));
      }
      .btn-retry:hover {
        background: hsla(var(--primary), 0.1);
        border-color: hsl(var(--primary));
      }
      .btn-delete {
        background: transparent;
        border-color: hsla(var(--destructive), 0.3);
        color: hsl(var(--destructive));
      }
      .btn-delete:hover {
        background: hsla(var(--destructive), 0.1);
        border-color: hsl(var(--destructive));
      }
      /* Completed job card */
      .completed-card {
        background: hsla(var(--card), 0.6);
        border: 1px solid hsla(var(--border), 0.4);
        border-radius: 0.875rem;
        padding: 1.25rem;
        margin-bottom: 1rem;
        transition: all 0.3s;
      }
      .completed-card:hover {
        border-color: hsla(var(--primary), 0.25);
        box-shadow: 0 4px 24px hsla(var(--primary), 0.06);
      }
      .video-wrap {
        border-radius: 0.5rem;
        overflow: hidden;
        border: 1px solid hsla(var(--border), 0.5);
        margin: 0.875rem 0;
        background: #000;
      }
      .video-wrap video { width: 100%; display: block; max-height: 280px; object-fit: contain; }
      /* SEO / Marketing Meta */
      .meta-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
        margin-top: 0.875rem;
      }
      .meta-section {
        background: hsla(var(--input), 0.2);
        border: 1px solid hsla(var(--border), 0.4);
        border-radius: 0.5rem;
        padding: 0.75rem;
      }
      .meta-section-title {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.6rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: hsl(var(--primary));
        margin-bottom: 0.5rem;
        display: flex;
        align-items: center;
        gap: 0.35rem;
      }
      .meta-section-title .status-dot {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: currentColor;
        box-shadow: 0 0 6px currentColor;
      }
      .meta-section input, .meta-section textarea {
        width: 100%;
        padding: 0.4rem 0.6rem;
        border-radius: 0.35rem;
        border: 1px solid hsla(var(--border), 0.5);
        background: hsla(var(--input), 0.3);
        color: hsl(var(--foreground));
        font-family: 'Outfit', sans-serif;
        font-size: 0.75rem;
        outline: none;
        transition: all 0.2s;
        margin-bottom: 0.35rem;
      }
      .meta-section input:focus, .meta-section textarea:focus {
        border-color: hsl(var(--primary));
        box-shadow: 0 0 0 2px hsla(var(--primary), 0.12);
      }
      .meta-section textarea { resize: vertical; min-height: 50px; }
      .meta-actions {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.75rem;
      }
      .btn-publish {
        flex: 1;
        padding: 0.45rem 0.6rem;
        border-radius: 0.4rem;
        border: 1px solid hsla(var(--primary), 0.4);
        background: transparent;
        color: hsl(var(--primary));
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.6rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.3rem;
      }
      .btn-publish:hover {
        background: hsla(var(--primary), 0.12);
        border-color: hsl(var(--primary));
        box-shadow: 0 0 12px hsla(var(--primary), 0.2);
      }
      .btn-save-all {
        width: 100%;
        padding: 0.6rem;
        border-radius: 0.4rem;
        border: 1px solid hsla(var(--primary), 0.3);
        background: hsla(var(--primary), 0.08);
        color: hsl(var(--primary));
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        cursor: pointer;
        transition: all 0.2s;
      }
      .btn-save-all:hover {
        background: hsla(var(--primary), 0.16);
        border-color: hsl(var(--primary));
      }
      .btn-delete-project {
        width: 100%;
        padding: 0.5rem;
        border-radius: 0.4rem;
        border: 1px solid hsla(var(--destructive), 0.25);
        background: transparent;
        color: hsl(var(--destructive));
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.65rem;
        font-weight: 600;
        letter-spacing: 0.06em;
        cursor: pointer;
        transition: all 0.2s;
        margin-top: 0.5rem;
      }
      .btn-delete-project:hover {
        background: hsla(var(--destructive), 0.1);
        border-color: hsl(var(--destructive));
      }
      /* ========================================
         MODALS
         ======================================== */
      .modal-backdrop {
        display: none;
        position: fixed;
        inset: 0;
        background: hsla(0 0% 0% / 0.5);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        z-index: 9999;
        animation: fadeIn var(--duration-modal) ease;
      }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      .app-modal {
        display: none;
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10000;
        border-radius: var(--radius-2xl);
        background: hsla(var(--background), 0.95);
        backdrop-filter: blur(30px) saturate(180%);
        -webkit-backdrop-filter: blur(30px) saturate(180%);
        border: 1px solid hsla(var(--border), 0.6);
        box-shadow: var(--shadow-xl);
        overflow: hidden;
        animation: modalReveal var(--duration-modal) var(--ease-out);
      }
      @keyframes modalReveal {
        from { opacity: 0; transform: translate(-50%, -50%) translateY(16px) scale(0.97); }
        to { opacity: 1; transform: translate(-50%, -50%) translateY(0) scale(1); }
      }
      /* @starting-style for modern browsers — smoother modal enter */
      .app-modal {
        @starting-style {
          opacity: 0;
          transform: translate(-50%, -50%) translateY(20px) scale(0.96);
        }
      }
      .modal-w-wide { width: 90%; max-width: 980px; max-height: 88vh; }
      .modal-w-std { width: 90%; max-width: 560px; max-height: 85vh; }
      .modal-w-sm { width: 90%; max-width: 460px; max-height: 80vh; }
      .modal-body { padding: 1.75rem; overflow-y: auto; max-height: calc(88vh - 70px); }
      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--space-4) var(--space-5);
        border-bottom: 1px solid hsla(var(--border), 0.4);
      }
      .modal-title {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        font-family: var(--font-display);
        font-variation-settings: "opsz" 144, "SOFT" 0;
        font-size: var(--text-md);
        font-weight: 500;
        letter-spacing: -0.025em;
        color: hsl(var(--foreground));
      }
      .modal-title-icon {
        width: 32px;
        height: 32px;
        background: hsla(var(--primary), 0.12);
        border: 1px solid hsla(var(--primary), 0.3);
        border-radius: var(--radius-md);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.9rem;
      }
      .modal-close {
        width: 32px;
        height: 32px;
        border-radius: var(--radius-md);
        border: 1px solid hsla(var(--border), 0.5);
        background: transparent;
        color: hsl(var(--muted-foreground));
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 1.1rem;
        font-weight: 700;
        transition: all var(--duration-hover) var(--ease-out-expo);
      }
      .modal-close:hover {
        border-color: hsl(var(--destructive));
        color: hsl(var(--destructive));
        background: hsla(var(--destructive), 0.08);
      }
      /* Modal Tabs */
      .modal-tabs {
        display: flex;
        gap: 0.25rem;
        padding: 0.25rem;
        background: hsla(var(--border), 0.3);
        border-radius: var(--radius-md);
        margin-bottom: 1.25rem;
      }
      .modal-tab, .settings-nav-item, .lang-btn {
        font-family: var(--font-body);
        font-weight: 500;
        letter-spacing: -0.011em;
        padding: var(--space-3) var(--space-4);
        border-radius: var(--radius-md);
        transition: all var(--duration-hover) var(--ease-out-expo);
      }
      .modal-tab {
        flex: 1;
        border: none;
        background: transparent;
        color: hsl(var(--muted-foreground));
        font-size: var(--text-xs);
        letter-spacing: 0.06em;
        text-transform: uppercase;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-2);
      }
      .modal-tab:hover { color: hsl(var(--foreground)); background: hsla(var(--border), 0.4); }
      .modal-tab.active {
        background: hsl(var(--foreground));
        color: hsl(var(--background));
        box-shadow: var(--shadow-sm);
      }
      .tab-content { display: none; }
      .tab-content.active { display: block; }
      /* Settings form fields */
      .setting-field { margin-bottom: 1.25rem; }
      .setting-field label {
        display: block;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.65rem;
        font-weight: 600;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: hsl(var(--muted-foreground));
        margin-bottom: 0.5rem;
      }
      /* Theme swatches */
      .theme-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 0.5rem;
        margin: 1rem 0;
      }
      .theme-swatch {
        aspect-ratio: 1;
        border-radius: 0.5rem;
        border: 2px solid hsla(var(--border), 0.5);
        cursor: pointer;
        transition: all 0.2s;
        position: relative;
        overflow: hidden;
      }
      .theme-swatch:hover { border-color: hsl(var(--primary)); transform: scale(1.05); }
      .theme-swatch.active { border-color: hsl(var(--primary)); box-shadow: 0 0 12px hsla(var(--primary), 0.4); }
      .theme-swatch::after {
        content: attr(data-name);
        position: absolute;
        bottom: 4px;
        left: 0;
        right: 0;
        text-align: center;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.5rem;
        font-weight: 600;
        color: hsla(0,0%,100%,0.8);
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }
      /* Language buttons */
      .lang-buttons { display: flex; gap: 0.5rem; }
      .lang-btn {
        flex: 1;
        padding: 0.65rem;
        border-radius: var(--radius-md);
        border: 1px solid hsla(var(--border), 0.5);
        background: transparent;
        color: hsl(var(--muted-foreground));
        font-family: var(--font-mono);
        font-size: 0.75rem;
        font-weight: 500;
        cursor: pointer;
        transition: all var(--duration-hover) var(--ease-out-expo);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
      }
      .lang-btn:hover { border-color: hsl(var(--primary)); color: hsl(var(--foreground)); }
      .lang-btn.active {
        background: hsla(var(--primary), 0.1);
        border-color: hsl(var(--primary));
        color: hsl(var(--primary));
      }
      /* Help modal */
      .help-search {
        position: relative;
        margin-bottom: 1rem;
      }
      .help-search input {
        width: 100%;
        padding: 0.65rem 0.875rem 0.65rem 2.5rem;
        border-radius: 0.5rem;
        border: 1px solid hsla(var(--border), 0.5);
        background: hsla(var(--input), 0.3);
        color: hsl(var(--foreground));
        font-family: 'Outfit', sans-serif;
        font-size: 0.875rem;
        outline: none;
        transition: all 0.2s;
      }
      .help-search input:focus {
        border-color: hsl(var(--primary));
        box-shadow: 0 0 0 3px hsla(var(--primary), 0.12);
      }
      .help-search-icon {
        position: absolute;
        left: 0.875rem;
        top: 50%;
        transform: translateY(-50%);
        color: hsl(var(--muted-foreground));
        font-size: 0.875rem;
      }
      .help-topics {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
        max-height: 300px;
        overflow-y: auto;
      }
      .help-topic-btn {
        padding: 0.65rem 0.875rem;
        border-radius: 0.5rem;
        border: 1px solid hsla(var(--border), 0.4);
        background: hsla(var(--input), 0.2);
        color: hsl(var(--secondary-foreground));
        font-family: 'Outfit', sans-serif;
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .help-topic-btn:hover, .help-topic-btn.active {
        border-color: hsl(var(--primary));
        background: hsla(var(--primary), 0.08);
        color: hsl(var(--foreground));
      }
      .help-content { margin-top: 1rem; }
      .help-section {
        margin-bottom: 1rem;
        padding: 1rem;
        background: hsla(var(--input), 0.2);
        border-radius: 0.5rem;
        border: 1px solid hsla(var(--border), 0.3);
      }
      .help-section h4 {
        font-size: 0.75rem;
        font-weight: 700;
        color: hsl(var(--primary));
        margin-bottom: 0.5rem;
        font-family: 'JetBrains Mono', monospace;
        letter-spacing: 0.05em;
      }
      .help-section p, .help-section ol {
        font-size: 0.8rem;
        color: hsl(var(--secondary-foreground));
        line-height: 1.6;
      }
      .help-section ol { padding-left: 1.25rem; }
      .help-section li { margin-bottom: 0.35rem; }
      /* Opportunity cards */
      .opp-scroll { display: flex; gap: 0.875rem; overflow-x: auto; padding-bottom: 0.75rem; }
      .opp-scroll::-webkit-scrollbar { height: 4px; }
      .opp-scroll::-webkit-scrollbar-thumb { background: hsl(var(--primary)); border-radius: 4px; }
      .opp-card {
        flex: 0 0 200px;
        background: hsla(var(--card), 0.7);
        border: 1px solid hsla(var(--border), 0.5);
        border-radius: 0.75rem;
        padding: 0.875rem;
        transition: all 0.25s;
        cursor: pointer;
      }
      .opp-card:hover {
        border-color: hsl(var(--primary));
        box-shadow: 0 8px 24px hsla(var(--primary), 0.12);
        transform: translateY(-3px);
      }
      .opp-card img {
        width: 100%;
        aspect-ratio: 16/9;
        object-fit: cover;
        border-radius: 0.4rem;
        margin-bottom: 0.6rem;
        border: 1px solid hsla(var(--border), 0.3);
      }
      .opp-card-title {
        font-size: 0.75rem;
        font-weight: 600;
        color: hsl(var(--foreground));
        line-height: 1.3;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        margin-bottom: 0.4rem;
      }
      .opp-card-views {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.6rem;
        color: hsl(var(--muted-foreground));
        margin-bottom: 0.4rem;
      }
      .opp-score {
        display: inline-block;
        padding: 0.2rem 0.5rem;
        border-radius: 20px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.6rem;
        font-weight: 800;
        letter-spacing: 0.05em;
      }
      .score-high { background: hsla(142, 60%, 40%, 0.2); color: hsl(142, 60%, 55%); }
      .score-med { background: hsla(var(--primary), 0.15); color: hsl(var(--primary)); }
      .score-low { background: hsla(45, 80%, 50%, 0.15); color: hsl(45, 80%, 60%); }

      /* --- Opportunity Funnel v2 (Sprint 2) --- */
      .opp-step-header { margin-bottom: 1.25rem; }
      .opp-step-title {
        margin: 0 0 0.35rem 0;
        font-size: 1rem;
        font-weight: 700;
        color: hsl(var(--foreground));
        letter-spacing: 0.02em;
      }
      .opp-step-sub {
        margin: 0;
        font-size: 0.78rem;
        color: hsl(var(--muted-foreground));
        line-height: 1.5;
      }
      .opp-input-row {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }
      .opp-search-input {
        flex: 1;
        padding: 0.7rem 0.95rem;
        border-radius: 0.6rem;
        border: 1px solid hsla(var(--border), 0.7);
        background: hsla(var(--input), 0.5);
        color: hsl(var(--foreground));
        font-size: 0.85rem;
        font-family: 'Inter', sans-serif;
        outline: none;
        transition: border 0.2s, box-shadow 0.2s;
      }
      .opp-search-input:focus {
        border-color: hsl(var(--primary));
        box-shadow: 0 0 0 3px hsla(var(--primary), 0.15);
      }
      .opp-search-input-inline { flex: 1; }
      .opp-add-btn { width: auto; padding: 0.55rem 1rem; }
      .opp-chips-label {
        font-size: 0.65rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: hsl(var(--muted-foreground));
        margin-bottom: 0.5rem;
        font-weight: 700;
      }
      .opp-interest-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem;
        min-height: 2.2rem;
        align-items: center;
        padding: 0.4rem;
        background: hsla(var(--muted), 0.25);
        border: 1px dashed hsla(var(--border), 0.6);
        border-radius: 0.6rem;
      }
      .opp-chips-empty {
        font-size: 0.72rem;
        color: hsl(var(--muted-foreground));
        font-style: italic;
        padding: 0 0.35rem;
      }
      .opp-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.3rem 0.45rem 0.3rem 0.7rem;
        border-radius: 999px;
        background: hsla(var(--primary), 0.15);
        color: hsl(var(--primary));
        font-size: 0.72rem;
        font-weight: 600;
        border: 1px solid hsla(var(--primary), 0.35);
      }
      .opp-chip button {
        background: hsla(var(--primary), 0.25);
        color: hsl(var(--primary));
        border: none;
        width: 1.1rem;
        height: 1.1rem;
        border-radius: 50%;
        line-height: 1;
        font-size: 0.7rem;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        transition: background 0.15s;
      }
      .opp-chip button:hover { background: hsl(var(--destructive)); color: hsl(var(--background)); }
      .opp-suggestions { display: flex; flex-wrap: wrap; gap: 0.4rem; }
      .opp-suggestion {
        background: transparent;
        border: 1px dashed hsla(var(--border), 0.8);
        color: hsl(var(--muted-foreground));
        padding: 0.3rem 0.7rem;
        border-radius: 999px;
        cursor: pointer;
        font-size: 0.72rem;
        font-weight: 500;
        transition: all 0.18s;
      }
      .opp-suggestion:hover {
        border-color: hsl(var(--primary));
        color: hsl(var(--primary));
        background: hsla(var(--primary), 0.08);
      }
      .opp-step1-actions {
        margin-top: 1.5rem;
        display: flex;
        justify-content: flex-end;
      }
      .opp-step1-actions .btn-publish[disabled] {
        opacity: 0.4;
        cursor: not-allowed;
        filter: grayscale(0.6);
      }
      .opp-results-toolbar {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        margin-bottom: 0.85rem;
      }
      .opp-back-btn {
        background: transparent;
        border: 1px solid hsla(var(--border), 0.7);
        color: hsl(var(--muted-foreground));
        padding: 0.55rem 0.85rem;
        border-radius: 0.5rem;
        cursor: pointer;
        font-size: 0.78rem;
        font-weight: 600;
        transition: all 0.18s;
      }
      .opp-back-btn:hover { color: hsl(var(--foreground)); border-color: hsl(var(--primary)); }
      .opp-refresh-btn { width: auto; padding: 0.55rem 0.9rem; }
      .opp-results-meta {
        font-size: 0.72rem;
        color: hsl(var(--muted-foreground));
        margin-bottom: 0.55rem;
        font-family: 'JetBrains Mono', monospace;
      }
      .opp-results-scroll {
        display: flex;
        flex-direction: row;
        gap: 1rem;
        overflow-x: auto;
        overflow-y: visible;
        padding: 0.75rem 0.25rem 1rem 0.25rem;
        scroll-snap-type: x mandatory;
        scrollbar-width: thin;
        scrollbar-color: hsl(var(--primary)) transparent;
        min-height: 320px;
      }
      .opp-results-scroll::-webkit-scrollbar { height: 8px; }
      .opp-results-scroll::-webkit-scrollbar-track { background: hsla(var(--muted), 0.3); border-radius: 4px; }
      .opp-results-scroll::-webkit-scrollbar-thumb { background: hsl(var(--primary)); border-radius: 4px; }
      .opp-video-card {
        flex: 0 0 280px;
        scroll-snap-align: start;
        background: hsla(var(--card), 0.75);
        border: 1px solid hsla(var(--border), 0.5);
        border-radius: 0.85rem;
        padding: 0.85rem;
        display: flex;
        flex-direction: column;
        gap: 0.55rem;
        position: relative;
        transition: all 0.22s;
        backdrop-filter: blur(4px);
      }
      .opp-video-card:hover {
        border-color: hsl(var(--primary));
        box-shadow: 0 8px 26px hsla(var(--primary), 0.16);
        transform: translateY(-4px);
      }
      .opp-card-thumb {
        position: relative;
        width: 100%;
        aspect-ratio: 16 / 9;
        border-radius: 0.55rem;
        overflow: hidden;
        background: hsla(var(--muted), 0.5);
        border: 1px solid hsla(var(--border), 0.4);
      }
      .opp-card-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        transition: transform 0.4s;
      }
      .opp-video-card:hover .opp-card-thumb img { transform: scale(1.04); }
      .opp-card-title-2 {
        font-size: 0.82rem;
        font-weight: 600;
        color: hsl(var(--foreground));
        line-height: 1.35;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        min-height: 2.3rem;
      }
      .opp-card-channel {
        font-size: 0.68rem;
        color: hsl(var(--muted-foreground));
        display: flex;
        align-items: center;
        gap: 0.35rem;
        font-family: 'JetBrains Mono', monospace;
      }
      .opp-card-channel-name {
        font-weight: 600;
        color: hsl(var(--foreground));
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 140px;
      }
      .opp-card-stats {
        display: flex;
        gap: 0.6rem;
        font-size: 0.65rem;
        color: hsl(var(--muted-foreground));
        font-family: 'JetBrains Mono', monospace;
        flex-wrap: wrap;
      }
      .opp-card-stats span { display: inline-flex; align-items: center; gap: 0.2rem; }
      .opp-score-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.25rem 0.6rem;
        border-radius: 999px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.66rem;
        font-weight: 800;
        letter-spacing: 0.05em;
        align-self: flex-start;
        border: 1px solid currentColor;
      }
      .opp-score-high {
        background: hsla(142, 70%, 45%, 0.16);
        color: hsl(142, 70%, 45%);
      }
      .opp-score-med {
        background: hsla(190, 90%, 50%, 0.15);
        color: hsl(190, 90%, 50%);
      }
      .opp-score-low {
        background: hsla(45, 100%, 50%, 0.16);
        color: hsl(45, 100%, 50%);
      }
      .opp-score-none {
        background: hsla(220, 10%, 50%, 0.16);
        color: hsl(220, 10%, 60%);
      }
      .opp-desc-toggle {
        background: transparent;
        border: 1px dashed hsla(var(--border), 0.6);
        color: hsl(var(--muted-foreground));
        padding: 0.3rem 0.55rem;
        border-radius: 0.4rem;
        cursor: pointer;
        font-size: 0.65rem;
        font-weight: 600;
        font-family: 'JetBrains Mono', monospace;
        align-self: flex-start;
        transition: all 0.18s;
      }
      .opp-desc-toggle:hover { color: hsl(var(--primary)); border-color: hsl(var(--primary)); }
      .opp-desc-body {
        font-size: 0.7rem;
        color: hsl(var(--muted-foreground));
        line-height: 1.5;
        max-height: 8rem;
        overflow-y: auto;
        padding: 0.5rem;
        background: hsla(var(--muted), 0.3);
        border-radius: 0.4rem;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .opp-card-cta {
        margin-top: auto;
        background: hsla(var(--primary), 0.15);
        color: hsl(var(--primary));
        border: 1px solid hsla(var(--primary), 0.4);
        padding: 0.5rem 0.7rem;
        border-radius: 0.5rem;
        text-decoration: none;
        font-size: 0.72rem;
        font-weight: 700;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
        display: block;
      }
      .opp-card-cta:hover {
        background: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
        transform: translateY(-1px);
      }
      .opp-hover-preview {
        position: fixed;
        z-index: 100000;
        width: 320px;
        background: hsla(var(--card), 0.98);
        border: 1px solid hsl(var(--primary));
        border-radius: 0.7rem;
        padding: 0.85rem;
        box-shadow: 0 12px 36px hsla(var(--primary), 0.25), 0 0 0 1px hsla(var(--primary), 0.2);
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.18s;
        backdrop-filter: blur(8px);
      }
      .opp-hover-preview.visible { opacity: 1; }
      .opp-hover-preview img {
        width: 100%;
        aspect-ratio: 16/9;
        object-fit: cover;
        border-radius: 0.45rem;
        margin-bottom: 0.6rem;
      }
      .opp-hover-preview .hp-title {
        font-size: 0.85rem;
        font-weight: 700;
        color: hsl(var(--foreground));
        margin-bottom: 0.4rem;
        line-height: 1.3;
      }
      .opp-hover-preview .hp-desc {
        font-size: 0.7rem;
        color: hsl(var(--muted-foreground));
        line-height: 1.5;
        max-height: 6rem;
        overflow: hidden;
        position: relative;
      }
      .opp-hover-preview .hp-meta {
        font-size: 0.65rem;
        color: hsl(var(--muted-foreground));
        font-family: 'JetBrains Mono', monospace;
        margin-bottom: 0.4rem;
      }
      @keyframes oppShimmer {
        0% { background-position: -468px 0; }
        100% { background-position: 468px 0; }
      }
      .opp-skeleton {
        flex: 0 0 280px;
        scroll-snap-align: start;
        background: hsla(var(--card), 0.5);
        border: 1px solid hsla(var(--border), 0.4);
        border-radius: 0.85rem;
        padding: 0.85rem;
        display: flex;
        flex-direction: column;
        gap: 0.55rem;
      }
      .opp-skeleton-block {
        background: linear-gradient(90deg, hsla(var(--muted), 0.3) 8%, hsla(var(--muted), 0.6) 18%, hsla(var(--muted), 0.3) 33%);
        background-size: 800px 100%;
        animation: oppShimmer 1.4s infinite linear;
        border-radius: 0.4rem;
      }
      .opp-skel-thumb { width: 100%; aspect-ratio: 16/9; }
      .opp-skel-line { height: 0.7rem; }
      .opp-skel-line.short { width: 60%; }
      .opp-empty-state {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 2.5rem 1rem;
        color: hsl(var(--muted-foreground));
        gap: 0.5rem;
      }
      .opp-empty-state .opp-empty-icon { font-size: 2.5rem; opacity: 0.6; }
      .opp-empty-state .opp-empty-title { font-size: 0.9rem; font-weight: 700; color: hsl(var(--foreground)); }
      .opp-empty-state .opp-empty-sub { font-size: 0.78rem; max-width: 320px; line-height: 1.5; }
      .opp-empty-state .opp-empty-link {
        margin-top: 0.6rem;
        padding: 0.5rem 1rem;
        background: hsla(var(--primary), 0.15);
        border: 1px solid hsla(var(--primary), 0.4);
        color: hsl(var(--primary));
        border-radius: 0.5rem;
        font-size: 0.75rem;
        font-weight: 700;
        cursor: pointer;
        text-decoration: none;
      }
      .opp-empty-state .opp-empty-link:hover { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); }
      .opp-error-state {
        flex: 1;
        background: hsla(0, 70%, 50%, 0.08);
        border: 1px solid hsla(0, 70%, 50%, 0.3);
        border-radius: 0.7rem;
        padding: 1.25rem;
        color: hsl(0, 70%, 70%);
        font-size: 0.8rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin: 0 0.25rem;
      }
      .opp-error-state button {
        background: hsla(0, 70%, 50%, 0.2);
        color: hsl(0, 70%, 70%);
        border: 1px solid hsla(0, 70%, 50%, 0.4);
        padding: 0.45rem 0.8rem;
        border-radius: 0.45rem;
        cursor: pointer;
        font-weight: 700;
        font-size: 0.72rem;
      }
      .opp-error-state button:hover { background: hsla(0, 70%, 50%, 0.35); }

      /* --- Opportunity Funnel v2.5: Languages + Differentiate --- */
      .opp-lang-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
        margin-bottom: 0.5rem;
      }
      .opp-lang-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.4rem 0.7rem;
        border-radius: 999px;
        background: hsla(var(--input), 0.5);
        border: 1px solid hsla(var(--border), 0.6);
        color: hsl(var(--muted-foreground));
        font-size: 0.72rem;
        font-weight: 600;
        cursor: pointer;
        user-select: none;
        transition: all 0.18s ease;
      }
      .opp-lang-chip:hover { border-color: hsl(var(--primary)); }
      .opp-lang-chip.checked {
        background: linear-gradient(135deg, hsla(var(--primary), 0.18), hsla(var(--primary), 0.06));
        border-color: hsl(var(--primary));
        color: hsl(var(--primary));
        box-shadow: 0 0 0 1px hsla(var(--primary), 0.3);
      }
      .opp-lang-chip input { display: none; }
      .opp-lang-chip .opp-lang-flag { font-size: 0.95rem; }

      .opp-differentiate-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        width: 100%;
        justify-content: center;
        padding: 0.55rem 0.85rem;
        margin-top: 0.5rem;
        background: linear-gradient(135deg, hsl(var(--primary)), hsl(280, 70%, 55%));
        color: hsl(var(--primary-foreground));
        border: none;
        border-radius: 0.55rem;
        font-weight: 700;
        font-size: 0.75rem;
        cursor: pointer;
        letter-spacing: 0.02em;
        position: relative;
        overflow: hidden;
        transition: transform 0.18s ease, box-shadow 0.18s ease;
      }
      .opp-differentiate-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 18px hsla(var(--primary), 0.35);
      }
      .opp-differentiate-btn::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(120deg, transparent 30%, hsla(255,255,255,0.18) 50%, transparent 70%);
        transform: translateX(-100%);
        transition: transform 0.6s ease;
      }
      .opp-differentiate-btn:hover::before { transform: translateX(100%); }
      .opp-differentiate-btn[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }
      .opp-differentiate-btn .spin { animation: oppSpin 0.9s linear infinite; }
      @keyframes oppSpin { to { transform: rotate(360deg); } }

      .diff-modal-width { max-width: 540px; }
      .diff-preview {
        display: flex;
        gap: 0.85rem;
        padding: 0.85rem;
        background: hsla(var(--input), 0.4);
        border: 1px solid hsla(var(--border), 0.5);
        border-radius: 0.7rem;
        margin-bottom: 1rem;
      }
      .diff-preview-thumb {
        width: 140px;
        aspect-ratio: 16/9;
        object-fit: cover;
        border-radius: 0.45rem;
        flex-shrink: 0;
        background: hsl(var(--background));
      }
      .diff-preview-info { flex: 1; min-width: 0; }
      .diff-preview-title {
        font-size: 0.85rem;
        font-weight: 700;
        color: hsl(var(--foreground));
        line-height: 1.3;
        margin-bottom: 0.25rem;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .diff-preview-channel {
        font-size: 0.7rem;
        color: hsl(var(--muted-foreground));
        font-family: 'JetBrains Mono', monospace;
      }

      .diff-form-row { margin-bottom: 0.85rem; }
      .diff-form-label {
        display: block;
        font-size: 0.72rem;
        font-weight: 700;
        color: hsl(var(--muted-foreground));
        margin-bottom: 0.4rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .diff-form-select {
        width: 100%;
        padding: 0.6rem 0.75rem;
        background: hsla(var(--input), 0.6);
        color: hsl(var(--foreground));
        border: 1px solid hsla(var(--border), 0.7);
        border-radius: 0.5rem;
        font-size: 0.85rem;
        font-family: inherit;
        outline: none;
      }
      .diff-form-select:focus { border-color: hsl(var(--primary)); }

      .diff-radio-group { display: flex; flex-direction: column; gap: 0.4rem; }
      .diff-radio {
        display: flex;
        align-items: center;
        gap: 0.55rem;
        padding: 0.55rem 0.7rem;
        background: hsla(var(--input), 0.45);
        border: 1px solid hsla(var(--border), 0.5);
        border-radius: 0.5rem;
        cursor: pointer;
        transition: all 0.18s ease;
      }
      .diff-radio:hover { border-color: hsl(var(--primary)); }
      .diff-radio.checked {
        background: linear-gradient(135deg, hsla(var(--primary), 0.12), hsla(var(--primary), 0.04));
        border-color: hsl(var(--primary));
      }
      .diff-radio input { margin: 0; accent-color: hsl(var(--primary)); }
      .diff-radio-label { font-size: 0.82rem; color: hsl(var(--foreground)); font-weight: 600; }
      .diff-radio-sub { font-size: 0.7rem; color: hsl(var(--muted-foreground)); margin-left: auto; }

      .diff-steps {
        list-style: none;
        margin: 0.5rem 0 1rem 0;
        padding: 0.75rem 0.85rem;
        background: hsla(var(--input), 0.35);
        border: 1px dashed hsla(var(--border), 0.6);
        border-radius: 0.55rem;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }
      .diff-steps li {
        font-size: 0.78rem;
        color: hsl(var(--secondary-foreground));
        display: flex;
        align-items: center;
        gap: 0.5rem;
        line-height: 1.4;
      }
      .diff-steps li::before {
        content: '';
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: hsl(var(--primary));
        flex-shrink: 0;
      }

      .diff-submit-row { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem; }
      .diff-submit-btn {
        padding: 0.7rem 1.4rem;
        background: linear-gradient(135deg, hsl(var(--primary)), hsl(280, 70%, 55%));
        color: hsl(var(--primary-foreground));
        border: none;
        border-radius: 0.55rem;
        font-weight: 700;
        font-size: 0.85rem;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        transition: all 0.18s ease;
      }
      .diff-submit-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 18px hsla(var(--primary), 0.35); }
      .diff-submit-btn[disabled] { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }
      .diff-cancel-btn {
        padding: 0.7rem 1.1rem;
        background: transparent;
        color: hsl(var(--muted-foreground));
        border: 1px solid hsla(var(--border), 0.6);
        border-radius: 0.55rem;
        font-size: 0.82rem;
        cursor: pointer;
        font-weight: 600;
      }
      .diff-cancel-btn:hover { color: hsl(var(--foreground)); border-color: hsl(var(--primary)); }

      /* Two-step differentiation: review/edit view */
      .diff-review-details {
        margin-top: 0.6rem;
        border: 1px solid hsla(var(--border), 0.5);
        border-radius: 0.55rem;
        background: hsla(var(--background), 0.4);
      }
      .diff-review-details > summary {
        cursor: pointer;
        padding: 0.55rem 0.75rem;
        font-size: 0.78rem;
        font-weight: 600;
        color: hsl(var(--muted-foreground));
        user-select: none;
        list-style: none;
      }
      .diff-review-details > summary::-webkit-details-marker { display: none; }
      .diff-review-details > summary::before {
        content: '▸';
        margin-right: 0.4rem;
        transition: transform 0.15s ease;
        display: inline-block;
      }
      .diff-review-details[open] > summary::before { transform: rotate(90deg); }
      .diff-review-details[open] > summary { color: hsl(var(--foreground)); }
      .diff-review-readonly {
        padding: 0.6rem 0.85rem;
        border-top: 1px solid hsla(var(--border), 0.4);
        font-size: 0.78rem;
        line-height: 1.5;
        color: hsl(var(--muted-foreground));
        max-height: 220px;
        overflow-y: auto;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .diff-review-textarea {
        width: 100%;
        min-height: 280px;
        background: hsla(var(--background), 0.6);
        color: hsl(var(--foreground));
        border: 1px solid hsla(var(--border), 0.5);
        border-radius: 0.5rem;
        padding: 0.75rem;
        font-family: inherit;
        font-size: 0.85rem;
        line-height: 1.5;
        resize: vertical;
        box-sizing: border-box;
      }
      .diff-review-textarea:focus {
        outline: none;
        border-color: hsl(var(--primary));
        box-shadow: 0 0 0 2px hsla(var(--primary), 0.2);
      }
      .diff-char-count {
        font-size: 0.7rem;
        color: hsl(var(--muted-foreground));
        text-align: right;
        margin-top: 0.25rem;
      }

      /* Dashboard: manual start button + awaiting-approval badge */
      .start-btn {
        background: linear-gradient(135deg, hsl(142 70% 45%), hsl(190 90% 50%));
        color: white;
        font-weight: 600;
        border: none;
        border-radius: 0.5rem;
        padding: 0.55rem 1rem;
        font-size: 0.85rem;
        cursor: pointer;
        transition: transform 160ms var(--ease-out), box-shadow 160ms var(--ease-out);
      }
      .start-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 18px hsla(190 90% 50% / 0.35);
      }
      .start-btn:active {
        transform: scale(0.95);
      }
      .approval-pending-badge {
        background: hsla(45 100% 50% / 0.15);
        color: hsl(45 100% 50%);
        padding: 0.25rem 0.6rem;
        border-radius: 999px;
        font-size: 0.7rem;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
      }
      .phase1-pending-badge {
        background: hsla(190 90% 50% / 0.15);
        color: hsl(190 90% 50%);
        padding: 0.25rem 0.6rem;
        border-radius: 999px;
        font-size: 0.7rem;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .phase1-pending-badge:hover {
        background: hsla(190 90% 50% / 0.25);
        transform: translateY(-1px);
      }
      .diff-timeout-warning {
        margin-top: 1rem;
        padding: 0.75rem 1rem;
        background: hsla(45 100% 50% / 0.1);
        border: 1px solid hsla(45 100% 50% / 0.3);
        border-radius: 0.5rem;
        font-size: 0.85rem;
      }
      .diff-error-msg {
        margin-top: 1rem;
        padding: 0.75rem 1rem;
        background: hsla(0 84% 60% / 0.1);
        border: 1px solid hsla(0 84% 60% / 0.3);
        border-radius: 0.5rem;
        font-size: 0.85rem;
      }
      .diff-error-msg p {
        margin: 0 0 0.5rem 0;
        color: hsl(0 84% 60%);
      }
      .diff-timeout-warning p {
        margin: 0 0 0.5rem 0;
      }

      /* Empty states */
      .empty-state {
        text-align: center;
        padding: 2rem 1rem;
        color: hsl(var(--muted-foreground));
        font-size: 0.875rem;
      }
      .empty-state-icon {
        font-size: 2rem;
        margin-bottom: 0.5rem;
        opacity: 0.4;
      }
      /* Utility */
      .mt-1 { margin-top: 0.75rem; }
      .mt-2 { margin-top: 1.5rem; }
      .text-center { text-align: center; }
      /* ========================================
         COLAB STATUS BADGE (S3)
         ======================================== */
      .colab-status-wrap { position: relative; }
      .colab-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        padding: 0.4rem 0.75rem;
        border-radius: 0.625rem;
        border: 1px solid hsla(var(--border), 0.7);
        background: hsla(var(--secondary), 0.4);
        color: hsl(var(--muted-foreground));
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.05em;
        cursor: pointer;
        transition: all 0.2s;
        backdrop-filter: blur(10px);
      }
      .colab-badge:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
      .colab-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: hsl(220, 10%, 50%);
        flex-shrink: 0;
        transition: background 0.25s, box-shadow 0.25s;
      }
      .colab-stopped .colab-dot { background: hsl(220, 10%, 50%); }
      .colab-starting .colab-dot { background: hsl(45, 100%, 55%); box-shadow: 0 0 8px hsla(45, 100%, 55%, 0.7); animation: colabPulse 1s ease-in-out infinite; }
      .colab-stopping .colab-dot { background: hsl(45, 100%, 55%); animation: colabPulse 1s ease-in-out infinite; }
      .colab-running .colab-dot { background: hsl(142, 70%, 50%); box-shadow: 0 0 8px hsla(142, 70%, 50%, 0.7); }
      .colab-error .colab-dot { background: hsl(0, 70%, 55%); box-shadow: 0 0 8px hsla(0, 70%, 55%, 0.7); }
      .colab-stopped { opacity: 0.7; }
      .colab-error { border-color: hsla(0, 70%, 55%, 0.4); color: hsl(0, 70%, 65%); }
      .colab-running { border-color: hsla(142, 70%, 50%, 0.4); color: hsl(142, 70%, 60%); }
      .colab-starting, .colab-stopping { border-color: hsla(45, 100%, 55%, 0.4); color: hsl(45, 100%, 60%); }
      @keyframes colabPulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.25); opacity: 0.65; }
      }
      .colab-label { white-space: nowrap; }
      .colab-popover {
        position: absolute;
        top: calc(100% + 0.5rem);
        right: 0;
        width: 320px;
        background: hsla(220, 30%, 9%, 0.97);
        backdrop-filter: blur(30px) saturate(180%);
        border: 1px solid hsla(var(--primary), 0.3);
        border-radius: 0.85rem;
        box-shadow: 0 12px 36px rgba(0,0,0,0.5), 0 0 24px hsla(var(--primary), 0.1);
        z-index: 1000;
        animation: colabPopoverIn 0.18s ease;
      }
      @keyframes colabPopoverIn {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .colab-popover-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.7rem 0.95rem;
        border-bottom: 1px solid hsla(var(--border), 0.4);
        font-size: 0.78rem;
        font-weight: 700;
        color: hsl(var(--foreground));
      }
      .colab-popover-close {
        background: transparent;
        border: none;
        color: hsl(var(--muted-foreground));
        cursor: pointer;
        font-size: 1.1rem;
        line-height: 1;
        padding: 0;
      }
      .colab-popover-close:hover { color: hsl(var(--destructive)); }
      .colab-popover-body { padding: 0.7rem 0.95rem; }
      .colab-status-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.5rem;
        padding: 0.35rem 0;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.7rem;
        color: hsl(var(--muted-foreground));
        border-bottom: 1px dashed hsla(var(--border), 0.3);
      }
      .colab-status-row:last-of-type { border-bottom: none; }
      .colab-status-row b {
        color: hsl(var(--foreground));
        font-weight: 600;
        text-align: right;
        max-width: 60%;
      }
      .colab-popover-actions {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.65rem;
      }
      .colab-action-btn {
        flex: 1;
        padding: 0.5rem 0.7rem;
        border-radius: 0.5rem;
        border: 1px solid hsla(var(--border), 0.6);
        background: hsla(var(--secondary), 0.3);
        color: hsl(var(--muted-foreground));
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.65rem;
        font-weight: 700;
        letter-spacing: 0.05em;
        cursor: pointer;
        transition: all 0.18s;
      }
      .colab-action-btn:hover { color: hsl(var(--foreground)); border-color: hsl(var(--primary)); }
      .colab-action-start:hover {
        background: hsla(142, 70%, 50%, 0.15);
        color: hsl(142, 70%, 60%);
        border-color: hsl(142, 70%, 50%);
      }
      .colab-action-stop:hover {
        background: hsla(0, 70%, 55%, 0.15);
        color: hsl(0, 70%, 65%);
        border-color: hsl(0, 70%, 55%);
      }
      .colab-action-btn:disabled { opacity: 0.4; cursor: not-allowed; }

      /* ========================================
         SCROLLBAR
         ======================================== */
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: hsla(var(--border), 0.6); border-radius: 10px; }
      ::-webkit-scrollbar-thumb:hover { background: hsla(var(--primary), 0.4); }
      /* ========================================
         RESPONSIVE
         ======================================== */
      @media (max-width: 768px) {
        .app-main { padding: 1rem; }
        .meta-grid { grid-template-columns: 1fr; }
        .form-grid-2 { grid-template-columns: 1fr; }
        .help-topics { grid-template-columns: 1fr; }
      }

      /* Touch device hover protection — Emil design principle */
      @media (hover: none) and (pointer: coarse) {
        .icon-btn:hover {
          transform: none;
          border-color: hsla(var(--border), 0.7);
          color: hsl(var(--muted-foreground));
          box-shadow: none;
        }
        .glass-card:hover, .job-card:hover {
          transform: none;
        }
      }

      /* Reduced motion accessibility — Emil design principle */
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }

      /* ========================================
         SETTINGS — D-NOTE INSPIRED LAYOUT
         ======================================== */
      .settings-layout {
        display: flex;
        gap: 0;
        min-height: 460px;
      }
      .settings-sidebar {
        width: 200px;
        flex-shrink: 0;
        background: hsla(var(--background), 0.4);
        border-right: 1px solid hsla(var(--border), 0.5);
        padding: 1.25rem 0.85rem;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .settings-nav-item {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        padding: 0.65rem 0.85rem;
        border-radius: var(--radius-md);
        font-size: var(--text-sm);
        color: hsl(var(--muted-foreground));
        background: transparent;
        border: none;
        cursor: pointer;
        text-align: left;
        font-family: inherit;
        position: relative;
      }
      .settings-nav-item:hover {
        background: hsla(var(--foreground), 0.05);
        color: hsl(var(--foreground));
      }
      .settings-nav-item.active {
        background: hsl(var(--foreground));
        color: hsl(var(--background));
        font-weight: 500;
        box-shadow: var(--shadow-sm);
      }
      .settings-nav-icon {
        font-size: 1rem;
        width: 22px;
        text-align: center;
        filter: grayscale(0.2);
      }
      .settings-content {
        flex: 1;
        padding: 1.5rem 1.75rem;
        overflow-y: auto;
        max-height: 65vh;
        animation: settingsFadeIn 0.32s ease;
      }
      @keyframes settingsFadeIn {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .settings-section {
        margin-bottom: 1.75rem;
      }
      .settings-section:last-child {
        margin-bottom: 0;
      }
      .settings-section-header {
        margin-bottom: 0.85rem;
      }
      .settings-section-header h3 {
        font-size: 0.92rem;
        font-weight: 700;
        color: hsl(var(--foreground));
        margin: 0 0 0.18rem 0;
        letter-spacing: -0.005em;
      }
      .settings-section-header p {
        font-size: 0.74rem;
        color: hsl(var(--muted-foreground));
        margin: 0;
        line-height: 1.4;
      }

      /* Premium Theme Cards */
      .premium-theme-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.65rem;
      }
      .premium-theme-card {
        position: relative;
        padding: 0.55rem;
        background: hsla(var(--background), 0.5);
        border: 2px solid hsla(var(--border), 0.6);
        border-radius: 0.7rem;
        cursor: pointer;
        transition: border-color 160ms var(--ease-out), box-shadow 160ms var(--ease-out), transform 160ms var(--ease-out), background 160ms var(--ease-out);
        font-family: inherit;
        text-align: left;
        overflow: hidden;
      }
      .premium-theme-card:hover {
        transform: translateY(-2px);
        border-color: hsla(var(--primary), 0.4);
        box-shadow: 0 8px 20px -8px hsla(var(--primary), 0.3);
        background: hsla(var(--background), 0.8);
      }
      .premium-theme-card.active {
        border-color: hsl(var(--primary));
        background: linear-gradient(135deg, hsla(var(--primary), 0.08), hsla(var(--primary), 0.02));
        box-shadow: 0 0 0 1px hsl(var(--primary)), 0 8px 24px -10px hsla(var(--primary), 0.4);
      }
      .premium-theme-card.active::after {
        content: '✓';
        position: absolute;
        top: 0.4rem;
        right: 0.4rem;
        width: 18px;
        height: 18px;
        background: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.65rem;
        font-weight: 800;
        box-shadow: 0 2px 6px hsla(var(--primary), 0.5);
      }
      .theme-preview {
        position: relative;
        width: 100%;
        height: 56px;
        border-radius: var(--radius-md);
        border: 1px solid hsla(0 0% 0% / 0.08);
        margin-bottom: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        transition: transform var(--duration-hover) var(--ease-out-expo);
      }
      .theme-stripe {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 6px;
      }
      .theme-dot {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        margin-top: 12px;
        box-shadow: 0 0 0 4px hsla(0 0% 0% / 0.04), 0 0 16px currentColor;
        transition: all var(--duration-hover) var(--ease-out-expo);
      }
      .premium-theme-card.active .theme-preview {
        transform: scale(1.04);
      }
      .theme-card-name {
        font-family: var(--font-body);
        font-size: var(--text-sm);
        font-weight: 500;
        color: hsl(var(--foreground));
        line-height: 1.1;
        letter-spacing: -0.011em;
      }
      .theme-card-meta {
        font-family: var(--font-mono);
        font-size: 0.625rem;
        font-weight: 500;
        color: hsl(var(--muted-foreground));
        margin-top: 0.15rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      /* Mode toggle group */
      .mode-toggle-group {
        display: flex;
        gap: 0.5rem;
        background: hsla(var(--background), 0.5);
        padding: 0.3rem;
        border-radius: 0.6rem;
        border: 1px solid hsla(var(--border), 0.4);
      }
      .mode-toggle-group .lang-btn {
        flex: 1;
        background: transparent;
      }
      .mode-toggle-group .lang-btn.active {
        background: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
        box-shadow: 0 2px 8px hsla(var(--primary), 0.4);
      }

      /* Settings toggle (iOS-style) */
      .settings-toggle {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        cursor: pointer;
        user-select: none;
      }
      .settings-toggle input {
        display: none;
      }
      .settings-toggle-slider {
        position: relative;
        width: 38px;
        height: 22px;
        background: hsla(var(--muted), 0.8);
        border-radius: 11px;
        transition: background 200ms var(--ease-out);
        flex-shrink: 0;
      }
      .settings-toggle-slider::before {
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        width: 18px;
        height: 18px;
        background: white;
        border-radius: 50%;
        transition: transform 200ms var(--ease-out);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      }
      .settings-toggle input:checked + .settings-toggle-slider {
        background: hsl(var(--primary));
      }
      .settings-toggle input:checked + .settings-toggle-slider::before {
        transform: translateX(16px);
      }
      .settings-toggle-label {
        font-size: 0.82rem;
        color: hsl(var(--foreground));
      }

      /* Language cards */
      .language-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.6rem;
      }
      .language-card {
        position: relative;
        display: flex;
        align-items: center;
        gap: 0.7rem;
        padding: 0.75rem 0.9rem;
        background: hsla(var(--background), 0.5);
        border: 1px solid hsla(var(--border), 0.6);
        border-radius: var(--radius-md);
        cursor: pointer;
        font-family: inherit;
        text-align: left;
        transition: all var(--duration-hover) var(--ease-out-expo);
      }
      .language-card:hover {
        border-color: hsla(var(--primary), 0.4);
        background: hsla(var(--background), 0.7);
        transform: translateY(-1px);
      }
      .language-card.active {
        border-color: hsl(var(--primary));
        background: hsla(var(--primary), 0.06);
      }
      .language-flag {
        font-size: 1.5rem;
        line-height: 1;
      }
      .language-info {
        flex: 1;
      }
      .language-name {
        font-family: var(--font-body);
        font-size: var(--text-sm);
        font-weight: 500;
        color: hsl(var(--foreground));
        line-height: 1.1;
        letter-spacing: -0.011em;
      }
      .language-native {
        font-size: 0.68rem;
        color: hsl(var(--muted-foreground));
        margin-top: 0.15rem;
      }
      .language-check {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        width: 18px;
        height: 18px;
        background: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.7rem;
        font-weight: 700;
        opacity: 0;
        transform: scale(0.5);
        transition: all var(--duration-hover) var(--ease-out-expo);
      }
      .language-card.active .language-check {
        opacity: 1;
        transform: scale(1);
      }

      /* Account header */
      .account-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        background: hsla(var(--primary), 0.06);
        border: 1px solid hsla(var(--primary), 0.2);
        border-radius: var(--radius-lg);
        margin-bottom: 1.5rem;
      }
      .account-avatar {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: hsl(var(--primary));
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: var(--font-display);
        font-variation-settings: "opsz" 144, "SOFT" 0;
        font-size: 1.5rem;
        font-style: italic;
        font-weight: 500;
        color: hsl(var(--primary-foreground));
        box-shadow: 0 1px 2px hsla(0 0% 0% / 0.12);
        flex-shrink: 0;
      }
      .account-name {
        font-family: var(--font-display);
        font-variation-settings: "opsz" 144, "SOFT" 0;
        font-weight: 500;
        font-size: var(--text-md);
        letter-spacing: -0.02em;
        color: hsl(var(--foreground));
      }
      .account-role {
        font-family: var(--font-mono);
        font-size: 0.625rem;
        font-weight: 500;
        color: hsl(var(--muted-foreground));
        margin-top: 0.2rem;
        letter-spacing: 0.08em;
      }

      /* Theme transition smoothing — uses --transition-speed from design tokens */
      body, .app-header, .app-modal, .glass-card, .form-input, .form-textarea, .form-select, .lang-btn, .icon-btn, .btn-primary, .btn-publish, .modal-title, .settings-nav-item, .premium-theme-card, .language-card {
        transition: background-color var(--transition-speed) ease, color var(--transition-speed) ease, border-color var(--transition-speed) ease, box-shadow var(--transition-speed) ease;
      }

      /* Responsive: collapse sidebar to top tabs on small screens */
      @media (max-width: 720px) {
        .settings-layout { flex-direction: column; min-height: 0; }
        .settings-sidebar {
          width: 100%;
          flex-direction: row;
          overflow-x: auto;
          border-right: none;
          border-bottom: 1px solid hsla(var(--border), 0.5);
          padding: 0.6rem;
        }
        .settings-nav-item {
          white-space: nowrap;
          flex-shrink: 0;
        }
        .settings-nav-item.active {
          box-shadow: inset 0 -3px 0 hsl(var(--primary));
        }
        .premium-theme-grid { grid-template-columns: repeat(2, 1fr); }
        .settings-content { max-height: 70vh; }
      }
    </style>
  `;
}
