"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import {
  login,
  logout,
  resendOtp,
  StaffApiError,
  verifyOtp,
} from "../../lib/staff-api";
import {
  can,
  staffNavigation,
  type OtpChallenge,
  type StaffPrincipal,
} from "../../lib/staff";
import type { StaffSessionBootstrap } from "../../lib/staff-session";

type AuthView = "credentials" | "otp" | "authenticated";
type FixtureScenario = { label: string; username: string };
type FixturePersona = { key: string; label: string };

const metrics = [
  { label: "New orders", value: "24", detail: "12 awaiting shipment", trend: "+8%", color: "#2B90C0" },
  { label: "Student requests", value: "17", detail: "5 need attention today", trend: "+3", color: "#FC9012" },
  { label: "Class starts", value: "9", detail: "Across 4 locations", trend: "This week", color: "#4B8DBC" },
  { label: "Open messages", value: "31", detail: "Average reply 18m", trend: "On track", color: "#43B4EB" },
];

const priorities = [
  { glyph: "OR", title: "Review today’s unshipped orders", detail: "12 orders are ready for processing", status: "12 ready", tone: "coral" },
  { glyph: "ST", title: "Student application follow-ups", detail: "Five applications need a staff response", status: "Due today", tone: "coral" },
  { glyph: "FB", title: "Instructor question feedback", detail: "Three new comments are waiting for review", status: "3 new", tone: "" },
  { glyph: "BR", title: "Brochure requests", detail: "Eight requests were added this morning", status: "8 added", tone: "" },
];

