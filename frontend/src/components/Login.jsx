import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthProvider";
import { Eye, EyeOff, Mail, Lock, Sparkles } from "lucide-react";
import { API_URL } from "../config";

function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [, setAuthUser] = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post(
        `${API_URL}/api/v1/user/login`,
        {
          email: formData.email,
          password: formData.password,
        },
        {
          withCredentials: true,
        }
      );
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("token", data.token);
      setAuthUser(data.token);
      navigate("/");
    } catch (error) {
      const msg = error?.response?.data?.errors || "Login Failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[#09090b] overflow-hidden px-4">
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none" />

      {/* Main card */}
      <div className="relative w-full max-w-md bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 shadow-2xl shadow-violet-500/5 transition-all duration-300">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative group mb-3">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-full blur opacity-70 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
            <img
              src="/logo.png"
              alt="Nexus GPT Logo"
              className="relative h-14 w-14 rounded-full object-cover border-2 border-zinc-900"
            />
          </div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400 tracking-tight">
            Welcome back
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Access the power of <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 font-semibold">Nexus GPT</span>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-zinc-300 text-xs font-semibold uppercase tracking-wider mb-2">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-[14px] h-5 w-5 text-zinc-500 group-focus-within:text-violet-400 transition-colors" />
              <input
                className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-12 pr-4 py-3 placeholder-zinc-600 text-sm text-white focus:outline-none focus:border-violet-500/70 focus:ring-1 focus:ring-violet-500/30 transition-all"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-zinc-300 text-xs font-semibold uppercase tracking-wider">Password</label>
            </div>
            <div className="relative group">
              <Lock className="absolute left-4 top-[14px] h-5 w-5 text-zinc-500 group-focus-within:text-violet-400 transition-colors" />
              <input
                className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-12 pr-12 py-3 placeholder-zinc-600 text-sm text-white focus:outline-none focus:border-violet-500/70 focus:ring-1 focus:ring-violet-500/30 transition-all"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-[14px] text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-3 text-center">
              {error}
            </div>
          )}

          {/* Terms info */}
          <p className="text-center text-[11px] text-zinc-500 leading-relaxed">
            By signing in, you agree to Nexus GPT's{" "}
            <a href="#" className="text-zinc-400 hover:underline hover:text-zinc-300">Terms</a> and{" "}
            <a href="#" className="text-zinc-400 hover:underline hover:text-zinc-300">Privacy Policy</a>.
          </p>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="relative w-full overflow-hidden group bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-bold py-3 rounded-xl transition duration-300 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative flex items-center justify-center gap-2">
              {loading ? "Logging in..." : <>Sign In <Sparkles className="h-4 w-4" /></>}
            </span>
          </button>
        </form>

        {/* Links */}
        <div className="mt-8 text-center text-sm text-zinc-400">
          New to Nexus GPT?{" "}
          <Link className="text-violet-400 hover:text-violet-300 hover:underline font-semibold transition" to="/signup">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
