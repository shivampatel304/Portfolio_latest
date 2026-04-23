import { useState, useEffect, useRef, useCallback } from "react";

// ─── Magnetic cursor dot ───
function useMouse() {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  useEffect(() => {
    const h = (e) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, []);
  return pos;
}

// ─── Intersection observer hook ───
function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

// ─── Smooth counter ───
function Counter({ end, duration = 2000, suffix = "" }) {
  const [val, setVal] = useState(0);
  const [ref, visible] = useInView(0.3);
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = end / (duration / 16);
    const id = setInterval(() => {
      start += step;
      if (start >= end) { setVal(end); clearInterval(id); }
      else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(id);
  }, [visible, end, duration]);
  return <span ref={ref}>{val}{suffix}</span>;
}

// ─── Particle canvas background ───
function ParticleField() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animId;
    let particles = [];
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 1.5 + 0.5,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(200,210,230,0.25)";
        ctx.fill();
      });
      // connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(160,180,220,${0.08 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />;
}

// ─── Animated section wrapper ───
function Section({ children, className = "", id, style = {} }) {
  const [ref, visible] = useInView(0.08);
  return (
    <section
      ref={ref}
      id={id}
      className={className}
      style={{
        ...style,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(50px)",
        transition: "opacity 0.8s cubic-bezier(.22,1,.36,1), transform 0.8s cubic-bezier(.22,1,.36,1)",
      }}
    >
      {children}
    </section>
  );
}

// ─── Glowing card component ───
function GlowCard({ children, style = {}, className = "" }) {
  const cardRef = useRef(null);
  const [glow, setGlow] = useState({ x: 50, y: 50 });

  const handleMove = (e) => {
    const rect = cardRef.current.getBoundingClientRect();
    setGlow({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <div
      ref={cardRef}
      className={`glow-card ${className}`}
      onMouseMove={handleMove}
      style={{
        ...style,
        "--gx": `${glow.x}%`,
        "--gy": `${glow.y}%`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Typing effect ───
function TypingText({ texts, speed = 80, pause = 2000 }) {
  const [display, setDisplay] = useState("");
  const [idx, setIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = texts[idx];
    let timeout;
    if (!deleting && charIdx < current.length) {
      timeout = setTimeout(() => setCharIdx(charIdx + 1), speed);
    } else if (!deleting && charIdx === current.length) {
      timeout = setTimeout(() => setDeleting(true), pause);
    } else if (deleting && charIdx > 0) {
      timeout = setTimeout(() => setCharIdx(charIdx - 1), speed / 2);
    } else if (deleting && charIdx === 0) {
      setDeleting(false);
      setIdx((idx + 1) % texts.length);
    }
    setDisplay(current.slice(0, charIdx));
    return () => clearTimeout(timeout);
  }, [charIdx, deleting, idx, texts, speed, pause]);

  return (
    <span className="typing-text">
      {display}
      <span className="cursor">|</span>
    </span>
  );
}

// ─── Skill tag with stagger animation ───
function SkillTag({ name, delay = 0 }) {
  const [ref, visible] = useInView(0.15);
  return (
    <span
      ref={ref}
      className="skill-tag-item"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(12px) scale(0.92)",
        transition: `all 0.45s cubic-bezier(.22,1,.36,1) ${delay}ms`,
      }}
    >
      {name}
    </span>
  );
}

// ─── Timeline item ───
function TimelineItem({ role, company, location, period, points, index }) {
  const [ref, visible] = useInView(0.15);
  const isLeft = index % 2 === 0;
  return (
    <div
      ref={ref}
      className={`timeline-item ${isLeft ? "tl-left" : "tl-right"}`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible
          ? "translateX(0)"
          : isLeft ? "translateX(-60px)" : "translateX(60px)",
        transition: `all 0.7s cubic-bezier(.22,1,.36,1) ${index * 150}ms`,
      }}
    >
      <div className="tl-dot" />
      <GlowCard className="tl-card">
        <div className="tl-header">
          <h3>{role}</h3>
          <span className="tl-company">{company}</span>
          <span className="tl-meta">{location} · {period}</span>
        </div>
        <ul>
          {points.map((p, i) => <li key={i}>{p}</li>)}
        </ul>
      </GlowCard>
    </div>
  );
}

// ─── Project card ───
function ProjectCard({ title, tech, points, index }) {
  const [ref, visible] = useInView(0.15);
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) rotateX(0)" : "translateY(40px) rotateX(8deg)",
        transition: `all 0.7s cubic-bezier(.22,1,.36,1) ${index * 200}ms`,
      }}
    >
      <GlowCard className="project-card">
        <div className="project-number">0{index + 1}</div>
        <h3>{title}</h3>
        <div className="project-tech">
          {tech.map((t, i) => <span key={i} className="tech-tag">{t}</span>)}
        </div>
        <ul>
          {points.map((p, i) => <li key={i}>{p}</li>)}
        </ul>
      </GlowCard>
    </div>
  );
}

