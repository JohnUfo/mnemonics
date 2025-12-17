import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Brain } from 'lucide-react';

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // We removed the manual 'redirectTo' option. 
      // This allows Supabase to use the default 'Site URL' configured in the Supabase Dashboard.
      // This is often more reliable in preview environments where window.location.origin 
      // might not be allowlisted in Google Cloud Console.
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "An error occurred during login. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl max-w-md w-full flex flex-col items-center text-center">
        
        {/* Logo/Icon Area */}
        <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6">
          <Brain className="w-10 h-10 text-brand-tan" />
        </div>

        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Xotira</h1>
        <p className="text-gray-500 mb-8">
          Sign in to start training your brain and tracking your progress.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl w-full text-left">
            <p className="font-bold mb-1">Login Failed</p>
            <p>{error}</p>
            {error.includes("403") && (
               <p className="mt-2 text-xs text-red-500">
                 Hint: This is often a configuration issue. Check if your domain is allowed in Google Cloud Console and Supabase Dashboard.
               </p>
            )}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-4 px-6 rounded-xl transition-all shadow-sm active:scale-[0.98] group"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>Google bilan kirish</span>
            </>
          )}
        </button>

        <p className="mt-8 text-xs text-gray-400">
          Continuing implies acceptance of our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;