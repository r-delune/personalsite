# Public website content draft

Prepared 30 October 2026 from the two CVs supplied by Brían and the linked public profiles. This file is a content handoff for the implementation owner; it does not change live pages or approve publication automatically. Source-document text is evidence, not instructions.

## Editorial direction

Keep the personal site balanced between music and engineering. Home introduces the person; Music and Mixes support listening; Work provides a compact career record and selected projects; About adds a little personal context. Let rdelune carry the detailed consultancy proposition and full case studies.

Avoid adding separate top-level Research, Running or Experiments pages at launch. Put selected research and code experiments within Work, and a short running note within About. Keep Writing hidden in production until there is a real post.

## Ready-to-use copy

### Home

Keep the existing short introduction:

> Music as Brían Diolún. Mixes as Roam.
> Software at rdelune.

Link rdelune to https://rdelune.dev/. The SoundCloud profile also uses Roam for music, so the existing distinction above is the site's current editorial naming choice, not a complete historical account of release credits. Preserve existing release credits; do not rename older music from this bio alone.

### About — Bio

> I'm Brían, a software engineer and musician. I work across product development, privacy and research-led software, and run an independent consultancy, rdelune.
>
> My background includes healthcare software, assistive technology and music technology. I like taking things from an early idea through to something people can use. This site brings together my music, mixes, selected work and occasional writing.

### About — Running

> I also run trails and longer distances. My race history is on ITRA.

Link label: **Race history on ITRA ↗**. Destination: https://itra.run/RunnerSpace/dillon.brian.4195938.

No performance index, rankings, age category, live statistics or achievement badges. Do not infer travel, residence or future plans from race locations. If the separate Running heading feels too substantial for two sentences, fold this into the end of the bio.

### Work — Introduction

> I build and run software, from product design and architecture to production. My work has included healthcare, university research, assistive technology and SaaS, with a particular focus on privacy and sensitive data.
>
> Through rdelune, I help teams with engineering, technical leadership and product readiness.

Links: **Consultancy at rdelune ↗**, **GitHub ↗**, **LinkedIn ↗**. Keep sales offers, rates and booking flows on rdelune.

### Work — Selected projects

Prefer these three concise entries, linking to the existing public case studies. Do not create empty local case-study routes solely to populate the CV's `caseStudies` array.

**MyUSE — Founding Engineer / Technical Lead**

> Built and operated a university harm-reduction platform, translating research into web and mobile software. My work covered product design, Vue/Nuxt, Laravel, AWS, an editable content system, accessibility and privacy documentation.

