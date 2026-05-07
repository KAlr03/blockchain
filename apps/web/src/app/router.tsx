import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "./AppShell.js";
import { LandingPage } from "../pages/LandingPage.js";
import { DashboardPage } from "../pages/DashboardPage.js";
import { ProductsPage } from "../pages/ProductsPage.js";
import { CertificatesPage } from "../pages/CertificatesPage.js";
import { VerifyPage } from "../pages/VerifyPage.js";
import { TraceabilityPage } from "../pages/TraceabilityPage.js";
import { AdminUsersPage } from "../pages/AdminUsersPage.js";
import { ProfilePage } from "../pages/ProfilePage.js";
import { ProtectedRoute } from "../components/ProtectedRoute.js";

export const router = createBrowserRouter([
  { path: "/",                   element: <LandingPage /> },
  { path: "/login",              element: <LandingPage /> },
  { path: "/verify",             element: <VerifyPage /> },
  { path: "/verify/:productId",  element: <VerifyPage /> },
  {
    element: <ProtectedRoute />,
    children: [{
      element: <AppShell />,
      children: [
        { path: "/dashboard",    element: <DashboardPage /> },
        { path: "/products",     element: <ProductsPage /> },
        { path: "/certificates", element: <CertificatesPage /> },
        { path: "/traceability", element: <TraceabilityPage /> },
        { path: "/users",        element: <AdminUsersPage /> },
        { path: "/profile",      element: <ProfilePage /> },
      ]
    }]
  }
]);
