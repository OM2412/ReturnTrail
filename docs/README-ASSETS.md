# README image provenance

The README combines a repository-native SVG brand illustration with actual product screenshots captured on 17 October 2026 UTC.

- `assets/banner.svg` is an editable vector illustration. Its document/parcel connections are branding, not an executed query result.
- `assets/workspace.webp`, `assets/context-lab.webp` and `assets/sign-in.webp` were captured from the combined production Spring JAR against an actual local FalkorDB instance with a newly seeded synthetic guest workspace. Case API responses were not mocked.
- The Context lab capture sets aside `DOC-001`. Snapshot checks before and after confirmed unchanged evidence/workflow versions. No model request was made.
- The sign-in capture shows the optional providers disabled on the capture instance. It is not evidence of a live Google/GitHub login.
- Screenshots contain fictional records and the generic guest avatar, with no actual account identifiers, cookies, API keys or OAuth credentials.
- The team images referenced by the README are the existing supplied portraits. Their separate preparation/disclosure is in [PHOTO-EDIT.md](PHOTO-EDIT.md).

The screenshots illustrate the current interface, not a public deployment or a real customer outcome. Screenshots are encoded as lossless WebP; pixel equality with their PNG captures was checked. The linked CI badge reports GitHub's live workflow status independently of these captures.
