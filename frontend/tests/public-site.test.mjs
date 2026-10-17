import test from "node:test";
import assert from "node:assert/strict";
import { youtubeVideoId, team } from "../src/config/publicSite.js";
test("public video setting accepts intended YouTube links while rejecting credentials, non-HTTPS and lookalike destinations", () => {
  for (const url of ["https://youtu.be/AbC_123-xYz", "https://www.youtube.com/watch?v=AbC_123-xYz&feature=shared", "https://www.youtube.com/shorts/AbC_123-xYz", "https://www.youtube.com/embed/AbC_123-xYz"]) assert.equal(youtubeVideoId(url), "AbC_123-xYz");
  for (const url of ["", "not a URL", "javascript:alert(1)", "http://youtu.be/AbC_123-xYz", "https://youtube.com.evil.example/watch?v=AbC_123-xYz", "https://user:secret@youtube.com/watch?v=AbC_123-xYz", "https://youtu.be/too-short", "https://youtu.be/AbC_123-xYz/other", "https://youtube.com:8443/watch?v=AbC_123-xYz"]) assert.equal(youtubeVideoId(url), null, url);
});
test("each public team member has distinct photo, accessible name and HTTPS profile destinations", () => {
  assert.equal(new Set(team.map(p => p.image)).size, 2);
  for (const person of team) { assert.ok(person.name && person.role && person.initials); assert.equal(new URL(person.github).hostname,"github.com"); assert.equal(new URL(person.linkedin).hostname,"www.linkedin.com"); assert.ok(person.github.startsWith("https://") && person.linkedin.startsWith("https://")); }
});
