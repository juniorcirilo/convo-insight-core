import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Clock, LogOut } from "lucide-react";

export default function PendingApproval() {
  const { signOut, profile } = useAuth();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center">
            <Clock className="w-8 h-8 text-warning" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl">Aguardando Aprovação</CardTitle>
            <CardDescription className="text-base">
              Sua conta foi criada com sucesso
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4 text-center">
            <p className="text-muted-foreground">
              Olá <strong>{profile?.full_name}</strong>, sua conta está aguardando aprovação de um administrador.
            </p>
            <p className="text-sm text-muted-foreground">
              Você receberá acesso ao sistema assim que um administrador aprovar sua conta. Isso pode levar alguns minutos ou horas dependendo da disponibilidade da equipe.
            </p>
          </div>

          <div className="pt-4 border-t">
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={signOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Fazer Logout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
