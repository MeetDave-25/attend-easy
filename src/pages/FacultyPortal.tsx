import { useEffect, useMemo, useState } from "react";
import { Bell, CalendarDays, Clock3, LogOut, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notificationsForUser } from "@/lib/notifications";
import { authAPI } from "@/lib/api";
import { useTimetableStore } from "@/store/timetableStore";

const minutesFromTime = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

const FacultyPortal = () => {
  const { currentUser, setCurrentUser, faculty, subjects, classrooms, semesters, timetableEntries, notifications } = useTimetableStore();
  const [now, setNow] = useState(() => new Date());
  const today = now.toLocaleDateString("en-US", { weekday: "long" });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const facultyMember = faculty.find((member) => member.id === currentUser?.facultyId)
    || faculty.find((member) => member.email.toLowerCase() === currentUser?.email?.toLowerCase());
  const todayEntries = useMemo(() => timetableEntries
    .filter((entry) => entry.facultyId === facultyMember?.id && entry.day === today)
    .sort((left, right) => left.startTime.localeCompare(right.startTime)), [facultyMember?.id, timetableEntries, today]);
  const upcomingEntry = todayEntries.find((entry) => minutesFromTime(entry.endTime) >= now.getHours() * 60 + now.getMinutes());
  const updates = notificationsForUser(notifications, currentUser, now).slice(0, 4);

  const lectureDetails = (entry: typeof todayEntries[number]) => {
    const subject = subjects.find((item) => item.id === entry.subjectId);
    const room = classrooms.find((item) => item.id === entry.classroomId);
    const semester = semesters.find((item) => item.id === entry.semesterId);
    const division = semester?.divisions.find((item) => item.id === entry.divisionId);
    return { subject, room, semester, division };
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
      <section className="rounded-3xl bg-gradient-to-br from-primary to-violet-600 p-6 text-primary-foreground shadow-lg">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div><p className="text-sm text-white/75">{now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p><h1 className="mt-1 text-3xl font-bold">Hello, {facultyMember?.name || currentUser?.name || "Faculty"}</h1><p className="mt-2 text-sm text-white/80">Your live teaching schedule updates whenever the administrator changes the timetable.</p></div>
          <div className="rounded-2xl bg-white/15 px-5 py-4 text-center"><p className="text-3xl font-bold">{todayEntries.length}</p><p className="text-xs uppercase tracking-wide text-white/75">Classes today</p></div>
        </div>
      </section>

      {!facultyMember ? <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">Your login is not linked to a faculty record. Ask the HOD to use the same email address as your faculty profile.</div> : <>
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="mb-4 flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /><h2 className="font-bold">Today’s classes · {today}</h2></div>{todayEntries.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No classes assigned today.</p> : <div className="space-y-3">{todayEntries.map((entry) => { const detail = lectureDetails(entry); const currentMinutes = now.getHours() * 60 + now.getMinutes(); const isNow = minutesFromTime(entry.startTime) <= currentMinutes && currentMinutes < minutesFromTime(entry.endTime); return <div key={entry.id} className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center ${isNow ? "border-primary bg-primary/5" : "border-border"}`}><div className="min-w-28"><p className="font-bold">{entry.startTime}–{entry.endTime}</p>{isNow && <span className="text-xs font-semibold text-primary">LIVE NOW</span>}</div><div className="min-w-0 flex-1"><p className="font-semibold">{detail.subject?.name || "Subject"}</p><p className="text-sm text-muted-foreground">Year {detail.semester?.year || "—"} · Semester {detail.semester?.number || "—"} · Division {detail.division?.name || "—"}</p></div><p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />Room {detail.room?.roomNumber || "—"}</p></div>; })}</div>}</section>
        <section className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="mb-3 flex items-center gap-2"><Clock3 className="h-5 w-5 text-primary" /><h2 className="font-bold">Next class</h2></div>{upcomingEntry ? (() => { const detail = lectureDetails(upcomingEntry); return <><p className="font-semibold">{detail.subject?.name || "Subject"}</p><p className="mt-1 text-sm text-muted-foreground">{upcomingEntry.startTime} · Room {detail.room?.roomNumber || "—"}</p></>; })() : <p className="text-sm text-muted-foreground">No more classes today.</p>}</div><div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="mb-3 flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /><h2 className="font-bold">Updates</h2></div>{updates.length ? <div className="space-y-2">{updates.map((notification) => <div key={notification.id}><p className="text-sm font-semibold">{notification.title}</p><p className="text-xs text-muted-foreground">{notification.message}</p></div>)}</div> : <p className="text-sm text-muted-foreground">No new announcements.</p>}</div></section>
      </>}

      <Button variant="outline" onClick={() => { setCurrentUser(null); authAPI.logout(); }} className="w-full sm:w-auto"><LogOut className="mr-2 h-4 w-4" />Logout</Button>
    </div>
  );
};

export default FacultyPortal;
