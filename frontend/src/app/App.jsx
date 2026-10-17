import { lazy, Suspense, useEffect } from "react";
import { Link, Route, Routes, useLocation, Navigate } from "react-router";
import CaseShell from "./CaseShell";
import { Spinner } from "../components/UI";
const SignIn = lazy(() => import("../pages/SignIn"));
const Account = lazy(() => import("../pages/Account"));
const Landing = lazy(() => import("../pages/Landing"));
const About = lazy(() => import("../pages/About"));
const Overview = lazy(() => import("../pages/Overview"));
const Evidence = lazy(() => import("../pages/Evidence"));
const Investigation = lazy(() => import("../pages/Investigation"));
const Tasks = lazy(() => import("../pages/Tasks"));
const History = lazy(() => import("../pages/History"));
const CaseLibrary = lazy(() => import("../pages/CaseLibrary"));
const Inbox = lazy(() => import("../pages/Inbox"));
const Brief = lazy(() => import("../pages/Brief"));
const ContextLab = lazy(() => import("../pages/ContextLab"));
const Graph = lazy(() => import("../pages/Graph"));

function RouteEffects() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    const name = pathname.split("/").filter(Boolean).at(-1) || "Home";
    document.title = pathname === "/" ? "ReturnTrail — Compare Return Pickup Records" : `${name === "case" ? "Case overview" : name[0].toUpperCase() + name.slice(1)} | ReturnTrail`;
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) { robots = document.createElement("meta"); robots.name = "robots"; document.head.append(robots); }
    const isPublic = pathname === "/" || pathname === "/about";
    robots.content = isPublic ? "index, follow" : "noindex, nofollow";
    const publicOrigin = document.querySelector('meta[name="returntrail-public-origin"]')?.content;
    if (isPublic && publicOrigin) {
      if (!document.querySelector('link[rel="canonical"]')) {
        const canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.append(canonical);
      }
      if (!document.querySelector('meta[property="og:url"]')) {
        const og = document.createElement("meta"); og.setAttribute("property", "og:url"); document.head.append(og);
      }
      const publicPath = pathname === "/" ? "/" : "/about";
      document.querySelector('link[rel="canonical"]').href = publicOrigin + publicPath;
      document.querySelector('meta[property="og:url"]').content = publicOrigin + publicPath;
    }
    if (!isPublic) {
      document.querySelector('link[rel="canonical"]')?.remove();
      document.querySelector('meta[property="og:url"]')?.remove();
    }
    document
      .querySelector("[data-route-heading]")
      ?.focus({ preventScroll: true });
  }, [pathname]);
  return null;
}
export default function App() {
  return (
    <>
      <RouteEffects />
      <Suspense
        fallback={
          <div className="route-loading">
            <Spinner label="Opening workspace..." />
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<About />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/login" element={<Navigate to="/signin" replace />} />
          <Route path="/account" element={<Account />} />
          <Route path="/cases" element={<CaseLibrary />} />
          <Route
            path="/case"
            element={<Navigate to="/case/CASE-001" replace />}
          />
          {["evidence", "graph", "investigation", "tasks", "history"].map(
            (section) => (
              <Route
                key={section}
                path={`/case/${section}`}
                element={
                  <Navigate
                    to={`/case/CASE-001/${section}${window.location.search}`}
                    replace
                  />
                }
              />
            ),
          )}
          <Route path="/case/:caseId" element={<CaseShell />}>
            <Route index element={<Overview />} />
            <Route path="evidence" element={<Evidence />} />
            <Route path="inbox" element={<Inbox />} />
            <Route path="brief" element={<Brief />} />
            <Route path="graph" element={<Graph />} />
            <Route path="context" element={<ContextLab />} />
            <Route path="investigation" element={<Investigation />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="history" element={<History />} />
          </Route>
          <Route
            path="*"
            element={
              <main className="recovery">
                <h1>That trail ends here.</h1>
                <p>This page could not be found.</p>
                <Link className="button primary" to="/">
                  Back to ReturnTrail
                </Link>
              </main>
            }
          />
        </Routes>
      </Suspense>
    </>
  );
}
