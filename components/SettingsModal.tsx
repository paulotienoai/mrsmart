import React, { useState, useEffect } from 'react';

declare const google: any;

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('key_72ac19b70e4f8de99294e35d82c2');
  const [agentId, setAgentId] = useState('agent_11ae415bd3f53974473f013af1');
  const [fromNumber, setFromNumber] = useState('');
  
  // Google Auth Config
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleUser, setGoogleUser] = useState<{name: string, email: string, picture: string} | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const storedKey = localStorage.getItem('nexus_retell_key');
    const storedAgent = localStorage.getItem('nexus_retell_agent');
    const storedFrom = localStorage.getItem('nexus_retell_from');
    
    const storedClientId = localStorage.getItem('nexus_google_client_id');
    const storedUser = localStorage.getItem('nexus_google_user');
    
    if (storedKey) setApiKey(storedKey);
    if (storedAgent) setAgentId(storedAgent);
    if (storedFrom) setFromNumber(storedFrom);
    
    if (storedClientId) setGoogleClientId(storedClientId);
    if (storedUser) setGoogleUser(JSON.parse(storedUser));
  }, []);

  const handleSave = () => {
    localStorage.setItem('nexus_retell_key', apiKey);
    localStorage.setItem('nexus_retell_agent', agentId);
    localStorage.setItem('nexus_retell_from', fromNumber);
    localStorage.setItem('nexus_google_client_id', googleClientId);
    onClose();
  };

  const handleGoogleLogin = () => {
      setIsAuthenticating(true);

      if (googleClientId) {
          // REAL AUTH FLOW
          // Check if GIS is loaded
          if (typeof google === 'undefined' || !google.accounts) {
              alert("Google Identity Services script not loaded. Please refresh.");
              setIsAuthenticating(false);
              return;
          }

          const client = google.accounts.oauth2.initTokenClient({
            client_id: googleClientId,
            scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
            callback: async (tokenResponse: any) => {
                if (tokenResponse.access_token) {
                    try {
                        // Fetch User Info
                        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                            headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                        });
                        const userInfo = await userInfoRes.json();
                        
                        const user = {
                            name: userInfo.name,
                            email: userInfo.email,
                            picture: userInfo.picture
                        };
                        
                        setGoogleUser(user);
                        localStorage.setItem('nexus_google_user', JSON.stringify(user));
                        localStorage.setItem('nexus_google_token', tokenResponse.access_token);
                    } catch (error) {
                        console.error("Error fetching user info:", error);
                        alert("Failed to fetch user profile.");
                    }
                }
                setIsAuthenticating(false);
            },
            error_callback: (err: any) => {
                console.error("OAuth Error:", err);
                setIsAuthenticating(false);
                alert("Google Sign-In failed. Check console for details.");
            }
          });

          // Trigger the popup
          client.requestAccessToken();

      } else {
          // DEMO SIMULATION FLOW
          setTimeout(() => {
              setIsAuthenticating(false);
              const demoUser = {
                  name: "John Doe (Demo)",
                  email: "john.doe@demo.com",
                  picture: "" 
              };
              setGoogleUser(demoUser);
              localStorage.setItem('nexus_google_user', JSON.stringify(demoUser));
              localStorage.setItem('nexus_google_token', 'mock_oauth_token_' + Date.now());
          }, 2000);
      }
  };

  const handleGoogleLogout = () => {
      setGoogleUser(null);
      localStorage.removeItem('nexus_google_user');
      localStorage.removeItem('nexus_google_token');
      
      if (googleClientId && typeof google !== 'undefined') {
          google.accounts.oauth2.revoke(localStorage.getItem('nexus_google_token') || '', () => {});
      }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-6">Integration Settings</h2>
        
        <div className="space-y-6">
          
          {/* Google Integrations Section */}
          <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-2.15-.15-2.15z"></path></svg>
                  Google Workspace
              </h3>
              
              {!googleUser ? (
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <p className="text-sm text-slate-400 mb-3">Connect your account to enable Gmail and Calendar features.</p>
                      
                      <div className="mb-4">
                          <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Google Client ID (Optional)</label>
                          <input 
                            type="text" 
                            value={googleClientId}
                            onChange={e => setGoogleClientId(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white focus:border-primary-500 outline-none placeholder-slate-700"
                            placeholder="To use REAL login, enter Client ID..."
                          />
                          <p className="text-[10px] text-slate-600 mt-1">Leave empty to use Demo Mode simulation.</p>
                      </div>

                      <button 
                        onClick={handleGoogleLogin}
                        disabled={isAuthenticating}
                        className="w-full py-2.5 bg-white hover:bg-gray-100 text-slate-900 font-medium rounded shadow flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
                      >
                          {isAuthenticating ? (
                              <>
                                <svg className="animate-spin h-4 w-4 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Connecting...
                              </>
                          ) : (
                              <>
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-2.15-.15-2.15z"></path></svg>
                                {googleClientId ? "Sign in with Google" : "Connect Demo Account"}
                              </>
                          )}
                      </button>
                  </div>
              ) : (
                  <div className="bg-green-900/10 rounded-lg p-4 border border-green-500/30">
                      <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                              {googleUser.picture ? (
                                  <img src={googleUser.picture} alt="Profile" className="w-8 h-8 rounded-full border border-slate-600" />
                              ) : (
                                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                                      {googleUser.name.charAt(0)}
                                  </div>
                              )}
                              <div className="overflow-hidden">
                                  <p className="text-sm font-semibold text-white truncate max-w-[150px]">{googleUser.name}</p>
                                  <p className="text-xs text-slate-400 truncate max-w-[150px]">{googleUser.email}</p>
                              </div>
                          </div>
                          <button onClick={handleGoogleLogout} className="text-xs text-red-400 hover:text-red-300 hover:underline">Disconnect</button>
                      </div>
                      <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-slate-300">
                              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Gmail Access</span>
                              <span className="text-green-500">Active</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-300">
                              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Calendar Access</span>
                              <span className="text-green-500">Active</span>
                          </div>
                      </div>
                  </div>
              )}
          </div>

          <div className="w-full h-px bg-slate-800"></div>

          {/* Retell AI Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-300">Retell AI (Phone Agent)</h3>
            <div>
              <label className="block text-xs text-slate-500 mb-1">API Key (Bearer Token)</label>
              <input 
                type="password" 
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white focus:border-primary-500 outline-none"
                placeholder="key_..."
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Agent ID</label>
              <input 
                type="text" 
                value={agentId}
                onChange={e => setAgentId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white focus:border-primary-500 outline-none"
                placeholder="agent_..."
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">From Number (Required for Calls)</label>
              <input 
                type="text" 
                value={fromNumber}
                onChange={e => setFromNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white focus:border-primary-500 outline-none"
                placeholder="+1234567890"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
          <button 
            onClick={handleSave}
            className="px-4 py-2 rounded-lg text-sm bg-primary-600 hover:bg-primary-500 text-white font-semibold shadow-lg shadow-primary-600/20 transition-colors"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;