import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { App } from "./main";
import { client } from "./queryClient";
import { UnsavedWorkProvider } from "./components/UnsavedWork";
const router = createBrowserRouter([
  {
    path: "*",
    element: (
      <UnsavedWorkProvider>
        <App />
      </UnsavedWorkProvider>
    ),
  },
]);

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
);
