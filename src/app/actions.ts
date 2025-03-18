"use server";

import { createClient } from "../../supabase/server";
import { encodedRedirect } from "@/utils/utils";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const fullName = formData.get("full_name")?.toString() || "";
  const supabase = await createClient();
  const origin = headers().get("origin");

  if (!email || !password) {
    return encodedRedirect(
      "error",
      "/sign-up",
      "Email and password are required",
    );
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        data: {
          full_name: fullName,
          email: email,
        },
      },
    });

    if (error) {
      return encodedRedirect("error", "/sign-up", error.message);
    }

    if (user) {
      try {
        // Ensure user exists in the users table
        const { error: userError } = await supabase.rpc("ensure_user_exists", {
          user_id: user.id,
          user_email: email,
          user_name: fullName,
        });

        if (userError) {
          console.error("Error ensuring user exists:", userError);
        }
      } catch (err) {
        console.error("Error in user creation:", err);
      }
    }
  } catch (err) {
    console.error("Error in sign up process:", err);
    return encodedRedirect(
      "error",
      "/sign-up",
      "An unexpected error occurred. Please try again.",
    );
  }

  return encodedRedirect(
    "success",
    "/sign-up",
    "Thanks for signing up! Please check your email for a verification link.",
  );
};

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return encodedRedirect("error", "/sign-in", error.message);
    }

    // Ensure user exists in the users table after successful sign-in
    if (data.user) {
      try {
        const { error: userError } = await supabase.rpc("ensure_user_exists", {
          user_id: data.user.id,
          user_email: data.user.email,
          user_name: data.user.user_metadata?.full_name || "",
        });

        if (userError) {
          console.error(
            "Error ensuring user exists during sign-in:",
            userError,
          );
          // Continue with sign-in even if there's an error ensuring the user exists
        }
      } catch (err) {
        console.error("Error in user verification during sign-in:", err);
        // Continue with sign-in even if there's an error in user verification
      }
    }

    // Use encodedRedirect instead of redirect to avoid NEXT_REDIRECT error
    return encodedRedirect("success", "/dashboard", "");
  } catch (err) {
    console.error("Error in sign in process:", err);
    return encodedRedirect(
      "error",
      "/sign-in",
      "An unexpected error occurred. Please try again.",
    );
  }
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = await createClient();
  const origin = headers().get("origin");
  const callbackUrl = formData.get("callbackUrl")?.toString();

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?redirect_to=/protected/reset-password`,
  });

  if (error) {
    return encodedRedirect(
      "error",
      "/forgot-password",
      "Could not reset password",
    );
  }

  if (callbackUrl) {
    return redirect(callbackUrl);
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Check your email for a link to reset your password.",
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password and confirm password are required",
    );
  }

  if (password !== confirmPassword) {
    encodedRedirect(
      "error",
      "/dashboard/reset-password",
      "Passwords do not match",
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    encodedRedirect(
      "error",
      "/dashboard/reset-password",
      "Password update failed",
    );
  }

  encodedRedirect("success", "/protected/reset-password", "Password updated");
};

export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/sign-in");
};

export const checkUserSubscription = async (userId: string) => {
  const supabase = await createClient();

  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (error) {
    return false;
  }

  return !!subscription;
};

export const getUserFriendCode = async () => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Get the friend code from the friend_codes table
  const { data, error } = await supabase
    .from("friend_codes")
    .select("code")
    .eq("user_id", user.id)
    .single();

  if (error) {
    return null;
  }

  return data?.code || null;
};
