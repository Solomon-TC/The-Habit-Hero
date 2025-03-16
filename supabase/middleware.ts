import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export const updateSession = async (request: NextRequest) => {
  try {
    // Create an unmodified response
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll().map(({ name, value }) => ({
              name,
              value,
            }));
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              response = NextResponse.next({
                request: {
                  headers: request.headers,
                },
              });
              response.cookies.set(name, value, options);
            });
          },
        },
      },
    );

    // This will refresh session if expired - required for Server Components
    // https://supabase.com/docs/guides/auth/server-side/nextjs
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    // If user is authenticated, ensure they have a record in the users table
    if (user && !error) {
      try {
        // Check if user exists in the users table
        const { data: existingUser, error: userError } = await supabase
          .from("users")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        // If user doesn't exist in the users table, create a record
        if (!existingUser && !userError) {
          await supabase.from("users").insert({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.email,
            token_identifier: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }

        // Check if user has a friend code in the friend_codes table
        const { data: friendCode, error: friendCodeError } = await supabase
          .from("friend_codes")
          .select("code")
          .eq("user_id", user.id)
          .maybeSingle();

        // If no friend code exists, the database trigger should handle it
        // But we'll add a fallback here just in case
        if (!friendCode && !friendCodeError) {
          // Use the service role client to bypass RLS
          const serviceClient = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_KEY!,
            {
              cookies: {
                getAll() {
                  return request.cookies.getAll().map(({ name, value }) => ({
                    name,
                    value,
                  }));
                },
                setAll(cookiesToSet) {
                  cookiesToSet.forEach(({ name, value, options }) => {
                    request.cookies.set(name, value);
                    response.cookies.set(name, value, options);
                  });
                },
              },
            },
          );

          // Generate a random 8-character alphanumeric code
          const generateCode = () => {
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            let code = "";
            for (let i = 0; i < 8; i++) {
              code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return code;
          };

          // Try to generate a unique code (retry up to 5 times)
          let code = generateCode();
          let attempts = 0;
          let isUnique = false;

          while (!isUnique && attempts < 5) {
            const { data, error } = await serviceClient
              .from("friend_codes")
              .select("id")
              .eq("code", code)
              .single();

            if (error && error.code === "PGRST116") {
              // Code is unique (no results found)
              isUnique = true;
            } else {
              // Try a new code
              code = generateCode();
              attempts++;
            }
          }

          // Insert the friend code
          await serviceClient.from("friend_codes").insert({
            user_id: user.id,
            code,
          });
        }
      } catch (userError) {
        // Silently handle errors to avoid breaking the middleware
      }
    }

    // protected routes
    if (request.nextUrl.pathname.startsWith("/dashboard") && error) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    return response;
  } catch (e) {
    // If you are here, a Supabase client could not be created!
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
};
