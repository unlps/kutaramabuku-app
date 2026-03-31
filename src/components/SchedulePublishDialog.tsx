import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarClock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SchedulePublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ebookId: string;
  ebookTitle: string;
  onScheduled: () => void;
}

export const SchedulePublishDialog = ({
  open,
  onOpenChange,
  ebookId,
  ebookTitle,
  onScheduled,
}: SchedulePublishDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");

  const handleSchedule = async () => {
    if (!date || !time) {
      toast({
        title: "Data obrigatória",
        description: "Seleciona uma data e hora para o agendamento.",
        variant: "destructive",
      });
      return;
    }

    const scheduledAt = new Date(`${date}T${time}:00`);
    if (scheduledAt <= new Date()) {
      toast({
        title: "Data inválida",
        description: "A data e hora tem de ser no futuro.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("ebooks")
        .update({
          publication_status: "scheduled",
          scheduled_publish_at: scheduledAt.toISOString(),
        })
        .eq("id", ebookId);

      if (error) throw error;

      toast({
        title: "Publicação agendada",
        description: `"${ebookTitle}" será publicado em ${scheduledAt.toLocaleDateString("pt-PT")} às ${time}.`,
      });

      onScheduled();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao agendar",
        description: error.message || "Não foi possível agendar a publicação.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Set minimum date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Agendar Publicação
          </DialogTitle>
          <DialogDescription>
            Escolhe a data e hora em que o livro ficará disponível para todos.
            Até lá, aparecerá como "Brevemente".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-sm font-medium">{ebookTitle}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="schedule-date">Data</Label>
              <Input
                id="schedule-date"
                type="date"
                value={date}
                min={minDate}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule-time">Hora</Label>
              <Input
                id="schedule-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSchedule} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                A agendar...
              </>
            ) : (
              "Confirmar agendamento"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
