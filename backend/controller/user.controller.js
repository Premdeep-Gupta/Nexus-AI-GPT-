import { User } from "../model/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const signup = async (req, res) => {
  const { firstName, lastName, email, password, profilePhoto } = req.body;
  try {
    const user = await User.findOne({ email: email });
    if (user) {
      return res.status(401).json({ errors: "User already exist" });
    }
    const hashPassword = await bcrypt.hash(password, 10);
    const newuser = new User({
      firstName,
      lastName,
      email,
      password: hashPassword,
      profilePhoto: profilePhoto || "",
    });
    await newuser.save();
    return res.status(201).json({ message: "signup succeeded" });
  } catch (error) {
    console.log("Error in signup: ", error);
    return res.status(500).json({ errors: "Error in signup" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email: email });

    if (!user) {
      return res.status(403).json({ errors: "Invalid Credentials" });
    }
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(403).json({ errors: "Invalid Credentials" });
    }

    // JWT Secret check
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }

    // jwt sign token
    const token = jwt.sign({ id: user._id }, secret, {
      expiresIn: "1d",
    });

    const cookieOptions = {
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    };

    res.cookie("jwt", token, cookieOptions);
    return res
      .status(201)
      .json({ message: "User loggedin succeeded", user, token });
  } catch (error) {
    console.log("Error in login: ", error);
    return res.status(500).json({ errors: "Error in login" });
  }
};

export const logout = (req, res) => {
  try {
    res.clearCookie("jwt");
    return res.status(200).json({ message: "Loggout succeeded" });
  } catch (error) {
    console.log("Error in logout: ", error);
    return res.status(500).json({ errors: "Error in logout" });
  }
};

export const updateProfile = async (req, res) => {
  const userId = req.userId;
  const { firstName, lastName, profilePhoto } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ errors: "User not found" });
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (profilePhoto !== undefined) user.profilePhoto = profilePhoto;

    await user.save();

    return res.status(200).json({
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    console.log("Error in updateProfile: ", error);
    return res.status(500).json({ errors: "Error in updating profile" });
  }
};

export const getUserSettings = async (req, res) => {
  const userId = req.userId;
  try {
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.status(200).json({ user });
  } catch (error) {
    console.error("Error in getUserSettings:", error);
    return res.status(500).json({ error: "Failed to fetch user settings" });
  }
};

export const addMemory = async (req, res) => {
  const userId = req.userId;
  const { content } = req.body;
  if (!content || content.trim() === "") {
    return res.status(400).json({ error: "Memory content is required" });
  }
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    user.memories.push({ content });
    await user.save();
    return res.status(201).json({ memories: user.memories });
  } catch (error) {
    console.error("Error in addMemory:", error);
    return res.status(500).json({ error: "Failed to add memory" });
  }
};

export const deleteMemory = async (req, res) => {
  const userId = req.userId;
  const { memoryId } = req.params;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    user.memories = user.memories.filter((m) => m._id.toString() !== memoryId);
    await user.save();
    return res.status(200).json({ memories: user.memories });
  } catch (error) {
    console.error("Error in deleteMemory:", error);
    return res.status(500).json({ error: "Failed to delete memory" });
  }
};

export const upgradePlan = async (req, res) => {
  const userId = req.userId;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    user.plan = "pro";
    await user.save();
    return res.status(200).json({ message: "Upgraded to Pro successfully", user });
  } catch (error) {
    console.error("Error in upgradePlan:", error);
    return res.status(500).json({ error: "Failed to upgrade plan" });
  }
};