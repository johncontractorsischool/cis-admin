"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import Link from "next/link";
import { searchStaff } from "../../lib/global-search-api";
import type { GlobalSearchGroups, GlobalSearchResult } from "../../lib/global-search";
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
import type { BrochureView } from "../../lib/brochures";
import { brochureLinks, BrochureWorkspace } from "./brochure-workspace";
import { CustomerDevicesWorkspace } from "./customer-devices-workspace";
import { NewOrderWorkspace } from "./new-order-workspace";
import { EnrollmentWorkspace } from "./enrollment-workspace";
import { SettingsWorkspace } from "./settings-workspace";
import { ApplicationRecordWorkspace, OrderRecordWorkspace } from "./search-record-workspace";
import { StudentCreate, StudentDetails, StudentDirectory } from "./student-workspace";

type AuthView = "credentials" | "otp" | "authenticated";
export type StaffPortalPage = "dashboard" | "students" | "student-detail" | "student-new" | "customer-devices" | "new-order" | "enrollment-new" | "brochures" | "order-detail" | "application-detail" | "settings" | "profile";
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

function SearchModal({ onClose, onSessionExpired }: { onClose: () => void; onSessionExpired: () => void }) {
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef(0);
  const sessionExpiredRef = useRef(onSessionExpired);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<GlobalSearchGroups | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const groupDefinitions: Array<{ key: keyof GlobalSearchGroups; label: string; glyph: string }> = [
    { key: "students", label: "Students", glyph: "ST" },
    { key: "orders", label: "Orders", glyph: "OR" },
    { key: "brochures", label: "Brochures", glyph: "BR" },
    { key: "applications", label: "Applications", glyph: "AP" },
  ];
  const results = groups ? groupDefinitions.flatMap((group) => groups[group.key]) : [];

  useEffect(() => {
    sessionExpiredRef.current = onSessionExpired;
  }, [onSessionExpired]);

  useEffect(() => {
    firstFieldRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      requestRef.current += 1;
      return;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      searchStaff(term)
        .then((response) => {
          if (requestRef.current !== requestId) return;
          setGroups(response.data.groups);
          setActiveIndex(response.data.total ? 0 : -1);
        })
        .catch((caught) => {
          if (requestRef.current !== requestId) return;
          if (caught instanceof StaffApiError && caught.status === 401) {
            sessionExpiredRef.current();
            return;
          }
          setGroups(null);
          setActiveIndex(-1);
          setError(caught instanceof StaffApiError ? caught.message : "Search is temporarily unavailable. Please try again.");
        })
        .finally(() => { if (requestRef.current === requestId) setLoading(false); });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query]);

  function changeQuery(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      requestRef.current += 1;
      setGroups(null);
      setLoading(false);
      setError("");
      setActiveIndex(-1);
    }
  }

  function navigateResults(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (!results.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? results.length - 1 : current - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      window.location.assign(results[activeIndex].href);
    }
  }

  function resultIndex(result: GlobalSearchResult) {
    return results.findIndex((candidate) => candidate.key === result.key);
  }

  return (
    <div className="modal-backdrop">
      <button className="modal-dismiss-layer" type="button" aria-label="Close customer search" onClick={onClose} />
      <section className="modal-card global-search-modal" role="dialog" aria-modal="true" aria-labelledby="search-title">
        <header className="modal-head">
          <div><h2 id="search-title">Global search</h2><p>Search students, orders, brochures, and applications.</p></div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close search">×</button>
        </header>
        <form className="global-search-form" role="search" onSubmit={(event) => event.preventDefault()}>
          <label className="sr-only" htmlFor="global-search-input">Search staff records</label>
          <span className="global-search-icon" aria-hidden="true">⌕</span>
          <input
            ref={firstFieldRef}
            id="global-search-input"
            value={query}
            onChange={(event) => changeQuery(event.target.value)}
            onKeyDown={navigateResults}
            placeholder="Name, email, phone, customer ID, order or application number"
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-controls="global-search-results"
            aria-expanded={Boolean(groups && results.length)}
            aria-activedescendant={activeIndex >= 0 ? `global-search-result-${results[activeIndex]?.key}` : undefined}
          />
          {loading ? <span className="global-search-spinner" aria-label="Searching" /> : query ? <button className="global-search-clear" type="button" onClick={() => changeQuery("")} aria-label="Clear search">×</button> : <kbd>ESC</kbd>}
        </form>
        <div className="global-search-status" aria-live="polite">
          {query.trim().length < 2 ? "Enter at least 2 characters to search live staff records." : loading ? "Searching live records…" : error ? error : groups ? `${results.length} ${results.length === 1 ? "record" : "records"} found.` : ""}
        </div>
        {error ? <div className="student-error global-search-error" role="alert"><strong>Search unavailable.</strong><span>{error}</span></div> : null}
        {groups && !loading && !results.length ? <div className="search-results global-search-empty"><strong>No matching records.</strong><p>Try a full or partial name, email, phone number, customer ID, order number, or application number.</p></div> : null}
        {groups && results.length ? <div id="global-search-results" className="global-search-results" role="listbox" aria-label="Search results">
          {groupDefinitions.map((definition) => {
            const items = groups[definition.key];
            if (!items.length) return null;
            return <section className="global-search-group" key={definition.key} aria-labelledby={`search-group-${definition.key}`}>
              <h3 id={`search-group-${definition.key}`}>{definition.label}<span>{items.length}</span></h3>
              <ul>{items.map((result) => {
                const index = resultIndex(result);
                return <li key={result.key}><Link id={`global-search-result-${result.key}`} role="option" aria-selected={activeIndex === index} className={activeIndex === index ? "active" : ""} href={result.href} onMouseEnter={() => setActiveIndex(index)} onFocus={() => setActiveIndex(index)}><span className={`global-search-kind ${result.type}`} aria-hidden="true">{definition.glyph}</span><span className="global-search-copy"><strong>{result.title}</strong><span>{result.subtitle || "No contact detail"}</span></span><span className="global-search-identifier">{result.identifier}<b aria-hidden="true">→</b></span></Link></li>;
              })}</ul>
            </section>;
          })}
        </div> : null}
        <footer className="global-search-footer"><span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span><span><kbd>↵</kbd> Open</span><span><kbd>ESC</kbd> Close</span></footer>
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

function pageNavigationLabel(page: StaffPortalPage) {
  if (page === "dashboard") return "Dashboard";
  if (page === "customer-devices") return "Customer Devices";
  if (page === "new-order" || page === "enrollment-new") return "New Orders";
  if (page === "brochures") return "Brochures";
  if (page === "order-detail") return "Order History";
  if (page === "settings") return "Settings";
  if (page === "profile") return "Profile";
  return "Students";
}

function DemoShell({
  principal,
  fixturePersonas,
  fixtureMode,
  initialPage,
  studentId,
  brochureView,
  brochureId,
  recordId,
  notice,
  onLogout,
  onPersonaChange,
  onSessionExpired,
}: {
  principal: StaffPrincipal;
  fixturePersonas: FixturePersona[];
  fixtureMode: boolean;
  initialPage: StaffPortalPage;
  studentId?: number;
  brochureView?: BrochureView;
  brochureId?: number;
  recordId?: number;
  notice: string;
  onLogout: () => void;
  onPersonaChange: (persona: string) => void;
  onSessionExpired: () => void;
}) {
  const [activePage, setActivePage] = useState(() => pageNavigationLabel(initialPage));
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
          {visibleNavigation.map((group) => <div key={group.label}><p className="nav-label">{group.label}</p><ul className="nav-list">{group.items.map((item) => {
            const badge = item.badge ? principal.navigationBadges?.[item.badge] : undefined;
            const href = item.label === "Dashboard" ? "/staff" : item.label === "Students" ? "/staff/students" : item.label === "Customer Devices" ? "/staff/customer-devices" : item.label === "New Orders" ? "/staff/new_order" : item.label === "Brochures" ? "/staff/brochures/new" : item.label === "Settings" ? "/staff/settings" : null;
            return <li key={item.label}>{href ? <><Link className={`nav-button ${activePage === item.label ? "active" : ""}`} href={href} aria-current={activePage === item.label ? "page" : undefined}><span className="nav-icon" aria-hidden="true">{item.glyph}</span><span>{item.label}</span>{item.label === "Brochures" ? <span className="nav-chevron" aria-hidden="true">⌄</span> : null}{badge ? <span className="nav-badge">{badge}</span> : null}</Link>{item.label === "Brochures" && activePage === "Brochures" ? <ul className="nav-sublist">{brochureLinks.map((subitem) => <li key={subitem.view}><Link href={subitem.href} className={brochureView === subitem.view ? "active" : ""} aria-current={brochureView === subitem.view ? "page" : undefined}>{subitem.label}</Link></li>)}</ul> : null}</> : <button className={`nav-button ${activePage === item.label ? "active" : ""}`} type="button" onClick={() => navigate(item.label)} aria-current={activePage === item.label ? "page" : undefined}><span className="nav-icon" aria-hidden="true">{item.glyph}</span><span>{item.label}</span>{badge ? <span className="nav-badge">{badge}</span> : null}</button>}</li>;
          })}</ul></div>)}
        </nav>
        <div className="sidebar-foot"><Link className={`profile-button ${activePage === "Profile" ? "active" : ""}`} href="/staff/profile"><span className="avatar">{initials(principal.name)}</span><span className="profile-copy"><strong>{principal.name}</strong><span>{principal.staffType ?? "staff"}</span></span><span aria-hidden="true">···</span></Link></div>
      </aside>
      <header className="topbar"><button className="header-icon-button mobile-menu-button" type="button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">☰</button><button className="topbar-search" type="button" onClick={() => setSearchOpen(true)}><span aria-hidden="true">⌕</span><span>Search customers</span><kbd>⌘ K</kbd></button><div className="topbar-actions"><button className="header-icon-button" type="button" onClick={() => showToast("No new fixture updates.")} aria-label="Staff updates">◔</button><button className="header-icon-button" type="button" onClick={onLogout} aria-label="Log out" title="Log out">↪</button></div></header>
      <section className="main-content">{notice ? <div className="form-alert session-alert" role="alert"><span aria-hidden="true">!</span><span>{notice}</span></div> : null}{activePage === "Dashboard" ? <DemoDashboard principal={principal} /> : activePage === "Students" ? initialPage === "application-detail" && recordId ? <ApplicationRecordWorkspace recordId={recordId} /> : initialPage === "student-detail" && studentId ? <StudentDetails studentId={studentId} /> : initialPage === "student-new" ? <StudentCreate /> : <StudentDirectory principal={principal} /> : activePage === "Customer Devices" ? <CustomerDevicesWorkspace principal={principal} /> : activePage === "New Orders" ? initialPage === "enrollment-new" ? principal.capabilities.includes("orders.create") ? <EnrollmentWorkspace /> : <ForbiddenPage onBack={() => setActivePage("Dashboard")} /> : <NewOrderWorkspace principal={principal} /> : activePage === "Order History" && initialPage === "order-detail" && recordId ? <OrderRecordWorkspace recordId={recordId} /> : activePage === "Brochures" ? <BrochureWorkspace view={brochureView ?? "new"} principal={principal} brochureId={brochureId} /> : activePage === "Settings" ? can(principal, "settings.manage") ? <SettingsWorkspace onSessionExpired={onSessionExpired} /> : <ForbiddenPage onBack={() => setActivePage("Dashboard")} /> : activePage === "Profile" ? <SettingsWorkspace profileOnly onSessionExpired={onSessionExpired} /> : activePage === "Forbidden" ? <ForbiddenPage onBack={() => setActivePage("Dashboard")} /> : <ComingPage label={activePage} onBack={() => setActivePage("Dashboard")} />}</section>
      {searchOpen ? <SearchModal onClose={() => setSearchOpen(false)} onSessionExpired={onSessionExpired} /> : null}
      {toast ? <div className="toast" role="status"><span className="toast-mark" aria-hidden="true">✓</span><span>{toast}</span></div> : null}
      {fixtureMode ? <div className="prototype-bar"><label htmlFor="persona">Persona</label><select id="persona" value={principal.username} onChange={(event) => onPersonaChange(event.target.value)}>{fixturePersonas.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}</select><button className="text-button" type="button" onClick={() => setActivePage("Forbidden")}>403</button><button className="text-button" type="button" onClick={onSessionExpired}>Expire</button></div> : null}
    </main>
  );
}

export function StaffPortal({
  initialSession,
  fixtureMode,
  fixtureScenarios,
  fixturePersonas,
  initialPage = "dashboard",
  studentId,
  brochureView,
  brochureId,
  recordId,
}: {
  initialSession: StaffSessionBootstrap;
  fixtureMode: boolean;
  fixtureScenarios: FixtureScenario[];
  fixturePersonas: FixturePersona[];
  initialPage?: StaffPortalPage;
  studentId?: number;
  brochureView?: BrochureView;
  brochureId?: number;
  recordId?: number;
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

  const shellKey = [initialPage, studentId, brochureView, brochureId, recordId].filter((value) => value !== undefined).join(":");

  return <DemoShell key={shellKey} principal={principal} fixturePersonas={fixturePersonas} fixtureMode={fixtureMode} initialPage={initialPage} studentId={studentId} brochureView={brochureView} brochureId={brochureId} recordId={recordId} notice={notice} onLogout={() => void signOut()} onPersonaChange={(persona) => void changeFixturePersona(persona)} onSessionExpired={() => void signOut(true)} />;
}