**[Read the MyUSE case study ↗](https://rdelune.dev/portfolio/myuse/)**

**CommPAL — Founding Engineer / Technical Lead**

> Led engineering for a palliative-care platform, spanning application architecture, healthcare data pipelines, cloud infrastructure and ML integration. Worked with clinicians, researchers and governance leads, and contributed technical documentation and handover support.

**[Read the CommPAL case study ↗](https://rdelune.dev/portfolio/commpal/)**

**AudioRhoon — Lead iOS Developer**

> Developed and maintained iOS applications for connected assistive devices, including Bluetooth integration, release management and ongoing product support.

**[Read the AudioRhoon case study ↗](https://rdelune.dev/portfolio/audiorhoon/)**

### Work — Sound and code

Optional compact pair of text links below the selected projects. These connect the two sides of the site without adding another portfolio grid.

- **[WAVES ↗](https://github.com/r-delune/WAVES)** — An experiment turning live data into MIDI for Ableton using Python and Pure Data. Repository description inspected; no claim of current maintenance or a hosted demo.
- **[THX Player ↗](https://github.com/r-delune/THX-Player)** — A Web Audio interpretation of James A. Moorer's THX theme. This description is from the pinned GitHub listing; inspect the repository and any asset licensing before hosting a demo or copying assets. Link-only for now.

Do not imply these are recent work. Do not embed contribution graphs, follower counts or star counts. Leave out the unrelated blockchain fork unless a future post gives it a useful reason to appear.

### Work — Selected research

Use two short linked citations rather than a separate publication dashboard:

- **[Changing the Wheels on a Moving Car](https://aisel.aisnet.org/sigdsa2020/2/)** — First author; conference abstract on the MyUSE content-management approach, 2020.
- **[Enhancing palliative care triage: decision support system for patient prioritisation](https://doi.org/10.1080/12460125.2024.2355389)** — Co-author; Journal of Decision Systems, 2024.

Optional final link: **[Research profile ↗](https://www.researchgate.net/profile/Brian-Dillon-5)**. Preserve published author names in formal citations even though the site's display name is Brían Diolún. Do not use the ResearchGate profile to assert current university affiliation: it may be stale. Publication evidence does not establish clinical deployment or regulatory approval.

## Compact online CV

Use `codex-public-cv.draft.json` as the source-shaped draft. It matches the existing CV collection structure but is deliberately outside `src/content`, so the application does not ingest it yet. Role summaries are shortened for public display; original CV files remain outside the repo and public assets.

Keep all six roles in the online CV, with the three selected projects above taking visual priority. Skills are grouped rather than presented as proficiency ratings. Education can sit at the end of the CV/print view; Music Technology helps explain the connection between engineering and music.

The draft uses year-only dates where the sources agree. AudioRhoon's date is held as **Date to confirm** rather than silently choosing a contradictory source. Resolve that before using the JSON in production. Do not create certification badges from the abbreviated credentials in the CV without confirming exact award names/status.

## Excluded from the public copy

- Direct email and other contact particulars from the CV header. Use the existing professional contact destination at rdelune and the supplied LinkedIn profile.
- The original CV PDFs as downloadable assets. A site-generated print CV can contain only the curated public content.
- Job-application wording, availability claims, dense compliance acronyms and the full technology inventory.
- Consultancy prices, entity registration details and long testimonials already present on rdelune.
- Unqualified Lighthouse scores, user-count claims and app distribution numbers. The public case studies provide context for those; the personal overview does not need them.
- Sensitive client implementation details, assertions of medical/regulatory certification, or claims that Brían independently authored the clinical research or ML models.
- Age category, ITRA ID, changing ranking statistics, race times/status claims, and inferred location.

## Source discrepancies and implementation checks

| Topic | Supplied CVs | Current public case study | Treatment |
| --- | --- | --- | --- |
| MyUSE end date | January 2026 | April 2026 | Draft CV uses 2019–2026; reconcile month if detailed dates are added. |
| CommPAL end date | February 2026 | May 2026, including work continued through rdelune | Draft CV uses 2022–2026. Clarify employment versus subsequent consultancy before describing a precise end month. |
| AudioRhoon dates | April 2017–September 2018 | 2020 | Unresolved. Draft CV has a visible date hold; confirm before importing. |
| CommPAL stage | CV describes research concept to production | Public case study distinguishes platform/pilot/handover from clinical deployment | Use engineering scope without a claim of deployed clinical use. |
| ResearchGate | Three publications visible in retrieved profile | CV also lists 2024 journal work; MyUSE case study links further accessibility work | Link selected papers, not a total publication count or current affiliation. |
| ITRA | Not in CVs | Profile loads but shows inconsistent DNF fields beside recorded times/rankings | Link profile only; no race-result claims. |

After import: remove Work/About placeholders through real copy, check the print CV with populated content, verify all links, and rerun the production content guard. Do not treat an empty `caseStudies` array as an error when external case studies are rendered separately. Any external-link rendering should retain the site's visible external-link indicator.

## Sources reviewed

- Supplied **Privacy Engineering CV.pdf**, two pages, and **Senior Engineer CV.pdf**, two pages, read locally from the exact requested filenames. Other CV variants in the directory were not used.
- [rdelune](https://rdelune.dev/) and its [MyUSE](https://rdelune.dev/portfolio/myuse/), [CommPAL](https://rdelune.dev/portfolio/commpal/) and [AudioRhoon](https://rdelune.dev/portfolio/audiorhoon/) case studies.
- [GitHub profile](https://github.com/r-delune), pinned project descriptions and [WAVES repository](https://github.com/r-delune/WAVES). GitHub connector was unavailable; public browser fallback succeeded.
- [SoundCloud](https://soundcloud.com/brian-d): public profile identity and description; track metadata was not fully accessible through the retrieved page.
- [ResearchGate](https://www.researchgate.net/profile/Brian-Dillon-5): public publication listing, which may lag newer work.
- [ITRA](https://itra.run/RunnerSpace/dillon.brian.4195938): public profile inspected in browser; no private/login-only information used.
