import React, { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import axios from "axios";

import Home from "./components/Home";
import Login from "./components/Login";
import Signup from "./components/Signup";
import ShareView from "./components/ShareView";
import { useAuth } from "./context/AuthProvider";

function App() {
  const [authUser, setAuthUser] = useAuth();
  console.log(authUser);

  // Safeguard: Redirect to login if backend sends 401 (Unauthorized)
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setAuthUser(null);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [setAuthUser]);

  return (
    <>
      <div>
        <Routes>
          <Route
            path="/"
            element={authUser ? <Home /> : <Navigate to={"/login"} />}
          />
          <Route
            path="/login"
            element={authUser ? <Navigate to={"/"} /> : <Login />}
          />
          <Route
            path="/signup"
            element={authUser ? <Navigate to={"/"} /> : <Signup />}
          />
          <Route
            path="/share/:shareId"
            element={<ShareView />}
          />
        </Routes>
      </div>
    </>
  );
}

export default App;

