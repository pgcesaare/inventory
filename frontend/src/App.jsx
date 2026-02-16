import React, { useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useRoutes, BrowserRouter, Navigate, useLocation, useParams } from "react-router-dom";
import Template from "./template/template";
import Ranches from "./routes/ranches";
import Historical from "./routes/historical";
import Inventory from "./routes/inventory";
import AddCalves from "./routes/addCalves";
import NavbarLayout from "./navbar/components/navbarLayout";
import { useAppContext } from "./context";
import CreateNewRanch from "./components/ranches/createRanch";
import Loads from "./routes/load";
import GeneralSettings from "./routes/generalSettings";
import WeightBracketsSettings from "./routes/weightBracketsSettings";
import Statements from "./routes/statements";
import Invoices from "./routes/invoices";
import Prices from "./routes/prices";
import Breeds from "./routes/breeds";
import Sellers from "./routes/sellers";
import FeedbackCenter from "./components/shared/feedbackCenter";
import { AppBootSkeleton } from "./components/shared/loadingSkeletons";

const ProtectedTemplate = ({ children, isAuthenticated, title, showTopBar = true }) => {
  if (!isAuthenticated) return <Navigate to="/" />;
  return (
    <Template title={title} showTopBar={showTopBar} navbar={<NavbarLayout />} content={children}/>
  );
};

const LegacyRanchRouteRedirect = () => {
  const location = useLocation();
  const migratedPath = location.pathname
    .replace("/dashboard/ranch/", "/ranches/")
    .replace("/ranches/ranch/", "/ranches/");
  return <Navigate to={`${migratedPath}${location.search}`} replace />;
};

const LegacyRanchSettingsRedirect = () => {
  const { id } = useParams()
  const target = id
    ? `/weight-brackets?ranchId=${encodeURIComponent(id)}`
    : "/weight-brackets"
  return <Navigate to={target} replace />
}

const LegacyWeightBracketsRedirect = () => {
  const location = useLocation()
  return <Navigate to={`/weight-brackets${location.search}`} replace />
}

const AppRoutes = ({ isAuthenticated }) => {
  const ranchRouteGuard = !isAuthenticated
    ? <Navigate to="/" />
    : null

  let routes = useRoutes([
    {
      path: "/ranches",
      element: (
        ranchRouteGuard || <ProtectedTemplate
          title="Ranches"
          showTopBar={false}
          isAuthenticated={isAuthenticated}>
          <Ranches />
        </ProtectedTemplate>
      ),
    },
    {
      path: "/dashboard",
      element: <Navigate to="/ranches" replace />,
    },
    {
      path: "/ranches/:id/historical",
      element: (
        ranchRouteGuard || <ProtectedTemplate
          title="Historical placements"
          isAuthenticated={isAuthenticated}>
          <Historical />
        </ProtectedTemplate>
      ),
    },
    {
      path: "/ranches/:id/inventory",
      element: (
        ranchRouteGuard || <ProtectedTemplate 
          title="Inventory"
          isAuthenticated={isAuthenticated}>
          <Inventory />
        </ProtectedTemplate>
      ),
    },
    {
      path: "/ranches/:id/manage-calves",
      element: (
        ranchRouteGuard || <ProtectedTemplate
          title="Manage calves"
          isAuthenticated={isAuthenticated}>
          <Inventory />
        </ProtectedTemplate>
      ),
    },
    {
      path: "/ranches/:id/loads",
      element: (
        ranchRouteGuard || <ProtectedTemplate
          title="Load history"
          isAuthenticated={isAuthenticated}>
          <Loads />
        </ProtectedTemplate>
      ),
    },
    {
      path: "/settings",
      element: (
        ranchRouteGuard || <ProtectedTemplate
          title="General settings"
          isAuthenticated={isAuthenticated}>
          <GeneralSettings />
        </ProtectedTemplate>
      ),
    },
    {
      path: "/weight-brackets",
      element: (
        ranchRouteGuard || <ProtectedTemplate
          title="Weight brackets"
          isAuthenticated={isAuthenticated}>
          <WeightBracketsSettings />
        </ProtectedTemplate>
      ),
    },
    {
      path: "/settings/weight-brackets",
      element: <LegacyWeightBracketsRedirect />,
    },
    {
      path: "/statements",
      element: (
        ranchRouteGuard || <ProtectedTemplate
          title="Statements"
          isAuthenticated={isAuthenticated}>
          <Statements />
        </ProtectedTemplate>
      ),
    },
    {
      path: "/invoices",
      element: (
        ranchRouteGuard || <ProtectedTemplate
          title="Invoices"
          isAuthenticated={isAuthenticated}>
          <Invoices />
        </ProtectedTemplate>
      ),
    },
    {
      path: "/prices",
      element: (
        ranchRouteGuard || <ProtectedTemplate
          title="Prices"
          isAuthenticated={isAuthenticated}>
          <Prices />
        </ProtectedTemplate>
      ),
    },
    {
      path: "/breeds",
      element: (
        ranchRouteGuard || <ProtectedTemplate
          title="Breeds"
          isAuthenticated={isAuthenticated}>
          <Breeds />
        </ProtectedTemplate>
      ),
    },
    {
      path: "/sellers",
      element: (
        ranchRouteGuard || <ProtectedTemplate
          title="Sellers"
          isAuthenticated={isAuthenticated}>
          <Sellers />
        </ProtectedTemplate>
      ),
    },
    {
      path: "/ranches/:id/settings",
      element: <LegacyRanchSettingsRedirect />,
    },
    {
      path: "/ranches/:id/add-calves",
      element: (
        ranchRouteGuard || <ProtectedTemplate
          title="Add calves"
          isAuthenticated={isAuthenticated}>
          <AddCalves />
        </ProtectedTemplate>
      ),
    },
    {
      path: "/dashboard/ranch/:id/*",
      element: <LegacyRanchRouteRedirect />,
    },
    {
      path: "/ranches/ranch/:id/*",
      element: <LegacyRanchRouteRedirect />,
    },
    {
      path: "/",
      element: isAuthenticated ? <Navigate to="/ranches" /> : null,
    },
  ]);

  return routes;
};

function App() {
  const { showCreateNewRanchPopup } = useAppContext()
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) loginWithRedirect();
  }, [isAuthenticated, isLoading, loginWithRedirect]);

  if (isLoading) return <AppBootSkeleton />;

  return (
    <BrowserRouter>
      <AppRoutes
        isAuthenticated={isAuthenticated}
      />
      {showCreateNewRanchPopup && 
        <CreateNewRanch />
      }
      <FeedbackCenter />
    </BrowserRouter>
  );
}

export default App;
