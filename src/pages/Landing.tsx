import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { useTimetableStore } from "@/store/timetableStore";
import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDashed,
  Clock3,
  Command,
  Layers3,
  Moon,
  RadioTower,
  ScanLine,
  Waypoints,
  Sparkles,
  Sun,
  Users,
} from "lucide-react";

const days = ["MON", "TUE", "WED", "THU", "FRI"];
const blocks = [
  ["09:00", "Data Structures", "CS-201", "coral"],
  ["10:00", "Database Systems", "CS-301", "blue"],
  ["11:00", "Break", "Campus cafe", "muted"],
  ["12:00", "Computer Networks", "CS-204", "lime"],
];

const Landing = () => {
  const { isDarkMode, toggleDarkMode } = useTimetableStore();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateX = useSpring(useTransform(pointerY, [-500, 500], [4, -4]), { stiffness: 120, damping: 22 });
  const rotateY = useSpring(useTransform(pointerX, [-700, 700], [-6, 6]), { stiffness: 120, damping: 22 });

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    pointerX.set(event.clientX - rect.left - rect.width / 2);
    pointerY.set(event.clientY - rect.top - rect.height / 2);
  };

  const resetPointer = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <main className="landing-page" onPointerMove={handlePointerMove} onPointerLeave={resetPointer}>
      <div className="landing-grid" aria-hidden="true" />
      <svg className="landing-contours" viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <pattern id="micro-grid" width="42" height="42" patternUnits="userSpaceOnUse">
            <path d="M 42 0 L 0 0 0 42" fill="none" stroke="currentColor" strokeOpacity=".12" strokeWidth="1" />
          </pattern>
          <linearGradient id="contour-fade" x1="0" x2="1">
            <stop offset="0" stopColor="#ff725e" stopOpacity=".1" />
            <stop offset=".5" stopColor="#78d7ff" stopOpacity=".6" />
            <stop offset="1" stopColor="#c9f26d" stopOpacity=".08" />
          </linearGradient>
        </defs>
        <rect width="1440" height="900" fill="url(#micro-grid)" />
        <g fill="none" stroke="url(#contour-fade)" strokeWidth="1.4">
          <path d="M-100 700 C160 540 270 760 500 625 S940 270 1540 460" />
          <path d="M-120 755 C150 580 280 820 530 670 S980 320 1550 515" />
          <path d="M-90 810 C170 620 310 875 560 720 S1010 365 1530 565" />
          <path d="M510 -80 C690 120 780 130 925 30 S1240 -70 1510 150" />
          <path d="M570 -100 C730 95 820 180 970 75 S1270 -20 1530 205" />
        </g>
        <g fill="none" stroke="#78d7ff" strokeOpacity=".38">
          <circle cx="1130" cy="190" r="122" />
          <circle cx="1130" cy="190" r="160" strokeDasharray="2 10" />
          <circle cx="1130" cy="190" r="198" strokeDasharray="1 14" />
        </g>
      </svg>

      <nav className="landing-nav">
        <Link to="/" className="brand-lockup" aria-label="AttendEasy home">
          <span className="brand-mark"><Command size={18} /></span>
          <span>AttendEasy</span>
        </Link>
        <div className="nav-links">
          <a href="#product">Product</a>
          <a href="#workflow">Workflow</a>
          <a href="#features">Features</a>
        </div>
        <div className="nav-actions">
          <button className="icon-button landing-icon-button" onClick={toggleDarkMode} title="Toggle theme" aria-label="Toggle theme">
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <Link to="/login" className="nav-login">Sign in <ArrowUpRight size={15} /></Link>
        </div>
      </nav>

      <section id="product" className="landing-hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> Intelligent scheduling for modern campuses</div>
          <h1>Make every hour<br /><span>count.</span></h1>
          <p>AttendEasy turns complex college operations into a calm, conflict-free rhythm. Build timetables, manage attendance, and keep your campus moving.</p>
          <div className="hero-actions">
            <Link to="/login" className="primary-cta">Open workspace <ArrowUpRight size={17} /></Link>
            <a href="#workflow" className="secondary-cta">See how it works <ChevronRight size={16} /></a>
          </div>
          <div className="trust-row"><Check size={15} /> Built for HODs, faculty, and students <span /> <CircleDashed size={14} /> Live conflict checks</div>
        </div>

        <div className="hero-visual" onPointerMove={handlePointerMove} onPointerLeave={resetPointer}>
          <div className="visual-label label-top">WEEK / 04 <span>•</span> LIVE VIEW</div>
          <motion.div className="schedule-stage" style={{ rotateX, rotateY }}>
            <div className="stage-shadow" />
            <div className="schedule-window">
              <div className="window-bar"><div className="window-dots"><i /><i /><i /></div><span>workspace / timetable</span><span className="window-status"><span /> synced</span></div>
              <div className="schedule-head"><div><small>MONDAY, 14 OCTOBER</small><h2>Good morning, Admin</h2></div><div className="head-avatar">AD</div></div>
              <div className="schedule-meta"><span><Layers3 size={14} /> 3 semesters</span><span><Users size={14} /> 24 faculty</span><span className="meta-good"><Check size={14} /> 0 conflicts</span></div>
              <div className="timetable">
                <div className="timetable-days"><span />{days.map(day => <b key={day}>{day}</b>)}</div>
                {blocks.map(([time, subject, room, tone], index) => (
                  <div className="timetable-row" key={time}><time>{time}</time>{days.map((day, dayIndex) => (
                    <div className={`timetable-cell ${dayIndex === (index + 1) % 5 ? `cell-${tone}` : ""}`} key={day}>
                      {dayIndex === (index + 1) % 5 && <><strong>{subject}</strong><small>{room}</small></>}
                    </div>
                  ))}</div>
                ))}
              </div>
            </div>
            <motion.div className="floating-stat stat-one" animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}><span className="stat-icon stat-coral"><BarChart3 size={15} /></span><span><b>94.8%</b><small>attendance health</small></span></motion.div>
            <motion.div className="floating-stat stat-two" animate={{ y: [0, 7, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}><span className="stat-icon stat-lime"><Clock3 size={15} /></span><span><b>10× faster</b><small>than manual planning</small></span></motion.div>
          </motion.div>
          <div className="visual-label label-bottom">DRAG TO EXPLORE <span>↗</span></div>
        </div>
      </section>

      <section className="storyline" aria-label="How AttendEasy works">
        <div className="storyline-heading"><span className="section-kicker">THE ATTENDEASY METHOD</span><h2>One signal.<br /><span>Three movements.</span></h2><p>Watch the campus move from raw information to a living, shared rhythm.</p></div>
        <div className="storyline-track" aria-hidden="true"><span /></div>
        <div className="storyline-chapters">
          {[
            { number: "01", icon: ScanLine, label: "CAPTURE THE SIGNAL", title: "Everything enters one field.", text: "Faculty, rooms, subjects, and constraints arrive as one clear operational picture.", tone: "story-coral" },
            { number: "02", icon: Waypoints, label: "FIND THE RHYTHM", title: "Complexity becomes a sequence.", text: "The scheduling engine finds the right place for every lecture, preference, and room.", tone: "story-cyan" },
            { number: "03", icon: RadioTower, label: "BROADCAST THE DAY", title: "Everyone sees the same tempo.", text: "Publish a living timetable and keep every role aligned as the day changes.", tone: "story-lime" },
          ].map((chapter, index) => {
            const Icon = chapter.icon;
            return (
              <motion.article key={chapter.number} className={`story-chapter ${chapter.tone}`} initial={{ opacity: 0, y: 80, rotateX: 14, rotateY: index % 2 === 0 ? -5 : 5 }} whileInView={{ opacity: 1, y: 0, rotateX: 0, rotateY: 0 }} viewport={{ once: true, amount: .35 }} transition={{ duration: .8, delay: index * .08, ease: [0.2, 0.8, 0.2, 1] }}>
                <div className="story-chapter-art"><div className="story-orbit orbit-large" /><div className="story-orbit orbit-small" /><div className="story-node"><Icon size={22} /></div></div>
                <div className="story-chapter-copy"><span className="story-number">{chapter.number}</span><span className="story-label">{chapter.label}</span><h3>{chapter.title}</h3><p>{chapter.text}</p></div>
              </motion.article>
            );
          })}
        </div>
      </section>

      <section id="workflow" className="workflow-strip">
        <div className="workflow-intro"><span className="section-kicker">THE OPERATING SYSTEM</span><h2>From scattered data<br />to a shared tempo.</h2></div>
        <div className="workflow-steps">
          <div><span>01</span><Sparkles size={18} /><h3>Bring your data</h3><p>Import your existing college data or start clean.</p></div>
          <div><span>02</span><CalendarDays size={18} /><h3>Generate the rhythm</h3><p>Let the scheduling engine resolve the complexity.</p></div>
          <div><span>03</span><Layers3 size={18} /><h3>Keep everyone aligned</h3><p>One live workspace for every role on campus.</p></div>
        </div>
      </section>

      <section id="features" className="feature-band">
        <div><span className="section-kicker">BUILT TO SCALE</span><h2>Clarity at every layer.</h2></div>
        <div className="feature-list"><span>Conflict-aware scheduling</span><span>Role-based access</span><span>Excel-ready imports</span><span>Attendance in real time</span></div>
      </section>

      <footer className="landing-footer"><span className="brand-lockup"><span className="brand-mark"><Command size={15} /></span> AttendEasy</span><span>Smart campus operations, beautifully organized.</span><Link to="/login">Launch workspace <ArrowUpRight size={14} /></Link></footer>
    </main>
  );
};

export default Landing;
