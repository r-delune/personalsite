# Review of merged v1 spec

Resolution: findings below describe v1.0 and were addressed in `SPEC.md` v1.1, with Brian's approval, through D-020–D-025. Retained as review history. Documentation changes do not establish runtime or media-host verification.

Reviewed: 30 October 2026.
Inputs: `SPEC.md` v1.0, `DECISIONS.md`, `ROADMAP.md`, and the referenced local showcase contract, fixtures, and production visibility helper. This review is read-only with respect to those source documents. `REVIEW.md` remains the historical review of the earlier Claude spec.

## Assessment

The merged spec is a suitable basis for a small prototype. It resolves the earlier scope expansion, processing defaults, filename/cache mismatch, mobile navigation, excessive state updates, and storyboard implementation requirements. The separation of release inventory from repo-owned mixes is clear.

Resolve the following contract gaps before implementing the listening path. No further framework or feature expansion is needed.

## Findings

### 1. [P1] The fixture source and expected input shape disagree

`SPEC.md:146` proposes copying an album from `rdelune-productions/public/data`, but `SPEC.md:273` requires the upstream shape and an `r2_url`. The actual `public/data/showcase.json` is already normalized: track URLs are in `src` and `source_url`, and durations are in `duration`. A literal copy passed to the specified filter can remove every track because `r2_url` is absent.

The adjacent `showcase-template.json` has upstream-style fields but its shown tracks lack explicit `is_published`, so it is not a drop-in fixture for the spec's strict publication rule either.

Recommendation: create a deliberately curated upstream-shaped fixture, validate it, and retain the existing real URLs and IDs. Document provenance and transformations. Do not make the importer silently accept two structurally different contracts simply to work around an incorrectly chosen fixture. The normalized internal model can remain distinct from its input.

Evidence: `../rdelune-productions/public/data/showcase.json:15`, `../rdelune-productions/public/data/showcase-template.json:21`, and `../rdelune-productions/docs/showcase-feed-spec.md`.

### 2. [P2] Release eligibility omits the album's active flag

`SPEC.md:273` filters publication at track level but does not say to exclude inactive albums. The upstream contract includes `active`, and productions' `isAlbumPlayable` requires an active album. This means the same inventory could expose a release here that productions intentionally suppresses.

Recommendation: define album eligibility explicitly: respect the contract's default for a missing active flag, exclude explicitly inactive albums, apply local hidden overlays, and omit albums with no eligible tracks. Use that same eligibility for catalogue pages, featured selection, and queues.

Evidence: `../rdelune-productions/src/components/explorer/production-utils.ts:69`.

### 3. [P2] Analysis fallback does not specify how audible playback survives context suspension

`SPEC.md:169` says audio continues when the AudioContext is not running. Once media is routed through Web Audio, a suspended context does not automatically fall back to the element's original output path. Merely disabling visual analysis cannot guarantee continued sound.

Recommendation: define recovery explicitly. Keep the Web Audio graph running during playback even when rendering is paused; handle context state changes; resume from a user gesture when required; show a resumable interruption state if recovery fails. Native playback may be an initial fallback if analysis setup fails before the media element is bound. Do not promise a transparent native bypass after binding without proving it. Add context suspension/interruption to M2 checks.

Reference: https://www.w3.org/TR/webaudio/ (MediaElementAudioSourceNode and AudioContext suspend/resume behaviour).

### 4. [P2] Opening a time-linked mix can contradict persistent playback

`SPEC.md:192` says opening a mix time link loads that mix paused, while `SPEC.md:152` requires internal navigation to preserve playback. If a different item is playing, those requirements conflict. A detail-page waveform could also seek the wrong item if it blindly calls the global engine's seek method.

Recommendation: distinguish displayed content from the active player item. Browsing a different mix, with or without a time parameter, should leave current playback untouched and show an explicit “Play from…” action. On a fresh visit, stage the requested timestamp without autoplay. A click on a different mix's chapter or waveform should have a specified load-and-seek action. Explicit URL time should take precedence over saved resume time when starting that mix. Parse and clamp timestamps after media metadata is available.

## Smaller clarifications

- Define the player layout at 375px: the complete listed control set will not fit in a single 56px row. If its height changes, derive page bottom spacing from the actual bar height plus safe-area inset.
- The waveform needs focusability, min/max/current values, and touch/drag cancellation handling in addition to `role="slider"` and `aria-valuetext`. A native range input paired with the visual canvas is worth considering.
- Clarify how M1 is reviewed with placeholder copy: the current spec hides placeholders outside dev and fails production builds containing them. Use a local development preview for that milestone or define an explicit non-public preview policy.
- M2 depends on a real long-mix master and media-host setup that have not been verified by this review. Treat those as named inputs, not assumed completed work. Preview origins also need a defined CORS policy if hosted previews will be used.
- Remove the unused `uiMode` store from the required v1 state list if immersive mode remains deferred.
- Specify a floor/epsilon for energy normalization so silence cannot produce division by zero or NaN values.

## Recommended next action

First clarify fixture shape, eligibility, context recovery, and browsing-versus-playback semantics. Then start M1 as written: homepage, navigation, one mix detail page, and a responsive player layout, with a static poster before the single animated scene. Start with the smallest real media sample alongside it so source compatibility is checked before the visual prototype is fully polished.

No application code was present or tested. This is a specification and local-contract review, not verification of the public media hosts, browser playback, or deployment.
