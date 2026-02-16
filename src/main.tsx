import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, Navigate } from "react-router";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./providers/auth.tsx";
import { Gallery } from "./pages/gallery.tsx";
import { ItemDetail } from "./pages/item-detail.tsx";
import { AddItem } from "./pages/add-item.tsx";
import { Settings } from "./pages/settings.tsx";
import { Insights } from "./pages/insights/index.tsx";
import { Outfits } from "./pages/outfits/index.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<App />}>
            <Route index element={<Gallery />} />
            <Route path="item/:id" element={<ItemDetail />} />
            <Route path="add" element={<AddItem />} />
            <Route path="outfits" element={<Outfits />} />
            <Route path="insights" element={<Insights />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);