// ═══════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════
export default function Portfolio() {
  const mouse = useMouse();
  const [scrollY, setScrollY] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");

  useEffect(() => {
    const h = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  // Active section tracker
  useEffect(() => {
    const sections = ["hero", "about", "experience", "skills", "projects", "contact"];
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActiveSection(e.target.id);
        });
      },
      { threshold: 0.3 }
    );
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  const navLinks = [
    { id: "about", label: "About" },
    { id: "experience", label: "Experience" },
    { id: "skills", label: "Skills" },
    { id: "projects", label: "Projects" },
    { id: "contact", label: "Contact" },
  ];

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  const experience = [
    {
      role: "Full-Stack Developer",
      company: "Azzera Inc",
      location: "Montreal, QC",
      period: "May 2024 — Present",
      points: [
        "Architected MCP server orchestrating multi-agent AI workflows, improving processing accuracy by 35% and reducing analysis time by 40%.",
        "Built extensible multi-agent RAG architecture serving 10K+ document processing requests monthly.",
        "Automated deployment pipelines using GitHub Actions and Docker for seamless CI/CD.",
        "Refactored system architecture to enhance scalability and reliability under heavy load.",
      ],
    },
    {
      role: "Software Developer",
      company: "OxAgile Inc",
      location: "Toronto, ON",
      period: "Jan 2023 — Apr 2024",
      points: [
        "Engineered responsive React.js interfaces with TypeScript and Redux, boosting user engagement.",
        "Designed RESTful APIs with Node.js handling 500K+ monthly requests with high availability.",
        "Implemented real-time features via WebSockets for 1,000+ concurrent users with sub-100ms latency.",
        "Applied modern React patterns and code-splitting, significantly reducing bundle size.",
      ],
    },
    {
      role: "Software Engineer Intern",
      company: "TD Bank",
      location: "Toronto, ON",
      period: "May 2023 — Aug 2023",
      points: [
        "Spearheaded critical API development using Java, Spring Boot, and Maven.",
        "Crafted responsive user interfaces enhancing user experience across banking products.",
        "Orchestrated CI/CD pipeline implementation, significantly reducing deployment time.",
      ],
    },
  ];

  const projects = [
    {
      title: "Collaborative Code Editor Platform",
      tech: ["React.js", "Spring Boot", "Docker", "Kubernetes", "WebSocket"],
      points: [
        "Built scalable collaborative coding platform supporting 100+ concurrent users with real-time sync via WebSockets and Operational Transform.",
        "Containerized with Docker and orchestrated with Kubernetes for high uptime and seamless horizontal scaling.",
      ],
    },
    {
      title: "Distributed Movie Ticket Booking System",
      tech: ["Java RMI", "UDP", "Distributed Systems", "Fault Tolerance"],
      points: [
        "Led development of a highly available distributed ticket booking system with fault-tolerant architecture.",
        "Implemented UDP communication protocols and fault-tolerant strategies achieving significant downtime reduction.",
      ],
    },
    {
      title: "A.I.ducation Analytics",
      tech: ["PyTorch", "CNNs", "TensorFlow", "OpenCV", "Deep Learning"],
      points: [
        "Developed CNN-based facial expression recognition model achieving 77% accuracy across 5 emotional states.",
        "Implemented bias analysis and model refinement, improving fairness across diverse populations.",
      ],
    },
  ];

  const skillCategories = [
    {
      category: "AI / ML Engineering",
      icon: "⚡",
      description: "Building intelligent systems and AI-powered products",
      skills: ["LLM Integration", "RAG Pipelines", "Multi-Agent Systems", "NLP Workflows", "Generative AI", "Prompt Engineering", "Vector Databases", "Model Context Protocol", "AI Fine-tuning"],
    },
    {
      category: "Languages & Frameworks",
      icon: "◆",
      description: "Core technologies for full-stack development",
      skills: ["JavaScript", "TypeScript", "Python", "Java", "C++", "React.js", "Next.js", "Node.js", "Express.js", "Redux", "Angular", "Spring Boot"],
    },
    {
      category: "Cloud & DevOps",
      icon: "☁",
      description: "Infrastructure, deployment, and scalability",
      skills: ["AWS EC2", "AWS Lambda", "AWS S3", "AWS Bedrock", "Docker", "Kubernetes", "Jenkins", "GitHub Actions", "CI/CD Pipelines", "Microservices"],
    },
    {
      category: "Databases & Tools",
      icon: "◇",
      description: "Data storage, caching, and developer tooling",
      skills: ["PostgreSQL", "MySQL", "MongoDB", "Redis", "DynamoDB", "Pinecone", "Weaviate", "GraphQL", "WebSockets", "Git"],
    },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');

        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }

        :root {
          --bg: #0a0e17;
          --bg2: #0f1420;
          --surface: #151b2d;
          --surface2: #1a2138;
          --border: rgba(100,130,200,0.12);
          --text: #e4e8f1;
          --text2: #8892a8;
          --accent: #4f8eff;
          --accent2: #7c5cff;
          --accent3: #00d4aa;
          --glow: rgba(79,142,255,0.15);
          --glow2: rgba(124,92,255,0.12);
          --font: 'Outfit', sans-serif;
          --mono: 'JetBrains Mono', monospace;
        }

        html { scroll-behavior: smooth; }

        body {
          background: var(--bg);
          color: var(--text);
          font-family: var(--font);
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }

        /* ─── Custom cursor ─── */
        .cursor-dot {
          position: fixed;
          width: 8px;
          height: 8px;
          background: var(--accent);
          border-radius: 50%;
          pointer-events: none;
          z-index: 9999;
          mix-blend-mode: screen;
          transition: transform 0.15s ease;
          box-shadow: 0 0 20px var(--accent), 0 0 60px rgba(79,142,255,0.3);
        }

        .cursor-ring {
          position: fixed;
          width: 36px;
          height: 36px;
          border: 1.5px solid rgba(79,142,255,0.3);
          border-radius: 50%;
          pointer-events: none;
          z-index: 9998;
          transition: transform 0.3s cubic-bezier(.22,1,.36,1), width 0.3s, height 0.3s;
        }

        /* ─── Navigation ─── */
        nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          padding: 1rem 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: all 0.4s;
        }

        nav.scrolled {
          background: rgba(10,14,23,0.85);
          backdrop-filter: blur(20px) saturate(1.5);
          border-bottom: 1px solid var(--border);
          padding: 0.75rem 2rem;
        }

        .logo {
          font-family: var(--mono);
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--accent);
          letter-spacing: -0.5px;
          cursor: pointer;
        }

        .logo span { color: var(--text2); }

        .nav-links {
          display: flex;
          gap: 2rem;
          list-style: none;
        }

        .nav-links a {
          color: var(--text2);
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 500;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          cursor: pointer;
          transition: color 0.3s;
          position: relative;
        }

        .nav-links a::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 0;
          width: 0;
          height: 2px;
          background: linear-gradient(90deg, var(--accent), var(--accent2));
          transition: width 0.3s;
          border-radius: 2px;
        }

        .nav-links a:hover, .nav-links a.active { color: var(--text); }
        .nav-links a:hover::after, .nav-links a.active::after { width: 100%; }

        .nav-cta {
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          color: #fff !important;
          padding: 0.5rem 1.2rem;
          border-radius: 8px;
          font-weight: 600;
          text-transform: none !important;
          letter-spacing: 0 !important;
          font-size: 0.85rem !important;
        }

        .nav-cta::after { display: none !important; }
        .nav-cta:hover { opacity: 0.9; }

        /* Mobile menu */
        .hamburger {
          display: none;
          flex-direction: column;
          gap: 5px;
          cursor: pointer;
          z-index: 101;
          background: none;
          border: none;
          padding: 4px;
        }

        .hamburger span {
          display: block;
          width: 24px;
          height: 2px;
          background: var(--text);
          transition: all 0.3s;
          border-radius: 2px;
        }

        .hamburger.open span:nth-child(1) { transform: rotate(45deg) translate(5px, 5px); }
        .hamburger.open span:nth-child(2) { opacity: 0; }
        .hamburger.open span:nth-child(3) { transform: rotate(-45deg) translate(5px, -5px); }

        @media (max-width: 768px) {
          .hamburger { display: flex; }
          .nav-links {
            position: fixed;
            inset: 0;
            background: rgba(10,14,23,0.97);
            backdrop-filter: blur(30px);
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 2.5rem;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.4s;
          }
          .nav-links.open { opacity: 1; pointer-events: all; }
          .nav-links a { font-size: 1.3rem; }
        }

        /* ─── Hero ─── */
        .hero {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          padding: 6rem 2rem 4rem;
          position: relative;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 1rem;
          border-radius: 50px;
          border: 1px solid var(--border);
          background: var(--surface);
          font-size: 0.8rem;
          color: var(--text2);
          margin-bottom: 2rem;
          animation: fadeSlideUp 0.8s ease both;
        }

        .hero-badge .dot {
          width: 6px; height: 6px;
          background: var(--accent3);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .hero h1 {
          font-size: clamp(3rem, 8vw, 6.5rem);
          font-weight: 900;
          line-height: 1.05;
          letter-spacing: -3px;
          margin-bottom: 1.5rem;
          animation: fadeSlideUp 0.8s ease 0.15s both;
        }

        .hero h1 .gradient-text {
          background: linear-gradient(135deg, var(--accent) 0%, var(--accent2) 50%, var(--accent3) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-sub {
          font-size: clamp(1rem, 2.5vw, 1.35rem);
          color: var(--text2);
          max-width: 600px;
          line-height: 1.7;
          margin-bottom: 1rem;
          animation: fadeSlideUp 0.8s ease 0.3s both;
          font-weight: 300;
        }

        .typing-text {
          font-family: var(--mono);
          color: var(--accent);
          font-size: clamp(0.9rem, 2vw, 1.1rem);
          font-weight: 500;
        }

        .cursor {
          animation: blink 0.8s infinite;
          color: var(--accent);
        }

        .hero-buttons {
          display: flex;
          gap: 1rem;
          margin-top: 2.5rem;
          animation: fadeSlideUp 0.8s ease 0.5s both;
          flex-wrap: wrap;
          justify-content: center;
        }

        .btn-primary {
          padding: 0.85rem 2rem;
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          color: #fff;
          border: none;
          border-radius: 12px;
          font-family: var(--font);
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(79,142,255,0.3);
        }

        .btn-outline {
          padding: 0.85rem 2rem;
          background: transparent;
          color: var(--text);
          border: 1.5px solid var(--border);
          border-radius: 12px;
          font-family: var(--font);
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-outline:hover {
          border-color: var(--accent);
          background: rgba(79,142,255,0.05);
          transform: translateY(-2px);
        }

        .scroll-indicator {
          position: absolute;
          bottom: 2rem;
          left: 50%;
          transform: translateX(-50%);
          animation: float 3s ease-in-out infinite;
        }

        .scroll-indicator svg { width: 24px; height: 24px; stroke: var(--text2); }

        /* ─── Section headings ─── */
        .section-tag {
          font-family: var(--mono);
          font-size: 0.75rem;
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 3px;
          margin-bottom: 0.75rem;
          display: block;
        }

        .section-title {
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 800;
          letter-spacing: -1.5px;
          margin-bottom: 1rem;
        }

        .section-desc {
          color: var(--text2);
          font-size: 1.05rem;
          max-width: 550px;
          line-height: 1.7;
          font-weight: 300;
        }

        /* ─── About ─── */
        .about-section { padding: 6rem 2rem; max-width: 1100px; margin: 0 auto; }

        .about-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          margin-top: 3rem;
          align-items: start;
        }

        .about-text p {
          color: var(--text2);
          line-height: 1.8;
          font-size: 1rem;
          margin-bottom: 1.25rem;
          font-weight: 300;
        }

        .stat-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
        }

        .stat-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 1.5rem;
          text-align: center;
          transition: all 0.3s;
        }

        .stat-card:hover {
          border-color: var(--accent);
          transform: translateY(-4px);
          box-shadow: 0 8px 30px var(--glow);
        }

        .stat-number {
          font-size: 2.2rem;
          font-weight: 800;
          background: linear-gradient(135deg, var(--accent), var(--accent3));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          display: block;
        }

        .stat-label {
          color: var(--text2);
          font-size: 0.8rem;
          margin-top: 0.3rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        @media (max-width: 768px) {
          .about-grid { grid-template-columns: 1fr; gap: 2rem; }
        }

        /* ─── Experience timeline ─── */
        .exp-section {
          padding: 6rem 2rem;
          max-width: 1000px;
          margin: 0 auto;
        }

        .timeline {
          position: relative;
          margin-top: 3rem;
        }

        .timeline::before {
          content: '';
          position: absolute;
          left: 50%;
          top: 0;
          bottom: 0;
          width: 2px;
          background: linear-gradient(180deg, var(--accent), var(--accent2), transparent);
          transform: translateX(-50%);
        }

        .timeline-item {
          position: relative;
          width: 50%;
          padding: 1rem 2rem;
          margin-bottom: 2rem;
        }

        .tl-left { left: 0; padding-right: 3rem; text-align: right; }
        .tl-right { left: 50%; padding-left: 3rem; }

        .tl-dot {
          position: absolute;
          top: 1.5rem;
          width: 14px;
          height: 14px;
          background: var(--accent);
          border: 3px solid var(--bg);
          border-radius: 50%;
          z-index: 2;
          box-shadow: 0 0 20px var(--glow);
        }

        .tl-left .tl-dot { right: -7px; }
        .tl-right .tl-dot { left: -7px; }

        .tl-card {
          text-align: left;
        }

        .tl-header h3 {
          font-size: 1.15rem;
          font-weight: 700;
          margin-bottom: 0.2rem;
        }

        .tl-company {
          color: var(--accent);
          font-weight: 600;
          font-size: 0.95rem;
          display: block;
          margin-bottom: 0.2rem;
        }

        .tl-meta {
          color: var(--text2);
          font-size: 0.8rem;
          font-family: var(--mono);
          display: block;
          margin-bottom: 0.75rem;
        }

        .tl-card ul {
          list-style: none;
          padding: 0;
        }

        .tl-card li {
          color: var(--text2);
          font-size: 0.88rem;
          line-height: 1.65;
          padding-left: 1rem;
          position: relative;
          margin-bottom: 0.4rem;
          font-weight: 300;
        }

        .tl-card li::before {
          content: '▹';
          color: var(--accent);
          position: absolute;
          left: 0;
        }

        @media (max-width: 768px) {
          .timeline::before { left: 20px; }
          .timeline-item { width: 100%; left: 0 !important; padding-left: 3rem !important; padding-right: 0 !important; text-align: left !important; }
          .tl-dot { left: 13px !important; right: auto !important; }
        }

        /* ─── Glow Card ─── */
        .glow-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 1.5rem;
          position: relative;
          overflow: hidden;
          transition: border-color 0.3s, box-shadow 0.3s;
        }

        .glow-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at var(--gx) var(--gy), var(--glow) 0%, transparent 60%);
          opacity: 0;
          transition: opacity 0.4s;
          pointer-events: none;
        }

        .glow-card:hover::before { opacity: 1; }
        .glow-card:hover { border-color: rgba(79,142,255,0.25); }

        /* ─── Skills ─── */
        .skills-section {
          padding: 6rem 2rem;
          max-width: 1100px;
          margin: 0 auto;
        }

        .skills-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-top: 3rem;
        }

        .skill-category-card {
          position: relative;
          overflow: hidden;
        }

        .skill-cat-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.4rem;
        }

        .skill-cat-icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(79,142,255,0.12), rgba(124,92,255,0.12));
          border-radius: 10px;
          font-size: 1rem;
          flex-shrink: 0;
        }

        .skill-cat-header h3 {
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: -0.3px;
        }

        .skill-cat-desc {
          font-size: 0.78rem;
          color: var(--text2);
          margin-bottom: 1rem;
          font-weight: 300;
          line-height: 1.5;
        }

        .skill-tags-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
        }

        .skill-tag-item {
          font-family: var(--mono);
          font-size: 0.72rem;
          padding: 0.3rem 0.7rem;
          background: rgba(79,142,255,0.06);
          color: var(--text);
          border-radius: 8px;
          border: 1px solid var(--border);
          transition: all 0.3s ease;
          cursor: default;
          letter-spacing: 0.2px;
        }

        .skill-tag-item:hover {
          border-color: var(--accent);
          background: rgba(79,142,255,0.12);
          color: var(--accent);
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(79,142,255,0.1);
        }

        @media (max-width: 768px) {
          .skills-grid { grid-template-columns: 1fr; }
        }

        /* ─── Projects ─── */
        .projects-section {
          padding: 6rem 2rem;
          max-width: 1100px;
          margin: 0 auto;
        }

        .projects-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 1.5rem;
          margin-top: 3rem;
        }

        .project-card { position: relative; }

        .project-number {
          font-family: var(--mono);
          font-size: 3.5rem;
          font-weight: 800;
          color: rgba(79,142,255,0.07);
          position: absolute;
          top: 0.5rem;
          right: 1rem;
          line-height: 1;
        }

        .project-card h3 {
          font-size: 1.15rem;
          font-weight: 700;
          margin-bottom: 0.75rem;
          padding-right: 3rem;
        }

        .project-tech {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          margin-bottom: 1rem;
        }

        .tech-tag {
          font-family: var(--mono);
          font-size: 0.7rem;
          padding: 0.25rem 0.6rem;
          background: rgba(79,142,255,0.08);
          color: var(--accent);
          border-radius: 6px;
          border: 1px solid rgba(79,142,255,0.15);
        }

        .project-card ul {
          list-style: none;
          padding: 0;
        }

        .project-card li {
          color: var(--text2);
          font-size: 0.88rem;
          line-height: 1.65;
          padding-left: 1rem;
          position: relative;
          margin-bottom: 0.3rem;
          font-weight: 300;
        }

        .project-card li::before {
          content: '▹';
          color: var(--accent3);
          position: absolute;
          left: 0;
        }

        /* ─── Contact ─── */
        .contact-section {
          padding: 6rem 2rem 8rem;
          max-width: 700px;
          margin: 0 auto;
          text-align: center;
        }

        .contact-links {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-top: 2.5rem;
          flex-wrap: wrap;
        }

        .contact-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: 1px solid var(--border);
          border-radius: 12px;
          color: var(--text);
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.3s;
          background: var(--surface);
        }

        .contact-link:hover {
          border-color: var(--accent);
          transform: translateY(-3px);
          box-shadow: 0 8px 25px var(--glow);
        }

        .contact-link svg {
          width: 18px;
          height: 18px;
          stroke: var(--accent);
        }

        /* ─── Footer ─── */
        footer {
          padding: 2rem;
          text-align: center;
          font-size: 0.8rem;
          color: var(--text2);
          border-top: 1px solid var(--border);
          font-family: var(--mono);
        }

        /* ─── Animations ─── */
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.5); }
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        @keyframes float {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-10px); }
        }

        /* ─── Gradient line separator ─── */
        .gradient-line {
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--accent), var(--accent2), transparent);
          max-width: 300px;
          margin: 0 auto 2rem;
          opacity: 0.4;
        }

        /* ─── Education ─── */
        .edu-row {
          display: flex;
          gap: 1.5rem;
          margin-top: 2rem;
          flex-wrap: wrap;
        }

        .edu-card {
          flex: 1;
          min-width: 250px;
        }

        .edu-card h4 {
          font-size: 0.95rem;
          font-weight: 600;
          margin-bottom: 0.2rem;
        }

        .edu-card p {
          font-size: 0.82rem;
          color: var(--text2);
          font-family: var(--mono);
        }
      `}</style>

      <ParticleField />

      {/* Cursor */}
      <div className="cursor-dot" style={{ left: mouse.x - 4, top: mouse.y - 4 }} />
      <div className="cursor-ring" style={{ left: mouse.x - 18, top: mouse.y - 18 }} />

      {/* Navigation */}
      <nav className={scrollY > 60 ? "scrolled" : ""}>
        <div className="logo" onClick={() => scrollTo("hero")}>
          {"<"}SP<span>{" />"}</span>
        </div>
        <button className={`hamburger ${menuOpen ? "open" : ""}`} onClick={() => setMenuOpen(!menuOpen)}>
          <span /><span /><span />
        </button>
        <ul className={`nav-links ${menuOpen ? "open" : ""}`}>
          {navLinks.map((l) => (
            <li key={l.id}>
              <a
                className={activeSection === l.id ? "active" : ""}
                onClick={() => scrollTo(l.id)}
              >
                {l.label}
              </a>
            </li>
          ))}
          <li>
            <a className="nav-cta" href="mailto:shivampatel0304@gmail.com">Let's Talk</a>
          </li>
        </ul>
      </nav>

      {/* Hero */}
      <section className="hero" id="hero">
        <div className="hero-badge">
          <span className="dot" />
          Available for opportunities
        </div>
        <h1>
          Crafted by<br />
          <span className="gradient-text">Shivam Patel</span>
        </h1>
        <p className="hero-sub">
          Full-Stack Engineer & AI Builder — crafting intelligent systems<br />
          and seamless digital experiences.
        </p>
        <div style={{ minHeight: "1.5rem", marginTop: "0.5rem", animation: "fadeSlideUp 0.8s ease 0.4s both" }}>
          <TypingText
            texts={[
              "Building multi-agent AI systems",
              "Architecting scalable microservices",
              "Crafting beautiful user interfaces",
              "Deploying cloud-native solutions",
            ]}
          />
        </div>
        <div className="hero-buttons">
          <a className="btn-primary" href="#experience" onClick={(e) => { e.preventDefault(); scrollTo("experience"); }}>
            View My Work
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
          <a className="btn-outline" href="mailto:shivampatel0304@gmail.com">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            Get in Touch
          </a>
        </div>
        <div className="scroll-indicator">
          <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
        </div>
      </section>

      {/* About */}
      <Section id="about" className="about-section">
        <span className="section-tag">{/*// About Me*/}</span>
        <h2 className="section-title">Engineer. Builder. Problem Solver.</h2>
        <div className="about-grid">
          <div className="about-text">
            <p>
              I'm a Full-Stack Software Engineer with 3+ years of experience building scalable, production-grade applications and distributed systems. Currently based in Toronto, I specialize in developing and integrating AI-driven features into real-world products.
            </p>
            <p>
              My expertise spans from architecting multi-agent AI workflows and RAG pipelines to building high-performance React interfaces and cloud-native microservices. I thrive at the intersection of AI engineering and full-stack development — turning complex technical challenges into elegant, reliable solutions.
            </p>
            <p>
              I hold a Master of Applied Computer Science from Concordia University and a Bachelor of Engineering from Gujarat Technological University.
            </p>
          </div>
          <div className="stat-grid">
            <div className="stat-card">
              <span className="stat-number"><Counter end={3} suffix="+" /></span>
              <span className="stat-label">Years Experience</span>
            </div>
            <div className="stat-card">
              <span className="stat-number"><Counter end={500} suffix="K+" /></span>
              <span className="stat-label">API Req / Month</span>
            </div>
            <div className="stat-card">
              <span className="stat-number"><Counter end={10} suffix="K+" /></span>
              <span className="stat-label">Docs Processed</span>
            </div>
            <div className="stat-card">
              <span className="stat-number"><Counter end={35} suffix="%" /></span>
              <span className="stat-label">Accuracy Boost</span>
            </div>
          </div>
        </div>

        <div className="edu-row">
          <GlowCard className="edu-card">
            <h4>M.Sc. Applied Computer Science</h4>
            <p>Concordia University · 2022 – 2024</p>
          </GlowCard>
          <GlowCard className="edu-card">
            <h4>B.Eng. Engineering</h4>
            <p>Gujarat Technological University · 2018 – 2022</p>
          </GlowCard>
        </div>
      </Section>

      {/* Experience */}
      <Section id="experience" className="exp-section">
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <span className="section-tag">{/*// Experience */}</span>
          <h2 className="section-title">Where I've Built Things</h2>
          <p className="section-desc" style={{ margin: "0 auto" }}>
            From AI-powered document analysis to real-time collaborative platforms and banking systems.
          </p>
        </div>
        <div className="timeline">
          {experience.map((exp, i) => (
            <TimelineItem key={i} index={i} {...exp} />
          ))}
        </div>
      </Section>

      {/* Skills */}
      <Section id="skills" className="skills-section">
        <span className="section-tag">// Tech Stack</span>
        <h2 className="section-title">Tools of the Trade</h2>
        <p className="section-desc">Technologies I work with daily to build intelligent, scalable systems.</p>
        <div className="skills-grid">
          {skillCategories.map((cat, ci) => (
            <GlowCard key={ci} className="skill-category-card">
              <div className="skill-cat-header">
                <div className="skill-cat-icon">{cat.icon}</div>
                <h3>{cat.category}</h3>
              </div>
              <p className="skill-cat-desc">{cat.description}</p>
              <div className="skill-tags-wrap">
                {cat.skills.map((s, si) => (
                  <SkillTag key={si} name={s} delay={si * 50 + ci * 80} />
                ))}
              </div>
            </GlowCard>
          ))}
        </div>
      </Section>

      {/* Projects */}
      <Section id="projects" className="projects-section">
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <span className="section-tag">{/*// Projects*/}</span>
          <h2 className="section-title">Featured Work</h2>
          <p className="section-desc" style={{ margin: "0 auto" }}>
            Side projects and explorations that push boundaries.
          </p>
        </div>
        <div className="projects-grid">
          {projects.map((p, i) => (
            <ProjectCard key={i} index={i} {...p} />
          ))}
        </div>
      </Section>

      {/* Contact */}
      <Section id="contact" className="contact-section">
        <div className="gradient-line" />
        <span className="section-tag">{/*// Get in Touch*/}</span>
        <h2 className="section-title">Let's Build Something<br />Together</h2>
        <p className="section-desc" style={{ margin: "0 auto" }}>
          Whether you need a full-stack engineer, AI integration expertise, or want to discuss a project — I'd love to hear from you.
        </p>
        <div className="contact-links">
          <a className="contact-link" href="mailto:shivampatel0304@gmail.com">
            <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            shivampatel0304@gmail.com
          </a>
          <a className="contact-link" href="https://github.com/Shivampatel304" target="_blank" rel="noopener noreferrer">
            <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
            GitHub
          </a>
          <a className="contact-link" href="https://linkedin.com/in/shivampatel0304" target="_blank" rel="noopener noreferrer">
            <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
            LinkedIn
          </a>
          <a className="contact-link" href="tel:4383046898">
            <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            (438) 304-6898
          </a>
        </div>
      </Section>

      {/* Footer */}
      <footer>
        <p>Crafted by Shivam Patel · {new Date().getFullYear()} · craftedbyshivam.com</p>
      </footer>
    </>
  );
}