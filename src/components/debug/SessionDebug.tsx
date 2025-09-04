"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface SessionDebugProps {
  enabled?: boolean;
}

interface SessionDebugInfo {
  status: string;
  sessionData: any;
  cookieInfo: string[];
  clientTimestamp: string;
  userAgent: string;
}

export function SessionDebug({ enabled = false }: SessionDebugProps) {
  const { data: session, status, update } = useSession();
  const [debugInfo, setDebugInfo] = useState<SessionDebugInfo | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const updateDebugInfo = () => {
      const cookies = document.cookie.split(';').map(cookie => cookie.trim());
      const authCookies = cookies.filter(cookie => 
        cookie.includes('next-auth') || 
        cookie.includes('__Secure-next-auth') ||
        cookie.includes('session')
      );

      setDebugInfo({
        status,
        sessionData: session,
        cookieInfo: authCookies.length > 0 ? authCookies : ['No auth cookies found'],
        clientTimestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      });
    };

    updateDebugInfo();
    
    // Update debug info every 2 seconds when enabled
    const interval = setInterval(updateDebugInfo, 2000);
    
    return () => clearInterval(interval);
  }, [enabled, session, status]);

  if (!enabled || !debugInfo) return null;

  return (
    <>
      {/* Floating debug button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 left-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
        title="Toggle Session Debug Info"
      >
        🐛
      </button>

      {/* Debug panel */}
      {isVisible && (
        <div className="fixed bottom-20 left-4 bg-black bg-opacity-90 text-green-400 p-4 rounded-lg shadow-xl max-w-lg max-h-96 overflow-auto font-mono text-xs z-50">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-white font-bold">Session Debug Info</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-2">
            <div>
              <span className="text-yellow-400">Status:</span> 
              <span className={`ml-2 ${
                status === 'authenticated' ? 'text-green-400' : 
                status === 'loading' ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {status}
              </span>
            </div>
            
            <div>
              <span className="text-yellow-400">Session Data:</span>
              <pre className="mt-1 text-xs bg-gray-800 p-2 rounded overflow-x-auto">
                {JSON.stringify(debugInfo.sessionData, null, 2) || 'null'}
              </pre>
            </div>
            
            <div>
              <span className="text-yellow-400">Auth Cookies:</span>
              <div className="mt-1 space-y-1">
                {debugInfo.cookieInfo.map((cookie, index) => (
                  <div key={index} className="text-xs break-all">
                    {cookie}
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <span className="text-yellow-400">Last Updated:</span> 
              <span className="ml-2">{debugInfo.clientTimestamp}</span>
            </div>
            
            <div className="pt-2 border-t border-gray-700">
              <button
                onClick={() => {
                  update();
                  console.log('Session update triggered');
                }}
                className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
              >
                Force Session Update
              </button>
            </div>
            
            <div>
              <button
                onClick={() => {
                  console.log('=== SESSION DEBUG INFO ===');
                  console.log('Status:', status);
                  console.log('Session:', session);
                  console.log('Cookies:', document.cookie);
                  console.log('LocalStorage next-auth items:', 
                    Object.keys(localStorage).filter(key => key.includes('next-auth')));
                  console.log('SessionStorage next-auth items:', 
                    Object.keys(sessionStorage).filter(key => key.includes('next-auth')));
                  console.log('========================');
                }}
                className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 ml-2"
              >
                Log to Console
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default SessionDebug;