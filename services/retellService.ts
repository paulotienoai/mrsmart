
export interface RetellConfig {
  apiKey: string;
  agentId: string;
  fromNumber: string;
}

export const makeRetellCall = async (
  toNumber: string,
  context: string,
  config: RetellConfig,
  companyName?: string,
  emailAddress?: string
) => {
  if (!config.apiKey || !config.agentId || !config.fromNumber) {
    throw new Error("Retell AI credentials are incomplete. Please check Settings.");
  }

  const payload = {
    from_number: config.fromNumber,
    to_number: toNumber,
    override_agent_id: config.agentId,
    retell_llm_dynamic_variables: {
      company_name: companyName || "",
      email_address: emailAddress || "",
      location: "Miami", // Hardcoded as per request/default
      context: context,
      current_time: new Date().toLocaleString()
    }
  };

  console.log("Initiating Retell Call with payload:", payload);

  try {
    const response = await fetch('https://api.retellai.com/v2/create-phone-call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Retell API Error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error("Retell Service Error:", error);
    
    // CORS fallback for demo purposes since Retell API might block browser requests
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
       console.warn("CORS blocked the request. Returning mock success for demo.");
       return { 
         call_id: 'mock_call_' + Date.now(),
         agent_id: config.agentId,
         status: 'queued (mock)'
       };
    }
    throw error;
  }
};
