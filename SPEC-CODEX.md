# Brian / rdelune — personal website specification

Status: initial design and implementation brief, ready for an independent build.
Date: 30 October 2026.

## 1. Purpose

Create a distinctive personal website that balances Brian and rdelune equally. The site is primarily a home for Brian's introduction, music releases, and DJ mixes, with room for professional work, case studies, writing, and personal interests.

The site should be satisfying for Brian to use and maintain, while helping visitors discover his music, understand his work, and find relevant links. Music and the introductory blurb take priority. Less is more.

Reference: https://omp.sh/

Borrow the reference's restrained composition, strong typography, dark negative space, small interface details, and expressive particle background. Create an original identity rather than reproducing its branding or content. The reference was viewed on 30 October 2026; its implementation technology has not been established.

## 2. Confirmed direction and open decisions

### Confirmed by Brian

- An equal blend of Brian and rdelune.
- An introduction explaining who Brian is and what he does, with a clear link to rdelune.
- Music releases that can be played on the site.
- A catalogue of past mixes with playback and scrubbing.
- Music playback should lightly alter the background animation while retaining a uniform aesthetic.
- A blog that can grow over time.
- Consider selected projects, an expanded portfolio, an online CV with case-study links, and personal accomplishments such as running.
- Preserve the option of a future track-associated visual storyboard mode that fades or hides the content. Do not implement that mode now.
- Produce this specification before implementation.

### Proposed defaults, subject to revision

- A dark, atmospheric aesthetic with fine particles, contour-like forms, and restrained colour.
- Astro, TypeScript, custom CSS, Three.js, and native browser audio APIs.
- A concise homepage with deeper pages for catalogues, work, and writing.
- Running and ITRA links initially belong in About rather than a separate homepage section.
- One shared audio player for releases and mixes.

### Unresolved

- Brian's approved biography, professional description, and primary contact links.
- What rdelune represents in this site and its canonical URL. Do not assume it is a music alias, company, or other specific entity until supplied.
- Site name, domain, wordmark, and any existing rdelune brand assets.
- Which aspects of omp.sh Brian most wants to retain, including its purple/pink palette.
- Release and mix sources: original audio files, Bandcamp, SoundCloud, Mixcloud, Spotify, or another host.
- Permissions and availability for streaming each audio file.
- Which projects, achievements, and CV details are suitable for publication.
- Deployment destination and preferred content-editing workflow.

Use the proposed defaults for a reviewable prototype. Clearly mark missing content. Do not invent biographical claims, client work, release titles, accomplishments, or testimonials.

## 3. Experience and visual design

### Overall character

Quiet, precise, atmospheric, and personal. The visual environment should suggest sound, terrain, or lunar light without relying on literal illustrations. Avoid a crowded dashboard or a generic grid of rounded cards.

### Composition

- Near-black foundation, warm off-white primary text, subdued secondary text, and one accent colour family.
- Large introductory typography with a comfortable reading width and deliberate line breaks.
- Generous spacing and clear hierarchy; compact metadata and controls.
- Use thin dividers, editorial rows, and album artwork where useful.
- Keep most background detail away from text. Add a subtle dark scrim where needed.
- Album artwork may vary in colour; the surrounding interface and background retain a coherent palette.
- Use real selectable HTML text and native links/buttons. Do not render content inside the animation canvas.
- Normal browser scrolling, with no scroll hijacking or required introductory sequence.

### Background

One shared visual environment should persist across the site. Explore a flowing particle field or softly illuminated contour surface with fine grain and depth. It must look intentional both while idle and during playback.

- Idle: slow, low-contrast movement.
- Playing: gently modulate movement, displacement, or brightness from smoothed audio energy.
- Paused or ended: smoothly return to the idle state.
- Seeking or changing track: avoid sudden flashes or abrupt visual jumps.
- Keep the response bounded; no aggressive equalizer bars, strobing, or large changes in page brightness.
- Avoid distinct visual themes per album in the initial version.
- Provide an accessible pause-animation control and respect reduced-motion preferences.
- Fall back to a static composition if graphics initialization fails.

## 4. Information architecture

Primary navigation: Music, Mixes, Work, About. Add Writing when at least one entry exists. Contact and external profiles can live in About and the footer.

Suggested routes:

| Route | Purpose |
| --- | --- |
| `/` | Introduction and curated entry points |
| `/music` | Release catalogue |
| `/music/[slug]` | Release details and tracklist |
| `/mixes` | Mix catalogue |
| `/mixes/[slug]` | Mix details, player, and optional tracklist |
| `/work` | Selected projects |
| `/work/[slug]` | Case study |
| `/about` | Expanded biography, experience, personal interests, and links |
| `/writing` | Published writing archive |
| `/writing/[slug]` | Individual article |

