import { useMemo, useState } from "react";
import { Bell, CalendarClock, CheckCheck, Megaphone, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { notificationAudienceLabel, notificationsForUser } from "@/lib/notifications";
import { useTimetableStore } from "@/store/timetableStore";
import { UserRole } from "@/types";

const toLocalDateTimeValue = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const NotificationCenter = () => {
  const { currentUser, notifications, addNotification, markNotificationRead, markAllNotificationsRead } = useTimetableStore();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<UserRole | "all">("all");
  const [delivery, setDelivery] = useState<"now" | "scheduled">("now");
  const [scheduledFor, setScheduledFor] = useState(() => toLocalDateTimeValue(new Date(Date.now() + 15 * 60_000)));
  const isHod = currentUser?.role === "hod";

  const shownNotifications = useMemo(() => (
    isHod
      ? [...notifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      : notificationsForUser(notifications, currentUser)
  ), [currentUser, isHod, notifications]);

  const sendNotification = () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Enter a notification title and message.");
      return;
    }

    const schedule = delivery === "scheduled" ? new Date(scheduledFor) : null;
    if (schedule && (Number.isNaN(schedule.getTime()) || schedule.getTime() <= Date.now())) {
      toast.error("Choose a future date and time for the notification.");
      return;
    }

    addNotification({
      type: "system",
      title: title.trim(),
      message: message.trim(),
      forRole: audience,
      ...(schedule ? { scheduledFor: schedule.toISOString() } : {}),
    });
    setTitle("");
    setMessage("");
    toast.success(schedule ? "Notification scheduled for automatic delivery." : "Notification sent to the selected users.");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="section-title">Notifications</h2>
        <p className="section-subtitle">Timetable changes and college messages reach the right people automatically.</p>
      </div>

      {isHod && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-primary" /><h3 className="font-bold">Send college update</h3></div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title, for example: Tomorrow's lecture update" maxLength={255} />
            <select value={audience} onChange={(event) => setAudience(event.target.value as UserRole | "all")} className="h-10 rounded-xl border border-input bg-background px-3 text-sm">
              <option value="all">Everyone</option>
              <option value="student">Students only</option>
              <option value="faculty">Faculty only</option>
            </select>
          </div>
          <Textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write the information students and faculty need to know." />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-2"><input type="radio" checked={delivery === "now"} onChange={() => setDelivery("now")} /> Send now</label>
              <label className="flex items-center gap-2"><input type="radio" checked={delivery === "scheduled"} onChange={() => setDelivery("scheduled")} /> Send automatically later</label>
              {delivery === "scheduled" && <Input type="datetime-local" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} className="w-auto" />}
            </div>
            <Button onClick={sendNotification} className="gap-2"><Send className="h-4 w-4" />{delivery === "scheduled" ? "Schedule" : "Send notification"}</Button>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /><h3 className="font-bold">{isHod ? "All college notifications" : "Your updates"}</h3></div>
          <Button variant="ghost" size="sm" onClick={markAllNotificationsRead} className="gap-2"><CheckCheck className="h-4 w-4" />Mark all read</Button>
        </div>
        {shownNotifications.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No notifications yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {shownNotifications.map((notification) => {
              const isScheduled = notification.scheduledFor && new Date(notification.scheduledFor).getTime() > Date.now();
              return <button key={notification.id} onClick={() => markNotificationRead(notification.id)} className="w-full px-5 py-4 text-left hover:bg-muted/40 transition-colors">
                <div className="flex gap-3">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.isRead ? "bg-muted-foreground/35" : "bg-primary"}`} />
                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="font-semibold">{notification.title}</p>{isHod && <span className="text-xs text-muted-foreground">· {notificationAudienceLabel(notification.forRole)}</span>}{isScheduled && <span className="inline-flex items-center gap-1 text-xs text-amber-600"><CalendarClock className="h-3 w-3" />Scheduled</span>}</div><p className="mt-1 text-sm text-muted-foreground">{notification.message}</p><p className="mt-2 text-xs text-muted-foreground">{isScheduled ? `Will send ${new Date(notification.scheduledFor!).toLocaleString()}` : new Date(notification.createdAt).toLocaleString()}</p></div>
                </div>
              </button>;
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default NotificationCenter;
