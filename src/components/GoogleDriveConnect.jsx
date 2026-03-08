import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, LogIn } from "lucide-react";

export default function GoogleDriveConnect({ onConnected }) {
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConnect = async () => {
    setLoading(true);
    setError("");

    try {
      // Tenta renovar o token para validar as credenciais
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error_description || "Erro ao autenticar");
        setLoading(false);
        return;
      }

      // Salva as credenciais localmente (ou passa para o pai)
      const credentials = {
        clientId,
        clientSecret,
        refreshToken,
        accessToken: data.access_token,
      };

      localStorage.setItem("gdrive_credentials", JSON.stringify(credentials));
      onConnected?.(credentials);

      setOpen(false);
      setClientId("");
      setClientSecret("");
      setRefreshToken("");
    } catch (err) {
      setError(`Erro na requisição: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        className="gap-2"
      >
        <LogIn className="w-4 h-4" />
        Conectar Google Drive
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conectar ao Google Drive</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="clientId">Client ID</Label>
              <Input
                id="clientId"
                placeholder="sua-client-id@..."
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="clientSecret">Client Secret</Label>
              <Input
                id="clientSecret"
                placeholder="sua-client-secret"
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="refreshToken">Refresh Token</Label>
              <Input
                id="refreshToken"
                placeholder="seu-refresh-token"
                type="password"
                value={refreshToken}
                onChange={(e) => setRefreshToken(e.target.value)}
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleConnect}
                disabled={!clientId || !clientSecret || !refreshToken || loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Autenticando...
                  </>
                ) : (
                  "Conectar"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}