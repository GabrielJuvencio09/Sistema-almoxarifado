
import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "react-hot-toast"; 
import { DashboardPage } from "./pages/dashboard/Dashboard.jsx";
import { LoginPage } from "./pages/login/Login.jsx";
import "./index.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Layout } from "./components/Layout/Layout.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";
import { MovimentacaoPage } from './pages/movimentacao/Movimentacao.jsx';
import { ProdutosPage } from "./pages/produtos/Produtos.jsx";
import { HistoricoPage } from "./pages/historico/Historico.jsx";
import { NotasFiscaisPage } from "./pages/notasficais/NotasFiscais.jsx";
import { EtiquetaPage } from './pages/etiquetas/Etiqueta.jsx'
import { RelatoriosPage } from "./pages/relatorios/Relatorios.jsx";
import { ProvisionamentoPage } from "./pages/provisionamento/Provisionamento.jsx"; 


const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: "Movimentacao", 
        element: <MovimentacaoPage />,
      },
      {
        path: "produtos", 
        element: <ProdutosPage />,
      },
      {
        path: "historico", 
        element: <HistoricoPage />,
      },
      {
        path: "notas-fiscais",
        element: <NotasFiscaisPage />,
      },
      {
        path: "relatorios", 
        element: <RelatoriosPage />,
      },
      {
        path: "provisionamento", 
        element: <ProvisionamentoPage />,
      }
    ],
  },
  {
    path: "/produtos/:sku/etiqueta",
    element: (
      <ProtectedRoute>
        <EtiquetaPage />
      </ProtectedRoute>
    )
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#333',
            color: '#fff',
            fontSize: '15px',
          },
          success: {
            style: {
              background: '#28a745', 
            },
          },
          error: {
            style: {
              background: '#dc3545', 
            },
          },
        }}
      />
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);