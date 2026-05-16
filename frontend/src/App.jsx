


import { BrowserRouter, Routes, Route } from "react-router-dom";

import HomePage from "./pages/HomePage";
import SemanticSearchPage from "./pages/SemanticSearchPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route
          path="/semantic-search"
          element={<SemanticSearchPage />}
        />
      </Routes>
    </BrowserRouter>
  );
}