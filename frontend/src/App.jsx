import React, { useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useRoutes, BrowserRouter, Navigate } from "react-router-dom";
import Template from "./template/template";
import Dashboard from "./routes/dashboard";
import Historical from "./routes/historical";
import Inventory from "./routes/inventory";
import AddCalves from "./routes/addCalves";
import NavbarLayout from "./navbar/components/navbarLayout";
import { useAppContext } from "./context";
import CreateNewRanch from "./components/dashboard/createRanch";
import Loads from "./routes/load";
import Settings from "./routes/settings";
import ThemeToggle from "./components/themeToggle";
import { useToken } from "./api/useToken";
import { getRanches } from "./api/ranches";
import FeedbackCenter from "./components/shared/feedbackCenter";
import { AppBootSkeleton } from "./components/shared/loadingSkeletons";

const ProtectedTemplate = ({ children, isAuthenticated, title }) => {
  if (!isAuthenticated) return <Navigate to="/" />;
  return (
    <Template title={title} navbar={<NavbarLayout />} content={children}/>
  );
};

const AppRoutes = ({ isAuthenticated, ranchesReady, hasRanches }) => {
  const dashboardElement = !isAuthenticated
    ? <Navigate to="/" />
    : !ranchesReady
      ? <AppBootSkeleton />
      : <Dashboard />

  const ranchRouteGuard = !isAuthenticated
    ? <Navigate to="/" />
    : !ranchesReady
      ? <AppBootSkeleton />
    : !hasRanches
      ? <Navigate to="/dashboard" />
      : null

  let routes = useRoutes([
    {
      path: "/dashboard",
      element: dashboardElement,
    },
    {
      path: "/dashboard/ranch/:id/historical",
      element: (
        ranchRouteGuard || <ProtectedTemplate
          title="Historical placements"
          isAuthenticated={isAuthenticated}>
          <Historical />
        </ProtectedTemplate>
      ),
    },
    {
      path: "/dashboard/ranch/:id/inventory",
      element: (
        ranchRouteGuard || <ProtectedTemplate 
          title="Inventory"
          isAuthenticated={isAuthenticated}>
          <Inventory />
        </ProtectedTemplate>
      ),
    },
    {
      path: "/dashboard/ranch/:id/loads",
      element: (
        ranchRouteGuard || <ProtectedTemplate
          title="Load history"
          isAuthenticated={isAuthenticated}>
          <Loads />
        </ProtectedTemplate>
      ),
    },
    {
      path: "/dashboard/ranch/:id/settings",
      element: (
        ranchRouteGuard || <ProtectedTemplate
          title="Settings"
          isAuthenticated={isAuthenticated}>
          <Settings />
        </ProtectedTemplate>
      ),
    },
    {
      path: "/dashboard/ranch/:id/add-calves",
      element: (
        ranchRouteGuard || <ProtectedTemplate
          title="Add calves"
          isAuthenticated={isAuthenticated}>
          <AddCalves />
        </ProtectedTemplate>
      ),
    },
    {
      path: "/",
      element: isAuthenticated ? <Navigate to="/dashboard" /> : null,
    },
  ]);

  return routes;
};

function App() {
  const { showCreateNewRanchPopup, ranches, ranch } = useAppContext()
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0();
  const token = useToken()
  const [ranchesReady, setRanchesReady] = React.useState(false)
  const [hasRanches, setHasRanches] = React.useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) loginWithRedirect();
  }, [isAuthenticated, isLoading, loginWithRedirect]);

  useEffect(() => {
    const fetchRanches = async () => {
      if (!isAuthenticated || !token) {
        setRanchesReady(false)
        return
      }

      try {
        const ranches = await getRanches(token)
        const list = Array.isArray(ranches) ? ranches : []
        setHasRanches(list.length > 0)
      } catch (error) {
        console.error("Error fetching ranches for route guard:", error)
        setHasRanches(false)
      } finally {
        setRanchesReady(true)
      }
    }

    fetchRanches()
  }, [isAuthenticated, token])

  const hasRanchesInContext =
    (Array.isArray(ranches) && ranches.length > 0) || Boolean(ranch?.id)
  const effectiveHasRanches = hasRanches || hasRanchesInContext

  if (isLoading) return <AppBootSkeleton />;
  if (isAuthenticated && !ranchesReady) return <AppBootSkeleton />;

  return (
    <BrowserRouter>
      <AppRoutes
        isAuthenticated={isAuthenticated}
        ranchesReady={ranchesReady}
        hasRanches={effectiveHasRanches}
      />
      {showCreateNewRanchPopup && 
        <CreateNewRanch />
      }
      <FeedbackCenter />
      <div className="fixed bottom-5 right-5 z-[100]">
        <ThemeToggle />
      </div>
    </BrowserRouter>
  );
}

export default App;