const activities = [
  { mark: "✓", text: "Shipment batch #842 was exported", time: "8 minutes ago" },
  { mark: "+", text: "Jordan added a new student account", time: "24 minutes ago" },
  { mark: "↗", text: "March enrollment report was generated", time: "1 hour ago" },
  { mark: "•", text: "Website maintenance notice updated", time: "2 hours ago" },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function Brand() {
  return (
    <span className="brand" aria-label="Contractor Institute Staff Hub">
      <span className="brand-mark" aria-hidden="true">CIS</span>
      <span className="brand-copy">
        <strong>Contractor Institute</strong>
        <span>Staff hub</span>
      </span>
    </span>
  );
}

function LoginVisual() {
  return (
    <aside className="login-visual" aria-label="Staff hub overview">
      <div className="visual-orbit" aria-hidden="true" />
      <div className="visual-content">
        <p className="visual-kicker">One team · one workspace</p>
        <h2>Built for today’s <em>work.</em></h2>
        <p>Support customers, coordinate operations, and keep every class and order moving from one focused staff workspace.</p>
        <div className="visual-stats" aria-label="Staff workspace highlights">
          <div className="visual-stat"><strong>1</strong><span>Shared view</span></div>
          <div className="visual-stat"><strong>24/7</strong><span>Clear status</span></div>
          <div className="visual-stat"><strong>100%</strong><span>Role aware</span></div>
        </div>
      </div>
    </aside>
  );
}

function CredentialView({
  initialMessage,
  fixtureMode,
  fixtureScenarios,
  onAuthenticated,
  onOtpRequired,
}: {
  initialMessage?: string;
  fixtureMode: boolean;
  fixtureScenarios: FixtureScenario[];
  onAuthenticated: (principal: StaffPrincipal) => void;
  onOtpRequired: (challenge: OtpChallenge) => void;
}) {
  const [username, setUsername] = useState(fixtureMode ? "approved" : "");
  const [password, setPassword] = useState(fixtureMode ? "staff-demo" : "");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(initialMessage ?? "");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError("Enter both your username and password to continue.");
      return;
    }

    setPending(true);
    try {
      const result = await login(username.trim(), password);
      if (result.status === "otp_required") {
        onOtpRequired(result.challenge);
      } else {
        onAuthenticated(result.principal);
      }
    } catch (caught) {
      setError(
        caught instanceof StaffApiError
          ? caught.message
          : "The sign-in service is temporarily unavailable. Please retry.",
      );
    } finally {
      setPending(false);
    }
  }

  function chooseFixture(usernameValue: string) {
    setUsername(usernameValue);
    setPassword("staff-demo");
    setError("");
  }

  return (
    <>
      <p className="eyebrow">Secure staff access</p>
      <h1>Welcome back.</h1>
      <p className="login-lede">Sign in to continue to the Contractor Institute staff workspace.</p>
      <form className="login-form" onSubmit={handleSubmit} noValidate>
        {error ? (
          <div className="form-alert" role="alert"><span aria-hidden="true">!</span><span>{error}</span></div>
        ) : null}
        <div className="field">
          <label htmlFor="username">Username</label>
          <input id="username" name="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} disabled={pending} />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <div className="password-wrap">
            <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={pending} />
            <button className="text-button" type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        <button className="primary-button" type="submit" disabled={pending}>
          <span>{pending ? "Checking access…" : "Continue securely"}</span><span className="arrow" aria-hidden="true">→</span>
        </button>
      </form>
      <p className="login-note">Access is monitored and limited to authorized staff. Session credentials are never stored in browser storage.</p>
      {fixtureMode && fixtureScenarios.length ? (
        <div className="prototype-paths">
          <p>Local fixture paths</p>
          <div className="scenario-row">
            {fixtureScenarios.map((scenario) => (
              <button key={scenario.username} className={`scenario-chip ${username === scenario.username ? "active" : ""}`} type="button" onClick={() => chooseFixture(scenario.username)}>
                {scenario.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

function OtpView({
  challenge,
  fixtureMode,
  onAuthenticated,
  onChallengeChange,
  onBack,
}: {
  challenge: OtpChallenge;
  fixtureMode: boolean;
  onAuthenticated: (principal: StaffPrincipal) => void;
  onChallengeChange: (challenge: OtpChallenge) => void;
  onBack: () => void;
}) {
  const [otp, setOtp] = useState("");
  const [pending, setPending] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"error" | "info">("info");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const resendSeconds = Math.max(0, Math.ceil((Date.parse(challenge.resendAt) - now) / 1000));
  const expired = Date.parse(challenge.expiresAt) <= now;

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!/^\d{7}$/.test(otp)) {
      setMessageTone("error");
      setMessage("Enter the seven-digit code from your email.");
      return;
    }

    setPending(true);
    try {
      const result = await verifyOtp(challenge.id, otp);
      onAuthenticated(result.principal);
    } catch (caught) {
      const apiError = caught instanceof StaffApiError ? caught : null;
      if (apiError?.attemptsRemaining !== undefined) {
        onChallengeChange({ ...challenge, attemptsRemaining: apiError.attemptsRemaining });
      }
      setOtp("");
      setMessageTone("error");
      setMessage(apiError?.message ?? "The code could not be verified. Please retry.");
    } finally {
      setPending(false);
    }
  }

  async function resend() {
    if (resendSeconds > 0 || pending) return;
    setPending(true);
    try {
      const result = await resendOtp(challenge.id);
      onChallengeChange(result.challenge);
      setMessageTone("info");
      setMessage("A new security code was sent. The previous code is no longer valid.");
    } catch (caught) {
      setMessageTone("error");
      setMessage(caught instanceof StaffApiError ? caught.message : "A new code could not be sent. Please retry.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <p className="eyebrow">Offsite verification</p>
      <h1>Check your email.</h1>
      <p className="login-lede">We sent a seven-digit security code to {challenge.maskedDestination}. It expires at the time set by the security service.</p>
      <form className="login-form" onSubmit={verify} noValidate>
        {message ? <div className={`form-alert ${messageTone === "info" ? "info" : ""}`} role="alert"><span aria-hidden="true">{messageTone === "info" ? "✓" : "!"}</span><span>{message}</span></div> : null}
        {expired ? <div className="form-alert" role="alert"><span aria-hidden="true">!</span><span>This security code has expired. Return to sign in to request another.</span></div> : null}
        <div className="field">
          <label htmlFor="otp">Security code</label>
          <input className="otp-code" id="otp" name="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder="0000000" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 7))} disabled={pending || expired || challenge.attemptsRemaining <= 0} />
        </div>
        <div className="otp-meta">
          <span>{challenge.attemptsRemaining} attempts remaining</span>
          {fixtureMode ? <span>Local fixture code: 2468101</span> : null}
        </div>
        <button className="primary-button" type="submit" disabled={pending || expired || challenge.attemptsRemaining <= 0}>
          <span>{pending ? "Verifying…" : "Verify and continue"}</span><span className="arrow" aria-hidden="true">→</span>
        </button>
        <div className="resend-row">
          <span>{resendSeconds > 0 ? `Resend available in ${formatCountdown(resendSeconds)}` : "Didn’t receive the code?"}</span>
          <button className="text-button" type="button" onClick={resend} disabled={resendSeconds > 0 || pending}>Resend code</button>
        </div>
      </form>
      <button className="text-button" type="button" onClick={onBack}>← Return to credentials</button>
    </>
  );
}

function LoginScreen({
  view,
  challenge,
  initialMessage,
  fixtureMode,
  fixtureScenarios,
  onAuthenticated,
  onOtpRequired,
  onChallengeChange,
  onBack,
}: {
  view: Exclude<AuthView, "authenticated">;
  challenge: OtpChallenge | null;
  initialMessage?: string;
  fixtureMode: boolean;
  fixtureScenarios: FixtureScenario[];
  onAuthenticated: (principal: StaffPrincipal) => void;
  onOtpRequired: (challenge: OtpChallenge) => void;
  onChallengeChange: (challenge: OtpChallenge) => void;
  onBack: () => void;
}) {
  return (
    <main className="login-page">
      <section className="login-panel">
        <Brand />
        <div className="login-content">
          {view === "credentials" || !challenge ? (
            <CredentialView initialMessage={initialMessage} fixtureMode={fixtureMode} fixtureScenarios={fixtureScenarios} onAuthenticated={onAuthenticated} onOtpRequired={onOtpRequired} />
          ) : (
            <OtpView challenge={challenge} fixtureMode={fixtureMode} onAuthenticated={onAuthenticated} onChallengeChange={onChallengeChange} onBack={onBack} />
          )}
        </div>
        <footer className="login-footer"><span>© 2026 Contractor Institute</span><span>Need access help? Contact your administrator.</span></footer>
      </section>
      <LoginVisual />
    </main>
  );
}

function SearchModal({ onClose }: { onClose: () => void }) {
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    firstFieldRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop">
      <button className="modal-dismiss-layer" type="button" aria-label="Close customer search" onClick={onClose} />
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="search-title">
        <header className="modal-head">
          <div><h2 id="search-title">Find a customer</h2><p>Search by any known customer detail.</p></div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close search">×</button>
        </header>
        <form className="search-grid" onSubmit={(event) => { event.preventDefault(); setSearched(true); }}>
          <div className="field"><label htmlFor="first-name">First name</label><input ref={firstFieldRef} id="first-name" placeholder="Jamie" /></div>
          <div className="field"><label htmlFor="last-name">Last name</label><input id="last-name" placeholder="Rivera" /></div>
          <div className="field"><label htmlFor="phone">Phone</label><input id="phone" type="tel" placeholder="(555) 000-0000" /></div>
          <div className="field"><label htmlFor="email">Email</label><input id="email" type="email" placeholder="name@example.com" /></div>
          <div className="field"><label htmlFor="app-fee">App Fee Number</label><input id="app-fee" placeholder="AF-000000" /></div>
          <button className="primary-button" type="submit">Search customers <span className="arrow">→</span></button>
        </form>
        {searched ? <div className="search-results" role="status"><strong>No matching customers in this local fixture.</strong><p>The approved customer-search contract will replace this development state.</p></div> : null}
      </section>
    </div>
  );
}

function DemoDashboard({ principal }: { principal: StaffPrincipal }) {
  const firstName = principal.name.split(" ")[0];
  return (
    <div className="content-wrap">
      <header className="page-heading"><div><p className="eyebrow">Local fixture workspace</p><h1>Good morning, {firstName}.</h1><p>This operational data is available only in explicit local fixture mode.</p></div><span className="date-chip">Development only</span></header>
      <div className="maintenance-alert" role="status"><span className="maintenance-icon" aria-hidden="true">!</span><span className="maintenance-copy"><strong>Student login maintenance is scheduled</strong><span>Tonight from 9:00–9:30 PM Pacific · Other systems are operational.</span></span><button className="text-button" type="button">View details</button></div>
      <section className="metric-grid" aria-label="Fixture metrics">
        {metrics.map((metric) => <article className="metric-card" key={metric.label} style={{ "--metric-color": metric.color } as CSSProperties}><div className="metric-top"><span>{metric.label}</span><span className="metric-dot" aria-hidden="true" /></div><strong className="metric-value">{metric.value}</strong><span className="metric-detail"><strong>{metric.trend}</strong> · {metric.detail}</span></article>)}
      </section>
      <section className="dashboard-grid">
        <article className="panel-card"><header className="panel-head"><h2>Needs your attention</h2><button className="text-button" type="button">View all tasks →</button></header><ul className="priority-list">{priorities.map((priority) => <li className="priority-item" key={priority.title}><span className="priority-icon" aria-hidden="true">{priority.glyph}</span><span className="priority-copy"><strong>{priority.title}</strong><span>{priority.detail}</span></span><span className={`status-pill ${priority.tone}`}>{priority.status}</span></li>)}</ul></article>
        <aside className="panel-card"><header className="panel-head"><h2>Recent activity</h2><button className="text-button" type="button">Audit log</button></header><ol className="activity-list">{activities.map((activity) => <li className="activity-item" key={activity.text}><span className="activity-mark" aria-hidden="true">{activity.mark}</span><span className="activity-copy"><p>{activity.text}</p><time>{activity.time}</time></span></li>)}</ol></aside>
      </section>
    </div>
  );
}

function ComingPage({ label, onBack }: { label: string; onBack: () => void }) {
  return <div className="coming-page"><div className="coming-inner"><span className="coming-glyph" aria-hidden="true">{label.slice(0, 2).toUpperCase()}</span><h1>{label}</h1><p>This development route is reserved for its API-backed vertical slice.</p><button className="secondary-button" type="button" onClick={onBack}>Return to dashboard</button></div></div>;
}

function ForbiddenPage({ onBack }: { onBack: () => void }) {
  return <div className="forbidden-page"><div className="coming-inner"><span className="coming-glyph" aria-hidden="true">403</span><h1>Access not available</h1><p>You’re signed in, but this account doesn’t have the capability required for this page. No protected content was loaded.</p><button className="secondary-button" type="button" onClick={onBack}>Return to dashboard</button></div></div>;
}

function DemoShell({
  principal,
  fixturePersonas,
  notice,
  onLogout,
  onPersonaChange,
  onSessionExpired,
}: {
  principal: StaffPrincipal;
  fixturePersonas: FixturePersona[];
  notice: string;
  onLogout: () => void;
  onPersonaChange: (persona: string) => void;
  onSessionExpired: () => void;
}) {
  const [activePage, setActivePage] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toast, setToast] = useState("");
  const visibleNavigation = useMemo(() => staffNavigation.map((group) => ({ ...group, items: group.items.filter((item) => can(principal, item.capability)) })).filter((group) => group.items.length > 0), [principal]);

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen(true); }
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function navigate(label: string) { setActivePage(label); setSidebarOpen(false); }

  return (
    <main className="app-shell">
      {sidebarOpen ? <button className="mobile-backdrop" type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} /> : null}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-head"><Brand /></div>
        <nav className="sidebar-nav" aria-label="Staff navigation">
          {visibleNavigation.map((group) => <div key={group.label}><p className="nav-label">{group.label}</p><ul className="nav-list">{group.items.map((item) => { const badge = item.badge ? principal.navigationBadges?.[item.badge] : undefined; return <li key={item.label}><button className={`nav-button ${activePage === item.label ? "active" : ""}`} type="button" onClick={() => navigate(item.label)} aria-current={activePage === item.label ? "page" : undefined}><span className="nav-icon" aria-hidden="true">{item.glyph}</span><span>{item.label}</span>{badge ? <span className="nav-badge">{badge}</span> : null}</button></li>; })}</ul></div>)}
        </nav>
        <div className="sidebar-foot"><button className="profile-button" type="button" onClick={() => showToast("Profile settings await an approved API contract.")}><span className="avatar">{initials(principal.name)}</span><span className="profile-copy"><strong>{principal.name}</strong><span>{principal.staffType ?? "staff"}</span></span><span aria-hidden="true">···</span></button></div>
      </aside>
      <header className="topbar"><button className="header-icon-button mobile-menu-button" type="button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">☰</button><button className="topbar-search" type="button" onClick={() => setSearchOpen(true)}><span aria-hidden="true">⌕</span><span>Search customers</span><kbd>⌘ K</kbd></button><div className="topbar-actions"><button className="header-icon-button" type="button" onClick={() => showToast("No new fixture updates.")} aria-label="Staff updates">◔</button><button className="header-icon-button" type="button" onClick={onLogout} aria-label="Log out" title="Log out">↪</button></div></header>
      <section className="main-content">{notice ? <div className="form-alert session-alert" role="alert"><span aria-hidden="true">!</span><span>{notice}</span></div> : null}{activePage === "Dashboard" ? <DemoDashboard principal={principal} /> : activePage === "Forbidden" ? <ForbiddenPage onBack={() => setActivePage("Dashboard")} /> : <ComingPage label={activePage} onBack={() => setActivePage("Dashboard")} />}</section>
      {searchOpen ? <SearchModal onClose={() => setSearchOpen(false)} /> : null}
      {toast ? <div className="toast" role="status"><span className="toast-mark" aria-hidden="true">✓</span><span>{toast}</span></div> : null}
      <div className="prototype-bar"><label htmlFor="persona">Persona</label><select id="persona" value={principal.username} onChange={(event) => onPersonaChange(event.target.value)}>{fixturePersonas.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}</select><button className="text-button" type="button" onClick={() => setActivePage("Forbidden")}>403</button><button className="text-button" type="button" onClick={onSessionExpired}>Expire</button></div>
    </main>
  );
}

function FoundationShell({ principal, notice, onLogout }: { principal: StaffPrincipal; notice: string; onLogout: () => void }) {
  const firstName = principal.name.split(" ")[0];
  return (
    <main className="foundation-shell">
      <header className="foundation-topbar"><Brand /><div className="foundation-account"><span className="avatar">{initials(principal.name)}</span><span className="profile-copy"><strong>{principal.name}</strong><span>{principal.staffType ?? "Staff"}</span></span><button className="secondary-button" type="button" onClick={onLogout}>Log out</button></div></header>
      <section className="foundation-content">
        {notice ? <div className="form-alert session-alert" role="alert"><span aria-hidden="true">!</span><span>{notice}</span></div> : null}
        <div className="foundation-status">
          <span className="foundation-check" aria-hidden="true">✓</span>
          <p className="eyebrow">Secure access verified</p>
          <h1>Welcome, {firstName}.</h1>
          <p>Your staff identity and access profile are synchronized with Contractor Institute. Operational modules will appear here as their API-backed workflows are approved.</p>
          <dl className="access-summary"><div><dt>Account</dt><dd>{principal.email}</dd></div><div><dt>Role</dt><dd>{principal.staffType ?? "Staff"}</dd></div><div><dt>Access profile</dt><dd>{principal.capabilities.length} enabled capabilities</dd></div></dl>
        </div>
      </section>
    </main>
  );
}

export function StaffPortal({
  initialSession,
  fixtureMode,
  fixtureScenarios,
  fixturePersonas,
}: {
  initialSession: StaffSessionBootstrap;
  fixtureMode: boolean;
  fixtureScenarios: FixtureScenario[];
  fixturePersonas: FixturePersona[];
}) {
  const initialPrincipal = initialSession.status === "authenticated" ? initialSession.principal : null;
  const [authView, setAuthView] = useState<AuthView>(initialPrincipal ? "authenticated" : "credentials");
  const [principal, setPrincipal] = useState<StaffPrincipal | null>(initialPrincipal);
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [notice, setNotice] = useState(initialSession.status === "authenticated" ? "" : initialSession.message ?? "");

  function authenticate(nextPrincipal: StaffPrincipal) {
    setPrincipal(nextPrincipal);
    setChallenge(null);
    setNotice("");
    setAuthView("authenticated");
  }

  async function signOut(expired = false) {
    try {
      await logout();
      setPrincipal(null);
      setChallenge(null);
      setNotice(expired ? "Your local fixture session was expired. Sign in again." : "You have been signed out securely.");
      setAuthView("credentials");
    } catch (caught) {
      if (caught instanceof StaffApiError && caught.status === 401) {
        setPrincipal(null);
        setNotice("Your session has expired. Sign in again.");
        setAuthView("credentials");
      } else {
        setNotice(caught instanceof StaffApiError ? caught.message : "Sign out could not be completed. Please retry.");
      }
    }
  }

  async function changeFixturePersona(persona: string) {
    try {
      const result = await login(persona, "staff-demo");
      if (result.status === "authenticated") authenticate(result.principal);
    } catch (caught) {
      setNotice(caught instanceof StaffApiError ? caught.message : "The fixture persona could not be changed.");
    }
  }

  if (authView !== "authenticated" || !principal) {
    return <LoginScreen view={authView === "otp" ? "otp" : "credentials"} challenge={challenge} initialMessage={notice} fixtureMode={fixtureMode} fixtureScenarios={fixtureScenarios} onAuthenticated={authenticate} onOtpRequired={(nextChallenge) => { setChallenge(nextChallenge); setNotice(""); setAuthView("otp"); }} onChallengeChange={setChallenge} onBack={() => { setChallenge(null); setAuthView("credentials"); }} />;
  }

  if (fixtureMode) {
    return <DemoShell principal={principal} fixturePersonas={fixturePersonas} notice={notice} onLogout={() => void signOut()} onPersonaChange={(persona) => void changeFixturePersona(persona)} onSessionExpired={() => void signOut(true)} />;
  }

  return <FoundationShell principal={principal} notice={notice} onLogout={() => void signOut()} />;
}
