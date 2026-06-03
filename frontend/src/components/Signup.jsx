import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Eye, EyeOff, Mail, Lock, User as UserIcon, Upload, Sparkles } from "lucide-react";
import { API_URL } from "../config";

function Signup() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [profilePhoto, setProfilePhoto] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) {
        setError("Profile picture size must be under 1MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post(
        `${API_URL}/api/v1/user/signup`,
        {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          profilePhoto: profilePhoto,
        },
        {
          withCredentials: true,
        }
      );
      alert(data.message || "Signup Succeeded");
      navigate("/login");
    } catch (error) {
      const msg = error?.response?.data?.errors || "Signup Failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[#09090b] overflow-hidden px-4 py-12">
      {/* Background Glows */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none" />

      {/* Main card */}
      <div className="relative w-full max-w-lg bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 shadow-2xl shadow-violet-500/5 transition-all duration-300">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative group mb-3">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-full blur opacity-70 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
            <img
              src="/logo.png"
              alt="Nexus GPT Logo"
              className="relative h-14 w-14 rounded-full object-cover border-2 border-zinc-900"
            />
          </div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400 tracking-tight">
            Create an account
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Join the premium experience at <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 font-semibold">Nexus GPT</span>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSignup} className="space-y-4">
          
          {/* Profile Photo Upload */}
          <div className="flex flex-col items-center space-y-2 mb-4">
            <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-zinc-800 bg-zinc-950/50 flex items-center justify-center">
              {profilePhoto ? (
                <img src={profilePhoto} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-10 h-10 text-zinc-600" />
              )}
              <label className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-white text-[10px] font-semibold">
                <Upload className="w-4 h-4 mb-0.5" />
                Upload
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
            <span className="text-zinc-400 text-xs">Profile Photo (Optional, max 1MB)</span>
          </div>

          {/* Name Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-300 text-xs font-semibold uppercase tracking-wider mb-2">First Name</label>
              <div className="relative group">
                <UserIcon className="absolute left-4 top-[14px] h-5 w-5 text-zinc-500 group-focus-within:text-violet-400 transition-colors" />
                <input
                  className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-12 pr-4 py-3 placeholder-zinc-600 text-sm text-white focus:outline-none focus:border-violet-500/70 focus:ring-1 focus:ring-violet-500/30 transition-all"
                  type="text"
                  name="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-zinc-300 text-xs font-semibold uppercase tracking-wider mb-2">Last Name</label>
              <div className="relative group">
                <UserIcon className="absolute left-4 top-[14px] h-5 w-5 text-zinc-500 group-focus-within:text-violet-400 transition-colors" />
                <input
                  className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-12 pr-4 py-3 placeholder-zinc-600 text-sm text-white focus:outline-none focus:border-violet-500/70 focus:ring-1 focus:ring-violet-500/30 transition-all"
                  type="text"
                  name="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-zinc-300 text-xs font-semibold uppercase tracking-wider mb-2">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-[14px] h-5 w-5 text-zinc-500 group-focus-within:text-violet-400 transition-colors" />
              <input
                className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-12 pr-4 py-3 placeholder-zinc-600 text-sm text-white focus:outline-none focus:border-violet-500/70 focus:ring-1 focus:ring-violet-500/30 transition-all"
                type="email"
                name="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-zinc-300 text-xs font-semibold uppercase tracking-wider mb-2">Password</label>
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
            By signing up, you agree to Nexus GPT's{" "}
            <a href="#" className="text-zinc-400 hover:underline hover:text-zinc-300">Terms</a> and{" "}
            <a href="#" className="text-zinc-400 hover:underline hover:text-zinc-300">Privacy Policy</a>.
          </p>

          {/* Signup Button */}
          <button
            type="submit"
            disabled={loading}
            className="relative w-full overflow-hidden group bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-bold py-3 rounded-xl transition duration-300 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative flex items-center justify-center gap-2">
              {loading ? "Signing up..." : <>Sign Up <Sparkles className="h-4 w-4" /></>}
            </span>
          </button>
        </form>

        {/* Links */}
        <div className="mt-6 text-center text-sm text-zinc-400">
          Already registered?{" "}
          <Link className="text-violet-400 hover:text-violet-300 hover:underline font-semibold transition" to="/login">
            Login here
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Signup;
