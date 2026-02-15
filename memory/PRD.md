# DevFolio - AI-Readable Portfolio Platform

## Original Problem Statement
Build a website where users can upload projects and achievements, generating a unique URL for AI agents to easily fetch structured data. Users can share this URL with ChatGPT or other AI tools to generate resumes, portfolios, or cover letters without manual input.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Authentication**: JWT-based custom auth

## User Personas
1. **Developers/Engineers**: Want to showcase projects with technical details (README, tech stack, links)
2. **Professionals**: Need to maintain achievements and certifications
3. **Job Seekers**: Use AI export URL to generate resumes/portfolios automatically

## Core Requirements (Static)
- User registration/login with JWT authentication
- Unique URL slug generated per user
- Project CRUD (title, description, README, tech stack, GitHub/demo links)
- Achievement CRUD (title, description, date, certificate link)
- AI Export endpoint with section filtering (all/projects/achievements)
- Public profile page viewable by anyone
- Dark themed, minimal, professional design

## What's Been Implemented (v1.0 - Jan 2026)
- [x] JWT authentication (register, login, protected routes)
- [x] Unique slug generation per user
- [x] Projects CRUD with full fields
- [x] Achievements CRUD with full fields
- [x] Dashboard with stats and AI export URL
- [x] Public profile page with tabs
- [x] AI Export endpoint (/api/export/{slug}?sections=all|projects|achievements)
- [x] Settings page with URL management
- [x] Professional landing page
- [x] Dark theme with grainy animated gradient
- [x] Playfair Display + Manrope typography
- [x] All tests passing (100% backend, 100% frontend)

## API Endpoints
- POST /api/auth/register - User registration
- POST /api/auth/login - User login
- GET /api/auth/me - Get current user
- GET/POST /api/projects - List/Create projects
- GET/PUT/DELETE /api/projects/{id} - Project operations
- GET/POST /api/achievements - List/Create achievements
- GET/PUT/DELETE /api/achievements/{id} - Achievement operations
- GET /api/profile/{slug} - Public profile (filterable)
- GET /api/export/{slug} - AI-readable JSON export (filterable)

## Prioritized Backlog
### P0 (Critical)
- All implemented ✅

### P1 (High Priority)
- [ ] Markdown preview for README content
- [ ] Project categories/tags filtering
- [ ] Profile customization (bio, social links)
- [ ] Multiple export formats (Markdown, PDF)

### P2 (Medium Priority)
- [ ] Project ordering/pinning
- [ ] Analytics (profile views, export usage)
- [ ] Import from GitHub API
- [ ] Export templates for different use cases

### P3 (Low Priority)
- [ ] Dark/Light theme toggle
- [ ] Email verification
- [ ] Password reset flow
- [ ] Social sharing cards

## Next Tasks
1. Add README markdown preview in project modal
2. Implement profile bio and social links
3. Add project pinning/ordering feature
4. Create additional export format options