Only expose routes with useful content in public navigation. A local prototype may show clearly labelled sample content to demonstrate layout.

### Homepage order

1. Introduction: name/identity, short blurb, what Brian does, clear rdelune link, and a prominent route into listening.
2. Music: one featured release and a small selection of other releases.
3. Mixes: a short list showing title, date, duration, and play action.
4. Selected work: two or three substantive projects when available.
5. Writing: latest entries when available.
6. Compact footer with contact and relevant external links.

The opening screen should communicate the identity and make music easy to find. Do not autoplay music.

### About and CV

Combine the expanded biography and online CV into a readable page. Link relevant roles or experience directly to supporting case studies. A downloadable CV is optional if Brian provides one.

Running can appear as a short personal section with a few selected achievements and an ITRA link. Do not add a live performance dashboard or external data integration initially.

## 5. Audio experience

### Shared playback

- Use one audio playback instance across the site; playing a new item replaces the current one.
- Show a slim persistent player after a visitor starts playback.
- Include artwork where available, title, artist/series, play/pause, elapsed time, duration, and seek control.
- Include volume controls where supported; adapt appropriately on mobile.
- Provide a link from the player to the current release or mix page.
- Keep playback running when navigating internal pages and using browser back/forward.
- Keep keyboard focus and controls predictable during navigation.
- Handle loading, buffering, unavailable media, and playback errors with clear visible feedback and retry where appropriate.
- Do not load full audio files for all catalogue entries on page load.

### Releases

- Catalogue entries show artwork, title, date/year, and a listening action.
- Release pages support a tracklist, individual track playback, credits, brief notes, and supplied external listening/purchase links.
- Provide previous/next controls when the current item belongs to a release tracklist.
- Define track ordering explicitly; do not infer it from filenames.

### Mixes

- Catalogue rows show title, date, duration, and optional series or mood metadata.
- Support reliable scrubbing through long recordings.
- A seek bar is required. A waveform is optional and should remain visually quiet.
- If a waveform is included, prefer precomputed peaks rather than decoding a long recording on the visitor's device.
- Optional timestamped tracklist entries seek to that point in the mix.
- Remember listening position for mixes locally, with throttled storage updates. Restore it only when the visitor explicitly resumes that mix; do not autoplay on a new visit.
- Keep remembered positions and listening preferences in browser-local storage. No accounts or cross-device sync initially.

### Audio sources

Prefer direct, authorized audio files hosted with appropriate cross-origin headers and byte-range support. This gives the most control over playback, scrubbing, styling, and audio analysis.

Third-party embedded players may limit styling, continuous playback, seeking APIs, and access to audio samples. Confirm capabilities against the chosen service before committing to that path. Do not promise direct analysis of embedded audio. If analysis is unavailable, use a subtle playback-state response instead, driven by supported play/pause events.

Separate file delivery from site content. A media CDN or object store can be selected once Brian's files and hosting preferences are known.

## 6. Recommended technical architecture

### Site foundation

- Astro and TypeScript for content-oriented pages with selective client-side interactivity.
- Custom CSS using Grid/Flexbox, shared tokens, and a small reusable component set.
- Markdown content collections for writing and case studies; typed structured content for releases and mixes.
- Use Astro's client router and persistent elements for the audio player and visual canvas.
- Verify persistence early, including navigation, browser history, duplicate initialization, and listener cleanup.
- Keep routes usable with normal links and server-rendered content.

A React or similar island may be used for player UI if it materially simplifies state management. Do not add a full application framework or animation library solely for simple transitions.

### Visual rendering

- Three.js with a custom shader for the background.
- Keep rendering outside component rerender loops.
- One render loop, one canvas, and explicitly managed lifecycle/cleanup.
- Supply smoothed, bounded audio parameters to the visual renderer through a small shared interface.
- Cap device pixel ratio, adapt rendering quality on smaller devices, and pause visual rendering when the document is hidden.
- Lazy-load graphics independently of essential content and player controls.
- Use CSS transitions for ordinary interface feedback.

### Audio engine

- Stream through a persistent HTML audio element.
- Use Web Audio analysis when the media source permits it.
- Initialize/resume the audio context from an explicit user interaction.
- Avoid fetching and decoding entire long mixes into memory for routine playback.
- Keep playback state independent of both page content and graphics availability.
- Support media-session metadata and platform transport controls where available, as a progressive enhancement.

### Architecture for future storyboard mode

Keep three layers independent:

1. Audio engine: current media, playback clock, seek, and transport state.
2. Visual renderer: ambient scene and its parameters.
3. Content/interface: page content, navigation, and player controls.

