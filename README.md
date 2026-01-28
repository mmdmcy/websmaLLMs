# websmaLLMs

Production notes for SEO and LLM discoverability:

- Public assets: `robots.txt`, `sitemap.xml`, `sitemap_index.xml`, `llms.txt`, social images.
- Headers via `vercel.json`: global `X-Robots-Tag: index, follow`, CSP, and `noindex` for auth-like routes.
- Only submit `https://smallms.com/sitemap_index.xml` in GSC.
- Update `<lastmod>` in sitemaps when content changes.
- Keep canonical URLs at apex domain without trailing slash.

## 🛠️ Technical Architecture & Strategy

This project is engineered as a high-performance, interactive dashboard for visualizing LLM benchmark data, complying with modern web standards and SEO best practices.

### 1. Core Technology Stack
- **Framework & Runtime:** Built with **React 18** and **TypeScript** to ensure type safety, component modularity, and maintainable application logic.
- **Build System:** powered by **Vite** for optimized production builds, hot module replacement (HMR), and superior developer experience.
- **Styling Engine:** utilized **Tailwind CSS** for a utility-first, responsive design system that ensures consistent theming and minimal bundle size.

### 2. Specialized Components
- **Data Visualization:** Integrated **Recharts** to render complex performance metrics (latency, cost, accuracy) into interactive, responsive graphs.
- **UI Animation:** Implemented **Framer Motion** for fluid state transitions and enhanced user engagement without compromising performance.
- **Iconography:** Used **Lucide React** for lightweight, consistent SVG icons.

### 3. Application Architecture
- **Data-Driven Design:** The application architecture decouples the visualization layer from the data layer. Benchmark results (`full_evaluation_report.json`) are ingested as static JSON, allowing for near-instant rendering without the latency of runtime database queries.
- **SEO & AI Discoverability:**
    - **`llms.txt`**: Implemented the proposed standard for allowing Large Language Models to traverse and understand the repository content efficiently.
    - **Sitemap Strategy**: Standardized `sitemap.xml` and `robots.txt` configuration for optimal search engine indexing.
- **Component Modularity:** The UI is decomposed into small, functional units (`TerminalDashboard`, `ModelPerformance`, `CostAnalysis`) to promote code reusability and isolated testing.

### 4. Deployment & Hosting
- **Edge Compatibility:** The static-first architecture makes this application compatible with edge networks (Vercel/Cloudflare/Netlify) for global low-latency delivery.
- **Security:** Zero-backend dependency for read-only views minimizes the attack surface, relying purely on client-side rendering of pre-validated data.
