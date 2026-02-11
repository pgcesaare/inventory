import React, { useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useRoutes, BrowserRouter, Navigate } from "react-router-dom";
import Template from "./template/template";
import Dashboard from "./routes/dashboard";
import Historical from "./routes/historical";
import Inventory from "./routes/inventory";
import NavbarLayout from "./navbar/components/navbarLayout";
import AddCalves from "./routes/addCalves";
import AddOneByOne from "./components/add-calves/addOnebyOne";
import UploadExcel from "./components/add-calves/fileUpload";
import { useAppContext } from "./context";
import CreateNewRanch from "./components/dashboard/createRanch";
import Loads from "./routes/load";

const ProtectedTemplate = ({ children, isAuthenticated, title }) => {
  if (!isAuthenticated) return <Navigate to="/" />;
  return (
    <Template title={title} navbar={<NavbarLayout />} content={children}/>
  );
};

const AppRoutes = ({ isAuthenticated }) => {
  let routes = useRoutes([
    {
      path: "/dashboard",
      element: isAuthenticated ? <Dashboard /> : <Navigate to="/" />,
    },
    {
      path: "/dashboard/ranch/:id/historical",
      element: (
        <ProtectedTemplate
          title="Historical placements"
          isAuthenticated={isAuthenticated}>
          <Historical />
        </ProtectedTemplate>
      ),
    },
    {
      path: "/dashboard/ranch/:id/inventory",
      element: (
        <ProtectedTemplate 
          title="Inventory"
          isAuthenticated={isAuthenticated}>
          <Inventory />
        </ProtectedTemplate>
      ),
    },
    {
      path: "/dashboard/ranch/:id/add-calves",
      element: (
        <ProtectedTemplate isAuthenticated={isAuthenticated}>
          <AddCalves />
        </ProtectedTemplate>
      ),
    },
    {
      path: "/dashboard/ranch/:id/add-calves/one-by-one",
      element: (
        <ProtectedTemplate isAuthenticated={isAuthenticated}>
          <AddOneByOne />
        </ProtectedTemplate>
      ),
    },
    {
      path: "/dashboard/ranch/:id/add-calves/bulk-data",
      element: (
        <ProtectedTemplate isAuthenticated={isAuthenticated}>
          <UploadExcel />
        </ProtectedTemplate>
      ),
    },
    {
      path: "/dashboard/ranch/:id/loads",
      element: (
        <ProtectedTemplate
          title="Load history"
          isAuthenticated={isAuthenticated}>
          <Loads />
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
  const { showCreateNewRanchPopup } = useAppContext()
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) loginWithRedirect();
  }, [isAuthenticated, isLoading, loginWithRedirect]);

  if (isLoading) return <div>Loading...</div>;

  return (
    <BrowserRouter>
      <AppRoutes isAuthenticated={isAuthenticated} />
      {showCreateNewRanchPopup && 
        <CreateNewRanch />
      }
    </BrowserRouter>
  );
}

export default App;