The audio clock must remain the future source of truth for timed visuals. A later storyboard system should be able to map playback time to scenes, including after seeking, and fade page content while preserving an obvious exit and playback controls.

Do not implement storyboard timelines, track-specific scene assets, immersive mode, or its editing tools in the initial build. Avoid tying the ambient animation to scroll position or page lifecycle in a way that would prevent this extension.

## 7. Content model

Use stable IDs and slugs. Separate display metadata from playback URLs.

| Content | Suggested fields |
| --- | --- |
| Profile | Name, short introduction, biography, rdelune URL, approved contact/profile links |
| Release | ID, slug, title, artist, date, artwork and alt text, description, credits, ordered track IDs, external links, featured flag |
| Track | ID, title, artist, audio source, optional known duration, track number |
| Mix | ID, slug, title, date, audio source, artwork, description, optional duration, series/tags, optional timestamped tracklist |
| Project | Slug, title, summary, role, dates, images and alt text, case-study body, external links, featured flag |
| Article | Slug, title, publication date, optional description, body, draft flag |

Validate timestamps, required fields, duplicate IDs, and references between releases and tracks. Omit missing optional metadata gracefully.

## 8. Accessibility, performance, and discovery

- Semantic landmarks, logical headings, visible keyboard focus, and a skip link.
- Accessible names for icon controls and keyboard-operable seek controls.
- Expose playback and loading states without announcing every progress update.
- Maintain readable contrast throughout the background's animated states.
- Honour reduced motion and retain a manual animation pause option.
- Ensure navigation, reading, and audio controls work when the animated background fails.
- Responsive layouts from small phones through wide desktop screens, including safe-area spacing for the persistent player.
- Prevent the player from covering final page content or focused controls.
- Lazy-load below-the-fold artwork and reserve image dimensions to avoid layout shifts.
- Use route-specific titles, descriptions, canonical URLs, and social previews once the domain and assets are supplied.
- Include sitemap and RSS for published writing. Use structured data only when supported by real content.
- Keep essential content available without client-side rendering.
- No analytics, newsletter signup, contact-form backend, accounts, or external feed integrations unless requested.

## 9. Initial scope and exclusions

### Initial build

- A polished responsive visual system and concise homepage.
- Shared ambient background with gentle playback response.
- Music and mix catalogues and detail-page templates.
- Persistent player with seeking and clear error handling.
- About/CV, selected work, and writing templates, exposed as real content becomes available.
- A documented content structure and local setup/build instructions.

### Later options

- Track-associated storyboards and immersive listening mode.
- Additional portfolio and running content.
- More sophisticated waveform views or mix discovery if the catalogue needs them.
- A CMS if file-based editing becomes inconvenient.

Do not add speculative features to fill space. Hide empty sections on the public site instead of presenting unfinished placeholders.

## 10. Implementation sequence

1. Establish typography, layout, colours, and a static fallback background using clearly labelled content where necessary.
2. Build a small technical proof of persistent audio, internal navigation, long-mix seeking, and source compatibility.
3. Implement the shared visual environment and restrained audio response.
4. Build the catalogues and detail pages, then About, work, and writing templates.
5. Replace sample content with approved material and verify responsiveness, accessibility, and playback.

Resolve audio-source limitations before polishing a player interaction that the source cannot support.

## 11. Acceptance criteria

- The homepage clearly introduces Brian, links to rdelune, and gives music a prominent entry point.
- Brian and rdelune feel balanced rather than one being a minor footer link.
- The visual direction reflects the reference's restraint while remaining original.
- Audio begins only after a visitor action, and only one item plays at a time.
- Music continues through internal page navigation and browser history changes without duplicate audio or graphics instances.
- Release track selection and long-mix scrubbing work with actual supported media sources.
- The persistent player accurately reflects current media, time, loading state, and play/pause state.
- Mix resume positions work without unexpected autoplay.
- Background response is subtle and returns smoothly to idle after playback stops.
- Reduced-motion settings, manual animation pause, and static fallback work.
- Mobile controls remain usable and do not obscure content.
- Articles and case studies have readable, shareable individual URLs.
- Missing media and playback failures produce useful feedback; graphics failures do not break the site.
- No unapproved biography, achievements, projects, or music metadata are presented as fact.
- The future storyboard separation exists architecturally, without implementing the feature now.

Verify playback with actual available assets. If assets are absent, report that limitation explicitly; a visually complete mock player does not count as verified playback.

## 12. Technical references

- Visual reference: https://omp.sh/
- Astro routing, transitions, and persistence: https://docs.astro.build/en/guides/view-transitions/
- Three.js custom shaders: https://threejs.org/docs/pages/ShaderMaterial.html
- Web Audio visualization: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API

These sources informed the proposed approach. Check the documentation for the installed versions during implementation.
