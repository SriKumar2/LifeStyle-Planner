// First-run content. Everything here can be edited or deleted inside the app.

export const DEFAULT_SETTINGS = {
  name: "lovely",
  timezone: "Asia/Kolkata",
  geminiModel: "auto",
  calendars: [
    {
      id: "holidays-in",
      name: "Indian holidays",
      url: "https://calendar.google.com/calendar/ical/en.indian%23holiday%40group.v.calendar.google.com/public/basic.ics",
      color: "mint",
      holiday: true,
    },
  ],
  newsFeeds: [
    { id: "pib", section: "ca", name: "PIB", url: "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3" },
    { id: "hindu", section: "ca", name: "The Hindu", url: "https://www.thehindu.com/news/national/feeder/default.rss" },
    { id: "ie-upsc", section: "ca", name: "Indian Express · UPSC", url: "https://indianexpress.com/section/upsc-current-affairs/feed/" },
    { id: "ie-explained", section: "ca", name: "Indian Express · Explained", url: "https://indianexpress.com/section/explained/feed/" },
    { id: "drishti", section: "ca", name: "Drishti IAS", url: "https://news.google.com/rss/search?q=site:drishtiias.com&hl=en-IN&gl=IN&ceid=IN:en" },
    { id: "barandbench", section: "legal", name: "Bar & Bench", url: "https://news.google.com/rss/search?q=site:barandbench.com&hl=en-IN&gl=IN&ceid=IN:en" },
    { id: "livelaw", section: "legal", name: "LiveLaw", url: "https://news.google.com/rss/search?q=site:livelaw.in&hl=en-IN&gl=IN&ceid=IN:en" },
    { id: "scc", section: "legal", name: "SCC Online", url: "https://news.google.com/rss/search?q=site:scconline.com&hl=en-IN&gl=IN&ceid=IN:en" },
  ],
  projects: [
    { id: "soft", name: "Soft Living", color: "mint", icon: "leaf", rooms: ["library", "workouts"] },
    { id: "study", name: "Study Desk", color: "ice", icon: "book", rooms: ["syllabus", "ili", "studylog"] },
    { id: "growth", name: "Growth Lab", color: "periwinkle", icon: "cap", rooms: ["certs", "ideas"] },
  ],
  customRooms: [],
};

export const DEFAULT_HABITS = [
  { name: "Water", color: "sky" },
  { name: "Move", color: "sage" },
  { name: "Read 10 pages", color: "periwinkle" },
  { name: "Meditate", color: "mint" },
  { name: "Sleep 8 h", color: "powder" },
  { name: "Journal", color: "teal" },
];

// Free or low-cost law certifications, checked November 2026. Prices and availability can change.
export const SEED_CERTIFICATIONS = [
  { title: "DL-101 General Course on Intellectual Property", provider: "WIPO Academy", area: "Intellectual property", cost: "Free", status: "Wishlist", progress: 0, link: "https://welc.wipo.int/acc/index.jsf?lang=en&page=courseCatalog.xhtml", notes: "Free. Electronic certificate if you pass the final exam. Runs in sessions, so check registration dates." },
  { title: "Certificate Course on DPDPA", provider: "dpdpa.com · Adv. (Dr.) Prashant Mali", area: "Privacy & data protection", cost: "Free", status: "Wishlist", progress: 0, link: "https://www.dpdpa.com/dpdpa-certificate-course.html", notes: "6 modules on the DPDP Act 2023 and Rules 2025. 90-question exam, 85% to pass, free certificate." },
  { title: "Free DPDP Act Course", provider: "Simplilearn SkillUp", area: "Privacy & data protection", cost: "Free", status: "Wishlist", progress: 0, link: "https://www.simplilearn.com/free-dpdp-act-course-skillup", notes: "Beginner-friendly. Free completion certificate." },
  { title: "Data Privacy Fundamentals", provider: "Northeastern University (Coursera)", area: "Privacy & data protection", cost: "Free to learn, paid certificate", status: "Wishlist", progress: 0, link: "https://law.northeastern.edu/admissions/non-lawyers/data-privacy-fundamentals", notes: "Free to audit; certificate $49 or free with Coursera Financial Aid. Counts for 13 IAPP CPE credits." },
  { title: "Introduction to Anti-Corruption", provider: "UNODC e-learning", area: "Compliance", cost: "Free", status: "Wishlist", progress: 0, link: "https://www.unodc.org/corruption/en/learn/e-learning-courses.html", notes: "Free, 60 to 90 minutes. Check the course page for a completion certificate." },
  { title: "Contract Law: From Trust to Promise to Contract", provider: "HarvardX (edX)", area: "Contract law", cost: "Free to learn, paid certificate", status: "Wishlist", progress: 0, link: "https://www.edx.org/search?q=contract%20law", notes: "Free to audit; verified certificate is paid." },
  { title: "Corporate & commercial law course (pick one)", provider: "Coursera", area: "Corporate law", cost: "Free to learn, paid certificate", status: "Wishlist", progress: 0, link: "https://www.coursera.org/search?query=corporate%20law", notes: "Apply for Financial Aid to get the certificate free." },
  { title: "NPTEL / SWAYAM law & IPR courses", provider: "SWAYAM · NPTEL", area: "Intellectual property", cost: "Free to learn, paid certificate", status: "Wishlist", progress: 0, link: "https://swayam.gov.in", notes: "Free to study; a small exam fee gets you a certificate." },
  { title: "CIPP/E", provider: "IAPP", area: "Privacy & data protection", cost: "Paid", status: "Wishlist", progress: 0, link: "https://iapp.org/certify/cippe/", notes: "Gold-standard GDPR certification. Paid exam: a goal for later." },
  { title: "CIPM", provider: "IAPP", area: "Privacy & data protection", cost: "Paid", status: "Wishlist", progress: 0, link: "https://iapp.org/certify/cipm/", notes: "Running a privacy programme. Pairs with CIPP/E. Paid exam." },
  { title: "DCPP · DSCI Certified Privacy Professional", provider: "Data Security Council of India", area: "Privacy & data protection", cost: "Paid", status: "Wishlist", progress: 0, link: "https://www.dsci.in", notes: "India-focused privacy certification. Paid." },
];
