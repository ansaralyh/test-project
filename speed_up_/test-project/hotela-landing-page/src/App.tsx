import React from "react";
import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./Home/Home";
import HomePageLayout from "./components/HomePageLayout/HomePageLayout";
import Pricing from "./Pages/Pricing/Pricing";
import Features from "./Pages/Features/Features";
import AboutUs from "./Pages/AboutUs/AboutUs";

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePageLayout />}>
            <Route path="home" element={<Home />} />
            <Route path="price" element={<Pricing />} />
            <Route path="features" element={<Features />} />
            <Route path="aboutUs" element={<AboutUs />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
