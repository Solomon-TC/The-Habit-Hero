"use client";

import { useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { createClient } from "../../../supabase/client";
import { Loader2, Upload, User, Mail, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

export default function SettingsForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    avatarUrl: "",
  });
  const [user, setUser] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const client = createClient();
        const {
          data: { user },
        } = await client.auth.getUser();

        if (!user) {
          router.push("/sign-in");
          return;
        }

        setUser(user);

        // Get user profile data
        const { data: userData, error: userError } = await client
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();

        if (userError) throw userError;

        setFormData({
          fullName: userData.full_name || "",
          email: user.email || "",
          avatarUrl: userData.avatar_url || "",
        });

        if (userData.avatar_url) {
          setAvatarPreview(userData.avatar_url);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        setMessage({
          type: "error",
          text: "Failed to load profile data. Please try again.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      setMessage({ type: "", text: "" });
      const client = createClient();

      let avatarUrl = formData.avatarUrl;

      // Upload new avatar if selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split(".").pop();
        const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await client.storage
          .from("user-avatars")
          .upload(filePath, avatarFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = client.storage
          .from("user-avatars")
          .getPublicUrl(filePath);

        avatarUrl = urlData.publicUrl;
      }

      // Update user profile
      const { error: updateError } = await client
        .from("users")
        .update({
          full_name: formData.fullName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Update email if changed
      if (formData.email !== user.email) {
        const { error: emailError } = await client.auth.updateUser({
          email: formData.email,
        });

        if (emailError) throw emailError;
      }

      setMessage({
        type: "success",
        text: "Profile updated successfully!",
      });

      // Refresh the page to show updated data
      router.refresh();

      // Update the local state with the new values
      setFormData({
        ...formData,
        fullName: formData.fullName,
        email: formData.email,
        avatarUrl: avatarUrl,
      });

      if (avatarUrl) {
        setAvatarPreview(avatarUrl);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage({
        type: "error",
        text: error.message || "Failed to update profile. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg border-2 border-primary/10 shadow-sm">
      <h2 className="text-xl font-semibold mb-6">Profile Settings</h2>

      {message.text && (
        <div
          className={`p-4 mb-6 rounded-md ${message.type === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}
        >
          <div className="flex items-center">
            {message.type === "error" ? (
              <AlertCircle className="h-5 w-5 mr-2" />
            ) : (
              <div className="h-5 w-5 mr-2 text-green-500">✓</div>
            )}
            <p>{message.text}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col items-center mb-6">
          <Avatar className="h-24 w-24 mb-4">
            <AvatarImage src={avatarPreview} alt="Profile picture" />
            <AvatarFallback className="bg-primary/10 text-primary text-xl">
              {formData.fullName ? (
                formData.fullName.charAt(0).toUpperCase()
              ) : (
                <User />
              )}
            </AvatarFallback>
          </Avatar>

          <div className="flex items-center">
            <label htmlFor="avatar-upload" className="cursor-pointer">
              <div className="flex items-center gap-2 text-sm text-primary hover:text-primary/80">
                <Upload className="h-4 w-4" />
                <span>Upload new picture</span>
              </div>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Full Name
            </Label>
            <Input
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              placeholder="Your full name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="your.email@example.com"
            />
            {formData.email !== user?.email && (
              <p className="text-xs text-amber-600 mt-1">
                Changing your email will require verification of the new address
              </p>
            )}
          </div>
        </div>

        <div className="pt-4">
          <Button
            type="submit"
            className="w-full md:w-auto bg-gradient-to-r from-primary to-primary/90 hover:brightness-110"
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
