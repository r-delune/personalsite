# UX and accessibility follow-up

30 October 2026. Review of the user's supplied notes against current source and the phase 2 verification captures. This is a proposed implementation handoff, not a conformance audit. No application code changed in this pass.

## Recommended order

1. Improve small-text readability and verify contrast against the rendered background.
2. Enlarge return-link targets and make audio/visual controls unambiguous.
3. Verify mobile footer and player together at narrow widths and with text enlargement.
4. Refine artwork scale only after those functional issues are resolved.

## Contrast and type: accept, with a correction

Do not label all secondary text a WCAG failure from screenshots alone. Current token colors against the flat `#0b0c0e` background calculate to:

| Color | Use | Contrast |
| --- | --- | --- |
| `#989da8` | Muted token | 7.20:1 |
| `#747d8c` | Dim token | 4.71:1 |
| `#8e9aac` | Mix series | 6.87:1 |
| `#626b79` | Footer signature span | 3.63:1 |

These calculations exclude animation, compositing, opacity and selector overrides. The bright stage rim can reduce contrast where it crosses metadata. Meaningful normal-size text needs at least 4.5:1 under [WCAG 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). A token that passes against the base background does not establish that the rendered page passes.

Current mix metadata, waveform times, return links and some footer text use 7–10px sizes. Proposal: use 11–12px for meaningful metadata and utility labels; keep the compact layout through spacing rather than shrinking text. This size is a design recommendation, not a WCAG minimum. Keep very faint colors for decorative rules. Preserve stable contrast through the visual owner's text-exclusion/background-dimming behavior; merely brightening text may not solve a bright background crossing it.

Acceptance: inspect computed text colors, inherited opacity and the brightest background beneath text across animation and playback states. Test actual pages at 200% zoom. Do not certify the site from token calculations alone.

## Return navigation: accept

Global focus-visible outlines already exist, and the waveform has a focus-within outline. Return links currently have an 8px label and a 20px minimum height. Increase their padded target without enlarging the visible typography disproportionately. Keep the link aligned with the content column.

Use a 44px-high target as the project preference for standalone return links and primary touch controls. The [WCAG 2.2 AA target-size criterion](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) specifies 24×24 CSS pixels, with exceptions including sufficient spacing; 44px is our more generous design target, not that criterion's minimum.

Acceptance: keyboard focus is visible and unobscured, the full padded area activates the link, and returning to a list preserves useful scroll context.

## Artwork: modest adjustment, no lightbox yet

The current release header uses a 200px artwork column with a 220px image cap and 36px title. Consider 240–280px desktop artwork if a side-by-side review improves balance; retain a compact responsive layout. This is a visual preference, not an accessibility defect.

Do not add a lightbox solely to address scale. It adds a modal and focus-management work without helping the main listening task. Revisit only if viewing artwork in detail becomes an explicit feature.

## Waveform: partly already addressed

`MixScrubber.tsx` already draws played bars in `#c1cbd8` and remaining bars in `#66717f`, plus a vertical position line. Times use formatted clock values rather than raw seconds. It also overlays a native labeled range input with keyboard seeking. Preserve those mechanisms rather than adding another competing progress bar.

Still verify progress at 0%, mid-track, near the end and while paused. Check whether keyboard focus and the playhead remain clear against both waveform and background. Verify the range exposes understandable elapsed/total time to assistive technology, not just an unexplained numeric value. For unplayable mixes, clearly explain unavailable inline audio and offer the external destination; avoid an apparently interactive waveform that cannot start playback.

## Audio versus visual controls: accept

Keep Play/Pause adjacent to the waveform; place “Listen on Mixcloud ↗” nearby as a secondary external action when available. Playback should not depend on visual controls.

Proposal: group “Pause animation” and “Framing: fixed” under an explicitly labeled “Visuals” utility. On mobile, expose that group through the existing menu or a single disclosure. Keep the audio player directly accessible while listening. Do not add a second visual-settings modal.

Acceptance: audio Pause leaves the visual preference intact; Pause animation leaves audio playing; labels make that difference clear without explanatory instructions.

## Footer: verify before declaring overlap

The previous 375×812 captures show external links without horizontal overflow; an overlap was not established. Source contains responsive footer rules and a hidden mobile framing control. Still test 320px, 375px and 390px widths with the player open, longer labels, safe-area insets and 200% text enlargement.

Use wrapping for external links and the existing navigation/Visuals disclosure for secondary preferences. Check that footer padding and player clearance keep the final link reachable and keyboard focus visible. Retain the user's Pause animation preference across routes and keep it discoverable.

## Handoff boundary

The other chat retains implementation ownership. Apply these as a small readability/navigation pass, then repeat the relevant checks in `CODEX-PHASE2-VERIFICATION.md`. Do not bundle a background redesign or artwork lightbox into that pass. Existing production-copy blockers remain separate.
