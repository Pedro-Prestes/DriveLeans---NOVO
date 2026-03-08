import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react";

export default function TokenRefresher({ onTokenRefreshed }) {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [newAccessToken, setNewAccessToken] = useState("");

  // Carregar dados do localStorage ao montar
  useEffect(() => {
    const savedClientId = localStorage.getItem("oauth_clientId") || "";
    const savedClientSecret = localStorage.getItem("oauth_clientSecret") || "";
    const savedRefreshToken = localStorage.getItem("oauth_refreshToken") || "";
    setClientId(savedClientId);
    setClientSecret(savedClientSecret);
    setRefreshToken(savedRefreshToken);
  }, []);

  // Salvar dados no localStorage quando mudam
  useEffect(() => {
    localStorage.setItem("oauth_clientId", clientId);
  }, [clientId]);

  useEffect(() => {
    localStorage.setItem("oauth_clientSecret", clientSecret);
  }, [clientSecret]);

  useEffect(() => {
    localStorage.setItem("oauth_refreshToken", refreshToken);
  }, [refreshToken]);

  const handleRefresh = async () => {
    setLoading(true);
    setStatus(null);

    try {
      const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      });

      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error_description || error.error || "OAuth2 error");
      }

      const data = await response.json();
      const accessToken = data.access_token;

      if (accessToken) {
        setNewAccessToken(accessToken);
        setStatus({ type: "success", message: "Token refreshed successfully!" });
        onTokenRefreshed(accessToken);
      } else {
        setStatus({
          type: "error",
          message: "No access_token in response",
        });
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: error.message || "Token refresh failed",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h2 className="font-semibold text-gray-800">Google Token Refresh (OAuth2)</h2>

      <div className="space-y-3">
        <div>
          <Label htmlFor="clientId" className="text-xs">Client ID</Label>
          <Input
            id="clientId"
            type="password"
            placeholder="828777380339-4l0...apps.googleusercontent.com"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="font-mono text-xs mt-1"
          />
        </div>

        <div>
          <Label htmlFor="clientSecret" className="text-xs">Client Secret</Label>
          <Input
            id="clientSecret"
            type="password"
            placeholder="GOCSPX-aE917C15..."
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            className="font-mono text-xs mt-1"
          />
        </div>

        <div>
          <Label htmlFor="refreshToken" className="text-xs">Refresh Token</Label>
          <Input
            id="refreshToken"
            type="password"
            placeholder="1//04sHGxvCoRz0yCgYIARAAGAQSNgF..."
            value={refreshToken}
            onChange={(e) => setRefreshToken(e.target.value)}
            className="font-mono text-xs mt-1"
          />
        </div>
      </div>

      <Button
        onClick={handleRefresh}
        disabled={!clientId || !clientSecret || !refreshToken || loading}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Refreshing Token...
          </>
        ) : (
          "Refresh Token"
        )}
      </Button>

      {status && (
        <div
          className={`rounded-lg p-3 flex items-start gap-2 text-sm ${
            status.type === "success"
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          {status.type === "success" ? (
            <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          )}
          <div>
            <p
              className={
                status.type === "success"
                  ? "text-green-800 font-medium"
                  : "text-red-800 font-medium"
              }
            >
              {status.message}
            </p>
            {newAccessToken && (
              <p className="text-xs text-gray-600 mt-1 font-mono break-all">
                {newAccessToken.substring(0, 50)}...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}